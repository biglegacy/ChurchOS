import React, { useState, useEffect } from 'react';
import {
  UserPlus,
  Plus,
  Phone,
  UserCheck,
  CheckCircle,
  AlertCircle,
  Calendar,
  Sparkles,
  ArrowRight,
  Search,
  X,
} from 'lucide-react';
import { ApiClient } from '../api';
import { Visitor, NewConvert } from '../types';

export const VisitorsModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'visitors' | 'converts'>('visitors');
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [converts, setConverts] = useState<NewConvert[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modals
  const [showAddVisitorModal, setShowAddVisitorModal] = useState(false);
  const [showAddConvertModal, setShowAddConvertModal] = useState(false);

  // Forms
  const [visitorForm, setVisitorForm] = useState({
    fullName: '',
    phone: '',
    email: '',
    gender: 'Male',
    firstVisitDate: new Date().toISOString().slice(0, 10),
    serviceAttended: 'Sunday First Service',
    invitedBy: '',
    assignedFollowUpLeader: '',
    wantsVisit: true,
    sendWelcomeSms: true,
    notes: '',
  });

  const [convertForm, setConvertForm] = useState({
    fullName: '',
    phone: '',
    conversionDate: new Date().toISOString().slice(0, 10),
    decisionType: 'Salvation (Born Again)' as const,
    counselorName: '',
    mentorAssigned: '',
    discipleshipStage: 'Salvation Decision' as const,
    notes: '',
  });

  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [vRes, cRes] = await Promise.all([
        ApiClient.get('/api/church/visitors'),
        ApiClient.get('/api/church/visitors/converts'),
      ]);
      setVisitors(vRes);
      setConverts(cRes);
    } catch (err: any) {
      setError(err.message || 'Failed to load visitors.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveVisitor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!visitorForm.fullName || !visitorForm.phone) {
      setError('Please provide full name and phone number.');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      const res = await ApiClient.post('/api/church/visitors', visitorForm);
      setNotice(`Visitor "${res.fullName}" registered. Welcome SMS sent.`);
      setShowAddVisitorModal(false);
      await loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveConvert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!convertForm.fullName || !convertForm.phone) {
      setError('Please provide name and phone number.');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await ApiClient.post('/api/church/visitors/converts', convertForm);
      setNotice(`New convert "${convertForm.fullName}" enrolled into Discipleship Pipeline.`);
      setShowAddConvertModal(false);
      await loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleConvertToMember = async (visitor: Visitor) => {
    if (!confirm(`Promote visitor "${visitor.fullName}" to Full Church Member?`)) return;
    try {
      const res = await ApiClient.post(`/api/church/visitors/${visitor.id}/convert-to-member`);
      setNotice(res.message);
      await loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleUpdateFollowUpStatus = async (id: string, status: string) => {
    try {
      await ApiClient.put(`/api/church/visitors/${id}`, { followUpStatus: status });
      await loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleAdvanceDiscipleship = async (id: string, currentStage: string) => {
    const stages = [
      'Salvation Decision',
      'Foundation Classes',
      'Water Baptism',
      'Holy Ghost Baptism',
      'Integrated Member',
    ];
    const currentIndex = stages.indexOf(currentStage);
    if (currentIndex < stages.length - 1) {
      const nextStage = stages[currentIndex + 1];
      try {
        await ApiClient.put(`/api/church/visitors/converts/${id}`, { discipleshipStage: nextStage });
        setNotice(`Advanced to stage: ${nextStage}`);
        await loadData();
      } catch (err: any) {
        setError(err.message);
      }
    }
  };

  return (
    <div className="space-y-5 pb-20 text-left">
      {/* Top Bar */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-teal-950 flex items-center space-x-2">
            <UserPlus className="w-5 h-5 text-teal-700" />
            <span>Visitors & Discipleship Retention</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Convert Sunday first-timers into permanent members through guided follow-up workflows.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {activeTab === 'visitors' ? (
            <button
              onClick={() => setShowAddVisitorModal(true)}
              className="px-3.5 py-2 bg-teal-700 hover:bg-teal-800 text-white font-medium text-xs rounded-md shadow-xs flex items-center space-x-1.5 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Register First-Timer</span>
            </button>
          ) : (
            <button
              onClick={() => setShowAddConvertModal(true)}
              className="px-3.5 py-2 bg-teal-700 hover:bg-teal-800 text-white font-medium text-xs rounded-md shadow-xs flex items-center space-x-1.5 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Enroll New Convert</span>
            </button>
          )}
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

      {/* Tabs */}
      <div className="flex border border-slate-200 bg-white rounded-xl p-1 shadow-xs text-xs font-semibold">
        <button
          onClick={() => setActiveTab('visitors')}
          className={`flex-1 py-2 rounded-lg transition-colors ${
            activeTab === 'visitors' ? 'bg-teal-800 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          First-Timer Visitors ({visitors.length})
        </button>
        <button
          onClick={() => setActiveTab('converts')}
          className={`flex-1 py-2 rounded-lg transition-colors ${
            activeTab === 'converts' ? 'bg-teal-800 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          New Converts Pipeline ({converts.length})
        </button>
      </div>

      {/* TAB 1: VISITORS */}
      {activeTab === 'visitors' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="divide-y divide-slate-100">
            {visitors.length === 0 ? (
              <p className="p-8 text-center text-xs text-slate-400">No visitor records found.</p>
            ) : (
              visitors.map(v => (
                <div key={v.id} className="p-4 sm:p-5 hover:bg-slate-50/60 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="font-bold text-slate-900 text-sm">{v.fullName}</h4>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                        {v.followUpStatus}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Phone: <strong className="text-slate-700">{v.phone}</strong> • Visited: {v.firstVisitDate} ({v.serviceAttended})
                    </p>
                    {v.invitedBy && (
                      <p className="text-[11px] text-slate-400 mt-0.5">Invited by: {v.invitedBy}</p>
                    )}
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    <select
                      value={v.followUpStatus}
                      onChange={e => handleUpdateFollowUpStatus(v.id, e.target.value)}
                      className="px-2 py-1 text-xs border border-slate-300 rounded-lg bg-white"
                    >
                      <option value="Pending Follow-up">Pending Follow-up</option>
                      <option value="Contacted">Contacted</option>
                      <option value="Home Visited">Home Visited</option>
                      <option value="Integrating">Integrating</option>
                      <option value="Dormant">Dormant</option>
                    </select>

                    <button
                      onClick={() => handleConvertToMember(v)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg flex items-center space-x-1 shadow-xs transition"
                      title="Promote to Full Member"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Make Member</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 2: CONVERTS */}
      {activeTab === 'converts' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="divide-y divide-slate-100">
            {converts.length === 0 ? (
              <p className="p-8 text-center text-xs text-slate-400">No discipleship converts enrolled.</p>
            ) : (
              converts.map(c => (
                <div key={c.id} className="p-4 sm:p-5 hover:bg-slate-50/60 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="font-bold text-slate-900 text-sm">{c.fullName}</h4>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-200">
                        {c.decisionType}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Phone: <strong className="text-slate-700">{c.phone}</strong> • Mentor: {c.mentorAssigned || 'Unassigned'}
                    </p>
                    <div className="mt-2 flex items-center space-x-2">
                      <span className="text-[10px] font-semibold uppercase text-slate-400">Discipleship Stage:</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
                        {c.discipleshipStage}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    <button
                      onClick={() => handleAdvanceDiscipleship(c.id, c.discipleshipStage)}
                      className="px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 font-medium rounded-md flex items-center space-x-1 transition-colors"
                    >
                      <span>Advance Stage</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ADD VISITOR MODAL */}
      {showAddVisitorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-slate-200 text-left space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-teal-950">Register First-Time Guest</h3>
              <button
                onClick={() => setShowAddVisitorModal(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveVisitor} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={visitorForm.fullName}
                  onChange={e => setVisitorForm({ ...visitorForm, fullName: e.target.value })}
                  placeholder="e.g. Sister Beatrice Donkor"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Phone (Ghana format) *</label>
                  <input
                    type="text"
                    required
                    value={visitorForm.phone}
                    onChange={e => setVisitorForm({ ...visitorForm, phone: e.target.value })}
                    placeholder="024XXXXXXX"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Gender</label>
                  <select
                    value={visitorForm.gender}
                    onChange={e => setVisitorForm({ ...visitorForm, gender: e.target.value })}
                    className="w-full px-2.5 py-2 border border-slate-300 rounded-xl bg-white"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Service Attended</label>
                  <input
                    type="text"
                    value={visitorForm.serviceAttended}
                    onChange={e => setVisitorForm({ ...visitorForm, serviceAttended: e.target.value })}
                    placeholder="Sunday First Service"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Invited By</label>
                  <input
                    type="text"
                    value={visitorForm.invitedBy}
                    onChange={e => setVisitorForm({ ...visitorForm, invitedBy: e.target.value })}
                    placeholder="Member who invited"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 flex items-center justify-between">
                <div>
                  <span className="font-bold text-amber-900">Send Welcome SMS</span>
                  <p className="text-[10px] text-amber-700">Dispatches friendly church welcome message</p>
                </div>
                <input
                  type="checkbox"
                  checked={visitorForm.sendWelcomeSms}
                  onChange={e => setVisitorForm({ ...visitorForm, sendWelcomeSms: e.target.checked })}
                  className="h-4 w-4 text-amber-600 rounded border-slate-300"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddVisitorModal(false)}
                  className="px-3.5 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white font-medium rounded-md shadow-xs disabled:opacity-50 transition-colors"
                >
                  {saving ? 'Saving...' : 'Register Guest'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD CONVERT MODAL */}
      {showAddConvertModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-slate-200 text-left space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-teal-950">Enroll New Convert</h3>
              <button
                onClick={() => setShowAddConvertModal(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveConvert} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={convertForm.fullName}
                  onChange={e => setConvertForm({ ...convertForm, fullName: e.target.value })}
                  placeholder="e.g. Yaw Antwi"
                  className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Phone *</label>
                  <input
                    type="text"
                    required
                    value={convertForm.phone}
                    onChange={e => setConvertForm({ ...convertForm, phone: e.target.value })}
                    placeholder="024XXXXXXX"
                    className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:border-teal-700"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Decision Type</label>
                  <select
                    value={convertForm.decisionType}
                    onChange={e => setConvertForm({ ...convertForm, decisionType: e.target.value as any })}
                    className="w-full px-2.5 py-2 border border-slate-200 rounded-md bg-white focus:outline-none focus:border-teal-700"
                  >
                    <option value="Salvation (Born Again)">Salvation (Born Again)</option>
                    <option value="Rededication">Rededication</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Assigned Follow-Up Mentor</label>
                <input
                  type="text"
                  value={convertForm.mentorAssigned}
                  onChange={e => setConvertForm({ ...convertForm, mentorAssigned: e.target.value })}
                  placeholder="e.g. Elder Emmanuel Osei"
                  className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:border-teal-700"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddConvertModal(false)}
                  className="px-3.5 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white font-medium rounded-md shadow-xs disabled:opacity-50 transition-colors"
                >
                  {saving ? 'Enrolling...' : 'Enroll in Pipeline'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
