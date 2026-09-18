import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Search,
  Plus,
  Phone,
  Mail,
  Calendar,
  Eye,
  Edit2,
  Trash2,
  X,
  CheckCircle,
  AlertCircle,
  HandCoins,
  CalendarCheck,
  Building,
  Upload,
  Camera,
  MessageSquare,
  Send,
  Coins,
  CheckSquare,
  Square,
  Sparkles,
  UserX,
  Cake,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import { ApiClient } from '../api';
import { Member, DepartmentOrGroup, Church } from '../types';
import { normalizePhoneNumber, formatPhoneForDisplay } from '../utils/phoneUtils';

interface Props {
  onRecordGivingForMember?: (memberId: string) => void;
  church?: Church | null;
}

function calculateAge(dobString?: string): number | null {
  if (!dobString) return null;
  const dob = new Date(dobString);
  if (isNaN(dob.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age >= 0 ? age : null;
}

export const MembersModule: React.FC<Props> = ({ onRecordGivingForMember, church }) => {
  const [members, setMembers] = useState<Member[]>([]);
  const [departments, setDepartments] = useState<DepartmentOrGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [genderFilter, setGenderFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');

  // Selected members for batch actions
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailTab, setDetailTab] = useState<'profile' | 'attendance' | 'giving'>('profile');
  const [detailData, setDetailData] = useState<any | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // In-app Delete Confirmation Modal State
  const [memberToDelete, setMemberToDelete] = useState<Member | null>(null);
  const [isDeletingMember, setIsDeletingMember] = useState(false);
  const [showBatchDeleteModal, setShowBatchDeleteModal] = useState(false);
  const [isBatchDeleting, setIsBatchDeleting] = useState(false);

  // Send SMS to Directory / Member Modal State
  const [showSmsModal, setShowSmsModal] = useState(false);
  const [smsTargetMember, setSmsTargetMember] = useState<Member | null>(null); // null means entire directory
  const [smsMessage, setSmsMessage] = useState(
    `Beloved [Member Name], grace and peace to you from ${church?.name || '[Church Name]'}. Blessings on your week!`
  );
  const [sendingSms, setSendingSms] = useState(false);
  const [smsResult, setSmsResult] = useState<{ success: boolean; message: string; failureReason?: string; details?: any } | null>(null);
  const [churchSmsCredits, setChurchSmsCredits] = useState<number>(church?.smsCredits ?? 500);

  useEffect(() => {
    if (church?.smsCredits !== undefined) {
      setChurchSmsCredits(church.smsCredits);
    }
  }, [church?.smsCredits]);

  // Form State
  const [formData, setFormData] = useState<any>({
    fullName: '',
    phone: '',
    email: '',
    gender: 'Male',
    dateOfBirth: '',
    photoUrl: '',
    address: '',
    occupation: '',
    maritalStatus: 'Single',
    membershipStatus: 'Active',
    baptismStatus: 'Baptized',
    departmentIds: [],
    sendWelcomeSms: true,
    notes: '',
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadMembers = async () => {
    try {
      setLoading(true);
      const query = new URLSearchParams();
      if (search) query.append('search', search);
      if (statusFilter) query.append('status', statusFilter);
      if (genderFilter) query.append('gender', genderFilter);
      if (deptFilter) query.append('departmentId', deptFilter);

      const [mRes, dRes] = await Promise.all([
        ApiClient.get(`/api/church/members?${query.toString()}`),
        ApiClient.get('/api/church/departments'),
      ]);

      setMembers(mRes);
      setDepartments(dRes);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMembers();
  }, [search, statusFilter, genderFilter, deptFilter]);

  const handleOpenDetail = async (member: Member) => {
    setSelectedMember(member);
    setShowDetailModal(true);
    setDetailTab('profile');
    try {
      setLoadingDetail(true);
      const res = await ApiClient.get(`/api/church/members/${member.id}`);
      setDetailData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
      setFormError('Image size exceeds 3MB limit. Please choose a smaller photo.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_DIM = 400;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_DIM) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          }
        } else {
          if (height > MAX_DIM) {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          setFormData((prev: any) => ({ ...prev, photoUrl: dataUrl }));
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSaveMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.fullName || !formData.phone) {
      setFormError('Please provide full name and phone number.');
      return;
    }

    try {
      setFormLoading(true);
      if (formData.id) {
        await ApiClient.put(`/api/church/members/${formData.id}`, formData);
        setNotice(`Member "${formData.fullName}" updated successfully.`);
      } else {
        await ApiClient.post('/api/church/members', formData);
        setNotice(`Member "${formData.fullName}" registered successfully.`);
      }
      setShowAddModal(false);
      resetForm();
      await loadMembers();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save member.');
    } finally {
      setFormLoading(false);
    }
  };

  // Perform member deletion
  const handleConfirmDelete = async () => {
    if (!memberToDelete) return;
    try {
      setIsDeletingMember(true);
      await ApiClient.delete(`/api/church/members/${memberToDelete.id}`);
      setNotice(`Member record for "${memberToDelete.fullName}" permanently removed.`);
      setMemberToDelete(null);
      if (showDetailModal && selectedMember?.id === memberToDelete.id) {
        setShowDetailModal(false);
      }
      setSelectedMemberIds(prev => prev.filter(id => id !== memberToDelete.id));
      await loadMembers();
    } catch (err: any) {
      setNotice(`Error deleting member: ${err.message}`);
    } finally {
      setIsDeletingMember(false);
    }
  };

  // Perform batch delete
  const handleConfirmBatchDelete = async () => {
    if (selectedMemberIds.length === 0) return;
    try {
      setIsBatchDeleting(true);
      const res = await ApiClient.post('/api/church/members/batch-delete', {
        memberIds: selectedMemberIds,
      });
      setNotice(res.message || `${selectedMemberIds.length} members removed.`);
      setSelectedMemberIds([]);
      setShowBatchDeleteModal(false);
      await loadMembers();
    } catch (err: any) {
      setNotice(`Batch delete error: ${err.message}`);
    } finally {
      setIsBatchDeleting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      fullName: '',
      phone: '',
      email: '',
      gender: 'Male',
      dateOfBirth: '',
      photoUrl: '',
      address: '',
      occupation: '',
      maritalStatus: 'Single',
      membershipStatus: 'Active',
      baptismStatus: 'Baptized',
      departmentIds: [],
      sendWelcomeSms: true,
      notes: '',
    });
    setFormError(null);
  };

  // SMS helpers & validation
  const memberPhoneValidation = useMemo(() => {
    if (!smsTargetMember) return { isValid: false, normalized: '', error: 'No recipient selected' };
    return normalizePhoneNumber(smsTargetMember.phone);
  }, [smsTargetMember]);

  const selectedPhoneStats = useMemo(() => {
    let valid = 0;
    let invalid = 0;
    for (const id of selectedMemberIds) {
      const m = members.find(mem => mem.id === id);
      if (m?.phone && normalizePhoneNumber(m.phone).isValid) {
        valid++;
      } else {
        invalid++;
      }
    }
    return { total: selectedMemberIds.length, valid, invalid };
  }, [selectedMemberIds, members]);

  const handleOpenSmsModal = (target?: Member | null) => {
    // Automatically identify and link the member attached to the SMS action as the recipient
    // If target is not provided but exactly 1 member is selected in checkboxes, resolve that member automatically
    const candidateTarget = target || (selectedMemberIds.length === 1 ? members.find(m => m.id === selectedMemberIds[0]) : null);
    // Always retrieve the latest fresh record from database/state to ensure registered phone number is up to date
    const resolvedTarget = candidateTarget ? (members.find(m => m.id === candidateTarget.id) || candidateTarget) : null;
    
    setSmsTargetMember(resolvedTarget || null);
    const churchName = church?.name || 'Our Church';
    const recipientName = resolvedTarget ? resolvedTarget.fullName : '[Member Name]';
    setSmsMessage(`Beloved ${recipientName}, grace and peace to you from ${churchName}. Reminder for our upcoming fellowship service. Come expectant!`);
    setSmsResult(null);
    setShowSmsModal(true);
  };

  const handleSendDirectorySms = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!smsMessage.trim()) return;

    // Validate phone numbers before dispatching
    if (smsTargetMember) {
      const rawPhone = (smsTargetMember.phone || '').trim();
      if (!rawPhone) {
        setSmsResult({
          success: false,
          message: 'This member does not have a registered phone number.',
        });
        return;
      }
      const norm = normalizePhoneNumber(rawPhone);
      if (!norm.isValid) {
        setSmsResult({
          success: false,
          message: `This member's registered phone number (${rawPhone}) is invalid: ${norm.error || 'Invalid phone format'}.`,
        });
        return;
      }
    } else if (selectedMemberIds.length > 0 && selectedPhoneStats.valid === 0) {
      setSmsResult({
        success: false,
        message: 'None of the selected members have a registered phone number.',
      });
      return;
    }

    try {
      setSendingSms(true);
      setSmsResult(null);

      // Generate client batch ID to guarantee idempotent transmission and prevent duplicates
      const clientBatchId = `batch_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

      let payload: any = {
        message: smsMessage.trim(),
        clientBatchId,
        notificationType: smsTargetMember ? 'MEMBER_UPDATE' : 'BULK_ANNOUNCEMENT',
      };

      if (smsTargetMember) {
        const norm = normalizePhoneNumber(smsTargetMember.phone);
        payload.recipientType = 'SELECTED_MEMBERS';
        payload.memberId = smsTargetMember.id;
        payload.memberIds = [smsTargetMember.id];
        payload.selectedMemberIds = [smsTargetMember.id];
        payload.phone = norm.normalized;
        payload.recipientName = smsTargetMember.fullName;
        payload.recipients = [
          {
            memberId: smsTargetMember.id,
            name: smsTargetMember.fullName,
            phone: norm.normalized,
          },
        ];
      } else if (selectedMemberIds.length > 0) {
        const uniqueIds = Array.from(new Set(selectedMemberIds));
        payload.recipientType = 'SELECTED_MEMBERS';
        payload.memberIds = uniqueIds;
        payload.selectedMemberIds = uniqueIds;
        payload.recipients = uniqueIds.map(id => {
          const m = members.find(mem => mem.id === id);
          return {
            memberId: id,
            name: m?.fullName || 'Member',
            phone: m?.phone || '',
          };
        });
      } else {
        payload.recipientType = 'ALL_MEMBERS';
      }

      const res = await ApiClient.post('/api/church/sms/send', payload);
      const isSuccess = Boolean(res.success && (res.sent === undefined || res.sent > 0));
      const reason = res.failureReason || res.results?.find((r: any) => r.failureReason)?.failureReason;

      if (typeof res.remainingCredits === 'number') {
        setChurchSmsCredits(res.remainingCredits);
      } else if (isSuccess && res.sent) {
        setChurchSmsCredits(prev => Math.max(0, prev - res.sent));
      }

      setSmsResult({
        success: isSuccess,
        message: res.message || (isSuccess ? 'SMS dispatched successfully.' : 'SMS dispatch failed.'),
        failureReason: reason,
        details: res,
      });

      if (isSuccess) {
        setNotice(`SMS transmission complete: ${res.sent || 0} delivered, ${res.failed || 0} failed.`);
      } else {
        setNotice(`SMS dispatch failed: ${res.failed || 0} failed. ${reason || ''}`.trim());
      }
    } catch (err: any) {
      setSmsResult({
        success: false,
        message: err.message || 'Failed to dispatch SMS.',
        failureReason: err.message,
      });
    } finally {
      setSendingSms(false);
    }
  };

  const replaceTagsDirectly = () => {
    const churchName = church?.name || 'Our Church';
    const memberName = smsTargetMember?.fullName || (selectedMemberIds.length === 1 ? members.find(m => m.id === selectedMemberIds[0])?.fullName : 'Beloved Member') || 'Beloved Member';
    setSmsMessage(prev =>
      prev
        .replace(/\[Church Name\]/gi, churchName)
        .replace(/\[Member Name\]/gi, memberName)
    );
  };

  // Live preview for SMS modal
  const sampleRecipientName = smsTargetMember?.fullName || (selectedMemberIds.length > 0 ? members.find(m => m.id === selectedMemberIds[0])?.fullName : members[0]?.fullName) || 'Kwesi Mensah';
  const sampleChurchName = church?.name || 'Grace Temple International';
  const previewSmsText = smsMessage
    .replace(/\[Member Name\]/gi, sampleRecipientName)
    .replace(/\[Church Name\]/gi, sampleChurchName);
  const smsSegments = Math.max(1, Math.ceil((smsMessage.length || 1) / 160));

  return (
    <div className="space-y-5 pb-20 text-left">
      {/* Top Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-teal-950 flex items-center space-x-2">
            <Users className="w-5 h-5 text-teal-700" />
            <span>Member Directory</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage church membership, personal profiles, attendance consistency, and giving histories.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Send SMS to All Directory button */}
          <button
            type="button"
            onClick={() => handleOpenSmsModal(null)}
            className="px-3 py-2 bg-teal-50 hover:bg-teal-100 text-teal-900 border border-teal-200 font-semibold text-xs rounded-lg shadow-xs flex items-center space-x-1.5 transition cursor-pointer"
            title="Send broadcast SMS to all church members"
          >
            <MessageSquare className="w-4 h-4 text-teal-700" />
            <span>Send SMS to Directory</span>
            <span className="ml-1 px-1.5 py-0.2 bg-teal-200 text-teal-950 rounded text-[10px] font-mono font-bold">
              {churchSmsCredits} units
            </span>
          </button>

          {/* Add New Member button */}
          <button
            type="button"
            onClick={() => {
              resetForm();
              setShowAddModal(true);
            }}
            className="px-3.5 py-2 bg-teal-700 hover:bg-teal-800 text-white font-semibold text-xs rounded-lg shadow-xs flex items-center space-x-1.5 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Member</span>
          </button>
        </div>
      </div>

      {notice && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{notice}</span>
          </div>
          <button onClick={() => setNotice(null)} className="font-bold text-emerald-700 hover:underline cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by member name, phone, code (e.g. GTI-001) or email..."
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-700 text-slate-800"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-slate-700 bg-white focus:outline-none focus:border-teal-700"
          >
            <option value="">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
            <option value="Under Discipline">Under Discipline</option>
          </select>

          <select
            value={genderFilter}
            onChange={e => setGenderFilter(e.target.value)}
            className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-slate-700 bg-white focus:outline-none focus:border-teal-700"
          >
            <option value="">All Genders</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>

          <select
            value={deptFilter}
            onChange={e => setDeptFilter(e.target.value)}
            className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-slate-700 bg-white focus:outline-none focus:border-teal-700"
          >
            <option value="">All Ministries / Departments</option>
            {departments.map(d => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Batch Actions Bar (visible when items selected) */}
      {selectedMemberIds.length > 0 && (
        <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl flex items-center justify-between text-xs animate-in fade-in duration-150">
          <div className="flex items-center space-x-2 text-teal-900 font-bold">
            <CheckSquare className="w-4 h-4 text-teal-700" />
            <span>{selectedMemberIds.length} member{selectedMemberIds.length > 1 ? 's' : ''} selected</span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => handleOpenSmsModal(null)}
              className="px-3 py-1.5 bg-teal-700 text-white hover:bg-teal-800 rounded-lg font-bold text-xs flex items-center space-x-1 transition cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>SMS Selected ({selectedMemberIds.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setShowBatchDeleteModal(true)}
              className="px-3 py-1.5 bg-rose-600 text-white hover:bg-rose-700 rounded-lg font-bold text-xs flex items-center space-x-1 transition cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Selected ({selectedMemberIds.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedMemberIds([])}
              className="px-2.5 py-1.5 text-slate-500 hover:text-slate-700 text-xs font-semibold cursor-pointer"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Members Directory Table / Cards */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2.5">
            <input
              type="checkbox"
              checked={members.length > 0 && members.every(m => selectedMemberIds.includes(m.id))}
              onChange={e => {
                if (e.target.checked) {
                  setSelectedMemberIds(members.map(m => m.id));
                } else {
                  setSelectedMemberIds([]);
                }
              }}
              className="w-4 h-4 text-teal-700 rounded border-slate-300 focus:ring-teal-600 cursor-pointer"
              title="Select all members"
            />
            <span className="font-semibold text-slate-700">
              {members.length} Member{members.length !== 1 ? 's' : ''} Enrolled
            </span>
          </div>

          <div className="text-[11px] text-slate-500">
            Click any row to open full 360° record
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading directory...</div>
        ) : members.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            No matching member records found.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {members.map(member => {
              const isSelected = selectedMemberIds.includes(member.id);
              const age = calculateAge(member.dateOfBirth);

              return (
                <div
                  key={member.id}
                  className={`p-4 hover:bg-slate-50 transition-colors flex items-center justify-between gap-3 ${
                    isSelected ? 'bg-teal-50/40' : ''
                  }`}
                >
                  {/* Row Checkbox */}
                  <div className="shrink-0" onClick={e => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={e => {
                        if (e.target.checked) {
                          setSelectedMemberIds(prev => [...prev, member.id]);
                        } else {
                          setSelectedMemberIds(prev => prev.filter(id => id !== member.id));
                        }
                      }}
                      className="w-4 h-4 text-teal-700 rounded border-slate-300 focus:ring-teal-600 cursor-pointer"
                    />
                  </div>

                  {/* Profile info with Image / Avatar */}
                  <div
                    onClick={() => handleOpenDetail(member)}
                    className="flex items-center space-x-3 cursor-pointer min-w-0 flex-1"
                  >
                    {member.photoUrl ? (
                      <img
                        src={member.photoUrl}
                        alt={member.fullName}
                        className="w-10 h-10 rounded-full object-cover border border-slate-200 shadow-2xs shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-teal-50 text-teal-800 border border-teal-100 flex items-center justify-center font-bold text-sm shrink-0">
                        {member.fullName[0] || 'M'}
                      </div>
                    )}

                    <div className="min-w-0">
                      <div className="flex items-center space-x-2">
                        <h4 className="text-xs font-bold text-slate-900 truncate">
                          {member.fullName}
                        </h4>
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 font-mono">
                          {member.memberCode}
                        </span>

                        {member.dateOfBirth && (
                          <span className="hidden md:inline-flex items-center space-x-1 px-1.5 py-0.2 rounded text-[10px] bg-purple-50 text-purple-700 border border-purple-100">
                            <Cake className="w-2.5 h-2.5" />
                            <span>{member.dateOfBirth}{age !== null ? ` (${age}y)` : ''}</span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center space-x-3 text-[11px] text-slate-500 mt-0.5">
                        <span className="flex items-center space-x-1">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{member.phone}</span>
                        </span>
                        {member.occupation && (
                          <span className="hidden sm:inline text-slate-400">• {member.occupation}</span>
                        )}
                        {member.gender && (
                          <span className="hidden sm:inline text-slate-400">• {member.gender}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions Column */}
                  <div className="flex items-center space-x-1.5 shrink-0" onClick={e => e.stopPropagation()}>
                    <span
                      className={`hidden sm:inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${
                        member.membershipStatus === 'Active'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {member.membershipStatus}
                    </span>

                    {/* Send SMS Button */}
                    <button
                      type="button"
                      onClick={() => handleOpenSmsModal(member)}
                      title={`Send SMS to ${member.fullName}`}
                      className="p-1.5 text-teal-700 hover:bg-teal-50 border border-teal-200 rounded-lg transition cursor-pointer"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                    </button>

                    {/* View Profile */}
                    <button
                      type="button"
                      onClick={() => handleOpenDetail(member)}
                      title="View Profile & Records"
                      className="p-1.5 text-slate-400 hover:text-teal-700 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>

                    {/* Edit Member */}
                    <button
                      type="button"
                      onClick={() => {
                        setFormData({
                          ...member,
                          dateOfBirth: member.dateOfBirth || '',
                          photoUrl: member.photoUrl || '',
                        });
                        setShowAddModal(true);
                      }}
                      title="Edit Member Profile"
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    {/* Delete Member (Church can delete members) */}
                    <button
                      type="button"
                      onClick={() => setMemberToDelete(member)}
                      title={`Permanently delete ${member.fullName}`}
                      className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* =================================================================== */}
      {/* ADD / EDIT MEMBER MODAL (Includes Date of Birth & Photo Upload)     */}
      {/* =================================================================== */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 text-left my-6 max-h-[88vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-base font-bold text-slate-900">
                {formData.id ? 'Edit Member Profile' : 'Register New Church Member'}
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveMember} className="space-y-4 text-xs">
              {/* Profile Photo Upload Section */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center space-x-4">
                <div className="relative shrink-0">
                  {formData.photoUrl ? (
                    <img
                      src={formData.photoUrl}
                      alt="Member Preview"
                      className="w-16 h-16 rounded-full object-cover border-2 border-teal-600 shadow-xs"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-teal-100 text-teal-800 border-2 border-teal-300 flex items-center justify-center font-bold text-xl">
                      {formData.fullName ? formData.fullName[0] : <Camera className="w-6 h-6 text-teal-700" />}
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <label className="block font-bold text-slate-800 mb-1">
                    Member Photo (Optional)
                  </label>
                  <p className="text-[11px] text-slate-500 mb-2">
                    Upload a clear profile picture (PNG, JPG, max 3MB).
                  </p>
                  <div className="flex items-center space-x-2">
                    <label className="px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-lg font-semibold text-xs flex items-center space-x-1.5 cursor-pointer shadow-2xs transition">
                      <Upload className="w-3.5 h-3.5" />
                      <span>{formData.photoUrl ? 'Change Photo' : 'Upload Image'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />
                    </label>

                    {formData.photoUrl && (
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, photoUrl: '' })}
                        className="px-2.5 py-1.5 text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-semibold transition cursor-pointer"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Full Name */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="e.g. Kwesi Appiah Mensah"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-600/20 focus:border-teal-700 focus:outline-none text-slate-900"
                />
              </div>

              {/* Phone & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Phone Number (Ghana normalized e.g. 024XXXXXXX) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="024XXXXXXX"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-600/20 focus:border-teal-700 focus:outline-none text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    placeholder="kwesi@example.com"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-600/20 focus:border-teal-700 focus:outline-none text-slate-900"
                  />
                </div>
              </div>

              {/* Date of Birth & Age Indicator */}
              <div className="p-3 bg-purple-50/50 rounded-xl border border-purple-100">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-bold text-purple-950 flex items-center space-x-1.5">
                    <Calendar className="w-4 h-4 text-purple-700" />
                    <span>Date of Birth</span>
                  </label>
                  {formData.dateOfBirth && calculateAge(formData.dateOfBirth) !== null && (
                    <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded-full font-bold text-[10px]">
                      🎂 Age: {calculateAge(formData.dateOfBirth)} years old
                    </span>
                  )}
                </div>
                <input
                  type="date"
                  value={formData.dateOfBirth || ''}
                  onChange={e => setFormData({ ...formData, dateOfBirth: e.target.value })}
                  className="w-full px-3 py-2 border border-purple-200 rounded-xl bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600"
                />
                <p className="text-[10px] text-purple-700 mt-1">
                  Used for birthday tracking, automated birthday SMS greetings, and pastoral age ministry categorization.
                </p>
              </div>

              {/* Gender, Marital Status & Baptism */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Gender</label>
                  <select
                    value={formData.gender}
                    onChange={e => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full px-2.5 py-2 border border-slate-300 rounded-xl bg-white focus:outline-none focus:border-teal-700"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Marital Status</label>
                  <select
                    value={formData.maritalStatus}
                    onChange={e => setFormData({ ...formData, maritalStatus: e.target.value })}
                    className="w-full px-2.5 py-2 border border-slate-300 rounded-xl bg-white focus:outline-none focus:border-teal-700"
                  >
                    <option value="Single">Single</option>
                    <option value="Married">Married</option>
                    <option value="Widowed">Widowed</option>
                    <option value="Divorced">Divorced</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Baptism</label>
                  <select
                    value={formData.baptismStatus}
                    onChange={e => setFormData({ ...formData, baptismStatus: e.target.value })}
                    className="w-full px-2.5 py-2 border border-slate-300 rounded-xl bg-white focus:outline-none focus:border-teal-700"
                  >
                    <option value="Baptized">Baptized</option>
                    <option value="Not Baptized">Not Baptized</option>
                    <option value="Pending">Pending</option>
                  </select>
                </div>
              </div>

              {/* Occupation & Address */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Occupation</label>
                  <input
                    type="text"
                    value={formData.occupation}
                    onChange={e => setFormData({ ...formData, occupation: e.target.value })}
                    placeholder="e.g. Teacher, Accountant"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-teal-700 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Residential Address</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                    placeholder="e.g. Spintex, Community 18"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-teal-700 text-slate-900"
                  />
                </div>
              </div>

              {!formData.id && (
                <div className="p-3 bg-teal-50/70 rounded-xl border border-teal-100 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-teal-950">Send Welcome SMS</span>
                    <p className="text-[10px] text-teal-700">Dispatch church welcome notification via Arkesel SMS</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.sendWelcomeSms}
                    onChange={e => setFormData({ ...formData, sendWelcomeSms: e.target.checked })}
                    className="h-4 w-4 text-teal-700 focus:ring-teal-600 rounded border-slate-300 cursor-pointer"
                  />
                </div>
              )}

              <div className="pt-2 flex justify-end space-x-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-slate-600 font-semibold hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-5 py-2 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-xl shadow-xs transition disabled:opacity-50 flex items-center space-x-2 cursor-pointer"
                >
                  {formLoading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Saving Profile...</span>
                    </>
                  ) : (
                    <span>Save Member Profile</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MEMBER 360 DETAIL VIEW MODAL                                       */}
      {/* =================================================================== */}
      {showDetailModal && selectedMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 text-left overflow-hidden flex flex-col max-h-[88vh]">
            {/* Header */}
            <div className="p-5 bg-teal-800 text-white flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {selectedMember.photoUrl ? (
                  <img
                    src={selectedMember.photoUrl}
                    alt={selectedMember.fullName}
                    className="w-12 h-12 rounded-full object-cover border-2 border-teal-300 shadow-xs"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-teal-700 flex items-center justify-center font-bold text-lg border border-teal-500">
                    {selectedMember.fullName[0] || 'M'}
                  </div>
                )}
                <div>
                  <h3 className="text-base font-bold tracking-tight">{selectedMember.fullName}</h3>
                  <p className="text-xs text-teal-100 font-mono">
                    Code: {selectedMember.memberCode} • {selectedMember.phone}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="p-1.5 text-teal-200 hover:text-white rounded-lg hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex border-b border-slate-200 bg-slate-50 px-4 text-xs font-semibold">
              <button
                onClick={() => setDetailTab('profile')}
                className={`py-2.5 px-3 border-b-2 transition ${
                  detailTab === 'profile'
                    ? 'border-teal-700 text-teal-700 font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Profile Info
              </button>
              <button
                onClick={() => setDetailTab('attendance')}
                className={`py-2.5 px-3 border-b-2 transition ${
                  detailTab === 'attendance'
                    ? 'border-teal-700 text-teal-700 font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Attendance History
              </button>
              <button
                onClick={() => setDetailTab('giving')}
                className={`py-2.5 px-3 border-b-2 transition ${
                  detailTab === 'giving'
                    ? 'border-teal-700 text-teal-700 font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Giving & Tithes
              </button>
            </div>

            {/* Tab Content */}
            <div className="p-5 flex-1 overflow-y-auto text-xs space-y-4">
              {detailTab === 'profile' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div>
                      <span className="text-slate-400 text-[11px]">Gender:</span>
                      <p className="font-semibold text-slate-800">{selectedMember.gender}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[11px]">Marital Status:</span>
                      <p className="font-semibold text-slate-800">{selectedMember.maritalStatus}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[11px]">Date of Birth:</span>
                      <p className="font-semibold text-slate-800">
                        {selectedMember.dateOfBirth || 'Not specified'}
                        {calculateAge(selectedMember.dateOfBirth) !== null && (
                          <span className="text-purple-700 font-bold ml-1">
                            ({calculateAge(selectedMember.dateOfBirth)} yrs)
                          </span>
                        )}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[11px]">Baptism Status:</span>
                      <p className="font-semibold text-slate-800">{selectedMember.baptismStatus}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[11px]">Joined Date:</span>
                      <p className="font-semibold text-slate-800">{selectedMember.joinDate || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[11px]">Status:</span>
                      <p className="font-semibold text-emerald-700">{selectedMember.membershipStatus}</p>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                    <div>
                      <span className="text-slate-400 text-[11px]">Address:</span>
                      <p className="font-medium text-slate-700">{selectedMember.address || 'Not specified'}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[11px]">Occupation:</span>
                      <p className="font-medium text-slate-700">{selectedMember.occupation || 'Not specified'}</p>
                    </div>
                  </div>

                  {/* Actions in Detail Modal */}
                  <div className="pt-3 flex items-center justify-between border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => {
                        setShowDetailModal(false);
                        handleOpenSmsModal(selectedMember);
                      }}
                      className="px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded-lg font-bold flex items-center space-x-1.5 transition cursor-pointer"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Send Direct SMS</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setMemberToDelete(selectedMember)}
                      className="text-rose-600 hover:text-rose-700 font-semibold flex items-center space-x-1 px-3 py-1.5 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Member</span>
                    </button>
                  </div>
                </div>
              )}

              {detailTab === 'attendance' && (
                <div>
                  <h4 className="font-bold text-slate-800 mb-2">Service Attendance Log</h4>
                  {loadingDetail ? (
                    <p className="text-slate-400 py-4 text-center">Loading records...</p>
                  ) : detailData?.attendanceHistory?.length === 0 ? (
                    <p className="text-slate-400 py-4 text-center">No attendance recorded yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {detailData?.attendanceHistory?.map((att: any) => (
                        <div
                          key={att.id}
                          className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between"
                        >
                          <div>
                            <span className="font-bold text-slate-800">{att.serviceName}</span>
                            <p className="text-[11px] text-slate-400">{att.serviceDate}</p>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              att.status === 'Present'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {att.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {detailTab === 'giving' && (
                <div>
                  <h4 className="font-bold text-slate-800 mb-2">Member Contributions Log</h4>
                  {loadingDetail ? (
                    <p className="text-slate-400 py-4 text-center">Loading records...</p>
                  ) : detailData?.givingHistory?.length === 0 ? (
                    <p className="text-slate-400 py-4 text-center">No giving recorded yet for this member.</p>
                  ) : (
                    <div className="space-y-2">
                      {detailData?.givingHistory?.map((giv: any) => (
                        <div
                          key={giv.id}
                          className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between"
                        >
                          <div>
                            <span className="font-bold text-slate-800">{giv.givingType}</span>
                            <p className="text-[11px] text-slate-400">
                              {giv.date} • {giv.paymentMethod} • Ref: {giv.receiptNumber}
                            </p>
                          </div>
                          <span className="font-extrabold text-emerald-600 text-sm">
                            GH₵{giv.amount.toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* IN-APP DELETE MEMBER CONFIRMATION MODAL                             */}
      {/* =================================================================== */}
      {memberToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden text-xs text-left animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 bg-rose-50 border-b border-rose-100 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-rose-950">Delete Member Record</h3>
                  <p className="text-[11px] text-rose-600">Permanently removes member from database</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMemberToDelete(null)}
                disabled={isDeletingMember}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-3">
              <p className="text-slate-600 leading-relaxed">
                Are you sure you want to delete the member profile for{' '}
                <strong className="text-slate-900 font-bold">{memberToDelete.fullName}</strong>{' '}
                (Code: <code className="font-mono text-teal-800">{memberToDelete.memberCode}</code>)?
              </p>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-[11px]">
                <strong>Warning:</strong> This action permanently purges the member record, personal details, and links from Firestore. This cannot be undone.
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setMemberToDelete(null)}
                disabled={isDeletingMember}
                className="px-4 py-2 text-slate-600 font-semibold hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeletingMember}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-xs transition flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
              >
                {isDeletingMember ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Yes, Delete Member</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* BATCH DELETE CONFIRMATION MODAL                                    */}
      {/* =================================================================== */}
      {showBatchDeleteModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden text-xs text-left animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 bg-rose-50 border-b border-rose-100 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-rose-950">Bulk Delete Members</h3>
                  <p className="text-[11px] text-rose-600">Remove {selectedMemberIds.length} selected members</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowBatchDeleteModal(false)}
                disabled={isBatchDeleting}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-3">
              <p className="text-slate-600 leading-relaxed">
                You have selected <strong className="text-slate-900">{selectedMemberIds.length} member records</strong> to delete permanently.
              </p>
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-[11px]">
                <strong>Irreversible Action:</strong> All selected member records will be permanently removed from Firestore and cannot be recovered.
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setShowBatchDeleteModal(false)}
                disabled={isBatchDeleting}
                className="px-4 py-2 text-slate-600 font-semibold hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmBatchDelete}
                disabled={isBatchDeleting}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-xs transition flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
              >
                {isBatchDeleting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Deleting {selectedMemberIds.length}...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete {selectedMemberIds.length} Members</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* SEND SMS TO DIRECTORY / MEMBER MODAL                               */}
      {/* =================================================================== */}
      {showSmsModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden text-xs text-left animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 bg-teal-900 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-800 flex items-center justify-center text-teal-200">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">
                    {smsTargetMember
                      ? `Send SMS to ${smsTargetMember.fullName}`
                      : selectedMemberIds.length > 0
                      ? `Send SMS to ${selectedMemberIds.length} Selected Members`
                      : 'Send SMS to All Directory Members'}
                  </h3>
                  <p className="text-[11px] text-teal-200">Arkesel Multi-tenant SMS Gateway Dispatch</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSmsModal(false)}
                disabled={sendingSms}
                className="text-teal-200 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSendDirectorySms} className="p-5 space-y-4">
              {/* Resolved Recipient and Phone Identification Card */}
              {smsTargetMember ? (
                <div className={`p-4 rounded-xl border transition-all ${
                  memberPhoneValidation.isValid
                    ? 'bg-teal-50/80 border-teal-200'
                    : 'bg-amber-50/90 border-amber-300'
                }`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500 block">
                        Resolved SMS Recipient
                      </span>
                      <div className="flex items-center space-x-2 mt-0.5">
                        <span className="font-bold text-slate-900 text-sm">{smsTargetMember.fullName}</span>
                        {smsTargetMember.memberCode && (
                          <span className="text-[11px] font-mono text-slate-600 bg-white/80 px-1.5 py-0.5 rounded border border-slate-200">
                            {smsTargetMember.memberCode}
                          </span>
                        )}
                      </div>
                    </div>
                    {memberPhoneValidation.isValid ? (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{memberPhoneValidation.network || 'Verified Mobile'}</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                        <span>No Valid Phone</span>
                      </span>
                    )}
                  </div>

                  <div className="mt-2.5 pt-2.5 border-t border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-1">
                    <div>
                      <span className="text-slate-500 text-[11px]">Registered Mobile: </span>
                      {smsTargetMember.phone && smsTargetMember.phone.trim() ? (
                        <strong className="font-mono text-slate-900 font-semibold">{smsTargetMember.phone}</strong>
                      ) : (
                        <span className="italic text-rose-600 font-semibold">None registered</span>
                      )}
                      {memberPhoneValidation.isValid && memberPhoneValidation.normalized !== smsTargetMember.phone && (
                        <span className="text-slate-500 text-[11px] font-mono ml-2">
                          (E.164: <strong className="text-teal-900">{memberPhoneValidation.normalized}</strong>)
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      SMS Balance: <strong className="text-teal-800">{churchSmsCredits} units</strong>
                    </div>
                  </div>

                  {!memberPhoneValidation.isValid && (
                    <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-900 text-xs flex items-start space-x-2.5">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <div>
                        <strong className="font-bold block">
                          This member does not have a registered phone number.
                        </strong>
                        <p className="text-[11px] text-rose-700 mt-0.5">
                          Please update {smsTargetMember.fullName}&apos;s profile with a valid phone number (e.g. 024XXXXXXX or +233XXXXXXXXX) to enable SMS dispatch.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ) : selectedMemberIds.length > 0 ? (
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Recipients Target</span>
                      <span className="font-bold text-slate-800 text-xs">
                        {selectedMemberIds.length} Selected Members
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 font-mono">
                      Credits: <strong className="text-teal-800">{churchSmsCredits} units</strong>
                    </span>
                  </div>
                  <div className="text-xs flex items-center justify-between pt-2 border-t border-slate-200 text-slate-600">
                    <span>• Valid numbers: <strong className="text-emerald-700">{selectedPhoneStats.valid}</strong></span>
                    {selectedPhoneStats.invalid > 0 && (
                      <span className="text-amber-700 font-medium">
                        • Missing numbers: <strong>{selectedPhoneStats.invalid}</strong> (will be skipped)
                      </span>
                    )}
                  </div>
                  {selectedPhoneStats.valid === 0 && (
                    <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-center space-x-2">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>None of the selected members have a registered phone number.</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Recipient(s)</span>
                    <span className="font-bold text-slate-800 text-xs">
                      All {members.length} Directory Members
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Available SMS Units</span>
                    <span className="font-mono font-bold text-teal-800 text-xs">
                      {churchSmsCredits} units
                    </span>
                  </div>
                </div>
              )}

              {/* Message Content */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-bold text-slate-700">Message Content *</label>
                  <div className="flex items-center space-x-2 text-[11px] text-slate-400 font-mono">
                    <span>{smsMessage.length} chars</span>
                    <span>•</span>
                    <span className="font-bold text-teal-800">{smsSegments} SMS segment{smsSegments > 1 ? 's' : ''}</span>
                  </div>
                </div>

                <textarea
                  rows={4}
                  required
                  value={smsMessage}
                  onChange={e => setSmsMessage(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700 text-slate-900"
                />

                {/* Personalization Tag Buttons */}
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  <span className="text-[11px] text-slate-500 font-medium">Personalization:</span>
                  <button
                    type="button"
                    onClick={() => setSmsMessage(prev => prev + ' [Member Name]')}
                    className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 font-mono text-slate-700 text-xs transition cursor-pointer"
                  >
                    + [Member Name]
                  </button>
                  <button
                    type="button"
                    onClick={() => setSmsMessage(prev => prev + ' [Church Name]')}
                    className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 font-mono text-slate-700 text-xs transition cursor-pointer"
                  >
                    + [Church Name]
                  </button>

                  {/* Replace Tags directly button */}
                  <button
                    type="button"
                    onClick={replaceTagsDirectly}
                    className="px-2.5 py-0.5 rounded-md bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 font-bold text-xs transition flex items-center space-x-1 cursor-pointer"
                    title="Directly swap tags into literal text in composer"
                  >
                    <Sparkles className="w-3 h-3 text-teal-600" />
                    <span>Replace Tags with Church & Member</span>
                  </button>
                </div>
              </div>

              {/* Live Personalized Output Preview */}
              <div className="p-3 bg-teal-50/60 rounded-xl border border-teal-100">
                <div className="flex items-center justify-between text-[11px] text-teal-900 font-bold mb-1">
                  <span>Live Recipient Preview:</span>
                  <span className="text-teal-700 font-mono text-[10px]">
                    To: {sampleRecipientName} • From: {sampleChurchName}
                  </span>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-teal-200 text-slate-800 font-sans italic whitespace-pre-wrap text-xs">
                  {previewSmsText}
                </div>
              </div>

              {/* Result Banner */}
              {smsResult && (
                <div className={`p-3 rounded-xl border text-xs ${
                  smsResult.success
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-rose-50 border-rose-200 text-rose-900'
                }`}>
                  <strong className="font-bold block mb-0.5">{smsResult.message}</strong>
                  {smsResult.failureReason && !smsResult.success && (
                    <div className="mt-1.5 text-[11px] text-rose-800 bg-rose-100/70 p-2 rounded-lg border border-rose-200">
                      <span className="font-bold">Failure Cause: </span>
                      <span>{smsResult.failureReason}</span>
                    </div>
                  )}
                  {smsResult.details && (
                    <div className="text-[11px] space-x-2 mt-1">
                      <span>Targeted: {smsResult.details.totalTargeted}</span> •{' '}
                      <span className="font-bold text-emerald-700">Delivered: {smsResult.details.sent}</span> •{' '}
                      <span className={`font-bold ${smsResult.details.failed > 0 ? 'text-rose-700' : 'text-slate-600'}`}>
                        Failed: {smsResult.details.failed}
                      </span>
                    </div>
                  )}
                </div>
              )}

              <div className="pt-2 flex items-center justify-end space-x-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowSmsModal(false)}
                  disabled={sendingSms}
                  className="px-4 py-2 text-slate-600 font-semibold hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Close
                </button>

                <button
                  type="submit"
                  disabled={
                    sendingSms ||
                    !smsMessage.trim() ||
                    (Boolean(smsTargetMember) && !memberPhoneValidation.isValid) ||
                    (selectedMemberIds.length > 0 && selectedPhoneStats.valid === 0)
                  }
                  title={
                    smsTargetMember && !memberPhoneValidation.isValid
                      ? 'This member does not have a registered phone number.'
                      : undefined
                  }
                  className="px-5 py-2 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-xl shadow-xs transition flex items-center space-x-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sendingSms ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Sending SMS...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>
                        {smsTargetMember
                          ? `Send SMS to ${smsTargetMember.fullName}`
                          : selectedMemberIds.length > 0
                          ? `Send SMS to ${selectedMemberIds.length} Member${selectedMemberIds.length === 1 ? '' : 's'}`
                          : 'Send Broadcast SMS'}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
