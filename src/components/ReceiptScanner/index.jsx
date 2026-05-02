import React, { useState } from 'react';
import CameraView from './CameraView';
import UploadView from './UploadView';
import ReceiptPreview from './ReceiptPreview';
import './receiptScanner.css';

const ReceiptScanner = () => {
  const [view, setView] = useState('upload'); // 'upload', 'camera', 'preview'
  const [receiptImage, setReceiptImage] = useState(null);

  const handleCapture = (imageSrc) => {
    setReceiptImage(imageSrc);
    setView('preview');
  };

  const handleUpload = (imageSrc) => {
    setReceiptImage(imageSrc);
    setView('preview');
  };

  return (
    <div className="receipt-scanner-container">
      {view === 'upload' && <UploadView onUpload={handleUpload} onSwitchToCamera={() => setView('camera')} />}
      {view === 'camera' && <CameraView onCapture={handleCapture} onSwitchToUpload={() => setView('upload')} />}
      {view === 'preview' && <ReceiptPreview imageSrc={receiptImage} onRetake={() => setView('upload')} />}
    </div>
  );
};

export default ReceiptScanner;
