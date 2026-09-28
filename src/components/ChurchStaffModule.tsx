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
  Shield,
  RefreshCw,
  Building2,
  UserCheck,
  Users,
  KeyRound,
  Plus,
  Eye,
  Check,
  CheckSquare,
  Square,
  FileText,
  Sliders,
  UserX,
  Layers,
  Sparkles,
} from 'lucide-react';
import { ApiClient } from '../api';
import {
  Church,
  CustomRole,
  PredefinedRoleDefinition,
  PREDEFINED_ROLES,
  PERMISSION_CATEGORIES_CATALOG,
  getCombinedPermissionsForRoles,
} from '../types';
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
  role: string;
  roles?: string[];
  customRoleTitle?: string;
  assignedMemberId?: string;
  assignedMemberName?: string;
  isPrimaryAccount?: boolean;
  isAssignedRole?: boolean;
  accountType?: 'CHURCH_ACCOUNT' | 'ASSIGNED_MEMBER_ROLE';
  permissions: string[];
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

interface AuditLogEntry {
  id: string;
  churchId: string;
  userId: string;
  userName: string;
  action: string;
  details: string;
  timestamp: string;
}

export const ChurchStaffModule: React.FC<Props> = ({ church }) => {
  // Navigation Tabs: 'staff' | 'custom_roles' | 'audit_logs'
  const [activeTab, setActiveTab] = useState<'staff' | 'custom_roles' | 'audit_logs'>('staff');

  // Main data states
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [customRoles, setCustomRoles] = useState<CustomRole[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [congregationMembers, setCongregationMembers] = useState<ChurchMemberOption[]>([]);

  // Loading & Filter states
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [accountFilter, setAccountFilter] = useState<'ALL' | 'CHURCH_ACCOUNT' | 'ASSIGNED_MEMBER_ROLE'>('ALL');
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  useAutoDismissNotification(notice, setNotice, 4000);
  useAutoDismissNotification(error, setError, 5000);

  // Staff Modal States
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [submittingStaff, setSubmittingStaff] = useState(false);

  // Staff Form State
  const [assignmentType, setAssignmentType] = useState<'MEMBER' | 'CUSTOM'>('MEMBER');
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [formFullName, setFormFullName] = useState('');
  const [formUsername, setFormUsername] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formStatus, setFormStatus] = useState<'ACTIVE' | 'SUSPENDED'>('ACTIVE');
  const [formSelectedRoles, setFormSelectedRoles] = useState<string[]>(['Viewer/Read Only']);
  const [formCustomRoleTitle, setFormCustomRoleTitle] = useState('');

  // Delete Staff Modal State
  const [staffToDelete, setStaffToDelete] = useState<StaffMember | null>(null);
  const [isDeletingStaff, setIsDeletingStaff] = useState(false);

  // View Permissions Modal State
  const [viewingPermissionsStaff, setViewingPermissionsStaff] = useState<StaffMember | null>(null);

  // Custom Role Modal States
  const [showCustomRoleModal, setShowCustomRoleModal] = useState(false);
  const [editingCustomRole, setEditingCustomRole] = useState<CustomRole | null>(null);
  const [submittingCustomRole, setSubmittingCustomRole] = useState(false);
  const [customRoleToDelete, setCustomRoleToDelete] = useState<CustomRole | null>(null);
  const [isDeletingCustomRole, setIsDeletingCustomRole] = useState(false);

  // Custom Role Form State
  const [customRoleName, setCustomRoleName] = useState('');
  const [customRoleDescription, setCustomRoleDescription] = useState('');
  const [customRolePermissions, setCustomRolePermissions] = useState<string[]>([]);

  // Load all church staff
  const loadStaff = async () => {
    try {
      const res = await ApiClient.get('/api/church/staff');
      setStaffList(Array.isArray(res) ? res : []);
    } catch (err: any) {
      setError(err.message || 'Failed to load church staff.');
    }
  };

  // Load church custom roles
  const loadCustomRoles = async () => {
    try {
      const res = await ApiClient.get('/api/church/custom-roles');
      setCustomRoles(Array.isArray(res) ? res : []);
    } catch (err: any) {
      // Non-blocking if permissions restricted
    }
  };

  // Load audit logs
  const loadAuditLogs = async () => {
    try {
      const res = await ApiClient.get('/api/church/audit-logs');
      setAuditLogs(Array.isArray(res) ? res : []);
    } catch {
      // Non-blocking if permissions restricted
    }
  };

  // Load congregation members for linkage
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
      // Non-blocking
    }
  };

  const loadAllData = async () => {
    setLoading(true);
    await Promise.all([loadStaff(), loadCustomRoles(), loadAuditLogs(), loadMembers()]);
    setLoading(false);
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Compute live effective permissions preview for staff modal
  const customRolesMap: Record<string, string[]> = {};
  for (const cr of customRoles) {
    customRolesMap[cr.id] = cr.permissions;
    customRolesMap[cr.name] = cr.permissions;
  }
  const previewEffectivePermissions = getCombinedPermissionsForRoles(formSelectedRoles, customRolesMap);

  // Toggle role in staff form
  const toggleRoleSelection = (roleIdentifier: string) => {
    setFormSelectedRoles(prev => {
      const exists = prev.includes(roleIdentifier);
      if (exists) {
        const next = prev.filter(r => r !== roleIdentifier);
        return next.length > 0 ? next : ['Viewer/Read Only'];
      } else {
        return [...prev.filter(r => r !== 'Viewer/Read Only' || roleIdentifier === 'Viewer/Read Only'), roleIdentifier];
      }
    });
  };

  // Handle member dropdown selection
  const handleMemberSelect = (memberId: string) => {
    setSelectedMemberId(memberId);
    if (!memberId) return;

    const matched = congregationMembers.find(m => m.id === memberId);
    if (matched) {
      setFormFullName(matched.fullName);
      setFormPhone(matched.phone || '');
      setFormEmail(matched.email || '');

      if (!formUsername || !editingStaff) {
        const parts = matched.fullName.toLowerCase().replace(/[^a-z\s]/g, '').trim().split(/\s+/);
        const suggested = parts.length > 1 ? `${parts[0]}.${parts[parts.length - 1]}` : parts[0] || 'staff';
        setFormUsername(suggested);
      }
    }
  };

  // Reset staff form
  const resetStaffForm = () => {
    setAssignmentType('MEMBER');
    setSelectedMemberId('');
    setFormFullName('');
    setFormUsername('');
    setFormEmail('');
    setFormPhone('');
    setFormPassword('');
    setFormStatus('ACTIVE');
    setFormSelectedRoles(['Viewer/Read Only']);
    setFormCustomRoleTitle('');
    setEditingStaff(null);
  };

  const openAddStaffModal = () => {
    resetStaffForm();
    setShowStaffModal(true);
  };

  const openEditStaffModal = (staff: StaffMember) => {
    setEditingStaff(staff);
    setSelectedMemberId(staff.assignedMemberId || '');
    setAssignmentType(staff.assignedMemberId ? 'MEMBER' : 'CUSTOM');
    setFormFullName(staff.fullName);
    setFormUsername(staff.username);
    setFormEmail(staff.email);
    setFormPhone(staff.phone || '');
    setFormPassword(''); // blank unless updating
    setFormStatus(staff.status);

    const initialRoles = Array.isArray(staff.roles) && staff.roles.length > 0
      ? staff.roles
      : (staff.role ? staff.role.split(',').map(s => s.trim()).filter(Boolean) : ['Viewer/Read Only']);
    setFormSelectedRoles(initialRoles);
    setFormCustomRoleTitle(staff.customRoleTitle || '');
    setShowStaffModal(true);
  };

  // Submit Staff Member & Roles
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
      setError('A secure login password of at least 4 characters is required.');
      return;
    }
    if (formSelectedRoles.length === 0) {
      setError('At least one role must be selected.');
      return;
    }

    try {
      setSubmittingStaff(true);
      setError(null);

      const payload = {
        fullName: formFullName.trim(),
        username: formUsername.trim().toLowerCase(),
        email: formEmail.trim().toLowerCase(),
        phone: formPhone.trim(),
        role: formSelectedRoles.join(', '),
        roles: formSelectedRoles,
        customRoleTitle: formCustomRoleTitle.trim() || undefined,
        status: formStatus,
        password: formPassword ? formPassword.trim() : undefined,
        assignedMemberId: selectedMemberId || undefined,
      };

      if (editingStaff) {
        await ApiClient.put(`/api/church/staff/${editingStaff.id}`, payload);
        setNotice(`Roles for ${payload.fullName} updated successfully. Effective permissions updated immediately.`);
      } else {
        await ApiClient.post('/api/church/staff', payload);
        setNotice(`Roles [${formSelectedRoles.join(', ')}] assigned to ${payload.fullName}. Username: "${payload.username}".`);
      }

      setShowStaffModal(false);
      resetStaffForm();
      await loadStaff();
      await loadAuditLogs();
    } catch (err: any) {
      setError(err.message || 'Failed to save staff roles.');
    } finally {
      setSubmittingStaff(false);
    }
  };

  // Toggle Staff Account Status (Enable / Disable)
  const handleToggleStaffStatus = async (staff: StaffMember) => {
    try {
      const newStatus = staff.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
      await ApiClient.put(`/api/church/staff/${staff.id}`, { status: newStatus });
      setNotice(`Account for ${staff.fullName} is now ${newStatus === 'ACTIVE' ? 'Enabled' : 'Disabled'}.`);
      await loadStaff();
      await loadAuditLogs();
    } catch (err: any) {
      setError(err.message || 'Failed to update account status.');
    }
  };

  // Delete Staff Member / Role Assignment
  const handleConfirmDeleteStaff = async () => {
    if (!staffToDelete) return;
    try {
      setIsDeletingStaff(true);
      setError(null);
      const res = await ApiClient.delete(`/api/church/staff/${staffToDelete.id}`);
      setNotice(res.message || `Assigned roles for ${staffToDelete.fullName} removed.`);
      setStaffToDelete(null);
      await loadStaff();
      await loadAuditLogs();
    } catch (err: any) {
      setError(err.message || 'Failed to delete member role.');
    } finally {
      setIsDeletingStaff(false);
    }
  };

  // Open Create Custom Role Modal
  const openCreateCustomRoleModal = () => {
    setEditingCustomRole(null);
    setCustomRoleName('');
    setCustomRoleDescription('');
    setCustomRolePermissions(['dashboard:view']);
    setShowCustomRoleModal(true);
  };

  // Open Edit Custom Role Modal
  const openEditCustomRoleModal = (cr: CustomRole) => {
    setEditingCustomRole(cr);
    setCustomRoleName(cr.name);
    setCustomRoleDescription(cr.description || '');
    setCustomRolePermissions(cr.permissions || []);
    setShowCustomRoleModal(true);
  };

  // Toggle individual permission in custom role form
  const toggleCustomRolePermission = (perm: string) => {
    setCustomRolePermissions(prev =>
      prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm]
    );
  };

  // Toggle all permissions for an entire category
  const toggleCategoryPermissions = (categoryPerms: string[]) => {
    const allSelected = categoryPerms.every(p => customRolePermissions.includes(p));
    if (allSelected) {
      setCustomRolePermissions(prev => prev.filter(p => !categoryPerms.includes(p)));
    } else {
      setCustomRolePermissions(prev => Array.from(new Set([...prev, ...categoryPerms])));
    }
  };

  // Submit Create / Edit Custom Role
  const handleSubmitCustomRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customRoleName.trim()) {
      setError('Custom role name is required.');
      return;
    }
    if (customRolePermissions.length === 0) {
      setError('At least one permission must be selected for the custom role.');
      return;
    }

    try {
      setSubmittingCustomRole(true);
      setError(null);

      const payload = {
        name: customRoleName.trim(),
        description: customRoleDescription.trim(),
        permissions: customRolePermissions,
      };

      if (editingCustomRole) {
        await ApiClient.put(`/api/church/custom-roles/${editingCustomRole.id}`, payload);
        setNotice(`Custom role "${payload.name}" updated successfully. Permissions refreshed immediately for assigned staff.`);
      } else {
        await ApiClient.post('/api/church/custom-roles', payload);
        setNotice(`Custom role "${payload.name}" created with ${customRolePermissions.length} permissions.`);
      }

      setShowCustomRoleModal(false);
      await loadCustomRoles();
      await loadStaff();
      await loadAuditLogs();
    } catch (err: any) {
      setError(err.message || 'Failed to save custom role.');
    } finally {
      setSubmittingCustomRole(false);
    }
  };

  // Delete Custom Role
  const handleConfirmDeleteCustomRole = async () => {
    if (!customRoleToDelete) return;
    try {
      setIsDeletingCustomRole(true);
      setError(null);
      await ApiClient.delete(`/api/church/custom-roles/${customRoleToDelete.id}`);
      setNotice(`Custom role "${customRoleToDelete.name}" deleted and revoked from all assigned accounts.`);
      setCustomRoleToDelete(null);
      await loadCustomRoles();
      await loadStaff();
      await loadAuditLogs();
    } catch (err: any) {
      setError(err.message || 'Failed to delete custom role.');
    } finally {
      setIsDeletingCustomRole(false);
    }
  };

  // Filtered staff list
  const churchAccounts = (staffList || []).filter(s => s.isPrimaryAccount || s.accountType === 'CHURCH_ACCOUNT');
  const assignedRoles = (staffList || []).filter(s => !s.isPrimaryAccount && s.accountType !== 'CHURCH_ACCOUNT');

  const filteredStaff = (staffList || []).filter(s => {
    if (accountFilter === 'CHURCH_ACCOUNT' && !s.isPrimaryAccount && s.accountType !== 'CHURCH_ACCOUNT') {
      return false;
    }
    if (accountFilter === 'ASSIGNED_MEMBER_ROLE' && (s.isPrimaryAccount || s.accountType === 'CHURCH_ACCOUNT')) {
      return false;
    }
    const q = searchTerm.toLowerCase();
    const rolesStr = (s.roles || [s.role]).join(' ').toLowerCase();
    return (
      s.fullName.toLowerCase().includes(q) ||
      s.username.toLowerCase().includes(q) ||
      (s.email && s.email.toLowerCase().includes(q)) ||
      (s.customRoleTitle && s.customRoleTitle.toLowerCase().includes(q)) ||
      (s.assignedMemberName && s.assignedMemberName.toLowerCase().includes(q)) ||
      rolesStr.includes(q)
    );
  });

  return (
    <div className="space-y-6 pb-20 text-left">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-teal-950 flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-teal-700" />
            <span>Church Staff Roles, Custom Roles & Strict Permissions</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure predefined roles, create granular custom roles, and enforce strict zero-trust permissions.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={loadAllData}
            disabled={loading}
            className="p-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition cursor-pointer"
            title="Refresh Directory"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            onClick={openCreateCustomRoleModal}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl shadow-xs flex items-center space-x-1.5 transition cursor-pointer border border-slate-200"
          >
            <Sliders className="w-4 h-4 text-teal-700" />
            <span>Create Custom Role</span>
          </button>

          <button
            type="button"
            onClick={openAddStaffModal}
            className="px-3.5 py-2 bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs rounded-xl shadow-xs flex items-center space-x-1.5 transition cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Assign Staff Roles</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-amber-500/10 via-amber-50 to-white p-4 rounded-2xl border border-amber-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider">
              Primary Account
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-100 border border-amber-200 text-amber-800 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-amber-950">
            {churchAccounts.length}
          </div>
          <p className="text-[11px] text-amber-800/80 mt-1">
            Protected root church owner
          </p>
        </div>

        <div className="bg-gradient-to-br from-teal-500/10 via-teal-50 to-white p-4 rounded-2xl border border-teal-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-teal-900 uppercase tracking-wider">
              Assigned Staff Roles
            </span>
            <div className="w-8 h-8 rounded-xl bg-teal-100 border border-teal-200 text-teal-800 flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-teal-950">
            {assignedRoles.length}
          </div>
          <p className="text-[11px] text-teal-800/80 mt-1">
            Active congregation role holders
          </p>
        </div>

        <div className="bg-gradient-to-br from-purple-500/10 via-purple-50 to-white p-4 rounded-2xl border border-purple-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-purple-900 uppercase tracking-wider">
              Custom Church Roles
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-100 border border-purple-200 text-purple-800 flex items-center justify-center">
              <Sliders className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-purple-950">
            {customRoles.length}
          </div>
          <p className="text-[11px] text-purple-800/80 mt-1">
            Created by this church organization
          </p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Predefined Roles
            </span>
            <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
              <Shield className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900">
            {PREDEFINED_ROLES.length}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            15 built-in standardized roles
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

      {/* Main Tabs Navigation */}
      <div className="flex items-center space-x-2 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab('staff')}
          className={`pb-3 px-3 text-xs font-bold transition flex items-center space-x-2 border-b-2 cursor-pointer ${
            activeTab === 'staff'
              ? 'border-teal-700 text-teal-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Staff & Role Assignments ({(staffList || []).length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('custom_roles')}
          className={`pb-3 px-3 text-xs font-bold transition flex items-center space-x-2 border-b-2 cursor-pointer ${
            activeTab === 'custom_roles'
              ? 'border-teal-700 text-teal-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Custom Roles ({customRoles.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('audit_logs')}
          className={`pb-3 px-3 text-xs font-bold transition flex items-center space-x-2 border-b-2 cursor-pointer ${
            activeTab === 'audit_logs'
              ? 'border-teal-700 text-teal-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Security Audit Trail ({auditLogs.length})</span>
        </button>
      </div>

      {/* TAB 1: STAFF DIRECTORY */}
      {activeTab === 'staff' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {/* Filter and Search Bar */}
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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
                <span>Primary Account ({churchAccounts.length})</span>
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
                <span>Assigned Roles ({assignedRoles.length})</span>
              </button>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search staff, roles or username..."
                className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-teal-600 text-slate-800"
              />
            </div>
          </div>

          {/* Staff Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] uppercase font-semibold">
                  <th className="py-3 px-4">Staff Member</th>
                  <th className="py-3 px-4">Login Username</th>
                  <th className="py-3 px-4">Assigned Roles</th>
                  <th className="py-3 px-4">Effective Permissions</th>
                  <th className="py-3 px-4">Account Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(filteredStaff || []).length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-slate-400">
                      <div className="max-w-xs mx-auto space-y-2">
                        <p className="font-semibold text-slate-600">No staff accounts found</p>
                        <p className="text-[11px] text-slate-400">
                          {searchTerm ? 'Try adjusting your search query.' : 'Click "Assign Staff Roles" to assign roles to staff members.'}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  (filteredStaff || []).map(staff => {
                    const isPrimary = staff.isPrimaryAccount || staff.accountType === 'CHURCH_ACCOUNT';
                    const rolesArray = staff.roles && staff.roles.length > 0
                      ? staff.roles
                      : (staff.role ? staff.role.split(',').map(s => s.trim()) : ['Viewer/Read Only']);

                    return (
                      <tr
                        key={staff.id}
                        className={`hover:bg-slate-50/70 transition ${
                          isPrimary ? 'bg-amber-50/20' : ''
                        }`}
                      >
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900 flex items-center space-x-1.5">
                            <span>{staff.fullName}</span>
                            {isPrimary && (
                              <span className="text-[10px] bg-amber-100 text-amber-900 px-1.5 py-0.2 rounded font-semibold border border-amber-300">
                                Primary Owner
                              </span>
                            )}
                          </div>
                          <div className="flex items-center space-x-2 text-[11px] text-slate-500 mt-0.5">
                            {staff.email && <span>{staff.email}</span>}
                            {staff.phone && <span>• {staff.phone}</span>}
                            {staff.assignedMemberName && (
                              <span className="text-teal-700 font-medium">• Member: {staff.assignedMemberName}</span>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="font-mono font-semibold text-teal-900 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
                            @{staff.username}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {rolesArray.map(r => {
                              const isCustom = customRoles.some(cr => cr.name === r || cr.id === r);
                              return (
                                <span
                                  key={r}
                                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                    isCustom
                                      ? 'bg-purple-50 text-purple-800 border-purple-200'
                                      : isPrimary
                                      ? 'bg-amber-100 text-amber-900 border-amber-300'
                                      : 'bg-teal-50 text-teal-800 border-teal-200'
                                  }`}
                                >
                                  {isCustom && <Sliders className="w-2.5 h-2.5 mr-1" />}
                                  {r}
                                </span>
                              );
                            })}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <button
                            type="button"
                            onClick={() => setViewingPermissionsStaff(staff)}
                            className="inline-flex items-center space-x-1.5 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-semibold transition cursor-pointer"
                            title="View all live authorized permissions"
                          >
                            <ShieldCheck className="w-3.5 h-3.5 text-teal-700" />
                            <span>{staff.permissions?.length || 0} permissions</span>
                            <Eye className="w-3 h-3 text-slate-400" />
                          </button>
                        </td>

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

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            {/* Enable/Disable button */}
                            {!isPrimary && (
                              <button
                                type="button"
                                onClick={() => handleToggleStaffStatus(staff)}
                                className={`p-1.5 rounded-lg transition cursor-pointer ${
                                  staff.status === 'ACTIVE'
                                    ? 'text-amber-600 hover:bg-amber-50'
                                    : 'text-emerald-600 hover:bg-emerald-50'
                                }`}
                                title={staff.status === 'ACTIVE' ? 'Disable Account' : 'Enable Account'}
                              >
                                {staff.status === 'ACTIVE' ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                              </button>
                            )}

                            {/* Edit button */}
                            <button
                              type="button"
                              onClick={() => openEditStaffModal(staff)}
                              className="p-1.5 text-slate-600 hover:text-teal-700 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                              title="Edit Assigned Roles"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete button */}
                            {isPrimary ? (
                              <span
                                className="p-1.5 text-slate-300 rounded-lg cursor-not-allowed"
                                title="Primary church owner account is protected."
                              >
                                <Lock className="w-3.5 h-3.5" />
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setStaffToDelete(staff)}
                                className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                                title="Revoke Roles & Remove Staff"
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
      )}

      {/* TAB 2: CUSTOM ROLES MANAGEMENT */}
      {activeTab === 'custom_roles' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-slate-900">Custom Church Roles</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Create granular roles with custom-selected permissions for your specific church auxiliary needs.
              </p>
            </div>
            <button
              type="button"
              onClick={openCreateCustomRoleModal}
              className="px-3.5 py-2 bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs rounded-xl shadow-xs flex items-center space-x-1.5 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create Custom Role</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {customRoles.length === 0 ? (
              <div className="col-span-full bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-400">
                <Sliders className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                <p className="font-bold text-slate-700">No Custom Roles Created Yet</p>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  Click "Create Custom Role" above to create roles like "Finance Assistant", "Media Coordinator", or "Choir Secretary".
                </p>
              </div>
            ) : (
              customRoles.map(cr => (
                <div
                  key={cr.id}
                  className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between hover:border-teal-300 transition"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center">
                          <Sliders className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-slate-900">{cr.name}</h4>
                          <span className="text-[10px] text-purple-700 font-semibold bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                            Custom Role
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-1">
                        <button
                          type="button"
                          onClick={() => openEditCustomRoleModal(cr)}
                          className="p-1.5 text-slate-500 hover:text-teal-700 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                          title="Edit Custom Role"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setCustomRoleToDelete(cr)}
                          className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                          title="Delete Custom Role"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 line-clamp-2">
                      {cr.description || 'No description provided.'}
                    </p>

                    <div className="pt-2 border-t border-slate-100 space-y-1.5">
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>Selected Permissions:</span>
                        <span className="font-bold text-teal-800">{cr.permissions?.length || 0} permissions</span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>Assigned Staff:</span>
                        <span className="font-bold text-slate-800">{cr.assignedStaffCount || 0} user(s)</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1 pt-1">
                      {(cr.permissions || []).slice(0, 4).map(p => (
                        <span key={p} className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-mono">
                          {p}
                        </span>
                      ))}
                      {(cr.permissions || []).length > 4 && (
                        <span className="text-[10px] bg-teal-50 text-teal-800 font-bold px-1.5 py-0.5 rounded">
                          +{(cr.permissions || []).length - 4} more
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                    <span>Created: {new Date(cr.createdAt).toLocaleDateString()}</span>
                    <span>By: {cr.createdBy || 'Administrator'}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 3: AUDIT TRAIL */}
      {activeTab === 'audit_logs' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-slate-900">Security Audit Trail</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Immutable chronological log of role assignments, permission modifications, and account status updates.
              </p>
            </div>
            <button
              type="button"
              onClick={loadAuditLogs}
              className="p-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] uppercase font-semibold">
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Performed By</th>
                  <th className="py-3 px-4">Security Details & Audit Summary</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-10 text-center text-slate-400">
                      No audit events recorded yet.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map(log => (
                    <tr key={log.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-500 shrink-0 whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        {log.userName}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {log.details}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL: ASSIGN ROLES / ADD OR EDIT STAFF MEMBER                      */}
      {/* =================================================================== */}
      {showStaffModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden text-xs text-left animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
            <div className="p-5 bg-teal-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-800 flex items-center justify-center text-teal-200">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">
                    {editingStaff ? `Edit Roles: ${editingStaff.fullName}` : 'Assign Church Staff Roles'}
                  </h3>
                  <p className="text-[11px] text-teal-200">
                    Assign predefined & custom roles. Permissions take effect immediately upon saving.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowStaffModal(false)}
                disabled={submittingStaff}
                className="text-teal-200 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitStaff} className="p-5 space-y-4 overflow-y-auto flex-1">
              {/* Member Selection Mode (Only when adding new staff) */}
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
                    </div>
                  )}
                </div>
              )}

              {/* Personal Info */}
              <div className="space-y-3">
                <h4 className="font-bold text-xs uppercase tracking-wider text-teal-900 border-b border-slate-100 pb-1">
                  1. Staff Information
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
                <h4 className="font-bold text-xs uppercase tracking-wider text-teal-900 border-b border-slate-100 pb-1">
                  2. Login Credentials
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
                    placeholder="e.g. mary@church.org"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-1 focus:ring-teal-700 text-slate-900"
                  />
                </div>
              </div>

              {/* ASSIGNED ROLES SELECTION (Requirements 1, 2, 3, 9) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-1">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-teal-900">
                    3. Select Assigned Roles (Multiple Allowed)
                  </h4>
                  <span className="text-[11px] font-bold text-teal-700">
                    {formSelectedRoles.length} role(s) selected
                  </span>
                </div>

                <p className="text-[11px] text-slate-500">
                  Select one or more roles. The staff member will receive the exact combined permissions of all selected roles.
                </p>

                {/* Predefined Roles */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-700 uppercase">Predefined Roles (15 Standard Roles)</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1 bg-slate-50 rounded-xl border border-slate-200">
                    {PREDEFINED_ROLES.map(role => {
                      const isChecked = formSelectedRoles.includes(role.name) || formSelectedRoles.includes(role.label);
                      return (
                        <label
                          key={role.key}
                          className={`flex items-start space-x-2 p-2 rounded-lg cursor-pointer border transition text-left ${
                            isChecked
                              ? 'bg-teal-50 border-teal-300 text-teal-950 font-medium'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleRoleSelection(role.name)}
                            className="mt-0.5 rounded text-teal-700 focus:ring-teal-600 cursor-pointer"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-xs">{role.label}</span>
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-200/80 text-slate-600">
                                {role.category}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">
                              {role.description}
                            </p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Custom Roles if any */}
                {customRoles.length > 0 && (
                  <div className="space-y-1.5 pt-2">
                    <span className="text-[11px] font-bold text-purple-900 uppercase">Church Custom Roles</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-1 bg-purple-50/50 rounded-xl border border-purple-200">
                      {customRoles.map(cr => {
                        const isChecked = formSelectedRoles.includes(cr.name) || formSelectedRoles.includes(cr.id);
                        return (
                          <label
                            key={cr.id}
                            className={`flex items-start space-x-2 p-2 rounded-lg cursor-pointer border transition text-left ${
                              isChecked
                                ? 'bg-purple-100 border-purple-400 text-purple-950 font-medium'
                                : 'bg-white border-purple-200 text-slate-700 hover:bg-purple-50'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleRoleSelection(cr.name)}
                              className="mt-0.5 rounded text-purple-700 focus:ring-purple-600 cursor-pointer"
                            />
                            <div className="flex-1 min-w-0">
                              <span className="font-bold text-xs text-purple-950">{cr.name}</span>
                              <p className="text-[10px] text-purple-700 line-clamp-1 mt-0.5">
                                {cr.description || `${cr.permissions?.length || 0} permissions`}
                              </p>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* LIVE EFFECTIVE PERMISSIONS PREVIEW (Requirements 7, 9) */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-800 flex items-center space-x-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-teal-700" />
                    <span>Effective Permissions Preview ({previewEffectivePermissions.length} granted)</span>
                  </span>
                  <span className="text-[10px] text-teal-700 font-semibold bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                    Live Calculation
                  </span>
                </div>

                <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto p-1">
                  {previewEffectivePermissions.slice(0, 15).map(perm => (
                    <span
                      key={perm}
                      className="px-1.5 py-0.5 bg-white border border-slate-200 text-slate-700 rounded text-[10px] font-mono"
                    >
                      {perm}
                    </span>
                  ))}
                  {previewEffectivePermissions.length > 15 && (
                    <span className="px-1.5 py-0.5 bg-teal-100 text-teal-900 rounded text-[10px] font-bold">
                      +{previewEffectivePermissions.length - 15} more permissions
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 italic">
                  * ONLY permissions granted through the staff member's currently assigned roles are allowed. Everything else is strictly denied.
                </p>
              </div>

              {/* Account Status */}
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
                  onClick={() => setShowStaffModal(false)}
                  disabled={submittingStaff}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingStaff}
                  className="px-5 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl font-bold flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                >
                  {submittingStaff ? (
                    <span>Saving Roles...</span>
                  ) : (
                    <span>{editingStaff ? 'Save Role Changes' : 'Assign Selected Roles'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL: CREATE / EDIT CUSTOM ROLE (Requirements 2, 10)               */}
      {/* =================================================================== */}
      {showCustomRoleModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-3xl w-full overflow-hidden text-xs text-left animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] flex flex-col">
            <div className="p-5 bg-purple-950 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-900 flex items-center justify-center text-purple-200">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">
                    {editingCustomRole ? `Edit Custom Role: ${editingCustomRole.name}` : 'Create Custom Role'}
                  </h3>
                  <p className="text-[11px] text-purple-200">
                    Define custom role name and select granular permissions across all 21 church modules
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCustomRoleModal(false)}
                disabled={submittingCustomRole}
                className="text-purple-200 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitCustomRole} className="p-5 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">Custom Role Name *</label>
                  <input
                    type="text"
                    required
                    value={customRoleName}
                    onChange={e => setCustomRoleName(e.target.value)}
                    placeholder="e.g. Finance Assistant"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-1 focus:ring-purple-700 text-slate-900 font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-800 mb-1">Description</label>
                  <input
                    type="text"
                    value={customRoleDescription}
                    onChange={e => setCustomRoleDescription(e.target.value)}
                    placeholder="e.g. Can view tithes, offerings, donations, expenses and reports"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-1 focus:ring-purple-700 text-slate-900"
                  />
                </div>
              </div>

              {/* PERMISSION CATEGORIES (All 21 categories from Requirement 10) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <div>
                    <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                      Permission Categories & Actions
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Check specific actions for each category. Only selected permissions will be granted.
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-xs text-purple-900 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200">
                      {customRolePermissions.length} selected
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const all: string[] = [];
                        PERMISSION_CATEGORIES_CATALOG.forEach(c => c.actions.forEach(a => all.push(a.permission)));
                        setCustomRolePermissions(all);
                      }}
                      className="text-xs text-purple-800 font-bold hover:underline cursor-pointer"
                    >
                      Select All
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={() => setCustomRolePermissions([])}
                      className="text-xs text-slate-500 font-bold hover:underline cursor-pointer"
                    >
                      Clear All
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  {PERMISSION_CATEGORIES_CATALOG.map(category => {
                    const catPerms = category.actions.map(a => a.permission);
                    const selectedCount = catPerms.filter(p => customRolePermissions.includes(p)).length;
                    const allSelected = selectedCount === catPerms.length;

                    return (
                      <div
                        key={category.id}
                        className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2 hover:border-slate-300 transition"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-bold text-xs text-slate-900">{category.name}</span>
                            <span className="text-[10px] text-slate-500 ml-2">{category.description}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => toggleCategoryPermissions(catPerms)}
                            className="text-[11px] font-bold text-teal-700 hover:underline cursor-pointer"
                          >
                            {allSelected ? 'Deselect Category' : 'Select All in Category'}
                          </button>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {category.actions.map(action => {
                            const isChecked = customRolePermissions.includes(action.permission);
                            return (
                              <label
                                key={action.permission}
                                className={`flex items-center space-x-2 p-2 rounded-lg cursor-pointer border transition text-left ${
                                  isChecked
                                    ? 'bg-purple-50 border-purple-300 text-purple-950 font-medium'
                                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => toggleCustomRolePermission(action.permission)}
                                  className="rounded text-purple-700 focus:ring-purple-600 cursor-pointer"
                                />
                                <span className="text-[11px] font-semibold">{action.name}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Submit / Cancel */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowCustomRoleModal(false)}
                  disabled={submittingCustomRole}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingCustomRole}
                  className="px-5 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl font-bold flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                >
                  {submittingCustomRole ? (
                    <span>Saving Custom Role...</span>
                  ) : (
                    <span>{editingCustomRole ? 'Update Custom Role' : 'Save Custom Role'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL: VIEW EFFECTIVE PERMISSIONS MODAL                             */}
      {/* =================================================================== */}
      {viewingPermissionsStaff && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden text-xs text-left animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 bg-teal-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-white">Effective Permissions</h3>
                <p className="text-[11px] text-teal-200">
                  {viewingPermissionsStaff.fullName} (@{viewingPermissionsStaff.username})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewingPermissionsStaff(null)}
                className="text-teal-200 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <span className="font-bold text-slate-700">Currently Assigned Roles:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {(viewingPermissionsStaff.roles || [viewingPermissionsStaff.role]).map(r => (
                    <span key={r} className="px-2 py-0.5 bg-teal-100 text-teal-900 rounded font-bold text-[10px]">
                      {r}
                    </span>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <span className="font-bold text-slate-800">
                  Total Active Capabilities ({viewingPermissionsStaff.permissions?.length || 0}):
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  {(viewingPermissionsStaff.permissions || []).map(p => (
                    <div
                      key={p}
                      className="p-1.5 bg-slate-100 rounded text-[11px] font-mono text-slate-800 flex items-center space-x-1"
                    >
                      <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                      <span className="truncate">{p}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setViewingPermissionsStaff(null)}
                className="px-4 py-2 bg-slate-800 text-white font-semibold rounded-xl cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL: DELETE STAFF MEMBER ROLE CONFIRMATION                        */}
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
                  <h3 className="font-bold text-sm text-rose-950">Revoke Roles & Delete Staff</h3>
                  <p className="text-[11px] text-rose-600">Permissions will immediately be revoked</p>
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
                Are you sure you want to revoke all assigned roles and delete the account for{' '}
                <strong className="text-slate-900 font-bold">{staffToDelete.fullName}</strong>{' '}
                (<span className="font-mono text-teal-800">@{staffToDelete.username}</span>)?
              </p>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-slate-600">
                <div><strong>Assigned Roles:</strong> {(staffToDelete.roles || [staffToDelete.role]).join(', ')}</div>
                <div><strong>Effective Permissions:</strong> {staffToDelete.permissions?.length || 0} permissions</div>
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
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
              >
                {isDeletingStaff ? 'Revoking...' : 'Yes, Revoke & Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL: DELETE CUSTOM ROLE CONFIRMATION                              */}
      {/* =================================================================== */}
      {customRoleToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden text-xs text-left animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 bg-rose-50 border-b border-rose-100 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-rose-950">Delete Custom Role</h3>
                  <p className="text-[11px] text-rose-600">Role will be removed from all assigned staff</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCustomRoleToDelete(null)}
                disabled={isDeletingCustomRole}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-3">
              <p className="text-slate-700 leading-relaxed text-xs">
                Are you sure you want to delete the custom role <strong className="text-slate-900 font-bold">"{customRoleToDelete.name}"</strong>?
              </p>
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-[11px]">
                <strong>Warning:</strong> Any staff member who has this custom role assigned will immediately lose this role and all permissions that came exclusively from it.
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setCustomRoleToDelete(null)}
                disabled={isDeletingCustomRole}
                className="px-4 py-2 text-slate-600 font-semibold hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteCustomRole}
                disabled={isDeletingCustomRole}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
              >
                {isDeletingCustomRole ? 'Deleting...' : 'Yes, Delete Custom Role'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
