import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface Column<T> {
  key: string;
  header: string;
  /** Rendered cell content. */
  cell: (row: T) => ReactNode;
  className?: string;
  /** Right-aligned action column with no header text. */
  align?: "left" | "right";
}

export const DataTable = <T,>({
  columns,
  rows,
  rowKey,
  footer,
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  footer?: ReactNode;
}) => (
  <div className="overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className={cn(
                  "px-4 py-2.5 font-medium",
                  column.align === "right" && "text-right",
                  column.className
                )}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row) => (
            <tr key={rowKey(row)} className="hover:bg-slate-50">
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
          ))}
        </tbody>
      </table>
    </div>
    {footer}
  </div>
);
