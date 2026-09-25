import React, { useState, useEffect } from 'react';
import {
  CalendarCheck,
  Plus,
  CheckCircle,
  XCircle,
  Clock,
  Send,
  AlertTriangle,
  UserCheck,
  UserX,
  Search,
  CheckCheck,
  Calendar,
  X,
} from 'lucide-react';
import { ApiClient } from '../api';
import { ChurchService, AttendanceRecord, Member } from '../types';
import { useMembers } from '../context/MembersContext';
import { useAutoDismissNotification } from '../utils/useAutoDismissNotification';

export const AttendanceModule: React.FC = () => {
  const { members } = useMembers();
  const [services, setServices] = useState<ChurchService[]>([]);
  const [selectedService, setSelectedService] = useState<ChurchService | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modals & Actions
  const [showNewServiceModal, setShowNewServiceModal] = useState(false);
  const [serviceFormData, setServiceFormData] = useState({
    serviceName: '',
    serviceType: 'Sunday Service',
    date: new Date().toISOString().slice(0, 10),
    startTime: '08:30 AM',
    endTime: '11:00 AM',
    preacher: '',
    worshipLeader: '',
  });

  const [savingAttendance, setSavingAttendance] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [finalizationResult, setFinalizationResult] = useState<any | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  useAutoDismissNotification(notice, setNotice, 2000);
  useAutoDismissNotification(error, setError, 2000);

  const loadServices = async () => {
    try {
      setLoading(true);
      const srvList = await ApiClient.get('/api/church/services');
      setServices(Array.isArray(srvList) ? srvList : []);

      if (Array.isArray(srvList) && srvList.length > 0 && !selectedService) {
        setSelectedService(srvList[0]);
        await loadAttendanceForService(srvList[0].id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load attendance.');
    } finally {
      setLoading(false);
    }
  };

  const loadAttendanceForService = async (serviceId: string) => {
    try {
      const records = await ApiClient.get(`/api/church/services/${serviceId}/attendance`);
      setAttendanceRecords(Array.isArray(records) ? records : []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadServices();
  }, []);

  const handleSelectService = async (srv: ChurchService) => {
    setSelectedService(srv);
    setFinalizationResult(null);
    await loadAttendanceForService(srv.id);
  };

  const handleCreateService = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await ApiClient.post('/api/church/services', serviceFormData);
      setNotice(`Service "${created.serviceName}" scheduled.`);
      setShowNewServiceModal(false);
      await loadServices();
      setSelectedService(created);
      await loadAttendanceForService(created.id);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleToggleMemberAttendance = async (memberId: string, currentStatus?: string) => {
    if (!selectedService) return;

    let nextStatus: 'Present' | 'Absent' | 'Excused' = 'Present';
    if (currentStatus === 'Present') nextStatus = 'Absent';
    else if (currentStatus === 'Absent') nextStatus = 'Excused';
    else nextStatus = 'Present';

    try {
      setSavingAttendance(true);
      await ApiClient.post(`/api/church/services/${selectedService.id}/attendance`, {
        records: [{ memberId, status: nextStatus }],
      });
      await loadAttendanceForService(selectedService.id);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSavingAttendance(false);
    }
  };

  const handleMarkAll = async (status: 'Present' | 'Absent') => {
    if (!selectedService) return;
    try {
      setSavingAttendance(true);
      const records = members.map(m => ({ memberId: m.id, status }));
      await ApiClient.post(`/api/church/services/${selectedService.id}/attendance`, { records });
      await loadAttendanceForService(selectedService.id);
      setNotice(`Marked all ${members.length} members as ${status}.`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSavingAttendance(false);
    }
  };

  const handleFinalizeAttendanceAndSms = async () => {
    if (!selectedService) return;
    if (
      !confirm(
        `Finalize attendance for "${selectedService.serviceName}" (${selectedService.date})?\n\nThis will trigger the automated absence follow-up SMS engine for absent members.`
      )
    )
      return;

    try {
      setFinalizing(true);
      setError(null);
      const res = await ApiClient.post(`/api/church/services/${selectedService.id}/finalize-attendance`);
      setFinalizationResult(res);
      setNotice(res.message);
      // Reload services to update finalized badge
      const updatedList = await ApiClient.get('/api/church/services');
      setServices(Array.isArray(updatedList) ? updatedList : []);
      const updatedCurrent = (Array.isArray(updatedList) ? updatedList : []).find((s: ChurchService) => s.id === selectedService.id);
      if (updatedCurrent) setSelectedService(updatedCurrent);
    } catch (err: any) {
      setError(err.message || 'Failed to finalize attendance.');
    } finally {
      setFinalizing(false);
    }
  };

  const presentCount = (attendanceRecords || []).filter(a => a.status === 'Present').length;
  const absentCount = (attendanceRecords || []).filter(a => a.status === 'Absent').length;
  const excusedCount = (attendanceRecords || []).filter(a => a.status === 'Excused').length;

  const filteredMembers = (members || []).filter(
    m =>
      (m.fullName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.phone || '').includes(searchTerm) ||
      (m.memberCode || '').toLowerCase().includes(searchTerm)
  );

  return (
    <div className="space-y-5 pb-20 text-left">
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-teal-950 flex items-center space-x-2">
            <CalendarCheck className="w-5 h-5 text-teal-700" />
            <span>Attendance & Automated Follow-Up</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time service roll calls with automatic absence SMS notification engine.
          </p>
        </div>
        <button
          onClick={() => setShowNewServiceModal(true)}
          className="px-3.5 py-2 bg-teal-700 hover:bg-teal-800 text-white font-medium text-xs rounded-md shadow-xs flex items-center justify-center space-x-1.5 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>New Service Session</span>
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
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="font-bold text-rose-700 hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Service Selector Carousel / Horizontal Scroll */}
      <div className="space-y-2">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Service Sessions
        </span>
        <div className="flex space-x-3 overflow-x-auto pb-2 scrollbar-thin">
          {(services || []).map(srv => {
            const isSelected = selectedService?.id === srv.id;
            return (
              <button
                key={srv.id}
                onClick={() => handleSelectService(srv)}
                className={`min-w-[210px] p-3.5 rounded-xl border text-left transition-colors shrink-0 ${
                  isSelected
                    ? 'bg-teal-800 text-white border-teal-800 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-teal-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {srv.serviceType}
                  </span>
                  {srv.attendanceFinalized && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      isSelected ? 'bg-emerald-400/20 text-emerald-100' : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      Finalized
                    </span>
                  )}
                </div>
                <h4 className="text-xs font-bold truncate">{srv.serviceName}</h4>
                <p className={`text-[11px] mt-0.5 ${isSelected ? 'text-teal-100' : 'text-slate-500'}`}>
                  {srv.date} • {srv.startTime}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {selectedService && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          {/* Active Service Status Bar */}
          <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-bold text-slate-900">{selectedService.serviceName}</h3>
                {selectedService.attendanceFinalized ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Attendance Finalized & SMS Dispatched ({selectedService.absenceSmsSentCount || 0} sent)
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                    Active Session • Unfinalized
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Date: {selectedService.date} • Preacher: {selectedService.preacher || 'Senior Pastor'}
              </p>
            </div>

            {/* Finalize Button */}
            <div className="flex items-center space-x-2">
              <button
                onClick={handleFinalizeAttendanceAndSms}
                disabled={finalizing}
                className="px-3.5 py-2 bg-teal-700 hover:bg-teal-800 text-white font-medium text-xs rounded-md shadow-xs flex items-center space-x-1.5 transition-colors disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>
                  {finalizing ? 'Finalizing & Sending SMS...' : 'Finalize & Dispatch Absence SMS'}
                </span>
              </button>
            </div>
          </div>

          {/* Absence SMS Dispatch Result Banner */}
          {finalizationResult && (
            <div className="p-4 bg-emerald-50 border-b border-emerald-200 text-emerald-900 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div>
                <p className="font-bold">Automated Follow-Up Dispatched:</p>
                <p className="text-emerald-700 mt-0.5">
                  Identified {finalizationResult.stats?.totalAbsent} absent members: {finalizationResult.stats?.sent} personalized absence SMS submitted to gateway successfully (pending carrier delivery). ({finalizationResult.stats?.skipped} duplicate-prevented / invalid numbers).
                </p>
              </div>
              <button
                onClick={() => setFinalizationResult(null)}
                className="text-xs font-bold text-emerald-700 hover:underline"
              >
                Close
              </button>
            </div>
          )}

          {/* Quick Metrics & Batch Actions */}
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center space-x-4 font-semibold">
              <span className="text-emerald-600 flex items-center space-x-1">
                <UserCheck className="w-4 h-4" />
                <span>Present: {presentCount}</span>
              </span>
              <span className="text-rose-600 flex items-center space-x-1">
                <UserX className="w-4 h-4" />
                <span>Absent: {absentCount}</span>
              </span>
              <span className="text-slate-500">Excused: {excusedCount}</span>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleMarkAll('Present')}
                className="px-2.5 py-1 text-slate-600 hover:text-emerald-700 bg-slate-100 hover:bg-emerald-50 rounded-lg text-[11px] font-semibold"
              >
                Mark All Present
              </button>
              <button
                onClick={() => handleMarkAll('Absent')}
                className="px-2.5 py-1 text-slate-600 hover:text-rose-700 bg-slate-100 hover:bg-rose-50 rounded-lg text-[11px] font-semibold"
              >
                Mark All Absent
              </button>
            </div>
          </div>

          {/* Search bar within attendance list */}
          <div className="p-3 border-b border-slate-100">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search member in service roster..."
                className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Roll Call Members List */}
          <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
            {(filteredMembers || []).map(member => {
              const record = (attendanceRecords || []).find(a => a.memberId === member.id);
              const status = record?.status;

              return (
                <div
                  key={member.id}
                  className="p-3.5 hover:bg-slate-50/80 transition flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-slate-900 truncate">{member.fullName}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{member.memberCode}</span>
                    </div>
                    <span className="text-[11px] text-slate-500">{member.phone}</span>
                  </div>

                  {/* Status Toggle Buttons */}
                  <div className="flex items-center space-x-1 shrink-0">
                    <button
                      onClick={() => handleToggleMemberAttendance(member.id, status)}
                      className={`px-3 py-1 rounded-xl font-bold text-xs transition flex items-center space-x-1 ${
                        status === 'Present'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : status === 'Absent'
                          ? 'bg-rose-600 text-white shadow-xs'
                          : status === 'Excused'
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}
                    >
                      {status === 'Present' && <CheckCircle className="w-3.5 h-3.5" />}
                      {status === 'Absent' && <XCircle className="w-3.5 h-3.5" />}
                      <span>{status || 'Unmarked'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* NEW SERVICE MODAL */}
      {showNewServiceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 text-left space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-teal-950">Create Service Session</h3>
              <button
                onClick={() => setShowNewServiceModal(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateService} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Service Title *</label>
                <input
                  type="text"
                  required
                  value={serviceFormData.serviceName}
                  onChange={e => setServiceFormData({ ...serviceFormData, serviceName: e.target.value })}
                  placeholder="e.g. Sunday First Service / Midweek"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Service Type</label>
                  <select
                    value={serviceFormData.serviceType}
                    onChange={e => setServiceFormData({ ...serviceFormData, serviceType: e.target.value })}
                    className="w-full px-2.5 py-2 border border-slate-300 rounded-xl bg-white"
                  >
                    <option value="Sunday Service">Sunday Service</option>
                    <option value="Midweek Service">Midweek Service</option>
                    <option value="Friday Prayer">Friday Prayer</option>
                    <option value="Communion Service">Communion Service</option>
                    <option value="Special Program">Special Program</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={serviceFormData.date}
                    onChange={e => setServiceFormData({ ...serviceFormData, date: e.target.value })}
                    className="w-full px-2.5 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Start Time</label>
                  <input
                    type="text"
                    value={serviceFormData.startTime}
                    onChange={e => setServiceFormData({ ...serviceFormData, startTime: e.target.value })}
                    placeholder="08:30 AM"
                    className="w-full px-2.5 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Preacher</label>
                  <input
                    type="text"
                    value={serviceFormData.preacher}
                    onChange={e => setServiceFormData({ ...serviceFormData, preacher: e.target.value })}
                    placeholder="Senior Pastor"
                    className="w-full px-2.5 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowNewServiceModal(false)}
                  className="px-3.5 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white font-medium rounded-md shadow-xs transition-colors"
                >
                  Save Service
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
