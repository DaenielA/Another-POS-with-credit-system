import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import api from '../api/axios';
import { ArrowLeft, CreditCard, Send, KeyRound } from 'lucide-react';

function CreditScoreBadge({ score }) {
  const s = parseFloat(score);
  const color = s < 60 ? 'bg-red-100 text-red-700' : s < 80 ? 'bg-orange-100 text-orange-700' : s <= 100 ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700';
  const label = s < 60 ? 'Blocked' : s < 80 ? 'Limited' : s <= 100 ? 'Good' : 'Excellent';
  return <span className={`badge ${color} text-sm px-3 py-1`}>{label} · {s}</span>;
}

export default function MemberDetail() {
  const { id } = useParams();
  const [member, setMember] = useState(null);
  const [ledger, setLedger] = useState([]);
  const [payments, setPayments] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [activeTab, setActiveTab] = useState('ledger');
  const [loading, setLoading] = useState(true);
  const [payLoading, setPayLoading] = useState(false);
  const [payError, setPayError] = useState('');
  const [paySuccess, setPaySuccess] = useState('');
  const [showLimitForm, setShowLimitForm] = useState(false);
  const [limitLoading, setLimitLoading] = useState(false);
  const [limitMsg, setLimitMsg] = useState('');
  const [pinMsg, setPinMsg] = useState('');
  const [pinLoading, setPinLoading] = useState(false);

  const { register, handleSubmit, watch, reset, setValue, formState: { errors } } = useForm({ defaultValues: { payment_mode: 'daily', amount_paid: '', payment_date: new Date().toISOString().slice(0, 10), notes: '' } });
  const { register: rlReg, handleSubmit: rlSubmit, formState: { errors: rlErrors } } = useForm();
  const { register: pinReg, handleSubmit: pinSubmit, reset: pinReset } = useForm();

  const paymentMode = watch('payment_mode');

  const load = () => {
    setLoading(true);
    Promise.all([
      api.get(`/members/${id}`),
      api.get(`/members/${id}/ledger`),
      api.get(`/members/${id}/payments`),
      api.get(`/transactions?member_id=${id}&limit=20`),
    ]).then(([m, l, p, t]) => {
      setMember(m.data.data);
      setLedger(l.data.data);
      setPayments(p.data.data);
      setTransactions(t.data.data.filter(tx => tx.member_id == id));
    }).catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);

  useEffect(() => {
    if (paymentMode === 'full' && member) {
      setValue('amount_paid', parseFloat(member.outstanding_balance).toFixed(2));
    }
  }, [paymentMode, member]);

  const onPaySubmit = async (data) => {
    setPayError('');
    setPaySuccess('');
    setPayLoading(true);
    try {
      const res = await api.post('/credit/pay', {
        member_id: parseInt(id),
        payment_mode: data.payment_mode,
        amount_paid: parseFloat(data.amount_paid),
        payment_date: data.payment_date,
        notes: data.notes,
      });
      setPaySuccess(`Payment recorded. New balance: ₱${parseFloat(res.data.data.new_balance).toFixed(2)}`);
      reset({ payment_mode: 'daily', amount_paid: '', payment_date: new Date().toISOString().slice(0, 10), notes: '' });
      load();
    } catch (e) {
      setPayError(e.response?.data?.message || 'Payment failed');
    } finally {
      setPayLoading(false);
    }
  };

  const onLimitRequest = async (data) => {
    setLimitLoading(true);
    setLimitMsg('');
    try {
      const res = await api.post('/credit-requests', {
        member_id: parseInt(id),
        requested_limit: parseFloat(data.requested_limit),
        reason: data.reason,
      });
      setLimitMsg(`Request ${res.data.data.status}. ${res.data.data.decision === 'auto_approve' ? 'Auto-approved!' : res.data.data.decision === 'auto_reject' ? 'Auto-rejected (low score).' : 'Pending admin review.'}`);
      setShowLimitForm(false);
      load();
    } catch (e) {
      setLimitMsg(e.response?.data?.message || 'Failed');
    } finally {
      setLimitLoading(false);
    }
  };

  const onSetPin = async (data) => {
    setPinLoading(true);
    setPinMsg('');
    try {
      await api.post(`/members/${id}/set-pin`, { pin: data.pin });
      setPinMsg('PIN set successfully!');
      pinReset();
    } catch (e) {
      setPinMsg(e.response?.data?.message || 'Failed to set PIN');
    } finally {
      setPinLoading(false);
    }
  };

  if (loading) return <div className="text-center py-20 text-gray-400">Loading member profile...</div>;
  if (!member) return <div className="text-center py-20 text-gray-400">Member not found</div>;

  const availableCredit = parseFloat(member.current_credit_limit) - parseFloat(member.outstanding_balance);

  return (
    <div className="space-y-6 max-w-5xl">
      <Link to="/members" className="flex items-center gap-2 text-gray-500 hover:text-gray-700 text-sm">
        <ArrowLeft size={16} /> Back to Members
      </Link>

      {/* Profile Card */}
      <div className="card">
        <div className="flex flex-wrap gap-6 justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold">{member.full_name}</h1>
              <CreditScoreBadge score={member.credit_score} />
            </div>
            <p className="text-gray-500 text-sm">{member.phone || 'No phone'} · {member.address || 'No address'}</p>
            <p className="text-gray-400 text-xs mt-1">Member since {new Date(member.membership_date).toLocaleDateString('en-PH')}</p>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="bg-orange-50 rounded-xl p-3">
              <p className="text-xl font-bold text-orange-600">₱{parseFloat(member.outstanding_balance).toFixed(2)}</p>
              <p className="text-xs text-gray-500">Outstanding</p>
            </div>
            <div className="bg-blue-50 rounded-xl p-3">
              <p className="text-xl font-bold text-blue-600">₱{parseFloat(member.current_credit_limit).toFixed(2)}</p>
              <p className="text-xs text-gray-500">Credit Limit</p>
            </div>
            <div className="bg-green-50 rounded-xl p-3">
              <p className="text-xl font-bold text-green-600">₱{Math.max(0, availableCredit).toFixed(2)}</p>
              <p className="text-xs text-gray-500">Available</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Payment Panel */}
        <div className="card space-y-4">
          <h2 className="font-semibold flex items-center gap-2"><CreditCard size={18} className="text-blue-500" /> Record Payment</h2>
          {payError && <p className="text-red-500 text-sm bg-red-50 p-2 rounded">{payError}</p>}
          {paySuccess && <p className="text-green-600 text-sm bg-green-50 p-2 rounded">{paySuccess}</p>}
          <form onSubmit={handleSubmit(onPaySubmit)} className="space-y-3">
            <div>
              <label className="label">Payment Mode</label>
              <select className="input" {...register('payment_mode', { required: true })}>
                <option value="daily">Daily</option>
                <option value="monthly">Monthly</option>
                <option value="bulk">Bulk</option>
                <option value="full">Full Pay</option>
              </select>
            </div>
            <div>
              <label className="label">Amount Paid (₱)</label>
              <input type="number" step="0.01" min="0.01" className="input"
                readOnly={paymentMode === 'full'}
                {...register('amount_paid', { required: 'Required', min: { value: 0.01, message: 'Must be > 0' } })}
              />
              {errors.amount_paid && <p className="text-red-500 text-xs mt-1">{errors.amount_paid.message}</p>}
            </div>
            <div>
              <label className="label">Payment Date</label>
              <input type="date" className="input" {...register('payment_date', { required: 'Required' })} />
            </div>
            <div>
              <label className="label">Notes (optional)</label>
              <input type="text" className="input" {...register('notes')} />
            </div>
            <button type="submit" disabled={payLoading || parseFloat(member.outstanding_balance) <= 0} className="btn-primary w-full flex items-center justify-center gap-2">
              <Send size={14} /> {payLoading ? 'Processing...' : 'Submit Payment'}
            </button>
          </form>

          {/* Set Member PIN */}
          <div className="border-t pt-4">
            <p className="text-sm font-medium mb-2 flex items-center gap-2"><KeyRound size={14} className="text-gray-400" /> Member Portal PIN</p>
            {pinMsg && <p className={`text-xs p-2 rounded mb-2 ${pinMsg.includes('success') ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>{pinMsg}</p>}
            <form onSubmit={pinSubmit(onSetPin)} className="flex gap-2">
              <input type="password" className="input text-sm flex-1" placeholder="Set 4-8 digit PIN"
                {...pinReg('pin', { required: true, minLength: 4, maxLength: 8 })} />
              <button type="submit" disabled={pinLoading} className="btn-secondary text-sm px-3">
                {pinLoading ? '...' : 'Set PIN'}
              </button>
            </form>
            <p className="text-xs text-gray-400 mt-1">Member uses phone + PIN to log in at /member-login</p>
          </div>

          {/* Credit Limit Request */}
          <div className="border-t pt-4">
            {limitMsg && <p className={`text-sm p-2 rounded mb-2 ${limitMsg.includes('approved') ? 'bg-green-50 text-green-600' : limitMsg.includes('rejected') ? 'bg-red-50 text-red-500' : 'bg-yellow-50 text-yellow-700'}`}>{limitMsg}</p>}
            {!showLimitForm ? (
              <button onClick={() => setShowLimitForm(true)} className="btn-secondary w-full text-sm">
                Request Credit Limit Increase
              </button>
            ) : (
              <form onSubmit={rlSubmit(onLimitRequest)} className="space-y-2">
                <p className="text-sm font-medium">Request Limit Increase</p>
                <div>
                  <label className="label text-xs">New Requested Limit (₱)</label>
                  <input type="number" step="0.01" min={member.current_credit_limit} className="input text-sm"
                    {...rlReg('requested_limit', { required: 'Required', min: { value: parseFloat(member.current_credit_limit) + 1, message: 'Must be more than current' } })}
                  />
                  {rlErrors.requested_limit && <p className="text-red-500 text-xs">{rlErrors.requested_limit.message}</p>}
                </div>
                <div>
                  <label className="label text-xs">Reason</label>
                  <textarea className="input text-sm" rows={2} {...rlReg('reason')} />
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setShowLimitForm(false)} className="btn-secondary flex-1 text-sm">Cancel</button>
                  <button type="submit" disabled={limitLoading} className="btn-primary flex-1 text-sm">{limitLoading ? '...' : 'Submit'}</button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* History Tabs */}
        <div className="lg:col-span-2 card p-0 overflow-hidden">
          <div className="flex border-b">
            {['ledger', 'payments', 'transactions'].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`flex-1 py-3 text-sm font-medium capitalize transition-colors ${activeTab === tab ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="overflow-y-auto max-h-96">
            {activeTab === 'ledger' && (
              <table className="w-full text-xs">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="text-left px-3 py-2">Date</th>
                    <th className="text-left px-3 py-2">Type</th>
                    <th className="text-right px-3 py-2">Amount</th>
                    <th className="text-right px-3 py-2">Balance After</th>
                    <th className="text-left px-3 py-2">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {ledger.length === 0 && <tr><td colSpan={5} className="text-center py-8 text-gray-400">No ledger entries</td></tr>}
                  {ledger.map(entry => (
                    <tr key={entry.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-gray-400">{new Date(entry.created_at).toLocaleDateString('en-PH')}</td>
                      <td className="px-3 py-2">
                        <span className={`badge ${entry.entry_type === 'purchase' ? 'bg-orange-100 text-orange-700' : entry.entry_type === 'payment' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                          {entry.entry_type}
                        </span>
                      </td>
                      <td className={`px-3 py-2 text-right font-medium ${parseFloat(entry.amount) < 0 ? 'text-green-600' : 'text-orange-600'}`}>
                        {parseFloat(entry.amount) < 0 ? '-' : '+'}₱{Math.abs(parseFloat(entry.amount)).toFixed(2)}
                      </td>
                      <td className="px-3 py-2 text-right">₱{parseFloat(entry.balance_after).toFixed(2)}</td>
                      <td className="px-3 py-2 text-gray-400 max-w-32 truncate">{entry.notes || entry.transaction_code || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === 'payments' && (
              <table className="w-full text-xs">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="text-left px-3 py-2">Date</th>
                    <th className="text-left px-3 py-2">Mode</th>
                    <th className="text-right px-3 py-2">Amount</th>
                    <th className="text-left px-3 py-2">Received By</th>
                    <th className="text-left px-3 py-2">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {payments.length === 0 && <tr><td colSpan={5} className="text-center py-8 text-gray-400">No payments yet</td></tr>}
                  {payments.map(p => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-gray-400">{new Date(p.payment_date).toLocaleDateString('en-PH')}</td>
                      <td className="px-3 py-2"><span className="badge bg-blue-100 text-blue-700">{p.payment_mode}</span></td>
                      <td className="px-3 py-2 text-right font-medium text-green-600">₱{parseFloat(p.amount_paid).toFixed(2)}</td>
                      <td className="px-3 py-2 text-gray-500">{p.received_by_name}</td>
                      <td className="px-3 py-2 text-gray-400">{p.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === 'transactions' && (
              <table className="w-full text-xs">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="text-left px-3 py-2">Code</th>
                    <th className="text-left px-3 py-2">Date</th>
                    <th className="text-right px-3 py-2">Total</th>
                    <th className="text-left px-3 py-2">Payment</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {transactions.length === 0 && <tr><td colSpan={4} className="text-center py-8 text-gray-400">No transactions</td></tr>}
                  {transactions.map(tx => (
                    <tr key={tx.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 font-mono text-gray-600">{tx.transaction_code}</td>
                      <td className="px-3 py-2 text-gray-400">{new Date(tx.transaction_date).toLocaleDateString('en-PH')}</td>
                      <td className="px-3 py-2 text-right font-medium">₱{parseFloat(tx.total_amount).toFixed(2)}</td>
                      <td className="px-3 py-2">
                        <span className={`badge ${tx.payment_type === 'credit' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>{tx.payment_type}</span>
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
