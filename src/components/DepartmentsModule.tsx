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
} from 'lucide-react';
import { ApiClient } from '../api';
import { DepartmentOrGroup } from '../types';

export const DepartmentsModule: React.FC = () => {
  const [departments, setDepartments] = useState<DepartmentOrGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    category: 'Department' as const,
    leaderName: '',
    leaderPhone: '',
    meetingSchedule: 'Sundays after service',
    meetingVenue: 'Main Sanctuary',
    description: '',
  });

  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await ApiClient.get('/api/church/departments');
      setDepartments(res);
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
    if (!formData.name || !formData.leaderName) {
      setError('Please provide department name and leader name.');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await ApiClient.post('/api/church/departments', formData);
      setNotice(`"${formData.name}" created successfully.`);
      setShowAddModal(false);
      await loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

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
          onClick={() => setShowAddModal(true)}
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

      {/* Grid of Departments */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {departments.map(dept => (
          <div
            key={dept.id}
            className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-teal-300 transition-colors text-left space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-200">
                {dept.category}
              </span>
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
            </div>
          </div>
        ))}
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value as any })}
                    className="w-full px-2.5 py-2 border border-slate-200 rounded-md bg-white focus:outline-none focus:border-teal-700"
                  >
                    <option value="Department">Department</option>
                    <option value="Ministry">Ministry</option>
                    <option value="Cell Group">Cell Group / Fellowship</option>
                    <option value="Committee">Committee</option>
                  </select>
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
                  placeholder="e.g. Saturdays 4:00 PM - 6:00 PM"
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
                  {saving ? 'Creating...' : 'Create Unit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
