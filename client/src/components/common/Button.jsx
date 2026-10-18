import React from 'react';

const variants = {
  primary: 'bg-brand-600 hover:bg-brand-500 text-white shadow-sm shadow-brand-950/50',
  secondary: 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700',
  danger: 'bg-rose-600 hover:bg-rose-500 text-white',
  ghost: 'bg-transparent hover:bg-slate-800 text-slate-300',
};

const sizes = {
  sm: 'px-2.5 py-1.5 text-xs font-medium',
  md: 'px-4 py-2 text-sm font-medium',
  lg: 'px-5 py-2.5 text-base font-semibold',
};

export const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  disabled = false,
  type = 'button',
  onClick,
  ...props
}) => {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center justify-center rounded-lg transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-brand-500/50 disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;
