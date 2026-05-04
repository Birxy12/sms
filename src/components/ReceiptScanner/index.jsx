import React, { useState } from 'react';
import CameraView from './CameraView';
import UploadView from './UploadView';
import ReceiptPreview from './ReceiptPreview';
import './receiptScanner.css';

/**
 * ReceiptScanner
 *
 * @param {function} onComplete         - Called with final payload after successful send
 * @param {object}   messageHubConfig   - { type, endpoint, apiKey, topic }
 */
const ReceiptScanner = ({ onComplete, messageHubConfig, userId }) => {
  const [view, setView] = useState('upload'); // 'upload' | 'camera' | 'preview'
  const [receiptImage, setReceiptImage] = useState(null);
  const [captureSource, setCaptureSource] = useState(null);

  const handleCapture = ({ imageSrc, source }) => {
    setReceiptImage(imageSrc);
    setCaptureSource(source);
    setView('preview');
  };

  const handleUpload = ({ imageSrc, source }) => {
    setReceiptImage(imageSrc);
    setCaptureSource(source);
    setView('preview');
  };

  const handleRetake = () => {
    setReceiptImage(null);
    setCaptureSource(null);
    setView('upload');
  };

  return (
    <div className="receipt-scanner-container">
      {view === 'upload' && (
        <UploadView
          onUpload={handleUpload}
          onSwitchToCamera={() => setView('camera')}
        />
      )}
      {view === 'camera' && (
        <CameraView
          onCapture={handleCapture}
          onSwitchToUpload={() => setView('upload')}
        />
      )}
      {view === 'preview' && (
        <ReceiptPreview
          imageSrc={receiptImage}
          source={captureSource}
          onRetake={handleRetake}
          onComplete={onComplete}
          messageHubConfig={messageHubConfig}
          userId={userId}
        />
      )}
    </div>
  );
};

export default ReceiptScanner;
