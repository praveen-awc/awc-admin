import { api, type ApiEnvelope } from "@/lib/api";
import type { Job, JobInput, JobListItem } from "./job.types";

const stripEmpty = (params: Record<string, unknown>) =>
  Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== "" && value != null)
  );

export interface PagedJobs {
  jobs: JobListItem[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export const listJobs = async (params: {
  page?: number;
  limit?: number;
  q?: string;
  isActive?: string;
}): Promise<PagedJobs> => {
  const { data } = await api.get<ApiEnvelope<JobListItem[]>>("/admin/jobs", {
    params: stripEmpty(params),
  });
  return {
    jobs: data.data,
    meta: data.meta ?? { page: 1, limit: 20, total: data.data.length, totalPages: 1 },
  };
};

export const getJob = async (id: string): Promise<Job> => {
  const { data } = await api.get<ApiEnvelope<Job>>(`/admin/jobs/${id}`);
  return data.data;
};

export const createJob = async (input: JobInput): Promise<Job> => {
  const { data } = await api.post<ApiEnvelope<Job>>("/admin/jobs", input);
  return data.data;
};

export const updateJob = async (id: string, input: JobInput): Promise<Job> => {
  const { data } = await api.put<ApiEnvelope<Job>>(`/admin/jobs/${id}`, input);
  return data.data;
};

export const setJobActive = async (
  id: string,
  isActive: boolean
): Promise<JobListItem> => {
  const { data } = await api.patch<ApiEnvelope<JobListItem>>(
    `/admin/jobs/${id}/status`,
    { isActive }
  );
  return data.data;
};

export const deleteJob = async (id: string): Promise<void> => {
  await api.delete(`/admin/jobs/${id}`);
};
