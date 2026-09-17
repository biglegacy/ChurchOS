import React, { useState } from 'react';
import {
  Cake,
  Send,
  CheckCircle2,
  Calendar,
  Sparkles,
  Phone,
  Clock,
  ChevronRight,
  MessageSquare,
  AlertCircle,
  X,
  UserCheck,
} from 'lucide-react';
import { ApiClient } from '../api';
import { MemberBirthday, UpcomingBirthdaysData, Church } from '../types';

interface Props {
  initialData?: UpcomingBirthdaysData | null;
  church?: Church | null;
  onNavigateToMembers?: () => void;
  onRefresh?: () => void;
}

export const UpcomingBirthdaysWidget: React.FC<Props> = ({
  initialData,
  church,
  onNavigateToMembers,
  onRefresh,
}) => {
  const [data, setData] = useState<UpcomingBirthdaysData | null>(initialData || null);
  const [loading, setLoading] = useState(false);
  const [sendingMemberId, setSendingMemberId] = useState<string | null>(null);
  const [sendingAll, setSendingAll] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Quick Preview & Custom Greeting Modal
  const [previewMember, setPreviewMember] = useState<MemberBirthday | null>(null);
  const [customGreetingText, setCustomGreetingText] = useState<string>('');

  const churchName = church?.name || 'our church';
  const senderId = church?.settings?.senderName || (church?.name?.replace(/[^a-zA-Z0-9]/g, '').slice(0, 11).toUpperCase() || 'CHURCH');

  const defaultGreeting = (memberName: string) =>
    `Happy Birthday, ${memberName}! 🎉 The leadership and entire family of ${churchName} celebrate the grace and favor of God upon your life today. May this new year overflow with divine blessings, good health, and joy! Have a wonderful celebration. 🎂`;

  const fetchBirthdays = async () => {
    try {
      setLoading(true);
      const res = await ApiClient.get('/api/church/birthdays/upcoming');
      setData(res);
    } catch (err: any) {
      console.error('Failed to load upcoming birthdays:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendGreeting = async (member: MemberBirthday, customMsg?: string) => {
    try {
      setSendingMemberId(member.memberId);
      setFeedback(null);
      const res = await ApiClient.post('/api/church/birthdays/send-greeting', {
        memberId: member.memberId,
        customMessage: customMsg || undefined,
      });

      if (res.success) {
        setFeedback({
          type: 'success',
          message: `Birthday greeting SMS delivered to ${member.fullName} via sender ID "${senderId}".`,
        });

        // Mark as sent locally
        if (data) {
          setData({
            ...data,
            birthdays: data.birthdays.map(b =>
              b.memberId === member.memberId ? { ...b, alreadySentToday: true } : b
            ),
          });
        }
        setPreviewMember(null);
        if (onRefresh) onRefresh();
      } else {
        setFeedback({
          type: 'error',
          message: res.error || 'Failed to dispatch birthday greeting SMS.',
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Error occurred while sending birthday greeting.',
      });
    } finally {
      setSendingMemberId(null);
    }
  };

  const handleSendToAllToday = async () => {
    const todayBirthdays = data?.birthdays.filter(b => b.isToday && !b.alreadySentToday) || [];
    if (todayBirthdays.length === 0) return;

    try {
      setSendingAll(true);
      setFeedback(null);
      const res = await ApiClient.post('/api/church/birthdays/send-greeting', {
        sendToAllToday: true,
      });

      if (res.success) {
        setFeedback({
          type: 'success',
          message: `Automated birthday SMS greetings sent to ${res.sent} celebrant(s) today!`,
        });

        // Mark all today's as sent
        if (data) {
          setData({
            ...data,
            birthdays: data.birthdays.map(b => (b.isToday ? { ...b, alreadySentToday: true } : b)),
          });
        }
        if (onRefresh) onRefresh();
      } else {
        setFeedback({
          type: 'error',
          message: res.error || 'Failed to dispatch greetings.',
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Error sending greetings to celebrants.',
      });
    } finally {
      setSendingAll(false);
    }
  };

  const birthdays = data?.birthdays || [];
  const todayBirthdays = birthdays.filter(b => b.isToday);
  const pendingTodayCount = todayBirthdays.filter(b => !b.alreadySentToday).length;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden text-left">
      {/* Widget Header */}
      <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-amber-50/40 via-white to-teal-50/30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-200/60 flex items-center justify-center text-amber-600 shadow-xs">
            <Cake className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-900 text-base">Upcoming Member Birthdays</h3>
              {data && data.totalThisWeek > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                  {data.totalThisWeek} this week
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>Current Week ({data?.weekRange || 'This Week'})</span>
              {todayBirthdays.length > 0 && (
                <>
                  <span className="text-slate-300">•</span>
                  <span className="font-semibold text-emerald-600">
                    {todayBirthdays.length} celebrating today
                  </span>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Quick Batch Send Button if celebrants exist today */}
        <div className="flex items-center gap-2">
          {pendingTodayCount > 0 && (
            <button
              id="send-all-today-birthdays-btn"
              onClick={handleSendToAllToday}
              disabled={sendingAll}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold shadow-xs transition-colors disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>{sendingAll ? 'Dispatching...' : `Greet All Today (${pendingTodayCount})`}</span>
            </button>
          )}

          {onNavigateToMembers && (
            <button
              onClick={onNavigateToMembers}
              className="text-xs text-slate-500 hover:text-teal-700 font-medium flex items-center gap-1 px-2 py-1.5 rounded-md hover:bg-slate-100 transition-colors"
            >
              <span>Members</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Feedback Alert */}
      {feedback && (
        <div
          className={`px-5 py-3 border-b text-xs flex items-center justify-between ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-100 text-emerald-800'
              : 'bg-rose-50 border-rose-100 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span className="font-medium">{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-slate-600 p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Birthday Celebrants List */}
      <div className="p-5">
        {birthdays.length === 0 ? (
          <div className="text-center py-8 px-4 bg-slate-50/70 border border-dashed border-slate-200 rounded-xl">
            <Cake className="w-9 h-9 text-slate-300 mx-auto mb-2.5" />
            <h4 className="text-sm font-bold text-slate-800">No Member Birthdays This Week</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 leading-relaxed">
              No registered members have birthdays falling in the current week ({data?.weekRange || 'this week'}). Birth dates added in member profiles appear here automatically.
            </p>
            {onNavigateToMembers && (
              <button
                onClick={onNavigateToMembers}
                className="mt-3.5 px-3 py-1.5 text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg transition-colors"
              >
                Manage Church Members
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {birthdays.map(member => {
              const isSendingThis = sendingMemberId === member.memberId;

              return (
                <div
                  key={member.memberId}
                  className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between ${
                    member.isToday
                      ? 'bg-gradient-to-br from-amber-50/60 to-white border-amber-300 shadow-xs ring-1 ring-amber-200/50'
                      : member.isTomorrow
                      ? 'bg-teal-50/30 border-teal-200/80 hover:border-teal-300'
                      : 'bg-slate-50/50 hover:bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      {/* Avatar with status */}
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                          member.isToday
                            ? 'bg-amber-500 text-white shadow-xs'
                            : member.gender === 'Female'
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-teal-100 text-teal-800'
                        }`}
                      >
                        {member.fullName
                          .split(' ')
                          .filter(Boolean)
                          .slice(0, 2)
                          .map(n => n[0])
                          .join('')
                          .toUpperCase()}
                      </div>

                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-slate-900 text-sm">{member.fullName}</span>
                          {member.age && (
                            <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">
                              {member.isToday ? `Turning ${member.age}` : `${member.age} yrs`}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-1 flex-wrap">
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{member.phone}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Date Badge */}
                    <div className="text-right shrink-0">
                      {member.isToday ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-amber-500 text-white shadow-xs animate-pulse">
                          <Cake className="w-3 h-3" />
                          <span>Today!</span>
                        </span>
                      ) : member.isTomorrow ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-teal-100 text-teal-800 border border-teal-200">
                          <span>Tomorrow</span>
                        </span>
                      ) : member.daysDiff > 0 ? (
                        <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                          {member.dayOfWeek}, {member.birthDateFormatted}
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                          {member.dayOfWeek} (Passed)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Action Bar */}
                  <div className="mt-3 pt-2.5 border-t border-slate-100/80 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-slate-400 font-medium">
                      {member.isToday
                        ? '🎉 Celebrating today!'
                        : member.daysDiff > 0
                        ? `In ${member.daysDiff} day${member.daysDiff > 1 ? 's' : ''}`
                        : 'Celebrated earlier this week'}
                    </span>

                    <div className="flex items-center gap-1.5">
                      {member.alreadySentToday ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Greeting Sent</span>
                        </span>
                      ) : (
                        <>
                          <button
                            onClick={() => {
                              setPreviewMember(member);
                              setCustomGreetingText(defaultGreeting(member.fullName));
                            }}
                            className="px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-teal-800 hover:bg-slate-100 border border-slate-200 rounded-md transition-colors"
                            title="Preview and customize message"
                          >
                            Preview
                          </button>
                          <button
                            onClick={() => handleSendGreeting(member)}
                            disabled={isSendingThis}
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold transition-all shadow-2xs ${
                              member.isToday
                                ? 'bg-amber-600 hover:bg-amber-700 text-white'
                                : 'bg-teal-700 hover:bg-teal-800 text-white'
                            } disabled:opacity-50`}
                          >
                            <Send className="w-3 h-3" />
                            <span>{isSendingThis ? 'Sending...' : 'Send SMS'}</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Preview & Custom Greeting Modal */}
      {previewMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in duration-150 text-left">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                  <Cake className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">
                    Automated Birthday Greeting SMS
                  </h4>
                  <p className="text-xs text-slate-500">
                    Sending to {previewMember.fullName} ({previewMember.phone})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPreviewMember(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Registered SMS Sender ID
                </label>
                <div className="flex items-center gap-2 px-3 py-2 bg-slate-100 rounded-lg text-xs font-mono font-bold text-teal-800">
                  <span>{senderId}</span>
                  <span className="text-[10px] text-slate-500 font-sans font-normal ml-auto">
                    (Auto-derived from {churchName})
                  </span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                    Birthday Message Content
                  </label>
                  <span className="text-[11px] text-slate-400">
                    {customGreetingText.length} chars (
                    {Math.ceil(customGreetingText.length / 160) || 1} SMS unit)
                  </span>
                </div>
                <textarea
                  rows={4}
                  value={customGreetingText}
                  onChange={e => setCustomGreetingText(e.target.value)}
                  className="w-full text-xs text-slate-800 border border-slate-300 rounded-lg p-3 focus:outline-hidden focus:ring-2 focus:ring-teal-600 leading-relaxed font-sans"
                  placeholder="Type custom birthday message..."
                />
              </div>

              <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-lg text-xs text-amber-900 flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="leading-normal">
                  This greeting will be dispatched through the live SMS interconnect. The member will receive it directly on their mobile handset under your official church sender ID.
                </p>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setPreviewMember(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleSendGreeting(previewMember, customGreetingText)}
                disabled={sendingMemberId === previewMember.memberId || !customGreetingText.trim()}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold rounded-lg shadow-xs transition-colors disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>
                  {sendingMemberId === previewMember.memberId
                    ? 'Dispatching SMS...'
                    : 'Confirm & Send SMS'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
