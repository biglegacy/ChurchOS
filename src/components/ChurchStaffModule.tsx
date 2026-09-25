import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  UserPlus,
  Search,
  CheckCircle,
  AlertTriangle,
  X,
  Edit2,
  Trash2,
  Lock,
  Mail,
  Phone,
  User as UserIcon,
  Shield,
  KeyRound,
  RefreshCw,
  Building2,
  UserCheck,
  Users,
  AlertCircle,
  Info,
} from 'lucide-react';
import { ApiClient } from '../api';
import { Church, ChurchPermission, ChurchStaffRole, ALL_CHURCH_PERMISSIONS, DEFAULT_ROLE_PERMISSIONS } from '../types';
import { useAutoDismissNotification } from '../utils/useAutoDismissNotification';

interface Props {
  church?: Church | null;
}

interface StaffMember {
  id: string;
  churchId: string;
  fullName: string;
  username: string;
  email: string;
  phone?: string;
  role: ChurchStaffRole | string;
  customRoleTitle?: string;
  assignedMemberId?: string;
  assignedMemberName?: string;
  isPrimaryAccount?: boolean;
  isAssignedRole?: boolean;
  accountType?: 'CHURCH_ACCOUNT' | 'ASSIGNED_MEMBER_ROLE';
  permissions: ChurchPermission[];
  status: 'ACTIVE' | 'SUSPENDED';
  createdAt: string;
  lastLoginAt?: string;
}

interface ChurchMemberOption {
  id: string;
  fullName: string;
  memberCode: string;
  email?: string;
  phone?: string;
}

const STANDARD_ROLES: Array<{ role: ChurchStaffRole; label: string; description: string }> = [
  { role: 'ACCOUNTANT', label: 'Accountant', description: 'Access to financial ledgers, tithes, income, expenses and audit statements.' },
  { role: 'PASTOR', label: 'Pastor', description: 'Full access to congregation records, spiritual care, attendance consistency and communications.' },
  { role: 'ASSISTANT_PASTOR', label: 'Assistant Pastor', description: 'Assists with pastoral visits, counseling, services and member follow-ups.' },
  { role: 'TREASURER', label: 'Treasurer', description: 'Authorized custodian for church receipts, tithes and bank allocations.' },
  { role: 'SECRETARY', label: 'Secretary', description: 'Oversees membership records, incoming visitors, event calendar and notices.' },
  { role: 'FINANCE_OFFICER', label: 'Finance Officer', description: 'Receives and logs tithes, special contributions and verifies receipts.' },
  { role: 'ADMINISTRATOR', label: 'Administrator', description: 'Full administrative operational access to all church management modules.' },
  { role: 'CUSTOM', label: 'Custom Role', description: 'Church-defined custom designation with customized feature permissions.' },
];

const PERMISSION_METADATA: Record<ChurchPermission, { label: string; category: string }> = {
  view_dashboard: { label: 'View Dashboard', category: 'General' },
  manage_members: { label: 'Manage Member Directory', category: 'Membership' },
  manage_attendance: { label: 'Attendance & Check-In', category: 'Services' },
  send_sms: { label: 'SMS Gateway Dispatch', category: 'Communications' },
  manage_giving: { label: 'Tithes & Finances', category: 'Finances' },
  manage_visitors: { label: 'Visitors & Converts', category: 'Evangelism' },
  manage_pastoral: { label: 'Pastoral Care & Counseling', category: 'Ministry' },
  manage_departments: { label: 'Departments & Cells', category: 'Structure' },
  manage_events: { label: 'Church Calendar & Events', category: 'Operations' },
  manage_staff: { label: 'Manage Staff & Roles', category: 'Administration' },
  manage_settings: { label: 'Church Settings & SMS Config', category: 'Administration' },
  view_reports: { label: 'Financial & Growth Reports', category: 'Analytics' },
};

