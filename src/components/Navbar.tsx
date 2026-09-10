import React from 'react';
import { Menu, LogOut, Shield, Church as ChurchIcon, Bell, Plus } from 'lucide-react';
import { User, Church } from '../types';

interface Props {
  user: User;
  church?: Church | null;
  onOpenDrawer: () => void;
  onLogout: () => void;
  onQuickAction?: (action: string) => void;
}

export const Navbar: React.FC<Props> = ({ user, church, onOpenDrawer, onLogout, onQuickAction }) => {
  const isSuperAdmin = user.role === 'SUPER_ADMIN';
  const isMember = user.role === 'MEMBER';
  const currency = church?.settings?.currency || 'GH₵';

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 lg:px-8 shrink-0 z-20">
      {/* Left: Brand / Church Info */}
      <div className="flex items-center gap-3 sm:gap-4 text-left">
        <button
          onClick={onOpenDrawer}
          className="p-2 -ml-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition lg:hidden"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Mobile brand (hidden on desktop where sidebar is present) */}
        <div className="flex items-center gap-2.5 lg:hidden">
          <div className="w-8 h-8 bg-teal-700 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-xs">
            {isSuperAdmin ? <Shield className="w-4 h-4" /> : 'C'}
          </div>
          <span className="text-base font-bold tracking-tight text-teal-900">Church-OS</span>
        </div>

        {/* Desktop church header */}
        <div className="hidden lg:flex items-center gap-3">
          <h2 className="text-lg font-semibold text-slate-800 tracking-tight">
            {isSuperAdmin ? 'Church-OS Platform Governance' : church?.name || 'Grace Community Chapel'}
          </h2>
          {!isSuperAdmin && (
            <span className="px-2.5 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded-full uppercase tracking-wider">
              Verified
            </span>
          )}
        </div>
      </div>

      {/* Right: Quick Stats & Actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* SMS Balance Pill */}
        {!isSuperAdmin && !isMember && (
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-full text-xs font-medium text-slate-600">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span>SMS Balance: {currency} 428.50</span>
          </div>
        )}

        {/* Quick Action Button */}
        {!isSuperAdmin && !isMember && onQuickAction && (
          <button
            onClick={() => onQuickAction('record-giving')}
            className="hidden sm:inline-flex items-center gap-1.5 bg-teal-700 hover:bg-teal-800 text-white px-3.5 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Record Giving</span>
          </button>
        )}

        {/* Notifications */}
        <button
          title="Notifications"
          className="relative p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-teal-600 rounded-full ring-2 ring-white" />
        </button>

        {/* Mobile Profile / Logout */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-bold text-xs">
            {user.fullName ? user.fullName[0].toUpperCase() : 'U'}
          </div>
          <button
            onClick={onLogout}
            title="Log out"
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
