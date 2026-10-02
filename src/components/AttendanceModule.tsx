import React, { useState, useEffect, useRef } from 'react';
import {
  CalendarCheck,
  CheckCircle,
  XCircle,
  Search,
  Calendar,
  Send,
  History,
  Users,
  CheckCheck,
  RefreshCw,
  Clock,
  Sparkles,
  Phone,
} from 'lucide-react';
import { ApiClient } from '../api';
import { AttendanceRecord, Member } from '../types';
import { useMembers } from '../context/MembersContext';
import { useAutoDismissNotification } from '../utils/useAutoDismissNotification';
import { toFriendlyErrorMessage } from '../utils/friendlyError';
import { hasPermission } from '../types';

export const AttendanceModule: React.FC = () => {
  const { members, loading: loadingMembers } = useMembers();
  const currentUser = ApiClient.getUser();
  const canRecordAttendance = hasPermission(currentUser, 'attendance:create') || hasPermission(currentUser, 'manage_attendance');

  // Active view: 'take_attendance' | 'history'
  const [activeView, setActiveView] = useState<'take_attendance' | 'history'>('take_attendance');

  // Selected date (Defaults to local today YYYY-MM-DD)
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().slice(0, 10));

  // In-memory status map for each member: memberId -> 'Present' | 'Absent' | undefined
  const [statusMap, setStatusMap] = useState<Record<string, 'Present' | 'Absent'>>({});

  const [loadingDateRecords, setLoadingDateRecords] = useState(false);
  const [savingAttendance, setSavingAttendance] = useState(false);
  const [sendAbsenceSms, setSendAbsenceSms] = useState(true);

  // Tracks whether attendance status has changed since the last successful save or initial load
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const isSavingRef = useRef<boolean>(false);

  // Search filter
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PRESENT' | 'ABSENT' | 'UNMARKED'>('ALL');

  // History list
  const [historyList, setHistoryList] = useState<
    Array<{
      date: string;
      presentCount: number;
      absentCount: number;
      totalCount: number;
      rate: number;
      markedBy: string;
    }>
  >([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Notifications
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  useAutoDismissNotification(notice, setNotice, 3000);
  useAutoDismissNotification(error, setError, 3000);

  // Load existing attendance records for the selected date
  const loadDateAttendance = async (targetDate: string) => {
    try {
      setLoadingDateRecords(true);
      const res = await ApiClient.get(`/api/church/attendance?date=${targetDate}`);
      const records: AttendanceRecord[] = res?.records || [];

      const newMap: Record<string, 'Present' | 'Absent'> = {};
      for (const r of records) {
        if (r.status === 'Present' || r.status === 'Absent') {
          newMap[r.memberId] = r.status;
        }
      }
      setStatusMap(newMap);
      setHasUnsavedChanges(false);
    } catch (err: any) {
      console.warn('Could not fetch existing date attendance:', err);
    } finally {
      setLoadingDateRecords(false);
    }
  };

  // Load history of attendance dates
  const loadHistory = async () => {
    try {
      setLoadingHistory(true);
      const res = await ApiClient.get('/api/church/attendance/history');
      setHistoryList(Array.isArray(res) ? res : []);
    } catch (err: any) {
      setError(toFriendlyErrorMessage(err));
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadDateAttendance(selectedDate);
  }, [selectedDate]);

  useEffect(() => {
    if (activeView === 'history') {
      loadHistory();
    }
  }, [activeView]);

  // Mutually exclusive toggle for a member
  const handleSetStatus = (memberId: string, status: 'Present' | 'Absent') => {
    if (!canRecordAttendance) {
      setError('You have read-only access to attendance records.');
      return;
    }
    // When the user clicks Present or Absent for any student/member, consider that an attendance change and immediately enable the Save Attendance button again.
    setHasUnsavedChanges(true);
    setStatusMap(prev => {
      // If already has that status, toggle it off (unmark)
      if (prev[memberId] === status) {
        const copy = { ...prev };
        delete copy[memberId];
        return copy;
      }
      return {
        ...prev,
        [memberId]: status,
      };
    });
  };

  // Batch actions
  const handleMarkAll = (status: 'Present' | 'Absent') => {
    if (!canRecordAttendance) {
      setError('You have read-only access to attendance records.');
      return;
    }
    setHasUnsavedChanges(true);
    const newMap: Record<string, 'Present' | 'Absent'> = { ...statusMap };
    for (const m of members) {
      newMap[m.id] = status;
    }
    setStatusMap(newMap);
    setNotice(`Marked all ${members.length} members as ${status}.`);
  };

  const handleClearAll = () => {
    if (!canRecordAttendance) {
      setError('You have read-only access to attendance records.');
      return;
    }
    setHasUnsavedChanges(true);
    setStatusMap({});
    setNotice('Cleared all attendance marks for this date.');
  };

  // Save / Complete Attendance
  const handleSaveAttendance = async () => {
    if (!canRecordAttendance) {
      setError('You do not have permission to record attendance.');
      return;
    }
    // Prevent saving if already saving or if no changes have been made since last save
    if (isSavingRef.current || savingAttendance || !hasUnsavedChanges) {
      return;
    }

    const markedEntries = Object.entries(statusMap);
    if (markedEntries.length === 0) {
      setError('Please mark at least one member as Present or Absent before saving.');
      return;
    }

    try {
      isSavingRef.current = true;
      setSavingAttendance(true);
      setError(null);

      const records = markedEntries.map(([memberId, status]) => ({
        memberId,
        status,
      }));

      await ApiClient.post('/api/church/attendance', {
        date: selectedDate,
        records,
        triggerAbsenceSms: sendAbsenceSms,
      });

      // 1. Show clear success notification: "Attendance saved successfully."
      setNotice('Attendance saved successfully.');
      // 2. Immediately disable the Save Attendance button and prevent duplicate saves
      setHasUnsavedChanges(false);

      // Refresh records in background for consistency while keeping save button disabled
      try {
        const res = await ApiClient.get(`/api/church/attendance?date=${selectedDate}`);
        const freshRecords: AttendanceRecord[] = res?.records || [];
        const freshMap: Record<string, 'Present' | 'Absent'> = {};
        for (const r of freshRecords) {
          if (r.status === 'Present' || r.status === 'Absent') {
            freshMap[r.memberId] = r.status;
          }
        }
        setStatusMap(freshMap);
        setHasUnsavedChanges(false);
      } catch {
        // Silently preserve current statusMap if background refresh encounters an issue
      }
    } catch (err: any) {
      // 5. Failed save: keep the Save button enabled so user can retry, show friendly error
      setHasUnsavedChanges(true);
      setError(toFriendlyErrorMessage(err, '/api/church/attendance') || 'Failed to save attendance. Please try again.');
    } finally {
      isSavingRef.current = false;
      setSavingAttendance(false);
    }
  };

  // Metrics
  const totalMembers = members.length;
  const presentCount = Object.values(statusMap).filter(s => s === 'Present').length;
  const absentCount = Object.values(statusMap).filter(s => s === 'Absent').length;
  const unmarkedCount = Math.max(0, totalMembers - (presentCount + absentCount));
  const attendanceRate = totalMembers > 0 ? Math.round((presentCount / totalMembers) * 100) : 0;

  // Filter members list by search and status tab
  const filteredMembers = members.filter(m => {
    const q = searchTerm.toLowerCase().trim();
    const matchesSearch =
      !q ||
      m.fullName.toLowerCase().includes(q) ||
      (m.phone && m.phone.includes(q)) ||
      (m.memberCode && m.memberCode.toLowerCase().includes(q));

    if (!matchesSearch) return false;

    const currentStatus = statusMap[m.id];
    if (statusFilter === 'PRESENT') return currentStatus === 'Present';
    if (statusFilter === 'ABSENT') return currentStatus === 'Absent';
    if (statusFilter === 'UNMARKED') return !currentStatus;
    return true;
  });

  return (
    <div className="space-y-5 pb-20 text-left">
      {/* Top Banner & View Switcher */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-teal-950 flex items-center space-x-2">
            <CalendarCheck className="w-5 h-5 text-teal-700" />
            <span>Attendance Management</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Fast, mobile-ready attendance taking with automatic absence SMS follow-up.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveView('take_attendance')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              activeView === 'take_attendance'
                ? 'bg-teal-700 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <CalendarCheck className="w-4 h-4" />
            <span>Take Attendance</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveView('history')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              activeView === 'history'
                ? 'bg-teal-700 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Attendance History</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {notice && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-medium text-emerald-900 flex items-center space-x-2 animate-fadeIn">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs font-medium text-rose-900 flex items-center space-x-2 animate-fadeIn">
          <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {activeView === 'take_attendance' ? (
        <>
          {/* Date Selector & KPI Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            {/* Date Picker */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-teal-700" />
                <span>Attendance Date</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={e => setSelectedDate(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg font-mono text-xs focus:outline-none focus:border-teal-700 bg-white"
                />
                <button
                  type="button"
                  title="Reload date"
                  onClick={() => loadDateAttendance(selectedDate)}
                  disabled={loadingDateRecords}
                  className="p-2 border border-slate-200 rounded-lg text-slate-500 hover:text-teal-700 hover:bg-slate-50 transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingDateRecords ? 'animate-spin' : ''}`} />
                </button>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Select any date to mark or review attendance.
              </p>
            </div>

            {/* Total Members */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 text-xs">
                <span>Roster Size</span>
                <Users className="w-4 h-4 text-slate-400" />
              </div>
              <div className="mt-2 text-2xl font-bold text-slate-900">{totalMembers}</div>
              <span className="text-[10px] text-slate-400">Total registered members</span>
            </div>

            {/* Present Count */}
            <div className="bg-emerald-50/60 p-3.5 rounded-xl border border-emerald-200 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-emerald-800 text-xs font-semibold">
                <span>Present</span>
                <CheckCircle className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="mt-2 text-2xl font-bold text-emerald-950 flex items-baseline gap-2">
                <span>{presentCount}</span>
                <span className="text-xs font-semibold text-emerald-700">({attendanceRate}%)</span>
              </div>
              <span className="text-[10px] text-emerald-700">Marked in fellowship</span>
            </div>

            {/* Absent Count */}
            <div className="bg-rose-50/60 p-3.5 rounded-xl border border-rose-200 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-rose-800 text-xs font-semibold">
                <span>Absent</span>
                <XCircle className="w-4 h-4 text-rose-600" />
              </div>
              <div className="mt-2 text-2xl font-bold text-rose-950 flex items-baseline gap-2">
                <span>{absentCount}</span>
                {unmarkedCount > 0 && (
                  <span className="text-[10px] font-normal text-slate-500">({unmarkedCount} unmarked)</span>
                )}
              </div>
              <span className="text-[10px] text-rose-700">Candidates for follow-up</span>
            </div>
          </div>

          {/* Action Toolbar & Filters */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search members by name, phone, or code..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-teal-700 bg-white"
                />
              </div>

              {/* Status Filter Tabs */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-[11px] font-medium shrink-0">
                <button
                  type="button"
                  onClick={() => setStatusFilter('ALL')}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    statusFilter === 'ALL' ? 'bg-white font-bold text-slate-900 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  All ({members.length})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('PRESENT')}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    statusFilter === 'PRESENT' ? 'bg-white font-bold text-emerald-800 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Present ({presentCount})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('ABSENT')}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    statusFilter === 'ABSENT' ? 'bg-white font-bold text-rose-800 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Absent ({absentCount})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('UNMARKED')}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    statusFilter === 'UNMARKED' ? 'bg-white font-bold text-slate-800 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Unmarked ({unmarkedCount})
                </button>
              </div>
            </div>

            {/* Quick Batch Actions & Save Bar */}
            {canRecordAttendance ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-semibold text-slate-500">Quick Actions:</span>
                  <button
                    type="button"
                    onClick={() => handleMarkAll('Present')}
                    className="px-2.5 py-1 text-xs font-semibold bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 rounded-md transition-colors flex items-center gap-1"
                  >
                    <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Mark All Present</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMarkAll('Absent')}
                    className="px-2.5 py-1 text-xs font-semibold bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200 rounded-md transition-colors flex items-center gap-1"
                  >
                    <XCircle className="w-3.5 h-3.5 text-rose-600" />
                    <span>Mark All Absent</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="px-2.5 py-1 text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
                  >
                    Clear All
                  </button>
                </div>

                {/* Save & Automated SMS Checkbox */}
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={sendAbsenceSms}
                      onChange={e => setSendAbsenceSms(e.target.checked)}
                      className="h-3.5 w-3.5 text-teal-700 rounded border-slate-300 focus:ring-teal-600"
                    />
                    <span>Send absence SMS to absentees</span>
                  </label>

                  <button
                    type="button"
                    onClick={handleSaveAttendance}
                    disabled={savingAttendance || !hasUnsavedChanges}
                    title={
                      savingAttendance
                        ? 'Saving attendance...'
                        : !hasUnsavedChanges
                        ? 'Mark members as Present or Absent to enable saving'
                        : 'Save attendance for this date'
                    }
                    className={`px-4 py-2 text-xs font-bold rounded-lg shadow-xs flex items-center gap-1.5 transition-all shrink-0 ${
                      savingAttendance || !hasUnsavedChanges
                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300/60 shadow-none'
                        : 'bg-teal-700 hover:bg-teal-800 text-white cursor-pointer active:scale-95'
                    }`}
                  >
                    {savingAttendance ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    <span>{savingAttendance ? 'Saving Attendance...' : 'Save Attendance'}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-lg text-xs text-amber-800 flex items-center justify-between">
                <span><strong>View-Only Mode:</strong> You can view attendance rosters and history. Recording attendance requires attendance modification permissions.</span>
              </div>
            )}
          </div>

          {/* Members Attendance List */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between text-xs font-bold text-slate-700">
              <span>Member ({filteredMembers.length})</span>
              <span>Attendance Status</span>
            </div>

            {loadingMembers || loadingDateRecords ? (
              <div className="p-8 text-center text-xs text-slate-500">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto text-teal-700 mb-2" />
                <span>Loading church members and attendance records...</span>
              </div>
            ) : filteredMembers.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                {searchTerm
                  ? `No members found matching "${searchTerm}".`
                  : 'No church members registered yet. Add members in the Members module first.'}
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredMembers.map(member => {
                  const status = statusMap[member.id];
                  const isPresent = status === 'Present';
                  const isAbsent = status === 'Absent';

                  return (
                    <div
                      key={member.id}
                      className={`p-3.5 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                        isPresent
                          ? 'bg-emerald-50/20'
                          : isAbsent
                          ? 'bg-rose-50/20'
                          : 'hover:bg-slate-50/60'
                      }`}
                    >
                      {/* Member Info */}
                      <div className="flex items-center space-x-3 min-w-0">
                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                            isPresent
                              ? 'bg-emerald-100 text-emerald-800'
                              : isAbsent
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-teal-50 text-teal-700'
                          }`}
                        >
                          {member.fullName.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-900 text-xs truncate">
                              {member.fullName}
                            </span>
                            {member.memberCode && (
                              <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1 rounded">
                                {member.memberCode}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-500">
                            {member.phone ? (
                              <span className="flex items-center gap-1 font-mono">
                                <Phone className="w-2.5 h-2.5 text-slate-400" />
                                {member.phone}
                              </span>
                            ) : (
                              <span className="text-amber-600 font-medium">No phone on file</span>
                            )}
                            {member.gender && (
                              <>
                                <span>•</span>
                                <span>{member.gender}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Prominent, Mobile-Friendly, Mutually Exclusive Buttons */}
                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        {/* PRESENT BUTTON */}
                        <button
                          type="button"
                          onClick={() => handleSetStatus(member.id, 'Present')}
                          className={`min-w-[96px] px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs ${
                            isPresent
                              ? 'bg-emerald-600 text-white ring-2 ring-emerald-500 ring-offset-1'
                              : 'bg-white text-slate-600 border border-slate-200 hover:border-emerald-300 hover:text-emerald-700 hover:bg-emerald-50/50'
                          }`}
                        >
                          <CheckCircle
                            className={`w-4 h-4 ${isPresent ? 'text-white' : 'text-emerald-600'}`}
                          />
                          <span>Present</span>
                        </button>

                        {/* ABSENT BUTTON */}
                        <button
                          type="button"
                          onClick={() => handleSetStatus(member.id, 'Absent')}
                          className={`min-w-[96px] px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs ${
                            isAbsent
                              ? 'bg-rose-600 text-white ring-2 ring-rose-500 ring-offset-1'
                              : 'bg-white text-slate-600 border border-slate-200 hover:border-rose-300 hover:text-rose-700 hover:bg-rose-50/50'
                          }`}
                        >
                          <XCircle
                            className={`w-4 h-4 ${isAbsent ? 'text-white' : 'text-rose-600'}`}
                          />
                          <span>Absent</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Bottom Card Save Bar */}
            {filteredMembers.length > 0 && !loadingMembers && !loadingDateRecords && (
              <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="text-xs text-slate-500">
                  {hasUnsavedChanges ? (
                    <span className="text-amber-700 font-semibold flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse inline-block" />
                      Unsaved attendance changes. Click Save Attendance to commit.
                    </span>
                  ) : (
                    <span className="text-slate-500 flex items-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                      Attendance state saved.
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleSaveAttendance}
                  disabled={savingAttendance || !hasUnsavedChanges}
                  title={
                    savingAttendance
                      ? 'Saving attendance...'
                      : !hasUnsavedChanges
                      ? 'Mark members as Present or Absent to enable saving'
                      : 'Save attendance for this date'
                  }
                  className={`px-4 py-2 text-xs font-bold rounded-lg shadow-xs flex items-center justify-center gap-1.5 transition-all shrink-0 ${
                    savingAttendance || !hasUnsavedChanges
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300/60 shadow-none'
                      : 'bg-teal-700 hover:bg-teal-800 text-white cursor-pointer active:scale-95'
                  }`}
                >
                  {savingAttendance ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  <span>{savingAttendance ? 'Saving Attendance...' : 'Save Attendance'}</span>
                </button>
              </div>
            )}
          </div>
        </>
      ) : (
        /* ATTENDANCE HISTORY VIEW */
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <History className="w-4 h-4 text-teal-700" />
                <span>Recorded Attendance Sessions</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Review past attendance dates, attendance rates, and follow-up status.
              </p>
            </div>
            <button
              type="button"
              onClick={loadHistory}
              disabled={loadingHistory}
              className="p-1.5 border border-slate-200 rounded-lg text-slate-500 hover:text-teal-700 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingHistory ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {loadingHistory ? (
            <div className="p-8 text-center text-xs text-slate-500">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto text-teal-700 mb-2" />
              <span>Loading attendance history...</span>
            </div>
          ) : historyList.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              No past attendance sessions recorded yet. Save attendance for today to get started.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {historyList.map(session => (
                <div
                  key={session.date}
                  className="p-4 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm font-mono">{session.date}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200">
                        {session.rate}% Attendance
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 flex items-center gap-3">
                      <span className="text-emerald-700 font-semibold">{session.presentCount} present</span>
                      <span>•</span>
                      <span className="text-rose-700 font-semibold">{session.absentCount} absent</span>
                      <span>•</span>
                      <span>Recorded by {session.markedBy}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDate(session.date);
                      setActiveView('take_attendance');
                    }}
                    className="px-3 py-1.5 text-xs font-bold text-teal-700 border border-teal-200 bg-teal-50/50 hover:bg-teal-100/60 rounded-lg transition-colors shrink-0"
                  >
                    View / Edit Session
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
