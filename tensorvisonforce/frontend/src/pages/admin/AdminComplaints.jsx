// src/pages/admin/AdminComplaints.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter } from 'lucide-react';
import { complaintApi } from '../../services/api';
import { StatusBadge, PriorityBadge, CategoryBadge } from '../../components/ui/Badge';
import { LoadingState, ErrorState, NoResults, EmptyState } from '../../components/ui/States';
import { Select } from '../../components/ui/Input';
import { fromNow } from '../../utils/format';

export default function AdminComplaints() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterCategory, setFilterCategory] = useState('');

  useEffect(() => {
    complaintApi.list()
      .then(setComplaints)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  const filtered = complaints.filter(c => {
    if (filterStatus && c.status !== filterStatus) return false;
    if (filterPriority && c.priority !== filterPriority) return false;
    if (filterCategory && c.category !== filterCategory) return false;
    if (search) {
      const q = search.toLowerCase();
      return c.title.toLowerCase().includes(q) ||
             c.complaint_number.toLowerCase().includes(q) ||
             (c.address || '').toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="page-title">All Complaints</h1>
        <p className="text-ink-muted text-sm mt-1">{complaints.length} total • {filtered.length} shown</p>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-[200px] border border-surface-border rounded-lg px-3 py-2 bg-white">
            <Search className="w-4 h-4 text-ink-subtle" />
            <input className="flex-1 text-sm outline-none" placeholder="Search complaints…"
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="text-sm py-2">
            <option value="">All Statuses</option>
            <option value="submitted">Submitted</option>
            <option value="verified">Verified</option>
            <option value="assigned">Assigned</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="rework_required">Rework Required</option>
          </Select>
          <Select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} className="text-sm py-2">
            <option value="">All Priorities</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </Select>
          <Select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="text-sm py-2">
            <option value="">All Categories</option>
            <option value="road_damage">Road Damage</option>
            <option value="garbage">Garbage</option>
            <option value="streetlight">Streetlight</option>
            <option value="drainage">Drainage</option>
            <option value="water_supply">Water Supply</option>
            <option value="other">Other</option>
          </Select>
        </div>
      </div>

      {/* Table */}
      {complaints.length === 0 ? (
        <EmptyState title="No complaints in the system" />
      ) : filtered.length === 0 ? (
        <NoResults />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-muted border-b border-surface-border">
                  {['ID','Title','Category','Priority','Status','Department','Citizen','Date','Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-ink-muted uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {filtered.map(c => (
                  <tr key={c.id} className="hover:bg-surface-muted/50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-ink-subtle whitespace-nowrap">{c.complaint_number}</td>
                    <td className="px-4 py-3 max-w-[180px]">
                      <p className="font-medium text-ink truncate text-xs">{c.title}</p>
                    </td>
                    <td className="px-4 py-3"><CategoryBadge category={c.category} /></td>
                    <td className="px-4 py-3"><PriorityBadge priority={c.priority} /></td>
                    <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                    <td className="px-4 py-3 text-xs text-ink-muted whitespace-nowrap">{c.department || '—'}</td>
                    <td className="px-4 py-3 text-xs text-ink-muted">{c.citizen_name || '—'}</td>
                    <td className="px-4 py-3 text-xs text-ink-subtle whitespace-nowrap">{fromNow(c.created_at)}</td>
                    <td className="px-4 py-3">
                      <Link to={`/admin/complaints/${c.id}`}
                        className="text-xs font-medium text-brand-600 hover:underline whitespace-nowrap">
                        Review →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
