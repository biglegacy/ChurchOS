import React, { useState, useEffect, useMemo } from 'react';
import {
  MessageSquare,
  Send,
  Radio,
  Users,
  CheckCircle,
  AlertTriangle,
  Clock,
  BellRing,
  RefreshCw,
  Search,
  CheckSquare,
  Square,
  UserCheck,
  UserX,
  X,
  Filter,
  Calendar,
  ShieldCheck,
  AlertCircle,
  Phone,
  Receipt,
  FileText,
  ChevronRight,
  Info,
  Sparkles,
} from 'lucide-react';
import { ApiClient } from '../api';
import { DepartmentOrGroup, Church, Member, SmsMessage } from '../types';

interface Props {
  church?: Church | null;
  onNavigateTab?: (tab: string) => void;
}

// Client-side phone validator for Ghanaian & international formats
function validatePhoneNumber(phone: string | undefined | null): {
  isValid: boolean;
  formatted: string;
  reason?: string;
} {
  if (!phone || !phone.trim()) {
    return { isValid: false, formatted: '', reason: 'No phone number provided' };
  }
  const cleaned = phone.replace(/[\s\-\(\)\.]/g, '').trim();
  if (cleaned.startsWith('0') && /^\d{10}$/.test(cleaned)) {
    return { isValid: true, formatted: `+233${cleaned.slice(1)}` };
  }
  if (cleaned.startsWith('+233') && /^\+233\d{9}$/.test(cleaned)) {
    return { isValid: true, formatted: cleaned };
  }
  if (cleaned.startsWith('233') && /^233\d{9}$/.test(cleaned)) {
    return { isValid: true, formatted: `+${cleaned}` };
  }
  if (cleaned.startsWith('+') && cleaned.length >= 10 && cleaned.length <= 16 && /^\+\d+$/.test(cleaned)) {
    return { isValid: true, formatted: cleaned };
  }
  return { isValid: false, formatted: cleaned, reason: 'Invalid mobile number format' };
}

