import { useEffect } from "react";
import { X } from "lucide-react";

/** Cmd on macOS, Ctrl elsewhere -- shown as whichever the reader actually has. */
const MOD =
  typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform)
    ? "⌘"
    : "Ctrl";

const SHORTCUTS: { keys: string[]; what: string }[] = [
  { keys: [MOD, "K"], what: "Search everything, or jump to a page" },
  { keys: [MOD, "S"], what: "Save, in any editor" },
  { keys: ["?"], what: "This list" },
  { keys: ["↑", "↓"], what: "Move through results" },
  { keys: ["↵"], what: "Open the highlighted result" },
  { keys: ["Esc"], what: "Close whatever is open" },
];

export const ShortcutsHelp = ({ onClose }: { onClose: () => void }) => {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="mb-3 flex items-center">
          <h2 className="text-base font-semibold text-slate-900">
            Keyboard shortcuts
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="ml-auto text-slate-400 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <dl className="space-y-2">
          {SHORTCUTS.map((shortcut) => (
            <div key={shortcut.what} className="flex items-center gap-3">
              <dt className="flex w-24 shrink-0 gap-1">
                {shortcut.keys.map((key) => (
                  <kbd
                    key={key}
                    className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-xs font-medium text-slate-600"
                  >
                    {key}
                  </kbd>
                ))}
              </dt>
              <dd className="text-sm text-slate-600">{shortcut.what}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
};
