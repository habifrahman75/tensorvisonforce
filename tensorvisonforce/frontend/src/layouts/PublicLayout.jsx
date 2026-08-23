// src/layouts/PublicLayout.jsx
import { Outlet } from 'react-router-dom';
import { Zap } from 'lucide-react';
import { Link } from 'react-router-dom';

export function PublicLayout() {
  return (
    <div className="min-h-screen bg-surface-muted">
      <nav className="bg-white border-b border-surface-border sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center group-hover:bg-brand-700 transition-colors">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="font-bold text-ink text-lg leading-none">CivicPulse</span>
              <span className="block text-[10px] text-ink-subtle leading-none font-medium tracking-wide">HS082-TVF</span>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/login" className="btn btn-ghost btn-sm">Sign In</Link>
            <Link to="/register" className="btn btn-primary btn-sm">Get Started</Link>
          </div>
        </div>
      </nav>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
