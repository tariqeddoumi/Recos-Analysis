import React, { forwardRef } from 'react';
import clsx from 'clsx';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        rows={props.rows || 4}
        className={clsx(
          'block w-full rounded-lg border bg-white px-3 py-2 text-sm text-banking-text',
          'placeholder-gray-400 transition-colors duration-150 resize-y',
          'focus:outline-none focus:ring-2 focus:ring-offset-0',
          error
            ? 'border-red-300 focus:border-red-400 focus:ring-red-200'
            : 'border-banking-border focus:border-secondary focus:ring-blue-100',
          props.disabled && 'bg-gray-50 cursor-not-allowed text-gray-500',
          className
        )}
        {...props}
      />
    );
  }
);

Textarea.displayName = 'Textarea';
