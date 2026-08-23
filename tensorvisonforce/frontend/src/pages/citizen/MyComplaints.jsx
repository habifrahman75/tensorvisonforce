// src/pages/citizen/MyComplaints.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Filter } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { complaintApi } from '../../services/api';
import { ComplaintCard } from '../../components/ComplaintCard';
import { LoadingState, ErrorState, EmptyState, NoResults } from '../../components/ui/States';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Input';

export default function MyComplaints() {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');

  useEffect(() => {
    complaintApi.list({ citizen_id: user.id })
      .then(setComplaints)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  const filtered = complaints.filter(c => {
    if (filterStatus && c.status !== filterStatus) return false;
    if (filterPriority && c.priority !== filterPriority) return false;
    if (search && !c.title.toLowerCase().includes(search.toLowerCase()) &&
                  !c.complaint_number.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="page-title">My Complaints</h1>
          <p className="text-ink-muted text-sm mt-1">{complaints.length} total complaints</p>
        </div>
        <Link to="/citizen/report">
          <Button variant="primary" size="md"><Plus className="w-4 h-4" /> New Report</Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 p-4 bg-white rounded-xl border border-surface-border">
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-ink-subtle flex-shrink-0" />
          <input
            className="flex-1 text-sm outline-none placeholder:text-ink-subtle"
            placeholder="Search by title or ID…"
            value={search} onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="text-sm py-1.5">
          <option value="">All Statuses</option>
          <option value="submitted">Submitted</option>
          <option value="verified">Verified</option>
          <option value="assigned">Assigned</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
          <option value="rework_required">Rework Required</option>
        </Select>
        <Select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} className="text-sm py-1.5">
          <option value="">All Priorities</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </Select>
      </div>

      {complaints.length === 0 ? (
        <EmptyState
          title="No complaints yet"
          description="Submit your first civic complaint and track it in real time."
          action={<Link to="/citizen/report"><Button variant="primary"><Plus className="w-4 h-4" /> Report Issue</Button></Link>}
        />
      ) : filtered.length === 0 ? (
        <NoResults />
      ) : (
        <div className="space-y-3">
          {filtered.map(c => (
            <ComplaintCard key={c.id} complaint={c} linkPrefix="/citizen/complaint" />
          ))}
        </div>
      )}
    </div>
  );
}
