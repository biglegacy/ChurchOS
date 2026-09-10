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
} from 'lucide-react';
import { ApiClient } from '../api';
import { Church } from '../types';
import { RegisterChurchModal } from './RegisterChurchModal';

interface Props {
  activeTab: string;
  onNavigateTab?: (tab: string) => void;
}

export const SuperAdminDashboard: React.FC<Props> = ({ activeTab }) => {
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
      const errMsg = 'SMS test failed. Please check your Arkesel API configuration and try again.';
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
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-slate-500">Loading Super Admin Central...</p>
        </div>
      </div>
    );
  }

  const kpis = dashboardData?.kpis || {};
  const pendingChurches = churches.filter(c => c.status === 'PENDING');
  const filteredChurches = churches.filter(c =>
    c.name.toLowerCase().includes(churchSearch.toLowerCase()) ||
    c.city.toLowerCase().includes(churchSearch.toLowerCase()) ||
    c.adminEmail.toLowerCase().includes(churchSearch.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-20">
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

      {/* VIEW: PLATFORM ANALYTICS DASHBOARD */}
      {(activeTab === 'sa-dashboard' || !activeTab) && (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <div>
              <h2 className="text-xl font-bold text-teal-950 tracking-tight flex items-center space-x-2">
                <Shield className="w-6 h-6 text-teal-700" />
                <span>Super Admin Platform Console</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Real-time multi-tenant health, cross-church statistics, and central gateway governance.
              </p>
            </div>
            <button
              onClick={loadData}
              className="inline-flex items-center justify-center space-x-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-md transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh Metrics</span>
            </button>
          </div>

          {/* Pending Approval Notice Banner */}
          {pendingChurches.length > 0 && (
            <div className="p-4 bg-amber-500 text-white rounded-xl shadow-xs flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm">
                    {pendingChurches.length} Church Application{pendingChurches.length > 1 ? 's' : ''} Awaiting Review
                  </h4>
                  <p className="text-xs text-amber-100 mt-0.5">
                    Tenant onboarding requires Super Admin authorization before users can sign in.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* KPI Metrics Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold">Total Churches</span>
                <Building2 className="w-4 h-4 text-teal-700" />
              </div>
              <p className="text-2xl font-bold text-teal-950">{kpis.totalChurches}</p>
              <div className="flex items-center space-x-2 mt-1.5 text-[11px]">
                <span className="text-emerald-600 font-semibold">{kpis.activeChurches} Active</span>
                <span className="text-slate-300">•</span>
                <span className="text-amber-600 font-semibold">{kpis.pendingChurches} Pending</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold">Total Members</span>
                <Users className="w-4 h-4 text-teal-700" />
              </div>
              <p className="text-2xl font-bold text-teal-950">{kpis.totalMembers?.toLocaleString()}</p>
              <p className="text-[11px] text-slate-500 mt-1.5">Across all registered churches</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold">SMS Gateway Balance</span>
                <Radio className="w-4 h-4 text-teal-700" />
              </div>
              <p className="text-2xl font-bold text-teal-950">{kpis.smsBalanceCredits?.toLocaleString()} <span className="text-xs font-normal text-slate-500">units</span></p>
              <div className="flex items-center space-x-1 mt-1.5 text-[11px] text-slate-500">
                <span>Dispatched:</span>
                <span className="font-semibold text-slate-700">{kpis.totalSmsSent}</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold">SaaS Subscriptions</span>
                <DollarSign className="w-4 h-4 text-teal-700" />
              </div>
              <p className="text-2xl font-bold text-teal-950">GH₵{kpis.subscriptionRevenueGHS?.toLocaleString()}</p>
              <p className="text-[11px] text-emerald-600 font-medium mt-1.5">
                {kpis.activeSubscriptions} Active Plans
              </p>
            </div>
          </div>

          {/* Pending Approval Table */}
          {pendingChurches.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-amber-600" />
                  <span>Church Registrations Requiring Approval ({pendingChurches.length})</span>
                </h3>
              </div>
              <div className="divide-y divide-slate-100">
                {pendingChurches.map(c => (
                  <div key={c.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 transition">
                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="text-sm font-bold text-slate-900">{c.name}</h4>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                          PENDING REVIEW
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Leader: <strong className="text-slate-700">{c.seniorPastor}</strong> • Location: {c.city}, {c.region}
                      </p>
                      <p className="text-xs text-slate-500">
                        Admin: {c.adminName} ({c.adminEmail} / {c.adminPhone})
                      </p>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      <button
                        onClick={() => handleApproveChurch(c.id)}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl flex items-center space-x-1.5 shadow-xs transition"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Approve Church</span>
                      </button>
                      <button
                        onClick={() => handleRejectChurch(c.id)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-600 text-xs font-semibold rounded-xl transition"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Reject</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Registrations & Platform Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Recent Registrations */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
              <h3 className="text-sm font-bold text-slate-900 mb-3.5 flex items-center space-x-2">
                <Building2 className="w-4 h-4 text-blue-600" />
                <span>Recently Registered Churches</span>
              </h3>
              <div className="space-y-3">
                {churches.slice(0, 5).map(c => (
                  <div key={c.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-900">{c.name}</p>
                      <p className="text-[11px] text-slate-500">{c.city}, {c.country} • {c.seniorPastor}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      c.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' :
                      c.status === 'PENDING' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {c.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Platform Audit Logs */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
              <h3 className="text-sm font-bold text-slate-900 mb-3.5 flex items-center space-x-2">
                <Shield className="w-4 h-4 text-purple-600" />
                <span>System Security Audit Trail</span>
              </h3>
              <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                {auditLogs.slice(0, 8).map(log => (
                  <div key={log.id} className="p-2.5 bg-slate-50 rounded-xl text-left border border-slate-100">
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="font-bold text-slate-800">{log.action}</span>
                      <span className="text-slate-400">{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className="text-xs text-slate-600 leading-snug">{log.details}</p>
                    <p className="text-[10px] text-slate-400 mt-1">Actor: {log.userName}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW: CHURCHES MANAGEMENT */}
      {activeTab === 'sa-churches' && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Church Multi-Tenancy Management</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Inspect, govern, approve, suspend, or configure module permissions per tenant.
              </p>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="relative w-full sm:w-56">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={churchSearch}
                  onChange={e => setChurchSearch(e.target.value)}
                  placeholder="Search churches..."
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <button
                type="button"
                id="btn-sa-register-church"
                onClick={() => setShowRegisterModal(true)}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors shrink-0 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Register Church</span>
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4">Church Name & Location</th>
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
                        <div className="text-slate-500 text-[11px]">{c.city}, {c.region}</div>
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
                          c.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' :
                          c.status === 'PENDING' ? 'bg-amber-100 text-amber-800' :
                          c.status === 'SUSPENDED' ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {c.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] ${c.features?.sms ? 'bg-blue-100 text-blue-700 font-semibold' : 'bg-slate-100 text-slate-400 line-through'}`}>
                            SMS
                          </span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] ${c.features?.finance ? 'bg-emerald-100 text-emerald-700 font-semibold' : 'bg-slate-100 text-slate-400 line-through'}`}>
                            Finance
                          </span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] ${c.features?.events ? 'bg-indigo-100 text-indigo-700 font-semibold' : 'bg-slate-100 text-slate-400 line-through'}`}>
                            Events
                          </span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] ${c.features?.pastoral ? 'bg-purple-100 text-purple-700 font-semibold' : 'bg-slate-100 text-slate-400 line-through'}`}>
                            Pastoral
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => {
                              setSelectedChurch(c);
                              setShowChurchModal(true);
                            }}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-slate-100"
                            title="Inspect & Configure Features"
                          >
                            <Sliders className="w-4 h-4" />
                          </button>

                          {c.status === 'PENDING' && (
                            <button
                              onClick={() => handleApproveChurch(c.id)}
                              className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-[11px] font-semibold hover:bg-emerald-700"
                            >
                              Approve
                            </button>
                          )}

                          {c.status === 'ACTIVE' && (
                            <button
                              onClick={() => handleSuspendChurch(c.id)}
                              className="px-2.5 py-1 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-lg text-[11px] font-semibold"
                            >
                              Suspend
                            </button>
                          )}

                          {c.status === 'SUSPENDED' && (
                            <button
                              onClick={() => handleActivateChurch(c.id)}
                              className="px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-[11px] font-semibold"
                            >
                              Activate
                            </button>
                          )}
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

      {/* VIEW: CENTRAL COMMUNICATIONS API & GATEWAY */}
      {activeTab === 'sa-sms' && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
                <Radio className="w-5 h-5 text-purple-600" />
                <span>Central Communications Gateway</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Centralized SMS infrastructure powering notifications across all church tenants.
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleCheckLiveBalance}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl flex items-center space-x-1.5 transition"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Check Real Gateway Balance</span>
              </button>
              <button
                onClick={() => setShowTopUpModal(true)}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl flex items-center space-x-1.5 transition shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Top-Up SMS Credits</span>
              </button>
            </div>
          </div>

          {/* Gateway Status Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-semibold text-slate-500">Live Credit Balance</span>
              <p className="text-3xl font-extrabold text-slate-900 mt-1">
                {smsBalanceInfo?.balanceCredits?.toLocaleString() || 0}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                Est. Value: GH₵{smsBalanceInfo?.estimatedCostGHS || '0.00'} (@ GH₵{smsBalanceInfo?.costPerSmsGHS}/SMS)
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-semibold text-slate-500">Gateway Link</span>
              <div className="flex items-center space-x-2 mt-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-sm font-bold text-slate-900">{smsBalanceInfo?.provider || 'Arkesel / Hubtel Multi-Channel'}</span>
              </div>
              <p className="text-[11px] text-emerald-600 font-medium mt-1">
                Link: {smsBalanceInfo?.connectionStatus || 'CONNECTED_AND_ACTIVE'}
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-semibold text-slate-500">Platform Delivery Rate</span>
              <p className="text-3xl font-extrabold text-emerald-600 mt-1">
                98.6%
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                Ghana Telecoms: MTN, Telecel, AT Normalized
              </p>
            </div>
          </div>

          {/* Arkesel SMS Configuration Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs text-left">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 mb-4 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                  <Key className="w-4 h-4 text-purple-600" />
                  <span>Arkesel SMS Gateway Configuration</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Set platform-level Arkesel API credentials to power SMS delivery across all churches.
                </p>
              </div>
              <div className="flex items-center space-x-2">
                {platformSettings?.hasApiKey || (platformSettings?.apiKey && !platformSettings.apiKey.includes('•')) ? (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                    <CheckCircle className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                    API Key Configured
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
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
                      className="w-full pl-9 pr-10 py-2 text-xs font-mono border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none"
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
                    className="w-full px-3 py-2 text-xs font-mono uppercase border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none"
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
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-xl transition shadow-xs disabled:opacity-50 flex items-center space-x-1.5"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>{savingSettings ? 'Saving Settings...' : 'Save Arkesel Settings'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Real Test SMS Dispatcher */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs text-left">
            <h3 className="text-sm font-bold text-slate-900 mb-1 flex items-center space-x-2">
              <Send className="w-4 h-4 text-blue-600" />
              <span>Real Gateway SMS Verification Tool</span>
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Send a real message through the central gateway to verify Ghana phone number normalization and Arkesel provider acceptance.
            </p>

            <form onSubmit={handleSendTestSms} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Recipient Phone Number (Ghana standard e.g. 024XXXXXXX) *
                  </label>
                  <input
                    type="text"
                    required
                    value={testPhone}
                    onChange={e => setTestPhone(e.target.value)}
                    placeholder="0241234567 or +233541234567"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Recipient Name
                  </label>
                  <input
                    type="text"
                    value={testName}
                    onChange={e => setTestName(e.target.value)}
                    placeholder="Test User"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Message Body
                </label>
                <textarea
                  rows={2}
                  value={testMessage}
                  onChange={e => setTestMessage(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-400">
                  {testMessage.length} characters • 1 SMS segment
                </span>
                <button
                  type="submit"
                  disabled={testSmsLoading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition shadow-xs disabled:opacity-50 flex items-center space-x-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{testSmsLoading ? 'Dispatching...' : 'Test SMS'}</span>
                </button>
              </div>
            </form>

            {testSmsResult && (
              <div className={`mt-4 p-4 rounded-xl border text-left ${
                testSmsResult.success
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}>
                <div className="flex items-center space-x-2 font-bold text-xs">
                  {testSmsResult.success ? (
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                  <span>{testSmsResult.message}</span>
                </div>
                {testSmsResult.details && (
                  <p className={`text-xs mt-1.5 leading-relaxed ${
                    testSmsResult.success ? 'text-emerald-700' : 'text-rose-700'
                  }`}>
                    {typeof testSmsResult.details === 'string'
                      ? testSmsResult.details
                      : JSON.stringify(testSmsResult.details)}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* SMS History Log */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Platform-Wide SMS Delivery History
              </h3>
              <span className="text-xs text-slate-500">{smsLogs.length} Records</span>
            </div>
            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] uppercase font-semibold">
                    <th className="py-2.5 px-4">Church Tenant</th>
                    <th className="py-2.5 px-4">Recipient</th>
                    <th className="py-2.5 px-4">Normalized Phone</th>
                    <th className="py-2.5 px-4">Sender ID</th>
                    <th className="py-2.5 px-4">Type</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {smsLogs.map(s => (
                    <tr key={s.id} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-4 font-semibold text-slate-800">{s.churchName || s.churchId}</td>
                      <td className="py-2.5 px-4 text-slate-700">{s.recipientName}</td>
                      <td className="py-2.5 px-4 font-mono text-slate-600 text-[11px]">{s.normalizedPhone}</td>
                      <td className="py-2.5 px-4 font-bold text-blue-700 text-[11px]">{s.senderName}</td>
                      <td className="py-2.5 px-4 text-slate-500 text-[11px]">{s.notificationType}</td>
                      <td className="py-2.5 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          s.status === 'Delivered' ? 'bg-emerald-100 text-emerald-800' :
                          s.status === 'Accepted' ? 'bg-blue-100 text-blue-800' :
                          'bg-rose-100 text-rose-800'
                        }`}>
                          {s.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-slate-400 text-[11px]">
                        {new Date(s.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW: AUDIT LOGS */}
      {activeTab === 'sa-audit' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Platform Security Audit Log</h2>
            <button
              onClick={loadData}
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
          <div className="divide-y divide-slate-100">
            {auditLogs.map(log => (
              <div key={log.id} className="py-3 text-left">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-bold text-slate-900">{log.action}</span>
                  <span className="text-slate-400 text-[11px] font-mono">
                    {new Date(log.timestamp).toLocaleString()}
                  </span>
                </div>
                <p className="text-xs text-slate-600">{log.details}</p>
                <div className="flex items-center space-x-2 text-[11px] text-slate-400 mt-1">
                  <span>Actor: {log.userName}</span>
                  <span>•</span>
                  <span>Tenant: {log.churchId}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIEW: SYSTEM SETTINGS */}
      {activeTab === 'sa-settings' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-5 max-w-2xl text-left">
          <h2 className="text-lg font-bold text-slate-900">System Platform Configuration</h2>
          <div className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Application Name</label>
              <input
                type="text"
                disabled
                value={platformSettings?.appName || 'Church-OS'}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Default SMS Gateway Provider</label>
              <input
                type="text"
                disabled
                value={platformSettings?.smsProvider || 'Hubtel / Arkesel Direct'}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Arkesel API Key</label>
              <div className="relative">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKeyInput}
                  onChange={e => setApiKeyInput(e.target.value)}
                  placeholder="Paste Arkesel API Key"
                  className="w-full px-3 py-2 font-mono border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Arkesel Sender ID</label>
              <input
                type="text"
                maxLength={11}
                value={senderIdInput}
                onChange={e => setSenderIdInput(e.target.value.toUpperCase())}
                placeholder="CHURCH-OS"
                className="w-full px-3 py-2 uppercase font-mono border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Cost Per Credit (GHS)</label>
              <input
                type="number"
                step="0.01"
                value={platformSettings?.costPerCreditGHS || 0.04}
                onChange={e => setPlatformSettings({ ...platformSettings, costPerCreditGHS: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Support Contact Email</label>
              <input
                type="email"
                value={platformSettings?.supportEmail || 'support@church-os.com'}
                onChange={e => setPlatformSettings({ ...platformSettings, supportEmail: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <button
              onClick={async () => {
                try {
                  const res = await ApiClient.put('/api/super-admin/settings', {
                    ...platformSettings,
                    apiKey: apiKeyInput,
                    defaultSenderId: senderIdInput || 'CHURCH-OS',
                  });
                  setPlatformSettings(res.settings);
                  setActionSuccess('System settings saved successfully.');
                } catch (err: any) {
                  setError(err.message || 'Failed to save system settings.');
                }
              }}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs transition"
            >
              Save System Settings
            </button>
          </div>
        </div>
      )}

      {/* TOP-UP MODAL */}
      {showTopUpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 text-left space-y-4">
            <h3 className="text-base font-bold text-slate-900">Top-Up SMS Gateway Credits</h3>
            <p className="text-xs text-slate-500">
              Credits will be added to the platform central pool for all church SMS operations.
            </p>
            <form onSubmit={handleTopUpCredits} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Credit Quantity
                </label>
                <input
                  type="number"
                  min="50"
                  step="50"
                  required
                  value={topUpAmount}
                  onChange={e => setTopUpAmount(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Est. Cost: GH₵{(parseInt(topUpAmount || '0') * (platformSettings?.costPerCreditGHS || 0.04)).toFixed(2)}
                </p>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTopUpModal(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={topUpLoading}
                  className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs disabled:opacity-50"
                >
                  {topUpLoading ? 'Processing...' : 'Confirm Top-Up'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CHURCH INSPECT & FEATURE CONTROL MODAL */}
      {showChurchModal && selectedChurch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 text-left space-y-5 max-h-[85vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">{selectedChurch.name}</h3>
                <p className="text-xs text-slate-500">{selectedChurch.city}, {selectedChurch.region}</p>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                selectedChurch.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
              }`}>
                {selectedChurch.status}
              </span>
            </div>

            {/* Feature Toggles */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                Module Feature Controls (Super Admin Override)
              </h4>
              <div className="space-y-2.5">
                {(['sms', 'finance', 'events', 'groups', 'pastoral'] as const).map(feat => {
                  const enabled = selectedChurch.features[feat];
                  return (
                    <div key={feat} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                      <div>
                        <span className="text-xs font-bold text-slate-800 capitalize">{feat} Module</span>
                        <p className="text-[10px] text-slate-500">
                          {enabled ? 'Module active for this church' : 'Feature disabled by Super Admin'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleToggleFeature(selectedChurch, feat)}
                        className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
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
                className="px-4 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl"
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
          setActionSuccess(msg || 'Church registered successfully.');
          loadData();
        }}
      />
    </div>
  );
};
