// src/components/MapPicker.jsx
import { useEffect, useRef, useState } from 'react';
import { MapPin, Navigation, Loader2 } from 'lucide-react';

// Leaflet must be loaded client-side. Using dynamic import.
let L = null;

export function MapPicker({ lat = 12.9716, lng = 77.5946, onChange, className = '' }) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const [position, setPosition] = useState({ lat, lng });
  const [locating, setLocating] = useState(false);
  const [address, setAddress] = useState('');
  const [mapReady, setMapReady] = useState(false);

  // Dynamically import Leaflet to avoid SSR issues
  useEffect(() => {
    import('leaflet').then(leaflet => {
      L = leaflet.default;
      // Fix default icon paths
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });
      setMapReady(true);
    });

    // Import Leaflet CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);
    return () => document.head.removeChild(link);
  }, []);

  useEffect(() => {
    if (!mapReady || !mapContainerRef.current || mapRef.current) return;

    mapRef.current = L.map(mapContainerRef.current).setView([position.lat, position.lng], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a> contributors',
    }).addTo(mapRef.current);

    markerRef.current = L.marker([position.lat, position.lng], { draggable: true })
      .addTo(mapRef.current);

    markerRef.current.on('dragend', (e) => {
      const { lat, lng } = e.target.getLatLng();
      updatePosition(lat, lng);
    });

    mapRef.current.on('click', (e) => {
      const { lat, lng } = e.latlng;
      markerRef.current.setLatLng([lat, lng]);
      updatePosition(lat, lng);
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [mapReady]);

  const updatePosition = async (lat, lng) => {
    setPosition({ lat, lng });
    onChange?.({ lat, lng, address });
    // Reverse geocode via Nominatim (free, no key needed)
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
      );
      const data = await res.json();
      const addr = data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
      setAddress(addr);
      onChange?.({ lat, lng, address: addr });
    } catch {
      setAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    }
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const { latitude: lat, longitude: lng } = coords;
        if (mapRef.current) {
          mapRef.current.setView([lat, lng], 17);
          markerRef.current.setLatLng([lat, lng]);
        }
        updatePosition(lat, lng);
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <label className="label mb-0">Location</label>
        <button
          type="button"
          onClick={getCurrentLocation}
          disabled={locating}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-brand-600 border border-brand-300 rounded-lg hover:bg-brand-50 transition-colors disabled:opacity-50"
        >
          {locating
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <Navigation className="w-4 h-4" />}
          {locating ? 'Locating…' : 'Use My Location'}
        </button>
      </div>

      <div
        ref={mapContainerRef}
        className={`w-full h-64 rounded-xl border border-surface-border bg-surface-muted ${className}`}
        style={{ zIndex: 0 }}
        aria-label="Map — click or drag marker to select location"
      />

      {address && (
        <div className="flex items-start gap-2 p-3 bg-surface-muted rounded-lg border border-surface-border">
          <MapPin className="w-4 h-4 text-brand-500 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-ink-muted leading-snug">{address}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="p-2 bg-surface-muted rounded-lg border border-surface-border">
          <p className="text-xs text-ink-subtle">Latitude</p>
          <p className="text-sm font-mono font-medium text-ink">{position.lat.toFixed(6)}</p>
        </div>
        <div className="p-2 bg-surface-muted rounded-lg border border-surface-border">
          <p className="text-xs text-ink-subtle">Longitude</p>
          <p className="text-sm font-mono font-medium text-ink">{position.lng.toFixed(6)}</p>
        </div>
      </div>
    </div>
  );
}
