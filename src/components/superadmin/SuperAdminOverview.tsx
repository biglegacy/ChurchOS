import React from 'react';
import {
  Building2,
  Users,
  Clock,
  Radio,
  Plus,
  RefreshCw,
  CreditCard,
  Send,
  AlertTriangle,
  Activity,
  CheckCircle,
  Coins,
  Shield,
  Megaphone,
  Bell,
  Tag,
  ChevronRight,
} from 'lucide-react';
import { Church, AuditLog } from '../../types';

interface Props {
  dashboardData: any;
  churches: Church[];
  smsBalanceInfo: any;
  auditLogs: AuditLog[];
  onNavigateTab: (tab: string) => void;
  onOpenRegisterModal: () => void;
  onOpenTopUpModal: () => void;
  onRefresh: () => void;
  onApproveChurch: (id: string) => void;
}

export const SuperAdminOverview: React.FC<Props> = ({
  dashboardData,
  churches,
  smsBalanceInfo,
  auditLogs,
  onNavigateTab,
  onOpenRegisterModal,
  onOpenTopUpModal,
  onRefresh,
  onApproveChurch,
}) => {
  const kpis = dashboardData?.kpis || {};
  const pendingChurches = (churches || []).filter(c => c.status === 'PENDING');
  const activeChurches = (churches || []).filter(c => c.status === 'ACTIVE');
  const suspendedChurches = (churches || []).filter(c => c.status === 'SUSPENDED');

  // Subscriptions breakdown
  const activeSubs = (churches || []).filter(c => c.subscription?.status === 'ACTIVE').length;
  const expiringSubs = (churches || []).filter(c => c.subscription?.status === 'EXPIRING').length;
  const expiredSubs = (churches || []).filter(c => c.subscription?.status === 'EXPIRED').length;

  return (
    <div className="space-y-6 text-left">
      {/* Overview Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-teal-950 tracking-tight flex items-center space-x-2">
            <Shield className="w-5 h-5 text-teal-700" />
            <span>Super Admin Overview</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Central real-time monitor across multi-tenant churches, billing, and communications.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={onRefresh}
            className="inline-flex items-center space-x-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
          <button
            onClick={onOpenRegisterModal}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-teal-800 hover:bg-teal-900 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Register Church</span>
          </button>
        </div>
      </div>

      {/* Pending Approvals Notice Banner */}
      {pendingChurches.length > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-950">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-amber-200/80 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5 text-amber-900" />
            </div>
            <div>
              <h4 className="font-bold text-xs sm:text-sm">
                {pendingChurches.length} Church Registration{pendingChurches.length > 1 ? 's' : ''} Awaiting Approval
              </h4>
              <p className="text-[11px] text-amber-800 mt-0.5">
                New church leadership has submitted registration and requires central validation.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigateTab('sa-pending-churches')}
            className="px-3.5 py-1.5 bg-amber-700 hover:bg-amber-800 text-white text-xs font-semibold rounded-lg transition-colors shrink-0"
          >
            Review Pending ({pendingChurches.length})
          </button>
        </div>
      )}

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Total Churches */}
        <div
          onClick={() => onNavigateTab('sa-churches')}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs cursor-pointer hover:border-teal-300 transition-colors"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Total Churches</span>
            <Building2 className="w-4 h-4 text-teal-700" />
          </div>
          <p className="text-2xl font-bold text-teal-950">{churches.length}</p>
          <div className="flex items-center space-x-2 mt-1.5 text-[11px]">
            <span className="text-emerald-700 font-semibold">{activeChurches.length} Active</span>
            <span className="text-slate-300">•</span>
            <span className="text-amber-700 font-semibold">{pendingChurches.length} Pending</span>
            {suspendedChurches.length > 0 && (
              <>
                <span className="text-slate-300">•</span>
                <span className="text-rose-600 font-semibold">{suspendedChurches.length} Suspended</span>
              </>
            )}
          </div>
        </div>

        {/* Total Members */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Total Members</span>
            <Users className="w-4 h-4 text-teal-700" />
          </div>
          <p className="text-2xl font-bold text-teal-950">{kpis.totalMembers?.toLocaleString() || 0}</p>
          <p className="text-[11px] text-slate-500 mt-1.5">Across all tenant congregations</p>
        </div>

        {/* SMS Gateway Balance */}
        <div
          onClick={() => onNavigateTab('sa-sms-balance')}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs cursor-pointer hover:border-teal-300 transition-colors"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">SMS Credit Balance</span>
            <Coins className="w-4 h-4 text-teal-700" />
          </div>
          <p className="text-2xl font-bold text-teal-950">
            {smsBalanceInfo?.balanceCredits?.toLocaleString() || kpis.smsBalanceCredits?.toLocaleString() || 0}
            <span className="text-xs font-normal text-slate-500 ml-1">units</span>
          </p>
          <p className="text-[11px] text-slate-500 mt-1.5">
            Est. GH₵{smsBalanceInfo?.estimatedCostGHS || '0.00'} • {kpis.totalSmsSent || 0} Sent
          </p>
        </div>

        {/* Subscriptions Revenue & Status */}
        <div
          onClick={() => onNavigateTab('sa-subscriptions')}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs cursor-pointer hover:border-teal-300 transition-colors"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Subscriptions</span>
            <CreditCard className="w-4 h-4 text-teal-700" />
          </div>
          <p className="text-2xl font-bold text-teal-950">
            GH₵{kpis.subscriptionRevenueGHS?.toLocaleString() || '0'}
          </p>
          <div className="flex items-center space-x-1.5 mt-1.5 text-[11px]">
            <span className="text-emerald-700 font-semibold">{activeSubs} Active</span>
            <span className="text-slate-300">•</span>
            <span className="text-amber-700 font-medium">{expiringSubs} Expiring</span>
            <span className="text-slate-300">•</span>
            <span className="text-rose-600 font-medium">{expiredSubs} Expired</span>
          </div>
        </div>
      </div>

      {/* Quick Actions Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 px-1">
          Quick Management Actions
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
          <button
            onClick={onOpenRegisterModal}
            className="p-3 bg-slate-50 hover:bg-teal-50 hover:text-teal-900 border border-slate-200 rounded-lg flex flex-col items-center justify-center gap-1.5 transition text-center"
          >
            <Plus className="w-4 h-4 text-teal-700" />
            <span className="font-semibold text-[11px]">Register Church</span>
          </button>

          <button
            onClick={onOpenTopUpModal}
            className="p-3 bg-slate-50 hover:bg-teal-50 hover:text-teal-900 border border-slate-200 rounded-lg flex flex-col items-center justify-center gap-1.5 transition text-center"
          >
            <Coins className="w-4 h-4 text-teal-700" />
            <span className="font-semibold text-[11px]">Top-up SMS</span>
          </button>

          <button
            onClick={() => onNavigateTab('sa-sms-delivery')}
            className="p-3 bg-slate-50 hover:bg-teal-50 hover:text-teal-900 border border-slate-200 rounded-lg flex flex-col items-center justify-center gap-1.5 transition text-center"
          >
            <Activity className="w-4 h-4 text-teal-700" />
            <span className="font-semibold text-[11px]">SMS Delivery</span>
          </button>

          <button
            onClick={() => onNavigateTab('sa-pricing')}
            className="p-3 bg-slate-50 hover:bg-teal-50 hover:text-teal-900 border border-slate-200 rounded-lg flex flex-col items-center justify-center gap-1.5 transition text-center"
          >
            <Tag className="w-4 h-4 text-teal-700" />
            <span className="font-semibold text-[11px]">Manage Pricing</span>
          </button>

          <button
            onClick={() => onNavigateTab('sa-notifications')}
            className="p-3 bg-slate-50 hover:bg-teal-50 hover:text-teal-900 border border-slate-200 rounded-lg flex flex-col items-center justify-center gap-1.5 transition text-center"
          >
            <Bell className="w-4 h-4 text-teal-700" />
            <span className="font-semibold text-[11px]">Notification Center</span>
          </button>

          <button
            onClick={() => onNavigateTab('sa-popup-messages')}
            className="p-3 bg-slate-50 hover:bg-teal-50 hover:text-teal-900 border border-slate-200 rounded-lg flex flex-col items-center justify-center gap-1.5 transition text-center"
          >
            <Megaphone className="w-4 h-4 text-teal-700" />
            <span className="font-semibold text-[11px]">Popup Broadcasts</span>
          </button>
        </div>
      </div>

      {/* 2-Column Section: Recent Registrations & Platform Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Recent Registrations Card */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
          <div className="flex items-center justify-between mb-3.5">
            <h3 className="text-sm font-bold text-teal-950 flex items-center space-x-2">
              <Building2 className="w-4 h-4 text-teal-700" />
              <span>Recent Church Registrations</span>
            </h3>
            <button
              onClick={() => onNavigateTab('sa-churches')}
              className="text-xs text-teal-700 hover:text-teal-900 font-semibold flex items-center space-x-0.5"
            >
              <span>View All ({(churches || []).length})</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2.5">
            {(churches || []).slice(0, 5).map(c => (
              <div
                key={c.id}
                className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between text-xs"
              >
                <div className="truncate pr-2">
                  <p className="font-bold text-slate-900 truncate">{c.name}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                    {c.city}, {c.country} • {c.seniorPastor}
                  </p>
                </div>
                <div className="flex items-center space-x-2 shrink-0">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      c.status === 'ACTIVE'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : c.status === 'PENDING'
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}
                  >
                    {c.status}
                  </span>
                  {c.status === 'PENDING' && (
                    <button
                      onClick={() => onApproveChurch(c.id)}
                      className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold transition"
                    >
                      Approve
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Platform Audit & Activity Feed Card */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
          <div className="flex items-center justify-between mb-3.5">
            <h3 className="text-sm font-bold text-teal-950 flex items-center space-x-2">
              <Shield className="w-4 h-4 text-teal-700" />
              <span>Platform Activity & Audit Trail</span>
            </h3>
            <button
              onClick={() => onNavigateTab('sa-audit')}
              className="text-xs text-teal-700 hover:text-teal-900 font-semibold flex items-center space-x-0.5"
            >
              <span>Full Log</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
            {(auditLogs || []).slice(0, 6).map(log => (
              <div key={log.id} className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 text-xs">
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="font-bold text-slate-800">{log.action}</span>
                  <span className="text-slate-400 font-mono text-[10px]">
                    {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-slate-600 leading-snug">{log.details}</p>
                <div className="flex items-center space-x-2 text-[10px] text-slate-400 mt-1">
                  <span>Actor: {log.userName}</span>
                  <span>•</span>
                  <span>Tenant: {log.churchId}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
