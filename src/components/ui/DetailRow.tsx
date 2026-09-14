import type { ReactNode } from "react";

/**
 * One label/value pair inside a drawer's <dl>.
 *
 * Lives at module scope on purpose. Both drawers used to declare this inline
 * inside their component body, which makes it a brand new component type on
 * every render -- React then unmounts and remounts the whole subtree instead
 * of updating it. Harmless while the rows hold only text, but it silently
 * destroys state the moment anyone puts an input inside one.
 */
export const DetailRow = ({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) => (
  <div>
    <dt className="text-xs uppercase tracking-wide text-slate-400">{label}</dt>
    <dd className="mt-0.5 text-sm text-slate-800">{children}</dd>
  </div>
);
