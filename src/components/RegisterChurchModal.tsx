import React, { useState } from 'react';
import { X, Building2, User, Phone, Mail, Lock, CheckCircle2, AlertCircle } from 'lucide-react';
import { ApiClient } from '../api';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onRegisteredSuccess?: (msg: string, authData?: any) => void;
}

export const RegisterChurchModal: React.FC<Props> = ({ isOpen, onClose, onRegisteredSuccess }) => {
  const [formData, setFormData] = useState({
    churchName: '',
    churchEmail: '',
    churchPhone: '',
    address: '',
    city: 'Accra',
    region: 'Greater Accra',
    country: 'Ghana',
    seniorPastor: '',
    adminName: '',
    adminEmail: '',
    adminPhone: '',
    username: '',
    password: '',
    confirmPassword: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<string | null>(null);
  const [registeredAuthData, setRegisteredAuthData] = useState<any>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.churchName.trim()) {
      setError('Please enter the Church Name.');
      return;
    }
    if (!formData.adminName.trim()) {
      setError('Please enter the Pastor or Administrator Full Name.');
      return;
    }
    if (!formData.adminEmail.trim() && !formData.churchEmail.trim()) {
      setError('Please enter an Email address for your church account.');
      return;
    }
    if (!formData.churchPhone.trim() && !formData.adminPhone.trim()) {
      setError('Please enter a Contact Phone Number.');
      return;
    }
    if (!formData.password) {
      setError('Please choose a password.');
      return;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (formData.confirmPassword && formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    const payload = {
      ...formData,
      churchEmail: (formData.churchEmail || formData.adminEmail).trim(),
      adminEmail: (formData.adminEmail || formData.churchEmail).trim(),
      churchPhone: (formData.churchPhone || formData.adminPhone).trim(),
      adminPhone: (formData.adminPhone || formData.churchPhone).trim(),
      seniorPastor: (formData.seniorPastor || formData.adminName).trim(),
      username: (formData.username || formData.adminEmail || formData.churchEmail).trim(),
    };

    try {
      setLoading(true);
      const res = await ApiClient.post('/api/auth/register-church', payload);
      setSuccessResult(res.message || `Church "${payload.churchName}" registered successfully!`);
      setRegisteredAuthData(res);

      // Trigger success callback after brief notice if provided
      if (onRegisteredSuccess && res.token) {
        setTimeout(() => {
          onRegisteredSuccess(res.message, res);
          onClose();
        }, 1200);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to submit church registration.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden my-6">
        {/* Header */}
        <div className="bg-teal-800 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-teal-700/80 flex items-center justify-center text-white">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight">Register New Church</h2>
              <p className="text-xs text-teal-100">Multi-tenant Church-OS onboarding</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-teal-200 hover:bg-white/10 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[80vh] overflow-y-auto">
          {successResult ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Church Registered Successfully!</h3>
              <p className="text-sm text-slate-600 leading-relaxed px-4">
                {successResult}
              </p>
              <div className="p-4 bg-teal-50 rounded-lg border border-teal-200 text-left text-xs text-teal-900 space-y-1">
                <p className="font-semibold text-teal-950">Your Account is Active:</p>
                <p>
                  Your church workspace and church administrator account have been initialized. You can now access your church dashboard to manage your church.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    if (onRegisteredSuccess) {
                      onRegisteredSuccess(successResult, registeredAuthData);
                    }
                    onClose();
                  }}
                  className="w-full py-2.5 bg-teal-700 hover:bg-teal-800 text-white font-medium rounded-md text-sm transition-colors shadow-xs"
                >
                  Enter Church Dashboard Now
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="space-y-5 text-left">
              {error && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg flex items-start space-x-2 text-rose-800 text-xs">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Church Info Section */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                  Church Information
                </h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Church Name *
                    </label>
                    <div className="relative">
                      <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="text"
                        required
                        value={formData.churchName}
                        onChange={e => setFormData({ ...formData, churchName: e.target.value })}
                        placeholder="e.g. Calvary Baptist Assembly"
                        className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-600/20 focus:border-teal-700 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Church Email *
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                        <input
                          type="email"
                          required
                          value={formData.churchEmail}
                          onChange={e => setFormData({ ...formData, churchEmail: e.target.value })}
                          placeholder="info@calvary.org"
                          className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-600/20 focus:border-teal-700 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Church Phone *
                      </label>
                      <div className="relative">
                        <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                        <input
                          type="text"
                          required
                          value={formData.churchPhone}
                          onChange={e => setFormData({ ...formData, churchPhone: e.target.value })}
                          placeholder="024XXXXXXX"
                          className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-600/20 focus:border-teal-700 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Senior Pastor / Head Pastor
                    </label>
                    <input
                      type="text"
                      value={formData.seniorPastor}
                      onChange={e => setFormData({ ...formData, seniorPastor: e.target.value })}
                      placeholder="e.g. Rev. Kwabena Asante"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-600/20 focus:border-teal-700 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Church Physical Address
                    </label>
                    <input
                      type="text"
                      value={formData.address}
                      onChange={e => setFormData({ ...formData, address: e.target.value })}
                      placeholder="e.g. Near Total Filling Station, High Street"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-600/20 focus:border-teal-700 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">City *</label>
                      <input
                        type="text"
                        required
                        value={formData.city}
                        onChange={e => setFormData({ ...formData, city: e.target.value })}
                        placeholder="Accra"
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-600/20 focus:border-teal-700 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Region *</label>
                      <input
                        type="text"
                        required
                        value={formData.region}
                        onChange={e => setFormData({ ...formData, region: e.target.value })}
                        placeholder="Greater Accra"
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-600/20 focus:border-teal-700 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Country</label>
                      <input
                        type="text"
                        disabled
                        value={formData.country}
                        className="w-full px-3 py-2 text-sm bg-slate-100 border border-slate-300 rounded-lg text-slate-600"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Administrator Details */}
              <div className="pt-2 border-t border-slate-200">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                  Church Administrator Account
                </h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Administrator Full Name *
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="text"
                        required
                        value={formData.adminName}
                        onChange={e => setFormData({ ...formData, adminName: e.target.value })}
                        placeholder="Pastor Samuel Owusu"
                        className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-600/20 focus:border-teal-700 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Admin Email (Login ID) *
                      </label>
                      <input
                        type="email"
                        required
                        value={formData.adminEmail}
                        onChange={e => setFormData({
                          ...formData,
                          adminEmail: e.target.value,
                          username: formData.username || e.target.value,
                        })}
                        placeholder="admin@calvary.org"
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-600/20 focus:border-teal-700 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Admin Phone *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.adminPhone}
                        onChange={e => setFormData({ ...formData, adminPhone: e.target.value })}
                        placeholder="054XXXXXXX"
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-600/20 focus:border-teal-700 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Username *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.username}
                      onChange={e => setFormData({ ...formData, username: e.target.value })}
                      placeholder="Username for login"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-600/20 focus:border-teal-700 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Password *
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                        <input
                          type="password"
                          required
                          value={formData.password}
                          onChange={e => setFormData({ ...formData, password: e.target.value })}
                          placeholder="••••••••"
                          className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-600/20 focus:border-teal-700 focus:outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Confirm Password *
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                        <input
                          type="password"
                          required
                          value={formData.confirmPassword}
                          onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
                          placeholder="••••••••"
                          className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-600/20 focus:border-teal-700 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="btn-register-church-modal"
                  disabled={loading}
                  className="px-5 py-2.5 bg-teal-700 hover:bg-teal-800 text-white text-sm font-semibold rounded-md shadow-xs transition-colors flex items-center space-x-2 disabled:opacity-50 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Creating Church Account...</span>
                    </>
                  ) : (
                    <span>Register Church</span>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
