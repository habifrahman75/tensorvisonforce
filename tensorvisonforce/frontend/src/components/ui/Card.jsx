// src/components/ui/Card.jsx
import { cn } from '../../utils/cn';

export function Card({ children, className, ...props }) {
  return (
    <div className={cn('card', className)} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({ children, className }) {
  return (
    <div className={cn('px-6 py-4 border-b border-surface-border', className)}>
      {children}
    </div>
  );
}

export function CardBody({ children, className }) {
  return (
    <div className={cn('px-6 py-5', className)}>
      {children}
    </div>
  );
}

export function CardFooter({ children, className }) {
  return (
    <div className={cn('px-6 py-4 border-t border-surface-border bg-surface-muted/50 rounded-b-xl', className)}>
      {children}
    </div>
  );
}

export function MetricCard({ title, value, subtitle, icon: Icon, trend, color = 'blue', className }) {
  const colors = {
    blue:   { icon: 'text-brand-600 bg-brand-50',   val: 'text-brand-700' },
    green:  { icon: 'text-green-600 bg-green-50',   val: 'text-green-700' },
    amber:  { icon: 'text-amber-600 bg-amber-50',   val: 'text-amber-700' },
    red:    { icon: 'text-red-600   bg-red-50',     val: 'text-red-700'   },
    violet: { icon: 'text-violet-600 bg-violet-50', val: 'text-violet-700' },
    slate:  { icon: 'text-slate-600 bg-slate-100',  val: 'text-slate-700' },
  };
  const c = colors[color] || colors.blue;

  return (
    <div className={cn('metric-card', className)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-ink-muted font-medium">{title}</p>
          <p className={cn('text-3xl font-bold mt-1', c.val)}>{value ?? '—'}</p>
          {subtitle && <p className="text-xs text-ink-subtle mt-1">{subtitle}</p>}
        </div>
        {Icon && (
          <div className={cn('p-3 rounded-xl', c.icon)}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
      {trend !== undefined && (
        <p className={cn('text-xs mt-3 font-medium', trend >= 0 ? 'text-green-600' : 'text-red-600')}>
          {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}% from last week
        </p>
      )}
    </div>
  );
}
