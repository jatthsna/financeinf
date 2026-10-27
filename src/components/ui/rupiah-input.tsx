import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

interface RupiahInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value: number;
  onChange: (value: number) => void;
  showPrefix?: boolean;
  allowClear?: boolean;
}

export const RupiahInput = React.forwardRef<HTMLInputElement, RupiahInputProps>(
  (
    {
      value,
      onChange,
      placeholder = '0',
      showPrefix = true,
      allowClear = true,
      className,
      disabled,
      min,
      max,
      ...props
    },
    ref
  ) => {
    // Helper to format number to ID thousand separator
    const formatNumber = (num: number): string => {
      if (!num || isNaN(num) || num === 0) return '';
      return num.toLocaleString('id-ID');
    };

    const [displayValue, setDisplayValue] = useState<string>(() => formatNumber(value));

    // Keep displayValue in sync with incoming value from parent
    useEffect(() => {
      if (value === 0) {
        // If displayValue is already empty, keep it empty so user isn't interrupted
        if (displayValue !== '') {
          setDisplayValue('');
        }
      } else {
        const formatted = formatNumber(value);
        if (formatted !== displayValue) {
          setDisplayValue(formatted);
        }
      }
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawText = e.target.value;

      // Extract only numeric digits
      const digitsOnly = rawText.replace(/\D/g, '');

      if (!digitsOnly) {
        setDisplayValue('');
        onChange(0);
        return;
      }

      let parsed = parseInt(digitsOnly, 10);
      if (isNaN(parsed)) parsed = 0;

      const maxNum = max !== undefined ? Number(max) : undefined;
      if (maxNum !== undefined && !isNaN(maxNum) && parsed > maxNum) {
        parsed = maxNum;
      }

      setDisplayValue(parsed.toLocaleString('id-ID'));
      onChange(parsed);
    };

    const handleClear = (e: React.MouseEvent) => {
      e.stopPropagation();
      setDisplayValue('');
      onChange(0);
    };

    return (
      <div className="relative flex items-center w-full">
        {showPrefix && (
          <span
            className={cn(
              'absolute left-3 select-none text-xs font-semibold',
              disabled ? 'text-stone-300' : 'text-stone-500'
            )}
          >
            Rp
          </span>
        )}
        <input
          {...props}
          ref={ref}
          type="text"
          inputMode="numeric"
          disabled={disabled}
          value={displayValue}
          placeholder={placeholder}
          onChange={handleChange}
          className={cn(
            'flex h-9 w-full rounded-md border border-stone-200 bg-white px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-stone-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#174C3C] disabled:cursor-not-allowed disabled:opacity-50',
            showPrefix ? 'pl-9' : 'pl-3',
            allowClear && displayValue ? 'pr-8' : 'pr-3',
            className
          )}
        />
        {allowClear && !disabled && displayValue && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2.5 p-0.5 rounded-full text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors"
            title="Hapus nominal"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    );
  }
);

RupiahInput.displayName = 'RupiahInput';
