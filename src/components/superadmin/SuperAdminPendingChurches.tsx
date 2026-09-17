import React, { useState } from 'react';
import {
  Clock,
  CheckCircle,
  XCircle,
  Building2,
  Mail,
  Phone,
  MapPin,
  User,
  Search,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { Church } from '../../types';

interface Props {
  churches: Church[];
  onApproveChurch: (id: string) => void;
  onRejectChurch: (id: string) => void;
  onRefresh: () => void;
}

export const SuperAdminPendingChurches: React.FC<Props> = ({
  churches,
  onApproveChurch,
  onRejectChurch,
  onRefresh,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const pending = churches.filter(c => c.status === 'PENDING');
  const filtered = pending.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.adminEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.seniorPastor.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-5 text-left">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-teal-950 flex items-center space-x-2">
            <Clock className="w-5 h-5 text-amber-600" />
            <span>Pending Church Approvals ({pending.length})</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Review and approve registered churches before granting access to platform modules.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Filter pending..."
              className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-700"
            />
          </div>
          <button
            onClick={onRefresh}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {pending.length === 0 ? (
        <div className="p-12 bg-white rounded-xl border border-slate-200 text-center text-slate-500">
          <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-80" />
          <h3 className="font-bold text-sm text-slate-800">All Registrations Approved</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            There are currently no church tenant onboarding applications pending Super Admin review.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(c => (
            <div
              key={c.id}
              className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-4 hover:border-amber-300 transition"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{c.name}</h3>
                    <p className="text-xs text-slate-500 flex items-center space-x-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                      <span>{c.address ? `${c.address}, ` : ''}{c.city}, {c.region}, {c.country}</span>
                    </p>
                  </div>
                  <span className="px-2 py-0.5 bg-amber-50 border border-amber-200 text-amber-800 rounded text-[10px] font-bold shrink-0">
                    PENDING REVIEW
                  </span>
                </div>

                <div className="mt-3.5 pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                  <div className="flex items-center space-x-2">
                    <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>Senior Pastor: <strong className="text-slate-800 font-semibold">{c.seniorPastor}</strong></span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>Admin: <strong className="text-slate-800">{c.adminName}</strong> ({c.adminEmail})</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>Phone: {c.adminPhone}</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  onClick={() => onRejectChurch(c.id)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-600 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Reject</span>
                </button>
                <button
                  onClick={() => onApproveChurch(c.id)}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 shadow-xs transition"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Approve Tenant</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
