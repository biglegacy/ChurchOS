import React, { useState, useEffect } from 'react';
import {
  Settings,
  Building,
  Radio,
  Clock,
  Save,
  CheckCircle,
  AlertCircle,
  MessageSquare,
} from 'lucide-react';
import { ApiClient } from '../api';
import { Church } from '../types';

interface Props {
  church?: Church | null;
  onUpdateChurch?: (c: Church) => void;
}

export const ChurchSettingsModule: React.FC<Props> = ({ church, onUpdateChurch }) => {
  const [formData, setFormData] = useState({
    name: church?.name || '',
    seniorPastor: church?.seniorPastor || '',
    address: church?.address || '',
    city: church?.city || '',
    region: church?.region || '',
    country: church?.country || 'Ghana',
    currency: church?.settings?.currency || 'GH₵',
    smsSenderId: church?.settings?.smsSenderId || 'CHURCH-OS',
    absenceSmsEnabled: church?.settings?.absenceSmsEnabled ?? true,
    absenceSmsDelayMinutes: church?.settings?.absenceSmsDelayMinutes || 45,
    absenceSmsTemplate:
      church?.settings?.absenceSmsTemplate ||
      'Beloved [Member Name], we missed your fellowship at [Church Name] today during [Service Name]. May the Lord bless and keep you this week.',
    titheSmsTemplate:
      church?.settings?.titheSmsTemplate ||
      'Dear [Member Name], your tithe of GH₵[Amount] has been recorded successfully. Thank you for your faithful giving. — [Church Name]',
    titheReminderEnabled: church?.settings?.titheReminderEnabled ?? true,
    titheReminderFrequency: church?.settings?.titheReminderFrequency || 'Monthly',
    titheReminderTemplate:
      church?.settings?.titheReminderTemplate ||
      'Greetings [Member Name] from [Church Name]. Honor the Lord with your tithes and offerings (Malachi 3:10). God bless you abundantly.',
  });

  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      const res = await ApiClient.put('/api/church/settings', {
        name: formData.name,
        seniorPastor: formData.seniorPastor,
        address: formData.address,
        city: formData.city,
        region: formData.region,
        country: formData.country,
        settings: {
          currency: formData.currency,
          smsSenderId: formData.smsSenderId.toUpperCase().slice(0, 11),
          absenceSmsEnabled: formData.absenceSmsEnabled,
          absenceSmsDelayMinutes: Number(formData.absenceSmsDelayMinutes),
          absenceSmsTemplate: formData.absenceSmsTemplate,
          titheSmsTemplate: formData.titheSmsTemplate,
          titheReminderEnabled: formData.titheReminderEnabled,
          titheReminderFrequency: formData.titheReminderFrequency,
          titheReminderTemplate: formData.titheReminderTemplate,
        },
      });

      setNotice('Church configuration and automated SMS templates saved.');
      if (onUpdateChurch && res.church) {
        onUpdateChurch(res.church);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5 pb-20 text-left max-w-3xl mx-auto">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-teal-950 flex items-center space-x-2">
            <Settings className="w-5 h-5 text-teal-700" />
            <span>Church Configuration & Automation Engine</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage your official SMS Sender ID, absence notification rules, and tithe receipt templates.
          </p>
        </div>
      </div>

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
            <AlertCircle className="w-4 h-4 text-rose-600" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="font-bold text-rose-700 hover:underline">
            Dismiss
          </button>
        </div>
      )}

      <form onSubmit={handleSaveSettings} className="space-y-5 text-xs">
        {/* Church Profile Card */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-teal-950 flex items-center space-x-2">
            <Building className="w-4 h-4 text-teal-700" />
            <span>Church Identity</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Church Name</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:border-teal-700"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Senior Pastor</label>
              <input
                type="text"
                required
                value={formData.seniorPastor}
                onChange={e => setFormData({ ...formData, seniorPastor: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:border-teal-700"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">City</label>
              <input
                type="text"
                value={formData.city}
                onChange={e => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:border-teal-700"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Region</label>
              <input
                type="text"
                value={formData.region}
                onChange={e => setFormData({ ...formData, region: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:border-teal-700"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Country</label>
              <input
                type="text"
                value={formData.country}
                onChange={e => setFormData({ ...formData, country: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:border-teal-700"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Currency Symbol</label>
              <input
                type="text"
                value={formData.currency}
                onChange={e => setFormData({ ...formData, currency: e.target.value })}
                placeholder="GH₵"
                className="w-full px-3 py-2 border border-slate-200 rounded-md font-bold text-slate-800 focus:outline-none focus:border-teal-700"
              />
            </div>
          </div>
        </div>

        {/* SMS Sender ID & Automated Absence Follow-Up */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-teal-950 flex items-center space-x-2">
            <Radio className="w-4 h-4 text-teal-700" />
            <span>SMS Sender ID & Absence Automation</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Approved SMS Sender ID (Max 11 alphanumeric characters)
              </label>
              <input
                type="text"
                maxLength={11}
                required
                value={formData.smsSenderId}
                onChange={e => setFormData({ ...formData, smsSenderId: e.target.value.toUpperCase() })}
                placeholder="GT-INTL"
                className="w-full px-3 py-2 border border-slate-200 rounded-md font-mono uppercase font-bold text-teal-800 tracking-wider focus:outline-none focus:border-teal-700"
              />
              <p className="text-[10px] text-slate-400 mt-1">Appears on members' mobile screens as SMS sender.</p>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Absence Follow-Up Delay (Minutes after service)
              </label>
              <input
                type="number"
                min="0"
                max="1440"
                value={formData.absenceSmsDelayMinutes}
                onChange={e => setFormData({ ...formData, absenceSmsDelayMinutes: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:border-teal-700"
              />
              <p className="text-[10px] text-slate-400 mt-1">Grace period before automated absence SMS is dispatched.</p>
            </div>
          </div>

          <div className="p-3 bg-teal-50/60 rounded-lg border border-teal-100 flex items-center justify-between">
            <div>
              <span className="font-bold text-teal-950">Enable Automated Absence SMS Follow-Up</span>
              <p className="text-[11px] text-teal-700">When attendance is finalized, automatically send follow-up to absent members.</p>
            </div>
            <input
              type="checkbox"
              checked={formData.absenceSmsEnabled}
              onChange={e => setFormData({ ...formData, absenceSmsEnabled: e.target.checked })}
              className="h-4 w-4 text-teal-700 rounded border-slate-300 focus:ring-teal-600"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Automated Absence SMS Template
            </label>
            <textarea
              rows={3}
              value={formData.absenceSmsTemplate}
              onChange={e => setFormData({ ...formData, absenceSmsTemplate: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-md font-sans focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-700"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Available tags: <span className="font-mono text-slate-600">[Member Name]</span>, <span className="font-mono text-slate-600">[Church Name]</span>, <span className="font-mono text-slate-600">[Service Name]</span>
            </p>
          </div>
        </div>

        {/* Tithe SMS Receipt & Reminder Configuration */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-teal-950 flex items-center space-x-2">
            <MessageSquare className="w-4 h-4 text-teal-700" />
            <span>Tithe & Giving SMS Automation</span>
          </h3>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Automatic Tithe Confirmation Template
            </label>
            <textarea
              rows={2}
              value={formData.titheSmsTemplate}
              onChange={e => setFormData({ ...formData, titheSmsTemplate: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:border-teal-700"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Available tags: <span className="font-mono text-slate-600">[Member Name]</span>, <span className="font-mono text-slate-600">[Amount]</span>, <span className="font-mono text-slate-600">[Church Name]</span>
            </p>
          </div>

          <div className="p-3 bg-emerald-50/60 rounded-lg border border-emerald-100 flex items-center justify-between">
            <div>
              <span className="font-bold text-emerald-950">Periodic Tithe Reminder Engine</span>
              <p className="text-[11px] text-emerald-700">Enables mass reminders for monthly/weekly tithe faithfulness.</p>
            </div>
            <input
              type="checkbox"
              checked={formData.titheReminderEnabled}
              onChange={e => setFormData({ ...formData, titheReminderEnabled: e.target.checked })}
              className="h-4 w-4 text-teal-700 rounded border-slate-300 focus:ring-teal-600"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Tithe Reminder Message Template
            </label>
            <textarea
              rows={2}
              value={formData.titheReminderTemplate}
              onChange={e => setFormData({ ...formData, titheReminderTemplate: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:border-teal-700"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 bg-teal-700 hover:bg-teal-800 text-white font-medium rounded-md shadow-xs flex items-center space-x-2 transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save Configuration'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
