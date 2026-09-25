import React, { useState, useEffect } from 'react';
import {
  Server,
  Key,
  Eye,
  EyeOff,
  CheckCircle,
  AlertTriangle,
  Send,
  RefreshCw,
  Save,
  Radio,
  XCircle,
} from 'lucide-react';
import { ApiClient } from '../../api';
import { useAutoDismissNotification } from '../../utils/useAutoDismissNotification';

export const SuperAdminArkeselConfig: React.FC = () => {
  const [platformSettings, setPlatformSettings] = useState<any>(null);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [senderIdInput, setSenderIdInput] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  useAutoDismissNotification(notice, setNotice, 2000);
  useAutoDismissNotification(error, setError, 2000);

  // Test SMS
  const [testPhone, setTestPhone] = useState('');
  const [testMessage, setTestMessage] = useState('SMS Gateway central verification test.');
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [verifyingGateway, setVerifyingGateway] = useState(false);

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await ApiClient.get('/api/super-admin/settings');
      setPlatformSettings(res);
      if (res?.apiKey) setApiKeyInput(res.apiKey);
      if (res?.defaultSenderId) setSenderIdInput(res.defaultSenderId);
    } catch (err: any) {
      setError(err.message || 'Failed to load Arkesel settings.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyGateway = async () => {
    try {
      setVerifyingGateway(true);
      setError(null);
      setNotice(null);
      const res = await ApiClient.post('/api/super-admin/sms/verify');
      setNotice(res.message || 'Arkesel Gateway credentials verified successfully!');
      await loadSettings();
    } catch (err: any) {
      const errMsg = err.message || err.details || 'Arkesel Gateway verification failed. Please check your API key.';
      setError(errMsg);
    } finally {
      setVerifyingGateway(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingSettings(true);
      setError(null);
      const res = await ApiClient.put('/api/super-admin/settings', {
        ...platformSettings,
        apiKey: apiKeyInput,
        defaultSenderId: senderIdInput || 'CHURCH-OS',
      });
      setPlatformSettings(res.settings);
      setNotice(res.message || 'Arkesel SMS credentials updated successfully.');
      setTimeout(() => loadSettings(), 800);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSendTestSms = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testPhone.trim()) {
      setError('Please provide a test recipient phone number (e.g. 0201234567, 0241234567, 0271234567).');
      return;
    }
    try {
      setTestLoading(true);
      setTestResult(null);
      setError(null);
      const res = await ApiClient.post('/api/super-admin/sms/test', {
        testPhone: testPhone.trim(),
        testMessage: testMessage.trim(),
      });
      setTestResult({
        success: true,
        message: res.message || 'Test SMS submitted to Arkesel successfully (awaiting carrier delivery).',
        details: res.details,
      });
      setNotice(res.message || `Test SMS submitted to Arkesel for ${testPhone.trim()} (awaiting carrier delivery).`);
      await loadSettings();
    } catch (err: any) {
      const errMsg = err.message || err.details || 'Test SMS dispatch failed. Check your Arkesel credentials.';
      setTestResult({
        success: false,
        message: errMsg,
        details: err.details || err.message,
      });
      setError(errMsg);
    } finally {
      setTestLoading(false);
    }
  };

  return (
    <div className="space-y-5 text-left">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-teal-950 flex items-center space-x-2">
            <Server className="w-5 h-5 text-teal-700" />
            <span>Arkesel SMS Gateway Configuration</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure primary telecommunication gateway API credentials for Ghana telecom dispatches.
          </p>
        </div>

        <div className="flex items-center space-x-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={handleVerifyGateway}
            disabled={verifyingGateway}
            className="px-3 py-2 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded-lg text-xs font-semibold transition flex items-center space-x-1.5 disabled:opacity-50"
          >
            <CheckCircle className="w-3.5 h-3.5 text-teal-700" />
            <span>{verifyingGateway ? 'Verifying Gateway...' : 'Verify Gateway & Balance'}</span>
          </button>
          <button
            onClick={loadSettings}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs transition"
            title="Refresh settings"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Credentials Form */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="font-bold text-sm text-teal-950 flex items-center space-x-2">
              <Key className="w-4 h-4 text-teal-700" />
              <span>Gateway Credentials</span>
            </h3>
            {platformSettings?.hasApiKey || (apiKeyInput && !apiKeyInput.includes('•')) ? (
              <span className="px-2 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded text-[10px] font-bold">
                Configured
              </span>
            ) : (
              <span className="px-2 py-0.5 bg-amber-50 border border-amber-200 text-amber-800 rounded text-[10px] font-bold">
                Unset
              </span>
            )}
          </div>

          <form onSubmit={handleSave} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Arkesel API Key *
              </label>
              <div className="relative">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  required
                  value={apiKeyInput}
                  onChange={e => setApiKeyInput(e.target.value)}
                  placeholder="Paste your Arkesel API key"
                  className="w-full px-3 py-2 pr-10 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-700 font-mono text-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Found in your Arkesel Ghana account portal.</p>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Default Sender ID (Max 11 characters) *
              </label>
              <input
                type="text"
                required
                maxLength={11}
                value={senderIdInput}
                onChange={e => setSenderIdInput(e.target.value.toUpperCase())}
                placeholder="CHURCH-OS"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-700 uppercase font-mono text-xs"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Must be registered with NCA & Ghana telcos. <strong>Note:</strong> Telecel and AirtelTigo enforce strict Sender ID approvals on Arkesel accounts.
              </p>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={savingSettings}
                className="w-full py-2 bg-teal-800 hover:bg-teal-900 text-white rounded-lg font-semibold shadow-xs transition flex items-center justify-center space-x-1.5 disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{savingSettings ? 'Saving...' : 'Save Arkesel Settings'}</span>
              </button>
            </div>
          </form>

          {/* Gateway Status Summary */}
          {platformSettings && (
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <div>
                <span className="text-slate-500">Live Gateway Balance:</span>
                <span className="ml-1.5 font-bold text-teal-900">
                  {platformSettings.balanceCredits?.toLocaleString() ?? 0} SMS units
                </span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className={`w-2 h-2 rounded-full ${platformSettings.connectionStatus === 'Connected' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                <span className="font-semibold text-slate-700">{platformSettings.connectionStatus || 'Disconnected'}</span>
              </div>
            </div>
          )}
        </div>

        {/* Verification Test SMS Tool */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="font-bold text-sm text-teal-950 flex items-center space-x-2">
              <Send className="w-4 h-4 text-teal-700" />
              <span>Real Gateway SMS Verification</span>
            </h3>
            <button
              type="button"
              onClick={handleVerifyGateway}
              disabled={verifyingGateway}
              className="text-[11px] font-semibold text-teal-700 hover:text-teal-800 hover:underline flex items-center space-x-1 disabled:opacity-50"
            >
              <CheckCircle className="w-3 h-3" />
              <span>{verifyingGateway ? 'Verifying...' : 'Check Balance (Free)'}</span>
            </button>
          </div>

          <p className="text-xs text-slate-500">
            Dispatch a real test SMS to verify phone normalization and carrier handshake.
          </p>

          <form onSubmit={handleSendTestSms} className="space-y-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Recipient Phone (Ghana: Telecel, MTN, AT, etc.) *
              </label>
              <input
                type="text"
                required
                value={testPhone}
                onChange={e => setTestPhone(e.target.value)}
                placeholder="0201234567, 0241234567, 0271234567 or +233XXXXXXXXX"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-700 font-mono text-xs"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Test Message
              </label>
              <textarea
                rows={2}
                value={testMessage}
                onChange={e => setTestMessage(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-700 text-xs"
              />
            </div>

            <button
              type="submit"
              disabled={testLoading}
              className="w-full py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-semibold shadow-xs transition flex items-center justify-center space-x-1.5 disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{testLoading ? 'Dispatching Test...' : 'Send Live Test SMS'}</span>
            </button>
          </form>

          {testResult && (
            <div className={`p-3 rounded-lg border text-xs ${
              testResult.success
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}>
              <div className="flex items-center space-x-2 font-bold">
                {testResult.success ? (
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{testResult.message}</span>
              </div>
              {testResult.details && (
                <p className="mt-1 font-mono text-[11px] break-all">
                  {typeof testResult.details === 'string' ? testResult.details : JSON.stringify(testResult.details)}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
