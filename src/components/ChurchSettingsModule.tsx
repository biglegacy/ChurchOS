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
  Key,
  Eye,
  EyeOff,
  Send,
  ShieldCheck,
  CheckSquare,
  Square,
  Plus,
  Trash2,
  RefreshCw,
} from 'lucide-react';
import { ApiClient } from '../api';
import { Church } from '../types';

interface Props {
  church?: Church | null;
  onUpdateChurch?: (c: Church) => void;
}

const DEFAULT_CONTRIBUTION_TYPES = [
  'Tithe',
  'Offering',
  'Thanksgiving',
  'Donation',
  'Welfare',
  'Building Fund',
  'Missions',
  'Special Contributions',
];

export const ChurchSettingsModule: React.FC<Props> = ({ church, onUpdateChurch }) => {
  const [formData, setFormData] = useState({
    name: church?.name || '',
    seniorPastor: church?.seniorPastor || '',
    address: church?.address || '',
    city: church?.city || '',
    region: church?.region || '',
    country: church?.country || 'Ghana',
    currency: church?.settings?.currency || 'GH₵',

    // SMS Gateway & Authentication Settings (Requirement 4)
    smsGateway: church?.settings?.smsGateway || 'Arkesel',
    smsApiKey: church?.settings?.smsApiKey || '',
    smsSenderId: church?.settings?.smsSenderId || 'CHURCH-OS',
    smsEnabled: church?.settings?.smsEnabled ?? true,
    manualSmsEnabled: church?.settings?.manualSmsEnabled ?? true,
    autoContributionSms: church?.settings?.autoContributionSms ?? true,
    autoContributionSmsTypes: church?.settings?.autoContributionSmsTypes || [
      'Tithe',
      'Offering',
      'Thanksgiving',
      'Donation',
    ],

    // Automated Templates
    contributionSmsTemplate:
      church?.settings?.contributionSmsTemplate ||
      'Dear [Member Name], thank you for your [Contribution Type] of GH₵[Amount]. Ref: [Receipt Number]. God bless you abundantly!',
    absenceSmsEnabled: church?.settings?.absenceSmsEnabled ?? true,
    absenceSmsDelayMinutes: church?.settings?.absenceSmsDelayMinutes || 45,
    absenceSmsTemplate:
      church?.settings?.absenceSmsTemplate ||
      'Beloved [Member Name], we missed your fellowship today during [Service Name]. May the Lord bless and keep you this week.',
    titheReminderEnabled: church?.settings?.titheReminderEnabled ?? true,
    titheReminderFrequency: church?.settings?.titheReminderFrequency || 'Monthly',
    titheReminderTemplate:
      church?.settings?.titheReminderTemplate ||
      'Greetings [Member Name]. Honor the Lord with your tithes and offerings (Malachi 3:10). God bless you abundantly.',
  });

  const [customTypeInput, setCustomTypeInput] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Live Gateway Test Connection State (Requirement 4)
  const [testPhone, setTestPhone] = useState('');
  const [testingGateway, setTestingGateway] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    details?: any;
  } | null>(null);

  useEffect(() => {
    const fetchLatestSettings = async () => {
      try {
        setLoading(true);
        const data = await ApiClient.get('/api/church/settings');
        if (data) {
          setFormData(prev => ({
            ...prev,
            name: data.churchName || prev.name,
            seniorPastor: data.seniorPastor || prev.seniorPastor,
            address: data.address || prev.address,
            city: data.city || prev.city,
            region: data.region || prev.region,
            country: data.country || prev.country,
            currency: data.settings?.currency || prev.currency,
            smsGateway: data.settings?.smsGateway || prev.smsGateway,
            smsApiKey: data.settings?.smsApiKey || prev.smsApiKey,
            smsSenderId: data.settings?.smsSenderId || prev.smsSenderId,
            smsEnabled: data.settings?.smsEnabled ?? prev.smsEnabled,
            manualSmsEnabled: data.settings?.manualSmsEnabled ?? prev.manualSmsEnabled,
            autoContributionSms: data.settings?.autoContributionSms ?? prev.autoContributionSms,
            autoContributionSmsTypes:
              data.settings?.autoContributionSmsTypes || prev.autoContributionSmsTypes,
            contributionSmsTemplate:
              data.settings?.contributionSmsTemplate || prev.contributionSmsTemplate,
            absenceSmsEnabled: data.settings?.absenceSmsEnabled ?? prev.absenceSmsEnabled,
            absenceSmsDelayMinutes:
              data.settings?.absenceSmsDelayMinutes || prev.absenceSmsDelayMinutes,
            absenceSmsTemplate:
              data.settings?.absenceSmsTemplate || prev.absenceSmsTemplate,
            titheReminderEnabled:
              data.settings?.titheReminderEnabled ?? prev.titheReminderEnabled,
            titheReminderFrequency:
              data.settings?.titheReminderFrequency || prev.titheReminderFrequency,
            titheReminderTemplate:
              data.settings?.titheReminderTemplate || prev.titheReminderTemplate,
          }));
        }
      } catch {
        // Fall back to initial props
      } finally {
        setLoading(false);
      }
    };
    fetchLatestSettings();
  }, []);

  const toggleContributionType = (type: string) => {
    const current = [...formData.autoContributionSmsTypes];
    const exists = current.includes(type);
    const updated = exists ? current.filter(t => t !== type) : [...current, type];
    setFormData({ ...formData, autoContributionSmsTypes: updated });
  };

  const handleAddCustomType = () => {
    const trimmed = customTypeInput.trim();
    if (!trimmed) return;
    if (!formData.autoContributionSmsTypes.includes(trimmed)) {
      setFormData({
        ...formData,
        autoContributionSmsTypes: [...formData.autoContributionSmsTypes, trimmed],
      });
    }
    setCustomTypeInput('');
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      const res = await ApiClient.put('/api/church/settings', {
        basicInfo: {
          name: formData.name,
          seniorPastor: formData.seniorPastor,
          address: formData.address,
          city: formData.city,
          region: formData.region,
          country: formData.country,
        },
        settings: {
          currency: formData.currency,
          smsGateway: formData.smsGateway,
          smsApiKey: formData.smsApiKey.trim(),
          smsSenderId: formData.smsSenderId.toUpperCase().slice(0, 11),
          smsEnabled: formData.smsEnabled,
          manualSmsEnabled: formData.manualSmsEnabled,
          autoContributionSms: formData.autoContributionSms,
          autoContributionSmsTypes: formData.autoContributionSmsTypes,
          customGivingTypes: church?.settings?.customGivingTypes || [],
          customExpenseCategories: church?.settings?.customExpenseCategories || [],
          customDepartmentCategories: church?.settings?.customDepartmentCategories || [],
          customPastoralCategories: church?.settings?.customPastoralCategories || [],
          contributionSmsTemplate: formData.contributionSmsTemplate,
          absenceSmsEnabled: formData.absenceSmsEnabled,
          absenceSmsDelayMinutes: Number(formData.absenceSmsDelayMinutes),
          absenceSmsTemplate: formData.absenceSmsTemplate,
          titheReminderEnabled: formData.titheReminderEnabled,
          titheReminderFrequency: formData.titheReminderFrequency,
          titheReminderTemplate: formData.titheReminderTemplate,
        },
      });

      setNotice('Church configuration and SMS gateway settings updated successfully.');
      if (onUpdateChurch && res.church) {
        onUpdateChurch(res.church);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  // Test live SMS connection with configured gateway and sender ID
  const handleTestConnection = async () => {
    if (!testPhone.trim()) {
      setError('Please provide a valid test phone number (e.g. 0201234567, 0241234567, 0271234567 or +233XXXXXXXXX).');
      return;
    }

    try {
      setTestingGateway(true);
      setError(null);
      setTestResult(null);

      const res = await ApiClient.post('/api/church/sms/test-connection', {
        apiKey: formData.smsApiKey.trim(),
        senderId: formData.smsSenderId.trim(),
        testPhone: testPhone.trim(),
        gateway: formData.smsGateway,
      });

      setTestResult(res);
      if (res.success) {
        setNotice(res.message);
      } else {
        setError(res.message);
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Test connection dispatch failed.',
      });
      setError(err.message || 'Test connection dispatch failed.');
    } finally {
      setTestingGateway(false);
    }
  };

  return (
    <div className="space-y-5 pb-20 text-left max-w-4xl mx-auto">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-teal-950 flex items-center space-x-2">
            <Settings className="w-5 h-5 text-teal-700" />
            <span>Church Configuration & Central SMS Center</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure your SMS Gateway, Sender ID, automatic contribution receipts, and delivery automations.
          </p>
        </div>
        {loading && (
          <div className="flex items-center space-x-2 text-xs text-slate-400">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            <span>Loading...</span>
          </div>
        )}
      </div>

      {notice && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
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
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="font-bold text-rose-700 hover:underline">
            Dismiss
          </button>
        </div>
      )}

      <form onSubmit={handleSaveSettings} className="space-y-5 text-xs">
        {/* Church Identity Card */}
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
              <label className="block font-semibold text-slate-700 mb-1">Senior Pastor / Head Minister</label>
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

        {/* Central SMS Gateway Configuration Card (Requirement 4) */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-teal-950 flex items-center space-x-2">
              <Key className="w-4 h-4 text-teal-700" />
              <span>SMS Gateway & API Configuration</span>
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-200">
              Admin Only Access
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">SMS Gateway Provider</label>
              <select
                value={formData.smsGateway}
                onChange={e => setFormData({ ...formData, smsGateway: e.target.value as any })}
                className="w-full px-3 py-2 border border-slate-200 rounded-md bg-white focus:outline-none focus:border-teal-700"
              >
                <option value="Arkesel">Arkesel SMS Gateway (Ghana / Africa)</option>
                <option value="Hubtel">Hubtel SMS Gateway (Ghana)</option>
                <option value="Twilio">Twilio Global Gateway</option>
                <option value="Standard">Standard HTTP Gateway</option>
              </select>
              <p className="text-[10px] text-slate-400 mt-1">
                Select your preferred carrier route. Defaults to Arkesel for optimal Ghana delivery.
              </p>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Approved SMS Sender ID (Max 11 chars)
              </label>
              <input
                type="text"
                maxLength={11}
                required
                value={formData.smsSenderId}
                onChange={e => setFormData({ ...formData, smsSenderId: e.target.value.toUpperCase().slice(0, 11) })}
                placeholder="CHURCH-OS"
                className="w-full px-3 py-2 border border-slate-200 rounded-md font-mono uppercase font-bold text-teal-800 tracking-wider focus:outline-none focus:border-teal-700"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Displays on members' phones as the verified sender header.
              </p>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Gateway API Key
              </label>
              <div className="relative">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={formData.smsApiKey}
                  onChange={e => setFormData({ ...formData, smsApiKey: e.target.value })}
                  placeholder="Enter church API key (or leave empty to use platform pool)"
                  className="w-full pl-3 pr-8 py-2 border border-slate-200 rounded-md font-mono text-xs focus:outline-none focus:border-teal-700"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                  title={showApiKey ? 'Hide Key' : 'Show Key'}
                >
                  {showApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Stored securely on server. Never exposed to regular members.
              </p>
            </div>
          </div>

          {/* Master Toggles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-800">Master SMS Engine Switch</span>
                <p className="text-[11px] text-slate-500">Enable or disable all outgoing SMS broadcasts and alerts.</p>
              </div>
              <input
                type="checkbox"
                checked={formData.smsEnabled}
                onChange={e => setFormData({ ...formData, smsEnabled: e.target.checked })}
                className="h-4 w-4 text-teal-700 rounded border-slate-300 focus:ring-teal-600"
              />
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-800">Manual / Member SMS Broadcasts</span>
                <p className="text-[11px] text-slate-500">Allow administrators to select members and send ad-hoc SMS.</p>
              </div>
              <input
                type="checkbox"
                checked={formData.manualSmsEnabled}
                onChange={e => setFormData({ ...formData, manualSmsEnabled: e.target.checked })}
                className="h-4 w-4 text-teal-700 rounded border-slate-300 focus:ring-teal-600"
              />
            </div>
          </div>

          {/* Test SMS Connection Section (Requirement 4) */}
          <div className="p-4 bg-teal-50/50 rounded-xl border border-teal-200/70 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-teal-950 flex items-center space-x-1.5">
                <Radio className="w-3.5 h-3.5 text-teal-700" />
                <span>Test Live SMS Gateway Connection</span>
              </span>
              <span className="text-[11px] text-teal-700">Verifies live carrier credentials</span>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={testPhone}
                onChange={e => setTestPhone(e.target.value)}
                placeholder="Test phone (e.g. 0201234567, 0241234567, +233201234567)"
                className="flex-1 px-3 py-1.5 bg-white border border-teal-200 rounded-md font-mono text-xs focus:outline-none focus:border-teal-700"
              />
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testingGateway}
                className="px-4 py-1.5 bg-teal-800 hover:bg-teal-900 text-white font-medium rounded-md flex items-center justify-center space-x-1.5 transition-colors disabled:opacity-50 shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{testingGateway ? 'Testing Live Route...' : 'Send Live Test SMS'}</span>
              </button>
            </div>

            {testResult && (
              <div
                className={`p-3 rounded-lg text-xs flex items-start space-x-2 border ${
                  testResult.success
                    ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                    : 'bg-rose-50 text-rose-900 border-rose-200'
                }`}
              >
                {testResult.success ? (
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <p className="font-bold">{testResult.message}</p>
                  {testResult.details && (
                    <div className="mt-1 text-[11px] font-mono text-slate-600">
                      <span>Gateway: {testResult.details.gateway}</span> •{' '}
                      <span>Sender: {testResult.details.senderId}</span>
                      {testResult.details.balance !== undefined && (
                        <span> • Balance: {testResult.details.balance} credits</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Automatic Contribution SMS Configuration (Requirements 2 & 4) */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-teal-950 flex items-center space-x-2">
              <MessageSquare className="w-4 h-4 text-teal-700" />
              <span>Automatic SMS for Contributions</span>
            </h3>
            <div className="flex items-center space-x-2">
              <span className="text-[11px] font-medium text-slate-600">Enable Automated SMS</span>
              <input
                type="checkbox"
                checked={formData.autoContributionSms}
                onChange={e => setFormData({ ...formData, autoContributionSms: e.target.checked })}
                className="h-4 w-4 text-teal-700 rounded border-slate-300 focus:ring-teal-600"
              />
            </div>
          </div>

          <p className="text-xs text-slate-500">
            When a financial contribution is recorded, the system automatically sends a receipt SMS to the member.
            Select which contribution types trigger this automatic dispatch:
          </p>

          {/* Trigger Types Grid */}
          <div className="space-y-2">
            <label className="block font-semibold text-slate-700">
              Contribution Types That Trigger Automatic SMS:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {DEFAULT_CONTRIBUTION_TYPES.map(type => {
                const isSelected = formData.autoContributionSmsTypes.includes(type);
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => toggleContributionType(type)}
                    className={`flex items-center space-x-2 p-2.5 rounded-lg border text-left transition-all ${
                      isSelected
                        ? 'bg-teal-50 border-teal-300 text-teal-950 font-bold'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {isSelected ? (
                      <CheckSquare className="w-4 h-4 text-teal-700 shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400 shrink-0" />
                    )}
                    <span className="truncate">{type}</span>
                  </button>
                );
              })}
            </div>

            {/* Custom Types */}
            {formData.autoContributionSmsTypes.filter(t => !DEFAULT_CONTRIBUTION_TYPES.includes(t)).length > 0 && (
              <div className="pt-2">
                <span className="text-[11px] font-semibold text-slate-500">Custom Trigger Types:</span>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {formData.autoContributionSmsTypes
                    .filter(t => !DEFAULT_CONTRIBUTION_TYPES.includes(t))
                    .map(ct => (
                      <span
                        key={ct}
                        className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-teal-100 text-teal-900 text-xs font-medium"
                      >
                        <span>{ct}</span>
                        <button
                          type="button"
                          onClick={() => toggleContributionType(ct)}
                          className="text-teal-700 hover:text-teal-900 ml-1"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                </div>
              </div>
            )}

            {/* Add Custom Trigger Type */}
            <div className="flex items-center space-x-2 pt-1">
              <input
                type="text"
                value={customTypeInput}
                onChange={e => setCustomTypeInput(e.target.value)}
                placeholder="Add custom contribution type (e.g. Harvest, Youth Levy)..."
                className="flex-1 max-w-sm px-3 py-1.5 border border-slate-200 rounded-md focus:outline-none focus:border-teal-700 text-xs"
              />
              <button
                type="button"
                onClick={handleAddCustomType}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-medium text-xs flex items-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Type</span>
              </button>
            </div>
          </div>

          {/* Contribution Template */}
          <div className="pt-2">
            <label className="block font-semibold text-slate-700 mb-1">
              Automated Contribution Receipt Template
            </label>
            <textarea
              rows={3}
              value={formData.contributionSmsTemplate}
              onChange={e => setFormData({ ...formData, contributionSmsTemplate: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-md font-sans focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-700"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Available tags:{' '}
              <span className="font-mono text-slate-600">[Member Name]</span>,{' '}
              <span className="font-mono text-slate-600">[Contribution Type]</span>,{' '}
              <span className="font-mono text-slate-600">[Amount]</span>,{' '}
              <span className="font-mono text-slate-600">[Currency]</span>,{' '}
              <span className="font-mono text-slate-600">[Receipt Number]</span>,{' '}
              <span className="font-mono text-slate-600">[Date]</span>,{' '}
              <span className="font-mono text-slate-600">[Church Name]</span>
            </p>
          </div>
        </div>

        {/* Absence & Tithe Reminder Automations */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-teal-950 flex items-center space-x-2">
            <Clock className="w-4 h-4 text-teal-700" />
            <span>Absence Follow-Up & Reminder Schedules</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800">Absence SMS Follow-Up</span>
                <input
                  type="checkbox"
                  checked={formData.absenceSmsEnabled}
                  onChange={e => setFormData({ ...formData, absenceSmsEnabled: e.target.checked })}
                  className="h-4 w-4 text-teal-700 rounded border-slate-300 focus:ring-teal-600"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Delay (Minutes after service)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.absenceSmsDelayMinutes}
                  onChange={e => setFormData({ ...formData, absenceSmsDelayMinutes: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-md focus:outline-none focus:border-teal-700"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Absence Template</label>
                <textarea
                  rows={2}
                  value={formData.absenceSmsTemplate}
                  onChange={e => setFormData({ ...formData, absenceSmsTemplate: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-md text-xs focus:outline-none focus:border-teal-700"
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800">Giving Faithfulness Reminders</span>
                <input
                  type="checkbox"
                  checked={formData.titheReminderEnabled}
                  onChange={e => setFormData({ ...formData, titheReminderEnabled: e.target.checked })}
                  className="h-4 w-4 text-teal-700 rounded border-slate-300 focus:ring-teal-600"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Reminder Schedule</label>
                <select
                  value={formData.titheReminderFrequency}
                  onChange={e => setFormData({ ...formData, titheReminderFrequency: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-md bg-white focus:outline-none focus:border-teal-700"
                >
                  <option value="Weekly">Weekly (Every Saturday)</option>
                  <option value="Monthly">Monthly (Last Sunday of Month)</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Reminder Template</label>
                <textarea
                  rows={2}
                  value={formData.titheReminderTemplate}
                  onChange={e => setFormData({ ...formData, titheReminderTemplate: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-md text-xs focus:outline-none focus:border-teal-700"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-teal-700 hover:bg-teal-800 text-white font-medium rounded-lg shadow-xs flex items-center space-x-2 transition-colors disabled:opacity-50 text-xs"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving Church Configuration...' : 'Save Configuration & SMS Settings'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
