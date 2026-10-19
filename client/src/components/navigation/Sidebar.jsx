import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  MessageSquare,
  Users,
  Briefcase,
  CheckSquare,
  Building2,
  UserCog,
  Megaphone,
  BarChart3,
  Settings,
  ShieldCheck,
} from 'lucide-react';
import { ROUTES } from '../../constants/routes';

const navItems = [
  { name: 'Dashboard', path: ROUTES.DASHBOARD, icon: LayoutDashboard },
  { name: 'Shared Inbox', path: ROUTES.INBOX, icon: MessageSquare, badge: 'WhatsApp' },
  { name: 'Contacts', path: ROUTES.CONTACTS, icon: Users },
  { name: 'Leads Pipeline', path: ROUTES.LEADS, icon: Briefcase },
  { name: 'Tasks & Follow-ups', path: ROUTES.TASKS, icon: CheckSquare },
  { name: 'Departments', path: ROUTES.DEPARTMENTS, icon: Building2 },
  { name: 'Users & Agents', path: ROUTES.USERS, icon: UserCog },
  { name: 'Campaigns', path: ROUTES.CAMPAIGNS, icon: Megaphone },
  { name: 'Analytics & Reports', path: ROUTES.REPORTS, icon: BarChart3 },
  { name: 'Settings', path: ROUTES.SETTINGS, icon: Settings },
];

export const Sidebar = () => {
  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 select-none">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 border-b border-slate-800 space-x-3">
        <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center text-white shadow-md shadow-brand-950">
          <MessageSquare className="w-5 h-5 fill-white/20" />
        </div>
        <div>
          <span className="font-bold text-sm tracking-wide text-white block">WhatsApp CRM</span>
          <span className="text-[10px] text-brand-400 font-medium tracking-wider uppercase block">Business Suite</span>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
          Main Modules
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-500/10 text-brand-400 border border-brand-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`
              }
            >
              <div className="flex items-center space-x-3">
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.name}</span>
              </div>
              {item.badge && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-brand-500/20 text-brand-400 font-semibold">
                  {item.badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Meta Graph Status Indicator */}
      <div className="p-4 border-t border-slate-800/80">
        <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-3 flex items-center space-x-3">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          <div className="text-xs">
            <span className="text-slate-300 font-medium block">Cloud API v21.0</span>
            <span className="text-slate-500 text-[11px] block">Webhook Active</span>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
