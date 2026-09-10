import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { ApiClient } from '../api';
import { Member, DepartmentOrGroup } from '../types';

interface Props {
  onRecordGivingForMember?: (memberId: string) => void;
}

export const MembersModule: React.FC<Props> = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [departments, setDepartments] = useState<DepartmentOrGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [genderFilter, setGenderFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailTab, setDetailTab] = useState<'profile' | 'attendance' | 'giving'>('profile');
  const [detailData, setDetailData] = useState<any | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Form State
  const [formData, setFormData] = useState<any>({
    fullName: '',
    phone: '',
    email: '',
    gender: 'Male',
    dateOfBirth: '',
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

  const handleDeleteMember = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete member record for "${name}"?`)) return;
    try {
      await ApiClient.delete(`/api/church/members/${id}`);
      setNotice(`Member "${name}" removed.`);
      if (showDetailModal) setShowDetailModal(false);
      await loadMembers();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const resetForm = () => {
    setFormData({
      fullName: '',
      phone: '',
      email: '',
      gender: 'Male',
      dateOfBirth: '',
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
        <button
          onClick={() => {
            resetForm();
            setShowAddModal(true);
          }}
          className="px-3.5 py-2 bg-teal-700 hover:bg-teal-800 text-white font-medium text-xs rounded-md shadow-xs flex items-center justify-center space-x-1.5 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Member</span>
        </button>
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

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by member name, phone, code (e.g. GTI-001) or email..."
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-700 text-slate-800"
          />
        </div>

        <div className="grid grid-cols-3 gap-2 text-xs">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 border border-slate-200 rounded-md text-slate-700 bg-white focus:outline-none focus:border-teal-700"
          >
            <option value="">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
            <option value="Under Discipline">Under Discipline</option>
          </select>

          <select
            value={genderFilter}
            onChange={e => setGenderFilter(e.target.value)}
            className="px-2.5 py-1.5 border border-slate-200 rounded-md text-slate-700 bg-white focus:outline-none focus:border-teal-700"
          >
            <option value="">All Genders</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>

          <select
            value={deptFilter}
            onChange={e => setDeptFilter(e.target.value)}
            className="px-2.5 py-1.5 border border-slate-200 rounded-md text-slate-700 bg-white focus:outline-none focus:border-teal-700"
          >
            <option value="">All Ministries</option>
            {departments.map(d => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Members Directory Table / Cards */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-700">
            {members.length} Member{members.length !== 1 ? 's' : ''} Enrolled
          </span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading directory...</div>
        ) : members.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            No matching member records found.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {members.map(member => (
              <div
                key={member.id}
                className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between gap-3"
              >
                <div
                  onClick={() => handleOpenDetail(member)}
                  className="flex items-center space-x-3 cursor-pointer min-w-0 flex-1"
                >
                  <div className="w-9 h-9 rounded-md bg-teal-50 text-teal-800 border border-teal-100 flex items-center justify-center font-bold text-sm shrink-0">
                    {member.fullName[0]}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center space-x-2">
                      <h4 className="text-xs font-semibold text-slate-900 truncate">
                        {member.fullName}
                      </h4>
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 font-mono">
                        {member.memberCode}
                      </span>
                    </div>
                    <div className="flex items-center space-x-3 text-[11px] text-slate-500 mt-0.5">
                      <span className="flex items-center space-x-1">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{member.phone}</span>
                      </span>
                      {member.occupation && (
                        <span className="hidden sm:inline text-slate-400">• {member.occupation}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      member.membershipStatus === 'Active'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {member.membershipStatus}
                  </span>

                  <button
                    onClick={() => handleOpenDetail(member)}
                    title="View Profile & Records"
                    className="p-1.5 text-slate-400 hover:text-teal-700 hover:bg-slate-100 rounded-md transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => {
                      setFormData(member);
                      setShowAddModal(true);
                    }}
                    title="Edit Member"
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ADD / EDIT MEMBER MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 text-left my-6 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-base font-bold text-slate-900">
                {formData.id ? 'Edit Member Profile' : 'Register New Church Member'}
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
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
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="e.g. Kwesi Appiah Mensah"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

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
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    placeholder="kwesi@example.com"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Gender</label>
                  <select
                    value={formData.gender}
                    onChange={e => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full px-2.5 py-2 border border-slate-300 rounded-xl"
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
                    className="w-full px-2.5 py-2 border border-slate-300 rounded-xl"
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
                    className="w-full px-2.5 py-2 border border-slate-300 rounded-xl"
                  >
                    <option value="Baptized">Baptized</option>
                    <option value="Not Baptized">Not Baptized</option>
                    <option value="Pending">Pending</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Occupation</label>
                  <input
                    type="text"
                    value={formData.occupation}
                    onChange={e => setFormData({ ...formData, occupation: e.target.value })}
                    placeholder="e.g. Teacher, Accountant"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Residential Address</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                    placeholder="e.g. Spintex, Community 18"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              {!formData.id && (
                <div className="p-3 bg-teal-50/70 rounded-lg border border-teal-100 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-teal-950">Send Welcome SMS</span>
                    <p className="text-[10px] text-teal-700">Dispatch church welcome notification</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.sendWelcomeSms}
                    onChange={e => setFormData({ ...formData, sendWelcomeSms: e.target.checked })}
                    className="h-4 w-4 text-teal-700 focus:ring-teal-600 rounded border-slate-300"
                  />
                </div>
              )}

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white font-medium rounded-md shadow-xs transition-colors disabled:opacity-50"
                >
                  {formLoading ? 'Saving...' : 'Save Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MEMBER 360 DETAIL VIEW MODAL */}
      {showDetailModal && selectedMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-lg w-full shadow-2xl border border-slate-200 text-left overflow-hidden flex flex-col max-h-[88vh]">
            {/* Header */}
            <div className="p-5 bg-teal-800 text-white flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-11 h-11 rounded-lg bg-teal-700/80 flex items-center justify-center font-bold text-lg">
                  {selectedMember.fullName[0]}
                </div>
                <div>
                  <h3 className="text-base font-bold tracking-tight">{selectedMember.fullName}</h3>
                  <p className="text-xs text-teal-100 font-mono">
                    Code: {selectedMember.memberCode} • {selectedMember.normalizedPhone}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="p-1.5 text-teal-200 hover:text-white rounded-md hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex border-b border-slate-200 bg-slate-50 px-4 text-xs font-semibold">
              <button
                onClick={() => setDetailTab('profile')}
                className={`py-2.5 px-3 border-b-2 transition-colors ${
                  detailTab === 'profile'
                    ? 'border-teal-700 text-teal-700 font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Profile Info
              </button>
              <button
                onClick={() => setDetailTab('attendance')}
                className={`py-2.5 px-3 border-b-2 transition-colors ${
                  detailTab === 'attendance'
                    ? 'border-teal-700 text-teal-700 font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Attendance History
              </button>
              <button
                onClick={() => setDetailTab('giving')}
                className={`py-2.5 px-3 border-b-2 transition-colors ${
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
                      <span className="text-slate-400 text-[11px]">Baptism Status:</span>
                      <p className="font-semibold text-slate-800">{selectedMember.baptismStatus}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[11px]">Joined Date:</span>
                      <p className="font-semibold text-slate-800">{selectedMember.joinDate}</p>
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

                  <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                    <button
                      onClick={() => handleDeleteMember(selectedMember.id, selectedMember.fullName)}
                      className="text-rose-600 hover:text-rose-700 font-semibold flex items-center space-x-1"
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
    </div>
  );
};
