// src/pages/worker/WorkerComplaintDetail.jsx
import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, Upload, CheckCircle2, Camera, Image as ImageIcon } from 'lucide-react';
import { complaintApi, workerApi } from '../../services/api';
import { StatusBadge, PriorityBadge, CategoryBadge } from '../../components/ui/Badge';
import { StatusTimeline } from '../../components/StatusTimeline';
import { Button } from '../../components/ui/Button';
import { Textarea } from '../../components/ui/Input';
import { LoadingState, ErrorState } from '../../components/ui/States';
import { formatDateTime, departmentLabel } from '../../utils/format';
import { MapPin, Building2, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';

export default function WorkerComplaintDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const beforeRef = useRef(null);
  const afterRef = useRef(null);

  const [complaint, setComplaint] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [beforeImg, setBeforeImg] = useState(null);
  const [afterImg, setAfterImg] = useState(null);
  const [beforePreview, setBeforePreview] = useState('');
  const [afterPreview, setAfterPreview] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    complaintApi.getById(id)
      .then(setComplaint)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  const startWork = async () => {
    setStarting(true);
    try {
      const updated = await workerApi.startWork(id);
      setComplaint(updated);
      toast.success('Marked as In Progress!');
    } catch { toast.error('Failed to start work.'); }
    finally { setStarting(false); }
  };

  const handleBeforeFile = (file) => { setBeforeImg(file); setBeforePreview(URL.createObjectURL(file)); };
  const handleAfterFile  = (file) => { setAfterImg(file);  setAfterPreview(URL.createObjectURL(file)); };

  const submit = async () => {
    if (!beforeImg || !afterImg) { toast.error('Upload both before and after photos.'); return; }
    setSubmitting(true);
    try {
      await workerApi.submitResolution(id, { note, before: beforeImg, after: afterImg });
      toast.success('Resolution submitted for admin review!');
      navigate('/worker/dashboard');
    } catch { toast.error('Failed to submit resolution.'); }
    finally { setSubmitting(false); }
  };

  if (loading) return <LoadingState />;
  if (error || !complaint) return <ErrorState message={error || 'Not found.'} />;

  return (
    <div className="max-w-2xl mx-auto space-y-5 animate-fade-in">
      <div className="flex items-center gap-3">
        <Link to="/worker/dashboard" className="p-2 rounded-lg hover:bg-surface-muted transition-colors">
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

      <div className="grid md:grid-cols-5 gap-5">
        {/* Main */}
        <div className="md:col-span-3 space-y-5">
          {/* Details */}
          <div className="card p-5 space-y-3">
            <h2 className="font-semibold text-ink">Complaint Details</h2>
            <p className="text-sm text-ink-muted leading-relaxed">{complaint.description}</p>
            <div className="space-y-2 pt-2 border-t border-surface-border">
              {[
                [MapPin,    complaint.address || '—'],
                [Building2, complaint.department || departmentLabel(complaint.category)],
                [Calendar,  formatDateTime(complaint.created_at)],
              ].map(([Icon, value]) => (
                <div key={value} className="flex items-start gap-2 text-sm text-ink-muted">
                  <Icon className="w-4 h-4 mt-0.5 flex-shrink-0 text-ink-subtle" />
                  {value}
                </div>
              ))}
            </div>
          </div>

          {/* Start work */}
          {complaint.status === 'assigned' && (
            <div className="card p-5 space-y-3">
              <h2 className="font-semibold text-ink">Start Working</h2>
              <p className="text-sm text-ink-muted">Mark this complaint as In Progress to begin.</p>
              <Button variant="primary" size="md" loading={starting} onClick={startWork}>
                <Play className="w-4 h-4" /> Start Work
              </Button>
            </div>
          )}

          {/* Submit resolution */}
          {complaint.status === 'in_progress' && (
            <div className="card p-5 space-y-4">
              <h2 className="font-semibold text-ink">Submit Resolution</h2>

              {/* Before */}
              <div>
                <label className="label">Before Photo <span className="text-red-500">*</span></label>
                <div
                  className="border-2 border-dashed rounded-xl p-4 text-center cursor-pointer hover:border-brand-300 hover:bg-surface-muted transition-colors"
                  onClick={() => beforeRef.current?.click()}
                  role="button" tabIndex={0} aria-label="Upload before photo"
                >
                  <input ref={beforeRef} type="file" accept="image/*" className="hidden"
                    onChange={e => handleBeforeFile(e.target.files[0])} />
                  {beforePreview
                    ? <img src={beforePreview} alt="Before" className="max-h-36 mx-auto rounded-lg" />
                    : <><Camera className="w-8 h-8 text-ink-subtle mx-auto mb-1" /><p className="text-sm text-ink-muted">Tap to upload Before photo</p></>}
                </div>
              </div>

              {/* After */}
              <div>
                <label className="label">After Photo <span className="text-red-500">*</span></label>
                <div
                  className="border-2 border-dashed rounded-xl p-4 text-center cursor-pointer hover:border-brand-300 hover:bg-surface-muted transition-colors"
                  onClick={() => afterRef.current?.click()}
                  role="button" tabIndex={0} aria-label="Upload after photo"
                >
                  <input ref={afterRef} type="file" accept="image/*" className="hidden"
                    onChange={e => handleAfterFile(e.target.files[0])} />
                  {afterPreview
                    ? <img src={afterPreview} alt="After" className="max-h-36 mx-auto rounded-lg" />
                    : <><ImageIcon className="w-8 h-8 text-ink-subtle mx-auto mb-1" /><p className="text-sm text-ink-muted">Tap to upload After photo</p></>}
                </div>
              </div>

              <Textarea
                label="Resolution Note"
                rows={3}
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Describe what was done to resolve the issue…"
              />

              <Button variant="primary" size="lg" className="w-full" loading={submitting} onClick={submit}>
                <CheckCircle2 className="w-4 h-4" /> Submit for Admin Verification
              </Button>
            </div>
          )}

          {['resolved', 'rework_required'].includes(complaint.status) && (
            <div className="card p-5 text-center">
              <CheckCircle2 className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <p className="font-semibold text-ink">Resolution Submitted</p>
              <p className="text-sm text-ink-muted mt-1">Awaiting admin review.</p>
            </div>
          )}
        </div>

        {/* Timeline */}
        <div className="md:col-span-2 card p-5">
          <h2 className="font-semibold text-ink mb-4">Timeline</h2>
          <StatusTimeline complaint={complaint} />
        </div>
      </div>
    </div>
  );
}
