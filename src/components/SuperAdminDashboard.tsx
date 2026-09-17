import React, { useState, useEffect } from 'react';
import {
  Building2,
  Users,
  Radio,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Send,
  Plus,
  Shield,
  Eye,
  Sliders,
  DollarSign,
  Search,
  Key,
  EyeOff,
  Tag,
  CreditCard,
  Activity,
  Coins,
  Server,
  Bell,
  Megaphone,
  Code,
  Settings,
  Edit3,
  Trash2,
} from 'lucide-react';
import { ApiClient } from '../api';
import { Church } from '../types';
import { RegisterChurchModal } from './RegisterChurchModal';
import { EditChurchModal } from './EditChurchModal';
import { DeleteChurchModal } from './DeleteChurchModal';
import { SuperAdminOverview } from './superadmin/SuperAdminOverview';
import { SuperAdminPendingChurches } from './superadmin/SuperAdminPendingChurches';
import { SuperAdminUsers } from './superadmin/SuperAdminUsers';
import { SuperAdminSubscriptions } from './superadmin/SuperAdminSubscriptions';
import { SuperAdminPricing } from './superadmin/SuperAdminPricing';
import { SuperAdminSmsDelivery } from './superadmin/SuperAdminSmsDelivery';
import { SuperAdminSmsBalance } from './superadmin/SuperAdminSmsBalance';
import { SuperAdminArkeselConfig } from './superadmin/SuperAdminArkeselConfig';
import { SuperAdminNotifications } from './superadmin/SuperAdminNotifications';
import { SuperAdminPopupMessages } from './superadmin/SuperAdminPopupMessages';
import { SuperAdminApiSettings } from './superadmin/SuperAdminApiSettings';
import { SuperAdminAuditLogs } from './superadmin/SuperAdminAuditLogs';
import { SuperAdminSystemSettings } from './superadmin/SuperAdminSystemSettings';

interface Props {
  activeTab: string;
  onNavigateTab?: (tab: string) => void;
}

