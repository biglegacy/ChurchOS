import React, { useState, useEffect } from 'react';
import {
  Coins,
  RefreshCw,
  Plus,
  CheckCircle,
  AlertTriangle,
  Server,
  Radio,
  ArrowUpRight,
  ShieldCheck,
} from 'lucide-react';
import { ApiClient } from '../../api';

export const SuperAdminSmsBalance: React.FC = () => {
  const [balanceInfo, setBalanceInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [topUpAmount, setTopUpAmount] = useState('1000');
  const [topUpLoading, setTopUpLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadBalance = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await ApiClient.get('/api/super-admin/sms/balance');
      setBalanceInfo(res);
    } catch (err: any) {
      setError(err.message || 'Failed to check live gateway balance.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBalance();
  }, []);

  const handleTopUp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setTopUpLoading(true);
      setError(null);
      const res = await ApiClient.post('/api/super-admin/sms/top-up', { credits: topUpAmount });
      setNotice(res.message);
      await loadBalance();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setTopUpLoading(false);
    }
  };

  return (
    <div className="space-y-5 text-left">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-teal-950 flex items-center space-x-2">
            <Coins className="w-5 h-5 text-teal-700" />
            <span>SMS Balance & Carrier Gateway Credits</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time balance synchronization with Arkesel/Hubtel telecom gateways in Ghana.
          </p>
        </div>

        <button
          onClick={loadBalance}
          className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs transition self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {notice && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center justify-between">
          <span>{notice}</span>
          <button onClick={() => setNotice(null)} className="font-bold text-emerald-700 hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="font-bold text-rose-700 hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Primary Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500">Live Credit Units</span>
          <p className="text-3xl font-extrabold text-teal-950 mt-1">
            {balanceInfo?.balanceCredits?.toLocaleString() || 0}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            Est. Value: GH₵{balanceInfo?.estimatedCostGHS || '0.00'} (@ GH₵{balanceInfo?.costPerSmsGHS}/SMS)
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500">Carrier Gateway Link</span>
          <div className="flex items-center space-x-2 mt-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-sm font-bold text-slate-900">{balanceInfo?.provider || 'Arkesel Direct Telecom'}</span>
          </div>
          <p className="text-[11px] text-emerald-600 font-medium mt-1">
            Status: {balanceInfo?.connectionStatus || 'CONNECTED_AND_ACTIVE'}
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500">Sender ID Channel</span>
          <p className="text-lg font-bold text-teal-900 mt-2 font-mono">
            {balanceInfo?.defaultSenderId || 'CHURCH-OS'}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            Regulatory Telco Whitelisted
          </p>
        </div>
      </div>

      {/* Top-up Form Card */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs max-w-lg">
        <h3 className="text-sm font-bold text-teal-950 mb-1 flex items-center space-x-2">
          <Plus className="w-4 h-4 text-teal-700" />
          <span>Top-Up SMS Credit Pool</span>
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          Instantly allocate additional credit units into the platform pool for automated and broadcast dispatches.
        </p>

        <form onSubmit={handleTopUp} className="space-y-3 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Select / Enter Credits Amount *</label>
            <div className="grid grid-cols-4 gap-2 mb-2">
              {['500', '1000', '2500', '5000'].map(amt => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setTopUpAmount(amt)}
                  className={`py-1.5 px-2 rounded-lg font-medium border text-xs transition ${
                    topUpAmount === amt
                      ? 'bg-teal-800 text-white border-teal-800'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  +{amt}
                </button>
              ))}
            </div>
            <input
              type="number"
              required
              min={100}
              value={topUpAmount}
              onChange={e => setTopUpAmount(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-700 font-mono text-sm"
            />
          </div>

          <p className="text-[11px] text-slate-500">
            Estimated Cost: <strong>GH₵{(parseFloat(topUpAmount || '0') * 0.04).toFixed(2)}</strong> (standard rate: GH₵0.04 / credit)
          </p>

          <button
            type="submit"
            disabled={topUpLoading}
            className="w-full py-2 bg-teal-800 hover:bg-teal-900 text-white rounded-lg font-semibold shadow-xs transition disabled:opacity-50 flex items-center justify-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>{topUpLoading ? 'Refueling Credits...' : `Top-Up ${topUpAmount} Credits`}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
