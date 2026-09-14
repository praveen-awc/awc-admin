import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { KeyRound } from "lucide-react";
import {
  changePassword,
  MIN_PASSWORD_LENGTH,
} from "@/features/account/account.api";
import { useAuth } from "@/auth/useAuth";
import { errorMessage } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Field, PasswordInput } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/ListToolbar";
import { useToast } from "@/components/ui/Toast";

/**
 * Lets a signed-in user change their own password.
 *
 * The endpoint existed from the start but nothing called it, so anyone handed
 * a generated password had no way to replace it.
 */
export const ChangePasswordPage = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: changePassword,
    onSuccess: async (message) => {
      toast.success(message);
      /*
       * The server has already revoked every refresh token and cleared both
       * auth cookies, so this session is dead whatever we do here. Clearing
       * local auth state and going to /login makes that explicit, instead of
       * leaving the user on a page whose next request will 401.
       */
      await signOut();
      navigate("/login", { replace: true });
    },
    onError: (caught) =>
      setError(errorMessage(caught, "Could not change the password")),
  });

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    // Checked here so the mismatch is caught before a round trip -- the server
    // never sees confirmPassword and cannot report this one.
    if (newPassword !== confirmPassword) {
      setError("The new passwords do not match.");
      return;
    }

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setError(
        `The new password must be at least ${MIN_PASSWORD_LENGTH} characters.`
      );
      return;
    }

    if (newPassword === currentPassword) {
      setError("The new password must be different from the current one.");
      return;
    }

    mutation.mutate({ currentPassword, newPassword });
  };

  return (
    <div className="max-w-md space-y-4">
      <PageHeader title="Change password" />

      <form
        onSubmit={onSubmit}
        className="space-y-4 rounded-xl bg-white p-5 ring-1 ring-slate-200"
      >
        <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white">
            <KeyRound className="h-4 w-4" />
          </span>
          <div className="leading-tight">
            <p className="text-sm font-medium text-slate-900">{user?.name}</p>
            <p className="text-xs text-slate-500">{user?.email}</p>
          </div>
        </div>

        {/* Hidden username field so password managers file the new credential
            against the right account rather than prompting to create one. */}
        <input
          type="text"
          autoComplete="username"
          value={user?.email ?? ""}
          readOnly
          hidden
        />

        <Field label="Current password" htmlFor="current" required>
          <PasswordInput
            id="current"
            autoComplete="current-password"
            required
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
          />
        </Field>

        <Field
          label="New password"
          htmlFor="new"
          required
          hint={`At least ${MIN_PASSWORD_LENGTH} characters.`}
        >
          <PasswordInput
            id="new"
            autoComplete="new-password"
            required
            minLength={MIN_PASSWORD_LENGTH}
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
          />
        </Field>

        <Field label="Confirm new password" htmlFor="confirm" required>
          <PasswordInput
            id="confirm"
            autoComplete="new-password"
            required
            invalid={confirmPassword !== "" && confirmPassword !== newPassword}
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
          />
        </Field>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 ring-1 ring-amber-200">
          Changing your password signs you out everywhere, on this and any other
          device. You&rsquo;ll need to sign in again with the new one.
        </p>

        <div className="flex gap-2">
          <Button type="submit" size="sm" loading={mutation.isPending}>
            Change password
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => navigate(-1)}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
};
