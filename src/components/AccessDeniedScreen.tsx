import React from 'react';
import { ShieldAlert, ArrowLeft, LogOut } from 'lucide-react';
import { User } from '../types';

interface Props {
  moduleName: string;
  requiredPermission?: string;
  user: User | null;
  fallbackTab?: string;
  fallbackTabLabel?: string;
  onNavigate?: (tab: string) => void;
  onLogout?: () => void;
}

export const AccessDeniedScreen: React.FC<Props> = ({
  moduleName,
  requiredPermission,
  user,
  fallbackTab,
  fallbackTabLabel,
  onNavigate,
  onLogout,
}) => {
  const assignedRoles = user?.roles && user.roles.length > 0
    ? user.roles
    : (user?.role ? [user.role] : []);

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4 text-left">
      <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-5 text-center">
        <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
          <ShieldAlert className="w-7 h-7" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Access Restricted</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            You do not have permission to access <strong className="text-slate-700">{moduleName}</strong>. Permissions are strictly enforced based on your assigned staff roles.
          </p>
        </div>

        {assignedRoles.length > 0 && (
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-left space-y-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Your Assigned Role(s)</span>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {assignedRoles.map((r, i) => (
                <span key={i} className="px-2 py-0.5 bg-white border border-slate-200 rounded text-xs font-semibold text-slate-700">
                  {r}
                </span>
              ))}
            </div>
            {requiredPermission && (
              <span className="text-[10px] text-slate-400 block pt-1">
                Required permission: <code className="bg-slate-200 px-1 py-0.5 rounded text-[10px] text-slate-700">{requiredPermission}</code>
              </span>
            )}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2 pt-2 justify-center">
          {fallbackTab && onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate(fallbackTab)}
              className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold rounded-xl transition flex items-center justify-center space-x-1.5 shadow-xs cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Go to {fallbackTabLabel || 'Available Module'}</span>
            </button>
          )}

          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition flex items-center justify-center space-x-1.5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log Out</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
