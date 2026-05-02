import React, { useState } from 'react';
import { Check, RefreshCw, Loader2 } from 'lucide-react';

const ReceiptPreview = ({ imageSrc, onRetake }) => {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleProcess = async () => {
    setIsProcessing(true);
    // TODO: Implement OCR processing logic here
    setTimeout(() => {
      setIsProcessing(false);
      alert('Receipt processed successfully! (Mock)');
    }, 2000);
  };

  return (
    <div className="receipt-preview">
      <div className="preview-header">
        <h3>Confirm Receipt</h3>
      </div>
      <div className="image-container">
        <img src={imageSrc} alt="Receipt preview" />
      </div>
      <div className="preview-controls">
        <button onClick={onRetake} className="retake-btn" disabled={isProcessing}>
          <RefreshCw size={20} /> Retake
        </button>
        <button onClick={handleProcess} className="process-btn" disabled={isProcessing}>
          {isProcessing ? <Loader2 size={20} className="animate-spin" /> : <Check size={20} />}
          {isProcessing ? 'Processing...' : 'Process Receipt'}
        </button>
      </div>
    </div>
  );
};

export default ReceiptPreview;
