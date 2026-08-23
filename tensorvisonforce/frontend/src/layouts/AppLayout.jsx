// src/layouts/AppLayout.jsx — Shared layout for Citizen / Admin / Field Worker
import { useState } from 'react';
import { Outlet, Link, NavLink, useNavigate } from 'react-router-dom';
import {
  Zap, LayoutDashboard, FileText, Map, Users, LogOut, Menu, X,
  ChevronRight, Bell, Plus, Briefcase, ClipboardList
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { cn } from '../utils/cn';

const NAV_ITEMS = {
  citizen: [
    { to: '/citizen/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/citizen/complaints', icon: FileText, label: 'My Complaints' },
    { to: '/citizen/report',    icon: Plus,           label: 'Report Issue' },
  ],
  admin: [
    { to: '/admin/dashboard',    icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/admin/complaints',   icon: ClipboardList,   label: 'Complaints' },
    { to: '/admin/map',          icon: Map,             label: 'Smart Map' },
    { to: '/admin/workers',      icon: Users,           label: 'Field Workers' },
  ],
  field_worker: [
    { to: '/worker/dashboard', icon: Briefcase, label: 'My Tasks' },
  ],
};

export function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = NAV_ITEMS[user?.role] || [];
  const roleLabel = user?.role === 'field_worker' ? 'Field Worker'
                  : user?.role === 'admin'         ? 'Admin'
                  :                                  'Citizen';

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const SidebarContent = () => (
    <aside className="flex flex-col h-full bg-white border-r border-surface-border">
      {/* Logo */}
      <div className="h-16 px-4 flex items-center border-b border-surface-border">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-ink">CivicPulse</span>
        </Link>
      </div>

      {/* User */}
      <div className="px-4 py-4 border-b border-surface-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center">
            <span className="text-sm font-semibold text-brand-700">
              {user?.full_name?.[0]?.toUpperCase() || '?'}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-ink truncate">{user?.full_name}</p>
            <p className="text-xs text-ink-muted">{roleLabel}</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              cn('sidebar-link', isActive ? 'sidebar-link-active' : 'sidebar-link-inactive')
            }
          >
            <Icon className="w-4 h-4" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div className="px-3 pb-4 border-t border-surface-border pt-3">
        <button
          onClick={handleLogout}
          className="sidebar-link sidebar-link-inactive w-full text-red-600 hover:bg-red-50 hover:text-red-700"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-surface-muted">
      {/* Desktop sidebar */}
      <div className="hidden md:flex md:w-60 md:flex-col flex-shrink-0">
        <SidebarContent />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
          style={{ background: 'rgba(0,0,0,0.4)' }}
        />
      )}
      <div className={cn(
        'fixed inset-y-0 left-0 z-50 w-64 md:hidden transition-transform duration-300',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <SidebarContent />
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile topbar */}
        <header className="h-16 bg-white border-b border-surface-border flex items-center px-4 md:px-6 gap-4">
          <button
            className="md:hidden p-2 -ml-2 rounded-lg hover:bg-surface-muted"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Toggle sidebar"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div className="md:hidden flex items-center gap-2">
            <div className="w-6 h-6 bg-brand-600 rounded flex items-center justify-center">
              <Zap className="w-3 h-3 text-white" />
            </div>
            <span className="font-bold text-ink text-sm">CivicPulse</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {user?.role === 'citizen' && (
              <Link to="/citizen/report" className="btn btn-primary btn-sm hidden sm:inline-flex">
                <Plus className="w-4 h-4" /> Report Issue
              </Link>
            )}
            <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center">
              <span className="text-xs font-semibold text-brand-700">
                {user?.full_name?.[0]?.toUpperCase() || '?'}
              </span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
