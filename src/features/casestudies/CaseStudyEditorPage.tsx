import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import {
  createCaseStudy,
  getCaseStudy,
  updateCaseStudy,
  type CaseStudyHero,
} from "./caseStudy.api";
import { errorMessage } from "@/lib/api";
import { PUBLIC_SITE_URL } from "@/lib/constants";
import { slugify } from "@/lib/slug";
import {
  BlockEditor,
  CASE_STUDY_BLOCK_TYPES,
  type Block,
} from "@/components/forms/BlockEditor";
import { ImagePicker } from "@/components/forms/ImagePicker";
import { TagInput } from "@/components/forms/TagInput";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";

/** Values the public site maps to technology pages (see loaders.ts). */
const CASE_TYPES = [
  "SAP", "ORACLE", "SALESFORCE", "NEWGEN", "MICROSOFT", "AI/ML", "SERVICENOW",
];

interface FormState {
  slug: string;
  clientName: string;
  industry: string;
  casetype: string;
  hero: CaseStudyHero;
  content: Block[];
  metaDescription: string;
  keywords: string[];
}

const EMPTY: FormState = {
  slug: "",
  clientName: "",
  industry: "",
  casetype: "",
  hero: { title: "", subText: "", ctaText: "", backgroundImage: "", downloadLink: "", logo: "" },
  content: [],
  metaDescription: "",
  keywords: [],
};

