// src/components/ui/FileUpload.jsx
import { useRef, useState } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { cn } from '../../utils/cn';

export function FileUpload({ label, onChange, accept = 'image/*', multiple = false, className }) {
  const inputRef = useRef(null);
  const [previews, setPreviews] = useState([]);
  const [dragging, setDragging] = useState(false);

  const handleFiles = (files) => {
    const arr = Array.from(files);
    const urls = arr.map(f => URL.createObjectURL(f));
    setPreviews(urls);
    onChange?.(multiple ? arr : arr[0]);
  };

  const removeFile = (idx) => {
    const next = previews.filter((_, i) => i !== idx);
    setPreviews(next);
    if (next.length === 0) onChange?.(multiple ? [] : null);
  };

  return (
    <div className={cn('space-y-2', className)}>
      {label && <label className="label">{label}</label>}
      <div
        className={cn(
          'border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors duration-200',
          dragging
            ? 'border-brand-400 bg-brand-50'
            : 'border-surface-border hover:border-brand-300 hover:bg-surface-muted'
        )}
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
        role="button"
        tabIndex={0}
        onKeyDown={e => e.key === 'Enter' && inputRef.current?.click()}
        aria-label="Upload file"
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          className="hidden"
          onChange={e => handleFiles(e.target.files)}
        />
        <Upload className="w-8 h-8 text-ink-subtle mx-auto mb-2" />
        <p className="text-sm font-medium text-ink-muted">
          Drop photo here or <span className="text-brand-600">browse</span>
        </p>
        <p className="text-xs text-ink-subtle mt-1">JPG, PNG, HEIC up to 10MB</p>
      </div>

      {previews.length > 0 && (
        <div className="grid grid-cols-3 gap-2 mt-3">
          {previews.map((url, i) => (
            <div key={i} className="relative group aspect-square rounded-lg overflow-hidden bg-surface-muted border border-surface-border">
              <img src={url} alt={`Preview ${i + 1}`} className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={e => { e.stopPropagation(); removeFile(i); }}
                className="absolute top-1 right-1 p-1 bg-black/60 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Remove image"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
