import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { ChevronDown, KeyRound, LogOut, ShieldOff } from "lucide-react";
import { logoutEverywhere } from "@/auth/auth.api";
import { useAuth } from "@/auth/useAuth";
import { errorMessage } from "@/lib/api";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";

/**
 * The account menu in the top bar.
 *
 * Sign out used to be a bare button here. It became a menu so "Change
 * password" and "Sign out everywhere" have somewhere to live -- both endpoints
 * existed but had no entry point anywhere in the panel.
 */
export const UserMenu = () => {
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [confirmAll, setConfirmAll] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const toast = useToast();

  /**
   * Kills every session for this account, this one included -- the API clears
   * these cookies too. So the local auth state is dropped and the user is sent
   * to the login screen rather than left on a page whose next request will 401.
   */
  const signOutEverywhere = useMutation({
    mutationFn: logoutEverywhere,
    onSuccess: async () => {
      toast.success("Signed out on every device");
      setConfirmAll(false);
      await signOut();
      navigate("/login", { replace: true });
    },
    onError: (error) =>
      toast.error(errorMessage(error, "Could not sign out everywhere")),
  });

  // Close on an outside click or Escape. Without this the panel stays open
  // behind whatever the user clicks next.
  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!wrapper.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={wrapper} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-100"
      >
        <span className="text-right leading-tight">
          <span className="block text-sm font-medium text-slate-900">
            {user?.name}
          </span>
          <span className="block text-xs capitalize text-slate-500">
            {user?.role}
          </span>
        </span>
        <ChevronDown
          className={`h-4 w-4 text-slate-400 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-1 w-56 overflow-hidden rounded-lg bg-white py-1 shadow-lg ring-1 ring-slate-200"
        >
          <p className="truncate px-3 py-2 text-xs text-slate-500">
            {user?.email}
          </p>
          <div className="my-1 border-t border-slate-100" />

          <Link
            to="/settings/password"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            <KeyRound className="h-4 w-4 text-slate-400" />
            Change password
          </Link>

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              void signOut();
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
          >
            <LogOut className="h-4 w-4 text-slate-400" />
            Sign out
          </button>

          {/* Red and separated: this is one click from ending every session,
              and it must never be mistaken for the plain sign out above. */}
          <div className="my-1 border-t border-slate-100" />
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              setConfirmAll(true);
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
          >
            <ShieldOff className="h-4 w-4" />
            Sign out everywhere
          </button>
        </div>
      )}

      <ConfirmDialog
        open={confirmAll}
        title="Sign out on every device?"
        description="Every session for this account ends immediately, including this one. You'll need to sign in again. Use this if a device was lost or you think someone else has your password."
        confirmLabel="Sign out everywhere"
        loading={signOutEverywhere.isPending}
        onCancel={() => setConfirmAll(false)}
        onConfirm={() => signOutEverywhere.mutate()}
      />
    </div>
  );
};
