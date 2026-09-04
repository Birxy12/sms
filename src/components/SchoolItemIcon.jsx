import React from 'react';

const ICONS = {
  uniform: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 4l-3 4v12a1 1 0 001 1h16a1 1 0 001-1V8l-3-4H6z" />
      <path d="M12 4v16" />
      <path d="M6 8h12" />
      <path d="M9 4V2.5a.5.5 0 01.5-.5h5a.5.5 0 01.5.5V4" />
      <path d="M8 12h.01" />
      <path d="M16 12h.01" />
      <path d="M8 16h.01" />
      <path d="M16 16h.01" />
    </svg>
  ),

  textbook: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
      <path d="M12 6h4" />
      <path d="M12 10h4" />
      <path d="M8 6h.01" />
      <path d="M8 10h.01" />
      <path d="M8 14h8" />
      <path d="M8 18h8" />
    </svg>
  ),

  'exercise-book': (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 4h18v16H3z" />
      <path d="M7 2v20" />
      <path d="M11 6h6" />
      <path d="M11 10h6" />
      <path d="M11 14h6" />
      <path d="M11 18h4" />
      <path d="M5 8h.01" />
      <path d="M5 12h.01" />
      <path d="M5 16h.01" />
    </svg>
  ),

  'p.e-wear': (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M6 21v-2a4 4 0 014-4h4a4 4 0 014 4v2" />
      <path d="M15 10l2-2" />
      <path d="M9 10l-2-2" />
      <path d="M12 4V2" />
    </svg>
  ),

  jacket: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 3l-4 5v12a1 1 0 001 1h14a1 1 0 001-1V8l-4-5H8z" />
      <path d="M12 3v18" />
      <path d="M8 8h8" />
      <path d="M8 12h8" />
      <path d="M8 16h8" />
      <path d="M6 6l-2 2" />
      <path d="M18 6l2 2" />
    </svg>
  ),

  'sport-wear': (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 4l-2 4v10a1 1 0 001 1h14a1 1 0 001-1V8l-2-4H6z" />
      <path d="M12 4v15" />
      <path d="M6 8h12" />
      <path d="M6 12h12" />
      <path d="M6 16h12" />
      <circle cx="12" cy="6" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  ),
};

const SchoolItemIcon = ({
  item,
  size = 24,
  color = 'currentColor',
  bgColor = 'transparent',
  className = '',
  style = {},
}) => {
  const iconSvg = ICONS[item] || ICONS.uniform;

  return (
    <span
      className={`school-item-icon ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        color: color,
        backgroundColor: bgColor,
        borderRadius: bgColor !== 'transparent' ? '8px' : 0,
        padding: bgColor !== 'transparent' ? '6px' : 0,
        ...style,
      }}
      title={item?.replace(/-/g, ' ').toUpperCase()}
    >
      {React.cloneElement(iconSvg, {
        width: bgColor !== 'transparent' ? size - 12 : size,
        height: bgColor !== 'transparent' ? size - 12 : size,
      })}
    </span>
  );
};

export default SchoolItemIcon;
