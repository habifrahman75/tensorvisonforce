// src/components/ComplaintCard.jsx
import { Link } from 'react-router-dom';
import { MapPin, Clock, ArrowRight } from 'lucide-react';
import { StatusBadge, PriorityBadge, CategoryBadge } from './ui/Badge';
import { fromNow, truncate, categoryLabel } from '../utils/format';

export function ComplaintCard({ complaint, linkPrefix = '/citizen/complaint' }) {
  return (
    <Link
      to={`${linkPrefix}/${complaint.id}`}
      className="card block p-5 hover:shadow-card-hover transition-shadow duration-200 group"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="text-xs font-mono text-ink-subtle">{complaint.complaint_number}</span>
            <CategoryBadge category={complaint.category} />
          </div>
          <p className="font-semibold text-ink group-hover:text-brand-700 transition-colors truncate">
            {complaint.title}
          </p>
          <p className="text-sm text-ink-muted mt-1 line-clamp-2">
            {truncate(complaint.description, 100)}
          </p>
        </div>
        <ArrowRight className="w-4 h-4 text-ink-subtle flex-shrink-0 mt-1 group-hover:translate-x-0.5 transition-transform" />
      </div>

      <div className="flex items-center gap-3 mt-4 flex-wrap">
        <StatusBadge status={complaint.status} />
        <PriorityBadge priority={complaint.priority} />
      </div>

      <div className="flex items-center gap-4 mt-3 text-xs text-ink-subtle">
        {complaint.address && (
          <span className="flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5" />
            <span className="truncate max-w-[180px]">{complaint.address}</span>
          </span>
        )}
        <span className="flex items-center gap-1 ml-auto">
          <Clock className="w-3.5 h-3.5" />
          {fromNow(complaint.created_at)}
        </span>
      </div>
    </Link>
  );
}
