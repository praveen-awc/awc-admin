import type { ReactNode } from "react";
import { useAuth } from "./useAuth";
import type { AdminRole } from "./auth.api";
import { ForbiddenPage } from "@/pages/ForbiddenPage";

/**
 * Hides a branch of the UI from roles that cannot use it.
 *
 * This is UX only. Every one of these is independently enforced by
 * requireRole() on the server -- never rely on this for security.
 */
export const RequireRole = ({
  roles,
  children,
}: {
  roles: AdminRole[];
  children: ReactNode;
}) => {
  const { user } = useAuth();

  if (!user || !roles.includes(user.role)) return <ForbiddenPage />;

  return <>{children}</>;
};
