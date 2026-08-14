import React from 'react';

const StudentAvatar = ({ gender, size = 120, className = '' }) => {
  const isFemale = gender?.toLowerCase() === 'female';

  if (isFemale) {
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
