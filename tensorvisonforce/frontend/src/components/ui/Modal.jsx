// src/components/ui/Modal.jsx
import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../utils/cn';

export function Modal({ open, onClose, title, children, size = 'md', className }) {
  const overlayRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  const sizes = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={(e) => { if (e.target === overlayRef.current) onClose?.(); }}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className={cn(
        'bg-white rounded-2xl shadow-modal w-full animate-slide-up overflow-hidden',
        sizes[size],
        className
      )}>
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-surface-border">
            <h2 className="text-lg font-semibold text-ink">{title}</h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-ink-subtle hover:text-ink hover:bg-surface-muted transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}
