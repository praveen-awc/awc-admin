import { api, type ApiEnvelope } from "@/lib/api";

/**
 * Must match validateChangePassword in the backend's middleware/validation.ts.
 * Kept in a constant so the form's hint, its client-side check and the server
 * rule can't drift apart and start disagreeing at submit time.
 */
export const MIN_PASSWORD_LENGTH = 12;

/**
 * Changes the signed-in user's own password.
 *
 * The server bumps tokenVersion, revokes every refresh token and clears both
 * auth cookies, so the session is over the moment this succeeds -- the caller
 * has to send the user back to the login screen rather than carrying on.
 */
export const changePassword = async (input: {
  currentPassword: string;
  newPassword: string;
}): Promise<string> => {
  const { data } = await api.post<ApiEnvelope<null>>(
    "/auth/change-password",
    input
  );
  return data.message ?? "Password changed. Please sign in again.";
};
