import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export const EmptyState = ({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}) => (
  <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
    <Icon className="h-8 w-8 text-slate-400" />
    <h3 className="mt-3 text-sm font-semibold text-slate-900">{title}</h3>
    {description && (
      <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>
    )}
    {action && <div className="mt-4">{action}</div>}
  </div>
);
