import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../api/axios';

const TABS = ['daily', 'monthly', 'top-products', 'by-cashier', 'credit-status'];

export default function Reports() {
  const [tab, setTab] = useState('daily');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = () => {
    setLoading(true);
    const endpoints = {
      'daily': `/reports/daily?date=${date}`,
      'monthly': `/reports/monthly?month=${month}`,
      'top-products': '/reports/top-products?limit=20',
      'by-cashier': '/reports/cashier',
      'credit-status': '/reports/credit-status',
    };
    api.get(endpoints[tab])
      .then(r => setData(r.data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [tab, date, month]);

  const fmt = (v) => `₱${parseFloat(v || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Reports</h1>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium capitalize transition-colors ${tab === t ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {t.replace('-', ' ')}
          </button>
        ))}
      </div>

      {/* Date pickers */}
      {tab === 'daily' && (
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Date:</label>
          <input type="date" className="input w-auto" value={date} onChange={e => setDate(e.target.value)} />
        </div>
      )}
      {tab === 'monthly' && (
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Month:</label>
          <input type="month" className="input w-auto" value={month} onChange={e => setMonth(e.target.value)} />
        </div>
      )}

      {loading && <div className="text-center py-16 text-gray-400">Loading...</div>}

      {!loading && data && (
        <>
          {/* Daily */}
          {tab === 'daily' && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="card text-center"><p className="text-2xl font-bold text-blue-600">{fmt(data.total_sales)}</p><p className="text-sm text-gray-500">Total Sales</p></div>
              <div className="card text-center"><p className="text-2xl font-bold text-green-600">{data.total_transactions}</p><p className="text-sm text-gray-500">Transactions</p></div>
              <div className="card text-center"><p className="text-2xl font-bold text-purple-600">{parseFloat(data.total_items || 0).toFixed(0)}</p><p className="text-sm text-gray-500">Items Sold</p></div>
              <div className="card text-center"><p className="text-2xl font-bold text-orange-600">{fmt(data.total_profit)}</p><p className="text-sm text-gray-500">Gross Profit</p></div>
            </div>
          )}

          {/* Monthly */}
          {tab === 'monthly' && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="card text-center"><p className="text-2xl font-bold text-blue-600">{fmt(data.total_sales)}</p><p className="text-sm text-gray-500">Total Sales</p></div>
                <div className="card text-center"><p className="text-2xl font-bold text-green-600">{data.total_transactions}</p><p className="text-sm text-gray-500">Transactions</p></div>
                <div className="card text-center"><p className="text-2xl font-bold text-orange-600">{fmt(data.total_profit)}</p><p className="text-sm text-gray-500">Gross Profit</p></div>
              </div>
              {data.daily?.length > 0 && (
                <div className="card">
                  <h3 className="font-medium mb-4">Daily Breakdown</h3>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={data.daily.map(d => ({ ...d, sales: parseFloat(d.sales) }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={d => new Date(d).getDate()} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₱${v}`} />
                      <Tooltip formatter={v => [fmt(v), 'Sales']} />
                      <Bar dataKey="sales" fill="#2563eb" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}

          {/* Top Products */}
          {tab === 'top-products' && (
            <div className="card p-0 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3">#</th>
                    <th className="text-left px-4 py-3">Product</th>
                    <th className="text-left px-4 py-3">Unit</th>
                    <th className="text-right px-4 py-3">Qty Sold</th>
                    <th className="text-right px-4 py-3">Revenue</th>
                    <th className="text-right px-4 py-3">Profit</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-gray-400">No data</td></tr>}
                  {data.map((p, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-400">{i + 1}</td>
                      <td className="px-4 py-3 font-medium">{p.name}</td>
                      <td className="px-4 py-3 text-gray-500">{p.unit_label}</td>
                      <td className="px-4 py-3 text-right">{parseFloat(p.total_qty).toFixed(2)}</td>
                      <td className="px-4 py-3 text-right font-medium">{fmt(p.total_revenue)}</td>
                      <td className="px-4 py-3 text-right text-green-600">{fmt(p.total_profit)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* By Cashier */}
          {tab === 'by-cashier' && (
            <div className="card p-0 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3">Cashier</th>
                    <th className="text-right px-4 py-3">Transactions</th>
                    <th className="text-right px-4 py-3">Total Sales</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.length === 0 && <tr><td colSpan={3} className="text-center py-8 text-gray-400">No data</td></tr>}
                  {data.map((c, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{c.cashier}</td>
                      <td className="px-4 py-3 text-right">{c.transactions}</td>
                      <td className="px-4 py-3 text-right font-medium">{fmt(c.total_sales)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Credit Status */}
          {tab === 'credit-status' && (
            <div className="card p-0 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3">Member</th>
                    <th className="text-left px-4 py-3">Phone</th>
                    <th className="text-right px-4 py-3">Balance</th>
                    <th className="text-right px-4 py-3">Limit</th>
                    <th className="text-center px-4 py-3">Score</th>
                    <th className="text-left px-4 py-3">Last Payment</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-gray-400">No outstanding balances</td></tr>}
                  {data.map(m => (
                    <tr key={m.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{m.full_name}</td>
                      <td className="px-4 py-3 text-gray-500">{m.phone || '—'}</td>
                      <td className="px-4 py-3 text-right text-orange-600 font-medium">{fmt(m.outstanding_balance)}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{fmt(m.current_credit_limit)}</td>
                      <td className={`px-4 py-3 text-center font-bold ${m.credit_score < 60 ? 'text-red-600' : m.credit_score < 80 ? 'text-orange-500' : 'text-green-600'}`}>{m.credit_score}</td>
                      <td className="px-4 py-3 text-gray-400">{m.last_payment_date ? new Date(m.last_payment_date).toLocaleDateString('en-PH') : 'Never'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
