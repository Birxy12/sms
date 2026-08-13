import React from 'react';
import { Camera, Upload, Loader2 } from 'lucide-react';

const GlobalPhotoUploader = ({ 
  photoUrl, 
  uploading, 
  onPhotoSelect, 
  label = 'Portrait',
  recommendedText = 'Recommended: Square image < 2MB'
}) => {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
      padding: '24px 0', background: '#f8fafc', borderRadius: 16,
      border: '2px dashed #c7d2fe', width: '100%'
    }}>
      <div style={{
        width: 120, height: 120, borderRadius: 16, overflow: 'hidden',
        background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
      }}>
        {uploading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <Loader2 size={24} style={{ color: '#4f46e5', animation: 'spin 1s linear infinite' }} />
            <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8' }}>Uploading…</span>
          </div>
        ) : photoUrl ? (
          <img src={photoUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <Camera size={36} style={{ color: '#cbd5e1' }} />
        )}
      </div>
      <label style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px',
        background: '#4f46e5', color: '#fff', borderRadius: 12,
        fontWeight: 800, fontSize: 12, cursor: uploading ? 'not-allowed' : 'pointer',
        boxShadow: '0 4px 12px rgba(79,70,229,0.3)', opacity: uploading ? 0.6 : 1,
        transition: 'transform 0.15s'
      }}
      onMouseEnter={e => !uploading && (e.currentTarget.style.transform = 'scale(1.02)')}
      onMouseLeave={e => !uploading && (e.currentTarget.style.transform = 'scale(1)')}>
        <Upload size={14} />
        {photoUrl ? `Change ${label}` : `Upload ${label}`}
        <input type="file" accept="image/*" onChange={onPhotoSelect} style={{ display: 'none' }} disabled={uploading} />
      </label>
      <p style={{ margin: 0, fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>
        {recommendedText}
      </p>
    </div>
  );
};

export default GlobalPhotoUploader;
