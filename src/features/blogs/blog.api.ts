import { api, stripEmpty, type ApiEnvelope } from "@/lib/api";
import type {
  Blog,
  BlogInput,
  BlogListItem,
  BlogListParams,
  BlogStatus,
} from "./blog.types";

export interface PagedBlogs {
  posts: BlogListItem[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export const listBlogs = async (
  params: BlogListParams
): Promise<PagedBlogs> => {
  const { data } = await api.get<ApiEnvelope<BlogListItem[]>>("/admin/blogs", {
    // Drop empty filters so they don't become "?status=" on the wire.
    params: stripEmpty(params),
  });

  return {
    posts: data.data,
    meta: data.meta ?? { page: 1, limit: 20, total: data.data.length, totalPages: 1 },
  };
};

export const getBlog = async (id: string): Promise<Blog> => {
  const { data } = await api.get<ApiEnvelope<Blog>>(`/admin/blogs/${id}`);
  return data.data;
};

export const createBlog = async (input: BlogInput): Promise<Blog> => {
  const { data } = await api.post<ApiEnvelope<Blog>>("/admin/blogs", input);
  return data.data;
};

export const updateBlog = async (
  id: string,
  input: Partial<BlogInput>
): Promise<Blog> => {
  const { data } = await api.put<ApiEnvelope<Blog>>(`/admin/blogs/${id}`, input);
  return data.data;
};

export const setBlogStatus = async (
  id: string,
  status: BlogStatus,
  publishedAt?: string | null
): Promise<Blog> => {
  const { data } = await api.patch<ApiEnvelope<Blog>>(
    `/admin/blogs/${id}/status`,
    { status, publishedAt }
  );
  return data.data;
};

export const deleteBlog = async (id: string): Promise<void> => {
  await api.delete(`/admin/blogs/${id}`);
};

export interface PresignResult {
  uploadUrl: string;
  key: string;
  publicUrl: string;
  expiresIn: number;
  maxBytes: number;
}

/** Matches the UploadFolder union in the backend's presign service. */
export type UploadFolder = "blog" | "news" | "casestudies" | "avatars";

export const presignUpload = async (
  folder: UploadFolder,
  fileName: string,
  contentType: string
): Promise<PresignResult> => {
  const { data } = await api.post<ApiEnvelope<PresignResult>>(
    "/admin/uploads/presign",
    { folder, fileName, contentType }
  );
  return data.data;
};

export interface BlogFacet {
  name: string;
  count: number;
}

/**
 * Public endpoint, reused here purely to offer author suggestions in the
 * editor so the same person doesn't end up with several spellings.
 */
export const getBlogFilters = async (): Promise<{
  categories: BlogFacet[];
  tags: BlogFacet[];
  authors: BlogFacet[];
}> => {
  const { data } = await api.get<
    ApiEnvelope<{ categories: BlogFacet[]; tags: BlogFacet[]; authors: BlogFacet[] }>
  >("/blogs/filters");
  return data.data;
};
