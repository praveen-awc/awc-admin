import type { AuditActor } from "@/components/ui/AuditLine";
import type { ListQuery } from "@/lib/api";
/**
 * Mirrors awc-backend/src/models/Blog.ts.
 * Keep the two in sync -- a silent field drift here shows up as data that
 * saves but never renders.
 */

export type BlogStatus = "draft" | "published" | "scheduled";

export interface BlogCoverImage {
  url?: string;
  alt?: string;
  width?: number;
  height?: number;
}

export interface BlogSeo {
  metaTitle?: string;
  metaDescription?: string;
  keywords?: string[];
  ogImage?: string;
  canonicalUrl?: string;
  noIndex?: boolean;
}

export interface BlogAuthor {
  userId?: string;
  name?: string;
  avatar?: string;
}

/** Shape returned by list endpoints (contentHtml is projected out). */
export interface BlogListItem {
  _id: string;
  title: string;
  slug: string;
  excerpt?: string;
  coverImage?: BlogCoverImage;
  author?: BlogAuthor;
  category?: string;
  tags: string[];
  status: BlogStatus;
  publishedAt: string | null;
  readingTime: number;
  featured: boolean;
  createdAt: string;
  /**
   * Populated by the admin detail endpoints. Absent on records written
   * before the field existed -- AuditLine renders those without a name.
   */
  createdBy?: AuditActor | string | null;
  updatedBy?: AuditActor | string | null;
  updatedAt: string;
}

export interface Blog extends BlogListItem {
  contentHtml: string;
  previousSlugs: string[];
  viewCount: number;
  seo?: BlogSeo;
}

/** Payload accepted by POST/PUT /api/admin/blogs. */
export interface BlogInput {
  title: string;
  /** Whoever wrote the post -- free text, not an admin user. */
  author?: { name?: string };
  slug?: string;
  excerpt?: string;
  contentHtml: string;
  coverImage?: BlogCoverImage;
  category?: string;
  tags?: string[];
  status?: BlogStatus;
  publishedAt?: string | null;
  featured?: boolean;
  seo?: BlogSeo;
  /**
   * The updatedAt this edit was based on. The server rejects the write with
   * 409 STALE_WRITE if the stored record has moved on since. Null or omitted
   * skips the check, which is what a deliberate overwrite sends.
   */
  expectedUpdatedAt?: string | null;
}

export type BlogListParams = ListQuery & {
  status?: BlogStatus | "";
  category?: string;
};
