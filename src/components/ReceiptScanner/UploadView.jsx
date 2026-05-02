import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, Camera } from 'lucide-react';

const UploadView = ({ onUpload, onSwitchToCamera }) => {
  const onDrop = useCallback((acceptedFiles) => {
    const file = acceptedFiles[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        onUpload(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  }, [onUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    multiple: false
  });

  return (
    <div className="upload-view">
      <div {...getRootProps()} className={`dropzone ${isDragActive ? 'active' : ''}`}>
        <input {...getInputProps()} />
        <UploadCloud size={48} className="upload-icon" />
        {isDragActive ? (
          <p>Drop the receipt image here...</p>
        ) : (
          <p>Drag & drop a receipt image here, or click to select file</p>
        )}
      </div>
      <div className="upload-divider"><span>OR</span></div>
      <button onClick={onSwitchToCamera} className="switch-camera-btn">
        <Camera size={20} />
        Use Camera to Scan
      </button>
    </div>
  );
};

export default UploadView;
