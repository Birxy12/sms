import React, { useRef, useEffect, useState, useCallback } from 'react';
import Webcam from 'react-webcam';
import { Camera, X, ScanLine, AlertCircle, Loader2 } from 'lucide-react';

/**
 * CameraView — live camera feed with pure OpenCV.js document detection.
 * 
 * - Loads OpenCV.js from CDN.
 * - Every frame: detectDocument scans the video for a rectangle.
 * - On capture: draws the detected region to a canvas or takes a raw screenshot.
 */
const CameraView = ({ onCapture, onSwitchToUpload }) => {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);
  const [cvLoaded, setCvLoaded] = useState(false);
  const [loadingLibs, setLoadingLibs] = useState(true);
  const [detectedCorners, setDetectedCorners] = useState(null);
  const [capturing, setCapturing] = useState(false);

  /* ── Load OpenCV.js ─────────────────────────────────────────── */
  useEffect(() => {
    const loadOpenCV = async () => {
      if (window.cv) {
        setCvLoaded(true);
        setLoadingLibs(false);
        return;
      }
      
      const script = document.createElement('script');
      script.src = 'https://docs.opencv.org/4.8.0/opencv.js';
      script.async = true;
      script.onload = () => {
        // OpenCV.js is ready when cv.onRuntimeInitialized is called
        if (window.cv.onRuntimeInitialized) {
            const originalCallback = window.cv.onRuntimeInitialized;
            window.cv.onRuntimeInitialized = () => {
                originalCallback();
                setCvLoaded(true);
                setLoadingLibs(false);
            };
        } else {
            window.cv.onRuntimeInitialized = () => {
                setCvLoaded(true);
                setLoadingLibs(false);
            };
        }
      };
      document.body.appendChild(script);
    };
    
    loadOpenCV();
    return () => {
        // Clean up animation frame on unmount
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  /* ── Document Detection Logic ──────────────────────────────── */
  const detectDocument = useCallback(() => {
    if (!window.cv || !webcamRef.current || !cvLoaded) return;
    
    const video = webcamRef.current.video;
    if (!video || video.readyState !== 4) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const { videoWidth: w, videoHeight: h } = video;
    if (canvas.width !== w) canvas.width = w;
    if (canvas.height !== h) canvas.height = h;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, w, h);

    try {
      const cv = window.cv;
      const src = cv.imread(video);
      const gray = new cv.Mat();
      const blurred = new cv.Mat();
      const edges = new cv.Mat();
      
      cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
      cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0);
      cv.Canny(blurred, edges, 50, 150);
      
      const contours = new cv.MatVector();
      const hierarchy = new cv.Mat();
      cv.findContours(edges, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
      
      let largestContour = null;
      let maxArea = 0;
      
      for (let i = 0; i < contours.size(); i++) {
        const contour = contours.get(i);
        const area = cv.contourArea(contour);
        const peri = cv.arcLength(contour, true);
        const approx = new cv.Mat();
        cv.approxPolyDP(contour, approx, 0.02 * peri, true);
        
        // Document should be 4 corners and large enough
        if (area > maxArea && approx.rows === 4 && area > (w * h * 0.05)) {
          maxArea = area;
          if (largestContour) largestContour.delete();
          largestContour = approx;
        } else {
          approx.delete();
        }
      }
      
      if (largestContour) {
        const corners = [];
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 3;
        ctx.beginPath();
        
        for (let i = 0; i < 4; i++) {
          const px = largestContour.data32S[i * 2];
          const py = largestContour.data32S[i * 2 + 1];
          corners.push({ x: px, y: py });
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();
        
        setDetectedCorners(corners);
        largestContour.delete();
      } else {
        setDetectedCorners(null);
        // Draw guide
        drawGuide(ctx, w, h, false);
      }
      
      src.delete();
      gray.delete();
      blurred.delete();
      edges.delete();
      contours.delete();
      hierarchy.delete();
      
    } catch (err) {
      // console.warn('Detection error:', err);
    }
  }, [cvLoaded]);

  const drawGuide = (ctx, w, h, isDetected) => {
    const pad = 40;
    const x = pad, y = pad * 1.5;
    const rw = w - pad * 2, rh = h - pad * 3;
    const cornerLen = 24;

    ctx.strokeStyle = isDetected ? '#22c55e' : 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';

    ctx.beginPath(); ctx.moveTo(x + cornerLen, y); ctx.lineTo(x, y); ctx.lineTo(x, y + cornerLen); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + rw - cornerLen, y); ctx.lineTo(x + rw, y); ctx.lineTo(x + rw, y + cornerLen); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, y + rh - cornerLen); ctx.lineTo(x, y + rh); ctx.lineTo(x + cornerLen, y + rh); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + rw - cornerLen, y + rh); ctx.lineTo(x + rw, y + rh); ctx.lineTo(x + rw, y + rh - cornerLen); ctx.stroke();
  };

  /* ── Detection Loop ────────────────────────────────────────── */
  useEffect(() => {
    const tick = () => {
      detectDocument();
      animFrameRef.current = requestAnimationFrame(tick);
    };
    if (cvLoaded) {
      animFrameRef.current = requestAnimationFrame(tick);
    }
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [cvLoaded, detectDocument]);

  const capture = useCallback(() => {
    if (capturing) return;
    setCapturing(true);

    const video = webcamRef.current?.video;
    if (!video) { setCapturing(false); return; }

    // For now, we take a high-quality screenshot. 
    // Perspective correction with raw OpenCV is complex, so we fallback to raw capture
    // but the detection UI guides the user to a good alignment.
    const raw = webcamRef.current?.getScreenshot();
    if (raw) {
      onCapture({ imageSrc: raw, source: 'camera_raw' });
    }
    setCapturing(false);
  }, [capturing, onCapture]);

  const stopCameraStream = useCallback(() => {
    const video = webcamRef.current?.video;
    if (!video) return;

    try {
      video.pause();
    } catch {
      // ignore pause errors during unmount
    }

    if (video.srcObject && typeof video.srcObject.getTracks === 'function') {
      video.srcObject.getTracks().forEach((track) => track.stop());
    }

    if (video.srcObject) {
      video.srcObject = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      stopCameraStream();
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [stopCameraStream]);

  return (
    <div className="camera-view">
      <div className="camera-header">
        <div className="camera-title">
          <ScanLine size={18} />
          <span>Scan Receipt</span>
        </div>
        <button
          onClick={() => {
            stopCameraStream();
            onSwitchToUpload();
          }}
          className="close-btn"
          aria-label="Close camera"
        >
          <X size={22} />
        </button>
      </div>

      <div className="webcam-container">
        <Webcam
          audio={false}
          muted
          playsInline
          ref={webcamRef}
          screenshotFormat="image/jpeg"
          screenshotQuality={0.92}
          videoConstraints={{ facingMode: 'environment', width: 1280, height: 720 }}
          className="webcam"
        />
        <canvas ref={canvasRef} className="detection-canvas" />

        <div className={`detection-badge ${detectedCorners ? 'detected' : ''}`}>
          {loadingLibs ? (
            <span className="flex items-center gap-2"><Loader2 className="animate-spin" size={14} /> Initializing AI...</span>
          ) : detectedCorners ? (
            '✓ Receipt detected — tap to capture'
          ) : (
            'Position receipt in frame'
          )}
        </div>
      </div>

      <div className="camera-controls">
        <button
          onClick={capture}
          className={`capture-btn ${detectedCorners ? 'ready' : ''}`}
          disabled={capturing || loadingLibs}
          aria-label="Capture receipt"
        >
          {capturing ? <span className="capture-spinner" /> : <Camera size={30} />}
        </button>
        <span className="capture-hint">
          {detectedCorners ? 'Ready for capture' : 'Align receipt corners'}
        </span>
      </div>
    </div>
  );
};

export default CameraView;
