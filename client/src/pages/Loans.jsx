import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import api from '../api/axios';
import { Plus, X, Send, ChevronDown, ChevronUp, Search } from 'lucide-react';

function StatusBadge({ status }) {
  const map = {
    active: 'bg-orange-100 text-orange-700',
    paid: 'bg-green-100 text-green-700',
    written_off: 'bg-gray-100 text-gray-500',
  };
  return <span className={`badge ${map[status] ?? 'bg-gray-100 text-gray-500'} capitalize`}>{status.replace('_', ' ')}</span>;
}

function NewLoanModal({ onClose, onDone }) {
  const { register, handleSubmit, formState: { errors } } = useForm();
  const [memberQuery, setMemberQuery] = useState('');
  const [allMembers, setAllMembers] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  // Load all members on mount
  useEffect(() => {
    api.get('/members').then(r => setAllMembers(r.data.data)).catch(() => {});
  }, []);

  const filtered = memberQuery.trim()
    ? allMembers.filter(m =>
        m.full_name.toLowerCase().includes(memberQuery.toLowerCase()) ||
        (m.phone && m.phone.includes(memberQuery))
      )
    : allMembers;

  const onSubmit = async (data) => {
    if (!selectedMember) { setErr('Please select a member'); return; }
    setLoading(true);
    try {
      await api.post('/loans', {
        member_id: selectedMember.id,
        amount: parseFloat(data.amount),
        due_date: data.due_date || null,
        notes: data.notes || null,
      });
      onDone();
      onClose();
    } catch (e) {
      setErr(e.response?.data?.message || 'Failed to create loan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-5">
          <h3 className="font-semibold text-lg">New Cash Loan</h3>
          <button onClick={onClose}><X size={20} /></button>
        </div>
        {err && <p className="text-red-500 text-sm bg-red-50 p-2 rounded mb-3">{err}</p>}

        {/* Member Picker */}
        <div className="mb-4">
          <label className="label">Borrower *</label>
          {selectedMember ? (
            <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
              <div>
                <p className="font-medium text-sm text-blue-700">{selectedMember.full_name}</p>
                <p className="text-xs text-gray-500">
                  Score: {parseFloat(selectedMember.credit_score).toFixed(0)} · Balance: ₱{parseFloat(selectedMember.outstanding_balance).toFixed(2)}
                </p>
              </div>
              <button onClick={() => setSelectedMember(null)} className="text-gray-400 hover:text-red-500"><X size={14} /></button>
            </div>
          ) : (
            <div>
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                <input
                  className="input pl-8"
                  placeholder="Filter by name or phone..."
                  value={memberQuery}
                  onChange={e => setMemberQuery(e.target.value)}
                  autoFocus
                />
                {memberQuery && (
                  <button onClick={() => setMemberQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <X size={14} />
                  </button>
                )}
              </div>
              <div className="border rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                {filtered.length === 0 && (
                  <p className="text-center text-gray-400 text-sm py-4">No members found</p>
                )}
                {filtered.map(m => (
                  <button
                    key={m.id}
                    onClick={() => { setSelectedMember(m); setMemberQuery(''); }}
                    className="w-full text-left px-3 py-2.5 hover:bg-blue-50 border-b last:border-0 transition-colors"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm font-medium">{m.full_name}</p>
                        <p className="text-xs text-gray-400">{m.phone || 'No phone'}</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-xs font-medium ${
                          parseFloat(m.credit_score) < 60 ? 'text-red-500' :
                          parseFloat(m.credit_score) < 80 ? 'text-orange-500' : 'text-green-600'
                        }`}>Score: {parseFloat(m.credit_score).toFixed(0)}</p>
                        <p className="text-xs text-gray-400">Bal: ₱{parseFloat(m.outstanding_balance).toFixed(2)}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div>
            <label className="label">Loan Amount (₱) *</label>
            <input type="number" step="0.01" min="1" className="input"
              {...register('amount', { required: 'Required', min: { value: 1, message: 'Must be at least ₱1' } })} />
            {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount.message}</p>}
          </div>
          <div>
            <label className="label">Due Date (optional)</label>
            <input type="date" className="input" min={new Date().toISOString().slice(0, 10)} {...register('due_date')} />
          </div>
          <div>
            <label className="label">Notes (optional)</label>
            <textarea className="input" rows={2} placeholder="Reason for loan, etc." {...register('notes')} />
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">{loading ? 'Processing...' : 'Lend Money'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PayLoanModal({ loan, onClose, onDone }) {
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: { payment_date: new Date().toISOString().slice(0, 10) }
  });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      await api.post(`/loans/${loan.id}/pay`, {
        amount_paid: parseFloat(data.amount_paid),
        payment_date: data.payment_date,
        notes: data.notes || null,
      });
      onDone();
      onClose();
    } catch (e) {
      setErr(e.response?.data?.message || 'Payment failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold">Record Repayment</h3>
          <button onClick={onClose}><X size={20} /></button>
        </div>
        <div className="bg-gray-50 rounded-lg p-3 mb-4 text-sm space-y-1">
          <p className="font-medium">{loan.full_name}</p>
          <div className="flex justify-between text-gray-500">
            <span>Original Loan</span><span>₱{parseFloat(loan.amount).toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-bold text-orange-600">
            <span>Remaining Balance</span><span>₱{parseFloat(loan.balance).toFixed(2)}</span>
          </div>
        </div>
        {err && <p className="text-red-500 text-sm bg-red-50 p-2 rounded mb-3">{err}</p>}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div>
            <label className="label">Amount to Pay (₱) *</label>
            <input type="number" step="0.01" min="0.01" max={parseFloat(loan.balance)} className="input"
              {...register('amount_paid', {
                required: 'Required',
                min: { value: 0.01, message: 'Must be > 0' },
                max: { value: parseFloat(loan.balance), message: `Cannot exceed ₱${parseFloat(loan.balance).toFixed(2)}` }
              })} />
            {errors.amount_paid && <p className="text-red-500 text-xs mt-1">{errors.amount_paid.message}</p>}
          </div>
          <div>
            <label className="label">Payment Date *</label>
            <input type="date" className="input" {...register('payment_date', { required: 'Required' })} />
          </div>
          <div>
            <label className="label">Notes (optional)</label>
            <input type="text" className="input" {...register('notes')} />
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 flex items-center justify-center gap-2">
              <Send size={14} />{loading ? 'Processing...' : 'Record Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Loans() {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [payLoan, setPayLoan] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [loanPayments, setLoanPayments] = useState({});
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  const load = () => {
    setLoading(true);
    const params = statusFilter ? `?status=${statusFilter}` : '';
    api.get(`/loans${params}`)
      .then(r => setLoans(r.data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [statusFilter]);

  const toggleExpand = async (loanId, memberId) => {
    if (expandedId === loanId) { setExpandedId(null); return; }
    setExpandedId(loanId);
    if (!loanPayments[loanId]) {
      const r = await api.get(`/loans/member/${memberId}`);
      const payments = r.data.data.payments.filter(p => {
        // match payments to this loan by finding entries in order
        return true;
      });
      // fetch per-loan payments directly
      const allPayments = r.data.data.payments;
      setLoanPayments(prev => ({ ...prev, [loanId]: allPayments }));
    }
  };

  const filtered = loans.filter(l =>
    l.full_name.toLowerCase().includes(search.toLowerCase())
  );

  const totalActive = loans.filter(l => l.status === 'active').reduce((s, l) => s + parseFloat(l.balance), 0);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Cash Loans</h1>
          {totalActive > 0 && <p className="text-sm text-orange-600 mt-0.5">Total outstanding: ₱{totalActive.toFixed(2)}</p>}
        </div>
        <button onClick={() => setShowNew(true)} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> New Loan
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
          <input className="input pl-8 max-w-xs" placeholder="Search borrower..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input max-w-xs" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="paid">Paid</option>
          <option value="written_off">Written Off</option>
        </select>
      </div>

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Borrower</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Loan Amount</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Paid</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Balance</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Due Date</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading && <tr><td colSpan={8} className="text-center py-12 text-gray-400">Loading loans...</td></tr>}
            {!loading && filtered.length === 0 && <tr><td colSpan={8} className="text-center py-12 text-gray-400">No loans found</td></tr>}
            {filtered.map(loan => (
              <>
                <tr key={loan.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium">{loan.full_name}</p>
                    <p className="text-xs text-gray-400">Score: {parseFloat(loan.credit_score).toFixed(0)}</p>
                  </td>
                  <td className="px-4 py-3 text-right font-medium">₱{parseFloat(loan.amount).toFixed(2)}</td>
                  <td className="px-4 py-3 text-right text-green-600">₱{parseFloat(loan.amount_paid).toFixed(2)}</td>
                  <td className="px-4 py-3 text-right font-bold text-orange-600">₱{parseFloat(loan.balance).toFixed(2)}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {loan.due_date ? new Date(loan.due_date).toLocaleDateString('en-PH') : '—'}
                  </td>
                  <td className="px-4 py-3 text-center"><StatusBadge status={loan.status} /></td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{new Date(loan.created_at).toLocaleDateString('en-PH')}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {loan.status === 'active' && (
                        <button onClick={() => setPayLoan(loan)} className="btn-primary text-xs py-1 px-2">Pay</button>
                      )}
                      <button onClick={() => toggleExpand(loan.id, loan.member_id)} className="text-gray-400 hover:text-gray-600">
                        {expandedId === loan.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                    </div>
                  </td>
                </tr>
                {expandedId === loan.id && (
                  <tr key={`${loan.id}-expand`} className="bg-gray-50">
                    <td colSpan={8} className="px-6 py-3">
                      <p className="text-xs font-medium text-gray-500 mb-2">
                        {loan.notes && <span className="mr-4">Note: {loan.notes}</span>}
                        Lent by: {loan.created_by_name}
                      </p>
                      {loanPayments[loan.id]?.length > 0 ? (
                        <table className="w-full text-xs border rounded-lg overflow-hidden">
                          <thead className="bg-white">
                            <tr>
                              <th className="text-left px-3 py-2 font-medium">Date</th>
                              <th className="text-right px-3 py-2 font-medium">Amount Paid</th>
                              <th className="text-left px-3 py-2 font-medium">Received By</th>
                              <th className="text-left px-3 py-2 font-medium">Notes</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {loanPayments[loan.id].map(p => (
                              <tr key={p.id}>
                                <td className="px-3 py-2 text-gray-500">{new Date(p.payment_date).toLocaleDateString('en-PH')}</td>
                                <td className="px-3 py-2 text-right text-green-600 font-medium">₱{parseFloat(p.amount_paid).toFixed(2)}</td>
                                <td className="px-3 py-2 text-gray-500">{p.received_by_name}</td>
                                <td className="px-3 py-2 text-gray-400">{p.notes || '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <p className="text-xs text-gray-400">No payments recorded yet.</p>
                      )}
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>

      {showNew && <NewLoanModal onClose={() => setShowNew(false)} onDone={load} />}
      {payLoan && <PayLoanModal loan={payLoan} onClose={() => setPayLoan(null)} onDone={load} />}
    </div>
  );
}
