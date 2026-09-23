import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Plus,
  Clock,
  MapPin,
  User,
  CheckCircle,
  AlertCircle,
  X,
  Tag,
  Sparkles,
  Users,
  Search,
  Trash2,
  Check,
  Send,
  Filter,
} from 'lucide-react';
import { ApiClient } from '../api';
import { ChurchEvent } from '../types';

interface Props {
  onNavigateTab?: (tab: string) => void;
}

const QUICK_CUSTOM_CATEGORIES = [
  'Harvest Festival',
  'Youth Camp',
  'Praise & Worship Night',
  'Couples Banquet',
  'Children\'s Bible Quiz',
  'Community Outreach',
  'Church Anniversary',
  'Health Screening',
  'Fasting & Prayer',
  'Drama & Arts Gala',
];

const TARGET_AUDIENCE_OPTIONS = [
  'All Congregation',
  'Youth & Young Adults',
  'Women\'s Fellowship',
  'Men\'s Ministry',
  'Children\'s Ministry',
  'Choir & Worship Team',
  'Ushers & Protocol',
  'Ministers & Leadership',
  'New Converts',
  'Community / Public',
];

export const EventsModule: React.FC<Props> = ({ onNavigateTab }) => {
  const [events, setEvents] = useState<ChurchEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [eventMode, setEventMode] = useState<'standard' | 'custom'>('standard');

  const [formData, setFormData] = useState({
    title: '',
    category: 'Conference' as string,
    customCategory: '',
    isCustom: false,
    date: new Date().toISOString().slice(0, 10),
    startTime: '06:00 PM',
    endTime: '08:30 PM',
    venue: 'Main Sanctuary',
    guestSpeaker: '',
    targetAudience: 'All Congregation',
    expectedAttendance: '',
    description: '',
  });

  const [activeFilter, setActiveFilter] = useState<'ALL' | 'CUSTOM' | 'CONFERENCES' | 'VIGILS' | 'OTHER'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await ApiClient.get('/api/church/events');
      setEvents(res || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load church events.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openAddModal = (mode: 'standard' | 'custom' = 'standard') => {
    setEventMode(mode);
    setFormData({
      title: '',
      category: mode === 'custom' ? '' : 'Conference',
      customCategory: mode === 'custom' ? 'Harvest Festival' : '',
      isCustom: mode === 'custom',
      date: new Date().toISOString().slice(0, 10),
      startTime: '06:00 PM',
      endTime: '08:30 PM',
      venue: 'Main Sanctuary',
      guestSpeaker: '',
      targetAudience: 'All Congregation',
      expectedAttendance: '',
      description: '',
    });
    setShowAddModal(true);
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.date) {
      setError('Please provide event title and date.');
      return;
    }

    if (eventMode === 'custom' && !formData.customCategory.trim()) {
      setError('Please provide a category or theme for your custom event.');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const payload = {
        title: formData.title.trim(),
        category: eventMode === 'custom' ? formData.customCategory.trim() : formData.category,
        customCategory: eventMode === 'custom' ? formData.customCategory.trim() : undefined,
        isCustom: eventMode === 'custom',
        date: formData.date,
        startTime: formData.startTime.trim() || '09:00 AM',
        endTime: formData.endTime.trim() || '12:00 PM',
        venue: formData.venue.trim() || 'Main Sanctuary',
        guestSpeaker: formData.guestSpeaker.trim(),
        targetAudience: formData.targetAudience,
        expectedAttendance: formData.expectedAttendance ? parseInt(formData.expectedAttendance, 10) : undefined,
        description: formData.description.trim(),
      };

      const res = await ApiClient.post('/api/church/events', payload);
      setNotice(`Event "${res.title}" successfully added to the church calendar.`);
      setShowAddModal(false);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to schedule event.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (event: ChurchEvent) => {
    const nextStatus = event.status === 'Completed' ? 'Upcoming' : 'Completed';
    try {
      setError(null);
      await ApiClient.put(`/api/church/events/${event.id}`, { status: nextStatus });
      setEvents(prev => prev.map(e => e.id === event.id ? { ...e, status: nextStatus } : e));
      setNotice(`Marked "${event.title}" as ${nextStatus}.`);
    } catch (err: any) {
      setError(err.message || 'Failed to update event status.');
    }
  };

  const handleDeleteEvent = async (eventId: string, title: string) => {
    if (!window.confirm(`Are you sure you want to delete the event "${title}"?`)) {
      return;
    }

    try {
      setDeletingId(eventId);
      setError(null);
      await ApiClient.delete(`/api/church/events/${eventId}`);
      setEvents(prev => prev.filter(e => e.id !== eventId));
      setNotice(`Event "${title}" has been deleted.`);
    } catch (err: any) {
      setError(err.message || 'Failed to delete event.');
    } finally {
      setDeletingId(null);
    }
  };

  const filteredEvents = events.filter(evt => {
    // Search query matching
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      !query ||
      evt.title.toLowerCase().includes(query) ||
      (evt.category && evt.category.toLowerCase().includes(query)) ||
      (evt.venue && evt.venue.toLowerCase().includes(query)) ||
      (evt.guestSpeaker && evt.guestSpeaker.toLowerCase().includes(query)) ||
      (evt.targetAudience && evt.targetAudience.toLowerCase().includes(query));

    if (!matchesSearch) return false;

    // Filter tabs
    if (activeFilter === 'CUSTOM') {
      return !!evt.isCustom || !['Conference', 'Revival', 'Vigil', 'Retreat', 'Outreach', 'Ceremony'].includes(evt.category);
    }
    if (activeFilter === 'CONFERENCES') {
      return evt.category === 'Conference' || evt.category === 'Revival';
    }
    if (activeFilter === 'VIGILS') {
      return evt.category === 'Vigil' || evt.category === 'Retreat';
    }
    if (activeFilter === 'OTHER') {
      return evt.category === 'Outreach' || evt.category === 'Ceremony';
    }

    return true;
  });

  const customEventsCount = events.filter(
    e => !!e.isCustom || !['Conference', 'Revival', 'Vigil', 'Retreat', 'Outreach', 'Ceremony'].includes(e.category)
  ).length;

  return (
    <div className="space-y-5 pb-20 text-left">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-teal-950 flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-teal-700" />
            <span>Church Calendar & Program Schedule</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Coordinate revival conferences, harvest festivals, youth camps, vigils, and custom programs.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => openAddModal('custom')}
            className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-semibold text-xs rounded-md shadow-2xs flex items-center space-x-1.5 transition-colors"
          >
            <Sparkles className="w-4 h-4 text-amber-600" />
            <span>+ Add Custom Event</span>
          </button>
          <button
            onClick={() => openAddModal('standard')}
            className="px-3.5 py-2 bg-teal-700 hover:bg-teal-800 text-white font-medium text-xs rounded-md shadow-xs flex items-center justify-center space-x-1.5 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Schedule Program</span>
          </button>
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

      {/* Filter and Search Bar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <button
            onClick={() => setActiveFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
              activeFilter === 'ALL'
                ? 'bg-teal-800 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Programs ({events.length})
          </button>
          <button
            onClick={() => setActiveFilter('CUSTOM')}
            className={`px-3 py-1.5 rounded-lg font-semibold flex items-center space-x-1 transition-colors ${
              activeFilter === 'CUSTOM'
                ? 'bg-amber-600 text-white'
                : 'bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Custom Events ({customEventsCount})</span>
          </button>
          <button
            onClick={() => setActiveFilter('CONFERENCES')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
              activeFilter === 'CONFERENCES'
                ? 'bg-teal-800 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Conferences & Revivals
          </button>
          <button
            onClick={() => setActiveFilter('VIGILS')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
              activeFilter === 'VIGILS'
                ? 'bg-teal-800 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Vigils & Retreats
          </button>
        </div>

        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search events, ministers..."
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-600"
          />
        </div>
      </div>

      {/* Events List */}
      {loading ? (
        <div className="text-center py-12 text-slate-400 text-xs">Loading calendar events...</div>
      ) : filteredEvents.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-xl border border-slate-200 space-y-3">
          <Calendar className="w-10 h-10 text-slate-300 mx-auto" />
          <p className="text-sm font-semibold text-slate-700">No events found matching your criteria</p>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Schedule a revival, all-night vigil, or create a custom event like a youth camp, harvest praise night, or concert.
          </p>
          <div className="pt-2 flex justify-center space-x-2">
            <button
              onClick={() => openAddModal('custom')}
              className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-medium text-xs rounded-md"
            >
              + Create Custom Event
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEvents.map(evt => {
            const isCustomEvent =
              evt.isCustom ||
              !['Conference', 'Revival', 'Vigil', 'Retreat', 'Outreach', 'Ceremony'].includes(evt.category);

            return (
              <div
                key={evt.id}
                className={`bg-white p-5 rounded-xl border shadow-xs transition-all text-left space-y-3 flex flex-col justify-between ${
                  isCustomEvent
                    ? 'border-amber-200 hover:border-amber-400 bg-linear-to-b from-amber-50/20 to-white'
                    : 'border-slate-200 hover:border-teal-300'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold flex items-center space-x-1 ${
                        isCustomEvent
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : 'bg-teal-50 text-teal-800 border border-teal-200'
                      }`}
                    >
                      {isCustomEvent && <Sparkles className="w-3 h-3 text-amber-600" />}
                      <span>{evt.category}</span>
                    </span>

                    <button
                      type="button"
                      onClick={() => handleToggleStatus(evt)}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                        evt.status === 'Completed'
                          ? 'bg-slate-100 text-slate-600 border-slate-200'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                      }`}
                      title="Click to toggle status"
                    >
                      {evt.status || 'Upcoming'}
                    </button>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-teal-950 leading-snug">{evt.title}</h3>
                    {evt.description && (
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">{evt.description}</p>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="font-semibold text-slate-800">{evt.date}</span>
                      <span className="text-slate-400">• {evt.startTime} - {evt.endTime}</span>
                    </div>

                    {evt.venue && (
                      <div className="flex items-center space-x-2 text-[11px] text-slate-500">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{evt.venue}</span>
                      </div>
                    )}

                    {evt.guestSpeaker && (
                      <div className="flex items-center space-x-2 text-[11px] text-teal-800 font-medium">
                        <User className="w-3.5 h-3.5 shrink-0 text-teal-600" />
                        <span>Minister: {evt.guestSpeaker}</span>
                      </div>
                    )}

                    {evt.targetAudience && evt.targetAudience !== 'All Congregation' && (
                      <div className="flex items-center space-x-2 text-[11px] text-purple-700 font-medium">
                        <Users className="w-3.5 h-3.5 shrink-0 text-purple-500" />
                        <span>Target: {evt.targetAudience}</span>
                      </div>
                    )}

                    {evt.expectedAttendance && (
                      <div className="text-[10px] text-slate-400">
                        Expected Attendance: <span className="font-semibold text-slate-700">{evt.expectedAttendance}</span> people
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2">
                    {onNavigateTab && (
                      <button
                        type="button"
                        onClick={() => onNavigateTab('sms')}
                        className="text-[11px] font-medium text-teal-700 hover:text-teal-900 flex items-center space-x-1 hover:underline"
                        title="Broadcast announcement SMS for this event"
                      >
                        <Send className="w-3 h-3" />
                        <span>Broadcast SMS</span>
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    disabled={deletingId === evt.id}
                    onClick={() => handleDeleteEvent(evt.id, evt.title)}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors disabled:opacity-50"
                    title="Delete event"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE / SCHEDULE EVENT MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 text-left space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {eventMode === 'custom' ? 'Add Custom Church Event' : 'Schedule Church Program'}
                </h3>
                <p className="text-xs text-slate-500">
                  {eventMode === 'custom'
                    ? 'Define a bespoke event, custom category, target audience, and venue'
                    : 'Schedule standard revival conferences, vigils, and services'}
                </p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="flex border border-slate-200 rounded-lg p-1 bg-slate-50 text-xs font-semibold">
              <button
                type="button"
                onClick={() => {
                  setEventMode('standard');
                  setFormData(prev => ({
                    ...prev,
                    isCustom: false,
                    category: prev.category || 'Conference',
                  }));
                }}
                className={`flex-1 py-1.5 rounded-md transition-colors ${
                  eventMode === 'standard' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Standard Program
              </button>
              <button
                type="button"
                onClick={() => {
                  setEventMode('custom');
                  setFormData(prev => ({
                    ...prev,
                    isCustom: true,
                    customCategory: prev.customCategory || 'Harvest Festival',
                  }));
                }}
                className={`flex-1 py-1.5 rounded-md flex items-center justify-center space-x-1 transition-colors ${
                  eventMode === 'custom' ? 'bg-amber-500 text-white shadow-2xs font-bold' : 'text-amber-800 hover:text-amber-900'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>★ Custom Event</span>
              </button>
            </div>

            <form onSubmit={handleCreateEvent} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Event Title *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  placeholder={
                    eventMode === 'custom'
                      ? 'e.g. Annual Harvest Thanksgiving & Praise Night'
                      : 'e.g. 21 Days Fasting & Prayer Revival'
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-700"
                />
              </div>

              {eventMode === 'custom' ? (
                <div className="space-y-2 bg-amber-50/50 p-3.5 rounded-xl border border-amber-200">
                  <div className="flex items-center justify-between">
                    <label className="block font-bold text-amber-950">
                      Custom Category / Event Type *
                    </label>
                    <span className="text-[10px] text-amber-800 font-medium">Type or pick below</span>
                  </div>
                  <input
                    type="text"
                    required
                    value={formData.customCategory}
                    onChange={e => setFormData({ ...formData, customCategory: e.target.value })}
                    placeholder="e.g. Youth Camp, Harvest Festival, Couples Dinner..."
                    className="w-full px-3 py-2 border border-amber-300 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 text-xs font-semibold"
                  />
                  <div className="pt-1">
                    <span className="text-[10px] font-bold text-amber-900 block mb-1">Quick Suggestions:</span>
                    <div className="flex flex-wrap gap-1">
                      {QUICK_CUSTOM_CATEGORIES.map(cat => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setFormData({ ...formData, customCategory: cat })}
                          className={`px-2 py-0.5 rounded-md text-[10px] font-medium border transition-colors ${
                            formData.customCategory === cat
                              ? 'bg-amber-600 text-white border-amber-600 font-bold'
                              : 'bg-white text-slate-700 border-slate-200 hover:border-amber-400'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Program Type</label>
                    <select
                      value={formData.category}
                      onChange={e => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-2.5 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-teal-700"
                    >
                      <option value="Conference">Conference / Convention</option>
                      <option value="Revival">Revival Meeting</option>
                      <option value="Vigil">All-Night Vigil</option>
                      <option value="Retreat">Leadership Retreat</option>
                      <option value="Outreach">Evangelism Outreach</option>
                      <option value="Ceremony">Wedding / Dedication</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Target Audience</label>
                    <select
                      value={formData.targetAudience}
                      onChange={e => setFormData({ ...formData, targetAudience: e.target.value })}
                      className="w-full px-2.5 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-teal-700"
                    >
                      {TARGET_AUDIENCE_OPTIONS.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {eventMode === 'custom' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Target Department / Group</label>
                    <select
                      value={formData.targetAudience}
                      onChange={e => setFormData({ ...formData, targetAudience: e.target.value })}
                      className="w-full px-2.5 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-teal-700"
                    >
                      {TARGET_AUDIENCE_OPTIONS.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Expected Attendance</label>
                    <input
                      type="number"
                      min="1"
                      value={formData.expectedAttendance}
                      onChange={e => setFormData({ ...formData, expectedAttendance: e.target.value })}
                      placeholder="e.g. 250"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-teal-700"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block font-semibold text-slate-700 mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-2.5 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-teal-700"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Start Time</label>
                  <input
                    type="text"
                    value={formData.startTime}
                    onChange={e => setFormData({ ...formData, startTime: e.target.value })}
                    placeholder="06:00 PM"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-teal-700"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">End Time</label>
                  <input
                    type="text"
                    value={formData.endTime}
                    onChange={e => setFormData({ ...formData, endTime: e.target.value })}
                    placeholder="08:30 PM"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-teal-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Venue</label>
                  <input
                    type="text"
                    value={formData.venue}
                    onChange={e => setFormData({ ...formData, venue: e.target.value })}
                    placeholder="Main Sanctuary or Auditorium"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-teal-700"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Guest Minister / Speaker</label>
                  <input
                    type="text"
                    value={formData.guestSpeaker}
                    onChange={e => setFormData({ ...formData, guestSpeaker: e.target.value })}
                    placeholder="e.g. Rev. Dr. Mensah Otabil"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-teal-700"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description / Memo</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Program objectives, scripture reference, or instructions..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-700"
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
                  className={`px-4 py-2 text-white font-medium rounded-md shadow-xs disabled:opacity-50 transition-colors ${
                    eventMode === 'custom'
                      ? 'bg-amber-600 hover:bg-amber-700'
                      : 'bg-teal-700 hover:bg-teal-800'
                  }`}
                >
                  {saving ? 'Saving...' : eventMode === 'custom' ? 'Create Custom Event' : 'Schedule Program'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
