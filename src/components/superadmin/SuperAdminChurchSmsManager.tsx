import React, { useState, useEffect } from 'react';
import {
  Coins,
  Search,
  Plus,
  Minus,
  Sliders,
  DollarSign,
  History,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Edit2,
  Building2,
  Radio,
  FileText,
  Clock,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  Shield,
  Key,
  ExternalLink,
  ChevronRight,
  Send,
} from 'lucide-react';
import { ApiClient } from '../../api';
import { useAutoDismissNotification } from '../../utils/useAutoDismissNotification';

interface ChurchSmsSummary {
  id: string;
  name: string;
  city: string;
  seniorPastor?: string;
  adminEmail?: string;
  adminPhone?: string;
  smsPricePerUnit: number;
  smsAllocatedUnits: number;
  smsUnitsUsed: number;
  smsCredits: number;
  smsStatus: 'ACTIVE' | 'DISABLED';
  totalMessagesSent: number;
  deliveredCount: number;
  failedCount: number;
  lastDispatchedAt?: string;
}

interface SmsUnitAudit {
  id: string;
  churchId: string;
  churchName: string;
  action: 'ASSIGN' | 'ADD' | 'DEDUCT' | 'PRICE_CHANGE' | 'STATUS_CHANGE';
  amountChanged?: number;
  prevUnits: number;
  newUnits: number;
  prevPrice?: number;
  newPrice?: number;
  reason: string;
  performedBy: string;
  timestamp: string;
}

interface ChurchSmsHistoryData {
  church: {
    id: string;
    name: string;
    smsPricePerUnit: number;
    smsAllocatedUnits: number;
    smsUnitsUsed: number;
    smsCredits: number;
    smsStatus: 'ACTIVE' | 'DISABLED';
  };
  messages: Array<{
    id: string;
    recipientName: string;
    phone: string;
    normalizedPhone: string;
    message: string;
    notificationType: string;
    status: string;
    unitsDeducted?: number;
    ratePerUnitGHS?: number;
    costGHS?: number;
    failureReason?: string;
    sentAt?: string;
    createdAt: string;
  }>;
  unitAudits: SmsUnitAudit[];
}

