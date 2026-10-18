import React from 'react';

export const StatCard = ({ title, value, change, icon: Icon, color = 'emerald' }) => {
  const iconBg = {
    emerald: 'bg-emerald-500/10 text-emerald-400',
    blue: 'bg-blue-500/10 text-blue-400',
    amber: 'bg-amber-500/10 text-amber-400',
    purple: 'bg-purple-500/10 text-purple-400',
  }[color];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg flex items-center justify-between">
      <div>
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{title}</p>
        <p className="text-2xl font-bold text-white mt-1">{value}</p>
        {change && (
          <p className="text-xs font-medium text-emerald-400 mt-1 flex items-center">
            {change}
          </p>
        )}
      </div>
      {Icon && (
        <div className={`p-3 rounded-lg ${iconBg}`}>
          <Icon className="w-6 h-6" />
        </div>
      )}
    </div>
  );
};

export default StatCard;
