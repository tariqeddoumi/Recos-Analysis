import React, { forwardRef } from 'react';
import { Calendar } from 'lucide-react';
import { Input } from './Input';

interface DatePickerProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  error?: boolean;
}

export const DatePicker = forwardRef<HTMLInputElement, DatePickerProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <Input
        ref={ref}
        type="date"
        error={error}
        leftIcon={<Calendar size={14} />}
        className={className}
        {...props}
      />
    );
  }
);

DatePicker.displayName = 'DatePicker';
