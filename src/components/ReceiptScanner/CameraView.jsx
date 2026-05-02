import React, { useRef, useEffect, useState, useCallback } from 'react';
import Webcam from 'react-webcam';
import { Camera, X, ScanLine, AlertCircle } from 'lucide-react';

/**
 * CameraView — live camera feed with jscanify document detection overlay.
 *
 * - Loads jscanify (OpenCV.js-backed) lazily after webcam is ready.
 * - Every animation frame: scans video → draws green quadrilateral over receipt.
 * - On capture: applies perspective transform to deskew, falls back to raw screenshot.
 */
const CameraView = ({ onCapture, onSwitchToUpload }) => {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);        // overlay canvas
  const outputRef = useRef(null);        // hidden output canvas for perspective transform
  const animFrameRef = useRef(null);
  const scannerRef = useRef(null);       // jscanify instance
  const isDetectingRef = useRef(false);

  const [scannerReady, setScannerReady] = useState(false);
  const [detected, setDetected] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [capturing, setCapturing] = useState(false);

  /* ── Load jscanify once webcam is ready ─────────────────────── */
  useEffect(() => {
    let cancelled = false;

    const loadScanner = async () => {
      try {
        const { default: Jscanify } = await import('jscanify');
        if (cancelled) return;
        const instance = new Jscanify();
        scannerRef.current = instance;
        setScannerReady(true);
      } catch (err) {
        if (!cancelled) setLoadError(err.message);
      }
    };

    loadScanner();
    return () => { cancelled = true; };
  }, []);

  /* ── Detection loop ─────────────────────────────────────────── */
  useEffect(() => {
    if (!scannerReady) return;

    const tick = () => {
      const video = webcamRef.current?.video;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState < 2) {
        animFrameRef.current = requestAnimationFrame(tick);
        return;
      }

      const { videoWidth: w, videoHeight: h } = video;
      if (canvas.width !== w) canvas.width = w;
      if (canvas.height !== h) canvas.height = h;

      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, w, h);

      if (isDetectingRef.current) {
        animFrameRef.current = requestAnimationFrame(tick);
        return;
      }

      isDetectingRef.current = true;

      try {
        const scanner = scannerRef.current;
        // highlightPaper draws the detection quad on a temp canvas and returns corner points
        const resultCanvas = scanner.highlightPaper(video);

        if (resultCanvas) {
          // Draw the detection overlay
          const tempCtx = resultCanvas.getContext('2d');
          const imageData = tempCtx.getImageData(0, 0, resultCanvas.width, resultCanvas.height);

          // Check if any green pixels exist (detection happened)
          const data = imageData.data;
          let hasGreen = false;
          for (let i = 0; i < data.length; i += 16) {
            if (data[i + 1] > 150 && data[i] < 100 && data[i + 2] < 100) {
              hasGreen = true;
              break;
            }
          }

          if (hasGreen) {
            ctx.drawImage(resultCanvas, 0, 0, w, h);
            setDetected(true);
          } else {
            // Draw subtle scanning guide
            drawGuide(ctx, w, h, false);
            setDetected(false);
          }
        } else {
          drawGuide(ctx, w, h, false);
          setDetected(false);
        }
      } catch {
        drawGuide(ctx, w, h, false);
        setDetected(false);
      }

      isDetectingRef.current = false;
      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [scannerReady]);

  /* ── Draw scanning guide rectangle ─────────────────────────── */
  const drawGuide = (ctx, w, h, isDetected) => {
    const pad = 40;
    const x = pad, y = pad * 1.5;
    const rw = w - pad * 2, rh = h - pad * 3;
    const cornerLen = 24;

    ctx.strokeStyle = isDetected ? '#22c55e' : 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';

    // Four corners only
    const corners = [
      [x, y, cornerLen, 0, cornerLen, 0],
    ];
    // top-left
    ctx.beginPath(); ctx.moveTo(x + cornerLen, y); ctx.lineTo(x, y); ctx.lineTo(x, y + cornerLen); ctx.stroke();
    // top-right
    ctx.beginPath(); ctx.moveTo(x + rw - cornerLen, y); ctx.lineTo(x + rw, y); ctx.lineTo(x + rw, y + cornerLen); ctx.stroke();
    // bottom-left
    ctx.beginPath(); ctx.moveTo(x, y + rh - cornerLen); ctx.lineTo(x, y + rh); ctx.lineTo(x + cornerLen, y + rh); ctx.stroke();
    // bottom-right
    ctx.beginPath(); ctx.moveTo(x + rw - cornerLen, y + rh); ctx.lineTo(x + rw, y + rh); ctx.lineTo(x + rw, y + rh - cornerLen); ctx.stroke();
  };

  /* ── Capture with perspective correction ────────────────────── */
  const capture = useCallback(async () => {
    if (capturing) return;
    setCapturing(true);

    const video = webcamRef.current?.video;
    if (!video) { setCapturing(false); return; }

    try {
      const scanner = scannerRef.current;

      if (scanner && detected) {
        // Attempt perspective-corrected extraction
        const extracted = scanner.extractPaper(video);
        if (extracted) {
          onCapture({ imageSrc: extracted.toDataURL('image/jpeg', 0.92), source: 'camera_deskewed' });
          setCapturing(false);
          return;
        }
      }
    } catch {
      // fall through to raw capture
    }

    // Fallback: raw screenshot
    const raw = webcamRef.current?.getScreenshot();
    if (raw) onCapture({ imageSrc: raw, source: 'camera_raw' });
    setCapturing(false);
  }, [capturing, detected, onCapture]);

  return (
    <div className="camera-view">
      <div className="camera-header">
        <div className="camera-title">
          <ScanLine size={18} />
          <span>Scan Receipt</span>
        </div>
        <button onClick={onSwitchToUpload} className="close-btn" aria-label="Close camera">
          <X size={22} />
        </button>
      </div>

      <div className="webcam-container">
        <Webcam
          audio={false}
          ref={webcamRef}
          screenshotFormat="image/jpeg"
          screenshotQuality={0.92}
          videoConstraints={{ facingMode: 'environment', width: 1280, height: 720 }}
          className="webcam"
        />
        {/* Detection overlay canvas — sits on top of webcam */}
        <canvas ref={canvasRef} className="detection-canvas" />
        <canvas ref={outputRef} style={{ display: 'none' }} />

        {/* Status badge */}
        <div className={`detection-badge ${detected ? 'detected' : ''}`}>
          {scannerReady
            ? detected
              ? '✓ Receipt detected — tap to capture'
              : 'Position receipt in frame'
            : loadError
              ? 'Detection unavailable'
              : 'Loading scanner…'}
        </div>
      </div>

      {loadError && (
        <div className="scanner-error">
          <AlertCircle size={16} />
          <span>jscanify failed to load: {loadError}. Using basic capture.</span>
        </div>
      )}

      <div className="camera-controls">
        <button
          onClick={capture}
          className={`capture-btn ${detected ? 'ready' : ''}`}
          disabled={capturing}
          aria-label="Capture receipt"
        >
          {capturing
            ? <span className="capture-spinner" />
            : <Camera size={30} />}
        </button>
        <span className="capture-hint">
          {detected ? 'Perspective correction active' : 'Tap to capture'}
        </span>
      </div>
    </div>
  );
};

export default CameraView;
