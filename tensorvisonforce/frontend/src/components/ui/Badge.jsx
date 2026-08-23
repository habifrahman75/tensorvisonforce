// src/components/ui/Badge.jsx
import { cn } from '../../utils/cn';

const STATUS_STYLES = {
  submitted:        'bg-sky-50 text-sky-700 border-sky-200',
  verified:         'bg-emerald-50 text-emerald-700 border-emerald-200',
  assigned:         'bg-violet-50 text-violet-700 border-violet-200',
  in_progress:      'bg-amber-50 text-amber-700 border-amber-200',
  resolved:         'bg-green-50 text-green-700 border-green-200',
  rework_required:  'bg-red-50 text-red-700 border-red-200',
};

const PRIORITY_STYLES = {
  low:    'bg-green-50 text-green-700 border-green-200',
  medium: 'bg-amber-50 text-amber-700 border-amber-200',
  high:   'bg-red-50 text-red-700 border-red-200',
};

const PRIORITY_DOTS = {
  low:    'bg-green-500',
  medium: 'bg-amber-500',
  high:   'bg-red-500',
};

const STATUS_LABELS = {
  submitted:        'Submitted',
  verified:         'Verified',
  assigned:         'Assigned',
  in_progress:      'In Progress',
  resolved:         'Resolved',
  rework_required:  'Rework Required',
};

export function StatusBadge({ status, className }) {
  return (
    <span className={cn(
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
      STATUS_STYLES[status] || 'bg-gray-50 text-gray-600 border-gray-200',
      className
    )}>
      {STATUS_LABELS[status] || status}
    </span>
  );
}

export function PriorityBadge({ priority, className }) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border',
      PRIORITY_STYLES[priority] || 'bg-gray-50 text-gray-600 border-gray-200',
      className
    )}>
      <span className={cn('w-1.5 h-1.5 rounded-full', PRIORITY_DOTS[priority] || 'bg-gray-400')} />
      {priority ? priority.charAt(0).toUpperCase() + priority.slice(1) : '—'}
    </span>
  );
}

export function CategoryBadge({ category, className }) {
  const labels = {
    road_damage:  'Road Damage',
    garbage:      'Garbage',
    streetlight:  'Streetlight',
    drainage:     'Drainage',
    water_supply: 'Water Supply',
    other:        'Other',
  };
  return (
    <span className={cn(
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border bg-slate-50 text-slate-700 border-slate-200',
      className
    )}>
      {labels[category] || category}
    </span>
  );
}

export function AiBadge({ label = 'AI Verified', className }) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200',
      className
    )}>
      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
        <path d="M10 2a8 8 0 100 16A8 8 0 0010 2zm3.707 6.707l-4 4a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L9 10.586l3.293-3.293a1 1 0 011.414 1.414z" />
      </svg>
      {label}
    </span>
  );
}
