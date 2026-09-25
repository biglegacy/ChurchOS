import React, { useState, useEffect, useRef } from 'react';
import {
  Menu,
  LogOut,
  Shield,
  Church as ChurchIcon,
  Bell,
  Plus,
  X,
  CheckCircle2,
  DollarSign,
  MessageSquare,
  Calendar,
  UserCheck,
  AlertCircle,
  Trash2,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import { User, Church, ChurchNotification } from '../types';
import { ApiClient } from '../api';

interface Props {
  user: User;
  church?: Church | null;
  onOpenDrawer: () => void;
  onLogout: () => void;
  onQuickAction?: (action: string) => void;
  onNavigateTab?: (tab: string) => void;
}

export const Navbar: React.FC<Props> = ({
  user,
  church,
  onOpenDrawer,
  onLogout,
  onQuickAction,
  onNavigateTab,
}) => {
  const isSuperAdmin = user.role === 'SUPER_ADMIN';
  const isMember = user.role === 'MEMBER';
  const currency = church?.settings?.currency || 'GH₵';

  // Notifications state
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<ChurchNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'UNREAD' | 'FINANCE' | 'SMS' | 'EVENT'>('ALL');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      setLoadingNotifications(true);
      const res = await ApiClient.get('/api/church/notifications');
      if (res && Array.isArray(res.notifications)) {
        setNotifications(res.notifications);
        setUnreadCount(typeof res.unreadCount === 'number' ? res.unreadCount : 0);
      } else if (Array.isArray(res)) {
        setNotifications(res);
        setUnreadCount(res.filter((n: any) => !n.isRead).length);
      }
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoadingNotifications(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 45000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    if (showNotifications) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNotifications]);

  const handleToggleNotifications = () => {
    if (!showNotifications) {
      fetchNotifications();
    }
    setShowNotifications(!showNotifications);
  };

  const handleMarkAllRead = async () => {
    try {
      await ApiClient.post('/api/church/notifications/mark-read', { all: true });
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const handleItemClick = async (notif: ChurchNotification) => {
    if (!notif.isRead) {
      try {
        await ApiClient.post('/api/church/notifications/mark-read', { id: notif.id });
        setNotifications(prev =>
          prev.map(n => (n.id === notif.id ? { ...n, isRead: true } : n))
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch (err) {
        console.error('Failed to mark as read:', err);
      }
    }

    if (notif.linkTab && onNavigateTab) {
      setShowNotifications(false);
      onNavigateTab(notif.linkTab);
    }
  };

  const handleDismissNotification = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await ApiClient.delete(`/api/church/notifications/${id}`);
      setNotifications(prev => prev.filter(n => n.id !== id));
      setUnreadCount(prev => {
        const item = notifications.find(n => n.id === id);
        return item && !item.isRead ? Math.max(0, prev - 1) : prev;
      });
    } catch (err) {
      console.error('Failed to dismiss notification:', err);
    }
  };

  const formatTimestamp = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'FINANCE':
        return <DollarSign className="w-4 h-4 text-emerald-600" />;
      case 'SMS':
        return <MessageSquare className="w-4 h-4 text-sky-600" />;
      case 'EVENT':
        return <Calendar className="w-4 h-4 text-indigo-600" />;
      case 'MEMBER':
        return <UserCheck className="w-4 h-4 text-amber-600" />;
      case 'SYSTEM':
      default:
        return <AlertCircle className="w-4 h-4 text-purple-600" />;
    }
  };

  const getCategoryBg = (category: string) => {
    switch (category) {
      case 'FINANCE':
        return 'bg-emerald-50 border-emerald-200';
      case 'SMS':
        return 'bg-sky-50 border-sky-200';
      case 'EVENT':
        return 'bg-indigo-50 border-indigo-200';
      case 'MEMBER':
        return 'bg-amber-50 border-amber-200';
      case 'SYSTEM':
      default:
        return 'bg-purple-50 border-purple-200';
    }
  };

  const filteredNotifications = (notifications || []).filter(n => {
    if (activeFilter === 'UNREAD') return !n.isRead;
    if (activeFilter === 'FINANCE') return n.category === 'FINANCE';
    if (activeFilter === 'SMS') return n.category === 'SMS';
    if (activeFilter === 'EVENT') return n.category === 'EVENT';
    return true;
  });

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 lg:px-8 shrink-0 z-20 relative">
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

        {/* Notifications Bell Button & Popover */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={handleToggleNotifications}
            title="System & Church Notifications"
            className={`relative p-2 rounded-lg transition-colors ${
              showNotifications
                ? 'bg-teal-50 text-teal-700 ring-2 ring-teal-600/20'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
            }`}
            aria-expanded={showNotifications}
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 bg-teal-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-xs">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown Panel */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 text-left overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
              {/* Header */}
              <div className="p-3.5 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-slate-900 text-sm">Notifications</span>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-teal-100 text-teal-800">
                      {unreadCount} unread
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-1">
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-[11px] font-semibold text-teal-700 hover:text-teal-800 hover:underline px-1.5 py-0.5"
                    >
                      Mark all read
                    </button>
                  )}
                  <button
                    onClick={() => setShowNotifications(false)}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded-md"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center space-x-1 px-3 py-2 border-b border-slate-100 bg-white overflow-x-auto text-[11px]">
                {(['ALL', 'UNREAD', 'FINANCE', 'SMS', 'EVENT'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveFilter(tab)}
                    className={`px-2.5 py-1 rounded-full font-medium transition-colors shrink-0 ${
                      activeFilter === tab
                        ? 'bg-teal-700 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {tab === 'ALL' && 'All'}
                    {tab === 'UNREAD' && 'Unread'}
                    {tab === 'FINANCE' && 'Finances'}
                    {tab === 'SMS' && 'SMS'}
                    {tab === 'EVENT' && 'Events'}
                  </button>
                ))}
              </div>

              {/* Notification List */}
              <div className="max-h-96 overflow-y-auto divide-y divide-slate-100">
                {loadingNotifications && (notifications || []).length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400">Loading notifications...</div>
                ) : (filteredNotifications || []).length === 0 ? (
                  <div className="p-8 text-center">
                    <CheckCircle2 className="w-8 h-8 text-teal-600/40 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-slate-700">All caught up!</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {activeFilter === 'UNREAD'
                        ? 'No unread notifications right now.'
                        : 'No notifications found for this category.'}
                    </p>
                  </div>
                ) : (
                  filteredNotifications.map(notif => (
                    <div
                      key={notif.id}
                      onClick={() => handleItemClick(notif)}
                      className={`p-3.5 flex items-start space-x-3 cursor-pointer transition-colors relative group ${
                        notif.isRead ? 'bg-white hover:bg-slate-50/80' : 'bg-teal-50/25 hover:bg-teal-50/40'
                      }`}
                    >
                      {/* Icon */}
                      <div className={`p-2 rounded-xl border shrink-0 ${getCategoryBg(notif.category)}`}>
                        {getCategoryIcon(notif.category)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 pr-6">
                        <div className="flex items-center space-x-1.5 mb-0.5">
                          <span className={`text-xs font-bold truncate ${notif.isRead ? 'text-slate-800' : 'text-teal-950 font-extrabold'}`}>
                            {notif.title}
                          </span>
                          {!notif.isRead && (
                            <span className="w-1.5 h-1.5 rounded-full bg-teal-600 shrink-0" />
                          )}
                        </div>
                        <p className="text-[11px] text-slate-600 leading-relaxed line-clamp-2">
                          {notif.message}
                        </p>
                        <div className="flex items-center space-x-2 mt-1.5 text-[10px] text-slate-400">
                          <span>{formatTimestamp(notif.createdAt)}</span>
                          {notif.linkTab && (
                            <span className="text-teal-700 font-medium flex items-center space-x-0.5">
                              <span>Open tab</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Dismiss Button */}
                      <button
                        onClick={e => handleDismissNotification(notif.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded transition absolute top-3 right-3"
                        title="Dismiss notification"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Footer */}
              <div className="p-2.5 bg-slate-50 border-t border-slate-100 text-center">
                <span className="text-[10px] text-slate-400 font-medium">
                  Realtime alerts from SMS gateway, contributions & church events
                </span>
              </div>
            </div>
          )}
        </div>

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
