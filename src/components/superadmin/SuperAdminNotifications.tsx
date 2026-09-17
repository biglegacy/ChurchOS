import React, { useState, useEffect } from 'react';
import {
  Bell,
  Send,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Radio,
  Users,
  Building2,
  Clock,
} from 'lucide-react';
import { ApiClient } from '../../api';
import { SystemNotification } from '../../types';

export const SuperAdminNotifications: React.FC = () => {
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState<'system' | 'billing' | 'sms_gateway' | 'feature'>('system');
  const [targetAudience, setTargetAudience] = useState<'all' | 'church_admins' | 'members'>('all');
  const [dispatching, setDispatching] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await ApiClient.get('/api/super-admin/notifications');
      setNotifications(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load system notifications.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const handleCreateNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      setError('Please provide a title and message.');
      return;
    }
    try {
      setDispatching(true);
      setError(null);
      const res = await ApiClient.post('/api/super-admin/notifications', {
        title: title.trim(),
        message: message.trim(),
        type,
        targetAudience,
      });
      setNotice(res.message);
      setTitle('');
      setMessage('');
      await loadNotifications();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDispatching(false);
    }
  };

  return (
    <div className="space-y-5 text-left">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-teal-950 flex items-center space-x-2">
            <Bell className="w-5 h-5 text-teal-700" />
            <span>Platform System Notification Center</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Broadcast platform-wide alerts, maintenance reminders, billing bulletins, and feature releases.
          </p>
        </div>

        <button
          onClick={loadNotifications}
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Composer Form */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs lg:col-span-1 space-y-4">
          <h3 className="font-bold text-sm text-teal-950 flex items-center space-x-2">
            <Send className="w-4 h-4 text-teal-700" />
            <span>Compose Announcement</span>
          </h3>

          <form onSubmit={handleCreateNotification} className="space-y-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Headline / Title *</label>
              <input
                type="text"
                required
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Scheduled Network Upgrade"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-700"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Message Content *</label>
              <textarea
                rows={3}
                required
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Details of the announcement..."
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-700 text-xs"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Category Type</label>
              <select
                value={type}
                onChange={e => setType(e.target.value as any)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-teal-700"
              >
                <option value="system">System Notice</option>
                <option value="billing">Billing & Subscriptions</option>
                <option value="sms_gateway">SMS Gateway Maintenance</option>
                <option value="feature">New Feature Release</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Target Audience</label>
              <select
                value={targetAudience}
                onChange={e => setTargetAudience(e.target.value as any)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-teal-700"
              >
                <option value="all">All Churches & Users</option>
                <option value="church_admins">Church Administrators Only</option>
                <option value="members">Church Members</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={dispatching}
              className="w-full py-2 bg-teal-800 hover:bg-teal-900 text-white rounded-lg font-semibold shadow-xs transition flex items-center justify-center space-x-1.5 disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{dispatching ? 'Broadcasting...' : 'Broadcast Notification'}</span>
            </button>
          </form>
        </div>

        {/* History Feed */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs lg:col-span-2 space-y-3">
          <h3 className="font-bold text-sm text-teal-950 flex items-center space-x-2">
            <Clock className="w-4 h-4 text-teal-700" />
            <span>Dispatched Platform Notifications ({notifications.length})</span>
          </h3>

          <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
            {notifications.map(n => (
              <div key={n.id} className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">{n.title}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    n.type === 'billing' ? 'bg-amber-100 text-amber-800' :
                    n.type === 'sms_gateway' ? 'bg-blue-100 text-blue-800' :
                    n.type === 'feature' ? 'bg-purple-100 text-purple-800' :
                    'bg-slate-200 text-slate-700'
                  }`}>
                    {n.type}
                  </span>
                </div>
                <p className="text-slate-600 leading-relaxed">{n.message}</p>
                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-200/60">
                  <span>Audience: <strong>{n.targetAudience}</strong></span>
                  <span>{new Date(n.createdAt).toLocaleDateString()} at {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
