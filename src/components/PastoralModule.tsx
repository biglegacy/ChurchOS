import React, { useState, useEffect } from 'react';
import {
  HeartHandshake,
  Plus,
  Lock,
  Search,
  User,
  Phone,
  Clock,
  CheckCircle,
  AlertCircle,
  X,
  FileText,
} from 'lucide-react';
import { ApiClient } from '../api';
import { PastoralCareCase, Member } from '../types';
import { useMembers } from '../context/MembersContext';
import { MemberSelector } from './common/MemberSelector';
import { useAutoDismissNotification } from '../utils/useAutoDismissNotification';

export const PastoralModule: React.FC = () => {
  const { members } = useMembers();
  const [cases, setCases] = useState<PastoralCareCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCase, setSelectedCase] = useState<PastoralCareCase | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Custom category support
  const [categoriesData, setCategoriesData] = useState<{
    standardCategories: string[];
    customCategories: string[];
    allCategories: string[];
  }>({
    standardCategories: [
      'Pastoral Counseling',
      'Hospital Visitation',
      'Bereavement Support',
      'Marital Counseling',
      'Baby Dedication',
      'Welfare Need',
    ],
    customCategories: [],
    allCategories: [
      'Pastoral Counseling',
      'Hospital Visitation',
      'Bereavement Support',
      'Marital Counseling',
      'Baby Dedication',
      'Welfare Need',
    ],
  });
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [customCategoryInput, setCustomCategoryInput] = useState('');

  // New Case Form
  const [formData, setFormData] = useState({
    memberId: '',
    memberName: '',
    phone: '',
    caseType: 'Pastoral Counseling' as any,
    urgencyLevel: 'Medium' as const,
    pastorAssigned: 'Senior Pastor',
    summary: '',
    counselingNotes: '',
  });

  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  useAutoDismissNotification(notice, setNotice, 2000);
  useAutoDismissNotification(error, setError, 2000);

  const loadData = async () => {
    try {
      setLoading(true);
      const [cRes, catRes] = await Promise.all([
        ApiClient.get('/api/church/pastoral').catch(() => []),
        ApiClient.get('/api/church/pastoral-categories').catch(() => null),
      ]);
      setCases(Array.isArray(cRes) ? cRes : []);
      if (catRes) {
        setCategoriesData(prev => ({
          standardCategories: Array.isArray(catRes.standardCategories) ? catRes.standardCategories : prev.standardCategories,
          customCategories: Array.isArray(catRes.customCategories) ? catRes.customCategories : prev.customCategories,
          allCategories: Array.isArray(catRes.allCategories) ? catRes.allCategories : prev.allCategories,
        }));
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load pastoral care.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleMemberSelect = (selected: Member | Member[] | null) => {
    if (selected && !Array.isArray(selected)) {
      setFormData(prev => ({
        ...prev,
        memberId: selected.id,
        memberName: selected.fullName,
        phone: selected.phone || '',
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        memberId: '',
        memberName: '',
        phone: '',
      }));
    }
  };

  const handleCreateCase = async (e: React.FormEvent) => {
    e.preventDefault();
    const actualCaseType = isCustomCategory ? customCategoryInput.trim() : formData.caseType;

    if (!actualCaseType) {
      setError('Please provide a care category.');
      return;
    }
    if (!formData.memberName || !formData.summary) {
      setError('Please provide member name and case summary.');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await ApiClient.post('/api/church/pastoral', {
        ...formData,
        caseType: actualCaseType,
        customCaseType: isCustomCategory ? actualCaseType : undefined,
        isCustom: isCustomCategory,
      });
      setNotice(`Confidential pastoral record created for ${formData.memberName}.`);
      setShowAddModal(false);
      setIsCustomCategory(false);
      setCustomCategoryInput('');
      setFormData({
        memberId: '',
        memberName: '',
        phone: '',
        caseType: 'Pastoral Counseling',
        urgencyLevel: 'Medium',
        pastorAssigned: 'Senior Pastor',
        summary: '',
        counselingNotes: '',
      });
      await loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      await ApiClient.put(`/api/church/pastoral/${id}`, { status });
      setNotice(`Updated status to ${status}.`);
      await loadData();
      if (selectedCase?.id === id) {
        setSelectedCase({ ...selectedCase, status: status as any });
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="space-y-5 pb-20 text-left">
      {/* Top Bar */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-teal-950 flex items-center space-x-2">
            <HeartHandshake className="w-5 h-5 text-teal-700" />
            <span>Pastoral Care & Counseling (Confidential)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 flex items-center space-x-1">
            <Lock className="w-3.5 h-3.5 text-amber-600" />
            <span>Restricted access: Protected for ordained pastoral leadership and counseling ministers.</span>
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-3.5 py-2 bg-teal-700 hover:bg-teal-800 text-white font-medium text-xs rounded-md shadow-xs flex items-center justify-center space-x-1.5 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>New Pastoral Record</span>
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

      {/* Case List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-3.5 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs">
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <span className="font-bold text-teal-950 shrink-0">Pastoral Care Cases ({(cases || []).length})</span>
            {(categoriesData?.customCategories || []).length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700">
                {(categoriesData?.customCategories || []).length} custom categories
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
            <div className="relative flex-1 sm:w-48">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search member, notes..."
                className="w-full pl-8 pr-2.5 py-1 text-xs border border-slate-300 rounded-md bg-white focus:outline-none focus:border-teal-700"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="px-2.5 py-1 text-xs border border-slate-300 rounded-md bg-white text-slate-700 font-medium"
            >
              <option value="ALL">All Categories</option>
              <optgroup label="Standard Categories">
                {(categoriesData?.standardCategories || []).map(sc => (
                  <option key={sc} value={sc}>{sc}</option>
                ))}
              </optgroup>
              {(categoriesData?.customCategories || []).length > 0 && (
                <optgroup label="Custom Categories">
                  {(categoriesData?.customCategories || []).map(cc => (
                    <option key={cc} value={cc}>★ {cc}</option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>
        </div>
        <div className="divide-y divide-slate-100">
          {cases
            .filter(c => {
              const matchesSearch =
                (c.memberName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (c.summary || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (c.caseType || '').toLowerCase().includes(searchQuery.toLowerCase());
              const matchesCat =
                categoryFilter === 'ALL' || (c.caseType || '').toLowerCase() === categoryFilter.toLowerCase();
              return matchesSearch && matchesCat;
            }).length === 0 ? (
            <p className="p-8 text-center text-xs text-slate-400">No pastoral cases recorded.</p>
          ) : (
            cases
              .filter(c => {
                const matchesSearch =
                  (c.memberName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                  (c.summary || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                  (c.caseType || '').toLowerCase().includes(searchQuery.toLowerCase());
                const matchesCat =
                  categoryFilter === 'ALL' || (c.caseType || '').toLowerCase() === categoryFilter.toLowerCase();
                return matchesSearch && matchesCat;
              })
              .map(item => {
                const isCustom =
                  item.isCustom || categoriesData.customCategories.includes(item.caseType);
                return (
                  <div
                    key={item.id}
                    className="p-4 sm:p-5 hover:bg-slate-50/60 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs cursor-pointer"
                    onClick={() => setSelectedCase(item)}
                  >
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-slate-900 text-sm">{item.memberName}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-200">
                          {item.caseType}
                        </span>
                        {isCustom && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-purple-100 text-purple-700">
                            Custom
                          </span>
                        )}
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            item.urgencyLevel === 'Critical'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : item.urgencyLevel === 'High'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {item.urgencyLevel} Priority
                        </span>
                      </div>
                      <p className="text-slate-600 mt-1 line-clamp-1">{item.summary}</p>
                      <div className="flex items-center space-x-3 text-[11px] text-slate-400 mt-1">
                        <span>Assigned: {item.pastorAssigned}</span>
                        <span>•</span>
                        <span>Date: {item.openedDate}</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      <span
                        className={`px-2.5 py-1 rounded-md text-[10px] font-bold ${
                          item.status === 'Open'
                            ? 'bg-teal-50 text-teal-700 border border-teal-200'
                            : item.status === 'In Progress'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>
                  </div>
                );
              })
          )}
        </div>
      </div>

      {/* CASE DETAIL / NOTES MODAL */}
      {selectedCase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-slate-200 text-left space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700">
                  {selectedCase.caseType}
                </span>
                <h3 className="text-base font-bold text-teal-950">{selectedCase.memberName}</h3>
                <p className="text-xs text-slate-400">{selectedCase.phone}</p>
              </div>
              <button
                onClick={() => setSelectedCase(null)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-slate-400 font-semibold block mb-1">Case Summary</span>
                <p className="text-slate-800">{selectedCase.summary}</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-slate-400 font-semibold block mb-1">Confidential Counseling Notes</span>
                <p className="text-slate-800 whitespace-pre-wrap">
                  {selectedCase.counselingNotes || 'No notes entered yet.'}
                </p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Update Case Status</label>
                <div className="flex space-x-2">
                  {(['Open', 'In Progress', 'Resolved', 'Referred'] as const).map(st => (
                    <button
                      key={st}
                      onClick={() => handleUpdateStatus(selectedCase.id, st)}
                      className={`px-3 py-1.5 rounded-md font-bold text-xs transition-colors ${
                        selectedCase.status === st
                          ? 'bg-teal-800 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedCase(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs rounded-md transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE CASE MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-slate-200 text-left space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-teal-950">New Pastoral Care Session</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCase} className="space-y-3.5 text-xs">
              <div>
                <MemberSelector
                  label="Select Registered Member"
                  placeholder="Search registered members by Name, Phone, or ID..."
                  value={formData.memberId}
                  selectedMember={members.find(m => m.id === formData.memberId) || null}
                  onChange={handleMemberSelect}
                  allowNonMemberOption={true}
                  nonMemberLabel="-- Non-Registered Member / Enter Manually --"
                  isNonMemberSelected={!formData.memberId}
                  onSelectNonMember={() => {
                    setFormData(prev => ({
                      ...prev,
                      memberId: '',
                      memberName: '',
                      phone: '',
                    }));
                  }}
                  helperText="Searchable single source of truth from central Registered Members"
                />
              </div>

              {!formData.memberId && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Member Name *</label>
                    <input
                      type="text"
                      value={formData.memberName}
                      onChange={e => setFormData({ ...formData, memberName: e.target.value })}
                      placeholder="e.g. Bro Samuel Mensah"
                      className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:border-teal-700"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Phone</label>
                    <input
                      type="text"
                      value={formData.phone}
                      onChange={e => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="024XXXXXXX"
                      className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:border-teal-700"
                    />
                  </div>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-700">Care Category *</label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomCategory(!isCustomCategory);
                      if (!isCustomCategory && !customCategoryInput) {
                        setCustomCategoryInput('');
                      }
                    }}
                    className="text-[11px] font-bold text-teal-700 hover:text-teal-900 underline"
                  >
                    {isCustomCategory ? '← Choose Standard' : '+ Custom Category'}
                  </button>
                </div>

                {isCustomCategory ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      required
                      value={customCategoryInput}
                      onChange={e => setCustomCategoryInput(e.target.value)}
                      placeholder="e.g. Pre-Marital Counseling, Youth Mentorship, Crisis Support"
                      className="w-full px-3 py-2 border border-purple-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 bg-purple-50/20"
                    />
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {[
                        'Youth Mentorship',
                        'Pre-Marital Counseling',
                        'Deliverance Session',
                        'Crisis Support',
                        'Prison Outreach',
                        'Elderly Care',
                        'Spiritual Direction',
                      ].map(pill => (
                        <button
                          key={pill}
                          type="button"
                          onClick={() => setCustomCategoryInput(pill)}
                          className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 hover:bg-teal-50 hover:text-teal-800 text-slate-700 border border-slate-200 transition-colors"
                        >
                          + {pill}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <select
                        value={formData.caseType}
                        onChange={e => setFormData({ ...formData, caseType: e.target.value as any })}
                        className="w-full px-2.5 py-2 border border-slate-200 rounded-md bg-white focus:outline-none focus:border-teal-700"
                      >
                        <optgroup label="Standard Categories">
                          {(categoriesData?.standardCategories || []).map(sc => (
                            <option key={sc} value={sc}>{sc}</option>
                          ))}
                        </optgroup>
                        {(categoriesData?.customCategories || []).length > 0 && (
                          <optgroup label="Custom Categories">
                            {(categoriesData?.customCategories || []).map(cc => (
                              <option key={cc} value={cc}>★ {cc}</option>
                            ))}
                          </optgroup>
                        )}
                      </select>
                    </div>
                    <div>
                      <select
                        value={formData.urgencyLevel}
                        onChange={e => setFormData({ ...formData, urgencyLevel: e.target.value as any })}
                        className="w-full px-2.5 py-2 border border-slate-200 rounded-md bg-white focus:outline-none focus:border-teal-700"
                      >
                        <option value="Low">Low Urgency</option>
                        <option value="Medium">Medium Urgency</option>
                        <option value="High">High Urgency</option>
                        <option value="Critical">Critical Urgency</option>
                      </select>
                    </div>
                  </div>
                )}

                {isCustomCategory && (
                  <div className="mt-3">
                    <label className="block font-semibold text-slate-700 mb-1">Urgency</label>
                    <select
                      value={formData.urgencyLevel}
                      onChange={e => setFormData({ ...formData, urgencyLevel: e.target.value as any })}
                      className="w-full px-2.5 py-2 border border-slate-200 rounded-md bg-white focus:outline-none focus:border-teal-700"
                    >
                      <option value="Low">Low Urgency</option>
                      <option value="Medium">Medium Urgency</option>
                      <option value="High">High Urgency</option>
                      <option value="Critical">Critical Urgency</option>
                    </select>
                  </div>
                )}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Summary / Matter *</label>
                <input
                  type="text"
                  required
                  value={formData.summary}
                  onChange={e => setFormData({ ...formData, summary: e.target.value })}
                  placeholder="e.g. Bereavement support: lost father in Kumasi"
                  className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:border-teal-700"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Confidential Pastoral Notes</label>
                <textarea
                  rows={3}
                  value={formData.counselingNotes}
                  onChange={e => setFormData({ ...formData, counselingNotes: e.target.value })}
                  placeholder="Session observations, scriptures shared, action plan..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:border-teal-700"
                />
              </div>

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
                  disabled={saving}
                  className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white font-medium rounded-md shadow-xs disabled:opacity-50 transition-colors"
                >
                  {saving ? 'Saving...' : 'Create Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
