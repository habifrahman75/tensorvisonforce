// src/components/StatusTimeline.jsx
import { cn } from '../utils/cn';
import { CheckCircle2, Circle, Clock } from 'lucide-react';
import { formatDateTime } from '../utils/format';

const STEPS = [
  { key: 'submitted',       label: 'Submitted',          desc: 'Complaint received and logged.' },
  { key: 'verified',        label: 'AI Verified',         desc: 'AI analysis complete, no duplicates found.' },
  { key: 'assigned',        label: 'Assigned',            desc: 'Routed to department and assigned to field worker.' },
  { key: 'in_progress',     label: 'In Progress',         desc: 'Field worker is working on this issue.' },
  { key: 'resolved',        label: 'Resolved',            desc: 'Work complete. Pending admin verification.' },
];

const ORDER = STEPS.map(s => s.key);

export function StatusTimeline({ complaint }) {
  const currentIdx = ORDER.indexOf(complaint?.status);

  return (
    <div className="space-y-0">
      {STEPS.map((step, idx) => {
        const done = idx < currentIdx || complaint?.status === step.key;
        const active = complaint?.status === step.key;
        const future = idx > currentIdx;

        return (
          <div key={step.key} className={cn('timeline-step', done && 'completed')}>
            {/* Icon */}
            <div className="flex flex-col items-center">
              <div className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 border-2 transition-colors z-10',
                active  && 'bg-brand-600 border-brand-600',
                done && !active && 'bg-white border-brand-400',
                future && 'bg-white border-surface-border'
              )}>
                {done && !active && <CheckCircle2 className="w-5 h-5 text-brand-500" />}
                {active           && <Clock className="w-5 h-5 text-white animate-pulse-dot" />}
                {future           && <Circle className="w-5 h-5 text-ink-subtle" />}
              </div>
              {/* Connector line */}
              {idx < STEPS.length - 1 && (
                <div className={cn('w-0.5 flex-1 my-1', done ? 'bg-brand-300' : 'bg-surface-border')} style={{ minHeight: '24px' }} />
              )}
            </div>

            {/* Content */}
            <div className="pb-6 pt-1">
              <p className={cn(
                'font-semibold text-sm',
                active ? 'text-brand-700' : done ? 'text-ink' : 'text-ink-subtle'
              )}>
                {step.label}
                {active && (
                  <span className="ml-2 text-xs font-medium text-brand-600 bg-brand-50 border border-brand-200 px-2 py-0.5 rounded-full">
                    Current
                  </span>
                )}
              </p>
              <p className={cn('text-xs mt-0.5', done || active ? 'text-ink-muted' : 'text-ink-subtle')}>
                {step.desc}
              </p>
              {active && complaint?.updated_at && (
                <p className="text-xs text-ink-subtle mt-1">{formatDateTime(complaint.updated_at)}</p>
              )}
              {step.key === 'submitted' && complaint?.created_at && (
                <p className="text-xs text-ink-subtle mt-1">{formatDateTime(complaint.created_at)}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
