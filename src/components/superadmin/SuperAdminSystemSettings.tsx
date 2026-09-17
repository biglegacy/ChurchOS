import React, { useState, useEffect } from 'react';
import {
  Settings,
  Save,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Mail,
  Phone,
  DollarSign,
  Shield,
  Layers,
} from 'lucide-react';
import { ApiClient } from '../../api';

export const SuperAdminSystemSettings: React.FC = () => {
  const [settings, setSettings] = useState<any>({
    appName: 'Church-OS Platform',
    supportEmail: 'support@church-os.org',
    supportPhone: '+233 24 123 4567',
    defaultCurrency: 'GHS',
    costPerSmsGHS: 0.04,
    autoApproveChurches: false,
    maintenanceMode: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await ApiClient.get('/api/super-admin/settings');
      setSettings((prev: any) => ({ ...prev, ...res }));
    } catch (err: any) {
      setError(err.message || 'Failed to load system settings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      const res = await ApiClient.put('/api/super-admin/settings', settings);
      setNotice(res.message || 'System platform configuration updated.');
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
            <Settings className="w-5 h-5 text-teal-700" />
            <span>System Platform Settings</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure global SaaS branding, operational defaults, support contacts, and maintenance modes.
          </p>
        </div>

        <button
          onClick={loadSettings}
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

      {/* Settings Form */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs max-w-2xl">
        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Platform Brand Name</label>
              <input
                type="text"
                value={settings.appName || 'Church-OS Platform'}
                onChange={e => setSettings({ ...settings, appName: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-700"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Default Base Currency</label>
              <input
                type="text"
                value={settings.defaultCurrency || 'GHS'}
                onChange={e => setSettings({ ...settings, defaultCurrency: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-700"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Support Email</label>
              <input
                type="email"
                value={settings.supportEmail || ''}
                onChange={e => setSettings({ ...settings, supportEmail: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-700"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Support Phone / WhatsApp</label>
              <input
                type="text"
                value={settings.supportPhone || ''}
                onChange={e => setSettings({ ...settings, supportPhone: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-700"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Unit Cost Per SMS Credit (GH₵)</label>
              <input
                type="number"
                step="0.005"
                value={settings.costPerSmsGHS || 0.04}
                onChange={e => setSettings({ ...settings, costPerSmsGHS: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-700"
              />
            </div>
          </div>

          <div className="space-y-3 pt-3 border-t border-slate-100">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="autoApproveCheck"
                checked={settings.autoApproveChurches ?? false}
                onChange={e => setSettings({ ...settings, autoApproveChurches: e.target.checked })}
                className="rounded text-teal-700 focus:ring-teal-700"
              />
              <label htmlFor="autoApproveCheck" className="font-semibold text-slate-700">
                Auto-approve newly registered churches (Instant onboarding)
              </label>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="maintenanceModeCheck"
                checked={settings.maintenanceMode ?? false}
                onChange={e => setSettings({ ...settings, maintenanceMode: e.target.checked })}
                className="rounded text-rose-600 focus:ring-rose-600"
              />
              <label htmlFor="maintenanceModeCheck" className="font-semibold text-rose-700">
                Platform Maintenance Mode (Restricts access to Super Admins only)
              </label>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-teal-800 hover:bg-teal-900 text-white rounded-lg font-semibold shadow-xs transition flex items-center space-x-1.5 disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? 'Saving...' : 'Save Global Settings'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
