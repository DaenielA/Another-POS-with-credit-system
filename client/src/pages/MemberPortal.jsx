import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import axios from 'axios';
import { LogOut, CreditCard, Banknote, ClipboardList, Send, Store } from 'lucide-react';

const memberApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
});
memberApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('member_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

function ScoreBadge({ score }) {
  const s = parseFloat(score);
  const color = s < 60 ? 'bg-red-100 text-red-700' : s < 80 ? 'bg-orange-100 text-orange-700' : s <= 100 ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700';
  const label = s < 60 ? 'Blocked' : s < 80 ? 'Limited' : s <= 100 ? 'Good' : 'Excellent';
  return <span className={`badge ${color} text-sm px-3 py-1`}>{label} · {s}</span>;
}

export default function MemberPortal() {
  const navigate = useNavigate();
  const [member, setMember] = useState(null);
  const [ledger, setLedger] = useState([]);
  const [loans, setLoans] = useState([]);
  const [creditRequests, setCreditRequests] = useState([]);
  const [activeTab, setActiveTab] = useState('ledger');
  const [loading, setLoading] = useState(true);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [requestMsg, setRequestMsg] = useState('');
  const [requestLoading, setRequestLoading] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const load = async () => {
    setLoading(true);
    try {
      const [m, l, ln, cr] = await Promise.all([
        memberApi.get('/member-portal/me'),
        memberApi.get('/member-portal/ledger'),
        memberApi.get('/member-portal/loans'),
        memberApi.get('/member-portal/credit-requests'),
      ]);
      setMember(m.data.data);
      setLedger(l.data.data);
      setLoans(ln.data.data);
      setCreditRequests(cr.data.data);
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem('member_token');
        localStorage.removeItem('member');
        navigate('/member-login');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('member_token');
    if (!token) { navigate('/member-login'); return; }
    load();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('member_token');
    localStorage.removeItem('member');
    navigate('/member-login');
  };

  const onRequestSubmit = async (data) => {
    setRequestLoading(true);
    setRequestMsg('');
    try {
      const res = await memberApi.post('/member-portal/credit-request', {
        requested_limit: parseFloat(data.requested_limit),
        reason: data.reason,
      });
      const status = res.data.data.status;
      setRequestMsg(
        status === 'approved' ? '✅ Auto-approved! Your limit has been updated.' :
        status === 'rejected' ? '❌ Auto-rejected. Credit score is too low.' :
        '⏳ Request submitted. Pending admin review.'
      );
      setShowRequestForm(false);
      reset();
      load();
    } catch (err) {
      setRequestMsg(err.response?.data?.message || 'Failed to submit request');
    } finally {
      setRequestLoading(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-400">Loading your profile...</p>
    </div>
  );

  if (!member) return null;

  const hasPending = creditRequests.some(r => r.status === 'pending');
  const activeLoans = loans.filter(l => l.status === 'active');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
            <Store size={16} className="text-white" />
          </div>
          <div>
            <p className="font-bold text-sm">Member Portal</p>
            <p className="text-xs text-gray-400">Tindahan POS</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-700">{member.full_name}</span>
          <button onClick={handleLogout} className="flex items-center gap-1 text-gray-400 hover:text-red-500 text-sm">
            <LogOut size={16} />
          </button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto p-4 space-y-4">

        {/* Credit Score + Stats */}
        <div className="bg-white rounded-xl border p-5 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-lg font-bold">{member.full_name}</h2>
              <p className="text-xs text-gray-400 mt-0.5">Member since {new Date(member.membership_date).toLocaleDateString('en-PH')}</p>
            </div>
            <ScoreBadge score={member.credit_score} />
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-orange-50 rounded-xl p-3">
              <p className="text-lg font-bold text-orange-600">₱{parseFloat(member.outstanding_balance).toFixed(2)}</p>
              <p className="text-xs text-gray-500">Outstanding</p>
            </div>
            <div className="bg-blue-50 rounded-xl p-3">
              <p className="text-lg font-bold text-blue-600">₱{parseFloat(member.current_credit_limit).toFixed(2)}</p>
              <p className="text-xs text-gray-500">Credit Limit</p>
            </div>
            <div className="bg-green-50 rounded-xl p-3">
              <p className="text-lg font-bold text-green-600">₱{parseFloat(member.available_credit).toFixed(2)}</p>
              <p className="text-xs text-gray-500">Available</p>
            </div>
          </div>
          {activeLoans.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm">
              <p className="font-medium text-yellow-800">Active Loans: {activeLoans.length}</p>
              <p className="text-yellow-700 text-xs mt-0.5">
                Total remaining: ₱{activeLoans.reduce((s, l) => s + parseFloat(l.balance), 0).toFixed(2)}
              </p>
            </div>
          )}
        </div>

        {/* Credit Limit Request */}
        <div className="bg-white rounded-xl border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2"><CreditCard size={16} className="text-blue-500" /> Credit Limit Request</h3>
            {!showRequestForm && !hasPending && (
              <button onClick={() => setShowRequestForm(true)} className="btn-primary text-xs py-1.5 px-3">
                Request Increase
              </button>
            )}
            {hasPending && <span className="text-xs text-yellow-600 bg-yellow-50 px-2 py-1 rounded-full">Pending request</span>}
          </div>

          {requestMsg && (
            <p className={`text-sm p-2 rounded ${requestMsg.startsWith('✅') ? 'bg-green-50 text-green-700' : requestMsg.startsWith('❌') ? 'bg-red-50 text-red-600' : 'bg-yellow-50 text-yellow-700'}`}>
              {requestMsg}
            </p>
          )}

          {showRequestForm && (
            <form onSubmit={handleSubmit(onRequestSubmit)} className="space-y-3 border-t pt-3">
              <div>
                <label className="label">New Requested Limit (₱) *</label>
                <input type="number" step="0.01" min={parseFloat(member.current_credit_limit) + 1} className="input"
                  {...register('requested_limit', {
                    required: 'Required',
                    min: { value: parseFloat(member.current_credit_limit) + 1, message: 'Must be higher than current limit' }
                  })}
                />
                {errors.requested_limit && <p className="text-red-500 text-xs mt-1">{errors.requested_limit.message}</p>}
              </div>
              <div>
                <label className="label">Reason (optional)</label>
                <textarea className="input" rows={2} placeholder="Why do you need a higher limit?" {...register('reason')} />
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowRequestForm(false)} className="btn-secondary flex-1 text-sm">Cancel</button>
                <button type="submit" disabled={requestLoading} className="btn-primary flex-1 text-sm flex items-center justify-center gap-2">
                  <Send size={14} />{requestLoading ? 'Submitting...' : 'Submit'}
                </button>
              </div>
            </form>
          )}

          {/* Past requests */}
          {creditRequests.length > 0 && (
            <div className="border-t pt-3 space-y-2">
              <p className="text-xs font-medium text-gray-500">Past Requests</p>
              {creditRequests.map(r => (
                <div key={r.id} className="flex justify-between items-center text-xs bg-gray-50 rounded-lg px-3 py-2">
                  <div>
                    <p className="font-medium">₱{parseFloat(r.requested_limit).toFixed(2)}</p>
                    <p className="text-gray-400">{new Date(r.created_at).toLocaleDateString('en-PH')}</p>
                  </div>
                  <span className={`badge ${r.status === 'approved' ? 'bg-green-100 text-green-700' : r.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'} capitalize`}>
                    {r.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tabs: Ledger / Loans */}
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="flex border-b">
            {[
              { key: 'ledger', label: 'Credit Ledger', icon: ClipboardList },
              { key: 'loans', label: 'Cash Loans', icon: Banknote },
            ].map(({ key, label, icon: Icon }) => (
              <button key={key} onClick={() => setActiveTab(key)}
                className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${activeTab === key ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>
                <Icon size={14} />{label}
              </button>
            ))}
          </div>

          <div className="overflow-y-auto max-h-80">
            {activeTab === 'ledger' && (
              <table className="w-full text-xs">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="text-left px-3 py-2">Date</th>
                    <th className="text-left px-3 py-2">Type</th>
                    <th className="text-right px-3 py-2">Amount</th>
                    <th className="text-right px-3 py-2">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {ledger.length === 0 && <tr><td colSpan={4} className="text-center py-8 text-gray-400">No transactions yet</td></tr>}
                  {ledger.map(e => (
                    <tr key={e.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-gray-400">{new Date(e.created_at).toLocaleDateString('en-PH')}</td>
                      <td className="px-3 py-2">
                        <span className={`badge ${e.entry_type === 'purchase' ? 'bg-orange-100 text-orange-700' : e.entry_type === 'payment' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'} capitalize`}>
                          {e.entry_type}
                        </span>
                      </td>
                      <td className={`px-3 py-2 text-right font-medium ${parseFloat(e.amount) < 0 ? 'text-green-600' : 'text-orange-600'}`}>
                        {parseFloat(e.amount) < 0 ? '-' : '+'}₱{Math.abs(parseFloat(e.amount)).toFixed(2)}
                      </td>
                      <td className="px-3 py-2 text-right">₱{parseFloat(e.balance_after).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === 'loans' && (
              <table className="w-full text-xs">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="text-left px-3 py-2">Date</th>
                    <th className="text-right px-3 py-2">Amount</th>
                    <th className="text-right px-3 py-2">Balance</th>
                    <th className="text-left px-3 py-2">Due</th>
                    <th className="text-center px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {loans.length === 0 && <tr><td colSpan={5} className="text-center py-8 text-gray-400">No loans</td></tr>}
                  {loans.map(l => (
                    <tr key={l.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-gray-400">{new Date(l.created_at).toLocaleDateString('en-PH')}</td>
                      <td className="px-3 py-2 text-right font-medium">₱{parseFloat(l.amount).toFixed(2)}</td>
                      <td className="px-3 py-2 text-right text-orange-600 font-medium">₱{parseFloat(l.balance).toFixed(2)}</td>
                      <td className="px-3 py-2 text-gray-400">{l.due_date ? new Date(l.due_date).toLocaleDateString('en-PH') : '—'}</td>
                      <td className="px-3 py-2 text-center">
                        <span className={`badge capitalize ${l.status === 'paid' ? 'bg-green-100 text-green-700' : l.status === 'active' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-500'}`}>
                          {l.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
