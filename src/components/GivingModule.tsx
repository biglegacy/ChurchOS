import React, { useState, useEffect, useMemo } from 'react';
import {
  HandCoins,
  Plus,
  DollarSign,
  Receipt,
  FileText,
  CreditCard,
  Building,
  CheckCircle,
  AlertCircle,
  X,
  Search,
  Printer,
  Tag,
  Trash2,
  Sparkles,
  SlidersHorizontal,
  Download,
  Edit2,
  Calendar,
  Filter,
  RefreshCw,
  TrendingUp,
  Wallet,
  ArrowUpRight,
} from 'lucide-react';
import { ApiClient } from '../api';
import { GivingRecord, ExpenseRecord, Member, Church, GivingCategoryType, GIVING_CATEGORIES } from '../types';
import { useMembers } from '../context/MembersContext';
import { MemberSelector } from './common/MemberSelector';
import { useAutoDismissNotification } from '../utils/useAutoDismissNotification';

interface Props {
  church?: Church | null;
  preSelectedMemberId?: string;
}

export const GivingModule: React.FC<Props> = ({ church, preSelectedMemberId }) => {
  const { members } = useMembers();

  // Primary navigation: Contributions & Receipts, Operating Expenses, Bank Accounts
  const [activeSubTab, setActiveSubTab] = useState<'giving' | 'expenses' | 'accounts'>('giving');

  // Active Giving Category Tab (Requirement 1: Tithes, Offerings, Donations, Special Giving, Building Fund, Missions, Welfare, Other Giving)
  const [activeCategory, setActiveCategory] = useState<GivingCategoryType>('Tithes');

  // Category records list and category summaries strictly isolated per tab
  const [givingList, setGivingList] = useState<GivingRecord[]>([]);
  const [categorySummaries, setCategorySummaries] = useState<Record<string, { total: number; count: number }>>({});
  const [grandTotalGiving, setGrandTotalGiving] = useState<number>(0);

  // Strictly display category tabs ONLY if that type/category of giving has been recorded (count > 0)
  const visibleCategories = useMemo(() => {
    const list: GivingCategoryType[] = [];
    // Prioritize standard categories in order if they have records
    for (const cat of GIVING_CATEGORIES) {
      if ((categorySummaries[cat]?.count || 0) > 0) {
        list.push(cat);
      }
    }
    // Also include any other recorded category from summaries if count > 0
    for (const [cat, summary] of Object.entries(categorySummaries) as [string, { total: number; count: number }][]) {
      if ((summary?.count || 0) > 0 && !list.includes(cat as GivingCategoryType)) {
        list.push(cat as GivingCategoryType);
      }
    }
    return list;
  }, [categorySummaries]);

  // Keep active category in sync: if active category has no records or is not in visible list, switch to first available
  useEffect(() => {
    if (visibleCategories.length > 0) {
      if (!visibleCategories.includes(activeCategory)) {
        setActiveCategory(visibleCategories[0]);
      }
    }
  }, [visibleCategories, activeCategory]);
  const [expenseList, setExpenseList] = useState<ExpenseRecord[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState<GivingRecord | null>(null);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<GivingRecord | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);

  // Notifications with 2-second auto-dismiss (Requirement 6)
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  useAutoDismissNotification(notice, setNotice, 2000);
  useAutoDismissNotification(error, setError, 2000);

  // Category-specific filters (strictly isolated within active category tab)
  const [searchQuery, setSearchQuery] = useState('');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('ALL');

  // Form State for Record Giving
  const [givingForm, setGivingForm] = useState({
    memberId: preSelectedMemberId || '',
    memberName: '',
    phone: '',
    amount: '',
    givingCategory: 'Tithes' as GivingCategoryType,
    givingType: 'Tithe',
    paymentMethod: 'Cash' as 'Cash' | 'Mobile Money' | 'Bank Transfer' | 'Cheque',
    date: new Date().toISOString().slice(0, 10),
    campaignOrProject: '',
    recordedBy: ApiClient.getUser()?.fullName || 'Finance Officer',
    notes: '',
  });

  // Form State for Edit Giving
  const [editForm, setEditForm] = useState({
    id: '',
    memberId: '',
    memberName: '',
    phone: '',
    amount: '',
    givingCategory: 'Tithes' as GivingCategoryType,
    givingType: 'Tithe',
    paymentMethod: 'Cash' as 'Cash' | 'Mobile Money' | 'Bank Transfer' | 'Cheque',
    date: new Date().toISOString().slice(0, 10),
    campaignOrProject: '',
    notes: '',
  });

  // Custom Giving Types State
  const [givingTypesData, setGivingTypesData] = useState<{
    standardTypes: string[];
    customTypes: string[];
    allTypes: string[];
  }>({
    standardTypes: ['Tithe', 'Offering', 'Thanksgiving', 'First Fruit', 'Building Fund', 'Missions', 'Welfare', 'Special Offering', 'Donation'],
    customTypes: [],
    allTypes: ['Tithe', 'Offering', 'Thanksgiving', 'First Fruit', 'Building Fund', 'Missions', 'Welfare', 'Special Offering', 'Donation'],
  });
  const [showManageTypesModal, setShowManageTypesModal] = useState(false);
  const [showInlineNewType, setShowInlineNewType] = useState(false);
  const [inlineNewTypeName, setInlineNewTypeName] = useState('');
  const [newCustomTypeName, setNewCustomTypeName] = useState('');
  const [newTypeAutoSms, setNewTypeAutoSms] = useState(true);
  const [addingType, setAddingType] = useState(false);
  const [deletingType, setDeletingType] = useState<string | null>(null);

  // Expense Categories State
  const [expenseCategoriesData, setExpenseCategoriesData] = useState<{
    standardCategories: string[];
    customCategories: string[];
    allCategories: string[];
  }>({
    standardCategories: [
      'Utilities (Electricity/Water)',
      'Media & Sound Equipment',
      'Guest Minister Honorarium',
      'Benevolence & Welfare Support',
      'Sanctuary Cleaning & Maintenance',
      'Transport & Fuel',
      'Administrative Printing & Supplies',
    ],
    customCategories: [],
    allCategories: [
      'Utilities (Electricity/Water)',
      'Media & Sound Equipment',
      'Guest Minister Honorarium',
      'Benevolence & Welfare Support',
      'Sanctuary Cleaning & Maintenance',
      'Transport & Fuel',
      'Administrative Printing & Supplies',
    ],
  });
  const [showManageExpenseCategoriesModal, setShowManageExpenseCategoriesModal] = useState(false);
  const [newCustomCategoryInput, setNewCustomCategoryInput] = useState('');
  const [addingExpenseCategory, setAddingExpenseCategory] = useState(false);
  const [deletingExpenseCategory, setDeletingExpenseCategory] = useState<string | null>(null);

  // In-App Delete Confirmation Modals (eliminates iframe-blocked window.confirm)
  const [givingToDelete, setGivingToDelete] = useState<GivingRecord | null>(null);
  const [isDeletingGiving, setIsDeletingGiving] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<ExpenseRecord | null>(null);
  const [isDeletingExpense, setIsDeletingExpense] = useState(false);
  const [isCustomExpenseCategory, setIsCustomExpenseCategory] = useState(false);
  const [customExpenseCategoryInput, setCustomExpenseCategoryInput] = useState('');
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState('ALL');
  const [expenseSearch, setExpenseSearch] = useState('');

  // Form State for Expenses
  const [expenseForm, setExpenseForm] = useState({
    category: 'Utilities (Electricity/Water)',
    amount: '',
    payee: '',
    paymentMethod: 'Cash',
    description: '',
    date: new Date().toISOString().slice(0, 10),
  });

  const [submitting, setSubmitting] = useState(false);
  const currency = church?.settings?.currency || 'GH₵';

  // Load giving records strictly for the active category + summary
  const loadGivingData = async (cat: GivingCategoryType) => {
    try {
      const queryParams = new URLSearchParams();
      queryParams.set('category', cat);
      if (searchQuery.trim()) queryParams.set('search', searchQuery.trim());
      if (startDateFilter) queryParams.set('startDate', startDateFilter);
      if (endDateFilter) queryParams.set('endDate', endDateFilter);
      if (paymentMethodFilter !== 'ALL') queryParams.set('paymentMethod', paymentMethodFilter);

      const [gRes, sumRes] = await Promise.all([
        ApiClient.get(`/api/church/giving?${queryParams.toString()}`),
        ApiClient.get('/api/church/giving/summary').catch(() => null),
      ]);

      setGivingList(Array.isArray(gRes) ? gRes : []);
      if (sumRes?.categories) {
        setCategorySummaries(sumRes.categories);
        setGrandTotalGiving(sumRes.grandTotal || 0);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load contributions.');
    }
  };

  const loadAllFinances = async () => {
    try {
      setLoading(true);
      const [eRes, aRes, tRes, expCatRes] = await Promise.all([
        ApiClient.get('/api/church/finance/expenses').catch(() => []),
        ApiClient.get('/api/church/finance/accounts').catch(() => []),
        ApiClient.get('/api/church/giving-types').catch(() => null),
        ApiClient.get('/api/church/expense-categories').catch(() => null),
      ]);

      setExpenseList(Array.isArray(eRes) ? eRes : []);
      setAccounts(Array.isArray(aRes) ? aRes : []);

      if (tRes) {
        setGivingTypesData({
          standardTypes: Array.isArray(tRes.standardTypes) ? tRes.standardTypes : [],
          customTypes: Array.isArray(tRes.customTypes) ? tRes.customTypes : [],
          allTypes: Array.isArray(tRes.allTypes) ? tRes.allTypes : [],
        });
      }

      if (expCatRes) {
        setExpenseCategoriesData({
          standardCategories: Array.isArray(expCatRes.standardCategories) ? expCatRes.standardCategories : [],
          customCategories: Array.isArray(expCatRes.customCategories) ? expCatRes.customCategories : [],
          allCategories: Array.isArray(expCatRes.allCategories) ? expCatRes.allCategories : [],
        });
      }

      await loadGivingData(activeCategory);
    } catch (err: any) {
      setError(err.message || 'Failed to load finances.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllFinances();
  }, []);

  // When active category or filters change, query backend strictly for that category
  useEffect(() => {
    loadGivingData(activeCategory);
  }, [activeCategory, searchQuery, startDateFilter, endDateFilter, paymentMethodFilter]);

  // Update giving form default category when opening modal from active category tab
  const handleOpenRecordModal = () => {
    const chosenCat = (activeCategory && visibleCategories.includes(activeCategory))
      ? activeCategory
      : (visibleCategories[0] || 'Tithes');
    setGivingForm(prev => ({
      ...prev,
      givingCategory: chosenCat,
      givingType:
        chosenCat === 'Tithes'
          ? 'Tithe'
          : chosenCat === 'Offerings'
          ? 'Offering'
          : chosenCat === 'Donations'
          ? 'Donation'
          : chosenCat,
    }));
    setShowRecordModal(true);
  };

  const handleMemberSelect = (selected: Member | Member[] | null) => {
    if (selected && !Array.isArray(selected)) {
      setGivingForm(prev => ({
        ...prev,
        memberId: selected.id,
        memberName: selected.fullName,
        phone: selected.phone || '',
      }));
    } else {
      setGivingForm(prev => ({
        ...prev,
        memberId: '',
        memberName: '',
        phone: '',
      }));
    }
  };

  const handleRecordGiving = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!givingForm.amount || parseFloat(givingForm.amount) <= 0) {
      setError('Please enter a valid contribution amount.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const res = await ApiClient.post('/api/church/giving', givingForm);

      let msg = `Successfully recorded ${givingForm.givingCategory} of ${currency}${givingForm.amount} for ${res.giving.memberName}. Receipt: ${res.giving.receiptNumber}`;
      if (res.smsNotification?.sent) {
        msg += ` • Automatic SMS confirmation dispatched to ${res.giving.phone}!`;
      }
      setNotice(msg);
      setShowRecordModal(false);
      setSelectedReceipt(res.giving);

      // Ensure summary and records are reloaded so that new category tab appears immediately if not previously visible
      const targetCategory = (res.giving?.givingCategory || givingForm.givingCategory) as GivingCategoryType;
      await loadGivingData(targetCategory);
      setActiveCategory(targetCategory);
    } catch (err: any) {
      setError(err.message || 'Failed to record contribution.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEditModal = (record: GivingRecord) => {
    setEditingRecord(record);
    const cat = (record.givingCategory || record.category || 'Tithes') as GivingCategoryType;
    setEditForm({
      id: record.id,
      memberId: record.memberId || '',
      memberName: record.memberName || '',
      phone: record.phone || '',
      amount: String(record.amount || ''),
      givingCategory: GIVING_CATEGORIES.includes(cat) ? cat : 'Tithes',
      givingType: record.givingType || cat,
      paymentMethod: (record.paymentMethod as any) || 'Cash',
      date: record.date || new Date().toISOString().slice(0, 10),
      campaignOrProject: record.campaignOrProject || '',
      notes: record.notes || '',
    });
    setShowEditModal(true);
  };

  const handleUpdateGiving = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm.amount || parseFloat(editForm.amount) <= 0) {
      setError('Please enter a valid contribution amount.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const res = await ApiClient.put(`/api/church/giving/${editForm.id}`, editForm);

      setNotice(res.message || `Contribution updated successfully.`);
      setShowEditModal(false);

      // If category was changed, switch to the new category tab so record appears there!
      if (editForm.givingCategory !== activeCategory) {
        setActiveCategory(editForm.givingCategory);
      } else {
        await loadGivingData(activeCategory);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update contribution.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteGiving = (record: GivingRecord) => {
    setGivingToDelete(record);
  };

  const handleConfirmDeleteGiving = async () => {
    if (!givingToDelete) return;

    try {
      setIsDeletingGiving(true);
      setError(null);
      const res = await ApiClient.delete(`/api/church/giving/${givingToDelete.id}`);
      setNotice(res.message || 'Contribution deleted successfully.');
      setGivingToDelete(null);
      await loadGivingData(activeCategory);
    } catch (err: any) {
      setError(err.message || 'Failed to delete contribution.');
    } finally {
      setIsDeletingGiving(false);
    }
  };

  // CSV Export for Selected Category (Requirement 3: Exports must respect selected category)
  const handleExportCategoryCsv = () => {
    if (givingList.length === 0) {
      setError(`No ${activeCategory} records available to export.`);
      return;
    }

    const headers = [
      'Receipt Number',
      'Member / Giver',
      'Phone',
      'Giving Category',
      'Giving Type',
      'Amount',
      'Currency',
      'Payment Method',
      'Date',
      'Recorded By',
      'Notes',
    ];

    const rows = givingList.map(item => [
      `"${item.receiptNumber}"`,
      `"${item.memberName.replace(/"/g, '""')}"`,
      `"${item.phone || ''}"`,
      `"${item.givingCategory || item.category}"`,
      `"${item.givingType || ''}"`,
      item.amount,
      `"${item.currency || currency}"`,
      `"${item.paymentMethod}"`,
      `"${item.date}"`,
      `"${(item.recordedBy || '').replace(/"/g, '""')}"`,
      `"${(item.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${church?.name?.replace(/\s+/g, '_') || 'Church'}_${activeCategory}_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setNotice(`Exported ${givingList.length} ${activeCategory} records to CSV.`);
  };

  // Expense Handlers
  const handleLogExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const chosenCategory = isCustomExpenseCategory ? customExpenseCategoryInput.trim() : expenseForm.category;

    if (!chosenCategory) {
      setError('Please provide an expense category.');
      return;
    }
    if (!expenseForm.amount || parseFloat(expenseForm.amount) <= 0) {
      setError('Please enter a valid expense amount.');
      return;
    }
    if (!expenseForm.payee.trim()) {
      setError('Please enter a payee/recipient.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await ApiClient.post('/api/church/finance/expenses', {
        ...expenseForm,
        category: chosenCategory,
        customCategory: isCustomExpenseCategory ? chosenCategory : undefined,
        isCustom: isCustomExpenseCategory,
      });
      setNotice(`Recorded expense of ${currency}${expenseForm.amount} for "${chosenCategory}".`);
      setShowExpenseModal(false);
      setIsCustomExpenseCategory(false);
      setCustomExpenseCategoryInput('');
      setExpenseForm({
        category: expenseCategoriesData?.standardCategories[0] || 'Utilities (Electricity/Water)',
        amount: '',
        payee: '',
        paymentMethod: 'Cash',
        description: '',
        date: new Date().toISOString().slice(0, 10),
      });
      await loadAllFinances();
    } catch (err: any) {
      setError(err.message || 'Failed to log expense.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteExpense = (exp: ExpenseRecord) => {
    setExpenseToDelete(exp);
  };

  const handleConfirmDeleteExpense = async () => {
    if (!expenseToDelete) return;
    try {
      setIsDeletingExpense(true);
      setError(null);
      await ApiClient.delete(`/api/church/finance/expenses/${expenseToDelete.id}`);
      setNotice('Expense record removed successfully.');
      setExpenseToDelete(null);
      await loadAllFinances();
    } catch (err: any) {
      setError(err.message || 'Failed to delete expense record.');
    } finally {
      setIsDeletingExpense(false);
    }
  };

  const handleCreateCustomGivingType = async (name: string, enableAutoSms: boolean = true) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    try {
      setAddingType(true);
      setError(null);
      const res = await ApiClient.post('/api/church/giving-types', {
        name: trimmed,
        enableAutoSms,
      });
      if (res) {
        setGivingTypesData(prev => ({
          standardTypes: Array.isArray(res.standardTypes) ? res.standardTypes : prev.standardTypes,
          customTypes: Array.isArray(res.customTypes) ? res.customTypes : prev.customTypes,
          allTypes: Array.isArray(res.allTypes) ? res.allTypes : Array.from(new Set([...prev.standardTypes, ...(res.customTypes || [])])),
        }));
      }
      setNotice(`Custom giving type "${trimmed}" added successfully.`);
      return trimmed;
    } catch (err: any) {
      setError(err.message || 'Failed to add custom giving type.');
      throw err;
    } finally {
      setAddingType(false);
    }
  };

  const handleDeleteCustomGivingType = async (typeName: string) => {
    try {
      setDeletingType(typeName);
      setError(null);
      const res = await ApiClient.delete(`/api/church/giving-types/${encodeURIComponent(typeName)}`);
      if (res) {
        setGivingTypesData(prev => ({
          standardTypes: Array.isArray(res.standardTypes) ? res.standardTypes : prev.standardTypes,
          customTypes: Array.isArray(res.customTypes) ? res.customTypes : prev.customTypes.filter(t => t !== typeName),
          allTypes: Array.isArray(res.allTypes) ? res.allTypes : prev.allTypes.filter(t => t !== typeName),
        }));
      }
      if (givingForm.givingType === typeName) {
        setGivingForm(prev => ({ ...prev, givingType: 'Tithe' }));
      }
      setNotice(`Custom giving type "${typeName}" removed.`);
    } catch (err: any) {
      setError(err.message || 'Failed to delete custom giving type.');
    } finally {
      setDeletingType(null);
    }
  };

  const handleCreateCustomExpenseCategory = async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    try {
      setAddingExpenseCategory(true);
      setError(null);
      const res = await ApiClient.post('/api/church/expense-categories', { name: trimmed });
      if (res) {
        setExpenseCategoriesData(prev => ({
          standardCategories: Array.isArray(res.standardCategories) ? res.standardCategories : prev.standardCategories,
          customCategories: Array.isArray(res.customCategories) ? res.customCategories : [...prev.customCategories, trimmed],
          allCategories: Array.isArray(res.allCategories) ? res.allCategories : Array.from(new Set([...prev.standardCategories, trimmed])),
        }));
      }
      setNotice(`Custom expense category "${trimmed}" added.`);
      setNewCustomCategoryInput('');
    } catch (err: any) {
      setError(err.message || 'Failed to add custom expense category.');
    } finally {
      setAddingExpenseCategory(false);
    }
  };

  const handleDeleteCustomExpenseCategory = async (catName: string) => {
    try {
      setDeletingExpenseCategory(catName);
      setError(null);
      const res = await ApiClient.delete(`/api/church/expense-categories/${encodeURIComponent(catName)}`);
      if (res) {
        setExpenseCategoriesData(prev => ({
          standardCategories: Array.isArray(res.standardCategories) ? res.standardCategories : prev.standardCategories,
          customCategories: Array.isArray(res.customCategories) ? res.customCategories : prev.customCategories.filter(c => c !== catName),
          allCategories: Array.isArray(res.allCategories) ? res.allCategories : prev.allCategories.filter(c => c !== catName),
        }));
      }
      setNotice(`Category "${catName}" removed.`);
    } catch (err: any) {
      setError(err.message || 'Failed to delete category.');
    } finally {
      setDeletingExpenseCategory(null);
    }
  };

  // Category-specific KPI calculations (strictly isolated to active category records)
  const categoryTotal = useMemo(() => {
    return givingList.reduce((sum, item) => sum + (item.amount || 0), 0);
  }, [givingList]);

  const categoryAverage = useMemo(() => {
    return givingList.length > 0 ? categoryTotal / givingList.length : 0;
  }, [categoryTotal, givingList.length]);

  const categoryThisMonth = useMemo(() => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    return givingList
      .filter(item => (item.date || '').startsWith(currentMonth))
      .reduce((sum, item) => sum + (item.amount || 0), 0);
  }, [givingList]);

  const categoryTopAmount = useMemo(() => {
    if (givingList.length === 0) return 0;
    return Math.max(...givingList.map(i => i.amount || 0));
  }, [givingList]);

  // Overall Financial KPIs
  const totalExpenses = (expenseList || []).reduce((sum, e) => sum + (e.amount || 0), 0);
  const netSurplus = grandTotalGiving - totalExpenses;

  // Filtered expenses list
  const filteredExpenses = (expenseList || []).filter(item => {
    const matchesCat = expenseCategoryFilter === 'ALL' || item.category === expenseCategoryFilter;
    const matchesSearch =
      !expenseSearch.trim() ||
      item.payee.toLowerCase().includes(expenseSearch.toLowerCase()) ||
      item.category.toLowerCase().includes(expenseSearch.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(expenseSearch.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  return (
    <div className="space-y-5 pb-16 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center space-x-2">
            <HandCoins className="w-6 h-6 text-teal-700" />
            <span>Giving & Church Finances</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Strict category separation, auditable transaction ledgers, SMS receipts, and financial governance
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowManageTypesModal(true)}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs rounded-md border border-slate-200 flex items-center space-x-1.5 transition-colors cursor-pointer"
          >
            <Tag className="w-3.5 h-3.5 text-slate-600" />
            <span>Giving Types</span>
          </button>
          <button
            onClick={handleOpenRecordModal}
            className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white font-semibold text-xs rounded-md shadow-xs flex items-center space-x-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Record Giving {activeCategory && visibleCategories.includes(activeCategory) ? `(${activeCategory})` : ''}</span>
          </button>
        </div>
      </div>

      {/* Auto-Dismiss Notice Banner (Auto-dismisses 2s after display) */}
      {notice && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center justify-between shadow-xs transition-opacity duration-300">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-medium">{notice}</span>
          </div>
          <button onClick={() => setNotice(null)} className="font-bold text-emerald-700 hover:underline text-[11px] ml-2 cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {/* Auto-Dismiss Error Banner (Auto-dismisses 2s after display) */}
      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg flex items-center justify-between shadow-xs transition-opacity duration-300">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-medium">{error}</span>
          </div>
          <button onClick={() => setError(null)} className="font-bold text-rose-700 hover:underline text-[11px] ml-2 cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {/* Primary Financial Sub-Navigation Tabs */}
      <div className="flex border border-slate-200 bg-white rounded-xl p-1 shadow-xs text-xs font-semibold">
        <button
          onClick={() => setActiveSubTab('giving')}
          className={`flex-1 py-2 rounded-lg transition-colors cursor-pointer ${
            activeSubTab === 'giving' ? 'bg-teal-800 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Contributions Ledger ({grandTotalGiving > 0 ? `${currency}${grandTotalGiving.toLocaleString()}` : 'Giving'})
        </button>
        <button
          onClick={() => setActiveSubTab('expenses')}
          className={`flex-1 py-2 rounded-lg transition-colors cursor-pointer ${
            activeSubTab === 'expenses' ? 'bg-teal-800 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Operating Expenses ({expenseList.length})
        </button>
        <button
          onClick={() => setActiveSubTab('accounts')}
          className={`flex-1 py-2 rounded-lg transition-colors cursor-pointer ${
            activeSubTab === 'accounts' ? 'bg-teal-800 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Bank & MoMo Accounts ({accounts.length})
        </button>
      </div>

      {/* SUB-VIEW 1: CONTRIBUTIONS & CATEGORY TABS */}
      {activeSubTab === 'giving' && (
        <div className="space-y-4">
          {loading && visibleCategories.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-xs">
              <div className="inline-block animate-spin rounded-full h-7 w-7 border-b-2 border-teal-700 mb-2"></div>
              <p className="text-xs text-slate-500 font-medium">Loading contributions ledger...</p>
            </div>
          ) : visibleCategories.length === 0 ? (
            <div className="bg-white rounded-xl border border-dashed border-slate-300 p-8 text-center shadow-xs">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-teal-50 flex items-center justify-center text-teal-700">
                <HandCoins className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-800">No Giving Recorded Yet</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                No giving records have been recorded yet. Category tabs will automatically appear as soon as a type of giving (such as Tithes, Offerings, or Missions) is recorded.
              </p>
              <div className="mt-4">
                <button
                  type="button"
                  onClick={handleOpenRecordModal}
                  className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white font-semibold text-xs rounded-lg shadow-xs inline-flex items-center space-x-1.5 transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Record First Contribution</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* REQUIREMENT: Strictly display tabs ONLY if that type/category of giving has been recorded */}
              <div className="bg-white rounded-xl border border-slate-200 p-2 shadow-xs">
                <div className="flex items-center justify-between mb-2 px-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Recorded Giving Categories ({visibleCategories.length})
                  </span>
                  <span className="text-[11px] text-teal-800 font-medium">
                    Active Category: <strong className="text-teal-900">{activeCategory}</strong>
                  </span>
                </div>

                {/* Responsive, horizontally scrollable category tabs - strictly only displaying recorded types of giving */}
                <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-thin">
                  {visibleCategories.map(category => {
                    const isActive = activeCategory === category;
                    const summary = categorySummaries[category] || { total: 0, count: 0 };
                    return (
                      <button
                        key={category}
                        onClick={() => setActiveCategory(category)}
                        className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-150 cursor-pointer border ${
                          isActive
                            ? 'bg-teal-700 text-white border-teal-700 shadow-xs'
                            : 'bg-slate-50 text-slate-700 hover:bg-slate-100 hover:text-slate-900 border-slate-200'
                        }`}
                      >
                        <span>{category}</span>
                        <span
                          className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                            isActive
                              ? 'bg-teal-900/60 text-teal-100'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {summary.count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

          {/* Category-Specific KPI Metric Cards (Requirement 1: Category-specific totals) */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-500 block">Total {activeCategory}</span>
              <p className="text-xl sm:text-2xl font-bold text-teal-800 mt-1">
                {currency}{categoryTotal.toLocaleString()}
              </p>
              <p className="text-[10px] text-teal-700 font-medium mt-0.5">Strictly {activeCategory} only</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-500 block">Transactions</span>
              <p className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
                {givingList.length}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">Individual receipts</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-500 block">Average Giving</span>
              <p className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
                {currency}{Math.round(categoryAverage).toLocaleString()}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">Per contribution</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-500 block">This Month</span>
              <p className="text-xl sm:text-2xl font-bold text-emerald-600 mt-1">
                {currency}{categoryThisMonth.toLocaleString()}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">Current month total</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs col-span-2 lg:col-span-1">
              <span className="text-[11px] font-semibold text-slate-500 block">Highest Record</span>
              <p className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
                {currency}{categoryTopAmount.toLocaleString()}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">Single largest</p>
            </div>
          </div>

          {/* Category-Specific Filter & Action Bar (Requirement 1 & 3) */}
          <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs space-y-3">
            <div className="flex flex-col md:flex-row items-center justify-between gap-3">
              {/* Search within Category */}
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder={`Search ${activeCategory} by member name, phone, receipt # or notes...`}
                  className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-600 bg-white"
                />
              </div>

              {/* Action buttons: Export CSV, View Category Report, Record in this Category */}
              <div className="flex items-center space-x-2 w-full md:w-auto justify-end">
                <button
                  type="button"
                  onClick={handleExportCategoryCsv}
                  disabled={givingList.length === 0}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 font-medium text-xs rounded-lg border border-slate-200 flex items-center space-x-1.5 transition-colors cursor-pointer"
                  title={`Export ${activeCategory} CSV`}
                >
                  <Download className="w-3.5 h-3.5 text-slate-600" />
                  <span className="hidden sm:inline">Export CSV</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowReportModal(true)}
                  disabled={givingList.length === 0}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 font-medium text-xs rounded-lg border border-slate-200 flex items-center space-x-1.5 transition-colors cursor-pointer"
                  title={`Generate ${activeCategory} Financial Report`}
                >
                  <FileText className="w-3.5 h-3.5 text-teal-700" />
                  <span>Report</span>
                </button>

                <button
                  type="button"
                  onClick={handleOpenRecordModal}
                  className="px-3.5 py-1.5 bg-teal-700 hover:bg-teal-800 text-white font-semibold text-xs rounded-lg shadow-xs flex items-center space-x-1.5 transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add to {activeCategory}</span>
                </button>
              </div>
            </div>

            {/* Date Filters & Method Filter strictly for this category */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
              <div className="flex items-center space-x-1.5 text-slate-500 font-medium">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Date Range:</span>
              </div>
              <input
                type="date"
                value={startDateFilter}
                onChange={e => setStartDateFilter(e.target.value)}
                className="px-2 py-1 border border-slate-200 rounded-md text-xs bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-teal-600"
              />
              <span className="text-slate-400 text-xs">to</span>
              <input
                type="date"
                value={endDateFilter}
                onChange={e => setEndDateFilter(e.target.value)}
                className="px-2 py-1 border border-slate-200 rounded-md text-xs bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-teal-600"
              />

              <div className="flex items-center space-x-1.5 ml-auto">
                <span className="text-slate-500 font-medium">Method:</span>
                <select
                  value={paymentMethodFilter}
                  onChange={e => setPaymentMethodFilter(e.target.value)}
                  className="px-2 py-1 border border-slate-200 rounded-md text-xs bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-teal-600"
                >
                  <option value="ALL">All Methods</option>
                  <option value="Cash">Cash</option>
                  <option value="Mobile Money">Mobile Money (MoMo)</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Cheque">Cheque</option>
                </select>

                {(searchQuery || startDateFilter || endDateFilter || paymentMethodFilter !== 'ALL') && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setStartDateFilter('');
                      setEndDateFilter('');
                      setPaymentMethodFilter('ALL');
                    }}
                    className="px-2 py-1 text-[11px] font-semibold text-rose-600 hover:text-rose-800 hover:underline cursor-pointer"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Category Records Table (Strict Category Isolation - No Mixing) */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-4 py-3 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-teal-600"></span>
                <span className="text-xs font-bold text-slate-800">
                  {activeCategory} Ledger ({givingList.length} records)
                </span>
              </div>
              <span className="text-xs font-bold text-teal-800">
                Sum: {currency}{categoryTotal.toLocaleString()}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] uppercase font-semibold">
                    <th className="py-3 px-4">Receipt #</th>
                    <th className="py-3 px-4">Member / Giver</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Method</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Officer</th>
                    <th className="py-3 px-4">SMS Receipt</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {givingList.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-slate-400">
                        <HandCoins className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                        <p className="font-semibold text-slate-600">No {activeCategory} records found.</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {searchQuery || startDateFilter || endDateFilter
                            ? 'Try clearing your filters.'
                            : `Click "Add to ${activeCategory}" to record the first contribution.`}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    givingList.map(item => (
                      <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">
                          {item.receiptNumber}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-800">
                          {item.memberName}
                          {item.phone && <div className="text-[10px] text-slate-400 font-mono">{item.phone}</div>}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-100 text-teal-800">
                            {item.givingCategory || item.category || activeCategory}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {item.givingType || item.givingCategory}
                        </td>
                        <td className="py-3 px-4 font-bold text-emerald-700">
                          {currency}{item.amount.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-slate-600">{item.paymentMethod}</td>
                        <td className="py-3 px-4 text-slate-500">{item.date}</td>
                        <td className="py-3 px-4 text-slate-600 text-[11px]">
                          {item.recordedBy || 'Finance Officer'}
                        </td>
                        <td className="py-3 px-4">
                          {item.smsSent ? (
                            <span className="inline-flex items-center space-x-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                              <CheckCircle className="w-3 h-3" />
                              <span>Sent</span>
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400">None</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end space-x-1">
                            <button
                              onClick={() => setSelectedReceipt(item)}
                              className="p-1.5 text-teal-700 hover:bg-teal-50 rounded-lg transition-colors cursor-pointer"
                              title="View Official Receipt"
                            >
                              <Receipt className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleOpenEditModal(item)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                              title="Edit Contribution (Move category or edit amount)"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteGiving(item)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                              title="Delete Record"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )}

  {/* SUB-VIEW 2: OPERATING EXPENSES */}
      {activeSubTab === 'expenses' && (
        <div className="space-y-3">
          {/* Expenses Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200">
            <div className="flex flex-1 items-center space-x-2 w-full sm:w-auto">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={expenseSearch}
                  onChange={e => setExpenseSearch(e.target.value)}
                  placeholder="Filter expenses by payee, category, memo..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500"
                />
              </div>
              <select
                value={expenseCategoryFilter}
                onChange={e => setExpenseCategoryFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white text-slate-700 font-medium"
              >
                <option value="ALL">All Categories ({expenseList.length})</option>
                <optgroup label="Standard Categories">
                  {(expenseCategoriesData?.standardCategories || []).map(sc => (
                    <option key={sc} value={sc}>{sc}</option>
                  ))}
                </optgroup>
                {(expenseCategoriesData?.customCategories || []).length > 0 && (
                  <optgroup label="Custom Categories">
                    {(expenseCategoriesData?.customCategories || []).map(cc => (
                      <option key={cc} value={cc}>★ {cc}</option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>
            <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
              <button
                onClick={() => setShowManageExpenseCategoriesModal(true)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs rounded-lg transition-colors border border-slate-200 flex items-center space-x-1.5 cursor-pointer"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-slate-600" />
                <span>Categories</span>
              </button>
              <button
                onClick={() => setShowExpenseModal(true)}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-medium text-xs rounded-lg transition-colors flex items-center space-x-1 shadow-2xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Record Expense</span>
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] uppercase font-semibold">
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Payee</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Method</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Description</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredExpenses.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400 italic">
                        No expenses match your search or filter.
                      </td>
                    </tr>
                  ) : (
                    filteredExpenses.map(exp => (
                      <tr key={exp.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-800">
                          {exp.category}
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-700">{exp.payee}</td>
                        <td className="py-3 px-4 font-bold text-rose-600">{currency}{exp.amount.toLocaleString()}</td>
                        <td className="py-3 px-4 text-slate-600">{exp.paymentMethod}</td>
                        <td className="py-3 px-4 text-slate-500">{exp.date}</td>
                        <td className="py-3 px-4 text-slate-500 text-[11px]">{exp.description || '-'}</td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleDeleteExpense(exp)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                            title="Delete Expense Record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-VIEW 3: BANK & MOMO ACCOUNTS */}
      {activeSubTab === 'accounts' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {(accounts || []).map(acc => (
            <div key={acc.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs text-left">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-700">{acc.accountName}</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">
                  {acc.accountType}
                </span>
              </div>
              <p className="text-2xl font-extrabold text-slate-900">{currency}{acc.balance.toLocaleString()}</p>
              <div className="text-[11px] text-slate-500 mt-2 space-y-0.5">
                {acc.institution && <p>Institution: {acc.institution}</p>}
                {acc.accountNumber && <p className="font-mono">Account #: {acc.accountNumber}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* RECORD GIVING MODAL (With explicit Giving Category selector) */}
      {showRecordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 text-left space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Record Church Contribution</h3>
                <p className="text-xs text-slate-500">Categorized under {givingForm.givingCategory}</p>
              </div>
              <button
                onClick={() => setShowRecordModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordGiving} className="space-y-3.5 text-xs">
              {/* Member Selector */}
              <div>
                <MemberSelector
                  label="Registered Member"
                  placeholder="Search registered members by Name, Phone, or ID..."
                  value={givingForm.memberId}
                  selectedMember={members.find(m => m.id === givingForm.memberId) || null}
                  onChange={handleMemberSelect}
                  allowNonMemberOption={true}
                  nonMemberLabel="-- Anonymous or Non-Registered Giver --"
                  isNonMemberSelected={!givingForm.memberId}
                  onSelectNonMember={() => {
                    setGivingForm(prev => ({
                      ...prev,
                      memberId: '',
                      memberName: '',
                      phone: '',
                    }));
                  }}
                  helperText="Searchable single source of truth from central Registered Members"
                />
              </div>

              {!givingForm.memberId && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Giver Name / Description</label>
                  <input
                    type="text"
                    value={givingForm.memberName}
                    onChange={e => setGivingForm({ ...givingForm, memberName: e.target.value })}
                    placeholder="e.g. Anonymous Believer"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              )}

              {/* REQUIREMENT 1: Giving Category Selector */}
              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Giving Category * (Enforces Strict Tab Separation)
                </label>
                <select
                  value={givingForm.givingCategory}
                  onChange={e => {
                    const cat = e.target.value as GivingCategoryType;
                    setGivingForm(prev => ({
                      ...prev,
                      givingCategory: cat,
                      givingType: cat === 'Tithes' ? 'Tithe' : cat === 'Offerings' ? 'Offering' : cat === 'Donations' ? 'Donation' : cat,
                    }));
                  }}
                  className="w-full px-3 py-2 border-2 border-teal-600 rounded-lg bg-teal-50/30 text-teal-950 font-bold focus:outline-none focus:ring-2 focus:ring-teal-600"
                >
                  {GIVING_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-teal-800 mt-1">
                  Saved with transaction. Appears exclusively in the {givingForm.givingCategory} tab.
                </p>
              </div>

              {/* Giving Type & Amount */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Giving Sub-Type</label>
                  <input
                    type="text"
                    value={givingForm.givingType}
                    onChange={e => setGivingForm({ ...givingForm, givingType: e.target.value })}
                    placeholder="e.g. Tithe, Sunday Offering..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Amount ({currency}) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={givingForm.amount}
                    onChange={e => setGivingForm({ ...givingForm, amount: e.target.value })}
                    placeholder="0.00"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold text-emerald-700 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Payment Method</label>
                  <select
                    value={givingForm.paymentMethod}
                    onChange={e => setGivingForm({ ...givingForm, paymentMethod: e.target.value as any })}
                    className="w-full px-2.5 py-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Mobile Money">Mobile Money (MoMo)</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={givingForm.date}
                    onChange={e => setGivingForm({ ...givingForm, date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Phone (for SMS Receipt)</label>
                  <input
                    type="text"
                    value={givingForm.phone}
                    onChange={e => setGivingForm({ ...givingForm, phone: e.target.value })}
                    placeholder="024XXXXXXX"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Officer Name</label>
                  <input
                    type="text"
                    value={givingForm.recordedBy}
                    onChange={e => setGivingForm({ ...givingForm, recordedBy: e.target.value })}
                    placeholder="Finance Officer"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Notes / Campaign (Optional)</label>
                <input
                  type="text"
                  value={givingForm.notes}
                  onChange={e => setGivingForm({ ...givingForm, notes: e.target.value })}
                  placeholder="e.g. For cathedral roof fund / Sunday 2nd service"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              {givingForm.givingCategory === 'Tithes' && (
                <div className="p-3 bg-teal-50/70 rounded-lg border border-teal-100 text-[11px] text-teal-950 leading-snug">
                  <strong>Automatic Tithe Confirmation Engine:</strong> An instant official receipt SMS notification will be automatically dispatched to the giver upon recording.
                </div>
              )}

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowRecordModal(false)}
                  className="px-3.5 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white font-semibold rounded-md shadow-xs disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {submitting ? 'Recording...' : `Confirm ${givingForm.givingCategory}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT GIVING MODAL (Requirement: Edit category & move record to correct tab) */}
      {showEditModal && editingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 text-left space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Edit Contribution Record</h3>
                <p className="text-xs text-slate-500 font-mono">Receipt: {editingRecord.receiptNumber}</p>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateGiving} className="space-y-3.5 text-xs">
              {/* REQUIREMENT 1: Display and change existing category */}
              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Giving Category * (Changing category moves record to new tab)
                </label>
                <select
                  value={editForm.givingCategory}
                  onChange={e => setEditForm({ ...editForm, givingCategory: e.target.value as GivingCategoryType })}
                  className="w-full px-3 py-2 border-2 border-teal-600 rounded-lg bg-teal-50/40 text-teal-950 font-bold focus:outline-none focus:ring-2 focus:ring-teal-600"
                >
                  {GIVING_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-teal-800 mt-1">
                  Currently in: <strong>{editingRecord.givingCategory || editingRecord.category}</strong>. Moving to: <strong>{editForm.givingCategory}</strong>.
                </p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Giver Name</label>
                <input
                  type="text"
                  value={editForm.memberName}
                  onChange={e => setEditForm({ ...editForm, memberName: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Sub-Type</label>
                  <input
                    type="text"
                    value={editForm.givingType}
                    onChange={e => setEditForm({ ...editForm, givingType: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Amount ({currency}) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editForm.amount}
                    onChange={e => setEditForm({ ...editForm, amount: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold text-emerald-700 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Payment Method</label>
                  <select
                    value={editForm.paymentMethod}
                    onChange={e => setEditForm({ ...editForm, paymentMethod: e.target.value as any })}
                    className="w-full px-2.5 py-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Mobile Money">Mobile Money (MoMo)</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={editForm.date}
                    onChange={e => setEditForm({ ...editForm, date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Notes</label>
                <input
                  type="text"
                  value={editForm.notes}
                  onChange={e => setEditForm({ ...editForm, notes: e.target.value })}
                  placeholder="Notes..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-3.5 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white font-semibold rounded-md shadow-xs disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {submitting ? 'Saving...' : 'Update & Move to Tab'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* OFFICIAL RECEIPT MODAL (Includes Giving Category clearly) */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 text-left space-y-4">
            <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-teal-950">{church?.name || 'ChurchOS Assembly'}</h3>
                <p className="text-[10px] text-slate-400 font-mono uppercase">
                  OFFICIAL {selectedReceipt.givingCategory || selectedReceipt.category || 'CONTRIBUTION'} RECEIPT
                </p>
              </div>
              <button
                onClick={() => setSelectedReceipt(null)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Receipt No:</span>
                <span className="font-mono font-bold text-slate-800">{selectedReceipt.receiptNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Date:</span>
                <span className="font-medium text-slate-700">{selectedReceipt.date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Giver:</span>
                <span className="font-bold text-slate-900">{selectedReceipt.memberName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Giving Category:</span>
                <span className="font-bold text-teal-800 px-1.5 py-0.5 bg-teal-50 rounded">
                  {selectedReceipt.givingCategory || selectedReceipt.category}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Giving Type:</span>
                <span className="font-medium text-slate-700">{selectedReceipt.givingType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Payment Method:</span>
                <span className="font-medium text-slate-700">{selectedReceipt.paymentMethod}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Recorded By:</span>
                <span className="font-semibold text-slate-800">{selectedReceipt.recordedBy || 'Finance Officer'}</span>
              </div>
              <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-sm font-extrabold text-slate-900">
                <span>Total Received:</span>
                <span className="text-emerald-600">{currency}{selectedReceipt.amount.toLocaleString()}</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center space-x-1 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedReceipt(null)}
                className="px-4 py-1.5 bg-teal-700 hover:bg-teal-800 text-white font-semibold text-xs rounded-lg cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CATEGORY AUDIT REPORT MODAL (Requirement 3: Reports respect selected category only) */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 text-left space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {church?.name || 'Church'} — {activeCategory} Financial Report
                </h3>
                <p className="text-xs text-slate-500">
                  Audited financial ledger generated on {new Date().toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={() => setShowReportModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Summary KPI Strip */}
            <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-semibold">Total Collected</span>
                <p className="text-lg font-bold text-teal-800">{currency}{categoryTotal.toLocaleString()}</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-semibold">Record Count</span>
                <p className="text-lg font-bold text-slate-900">{givingList.length}</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-semibold">Category Average</span>
                <p className="text-lg font-bold text-slate-900">{currency}{Math.round(categoryAverage).toLocaleString()}</p>
              </div>
            </div>

            {/* Itemized Table */}
            <div className="max-h-72 overflow-y-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 sticky top-0 text-[10px] uppercase font-semibold text-slate-600">
                  <tr>
                    <th className="p-2">Receipt</th>
                    <th className="p-2">Date</th>
                    <th className="p-2">Giver</th>
                    <th className="p-2">Type</th>
                    <th className="p-2">Method</th>
                    <th className="p-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {givingList.map(item => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="p-2 font-mono">{item.receiptNumber}</td>
                      <td className="p-2 text-slate-500">{item.date}</td>
                      <td className="p-2 font-medium text-slate-800">{item.memberName}</td>
                      <td className="p-2 text-slate-600">{item.givingType}</td>
                      <td className="p-2 text-slate-500">{item.paymentMethod}</td>
                      <td className="p-2 text-right font-bold text-teal-800">{currency}{item.amount.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={handleExportCategoryCsv}
                className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center space-x-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-slate-600" />
                <span>Export CSV</span>
              </button>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3.5 py-2 text-xs font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg flex items-center space-x-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Report</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowReportModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs rounded-lg cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RECORD EXPENSE MODAL */}
      {showExpenseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-slate-200 text-left space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-teal-950">Record Operating Expense</h3>
              <button
                onClick={() => setShowExpenseModal(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleLogExpense} className="space-y-3.5 text-xs">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-700">Expense Category *</label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomExpenseCategory(!isCustomExpenseCategory);
                      if (!isCustomExpenseCategory && !customExpenseCategoryInput) {
                        setCustomExpenseCategoryInput('');
                      }
                    }}
                    className="text-[11px] font-bold text-teal-700 hover:text-teal-800 flex items-center space-x-1 cursor-pointer"
                  >
                    <span>{isCustomExpenseCategory ? '← Choose Existing' : '+ Custom Category'}</span>
                  </button>
                </div>

                {isCustomExpenseCategory ? (
                  <div className="space-y-1.5">
                    <input
                      type="text"
                      required
                      value={customExpenseCategoryInput}
                      onChange={e => setCustomExpenseCategoryInput(e.target.value)}
                      placeholder="e.g. Instrument Maintenance, Youth Camp..."
                      className="w-full px-3 py-2 border border-teal-500 rounded-xl bg-teal-50/20 font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500"
                    />
                  </div>
                ) : (
                  <select
                    value={expenseForm.category}
                    onChange={e => {
                      if (e.target.value === '__NEW__') {
                        setIsCustomExpenseCategory(true);
                      } else {
                        setExpenseForm({ ...expenseForm, category: e.target.value });
                      }
                    }}
                    className="w-full px-2.5 py-2 border border-slate-300 rounded-xl bg-white"
                  >
                    <optgroup label="Standard Categories">
                      {(expenseCategoriesData?.standardCategories || []).map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </optgroup>
                    {(expenseCategoriesData?.customCategories || []).length > 0 && (
                      <optgroup label="Custom Categories">
                        {(expenseCategoriesData?.customCategories || []).map(cat => (
                          <option key={cat} value={cat}>★ {cat}</option>
                        ))}
                      </optgroup>
                    )}
                    <option value="__NEW__">+ Custom Category...</option>
                  </select>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Amount ({currency}) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={expenseForm.amount}
                    onChange={e => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                    placeholder="0.00"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold text-rose-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Payee / Recipient *</label>
                  <input
                    type="text"
                    required
                    value={expenseForm.payee}
                    onChange={e => setExpenseForm({ ...expenseForm, payee: e.target.value })}
                    placeholder="e.g. ECG Prepaid, Sound Eng."
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Payment Method</label>
                <select
                  value={expenseForm.paymentMethod}
                  onChange={e => setExpenseForm({ ...expenseForm, paymentMethod: e.target.value })}
                  className="w-full px-2.5 py-2 border border-slate-300 rounded-xl bg-white"
                >
                  <option value="Cash">Cash</option>
                  <option value="Mobile Money">Mobile Money (MoMo)</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description / Memo</label>
                <input
                  type="text"
                  value={expenseForm.description}
                  onChange={e => setExpenseForm({ ...expenseForm, description: e.target.value })}
                  placeholder="Purpose of expense..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowExpenseModal(false)}
                  className="px-3.5 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-medium rounded-md shadow-xs disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {submitting ? 'Recording...' : 'Disburse Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MANAGE GIVING TYPES MODAL */}
      {showManageTypesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 text-left space-y-4 max-h-[88vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-teal-50 text-teal-700 rounded-lg">
                  <Tag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Church Giving Types</h3>
                  <p className="text-xs text-slate-500">Configure custom labels and sub-types within giving categories</p>
                </div>
              </div>
              <button
                onClick={() => setShowManageTypesModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Standard Types Reference */}
            <div>
              <h4 className="text-xs font-bold text-slate-500 mb-2">Standard Giving Categories</h4>
              <div className="flex flex-wrap gap-1.5">
                {GIVING_CATEGORIES.map(cat => (
                  <span
                    key={cat}
                    className="px-2.5 py-1 bg-teal-50 text-teal-800 rounded-md text-xs font-bold border border-teal-200"
                  >
                    {cat}
                  </span>
                ))}
              </div>
            </div>

            {/* Custom Types List */}
            <div>
              <h4 className="text-xs font-bold text-slate-700 mb-2">
                Custom Church Types ({(givingTypesData?.customTypes || []).length})
              </h4>
              {(givingTypesData?.customTypes || []).length === 0 ? (
                <p className="text-xs text-slate-400 italic p-3 bg-slate-50 rounded-lg text-center">
                  No custom types yet.
                </p>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {(givingTypesData?.customTypes || []).map(type => (
                    <div
                      key={type}
                      className="flex items-center justify-between p-2.5 bg-white border border-slate-200 rounded-lg hover:border-teal-300 transition-colors"
                    >
                      <div className="flex items-center space-x-2">
                        <span className="w-2 h-2 rounded-full bg-teal-500"></span>
                        <span className="text-xs font-bold text-slate-800">{type}</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-teal-50 text-teal-700">Custom</span>
                      </div>
                      <button
                        type="button"
                        disabled={deletingType === type}
                        onClick={() => handleDeleteCustomGivingType(type)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors disabled:opacity-50 cursor-pointer"
                        title={`Delete ${type}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setShowManageTypesModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-medium text-xs rounded-lg transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MANAGE CUSTOM EXPENSE CATEGORIES MODAL */}
      {showManageExpenseCategoriesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 text-left space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-rose-50 text-rose-700 rounded-lg">
                  <SlidersHorizontal className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Custom Expense Categories</h3>
                  <p className="text-xs text-slate-500">Configure church operating & disbursement categories</p>
                </div>
              </div>
              <button
                onClick={() => setShowManageExpenseCategoriesModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Add New Custom Expense Category Form */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2.5">
              <label className="block text-xs font-bold text-slate-800">Add New Category</label>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={newCustomCategoryInput}
                  onChange={e => setNewCustomCategoryInput(e.target.value)}
                  placeholder="e.g. Media Software Licenses, Welfare Groceries..."
                  className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-rose-500"
                />
                <button
                  type="button"
                  disabled={!newCustomCategoryInput.trim() || addingExpenseCategory}
                  onClick={() => handleCreateCustomExpenseCategory(newCustomCategoryInput)}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-medium text-xs rounded-lg transition-colors flex items-center space-x-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{addingExpenseCategory ? 'Adding...' : 'Add'}</span>
                </button>
              </div>
            </div>

            {/* Custom Expense Categories List */}
            <div>
              <h4 className="text-xs font-bold text-slate-800 mb-2">
                Active Custom Categories ({(expenseCategoriesData?.customCategories || []).length})
              </h4>
              {(expenseCategoriesData?.customCategories || []).length === 0 ? (
                <p className="text-xs text-slate-400 italic p-3 bg-slate-50 rounded-lg text-center">
                  No custom categories yet. Use the form above to create one.
                </p>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {(expenseCategoriesData?.customCategories || []).map(cat => (
                    <div
                      key={cat}
                      className="flex items-center justify-between p-2.5 bg-white border border-slate-200 rounded-lg hover:border-rose-300 transition-colors"
                    >
                      <div className="flex items-center space-x-2">
                        <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                        <span className="text-xs font-bold text-slate-800">{cat}</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700">Custom</span>
                      </div>
                      <button
                        type="button"
                        disabled={deletingExpenseCategory === cat}
                        onClick={() => handleDeleteCustomExpenseCategory(cat)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors disabled:opacity-50 cursor-pointer"
                        title={`Remove ${cat}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setShowManageExpenseCategoriesModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-medium text-xs rounded-lg transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* IN-APP DELETE GIVING RECORD CONFIRMATION MODAL                      */}
      {/* =================================================================== */}
      {givingToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden text-xs text-left animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 bg-rose-50 border-b border-rose-100 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-rose-950">Delete Contribution Record</h3>
                  <p className="text-[11px] text-rose-600">Permanently purge financial ledger entry</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setGivingToDelete(null)}
                disabled={isDeletingGiving}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-3">
              <p className="text-slate-700 leading-relaxed text-xs">
                Are you sure you want to delete receipt{' '}
                <strong className="text-slate-900 font-bold">#{givingToDelete.receiptNumber}</strong>?
              </p>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-slate-600">
                  <span className="font-medium">Contributor:</span>
                  <span className="font-bold text-slate-900">{givingToDelete.memberName}</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span className="font-medium">Category:</span>
                  <span className="font-semibold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                    {givingToDelete.givingCategory}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span className="font-medium">Amount:</span>
                  <span className="font-black text-emerald-700 text-sm">
                    {currency}{givingToDelete.amount.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span className="font-medium">Date:</span>
                  <span className="font-mono text-slate-700">{givingToDelete.date}</span>
                </div>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-[11px]">
                <strong>Warning:</strong> Deleting this record removes it permanently from church financial ledger reports and recalculates category summary totals.
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setGivingToDelete(null)}
                disabled={isDeletingGiving}
                className="px-4 py-2 text-slate-600 font-semibold hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteGiving}
                disabled={isDeletingGiving}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-xs transition flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
              >
                {isDeletingGiving ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Yes, Delete Contribution</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* IN-APP DELETE EXPENSE RECORD CONFIRMATION MODAL                     */}
      {/* =================================================================== */}
      {expenseToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden text-xs text-left animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 bg-rose-50 border-b border-rose-100 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-rose-950">Delete Expense Record</h3>
                  <p className="text-[11px] text-rose-600">Remove expense entry from financial books</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setExpenseToDelete(null)}
                disabled={isDeletingExpense}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-3">
              <p className="text-slate-700 leading-relaxed text-xs">
                Are you sure you want to delete this expense record for{' '}
                <strong className="text-slate-900 font-bold">{expenseToDelete.payee}</strong>?
              </p>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-slate-600">
                  <span className="font-medium">Category:</span>
                  <span className="font-bold text-slate-900">{expenseToDelete.category}</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span className="font-medium">Amount:</span>
                  <span className="font-black text-rose-600 text-sm">
                    {currency}{expenseToDelete.amount.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span className="font-medium">Date:</span>
                  <span className="font-mono text-slate-700">{expenseToDelete.date}</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setExpenseToDelete(null)}
                disabled={isDeletingExpense}
                className="px-4 py-2 text-slate-600 font-semibold hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteExpense}
                disabled={isDeletingExpense}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-xs transition flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
              >
                {isDeletingExpense ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Yes, Delete Expense</span>
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
