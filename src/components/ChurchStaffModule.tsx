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
} from 'lucide-react';
import { ApiClient } from '../api';
import { Church, ChurchPermission, ChurchStaffRole, User, ALL_CHURCH_PERMISSIONS, DEFAULT_ROLE_PERMISSIONS } from '../types';

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
  permissions: ChurchPermission[];
  status: 'ACTIVE' | 'SUSPENDED';
  createdAt: string;
  lastLoginAt?: string;
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
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State
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
      setStaffList(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load church staff.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStaff();
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

  const resetForm = () => {
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
      setError('Staff member name is required.');
      return;
    }
    if (!formUsername.trim()) {
      setError('Staff login username is required.');
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
      };

      if (editingStaff) {
        await ApiClient.put(`/api/church/staff/${editingStaff.id}`, payload);
        setNotice(`Staff member ${payload.fullName} updated successfully.`);
      } else {
        await ApiClient.post('/api/church/staff', payload);
        setNotice(`New staff member ${payload.fullName} created. They can now log in using username "${payload.username}".`);
      }

      setShowAddModal(false);
      resetForm();
      await loadStaff();
    } catch (err: any) {
      setError(err.message || 'Failed to save staff member.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteStaff = async (staff: StaffMember) => {
    if (!window.confirm(`Are you sure you want to remove staff member ${staff.fullName} (${staff.username})?`)) {
      return;
    }

    try {
      setLoading(true);
      await ApiClient.delete(`/api/church/staff/${staff.id}`);
      setNotice(`Staff member ${staff.fullName} removed.`);
      await loadStaff();
    } catch (err: any) {
      setError(err.message || 'Failed to remove staff member.');
    } finally {
      setLoading(false);
    }
  };

  const filteredStaff = staffList.filter(s => {
    const q = searchTerm.toLowerCase();
    return (
      s.fullName.toLowerCase().includes(q) ||
      s.username.toLowerCase().includes(q) ||
      (s.email && s.email.toLowerCase().includes(q)) ||
      (s.customRoleTitle && s.customRoleTitle.toLowerCase().includes(q)) ||
      s.role.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 pb-20 text-left">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-teal-950 flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-teal-700" />
            <span>Church Staff, Roles & Permissions</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage your pastoral team, finance officers, secretaries, and custom role assignments with strictly isolated access control.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={loadStaff}
            disabled={loading}
            className="p-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition cursor-pointer"
            title="Refresh Staff Directory"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            onClick={openAddModal}
            className="px-3.5 py-2 bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs rounded-lg shadow-xs flex items-center space-x-1.5 transition cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Staff Member</span>
          </button>
        </div>
      </div>

      {notice && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs rounded-xl flex items-center justify-between">
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
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-900 text-xs rounded-xl flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="font-bold text-rose-700 hover:underline cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {/* Staff Directory Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search staff by name, role or username..."
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-teal-600 text-slate-800"
            />
          </div>
          <span className="text-xs text-slate-500 font-mono">
            {filteredStaff.length} Staff Member{filteredStaff.length === 1 ? '' : 's'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] uppercase font-semibold">
                <th className="py-3 px-4">Staff Member</th>
                <th className="py-3 px-4">Login Username</th>
                <th className="py-3 px-4">Assigned Role</th>
                <th className="py-3 px-4">Authorized Modules</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No staff members found matching your search.
                  </td>
                </tr>
              ) : (
                filteredStaff.map(staff => (
                  <tr key={staff.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{staff.fullName}</div>
                      <div className="flex items-center space-x-2 text-[11px] text-slate-500 mt-0.5">
                        {staff.email && <span>{staff.email}</span>}
                        {staff.phone && <span>• {staff.phone}</span>}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono font-semibold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                        {staff.username}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div>
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                          {staff.role}
                        </span>
                        {staff.customRoleTitle && (
                          <div className="text-[11px] text-teal-700 font-medium mt-0.5">
                            {staff.customRoleTitle}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 max-w-xs">
                      <div className="flex flex-wrap gap-1">
                        {(staff.permissions || []).slice(0, 4).map(perm => (
                          <span
                            key={perm}
                            className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-medium"
                          >
                            {PERMISSION_METADATA[perm]?.label || perm}
                          </span>
                        ))}
                        {(staff.permissions || []).length > 4 && (
                          <span className="px-1.5 py-0.5 bg-teal-50 text-teal-800 rounded text-[10px] font-bold">
                            +{(staff.permissions || []).length - 4} more
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
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
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        <button
                          type="button"
                          onClick={() => openEditModal(staff)}
                          className="p-1.5 text-slate-600 hover:text-teal-700 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                          title="Edit Staff Member"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteStaff(staff)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                          title="Remove Staff Member"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* =================================================================== */}
      {/* ADD / EDIT STAFF MODAL                                              */}
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
                    {editingStaff ? `Edit Staff Member: ${editingStaff.fullName}` : 'Add New Church Staff Member'}
                  </h3>
                  <p className="text-[11px] text-teal-200">
                    Assign role, login credentials, and module permissions
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
              {/* Personal Identification */}
              <div className="space-y-3">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider text-teal-900 border-b border-slate-100 pb-1">
                  1. Staff Information
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Staff Member Full Name *</label>
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
                    <label className="block font-bold text-slate-700 mb-1">Assigned Role *</label>
                    <select
                      value={formRole}
                      onChange={e => handleRoleChange(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white focus:ring-1 focus:ring-teal-700 text-slate-900"
                    >
                      {STANDARD_ROLES.map(r => (
                        <option key={r.role} value={r.role}>
                          {r.label}
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
                    <span>{editingStaff ? 'Save Changes' : 'Create Staff Account'}</span>
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
