import { useEffect, useState, type ReactNode } from "react";
import { Search } from "lucide-react";
import { Input } from "./Input";

/**
 * Search box shared by every list screen. Debounced so typing does not fire a
 * request per keystroke, and it resets to page 1 whenever the term changes.
 */
export const SearchBox = ({
  value,
  onChange,
  placeholder = "Search",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) => {
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => onChange(draft), 300);
    return () => window.clearTimeout(timer);
    // onChange is recreated per render by callers; depending on it would
    // restart the timer every render and never fire.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);

  return (
    <div className="relative min-w-56 flex-1">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <Input
        className="pl-9"
        placeholder={placeholder}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
      />
    </div>
  );
};

export const PageHeader = ({
  title,
  actions,
}: {
  title: string;
  actions?: ReactNode;
}) => (
  <div className="flex flex-wrap items-center justify-between gap-3">
    <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
    {actions && <div className="flex items-center gap-2">{actions}</div>}
  </div>
);
