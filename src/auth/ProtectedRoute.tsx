import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./useAuth";
import { FullPageSpinner } from "@/components/ui/Spinner";

export const ProtectedRoute = () => {
  const { status } = useAuth();
  const location = useLocation();

  // "loading" is the first-paint state while /auth/me resolves. Redirecting
  // here would bounce every returning user to the login screen.
  if (status === "loading") return <FullPageSpinner />;

  if (status === "anon") {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
};
