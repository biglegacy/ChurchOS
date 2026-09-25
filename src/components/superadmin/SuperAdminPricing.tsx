import React, { useState, useEffect } from 'react';
import {
  Tag,
  CheckCircle,
  Edit2,
  Plus,
  RefreshCw,
  Coins,
  Users,
  Sparkles,
  DollarSign,
} from 'lucide-react';
import { ApiClient } from '../../api';
import { PricingPlan } from '../../types';

export const SuperAdminPricing: React.FC = () => {
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Edit modal
  const [editingPlan, setEditingPlan] = useState<PricingPlan | null>(null);
  const [name, setName] = useState('');
  const [priceGHS, setPriceGHS] = useState(0);
  const [smsCredits, setSmsCredits] = useState(0);
  const [maxMembers, setMaxMembers] = useState(0);
  const [featuresText, setFeaturesText] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadPlans = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await ApiClient.get('/api/super-admin/pricing');
      setPlans(Array.isArray(res) ? res : []);
    } catch (err: any) {
      setError(err.message || 'Failed to load pricing plans.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlans();
  }, []);

  const handleOpenEdit = (plan: PricingPlan) => {
    setEditingPlan(plan);
    setName(plan.name);
    setPriceGHS(plan.priceGHS);
    setSmsCredits(plan.smsCreditsIncluded);
    setMaxMembers(plan.maxMembers);
    setFeaturesText(plan.features?.join('\n') || '');
    setIsActive(plan.isActive);
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan) return;
    try {
      setSaving(true);
      setError(null);
      const features = featuresText
        .split('\n')
        .map(f => f.trim())
        .filter(Boolean);

      const res = await ApiClient.put(`/api/super-admin/pricing/${editingPlan.id}`, {
        name,
        priceGHS: Number(priceGHS),
        smsCreditsIncluded: Number(smsCredits),
        maxMembers: Number(maxMembers),
        features,
        isActive,
      });
      setNotice(res.message);
      setEditingPlan(null);
      await loadPlans();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5 text-left">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-teal-950 flex items-center space-x-2">
            <Tag className="w-5 h-5 text-teal-700" />
            <span>SaaS Pricing & Plan Architecture</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure tiered subscription offerings, included SMS credit allowances, and member caps.
          </p>
        </div>

        <button
          onClick={loadPlans}
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

      {/* Pricing Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {(plans || []).map(plan => (
          <div
            key={plan.id}
            className={`bg-white rounded-xl border p-5 flex flex-col justify-between relative shadow-xs transition ${
              plan.isPopular ? 'border-teal-700 ring-1 ring-teal-700' : 'border-slate-200'
            }`}
          >
            {plan.isPopular && (
              <span className="absolute -top-2.5 right-4 px-2.5 py-0.5 bg-teal-800 text-white rounded-full text-[10px] font-bold tracking-wide uppercase">
                Most Popular
              </span>
            )}

            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-base font-bold text-slate-900">{plan.name}</h3>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  plan.isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500'
                }`}>
                  {plan.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div className="my-4">
                <span className="text-3xl font-extrabold text-teal-950">GH₵{plan.priceGHS}</span>
                <span className="text-xs text-slate-500 ml-1">/ month</span>
              </div>

              <div className="space-y-2 py-3 border-y border-slate-100 text-xs text-slate-600">
                <div className="flex items-center space-x-2">
                  <Coins className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                  <span><strong>{plan.smsCreditsIncluded.toLocaleString()}</strong> SMS credits / month</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Users className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                  <span>Up to <strong>{plan.maxMembers > 5000 ? 'Unlimited' : plan.maxMembers}</strong> Members</span>
                </div>
              </div>

              <div className="mt-4 space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Included Features</p>
                {(plan.features || []).map((feat, idx) => (
                  <div key={idx} className="flex items-center space-x-2 text-xs text-slate-700">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-5 mt-5 border-t border-slate-100">
              <button
                onClick={() => handleOpenEdit(plan)}
                className="w-full py-2 bg-slate-100 hover:bg-teal-50 hover:text-teal-900 text-slate-700 text-xs font-semibold rounded-lg flex items-center justify-center space-x-1.5 transition"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Edit Plan & Allowances</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Modal */}
      {editingPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-md w-full p-5 shadow-2xl border border-slate-200 text-left space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900 flex items-center space-x-2">
                <Tag className="w-4 h-4 text-teal-700" />
                <span>Edit Pricing Plan ({editingPlan.tier})</span>
              </h3>
              <button onClick={() => setEditingPlan(null)} className="text-slate-400 hover:text-slate-600 text-sm">✕</button>
            </div>

            <form onSubmit={handleSavePlan} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Plan Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Price (GHS) *</label>
                  <input
                    type="number"
                    required
                    value={priceGHS}
                    onChange={e => setPriceGHS(parseFloat(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-700"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">SMS Credits Included *</label>
                  <input
                    type="number"
                    required
                    value={smsCredits}
                    onChange={e => setSmsCredits(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-700"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Max Member Cap</label>
                <input
                  type="number"
                  value={maxMembers}
                  onChange={e => setMaxMembers(parseInt(e.target.value, 10))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-700"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Features (1 per line)</label>
                <textarea
                  rows={4}
                  value={featuresText}
                  onChange={e => setFeaturesText(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-700"
                />
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="isActiveCheck"
                  checked={isActive}
                  onChange={e => setIsActive(e.target.checked)}
                  className="rounded text-teal-700 focus:ring-teal-700"
                />
                <label htmlFor="isActiveCheck" className="font-semibold text-slate-700">Plan is Active & Available</label>
              </div>

              <div className="flex justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingPlan(null)}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-1.5 bg-teal-800 hover:bg-teal-900 text-white rounded-lg font-semibold shadow-xs disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
