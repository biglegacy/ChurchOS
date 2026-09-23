import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Search,
  User,
  Phone,
  Check,
  X,
  ChevronDown,
  AlertCircle,
  BadgeCheck,
  Users,
  ShieldCheck,
} from 'lucide-react';
import { Member } from '../../types';
import { useMembers } from '../../context/MembersContext';
import { normalizePhoneNumber, detectGhanaNetwork } from '../../utils/phoneUtils';

export interface MemberSelectorProps {
  // Mode: single member select or multi-select
  mode?: 'single' | 'multi';

  // Current value
  value?: string | string[]; // member.id or member.id[]
  selectedMember?: Member | null; // For single select direct object
  selectedMembers?: Member[]; // For multi select direct objects

  // Change handler
  onChange: (selected: Member | Member[] | null) => void;

  // Optional placeholder text
  placeholder?: string;

  // Filter option: only members with valid phone numbers (e.g. for SMS)
  requireValidPhone?: boolean;

  // Filter option: status filter ('ALL', 'Active', etc.)
  statusFilter?: string;

  // Allow anonymous / non-registered option (e.g. in Giving)
  allowNonMemberOption?: boolean;
  nonMemberLabel?: string;
  isNonMemberSelected?: boolean;
  onSelectNonMember?: () => void;

  // Additional CSS class
  className?: string;

  // Label
  label?: string;
  required?: boolean;
  helperText?: string;
}

