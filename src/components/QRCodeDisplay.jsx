import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

/**
 * QRCodeDisplay - Reusable QR code for receipts, admission letters, ID cards
 * 
 * @param {string} value - The data to encode (URL, JSON, or plain text)
 * @param {number} size - QR code size in pixels (default: 128)
 * @param {string} label - Text label below the QR code
 * @param {string} sublabel - Smaller text below the label
 * @param {string} bgColor - Background color (default: white)
 * @param {string} fgColor - Foreground color (default: navy blue)
 * @param {string} level - Error correction level: L, M, Q, H (default: H)
 * @param {boolean} includeMargin - Add white margin around QR (default: true)
 * @param {string} className - Additional CSS classes
 */
const QRCodeDisplay = ({
  value,
  size = 128,
  label,
  sublabel,
  bgColor = '#ffffff',
  fgColor = '#1a237e', // Navy blue - matches school branding
  level = 'H',
  includeMargin = true,
  className = '',
}) => {
  // Ensure we always have a string value
  const qrValue = value ? String(value) : 'https://bonusdominus.edu.ng';

  return (
    <div 
      className={`qr-code-wrapper ${className}`}
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '12px',
        backgroundColor: bgColor,
        borderRadius: '8px',
        border: '1px solid #e0e0e0',
      }}
    >
      <QRCodeSVG
        value={qrValue}
        size={size}
        bgColor={bgColor}
        fgColor={fgColor}
        level={level}
        includeMargin={includeMargin}
      />
      
      {label && (
        <p
          style={{
            margin: '8px 0 2px 0',
            fontSize: size <= 80 ? '10px' : '12px',
            fontWeight: '600',
            color: fgColor,
            textAlign: 'center',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            letterSpacing: '0.5px',
          }}
        >
          {label}
        </p>
      )}
      
      {sublabel && (
        <p
          style={{
            margin: 0,
            fontSize: size <= 80 ? '8px' : '10px',
            color: '#666666',
            textAlign: 'center',
            fontFamily: 'monospace',
          }}
        >
          {sublabel}
        </p>
      )}
    </div>
  );
};

export default QRCodeDisplay;
