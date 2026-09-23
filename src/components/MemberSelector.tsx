import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, User, Check, X, Phone, AlertCircle, ChevronDown, CheckCircle2 } from 'lucide-react';
import { Member } from '../types';
import { useMembers } from '../context/MembersContext';
import { normalizePhoneNumber, detectGhanaNetwork, formatPhoneForDisplay } from '../utils/phoneUtils';

interface MemberSelectorProps {
  label?: string;
  placeholder?: string;
  selectedMemberId?: string | null;
  onSelectMember: (member: Member | null) => void;
  required?: boolean;
  disabled?: boolean;
  allowAnonymous?: boolean;
  anonymousLabel?: string;
  filterStatus?: string; // e.g. 'Active' or 'ALL'
  onlyWithValidPhone?: boolean;
  helperText?: string;
  id?: string;
}

export const MemberSelector: React.FC<MemberSelectorProps> = ({
  label = 'Registered Member',
  placeholder = 'Search by Name, Phone, or Member ID...',
  selectedMemberId,
  onSelectMember,
  required = false,
  disabled = false,
  allowAnonymous = false,
  anonymousLabel = 'Anonymous / Non-Registered Giver',
  filterStatus,
  onlyWithValidPhone = false,
  helperText,
  id = 'member-selector',
}) => {
  const { members, loading } = useMembers();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Find currently selected member
  const selectedMember = useMemo(() => {
    if (!selectedMemberId) return null;
    return members.find(m => m.id === selectedMemberId) || null;
  }, [members, selectedMemberId]);

  // Filtered list based on search and props
  const filteredMembers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return members.filter(m => {
      // Status filter
      if (filterStatus && filterStatus !== 'ALL' && m.membershipStatus !== filterStatus) {
        return false;
      }

      // Valid phone filter
      if (onlyWithValidPhone) {
        const norm = normalizePhoneNumber(m.phone);
        if (!norm.isValid) return false;
      }

      // Query filter across Name, Phone, Member ID / Code, Email
      if (!q) return true;
      const name = (m.fullName || '').toLowerCase();
      const phone = (m.phone || '').toLowerCase();
      const normPhone = (m.normalizedPhone || '').toLowerCase();
      const code = (m.memberCode || '').toLowerCase();
      const email = (m.email || '').toLowerCase();

      return name.includes(q) || phone.includes(q) || normPhone.includes(q) || code.includes(q) || email.includes(q);
    });
  }, [members, searchQuery, filterStatus, onlyWithValidPhone]);

  const handleSelect = (member: Member | null) => {
    onSelectMember(member);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectMember(null);
    setSearchQuery('');
  };

  const getNetworkBadge = (phone: string | undefined | null) => {
    if (!phone) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
          <AlertCircle className="w-3 h-3 text-amber-500" />
          No Phone
        </span>
      );
    }
    const norm = normalizePhoneNumber(phone);
    if (!norm.isValid) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
          <AlertCircle className="w-3 h-3 text-rose-500" />
          Invalid Phone
        </span>
      );
    }
    const net = detectGhanaNetwork(norm.normalized);
    let colorClass = 'bg-blue-50 text-blue-700 border-blue-200';
    if (net.includes('MTN')) colorClass = 'bg-amber-50 text-amber-800 border-amber-300';
    else if (net.includes('Telecel')) colorClass = 'bg-red-50 text-red-700 border-red-200';
    else if (net.includes('AT')) colorClass = 'bg-blue-50 text-blue-700 border-blue-200';

    return (
      <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded border ${colorClass}`}>
        <CheckCircle2 className="w-3 h-3" />
        {net}
      </span>
    );
  };

  return (
    <div className="relative w-full text-left" ref={dropdownRef} id={id}>
      {label && (
        <label className="block text-xs font-semibold text-slate-700 mb-1">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}

      {/* Selector Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!disabled) {
            setIsOpen(prev => !prev);
            setTimeout(() => inputRef.current?.focus(), 50);
          }
        }}
        className={`w-full flex items-center justify-between px-3 py-2 text-sm bg-white border rounded-lg transition-colors text-left ${
          isOpen ? 'border-teal-500 ring-2 ring-teal-500/10' : 'border-slate-300 hover:border-slate-400'
        } ${disabled ? 'bg-slate-50 cursor-not-allowed opacity-75' : 'cursor-pointer'}`}
      >
        <div className="flex items-center gap-2 overflow-hidden mr-2">
          <div className="w-7 h-7 rounded-full bg-teal-50 text-teal-700 flex items-center justify-center shrink-0 text-xs font-bold border border-teal-100">
            {selectedMember ? (
              selectedMember.fullName.charAt(0).toUpperCase()
            ) : (
              <User className="w-4 h-4 text-slate-400" />
            )}
          </div>
          <div className="truncate">
            {selectedMember ? (
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-900 truncate">{selectedMember.fullName}</span>
                {selectedMember.memberCode && (
                  <span className="text-[11px] font-mono font-medium px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded border border-slate-200 shrink-0">
                    {selectedMember.memberCode}
                  </span>
                )}
                {selectedMember.phone && (
                  <span className="text-xs text-slate-500 font-mono hidden sm:inline shrink-0">
                    ({formatPhoneForDisplay(selectedMember.phone)})
                  </span>
                )}
              </div>
            ) : (
              <span className="text-slate-400 font-normal">{placeholder}</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {selectedMember && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
              title="Clear selection"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {helperText && <p className="text-[11px] text-slate-500 mt-1">{helperText}</p>}

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute z-50 mt-1.5 w-full bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in-50 zoom-in-95 duration-100">
          {/* Search Header */}
          <div className="p-2 border-b border-slate-100 bg-slate-50/70">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search registered members by name, phone, code..."
                className="w-full pl-9 pr-8 py-1.5 text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1.5 px-1">
              <span>Single Source of Truth: Registered Members</span>
              <span>{filteredMembers.length} available</span>
            </div>
          </div>

          {/* Member List Items */}
          <div className="max-h-60 overflow-y-auto divide-y divide-slate-50 p-1">
            {allowAnonymous && (
              <button
                type="button"
                onClick={() => handleSelect(null)}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between transition-colors ${
                  !selectedMember ? 'bg-teal-50 text-teal-900 font-semibold' : 'hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-[10px]">
                    ?
                  </div>
                  <div>
                    <p className="font-medium text-slate-800">{anonymousLabel}</p>
                    <p className="text-[11px] text-slate-400">Record without linking a registered member record</p>
                  </div>
                </div>
                {!selectedMember && <Check className="w-4 h-4 text-teal-600" />}
              </button>
            )}

            {loading ? (
              <div className="p-4 text-center text-xs text-slate-500">
                <div className="w-5 h-5 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                Loading registered members...
              </div>
            ) : filteredMembers.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">
                <User className="w-8 h-8 text-slate-300 mx-auto mb-1.5" />
                <p className="font-semibold text-slate-700">No registered members found</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {searchQuery ? `No match for "${searchQuery}"` : 'No members match the current filter.'}
                </p>
              </div>
            ) : (
              filteredMembers.map(member => {
                const isSelected = selectedMemberId === member.id;
                return (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => handleSelect(member)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between transition-colors ${
                      isSelected
                        ? 'bg-teal-50 text-teal-900 font-medium'
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0 border border-slate-200">
                        {member.fullName.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-slate-900 truncate">{member.fullName}</span>
                          {member.memberCode && (
                            <span className="text-[10px] font-mono px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded border border-slate-200">
                              {member.memberCode}
                            </span>
                          )}
                          <span
                            className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${
                              member.membershipStatus === 'Active'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {member.membershipStatus}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                          {member.phone ? (
                            <span className="flex items-center gap-1 font-mono">
                              <Phone className="w-3 h-3 text-slate-400" />
                              {formatPhoneForDisplay(member.phone)}
                            </span>
                          ) : (
                            <span className="text-amber-600 flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              No phone
                            </span>
                          )}
                          {member.phone && getNetworkBadge(member.phone)}
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 ml-2">
                      {isSelected ? (
                        <div className="w-5 h-5 rounded-full bg-teal-600 text-white flex items-center justify-center">
                          <Check className="w-3 h-3" />
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 hover:text-teal-700 font-medium">Select</span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
