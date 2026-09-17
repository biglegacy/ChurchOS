import React, { useState } from 'react';
import { Trash2, AlertTriangle, X, ShieldAlert } from 'lucide-react';
import { Church } from '../types';
import { ApiClient } from '../api';

interface Props {
  church: Church;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (deletedChurchId: string, message: string) => void;
}

export const DeleteChurchModal: React.FC<Props> = ({
  church,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmInput, setConfirmInput] = useState('');

  if (!isOpen) return null;

  const isConfirmed = confirmInput.trim().toLowerCase() === church.name.trim().toLowerCase();

  const handleDelete = async () => {
    if (!isConfirmed) return;

    try {
      setLoading(true);
      setError(null);
      const res = await ApiClient.delete(`/api/super-admin/churches/${church.id}`);
      onSuccess(
        church.id,
        res.message || `Church "${church.name}" permanently deleted from Firebase.`
      );
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to delete church from Firebase.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-rose-200 overflow-hidden text-left animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-rose-100 bg-rose-50/80 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-xs">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-rose-950">Permanently Delete Church</h3>
              <p className="text-xs text-rose-700">Firebase Firestore Permanent Purge</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-rose-100/60 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 text-xs flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">This action is permanent and irreversible.</p>
              <p className="mt-1 text-rose-800 leading-relaxed">
                Deleting <strong>{church.name}</strong> will permanently erase the church record from Firebase, along with all associated administrator accounts, members, attendance rosters, giving transactions, and SMS dispatch history.
              </p>
            </div>
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
            <div className="flex justify-between text-slate-600">
              <span className="font-semibold">Church ID:</span>
              <span className="font-mono text-slate-800">{church.id}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span className="font-semibold">Senior Pastor:</span>
              <span className="text-slate-800">{church.seniorPastor || 'None'}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span className="font-semibold">Registered Admin:</span>
              <span className="text-slate-800">{church.adminEmail}</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              To confirm, type the church name <span className="font-bold text-rose-700 select-all">"{church.name}"</span> below:
            </label>
            <input
              type="text"
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
              placeholder={church.name}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-600 focus:border-rose-600 bg-white"
            />
          </div>

          {error && (
            <div className="p-3 bg-rose-100 border border-rose-300 rounded-lg text-rose-800 text-xs">
              {error}
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={!isConfirmed || loading}
              className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs transition-colors flex items-center space-x-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Trash2 className="w-4 h-4" />
              <span>{loading ? 'Deleting from Firebase...' : 'Permanently Delete Church'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
