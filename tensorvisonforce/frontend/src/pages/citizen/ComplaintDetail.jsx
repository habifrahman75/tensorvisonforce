// src/pages/citizen/ComplaintDetail.jsx — full detail + timeline + feedback
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, MapPin, Calendar, User, Building2, Clock,
  Star, CheckCircle2, XCircle, Image as ImageIcon
} from 'lucide-react';
import { complaintApi, feedbackApi } from '../../services/api';
import { StatusBadge, PriorityBadge, CategoryBadge } from '../../components/ui/Badge';
import { StatusTimeline } from '../../components/StatusTimeline';
import { LoadingState, ErrorState } from '../../components/ui/States';
import { Button } from '../../components/ui/Button';
import { Textarea } from '../../components/ui/Input';
import { formatDateTime, fromNow, departmentLabel } from '../../utils/format';
import toast from 'react-hot-toast';

function FeedbackPanel({ complaint }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [resolved, setResolved] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  if (complaint.status !== 'resolved') return null;

  if (submitted) {
    return (
      <div className="card p-5 text-center">
        <CheckCircle2 className="w-8 h-8 text-green-600 mx-auto mb-2" />
        <p className="font-semibold text-ink">Thank you for your feedback!</p>
        <p className="text-sm text-ink-muted mt-1">Your response helps improve civic services.</p>
      </div>
    );
  }

  const submit = async () => {
    if (rating === 0) { toast.error('Please select a rating.'); return; }
    setLoading(true);
    try {
      await feedbackApi.submit(complaint.id, { resolved, rating, comment });
      setSubmitted(true);
      toast.success('Feedback submitted!');
    } catch {
      toast.error('Could not submit feedback.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card p-5 space-y-4">
      <h3 className="font-semibold text-ink">Was your issue actually resolved?</h3>
      <div className="flex gap-3">
        <button
          onClick={() => setResolved(true)}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 text-sm font-semibold transition-colors
            ${resolved === true ? 'border-green-500 bg-green-50 text-green-700' : 'border-surface-border hover:border-green-300'}`}
        >
          <CheckCircle2 className="w-4 h-4" /> YES — Resolved
        </button>
        <button
          onClick={() => setResolved(false)}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 text-sm font-semibold transition-colors
            ${resolved === false ? 'border-red-500 bg-red-50 text-red-700' : 'border-surface-border hover:border-red-300'}`}
        >
          <XCircle className="w-4 h-4" /> NO — Still not resolved
        </button>
      </div>

      <div>
        <p className="text-sm font-medium text-ink mb-2">Rating</p>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map(n => (
            <button key={n} onClick={() => setRating(n)} aria-label={`Rate ${n} stars`}>
              <Star className={`w-8 h-8 transition-colors ${n <= rating ? 'text-amber-400 fill-amber-400' : 'text-surface-border hover:text-amber-300'}`} />
            </button>
          ))}
        </div>
      </div>

      <Textarea
        label="Comments (optional)"
        rows={3}
        value={comment}
        onChange={e => setComment(e.target.value)}
        placeholder="Tell us about your experience…"
      />
      <Button variant="primary" size="md" loading={loading} onClick={submit} className="w-full">
        Submit Feedback
      </Button>
    </div>
  );
}

export default function ComplaintDetail() {
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
    <div className="max-w-3xl mx-auto space-y-5 animate-fade-in">
      <div className="flex items-center gap-3">
        <Link to="/citizen/complaints" className="p-2 rounded-lg hover:bg-surface-muted transition-colors">
          <ArrowLeft className="w-5 h-5 text-ink-muted" />
        </Link>
        <div>
          <p className="text-xs font-mono text-ink-subtle">{complaint.complaint_number}</p>
          <h1 className="text-xl font-bold text-ink leading-tight">{complaint.title}</h1>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <StatusBadge status={complaint.status} />
        <PriorityBadge priority={complaint.priority} />
        <CategoryBadge category={complaint.category} />
      </div>

      <div className="grid md:grid-cols-3 gap-5">
        {/* Main */}
        <div className="md:col-span-2 space-y-5">
          {/* Details card */}
          <div className="card p-5 space-y-4">
            <h2 className="font-semibold text-ink">Complaint Details</h2>
            <p className="text-sm text-ink-muted leading-relaxed">{complaint.description}</p>
            <div className="grid grid-cols-2 gap-3 pt-2">
              {[
                [MapPin,     'Location', complaint.address],
                [Building2,  'Department', complaint.department || departmentLabel(complaint.category)],
                [User,       'Assigned Worker', complaint.assigned_worker || 'Not yet assigned'],
                [Calendar,   'Submitted', formatDateTime(complaint.created_at)],
                [Clock,      'SLA Deadline', complaint.sla_deadline ? formatDateTime(complaint.sla_deadline) : '—'],
              ].map(([Icon, label, value]) => (
                <div key={label} className="flex items-start gap-2">
                  <Icon className="w-4 h-4 text-ink-subtle mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-ink-subtle">{label}</p>
                    <p className="text-sm font-medium text-ink">{value || '—'}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Before / After */}
          {(complaint.before_image_url || complaint.after_image_url) && (
            <div className="card p-5">
              <h2 className="font-semibold text-ink mb-3 flex items-center gap-2">
                <ImageIcon className="w-4 h-4" /> Resolution Evidence
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {complaint.before_image_url && (
                  <div>
                    <p className="text-xs text-ink-subtle mb-1">Before</p>
                    <img src={complaint.before_image_url} alt="Before" className="w-full rounded-lg border border-surface-border object-cover aspect-video" />
                  </div>
                )}
                {complaint.after_image_url && (
                  <div>
                    <p className="text-xs text-ink-subtle mb-1">After</p>
                    <img src={complaint.after_image_url} alt="After" className="w-full rounded-lg border border-surface-border object-cover aspect-video" />
                  </div>
                )}
              </div>
            </div>
          )}

          <FeedbackPanel complaint={complaint} />
        </div>

        {/* Sidebar: timeline */}
        <div className="card p-5">
          <h2 className="font-semibold text-ink mb-4">Status Timeline</h2>
          <StatusTimeline complaint={complaint} />
        </div>
      </div>
    </div>
  );
}
