import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { Plus, Trash2, X, KeyRound } from 'lucide-react';

function AddUserModal({ onClose, onDone }) {
  const { register, handleSubmit, formState: { errors } } = useForm();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      await api.post('/users', data);
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
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
        <div className="flex justify-between items-center mb-5">
          <h3 className="font-semibold">Add Staff Account</h3>
          <button onClick={onClose}><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          {err && <p className="text-red-500 text-sm">{err}</p>}
          <div>
            <label className="label">Full Name</label>
            <input className="input" {...register('name', { required: 'Required' })} />
            {errors.name && <p className="text-red-500 text-xs">{errors.name.message}</p>}
          </div>
          <div>
            <label className="label">Email</label>
            <input type="email" className="input" {...register('email', { required: 'Required' })} />
            {errors.email && <p className="text-red-500 text-xs">{errors.email.message}</p>}
          </div>
          <div>
            <label className="label">Password</label>
            <input type="password" className="input" {...register('password', { required: 'Required', minLength: { value: 6, message: 'Min 6 characters' } })} />
            {errors.password && <p className="text-red-500 text-xs">{errors.password.message}</p>}
          </div>
          <div>
            <label className="label">Role</label>
            <select className="input" {...register('role', { required: 'Required' })}>
              <option value="cashier">Cashier</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">{loading ? '...' : 'Create'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Settings() {
  const { isAdmin } = useAuth();
  const [users, setUsers] = useState([]);
  const [showAddUser, setShowAddUser] = useState(false);

  const loadUsers = () => api.get('/users').then(r => setUsers(r.data.data)).catch(console.error);

  useEffect(() => { loadUsers(); }, []);

  const deactivateUser = async (id) => {
    if (!window.confirm('Deactivate this account?')) return;
    await api.delete(`/users/${id}`);
    loadUsers();
  };

  if (!isAdmin) return <div className="text-center py-20 text-gray-400">Admin access required</div>;

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-bold">Settings</h1>

      <ChangePasswordSection />

      {/* Staff Accounts */}
      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-semibold">Staff Accounts</h2>
          <button onClick={() => setShowAddUser(true)} className="btn-primary text-sm flex items-center gap-1">
            <Plus size={14} /> Add Staff
          </button>
        </div>
        <div className="space-y-2">
          {users.map(u => (
            <div key={u.id} className="flex items-center justify-between py-2 border-b last:border-0">
              <div>
                <p className="font-medium text-sm">{u.name}</p>
                <p className="text-xs text-gray-400">{u.email} · <span className="capitalize">{u.role}</span></p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`badge ${u.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {u.is_active ? 'Active' : 'Inactive'}
                </span>
                {u.is_active && (
                  <button onClick={() => deactivateUser(u.id)} className="text-red-400 hover:text-red-600 p-1">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {showAddUser && <AddUserModal onClose={() => setShowAddUser(false)} onDone={loadUsers} />}
    </div>
  );
}

function ChangePasswordSection() {
  const { user } = useAuth();
  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm();
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const onSubmit = async (data) => {
    setMsg(''); setErr('');
    setLoading(true);
    try {
      await api.put(`/users/${user.id}`, { password: data.password });
      setMsg('Password changed successfully.');
      reset();
    } catch (e) {
      setErr(e.response?.data?.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <h2 className="font-semibold mb-4 flex items-center gap-2"><KeyRound size={16} /> Change My Password</h2>
      {msg && <p className="text-green-600 text-sm bg-green-50 p-2 rounded mb-3">{msg}</p>}
      {err && <p className="text-red-500 text-sm bg-red-50 p-2 rounded mb-3">{err}</p>}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 max-w-sm">
        <div>
          <label className="label">New Password</label>
          <input type="password" className="input" {...register('password', { required: 'Required', minLength: { value: 6, message: 'Min 6 characters' } })} />
          {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
        </div>
        <div>
          <label className="label">Confirm Password</label>
          <input type="password" className="input" {...register('confirm', { required: 'Required', validate: v => v === watch('password') || 'Passwords do not match' })} />
          {errors.confirm && <p className="text-red-500 text-xs mt-1">{errors.confirm.message}</p>}
        </div>
        <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Saving...' : 'Update Password'}</button>
      </form>
    </div>
  );
}