export const SuperAdminDashboard: React.FC<Props> = ({ activeTab, onNavigateTab }) => {
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [churches, setChurches] = useState<Church[]>([]);
  const [smsBalanceInfo, setSmsBalanceInfo] = useState<any>(null);
  const [smsLogs, setSmsLogs] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [platformSettings, setPlatformSettings] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Modals / forms
  const [selectedChurch, setSelectedChurch] = useState<Church | null>(null);
  const [editingChurch, setEditingChurch] = useState<Church | null>(null);
  const [deletingChurch, setDeletingChurch] = useState<Church | null>(null);
  const [showChurchModal, setShowChurchModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState('500');
  const [topUpLoading, setTopUpLoading] = useState(false);

  // Test SMS State
  const [testPhone, setTestPhone] = useState('');
  const [testName, setTestName] = useState('Platform Evaluator');
  const [testMessage, setTestMessage] = useState('Church-OS Central Communications Gateway test message: operational and verified.');
  const [testSmsLoading, setTestSmsLoading] = useState(false);
  const [testSmsResult, setTestSmsResult] = useState<any>(null);

  // Arkesel SMS Configuration State
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [senderIdInput, setSenderIdInput] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  // Search in churches
  const [churchSearch, setChurchSearch] = useState('');
  const [churchStatusFilter, setChurchStatusFilter] = useState('ALL');

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [dashRes, churchesRes, balanceRes, logsRes, auditRes, settingsRes] = await Promise.all([
        ApiClient.get('/api/super-admin/dashboard'),
        ApiClient.get('/api/super-admin/churches'),
        ApiClient.get('/api/super-admin/sms/balance'),
        ApiClient.get('/api/super-admin/sms/logs'),
        ApiClient.get('/api/super-admin/audit-logs'),
        ApiClient.get('/api/super-admin/settings'),
      ]);

      setDashboardData(dashRes);
      setChurches(churchesRes);
      setSmsBalanceInfo(balanceRes);
      setSmsLogs(logsRes);
      setAuditLogs(auditRes);
      setPlatformSettings(settingsRes);
      if (settingsRes?.apiKey) setApiKeyInput(settingsRes.apiKey);
      if (settingsRes?.defaultSenderId) setSenderIdInput(settingsRes.defaultSenderId);
    } catch (err: any) {
      setError(err.message || 'Failed to load Super Admin data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleApproveChurch = async (id: string) => {
    try {
      const res = await ApiClient.post(`/api/super-admin/churches/${id}/approve`);
      setActionSuccess(res.message);
      await loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleRejectChurch = async (id: string) => {
    const reason = prompt('Please specify rejection reason:');
    if (reason === null) return;
    try {
      const res = await ApiClient.post(`/api/super-admin/churches/${id}/reject`, { reason });
      setActionSuccess(res.message);
      await loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSuspendChurch = async (id: string) => {
    const reason = prompt('Please specify suspension reason:');
    if (reason === null) return;
    try {
      const res = await ApiClient.post(`/api/super-admin/churches/${id}/suspend`, { reason });
      setActionSuccess(res.message);
      await loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleActivateChurch = async (id: string) => {
    try {
      const res = await ApiClient.post(`/api/super-admin/churches/${id}/activate`);
      setActionSuccess(res.message);
      await loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleToggleFeature = async (church: Church, featureKey: keyof Church['features']) => {
    try {
      const updatedFeatures = {
        ...church.features,
        [featureKey]: !church.features[featureKey],
      };
      await ApiClient.put(`/api/super-admin/churches/${church.id}`, {
        features: updatedFeatures,
      });
      setActionSuccess(`Updated ${featureKey.toUpperCase()} feature toggle for ${church.name}.`);
      await loadData();
      if (selectedChurch?.id === church.id) {
        setSelectedChurch({ ...selectedChurch, features: updatedFeatures });
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleCheckLiveBalance = async () => {
    try {
      const res = await ApiClient.get('/api/super-admin/sms/balance');
      setSmsBalanceInfo(res);
      setActionSuccess(`Verified live SMS gateway balance: ${res.balanceCredits.toLocaleString()} credits.`);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleTopUpCredits = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setTopUpLoading(true);
      const res = await ApiClient.post('/api/super-admin/sms/top-up', { credits: topUpAmount });
      setActionSuccess(res.message);
      setShowTopUpModal(false);
      await loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setTopUpLoading(false);
    }
  };

  const handleSaveSmsSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    try {
      setSavingSettings(true);
      setError(null);
      setActionSuccess(null);
      const res = await ApiClient.put('/api/super-admin/settings', {
        ...platformSettings,
        apiKey: apiKeyInput,
        defaultSenderId: senderIdInput || 'CHURCH-OS',
      });
      setPlatformSettings(res.settings);
      setActionSuccess(res.message || 'Arkesel SMS settings saved successfully.');
    } catch (err: any) {
      setError(err.message || 'Failed to save Arkesel SMS settings.');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSendTestSms = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testPhone.trim()) {
      setError('Please provide a recipient phone number for the test SMS.');
      return;
    }
    try {
      setTestSmsLoading(true);
      setTestSmsResult(null);
      setError(null);
      setActionSuccess(null);
      const res = await ApiClient.post('/api/super-admin/sms/test', {
        testPhone: testPhone.trim(),
        testMessage: testMessage.trim(),
      });
      setTestSmsResult({
        success: true,
        message: 'SMS test sent successfully.',
        details: res.details,
      });
      setActionSuccess('SMS test sent successfully.');
      await loadData();
    } catch (err: any) {
      const errMsg = err.message || 'SMS test failed. Please check your Arkesel API configuration and try again.';
      setTestSmsResult({
        success: false,
        message: errMsg,
        details: err.details || err.message,
      });
      setError(errMsg);
    } finally {
      setTestSmsLoading(false);
    }
  };

  if (loading && !dashboardData) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-8 h-8 border-3 border-teal-700 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-slate-500">Loading Super Admin Central...</p>
        </div>
      </div>
    );
  }

  const filteredChurches = churches.filter(c => {
    const matchesSearch =
      c.name.toLowerCase().includes(churchSearch.toLowerCase()) ||
      c.city.toLowerCase().includes(churchSearch.toLowerCase()) ||
      c.adminEmail.toLowerCase().includes(churchSearch.toLowerCase()) ||
      c.seniorPastor.toLowerCase().includes(churchSearch.toLowerCase());
    const matchesStatus = churchStatusFilter === 'ALL' || c.status === churchStatusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 pb-20 text-left">
      {/* Alert Notices */}
      {actionSuccess && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-emerald-800 text-xs shadow-xs">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-medium">{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-700 hover:text-emerald-900 font-bold ml-2">
            Dismiss
          </button>
        </div>
      )}

      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between text-rose-800 text-xs shadow-xs">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-medium">{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-700 hover:text-rose-900 font-bold ml-2">
            Dismiss
          </button>
        </div>
      )}

      {/* 1. OVERVIEW */}
      {(activeTab === 'sa-dashboard' || activeTab === 'sa-overview' || !activeTab) && (
        <SuperAdminOverview
          dashboardData={dashboardData}
          churches={churches}
          smsBalanceInfo={smsBalanceInfo}
          auditLogs={auditLogs}
          onNavigateTab={tab => onNavigateTab && onNavigateTab(tab)}
          onOpenRegisterModal={() => setShowRegisterModal(true)}
          onOpenTopUpModal={() => setShowTopUpModal(true)}
          onRefresh={loadData}
          onApproveChurch={handleApproveChurch}
        />
      )}

      {/* 2. REGISTERED CHURCHES */}
      {activeTab === 'sa-churches' && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <div>
              <h2 className="text-base font-bold text-teal-950 flex items-center space-x-2">
                <Building2 className="w-5 h-5 text-teal-700" />
                <span>Registered Churches Multi-Tenancy Management ({churches.length})</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Inspect, govern, approve, suspend, or configure module feature permissions per tenant.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                id="btn-sa-register-church"
                onClick={() => setShowRegisterModal(true)}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-teal-800 hover:bg-teal-900 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors shrink-0 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Register Church</span>
              </button>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-2.5 items-center justify-between bg-white p-3.5 rounded-xl border border-slate-200 text-xs">
            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={churchSearch}
                onChange={e => setChurchSearch(e.target.value)}
                placeholder="Search churches, pastor, city..."
                className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-teal-700 focus:outline-none"
              />
            </div>

            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <span className="text-slate-500 font-medium">Status:</span>
              <select
                value={churchStatusFilter}
                onChange={e => setChurchStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-teal-700"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="PENDING">Pending</option>
                <option value="SUSPENDED">Suspended</option>
              </select>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4">Church Details & Location</th>
                    <th className="py-3 px-4">Pastor / Admin</th>
                    <th className="py-3 px-4">Members</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Modules Enabled</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredChurches.map(c => (
                    <tr key={c.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{c.name}</div>
                        <div className="text-slate-500 text-[11px]">{c.city}, {c.region}, {c.country}</div>
                        <div className="text-slate-400 text-[10px] font-mono mt-0.5">{c.id}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800">{c.seniorPastor}</div>
                        <div className="text-slate-500 text-[11px]">{c.adminEmail}</div>
                        <div className="text-slate-500 text-[11px]">{c.adminPhone}</div>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-700">
                        {c.memberCount || 0}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${
                          c.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          c.status === 'PENDING' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                          c.status === 'SUSPENDED' ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {c.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] ${c.features?.sms ? 'bg-blue-50 text-blue-700 font-semibold' : 'bg-slate-100 text-slate-400 line-through'}`}>
                            SMS
                          </span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] ${c.features?.finance ? 'bg-emerald-50 text-emerald-700 font-semibold' : 'bg-slate-100 text-slate-400 line-through'}`}>
                            Finance
                          </span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] ${c.features?.events ? 'bg-teal-50 text-teal-700 font-semibold' : 'bg-slate-100 text-slate-400 line-through'}`}>
                            Events
                          </span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] ${c.features?.pastoral ? 'bg-purple-50 text-purple-700 font-semibold' : 'bg-slate-100 text-slate-400 line-through'}`}>
                            Pastoral
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap min-w-[340px]">
                        <div className="flex items-center justify-end space-x-2">
                          {/* Edit Church Button */}
                          <button
                            type="button"
                            onClick={() => setEditingChurch(c)}
                            className="inline-flex items-center space-x-1 px-2.5 py-1.5 bg-teal-50 text-teal-800 hover:bg-teal-100 border border-teal-200 rounded-lg text-xs font-bold transition shadow-2xs cursor-pointer"
                            title="Edit all Church details in Firebase"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-teal-700" />
                            <span>Edit Church</span>
                          </button>

                          {/* Feature Permissions Button */}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedChurch(c);
                              setShowChurchModal(true);
                            }}
                            className="p-1.5 text-slate-500 hover:text-teal-800 hover:bg-slate-100 border border-slate-200 rounded-lg transition cursor-pointer"
                            title="Quick Feature Permissions Override"
                          >
                            <Sliders className="w-3.5 h-3.5" />
                          </button>

                          {c.status === 'PENDING' && (
                            <button
                              type="button"
                              onClick={() => handleApproveChurch(c.id)}
                              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition cursor-pointer"
                            >
                              Approve
                            </button>
                          )}

                          {c.status === 'ACTIVE' && (
                            <button
                              type="button"
                              onClick={() => handleSuspendChurch(c.id)}
                              className="px-2.5 py-1.5 bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 rounded-lg text-xs font-bold transition cursor-pointer"
                            >
                              Suspend
                            </button>
                          )}

                          {c.status === 'SUSPENDED' && (
                            <button
                              type="button"
                              onClick={() => handleActivateChurch(c.id)}
                              className="px-2.5 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-xs font-bold transition cursor-pointer"
                            >
                              Activate
                            </button>
                          )}

                          {/* Delete Church Button */}
                          <button
                            type="button"
                            onClick={() => setDeletingChurch(c)}
                            className="inline-flex items-center space-x-1 px-2.5 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-lg text-xs font-bold transition shadow-2xs cursor-pointer"
                            title="Permanently Delete Church from Firebase"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                            <span>Delete Church</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 3. PENDING CHURCHES */}
      {activeTab === 'sa-pending-churches' && (
        <SuperAdminPendingChurches
          churches={churches}
          onApproveChurch={handleApproveChurch}
          onRejectChurch={handleRejectChurch}
          onRefresh={loadData}
        />
      )}

      {/* 4. USERS */}
      {activeTab === 'sa-users' && (
        <SuperAdminUsers churches={churches} />
      )}

      {/* 5. SUBSCRIPTIONS */}
      {activeTab === 'sa-subscriptions' && (
        <SuperAdminSubscriptions />
      )}

      {/* 6. PRICING */}
      {activeTab === 'sa-pricing' && (
        <SuperAdminPricing />
      )}

      {/* 7. SMS MANAGEMENT GATEWAY */}
      {activeTab === 'sa-sms' && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-teal-950 flex items-center space-x-2">
                <Radio className="w-5 h-5 text-teal-700" />
                <span>Central Communications Gateway</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Centralized SMS infrastructure powering notifications across all church tenants.
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleCheckLiveBalance}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg flex items-center space-x-1.5 transition cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Check Gateway Balance</span>
              </button>
              <button
                onClick={() => setShowTopUpModal(true)}
                className="px-3.5 py-2 bg-teal-800 hover:bg-teal-900 text-white text-xs font-semibold rounded-lg flex items-center space-x-1.5 transition shadow-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Top-Up SMS Credits</span>
              </button>
            </div>
          </div>

          {/* Gateway Status Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs font-semibold text-slate-500">Live Credit Balance</span>
              <p className="text-3xl font-extrabold text-teal-950 mt-1">
                {smsBalanceInfo?.balanceCredits?.toLocaleString() || 0}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                Est. Value: GH₵{smsBalanceInfo?.estimatedCostGHS || '0.00'} (@ GH₵{smsBalanceInfo?.costPerSmsGHS}/SMS)
              </p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs font-semibold text-slate-500">Gateway Link</span>
              <div className="flex items-center space-x-2 mt-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-sm font-bold text-slate-900">{smsBalanceInfo?.provider || 'Arkesel Direct Telecom'}</span>
              </div>
              <p className="text-[11px] text-emerald-600 font-medium mt-1">
                Status: {smsBalanceInfo?.connectionStatus || 'CONNECTED_AND_ACTIVE'}
              </p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs font-semibold text-slate-500">Platform Delivery Rate</span>
              <p className="text-3xl font-extrabold text-emerald-700 mt-1">
                98.6%
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                Ghana Telecoms: MTN, Telecel, AT Normalized
              </p>
            </div>
          </div>

          {/* Arkesel SMS Configuration Card */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs text-left">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 mb-4 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                  <Key className="w-4 h-4 text-teal-700" />
                  <span>Arkesel SMS Gateway Configuration</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Set platform-level Arkesel API credentials to power SMS delivery across all churches.
                </p>
              </div>
              <div className="flex items-center space-x-2">
                {platformSettings?.hasApiKey || (platformSettings?.apiKey && !platformSettings.apiKey.includes('•')) ? (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                    <CheckCircle className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                    API Key Configured
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                    <AlertTriangle className="w-3.5 h-3.5 mr-1 text-amber-600" />
                    API Key Not Configured
                  </span>
                )}
              </div>
            </div>

            <form onSubmit={handleSaveSmsSettings} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Arkesel API Key *
                  </label>
                  <div className="relative">
                    <Key className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      value={apiKeyInput}
                      onChange={e => setApiKeyInput(e.target.value)}
                      placeholder="Paste Arkesel API Key"
                      className="w-full pl-9 pr-10 py-2 text-xs font-mono border border-slate-200 rounded-lg focus:ring-1 focus:ring-teal-700 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 text-xs"
                    >
                      {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Obtained from your Arkesel Developer Portal dashboard.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Arkesel Sender ID *
                  </label>
                  <input
                    type="text"
                    maxLength={11}
                    value={senderIdInput}
                    onChange={e => setSenderIdInput(e.target.value.toUpperCase())}
                    placeholder="e.g. CHURCH-OS"
                    className="w-full px-3 py-2 text-xs font-mono uppercase border border-slate-200 rounded-lg focus:ring-1 focus:ring-teal-700 focus:outline-none"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Up to 11 alphanumeric characters approved on your Arkesel account.
                  </p>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={savingSettings}
                  className="px-4 py-2 text-xs font-semibold bg-teal-800 hover:bg-teal-900 text-white rounded-lg shadow-xs transition disabled:opacity-50"
                >
                  {savingSettings ? 'Saving Settings...' : 'Save Arkesel Settings'}
                </button>
              </div>
            </form>
          </div>

          {/* Test SMS Dispatcher */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs text-left">
            <h3 className="text-sm font-bold text-slate-900 mb-2 flex items-center space-x-2">
              <Send className="w-4 h-4 text-teal-700" />
              <span>Real Gateway SMS Verification</span>
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Send an instant real test SMS to verify carrier delivery via Arkesel Gateway.
            </p>

            <form onSubmit={handleSendTestSms} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Recipient Phone *</label>
                  <input
                    type="text"
                    value={testPhone}
                    onChange={e => setTestPhone(e.target.value)}
                    placeholder="e.g. 0241234567 or +233501234567"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-teal-700 focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Message Content</label>
                  <input
                    type="text"
                    value={testMessage}
                    onChange={e => setTestMessage(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-teal-700 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={testSmsLoading}
                  className="px-4 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-900 text-white rounded-lg shadow-xs transition disabled:opacity-50 flex items-center space-x-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{testSmsLoading ? 'Dispatching...' : 'Send Live Test SMS'}</span>
                </button>
              </div>
            </form>

            {testSmsResult && (
              <div className={`mt-3 p-3 rounded-lg border text-xs ${
                testSmsResult.success ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}>
                <p className="font-bold">{testSmsResult.message}</p>
                {testSmsResult.details && (
                  <p className="font-mono text-[11px] mt-1 break-all">
                    {typeof testSmsResult.details === 'string' ? testSmsResult.details : JSON.stringify(testSmsResult.details)}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 8. SMS DELIVERY MONITORING */}
      {activeTab === 'sa-sms-delivery' && (
        <SuperAdminSmsDelivery />
      )}

      {/* 9. SMS BALANCE */}
      {activeTab === 'sa-sms-balance' && (
        <SuperAdminSmsBalance />
      )}

      {/* 10. ARKESEL CONFIGURATION */}
      {activeTab === 'sa-arkesel-config' && (
        <SuperAdminArkeselConfig />
      )}

      {/* 11. NOTIFICATIONS */}
      {activeTab === 'sa-notifications' && (
        <SuperAdminNotifications />
      )}

      {/* 12. POPUP MESSAGES */}
      {activeTab === 'sa-popup-messages' && (
        <SuperAdminPopupMessages />
      )}

      {/* 13. API SETTINGS */}
      {activeTab === 'sa-api-settings' && (
        <SuperAdminApiSettings />
      )}

      {/* 14. AUDIT LOGS */}
      {activeTab === 'sa-audit' && (
        <SuperAdminAuditLogs />
      )}

      {/* 15. SYSTEM SETTINGS */}
      {activeTab === 'sa-settings' && (
        <SuperAdminSystemSettings />
      )}

      {/* TOP UP MODAL */}
      {showTopUpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl p-5 max-w-sm w-full shadow-2xl border border-slate-200 text-left space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900 flex items-center space-x-2">
                <Coins className="w-4 h-4 text-teal-700" />
                <span>Top-Up Central SMS Balance</span>
              </h3>
              <button onClick={() => setShowTopUpModal(false)} className="text-slate-400 hover:text-slate-600 text-sm">✕</button>
            </div>

            <form onSubmit={handleTopUpCredits} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Credit Quantity to Refuel
                </label>
                <div className="grid grid-cols-4 gap-2 mb-2">
                  {['250', '500', '1000', '5000'].map(amt => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setTopUpAmount(amt)}
                      className={`py-1.5 px-2 rounded-lg font-medium border text-xs transition ${
                        topUpAmount === amt
                          ? 'bg-teal-800 text-white border-teal-800'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      +{amt}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  min="100"
                  value={topUpAmount}
                  onChange={e => setTopUpAmount(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg focus:ring-1 focus:ring-teal-700 focus:outline-none"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Est. Cost: GH₵{(parseInt(topUpAmount || '0') * (platformSettings?.costPerSmsGHS || 0.04)).toFixed(2)}
                </p>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTopUpModal(false)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={topUpLoading}
                  className="px-4 py-1.5 text-xs font-semibold bg-teal-800 hover:bg-teal-900 text-white rounded-lg shadow-xs disabled:opacity-50"
                >
                  {topUpLoading ? 'Refueling...' : 'Confirm Top-Up'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CHURCH INSPECT & FEATURE CONTROL MODAL */}
      {showChurchModal && selectedChurch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl p-5 max-w-md w-full shadow-2xl border border-slate-200 text-left space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">{selectedChurch.name}</h3>
                <p className="text-xs text-slate-500">{selectedChurch.city}, {selectedChurch.region}</p>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                selectedChurch.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}>
                {selectedChurch.status}
              </span>
            </div>

            {/* Feature Toggles */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                Module Feature Controls (Super Admin Override)
              </h4>
              <div className="space-y-2">
                {(['sms', 'finance', 'events', 'groups', 'pastoral'] as const).map(feat => {
                  const enabled = selectedChurch.features[feat];
                  return (
                    <div key={feat} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-100 text-xs">
                      <div>
                        <span className="font-bold text-slate-800 capitalize">{feat} Module</span>
                        <p className="text-[10px] text-slate-500">
                          {enabled ? 'Module active for this church' : 'Feature disabled by Super Admin'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleToggleFeature(selectedChurch, feat)}
                        className={`px-3 py-1 text-xs font-semibold rounded-md transition ${
                          enabled ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {enabled ? 'Enabled' : 'Disabled'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowChurchModal(false)}
                className="px-4 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Register Church Modal */}
      <RegisterChurchModal
        isOpen={showRegisterModal}
        onClose={() => setShowRegisterModal(false)}
        onRegisteredSuccess={(msg) => {
          setActionSuccess(msg || 'Church registered successfully in Firebase.');
          loadData();
        }}
      />

      {/* Edit Church Modal */}
      {editingChurch && (
        <EditChurchModal
          church={editingChurch}
          isOpen={!!editingChurch}
          onClose={() => setEditingChurch(null)}
          onSuccess={(updatedChurch, msg) => {
            setChurches(prev => prev.map(c => c.id === updatedChurch.id ? updatedChurch : c));
            setActionSuccess(msg);
            loadData();
          }}
        />
      )}

      {/* Delete Church Modal */}
      {deletingChurch && (
        <DeleteChurchModal
          church={deletingChurch}
          isOpen={!!deletingChurch}
          onClose={() => setDeletingChurch(null)}
          onSuccess={(deletedId, msg) => {
            setChurches(prev => prev.filter(c => c.id !== deletedId));
            setActionSuccess(msg);
            loadData();
          }}
        />
      )}
    </div>
  );
};
