import { api, type ApiEnvelope } from "@/lib/api";

/** Mirrors GET /api/admin/stats -- counts only, one round trip. */
export interface AdminStats {
  blogs: { live: number; drafts: number; scheduled: number };
  news: { published: number; drafts: number };
  caseStudies: { total: number };
  jobs: { open: number; closed: number };
  applications: { total: number; new: number };
  leads: { total: number; new: number };
}

export const getStats = async (): Promise<AdminStats> => {
  const { data } = await api.get<ApiEnvelope<AdminStats>>("/admin/stats");
  return data.data;
};
