// src/pages/auth/Register.jsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Zap, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { Input, Select } from '../../components/ui/Input';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', password: '', role: 'citizen' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setLoading(true);
    try {
      const user = await register(form);
      const home = user.role === 'admin' ? '/admin/dashboard'
                 : user.role === 'field_worker' ? '/worker/dashboard'
                 : '/citizen/dashboard';
      navigate(home, { replace: true });
    } catch (err) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md animate-slide-up">
        <div className="card p-8">
          <div className="text-center mb-8">
            <div className="w-12 h-12 bg-brand-600 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-ink">Create account</h1>
            <p className="text-ink-muted text-sm mt-1">Join CivicPulse and help build a better city</p>
          </div>

          {error && (
            <div className="mb-4 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Full Name" id="full_name" name="full_name" required
              value={form.full_name} onChange={set('full_name')} placeholder="Priya Sharma"
            />
            <Input
              label="Email address" type="email" id="email" name="email" required
              value={form.email} onChange={set('email')} placeholder="you@example.com"
            />
            <Input
              label="Phone Number" type="tel" id="phone" name="phone"
              value={form.phone} onChange={set('phone')} placeholder="+91 98765 43210"
            />
            <Input
              label="Password" type="password" id="password" name="password" required
              value={form.password} onChange={set('password')} placeholder="At least 6 characters"
            />
            <Select
              label="I am registering as" id="role" name="role"
              value={form.role} onChange={set('role')}
            >
              <option value="citizen">Citizen</option>
              <option value="admin">Admin / Authority</option>
              <option value="field_worker">Field Worker</option>
            </Select>

            <Button type="submit" variant="primary" size="lg" loading={loading} className="w-full">
              Create Account
            </Button>
          </form>

          <p className="text-center text-sm text-ink-muted mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-brand-600 font-medium hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
