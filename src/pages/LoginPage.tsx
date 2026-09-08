import { useState, type FormEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/useAuth";
import { errorMessage } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { FullPageSpinner } from "@/components/ui/Spinner";

export const LoginPage = () => {
  const { status, signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (status === "loading") return <FullPageSpinner />;

  if (status === "authed") {
    // Send the user back where they were headed before the redirect.
    const from = (location.state as { from?: { pathname: string } } | null)?.from;
    return <Navigate to={from?.pathname ?? "/blogs"} replace />;
  }

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signIn(email, password);
      navigate("/blogs", { replace: true });
    } catch (caught) {
      setError(errorMessage(caught, "Could not sign in"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h1 className="text-lg font-semibold text-slate-900">AWC Admin</h1>
        <p className="mt-1 text-sm text-slate-500">
          Sign in to manage site content.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <Field label="Email" htmlFor="email" required>
            <Input
              id="email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </Field>

          <Field label="Password" htmlFor="password" required>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </Field>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <Button type="submit" loading={submitting} className="w-full">
            Sign in
          </Button>
        </form>
      </div>
    </div>
  );
};