export const SuperAdminChurchSmsManager: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'churches' | 'audits'>('churches');
  const [churches, setChurches] = useState<ChurchSmsSummary[]>([]);
  const [audits, setAudits] = useState<SmsUnitAudit[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'DISABLED' | 'LOW_UNITS'>('ALL');
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  useAutoDismissNotification(notice, setNotice, 2000);
  useAutoDismissNotification(error, setError, 2000);

  // Unit Adjustment Modal State
  const [adjustingChurch, setAdjustingChurch] = useState<ChurchSmsSummary | null>(null);
  const [adjustMode, setAdjustMode] = useState<'ADD' | 'DEDUCT' | 'ASSIGN'>('ADD');
  const [adjustUnits, setAdjustUnits] = useState<string>('250');
  const [adjustReason, setAdjustReason] = useState<string>('');
  const [adjustLoading, setAdjustLoading] = useState(false);

  // Pricing Modal State
  const [pricingChurch, setPricingChurch] = useState<ChurchSmsSummary | null>(null);
  const [priceInput, setPriceInput] = useState<string>('0.05');
  const [priceReason, setPriceReason] = useState<string>('');
  const [pricingLoading, setPricingLoading] = useState(false);

  // History Modal State
  const [historyChurch, setHistoryChurch] = useState<ChurchSmsSummary | null>(null);
  const [historyData, setHistoryData] = useState<ChurchSmsHistoryData | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyTab, setHistoryTab] = useState<'dispatches' | 'audits'>('dispatches');

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [summaryRes, auditsRes] = await Promise.all([
        ApiClient.get('/api/super-admin/sms/churches-summary'),
        ApiClient.get('/api/super-admin/sms/unit-audits'),
      ]);
      setChurches(Array.isArray(summaryRes?.churches) ? summaryRes.churches : []);
      setAudits(Array.isArray(auditsRes?.audits) ? auditsRes.audits : []);
    } catch (err: any) {
      setError(err.message || 'Failed to load SMS management data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Quick Status Toggle
  const handleToggleStatus = async (church: ChurchSmsSummary) => {
    const newStatus = church.smsStatus === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
    try {
      setError(null);
      const res = await ApiClient.post(`/api/super-admin/churches/${church.id}/sms-status`, {
        status: newStatus,
        reason: `Super Admin toggled SMS status to ${newStatus}`,
      });
      setNotice(res.message);
      setChurches(prev =>
        prev.map(c => (c.id === church.id ? { ...c, smsStatus: newStatus } : c))
      );
      // Reload audits to capture action
      const auditsRes = await ApiClient.get('/api/super-admin/sms/unit-audits');
      setAudits(auditsRes.audits || []);
    } catch (err: any) {
      setError(err.message || 'Failed to update SMS status.');
    }
  };

  // Submit Unit Adjustment
  const handleSaveAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingChurch) return;
    const parsed = parseInt(adjustUnits, 10);
    if (isNaN(parsed) || parsed < 0) {
      setError('Please enter a valid positive unit number.');
      return;
    }

    try {
      setAdjustLoading(true);
      setError(null);
      const res = await ApiClient.post(`/api/super-admin/churches/${adjustingChurch.id}/adjust-sms-units`, {
        mode: adjustMode,
        units: parsed,
        reason: adjustReason || `Super Admin ${adjustMode} of ${parsed} units`,
      });

      setNotice(res.message);
      setAdjustingChurch(null);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to adjust units.');
    } finally {
      setAdjustLoading(false);
    }
  };

  // Submit Pricing Update
  const handleSavePricing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pricingChurch) return;
    const parsed = parseFloat(priceInput);
    if (isNaN(parsed) || parsed < 0) {
      setError('Please enter a valid non-negative unit price.');
      return;
    }

    try {
      setPricingLoading(true);
      setError(null);
      const res = await ApiClient.post(`/api/super-admin/churches/${pricingChurch.id}/sms-pricing`, {
        pricePerUnit: parsed,
        reason: priceReason || `Updated SMS unit price to GH₵ ${parsed.toFixed(4)}`,
      });

      setNotice(res.message);
      setPricingChurch(null);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to update SMS price.');
    } finally {
      setPricingLoading(false);
    }
  };

  // Open History Modal
  const handleOpenHistory = async (church: ChurchSmsSummary) => {
    setHistoryChurch(church);
    setHistoryLoading(true);
    try {
      const res = await ApiClient.get(`/api/super-admin/churches/${church.id}/sms-history`);
      setHistoryData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load church SMS history.');
    } finally {
      setHistoryLoading(false);
    }
  };

  // Filtered churches
  const filteredChurches = (churches || []).filter(c => {
    const q = (searchQuery || '').toLowerCase();
    const matchesSearch =
      (c.name || '').toLowerCase().includes(q) ||
      (c.city && c.city.toLowerCase().includes(q)) ||
      (c.seniorPastor && c.seniorPastor.toLowerCase().includes(q)) ||
      (c.adminEmail && c.adminEmail.toLowerCase().includes(q));

    if (!matchesSearch) return false;

    if (statusFilter === 'ACTIVE') return c.smsStatus === 'ACTIVE';
    if (statusFilter === 'DISABLED') return c.smsStatus === 'DISABLED';
    if (statusFilter === 'LOW_UNITS') return (c.smsCredits || 0) <= 50;

    return true;
  });

  // Calculate totals
  const totalAllocated = (churches || []).reduce((acc, c) => acc + (c.smsAllocatedUnits || 0), 0);
  const totalUsed = (churches || []).reduce((acc, c) => acc + (c.smsUnitsUsed || 0), 0);
  const totalRemaining = (churches || []).reduce((acc, c) => acc + (c.smsCredits || 0), 0);
  const activeCount = (churches || []).filter(c => c.smsStatus === 'ACTIVE').length;

  return (
    <div className="space-y-5 text-left">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-teal-950 flex items-center space-x-2">
            <Radio className="w-5 h-5 text-teal-700" />
            <span>Church SMS Pricing & Unit Allocation</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Super Admin exclusive governance over custom SMS unit rates, credits, and dispatch status for all registered churches.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={loadData}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg flex items-center space-x-1.5 transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* KPI Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Allocated Units</span>
          <p className="text-2xl font-black text-teal-950 mt-1">{totalAllocated.toLocaleString()}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Across {churches.length} churches</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Units Consumed</span>
          <p className="text-2xl font-black text-amber-700 mt-1">{totalUsed.toLocaleString()}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Dispatched platform-wide</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Active Units</span>
          <p className="text-2xl font-black text-emerald-700 mt-1">{totalRemaining.toLocaleString()}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Ready for dispatch</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Active SMS Services</span>
          <p className="text-2xl font-black text-teal-950 mt-1">
            {activeCount} <span className="text-xs font-normal text-slate-400">/ {churches.length}</span>
          </p>
          <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">
            {churches.length > 0 ? ((activeCount / churches.length) * 100).toFixed(0) : 0}% Operational
          </p>
        </div>
      </div>

      {/* Notifications / Errors */}
      {notice && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{notice}</span>
          </div>
          <button onClick={() => setNotice(null)} className="font-bold text-emerald-700 hover:underline cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="font-bold text-rose-700 hover:underline cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {/* Sub Tab Navigation */}
      <div className="flex border-b border-slate-200 space-x-6">
        <button
          onClick={() => setActiveSubTab('churches')}
          className={`pb-3 text-xs font-bold transition flex items-center space-x-1.5 border-b-2 cursor-pointer ${
            activeSubTab === 'churches'
              ? 'border-teal-700 text-teal-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Registered Churches SMS Directory ({churches.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('audits')}
          className={`pb-3 text-xs font-bold transition flex items-center space-x-1.5 border-b-2 cursor-pointer ${
            activeSubTab === 'audits'
              ? 'border-teal-700 text-teal-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Unit Adjustments & Pricing Audit Trail ({audits.length})</span>
        </button>
      </div>

      {/* TAB 1: CHURCHES DIRECTORY */}
      {activeSubTab === 'churches' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search church, pastor, city..."
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-teal-700 focus:outline-none"
              />
            </div>

            <div className="flex items-center space-x-1.5 w-full sm:w-auto overflow-x-auto">
              {(['ALL', 'ACTIVE', 'DISABLED', 'LOW_UNITS'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                    statusFilter === f
                      ? 'bg-teal-800 text-white shadow-xs'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {f === 'ALL' && 'All Churches'}
                  {f === 'ACTIVE' && 'Active Only'}
                  {f === 'DISABLED' && 'Disabled Only'}
                  {f === 'LOW_UNITS' && 'Low Balance (≤50)'}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Church Details</th>
                    <th className="py-3 px-3">SMS Status</th>
                    <th className="py-3 px-3">SMS Unit Price</th>
                    <th className="py-3 px-3 text-right">Allocated</th>
                    <th className="py-3 px-3 text-right">Used</th>
                    <th className="py-3 px-3 text-right">Remaining Units</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {(filteredChurches || []).length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        No churches found matching your filters.
                      </td>
                    </tr>
                  ) : (
                    (filteredChurches || []).map(c => (
                      <tr key={c.id} className="hover:bg-slate-50/70 transition">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900 text-sm">{c.name}</div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {c.city || 'Ghana'} • Pastor: {c.seniorPastor || 'Pastor'}
                          </div>
                        </td>

                        <td className="py-3.5 px-3 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(c)}
                            title="Click to toggle SMS status"
                            className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold cursor-pointer transition border ${
                              c.smsStatus === 'ACTIVE'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${c.smsStatus === 'ACTIVE' ? 'bg-emerald-600 animate-pulse' : 'bg-rose-600'}`} />
                            <span>{c.smsStatus === 'ACTIVE' ? 'Active' : 'Disabled'}</span>
                          </button>
                        </td>

                        <td className="py-3.5 px-3 whitespace-nowrap">
                          <div className="flex items-center space-x-1.5">
                            <span className="font-mono font-bold text-slate-900">
                              GH₵ {(c.smsPricePerUnit ?? 0.05).toFixed(4)}
                            </span>
                            <button
                              onClick={() => {
                                setPricingChurch(c);
                                setPriceInput((c.smsPricePerUnit ?? 0.05).toString());
                                setPriceReason('');
                              }}
                              className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-700 transition cursor-pointer"
                              title="Set SMS price for this church"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                          </div>
                          <span className="text-[10px] text-slate-400">per 160 chars</span>
                        </td>

                        <td className="py-3.5 px-3 text-right font-mono font-semibold text-slate-600 whitespace-nowrap">
                          {(c.smsAllocatedUnits ?? c.smsCredits ?? 500).toLocaleString()}
                        </td>

                        <td className="py-3.5 px-3 text-right font-mono font-semibold text-amber-700 whitespace-nowrap">
                          {(c.smsUnitsUsed ?? 0).toLocaleString()}
                        </td>

                        <td className="py-3.5 px-3 text-right whitespace-nowrap">
                          <span
                            className={`inline-flex items-center font-mono font-bold px-2.5 py-1 rounded-md text-xs border ${
                              c.smsCredits <= 0
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : c.smsCredits <= 50
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : 'bg-teal-50 text-teal-800 border-teal-200'
                            }`}
                          >
                            <Coins className="w-3 h-3 mr-1" />
                            {c.smsCredits?.toLocaleString() ?? 0}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end space-x-1.5">
                            {/* Adjust Units */}
                            <button
                              type="button"
                              onClick={() => {
                                setAdjustingChurch(c);
                                setAdjustMode('ADD');
                                setAdjustUnits('250');
                                setAdjustReason('');
                              }}
                              className="px-2.5 py-1.5 bg-teal-800 hover:bg-teal-900 text-white font-bold text-xs rounded-lg shadow-xs transition flex items-center space-x-1 cursor-pointer"
                              title="Add, deduct, or set SMS units"
                            >
                              <Coins className="w-3 h-3" />
                              <span>Adjust Units</span>
                            </button>

                            {/* View History */}
                            <button
                              type="button"
                              onClick={() => handleOpenHistory(c)}
                              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg transition flex items-center space-x-1 cursor-pointer"
                              title="View dispatch history and audit logs for this church"
                            >
                              <History className="w-3 h-3" />
                              <span>Usage</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: AUDIT TRAIL */}
      {activeSubTab === 'audits' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <Shield className="w-4 h-4 text-teal-700" />
                <span>SMS Unit Adjustments & Governance Audit Trail</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Permanent chronological record of every SMS unit assignment, addition, deduction, pricing change, and status update.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-3">Target Church</th>
                  <th className="py-3 px-3">Action</th>
                  <th className="py-3 px-3">Units / Price Change</th>
                  <th className="py-3 px-4">Reason / Notes</th>
                  <th className="py-3 px-3 text-right">Performed By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {(audits || []).length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No SMS unit adjustments recorded yet.
                    </td>
                  </tr>
                ) : (
                  (audits || []).map(a => (
                    <tr key={a.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        {new Date(a.timestamp).toLocaleString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>

                      <td className="py-3 px-3">
                        <span className="font-bold text-slate-900">{a.churchName}</span>
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            a.action === 'ADD'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : a.action === 'DEDUCT'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : a.action === 'ASSIGN'
                              ? 'bg-teal-50 text-teal-700 border border-teal-200'
                              : a.action === 'PRICE_CHANGE'
                              ? 'bg-purple-50 text-purple-700 border border-purple-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {a.action}
                        </span>
                      </td>

                      <td className="py-3 px-3 font-mono text-xs whitespace-nowrap">
                        {a.action === 'PRICE_CHANGE' ? (
                          <span>
                            GH₵ {(a.prevPrice ?? 0.05).toFixed(4)} → <strong className="text-purple-900">GH₵ {(a.newPrice ?? 0.05).toFixed(4)}</strong>
                          </span>
                        ) : (
                          <span>
                            {a.prevUnits} → <strong className="text-teal-900">{a.newUnits} units</strong>
                            {a.amountChanged !== undefined && (
                              <span className={`ml-1.5 text-[11px] ${a.amountChanged >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                ({a.amountChanged >= 0 ? `+${a.amountChanged}` : a.amountChanged})
                              </span>
                            )}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-xs text-slate-600">
                        {a.reason || '—'}
                      </td>

                      <td className="py-3 px-3 text-right font-semibold text-slate-800 whitespace-nowrap">
                        {a.performedBy || 'Super Admin'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: ADJUST SMS UNITS (ASSIGN, ADD, DEDUCT) */}
      {adjustingChurch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden text-left animate-in fade-in zoom-in-95">
            <div className="bg-teal-950 px-5 py-4 flex items-center justify-between text-white">
              <div className="flex items-center space-x-2">
                <Coins className="w-5 h-5 text-teal-400" />
                <h3 className="font-bold text-sm">Adjust SMS Units — {adjustingChurch.name}</h3>
              </div>
              <button
                type="button"
                onClick={() => setAdjustingChurch(null)}
                className="text-teal-200 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAdjustment} className="p-5 space-y-4">
              {/* Church Info */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center">
                <div>
                  <span className="font-bold text-slate-900 text-sm">{adjustingChurch.name}</span>
                  <p className="text-[11px] text-slate-500">{adjustingChurch.city || 'Ghana'}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Current Balance</span>
                  <span className="font-mono font-bold text-teal-900 text-sm">
                    {adjustingChurch.smsCredits ?? 0} units
                  </span>
                </div>
              </div>

              {/* Action Mode */}
              <div>
                <label className="block font-bold text-xs text-slate-700 mb-1.5">Adjustment Action *</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustMode('ADD')}
                    className={`py-2 px-2.5 rounded-lg font-bold border transition text-center text-xs cursor-pointer ${
                      adjustMode === 'ADD'
                        ? 'bg-teal-800 text-white border-teal-800 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    + Add Units
                  </button>

                  <button
                    type="button"
                    onClick={() => setAdjustMode('DEDUCT')}
                    className={`py-2 px-2.5 rounded-lg font-bold border transition text-center text-xs cursor-pointer ${
                      adjustMode === 'DEDUCT'
                        ? 'bg-teal-800 text-white border-teal-800 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    - Deduct Units
                  </button>

                  <button
                    type="button"
                    onClick={() => setAdjustMode('ASSIGN')}
                    className={`py-2 px-2.5 rounded-lg font-bold border transition text-center text-xs cursor-pointer ${
                      adjustMode === 'ASSIGN'
                        ? 'bg-teal-800 text-white border-teal-800 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    Set Exact
                  </button>
                </div>
              </div>

              {/* Amount & Quick Buttons */}
              <div>
                <label className="block font-bold text-xs text-slate-700 mb-1">
                  {adjustMode === 'ADD' && 'Units to Add *'}
                  {adjustMode === 'DEDUCT' && 'Units to Deduct *'}
                  {adjustMode === 'ASSIGN' && 'Set Total Balance Directly *'}
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  required
                  value={adjustUnits}
                  onChange={e => setAdjustUnits(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-700"
                />

                <div className="flex flex-wrap gap-1.5 mt-2">
                  {[50, 100, 250, 500, 1000].map(val => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setAdjustUnits(String(val))}
                      className="px-2 py-1 bg-slate-100 hover:bg-teal-50 hover:text-teal-800 text-slate-700 rounded-lg text-xs font-semibold transition cursor-pointer"
                    >
                      {adjustMode === 'DEDUCT' ? `-${val}` : `+${val}`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reason / Reference */}
              <div>
                <label className="block font-bold text-xs text-slate-700 mb-1">Reason / Reference Note *</label>
                <input
                  type="text"
                  required
                  value={adjustReason}
                  onChange={e => setAdjustReason(e.target.value)}
                  placeholder="e.g. Monthly bundle, Recharge, Top-up payment, Correction"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-700"
                />
              </div>

              {/* Preview */}
              <div className="p-3 bg-teal-50 rounded-xl border border-teal-200 flex items-center justify-between text-xs">
                <span className="text-teal-900 font-semibold">Projected New Balance:</span>
                <span className="font-mono font-bold text-teal-950 text-sm">
                  {adjustMode === 'ASSIGN'
                    ? `${Math.max(0, parseInt(adjustUnits, 10) || 0)} units`
                    : adjustMode === 'ADD'
                    ? `${(adjustingChurch.smsCredits ?? 0) + (parseInt(adjustUnits, 10) || 0)} units`
                    : `${Math.max(0, (adjustingChurch.smsCredits ?? 0) - (parseInt(adjustUnits, 10) || 0))} units`}
                </span>
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAdjustingChurch(null)}
                  disabled={adjustLoading}
                  className="px-4 py-2 text-slate-600 font-semibold text-xs hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adjustLoading || !adjustUnits}
                  className="px-4 py-2 bg-teal-800 hover:bg-teal-900 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                >
                  {adjustLoading ? (
                    <span>Saving...</span>
                  ) : (
                    <>
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Confirm Adjustment</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: SET SMS PRICING */}
      {pricingChurch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden text-left animate-in fade-in zoom-in-95">
            <div className="bg-teal-950 px-5 py-4 flex items-center justify-between text-white">
              <div className="flex items-center space-x-2">
                <DollarSign className="w-5 h-5 text-teal-400" />
                <h3 className="font-bold text-sm">Set SMS Rate — {pricingChurch.name}</h3>
              </div>
              <button
                type="button"
                onClick={() => setPricingChurch(null)}
                className="text-teal-200 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePricing} className="p-5 space-y-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center">
                <div>
                  <span className="font-bold text-slate-900 text-sm">{pricingChurch.name}</span>
                  <p className="text-[11px] text-slate-500">{pricingChurch.city || 'Ghana'}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Current Price</span>
                  <span className="font-mono font-bold text-slate-900 text-sm">
                    GH₵ {(pricingChurch.smsPricePerUnit ?? 0.05).toFixed(4)}
                  </span>
                </div>
              </div>

              <div>
                <label className="block font-bold text-xs text-slate-700 mb-1">
                  Price Per SMS Unit (GH₵) *
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.001"
                  required
                  value={priceInput}
                  onChange={e => setPriceInput(e.target.value)}
                  placeholder="0.0500"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-700"
                />
                <div className="flex gap-1.5 mt-2">
                  {[0.04, 0.045, 0.05, 0.055, 0.06].map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPriceInput(p.toString())}
                      className="px-2 py-1 bg-slate-100 hover:bg-teal-50 hover:text-teal-800 text-slate-700 rounded-lg text-xs font-semibold transition cursor-pointer"
                    >
                      GH₵ {p.toFixed(3)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-bold text-xs text-slate-700 mb-1">Reason / Reference Note</label>
                <input
                  type="text"
                  value={priceReason}
                  onChange={e => setPriceReason(e.target.value)}
                  placeholder="e.g. Special partnership rate, Volume discount"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-700"
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPricingChurch(null)}
                  disabled={pricingLoading}
                  className="px-4 py-2 text-slate-600 font-semibold text-xs hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pricingLoading || !priceInput}
                  className="px-4 py-2 bg-teal-800 hover:bg-teal-900 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                >
                  {pricingLoading ? (
                    <span>Saving...</span>
                  ) : (
                    <>
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Update SMS Price</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: CHURCH SMS USAGE & HISTORY */}
      {historyChurch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden text-left animate-in fade-in zoom-in-95">
            {/* Header */}
            <div className="bg-teal-950 px-6 py-4 flex items-center justify-between text-white shrink-0">
              <div className="flex items-center space-x-2">
                <History className="w-5 h-5 text-teal-400" />
                <div>
                  <h3 className="font-bold text-sm">SMS History & Diagnostics — {historyChurch.name}</h3>
                  <p className="text-[11px] text-teal-200 mt-0.5">
                    Live balance: {historyChurch.smsCredits} units • Rate: GH₵ {(historyChurch.smsPricePerUnit ?? 0.05).toFixed(4)}/unit • Status: {historyChurch.smsStatus}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setHistoryChurch(null)}
                className="text-teal-200 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="px-6 border-b border-slate-200 flex space-x-4 bg-slate-50 shrink-0">
              <button
                onClick={() => setHistoryTab('dispatches')}
                className={`py-3 text-xs font-bold border-b-2 transition cursor-pointer ${
                  historyTab === 'dispatches'
                    ? 'border-teal-800 text-teal-950'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Dispatched Messages ({historyData?.messages?.length || 0})
              </button>
              <button
                onClick={() => setHistoryTab('audits')}
                className={`py-3 text-xs font-bold border-b-2 transition cursor-pointer ${
                  historyTab === 'audits'
                    ? 'border-teal-800 text-teal-950'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Unit Allocations & Audits ({historyData?.unitAudits?.length || 0})
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto flex-1">
              {historyLoading ? (
                <div className="py-12 text-center text-slate-400 flex flex-col items-center justify-center space-y-2">
                  <RefreshCw className="w-6 h-6 animate-spin text-teal-700" />
                  <p className="text-xs">Loading SMS history from database...</p>
                </div>
              ) : historyTab === 'dispatches' ? (
                <div className="space-y-3">
                  {(!historyData?.messages || historyData.messages.length === 0) ? (
                    <div className="py-12 text-center text-slate-400">
                      No SMS dispatches found for this church.
                    </div>
                  ) : (
                    <div className="overflow-x-auto border border-slate-200 rounded-xl">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                            <th className="py-2.5 px-3">Date</th>
                            <th className="py-2.5 px-3">Recipient</th>
                            <th className="py-2.5 px-3">Message</th>
                            <th className="py-2.5 px-2 text-right">Units</th>
                            <th className="py-2.5 px-2 text-right">Cost (GHS)</th>
                            <th className="py-2.5 px-3 text-right">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                          {historyData.messages.map(m => (
                            <tr key={m.id} className="hover:bg-slate-50/70">
                              <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                                {new Date(m.sentAt || m.createdAt).toLocaleDateString('en-GB', {
                                  day: '2-digit',
                                  month: 'short',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </td>
                              <td className="py-2.5 px-3 whitespace-nowrap">
                                <span className="font-bold text-slate-900 block">{m.recipientName}</span>
                                <span className="font-mono text-[11px] text-slate-400">{m.normalizedPhone || m.phone}</span>
                              </td>
                              <td className="py-2.5 px-3 max-w-xs truncate text-slate-600" title={m.message}>
                                {m.message}
                              </td>
                              <td className="py-2.5 px-2 text-right font-mono font-bold text-teal-900 whitespace-nowrap">
                                {m.unitsDeducted ?? 1}
                              </td>
                              <td className="py-2.5 px-2 text-right font-mono text-slate-600 whitespace-nowrap">
                                GH₵ {(m.costGHS ?? (m.unitsDeducted ?? 1) * (m.ratePerUnitGHS ?? 0.05)).toFixed(4)}
                              </td>
                              <td className="py-2.5 px-3 text-right whitespace-nowrap">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    m.status === 'Delivered'
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                                  }`}
                                >
                                  {m.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {(!historyData?.unitAudits || historyData.unitAudits.length === 0) ? (
                    <div className="py-12 text-center text-slate-400">
                      No unit adjustments recorded for this church.
                    </div>
                  ) : (
                    <div className="overflow-x-auto border border-slate-200 rounded-xl">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                            <th className="py-2.5 px-3">Date</th>
                            <th className="py-2.5 px-3">Action</th>
                            <th className="py-2.5 px-3">Change</th>
                            <th className="py-2.5 px-4">Reason</th>
                            <th className="py-2.5 px-3 text-right">Performed By</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                          {historyData.unitAudits.map(a => (
                            <tr key={a.id} className="hover:bg-slate-50/70">
                              <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                                {new Date(a.timestamp).toLocaleString('en-GB', {
                                  day: '2-digit',
                                  month: 'short',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </td>
                              <td className="py-2.5 px-3 whitespace-nowrap">
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
                                  {a.action}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 font-mono text-xs whitespace-nowrap">
                                {a.action === 'PRICE_CHANGE' ? (
                                  <span>GH₵ {(a.prevPrice ?? 0.05).toFixed(4)} → GH₵ {(a.newPrice ?? 0.05).toFixed(4)}</span>
                                ) : (
                                  <span>{a.prevUnits} → {a.newUnits} units</span>
                                )}
                              </td>
                              <td className="py-2.5 px-4 text-slate-600 text-xs">
                                {a.reason}
                              </td>
                              <td className="py-2.5 px-3 text-right text-slate-800 font-semibold whitespace-nowrap">
                                {a.performedBy}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setHistoryChurch(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Close History
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
