// src/pages/admin/AdminDashboard.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText, Clock, CheckCircle2, AlertTriangle,
  TrendingUp, BarChart2
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line
} from 'recharts';
import { adminApi, complaintApi } from '../../services/api';
import { MetricCard } from '../../components/ui/Card';
import { StatusBadge, PriorityBadge, CategoryBadge } from '../../components/ui/Badge';
import { LoadingState, ErrorState } from '../../components/ui/States';
import { fromNow } from '../../utils/format';


const COLORS = { high: '#ef4444', medium: '#f59e0b', low: '#22c55e' };
const STATUS_COLORS = {
  submitted: '#0ea5e9', verified: '#10b981', assigned: '#8b5cf6',
  in_progress: '#f97316', resolved: '#16a34a', rework_required: '#f43f5e',
};

function ChartCard({ title, children, className = '' }) {
  return (
    <div className={`card p-5 ${className}`}>
      <p className="section-title mb-4">{title}</p>
      {children}
    </div>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([adminApi.stats(), complaintApi.list()])
      .then(([s, c]) => { setStats(s); setRecent(c.slice(0, 8)); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  // Chart data
  const categoryData = [
    { name: 'Road', value: 38 }, { name: 'Garbage', value: 28 },
    { name: 'Light', value: 18 }, { name: 'Drainage', value: 22 },
    { name: 'Water', value: 24 }, { name: 'Other', value: 12 },
  ];
  const statusData = [
    { name: 'Submitted', value: stats.submitted, color: STATUS_COLORS.submitted },
    { name: 'Verified',  value: stats.verified,  color: STATUS_COLORS.verified },
    { name: 'Assigned',  value: stats.assigned,  color: STATUS_COLORS.assigned },
    { name: 'In Progress', value: stats.in_progress, color: STATUS_COLORS.in_progress },
    { name: 'Resolved',  value: stats.resolved,  color: STATUS_COLORS.resolved },
  ];
  const priorityData = [
    { name: 'High',   value: stats.high_priority,   fill: COLORS.high },
    { name: 'Medium', value: stats.medium_priority, fill: COLORS.medium },
    { name: 'Low',    value: stats.low_priority,    fill: COLORS.low },
  ];
  const trendData = Array.from({ length: 7 }, (_, i) => ({
    day: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][i],
    submitted: Math.floor(Math.random() * 25) + 5,
    resolved:  Math.floor(Math.random() * 20) + 3,
  }));

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="page-title">Admin Dashboard</h1>
        <p className="text-ink-muted text-sm mt-1">Overview of all civic complaints across the city</p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <MetricCard title="Total"       value={stats.total}       icon={FileText}     color="blue"   />
        <MetricCard title="Pending"     value={stats.submitted}   icon={Clock}        color="amber"  />
        <MetricCard title="In Progress" value={stats.in_progress} icon={TrendingUp}   color="violet" />
        <MetricCard title="Resolved"    value={stats.resolved}    icon={CheckCircle2} color="green"  />
        <MetricCard title="High Priority" value={stats.high_priority} icon={AlertTriangle} color="red" />
      </div>

      {/* Charts row 1 */}
      <div className="grid lg:grid-cols-2 gap-5">
        <ChartCard title="Complaints by Category">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={categoryData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Bar dataKey="value" fill="#3b82f6" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Priority Distribution">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={priorityData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                {priorityData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Pie>
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Charts row 2 */}
      <div className="grid lg:grid-cols-2 gap-5">
        <ChartCard title="Status Distribution">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={statusData} layout="vertical" margin={{ left: 30, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} width={80} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Bar dataKey="value" radius={[0,4,4,0]}>
                {statusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Complaints Over Time (This Week)">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={trendData} margin={{ top: 0, right: 10, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#64748b' }} />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="submitted" stroke="#3b82f6" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="resolved"  stroke="#22c55e" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Recent complaints table */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-surface-border flex items-center justify-between">
          <h2 className="section-title">Recent Complaints</h2>
          <Link to="/admin/complaints" className="text-sm text-brand-600 hover:underline font-medium">View all →</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-muted border-b border-surface-border">
                {['ID','Category','Location','Priority','Department','Status','Date',''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-ink-muted uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {recent.map(c => (
                <tr key={c.id} className="hover:bg-surface-muted/50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-ink-muted">{c.complaint_number}</td>
                  <td className="px-4 py-3"><CategoryBadge category={c.category} /></td>
                  <td className="px-4 py-3 text-xs text-ink-muted max-w-[140px] truncate">{c.address}</td>
                  <td className="px-4 py-3"><PriorityBadge priority={c.priority} /></td>
                  <td className="px-4 py-3 text-xs text-ink-muted">{c.department || '—'}</td>
                  <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                  <td className="px-4 py-3 text-xs text-ink-subtle">{fromNow(c.created_at)}</td>
                  <td className="px-4 py-3">
                    <Link to={`/admin/complaints/${c.id}`} className="text-xs text-brand-600 font-medium hover:underline">View</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