export const SmsModule: React.FC<Props> = ({ church, onNavigateTab }) => {
  const [departments, setDepartments] = useState<DepartmentOrGroup[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [smsLogs, setSmsLogs] = useState<SmsMessage[]>([]);
  const [loading, setLoading] = useState(true);

  // Target audience selection
  const [targetType, setTargetType] = useState<
    'SELECTED_MEMBERS' | 'ALL_ACTIVE_MEMBERS' | 'PARENTS' | 'TEACHERS' | 'STAFF' | 'DEPARTMENT' | 'VISITORS' | 'CUSTOM'
  >('SELECTED_MEMBERS');

  // Selected Members Management
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [memberStatusFilter, setMemberStatusFilter] = useState<'ALL' | 'Active' | 'Inactive'>('ALL');
  const [selectedDepartmentId, setSelectedDepartmentId] = useState('');
  const [customPhones, setCustomPhones] = useState('');

  // Message body
  const [messageText, setMessageText] = useState(
    "Beloved [Member Name], grace and peace to you from [Church Name]. Reminder for this week's service at 8:30am. Come expectant!"
  );

  // Dispatch state & confirmation
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<any | null>(null);
  const [dispatchingReminders, setDispatchingReminders] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // SMS History Search & Filters
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [historyStatusFilter, setHistoryStatusFilter] = useState<string>('ALL');
  const [historyDateFilter, setHistoryDateFilter] = useState<'ALL' | 'TODAY' | 'THIS_WEEK' | 'THIS_MONTH'>('ALL');
  const [selectedLogDetail, setSelectedLogDetail] = useState<SmsMessage | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [dRes, mRes, lRes] = await Promise.all([
        ApiClient.get('/api/church/departments').catch(() => []),
        ApiClient.get('/api/church/members').catch(() => []),
        ApiClient.get('/api/church/communication/sms-logs').catch(() => []),
      ]);
      setDepartments(Array.isArray(dRes) ? dRes : []);
      setMembers(Array.isArray(mRes) ? mRes : []);
      setSmsLogs(Array.isArray(lRes) ? lRes : []);
      if (Array.isArray(dRes) && dRes.length > 0 && !selectedDepartmentId) {
        setSelectedDepartmentId(dRes[0].id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load SMS communications center.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered members for the selection table
  const filteredMembers = useMemo(() => {
    return members.filter(m => {
      const matchesStatus =
        memberStatusFilter === 'ALL' || m.membershipStatus === memberStatusFilter;
      const q = memberSearchQuery.toLowerCase().trim();
      const matchesQuery =
        !q ||
        m.fullName.toLowerCase().includes(q) ||
        (m.phone && m.phone.toLowerCase().includes(q)) ||
        (m.memberCode && m.memberCode.toLowerCase().includes(q));
      return matchesStatus && matchesQuery;
    });
  }, [members, memberSearchQuery, memberStatusFilter]);

  // Map of selected members objects
  const selectedMembersList = useMemo(() => {
    return members.filter(m => selectedMemberIds.includes(m.id));
  }, [members, selectedMemberIds]);

  // Validation breakdown for selected members
  const selectedStats = useMemo(() => {
    let validCount = 0;
    let invalidCount = 0;
    selectedMembersList.forEach(m => {
      const v = validatePhoneNumber(m.phone);
      if (v.isValid) validCount++;
      else invalidCount++;
    });
    return {
      total: selectedMembersList.length,
      valid: validCount,
      invalid: invalidCount,
    };
  }, [selectedMembersList]);

  // Selection handlers
  const handleToggleMember = (id: string) => {
    setSelectedMemberIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllFiltered = () => {
    const filteredIds = filteredMembers.map(m => m.id);
    setSelectedMemberIds(prev => {
      const combined = new Set([...prev, ...filteredIds]);
      return Array.from(combined);
    });
  };

  const handleDeselectAll = () => {
    setSelectedMemberIds([]);
  };

  const handleRemoveSelectedChip = (id: string) => {
    setSelectedMemberIds(prev => prev.filter(item => item !== id));
  };

  // Pre-dispatch validation before opening modal
  const handleOpenConfirmation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim()) {
      setError('Please enter SMS message body.');
      return;
    }

    if (targetType === 'SELECTED_MEMBERS' && selectedMemberIds.length === 0) {
      setError('Please select at least one member to send SMS to.');
      return;
    }

    if (targetType === 'CUSTOM' && !customPhones.trim()) {
      setError('Please enter at least one recipient phone number.');
      return;
    }

    setError(null);
    setIsConfirmModalOpen(true);
  };

  // Actual SMS Dispatch Execution
  const executeSendSms = async () => {
    try {
      setSending(true);
      setError(null);
      setSendResult(null);

      // Generate client batch ID to prevent duplicate accidental sends
      const clientBatchId = `batch_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

      const payload: any = {
        recipientType: targetType === 'ALL_ACTIVE_MEMBERS' ? 'ACTIVE_MEMBERS' : targetType,
        message: messageText.trim(),
        clientBatchId,
      };

      if (targetType === 'SELECTED_MEMBERS') {
        payload.memberIds = selectedMemberIds;
      } else if (targetType === 'DEPARTMENT') {
        payload.departmentId = selectedDepartmentId;
      } else if (targetType === 'CUSTOM') {
        payload.customNumbers = customPhones;
      }

      const res = await ApiClient.post('/api/church/sms/send', payload);
      setSendResult(res);
      setNotice(res.message || 'SMS broadcast dispatched successfully.');
      setIsConfirmModalOpen(false);

      // Refresh outbox history
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to dispatch SMS.');
      setIsConfirmModalOpen(false);
    } finally {
      setSending(false);
    }
  };

  // Tithe Reminder Dispatch
  const handleDispatchTitheReminders = async () => {
    if (!confirm('Send automated Tithe & Giving reminders to all active church members?')) return;
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

  // Filtered SMS History Logs
  const filteredSmsLogs = useMemo(() => {
    return smsLogs.filter(log => {
      // Recipient search
      const q = historySearchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (log.recipientName && log.recipientName.toLowerCase().includes(q)) ||
        (log.phone && log.phone.includes(q)) ||
        (log.message && log.message.toLowerCase().includes(q)) ||
        (log.relatedReceiptNumber && log.relatedReceiptNumber.toLowerCase().includes(q));

      // Status filter
      let matchesStatus = true;
      if (historyStatusFilter === 'DELIVERED') {
        matchesStatus = log.status === 'Delivered' || log.status === 'Accepted';
      } else if (historyStatusFilter === 'UNABLE_TO_SEND') {
        matchesStatus = log.status === 'Unable to Send';
      } else if (historyStatusFilter === 'FAILED') {
        matchesStatus = log.status === 'Failed';
      }

      // Date filter
      let matchesDate = true;
      if (historyDateFilter !== 'ALL' && log.createdAt) {
        const logDate = new Date(log.createdAt);
        const now = new Date();
        if (historyDateFilter === 'TODAY') {
          matchesDate = logDate.toDateString() === now.toDateString();
        } else if (historyDateFilter === 'THIS_WEEK') {
          const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          matchesDate = logDate >= sevenDaysAgo;
        } else if (historyDateFilter === 'THIS_MONTH') {
          matchesDate =
            logDate.getMonth() === now.getMonth() && logDate.getFullYear() === now.getFullYear();
        }
      }

      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [smsLogs, historySearchQuery, historyStatusFilter, historyDateFilter]);

  const charCount = messageText.length;
  const segments = Math.ceil(charCount / 160) || 1;
  const churchName = church?.name || 'Registered Church';
  const autoSenderId = (
    church?.settings?.smsSenderId ||
    church?.settings?.senderName ||
    church?.name?.replace(/[^a-zA-Z0-9]/g, '').slice(0, 11) ||
    'CHURCH'
  ).toUpperCase();
  const configuredGateway = church?.settings?.smsGateway || 'Arkesel';
  const smsEnabled = church?.features?.sms ?? true;

  return (
    <div className="space-y-6 pb-20 text-left">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-base font-bold text-teal-950 flex items-center space-x-2">
              <MessageSquare className="w-5 h-5 text-teal-700" />
              <span>SMS Communications Center</span>
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-900 border border-teal-200">
              Gateway: {configuredGateway}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Sender ID: <strong className="text-teal-900 font-mono font-bold">{autoSenderId}</strong> • Church: <strong className="text-slate-800">{churchName}</strong>
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleDispatchTitheReminders}
            disabled={dispatchingReminders || !smsEnabled}
            className="px-3.5 py-2 bg-teal-50 hover:bg-teal-100 text-teal-800 font-medium text-xs rounded-lg border border-teal-200 flex items-center space-x-1.5 transition-colors disabled:opacity-50"
          >
            <BellRing className="w-3.5 h-3.5 text-teal-700" />
            <span>{dispatchingReminders ? 'Sending...' : 'Send Tithe Reminders'}</span>
          </button>
          <button
            onClick={loadData}
            title="Refresh SMS Records"
            className="p-2 text-slate-500 hover:text-teal-800 hover:bg-slate-50 rounded-lg border border-slate-200 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-teal-700' : ''}`} />
          </button>
        </div>
      </div>

      {!smsEnabled && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-start space-x-3">
          <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <strong className="font-semibold">SMS Feature Disabled:</strong> SMS dispatch is currently disabled for this church account. You can configure credentials in Church Settings or request Super Admin activation.
          </div>
        </div>
      )}

      {notice && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs rounded-xl flex items-center justify-between">
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
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-900 text-xs rounded-xl flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="font-bold text-rose-700 hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Main SMS Broadcast & Selection Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <h3 className="text-sm font-bold text-teal-950 flex items-center space-x-2">
            <Radio className="w-4 h-4 text-teal-700" />
            <span>Compose & Dispatch SMS</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Select specific members or broadcast groups, review recipient eligibility, and confirm delivery.
          </p>
        </div>

        <form onSubmit={handleOpenConfirmation} className="p-5 space-y-5 text-xs">
          {/* Target Audience Mode Selector */}
          <div className="space-y-2">
            <label className="block font-semibold text-slate-700">Target Audience</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2">
              <button
                type="button"
                onClick={() => setTargetType('SELECTED_MEMBERS')}
                className={`py-2 px-2 rounded-lg font-medium border transition-all text-center text-[11px] flex items-center justify-center space-x-1.5 ${
                  targetType === 'SELECTED_MEMBERS'
                    ? 'bg-teal-700 text-white border-teal-700 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Selected Members</span>
              </button>

              <button
                type="button"
                onClick={() => setTargetType('ALL_ACTIVE_MEMBERS')}
                className={`py-2 px-2 rounded-lg font-medium border transition-all text-center text-[11px] ${
                  targetType === 'ALL_ACTIVE_MEMBERS'
                    ? 'bg-teal-700 text-white border-teal-700 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                All Active ({members.filter(m => m.membershipStatus === 'Active').length})
              </button>

              <button
                type="button"
                onClick={() => setTargetType('PARENTS')}
                className={`py-2 px-2 rounded-lg font-medium border transition-all text-center text-[11px] ${
                  targetType === 'PARENTS'
                    ? 'bg-teal-700 text-white border-teal-700 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Parents
              </button>

              <button
                type="button"
                onClick={() => setTargetType('TEACHERS')}
                className={`py-2 px-2 rounded-lg font-medium border transition-all text-center text-[11px] ${
                  targetType === 'TEACHERS'
                    ? 'bg-teal-700 text-white border-teal-700 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Teachers
              </button>

              <button
                type="button"
                onClick={() => setTargetType('STAFF')}
                className={`py-2 px-2 rounded-lg font-medium border transition-all text-center text-[11px] ${
                  targetType === 'STAFF'
                    ? 'bg-teal-700 text-white border-teal-700 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Staff / Workers
              </button>

              <button
                type="button"
                onClick={() => setTargetType('DEPARTMENT')}
                className={`py-2 px-2 rounded-lg font-medium border transition-all text-center text-[11px] ${
                  targetType === 'DEPARTMENT'
                    ? 'bg-teal-700 text-white border-teal-700 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Departments
              </button>

              <button
                type="button"
                onClick={() => setTargetType('VISITORS')}
                className={`py-2 px-2 rounded-lg font-medium border transition-all text-center text-[11px] ${
                  targetType === 'VISITORS'
                    ? 'bg-teal-700 text-white border-teal-700 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Visitors
              </button>

              <button
                type="button"
                onClick={() => setTargetType('CUSTOM')}
                className={`py-2 px-2 rounded-lg font-medium border transition-all text-center text-[11px] ${
                  targetType === 'CUSTOM'
                    ? 'bg-teal-700 text-white border-teal-700 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Custom Numbers
              </button>
            </div>
          </div>

          {/* =============================================================== */}
          {/* REQUIREMENT 1: MEMBER SELECTION INTERFACE                       */}
          {/* =============================================================== */}
          {targetType === 'SELECTED_MEMBERS' && (
            <div className="space-y-3 pt-1">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-slate-800">Select Specific Members</span>
                  <span className="px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 font-bold text-[11px]">
                    {selectedMemberIds.length} Selected
                  </span>
                  {selectedStats.invalid > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-medium text-[11px]">
                      {selectedStats.invalid} No/Invalid Phone
                    </span>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={handleSelectAllFiltered}
                    disabled={filteredMembers.length === 0}
                    className="px-2.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded text-xs font-medium transition-colors disabled:opacity-50"
                  >
                    Select All Filtered ({filteredMembers.length})
                  </button>
                  <button
                    type="button"
                    onClick={handleDeselectAll}
                    disabled={selectedMemberIds.length === 0}
                    className="px-2.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-rose-700 rounded text-xs font-medium transition-colors disabled:opacity-50"
                  >
                    Deselect All
                  </button>
                </div>
              </div>

              {/* Search and Filter Toolbar */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="relative sm:col-span-2">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={memberSearchQuery}
                    onChange={e => setMemberSearchQuery(e.target.value)}
                    placeholder="Search members by name, phone number, or ID..."
                    className="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-teal-700"
                  />
                  {memberSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setMemberSearchQuery('')}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div>
                  <select
                    value={memberStatusFilter}
                    onChange={e => setMemberStatusFilter(e.target.value as any)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-teal-700"
                  >
                    <option value="ALL">All Membership Statuses</option>
                    <option value="Active">Active Members Only</option>
                    <option value="Inactive">Inactive Members Only</option>
                  </select>
                </div>
              </div>

              {/* Member Selection Table / Empty State */}
              {members.length === 0 ? (
                // REQUIREMENT 5: Professional Empty State when no members exist
                <div className="p-8 text-center bg-slate-50/70 rounded-xl border border-slate-200 space-y-3">
                  <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                    <UserX className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">No members registered yet</h4>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                      No members registered yet. Add members to start sending SMS.
                    </p>
                  </div>
                  {onNavigateTab && (
                    <button
                      type="button"
                      onClick={() => onNavigateTab('members')}
                      className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-medium transition-colors"
                    >
                      Go to Members Directory
                    </button>
                  )}
                </div>
              ) : filteredMembers.length === 0 ? (
                <div className="p-6 text-center bg-slate-50 rounded-lg border border-slate-200 text-slate-500">
                  <p>No members match &quot;{memberSearchQuery}&quot;.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setMemberSearchQuery('');
                      setMemberStatusFilter('ALL');
                    }}
                    className="mt-2 text-teal-700 hover:underline font-medium"
                  >
                    Clear Search Filter
                  </button>
                </div>
              ) : (
                <div className="border border-slate-200 rounded-lg overflow-hidden max-h-60 overflow-y-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-slate-50 text-slate-600 text-[11px] font-semibold uppercase sticky top-0 border-b border-slate-200 z-10">
                      <tr>
                        <th className="py-2.5 px-3 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={
                              filteredMembers.length > 0 &&
                              filteredMembers.every(m => selectedMemberIds.includes(m.id))
                            }
                            onChange={e => {
                              if (e.target.checked) handleSelectAllFiltered();
                              else handleDeselectAll();
                            }}
                            className="h-3.5 w-3.5 text-teal-700 rounded border-slate-300 focus:ring-teal-600"
                          />
                        </th>
                        <th className="py-2.5 px-3">Member Name</th>
                        <th className="py-2.5 px-3">Phone Number</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3">Phone Validity</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredMembers.map(member => {
                        const isSelected = selectedMemberIds.includes(member.id);
                        const phoneValidation = validatePhoneNumber(member.phone);
                        return (
                          <tr
                            key={member.id}
                            onClick={() => handleToggleMember(member.id)}
                            className={`cursor-pointer transition-colors ${
                              isSelected ? 'bg-teal-50/70 hover:bg-teal-50' : 'hover:bg-slate-50'
                            }`}
                          >
                            <td className="py-2 px-3 text-center" onClick={e => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleMember(member.id)}
                                className="h-3.5 w-3.5 text-teal-700 rounded border-slate-300 focus:ring-teal-600"
                              />
                            </td>
                            <td className="py-2 px-3">
                              <span className="font-semibold text-slate-800">{member.fullName}</span>
                              <span className="text-[10px] text-slate-400 block font-mono">
                                {member.memberCode}
                              </span>
                            </td>
                            <td className="py-2 px-3 font-mono text-slate-700 text-[11px]">
                              {member.phone || <span className="text-slate-400 italic">None</span>}
                            </td>
                            <td className="py-2 px-3">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                  member.membershipStatus === 'Active'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {member.membershipStatus}
                              </span>
                            </td>
                            <td className="py-2 px-3">
                              {phoneValidation.isValid ? (
                                <span className="inline-flex items-center space-x-1 text-emerald-700 font-medium text-[11px]">
                                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>Valid Mobile</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center space-x-1 text-amber-700 font-medium text-[11px]">
                                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                                  <span>No Valid Phone</span>
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Display Selected Members Summary Chips */}
              {selectedMembersList.length > 0 && (
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-700">
                      Recipients ({selectedMembersList.length} members):
                    </span>
                    <button
                      type="button"
                      onClick={handleDeselectAll}
                      className="text-[11px] text-slate-400 hover:text-slate-600 underline"
                    >
                      Clear All
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                    {selectedMembersList.map(m => {
                      const v = validatePhoneNumber(m.phone);
                      return (
                        <span
                          key={m.id}
                          className={`inline-flex items-center space-x-1 pl-2 pr-1 py-1 rounded-full text-[11px] font-medium border ${
                            v.isValid
                              ? 'bg-teal-50 text-teal-900 border-teal-200'
                              : 'bg-amber-50 text-amber-900 border-amber-200'
                          }`}
                        >
                          <span>{m.fullName}</span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            ({m.phone || 'No #'})
                          </span>
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              handleRemoveSelectedChip(m.id);
                            }}
                            className="p-0.5 text-slate-400 hover:text-slate-700 rounded-full ml-1"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      );
                    })}
                  </div>

                  {selectedStats.invalid > 0 && (
                    <p className="text-[11px] text-amber-800 flex items-center space-x-1.5 pt-1">
                      <Info className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        {selectedStats.invalid} member(s) lack a valid mobile number and will be marked as &quot;Unable to Send — No Valid Phone Number&quot; without expending SMS credits.
                      </span>
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Department Selection */}
          {targetType === 'DEPARTMENT' && (
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Select Department</label>
              <select
                value={selectedDepartmentId}
                onChange={e => setSelectedDepartmentId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-teal-700"
              >
                {departments.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.category || d.type || 'Department'})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Custom Phone Numbers */}
          {targetType === 'CUSTOM' && (
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Enter Phone Numbers (comma or line separated)
              </label>
              <textarea
                rows={2}
                value={customPhones}
                onChange={e => setCustomPhones(e.target.value)}
                placeholder="0241234567, 0501234567, +233201234567"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono focus:outline-none focus:border-teal-700"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Supports standard Ghana mobile networks (MTN, Vodafone/Telecel, AirtelTigo) and international numbers.
              </p>
            </div>
          )}

          {/* Message Textarea */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-semibold text-slate-700">Message Content</label>
              <div className="flex items-center space-x-2 text-[11px] text-slate-400">
                <span>{charCount} characters</span>
                <span>•</span>
                <span className="font-bold text-teal-800">
                  {segments} SMS segment{segments > 1 ? 's' : ''}
                </span>
              </div>
            </div>
            <textarea
              rows={3}
              required
              value={messageText}
              onChange={e => setMessageText(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-700"
            />
            {/* Tag Helpers */}
            <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[11px] text-slate-500">
              <span className="font-medium">Personalization Tags:</span>
              <button
                type="button"
                onClick={() => setMessageText(prev => prev + ' [Member Name]')}
                className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 font-mono text-slate-700 text-xs transition-colors cursor-pointer"
                title="Insert [Member Name] tag"
              >
                + [Member Name]
              </button>
              <button
                type="button"
                onClick={() => setMessageText(prev => prev + ' [Church Name]')}
                className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 font-mono text-slate-700 text-xs transition-colors cursor-pointer"
                title="Insert [Church Name] tag"
              >
                + [Church Name]
              </button>

              <button
                type="button"
                onClick={() => {
                  const cName = church?.name || 'Our Church';
                  let mName = 'Beloved Member';
                  if (targetType === 'SELECTED_MEMBERS' && selectedMemberIds.length === 1) {
                    const found = members.find(m => m.id === selectedMemberIds[0]);
                    if (found) mName = found.fullName;
                  } else if (members.length > 0) {
                    mName = members[0].fullName;
                  }
                  setMessageText(prev =>
                    prev
                      .replace(/\[Church Name\]/gi, cName)
                      .replace(/\[Member Name\]/gi, mName)
                  );
                }}
                className="px-2.5 py-0.5 rounded-md bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 font-bold text-xs transition flex items-center space-x-1 cursor-pointer"
                title="Directly replace [Member Name] and [Church Name] with actual church name and selected member in the text box"
              >
                <Sparkles className="w-3 h-3 text-teal-600" />
                <span>Replace Tags with Church & Selected Member</span>
              </button>
            </div>
          </div>

          {/* Review & Submit Trigger */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <div className="text-[11px] text-slate-500">
              Configured Sender Name: <strong className="text-teal-900 font-mono">{autoSenderId}</strong>
            </div>

            <button
              type="submit"
              disabled={
                sending ||
                !smsEnabled ||
                (targetType === 'SELECTED_MEMBERS' && selectedMemberIds.length === 0)
              }
              className="px-5 py-2.5 bg-teal-700 hover:bg-teal-800 text-white font-medium rounded-lg shadow-xs flex items-center space-x-2 transition-colors disabled:opacity-50 text-xs"
            >
              <Send className="w-3.5 h-3.5" />
              <span>
                {targetType === 'SELECTED_MEMBERS'
                  ? `Review & Send SMS to ${selectedMemberIds.length} Member${selectedMemberIds.length === 1 ? '' : 's'}`
                  : 'Review & Send Broadcast SMS'}
              </span>
            </button>
          </div>
        </form>

        {/* Dispatch Result Summary Banner */}
        {sendResult && (
          <div className="p-4 bg-teal-50 border-t border-teal-200 text-xs text-teal-950 flex items-start justify-between">
            <div className="space-y-1">
              <strong className="font-bold flex items-center space-x-1.5">
                <CheckCircle className="w-4 h-4 text-teal-700" />
                <span>{sendResult.message}</span>
              </strong>
              <div className="text-slate-600 space-x-2">
                <span>Targeted: {sendResult.totalTargeted}</span> •{' '}
                <span className="text-emerald-700 font-semibold">Delivered: {sendResult.sent}</span> •{' '}
                <span className="text-rose-700 font-semibold">Failed/Invalid: {sendResult.failed}</span>
                {sendResult.skippedNoPhone > 0 && (
                  <span> ({sendResult.skippedNoPhone} without valid phone)</span>
                )}
              </div>
            </div>
            <button
              onClick={() => setSendResult(null)}
              className="text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* =============================================================== */}
      {/* REQUIREMENT 1: CONFIRMATION MODAL BEFORE DISPATCH               */}
      {/* =============================================================== */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full overflow-hidden text-xs text-left animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Confirm SMS Broadcast</h3>
                  <p className="text-[11px] text-slate-400">Review dispatch parameters before transmission</p>
                </div>
              </div>
              <button
                onClick={() => setIsConfirmModalOpen(false)}
                disabled={sending}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Dispatch Summary Grid */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Sender Name</span>
                  <span className="font-mono font-bold text-teal-800 text-xs">{autoSenderId}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">SMS Gateway</span>
                  <span className="font-semibold text-slate-800 text-xs">{configuredGateway}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Target Audience</span>
                  <span className="font-semibold text-slate-800 text-xs">
                    {targetType === 'SELECTED_MEMBERS'
                      ? `Selected Members (${selectedMembersList.length})`
                      : targetType.replace(/_/g, ' ')}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Est. SMS Segments</span>
                  <span className="font-semibold text-slate-800 text-xs">
                    {segments} segment{segments > 1 ? 's' : ''} ({charCount} chars)
                  </span>
                </div>
              </div>

              {/* Recipient Breakdown for Selected Members */}
              {targetType === 'SELECTED_MEMBERS' && (
                <div className="p-3 bg-teal-50/50 rounded-lg border border-teal-100 space-y-1">
                  <div className="flex items-center justify-between font-semibold text-teal-950">
                    <span>Recipients Breakdown:</span>
                    <span>{selectedMembersList.length} Total Members</span>
                  </div>
                  <div className="text-[11px] text-slate-600 flex items-center justify-between">
                    <span>• Valid mobile numbers:</span>
                    <span className="font-bold text-emerald-700">{selectedStats.valid}</span>
                  </div>
                  {selectedStats.invalid > 0 && (
                    <div className="text-[11px] text-amber-800 flex items-center justify-between">
                      <span>• Missing/Invalid numbers (will be skipped):</span>
                      <span className="font-bold text-amber-700">{selectedStats.invalid}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Message Preview Box */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Message Preview:</label>
                <div className="p-3 bg-slate-100 rounded-lg border border-slate-200 text-slate-800 font-sans whitespace-pre-wrap text-xs">
                  {messageText}
                </div>
              </div>

              {/* Duplicate Prevention Guarantee Notice */}
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-[11px] text-slate-500 flex items-start space-x-2">
                <ShieldCheck className="w-3.5 h-3.5 text-teal-700 mt-0.5 shrink-0" />
                <span>
                  <strong>Idempotent Transmission:</strong> Duplicate SMS protection is active. Multiple clicks or retries will not duplicate SMS deliveries.
                </span>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setIsConfirmModalOpen(false)}
                disabled={sending}
                className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-100 font-medium transition-colors"
              >
                Cancel / Edit
              </button>
              <button
                type="button"
                onClick={executeSendSms}
                disabled={sending}
                className="px-5 py-2 bg-teal-700 hover:bg-teal-800 text-white font-medium rounded-lg shadow-xs flex items-center space-x-1.5 transition-colors disabled:opacity-50"
              >
                {sending ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Dispatching SMS...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Confirm & Dispatch SMS</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =============================================================== */}
      {/* REQUIREMENT 6: SEARCHABLE & FILTERABLE SMS HISTORY              */}
      {/* =============================================================== */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Outbox Header */}
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-teal-950 flex items-center space-x-2">
              <FileText className="w-4 h-4 text-teal-700" />
              <span>SMS Outbox & Delivery History ({smsLogs.length})</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Comprehensive audit trail of dispatched broadcasts, tithes, contributions, and greetings.
            </p>
          </div>

          <button
            onClick={loadData}
            className="px-3 py-1.5 border border-slate-200 text-slate-600 hover:text-teal-800 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition-colors self-start sm:self-auto"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh History</span>
          </button>
        </div>

        {/* History Search & Filters Toolbar */}
        <div className="p-4 bg-slate-50/70 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
          {/* Recipient Search */}
          <div className="relative sm:col-span-2">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={historySearchQuery}
              onChange={e => setHistorySearchQuery(e.target.value)}
              placeholder="Search by recipient name, phone, receipt #, or message text..."
              className="w-full pl-8 pr-8 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-teal-700"
            />
            {historySearchQuery && (
              <button
                type="button"
                onClick={() => setHistorySearchQuery('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={historyStatusFilter}
              onChange={e => setHistoryStatusFilter(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-teal-700"
            >
              <option value="ALL">All Delivery Statuses</option>
              <option value="DELIVERED">Delivered / Accepted</option>
              <option value="UNABLE_TO_SEND">Unable to Send (No Phone)</option>
              <option value="FAILED">Failed</option>
            </select>
          </div>

          {/* Date Filter */}
          <div>
            <select
              value={historyDateFilter}
              onChange={e => setHistoryDateFilter(e.target.value as any)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-teal-700"
            >
              <option value="ALL">All Dates</option>
              <option value="TODAY">Sent Today</option>
              <option value="THIS_WEEK">Past 7 Days</option>
              <option value="THIS_MONTH">This Month</option>
            </select>
          </div>
        </div>

        {/* History Table / Empty State */}
        {smsLogs.length === 0 ? (
          // REQUIREMENT 5: Empty state when no SMS has been sent
          <div className="p-10 text-center space-y-3">
            <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-slate-800 text-sm">No SMS messages sent yet</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                No SMS messages sent yet. Send your first broadcast or record a financial contribution above.
              </p>
            </div>
          </div>
        ) : filteredSmsLogs.length === 0 ? (
          <div className="p-8 text-center text-slate-500 space-y-2">
            <p>No SMS logs match your search and filter criteria.</p>
            <button
              onClick={() => {
                setHistorySearchQuery('');
                setHistoryStatusFilter('ALL');
                setHistoryDateFilter('ALL');
              }}
              className="text-teal-700 font-semibold hover:underline text-xs"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] uppercase font-semibold">
                  <th className="py-2.5 px-4">Recipient</th>
                  <th className="py-2.5 px-4">Phone Number</th>
                  <th className="py-2.5 px-4">Notification Type</th>
                  <th className="py-2.5 px-4">Contribution Ref</th>
                  <th className="py-2.5 px-4">Message Content</th>
                  <th className="py-2.5 px-4">Delivery Status</th>
                  <th className="py-2.5 px-4">Date & Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSmsLogs.map(log => {
                  const isDelivered = log.status === 'Delivered' || log.status === 'Accepted';
                  const isUnableToSend = log.status === 'Unable to Send';
                  return (
                    <tr
                      key={log.id}
                      onClick={() => setSelectedLogDetail(log)}
                      className="hover:bg-slate-50/70 transition-colors cursor-pointer"
                    >
                      <td className="py-2.5 px-4 font-semibold text-slate-800">
                        {log.recipientName || 'Member'}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-slate-600 text-[11px]">
                        {log.normalizedPhone || log.phone || <span className="text-slate-400 italic">None</span>}
                      </td>
                      <td className="py-2.5 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700">
                          {log.notificationType?.replace(/_/g, ' ') || 'SMS'}
                        </span>
                      </td>
                      <td className="py-2.5 px-4">
                        {log.relatedReceiptNumber ? (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-teal-50 text-teal-800 border border-teal-200">
                            <Receipt className="w-3 h-3 text-teal-600" />
                            <span>{log.relatedReceiptNumber}</span>
                          </span>
                        ) : (
                          <span className="text-slate-300 text-[10px]">—</span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-slate-600 truncate max-w-xs" title={log.message}>
                        {log.message}
                      </td>
                      <td className="py-2.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold inline-flex items-center space-x-1 ${
                            isDelivered
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : isUnableToSend
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {isDelivered && <CheckCircle className="w-3 h-3 text-emerald-600" />}
                          {isUnableToSend && <AlertTriangle className="w-3 h-3 text-amber-600" />}
                          <span>{log.status}</span>
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-slate-400 text-[11px] whitespace-nowrap">
                        {new Date(log.sentAt || log.createdAt).toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* SMS Detail Modal */}
      {selectedLogDetail && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full overflow-hidden text-xs text-left animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm flex items-center space-x-2">
                <FileText className="w-4 h-4 text-teal-700" />
                <span>SMS Dispatch Record Details</span>
              </h3>
              <button
                onClick={() => setSelectedLogDetail(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Recipient</span>
                  <span className="font-bold text-slate-800">{selectedLogDetail.recipientName}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Phone Number</span>
                  <span className="font-mono text-teal-900 font-bold">
                    {selectedLogDetail.normalizedPhone || selectedLogDetail.phone || 'None'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Sender Name</span>
                  <span className="font-mono text-slate-700">{selectedLogDetail.senderName}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Status</span>
                  <span className="font-bold text-slate-800">{selectedLogDetail.status}</span>
                </div>
                {selectedLogDetail.relatedReceiptNumber && (
                  <div className="col-span-2">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Contribution Reference
                    </span>
                    <span className="font-mono font-bold text-teal-800">
                      {selectedLogDetail.relatedReceiptNumber}
                    </span>
                  </div>
                )}
                {selectedLogDetail.failureReason && (
                  <div className="col-span-2 p-2 bg-amber-50 rounded border border-amber-200 text-amber-900 text-[11px]">
                    <strong>Diagnostic Reason:</strong> {selectedLogDetail.failureReason}
                  </div>
                )}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Message Content:</label>
                <div className="p-3 bg-slate-100 rounded-lg border border-slate-200 text-slate-800 font-sans whitespace-pre-wrap">
                  {selectedLogDetail.message}
                </div>
              </div>

              <div className="text-[11px] text-slate-400 space-y-0.5">
                <div>Dispatched: {new Date(selectedLogDetail.sentAt || selectedLogDetail.createdAt).toLocaleString()}</div>
                {selectedLogDetail.idempotencyKey && (
                  <div className="font-mono truncate">Idempotency Key: {selectedLogDetail.idempotencyKey}</div>
                )}
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedLogDetail(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
