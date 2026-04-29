import React from 'react';
import clsx from 'clsx';
import { AlertCircle } from 'lucide-react';

interface FormFieldProps {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
  htmlFor?: string;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  error,
  hint,
  required,
  children,
  className,
  htmlFor,
}) => {
  return (
    <div className={clsx('flex flex-col gap-1.5', className)}>
      {label && (
        <label
          htmlFor={htmlFor}
          className="text-sm font-medium text-banking-text"
        >
          {label}
          {required && <span className="ml-1 text-red-500">*</span>}
        </label>
      )}
      {children}
      {error && (
        <p className="flex items-center gap-1 text-xs text-red-600">
          <AlertCircle size={12} />
          {error}
        </p>
      )}
      {hint && !error && (
        <p className="text-xs text-banking-muted">{hint}</p>
      )}
    </div>
  );
};
