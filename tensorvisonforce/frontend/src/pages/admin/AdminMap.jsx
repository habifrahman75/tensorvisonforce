// src/pages/admin/AdminMap.jsx — Smart Map with Leaflet
import { useEffect, useRef, useState } from 'react';
import { complaintApi } from '../../services/api';
import { LoadingState, ErrorState } from '../../components/ui/States';
import { StatusBadge, PriorityBadge } from '../../components/ui/Badge';
import { cn } from '../../utils/cn';

const PRIORITY_COLORS = { high: '#ef4444', medium: '#f59e0b', low: '#22c55e' };

let L = null;

function Legend() {
  return (
    <div className="absolute bottom-4 right-4 z-10 bg-white rounded-xl border border-surface-border p-3 shadow-card">
      <p className="text-xs font-semibold text-ink mb-2">Priority</p>
      {Object.entries(PRIORITY_COLORS).map(([p, color]) => (
        <div key={p} className="flex items-center gap-2 mb-1 last:mb-0">
          <div className="w-3 h-3 rounded-full" style={{ background: color }} />
          <span className="text-xs text-ink-muted capitalize">{p}</span>
        </div>
      ))}
    </div>
  );
}

export default function AdminMap() {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const [complaints, setComplaints] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    import('leaflet').then(leaflet => {
      L = leaflet.default;
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });
      setMapReady(true);
    });
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);
    return () => document.head.removeChild(link);
  }, []);

  useEffect(() => {
    complaintApi.list()
      .then(setComplaints)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!mapReady || !mapContainerRef.current || mapRef.current || complaints.length === 0) return;

    mapRef.current = L.map(mapContainerRef.current).setView([12.9716, 77.5946], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
    }).addTo(mapRef.current);

    complaints.forEach(c => {
      if (!c.latitude || !c.longitude) return;
      const color = PRIORITY_COLORS[c.priority] || '#64748b';
      const marker = L.circleMarker([c.latitude, c.longitude], {
        radius: 10,
        fillColor: color,
        color: '#fff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.85,
      }).addTo(mapRef.current);

      marker.on('click', () => setSelected(c));
      marker.bindTooltip(`<div style="font-size:12px"><b>${c.complaint_number}</b><br/>${c.title}</div>`);
    });

    return () => {
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
  }, [mapReady, complaints]);

  if (loading) return <LoadingState message="Loading map data…" />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h1 className="page-title">Smart Map</h1>
        <p className="text-ink-muted text-sm mt-1">
          {complaints.length} complaints plotted · Click a marker for details
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 relative">
          <div
            ref={mapContainerRef}
            className="w-full rounded-xl border border-surface-border shadow-card"
            style={{ height: '560px' }}
            aria-label="Complaint map"
          />
          <Legend />
        </div>

        <div className="space-y-3">
          <h2 className="section-title">Complaint List</h2>
          <div className="space-y-2 max-h-[540px] overflow-y-auto pr-1">
            {complaints.map(c => (
              <button
                key={c.id}
                onClick={() => setSelected(c)}
                className={cn(
                  'w-full text-left p-3 rounded-xl border transition-colors',
                  selected?.id === c.id
                    ? 'border-brand-400 bg-brand-50'
                    : 'border-surface-border bg-white hover:border-brand-200 hover:bg-surface-muted'
                )}
              >
                <p className="text-xs font-mono text-ink-subtle">{c.complaint_number}</p>
                <p className="text-sm font-medium text-ink mt-0.5 truncate">{c.title}</p>
                <div className="flex items-center gap-2 mt-2">
                  <PriorityBadge priority={c.priority} />
                  <StatusBadge status={c.status} />
                </div>
              </button>
            ))}
          </div>

          {selected && (
            <div className="card p-4 space-y-2 animate-slide-up">
              <p className="font-mono text-xs text-ink-subtle">{selected.complaint_number}</p>
              <p className="font-semibold text-ink">{selected.title}</p>
              <div className="flex flex-wrap gap-1.5">
                <StatusBadge status={selected.status} />
                <PriorityBadge priority={selected.priority} />
              </div>
              <p className="text-xs text-ink-muted">{selected.address}</p>
              <p className="text-xs text-ink-muted">{selected.department || '—'}</p>
              <a
                href={`/admin/complaints/${selected.id}`}
                className="block text-center text-xs font-medium text-brand-600 border border-brand-300 rounded-lg py-2 hover:bg-brand-50 transition-colors mt-2"
              >
                Open Complaint →
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
