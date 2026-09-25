import React, { useState, useEffect } from 'react';
import {
  User,
  CalendarCheck,
  HandCoins,
  Send,
  Heart,
  CheckCircle,
  AlertCircle,
  Clock,
  Sparkles,
  Phone,
  Mail,
  Home,
} from 'lucide-react';
import { ApiClient } from '../api';
import { User as UserType } from '../types';
import { useAutoDismissNotification } from '../utils/useAutoDismissNotification';

interface Props {
  user: UserType;
}

export const MemberPortalView: React.FC<Props> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'attendance' | 'giving' | 'prayer'>('overview');
  const [portalData, setPortalData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // Prayer request form
  const [prayerRequest, setPrayerRequest] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  const [submittingPrayer, setSubmittingPrayer] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  useAutoDismissNotification(notice, setNotice, 2000);
  useAutoDismissNotification(error, setError, 2000);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await ApiClient.get('/api/member/portal');
      setPortalData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load member portal.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSubmitPrayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prayerRequest.trim()) return;

    try {
      setSubmittingPrayer(true);
      setError(null);
      await ApiClient.post('/api/member/prayer-requests', {
        request: prayerRequest,
        urgency: isUrgent ? 'High' : 'Normal',
      });
      setNotice('Your confidential prayer request has been submitted to the pastoral team.');
      setPrayerRequest('');
      setIsUrgent(false);
      await loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmittingPrayer(false);
    }
  };

  if (loading && !portalData) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-slate-500">Loading Member Sanctuary Portal...</p>
        </div>
      </div>
    );
  }

  const member = portalData?.member || {};
  const church = portalData?.church || {};
  const attendance = Array.isArray(portalData?.attendance) ? portalData.attendance : [];
  const giving = Array.isArray(portalData?.giving) ? portalData.giving : [];
  const totalGiving = (giving || []).reduce((sum: number, g: any) => sum + (g?.amount || 0), 0);

  return (
    <div className="space-y-5 pb-20 text-left max-w-3xl mx-auto">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-700 to-indigo-800 rounded-2xl p-5 sm:p-6 text-white shadow-sm relative overflow-hidden">
        <div className="relative z-10 flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center font-bold text-xl backdrop-blur-xs">
            {member.fullName?.[0] || 'M'}
          </div>
          <div>
            <div className="text-xs text-blue-200 font-medium">{church.name}</div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">{member.fullName}</h2>
            <p className="text-xs text-blue-100 font-mono mt-0.5">
              Member ID: {member.memberCode} • {member.phone}
            </p>
          </div>
        </div>
      </div>

      {notice && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span>{notice}</span>
          </div>
          <button onClick={() => setNotice(null)} className="font-bold text-emerald-700">
            Dismiss
          </button>
        </div>
      )}

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-600" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="font-bold text-rose-700">
            Dismiss
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 bg-white rounded-2xl p-1 shadow-xs text-xs font-bold">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex-1 py-2.5 rounded-xl transition ${
            activeTab === 'overview' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          My Profile
        </button>
        <button
          onClick={() => setActiveTab('attendance')}
          className={`flex-1 py-2.5 rounded-xl transition ${
            activeTab === 'attendance' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Attendance ({attendance.length})
        </button>
        <button
          onClick={() => setActiveTab('giving')}
          className={`flex-1 py-2.5 rounded-xl transition ${
            activeTab === 'giving' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          My Giving ({giving.length})
        </button>
        <button
          onClick={() => setActiveTab('prayer')}
          className={`flex-1 py-2.5 rounded-xl transition ${
            activeTab === 'prayer' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Pastoral Prayer
        </button>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900">Sanctuary Profile Details</h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-400">Membership Status</span>
                <p className="font-bold text-emerald-700 mt-0.5">{member.membershipStatus}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-400">Baptism</span>
                <p className="font-bold text-slate-800 mt-0.5">{member.baptismStatus}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-400">Marital Status</span>
                <p className="font-bold text-slate-800 mt-0.5">{member.maritalStatus}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-400">Enrolled Since</span>
                <p className="font-bold text-slate-800 mt-0.5">{member.joinDate}</p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1">
              <div className="flex items-center space-x-2 text-slate-600">
                <Home className="w-3.5 h-3.5 text-slate-400" />
                <span>Residence: {member.address || 'Not provided'}</span>
              </div>
              <div className="flex items-center space-x-2 text-slate-600">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span>Phone: {member.phone}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ATTENDANCE */}
      {activeTab === 'attendance' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50 text-xs font-bold text-slate-700">
            My Service Attendance History
          </div>
          <div className="divide-y divide-slate-100">
            {(attendance || []).length === 0 ? (
              <p className="p-8 text-center text-xs text-slate-400">No attendance records logged.</p>
            ) : (
              (attendance || []).map((att: any) => (
                <div key={att.id} className="p-4 flex items-center justify-between text-xs hover:bg-slate-50">
                  <div>
                    <span className="font-bold text-slate-900">{att.serviceName}</span>
                    <p className="text-[11px] text-slate-500 mt-0.5">{att.serviceDate}</p>
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
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 3: GIVING */}
      {activeTab === 'giving' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-400 font-semibold">My Total Contributions</span>
              <p className="text-2xl font-extrabold text-emerald-600 mt-0.5">
                GH₵{totalGiving.toLocaleString()}
              </p>
            </div>
            <HandCoins className="w-8 h-8 text-emerald-500" />
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50 text-xs font-bold text-slate-700">
              Contribution Receipts History
            </div>
            <div className="divide-y divide-slate-100">
              {(giving || []).length === 0 ? (
                <p className="p-8 text-center text-xs text-slate-400">No giving records found.</p>
              ) : (
                (giving || []).map((g: any) => (
                  <div key={g.id} className="p-4 flex items-center justify-between text-xs hover:bg-slate-50">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-slate-900">{g.givingType}</span>
                        <span className="font-mono text-[10px] text-slate-400">{g.receiptNumber}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {g.date} • {g.paymentMethod}
                      </p>
                    </div>
                    <span className="font-extrabold text-emerald-600 text-sm">
                      GH₵{g.amount.toLocaleString()}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: PRAYER REQUEST */}
      {activeTab === 'prayer' && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <Heart className="w-4 h-4 text-rose-600" />
              <span>Submit Confidential Pastoral Prayer Request</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Your request is kept strictly confidential and only accessed by the senior pastor and intercessory leaders.
            </p>
          </div>

          <form onSubmit={handleSubmitPrayer} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Your Prayer Burden / Thanksgiving
              </label>
              <textarea
                rows={4}
                required
                value={prayerRequest}
                onChange={e => setPrayerRequest(e.target.value)}
                placeholder="Share your spiritual, health, family, or personal prayer need..."
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div>
                <span className="font-bold text-slate-800">Urgent Pastoral Need</span>
                <p className="text-[11px] text-slate-500">Flag for immediate pastoral attention</p>
              </div>
              <input
                type="checkbox"
                checked={isUrgent}
                onChange={e => setIsUrgent(e.target.checked)}
                className="h-4 w-4 text-blue-600 rounded border-slate-300"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submittingPrayer}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-xs flex items-center space-x-2 transition disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{submittingPrayer ? 'Submitting...' : 'Submit to Pastor'}</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
