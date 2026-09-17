import React from 'react';
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  HandCoins,
  MessageSquare,
  UserPlus,
  HeartHandshake,
  Network,
  Calendar,
  Settings,
  Building2,
  Radio,
  FileText,
  Shield,
  Church as ChurchIcon,
  LogOut,
  Clock,
  CreditCard,
  Tag,
  Activity,
  Coins,
  Server,
  Bell,
  Megaphone,
  Code,
} from 'lucide-react';
import { User, Church } from '../types';

interface Props {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  user: User;
  church?: Church | null;
  onLogout: () => void;
}

export const Sidebar: React.FC<Props> = ({
  activeTab,
  onSelectTab,
  user,
  church,
  onLogout,
}) => {
  const isSuperAdmin = user.role === 'SUPER_ADMIN';
  const isMember = user.role === 'MEMBER';

  const churchNav = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'members', label: 'Members', icon: Users },
    { id: 'attendance', label: 'Attendance', icon: CalendarCheck },
    { id: 'sms', label: 'SMS Center', icon: MessageSquare },
    { id: 'giving', label: 'Finance & Giving', icon: HandCoins },
    { id: 'visitors', label: 'Visitors & Converts', icon: UserPlus },
    { id: 'pastoral', label: 'Pastoral Care', icon: HeartHandshake },
    { id: 'departments', label: 'Departments & Cells', icon: Network },
    { id: 'events', label: 'Events & Calendar', icon: Calendar },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const superAdminNavGroups = [
    {
      title: 'CORE PLATFORM',
      items: [
        { id: 'sa-dashboard', label: 'Overview', icon: LayoutDashboard },
        { id: 'sa-churches', label: 'Registered Churches', icon: Building2 },
        { id: 'sa-pending-churches', label: 'Pending Churches', icon: Clock },
        { id: 'sa-users', label: 'Users', icon: Users },
      ],
    },
    {
      title: 'BILLING & REVENUE',
      items: [
        { id: 'sa-subscriptions', label: 'Subscriptions', icon: CreditCard },
        { id: 'sa-pricing', label: 'Pricing', icon: Tag },
      ],
    },
    {
      title: 'COMMUNICATIONS',
      items: [
        { id: 'sa-sms', label: 'SMS Management', icon: Radio },
        { id: 'sa-sms-delivery', label: 'SMS Delivery Monitoring', icon: Activity },
        { id: 'sa-sms-balance', label: 'SMS Balance', icon: Coins },
        { id: 'sa-arkesel-config', label: 'Arkesel Configuration', icon: Server },
      ],
    },
    {
      title: 'ENGAGEMENT & SYSTEM',
      items: [
        { id: 'sa-notifications', label: 'Notifications', icon: Bell },
        { id: 'sa-popup-messages', label: 'Popup Messages', icon: Megaphone },
        { id: 'sa-api-settings', label: 'API Settings', icon: Code },
        { id: 'sa-audit', label: 'Audit Logs', icon: FileText },
        { id: 'sa-settings', label: 'System Settings', icon: Settings },
      ],
    },
  ];

  const memberNav = [
    { id: 'portal', label: 'Sanctuary Portal', icon: ChurchIcon },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 hidden lg:flex flex-col shrink-0 h-screen sticky top-0 text-left select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-100 flex items-center gap-3">
        <div className="w-8 h-8 bg-teal-700 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-xs">
          {isSuperAdmin ? <Shield className="w-4 h-4" /> : 'C'}
        </div>
        <div className="flex flex-col">
          <span className="text-xl font-bold tracking-tight text-teal-900 leading-none">Church-OS</span>
          <span className="text-[10px] font-medium text-slate-400 mt-1 uppercase tracking-wider">
            {isSuperAdmin ? 'Central Console' : 'Church Portal'}
          </span>
        </div>
      </div>

      {/* Nav links */}
      <nav className="flex-1 p-3 space-y-4 overflow-y-auto">
        {isSuperAdmin ? (
          superAdminNavGroups.map((group, gIdx) => (
            <div key={gIdx} className="space-y-1">
              <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {group.title}
              </div>
              {group.items.map(item => {
                const Icon = item.icon;
                const isActive = activeTab === item.id || (item.id === 'sa-dashboard' && activeTab === 'sa-overview');
                return (
                  <button
                    key={item.id}
                    onClick={() => onSelectTab(item.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-md font-medium text-xs transition-colors text-left ${
                      isActive
                        ? 'bg-teal-50 text-teal-800 font-semibold'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-teal-700' : 'text-slate-400'}`} />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          ))
        ) : (
          <div className="space-y-1">
            <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Navigation
            </div>
            {(isMember ? memberNav : churchNav).map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-md font-medium text-sm transition-colors text-left ${
                    isActive
                      ? 'bg-teal-50 text-teal-700 font-semibold'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-teal-700' : 'text-slate-400'}`} />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </nav>

      {/* Profile & Logout in Bottom Sidebar */}
      <div className="p-3 border-t border-slate-100 mt-auto bg-slate-50/50">
        <div className="flex items-center gap-2.5 bg-white p-2.5 rounded-lg border border-slate-200/80 shadow-xs">
          <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-800 border border-teal-200 flex items-center justify-center font-bold text-xs shrink-0">
            {user.fullName ? user.fullName[0].toUpperCase() : 'U'}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-xs font-semibold text-slate-900 truncate">{user.fullName}</p>
            <p className="text-[10px] text-slate-500 truncate capitalize">{user.role.replace(/_/g, ' ').toLowerCase()}</p>
          </div>
          <button
            onClick={onLogout}
            title="Log out"
            className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
