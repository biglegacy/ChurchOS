import React, { useState, useEffect } from 'react';
import {
  Megaphone,
  Plus,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Radio,
  Eye,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { ApiClient } from '../../api';
import { PopupMessage } from '../../types';
import { useAutoDismissNotification } from '../../utils/useAutoDismissNotification';

export const SuperAdminPopupMessages: React.FC = () => {
  const [popups, setPopups] = useState<PopupMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState<'info' | 'warning' | 'announcement' | 'maintenance'>('info');
  const [targetAudience, setTargetAudience] = useState<'all' | 'church_admins' | 'members'>('all');
  const [dismissible, setDismissible] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  useAutoDismissNotification(notice, setNotice, 2000);
  useAutoDismissNotification(error, setError, 2000);

  const loadPopups = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await ApiClient.get('/api/super-admin/popup-messages');
      setPopups(Array.isArray(res) ? res : []);
    } catch (err: any) {
      setError(err.message || 'Failed to load in-app popup broadcasts.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPopups();
  }, []);

  const handleToggleActive = async (id: string) => {
    try {
      const res = await ApiClient.put(`/api/super-admin/popup-messages/${id}/toggle`, {});
      setNotice(res.message);
      await loadPopups();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleCreatePopup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      setError('Please provide title and message content.');
      return;
    }
    try {
      setSaving(true);
      setError(null);
      const res = await ApiClient.post('/api/super-admin/popup-messages', {
        title: title.trim(),
        message: message.trim(),
        type,
        targetAudience,
        dismissible,
      });
      setNotice(res.message);
      setShowAddModal(false);
      setTitle('');
      setMessage('');
      await loadPopups();
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
            <Megaphone className="w-5 h-5 text-teal-700" />
            <span>In-App Modal Popup Broadcasts</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Create high-priority modal dialogues and advisory notices shown to users upon dashboard login.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={loadPopups}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-3.5 py-2 bg-teal-800 hover:bg-teal-900 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 shadow-xs transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Popup Alert</span>
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

      {/* Popups Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(popups || []).map(p => (
          <div
            key={p.id}
            className={`bg-white p-5 rounded-xl border shadow-xs space-y-3 transition ${
              p.isActive ? 'border-teal-300' : 'border-slate-200 opacity-75'
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                  p.type === 'warning' ? 'bg-amber-100 text-amber-800' :
                  p.type === 'maintenance' ? 'bg-rose-100 text-rose-800' :
                  p.type === 'announcement' ? 'bg-purple-100 text-purple-800' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  {p.type}
                </span>
                <h3 className="text-sm font-bold text-slate-900 mt-1.5">{p.title}</h3>
              </div>

              <button
                onClick={() => handleToggleActive(p.id)}
                className={`p-1 rounded-md text-xs font-semibold flex items-center space-x-1 ${
                  p.isActive ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100' : 'text-slate-500 bg-slate-100 hover:bg-slate-200'
                }`}
              >
                {p.isActive ? (
                  <>
                    <ToggleRight className="w-4 h-4 text-emerald-600" />
                    <span>Active</span>
                  </>
                ) : (
                  <>
                    <ToggleLeft className="w-4 h-4 text-slate-400" />
                    <span>Paused</span>
                  </>
                )}
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">
              {p.message}
            </p>

            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
              <span>Audience: <strong className="text-slate-600">{p.targetAudience}</strong></span>
              <span>{p.dismissible ? 'Dismissible by user' : 'Mandatory view'}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-md w-full p-5 shadow-2xl border border-slate-200 text-left space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900 flex items-center space-x-2">
                <Megaphone className="w-4 h-4 text-teal-700" />
                <span>Create In-App Modal Popup</span>
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600 text-sm">✕</button>
            </div>

            <form onSubmit={handleCreatePopup} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Headline *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Important Telco Regulatory Advisory"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-700"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Message Body *</label>
                <textarea
                  rows={3}
                  required
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Write message shown in the popup dialogue..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-700 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Type</label>
                  <select
                    value={type}
                    onChange={e => setType(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-teal-700"
                  >
                    <option value="info">Info / Tip</option>
                    <option value="announcement">Announcement</option>
                    <option value="warning">Warning / Action Required</option>
                    <option value="maintenance">Scheduled Maintenance</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Target Audience</label>
                  <select
                    value={targetAudience}
                    onChange={e => setTargetAudience(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-teal-700"
                  >
                    <option value="all">All Users</option>
                    <option value="church_admins">Church Admins Only</option>
                    <option value="members">Members Only</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="dismissibleCheck"
                  checked={dismissible}
                  onChange={e => setDismissible(e.target.checked)}
                  className="rounded text-teal-700 focus:ring-teal-700"
                />
                <label htmlFor="dismissibleCheck" className="font-semibold text-slate-700">
                  User can click 'Dismiss' / close dialogue
                </label>
              </div>

              <div className="flex justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-1.5 bg-teal-800 hover:bg-teal-900 text-white rounded-lg font-semibold shadow-xs disabled:opacity-50"
                >
                  {saving ? 'Creating...' : 'Deploy Popup'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
