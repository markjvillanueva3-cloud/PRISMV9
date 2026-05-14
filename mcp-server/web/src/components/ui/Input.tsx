import { type InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  unit?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, unit, id, className = "", ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className="space-y-1">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            {label}
          </label>
        )}
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            className={`block w-full rounded-md border px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-slate-50 disabled:text-slate-500 ${
              error
                ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                : "border-slate-300 focus:border-primary-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            } ${unit ? "pr-12" : ""} ${className}`}
            aria-invalid={!!error}
            aria-describedby={error ? `${inputId}-error` : undefined}
            {...props}
          />
          {unit && (
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
              {unit}
            </span>
          )}
        </div>
        {error && (
          <p id={`${inputId}-error`} className="text-xs text-red-600" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  },
);
Input.displayName = "Input";
export default Input;
