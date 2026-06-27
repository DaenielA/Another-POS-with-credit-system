import { useState, useEffect } from 'react';
import api from '../api/axios';
import { CheckCircle, XCircle, Clock } from 'lucide-react';

export default function CreditRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null);

  const load = () => {
    setLoading(true);
    api.get('/credit-requests')
      .then(r => setRequests(r.data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleAction = async (id, action) => {
    if (!window.confirm(`${action === 'approve' ? 'Approve' : 'Reject'} this request?`)) return;
    setProcessing(id);
    try {
      await api.put(`/credit-requests/${id}`, { action });
      load();
    } catch (e) {
      alert(e.response?.data?.message || 'Failed');
    } finally {
      setProcessing(null);
    }
  };

  const scoreColor = (s) => s < 60 ? 'text-red-600' : s < 80 ? 'text-orange-500' : s <= 100 ? 'text-green-600' : 'text-blue-600';

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Credit Limit Requests</h1>

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Member</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Current Limit</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Requested</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">Score</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Reason</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading && <tr><td colSpan={8} className="text-center py-12 text-gray-400">Loading...</td></tr>}
            {!loading && requests.length === 0 && <tr><td colSpan={8} className="text-center py-12 text-gray-400">No requests</td></tr>}
            {requests.map(r => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{r.full_name}</td>
                <td className="px-4 py-3 text-right text-gray-600">₱{parseFloat(r.current_credit_limit).toFixed(2)}</td>
                <td className="px-4 py-3 text-right font-medium text-blue-600">₱{parseFloat(r.requested_limit).toFixed(2)}</td>
                <td className={`px-4 py-3 text-center font-bold ${scoreColor(r.credit_score)}`}>{parseFloat(r.credit_score).toFixed(0)}</td>
                <td className="px-4 py-3 text-gray-500 max-w-48 truncate">{r.reason || '—'}</td>
                <td className="px-4 py-3 text-center">
                  {r.status === 'pending' && <span className="badge bg-yellow-100 text-yellow-700 flex items-center gap-1 justify-center"><Clock size={12} /> Pending</span>}
                  {r.status === 'approved' && <span className="badge bg-green-100 text-green-700 flex items-center gap-1 justify-center"><CheckCircle size={12} /> Approved</span>}
                  {r.status === 'rejected' && <span className="badge bg-red-100 text-red-700 flex items-center gap-1 justify-center"><XCircle size={12} /> Rejected</span>}
                </td>
                <td className="px-4 py-3 text-gray-400 text-xs">{new Date(r.created_at).toLocaleDateString('en-PH')}</td>
                <td className="px-4 py-3">
                  {r.status === 'pending' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAction(r.id, 'approve')}
                        disabled={processing === r.id}
                        className="btn-success text-xs py-1 px-2"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleAction(r.id, 'reject')}
                        disabled={processing === r.id}
                        className="btn-danger text-xs py-1 px-2"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                  {r.status !== 'pending' && <span className="text-xs text-gray-400">by {r.reviewed_by_name || 'system'}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
