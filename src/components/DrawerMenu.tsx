import React from 'react';
import {
  X,
  LayoutDashboard,
  Users,
  CalendarCheck,
  HandCoins,
  UserPlus,
  HeartHandshake,
  Network,
  Calendar,
  MessageSquare,
  Settings,
  Shield,
  Building2,
  Radio,
  FileText,
  LogOut,
  ChevronRight,
} from 'lucide-react';
import { User, Church } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  activeTab: string;
  onSelectTab: (tab: string) => void;
  user: User;
  church?: Church | null;
  onLogout: () => void;
}

export const DrawerMenu: React.FC<Props> = ({
  isOpen,
  onClose,
  activeTab,
  onSelectTab,
  user,
  church,
  onLogout,
}) => {
  if (!isOpen) return null;

  const isSuperAdmin = user.role === 'SUPER_ADMIN';

  const churchNavItems = [
    {
      section: 'Main Operations',
      items: [
        { id: 'dashboard', label: 'Overview Dashboard', icon: LayoutDashboard },
        { id: 'members', label: 'Members & Families', icon: Users },
        { id: 'attendance', label: 'Attendance & Services', icon: CalendarCheck },
        { id: 'giving', label: 'Tithes & Finances', icon: HandCoins },
      ],
    },
    {
      section: 'Pastoral & Growth',
      items: [
        { id: 'visitors', label: 'Visitors & Converts', icon: UserPlus },
        { id: 'pastoral', label: 'Pastoral Care (Confidential)', icon: HeartHandshake },
      ],
    },
    {
      section: 'Ministries & Program',
      items: [
        { id: 'departments', label: 'Departments & Groups', icon: Network },
        { id: 'events', label: 'Events & Calendar', icon: Calendar },
      ],
    },
    {
      section: 'Outreach & Settings',
      items: [
        { id: 'sms', label: 'SMS Communications Center', icon: MessageSquare },
        { id: 'settings', label: 'Church Settings', icon: Settings },
      ],
    },
  ];

  const superAdminNavItems = [
    {
      section: 'Platform Governance',
      items: [
        { id: 'sa-dashboard', label: 'Platform Analytics', icon: LayoutDashboard },
        { id: 'sa-churches', label: 'Church Multi-Tenancy', icon: Building2 },
        { id: 'sa-sms', label: 'Central Communications API', icon: Radio },
        { id: 'sa-audit', label: 'Platform Audit Logs', icon: FileText },
        { id: 'sa-settings', label: 'System Settings', icon: Settings },
      ],
    },
  ];

  const navGroups = isSuperAdmin ? superAdminNavItems : churchNavItems;

  const handleItemClick = (id: string) => {
    onSelectTab(id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
      />

      {/* Drawer content */}
      <div className="relative w-80 max-w-[85vw] bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-200">
        {/* Drawer Header */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm ${
              isSuperAdmin ? 'bg-slate-900' : 'bg-teal-700'
            }`}>
              {isSuperAdmin ? <Shield className="w-4 h-4" /> : church?.name?.[0] || 'C'}
            </div>
            <div className="overflow-hidden text-left">
              <h3 className="text-sm font-bold text-slate-900 truncate">
                {isSuperAdmin ? 'Super Admin Console' : church?.name || 'Church-OS'}
              </h3>
              <p className="text-[11px] text-slate-500 truncate">
                {user.fullName}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5 text-left">
          {navGroups.map((group, gIdx) => (
            <div key={gIdx}>
              <h4 className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                {group.section}
              </h4>
              <div className="space-y-1">
                {group.items.map(item => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleItemClick(item.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-semibold transition-colors ${
                        isActive
                          ? 'bg-teal-50 text-teal-700'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <Icon className={`w-4 h-4 ${isActive ? 'text-teal-700' : 'text-slate-400'}`} />
                        <span>{item.label}</span>
                      </div>
                      <ChevronRight className={`w-3.5 h-3.5 ${isActive ? 'text-teal-600' : 'text-slate-300'}`} />
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Drawer Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50">
          <div className="mb-3 px-1 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Tenant Status</span>
            <span className="font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
              {church?.status || 'Active Platform'}
            </span>
          </div>
          <button
            onClick={onLogout}
            className="w-full py-2.5 px-3 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-rose-600 font-semibold text-xs rounded-xl flex items-center justify-center space-x-2 transition"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
};
