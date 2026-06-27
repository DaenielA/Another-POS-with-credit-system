import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import api from '../api/axios';
import { Store } from 'lucide-react';

export default function MemberLogin() {
  const { register, handleSubmit, formState: { errors } } = useForm();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (data) => {
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/member-portal/login', { phone: data.phone, pin: data.pin });
      if (res.data.success) {
        localStorage.setItem('member_token', res.data.data.token);
        localStorage.setItem('member', JSON.stringify(res.data.data.member));
        navigate('/member-portal');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-8">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-green-600 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Store size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Member Portal</h1>
          <p className="text-gray-500 text-sm mt-1">Sign in with your phone and PIN</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">{error}</div>}
          <div>
            <label className="label">Phone Number</label>
            <input
              type="text"
              className="input"
              placeholder="09XX-XXX-XXXX"
              {...register('phone', { required: 'Phone number is required' })}
            />
            {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>}
          </div>
          <div>
            <label className="label">PIN</label>
            <input
              type="password"
              className="input"
              placeholder="Enter your PIN"
              maxLength={8}
              {...register('pin', { required: 'PIN is required' })}
            />
            {errors.pin && <p className="text-red-500 text-xs mt-1">{errors.pin.message}</p>}
          </div>
          <button type="submit" className="btn-primary w-full mt-2" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="text-center mt-6">
          <Link to="/login" className="text-xs text-blue-600 hover:text-blue-700 font-medium">← Staff login</Link>
        </div>
      </div>
    </div>
  );
}
