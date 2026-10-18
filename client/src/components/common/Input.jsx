import React from 'react';

export const Input = ({
  label,
  error,
  type = 'text',
  placeholder = '',
  value,
  onChange,
  className = '',
  name,
  required = false,
  ...props
}) => {
  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label className="block text-xs font-medium text-slate-300">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className={`w-full bg-slate-950 border ${
          error ? 'border-rose-500' : 'border-slate-800'
        } rounded-lg px-3.5 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-colors`}
        {...props}
      />
      {error && <p className="text-xs text-rose-400">{error}</p>}
    </div>
  );
};

export default Input;
