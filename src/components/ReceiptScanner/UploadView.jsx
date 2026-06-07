import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, Camera, FileImage } from 'lucide-react';

const UploadView = ({ onUpload, onSwitchToCamera }) => {
  const onDrop = useCallback((acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      onUpload({ imageSrc: e.target.result, source: 'upload' });
    };
    reader.readAsDataURL(file);
  }, [onUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [], 'application/pdf': ['.pdf'] },
    multiple: false,
  });

  return (
    <div className="upload-view">
      <div className="upload-hero">
        <FileImage size={32} className="upload-hero-icon" />
        <h2>Scan a Receipt</h2>
        <p>Upload an image or use your camera for live document detection</p>
      </div>

      <div {...getRootProps()} className={`dropzone ${isDragActive ? 'active' : ''}`}>
        <input {...getInputProps()} />
        <UploadCloud size={44} className="upload-icon" />
        {isDragActive ? (
          <p className="dropzone-text">Drop it here!</p>
        ) : (
          <>
            <p className="dropzone-text">Drag & drop a receipt image</p>
            <span className="dropzone-sub">or click to browse files</span>
          </>
        )}
        <div className="supported-formats">JPG · PNG · WEBP · HEIC · PDF</div>
      </div>

      <div className="upload-divider">
        <span>OR</span>
      </div>

      <button onClick={onSwitchToCamera} className="switch-camera-btn">
        <Camera size={20} />
        Use Camera with Live Detection
        <span className="btn-badge">jscanify</span>
      </button>
    </div>
  );
};

export default UploadView;
