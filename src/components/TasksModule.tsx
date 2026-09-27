import React, { useState, useEffect } from 'react';
import {
  CheckSquare,
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Search,
  Filter,
  User,
  Calendar,
  Tag,
  Check,
  Trash2,
  Sparkles,
  ArrowRight,
  ListTodo,
} from 'lucide-react';
import { ApiClient } from '../api';
import { MinistryTask, MinistryTaskCategory, MinistryTaskPriority, MinistryTaskStatus } from '../types';
import { useAutoDismissNotification } from '../utils/useAutoDismissNotification';

const TASK_CATEGORIES: MinistryTaskCategory[] = [
  'Pastoral Follow-up',
  'Event Setup',
  'Visitation',
  'Administration',
  'Finance Audit',
  'Media & Sound',
  'Welfare & Outreach',
  'General',
];

const TASK_PRIORITIES: MinistryTaskPriority[] = ['Urgent', 'High', 'Medium', 'Low'];

export const TasksModule: React.FC = () => {
  const [tasks, setTasks] = useState<MinistryTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'ALL' | 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedPriority, setSelectedPriority] = useState<string>('ALL');

  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isBulkCompleting, setIsBulkCompleting] = useState(false);

  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  useAutoDismissNotification(notice, setNotice, 3000);
  useAutoDismissNotification(error, setError, 3000);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'General' as MinistryTaskCategory,
    assignedToName: '',
    assignedToRole: '',
    priority: 'Medium' as MinistryTaskPriority,
    dueDate: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
  });

  const loadTasks = async () => {
    try {
      setLoading(true);
      const res = await ApiClient.get('/api/church/tasks');
      setTasks(Array.isArray(res) ? res : []);
    } catch (err: any) {
      setError(err.message || 'Failed to load ministry tasks.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setError('Please enter a task title.');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      const res = await ApiClient.post('/api/church/tasks', formData);
      setTasks(prev => [res, ...prev]);
      setNotice(`Task "${res.title}" created successfully.`);
      setShowAddModal(false);
      setFormData({
        title: '',
        description: '',
        category: 'General',
        assignedToName: '',
        assignedToRole: '',
        priority: 'Medium',
        dueDate: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
      });
    } catch (err: any) {
      setError(err.message || 'Failed to create task.');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateStatus = async (task: MinistryTask, newStatus: MinistryTaskStatus) => {
    try {
      setError(null);
      const res = await ApiClient.put(`/api/church/tasks/${task.id}`, { status: newStatus });
      setTasks(prev => prev.map(t => (t.id === task.id ? res : t)));
      setNotice(`Updated "${task.title}" to ${newStatus}.`);
    } catch (err: any) {
      setError(err.message || 'Failed to update task status.');
    }
  };

  const handleDeleteTask = async (taskId: string, title: string) => {
    if (!window.confirm(`Are you sure you want to remove the task "${title}"?`)) return;
    try {
      setError(null);
      await ApiClient.delete(`/api/church/tasks/${taskId}`);
      setTasks(prev => prev.filter(t => t.id !== taskId));
      setNotice(`Deleted task "${title}".`);
    } catch (err: any) {
      setError(err.message || 'Failed to delete task.');
    }
  };

  // Complete all tasks that were cancelled
  const handleCompleteAllCancelled = async () => {
    try {
      setIsBulkCompleting(true);
      setError(null);
      const res = await ApiClient.post('/api/church/tasks/complete-cancelled', {});
      if (res.count > 0) {
        setNotice(`All ${res.count} cancelled task(s) have been successfully completed!`);
        await loadTasks();
        setActiveTab('COMPLETED');
      } else {
        setNotice('No cancelled tasks found to complete.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to complete cancelled tasks.');
    } finally {
      setIsBulkCompleting(false);
    }
  };

  // Counts
  const cancelledCount = tasks.filter(t => t.status === 'Cancelled').length;
  const pendingCount = tasks.filter(t => t.status === 'Pending').length;
  const inProgressCount = tasks.filter(t => t.status === 'In Progress').length;
  const completedCount = tasks.filter(t => t.status === 'Completed').length;

  const filteredTasks = tasks.filter(task => {
    if (activeTab === 'PENDING' && task.status !== 'Pending') return false;
    if (activeTab === 'IN_PROGRESS' && task.status !== 'In Progress') return false;
    if (activeTab === 'COMPLETED' && task.status !== 'Completed') return false;
    if (activeTab === 'CANCELLED' && task.status !== 'Cancelled') return false;

    if (selectedCategory !== 'ALL' && task.category !== selectedCategory) return false;
    if (selectedPriority !== 'ALL' && task.priority !== selectedPriority) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = task.title.toLowerCase().includes(q);
      const matchDesc = task.description?.toLowerCase().includes(q);
      const matchAssignee = task.assignedToName?.toLowerCase().includes(q);
      const matchCat = task.category?.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc && !matchAssignee && !matchCat) return false;
    }

    return true;
  });

  const getPriorityBadgeClass = (priority: MinistryTaskPriority) => {
    switch (priority) {
      case 'Urgent':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'High':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Medium':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Low':
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getStatusBadgeClass = (status: MinistryTaskStatus) => {
    switch (status) {
      case 'Completed':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'In Progress':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'Cancelled':
        return 'bg-rose-50 text-rose-700 border-rose-200 line-through';
      case 'Pending':
      default:
        return 'bg-amber-50 text-amber-800 border-amber-200';
    }
  };

  return (
    <div className="space-y-6 pb-20 text-left">
      {/* Top Banner & Action Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-teal-950 flex items-center space-x-2">
            <ListTodo className="w-5 h-5 text-teal-700" />
            <span>Ministry Tasks & Action Items</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Organize pastoral care follow-ups, event preparations, and departmental task workflows.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Complete All Cancelled Tasks button */}
          {cancelledCount > 0 && (
            <button
              onClick={handleCompleteAllCancelled}
              disabled={isBulkCompleting}
              className="inline-flex items-center space-x-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
              title="Mark all tasks that were cancelled as completed"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isBulkCompleting ? 'Completing...' : `Complete Cancelled (${cancelledCount})`}</span>
            </button>
          )}

          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Create Task</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {notice && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-medium flex items-center space-x-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{notice}</span>
        </div>
      )}

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs font-medium flex items-center space-x-2 animate-in fade-in">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* High-visibility Cancelled Tasks Banner */}
      {cancelledCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-start space-x-3">
            <div className="p-2 bg-amber-100 text-amber-800 rounded-lg shrink-0 mt-0.5">
              <RotateCcw className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-amber-900">
                You have {cancelledCount} task{cancelledCount > 1 ? 's' : ''} currently marked as Cancelled
              </h4>
              <p className="text-[11px] text-amber-700 mt-0.5">
                Reinstate and mark these tasks as finished with one click to keep your ministry records complete.
              </p>
            </div>
          </div>

          <button
            onClick={handleCompleteAllCancelled}
            disabled={isBulkCompleting}
            className="inline-flex items-center justify-center space-x-2 px-4 py-2 bg-amber-800 hover:bg-amber-900 text-white text-xs font-bold rounded-lg transition-colors shadow-xs shrink-0 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Complete All Cancelled Tasks</span>
          </button>
        </div>
      )}

      {/* Metric Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => setActiveTab('ALL')}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            activeTab === 'ALL'
              ? 'bg-teal-50 border-teal-300 ring-1 ring-teal-300 shadow-xs'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Tasks</p>
          <p className="text-xl font-bold text-teal-950 mt-1">{tasks.length}</p>
        </button>

        <button
          onClick={() => setActiveTab('PENDING')}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            activeTab === 'PENDING'
              ? 'bg-amber-50 border-amber-300 ring-1 ring-amber-300 shadow-xs'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <p className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider">Pending</p>
          <p className="text-xl font-bold text-amber-900 mt-1">{pendingCount}</p>
        </button>

        <button
          onClick={() => setActiveTab('COMPLETED')}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            activeTab === 'COMPLETED'
              ? 'bg-emerald-50 border-emerald-300 ring-1 ring-emerald-300 shadow-xs'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <p className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">Completed</p>
          <p className="text-xl font-bold text-emerald-900 mt-1">{completedCount}</p>
        </button>

        <button
          onClick={() => setActiveTab('CANCELLED')}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            activeTab === 'CANCELLED'
              ? 'bg-rose-50 border-rose-300 ring-1 ring-rose-300 shadow-xs'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <p className="text-[11px] font-semibold text-rose-700 uppercase tracking-wider">Cancelled</p>
          <div className="flex items-center justify-between mt-1">
            <p className="text-xl font-bold text-rose-900">{cancelledCount}</p>
            {cancelledCount > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 bg-rose-100 text-rose-800 font-bold rounded">Action</span>
            )}
          </div>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          {/* Status Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
            {(
              [
                { id: 'ALL', label: 'All Tasks', count: tasks.length },
                { id: 'PENDING', label: 'Pending', count: pendingCount },
                { id: 'IN_PROGRESS', label: 'In Progress', count: inProgressCount },
                { id: 'COMPLETED', label: 'Completed', count: completedCount },
                { id: 'CANCELLED', label: 'Cancelled', count: cancelledCount },
              ] as const
            ).map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center space-x-1.5 ${
                  activeTab === tab.id
                    ? 'bg-teal-800 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    activeTab === tab.id ? 'bg-teal-900 text-teal-100' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search tasks or assignees..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600 focus:bg-white"
            />
          </div>
        </div>

        {/* Category & Priority Selectors */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
          <span className="text-slate-400 font-medium">Category:</span>
          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-700 focus:outline-none"
          >
            <option value="ALL">All Categories</option>
            {TASK_CATEGORIES.map(cat => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          <span className="text-slate-400 font-medium ml-2">Priority:</span>
          <select
            value={selectedPriority}
            onChange={e => setSelectedPriority(e.target.value)}
            className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-700 focus:outline-none"
          >
            <option value="ALL">All Priorities</option>
            {TASK_PRIORITIES.map(p => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>

          {/* Quick Clear filters */}
          {(selectedCategory !== 'ALL' || selectedPriority !== 'ALL' || searchQuery) && (
            <button
              onClick={() => {
                setSelectedCategory('ALL');
                setSelectedPriority('ALL');
                setSearchQuery('');
              }}
              className="text-xs text-teal-700 hover:text-teal-900 font-medium underline ml-auto"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Task List */}
      {loading ? (
        <div className="py-16 text-center">
          <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-500 font-medium">Loading ministry tasks...</p>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-xl border border-dashed border-slate-300">
          <CheckSquare className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-800">No tasks found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {activeTab === 'CANCELLED'
              ? 'There are currently no cancelled tasks in this view.'
              : 'There are no tasks matching your selected filter.'}
          </p>
          <div className="mt-4 flex items-center justify-center gap-2">
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold rounded-lg shadow-xs transition"
            >
              Create New Task
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTasks.map(task => {
            const isCancelled = task.status === 'Cancelled';
            const isCompleted = task.status === 'Completed';

            return (
              <div
                key={task.id}
                className={`bg-white p-4 rounded-xl border transition-all shadow-xs hover:shadow-md ${
                  isCancelled
                    ? 'border-rose-200 bg-rose-50/20'
                    : isCompleted
                    ? 'border-emerald-200 bg-emerald-50/15'
                    : 'border-slate-200'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {/* Task Info */}
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getPriorityBadgeClass(
                          task.priority
                        )}`}
                      >
                        {task.priority} Priority
                      </span>
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                        {task.category}
                      </span>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${getStatusBadgeClass(
                          task.status
                        )}`}
                      >
                        {task.status}
                      </span>
                    </div>

                    <h3
                      className={`text-sm font-bold text-slate-900 ${
                        isCompleted ? 'text-emerald-950' : isCancelled ? 'line-through text-slate-500' : ''
                      }`}
                    >
                      {task.title}
                    </h3>

                    {task.description && (
                      <p className="text-xs text-slate-600 leading-relaxed">{task.description}</p>
                    )}

                    {isCancelled && task.cancelledReason && (
                      <p className="text-[11px] text-rose-700 italic bg-rose-50 px-2 py-1 rounded border border-rose-100">
                        Cancellation note: {task.cancelledReason}
                      </p>
                    )}

                    {/* Metadata line */}
                    <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-500 pt-1">
                      {task.assignedToName && (
                        <span className="flex items-center space-x-1">
                          <User className="w-3 h-3 text-slate-400" />
                          <span>{task.assignedToName}</span>
                          {task.assignedToRole && (
                            <span className="text-[10px] text-slate-400">({task.assignedToRole})</span>
                          )}
                        </span>
                      )}

                      <span className="flex items-center space-x-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span>Due: {task.dueDate}</span>
                      </span>

                      {task.completedAt && (
                        <span className="flex items-center space-x-1 text-emerald-700 font-medium">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Completed by {task.completedBy || 'Staff'}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-1.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    {/* One-click complete action (especially prominent for cancelled tasks!) */}
                    {isCancelled ? (
                      <button
                        onClick={() => handleUpdateStatus(task, 'Completed')}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center space-x-1 shadow-xs transition cursor-pointer"
                        title="Complete this cancelled task"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Complete Task</span>
                      </button>
                    ) : isCompleted ? (
                      <button
                        onClick={() => handleUpdateStatus(task, 'Pending')}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium flex items-center space-x-1 transition"
                        title="Reopen task as Pending"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                        <span>Reopen</span>
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => handleUpdateStatus(task, 'Completed')}
                          className="px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-semibold flex items-center space-x-1 shadow-xs transition"
                          title="Mark task completed"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Complete</span>
                        </button>

                        <button
                          onClick={() => handleUpdateStatus(task, 'Cancelled')}
                          className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-medium transition"
                          title="Cancel this task"
                        >
                          Cancel
                        </button>
                      </>
                    )}

                    {/* Delete action */}
                    <button
                      onClick={() => handleDeleteTask(task.id, task.title)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                      title="Delete task permanently"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Task Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 text-left animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <ListTodo className="w-5 h-5 text-teal-700" />
                <span>Create Ministry Task</span>
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-4 mt-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Task Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Follow up with first-time visitors from Sunday Service"
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value as MinistryTaskCategory })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                  >
                    {TASK_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={e => setFormData({ ...formData, priority: e.target.value as MinistryTaskPriority })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                  >
                    {TASK_PRIORITIES.map(p => (
                      <option key={p} value={p}>
                        {p} Priority
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Assigned Person</label>
                  <input
                    type="text"
                    placeholder="e.g. Pastor Daniel / Deaconess Sarah"
                    value={formData.assignedToName}
                    onChange={e => setFormData({ ...formData, assignedToName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                  >
                  </input>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={formData.dueDate}
                    onChange={e => setFormData({ ...formData, dueDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description & Instructions</label>
                <textarea
                  rows={3}
                  placeholder="Provide context, required follow-up phone calls, materials, or delivery deadline..."
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white font-semibold rounded-lg shadow-xs transition"
                >
                  {saving ? 'Creating Task...' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
