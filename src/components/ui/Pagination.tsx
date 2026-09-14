import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./Button";

/** Matches the server's cap in readPaging -- asking for more is clamped there. */
const PAGE_SIZES = [20, 50, 100];

export const Pagination = ({
  page,
  totalPages,
  total,
  onChange,
  noun = "item",
  nounPlural,
  limit,
  onLimitChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  onChange: (page: number) => void;
  /**
   * What the rows are. This used to be hardcoded to "post", which is how the
   * leads list came to describe 106 enquiries as "106 posts".
   */
  noun?: string;
  /** Only where adding "s" is wrong -- "case study" needs "case studies". */
  nounPlural?: string;
  /** Both are needed for the page-size control; omit them to leave it out. */
  limit?: number;
  onLimitChange?: (limit: number) => void;
}) => {
  const sizeControl = limit !== undefined && onLimitChange !== undefined;

  // A single page still shows the count and the size control -- the row is
  // worth keeping when someone wants to widen the page, not just page through.
  if (totalPages <= 1 && !sizeControl) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-3">
      <div className="flex items-center gap-3">
        <p className="text-xs text-slate-500">
          Page {page} of {totalPages} &middot; {total}{" "}
          {total === 1 ? noun : (nounPlural ?? `${noun}s`)}
        </p>

        {sizeControl && (
          <label className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className="sr-only sm:not-sr-only">Per page</span>
            <select
              value={limit}
              onChange={(event) => onLimitChange(Number(event.target.value))}
              className="rounded-md border border-slate-200 bg-white py-1 pl-2 pr-6 text-xs text-slate-700"
            >
              {PAGE_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <div className="flex gap-2">
        <Button
          size="sm"
          variant="secondary"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Previous
        </Button>
        <Button
          size="sm"
          variant="secondary"
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
        >
          Next
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
};
