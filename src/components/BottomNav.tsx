import React from 'react';
import { LayoutDashboard, Users, CalendarCheck, HandCoins, MoreHorizontal } from 'lucide-react';
import { User, hasPermission, ChurchPermission } from '../types';

interface Props {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  onOpenMore: () => void;
  user?: User | null;
}

export const BottomNav: React.FC<Props> = ({ activeTab, onSelectTab, onOpenMore, user }) => {
  const allTabs: Array<{ id: string; label: string; icon: any; perm: ChurchPermission }> = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, perm: 'view_dashboard' },
    { id: 'members', label: 'Members', icon: Users, perm: 'manage_members' },
    { id: 'attendance', label: 'Attendance', icon: CalendarCheck, perm: 'manage_attendance' },
    { id: 'giving', label: 'Giving', icon: HandCoins, perm: 'manage_giving' },
  ];

  const tabs = allTabs.filter(t => !user || hasPermission(user, t.perm));

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/80 px-2 py-1.5 flex items-center justify-around lg:hidden safe-area-bottom">
      {tabs.map(tab => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onSelectTab(tab.id)}
            className={`flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition-colors ${
              isActive ? 'text-teal-700 font-semibold' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <div className={`p-1 rounded-md ${isActive ? 'bg-teal-50 text-teal-700' : ''}`}>
              <Icon className="w-5 h-5" />
            </div>
            <span className="text-[10px] mt-0.5 leading-tight">{tab.label}</span>
          </button>
        );
      })}

      {/* More / Menu Drawer trigger */}
      <button
        onClick={onOpenMore}
        className="flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl text-slate-500 hover:text-slate-800 transition"
      >
        <div className="p-1 rounded-lg">
          <MoreHorizontal className="w-5 h-5" />
        </div>
        <span className="text-[10px] mt-0.5 leading-tight">More</span>
      </button>
    </nav>
  );
};