export const MemberSelector: React.FC<MemberSelectorProps> = ({
  mode = 'single',
  value,
  selectedMember: propSelectedMember,
  selectedMembers: propSelectedMembers,
  onChange,
  placeholder = 'Search by name, phone number, or member ID...',
  requireValidPhone = false,
  statusFilter = 'ALL',
  allowNonMemberOption = false,
  nonMemberLabel = 'Non-registered / Anonymous Giver',
  isNonMemberSelected = false,
  onSelectNonMember,
  className = '',
  label,
  required = false,
  helperText,
}) => {
  const { members, loading } = useMembers();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Resolve currently selected member in single mode
  const currentSelectedMember = useMemo<Member | null>(() => {
    if (propSelectedMember) return propSelectedMember;
    if (typeof value === 'string' && value) {
      return members.find(m => m.id === value) || null;
    }
    return null;
  }, [propSelectedMember, value, members]);

  // Resolve currently selected members in multi mode
  const currentSelectedMembers = useMemo<Member[]>(() => {
    if (propSelectedMembers) return propSelectedMembers;
    if (Array.isArray(value)) {
      return members.filter(m => value.includes(m.id));
    }
    return [];
  }, [propSelectedMembers, value, members]);

  // Filtered members based on query, phone requirement, and status
  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    return members.filter(m => {
      // Status filter
      if (statusFilter !== 'ALL' && m.membershipStatus !== statusFilter) {
        return false;
      }

      // Phone validation filter
      if (requireValidPhone) {
        const norm = normalizePhoneNumber(m.phone);
        if (!norm.isValid) return false;
      }

      // Query match (Name, Phone, Member Code / ID, Email)
      if (!q) return true;
      const nameMatch = m.fullName.toLowerCase().includes(q);
      const codeMatch = (m.memberCode || '').toLowerCase().includes(q);
      const phoneMatch = (m.phone || '').toLowerCase().includes(q);
      const normMatch = (m.normalizedPhone || '').toLowerCase().includes(q);
      const emailMatch = (m.email || '').toLowerCase().includes(q);

      return nameMatch || codeMatch || phoneMatch || normMatch || emailMatch;
    });
  }, [members, query, statusFilter, requireValidPhone]);

  // Handle single selection
  const handleSelectSingle = (member: Member) => {
    onChange(member);
    setIsOpen(false);
    setQuery('');
  };

  // Handle clear single selection
  const handleClearSingle = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
    setQuery('');
  };

  // Handle multi selection toggle
  const handleToggleMulti = (member: Member) => {
    const isSelected = currentSelectedMembers.some(m => m.id === member.id);
    if (isSelected) {
      onChange(currentSelectedMembers.filter(m => m.id !== member.id));
    } else {
      onChange([...currentSelectedMembers, member]);
    }
  };

  // Handle select all filtered
  const handleSelectAllFiltered = () => {
    const newSelected = Array.from(
      new Set([...currentSelectedMembers.map(m => m.id), ...searchResults.map(m => m.id)])
    )
      .map(id => members.find(m => m.id === id))
      .filter(Boolean) as Member[];
    onChange(newSelected);
  };

  // Handle clear all multi
  const handleClearAllMulti = () => {
    onChange([]);
  };

  // Format network badge color
  const getNetworkBadge = (phone: string | undefined | null) => {
    if (!phone) return null;
    const norm = normalizePhoneNumber(phone);
    if (!norm.isValid) {
      return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-rose-100 text-rose-700">
          Invalid Phone
        </span>
      );
    }
    const net = detectGhanaNetwork(norm.normalized);
    let color = 'bg-slate-100 text-slate-700';
    if (net.includes('MTN')) color = 'bg-amber-100 text-amber-900 border border-amber-300';
    else if (net.includes('Telecel')) color = 'bg-rose-100 text-rose-900 border border-rose-300';
    else if (net.includes('AT')) color = 'bg-blue-100 text-blue-900 border border-blue-300';

    return (
      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${color}`}>
        {net}
      </span>
    );
  };

  return (
    <div className={`relative text-left ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-xs font-semibold text-slate-700 mb-1">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}

      {/* SINGLE SELECT MODE */}
      {mode === 'single' && (
        <div>
          {/* If a member is currently selected, show rich member summary chip */}
          {currentSelectedMember && !isNonMemberSelected ? (
            <div className="flex items-center justify-between p-2.5 bg-teal-50/60 border border-teal-200 rounded-xl transition hover:bg-teal-50">
              <div className="flex items-center space-x-3 min-w-0">
                <div className="w-8 h-8 rounded-full bg-teal-700 text-white flex items-center justify-center font-bold text-xs shrink-0">
                  {currentSelectedMember.fullName.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-slate-900 truncate">
                      {currentSelectedMember.fullName}
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-teal-100 text-teal-800 font-semibold">
                      {currentSelectedMember.memberCode}
                    </span>
                    <span
                      className={`text-[9px] px-1 rounded font-bold ${
                        currentSelectedMember.membershipStatus === 'Active'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {currentSelectedMember.membershipStatus}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 text-[11px] text-slate-500 mt-0.5">
                    <span className="flex items-center space-x-1">
                      <Phone className="w-3 h-3 text-slate-400" />
                      <span>{currentSelectedMember.phone || 'No phone recorded'}</span>
                    </span>
                    {getNetworkBadge(currentSelectedMember.phone)}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-1 shrink-0 ml-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(true)}
                  className="px-2 py-1 text-[11px] font-semibold text-teal-700 hover:text-teal-900 hover:bg-teal-100/60 rounded-md transition"
                >
                  Change
                </button>
                <button
                  type="button"
                  onClick={handleClearSingle}
                  className="p-1 text-slate-400 hover:text-rose-600 rounded-md transition"
                  title="Clear selection"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : isNonMemberSelected ? (
            <div className="flex items-center justify-between p-2.5 bg-slate-100 border border-slate-300 rounded-xl">
              <div className="flex items-center space-x-2">
                <User className="w-5 h-5 text-slate-400" />
                <div>
                  <p className="text-xs font-bold text-slate-800">{nonMemberLabel}</p>
                  <p className="text-[11px] text-slate-500">Not linked to a registered member record</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(true)}
                className="px-2 py-1 text-[11px] font-semibold text-teal-700 hover:bg-teal-50 rounded-md"
              >
                Choose Member
              </button>
            </div>
          ) : (
            // Search / Selector trigger input
            <div
              onClick={() => setIsOpen(true)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white flex items-center justify-between cursor-pointer hover:border-teal-500 focus-within:ring-2 focus-within:ring-teal-500 focus-within:border-teal-500 transition"
            >
              <div className="flex items-center space-x-2 text-xs text-slate-400 min-w-0">
                <Search className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="truncate">{placeholder}</span>
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
            </div>
          )}

          {/* DROPDOWN POPUP */}
          {isOpen && (
            <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in-50 duration-100">
              {/* Search input inside dropdown */}
              <div className="p-2 border-b border-slate-100 bg-slate-50/70 flex items-center space-x-2">
                <Search className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
                <input
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search Name, Phone (+233/024...), or Member ID..."
                  autoFocus
                  className="w-full bg-transparent text-xs text-slate-800 placeholder-slate-400 focus:outline-none py-1"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Optional non-member selection */}
              {allowNonMemberOption && onSelectNonMember && (
                <div
                  onClick={() => {
                    onSelectNonMember();
                    setIsOpen(false);
                  }}
                  className="px-3 py-2 border-b border-slate-100 hover:bg-slate-50 cursor-pointer flex items-center justify-between text-xs transition"
                >
                  <div className="flex items-center space-x-2">
                    <User className="w-4 h-4 text-slate-400" />
                    <span className="font-semibold text-slate-700">{nonMemberLabel}</span>
                  </div>
                  <span className="text-[10px] text-slate-400">Anonymous / Guest</span>
                </div>
              )}

              {/* Members List */}
              <div className="max-h-60 overflow-y-auto divide-y divide-slate-100">
                {loading ? (
                  <div className="p-4 text-center text-xs text-slate-500">
                    Loading registered members...
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-500">
                    No registered members found matching "{query}".
                  </div>
                ) : (
                  searchResults.map(member => {
                    const isSelected = currentSelectedMember?.id === member.id;
                    const phoneValidation = normalizePhoneNumber(member.phone);

                    return (
                      <div
                        key={member.id}
                        onClick={() => handleSelectSingle(member)}
                        className={`px-3 py-2.5 flex items-center justify-between cursor-pointer transition hover:bg-teal-50/70 text-xs ${
                          isSelected ? 'bg-teal-50 text-teal-900 font-semibold' : 'text-slate-800'
                        }`}
                      >
                        <div className="flex items-center space-x-2.5 min-w-0">
                          <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-[11px] shrink-0">
                            {member.fullName.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center space-x-1.5">
                              <span className="font-bold truncate">{member.fullName}</span>
                              <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-slate-100 text-slate-600">
                                {member.memberCode}
                              </span>
                            </div>
                            <div className="flex items-center space-x-2 text-[11px] text-slate-500 mt-0.5">
                              <span>{member.phone || 'No phone'}</span>
                              {getNetworkBadge(member.phone)}
                            </div>
                          </div>
                        </div>

                        {isSelected && <Check className="w-4 h-4 text-teal-600 shrink-0 ml-2" />}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer status */}
              <div className="px-3 py-1.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                <span>
                  Showing {searchResults.length} of {members.length} registered member(s)
                </span>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="hover:text-slate-700 font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MULTI SELECT MODE */}
      {mode === 'multi' && (
        <div className="space-y-2">
          {/* Selected Member Chips */}
          {currentSelectedMembers.length > 0 && (
            <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-1.5 bg-slate-50 rounded-xl border border-slate-200">
              {currentSelectedMembers.map(m => (
                <div
                  key={m.id}
                  className="inline-flex items-center space-x-1.5 px-2 py-1 rounded-lg bg-white border border-slate-200 shadow-2xs text-xs"
                >
                  <span className="font-semibold text-slate-800 truncate max-w-[140px]">
                    {m.fullName}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    {m.memberCode}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleToggleMulti(m)}
                    className="p-0.5 text-slate-400 hover:text-rose-600 rounded"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Search bar & batch actions */}
          <div className="flex items-center space-x-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search registered members by name, phone, or member ID..."
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <button
              type="button"
              onClick={handleSelectAllFiltered}
              className="px-2.5 py-2 text-[11px] font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-xl whitespace-nowrap transition"
            >
              Select Filtered ({searchResults.length})
            </button>
            {currentSelectedMembers.length > 0 && (
              <button
                type="button"
                onClick={handleClearAllMulti}
                className="px-2.5 py-2 text-[11px] font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl whitespace-nowrap transition"
              >
                Clear ({currentSelectedMembers.length})
              </button>
            )}
          </div>

          {/* Scrollable multi-select list */}
          <div className="border border-slate-200 rounded-xl max-h-56 overflow-y-auto divide-y divide-slate-100 bg-white">
            {searchResults.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-500">
                No registered members found matching "{query}".
              </div>
            ) : (
              searchResults.map(member => {
                const isSelected = currentSelectedMembers.some(m => m.id === member.id);

                return (
                  <div
                    key={member.id}
                    onClick={() => handleToggleMulti(member)}
                    className={`px-3 py-2 flex items-center justify-between cursor-pointer transition hover:bg-slate-50 text-xs ${
                      isSelected ? 'bg-teal-50/50' : ''
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}} // handled by parent div click
                        className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center space-x-1.5">
                          <span className="font-bold text-slate-900 truncate">
                            {member.fullName}
                          </span>
                          <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-slate-100 text-slate-600">
                            {member.memberCode}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2 text-[11px] text-slate-500">
                          <span>{member.phone || 'No phone'}</span>
                          {getNetworkBadge(member.phone)}
                        </div>
                      </div>
                    </div>

                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${
                        member.membershipStatus === 'Active'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {member.membershipStatus}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {helperText && <p className="text-[11px] text-slate-500 mt-1">{helperText}</p>}
    </div>
  );
};
