import React, { useState, useEffect } from 'react';
import {
  Network,
  Plus,
  Users,
  Clock,
  MapPin,
  Phone,
  User,
  CheckCircle,
  AlertCircle,
  X,
  Search,
  Trash2,
} from 'lucide-react';
import { ApiClient } from '../api';
import { DepartmentOrGroup } from '../types';
import { useAutoDismissNotification } from '../utils/useAutoDismissNotification';

export const DepartmentsModule: React.FC = () => {
  const [departments, setDepartments] = useState<DepartmentOrGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Custom Category State
  const [categoriesData, setCategoriesData] = useState<{
    standardCategories: string[];
    customCategories: string[];
    allCategories: string[];
  }>({
    standardCategories: ['Department', 'Ministry', 'Cell Group', 'Committee'],
    customCategories: [],
    allCategories: ['Department', 'Ministry', 'Cell Group', 'Committee'],
  });
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [customCategoryInput, setCustomCategoryInput] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    category: 'Department' as any,
    leaderName: '',
    leaderPhone: '',
    meetingSchedule: 'Sundays after service',
    meetingVenue: 'Main Sanctuary',
    description: '',
  });

  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  useAutoDismissNotification(notice, setNotice, 2000);
  useAutoDismissNotification(error, setError, 2000);

  // In-app Delete Confirmation Modal
  const [departmentToDelete, setDepartmentToDelete] = useState<DepartmentOrGroup | null>(null);
  const [isDeletingDepartment, setIsDeletingDepartment] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [res, catRes] = await Promise.all([
        ApiClient.get('/api/church/departments').catch(() => []),
        ApiClient.get('/api/church/department-categories').catch(() => null),
      ]);
      setDepartments(Array.isArray(res) ? res : []);
      if (catRes) {
        setCategoriesData(prev => ({
          standardCategories: Array.isArray(catRes.standardCategories) ? catRes.standardCategories : prev.standardCategories,
          customCategories: Array.isArray(catRes.customCategories) ? catRes.customCategories : prev.customCategories,
          allCategories: Array.isArray(catRes.allCategories) ? catRes.allCategories : prev.allCategories,
        }));
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load departments.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    const actualCategory = isCustomCategory ? customCategoryInput.trim() : formData.category;

    if (!formData.name || !formData.leaderName) {
      setError('Please provide department name and leader name.');
      return;
    }
    if (!actualCategory) {
      setError('Please provide a category for this unit.');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await ApiClient.post('/api/church/departments', {
        ...formData,
        category: actualCategory,
        customCategory: isCustomCategory ? actualCategory : undefined,
        isCustom: isCustomCategory,
      });
      setNotice(`"${formData.name}" created successfully.`);
      setShowAddModal(false);
      setIsCustomCategory(false);
      setCustomCategoryInput('');
      setFormData({
        name: '',
        category: 'Department',
        leaderName: '',
        leaderPhone: '',
        meetingSchedule: 'Sundays after service',
        meetingVenue: 'Main Sanctuary',
        description: '',
      });
      await loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const filteredDepts = (departments || []).filter(dept => {
    const matchesSearch =
      (dept.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (dept.leaderName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (dept.category && dept.category.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCat =
      categoryFilter === 'ALL' || (dept.category && dept.category.toLowerCase() === categoryFilter.toLowerCase());
    return matchesSearch && matchesCat;
  });

  return (
    <div className="space-y-5 pb-20 text-left">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-teal-950 flex items-center space-x-2">
            <Network className="w-5 h-5 text-teal-700" />
            <span>Departments, Ministries & Cell Groups</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Organize church workforce, ministry units, and home care cell fellowships.
          </p>
        </div>
        <button
          onClick={() => {
            setIsCustomCategory(false);
            setCustomCategoryInput('');
            setShowAddModal(true);
          }}
          className="px-3.5 py-2 bg-teal-700 hover:bg-teal-800 text-white font-medium text-xs rounded-md shadow-xs flex items-center justify-center space-x-1.5 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>New Unit / Group</span>
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

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search group, leader, category..."
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-md focus:outline-none focus:border-teal-700"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
          <span className="text-xs text-slate-500 font-medium">Filter Category:</span>
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-md bg-white text-slate-700 font-medium focus:outline-none focus:border-teal-700"
          >
            <option value="ALL">All Categories ({(departments || []).length})</option>
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

      {/* Grid of Departments */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredDepts.length === 0 ? (
          <div className="col-span-full bg-white p-8 rounded-xl border border-slate-200 text-center text-xs text-slate-400">
            No departments or ministries found matching your filter.
          </div>
        ) : (
          filteredDepts.map(dept => {
            const isCustom = (dept as any).isCustom || categoriesData.customCategories.includes(dept.category);
            return (
              <div
                key={dept.id}
                className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-teal-300 transition-colors text-left space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-200">
                      {dept.category}
                    </span>
                    {isCustom && (
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-purple-100 text-purple-700">
                        Custom
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-semibold text-slate-500 flex items-center space-x-1">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    <span>{dept.memberCount || 0} Members</span>
                  </span>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-teal-950">{dept.name}</h3>
                  {dept.description && (
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{dept.description}</p>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                  <div className="flex items-center space-x-2">
                    <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="font-medium text-slate-800">{dept.leaderName}</span>
                    {dept.leaderPhone && (
                      <span className="text-[11px] text-slate-400">({dept.leaderPhone})</span>
                    )}
                  </div>

                  {dept.meetingSchedule && (
                    <div className="flex items-center space-x-2 text-[11px] text-slate-500">
                      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{dept.meetingSchedule}</span>
                    </div>
                  )}

                  {dept.meetingVenue && (
                    <div className="flex items-center space-x-2 text-[11px] text-slate-500">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{dept.meetingVenue}</span>
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() => setDepartmentToDelete(dept)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                      title={`Delete ${dept.name}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* CREATE MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-slate-200 text-left space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-teal-950">Create Church Unit / Group</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateDepartment} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Group / Unit Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Levites Choir, Protocol, Youth Ministry"
                  className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-700"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-700">Category *</label>
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
                      placeholder="e.g. Task Force, Media & IT Team, Welfare Board"
                      className="w-full px-3 py-2 border border-purple-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 bg-purple-50/20"
                    />
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {[
                        'Task Force',
                        'Media & IT Team',
                        'Welfare Board',
                        'Band & Orchestra',
                        'Evangelism Wing',
                        'Board of Trustees',
                        'Security & Safety',
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
                  <select
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value as any })}
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
                )}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Leader Name *</label>
                <input
                  type="text"
                  required
                  value={formData.leaderName}
                  onChange={e => setFormData({ ...formData, leaderName: e.target.value })}
                  placeholder="e.g. Deaconess Mary"
                  className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:border-teal-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Leader Phone</label>
                  <input
                    type="text"
                    value={formData.leaderPhone}
                    onChange={e => setFormData({ ...formData, leaderPhone: e.target.value })}
                    placeholder="024XXXXXXX"
                    className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:border-teal-700"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Meeting Venue</label>
                  <input
                    type="text"
                    value={formData.meetingVenue}
                    onChange={e => setFormData({ ...formData, meetingVenue: e.target.value })}
                    placeholder="Main Sanctuary"
                    className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:border-teal-700"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Meeting Schedule</label>
                <input
                  type="text"
                  value={formData.meetingSchedule}
                  onChange={e => setFormData({ ...formData, meetingSchedule: e.target.value })}
                  placeholder="Sundays after service"
                  className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:border-teal-700"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description / Mandate</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Briefly state this group's mission and purpose..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:border-teal-700"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2 border-t border-slate-100">
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
                  {saving ? 'Creating...' : 'Create Unit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* IN-APP DELETE DEPARTMENT CONFIRMATION MODAL                         */}
      {/* =================================================================== */}
      {departmentToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden text-xs text-left animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 bg-rose-50 border-b border-rose-100 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-rose-950">Delete Church Unit</h3>
                  <p className="text-[11px] text-rose-600">Remove department or fellowship group</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDepartmentToDelete(null)}
                disabled={isDeletingDepartment}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-3">
              <p className="text-slate-700 leading-relaxed text-xs">
                Are you sure you want to delete the unit <strong className="text-slate-900 font-bold">&quot;{departmentToDelete.name}&quot;</strong>?
              </p>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-slate-600 text-[11px]">
                <div><strong>Category:</strong> {departmentToDelete.category}</div>
                <div><strong>Leader:</strong> {departmentToDelete.leaderName || 'None assigned'}</div>
              </div>
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-[11px]">
                <strong>Warning:</strong> Deleting this unit removes the group from the church directory.
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setDepartmentToDelete(null)}
                disabled={isDeletingDepartment}
                className="px-4 py-2 text-slate-600 font-semibold hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteDepartment}
                disabled={isDeletingDepartment}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-xs transition flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
              >
                {isDeletingDepartment ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Yes, Delete Unit</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
