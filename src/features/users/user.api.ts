import { api, type ApiEnvelope } from "@/lib/api";
import type { AdminRole } from "@/auth/auth.api";

export interface AdminUserRow {
  _id: string;
  name: string;
  email: string;
  role: AdminRole;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

const stripEmpty = (params: Record<string, unknown>) =>
  Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== "" && value != null)
  );

export const listUsers = async (params: {
  page?: number;
  limit?: number;
  q?: string;
  role?: string;
}) => {
  const { data } = await api.get<ApiEnvelope<AdminUserRow[]>>("/admin/users", {
    params: stripEmpty(params),
  });
  return {
    users: data.data,
    meta: data.meta ?? { page: 1, limit: 20, total: data.data.length, totalPages: 1 },
  };
};

export const createUser = async (input: {
  name: string;
  email: string;
  password: string;
  role: AdminRole;
}) => {
  const { data } = await api.post<ApiEnvelope<AdminUserRow>>(
    "/admin/users",
    input
  );
  return data.data;
};

export const updateUser = async (
  id: string,
  changes: {
    name?: string;
    role?: AdminRole;
    isActive?: boolean;
    password?: string;
  }
) => {
  const { data } = await api.patch<ApiEnvelope<AdminUserRow>>(
    `/admin/users/${id}`,
    changes
  );
  return data.data;
};

export const deleteUser = async (id: string): Promise<void> => {
  await api.delete(`/admin/users/${id}`);
};
