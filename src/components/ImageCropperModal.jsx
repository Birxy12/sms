import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import getCroppedImg from '../utils/cropImage';
import { X, Check, ZoomIn, ZoomOut, RotateCcw, RotateCw } from 'lucide-react';

const ImageCropperModal = ({ imageSrc, onCropComplete, onClose, aspect = 1 }) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleSave = async () => {
    try {
      setIsProcessing(true);
      const croppedImageBlob = await getCroppedImg(imageSrc, croppedAreaPixels, rotation);
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
      position: 'fixed', inset: 0, zIndex: 99999, 
      background: 'rgba(2, 6, 23, 0.75)', // Slate 950 with opacity
      backdropFilter: 'blur(16px)', 
      WebkitBackdropFilter: 'blur(16px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
    }}>
      <div style={{
        background: 'linear-gradient(to bottom right, rgba(30, 41, 59, 0.8), rgba(15, 23, 42, 0.95))', // Slate 800 to Slate 900
        borderRadius: 24, width: '100%', maxWidth: 540, overflow: 'hidden',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.1)', 
        border: '1px solid rgba(255, 255, 255, 0.1)',
        display: 'flex', flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex',
          justifyContent: 'space-between', alignItems: 'center'
        }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#f8fafc', letterSpacing: '-0.02em' }}>Edit Photo</h3>
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 999, padding: 8,
            cursor: 'pointer', color: '#94a3b8', display: 'flex', transition: 'all 0.2s ease'
          }}
          onMouseOver={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.1)' }}
          onMouseOut={e => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}>
            <X size={18} strokeWidth={2.5} />
          </button>
        </div>

        {/* Cropper Container */}
        <div style={{ position: 'relative', width: '100%', height: 380, background: '#020617', overflow: 'hidden' }}>
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={aspect}
            onCropChange={setCrop}
            onRotationChange={setRotation}
            onCropComplete={handleCropComplete}
            onZoomChange={setZoom}
            style={{
              containerStyle: { background: '#020617' },
              cropAreaStyle: { border: '2px solid rgba(255, 255, 255, 0.8)', boxShadow: '0 0 0 9999em rgba(0,0,0,0.6)' }
            }}
          />
        </div>

        {/* Controls */}
        <div style={{ padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Zoom Control */}
          <div>
             <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
               <span style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Zoom</span>
               <span style={{ fontSize: 12, fontWeight: 600, color: '#f8fafc' }}>{Math.round(zoom * 100)}%</span>
             </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <ZoomOut size={16} style={{ color: '#64748b' }} />
              <input
                type="range"
                value={zoom}
                min={1}
                max={3}
                step={0.05}
                onChange={(e) => setZoom(Number(e.target.value))}
                style={{ flex: 1, accentColor: '#818cf8', height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2, outline: 'none', appearance: 'none' }}
              />
              <ZoomIn size={16} style={{ color: '#64748b' }} />
            </div>
          </div>

          {/* Rotation Control */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
               <span style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Rotation</span>
               <span style={{ fontSize: 12, fontWeight: 600, color: '#f8fafc' }}>{rotation}°</span>
             </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <RotateCcw size={16} style={{ color: '#64748b' }} />
              <input
                type="range"
                value={rotation}
                min={-180}
                max={180}
                step={1}
                onChange={(e) => setRotation(Number(e.target.value))}
                style={{ flex: 1, accentColor: '#818cf8', height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2, outline: 'none', appearance: 'none' }}
              />
              <RotateCw size={16} style={{ color: '#64748b' }} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
            <button onClick={onClose} style={{
              padding: '12px 24px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.05)', color: '#cbd5e1', fontWeight: 600, fontSize: 14, cursor: 'pointer', transition: 'all 0.2s ease'
            }}
            onMouseOver={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#fff' }}
            onMouseOut={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#cbd5e1' }}>
              Cancel
            </button>
            <button onClick={handleSave} disabled={isProcessing} style={{
              padding: '12px 28px', borderRadius: 12, border: '1px solid rgba(129, 140, 248, 0.4)',
              background: 'linear-gradient(to bottom, #6366f1, #4f46e5)', color: '#fff', fontWeight: 700, fontSize: 14,
              cursor: isProcessing ? 'not-allowed' : 'pointer', opacity: isProcessing ? 0.7 : 1,
              display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 16px rgba(79,70,229,0.4)', transition: 'all 0.2s ease'
            }}
            onMouseOver={e => { if(!isProcessing) e.currentTarget.style.boxShadow = '0 8px 24px rgba(79,70,229,0.6)' }}
            onMouseOut={e => { if(!isProcessing) e.currentTarget.style.boxShadow = '0 4px 16px rgba(79,70,229,0.4)' }}>
              {isProcessing ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
      <style dangerouslySetInnerHTML={{__html: `
        input[type=range]::-webkit-slider-thumb {
          -webkit-appearance: none;
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: #818cf8;
          cursor: pointer;
          box-shadow: 0 0 10px rgba(129, 140, 248, 0.5);
        }
      `}} />
    </div>
  );
};

export default ImageCropperModal;