export const CaseStudyEditorPage = () => {
  const { id } = useParams();
  const isEditing = Boolean(id);
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [form, setForm] = useState<FormState>(EMPTY);
  const [slugTouched, setSlugTouched] = useState(false);
  const [dirty, setDirty] = useState(false);

  const existing = useQuery({
    queryKey: ["casestudy", id],
    queryFn: () => getCaseStudy(id!),
    enabled: isEditing,
  });

  useEffect(() => {
    const item = existing.data;
    if (!item) return;
    setForm({
      slug: item.slug,
      clientName: item.clientName,
      industry: item.industry ?? "",
      casetype: item.casetype ?? "",
      hero: {
        title: item.hero?.title ?? "",
        subText: item.hero?.subText ?? "",
        ctaText: item.hero?.ctaText ?? "",
        backgroundImage: item.hero?.backgroundImage ?? "",
        downloadLink: item.hero?.downloadLink ?? "",
        logo: item.hero?.logo ?? "",
      },
      content: item.content ?? [],
      metaDescription: item.meta?.description ?? "",
      keywords: item.meta?.keywords ?? [],
    });
    setSlugTouched(true);
    setDirty(false);
  }, [existing.data]);

  const patch = (changes: Partial<FormState>) => {
    setForm((current) => ({ ...current, ...changes }));
    setDirty(true);
  };

  const patchHero = (changes: Partial<CaseStudyHero>) =>
    patch({ hero: { ...form.hero, ...changes } });

  useEffect(() => {
    if (!dirty) return;
    const handler = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const effectiveSlug = slugTouched
    ? form.slug
    : slugify(form.hero.title || form.clientName);

  const save = useMutation({
    mutationFn: () => {
      const payload = {
        slug: effectiveSlug || undefined,
        clientName: form.clientName.trim(),
        industry: form.industry,
        casetype: form.casetype,
        hero: form.hero,
        content: form.content,
        meta: {
          title: form.hero.title,
          description: form.metaDescription,
          keywords: form.keywords,
        },
      };
      return isEditing ? updateCaseStudy(id!, payload) : createCaseStudy(payload);
    },
    onSuccess: (item) => {
      toast.success(isEditing ? "Case study updated" : "Case study created");
      setDirty(false);
      // Blocks are normalised server-side; re-seed from the response.
      setForm((current) => ({
        ...current,
        slug: item.slug,
        content: item.content ?? [],
      }));
      void queryClient.invalidateQueries({ queryKey: ["casestudies"] });
      void queryClient.invalidateQueries({ queryKey: ["stats"] });
      if (!isEditing) navigate(`/case-studies/${item._id}/edit`, { replace: true });
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
        {errorMessage(existing.error, "Could not load this case study")}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link
            to="/case-studies"
            className="text-slate-400 hover:text-slate-700"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-xl font-semibold text-slate-900">
            {isEditing ? "Edit case study" : "New case study"}
          </h1>
          {dirty && <span className="text-xs text-amber-600">Unsaved changes</span>}
        </div>

        <Button
          size="sm"
          disabled={!form.clientName.trim() || !form.hero.title.trim()}
          loading={save.isPending}
          onClick={() => save.mutate()}
        >
          {isEditing ? "Save changes" : "Create case study"}
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-4">
          <section className="space-y-3 rounded-xl bg-white p-4 ring-1 ring-slate-200">
            <h2 className="text-sm font-semibold text-slate-900">Hero</h2>

            <Field label="Headline" required>
              <Input
                value={form.hero.title}
                onChange={(event) => patchHero({ title: event.target.value })}
              />
            </Field>

            <Field label="Sub text">
              <Textarea
                rows={2}
                value={form.hero.subText ?? ""}
                onChange={(event) => patchHero({ subText: event.target.value })}
              />
            </Field>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="CTA text">
                <Input
                  value={form.hero.ctaText ?? ""}
                  placeholder="Download the case study"
                  onChange={(event) => patchHero({ ctaText: event.target.value })}
                />
              </Field>
              <Field label="Download link">
                <Input
                  value={form.hero.downloadLink ?? ""}
                  placeholder="https://…"
                  onChange={(event) => patchHero({ downloadLink: event.target.value })}
                />
              </Field>
            </div>
          </section>

          <Field
            label="Content"
            hint="Blocks render in this order on the public case study page."
          >
            <BlockEditor
              blocks={form.content}
              types={CASE_STUDY_BLOCK_TYPES}
              uploadFolder="casestudies"
              onChange={(content) => patch({ content })}
            />
          </Field>
        </div>

        <div className="space-y-4">
          <section className="space-y-3 rounded-xl bg-white p-4 ring-1 ring-slate-200">
            <h2 className="text-sm font-semibold text-slate-900">Client</h2>

            <Field label="Client name" required>
              <Input
                value={form.clientName}
                onChange={(event) => patch({ clientName: event.target.value })}
              />
            </Field>

            <Field label="Industry">
              <Input
                value={form.industry}
                placeholder="Banking"
                onChange={(event) => patch({ industry: event.target.value })}
              />
            </Field>

            <Field
              label="Technology"
              hint="Drives which technology page lists this case study."
            >
              <Input
                list="casetypes"
                value={form.casetype}
                placeholder="ORACLE"
                onChange={(event) => patch({ casetype: event.target.value })}
              />
              <datalist id="casetypes">
                {CASE_TYPES.map((type) => (
                  <option key={type} value={type} />
                ))}
              </datalist>
            </Field>

            <Field
              label="Slug"
              hint={`URL: ${PUBLIC_SITE_URL}/our-work/${effectiveSlug || "…"}`}
            >
              <Input
                value={effectiveSlug}
                onChange={(event) => {
                  setSlugTouched(true);
                  patch({ slug: event.target.value });
                }}
              />
            </Field>
          </section>

          <section className="space-y-3 rounded-xl bg-white p-4 ring-1 ring-slate-200">
            <h2 className="text-sm font-semibold text-slate-900">Background image</h2>
            <ImagePicker
              url={form.hero.backgroundImage || undefined}
              folder="casestudies"
              showAlt={false}
              onChange={(next) => patchHero({ backgroundImage: next.url ?? "" })}
            />
          </section>

          <section className="space-y-3 rounded-xl bg-white p-4 ring-1 ring-slate-200">
            <h2 className="text-sm font-semibold text-slate-900">Client logo</h2>
            <ImagePicker
              url={form.hero.logo || undefined}
              folder="casestudies"
              showAlt={false}
              onChange={(next) => patchHero({ logo: next.url ?? "" })}
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
            <Field label="Keywords">
              <TagInput
                value={form.keywords}
                onChange={(keywords) => patch({ keywords })}
              />
            </Field>
          </section>
        </div>
      </div>
    </div>
  );
};
