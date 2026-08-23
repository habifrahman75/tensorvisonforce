// src/pages/citizen/ComplaintSuccess.jsx — shown after submission
import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle2, FileText, MapPin, Clock, ArrowRight, Share2 } from 'lucide-react';
import { complaintApi } from '../../services/api';
import { StatusBadge, PriorityBadge, CategoryBadge } from '../../components/ui/Badge';
import { LoadingState, ErrorState } from '../../components/ui/States';
import { formatDateTime, categoryLabel, departmentLabel } from '../../utils/format';
import { Button } from '../../components/ui/Button';

export default function ComplaintSuccess() {
  const { id } = useParams();
  const [complaint, setComplaint] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    complaintApi.getById(id)
      .then(setComplaint)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <LoadingState />;
  if (error || !complaint) return <ErrorState message={error || 'Complaint not found.'} />;

  return (
    <div className="max-w-lg mx-auto animate-slide-up py-8">
      {/* Success banner */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-9 h-9 text-green-600" />
        </div>
        <h1 className="text-2xl font-bold text-ink">Complaint Submitted!</h1>
        <p className="text-ink-muted mt-2">Your issue has been recorded and is being processed by our AI pipeline.</p>
      </div>

      {/* Complaint ID banner */}
      <div className="bg-brand-700 rounded-xl p-5 mb-5 text-center">
        <p className="text-blue-200 text-xs font-semibold uppercase tracking-widest mb-1">Complaint ID</p>
        <p className="text-2xl font-mono font-bold text-white">{complaint.complaint_number}</p>
        <p className="text-xs text-blue-300 mt-1">Save this ID to track your complaint</p>
      </div>

      {/* Details */}
      <div className="card divide-y divide-surface-border mb-5">
        {[
          ['Title',      complaint.title],
          ['Category',   <CategoryBadge category={complaint.category} />],
          ['Priority',   <PriorityBadge priority={complaint.priority} />],
          ['Status',     <StatusBadge status={complaint.status} />],
          ['Department', complaint.department || departmentLabel(complaint.category)],
          ['Submitted',  formatDateTime(complaint.created_at)],
        ].map(([k, v]) => (
          <div key={k} className="flex items-center justify-between px-5 py-3.5">
            <span className="text-sm text-ink-muted">{k}</span>
            <span className="text-sm font-medium text-ink">{v}</span>
          </div>
        ))}
        {complaint.address && (
          <div className="flex items-start gap-2 px-5 py-3.5">
            <MapPin className="w-4 h-4 text-ink-subtle mt-0.5" />
            <p className="text-sm text-ink-muted">{complaint.address}</p>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <Link to={`/citizen/complaint/${complaint.id}`}>
          <Button variant="primary" size="lg" className="w-full">
            <FileText className="w-4 h-4" /> Track This Complaint <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
        <Link to="/citizen/dashboard">
          <Button variant="secondary" size="lg" className="w-full">
            Back to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}
