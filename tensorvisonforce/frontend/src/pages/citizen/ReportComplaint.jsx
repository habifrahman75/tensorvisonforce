// src/pages/citizen/ReportComplaint.jsx
// Multi-step complaint submission: Photo → AI Check → Details → Location → AI Verify → Submit
import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Upload, CheckCircle, AlertTriangle, Cpu, MapPin, FileText,
  ChevronLeft, ChevronRight, Loader2, Zap, Wand2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { aiApi, complaintApi } from '../../services/api';
import { MapPicker } from '../../components/MapPicker';
import { AIInsightCard } from '../../components/AIInsightCard';
import { Input, Textarea, Select } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { cn } from '../../utils/cn';

const STEPS = ['Photo', 'Details', 'Location', 'AI Verify', 'Confirm'];

const CATEGORIES = [
  { value: 'road_damage',  label: 'Road Damage' },
  { value: 'garbage',      label: 'Garbage' },
  { value: 'streetlight',  label: 'Streetlight' },
  { value: 'drainage',     label: 'Drainage' },
  { value: 'water_supply', label: 'Water Supply' },
  { value: 'other',        label: 'Other' },
];

function StepIndicator({ current, steps }) {
  return (
    <div className="flex items-center gap-0 mb-8">
      {steps.map((s, i) => (
        <div key={s} className="flex items-center">
          <div className={cn(
            'flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold transition-colors',
            i < current  ? 'bg-brand-600 text-white'  : '',
            i === current ? 'bg-brand-600 text-white ring-4 ring-brand-100' : '',
            i > current  ? 'bg-surface-border text-ink-subtle' : '',
          )}>
            {i < current ? <CheckCircle className="w-4 h-4" /> : i + 1}
          </div>
          <div className="hidden sm:block ml-2 mr-4">
            <p className={cn('text-xs font-medium', i === current ? 'text-brand-700' : 'text-ink-subtle')}>{s}</p>
          </div>
          {i < steps.length - 1 && (
            <div className={cn('w-6 sm:w-8 h-0.5 mx-1', i < current ? 'bg-brand-400' : 'bg-surface-border')} />
          )}
        </div>
      ))}
    </div>
  );
}

