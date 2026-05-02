import React, { useState, useEffect } from 'react';
import { Check, RefreshCw, Loader2, Send, CheckCircle2, XCircle, ChevronDown, ChevronUp } from 'lucide-react';
import processReceipt from '../../utils/receiptProcessor';
import useMessageHub from '../../hooks/useMessageHub';

const ReceiptPreview = ({ imageSrc, source, onRetake, onComplete, messageHubConfig }) => {
  const [stage, setStage] = useState('idle'); // idle | ocr | sending | done | error
  const [extractedData, setExtractedData] = useState(null);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [showRaw, setShowRaw] = useState(false);
  const [hubResult, setHubResult] = useState(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  const { sendMessage, isLoading: isSending } = useMessageHub(messageHubConfig || {});

  /* ── Auto-run OCR when image arrives ───────────────────────── */
  useEffect(() => {
    if (!imageSrc) return;
    let cancelled = false;

    const run = async () => {
      setStage('ocr');
      setOcrProgress(10);

      // Simulate progress ticks while Tesseract works
      const ticker = setInterval(() => {
        setOcrProgress(p => Math.min(p + 8, 88));
      }, 400);

      try {
        const result = await processReceipt(imageSrc);
        clearInterval(ticker);
        if (cancelled) return;
        setOcrProgress(100);
        setExtractedData(result.extractedData);
        setDimensions(result.metadata.dimensions);
        setStage('idle');
      } catch (err) {
        clearInterval(ticker);
        if (!cancelled) setStage('error');
      }
    };

    run();
    return () => { cancelled = true; };
  }, [imageSrc]);

  /* ── Send to message hub ───────────────────────────────────── */
  const handleSend = async () => {
    setStage('sending');
    const payload = {
      image: imageSrc,
      extractedData,
      metadata: {
        source: source || 'upload',
        dimensions,
      },
    };

    const res = await sendMessage(payload);
    setHubResult(res);
    setStage(res.success ? 'done' : 'error');
    if (res.success && onComplete) onComplete({ ...payload, hubResult: res });
  };

  const isOCRing = stage === 'ocr';
  const isSendingStage = stage === 'sending';
  const isDone = stage === 'done';
  const isError = stage === 'error';

  return (
    <div className="receipt-preview">
      {/* ── Header ── */}
      <div className="preview-header">
        <h3>Confirm Receipt</h3>
        {source && (
          <span className={`source-badge ${source.includes('deskew') ? 'deskewed' : ''}`}>
            {source === 'camera_deskewed' ? '✦ Deskewed' : source === 'camera_raw' ? 'Camera' : 'Uploaded'}
          </span>
        )}
      </div>

      {/* ── Image ── */}
      <div className="image-container">
        <img src={imageSrc} alt="Receipt preview" />
      </div>

      {/* ── OCR Progress ── */}
      {isOCRing && (
        <div className="ocr-progress-section">
          <div className="ocr-label">
            <Loader2 size={14} className="animate-spin" />
            <span>Extracting receipt data… {ocrProgress}%</span>
          </div>
          <div className="ocr-bar">
            <div className="ocr-bar-fill" style={{ width: `${ocrProgress}%` }} />
          </div>
        </div>
      )}

      {/* ── Extracted Data ── */}
      {extractedData && !isOCRing && (
        <div className="extracted-data">
          <div className="data-grid">
            <div className="data-row">
              <span className="data-label">Merchant</span>
              <span className="data-value">{extractedData.merchant}</span>
            </div>
            <div className="data-row">
              <span className="data-label">Date</span>
              <span className="data-value">{extractedData.date}</span>
            </div>
            <div className="data-row">
              <span className="data-label">Total</span>
              <span className="data-value total">${extractedData.total}</span>
            </div>
          </div>

          {extractedData.items.length > 0 && (
            <div className="items-section">
              <div className="items-header" onClick={() => setShowRaw(p => !p)}>
                <span>{extractedData.items.length} item{extractedData.items.length !== 1 ? 's' : ''} found</span>
                {showRaw ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </div>
              {showRaw && (
                <ul className="items-list">
                  {extractedData.items.map((item, i) => (
                    <li key={i} className="item-row">
                      <span>{item.name}</span>
                      <span>${item.price}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Status banners ── */}
      {isDone && (
        <div className="status-banner success">
          <CheckCircle2 size={16} />
          <span>Sent to message hub successfully!</span>
        </div>
      )}
      {isError && (
        <div className="status-banner error">
          <XCircle size={16} />
          <span>Something went wrong. Please retry.</span>
        </div>
      )}

      {/* ── Controls ── */}
      <div className="preview-controls">
        <button
          onClick={onRetake}
          className="retake-btn"
          disabled={isOCRing || isSendingStage}
        >
          <RefreshCw size={18} /> Retake
        </button>

        {!isDone ? (
          <button
            onClick={handleSend}
            className="process-btn"
            disabled={isOCRing || isSendingStage || !extractedData}
          >
            {isSendingStage
              ? <><Loader2 size={18} className="animate-spin" /> Sending…</>
              : <><Send size={18} /> Send Receipt</>}
          </button>
        ) : (
          <button onClick={onRetake} className="process-btn done">
            <Check size={18} /> Scan Another
          </button>
        )}
      </div>
    </div>
  );
};

export default ReceiptPreview;
