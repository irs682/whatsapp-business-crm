import React from 'react';

const colorStyles = {
  emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  rose: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  slate: 'bg-slate-700/30 text-slate-400 border-slate-700/50',
};

export const Badge = ({ children, color = 'slate', className = '' }) => {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${colorStyles[color] || colorStyles.slate} ${className}`}
    >
      {children}
    </span>
  );
};

export default Badge;
