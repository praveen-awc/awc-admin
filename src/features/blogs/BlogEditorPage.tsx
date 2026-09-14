import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
// Aliased: lucide's History would otherwise be shadowed by the DOM's History
// interface, which is a type, not a component.
import { ArrowLeft, ExternalLink, History as HistoryIcon } from "lucide-react";
import { createBlog, getBlog, getBlogFilters, updateBlog } from "./blog.api";
import type { BlogCoverImage, BlogSeo, BlogStatus } from "./blog.types";
import { errorMessage } from "@/lib/api";
import { useAuth } from "@/auth/useAuth";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import { useSeedFromRecord } from "@/hooks/useSeedFromRecord";
import { useFormDraft } from "@/hooks/useFormDraft";
import { useSaveShortcut } from "@/hooks/useSaveShortcut";
import { useVersionGuard } from "@/features/revisions/useVersionGuard";
import { VersionControls } from "@/features/revisions/VersionControls";
import { PUBLIC_SITE_URL } from "@/lib/constants";
import { slugify } from "@/lib/slug";
import { RichTextEditor } from "@/components/editor/RichTextEditor";
import { ImagePicker } from "@/components/forms/ImagePicker";
import { TagInput } from "@/components/forms/TagInput";
import { AuditLine } from "@/components/ui/AuditLine";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { DraftBanner } from "@/components/ui/DraftBanner";
import { Field, Input, Select, Textarea } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";

