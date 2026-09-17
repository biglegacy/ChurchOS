import React, { useState, useEffect } from 'react';
import {
  Code,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Save,
  Key,
  Globe,
  Sliders,
} from 'lucide-react';
import { ApiClient } from '../../api';

export const SuperAdminApiSettings: React.FC = () => {
  const [settings, setSettings] = useState<any>({
    webhookUrl: '',
    smsCallbackUrl: '',
    apiTimeoutMs: 15000,
    rateLimitPerMinute: 300,
    enableApiLogging: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await ApiClient.get('/api/super-admin/api-settings');
      setSettings(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load API settings.');
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
      const res = await ApiClient.put('/api/super-admin/api-settings', settings);
      setNotice(res.message);
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
            <Code className="w-5 h-5 text-teal-700" />
            <span>API Settings & Developer Integrations</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure webhooks, gateway callback endpoints, rate-limits, and external API timeouts.
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

      {/* Form Card */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs max-w-2xl">
        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              External Webhook URL (Notifications & Events)
            </label>
            <input
              type="url"
              value={settings.webhookUrl || ''}
              onChange={e => setSettings({ ...settings, webhookUrl: e.target.value })}
              placeholder="https://api.yourchurchapp.com/webhooks"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-700 font-mono text-xs"
            />
            <p className="text-[11px] text-slate-400 mt-1">Platform-wide HTTP POST dispatch for registered event triggers.</p>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Arkesel / Carrier Delivery Callback URL
            </label>
            <input
              type="url"
              value={settings.smsCallbackUrl || ''}
              onChange={e => setSettings({ ...settings, smsCallbackUrl: e.target.value })}
              placeholder="https://api.church-os.org/api/webhooks/arkesel-delivery"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-700 font-mono text-xs"
            />
            <p className="text-[11px] text-slate-400 mt-1">Target URL for carrier Delivery Receipts (DLR) status handshakes.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                API Request Timeout (milliseconds)
              </label>
              <input
                type="number"
                min={1000}
                max={60000}
                value={settings.apiTimeoutMs || 15000}
                onChange={e => setSettings({ ...settings, apiTimeoutMs: parseInt(e.target.value, 10) })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-700"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Rate Limit (Max requests / min / IP)
              </label>
              <input
                type="number"
                min={10}
                max={10000}
                value={settings.rateLimitPerMinute || 300}
                onChange={e => setSettings({ ...settings, rateLimitPerMinute: parseInt(e.target.value, 10) })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-700"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2 pt-2">
            <input
              type="checkbox"
              id="enableApiLogging"
              checked={settings.enableApiLogging ?? true}
              onChange={e => setSettings({ ...settings, enableApiLogging: e.target.checked })}
              className="rounded text-teal-700 focus:ring-teal-700"
            />
            <label htmlFor="enableApiLogging" className="font-semibold text-slate-700">
              Enable High-Performance API Telemetry Logging
            </label>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-teal-800 hover:bg-teal-900 text-white rounded-lg font-semibold shadow-xs transition flex items-center space-x-1.5 disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? 'Saving Settings...' : 'Save API Settings'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
