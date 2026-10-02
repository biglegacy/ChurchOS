import React, { useState } from 'react';
import { Lock, Mail, Eye, EyeOff, ArrowRight, AlertCircle, CheckCircle2, Building2 } from 'lucide-react';
import { ApiClient } from '../api';
import { RegisterChurchModal } from './RegisterChurchModal';
import { useAutoDismissNotification } from '../utils/useAutoDismissNotification';

interface Props {
  onLoginSuccess: (user: any, church: any, redirectTo: string) => void;
}

export const LoginView: React.FC<Props> = ({ onLoginSuccess }) => {
  // Login form state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  useAutoDismissNotification(error, setError, 3000);
  useAutoDismissNotification(notice, setNotice, 3000);

  // Modals
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState<string | null>(null);

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setNotice(null);

    const trimmedUser = username.trim();
    const trimmedPass = password.trim();

    if (!trimmedUser || !trimmedPass) {
      setError('Please enter both username/email and password.');
      return;
    }

    try {
      setLoading(true);
      const res = await ApiClient.post('/api/auth/login', {
        username: trimmedUser,
        password: trimmedPass,
      });

      ApiClient.setAuth(res.token, res.user, res.church);
      onLoginSuccess(res.user, res.church, res.redirectTo || '/church/dashboard');
    } catch (err: any) {
      if (err.code === 'CHURCH_PENDING') {
        setError(err.message || 'Your church account is currently pending approval by the Super Administrator.');
      } else if (err.code === 'CHURCH_SUSPENDED') {
        setError('This church account has been suspended by the platform administrator.');
      } else {
        setError(err.message || 'Invalid username/email or password.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) return;

    try {
      setForgotLoading(true);
      const res = await ApiClient.post('/api/auth/forgot-password', { email: forgotEmail.trim() });
      setForgotSuccess(res.message || 'If an account matches that email, reset instructions have been dispatched.');
    } catch (err: any) {
      setForgotSuccess(err.message || 'Password reset request submitted.');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Header / Brand */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-teal-800 text-white flex items-center justify-center mx-auto mb-3 shadow-md">
            <Building2 className="w-6 h-6 text-teal-100" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-teal-950">ChurchOS</h1>
          <p className="text-xs font-medium text-slate-500 mt-1">
            Cloud Church Management & Administration Platform
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 text-left">
          <div className="mb-5 pb-3 border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-900">Sign in to your account</h2>
            <p className="text-xs text-slate-500 mt-0.5">Enter your credentials to access the church administration portal</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start space-x-2 text-rose-800 text-xs leading-relaxed animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {notice && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start space-x-2 text-emerald-800 text-xs animate-in fade-in duration-150">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{notice}</span>
            </div>
          )}

          {/* SIGN IN FORM */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Username or Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  autoComplete="username"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="e.g. pastor@yourchurch.org or username"
                  className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-700 transition-colors"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(true)}
                  className="text-xs font-medium text-teal-700 hover:text-teal-800 hover:underline cursor-pointer"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full pl-10 pr-10 py-2.5 text-sm bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-700 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center space-x-2 text-xs text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                  className="rounded text-teal-700 focus:ring-teal-600 h-4 w-4 border-slate-300 cursor-pointer"
                />
                <span>Remember Me</span>
              </label>
            </div>

            <button
              type="submit"
              id="btn-sign-in"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-teal-800 hover:bg-teal-900 active:bg-teal-950 text-white font-semibold text-sm rounded-xl transition-colors flex items-center justify-center space-x-2 shadow-xs disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Register Church Callout Link - Requirement 2 */}
          <div className="mt-6 pt-5 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-600">
              Don&apos;t have a church account?{' '}
              <button
                type="button"
                id="btn-open-register-church"
                onClick={() => {
                  setError(null);
                  setShowRegisterModal(true);
                }}
                className="font-bold text-teal-700 hover:text-teal-900 hover:underline cursor-pointer"
              >
                Register your church
              </button>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-5">
          <p className="text-[11px] text-slate-400 font-medium">
            ChurchOS • Multi-Tenant Church Management Engine
          </p>
        </div>
      </div>

      {/* Register Church Modal */}
      <RegisterChurchModal
        isOpen={showRegisterModal}
        onClose={() => setShowRegisterModal(false)}
        onRegisteredSuccess={(msg, authData) => {
          if (authData && authData.token) {
            ApiClient.setAuth(authData.token, authData.user, authData.church);
            onLoginSuccess(authData.user, authData.church, authData.redirectTo || '/church/dashboard');
          } else {
            setNotice(msg);
          }
        }}
      />

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-sm w-full p-6 text-left space-y-4">
            <h3 className="text-base font-bold text-slate-900">Reset Password</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Enter your registered email address to receive password reset instructions.
            </p>
            {forgotSuccess ? (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800">
                {forgotSuccess}
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-3">
                <input
                  type="email"
                  required
                  value={forgotEmail}
                  onChange={e => setForgotEmail(e.target.value)}
                  placeholder="admin@church.org"
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-600/20 focus:border-teal-700 focus:outline-none"
                />
                <div className="flex justify-end space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForgotModal(false);
                      setForgotSuccess(null);
                    }}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 cursor-pointer"
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="px-4 py-2 text-xs font-semibold bg-teal-800 text-white rounded-xl hover:bg-teal-900 disabled:opacity-50 cursor-pointer"
                  >
                    {forgotLoading ? 'Sending...' : 'Send Reset Link'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
