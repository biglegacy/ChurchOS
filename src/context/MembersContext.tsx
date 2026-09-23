import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { Member } from '../types';
import { ApiClient } from '../api';
import { normalizePhoneNumber } from '../utils/phoneUtils';

export interface MemberNavPayload {
  member?: Member | null;
  members?: Member[];
  initialMessage?: string;
  suggestedMessage?: string;
  sourceModule?: string;
}

interface MembersContextType {
  members: Member[];
  loading: boolean;
  error: string | null;
  refreshMembers: () => Promise<void>;
  addMember: (data: Partial<Member>) => Promise<Member>;
  updateMember: (id: string, data: Partial<Member>) => Promise<Member>;
  deleteMember: (id: string) => Promise<void>;
  batchDeleteMembers: (ids: string[]) => Promise<void>;
  getMemberById: (id: string) => Member | undefined;
  searchMembers: (
    query: string,
    filter?: { status?: string; departmentId?: string; onlyWithValidPhone?: boolean }
  ) => Member[];
  
  // Cross-module pre-selection state
  smsTarget: MemberNavPayload | null;
  setSmsTarget: (target: MemberNavPayload | null) => void;
  givingTarget: Member | null;
  setGivingTarget: (member: Member | null) => void;
  pastoralTarget: Member | null;
  setPastoralTarget: (member: Member | null) => void;
  
  // Navigation trigger
  onNavigateToTab?: (tab: string, payload?: any) => void;
  registerTabNavigator: (navigator: (tab: string, payload?: any) => void) => void;
}

const MembersContext = createContext<MembersContextType | undefined>(undefined);

interface ProviderProps {
  children: React.ReactNode;
  churchId?: string | null;
}

export const MembersProvider: React.FC<ProviderProps> = ({ children, churchId }) => {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Cross-module selection targets
  const [smsTarget, setSmsTarget] = useState<MemberNavPayload | null>(null);
  const [givingTarget, setGivingTarget] = useState<Member | null>(null);
  const [pastoralTarget, setPastoralTarget] = useState<Member | null>(null);
  
  const [tabNavigator, setTabNavigator] = useState<((tab: string, payload?: any) => void) | null>(null);

  const loadMembers = useCallback(async () => {
    const effectiveChurchId = churchId || ApiClient.getChurch()?.id;
    if (!effectiveChurchId) {
      setMembers([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await ApiClient.get('/api/church/members');
      if (Array.isArray(res)) {
        setMembers(res);
      } else {
        setMembers([]);
      }
    } catch (err: any) {
      console.error('Failed to load registered members from central database:', err);
      setError(err.message || 'Failed to load members.');
    } finally {
      setLoading(false);
    }
  }, [churchId]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  const addMember = useCallback(
    async (data: Partial<Member>): Promise<Member> => {
      const created = await ApiClient.post('/api/church/members', data);
      // Immediately reflect in central state
      setMembers(prev => [created, ...prev.filter(m => m.id !== created.id)]);
      return created;
    },
    []
  );

  const updateMember = useCallback(
    async (id: string, data: Partial<Member>): Promise<Member> => {
      const updated = await ApiClient.put(`/api/church/members/${id}`, data);
      // Immediately reflect in central state
      setMembers(prev => prev.map(m => (m.id === id ? { ...m, ...updated } : m)));
      return updated;
    },
    []
  );

  const deleteMember = useCallback(
    async (id: string): Promise<void> => {
      await ApiClient.delete(`/api/church/members/${id}`);
      // Immediately remove from central state
      setMembers(prev => prev.filter(m => m.id !== id));
      if (givingTarget?.id === id) setGivingTarget(null);
      if (pastoralTarget?.id === id) setPastoralTarget(null);
      if (smsTarget?.member?.id === id) setSmsTarget(null);
    },
    [givingTarget, pastoralTarget, smsTarget]
  );

  const batchDeleteMembers = useCallback(
    async (ids: string[]): Promise<void> => {
      await ApiClient.post('/api/church/members/batch-delete', { memberIds: ids });
      const idSet = new Set(ids);
      setMembers(prev => prev.filter(m => !idSet.has(m.id)));
    },
    []
  );

  const getMemberById = useCallback(
    (id: string): Member | undefined => {
      return members.find(m => m.id === id);
    },
    [members]
  );

  const searchMembers = useCallback(
    (
      query: string,
      filter?: { status?: string; departmentId?: string; onlyWithValidPhone?: boolean }
    ): Member[] => {
      const q = query.trim().toLowerCase();
      return members.filter(m => {
        // Status check
        if (filter?.status && filter.status !== 'ALL' && m.membershipStatus !== filter.status) {
          return false;
        }

        // Department check
        if (filter?.departmentId && (!m.departmentIds || !m.departmentIds.includes(filter.departmentId))) {
          return false;
        }

        // Phone validation check
        if (filter?.onlyWithValidPhone) {
          const norm = normalizePhoneNumber(m.phone);
          if (!norm.isValid) return false;
        }

        // Search text: Name, Phone, Member ID / Code
        if (!q) return true;
        const nameMatch = m.fullName.toLowerCase().includes(q);
        const codeMatch = (m.memberCode || '').toLowerCase().includes(q);
        const phoneMatch = (m.phone || '').toLowerCase().includes(q);
        const normPhoneMatch = (m.normalizedPhone || '').toLowerCase().includes(q);
        const emailMatch = (m.email || '').toLowerCase().includes(q);

        return nameMatch || codeMatch || phoneMatch || normPhoneMatch || emailMatch;
      });
    },
    [members]
  );

  const registerTabNavigator = useCallback((navigator: (tab: string, payload?: any) => void) => {
    setTabNavigator(() => navigator);
  }, []);

  const handleNavigateToTab = useCallback(
    (tab: string, payload?: any) => {
      if (tabNavigator) {
        tabNavigator(tab, payload);
      }
    },
    [tabNavigator]
  );

  const value = useMemo<MembersContextType>(
    () => ({
      members,
      loading,
      error,
      refreshMembers: loadMembers,
      addMember,
      updateMember,
      deleteMember,
      batchDeleteMembers,
      getMemberById,
      searchMembers,
      smsTarget,
      setSmsTarget,
      givingTarget,
      setGivingTarget,
      pastoralTarget,
      setPastoralTarget,
      onNavigateToTab: handleNavigateToTab,
      registerTabNavigator,
    }),
    [
      members,
      loading,
      error,
      loadMembers,
      addMember,
      updateMember,
      deleteMember,
      batchDeleteMembers,
      getMemberById,
      searchMembers,
      smsTarget,
      givingTarget,
      pastoralTarget,
      handleNavigateToTab,
      registerTabNavigator,
    ]
  );

  return <MembersContext.Provider value={value}>{children}</MembersContext.Provider>;
};

export const useMembers = (): MembersContextType => {
  const context = useContext(MembersContext);
  if (!context) {
    throw new Error('useMembers must be used within a MembersProvider');
  }
  return context;
};
