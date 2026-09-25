import React, { useState, useEffect } from 'react';
import {
  Shield,
  Search,
  RefreshCw,
  Clock,
  User,
  Building2,
  Filter,
} from 'lucide-react';
import { ApiClient } from '../../api';
import { AuditLog } from '../../types';

export const SuperAdminAuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);

  const loadLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await ApiClient.get('/api/super-admin/audit-logs');
      setLogs(Array.isArray(res) ? res : []);
    } catch (err: any) {
      setError(err.message || 'Failed to load platform audit logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const filteredLogs = (logs || []).filter(l => {
    const q = (searchTerm || '').toLowerCase();
    return (
      (l.action || '').toLowerCase().includes(q) ||
      (l.details || '').toLowerCase().includes(q) ||
      (l.userName || '').toLowerCase().includes(q) ||
      (l.churchId && l.churchId.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-5 text-left">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-teal-950 flex items-center space-x-2">
            <Shield className="w-5 h-5 text-teal-700" />
            <span>Platform Security & Audit Trail ({logs.length})</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Immutable tracking of super administrator actions, tenant approvals, and permission adjustments.
          </p>
        </div>

        <button
          onClick={loadLogs}
          className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs transition self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="font-bold text-rose-700 hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-xs flex items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search action, actor, tenant, details..."
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-700"
          />
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto max-h-[500px]">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-2.5 px-4">Timestamp</th>
                <th className="py-2.5 px-4">Action</th>
                <th className="py-2.5 px-4">Actor</th>
                <th className="py-2.5 px-4">Tenant Scope</th>
                <th className="py-2.5 px-4">Event Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(filteredLogs || []).map(l => (
                <tr key={l.id} className="hover:bg-slate-50/60 transition">
                  <td className="py-2.5 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                    {new Date(l.timestamp).toLocaleString()}
                  </td>
                  <td className="py-2.5 px-4">
                    <span className="font-bold text-slate-800">{l.action}</span>
                  </td>
                  <td className="py-2.5 px-4 text-slate-700 font-medium">
                    {l.userName}
                  </td>
                  <td className="py-2.5 px-4 text-slate-500 font-mono text-[11px]">
                    {l.churchId || 'GLOBAL'}
                  </td>
                  <td className="py-2.5 px-4 text-slate-600 max-w-md break-words">
                    {l.details}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
