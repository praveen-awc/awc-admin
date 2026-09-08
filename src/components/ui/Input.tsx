import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

const fieldStyles =
  "block w-full rounded-lg border-0 bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-brand-600 disabled:bg-slate-50 disabled:text-slate-500";

interface FieldWrapperProps {
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
}

export const Field = ({
  label,
  hint,
  error,
  required,
  htmlFor,
  children,
}: FieldWrapperProps & { htmlFor?: string; children: React.ReactNode }) => (
  <div className="space-y-1.5">
    {label && (
      <label
        htmlFor={htmlFor}
        className="block text-sm font-medium text-slate-700"
      >
        {label}
        {required && <span className="ml-0.5 text-red-600">*</span>}
      </label>
    )}
    {children}
    {error ? (
      <p className="text-xs text-red-600">{error}</p>
    ) : hint ? (
      <p className="text-xs text-slate-500">{hint}</p>
    ) : null}
  </div>
);

export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }
>(({ className, invalid, ...props }, ref) => (
  <input
    ref={ref}
    {...props}
    className={cn(fieldStyles, invalid && "ring-red-500", className)}
  />
));
Input.displayName = "Input";

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }
>(({ className, invalid, ...props }, ref) => (
  <textarea
    ref={ref}
    {...props}
    className={cn(fieldStyles, "resize-y", invalid && "ring-red-500", className)}
  />
));
Textarea.displayName = "Textarea";

export const Select = forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <select ref={ref} {...props} className={cn(fieldStyles, "pr-8", className)}>
    {children}
  </select>
));
Select.displayName = "Select";
