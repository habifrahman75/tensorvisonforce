// src/components/AIInsightCard.jsx
import { cn } from '../utils/cn';
import { Shield, AlertTriangle, CheckCircle, XCircle, Cpu } from 'lucide-react';

function Row({ label, value, valueClass, badge }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-surface-border last:border-0">
      <span className="text-sm text-ink-muted">{label}</span>
      <div className="flex items-center gap-2">
        {badge}
        <span className={cn('text-sm font-semibold', valueClass || 'text-ink')}>{value}</span>
      </div>
    </div>
  );
}

function ScoreBar({ value, max = 100, color = 'bg-brand-500' }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-24 h-1.5 bg-surface-border rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-500', color)}
          style={{ width: `${(value / max) * 100}%` }}
        />
      </div>
      <span className="text-sm font-semibold text-ink">{value}%</span>
    </div>
  );
}

export function AIInsightCard({ result, className }) {
  if (!result) return null;

  const { image_quality, location, category, duplicate, suspicious, priority, department } = result;

  const priorityColor = {
    high: 'text-red-600', medium: 'text-amber-600', low: 'text-green-600',
  }[priority?.suggested] || 'text-ink';

  return (
    <div className={cn('card overflow-hidden', className)}>
      {/* Header */}
      <div className="px-5 py-4 bg-gradient-to-r from-brand-600 to-brand-700 flex items-center gap-3">
        <div className="p-2 bg-white/20 rounded-lg">
          <Cpu className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="font-semibold text-white text-sm">AI Verification Report</h3>
          <p className="text-xs text-blue-100">Prototype AI — results reviewed by admin</p>
        </div>
      </div>

      <div className="divide-y divide-surface-border">
        {/* Image Quality */}
        <div className="px-5 py-3">
          <Row
            label="Image Quality"
            value={image_quality?.label || '—'}
            valueClass={image_quality?.passed ? 'text-green-600' : 'text-red-600'}
            badge={image_quality?.passed
              ? <CheckCircle className="w-4 h-4 text-green-500" />
              : <XCircle className="w-4 h-4 text-red-500" />}
          />
          {image_quality?.score !== undefined && (
            <div className="flex items-center justify-between pb-2">
              <span className="text-xs text-ink-subtle">Quality Score</span>
              <ScoreBar value={image_quality.score} color={image_quality.passed ? 'bg-green-500' : 'bg-red-400'} />
            </div>
          )}
          {image_quality?.issues?.length > 0 && (
            <ul className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2 mt-1 space-y-0.5">
              {image_quality.issues.map((issue, i) => <li key={i}>⚠ {issue}</li>)}
            </ul>
          )}
        </div>

        {/* Location */}
        <div className="px-5 py-3">
          <Row
            label="Location"
            value={location?.verified ? 'Verified' : 'Unverified'}
            valueClass={location?.verified ? 'text-green-600' : 'text-amber-600'}
            badge={location?.verified
              ? <CheckCircle className="w-4 h-4 text-green-500" />
              : <AlertTriangle className="w-4 h-4 text-amber-500" />}
          />
        </div>

        {/* Category */}
        <div className="px-5 py-3">
          <Row label="Detected Category" value={category?.label || '—'} />
          <div className="flex items-center justify-between py-1">
            <span className="text-xs text-ink-subtle">AI Confidence</span>
            <ScoreBar
              value={Math.round((category?.confidence || 0) * 100)}
              color="bg-brand-500"
            />
          </div>
        </div>

        {/* Duplicate */}
        <div className="px-5 py-3">
          <Row
            label="Duplicate Score"
            value={`${Math.round((duplicate?.score || 0) * 100)}%`}
            valueClass={duplicate?.flagged ? 'text-red-600' : 'text-green-600'}
            badge={duplicate?.flagged
              ? <AlertTriangle className="w-4 h-4 text-red-500" />
              : <CheckCircle className="w-4 h-4 text-green-500" />}
          />
        </div>

        {/* Suspicious */}
        <div className="px-5 py-3">
          <Row
            label="Suspicion Level"
            value={suspicious?.level || 'Low'}
            valueClass={suspicious?.flagged ? 'text-red-600' : 'text-green-600'}
            badge={suspicious?.flagged
              ? <AlertTriangle className="w-4 h-4 text-red-500" />
              : <Shield className="w-4 h-4 text-green-500" />}
          />
        </div>

        {/* Priority & Department */}
        <div className="px-5 py-3">
          <Row
            label="Suggested Priority"
            value={priority?.suggested ? priority.suggested.toUpperCase() : '—'}
            valueClass={priorityColor}
          />
          <Row label="Recommended Department" value={department?.name || '—'} />
        </div>
      </div>
    </div>
  );
}
