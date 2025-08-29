// アクセシブル入力コンポーネント
'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface AccessibleInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  errorText?: string;
  required?: boolean;
  showRequiredIndicator?: boolean;
}

const AccessibleInput = React.forwardRef<HTMLInputElement, AccessibleInputProps>(
  ({ 
    className, 
    type,
    label,
    helperText,
    errorText,
    required = false,
    showRequiredIndicator = true,
    id,
    ...props 
  }, ref) => {
    const inputId = id || `input-${React.useId()}`;
    const helperTextId = helperText ? `${inputId}-helper` : undefined;
    const errorTextId = errorText ? `${inputId}-error` : undefined;
    
    const describedBy = [helperTextId, errorTextId].filter(Boolean).join(' ') || undefined;
    
    return (
      <div className="space-y-2">
        {label && (
          <label
            htmlFor={inputId}
            className={cn(
              'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
              errorText ? 'text-destructive' : 'text-foreground'
            )}
          >
            {label}
            {required && showRequiredIndicator && (
              <span className="ml-1 text-destructive" aria-label="必須">
                *
              </span>
            )}
          </label>
        )}
        
        <input
          type={type}
          id={inputId}
          className={cn(
            'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 touch-target',
            errorText && 'border-destructive focus-visible:ring-destructive',
            className
          )}
          ref={ref}
          aria-required={required}
          aria-invalid={!!errorText}
          aria-describedby={describedBy}
          {...props}
        />
        
        {helperText && !errorText && (
          <p
            id={helperTextId}
            className="text-sm text-muted-foreground"
          >
            {helperText}
          </p>
        )}
        
        {errorText && (
          <p
            id={errorTextId}
            className="text-sm text-destructive"
            role="alert"
            aria-live="polite"
          >
            {errorText}
          </p>
        )}
      </div>
    );
  }
);
AccessibleInput.displayName = 'AccessibleInput';

export { AccessibleInput };