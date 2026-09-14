import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
// Aliased: the DOM's History interface shadows lucide's icon of that name.
import { History as HistoryIcon, RotateCcw, X } from "lucide-react";
import {
  getRevision,
  listRevisions,
  restoreRevision,
  type RevisionEntity,
  type RevisionSummary,
} from "./revisions.api";
import { errorMessage } from "@/lib/api";
import { formatDateTime, formatRelative } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";

/**
 * Version history for one document, as a slide-over.
 *
 * A snapshot is taken before every save, so the newest entry here is the state
 * immediately before the most recent edit -- there is no row for "now", which
 * is the live document you are looking at.
 *
 * No diff view. The four modules that have history store three different
 * shapes: blog posts are HTML, news and case studies are typed block arrays,
 * jobs are a dozen string lists. A diff that worked across all of them is its
 * own piece of work, so this shows what a version holds and lets you put it
 * back, which is the part people actually need.
 */

/** Enough of a snapshot to recognise a version without rendering the whole thing. */
const previewOf = (snapshot: Record<string, unknown>): string => {
  const text = (value: unknown): string =>
    typeof value === "string" ? value.replace(/<[^>]*>/g, " ") : "";

  const candidate =
    text(snapshot.contentHtml) ||
    text(snapshot.excerpt) ||
    text(snapshot.subtitle) ||
    text(snapshot.description) ||
    (Array.isArray(snapshot.items)
      ? snapshot.items
          .map((block) => text((block as { text?: string })?.text))
          .join(" ")
      : "");

  return candidate.replace(/\s+/g, " ").trim();
};

const titleOf = (snapshot: Record<string, unknown>): string => {
  const hero = snapshot.hero as { title?: string } | undefined;
  return (
    (snapshot.title as string) ||
    hero?.title ||
    (snapshot.clientName as string) ||
    "(untitled)"
  );
};

export const RevisionPanel = ({
  type,
  id,
  onClose,
  onRestored,
}: {
  type: RevisionEntity;
  id: string;
  onClose: () => void;
  /** Lets the editor re-seed its form from the restored document. */
  onRestored: () => void;
}) => {
  const toast = useToast();
  const queryClient = useQueryClient();

  const [openId, setOpenId] = useState<string | null>(null);
  const [pendingRestore, setPendingRestore] = useState<RevisionSummary | null>(
    null
  );

  const history = useQuery({
    queryKey: ["revisions", type, id],
    queryFn: () => listRevisions(type, id),
  });

  const detail = useQuery({
    queryKey: ["revision", type, id, openId],
    queryFn: () => getRevision(type, id, openId!),
    enabled: Boolean(openId),
  });

  const restore = useMutation({
    mutationFn: (revisionId: string) => restoreRevision(type, id, revisionId),
    onSuccess: () => {
      toast.success("Version restored");
      setPendingRestore(null);
      // The restore itself created a new snapshot, so the list has changed too.
      void queryClient.invalidateQueries({ queryKey: ["revisions", type, id] });
      onRestored();
      onClose();
    },
    onError: (error) =>
      toast.error(errorMessage(error, "Could not restore that version")),
  });

  const items = history.data?.items ?? [];

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-900/40"
      onClick={onClose}
    >
      <aside
        className="flex h-full w-full max-w-md flex-col bg-white shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-center gap-2 border-b border-slate-200 px-4 py-3">
          <HistoryIcon className="h-4 w-4 text-slate-400" />
          <h2 className="text-base font-semibold text-slate-900">History</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="ml-auto text-slate-400 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto">
          {history.isPending ? (
            <div className="flex justify-center py-16">
              <Spinner className="h-6 w-6" />
            </div>
          ) : history.isError ? (
            <p className="m-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {errorMessage(history.error, "Could not load history")}
            </p>
          ) : items.length === 0 ? (
            <EmptyState
              icon={HistoryIcon}
              title="No earlier versions"
              description="A version is kept each time this is saved."
            />
          ) : (
            <ul className="divide-y divide-slate-100">
              {items.map((item) => {
                const isOpen = openId === item._id;

                return (
                  <li key={item._id} className="px-4 py-3">
                    <div className="flex items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-800">
                          {formatRelative(item.createdAt)}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-400">
                          {formatDateTime(item.createdAt)} &middot;{" "}
                          {item.actorName}
                        </p>
                      </div>

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setOpenId(isOpen ? null : item._id)}
                      >
                        {isOpen ? "Hide" : "View"}
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setPendingRestore(item)}
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Restore
                      </Button>
                    </div>

                    {isOpen && (
                      <div className="mt-2 rounded-lg bg-slate-50 p-3">
                        {detail.isPending ? (
                          <Spinner className="h-4 w-4" />
                        ) : detail.isError ? (
                          <p className="text-xs text-red-700">
                            {errorMessage(detail.error, "Could not load it")}
                          </p>
                        ) : detail.data ? (
                          <>
                            <p className="text-xs font-medium text-slate-700">
                              {titleOf(detail.data.snapshot)}
                            </p>
                            <p className="mt-1 line-clamp-6 text-xs text-slate-500">
                              {previewOf(detail.data.snapshot) ||
                                "No text content in this version."}
                            </p>
                          </>
                        ) : null}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <footer className="border-t border-slate-200 px-4 py-2">
          <p className="text-xs text-slate-400">
            The last {items.length === 20 ? "20" : items.length} save
            {items.length === 1 ? "" : "s"} are kept.
          </p>
        </footer>
      </aside>

      <ConfirmDialog
        open={pendingRestore !== null}
        title="Restore this version?"
        description={
          "The current version is saved to history first, so you can undo this. " +
          "Any unsaved edits in the form will be replaced."
        }
        confirmLabel="Restore"
        loading={restore.isPending}
        onCancel={() => setPendingRestore(null)}
        onConfirm={() => pendingRestore && restore.mutate(pendingRestore._id)}
      />
    </div>
  );
};