/** <input type="datetime-local"> needs local time with no timezone suffix. */
const toLocalInput = (iso: string | null): string => {
  if (!iso) return "";
  const date = new Date(iso);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

interface FormState {
  title: string;
  authorName: string;
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
  authorName: "",
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

  const { user } = useAuth();

  // A new post starts with the signed-in user's name so an admin writing their
  // own post types nothing; when they're uploading someone else's, they change
  // it. An existing post keeps whatever byline it was saved with.
  const [form, setForm] = useState<FormState>(() => ({
    ...EMPTY,
    authorName: user?.name ?? "",
  }));

  // Names already used on other posts, offered as suggestions so the same
  // person doesn't end up spelled three different ways.
  const filters = useQuery({
    queryKey: ["blogFilters"],
    queryFn: getBlogFilters,
    staleTime: 60_000,
  });
  const [slugTouched, setSlugTouched] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const version = useVersionGuard();

  const existing = useQuery({
    queryKey: ["blog", id],
    queryFn: () => getBlog(id!),
    enabled: isEditing,
  });

  // Seed the form once the post arrives. Done during render rather than in an
  // effect so the empty form is never painted first -- see useSeedFromRecord.
  if (useSeedFromRecord(existing.data)) {
    const post = existing.data!;
    setForm({
      title: post.title,
      authorName: post.author?.name ?? "",
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
    // The version this form is based on. Sent back on save so a colleague's
    // edit in the meantime is refused rather than overwritten.
    version.seen(post.updatedAt);
    // Seeding is not an edit: leaving this out makes the unsaved-changes guard
    // fire on a post the user has only opened.
    setDirty(false);
  }

  const patch = (changes: Partial<FormState>) => {
    setForm((current) => ({ ...current, ...changes }));
    setDirty(true);
  };

  // Warn before losing unsaved work on tab close / reload.
  // Covers both exits: closing the tab and navigating inside the app. The old
  // beforeunload-only version silently lost work on a sidebar click.
  const blocker = useUnsavedChanges(dirty);

  // Snapshot the form locally while it's dirty, so a crash or a discarded
  // navigation doesn't take the work with it.
  const { draft, clearDraft } = useFormDraft("blog", id, form, {
    enabled: dirty,
    savedAt: existing.data?.updatedAt,
  });

  const effectiveSlug = useMemo(
    () => (slugTouched ? form.slug : slugify(form.title)),
    [slugTouched, form.slug, form.title]
  );

  const save = useMutation({
    // `force` is passed explicitly rather than read from the guard's state:
    // the retry fires in the same render as the prompt closing, so clearing
    // the expectation there would not be visible here yet.
    mutationFn: async (options?: { force?: boolean }) => {
      const payload = {
        title: form.title.trim(),
        author: { name: form.authorName.trim() },
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
        expectedUpdatedAt: options?.force ? null : version.expected,
      };

      return isEditing ? updateBlog(id!, payload) : createBlog(payload);
    },
    onSuccess: (post) => {
      toast.success(isEditing ? "Post updated" : "Post created");
      setDirty(false);
      clearDraft();
      // Now based on what the server just stored, so the next save is guarded
      // again even if this one was a deliberate overwrite.
      version.seen(post.updatedAt);

      // Re-seed from the server: sanitization can change the HTML, and the slug
      // may have been de-duplicated. Show the author what visitors will get.
      setForm((current) => ({
        ...current,
        contentHtml: post.contentHtml,
        authorName: post.author?.name ?? "",
        slug: post.slug,
        excerpt: post.excerpt ?? "",
        publishedAt: toLocalInput(post.publishedAt),
      }));

      void queryClient.invalidateQueries({ queryKey: ["blogs"] });
      if (!isEditing) navigate(`/blogs/${post._id}/edit`, { replace: true });
    },
    onError: (error) => {
      // A lost-update rejection opens the conflict prompt instead; a toast
      // would be the wrong shape for a question that needs an answer.
      if (version.caught(error)) return;
      toast.error(errorMessage(error, "Could not save"));
    },
  });

  const canSave =
    form.title.trim().length > 0 &&
    form.contentHtml.replace(/<[^>]*>/g, "").trim().length > 0 &&
    !save.isPending;

  // Cmd/Ctrl+S. Gated on the same condition as the button, so the shortcut
  // can never submit something the button would refuse.
  useSaveShortcut(() => save.mutate(), canSave);

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
      {draft && (
        <DraftBanner
          savedAt={draft.savedAt}
          onRestore={() => {
            setForm(draft.data);
            setDirty(true);
            clearDraft();
          }}
          onDiscard={clearDraft}
        />
      )}

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

        {/*
          Who uploaded the post, as opposed to the Author field, which is
          whoever wrote it. The two are often different people.
        */}
        <AuditLine
          createdBy={existing.data?.createdBy}
          updatedBy={existing.data?.updatedBy}
          createdAt={existing.data?.createdAt}
          updatedAt={existing.data?.updatedAt}
          className="w-full text-xs text-slate-400"
        />

        <div className="flex items-center gap-2">
          {isEditing && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setHistoryOpen(true)}
            >
              <HistoryIcon className="h-4 w-4" />
              History
            </Button>
          )}
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
            <Field
              label="Author"
              hint="Whoever wrote the post — not necessarily you."
            >
              <Input
                list="blog-authors"
                value={form.authorName}
                placeholder="Full name"
                onChange={(event) => patch({ authorName: event.target.value })}
              />
              <datalist id="blog-authors">
                {(filters.data?.authors ?? []).map((a) => (
                  <option key={a.name} value={a.name} />
                ))}
              </datalist>
            </Field>
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

      <ConfirmDialog
        open={blocker.state === "blocked"}
        title="Leave without saving?"
        description="Your changes on this page will be lost."
        confirmLabel="Discard changes"
        onCancel={() => blocker.reset?.()}
        onConfirm={() => blocker.proceed?.()}
      />

      <VersionControls
        type="blog"
        id={id}
        version={version}
        saving={save.isPending}
        onForce={() => save.mutate({ force: true })}
        historyOpen={historyOpen}
        onCloseHistory={() => setHistoryOpen(false)}
        onRestored={() => {
          // Refetching gives a new object, which re-runs the render-phase seed
          // above and repoints the version guard at what was stored.
          void queryClient.invalidateQueries({ queryKey: ["blog", id] });
          void queryClient.invalidateQueries({ queryKey: ["blogs"] });
          setDirty(false);
          clearDraft();
        }}
      />
    </div>
  );
};
