import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { createBlog, getBlog, updateBlog } from "./blog.api";
import type { BlogCoverImage, BlogSeo, BlogStatus } from "./blog.types";
import { errorMessage } from "@/lib/api";
import { RichTextEditor } from "@/components/editor/RichTextEditor";
import { ImagePicker } from "@/components/forms/ImagePicker";
import { TagInput } from "@/components/forms/TagInput";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";

const PUBLIC_SITE_URL = "https://www.awcsoftware.com";

/** Mirrors the backend's slugify(strict) so the preview matches what is stored. */
const slugify = (input: string): string =>
  input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

/** <input type="datetime-local"> needs local time with no timezone suffix. */
const toLocalInput = (iso: string | null): string => {
  if (!iso) return "";
  const date = new Date(iso);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

interface FormState {
  title: string;
  slug: string;
  excerpt: string;
  contentHtml: string;
  coverImage: BlogCoverImage;
  category: string;
  tags: string[];
  status: BlogStatus;
  publishedAt: string;
  featured: boolean;
  seo: BlogSeo;
}

const EMPTY: FormState = {
  title: "",
  slug: "",
  excerpt: "",
  contentHtml: "",
  coverImage: {},
  category: "",
  tags: [],
  status: "draft",
  publishedAt: "",
  featured: false,
  seo: {},
};

export const BlogEditorPage = () => {
  const { id } = useParams();
  const isEditing = Boolean(id);
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [form, setForm] = useState<FormState>(EMPTY);
  const [slugTouched, setSlugTouched] = useState(false);
  const [dirty, setDirty] = useState(false);

  const existing = useQuery({
    queryKey: ["blog", id],
    queryFn: () => getBlog(id!),
    enabled: isEditing,
  });

  // Hydrate the form once the post arrives.
  useEffect(() => {
    const post = existing.data;
    if (!post) return;
    setForm({
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt ?? "",
      contentHtml: post.contentHtml,
      coverImage: post.coverImage ?? {},
      category: post.category ?? "",
      tags: post.tags ?? [],
      status: post.status,
      publishedAt: toLocalInput(post.publishedAt),
      featured: post.featured,
      seo: post.seo ?? {},
    });
    setSlugTouched(true);
    setDirty(false);
  }, [existing.data]);

  const patch = (changes: Partial<FormState>) => {
    setForm((current) => ({ ...current, ...changes }));
    setDirty(true);
  };

  // Warn before losing unsaved work on tab close / reload.
  useEffect(() => {
    if (!dirty) return;
    const handler = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const effectiveSlug = useMemo(
    () => (slugTouched ? form.slug : slugify(form.title)),
    [slugTouched, form.slug, form.title]
  );

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        title: form.title.trim(),
        slug: effectiveSlug || undefined,
        excerpt: form.excerpt.trim() || undefined,
        contentHtml: form.contentHtml,
        coverImage: form.coverImage.url ? form.coverImage : undefined,
        category: form.category.trim() || undefined,
        tags: form.tags,
        status: form.status,
        publishedAt: form.publishedAt
          ? new Date(form.publishedAt).toISOString()
          : null,
        featured: form.featured,
        seo: form.seo,
      };

      return isEditing ? updateBlog(id!, payload) : createBlog(payload);
    },
    onSuccess: (post) => {
      toast.success(isEditing ? "Post updated" : "Post created");
      setDirty(false);

      // Re-seed from the server: sanitization can change the HTML, and the slug
      // may have been de-duplicated. Show the author what visitors will get.
      setForm((current) => ({
        ...current,
        contentHtml: post.contentHtml,
        slug: post.slug,
        excerpt: post.excerpt ?? "",
        publishedAt: toLocalInput(post.publishedAt),
      }));

      void queryClient.invalidateQueries({ queryKey: ["blogs"] });
      if (!isEditing) navigate(`/blogs/${post._id}/edit`, { replace: true });
    },
    onError: (error) => toast.error(errorMessage(error, "Could not save")),
  });

  const canSave =
    form.title.trim().length > 0 &&
    form.contentHtml.replace(/<[^>]*>/g, "").trim().length > 0 &&
    !save.isPending;

  if (isEditing && existing.isPending) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="h-7 w-7" />
      </div>
    );
  }

  if (isEditing && existing.isError) {
    return (
      <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
        {errorMessage(existing.error, "Could not load this post")}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link
            to="/blogs"
            className="text-slate-400 hover:text-slate-700"
            aria-label="Back to posts"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-xl font-semibold text-slate-900">
            {isEditing ? "Edit post" : "New post"}
          </h1>
          {dirty && (
            <span className="text-xs text-amber-600">Unsaved changes</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isEditing && form.status !== "draft" && (
            <a
              href={`${PUBLIC_SITE_URL}/blog/${form.slug}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button size="sm" variant="ghost">
                <ExternalLink className="h-4 w-4" />
                View live
              </Button>
            </a>
          )}
          <Button
            size="sm"
            disabled={!canSave}
            loading={save.isPending}
            onClick={() => save.mutate()}
          >
            {isEditing ? "Save changes" : "Create post"}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        {/* Main column */}
        <div className="space-y-4">
          <Field label="Title" required>
            <Input
              value={form.title}
              placeholder="Oracle Fusion Integration Architecture…"
              onChange={(event) => patch({ title: event.target.value })}
            />
          </Field>

          <Field
            label="Slug"
            hint={`URL: ${PUBLIC_SITE_URL}/blog/${effectiveSlug || "…"}`}
          >
            <Input
              value={effectiveSlug}
              onChange={(event) => {
                setSlugTouched(true);
                patch({ slug: event.target.value });
              }}
            />
          </Field>

          <Field
            label="Excerpt"
            hint={
              form.excerpt
                ? `${form.excerpt.length}/400 characters`
                : "Leave blank and the server writes one from the content."
            }
          >
            <Textarea
              rows={3}
              maxLength={400}
              value={form.excerpt}
              onChange={(event) => patch({ excerpt: event.target.value })}
            />
          </Field>

          <Field label="Content" required>
            <RichTextEditor
              value={form.contentHtml}
              onChange={(html) => patch({ contentHtml: html })}
            />
          </Field>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <section className="space-y-3 rounded-xl bg-white p-4 ring-1 ring-slate-200">
            <h2 className="text-sm font-semibold text-slate-900">Publishing</h2>

            <Field label="Status">
              <Select
                value={form.status}
                onChange={(event) =>
                  patch({ status: event.target.value as BlogStatus })
                }
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="scheduled">Scheduled</option>
              </Select>
            </Field>

            {form.status !== "draft" && (
              <Field
                label={form.status === "scheduled" ? "Publish at" : "Published at"}
                required={form.status === "scheduled"}
                hint={
                  form.status === "scheduled"
                    ? "The post goes live automatically at this time."
                    : undefined
                }
              >
                <Input
                  type="datetime-local"
                  value={form.publishedAt}
                  onChange={(event) => patch({ publishedAt: event.target.value })}
                />
              </Field>
            )}

            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.featured}
                onChange={(event) => patch({ featured: event.target.checked })}
                className="h-4 w-4 rounded border-slate-300 text-brand-600"
              />
              Feature this post
            </label>
          </section>

          <section className="space-y-3 rounded-xl bg-white p-4 ring-1 ring-slate-200">
            <h2 className="text-sm font-semibold text-slate-900">Cover image</h2>
            <ImagePicker
              url={form.coverImage.url}
              alt={form.coverImage.alt}
              onChange={(next) => patch({ coverImage: next })}
            />
          </section>

          <section className="space-y-3 rounded-xl bg-white p-4 ring-1 ring-slate-200">
            <h2 className="text-sm font-semibold text-slate-900">Organisation</h2>
            <Field label="Category">
              <Input
                value={form.category}
                placeholder="Oracle"
                onChange={(event) => patch({ category: event.target.value })}
              />
            </Field>
            <Field label="Tags">
              <TagInput
                value={form.tags}
                onChange={(tags) => patch({ tags })}
              />
            </Field>
          </section>

          <section className="space-y-3 rounded-xl bg-white p-4 ring-1 ring-slate-200">
            <h2 className="text-sm font-semibold text-slate-900">SEO</h2>

            <Field
              label="Meta title"
              hint={`${(form.seo.metaTitle ?? "").length}/60 shown in Google`}
            >
              <Input
                value={form.seo.metaTitle ?? ""}
                onChange={(event) =>
                  patch({ seo: { ...form.seo, metaTitle: event.target.value } })
                }
              />
            </Field>

            <Field
              label="Meta description"
              hint={`${(form.seo.metaDescription ?? "").length}/160 shown in Google`}
            >
              <Textarea
                rows={3}
                value={form.seo.metaDescription ?? ""}
                onChange={(event) =>
                  patch({
                    seo: { ...form.seo, metaDescription: event.target.value },
                  })
                }
              />
            </Field>

            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.seo.noIndex ?? false}
                onChange={(event) =>
                  patch({ seo: { ...form.seo, noIndex: event.target.checked } })
                }
                className="h-4 w-4 rounded border-slate-300 text-brand-600"
              />
              Hide from search engines
            </label>
          </section>
        </div>
      </div>
    </div>
  );
};
