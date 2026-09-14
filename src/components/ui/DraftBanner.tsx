import { History } from "lucide-react";
import { formatRelative } from "@/lib/format";
import { Button } from "./Button";

/**
 * Offered when a locally-saved draft is newer than what the server returned —
 * i.e. the last session ended without saving.
 */
export const DraftBanner = ({
  savedAt,
  onRestore,
  onDiscard,
}: {
  savedAt: string;
  onRestore: () => void;
  onDiscard: () => void;
}) => (
  <div className="flex flex-wrap items-center gap-3 rounded-xl bg-amber-50 px-4 py-3 ring-1 ring-amber-200">
    <History className="h-4 w-4 shrink-0 text-amber-700" />
    <p className="text-sm text-amber-900">
      You have unsaved changes from {formatRelative(savedAt)}.
    </p>
    <div className="ml-auto flex gap-2">
      <Button size="sm" variant="secondary" onClick={onRestore}>
        Restore
      </Button>
      <Button size="sm" variant="ghost" onClick={onDiscard}>
        Discard
      </Button>
    </div>
  </div>
);
