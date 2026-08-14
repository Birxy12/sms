import React from 'react';
import { Camera, Upload, Loader2, Pencil } from 'lucide-react';

const GlobalPhotoUploader = ({ 
  photoUrl, 
  uploading, 
  onPhotoSelect, 
  onEdit,
  label = 'Portrait',
  recommendedText = 'Square image · Max 2MB',
  fallbackUrl = null
}) => {
  return (
    <div style={{
      display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 16,
      padding: '14px 16px', background: '#f8fafc', borderRadius: 14,
      border: '1.5px dashed #c7d2fe', width: '100%', boxSizing: 'border-box'
    }}>
      {/* Avatar Preview */}
      <div style={{
        width: 64, height: 64, borderRadius: 12, overflow: 'hidden', flexShrink: 0,
        background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        {uploading ? (
          <Loader2 size={20} style={{ color: '#4f46e5', animation: 'spin 1s linear infinite' }} />
        ) : photoUrl ? (
          <img src={photoUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : fallbackUrl ? (
          <img src={fallbackUrl} alt="Default Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.8 }} />
        ) : (
          <Camera size={24} style={{ color: '#cbd5e1' }} />
        )}
      </div>

      {/* Info + Buttons */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: '#64748b' }}>
          {photoUrl ? `${label} uploaded` : `No ${label} yet`}
        </p>
        <p style={{ margin: 0, fontSize: 10, color: '#94a3b8', fontWeight: 500 }}>
          {recommendedText}
        </p>
        <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
          <label style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px',
            background: '#4f46e5', color: '#fff', borderRadius: 8,
            fontWeight: 700, fontSize: 11, cursor: uploading ? 'not-allowed' : 'pointer',
            boxShadow: '0 2px 8px rgba(79,70,229,0.25)', opacity: uploading ? 0.6 : 1,
            transition: 'transform 0.15s, opacity 0.15s', whiteSpace: 'nowrap'
          }}
          onMouseEnter={e => !uploading && (e.currentTarget.style.transform = 'scale(1.03)')}
          onMouseLeave={e => !uploading && (e.currentTarget.style.transform = 'scale(1)')}>
            <Upload size={11} />
            {photoUrl ? `Change` : `Upload`}
            <input type="file" accept="image/*" onChange={onPhotoSelect} style={{ display: 'none' }} disabled={uploading} />
          </label>

          {photoUrl && onEdit && (
            <button type="button" onClick={onEdit} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px',
              background: '#f1f5f9', color: '#475569', borderRadius: 8,
              fontWeight: 700, fontSize: 11, cursor: 'pointer', border: 'none',
              transition: 'transform 0.15s'
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.03)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
              <Pencil size={11} />
              Edit
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default GlobalPhotoUploader;
