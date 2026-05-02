import React, { useRef, useCallback } from 'react';
import Webcam from 'react-webcam';
import { Camera, X } from 'lucide-react';

const CameraView = ({ onCapture, onSwitchToUpload }) => {
  const webcamRef = useRef(null);

  const capture = useCallback(() => {
    const imageSrc = webcamRef.current.getScreenshot();
    if (imageSrc) {
      onCapture(imageSrc);
    }
  }, [webcamRef, onCapture]);

  return (
    <div className="camera-view">
      <div className="camera-header">
        <h3>Scan Receipt</h3>
        <button onClick={onSwitchToUpload} className="close-btn"><X size={24} /></button>
      </div>
      <div className="webcam-container">
        <Webcam
          audio={false}
          ref={webcamRef}
          screenshotFormat="image/jpeg"
          videoConstraints={{ facingMode: "environment" }}
          className="webcam"
        />
      </div>
      <div className="camera-controls">
        <button onClick={capture} className="capture-btn">
          <Camera size={32} />
        </button>
      </div>
    </div>
  );
};

export default CameraView;
