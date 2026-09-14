import { api, type ApiEnvelope } from "@/lib/api";

export type AdminRole = "admin" | "editor";

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
}

interface SessionPayload {
  user: AdminUser;
}

export const login = async (
  email: string,
  password: string
): Promise<AdminUser> => {
  const { data } = await api.post<ApiEnvelope<SessionPayload>>("/auth/login", {
    email,
    password,
  });
  return data.data.user;
};

export const fetchMe = async (): Promise<AdminUser> => {
  const { data } = await api.get<ApiEnvelope<SessionPayload>>("/auth/me");
  return data.data.user;
};

export const logout = async (): Promise<void> => {
  await api.post("/auth/logout");
};

/**
 * Ends every session for this account, on every device.
 *
 * Two things happen server-side: all refresh tokens are revoked, and the
 * account's tokenVersion is bumped. The second is what makes it immediate --
 * requireAuth compares that number against the one baked into each access
 * token, so tokens already issued stop working on their very next request
 * rather than lingering until they expire.
 *
 * Includes the session calling it: the API clears these cookies too, so the
 * caller has to send the user back to the login screen.
 */
export const logoutEverywhere = async (): Promise<void> => {
  await api.post("/auth/logout-all");
};
