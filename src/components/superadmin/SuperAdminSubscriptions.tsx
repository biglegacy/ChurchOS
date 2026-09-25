import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Search,
  CheckCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
  Edit2,
  Calendar,
  Building2,
  DollarSign,
} from 'lucide-react';
import { ApiClient } from '../../api';

interface SubscriptionRecord {
  churchId: string;
  churchName: string;
  city: string;
  plan: string;
  status: 'ACTIVE' | 'EXPIRING' | 'EXPIRED';
  priceGHS: number;
  expiresAt: string;
  createdAt?: string;
}

export const SuperAdminSubscriptions: React.FC = () => {
  const [subscriptions, setSubscriptions] = useState<SubscriptionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Edit modal
  const [editingSub, setEditingSub] = useState<SubscriptionRecord | null>(null);
  const [editPlan, setEditPlan] = useState('growth');
  const [editStatus, setEditStatus] = useState<'ACTIVE' | 'EXPIRING' | 'EXPIRED'>('ACTIVE');
  const [editPriceGHS, setEditPriceGHS] = useState(150);
  const [editExpiresAt, setEditExpiresAt] = useState('');
  const [saving, setSaving] = useState(false);

  const loadSubscriptions = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await ApiClient.get('/api/super-admin/subscriptions');
      setSubscriptions(Array.isArray(res) ? res : []);
    } catch (err: any) {
      setError(err.message || 'Failed to load subscriptions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubscriptions();
  }, []);

  const handleOpenEdit = (sub: SubscriptionRecord) => {
    setEditingSub(sub);
    setEditPlan(sub.plan || 'growth');
    setEditStatus(sub.status || 'ACTIVE');
    setEditPriceGHS(sub.priceGHS || 150);
    setEditExpiresAt(sub.expiresAt ? sub.expiresAt.split('T')[0] : '');
  };

  const handleSaveSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSub) return;
    try {
      setSaving(true);
      setError(null);
      const res = await ApiClient.put(`/api/super-admin/subscriptions/${editingSub.churchId}`, {
        plan: editPlan,
        status: editStatus,
        priceGHS: Number(editPriceGHS),
        expiresAt: editExpiresAt ? new Date(editExpiresAt).toISOString() : new Date(Date.now() + 30 * 86400000).toISOString(),
      });
      setNotice(res.message);
      setEditingSub(null);
      await loadSubscriptions();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const activeCount = (subscriptions || []).filter(s => s.status === 'ACTIVE').length;
  const expiringCount = (subscriptions || []).filter(s => s.status === 'EXPIRING').length;
  const expiredCount = (subscriptions || []).filter(s => s.status === 'EXPIRED').length;
  const totalRevenue = (subscriptions || []).reduce((acc, s) => acc + (s.priceGHS || 0), 0);

  const filtered = (subscriptions || []).filter(s => {
    const q = (searchTerm || '').toLowerCase();
    const matchesSearch =
      (s.churchName || '').toLowerCase().includes(q) ||
      (s.city || '').toLowerCase().includes(q) ||
      (s.plan || '').toLowerCase().includes(q);
    const matchesStatus = statusFilter === 'ALL' || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-5 text-left">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-teal-950 flex items-center space-x-2">
            <CreditCard className="w-5 h-5 text-teal-700" />
            <span>Tenant Subscriptions & Billing ({subscriptions.length})</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitor church subscription lifecycles, active plans, expiration windows, and billing status.
          </p>
        </div>

        <button
          onClick={loadSubscriptions}
          className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs transition self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {notice && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center justify-between">
          <span>{notice}</span>
          <button onClick={() => setNotice(null)} className="font-bold text-emerald-700 hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="font-bold text-rose-700 hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500">Monthly Run-Rate</span>
          <p className="text-2xl font-bold text-teal-950 mt-1">GH₵{totalRevenue.toLocaleString()}</p>
          <p className="text-[11px] text-slate-500 mt-1">Across all paid subscriptions</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500">Active Subscriptions</span>
          <p className="text-2xl font-bold text-emerald-700 mt-1">{activeCount}</p>
          <p className="text-[11px] text-emerald-600 mt-1">Current & operational</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500">Expiring Soon</span>
          <p className="text-2xl font-bold text-amber-700 mt-1">{expiringCount}</p>
          <p className="text-[11px] text-amber-600 mt-1">Next 14 days renewal</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500">Expired / Lapsed</span>
          <p className="text-2xl font-bold text-rose-700 mt-1">{expiredCount}</p>
          <p className="text-[11px] text-rose-600 mt-1">Pending payment update</p>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-col sm:flex-row gap-2.5 items-center justify-between bg-white p-3.5 rounded-xl border border-slate-200 text-xs">
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search church, city, plan..."
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-700"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <span className="text-slate-500 font-medium">Status:</span>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-teal-700"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="EXPIRING">Expiring</option>
            <option value="EXPIRED">Expired</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Church Tenant</th>
                <th className="py-3 px-4">Plan Tier</th>
                <th className="py-3 px-4">Price (GHS)</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Renewal Date</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(filtered || []).map(s => (
                <tr key={s.churchId} className="hover:bg-slate-50/60 transition">
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-900">{s.churchName}</div>
                    <div className="text-[11px] text-slate-500">{s.city}</div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-teal-50 text-teal-800 border border-teal-200">
                      {s.plan}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-800">
                    GH₵{s.priceGHS}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      s.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                      s.status === 'EXPIRING' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                      'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}>
                      {s.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">
                    {s.expiresAt ? new Date(s.expiresAt).toLocaleDateString() : 'N/A'}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => handleOpenEdit(s)}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-teal-50 hover:text-teal-900 text-slate-700 rounded text-[11px] font-semibold flex items-center space-x-1 inline-flex transition"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>Adjust</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {editingSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 text-left space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900 flex items-center space-x-2">
                <CreditCard className="w-4 h-4 text-teal-700" />
                <span>Adjust Tenant Subscription</span>
              </h3>
              <button onClick={() => setEditingSub(null)} className="text-slate-400 hover:text-slate-600 text-sm">✕</button>
            </div>

            <p className="text-xs text-slate-500">
              Church: <strong className="text-slate-800">{editingSub.churchName}</strong>
            </p>

            <form onSubmit={handleSaveSubscription} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Plan Tier</label>
                <select
                  value={editPlan}
                  onChange={e => setEditPlan(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-teal-700"
                >
                  <option value="starter">Starter Plan (GH₵0)</option>
                  <option value="growth">Growth Congregation (GH₵150)</option>
                  <option value="cathedral">Cathedral Enterprise (GH₵350)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Status</label>
                <select
                  value={editStatus}
                  onChange={e => setEditStatus(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-teal-700"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="EXPIRING">EXPIRING</option>
                  <option value="EXPIRED">EXPIRED</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Price (GHS)</label>
                <input
                  type="number"
                  value={editPriceGHS}
                  onChange={e => setEditPriceGHS(parseFloat(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-700"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Expires On</label>
                <input
                  type="date"
                  value={editExpiresAt}
                  onChange={e => setEditExpiresAt(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-700"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingSub(null)}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-1.5 bg-teal-800 hover:bg-teal-900 text-white rounded-lg font-semibold shadow-xs disabled:opacity-50"
                >
                  {saving ? 'Updating...' : 'Save Subscription'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
