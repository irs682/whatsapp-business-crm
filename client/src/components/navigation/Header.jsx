import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { LogOut, Bell, Shield, ChevronDown } from 'lucide-react';

export const Header = () => {
  const { user, logout } = useAuth();

  return (
    <header className="h-16 bg-slate-900 border-b border-slate-800 px-6 flex items-center justify-between shrink-0">
      {/* Title / Breadcrumb context */}
      <div className="flex items-center space-x-2 text-sm">
        <span className="text-slate-400">WhatsApp CRM</span>
        <span className="text-slate-600">/</span>
        <span className="text-slate-200 font-medium">Enterprise Portal</span>
      </div>

      {/* Right User Actions */}
      <div className="flex items-center space-x-4">
        {/* Notifications */}
        <button
          type="button"
          aria-label="Notifications"
          className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors relative"
        >
          <Bell className="w-4 h-4" />
          <span className="w-2 h-2 rounded-full bg-brand-500 absolute top-2 right-2" />
        </button>

        {/* User Badge */}
        <div className="flex items-center space-x-3 pl-3 border-l border-slate-800">
          <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-brand-400">
            {user?.firstName?.[0] || 'U'}
            {user?.lastName?.[0] || ''}
          </div>
          <div className="text-left hidden sm:block">
            <span className="text-xs font-semibold text-slate-200 block">
              {user?.firstName} {user?.lastName}
            </span>
            <span className="text-[10px] text-brand-400 uppercase tracking-wider font-medium block">
              {user?.role}
            </span>
          </div>

          <button
            onClick={logout}
            title="Log Out"
            className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors ml-2"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
