import React from 'react';

export default function ParticipantAvatar({ name = 'User', size = 'lg', subtitle = '' }) {
  const initials = name
    .trim()
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join('') || 'U';

  const sizeClasses = {
    sm: 'w-12 h-12 text-base',
    md: 'w-20 h-20 text-2xl',
    lg: 'w-28 h-28 text-4xl',
    xl: 'w-36 h-36 text-5xl',
  }[size] || 'w-28 h-28 text-4xl';

  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div
        className={`${sizeClasses} rounded-full bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center font-bold text-white shadow-2xl ring-4 ring-white/10 select-none animate-fade-in`}
      >
        {initials}
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-slate-200">{name}</p>
        {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}
