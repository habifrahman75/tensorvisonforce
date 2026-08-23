// src/pages/worker/WorkerDashboard.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Briefcase, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { workerApi } from '../../services/api';
import { StatusBadge, PriorityBadge, CategoryBadge } from '../../components/ui/Badge';
import { LoadingState, ErrorState, EmptyState } from '../../components/ui/States';
import { fromNow } from '../../utils/format';

export default function WorkerDashboard() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    workerApi.myComplaints(user.id)
      .then(setTasks)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  const pending     = tasks.filter(t => t.status === 'assigned');
  const inProgress  = tasks.filter(t => t.status === 'in_progress');
  const completed   = tasks.filter(t => t.status === 'resolved' || t.status === 'rework_required');

  const Section = ({ title, items, icon: Icon, empty }) => (
    <div>
      <h2 className="section-title flex items-center gap-2 mb-3">
        <Icon className="w-5 h-5 text-ink-muted" /> {title}
        <span className="ml-1 text-xs font-normal text-ink-subtle">({items.length})</span>
      </h2>
      {items.length === 0 ? (
        <p className="text-sm text-ink-subtle py-4 text-center">{empty}</p>
      ) : (
        <div className="space-y-3">
          {items.map(t => (
            <Link key={t.id} to={`/worker/complaint/${t.id}`}
              className="card block p-4 hover:shadow-card-hover transition-shadow group">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-mono text-ink-subtle">{t.complaint_number}</p>
                  <p className="font-semibold text-ink text-sm mt-0.5 group-hover:text-brand-700 transition-colors">{t.title}</p>
                  <p className="text-xs text-ink-muted mt-1 truncate max-w-xs">{t.address}</p>
                </div>
                <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                  <StatusBadge status={t.status} />
                  <PriorityBadge priority={t.priority} />
                </div>
              </div>
              <div className="flex items-center gap-3 mt-3 text-xs text-ink-subtle">
                <CategoryBadge category={t.category} />
                <span className="ml-auto flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> {fromNow(t.updated_at)}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-7 animate-fade-in">
      <div>
        <h1 className="page-title">My Tasks</h1>
        <p className="text-ink-muted text-sm mt-1">
          Welcome, {user?.full_name?.split(' ')[0]}. You have {pending.length + inProgress.length} active tasks.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Assigned',    value: pending.length,    color: 'text-amber-600' },
          { label: 'In Progress', value: inProgress.length, color: 'text-brand-600' },
          { label: 'Completed',   value: completed.length,  color: 'text-green-600' },
        ].map(s => (
          <div key={s.label} className="card p-4 text-center">
            <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-ink-muted mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <Section title="Assigned to Me" items={pending}    icon={AlertCircle} empty="No new assignments." />
      <Section title="In Progress"    items={inProgress} icon={Clock}        empty="No tasks in progress." />
      <Section title="Completed"      items={completed}  icon={CheckCircle2} empty="No completed tasks yet." />
    </div>
  );
}
