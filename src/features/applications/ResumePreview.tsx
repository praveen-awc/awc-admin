import { Download, ExternalLink, X } from "lucide-react";
import { Button } from "@/components/ui/Button";

/**
 * Reads a candidate's resume without downloading it first.
 *
 * The URL is a short-lived signed GET with Content-Disposition: inline, so the
 * browser renders the PDF in place. Nothing is written to disk unless the
 * reviewer actually asks for it.
 *
 * <iframe> rather than <embed> or a PDF library: every current browser has a
 * capable built-in viewer with its own zoom, search and page controls, and
 * shipping a renderer to duplicate that would add megabytes for no gain.
 */
export const ResumePreview = ({
  name,
  url,
  downloading,
  onDownload,
  onClose,
}: {
  name: string;
  url: string;
  downloading: boolean;
  onDownload: () => void;
  onClose: () => void;
}) => (
  <div
    className="fixed inset-0 z-50 flex flex-col bg-slate-900/60 p-4 sm:p-8"
    onClick={onClose}
  >
    <div
      className="mx-auto flex h-full w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
      onClick={(event) => event.stopPropagation()}
    >
      <header className="flex shrink-0 items-center gap-3 border-b border-slate-200 px-4 py-3">
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold text-slate-900">
            {name}
          </h2>
          <p className="text-xs text-slate-500">Resume preview</p>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {/* Opens the same signed URL full-screen for anyone who wants the
              browser's own viewer rather than this frame. */}
          <a href={url} target="_blank" rel="noopener noreferrer">
            <Button size="sm" variant="secondary">
              <ExternalLink className="h-4 w-4" />
              Open in tab
            </Button>
          </a>

          <Button size="sm" loading={downloading} onClick={onDownload}>
            <Download className="h-4 w-4" />
            Download
          </Button>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close preview"
            className="text-slate-400 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </header>

      <iframe
        src={url}
        title={`Resume — ${name}`}
        className="min-h-0 flex-1 bg-slate-100"
      />
    </div>
  </div>
);
