import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import getCroppedImg from '../utils/cropImage';
import { X, Check, ZoomIn, ZoomOut } from 'lucide-react';

const ImageCropperModal = ({ imageSrc, onCropComplete, onClose, aspect = 1 }) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleSave = async () => {
    try {
      setIsProcessing(true);
      const croppedImageBlob = await getCroppedImg(imageSrc, croppedAreaPixels, 0);
      onCropComplete(croppedImageBlob);
    } catch (e) {
      console.error(e);
      alert('Failed to crop image');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(15,23,42,0.85)',
      backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
    }}>
      <div style={{
        background: '#fff', borderRadius: 24, width: '100%', maxWidth: 500, overflow: 'hidden',
        boxShadow: '0 40px 100px rgba(0,0,0,0.4)', display: 'flex', flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex',
          justifyContent: 'space-between', alignItems: 'center'
        }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: '#1e293b' }}>Crop Image</h3>
          <button onClick={onClose} style={{
            background: '#f1f5f9', border: 'none', borderRadius: 999, padding: 8,
            cursor: 'pointer', color: '#64748b', display: 'flex'
          }}>
            <X size={18} />
          </button>
        </div>

        {/* Cropper Container */}
        <div style={{ position: 'relative', width: '100%', height: 360, background: '#e2e8f0' }}>
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            onCropChange={setCrop}
            onCropComplete={handleCropComplete}
            onZoomChange={setZoom}
          />
        </div>

        {/* Controls */}
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <ZoomOut size={18} style={{ color: '#64748b' }} />
            <input
              type="range"
              value={zoom}
              min={1}
              max={3}
              step={0.1}
              onChange={(e) => setZoom(Number(e.target.value))}
              style={{ flex: 1, accentColor: '#4f46e5' }}
            />
            <ZoomIn size={18} style={{ color: '#64748b' }} />
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <button onClick={onClose} style={{
              padding: '12px 24px', borderRadius: 14, border: 'none',
              background: '#f1f5f9', color: '#475569', fontWeight: 800, fontSize: 14, cursor: 'pointer'
            }}>Cancel</button>
            <button onClick={handleSave} disabled={isProcessing} style={{
              padding: '12px 28px', borderRadius: 14, border: 'none',
              background: '#4f46e5', color: '#fff', fontWeight: 900, fontSize: 14,
              cursor: isProcessing ? 'not-allowed' : 'pointer', opacity: isProcessing ? 0.7 : 1,
              display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 16px rgba(79,70,229,0.3)'
            }}>
              <Check size={16} />
              {isProcessing ? 'Processing...' : 'Apply Crop'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageCropperModal;
