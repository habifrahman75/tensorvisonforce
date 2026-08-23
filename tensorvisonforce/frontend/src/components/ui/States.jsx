// src/components/ui/States.jsx — Loading, Error, Empty states
import { Loader2, AlertCircle, InboxIcon, SearchX } from 'lucide-react';

export function LoadingState({ message = 'Loading…', fullPage = false }) {
  if (fullPage) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-ink-muted">
          <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
          <p className="text-sm">{message}</p>
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-ink-muted">
      <Loader2 className="w-7 h-7 animate-spin text-brand-500" />
      <p className="text-sm">{message}</p>
    </div>
  );
}

export function ErrorState({ message = 'Something went wrong.', onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
      <div className="p-3 bg-red-50 rounded-full">
        <AlertCircle className="w-7 h-7 text-red-500" />
      </div>
      <div>
        <p className="font-medium text-ink">{message}</p>
        <p className="text-sm text-ink-muted mt-1">Please try again or contact support.</p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-2 px-4 py-2 text-sm font-medium text-brand-600 border border-brand-300 rounded-lg hover:bg-brand-50 transition-colors"
        >
          Try Again
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title = 'Nothing here yet', description, action, icon: Icon = InboxIcon }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
      <div className="p-4 bg-surface-muted rounded-2xl">
        <Icon className="w-8 h-8 text-ink-subtle" />
      </div>
      <div>
        <p className="font-semibold text-ink">{title}</p>
        {description && <p className="text-sm text-ink-muted mt-1 max-w-xs mx-auto">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function NoResults() {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
      <SearchX className="w-8 h-8 text-ink-subtle" />
      <p className="font-medium text-ink">No results found</p>
      <p className="text-sm text-ink-muted">Try adjusting your filters.</p>
    </div>
  );
}
