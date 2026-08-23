// src/components/ui/Input.jsx
import { cn } from '../../utils/cn';
import { forwardRef } from 'react';

export const Input = forwardRef(function Input(
  { label, error, hint, className, containerClassName, ...props },
  ref
) {
  return (
    <div className={cn('space-y-1.5', containerClassName)}>
      {label && (
        <label className="label" htmlFor={props.id || props.name}>
          {label}
          {props.required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <input
        ref={ref}
        className={cn('input', error && 'border-red-400 focus:ring-red-400', className)}
        {...props}
      />
      {hint && !error && <p className="text-xs text-ink-subtle">{hint}</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
});

export const Textarea = forwardRef(function Textarea(
  { label, error, hint, className, containerClassName, rows = 4, ...props },
  ref
) {
  return (
    <div className={cn('space-y-1.5', containerClassName)}>
      {label && (
        <label className="label" htmlFor={props.id || props.name}>
          {label}
          {props.required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <textarea
        ref={ref}
        rows={rows}
        className={cn('input resize-none', error && 'border-red-400 focus:ring-red-400', className)}
        {...props}
      />
      {hint && !error && <p className="text-xs text-ink-subtle">{hint}</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
});

export function Select({ label, error, hint, className, containerClassName, children, ...props }) {
  return (
    <div className={cn('space-y-1.5', containerClassName)}>
      {label && (
        <label className="label" htmlFor={props.id || props.name}>
          {label}
          {props.required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <select
        className={cn('input bg-white', error && 'border-red-400 focus:ring-red-400', className)}
        {...props}
      >
        {children}
      </select>
      {hint && !error && <p className="text-xs text-ink-subtle">{hint}</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
