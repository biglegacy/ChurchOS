import React, { useState } from 'react';
import { Lock, Mail, Eye, EyeOff, ArrowRight, AlertCircle, CheckCircle2, Building2, User, Phone, MapPin, ChevronDown, ChevronUp } from 'lucide-react';
import { ApiClient } from '../api';
import { RegisterChurchModal } from './RegisterChurchModal';

interface Props {
  onLoginSuccess: (user: any, church: any, redirectTo: string) => void;
}

export const LoginView: React.FC<Props> = ({ onLoginSuccess }) => {
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  // Login form state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Register form state
  const [regData, setRegData] = useState({
    churchName: '',
    adminName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    city: 'Accra',
    region: 'Greater Accra',
    address: '',
  });
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showMoreLocation, setShowMoreLocation] = useState(false);
  const [regLoading, setRegLoading] = useState(false);

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

    if (!username.trim() || !password.trim()) {
      setError('Please enter both username/email and password.');
      return;
    }

    try {
      setLoading(true);
      const res = await ApiClient.post('/api/auth/login', {
        username: username.trim(),
        password: password.trim(),
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

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);

    if (!regData.churchName.trim()) {
      setError('Please enter the Church Name.');
      return;
    }
    if (!regData.adminName.trim()) {
      setError('Please enter the Pastor or Administrator Full Name.');
      return;
    }
    if (!regData.email.trim()) {
      setError('Please enter an Administrator Email Address.');
      return;
    }
    if (!regData.phone.trim()) {
      setError('Please enter a Contact Phone Number.');
      return;
    }
    if (!regData.password) {
      setError('Please enter a Password.');
      return;
    }
    if (regData.password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (regData.password !== regData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      setRegLoading(true);
      const payload = {
        churchName: regData.churchName.trim(),
        adminName: regData.adminName.trim(),
        seniorPastor: regData.adminName.trim(),
        adminEmail: regData.email.trim().toLowerCase(),
        churchEmail: regData.email.trim().toLowerCase(),
        adminPhone: regData.phone.trim(),
        churchPhone: regData.phone.trim(),
        username: regData.email.trim().toLowerCase(),
        password: regData.password,
        confirmPassword: regData.confirmPassword,
        city: regData.city.trim() || 'Accra',
        region: regData.region.trim() || 'Greater Accra',
        country: 'Ghana',
        address: regData.address.trim(),
      };

      const res = await ApiClient.post('/api/auth/register-church', payload);

      if (res.token && res.user) {
        ApiClient.setAuth(res.token, res.user, res.church);
        onLoginSuccess(res.user, res.church, res.redirectTo || '/church/dashboard');
      } else {
        setNotice(res.message || 'Church registered successfully! Please sign in.');
        setAuthMode('login');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to register church. Please check your information and try again.');
    } finally {
      setRegLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return;
    try {
      setForgotLoading(true);
      const res = await ApiClient.post('/api/auth/forgot-password', { email: forgotEmail });
      setForgotSuccess(res.message || 'Password reset link sent to your email.');
    } catch (err: any) {
      setError(err.message || 'Failed to send reset link.');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 flex flex-col justify-between py-8 px-4 sm:px-6">
      <div className="w-full max-w-md mx-auto my-auto">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-teal-700 text-white font-bold text-xl shadow-xs mb-3">
            C
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-teal-950">Church-OS</h1>
          <p className="text-xs font-medium text-slate-500 mt-1">
            Multi-Tenant Church Management Cloud
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 sm:p-7">
          {/* Mode Switcher Tabs */}
          <div className="flex border-b border-slate-200 mb-5">
            <button
              type="button"
              id="tab-sign-in"
              onClick={() => {
                setAuthMode('login');
                setError(null);
              }}
              className={`flex-1 pb-3 text-sm font-semibold border-b-2 text-center transition-colors cursor-pointer ${
                authMode === 'login'
                  ? 'border-teal-700 text-teal-900 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              id="tab-register-church"
              onClick={() => {
                setAuthMode('register');
                setError(null);
              }}
              className={`flex-1 pb-3 text-sm font-semibold border-b-2 text-center transition-colors flex items-center justify-center space-x-1.5 cursor-pointer ${
                authMode === 'register'
                  ? 'border-teal-700 text-teal-900 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>Register Church</span>
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start space-x-2 text-rose-800 text-xs leading-relaxed">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {notice && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-start space-x-2 text-emerald-800 text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{notice}</span>
            </div>
          )}

          {authMode === 'login' ? (
            /* SIGN IN FORM */
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
                    placeholder="e.g. pastor@yourchurch.org"
                    className="w-full pl-10 pr-3.5 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-700 transition-colors"
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
                    className="w-full pl-10 pr-10 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-700 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
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
                    className="rounded text-teal-700 focus:ring-teal-600 h-4 w-4 border-slate-300"
                  />
                  <span>Remember Me</span>
                </label>
              </div>

              <button
                type="submit"
                id="btn-sign-in"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-teal-700 hover:bg-teal-800 active:bg-teal-900 text-white font-semibold text-sm rounded-md transition-colors flex items-center justify-center space-x-2 shadow-xs disabled:opacity-50 cursor-pointer"
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
          ) : (
            /* REGISTER CHURCH FORM */
            <form onSubmit={handleRegister} noValidate className="space-y-3.5">
              <div className="bg-teal-50/70 border border-teal-100 rounded-lg p-3 text-xs text-teal-900">
                <p className="font-semibold text-teal-950">New Church Onboarding</p>
                <p className="text-[11px] text-teal-800 mt-0.5">
                  Register your assembly to unlock the dedicated church administration portal.
                </p>
              </div>

              {/* Church Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Church Name *
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={regData.churchName}
                    onChange={e => setRegData({ ...regData, churchName: e.target.value })}
                    placeholder="e.g. Grace Baptist Assembly"
                    className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-700 transition-colors"
                  />
                </div>
              </div>

              {/* Administrator / Senior Pastor Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Pastor / Administrator Full Name *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={regData.adminName}
                    onChange={e => setRegData({ ...regData, adminName: e.target.value })}
                    placeholder="e.g. Pastor Samuel Mensah"
                    className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-700 transition-colors"
                  />
                </div>
              </div>

              {/* Email & Phone Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Admin Email (Login ID) *
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="email"
                      value={regData.email}
                      onChange={e => setRegData({ ...regData, email: e.target.value })}
                      placeholder="admin@church.org"
                      className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-700 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Contact Phone *
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={regData.phone}
                      onChange={e => setRegData({ ...regData, phone: e.target.value })}
                      placeholder="024XXXXXXX"
                      className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-700 transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Passwords */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Password *
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type={showRegPassword ? 'text' : 'password'}
                      value={regData.password}
                      onChange={e => setRegData({ ...regData, password: e.target.value })}
                      placeholder="Min. 6 chars"
                      className="w-full pl-9 pr-8 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-700 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegPassword(!showRegPassword)}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showRegPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Confirm Password *
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type={showRegPassword ? 'text' : 'password'}
                      value={regData.confirmPassword}
                      onChange={e => setRegData({ ...regData, confirmPassword: e.target.value })}
                      placeholder="Repeat password"
                      className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-700 transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Collapsible Location / Address */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowMoreLocation(!showMoreLocation)}
                  className="inline-flex items-center space-x-1 text-xs text-teal-700 hover:text-teal-800 font-medium cursor-pointer"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{showMoreLocation ? 'Hide Location Details' : 'Add Church Location / City (Optional)'}</span>
                  {showMoreLocation ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>

                {showMoreLocation && (
                  <div className="mt-2.5 p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2.5">
                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">City</label>
                        <input
                          type="text"
                          value={regData.city}
                          onChange={e => setRegData({ ...regData, city: e.target.value })}
                          placeholder="Accra"
                          className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-md focus:ring-1 focus:ring-teal-600 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Region</label>
                        <input
                          type="text"
                          value={regData.region}
                          onChange={e => setRegData({ ...regData, region: e.target.value })}
                          placeholder="Greater Accra"
                          className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-md focus:ring-1 focus:ring-teal-600 focus:outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Address / Landmark</label>
                      <input
                        type="text"
                        value={regData.address}
                        onChange={e => setRegData({ ...regData, address: e.target.value })}
                        placeholder="e.g. Near Total Filling Station, High Street"
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-md focus:ring-1 focus:ring-teal-600 focus:outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Submit Register Button */}
              <button
                type="submit"
                id="btn-register-church"
                disabled={regLoading}
                className="w-full mt-2 py-2.5 px-4 bg-teal-700 hover:bg-teal-800 active:bg-teal-900 text-white font-semibold text-sm rounded-md transition-colors flex items-center justify-center space-x-2 shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {regLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Creating Church Account...</span>
                  </>
                ) : (
                  <>
                    <span>Register Church</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Footer Toggle */}
        <div className="text-center mt-5">
          {authMode === 'login' ? (
            <p className="text-xs text-slate-600">
              Pastoring or managing a new church?{' '}
              <button
                type="button"
                id="btn-switch-register"
                onClick={() => {
                  setAuthMode('register');
                  setError(null);
                }}
                className="font-semibold text-teal-700 hover:text-teal-800 hover:underline cursor-pointer"
              >
                Register Church
              </button>
            </p>
          ) : (
            <p className="text-xs text-slate-600">
              Already have a registered church account?{' '}
              <button
                type="button"
                id="btn-switch-login"
                onClick={() => {
                  setAuthMode('login');
                  setError(null);
                }}
                className="font-semibold text-teal-700 hover:text-teal-800 hover:underline cursor-pointer"
              >
                Sign In
              </button>
            </p>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="text-center mt-4">
        <p className="text-[11px] text-slate-400 font-medium">
          Church-OS • Multi-Tenant Church Management
        </p>
      </div>

      {/* Register Church Modal (also available as modal if needed) */}
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
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-sm w-full p-6 text-left space-y-4">
            <h3 className="text-base font-bold text-slate-900">Reset Password</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Enter your registered email address to receive password reset instructions.
            </p>
            {forgotSuccess ? (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800">
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
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-600/20 focus:border-teal-700 focus:outline-none"
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
                    className="px-4 py-2 text-xs font-semibold bg-teal-700 text-white rounded-lg hover:bg-teal-800 disabled:opacity-50 cursor-pointer"
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
