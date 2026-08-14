import React from 'react';
import { AVATARS } from './AvatarSelector';

const StudentAvatar = ({ gender, avatarId, data, size = 120, className = '' }) => {
  // Use passed data, or lookup avatarId, or default to null
  const avatarData = data || (avatarId ? AVATARS.find(a => a.id === avatarId) : null);

  if (avatarData) {
    const { gender: aGender, skin, hair, suit, tie } = avatarData;
    const isFemale = aGender === 'female';
    const faceId = `face-shadow-${avatarData.id}`;
    const suitId = `suit-shadow-${avatarData.id}`;
    const skinGradId = `skinGrad-${avatarData.id}`;

    return (
      <svg width={size} height={size} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <defs>
          <radialGradient id={skinGradId} cx="50%" cy="30%" r="60%">
            <stop offset="0%" stopColor={skin} stopOpacity="1" />
            <stop offset="100%" stopColor={skin} stopOpacity="0.65" />
          </radialGradient>
          
          <filter id={faceId} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="4" stdDeviation="4" floodOpacity="0.15" />
          </filter>
          
          <filter id={suitId} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="8" stdDeviation="6" floodOpacity="0.25" />
          </filter>
        </defs>

        {/* Background */}
        <circle cx="60" cy="60" r="60" fill="#f1f5f9" />

        {/* Hair Back / Bun (Female) */}
        {isFemale && (
          <path d="M35 55C35 30 45 15 60 15C75 15 85 30 85 55C85 85 80 100 70 100C60 100 50 100 50 100C40 100 35 85 35 55Z" fill={hair} />
        )}

        {/* Suit & Shoulders (3D drop shadow) */}
        <path d="M20 120C20 90 40 75 60 75C80 75 100 90 100 120" fill={suit} filter={`url(#${suitId})`} />
        
        {/* Shirt Collar */}
        <path d="M45 75L60 95L75 75H45Z" fill="#ffffff" />
        
        {/* Tie (Knot + Body) */}
        <path d="M56 82L64 82L62 90L58 90Z" fill={tie} opacity="0.85" />
        <path d="M58 90L62 90L65 120L60 125L55 120Z" fill={tie} />

        {/* Neck */}
        <path d="M50 65H70V80H50V65Z" fill={`url(#${skinGradId})`} />
        
        {/* Face */}
        <circle cx="60" cy="55" r="24" fill={`url(#${skinGradId})`} filter={`url(#${faceId})`} />
        
        {/* Specular Highlight (glossy forehead) */}
        <ellipse cx="52" cy="42" rx="4" ry="2" fill="#ffffff" opacity="0.3" transform="rotate(-15 52 42)" />
        <ellipse cx="68" cy="42" rx="3" ry="1.5" fill="#ffffff" opacity="0.15" transform="rotate(15 68 42)" />

        {/* Hair Front (Male vs Female) */}
        {isFemale ? (
          <>
            <path d="M36 55C36 30 46 22 60 22C74 22 84 30 84 55C84 40 74 35 60 35C46 35 36 40 36 55Z" fill={hair} opacity="0.9" />
            <path d="M36 55C36 75 40 85 45 85C48 85 48 70 48 70C48 70 42 65 36 55Z" fill={hair} opacity="0.95" />
            <path d="M84 55C84 75 80 85 75 85C72 85 72 70 72 70C72 70 78 65 84 55Z" fill={hair} opacity="0.95" />
          </>
        ) : (
          <>
            <path d="M38 55C38 35 46 26 60 26C74 26 82 35 82 55C82 45 74 32 60 32C46 32 38 45 38 55Z" fill={hair} opacity="0.9" />
            <path d="M38 55C38 65 40 68 42 70V55H38Z" fill={hair} opacity="0.8" />
            <path d="M82 55C82 65 80 68 78 70V55H82Z" fill={hair} opacity="0.8" />
          </>
        )}
      </svg>
    );
  }

  // Fallback Legacy Avatars
  const isFemaleFallback = gender?.toLowerCase() === 'female';

  if (isFemaleFallback) {
    return (
      <svg width={size} height={size} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        {/* Background */}
        <circle cx="60" cy="60" r="60" fill="#FDF4FF" />
        
        {/* Hair Back */}
        <path d="M35 55C35 30 45 20 60 20C75 20 85 30 85 55C85 85 80 100 70 100C60 100 50 100 50 100C40 100 35 85 35 55Z" fill="#5D4037" />
        
        {/* Body/Shirt */}
        <path d="M30 120C30 95 45 85 60 85C75 85 90 95 90 120" fill="#F472B6" />
        
        {/* Neck */}
        <path d="M50 70H70V90H50V70Z" fill="#FFCCBC" />
        
        {/* Face */}
        <circle cx="60" cy="55" r="22" fill="#FFCCBC" />
        
        {/* Blush */}
        <circle cx="48" cy="60" r="4" fill="#FF8A65" opacity="0.5" />
        <circle cx="72" cy="60" r="4" fill="#FF8A65" opacity="0.5" />
        
        {/* Hair Front/Bangs */}
        <path d="M38 55C38 35 48 25 60 25C72 25 82 35 82 55C82 40 72 35 60 35C48 35 38 40 38 55Z" fill="#4E342E" />
        <path d="M38 55C38 75 42 85 45 85C48 85 48 70 48 70C48 70 42 65 38 55Z" fill="#4E342E" />
        <path d="M82 55C82 75 78 85 75 85C72 85 72 70 72 70C72 70 78 65 82 55Z" fill="#4E342E" />
      </svg>
    );
  }

  // Male Legacy
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Background */}
      <circle cx="60" cy="60" r="60" fill="#EFF6FF" />
      
      {/* Body/Shirt */}
      <path d="M25 120C25 90 45 80 60 80C75 80 95 90 95 120" fill="#3B82F6" />
      
      {/* Neck */}
      <path d="M50 70H70V90H50V70Z" fill="#FFCCBC" />
      
      {/* Face */}
      <circle cx="60" cy="55" r="22" fill="#FFCCBC" />
      
      {/* Hair Top */}
      <path d="M38 55C38 35 48 28 60 28C72 28 82 35 82 55C82 45 72 32 60 32C48 32 38 45 38 55Z" fill="#1E293B" />
      
      {/* Hair Side/Fade */}
      <path d="M38 55C38 65 40 68 42 70V55H38Z" fill="#334155" />
      <path d="M82 55C82 65 80 68 78 70V55H82Z" fill="#334155" />
    </svg>
  );
};

export default StudentAvatar;
