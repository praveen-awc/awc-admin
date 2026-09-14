import { X } from "lucide-react";

/**
 * From/to filter for list screens.
 *
 * Both bounds are inclusive whole days: the server widens `to` to the end of
 * its day, so picking the same date twice means "everything that happened that
 * day" rather than an empty result.
 *
 * Values are plain `YYYY-MM-DD` strings straight from the native date inputs,
 * which is also the shape the API expects -- no parsing on either side, and no
 * timezone shift introduced by turning them into Date objects on the way.
 */
export const DateRangeFilter = ({
  from,
  to,
  onChange,
  label = "Date",
}: {
  from: string;
  to: string;
  onChange: (range: { from: string; to: string }) => void;
  label?: string;
}) => {
  const active = Boolean(from || to);

  return (
    <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 py-1">
      <span className="px-1 text-xs text-slate-500">{label}</span>

      <input
        type="date"
        aria-label={`${label} from`}
        value={from}
        // Guarded so a range cannot be inverted into one that matches nothing.
        max={to || undefined}
        onChange={(event) => onChange({ from: event.target.value, to })}
        className="rounded border-0 bg-transparent p-1 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand-500"
      />

      <span className="text-xs text-slate-400">&rarr;</span>

      <input
        type="date"
        aria-label={`${label} to`}
        value={to}
        min={from || undefined}
        onChange={(event) => onChange({ from, to: event.target.value })}
        className="rounded border-0 bg-transparent p-1 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand-500"
      />

      {active && (
        <button
          type="button"
          aria-label={`Clear ${label.toLowerCase()} filter`}
          onClick={() => onChange({ from: "", to: "" })}
          className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
};
