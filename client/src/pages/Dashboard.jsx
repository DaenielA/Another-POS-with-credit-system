import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../api/axios';
import { ShoppingCart, Package, Users, TrendingUp, AlertTriangle } from 'lucide-react';

function StatCard({ label, value, icon: Icon, color, to }) {
  const content = (
    <div className={`card flex items-center gap-4 hover:shadow-md transition-shadow`}>
      <div className={`p-3 rounded-xl ${color}`}>
        <Icon size={22} className="text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-500">{label}</p>
      </div>
    </div>
  );
  return to ? <Link to={to}>{content}</Link> : content;
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [weekData, setWeekData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/reports/dashboard'),
      api.get('/reports/week'),
    ]).then(([statsRes, weekRes]) => {
      setStats(statsRes.data.data);
      setWeekData(weekRes.data.data.map(d => ({
        date: new Date(d.date).toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric' }),
        sales: parseFloat(d.sales),
        transactions: parseInt(d.transactions),
      })));
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">Loading...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Today's Sales" value={`₱${parseFloat(stats?.today_sales || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`} icon={TrendingUp} color="bg-blue-500" />
        <StatCard label="Transactions Today" value={stats?.today_transactions || 0} icon={ShoppingCart} color="bg-green-500" to="/pos" />
        <StatCard label="Low Stock Items" value={stats?.low_stock_count || 0} icon={AlertTriangle} color="bg-orange-500" to="/inventory" />
        <StatCard label="Members w/ Balance" value={stats?.members_with_balance || 0} icon={Users} color="bg-purple-500" to="/members" />
      </div>

      <div className="card">
        <h2 className="font-semibold text-gray-700 mb-4">Sales — Last 7 Days</h2>
        {weekData.length === 0 ? (
          <p className="text-gray-400 text-center py-8">No sales data yet</p>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={weekData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `₱${v}`} />
              <Tooltip formatter={(v) => [`₱${parseFloat(v).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`, 'Sales']} />
              <Bar dataKey="sales" fill="#2563eb" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Link to="/pos" className="card text-center hover:shadow-md transition-shadow cursor-pointer">
          <ShoppingCart className="mx-auto text-blue-500 mb-2" size={28} />
          <p className="font-semibold">Open POS</p>
          <p className="text-sm text-gray-500">Start a new sale</p>
        </Link>
        <Link to="/members" className="card text-center hover:shadow-md transition-shadow cursor-pointer">
          <Users className="mx-auto text-purple-500 mb-2" size={28} />
          <p className="font-semibold">Members</p>
          <p className="text-sm text-gray-500">Manage credit customers</p>
        </Link>
        <Link to="/inventory" className="card text-center hover:shadow-md transition-shadow cursor-pointer">
          <Package className="mx-auto text-green-500 mb-2" size={28} />
          <p className="font-semibold">Inventory</p>
          <p className="text-sm text-gray-500">Stock & products</p>
        </Link>
      </div>
    </div>
  );
}
