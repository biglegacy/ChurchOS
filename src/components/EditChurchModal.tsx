import React, { useState } from 'react';
import {
  X,
  Building2,
  Mail,
  Phone,
  MapPin,
  User,
  Shield,
  CreditCard,
  Radio,
  CheckCircle,
  AlertTriangle,
  Save,
} from 'lucide-react';
import { Church } from '../types';
import { ApiClient } from '../api';

interface Props {
  church: Church;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedChurch: Church, message: string) => void;
}

export const EditChurchModal: React.FC<Props> = ({
  church,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states initialized with live Firebase church record
  const [name, setName] = useState(church.name || '');
  const [email, setEmail] = useState(church.email || '');
  const [phone, setPhone] = useState(church.phone || '');
  const [address, setAddress] = useState(church.address || '');
  const [city, setCity] = useState(church.city || '');
  const [region, setRegion] = useState(church.region || '');
  const [country, setCountry] = useState(church.country || 'Ghana');
  const [seniorPastor, setSeniorPastor] = useState(church.seniorPastor || '');

  // Admin / Owner
  const [adminName, setAdminName] = useState(church.adminName || '');
  const [adminEmail, setAdminEmail] = useState(church.adminEmail || '');
  const [adminPhone, setAdminPhone] = useState(church.adminPhone || '');

  // Status & Subscription
  const [status, setStatus] = useState<Church['status']>(church.status || 'ACTIVE');
  const [plan, setPlan] = useState(church.subscription?.plan || 'Growth Sanctuary');
  const [subStatus, setSubStatus] = useState<'ACTIVE' | 'EXPIRING' | 'EXPIRED'>(
    church.subscription?.status || 'ACTIVE'
  );
  const [expiresAt, setExpiresAt] = useState(
    church.subscription?.expiresAt ? church.subscription.expiresAt.slice(0, 10) : ''
  );
  const [priceGHS, setPriceGHS] = useState(
    church.subscription?.priceGHS !== undefined ? String(church.subscription.priceGHS) : '250'
  );

  // Settings & SMS
  const [senderName, setSenderName] = useState(church.settings?.senderName || '');
  const [currency, setCurrency] = useState(church.settings?.currency || 'GH₵');

  // Features
  const [features, setFeatures] = useState({
    sms: church.features?.sms ?? true,
    finance: church.features?.finance ?? true,
    events: church.features?.events ?? true,
    groups: church.features?.groups ?? true,
    pastoral: church.features?.pastoral ?? true,
    discipleship: church.features?.discipleship ?? true,
    assets: church.features?.assets ?? true,
    children: church.features?.children ?? true,
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Church name is required.');
      return;
    }
    if (!email.trim()) {
      setError('Church contact email is required.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const payload = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        address: address.trim(),
        city: city.trim(),
        region: region.trim(),
        country: country.trim(),
        seniorPastor: seniorPastor.trim(),
        adminName: adminName.trim(),
        adminEmail: adminEmail.trim().toLowerCase(),
        adminPhone: adminPhone.trim(),
        status,
        subscription: {
          plan,
          status: subStatus,
          expiresAt: expiresAt ? new Date(expiresAt).toISOString() : church.subscription?.expiresAt,
          priceGHS: parseFloat(priceGHS) || 0,
        },
        settings: {
          ...church.settings,
          senderName: senderName.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11),
          currency,
        },
        features,
      };

      const res = await ApiClient.put(`/api/super-admin/churches/${church.id}`, payload);
      onSuccess(res.church, res.message || `Church "${name}" updated successfully in Firebase.`);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update church in Firebase.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6 text-left animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-700 text-white flex items-center justify-center shadow-xs">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Edit Church Details</h3>
              <p className="text-xs text-slate-500">Live Firebase Record • ID: {church.id}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center space-x-2 text-rose-700 text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Section 1: General Church Identity */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center space-x-1.5">
              <Building2 className="w-3.5 h-3.5 text-teal-700" />
              <span>Church Identity & Pastor</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Church Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-600 focus:border-teal-600 bg-white"
                  placeholder="e.g. Grace Temple International"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Senior Pastor / Head Minister</label>
                <input
                  type="text"
                  value={seniorPastor}
                  onChange={(e) => setSeniorPastor(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-600 focus:border-teal-600 bg-white"
                  placeholder="e.g. Rev. Dr. Kofi Mensah"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Official Email *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-600 focus:border-teal-600 bg-white"
                  placeholder="contact@church.org"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Church Phone</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-600 focus:border-teal-600 bg-white"
                  placeholder="+233..."
                />
              </div>
            </div>
          </div>

          {/* Section 2: Physical Location */}
          <div className="pt-2 border-t border-slate-100">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center space-x-1.5">
              <MapPin className="w-3.5 h-3.5 text-teal-700" />
              <span>Location & Address</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div className="sm:col-span-3">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Street Address</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-600 focus:border-teal-600 bg-white"
                  placeholder="Street / Landmark / GPS Digital Address"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">City</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-600 focus:border-teal-600 bg-white"
                  placeholder="Accra / Kumasi"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Region / State</label>
                <input
                  type="text"
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-600 focus:border-teal-600 bg-white"
                  placeholder="Greater Accra / Ashanti"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Country</label>
                <input
                  type="text"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-600 focus:border-teal-600 bg-white"
                  placeholder="Ghana"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Primary Administrator Details */}
          <div className="pt-2 border-t border-slate-100">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center space-x-1.5">
              <User className="w-3.5 h-3.5 text-teal-700" />
              <span>Church Administrator / Owner Account</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Admin Full Name</label>
                <input
                  type="text"
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-600 focus:border-teal-600 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Admin Login Email</label>
                <input
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-600 focus:border-teal-600 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Admin Phone</label>
                <input
                  type="text"
                  value={adminPhone}
                  onChange={(e) => setAdminPhone(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-600 focus:border-teal-600 bg-white"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Status & Subscription */}
          <div className="pt-2 border-t border-slate-100">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center space-x-1.5">
              <CreditCard className="w-3.5 h-3.5 text-teal-700" />
              <span>Status & Subscription Plan</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Church Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-600 focus:border-teal-600 bg-white"
                >
                  <option value="ACTIVE">ACTIVE (Operational)</option>
                  <option value="PENDING">PENDING (Review)</option>
                  <option value="SUSPENDED">SUSPENDED (Locked)</option>
                  <option value="REJECTED">REJECTED</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Subscription Plan</label>
                <select
                  value={plan}
                  onChange={(e) => setPlan(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-600 focus:border-teal-600 bg-white"
                >
                  <option value="Starter Church">Starter Church</option>
                  <option value="Growth Sanctuary">Growth Sanctuary</option>
                  <option value="Kingdom Cathedral">Kingdom Cathedral</option>
                  <option value="Global Megachurch">Global Megachurch</option>
                  <option value="Trial SaaS Plan">Trial SaaS Plan</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Sub Status</label>
                <select
                  value={subStatus}
                  onChange={(e) => setSubStatus(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-600 focus:border-teal-600 bg-white"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="EXPIRING">EXPIRING</option>
                  <option value="EXPIRED">EXPIRED</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Expiry Date</label>
                <input
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-600 focus:border-teal-600 bg-white"
                />
              </div>
            </div>
          </div>

          {/* Section 5: SMS Sender ID & Communications */}
          <div className="pt-2 border-t border-slate-100">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center space-x-1.5">
              <Radio className="w-3.5 h-3.5 text-teal-700" />
              <span>SMS Configuration & Custom Sender Name</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Custom SMS Sender Name (Max 11 chars)
                </label>
                <input
                  type="text"
                  maxLength={11}
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11))}
                  className="w-full px-3 py-2 text-xs font-mono font-bold tracking-wider border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-600 focus:border-teal-600 bg-white uppercase"
                  placeholder={name ? name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 11).toUpperCase() : 'AUTO'}
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Leave blank to automatically use the registered church name ({name ? name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 11).toUpperCase() : 'AUTO'}).
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Currency Symbol</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-600 focus:border-teal-600 bg-white"
                >
                  <option value="GH₵">GH₵ (Ghana Cedi)</option>
                  <option value="$">$ (USD)</option>
                  <option value="£">£ (GBP)</option>
                  <option value="€">€ (EUR)</option>
                  <option value="₦">₦ (Naira)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 6: Feature Modules Toggles */}
          <div className="pt-2 border-t border-slate-100">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center space-x-1.5">
              <Shield className="w-3.5 h-3.5 text-teal-700" />
              <span>Feature Module Permissions</span>
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {Object.entries(features).map(([key, enabled]) => (
                <label
                  key={key}
                  className={`flex items-center space-x-2 p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                    enabled
                      ? 'bg-teal-50/70 border-teal-300 text-teal-900 font-semibold'
                      : 'bg-slate-50 border-slate-200 text-slate-400'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={(e) => setFeatures({ ...features, [key]: e.target.checked })}
                    className="w-3.5 h-3.5 text-teal-700 rounded border-slate-300 focus:ring-teal-500"
                  />
                  <span className="capitalize">{key}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-lg shadow-sm transition-colors flex items-center space-x-2 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{loading ? 'Saving to Firebase...' : 'Save Changes to Firebase'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