export default function ReportComplaint() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef(null);

  const [step, setStep] = useState(0);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [imageQuality, setImageQuality] = useState(null);
  const [checkingQuality, setCheckingQuality] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', category: 'road_damage', priority: 'medium' });
  const [location, setLocation] = useState(null);
  const [aiResult, setAiResult] = useState(null);
  const [analysing, setAnalysing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  // Step 0: Upload photo
  const handleFile = async (file) => {
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setImageQuality(null);
    setCheckingQuality(true);
    try {
      const q = await aiApi.checkImageQuality(file);
      setImageQuality(q);
    } finally {
      setCheckingQuality(false);
    }
  };

  // Step 3: Run AI analysis
  const runAI = async () => {
    setAnalysing(true);
    try {
      const r = await aiApi.analyse(imageFile, form.description, location);
      setAiResult(r);
      // Auto-fill category + priority from AI
      setForm(f => ({
        ...f,
        category: r.category?.predicted || f.category,
        priority: r.priority?.suggested || f.priority,
      }));
      setStep(3);
    } finally {
      setAnalysing(false);
    }
  };

  const goNext = () => {
    if (step === 0 && !imageFile) { setErrors({ image: 'Please upload a photo.' }); return; }
    if (step === 1) {
      if (!form.title.trim()) { setErrors({ title: 'Title is required.' }); return; }
      if (!form.description.trim()) { setErrors({ description: 'Description is required.' }); return; }
    }
    if (step === 2) {
      if (!location) { setErrors({ location: 'Please select a location.' }); return; }
      runAI();
      return;
    }
    setErrors({});
    setStep(s => s + 1);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const c = await complaintApi.create({
        ...form,
        citizen_id: user.id,
        citizen_name: user.full_name,
        ...location,
        ai_category: aiResult?.category?.predicted,
        ai_confidence: aiResult?.category?.confidence,
        ai_priority: aiResult?.priority?.suggested,
        ai_flags: {
          duplicate_score: aiResult?.duplicate?.score,
          suspicious: aiResult?.suspicious?.flagged,
          suspicion_level: aiResult?.suspicious?.level,
        },
        department: aiResult?.department?.name,
        sla_deadline: new Date(Date.now() + (form.priority === 'high' ? 3 : form.priority === 'medium' ? 7 : 14) * 24 * 3600 * 1000).toISOString(),
      });
      navigate(`/citizen/verify/${c.id}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <div className="mb-6">
        <h1 className="page-title">Report an Issue</h1>
        <p className="text-ink-muted text-sm mt-1">Help us fix your community. Takes less than 2 minutes.</p>
      </div>

      <StepIndicator current={step} steps={STEPS} />

      <div className="card p-6 animate-slide-up">
        {/* ── Step 0: Photo ── */}
        {step === 0 && (
          <div className="space-y-4">
            <h2 className="section-title">Upload a Photo</h2>
            <p className="text-sm text-ink-muted">A clear photo of the issue improves AI accuracy and speeds up resolution.</p>

            <div
              className={cn(
                'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors',
                imagePreview ? 'border-brand-300 bg-brand-50' : 'border-surface-border hover:border-brand-300 hover:bg-surface-muted'
              )}
              onClick={() => fileRef.current?.click()}
              onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }}
              onDragOver={e => e.preventDefault()}
              role="button" tabIndex={0} aria-label="Upload photo"
            >
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => handleFile(e.target.files[0])} />
              {imagePreview ? (
                <img src={imagePreview} alt="Issue preview" className="max-h-48 mx-auto rounded-lg object-cover" />
              ) : (
                <>
                  <Upload className="w-10 h-10 text-ink-subtle mx-auto mb-3" />
                  <p className="font-medium text-ink-muted">Drop photo or click to browse</p>
                  <p className="text-xs text-ink-subtle mt-1">JPG, PNG, HEIC — max 10 MB</p>
                </>
              )}
            </div>
            {errors.image && <p className="text-sm text-red-600">{errors.image}</p>}

            {/* Image Quality Panel */}
            {checkingQuality && (
              <div className="flex items-center gap-2 p-3 bg-brand-50 rounded-lg border border-brand-200">
                <Loader2 className="w-4 h-4 animate-spin text-brand-500" />
                <p className="text-sm text-brand-700">Analysing image quality…</p>
              </div>
            )}
            {imageQuality && !checkingQuality && (
              <div className={cn(
                'p-4 rounded-xl border space-y-3',
                imageQuality.passed ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'
              )}>
                <div className="flex items-center gap-2">
                  {imageQuality.passed
                    ? <CheckCircle className="w-5 h-5 text-green-600" />
                    : <AlertTriangle className="w-5 h-5 text-amber-600" />}
                  <span className={cn('font-semibold text-sm', imageQuality.passed ? 'text-green-700' : 'text-amber-700')}>
                    Image Quality: {imageQuality.label}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div className="text-center">
                    <p className="text-ink-subtle">Quality Score</p>
                    <p className="font-bold text-ink">{imageQuality.score}/100</p>
                  </div>
                  <div className="text-center">
                    <p className="text-ink-subtle">Blur</p>
                    <p className="font-bold text-ink">{imageQuality.blur_score > 60 ? 'Clear' : 'Blurry'}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-ink-subtle">Brightness</p>
                    <p className="font-bold text-ink">{imageQuality.brightness}</p>
                  </div>
                </div>
                {!imageQuality.passed && (
                  <>
                    {imageQuality.issues?.map(issue => (
                      <p key={issue} className="text-xs text-amber-700">⚠ {issue}</p>
                    ))}
                    <div className="flex items-start gap-2 p-3 bg-white rounded-lg border border-amber-200">
                      <Wand2 className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-amber-700">Image quality is low.</p>
                        <p className="text-xs text-amber-600 mt-0.5">
                          You can upload a clearer photo, or continue — your description and location will help classification.
                          <br/>
                          <em>(Image enhancement is applied automatically on the backend using OpenCV CLAHE.)</em>
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Step 1: Details ── */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="section-title">Complaint Details</h2>
            <Input
              label="Title" id="title" required value={form.title} onChange={set('title')}
              placeholder="e.g. Large pothole on MG Road" error={errors.title}
            />
            <Textarea
              label="Description" id="description" required rows={4}
              value={form.description} onChange={set('description')}
              placeholder="Describe the issue in detail — location, severity, duration…"
              error={errors.description}
            />
            <Select label="Category" id="category" value={form.category} onChange={set('category')}>
              {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </Select>
          </div>
        )}

        {/* ── Step 2: Location ── */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="section-title">Select Location</h2>
            <p className="text-sm text-ink-muted">Click on the map or drag the marker to pinpoint the exact location.</p>
            <MapPicker onChange={loc => { setLocation(loc); setErrors({}); }} />
            {errors.location && <p className="text-sm text-red-600">{errors.location}</p>}
          </div>
        )}

        {/* ── Step 3: AI Result ── */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Cpu className="w-5 h-5 text-brand-600" />
              <h2 className="section-title mb-0">AI Verification</h2>
            </div>
            {analysing ? (
              <div className="py-8 text-center space-y-3">
                <Loader2 className="w-8 h-8 animate-spin text-brand-500 mx-auto" />
                <p className="text-sm text-ink-muted">Running AI pipeline — checking duplicates, classifying, scoring priority…</p>
              </div>
            ) : aiResult ? (
              <>
                <AIInsightCard result={aiResult} />
                <div className="grid grid-cols-2 gap-3 mt-2">
                  <Select label="Category (AI-suggested)" value={form.category} onChange={set('category')}>
                    {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </Select>
                  <Select label="Priority (AI-suggested)" value={form.priority} onChange={set('priority')}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </Select>
                </div>
              </>
            ) : null}
          </div>
        )}

        {/* ── Step 4: Confirm ── */}
        {step === 4 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <h2 className="section-title mb-0">Confirm & Submit</h2>
            </div>
            <div className="bg-surface-muted rounded-xl border border-surface-border divide-y divide-surface-border">
              {[
                ['Title',       form.title],
                ['Category',    CATEGORIES.find(c => c.value === form.category)?.label],
                ['Priority',    form.priority.charAt(0).toUpperCase() + form.priority.slice(1)],
                ['Location',    location?.address || `${location?.lat?.toFixed(5)}, ${location?.lng?.toFixed(5)}`],
                ['Department',  aiResult?.department?.name || 'Auto-routed'],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between px-4 py-3 text-sm">
                  <span className="text-ink-muted">{k}</span>
                  <span className="font-medium text-ink text-right max-w-[60%]">{v || '—'}</span>
                </div>
              ))}
            </div>
            {imagePreview && (
              <div>
                <p className="text-sm font-medium text-ink-muted mb-2">Attached Photo</p>
                <img src={imagePreview} alt="Complaint" className="w-full max-h-48 object-cover rounded-xl border border-surface-border" />
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-surface-border">
          <Button
            variant="secondary" size="md"
            onClick={() => { setErrors({}); setStep(s => Math.max(0, s - 1)); }}
            disabled={step === 0 || analysing || submitting}
          >
            <ChevronLeft className="w-4 h-4" /> Back
          </Button>

          {step < 4 ? (
            <Button variant="primary" size="md" onClick={goNext} loading={analysing}>
              {step === 2 ? <><Cpu className="w-4 h-4" /> Run AI Analysis</> : <>Next <ChevronRight className="w-4 h-4" /></>}
            </Button>
          ) : (
            <Button variant="primary" size="md" onClick={handleSubmit} loading={submitting}>
              <Zap className="w-4 h-4" /> Submit Complaint
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
