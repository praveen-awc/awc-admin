import { X } from "lucide-react";
import { Button } from "./Button";

export interface BulkAction {
  label: string;
  onRun: () => void;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  /** Hide entirely when the signed-in role can't perform it. */
  hidden?: boolean;
}

/**
 * Appears above a list once rows are selected.
 *
 * Actions run against the existing per-item endpoints rather than a bulk API:
 * those routes already carry the right requireRole guards, so nothing has to be
 * re-implemented (and can't be got wrong) on a new endpoint.
 */
export const BulkActionBar = ({
  count,
  actions,
  busy = false,
  onClear,
}: {
  count: number;
  actions: BulkAction[];
  busy?: boolean;
  onClear: () => void;
}) => {
  if (count === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl bg-brand-50 px-4 py-3 ring-1 ring-brand-200">
      <span className="text-sm font-medium text-brand-900">
        {count} selected
      </span>

      <div className="ml-2 flex flex-wrap items-center gap-2">
        {actions
          .filter((action) => !action.hidden)
          .map((action) => (
            <Button
              key={action.label}
              size="sm"
              variant={action.variant ?? "secondary"}
              disabled={busy}
              onClick={action.onRun}
            >
              {action.label}
            </Button>
          ))}
      </div>

      <button
        type="button"
        onClick={onClear}
        disabled={busy}
        className="ml-auto inline-flex items-center gap-1 text-xs text-brand-800 hover:underline disabled:opacity-50"
      >
        <X className="h-3.5 w-3.5" />
        Clear
      </button>
    </div>
  );
};
