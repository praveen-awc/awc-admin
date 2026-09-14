import type { ReactNode } from "react";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/cn";

export type SortOrder = "asc" | "desc";

export interface Column<T> {
  key: string;
  header: string;
  /** Rendered cell content. */
  cell: (row: T) => ReactNode;
  className?: string;
  /** Right-aligned action column with no header text. */
  align?: "left" | "right";
  /**
   * Field name the API sorts by. Set it to make the header clickable; it must
   * be on that endpoint's sort allowlist or the server quietly ignores it.
   */
  sortField?: string;
  /**
   * Direction the first click applies. Names read better A-Z, dates and counts
   * newest-first, so each column says which it means rather than inheriting a
   * single rule that is wrong half the time.
   */
  defaultOrder?: SortOrder;
}

export interface SelectionProps {
  /** Ids of the currently selected rows. Omit to render without checkboxes. */
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
}

export interface SortProps {
  /** Empty when the list is on its server-side default order. */
  field: string;
  order: SortOrder;
  onChange: (field: string, order: SortOrder) => void;
}

export const DataTable = <T,>({
  columns,
  rows,
  rowKey,
  footer,
  selection,
  sort,
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  footer?: ReactNode;
  /** Opt-in: tables that don't pass this render exactly as before. */
  selection?: SelectionProps;
  /** Opt-in, like selection. Without it headers stay plain text. */
  sort?: SortProps;
}) => {
  const ids = rows.map(rowKey);
  const selected = new Set(selection?.selectedIds ?? []);

  // "All" means all rows on this page, not the whole result set -- the other
  // pages aren't loaded, so acting on them would be a promise we can't keep.
  const allOnPageSelected = ids.length > 0 && ids.every((id) => selected.has(id));

  const toggleAll = () => {
    if (!selection) return;
    const remaining = selection.selectedIds.filter((id) => !ids.includes(id));
    selection.onSelectionChange(allOnPageSelected ? remaining : [...remaining, ...ids]);
  };

  const toggleOne = (id: string) => {
    if (!selection) return;
    selection.onSelectionChange(
      selected.has(id)
        ? selection.selectedIds.filter((selectedId) => selectedId !== id)
        : [...selection.selectedIds, id]
    );
  };

  return (
    <div className="overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              {selection && (
                <th className="w-10 px-4 py-2.5">
                  <input
                    type="checkbox"
                    aria-label="Select all rows on this page"
                    checked={allOnPageSelected}
                    onChange={toggleAll}
                    className="h-4 w-4 rounded border-slate-300 text-brand-600"
                  />
                </th>
              )}
              {columns.map((column) => {
                const sortable = Boolean(sort && column.sortField);
                const active = sortable && sort!.field === column.sortField;

                return (
                  <th
                    key={column.key}
                    className={cn(
                      "px-4 py-2.5 font-medium",
                      column.align === "right" && "text-right",
                      column.className
                    )}
                    // Screen readers announce the sorted column from this, so
                    // it goes on the cell rather than the button inside it.
                    aria-sort={
                      !sortable
                        ? undefined
                        : !active
                          ? "none"
                          : sort!.order === "asc"
                            ? "ascending"
                            : "descending"
                    }
                  >
                    {sortable ? (
                      <button
                        type="button"
                        onClick={() =>
                          sort!.onChange(
                            column.sortField!,
                            // Re-clicking the sorted column reverses it;
                            // moving to a new one starts at that column's own
                            // natural direction.
                            active
                              ? sort!.order === "asc"
                                ? "desc"
                                : "asc"
                              : (column.defaultOrder ?? "asc")
                          )
                        }
                        className={cn(
                          "-mx-1 inline-flex items-center gap-1 rounded px-1 py-0.5 hover:text-slate-800",
                          active && "text-slate-900",
                          column.align === "right" && "flex-row-reverse"
                        )}
                      >
                        {column.header}
                        {!active ? (
                          // Dimmed until used, so every sortable column is
                          // discoverable without shouting over the data.
                          <ChevronsUpDown className="h-3 w-3 text-slate-300" />
                        ) : sort!.order === "asc" ? (
                          <ArrowUp className="h-3 w-3" />
                        ) : (
                          <ArrowDown className="h-3 w-3" />
                        )}
                      </button>
                    ) : (
                      column.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => {
              const id = rowKey(row);
              const isSelected = selected.has(id);

              return (
                <tr
                  key={id}
                  className={cn(
                    "hover:bg-slate-50",
                    isSelected && "bg-brand-50/60 hover:bg-brand-50"
                  )}
                >
                  {selection && (
                    <td className="w-10 px-4 py-3 align-top">
                      <input
                        type="checkbox"
                        aria-label="Select row"
                        checked={isSelected}
                        onChange={() => toggleOne(id)}
                        className="h-4 w-4 rounded border-slate-300 text-brand-600"
                      />
                    </td>
                  )}
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={cn(
                        "px-4 py-3 align-top",
                        column.align === "right" && "text-right",
                        column.className
                      )}
                    >
                      {column.cell(row)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {footer}
    </div>
  );
};
