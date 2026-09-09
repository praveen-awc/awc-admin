import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { createNews, getNews, updateNews, type NewsStatus } from "./news.api";
import { errorMessage } from "@/lib/api";
import { PUBLIC_SITE_URL } from "@/lib/constants";
import { slugify } from "@/lib/slug";
import {
  BlockEditor,
  NEWS_BLOCK_TYPES,
  type Block,
} from "@/components/forms/BlockEditor";
import { ImagePicker } from "@/components/forms/ImagePicker";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";

interface FormState {
  title: string;
  slug: string;
  subtitle: string;
  overlay_image: string;
  logo: string;
  items: Block[];
  status: NewsStatus;
  metaDescription: string;
}

const EMPTY: FormState = {
  title: "",
  slug: "",
  subtitle: "",
  overlay_image: "",
  logo: "",
  items: [],
  status: "draft",
  metaDescription: "",
};

export const NewsEditorPage = () => {
  const { id } = useParams();
  const isEditing = Boolean(id);
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [form, setForm] = useState<FormState>(EMPTY);
  const [slugTouched, setSlugTouched] = useState(false);
  const [dirty, setDirty] = useState(false);

  const existing = useQuery({
    queryKey: ["newsItem", id],
    queryFn: () => getNews(id!),
    enabled: isEditing,
  });

  useEffect(() => {
    const item = existing.data;
    if (!item) return;
    setForm({
      title: item.title,
      slug: item.slug,
      subtitle: item.subtitle ?? "",
      overlay_image: item.overlay_image ?? "",
      logo: item.logo ?? "",
      items: item.items ?? [],
      status: item.status,
      metaDescription: item.seo?.metaDescription ?? "",
    });
    setSlugTouched(true);
    setDirty(false);
  }, [existing.data]);

  const patch = (changes: Partial<FormState>) => {
    setForm((current) => ({ ...current, ...changes }));
    setDirty(true);
  };

  useEffect(() => {
    if (!dirty) return;
    const handler = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const effectiveSlug = slugTouched ? form.slug : slugify(form.title);

  const save = useMutation({
    mutationFn: () =>
      isEditing
        ? updateNews(id!, {
            title: form.title.trim(),
            slug: effectiveSlug,
            subtitle: form.subtitle,
            overlay_image: form.overlay_image || undefined,
            logo: form.logo || "N/A",
            items: form.items,
            status: form.status,
            seo: { metaDescription: form.metaDescription },
          })
        : createNews({
            title: form.title.trim(),
            slug: effectiveSlug || undefined,
            subtitle: form.subtitle,
            overlay_image: form.overlay_image || undefined,
            logo: form.logo || "N/A",
            items: form.items,
            status: form.status,
            seo: { metaDescription: form.metaDescription },
          }),
    onSuccess: (item) => {
      toast.success(isEditing ? "News item updated" : "News item created");
      setDirty(false);
      // Blocks are normalised server-side (markup stripped, empties dropped),
      // so re-seed from the response rather than trusting local state.
      setForm((current) => ({
        ...current,
        slug: item.slug,
        items: item.items ?? [],
      }));
      void queryClient.invalidateQueries({ queryKey: ["news"] });
      void queryClient.invalidateQueries({ queryKey: ["stats"] });
      if (!isEditing) navigate(`/news/${item._id}/edit`, { replace: true });
    },
    onError: (error) => toast.error(errorMessage(error, "Could not save")),
  });

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
        {errorMessage(existing.error, "Could not load this item")}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link to="/news" className="text-slate-400 hover:text-slate-700" aria-label="Back">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-xl font-semibold text-slate-900">
            {isEditing ? "Edit news item" : "New news item"}
          </h1>
          {dirty && <span className="text-xs text-amber-600">Unsaved changes</span>}
        </div>

        <Button
          size="sm"
          disabled={!form.title.trim()}
          loading={save.isPending}
          onClick={() => save.mutate()}
        >
          {isEditing ? "Save changes" : "Create item"}
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-4">
          <Field label="Title" required>
            <Input
              value={form.title}
              onChange={(event) => patch({ title: event.target.value })}
            />
          </Field>

          <Field
            label="Slug"
            hint={`URL: ${PUBLIC_SITE_URL}/news-and-events/${effectiveSlug || "…"}`}
          >
            <Input
              value={effectiveSlug}
              onChange={(event) => {
                setSlugTouched(true);
                patch({ slug: event.target.value });
              }}
            />
          </Field>

          <Field label="Subtitle" hint="Shown under the title in the hero banner.">
            <Input
              value={form.subtitle}
              onChange={(event) => patch({ subtitle: event.target.value })}
            />
          </Field>

          <Field
            label="Content"
            hint="Blocks render in this order on the public page."
          >
            <BlockEditor
              blocks={form.items}
              types={NEWS_BLOCK_TYPES}
              uploadFolder="news"
              onChange={(items) => patch({ items })}
            />
          </Field>
        </div>

        <div className="space-y-4">
          <section className="space-y-3 rounded-xl bg-white p-4 ring-1 ring-slate-200">
            <h2 className="text-sm font-semibold text-slate-900">Publishing</h2>
            <Select
              value={form.status}
              onChange={(event) => patch({ status: event.target.value as NewsStatus })}
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </Select>
          </section>

          <section className="space-y-3 rounded-xl bg-white p-4 ring-1 ring-slate-200">
            <h2 className="text-sm font-semibold text-slate-900">Banner image</h2>
            {/* The News model has no alt field, so the input is hidden. */}
            <ImagePicker
              url={form.overlay_image || undefined}
              folder="news"
              showAlt={false}
              onChange={(next) => patch({ overlay_image: next.url ?? "" })}
            />
          </section>

          <section className="space-y-3 rounded-xl bg-white p-4 ring-1 ring-slate-200">
            <h2 className="text-sm font-semibold text-slate-900">SEO</h2>
            <Field
              label="Meta description"
              hint={`${form.metaDescription.length}/160 shown in Google`}
            >
              <Textarea
                rows={3}
                value={form.metaDescription}
                onChange={(event) => patch({ metaDescription: event.target.value })}
              />
            </Field>
          </section>
        </div>
      </div>
    </div>
  );
};