export const ChurchStaffModule: React.FC<Props> = ({ church }) => {
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [accountFilter, setAccountFilter] = useState<'ALL' | 'CHURCH_ACCOUNT' | 'ASSIGNED_MEMBER_ROLE'>('ALL');
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  useAutoDismissNotification(notice, setNotice, 3000);
  useAutoDismissNotification(error, setError, 4000);

  // Members list for assigning roles
  const [congregationMembers, setCongregationMembers] = useState<ChurchMemberOption[]>([]);

  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // In-app Delete Confirmation Modal State (replaces broken window.confirm)
  const [staffToDelete, setStaffToDelete] = useState<StaffMember | null>(null);
  const [isDeletingStaff, setIsDeletingStaff] = useState(false);

  // Form State
  const [assignmentType, setAssignmentType] = useState<'MEMBER' | 'CUSTOM'>('MEMBER');
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [formFullName, setFormFullName] = useState('');
  const [formUsername, setFormUsername] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formRole, setFormRole] = useState<ChurchStaffRole | string>('ACCOUNTANT');
  const [formCustomTitle, setFormCustomTitle] = useState('');
  const [formPermissions, setFormPermissions] = useState<ChurchPermission[]>(DEFAULT_ROLE_PERMISSIONS['ACCOUNTANT'] || []);
  const [formStatus, setFormStatus] = useState<'ACTIVE' | 'SUSPENDED'>('ACTIVE');

  const loadStaff = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await ApiClient.get('/api/church/staff');
      setStaffList(Array.isArray(res) ? res : []);
    } catch (err: any) {
      setError(err.message || 'Failed to load church staff.');
    } finally {
      setLoading(false);
    }
  };

  const loadMembers = async () => {
    try {
      const res = await ApiClient.get('/api/church/members');
      if (Array.isArray(res)) {
        setCongregationMembers(
          res.map((m: any) => ({
            id: m.id,
            fullName: m.fullName,
            memberCode: m.memberCode || m.id,
            email: m.email,
            phone: m.phone,
          }))
        );
      }
    } catch {
      // Non-blocking if members list fails
    }
  };

  useEffect(() => {
    loadStaff();
    loadMembers();
  }, []);

  const handleRoleChange = (newRole: string) => {
    setFormRole(newRole);
    if (newRole === 'CUSTOM') {
      if (!formCustomTitle) setFormCustomTitle('Ministry Coordinator');
    } else {
      const defaultPerms = DEFAULT_ROLE_PERMISSIONS[newRole as ChurchStaffRole] || ['view_dashboard'];
      setFormPermissions(defaultPerms);
    }
  };

  const togglePermission = (perm: ChurchPermission) => {
    setFormPermissions(prev =>
      prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm]
    );
  };

  const handleMemberSelect = (memberId: string) => {
    setSelectedMemberId(memberId);
    if (!memberId) return;

    const matched = congregationMembers.find(m => m.id === memberId);
    if (matched) {
      setFormFullName(matched.fullName);
      setFormPhone(matched.phone || '');
      setFormEmail(matched.email || '');

      // Generate a clean suggested username: firstname.lastname
      if (!formUsername || !editingStaff) {
        const parts = matched.fullName.toLowerCase().replace(/[^a-z\s]/g, '').trim().split(/\s+/);
        const suggested = parts.length > 1 ? `${parts[0]}.${parts[parts.length - 1]}` : parts[0] || 'member';
        setFormUsername(suggested);
      }
    }
  };

  const resetForm = () => {
    setAssignmentType('MEMBER');
    setSelectedMemberId('');
    setFormFullName('');
    setFormUsername('');
    setFormEmail('');
    setFormPhone('');
    setFormPassword('');
    setFormRole('ACCOUNTANT');
    setFormCustomTitle('');
    setFormPermissions(DEFAULT_ROLE_PERMISSIONS['ACCOUNTANT'] || []);
    setFormStatus('ACTIVE');
    setEditingStaff(null);
  };

  const openAddModal = () => {
    resetForm();
    setShowAddModal(true);
  };

  const openEditModal = (staff: StaffMember) => {
    setEditingStaff(staff);
    setSelectedMemberId(staff.assignedMemberId || '');
    setAssignmentType(staff.assignedMemberId ? 'MEMBER' : 'CUSTOM');
    setFormFullName(staff.fullName);
    setFormUsername(staff.username);
    setFormEmail(staff.email);
    setFormPhone(staff.phone || '');
    setFormPassword(''); // blank unless changing
    setFormRole(staff.role);
    setFormCustomTitle(staff.customRoleTitle || '');
    setFormPermissions(staff.permissions || []);
    setFormStatus(staff.status);
    setShowAddModal(true);
  };

  const handleSubmitStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formFullName.trim()) {
      setError('Member / Staff name is required.');
      return;
    }
    if (!formUsername.trim()) {
      setError('Login username is required.');
      return;
    }
    if (!editingStaff && (!formPassword || formPassword.length < 4)) {
      setError('A secure password of at least 4 characters is required.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const payload = {
        fullName: formFullName.trim(),
        username: formUsername.trim().toLowerCase(),
        email: formEmail.trim().toLowerCase(),
        phone: formPhone.trim(),
        role: formRole,
        customRoleTitle: formRole === 'CUSTOM' ? formCustomTitle.trim() : (formCustomTitle.trim() || undefined),
        permissions: formPermissions,
        status: formStatus,
        password: formPassword ? formPassword.trim() : undefined,
        assignedMemberId: selectedMemberId || undefined,
      };

      if (editingStaff) {
        await ApiClient.put(`/api/church/staff/${editingStaff.id}`, payload);
        setNotice(`Role for ${payload.fullName} updated successfully.`);
      } else {
        await ApiClient.post('/api/church/staff', payload);
        setNotice(`Role "${formRole}" assigned to ${payload.fullName}. Username: "${payload.username}".`);
      }

      setShowAddModal(false);
      resetForm();
      await loadStaff();
    } catch (err: any) {
      setError(err.message || 'Failed to save staff role.');
    } finally {
      setSubmitting(false);
    }
  };

  // Dedicated In-App Role Deletion Handler (100% working, never blocked by iframe)
  const handleConfirmDeleteStaff = async () => {
    if (!staffToDelete) return;
    try {
      setIsDeletingStaff(true);
      setError(null);
      const res = await ApiClient.delete(`/api/church/staff/${staffToDelete.id}`);
      setNotice(res.message || `Assigned role for ${staffToDelete.fullName} removed.`);
      setStaffToDelete(null);
      await loadStaff();
    } catch (err: any) {
      setError(err.message || 'Failed to delete member role.');
    } finally {
      setIsDeletingStaff(false);
    }
  };

  const churchAccounts = (staffList || []).filter(s => s.isPrimaryAccount || s.accountType === 'CHURCH_ACCOUNT');
  const assignedRoles = (staffList || []).filter(s => !s.isPrimaryAccount && s.accountType !== 'CHURCH_ACCOUNT');

  const filteredStaff = (staffList || []).filter(s => {
    // 1. Account type filter
    if (accountFilter === 'CHURCH_ACCOUNT' && !s.isPrimaryAccount && s.accountType !== 'CHURCH_ACCOUNT') {
      return false;
    }
    if (accountFilter === 'ASSIGNED_MEMBER_ROLE' && (s.isPrimaryAccount || s.accountType === 'CHURCH_ACCOUNT')) {
      return false;
    }

    // 2. Search query filter
    const q = searchTerm.toLowerCase();
    return (
      s.fullName.toLowerCase().includes(q) ||
      s.username.toLowerCase().includes(q) ||
      (s.email && s.email.toLowerCase().includes(q)) ||
      (s.customRoleTitle && s.customRoleTitle.toLowerCase().includes(q)) ||
      (s.assignedMemberName && s.assignedMemberName.toLowerCase().includes(q)) ||
      s.role.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 pb-20 text-left">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-teal-950 flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-teal-700" />
            <span>Church Accounts, Member Roles & Access Control</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Differentiate the primary church account from assigned congregation roles (Accountant, Pastor, Secretary, Finance Officer, or Custom Roles).
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={loadStaff}
            disabled={loading}
            className="p-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition cursor-pointer"
            title="Refresh Staff & Role Directory"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            onClick={openAddModal}
            className="px-3.5 py-2 bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs rounded-xl shadow-xs flex items-center space-x-1.5 transition cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Assign Member Role</span>
          </button>
        </div>
      </div>

      {/* KPI Cards: Church Account vs Assigned Roles */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Church Master Account */}
        <div className="bg-gradient-to-br from-amber-500/10 via-amber-50 to-white p-4 rounded-2xl border border-amber-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider">
              Primary Church Account
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-100 border border-amber-200 text-amber-800 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-amber-950">
            {churchAccounts.length}
          </div>
          <p className="text-[11px] text-amber-800/80 mt-1">
            Master administrative login • Protected root credentials
          </p>
        </div>

        {/* Assigned Roles */}
        <div className="bg-gradient-to-br from-teal-500/10 via-teal-50 to-white p-4 rounded-2xl border border-teal-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-teal-900 uppercase tracking-wider">
              Assigned Member Roles
            </span>
            <div className="w-8 h-8 rounded-xl bg-teal-100 border border-teal-200 text-teal-800 flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-teal-950">
            {assignedRoles.length}
          </div>
          <p className="text-[11px] text-teal-800/80 mt-1">
            Roles assigned to congregation officers & staff
          </p>
        </div>

        {/* Total Accounts */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Total Authorized Users
            </span>
            <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900">
            {(staffList || []).length}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Active credentials across all administrative roles
          </p>
        </div>
      </div>

      {notice && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs rounded-xl flex items-center justify-between animate-in fade-in">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{notice}</span>
          </div>
          <button onClick={() => setNotice(null)} className="font-bold text-emerald-700 hover:underline cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-900 text-xs rounded-xl flex items-center justify-between animate-in fade-in">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="font-bold text-rose-700 hover:underline cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {/* Staff & Role Directory Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Filter and Search Bar */}
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Account Filter Tabs */}
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              type="button"
              onClick={() => setAccountFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer shrink-0 ${
                accountFilter === 'ALL'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Accounts ({(staffList || []).length})
            </button>
            <button
              type="button"
              onClick={() => setAccountFilter('CHURCH_ACCOUNT')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer shrink-0 flex items-center space-x-1 ${
                accountFilter === 'CHURCH_ACCOUNT'
                  ? 'bg-amber-700 text-white'
                  : 'bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-200'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Church Master Account ({churchAccounts.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setAccountFilter('ASSIGNED_MEMBER_ROLE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer shrink-0 flex items-center space-x-1 ${
                accountFilter === 'ASSIGNED_MEMBER_ROLE'
                  ? 'bg-teal-700 text-white'
                  : 'bg-teal-50 text-teal-900 hover:bg-teal-100 border border-teal-200'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Assigned Member Roles ({assignedRoles.length})</span>
            </button>
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search by name, role or username..."
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-teal-600 text-slate-800"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] uppercase font-semibold">
                <th className="py-3 px-4">Account Holder / Member</th>
                <th className="py-3 px-4">Account Type & Origin</th>
                <th className="py-3 px-4">Login Username</th>
                <th className="py-3 px-4">Assigned Role Designation</th>
                <th className="py-3 px-4">Permissions</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(filteredStaff || []).length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    <div className="max-w-xs mx-auto space-y-2">
                      <p className="font-semibold text-slate-600">No accounts found</p>
                      <p className="text-[11px] text-slate-400">
                        {searchTerm ? 'Try adjusting your search query.' : 'Click "Assign Member Role" to assign roles to church members.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                (filteredStaff || []).map(staff => {
                  const isPrimary = staff.isPrimaryAccount || staff.accountType === 'CHURCH_ACCOUNT';

                  return (
                    <tr
                      key={staff.id}
                      className={`hover:bg-slate-50/70 transition ${
                        isPrimary ? 'bg-amber-50/20' : ''
                      }`}
                    >
                      {/* Name & Contact */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 flex items-center space-x-1.5">
                          <span>{staff.fullName}</span>
                          {isPrimary && (
                            <span className="text-[10px] bg-amber-100 text-amber-900 px-1.5 py-0.2 rounded font-semibold border border-amber-300">
                              Primary Admin
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-2 text-[11px] text-slate-500 mt-0.5">
                          {staff.email && <span>{staff.email}</span>}
                          {staff.phone && <span>• {staff.phone}</span>}
                        </div>
                      </td>

                      {/* Account Type & Origin */}
                      <td className="py-3.5 px-4">
                        {isPrimary ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                              <Building2 className="w-3 h-3 text-amber-800" />
                              <span>Church Master Account</span>
                            </span>
                            <div className="text-[10px] text-slate-400">Master Church Credential</div>
                          </div>
                        ) : (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-900 border border-teal-300">
                              <UserCheck className="w-3 h-3 text-teal-700" />
                              <span>Member Assigned Role</span>
                            </span>
                            {staff.assignedMemberName && (
                              <div className="text-[10px] text-teal-700 font-semibold flex items-center space-x-1">
                                <span>Linked to: {staff.assignedMemberName}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Login Username */}
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-semibold text-teal-900 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
                          @{staff.username}
                        </span>
                      </td>

                      {/* Assigned Role */}
                      <td className="py-3.5 px-4">
                        <div>
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                              isPrimary
                                ? 'bg-amber-100 text-amber-900 border-amber-300'
                                : 'bg-slate-100 text-slate-800 border-slate-200'
                            }`}
                          >
                            {staff.role}
                          </span>
                          {staff.customRoleTitle && (
                            <div className="text-[11px] text-teal-700 font-medium mt-0.5">
                              {staff.customRoleTitle}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Permissions */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="flex flex-wrap gap-1">
                          {(staff.permissions || []).slice(0, 3).map(perm => (
                            <span
                              key={perm}
                              className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-medium"
                            >
                              {PERMISSION_METADATA[perm]?.label || perm}
                            </span>
                          ))}
                          {(staff.permissions || []).length > 3 && (
                            <span className="px-1.5 py-0.5 bg-teal-50 text-teal-800 rounded text-[10px] font-bold">
                              +{(staff.permissions || []).length - 3} more
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            staff.status === 'ACTIVE'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {staff.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          {/* Edit button */}
                          <button
                            type="button"
                            onClick={() => openEditModal(staff)}
                            className="p-1.5 text-slate-600 hover:text-teal-700 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                            title={isPrimary ? 'Edit Church Account' : 'Edit Member Role'}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete button: Differentiated for church account vs assigned roles */}
                          {isPrimary ? (
                            <span
                              className="p-1.5 text-slate-300 rounded-lg cursor-not-allowed"
                              title="Primary church owner account is protected and cannot be deleted."
                            >
                              <Lock className="w-3.5 h-3.5" />
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setStaffToDelete(staff)}
                              className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                              title="Revoke & Delete Member Role"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* =================================================================== */}
      {/* IN-APP DELETE MEMBER ROLE CONFIRMATION MODAL                        */}
      {/* =================================================================== */}
      {staffToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden text-xs text-left animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 bg-rose-50 border-b border-rose-100 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-rose-950">Delete Member Role</h3>
                  <p className="text-[11px] text-rose-600">Revoke permissions and remove assigned role</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setStaffToDelete(null)}
                disabled={isDeletingStaff}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-3">
              <p className="text-slate-700 leading-relaxed text-xs">
                Are you sure you want to revoke the role and delete the credentials for{' '}
                <strong className="text-slate-900 font-bold">{staffToDelete.fullName}</strong>{' '}
                (<span className="font-mono text-teal-800">@{staffToDelete.username}</span>)?
              </p>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between text-slate-600">
                  <span className="font-medium">Assigned Role:</span>
                  <span className="font-bold text-teal-900 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                    {staffToDelete.customRoleTitle || staffToDelete.role}
                  </span>
                </div>
                {staffToDelete.assignedMemberName && (
                  <div className="flex items-center justify-between text-slate-600">
                    <span className="font-medium">Linked Member:</span>
                    <span className="font-semibold text-slate-800">{staffToDelete.assignedMemberName}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-slate-600">
                  <span className="font-medium">Authorized Modules:</span>
                  <span className="font-semibold text-slate-800">{staffToDelete.permissions?.length || 0} modules</span>
                </div>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-[11px]">
                <strong>Notice:</strong> Revoking this role will immediately disable login credentials and revoke module privileges. If this role was assigned to an existing church member, their profile remains safe in the congregation directory.
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setStaffToDelete(null)}
                disabled={isDeletingStaff}
                className="px-4 py-2 text-slate-600 font-semibold hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteStaff}
                disabled={isDeletingStaff}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-xs transition flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
              >
                {isDeletingStaff ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Deleting Role...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Yes, Delete Role</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* ADD / EDIT STAFF MEMBER & ROLE MODAL                                */}
      {/* =================================================================== */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full overflow-hidden text-xs text-left animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
            <div className="p-5 bg-teal-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-800 flex items-center justify-center text-teal-200">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">
                    {editingStaff ? `Edit Role: ${editingStaff.fullName}` : 'Assign Church Role / Add Staff Member'}
                  </h3>
                  <p className="text-[11px] text-teal-200">
                    Assign role, login credentials, and isolated module permissions
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                disabled={submitting}
                className="text-teal-200 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitStaff} className="p-5 space-y-4 overflow-y-auto flex-1">
              {/* Member Selection Mode (Only when adding) */}
              {!editingStaff && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <label className="block font-bold text-slate-800 text-xs">Assignment Target</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setAssignmentType('MEMBER')}
                      className={`p-2.5 rounded-xl border font-bold text-xs flex items-center justify-center space-x-1.5 transition cursor-pointer ${
                        assignmentType === 'MEMBER'
                          ? 'bg-teal-700 text-white border-teal-700 shadow-2xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Congregation Member</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAssignmentType('CUSTOM');
                        setSelectedMemberId('');
                      }}
                      className={`p-2.5 rounded-xl border font-bold text-xs flex items-center justify-center space-x-1.5 transition cursor-pointer ${
                        assignmentType === 'CUSTOM'
                          ? 'bg-teal-700 text-white border-teal-700 shadow-2xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Direct Staff User</span>
                    </button>
                  </div>

                  {assignmentType === 'MEMBER' && (
                    <div className="pt-2">
                      <label className="block font-bold text-teal-950 mb-1">
                        Select Congregation Member *
                      </label>
                      <select
                        value={selectedMemberId}
                        onChange={e => handleMemberSelect(e.target.value)}
                        className="w-full px-3 py-2 border border-teal-300 rounded-xl bg-white text-slate-900 font-medium focus:ring-2 focus:ring-teal-600 focus:outline-none"
                      >
                        <option value="">-- Choose Member from Directory --</option>
                        {congregationMembers.map(m => (
                          <option key={m.id} value={m.id}>
                            {m.fullName} ({m.memberCode}) {m.phone ? `• ${m.phone}` : ''}
                          </option>
                        ))}
                      </select>
                      <p className="text-[10px] text-slate-500 mt-1">
                        Selecting a member automatically populates their contact details and links the assigned role to their church profile.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Personal Identification */}
              <div className="space-y-3">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider text-teal-900 border-b border-slate-100 pb-1">
                  1. Profile Information
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Full Name *</label>
                    <input
                      type="text"
                      required
                      value={formFullName}
                      onChange={e => setFormFullName(e.target.value)}
                      placeholder="e.g. Deaconess Mary Annan"
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-1 focus:ring-teal-700 text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Phone Number</label>
                    <input
                      type="text"
                      value={formPhone}
                      onChange={e => setFormPhone(e.target.value)}
                      placeholder="024XXXXXXX"
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-1 focus:ring-teal-700 text-slate-900"
                    />
                  </div>
                </div>
              </div>

              {/* Login Credentials */}
              <div className="space-y-3">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider text-teal-900 border-b border-slate-100 pb-1">
                  2. Role Login Credentials
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Username (for sign-in) *</label>
                    <input
                      type="text"
                      required
                      disabled={!!editingStaff}
                      value={formUsername}
                      onChange={e => setFormUsername(e.target.value)}
                      placeholder="e.g. mary.annan"
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-1 focus:ring-teal-700 text-slate-900 disabled:bg-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      {editingStaff ? 'New Password (leave blank to keep current)' : 'Login Password *'}
                    </label>
                    <input
                      type="password"
                      required={!editingStaff}
                      value={formPassword}
                      onChange={e => setFormPassword(e.target.value)}
                      placeholder="At least 4 characters"
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-1 focus:ring-teal-700 text-slate-900"
                    />
                  </div>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Official Email Address</label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={e => setFormEmail(e.target.value)}
                    placeholder="e.g. mary@accracentralchurch.org"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-1 focus:ring-teal-700 text-slate-900"
                  />
                </div>
              </div>

              {/* Role Selection */}
              <div className="space-y-3">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider text-teal-900 border-b border-slate-100 pb-1">
                  3. Assigned Role & Custom Title
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Assigned Role Designation *</label>
                    <select
                      value={formRole}
                      onChange={e => handleRoleChange(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white focus:ring-1 focus:ring-teal-700 text-slate-900"
                    >
                      {STANDARD_ROLES.map(r => (
                        <option key={r.role} value={r.role}>
                          {r.label} - {r.description.slice(0, 45)}...
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Custom Role Title {formRole === 'CUSTOM' ? '*' : '(Optional)'}
                    </label>
                    <input
                      type="text"
                      required={formRole === 'CUSTOM'}
                      value={formCustomTitle}
                      onChange={e => setFormCustomTitle(e.target.value)}
                      placeholder="e.g. Senior Accountant / Head of Finance"
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-1 focus:ring-teal-700 text-slate-900"
                    />
                  </div>
                </div>
              </div>

              {/* Permissions Checklist */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-1">
                  <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider text-teal-900">
                    4. Module Permissions
                  </h4>
                  <div className="space-x-2">
                    <button
                      type="button"
                      onClick={() => setFormPermissions([...ALL_CHURCH_PERMISSIONS])}
                      className="text-[11px] text-teal-700 font-bold hover:underline cursor-pointer"
                    >
                      Select All
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={() => setFormPermissions(['view_dashboard'])}
                      className="text-[11px] text-slate-500 font-bold hover:underline cursor-pointer"
                    >
                      Reset to Default
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  {ALL_CHURCH_PERMISSIONS.map(perm => {
                    const isChecked = formPermissions.includes(perm);
                    const meta = PERMISSION_METADATA[perm];
                    return (
                      <label
                        key={perm}
                        className={`flex items-start space-x-2 p-2 rounded-lg cursor-pointer border transition ${
                          isChecked
                            ? 'bg-teal-50/90 border-teal-200 text-teal-950 font-medium'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100/60'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => togglePermission(perm)}
                          className="mt-0.5 rounded text-teal-700 focus:ring-teal-600 cursor-pointer"
                        />
                        <div>
                          <span className="text-xs block font-semibold">{meta?.label || perm}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{perm}</span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Account Status</label>
                <select
                  value={formStatus}
                  onChange={e => setFormStatus(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-slate-900"
                >
                  <option value="ACTIVE">ACTIVE (Authorized to log in)</option>
                  <option value="SUSPENDED">SUSPENDED (Access blocked)</option>
                </select>
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  disabled={submitting}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl font-bold flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? (
                    <span>Saving...</span>
                  ) : (
                    <span>{editingStaff ? 'Save Changes' : 'Assign Member Role'}</span>
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
