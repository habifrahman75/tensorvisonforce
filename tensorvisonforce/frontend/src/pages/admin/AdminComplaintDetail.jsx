// src/pages/admin/AdminComplaintDetail.jsx
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, CheckCircle2, XCircle, RotateCcw, User2,
  Building2, MapPin, Calendar, Clock, AlertTriangle, Cpu
} from 'lucide-react';
import { complaintApi, adminApi, workerApi } from '../../services/api';
import { MOCK_AI_RESULT, MOCK_WORKERS } from '../../data/mockData';
import { StatusBadge, PriorityBadge, CategoryBadge } from '../../components/ui/Badge';
import { AIInsightCard } from '../../components/AIInsightCard';
import { StatusTimeline } from '../../components/StatusTimeline';
import { LoadingState, ErrorState } from '../../components/ui/States';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Input';
import { formatDateTime, fromNow, departmentLabel } from '../../utils/format';
import toast from 'react-hot-toast';

export default function AdminComplaintDetail() {
  const { id } = useParams();
  const [complaint, setComplaint] = useState(null);
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedWorker, setSelectedWorker] = useState('');
  const [actionLoading, setActionLoading] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [c, w] = await Promise.all([complaintApi.getById(id), adminApi.listWorkers()]);
      setComplaint(c);
      setWorkers(w);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const doAction = async (actionFn, label, successMsg) => {
    setActionLoading(label);
    try {
      const updated = await actionFn();
      setComplaint(updated);
      toast.success(successMsg);
    } catch {
      toast.error(`Failed: ${label}`);
    } finally {
      setActionLoading('');
    }
  };

  const verify = () => doAction(() => adminApi.verifyComplaint(id), 'verify', 'Complaint verified!');
  const approve = () => doAction(() => adminApi.approveResolution(id), 'approve', 'Resolution approved!');
  const requestRework = () => doAction(() => adminApi.requestRework(id, ''), 'rework', 'Rework requested.');

  const assign = () => {
    if (!selectedWorker) { toast.error('Select a worker first.'); return; }
    const worker = workers.find(w => w.id === selectedWorker);
    doAction(
      () => complaintApi.assign(id, { worker_id: worker.id, worker_name: worker.name, department: worker.department }),
      'assign', `Assigned to ${worker.name}!`
    );
  };

  if (loading) return <LoadingState />;
  if (error || !complaint) return <ErrorState message={error || 'Not found.'} />;

  const ai = MOCK_AI_RESULT; // In production: complaint.ai_result from backend

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/admin/complaints" className="p-2 rounded-lg hover:bg-surface-muted transition-colors">
          <ArrowLeft className="w-5 h-5 text-ink-muted" />
        </Link>
        <div>
          <p className="text-xs font-mono text-ink-subtle">{complaint.complaint_number}</p>
          <h1 className="text-xl font-bold text-ink">{complaint.title}</h1>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <StatusBadge status={complaint.status} />
        <PriorityBadge priority={complaint.priority} />
        <CategoryBadge category={complaint.category} />
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Left: Details + Actions */}
        <div className="lg:col-span-2 space-y-5">
          {/* Complaint info */}
          <div className="card p-5 space-y-4">
            <h2 className="font-semibold text-ink">Complaint Information</h2>
            <p className="text-sm text-ink-muted leading-relaxed">{complaint.description}</p>
            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-surface-border">
              {[
                [MapPin,     'Location',       complaint.address || '—'],
                [Building2,  'Department',     complaint.department || departmentLabel(complaint.category)],
                [User2,      'Citizen',        complaint.citizen_name || '—'],
                [Calendar,   'Submitted',      formatDateTime(complaint.created_at)],
                [Clock,      'SLA Deadline',   complaint.sla_deadline ? formatDateTime(complaint.sla_deadline) : '—'],
                [User2,      'Assigned Worker',complaint.assigned_worker || 'Not assigned'],
              ].map(([Icon, label, value]) => (
                <div key={label} className="flex items-start gap-2">
                  <Icon className="w-4 h-4 text-ink-subtle mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-ink-subtle">{label}</p>
                    <p className="text-sm font-medium text-ink">{value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Insight */}
          <AIInsightCard result={ai} />

          {/* Admin Actions */}
          <div className="card p-5 space-y-4">
            <h2 className="font-semibold text-ink">Admin Actions</h2>

            <div className="grid sm:grid-cols-2 gap-3">
              {complaint.status === 'submitted' && (
                <Button variant="primary" size="md" loading={actionLoading === 'verify'} onClick={verify}>
                  <CheckCircle2 className="w-4 h-4" /> Verify Complaint
                </Button>
              )}

              {complaint.status === 'resolved' && (
                <>
                  <Button variant="primary" size="md" loading={actionLoading === 'approve'} onClick={approve}>
                    <CheckCircle2 className="w-4 h-4" /> Approve Resolution
                  </Button>
                  <Button variant="danger" size="md" loading={actionLoading === 'rework'} onClick={requestRework}>
                    <RotateCcw className="w-4 h-4" /> Request Rework
                  </Button>
                </>
              )}
            </div>

            {/* Assign worker */}
            {['verified','assigned'].includes(complaint.status) && (
              <div className="pt-3 border-t border-surface-border space-y-3">
                <h3 className="text-sm font-semibold text-ink">Assign Field Worker</h3>
                <div className="flex gap-2">
                  <Select value={selectedWorker} onChange={e => setSelectedWorker(e.target.value)} className="flex-1">
                    <option value="">Select a worker…</option>
                    {workers.map(w => (
                      <option key={w.id} value={w.id}>{w.name} — {w.department}</option>
                    ))}
                  </Select>
                  <Button variant="secondary" size="md" loading={actionLoading === 'assign'} onClick={assign}>
                    Assign
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Timeline */}
        <div className="space-y-5">
          <div className="card p-5">
            <h2 className="font-semibold text-ink mb-4">Status Timeline</h2>
            <StatusTimeline complaint={complaint} />
          </div>
        </div>
      </div>
    </div>
  );
}
