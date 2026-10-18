import React from 'react';

export const Card = ({ children, className = '', title, action }) => {
  return (
    <div className={`bg-slate-900 border border-slate-800 rounded-xl shadow-lg p-5 ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800/80">
          {title && <h3 className="text-base font-semibold text-slate-100">{title}</h3>}
          {action && <div>{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
};

export default Card;
