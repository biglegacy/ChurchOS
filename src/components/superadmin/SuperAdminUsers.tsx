import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Plus,
  Shield,
  Key,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Mail,
  Building2,
  Lock,
} from 'lucide-react';
import { ApiClient } from '../../api';
import { Church } from '../../types';

interface UserRecord {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: string;
  churchId?: string;
  status: string;
  createdAt?: string;
}

interface Props {
  churches: Church[];
}

export const SuperAdminUsers: React.FC<Props> = ({ churches }) => {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // New user modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newFullName, setNewFullName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('CHURCH_ADMINISTRATOR');
  const [newChurchId, setNewChurchId] = useState(churches[0]?.id || '');
  const [savingUser, setSavingUser] = useState(false);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await ApiClient.get('/api/super-admin/users');
      setUsers(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load user accounts.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleToggleStatus = async (user: UserRecord) => {
    const nextStatus = user.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      const res = await ApiClient.put(`/api/super-admin/users/${user.id}/status`, { status: nextStatus });
      setNotice(res.message);
      await loadUsers();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleResetPassword = async (user: UserRecord) => {
    const newPass = prompt(`Enter new password for ${user.fullName} (@${user.username}):`, 'churchOS2026!');
    if (!newPass) return;
    try {
      const res = await ApiClient.post(`/api/super-admin/users/${user.id}/reset-password`, { newPassword: newPass });
      setNotice(res.message);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername || !newPassword || !newFullName || !newEmail) {
      setError('Please fill in all required fields.');
      return;
    }
    try {
      setSavingUser(true);
      setError(null);
      const res = await ApiClient.post('/api/super-admin/users', {
        fullName: newFullName,
        username: newUsername,
        email: newEmail,
        password: newPassword,
        role: newRole,
        churchId: newRole === 'SUPER_ADMIN' ? undefined : newChurchId,
      });
      setNotice(res.message);
      setShowAddModal(false);
      setNewFullName('');
      setNewUsername('');
      setNewEmail('');
      setNewPassword('');
      await loadUsers();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSavingUser(false);
    }
  };

  const churchMap = new Map<string, string>(churches.map(c => [c.id, c.name]));

  const filteredUsers = users.filter(u => {
    const churchName = u.churchId ? churchMap.get(u.churchId) : '';
    const matchesSearch =
      u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (churchName ? churchName.toLowerCase().includes(searchTerm.toLowerCase()) : false);

    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-5 text-left">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-teal-950 flex items-center space-x-2">
            <Users className="w-5 h-5 text-teal-700" />
            <span>Platform User Management ({users.length})</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Oversee user accounts, roles, credentials, and tenant allocations across the ecosystem.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={loadUsers}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-3.5 py-2 bg-teal-800 hover:bg-teal-900 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 shadow-xs transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add User</span>
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

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-2.5 items-center justify-between bg-white p-3.5 rounded-xl border border-slate-200 text-xs">
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search by name, email, username..."
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-700"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <span className="text-slate-500 font-medium">Role:</span>
          <select
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-teal-700"
          >
            <option value="ALL">All Roles</option>
            <option value="SUPER_ADMIN">Super Admin</option>
            <option value="CHURCH_ADMINISTRATOR">Church Admin</option>
            <option value="SENIOR_PASTOR">Senior Pastor</option>
            <option value="PASTOR_MINISTER">Pastor / Minister</option>
            <option value="FINANCE_OFFICER">Finance Officer</option>
            <option value="MEMBER">Member</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">User Details</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Church Tenant</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map(u => (
                <tr key={u.id} className="hover:bg-slate-50/60 transition">
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-900">{u.fullName}</div>
                    <div className="text-[11px] text-slate-500">@{u.username} • {u.email}</div>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      u.role === 'SUPER_ADMIN' ? 'bg-purple-100 text-purple-800' :
                      u.role === 'CHURCH_ADMINISTRATOR' ? 'bg-teal-100 text-teal-800' :
                      u.role === 'SENIOR_PASTOR' ? 'bg-blue-100 text-blue-800' :
                      u.role === 'FINANCE_OFFICER' ? 'bg-emerald-100 text-emerald-800' :
                      'bg-slate-100 text-slate-700'
                    }`}>
                      {u.role.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-600 font-medium">
                    {u.churchId ? churchMap.get(u.churchId) || u.churchId : 'System Wide'}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      u.status === 'ACTIVE'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}>
                      {u.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end space-x-1.5">
                      <button
                        onClick={() => handleResetPassword(u)}
                        title="Reset Password"
                        className="p-1.5 text-slate-500 hover:text-teal-800 hover:bg-slate-100 rounded-md transition"
                      >
                        <Key className="w-3.5 h-3.5" />
                      </button>
                      {u.role !== 'SUPER_ADMIN' && (
                        <button
                          onClick={() => handleToggleStatus(u)}
                          className={`px-2 py-1 rounded text-[10px] font-bold ${
                            u.status === 'ACTIVE'
                              ? 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                              : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          }`}
                        >
                          {u.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-md w-full p-5 shadow-2xl border border-slate-200 text-left space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900 flex items-center space-x-2">
                <Users className="w-4 h-4 text-teal-700" />
                <span>Create Platform User</span>
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600 text-sm">✕</button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={newFullName}
                  onChange={e => setNewFullName(e.target.value)}
                  placeholder="e.g. Pastor John Mensah"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Username *</label>
                  <input
                    type="text"
                    required
                    value={newUsername}
                    onChange={e => setNewUsername(e.target.value)}
                    placeholder="e.g. jmensah"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-700"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    value={newEmail}
                    onChange={e => setNewEmail(e.target.value)}
                    placeholder="pastor@church.org"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-700"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Password *</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-700"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Role *</label>
                <select
                  value={newRole}
                  onChange={e => setNewRole(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-teal-700"
                >
                  <option value="CHURCH_ADMINISTRATOR">Church Administrator</option>
                  <option value="SENIOR_PASTOR">Senior Pastor</option>
                  <option value="PASTOR_MINISTER">Pastor / Minister</option>
                  <option value="FINANCE_OFFICER">Finance Officer</option>
                  <option value="SUPER_ADMIN">Super Admin (System Wide)</option>
                  <option value="MEMBER">Church Member</option>
                </select>
              </div>

              {newRole !== 'SUPER_ADMIN' && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Assign to Church Tenant *</label>
                  <select
                    value={newChurchId}
                    onChange={e => setNewChurchId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-teal-700"
                  >
                    {churches.map(c => (
                      <option key={c.id} value={c.id}>{c.name} ({c.city})</option>
                    ))}
                  </select>
                </div>
              )}

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
                  disabled={savingUser}
                  className="px-4 py-1.5 bg-teal-800 hover:bg-teal-900 text-white rounded-lg font-semibold shadow-xs disabled:opacity-50"
                >
                  {savingUser ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
