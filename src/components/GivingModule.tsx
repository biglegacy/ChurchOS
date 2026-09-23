import React, { useState, useEffect } from 'react';
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
  Send,
  Printer,
  Tag,
  Trash2,
  Sparkles,
  SlidersHorizontal,
  FolderPlus,
} from 'lucide-react';
import { ApiClient } from '../api';
import { GivingRecord, ExpenseRecord, Member, Church } from '../types';
import { useMembers } from '../context/MembersContext';
import { MemberSelector } from './common/MemberSelector';

interface Props {
  church?: Church | null;
  preSelectedMemberId?: string;
}

export const GivingModule: React.FC<Props> = ({ church, preSelectedMemberId }) => {
  const { members } = useMembers();
  const [activeSubTab, setActiveSubTab] = useState<'giving' | 'expenses' | 'accounts'>('giving');
  const [givingList, setGivingList] = useState<GivingRecord[]>([]);
  const [expenseList, setExpenseList] = useState<ExpenseRecord[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<GivingRecord | null>(null);

  // Form State for Giving
  const [givingForm, setGivingForm] = useState({
    memberId: preSelectedMemberId || '',
    memberName: '',
    phone: '',
    amount: '',
    givingType: 'Tithe' as string,
    paymentMethod: 'Cash' as const,
    date: new Date().toISOString().slice(0, 10),
    campaignOrProject: '',
    recordedBy: ApiClient.getUser()?.fullName || '',
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
  const [givingTypeFilter, setGivingTypeFilter] = useState('ALL');

  // Custom Expense Categories State
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
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [givingSearch, setGivingSearch] = useState('');

  const currency = church?.settings?.currency || 'GH₵';

  const loadData = async () => {
    try {
      setLoading(true);
      const [gRes, eRes, aRes, tRes, expCatRes] = await Promise.all([
        ApiClient.get('/api/church/giving'),
        ApiClient.get('/api/church/finance/expenses'),
        ApiClient.get('/api/church/finance/accounts'),
        ApiClient.get('/api/church/giving-types').catch(() => null),
        ApiClient.get('/api/church/expense-categories').catch(() => null),
      ]);

      setGivingList(gRes || []);
      setExpenseList(eRes || []);
      setAccounts(aRes || []);
      if (tRes && tRes.allTypes) {
        setGivingTypesData(tRes);
      }
      if (expCatRes && expCatRes.allCategories) {
        setExpenseCategoriesData(expCatRes);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load finances.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCustomExpenseCategory = async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    try {
      setAddingExpenseCategory(true);
      setError(null);
      const res = await ApiClient.post('/api/church/expense-categories', { name: trimmed });
      if (res && res.allCategories) {
        setExpenseCategoriesData(res);
      }
      setNotice(`Custom expense category "${trimmed}" added successfully.`);
      setNewCustomCategoryInput('');
      return trimmed;
    } catch (err: any) {
      setError(err.message || 'Failed to add custom expense category.');
      throw err;
    } finally {
      setAddingExpenseCategory(false);
    }
  };

  const handleDeleteCustomExpenseCategory = async (catName: string) => {
    try {
      setDeletingExpenseCategory(catName);
      setError(null);
      const res = await ApiClient.delete(`/api/church/expense-categories/${encodeURIComponent(catName)}`);
      if (res && res.allCategories) {
        setExpenseCategoriesData(res);
      }
      setNotice(`Category "${catName}" removed.`);
    } catch (err: any) {
      setError(err.message || 'Failed to delete category.');
    } finally {
      setDeletingExpenseCategory(null);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this expense record?')) return;
    try {
      await ApiClient.delete(`/api/church/finance/expenses/${id}`);
      setNotice('Expense record removed successfully.');
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to delete expense record.');
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
      if (res && res.allTypes) {
        setGivingTypesData({
          standardTypes: res.standardTypes || givingTypesData.standardTypes,
          customTypes: res.customTypes || [],
          allTypes: res.allTypes,
        });
      }
      setNotice(`Custom giving category "${trimmed}" added successfully.`);
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
      if (res && res.allTypes) {
        setGivingTypesData({
          standardTypes: res.standardTypes || givingTypesData.standardTypes,
          customTypes: res.customTypes || [],
          allTypes: res.allTypes,
        });
      }
      if (givingForm.givingType === typeName) {
        setGivingForm(prev => ({ ...prev, givingType: 'Tithe' }));
      }
      setNotice(`Custom giving category "${typeName}" removed.`);
    } catch (err: any) {
      setError(err.message || 'Failed to delete custom giving type.');
    } finally {
      setDeletingType(null);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

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

      let msg = `Successfully recorded ${givingForm.givingType} of ${currency}${givingForm.amount} for ${res.giving.memberName}. Receipt: ${res.giving.receiptNumber}`;
      if (res.smsNotification?.sent) {
        msg += ` • Automatic SMS confirmation dispatched to ${res.giving.phone}!`;
      }
      setNotice(msg);
      setShowRecordModal(false);
      setSelectedReceipt(res.giving);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to record contribution.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const chosenCategory = isCustomExpenseCategory
      ? customExpenseCategoryInput.trim()
      : expenseForm.category;

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
        category: expenseCategoriesData.allCategories[0] || 'Utilities (Electricity/Water)',
        amount: '',
        payee: '',
        paymentMethod: 'Cash',
        description: '',
        date: new Date().toISOString().slice(0, 10),
      });
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to log expense.');
    } finally {
      setSubmitting(false);
    }
  };

  const totalIncome = givingList.reduce((sum, g) => sum + g.amount, 0);
  const totalTithes = givingList.filter(g => g.givingType === 'Tithe').reduce((sum, g) => sum + g.amount, 0);
  const totalOfferings = givingList.filter(g => g.givingType === 'Offering').reduce((sum, g) => sum + g.amount, 0);
  const totalExpenses = expenseList.reduce((sum, e) => sum + e.amount, 0);
  const netSurplus = totalIncome - totalExpenses;

  const filteredGiving = givingList.filter(g => {
    const matchesSearch =
      g.memberName.toLowerCase().includes(givingSearch.toLowerCase()) ||
      g.givingType.toLowerCase().includes(givingSearch.toLowerCase()) ||
      g.receiptNumber.toLowerCase().includes(givingSearch.toLowerCase());
    const matchesType = givingTypeFilter === 'ALL' || g.givingType === givingTypeFilter;
    return matchesSearch && matchesType;
  });

  const filteredExpenses = expenseList.filter(e => {
    const matchesSearch =
      e.payee.toLowerCase().includes(expenseSearch.toLowerCase()) ||
      e.category.toLowerCase().includes(expenseSearch.toLowerCase()) ||
      (e.description && e.description.toLowerCase().includes(expenseSearch.toLowerCase()));
    const matchesCategory =
      expenseCategoryFilter === 'ALL' || e.category.toLowerCase() === expenseCategoryFilter.toLowerCase();
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-5 pb-20 text-left">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-teal-950 flex items-center space-x-2">
            <HandCoins className="w-5 h-5 text-teal-700" />
            <span>Tithes, Giving & Church Finances</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Automated tithe SMS receipts, mobile money & cash accounting, and expense auditing.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowManageTypesModal(true)}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs rounded-md flex items-center space-x-1.5 transition-colors border border-slate-200 shadow-2xs"
            title="Manage Giving Categories"
          >
            <Tag className="w-3.5 h-3.5 text-slate-600" />
            <span>Giving Types</span>
            {givingTypesData.customTypes.length > 0 && (
              <span className="px-1.5 py-0.5 bg-teal-100 text-teal-800 text-[10px] font-bold rounded-full">
                {givingTypesData.customTypes.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setShowManageExpenseCategoriesModal(true)}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs rounded-md flex items-center space-x-1.5 transition-colors border border-slate-200 shadow-2xs"
            title="Manage Custom Expense Categories"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-600" />
            <span>Expense Categories</span>
            {expenseCategoriesData.customCategories.length > 0 && (
              <span className="px-1.5 py-0.5 bg-rose-100 text-rose-800 text-[10px] font-bold rounded-full">
                {expenseCategoriesData.customCategories.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setShowExpenseModal(true)}
            className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-medium text-xs rounded-md transition-colors border border-rose-200"
          >
            Log Expense
          </button>
          <button
            onClick={() => setShowRecordModal(true)}
            className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white font-medium text-xs rounded-md shadow-xs flex items-center space-x-1.5 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Record Giving</span>
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

      {/* Financial KPIs Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500">Total Income</span>
          <p className="text-2xl font-bold text-slate-900 mt-1">{currency}{totalIncome.toLocaleString()}</p>
          <p className="text-[11px] text-teal-700 font-medium mt-1">All giving types</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500">Tithes Recorded</span>
          <p className="text-2xl font-bold text-teal-800 mt-1">{currency}{totalTithes.toLocaleString()}</p>
          <p className="text-[11px] text-slate-400 mt-1">Instant SMS notified</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500">Total Expenses</span>
          <p className="text-2xl font-bold text-rose-600 mt-1">{currency}{totalExpenses.toLocaleString()}</p>
          <p className="text-[11px] text-slate-400 mt-1">{expenseList.length} Disbursements</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500">Net Surplus</span>
          <p className="text-2xl font-bold text-slate-900 mt-1">{currency}{netSurplus.toLocaleString()}</p>
          <p className="text-[11px] text-slate-400 mt-1">Cash in bank & vaults</p>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex border border-slate-200 bg-white rounded-xl p-1 shadow-xs text-xs font-semibold">
        <button
          onClick={() => setActiveSubTab('giving')}
          className={`flex-1 py-2 rounded-lg transition-colors ${
            activeSubTab === 'giving' ? 'bg-teal-800 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Contributions & Receipts ({givingList.length})
        </button>
        <button
          onClick={() => setActiveSubTab('expenses')}
          className={`flex-1 py-2 rounded-lg transition-colors ${
            activeSubTab === 'expenses' ? 'bg-teal-800 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Operating Expenses ({expenseList.length})
        </button>
        <button
          onClick={() => setActiveSubTab('accounts')}
          className={`flex-1 py-2 rounded-lg transition-colors ${
            activeSubTab === 'accounts' ? 'bg-teal-800 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Bank & MoMo Accounts
        </button>
      </div>

      {/* SUB-VIEW: CONTRIBUTIONS & RECEIPTS */}
      {activeSubTab === 'giving' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={givingSearch}
                onChange={e => setGivingSearch(e.target.value)}
                placeholder="Search by member, giving type or receipt #..."
                className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">Filter:</span>
              <select
                value={givingTypeFilter}
                onChange={e => setGivingTypeFilter(e.target.value)}
                className="px-2.5 py-1.5 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-1 focus:ring-teal-600"
              >
                <option value="ALL">All Categories</option>
                <optgroup label="Standard Categories">
                  {givingTypesData.standardTypes.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </optgroup>
                {givingTypesData.customTypes.length > 0 && (
                  <optgroup label="Custom Categories">
                    {givingTypesData.customTypes.map(ct => (
                      <option key={ct} value={ct}>★ {ct}</option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] uppercase font-semibold">
                  <th className="py-3 px-4">Receipt #</th>
                  <th className="py-3 px-4">Member / Giver</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Method</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Recorded By</th>
                  <th className="py-3 px-4">SMS Notice</th>
                  <th className="py-3 px-4 text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredGiving.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{item.receiptNumber}</td>
                    <td className="py-3 px-4 font-semibold text-slate-800">
                      {item.memberName}
                      {item.phone && <div className="text-[10px] text-slate-400">{item.phone}</div>}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        {item.givingType}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-extrabold text-emerald-600">
                      {currency}{item.amount.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-slate-600">{item.paymentMethod}</td>
                    <td className="py-3 px-4 text-slate-500">{item.date}</td>
                    <td className="py-3 px-4 text-slate-600 font-medium">
                      {item.recordedBy || 'Finance Officer'}
                    </td>
                    <td className="py-3 px-4">
                      {item.smsSent ? (
                        <span className="inline-flex items-center space-x-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                          <CheckCircle className="w-3 h-3" />
                          <span>Delivered</span>
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400">None</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setSelectedReceipt(item)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        title="View Official Receipt"
                      >
                        <Receipt className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-VIEW: EXPENSES */}
      {activeSubTab === 'expenses' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
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
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {expenseList.map(exp => (
                  <tr key={exp.id} className="hover:bg-slate-50/60">
                    <td className="py-3 px-4 font-bold text-slate-800">{exp.category}</td>
                    <td className="py-3 px-4 font-medium text-slate-700">{exp.payee}</td>
                    <td className="py-3 px-4 font-bold text-rose-600">{currency}{exp.amount.toLocaleString()}</td>
                    <td className="py-3 px-4 text-slate-600">{exp.paymentMethod}</td>
                    <td className="py-3 px-4 text-slate-500">{exp.date}</td>
                    <td className="py-3 px-4 text-slate-500 text-[11px]">{exp.description || '-'}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        {exp.approvalStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-VIEW: ACCOUNTS */}
      {activeSubTab === 'accounts' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {accounts.map(acc => (
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

      {/* RECORD GIVING MODAL */}
      {showRecordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 text-left space-y-4 max-h-[88vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Record Church Contribution</h3>
              <button
                onClick={() => setShowRecordModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordGiving} className="space-y-3.5 text-xs">
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
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-semibold text-slate-700">
                      Giving Type *
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setShowInlineNewType(!showInlineNewType);
                        setInlineNewTypeName('');
                      }}
                      className="text-[11px] font-semibold text-teal-700 hover:text-teal-900 flex items-center space-x-0.5 hover:underline"
                    >
                      <Plus className="w-3 h-3" />
                      <span>{showInlineNewType ? 'Select Type' : 'Custom'}</span>
                    </button>
                  </div>

                  {!showInlineNewType ? (
                    <select
                      value={givingForm.givingType}
                      onChange={e => {
                        if (e.target.value === '__ADD_NEW__') {
                          setShowInlineNewType(true);
                          setInlineNewTypeName('');
                        } else {
                          setGivingForm({ ...givingForm, givingType: e.target.value });
                        }
                      }}
                      className="w-full px-2.5 py-2 border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-1 focus:ring-teal-600"
                    >
                      <optgroup label="Standard Types">
                        {givingTypesData.standardTypes.map(t => (
                          <option key={t} value={t}>
                            {t === 'Tithe' ? 'Tithe (10%)' : t === 'Offering' ? 'Sunday Offering' : t}
                          </option>
                        ))}
                      </optgroup>
                      {givingTypesData.customTypes.length > 0 && (
                        <optgroup label="Custom Church Types">
                          {givingTypesData.customTypes.map(ct => (
                            <option key={ct} value={ct}>
                              ★ {ct}
                            </option>
                          ))}
                        </optgroup>
                      )}
                      <option value="__ADD_NEW__">+ Add Custom Giving Type...</option>
                    </select>
                  ) : (
                    <div className="space-y-1">
                      <div className="flex items-center space-x-1.5">
                        <input
                          type="text"
                          autoFocus
                          value={inlineNewTypeName}
                          onChange={e => setInlineNewTypeName(e.target.value)}
                          placeholder="e.g. Harvest Offering"
                          className="flex-1 px-2.5 py-1.5 border border-teal-500 rounded-lg text-xs focus:ring-1 focus:ring-teal-600 focus:outline-none"
                        />
                        <button
                          type="button"
                          disabled={!inlineNewTypeName.trim() || addingType}
                          onClick={async () => {
                            const name = inlineNewTypeName.trim();
                            if (!name) return;
                            try {
                              setAddingType(true);
                              const res = await ApiClient.post('/api/church/giving-types', { name, enableAutoSms: true });
                              if (res?.allTypes) {
                                setGivingTypesData(prev => ({
                                  ...prev,
                                  customTypes: res.customTypes || [...prev.customTypes, name],
                                  allTypes: res.allTypes,
                                }));
                              }
                              setGivingForm(prev => ({ ...prev, givingType: name }));
                              setShowInlineNewType(false);
                              setInlineNewTypeName('');
                            } catch {
                              setGivingForm(prev => ({ ...prev, givingType: name }));
                              setShowInlineNewType(false);
                            } finally {
                              setAddingType(false);
                            }
                          }}
                          className="px-2.5 py-1.5 bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white font-medium text-xs rounded-lg transition-colors whitespace-nowrap"
                        >
                          {addingType ? '...' : 'Pick'}
                        </button>
                      </div>
                      <p className="text-[10px] text-slate-500">Auto-saved to church types</p>
                    </div>
                  )}
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
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold text-emerald-700 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Payment Method</label>
                  <select
                    value={givingForm.paymentMethod}
                    onChange={e => setGivingForm({ ...givingForm, paymentMethod: e.target.value as any })}
                    className="w-full px-2.5 py-2 border border-slate-300 rounded-xl bg-white"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Mobile Money">Mobile Money (MoMo)</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Phone (for SMS Notice)</label>
                  <input
                    type="text"
                    value={givingForm.phone}
                    onChange={e => setGivingForm({ ...givingForm, phone: e.target.value })}
                    placeholder="024XXXXXXX"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Received / Recorded By (Officer Name)
                </label>
                <input
                  type="text"
                  value={givingForm.recordedBy}
                  onChange={e => setGivingForm({ ...givingForm, recordedBy: e.target.value })}
                  placeholder="e.g. Deaconess Mary Annan / Pastor John"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-slate-900 bg-white"
                />
              </div>

              {givingForm.givingType === 'Tithe' && (
                <div className="p-3 bg-teal-50/70 rounded-lg border border-teal-100 text-[11px] text-teal-950 leading-snug">
                  <strong>Automatic Tithe Confirmation Engine:</strong> An instant official receipt SMS notification will be automatically delivered to the giver upon recording.
                </div>
              )}

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowRecordModal(false)}
                  className="px-3.5 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white font-medium rounded-md shadow-xs disabled:opacity-50 transition-colors"
                >
                  {submitting ? 'Recording...' : 'Confirm Contribution'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LOG EXPENSE MODAL */}
      {showExpenseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-slate-200 text-left space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-teal-950">Record Operating Expense</h3>
              <button
                onClick={() => setShowExpenseModal(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleLogExpense} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Expense Category *</label>
                <select
                  value={expenseForm.category}
                  onChange={e => setExpenseForm({ ...expenseForm, category: e.target.value })}
                  className="w-full px-2.5 py-2 border border-slate-300 rounded-xl bg-white"
                >
                  <option value="Utilities (Electricity/Water)">Utilities (Electricity/Water)</option>
                  <option value="Media & Sound Equipment">Media & Sound Equipment</option>
                  <option value="Guest Minister Honorarium">Guest Minister Honorarium</option>
                  <option value="Benevolence & Welfare">Benevolence & Welfare Support</option>
                  <option value="Sanctuary Maintenance">Sanctuary Cleaning & Maintenance</option>
                  <option value="Transport & Fuel">Transport & Fuel</option>
                  <option value="Administrative Printing">Administrative Printing & Supplies</option>
                </select>
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
                  className="px-3.5 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-medium rounded-md shadow-xs disabled:opacity-50 transition-colors"
                >
                  {submitting ? 'Recording...' : 'Disburse Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* OFFICIAL RECEIPT VIEW MODAL */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 text-left space-y-4">
            <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-teal-950">{church?.name || 'Church'}</h3>
                <p className="text-[10px] text-slate-400 font-mono">OFFICIAL CONTRIBUTION RECEIPT</p>
              </div>
              <button
                onClick={() => setSelectedReceipt(null)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700"
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
                <span className="text-slate-400">Giving Type:</span>
                <span className="font-semibold text-emerald-700">{selectedReceipt.givingType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Method:</span>
                <span className="font-medium text-slate-700">{selectedReceipt.paymentMethod}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Received / Recorded By:</span>
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
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center space-x-1"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedReceipt(null)}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl"
              >
                Done
              </button>
            </div>
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
                  <h3 className="text-base font-bold text-slate-900">Church Giving Categories</h3>
                  <p className="text-xs text-slate-500">Configure custom tithes, offerings, levies, and campaign funds</p>
                </div>
              </div>
              <button
                onClick={() => setShowManageTypesModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Add New Custom Type Section */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              <h4 className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                <span>Add Custom Giving Type</span>
              </h4>
              <div className="space-y-2">
                <input
                  type="text"
                  value={newCustomTypeName}
                  onChange={e => setNewCustomTypeName(e.target.value)}
                  placeholder="e.g. Harvest Thanksgiving, Youth Levy, Project Pledge..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-teal-600"
                />
                <label className="flex items-center space-x-2 text-xs text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newTypeAutoSms}
                    onChange={e => setNewTypeAutoSms(e.target.checked)}
                    className="rounded text-teal-700 focus:ring-teal-600"
                  />
                  <span>Dispatch automatic SMS acknowledgment receipt to donor for this type</span>
                </label>
                <button
                  type="button"
                  disabled={!newCustomTypeName.trim() || addingType}
                  onClick={async () => {
                    try {
                      await handleCreateCustomGivingType(newCustomTypeName, newTypeAutoSms);
                      setNewCustomTypeName('');
                    } catch {}
                  }}
                  className="w-full py-2 bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white font-medium text-xs rounded-lg transition-colors flex items-center justify-center space-x-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>{addingType ? 'Adding...' : 'Create Giving Category'}</span>
                </button>
              </div>
            </div>

            {/* Custom Types List */}
            <div>
              <h4 className="text-xs font-bold text-slate-800 mb-2">
                Custom Categories ({givingTypesData.customTypes.length})
              </h4>
              {givingTypesData.customTypes.length === 0 ? (
                <p className="text-xs text-slate-400 italic p-3 bg-slate-50 rounded-lg text-center">
                  No custom categories created yet. Use the form above to add one.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {givingTypesData.customTypes.map(type => (
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
                        className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors disabled:opacity-50"
                        title={`Delete ${type}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Standard Types Reference */}
            <div>
              <h4 className="text-xs font-bold text-slate-500 mb-2">Standard Built-in Categories</h4>
              <div className="flex flex-wrap gap-1.5">
                {givingTypesData.standardTypes.map(st => (
                  <span
                    key={st}
                    className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-md text-xs font-medium border border-slate-200"
                  >
                    {st}
                  </span>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setShowManageTypesModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-medium text-xs rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
