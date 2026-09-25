import React, { useState, useEffect } from 'react';
import {
  Users,
  CalendarCheck,
  HandCoins,
  ArrowUpRight,
  PlusCircle,
  MessageSquare,
  Clock,
  ChevronRight,
  Building,
  DollarSign,
  UserPlus,
  HeartHandshake,
  Calendar,
  Cake,
} from 'lucide-react';
import { ApiClient } from '../api';
import { Church } from '../types';
import { UpcomingBirthdaysWidget } from './UpcomingBirthdaysWidget';
import { useAutoDismissNotification } from '../utils/useAutoDismissNotification';

interface Props {
  church?: Church | null;
  onNavigateTab: (tab: string) => void;
  onQuickAction: (action: string) => void;
}

export const ChurchDashboard: React.FC<Props> = ({ church, onNavigateTab, onQuickAction }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useAutoDismissNotification(error, setError, 2000);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await ApiClient.get('/api/church/dashboard');
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-8 h-8 border-3 border-teal-700 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-slate-500">Loading Church Dashboard...</p>
        </div>
      </div>
    );
  }

  const kpis = data?.kpis || {};
  const upcomingEvents = Array.isArray(data?.upcomingEvents) ? data.upcomingEvents : [];
  const recentGiving = Array.isArray(data?.recentGiving) ? data.recentGiving : [];
  const currency = church?.settings?.currency || 'GH₵';

  return (
    <div className="space-y-6 pb-16 text-left">
      {/* Sleek 4-Column KPI Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Total Members */}
        <div
          onClick={() => onNavigateTab('members')}
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm cursor-pointer hover:border-teal-300 transition-colors"
        >
          <div className="flex items-center justify-between text-slate-500">
            <p className="text-slate-500 text-sm font-medium">Total Members</p>
            <Users className="w-4 h-4 text-teal-700" />
          </div>
          <p className="text-2xl font-bold mt-1 text-slate-900">{kpis.totalMembers || 0}</p>
          <p className="text-xs text-emerald-600 mt-1 font-medium flex items-center gap-1">
            <span>+{kpis.activeMembers || 0} Active</span>
            <span className="text-slate-300">•</span>
            <span className="text-slate-500">{kpis.totalVisitors || 0} Visitors</span>
          </p>
        </div>

        {/* Active Attendees */}
        <div
          onClick={() => onNavigateTab('attendance')}
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm cursor-pointer hover:border-teal-300 transition-colors"
        >
          <div className="flex items-center justify-between text-slate-500">
            <p className="text-slate-500 text-sm font-medium">Active Attendees</p>
            <CalendarCheck className="w-4 h-4 text-teal-700" />
          </div>
          <p className="text-2xl font-bold mt-1 text-slate-900">{kpis.todayAttendancePresent || 0}</p>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            {kpis.todayAttendanceAbsent || 0} Absent • {kpis.monthlyAttendancePresent || 0} This Month
          </p>
        </div>

        {/* Monthly Tithes & Income */}
        <div
          onClick={() => onNavigateTab('giving')}
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm cursor-pointer hover:border-teal-300 transition-colors"
        >
          <div className="flex items-center justify-between text-slate-500">
            <p className="text-slate-500 text-sm font-medium">Monthly Tithes & Giving</p>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold mt-1 text-slate-900">
            {currency}{(kpis.totalGiving || 0).toLocaleString()}
          </p>
          <p className="text-xs text-emerald-600 mt-1 font-medium">
            ↑ Tithes: {currency}{(kpis.totalTithes || 0).toLocaleString()}
          </p>
        </div>

        {/* Pastoral & Care Follow-ups */}
        <div
          onClick={() => onNavigateTab('pastoral')}
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm cursor-pointer hover:border-teal-300 transition-colors"
        >
          <div className="flex items-center justify-between text-slate-500">
            <p className="text-slate-500 text-sm font-medium">Care & Follow-ups</p>
            <HeartHandshake className="w-4 h-4 text-teal-700" />
          </div>
          <p className="text-2xl font-bold mt-1 text-slate-900">{kpis.pendingFollowups || 0}</p>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            {kpis.pendingPastoral || 0} Pastoral Cases • {kpis.pendingVisitors || 0} Visitors
          </p>
        </div>
      </div>

      {/* Quick 1-Tap Action Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-3 px-1">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Operations & Quick Actions
          </span>
          <span className="text-xs text-slate-400 font-medium">1-Tap Workflow</span>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3">
          <button
            onClick={() => onQuickAction('record-giving')}
            className="flex flex-col items-center justify-center p-3 rounded-lg bg-slate-50 hover:bg-teal-50 border border-slate-100 hover:border-teal-200 text-slate-700 hover:text-teal-800 transition-colors"
          >
            <HandCoins className="w-5 h-5 text-teal-700 mb-1" />
            <span className="text-xs font-semibold text-center leading-tight">Record Giving</span>
          </button>

          <button
            onClick={() => onNavigateTab('attendance')}
            className="flex flex-col items-center justify-center p-3 rounded-lg bg-slate-50 hover:bg-teal-50 border border-slate-100 hover:border-teal-200 text-slate-700 hover:text-teal-800 transition-colors"
          >
            <CalendarCheck className="w-5 h-5 text-teal-700 mb-1" />
            <span className="text-xs font-semibold text-center leading-tight">Attendance</span>
          </button>

          <button
            onClick={() => onQuickAction('add-member')}
            className="flex flex-col items-center justify-center p-3 rounded-lg bg-slate-50 hover:bg-teal-50 border border-slate-100 hover:border-teal-200 text-slate-700 hover:text-teal-800 transition-colors"
          >
            <UserPlus className="w-5 h-5 text-emerald-600 mb-1" />
            <span className="text-xs font-semibold text-center leading-tight">Add Member</span>
          </button>

          <button
            onClick={() => onNavigateTab('sms')}
            className="flex flex-col items-center justify-center p-3 rounded-lg bg-slate-50 hover:bg-teal-50 border border-slate-100 hover:border-teal-200 text-slate-700 hover:text-teal-800 transition-colors"
          >
            <MessageSquare className="w-5 h-5 text-teal-700 mb-1" />
            <span className="text-xs font-semibold text-center leading-tight">Send SMS</span>
          </button>

          <button
            onClick={() => onQuickAction('add-visitor')}
            className="flex flex-col items-center justify-center p-3 rounded-lg bg-slate-50 hover:bg-teal-50 border border-slate-100 hover:border-teal-200 text-slate-700 hover:text-teal-800 transition-colors"
          >
            <PlusCircle className="w-5 h-5 text-amber-600 mb-1" />
            <span className="text-xs font-semibold text-center leading-tight">Add Visitor</span>
          </button>

          <button
            onClick={() => onNavigateTab('pastoral')}
            className="flex flex-col items-center justify-center p-3 rounded-lg bg-slate-50 hover:bg-teal-50 border border-slate-100 hover:border-teal-200 text-slate-700 hover:text-teal-800 transition-colors"
          >
            <HeartHandshake className="w-5 h-5 text-rose-600 mb-1" />
            <span className="text-xs font-semibold text-center leading-tight">Pastoral Care</span>
          </button>
        </div>
      </div>

      {/* Upcoming Member Birthdays & Automated Greeting Quick-Action Widget */}
      <UpcomingBirthdaysWidget
        initialData={data?.upcomingBirthdays}
        church={church}
        onNavigateToMembers={() => onNavigateTab('members')}
        onRefresh={loadDashboard}
      />

      {/* Sleek Two-Column: Recent Attendance Bar Chart & Automated SMS Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Attendance Bar Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col">
          <div className="p-5 border-b border-slate-100 flex justify-between items-center">
            <h3 className="font-bold text-slate-800 text-base">Recent Sunday Attendance</h3>
            <span className="text-xs bg-slate-50 border border-slate-200 rounded px-2 py-1 font-medium text-slate-600">
              Main Service (Sunday)
            </span>
          </div>
          <div className="p-6 flex-1 flex flex-col justify-end">
            <div className="flex items-end justify-between h-48 gap-3 sm:gap-6 px-2 sm:px-4">
              <div className="w-full bg-slate-100 hover:bg-slate-200 h-[60%] rounded-t-md relative group transition-all">
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-bold text-slate-400 group-hover:text-teal-700">
                  842
                </div>
              </div>
              <div className="w-full bg-slate-100 hover:bg-slate-200 h-[75%] rounded-t-md relative group transition-all">
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-bold text-slate-400 group-hover:text-teal-700">
                  910
                </div>
              </div>
              <div className="w-full bg-teal-600 hover:bg-teal-700 h-[95%] rounded-t-md relative group transition-all shadow-xs">
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-bold text-teal-700">
                  1042
                </div>
              </div>
              <div className="w-full bg-slate-100 hover:bg-slate-200 h-[80%] rounded-t-md relative group transition-all">
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-bold text-slate-400 group-hover:text-teal-700">
                  954
                </div>
              </div>
              <div className="w-full bg-slate-100 hover:bg-slate-200 h-[88%] rounded-t-md relative group transition-all">
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-bold text-slate-400 group-hover:text-teal-700">
                  990
                </div>
              </div>
            </div>
            <div className="flex justify-between mt-4 text-[10px] uppercase tracking-widest font-bold text-slate-400 border-t border-slate-50 pt-4">
              <span className="w-full text-center">Oct 22</span>
              <span className="w-full text-center">Oct 29</span>
              <span className="w-full text-center text-teal-700 underline underline-offset-4 font-extrabold">Nov 05</span>
              <span className="w-full text-center">Nov 12</span>
              <span className="w-full text-center">Nov 19</span>
            </div>
          </div>
        </div>

        {/* Automated SMS Status Card */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-800 text-base">Automated SMS Status</h3>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 mt-1.5 rounded-full bg-teal-500 shrink-0"></div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">Absence Follow-up Sent</p>
                  <p className="text-xs text-slate-500">To absent members from last Sunday service.</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">2 mins ago</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-2 h-2 mt-1.5 rounded-full bg-teal-500 shrink-0"></div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">Tithe Confirmation Dispatched</p>
                  <p className="text-xs text-slate-500">{currency} 500 receipt delivered to Kwesi Appiah.</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">1 hour ago</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-2 h-2 mt-1.5 rounded-full bg-amber-500 shrink-0"></div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">SMS Balance Stable</p>
                  <p className="text-xs text-slate-500">Balance: {currency} 428.50. 4,201 total SMS delivered.</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">3 hours ago</p>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => onNavigateTab('sms')}
                className="w-full py-2 bg-slate-50 text-slate-700 text-xs font-bold border border-slate-200 rounded-md hover:bg-slate-100 transition-colors"
              >
                View Communication Log
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Upcoming Service Highlight Card (as in Sleek Interface Design) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <h3 className="font-bold text-slate-800 text-base">
            Upcoming Service: Midweek Prayer & Prophetic Night
          </h3>
          <span className="text-xs font-bold text-teal-700 bg-teal-50 px-3 py-1 rounded-full self-start sm:self-auto">
            Tomorrow, 6:00 PM
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-8 pt-1">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
              <Users className="w-4 h-4" />
            </div>
            <div className="text-xs">
              <p className="text-slate-400 font-medium">Preacher</p>
              <p className="font-bold text-slate-800">Prophet Daniel Osei</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div className="text-xs">
              <p className="text-slate-400 font-medium">SMS Campaign</p>
              <p className="font-bold text-slate-800">Scheduled ({kpis.totalMembers || '1,482'} Recip.)</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
              <HandCoins className="w-4 h-4" />
            </div>
            <div className="text-xs">
              <p className="text-slate-400 font-medium">Budget Status</p>
              <p className="font-bold text-emerald-600">Approved</p>
            </div>
          </div>
        </div>
      </div>

      {/* Financial Net Overview & Recent Contributions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Financial Summary */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900">Financial Summary</h3>
              <button
                onClick={() => onNavigateTab('giving')}
                className="text-xs text-teal-700 hover:text-teal-800 font-semibold flex items-center gap-0.5"
              >
                <span>Details</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="space-y-3 text-center">
              <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-lg">
                <span className="text-xs font-medium text-emerald-700">Total Giving Received</span>
                <p className="text-lg font-bold text-emerald-900 mt-0.5">
                  {currency}{(kpis.totalGiving || 0).toLocaleString()}
                </p>
              </div>
              <div className="p-3 bg-rose-50/70 border border-rose-100 rounded-lg">
                <span className="text-xs font-medium text-rose-700">Operational Expenses</span>
                <p className="text-lg font-bold text-rose-900 mt-0.5">
                  {currency}{(kpis.totalExpenses || 0).toLocaleString()}
                </p>
              </div>
              <div className="p-3 bg-teal-50 border border-teal-100 rounded-lg">
                <span className="text-xs font-semibold text-teal-800">Net Assembly Surplus</span>
                <p className="text-lg font-bold text-teal-900 mt-0.5">
                  {currency}{(kpis.netSurplus || 0).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Contributions */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3.5">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <HandCoins className="w-4 h-4 text-emerald-600" />
              <span>Recent Contributions</span>
            </h3>
            <button
              onClick={() => onNavigateTab('giving')}
              className="text-xs text-teal-700 hover:text-teal-800 font-semibold"
            >
              View All
            </button>
          </div>
          {recentGiving.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">No giving recorded yet.</p>
          ) : (
            <div className="space-y-2.5">
              {recentGiving.map((g: any) => (
                <div
                  key={g.id}
                  className="p-3 bg-slate-50 hover:bg-slate-100/80 rounded-lg border border-slate-100 flex items-center justify-between transition-colors"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">{g.memberName}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                        {g.givingType}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {g.date} • {g.paymentMethod} • Ref: {g.receiptNumber}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-extrabold text-emerald-600">
                      {currency}{g.amount.toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
