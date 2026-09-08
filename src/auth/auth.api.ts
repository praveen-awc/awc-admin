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
