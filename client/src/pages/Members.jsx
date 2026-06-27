import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import api from '../api/axios';
import { UserPlus, Search, X, ChevronRight } from 'lucide-react';

function RegisterModal({ onClose, onDone }) {
  const { register, handleSubmit, formState: { errors } } = useForm();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('full_name', data.full_name);
      if (data.phone) fd.append('phone', data.phone);
      if (data.address) fd.append('address', data.address);
      if (data.id_photo?.[0]) fd.append('id_photo', data.id_photo[0]);
      await api.post('/members', fd);
      onDone();
      onClose();
    } catch (e) {
      setErr(e.response?.data?.message || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-5">
          <h3 className="font-semibold text-lg">Register New Member</h3>
          <button onClick={onClose}><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          {err && <p className="text-red-500 text-sm bg-red-50 p-2 rounded">{err}</p>}
          <div>
            <label className="label">Full Name *</label>
            <input className="input" {...register('full_name', { required: 'Required' })} />
            {errors.full_name && <p className="text-red-500 text-xs mt-1">{errors.full_name.message}</p>}
          </div>
          <div>
            <label className="label">Phone Number</label>
            <input className="input" placeholder="09XX-XXX-XXXX" {...register('phone')} />
          </div>
          <div>
            <label className="label">Address</label>
            <textarea className="input" rows={2} {...register('address')} />
          </div>
          <div>
            <label className="label">ID Photo</label>
            <input type="file" accept="image/*" className="input text-sm py-1" {...register('id_photo')} />
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">{loading ? 'Saving...' : 'Register'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CreditScoreBadge({ score }) {
  const color = score < 60 ? 'bg-red-100 text-red-700' : score < 80 ? 'bg-orange-100 text-orange-700' : score <= 100 ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700';
  return <span className={`badge ${color}`}>{score}</span>;
}

export default function Members() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  const load = (q = '') => {
    setLoading(true);
    api.get(`/members${q ? `?q=${q}` : ''}`)
      .then(r => setMembers(r.data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const t = setTimeout(() => load(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Members</h1>
        <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2">
          <UserPlus size={16} /> Register Member
        </button>
      </div>

      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
        <input className="input pl-9" placeholder="Search by name or phone..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Phone</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Balance</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Credit Limit</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">Score</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Member Since</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading && <tr><td colSpan={7} className="text-center py-12 text-gray-400">Loading...</td></tr>}
            {!loading && members.length === 0 && <tr><td colSpan={7} className="text-center py-12 text-gray-400">No members found</td></tr>}
            {members.map(m => (
              <tr key={m.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{m.full_name}</td>
                <td className="px-4 py-3 text-gray-500">{m.phone || '—'}</td>
                <td className="px-4 py-3 text-right">
                  <span className={parseFloat(m.outstanding_balance) > 0 ? 'text-orange-600 font-medium' : 'text-gray-500'}>
                    ₱{parseFloat(m.outstanding_balance).toFixed(2)}
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-gray-600">₱{parseFloat(m.current_credit_limit).toFixed(2)}</td>
                <td className="px-4 py-3 text-center"><CreditScoreBadge score={parseFloat(m.credit_score)} /></td>
                <td className="px-4 py-3 text-gray-400">{new Date(m.membership_date).toLocaleDateString('en-PH')}</td>
                <td className="px-4 py-3">
                  <Link to={`/members/${m.id}`} className="flex items-center text-blue-500 hover:text-blue-700">
                    View <ChevronRight size={16} />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAdd && <RegisterModal onClose={() => setShowAdd(false)} onDone={() => load(search)} />}
    </div>
  );
}
