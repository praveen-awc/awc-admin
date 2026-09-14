import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Spinner } from "./Spinner";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-brand-600 text-white hover:bg-brand-700 focus-visible:outline-brand-600",
  secondary:
    "bg-white text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50 focus-visible:outline-slate-400",
  ghost: "text-slate-600 hover:bg-slate-100 focus-visible:outline-slate-400",
  // AWC's own red rather than a generic one -- visually near-identical to
  // red-600, but now a deliberate brand token.
  danger:
    "bg-danger text-white hover:bg-danger-dark focus-visible:outline-danger",
};

const SIZES: Record<Size, string> = {
  sm: "px-2.5 py-1.5 text-xs gap-1.5",
  md: "px-4 py-2 text-sm gap-2",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  children?: ReactNode;
}

export const Button = ({
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  className,
  children,
  ...props
}: ButtonProps) => (
  <button
    {...props}
    disabled={disabled || loading}
    className={cn(
      "inline-flex items-center justify-center rounded-lg font-medium transition-colors",
      "focus-visible:outline-2 focus-visible:outline-offset-2",
      "disabled:cursor-not-allowed disabled:opacity-50",
      VARIANTS[variant],
      SIZES[size],
      className
    )}
  >
    {loading && <Spinner className="h-4 w-4 border-current border-t-transparent" />}
    {children}
  </button>
);
