import React from 'react';
import StudentAvatar from './StudentAvatar';

export const AVATARS = [
  { id: 'navy-scholar', gender: 'male', skin: '#e8c39e', hair: '#5c3a1e', suit: '#1e3a5f', tie: '#dc2626', label: 'Navy Scholar' },
  { id: 'rose-exec', gender: 'female', skin: '#fce4d6', hair: '#3d2817', suit: '#374151', tie: '#ec4899', label: 'Rose Executive' },
  { id: 'gold-ambassador', gender: 'male', skin: '#8d5524', hair: '#1a1a1a', suit: '#0a0a0a', tie: '#f59e0b', label: 'Gold Ambassador' },
  { id: 'teal-leader', gender: 'female', skin: '#6b4423', hair: '#1a1a1a', suit: '#1e3a5f', tie: '#14b8a6', label: 'Teal Leader' },
  { id: 'indigo-curly', gender: 'male', skin: '#c68642', hair: '#1a1a1a', suit: '#374151', tie: '#6366f1', label: 'Indigo Curly' },
  { id: 'violet-pony', gender: 'female', skin: '#d4a574', hair: '#2d1a0e', suit: '#0a0a0a', tie: '#a855f7', label: 'Violet Pony' },
  { id: 'emergent-blonde', gender: 'male', skin: '#fce4d6', hair: '#d4a017', suit: '#1e3a5f', tie: '#22c55e', label: 'Emergent Blonde' },
  { id: 'amber-bob', gender: 'female', skin: '#fce4d6', hair: '#1a1a1a', suit: '#374151', tie: '#f97316', label: 'Amber Bob' },
];

const AvatarSelector = ({ selected, onSelect, genderFilter }) => {
  const g = (genderFilter || '').toString().trim().toLowerCase();
  const isFemale = g === 'female' || g === 'f' || g.startsWith('f');
  const isMale = g === 'male' || g === 'm' || g.startsWith('m');
  const targetGender = isFemale ? 'female' : isMale ? 'male' : null;

  const filteredAvatars = targetGender 
    ? AVATARS.filter(a => a.gender === targetGender)
    : AVATARS;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {filteredAvatars.map((avatar) => (
        <button
          key={avatar.id}
          type="button"
          onClick={() => onSelect(avatar.id)}
          className={`relative rounded-2xl p-4 border-2 transition-all flex flex-col items-center
            ${selected === avatar.id 
              ? 'border-indigo-500 bg-indigo-50 shadow-lg scale-105' 
              : 'border-transparent bg-slate-50 hover:border-indigo-300 hover:shadow-md hover:-translate-y-1'
            }`}
        >
          <div className="bg-white rounded-full p-2 shadow-sm mb-3">
            <StudentAvatar avatarId={avatar.id} size={80} />
          </div>
          <p className="text-xs font-bold text-slate-600 text-center">{avatar.label}</p>
          {selected === avatar.id && (
            <div className="absolute top-3 right-3 w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md">
              ✓
            </div>
          )}
        </button>
      ))}
    </div>
  );
};

export default AvatarSelector;
