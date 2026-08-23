// src/pages/auth/Login.jsx
import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Zap, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

const DEMO_ACCOUNTS = [
  { label: 'Citizen Demo',     email: 'citizen@demo.com',    pw: 'demo1234', role: 'citizen' },
  { label: 'Admin Demo',       email: 'admin@demo.com',      pw: 'demo1234', role: 'admin' },
  { label: 'Field Worker Demo',email: 'worker@demo.com',     pw: 'demo1234', role: 'field_worker' },
];

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const from = location.state?.from?.pathname;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(email, password);
      const redirect = from || (
        user.role === 'admin'        ? '/admin/dashboard' :
        user.role === 'field_worker' ? '/worker/dashboard' :
                                       '/citizen/dashboard'
      );
      navigate(redirect, { replace: true });
    } catch (err) {
      setError(err.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (acc) => {
    setEmail(acc.email);
    setPassword(acc.pw);
    setError('');
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md animate-slide-up">
        {/* Card */}
        <div className="card p-8">
          <div className="text-center mb-8">
            <div className="w-12 h-12 bg-brand-600 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-ink">Welcome back</h1>
            <p className="text-ink-muted text-sm mt-1">Sign in to your CivicPulse account</p>
          </div>

          {/* Demo accounts */}
          <div className="mb-6 p-4 bg-brand-50 rounded-xl border border-brand-200">
            <p className="text-xs font-semibold text-brand-700 mb-2 uppercase tracking-wide">Demo Accounts</p>
            <div className="grid grid-cols-1 gap-2">
              {DEMO_ACCOUNTS.map(acc => (
                <button
                  key={acc.role}
                  type="button"
                  onClick={() => fillDemo(acc)}
                  className="flex items-center justify-between px-3 py-2 bg-white rounded-lg border border-brand-200 hover:border-brand-400 transition-colors text-left"
                >
                  <span className="text-xs font-medium text-ink">{acc.label}</span>
                  <span className="text-xs text-ink-muted font-mono">{acc.email}</span>
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="mb-4 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email address"
              type="email"
              id="email"
              name="email"
              autoComplete="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
            />

            <div className="space-y-1.5">
              <label className="label" htmlFor="password">
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPw ? 'text' : 'password'}
                  className="input pr-10"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-subtle hover:text-ink"
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" variant="primary" size="lg" loading={loading} className="w-full">
              Sign In
            </Button>
          </form>

          <p className="text-center text-sm text-ink-muted mt-6">
            Don't have an account?{' '}
            <Link to="/register" className="text-brand-600 font-medium hover:underline">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
