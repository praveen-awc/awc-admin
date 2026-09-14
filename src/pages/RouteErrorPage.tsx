import {
  isRouteErrorResponse,
  useNavigate,
  useRouteError,
} from "react-router-dom";
import { AlertTriangle, Home, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { NotFoundPage } from "./NotFoundPage";

/**
 * Rendered by the router whenever a page throws while rendering.
 *
 * Without this the panel had no error boundary at all, so a single bad field
 * on one record took the whole app down and showed React Router's built-in
 * developer screen -- raw stack trace, no sidebar, no way back. That is the
 * wrong thing to put in front of the people this panel is handed to.
 *
 * Attached to the route INSIDE AdminLayout, so the shell survives: the user
 * still has the sidebar and can navigate somewhere that works.
 */
export const RouteErrorPage = () => {
  const error = useRouteError();
  const navigate = useNavigate();

  // A genuine 404 is not a failure -- show the normal not-found page.
  if (isRouteErrorResponse(error) && error.status === 404) {
    return <NotFoundPage />;
  }

  const status = isRouteErrorResponse(error) ? error.status : 500;
  const message =
    error instanceof Error
      ? error.message
      : isRouteErrorResponse(error)
        ? error.statusText
        : "Unknown error";

  return (
    <div className="mx-auto max-w-lg py-12 text-center">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
        <AlertTriangle className="h-6 w-6" />
      </span>

      <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
        Error {status}
      </p>
      <h1 className="mt-1 text-xl font-semibold text-slate-900">
        This page didn&rsquo;t load
      </h1>
      <p className="mt-2 text-sm text-slate-500">
        Something went wrong while showing this screen. Your data is safe —
        nothing was changed.
      </p>

      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Button size="sm" onClick={() => window.location.reload()}>
          <RefreshCw className="h-4 w-4" />
          Try again
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => navigate("/dashboard")}
        >
          <Home className="h-4 w-4" />
          Back to dashboard
        </Button>
      </div>

      {/*
        Developers get the detail; everyone else gets the message above. Vite
        strips this branch from the production bundle.
      */}
      {import.meta.env.DEV && (
        <pre className="mt-8 overflow-x-auto rounded-lg bg-slate-900 p-3 text-left text-xs text-slate-200">
          {message}
          {error instanceof Error && error.stack ? `\n\n${error.stack}` : ""}
        </pre>
      )}
    </div>
  );
};
