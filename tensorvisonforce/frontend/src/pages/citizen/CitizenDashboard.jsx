// src/pages/citizen/CitizenDashboard.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, FileText, Clock, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { complaintApi } from '../../services/api';
import { MetricCard } from '../../components/ui/Card';
import { ComplaintCard } from '../../components/ComplaintCard';
import { LoadingState, ErrorState, EmptyState } from '../../components/ui/States';
import { Button } from '../../components/ui/Button';

export default function CitizenDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [s, c] = await Promise.all([
        complaintApi.citizenStats(user.id),
        complaintApi.list({ citizen_id: user.id }),
      ]);
      setStats(s);
      setComplaints(c.slice(0, 5));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading) return <LoadingState message="Loading your dashboard…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="page-title">
            Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'},&nbsp;
            {user?.full_name?.split(' ')[0] || 'Citizen'} 👋
          </h1>
          <p className="text-ink-muted text-sm mt-1">Track and manage your civic complaints</p>
        </div>
        <Link to="/citizen/report">
          <Button variant="primary" size="md">
            <Plus className="w-4 h-4" /> Report Issue
          </Button>
        </Link>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Total Complaints" value={stats?.total ?? 0} icon={FileText} color="blue" />
        <MetricCard title="Pending"          value={(stats?.submitted ?? 0) + (stats?.in_progress ?? 0)} icon={Clock} color="amber" />
        <MetricCard title="In Progress"      value={stats?.in_progress ?? 0} icon={RefreshCw} color="violet" />
        <MetricCard title="Resolved"         value={stats?.resolved ?? 0} icon={CheckCircle2} color="green" />
      </div>

      {/* Recent */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-title">Recent Complaints</h2>
          <Link to="/citizen/complaints" className="text-sm text-brand-600 hover:underline font-medium">
            View all →
          </Link>
        </div>
        {complaints.length === 0 ? (
          <EmptyState
            title="No complaints yet"
            description="Report your first civic issue and we'll handle the rest."
            action={
              <Link to="/citizen/report">
                <Button variant="primary" size="md"><Plus className="w-4 h-4" /> Report Your First Issue</Button>
              </Link>
            }
          />
        ) : (
          <div className="space-y-3">
            {complaints.map(c => (
              <ComplaintCard key={c.id} complaint={c} linkPrefix="/citizen/complaint" />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
