import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Send,
  Radio,
  Users,
  CheckCircle,
  AlertTriangle,
  Clock,
  Sparkles,
  BellRing,
  RefreshCw,
} from 'lucide-react';
import { ApiClient } from '../api';
import { DepartmentOrGroup, Church } from '../types';

interface Props {
  church?: Church | null;
}

export const SmsModule: React.FC<Props> = ({ church }) => {
  const [departments, setDepartments] = useState<DepartmentOrGroup[]>([]);
  const [smsLogs, setSmsLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Compose state
  const [targetType, setTargetType] = useState<'ALL_ACTIVE_MEMBERS' | 'DEPARTMENT' | 'VISITORS' | 'CUSTOM'>('ALL_ACTIVE_MEMBERS');
  const [selectedDepartmentId, setSelectedDepartmentId] = useState('');
  const [customPhones, setCustomPhones] = useState('');
  const [messageText, setMessageText] = useState(
    'Beloved [Member Name], reminder for tomorrow\'s powerful prophetic service at 8:30am. Come expectant! — [Church Name]'
  );

  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<any | null>(null);
  const [dispatchingReminders, setDispatchingReminders] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [dRes, lRes] = await Promise.all([
        ApiClient.get('/api/church/departments'),
        ApiClient.get('/api/church/communication/sms-logs'),
      ]);
      setDepartments(dRes);
      setSmsLogs(lRes);
      if (dRes.length > 0 && !selectedDepartmentId) {
        setSelectedDepartmentId(dRes[0].id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load SMS center.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSendSms = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim()) {
      setError('Please enter SMS message body.');
      return;
    }

    try {
      setSending(true);
      setError(null);
      setSendResult(null);

      const payload: any = {
        targetType,
        message: messageText,
      };

      if (targetType === 'DEPARTMENT') {
        payload.targetDepartmentId = selectedDepartmentId;
      } else if (targetType === 'CUSTOM') {
        payload.customNumbers = customPhones.split(/[\n,]+/).map(p => p.trim()).filter(Boolean);
      }

      const res = await ApiClient.post('/api/church/communication/send-sms', payload);
      setSendResult(res);
      setNotice(res.message);
      await loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  const handleDispatchTitheReminders = async () => {
    if (!confirm('Send Tithe & Giving reminders to all active church members?')) return;
    try {
      setDispatchingReminders(true);
      setError(null);
      const res = await ApiClient.post('/api/church/communication/tithe-reminder');
      setNotice(res.message);
      await loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDispatchingReminders(false);
    }
  };

  const charCount = messageText.length;
  const segments = Math.ceil(charCount / 160) || 1;
  const senderId = church?.settings?.smsSenderId || 'CHURCH-OS';
  const smsEnabled = church?.features?.sms ?? true;

  return (
    <div className="space-y-5 pb-20 text-left">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-teal-950 flex items-center space-x-2">
            <MessageSquare className="w-5 h-5 text-teal-700" />
            <span>SMS Communications Center</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Sender ID: <strong className="text-teal-800 font-bold">{senderId}</strong> • Direct Ghana Telecom Carrier Gateway
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleDispatchTitheReminders}
            disabled={dispatchingReminders || !smsEnabled}
            className="px-3 py-2 bg-teal-50 hover:bg-teal-100 text-teal-800 font-medium text-xs rounded-md flex items-center space-x-1.5 transition-colors disabled:opacity-50"
          >
            <BellRing className="w-3.5 h-3.5" />
            <span>{dispatchingReminders ? 'Sending Reminders...' : 'Send Tithe Reminders'}</span>
          </button>
        </div>
      </div>

      {!smsEnabled && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-xs">
          <strong>SMS Module Notice:</strong> SMS dispatch is currently disabled for your church by Super Admin policy. Please contact platform support to enable SMS credits.
        </div>
      )}

      {notice && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span>{notice}</span>
          </div>
          <button onClick={() => setNotice(null)} className="font-bold text-emerald-700 hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="font-bold text-rose-700 hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Message Composer Card */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-teal-950 flex items-center space-x-2">
          <Radio className="w-4 h-4 text-teal-700" />
          <span>Compose & Broadcast Message</span>
        </h3>

        <form onSubmit={handleSendSms} className="space-y-4 text-xs">
          {/* Target audience selection */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">Target Audience</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setTargetType('ALL_ACTIVE_MEMBERS')}
                className={`py-2 px-3 rounded-md font-medium border transition-colors text-center ${
                  targetType === 'ALL_ACTIVE_MEMBERS'
                    ? 'bg-teal-800 text-white border-teal-800'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                All Active Members
              </button>

              <button
                type="button"
                onClick={() => setTargetType('DEPARTMENT')}
                className={`py-2 px-3 rounded-md font-medium border transition-colors text-center ${
                  targetType === 'DEPARTMENT'
                    ? 'bg-teal-800 text-white border-teal-800'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                By Department / Unit
              </button>

              <button
                type="button"
                onClick={() => setTargetType('VISITORS')}
                className={`py-2 px-3 rounded-md font-medium border transition-colors text-center ${
                  targetType === 'VISITORS'
                    ? 'bg-teal-800 text-white border-teal-800'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                First-Time Guests
              </button>

              <button
                type="button"
                onClick={() => setTargetType('CUSTOM')}
                className={`py-2 px-3 rounded-md font-medium border transition-colors text-center ${
                  targetType === 'CUSTOM'
                    ? 'bg-teal-800 text-white border-teal-800'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Custom Phone List
              </button>
            </div>
          </div>

          {targetType === 'DEPARTMENT' && (
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Select Department</label>
              <select
                value={selectedDepartmentId}
                onChange={e => setSelectedDepartmentId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-md bg-white focus:outline-none focus:border-teal-700"
              >
                {departments.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.category})
                  </option>
                ))}
              </select>
            </div>
          )}

          {targetType === 'CUSTOM' && (
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Enter Phone Numbers (comma or line separated)
              </label>
              <textarea
                rows={2}
                value={customPhones}
                onChange={e => setCustomPhones(e.target.value)}
                placeholder="0241234567, 0549876543, 0200001122"
                className="w-full px-3 py-2 border border-slate-200 rounded-md font-mono focus:outline-none focus:border-teal-700"
              />
            </div>
          )}

          {/* Message Textarea */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-semibold text-slate-700">Message Content</label>
              <div className="flex items-center space-x-2 text-[11px] text-slate-400">
                <span>{charCount} characters</span>
                <span>•</span>
                <span className="font-bold text-teal-800">{segments} SMS segment{segments > 1 ? 's' : ''}</span>
              </div>
            </div>
            <textarea
              rows={3}
              required
              value={messageText}
              onChange={e => setMessageText(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-700"
            />
            {/* Tag Helpers */}
            <div className="flex items-center space-x-2 mt-1.5 text-[11px] text-slate-500">
              <span>Insert Tags:</span>
              <button
                type="button"
                onClick={() => setMessageText(prev => prev + ' [Member Name]')}
                className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 font-mono text-slate-700 text-xs"
              >
                [Member Name]
              </button>
              <button
                type="button"
                onClick={() => setMessageText(prev => prev + ' [Church Name]')}
                className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 font-mono text-slate-700 text-xs"
              >
                [Church Name]
              </button>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={sending || !smsEnabled}
              className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white font-medium rounded-md shadow-xs flex items-center space-x-2 transition-colors disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{sending ? 'Dispatching Broadcast...' : 'Send Broadcast SMS'}</span>
            </button>
          </div>
        </form>

        {sendResult && (
          <div className="p-3 bg-teal-50 border border-teal-200 rounded-lg text-xs text-teal-900">
            <strong>Dispatch Report:</strong> Dispatched: {sendResult.dispatchedCount} • Errors: {sendResult.errorCount}
          </div>
        )}
      </div>

      {/* SMS Delivery History Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between text-xs">
          <span className="font-bold text-teal-950">SMS Outbox & Delivery Log ({smsLogs.length})</span>
          <button
            onClick={loadData}
            className="p-1 text-slate-400 hover:text-slate-700 rounded-md transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto max-h-96">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-500 text-[10px] uppercase font-semibold">
                <th className="py-2.5 px-4">Recipient</th>
                <th className="py-2.5 px-4">Phone</th>
                <th className="py-2.5 px-4">Type</th>
                <th className="py-2.5 px-4">Message Snippet</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {smsLogs.map(log => (
                <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-2.5 px-4 font-medium text-slate-800">{log.recipientName}</td>
                  <td className="py-2.5 px-4 font-mono text-slate-600 text-[11px]">{log.normalizedPhone}</td>
                  <td className="py-2.5 px-4 text-slate-500 text-[11px]">{log.notificationType}</td>
                  <td className="py-2.5 px-4 text-slate-600 truncate max-w-xs">{log.message}</td>
                  <td className="py-2.5 px-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      log.status === 'Delivered' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                      log.status === 'Accepted' ? 'bg-teal-50 text-teal-700 border border-teal-200' :
                      'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}>
                      {log.status}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-slate-400 text-[11px]">
                    {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
