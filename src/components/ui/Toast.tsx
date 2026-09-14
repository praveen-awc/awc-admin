import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Bell, CheckCircle2, XCircle, X } from "lucide-react";
import { cn } from "@/lib/cn";

type Tone = "success" | "error" | "info";

interface Toast {
  id: number;
  message: string;
  tone: Tone;
  onClick?: () => void;
}

interface ToastContextValue {
  success: (message: string) => void;
  error: (message: string) => void;
  /**
   * Neither a success nor a failure -- something happened that the admin
   * should know about, like a new application arriving. Optionally clickable,
   * so the toast can take them straight to it.
   */
  info: (message: string, onClick?: () => void) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

// eslint-disable-next-line react-refresh/only-export-components
export const useToast = (): ToastContextValue => {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside <ToastProvider>");
  return context;
};

const TONE_STYLES: Record<Tone, { ring: string; icon: ReactNode }> = {
  success: {
    ring: "ring-emerald-200",
    icon: <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />,
  },
  error: {
    ring: "ring-red-200",
    icon: <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />,
  },
  info: {
    ring: "ring-brand-200",
    icon: <Bell className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />,
  },
};

let nextId = 1;

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (message: string, tone: Tone, onClick?: () => void) => {
      const id = nextId++;
      setToasts((current) => [...current, { id, message, tone, onClick }]);
      // Errors linger longer -- they usually need reading, not just noticing.
      // So does anything clickable: it is useless once it has vanished.
      const ms = tone === "error" || onClick ? 6000 : 3500;
      window.setTimeout(() => dismiss(id), ms);
    },
    [dismiss]
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      success: (message) => push(message, "success"),
      error: (message) => push(message, "error"),
      info: (message, onClick) => push(message, "info", onClick),
    }),
    [push]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-full max-w-sm flex-col gap-2">
        {toasts.map((toast) => {
          const { ring, icon } = TONE_STYLES[toast.tone];

          return (
            <div
              key={toast.id}
              role="status"
              className={cn(
                "pointer-events-auto flex items-start gap-2 rounded-lg bg-white px-3 py-2.5 text-sm text-slate-800 shadow-lg ring-1",
                ring
              )}
            >
              {icon}

              {toast.onClick ? (
                <button
                  type="button"
                  onClick={() => {
                    toast.onClick?.();
                    dismiss(toast.id);
                  }}
                  className="flex-1 text-left hover:underline"
                >
                  {toast.message}
                </button>
              ) : (
                <span className="flex-1">{toast.message}</span>
              )}

              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                className="text-slate-400 hover:text-slate-600"
                aria-label="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};
