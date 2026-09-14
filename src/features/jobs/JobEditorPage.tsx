import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
// History is aliased: the DOM interface of that name shadows lucide's icon.
import { ArrowLeft, History as HistoryIcon } from "lucide-react";
import { createJob, getJob, updateJob } from "./job.api";
import type { JobInput } from "./job.types";
import { errorMessage } from "@/lib/api";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import { useSeedFromRecord } from "@/hooks/useSeedFromRecord";
import { useFormDraft } from "@/hooks/useFormDraft";
import { useSaveShortcut } from "@/hooks/useSaveShortcut";
import { useVersionGuard } from "@/features/revisions/useVersionGuard";
import { VersionControls } from "@/features/revisions/VersionControls";
import { StringListInput } from "@/components/forms/StringListInput";
import { AuditLine } from "@/components/ui/AuditLine";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { DraftBanner } from "@/components/ui/DraftBanner";
import { Field, Input, Select, Textarea } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";

const EMPTY: JobInput = {
  jobCode: "",
  title: "",
  designation: "",
  location: "",
  experience: "",
  totalExperience: "",
  function: "",
  skills: [""],
  workModel: "",
  employmentType: "",
  qualification: "",
  joiningAvailability: "",
  description: "",
  keyResponsibilities: [""],
  mandatorySkills: [],
  requirements: [],
  isActive: true,
};

const WORK_MODELS = ["Onsite", "Hybrid", "Remote"];
const EMPLOYMENT_TYPES = ["Full-time", "Part-time", "Contract", "Internship"];

export const JobEditorPage = () => {
  const { id } = useParams();
  const isEditing = Boolean(id);
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [form, setForm] = useState<JobInput>(EMPTY);
  const [dirty, setDirty] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const version = useVersionGuard();

  const existing = useQuery({
    queryKey: ["job", id],
    queryFn: () => getJob(id!),
    enabled: isEditing,
  });

  // Seeded during render, not in an effect -- see useSeedFromRecord.
  if (useSeedFromRecord(existing.data)) {
    const job = existing.data!;
    setForm({
      jobCode: job.jobCode,
      title: job.title,
      designation: job.designation,
      location: job.location,
      experience: job.experience,
      totalExperience: job.totalExperience,
      function: job.function,
      skills: job.skills?.length ? job.skills : [""],
      workModel: job.workModel,
      employmentType: job.employmentType,
      qualification: job.qualification,
      joiningAvailability: job.joiningAvailability,
      description: job.description,
      keyResponsibilities: job.keyResponsibilities?.length
        ? job.keyResponsibilities
        : [""],
      mandatorySkills: job.mandatorySkills ?? [],
      requirements: job.requirements ?? [],
      isActive: job.isActive,
    });
    // The version this form is based on; sent back on save.
    version.seen(job.updatedAt);
    // Seeding is not an edit -- keeps the unsaved-changes guard quiet.
    setDirty(false);
  }

  const patch = (changes: Partial<JobInput>) => {
    setForm((current) => ({ ...current, ...changes }));
    setDirty(true);
  };

  // Covers both exits: closing the tab and navigating inside the app. The old
  // beforeunload-only version silently lost work on a sidebar click.
  const blocker = useUnsavedChanges(dirty);

  // Snapshot the form locally while it's dirty, so a crash or a discarded
  // navigation doesn't take the work with it.
  const { draft, clearDraft } = useFormDraft("job", id, form, {
    enabled: dirty,
    savedAt: existing.data?.updatedAt,
  });

  const save = useMutation({
    // See BlogEditorPage for why `force` is a parameter and not guard state.
    mutationFn: (options?: { force?: boolean }) => {
      // Blank rows are an artifact of the list editor, not real content.
      const payload: JobInput = {
        ...form,
        expectedUpdatedAt: options?.force ? null : version.expected,
        skills: form.skills.map((s) => s.trim()).filter(Boolean),
        keyResponsibilities: form.keyResponsibilities
          .map((s) => s.trim())
          .filter(Boolean),
        mandatorySkills: form.mandatorySkills.map((s) => s.trim()).filter(Boolean),
        requirements: form.requirements.map((s) => s.trim()).filter(Boolean),
      };
      return isEditing ? updateJob(id!, payload) : createJob(payload);
    },
    onSuccess: (job) => {
      toast.success(isEditing ? "Job updated" : "Job created");
      setDirty(false);
      clearDraft();
      version.seen(job.updatedAt);
      void queryClient.invalidateQueries({ queryKey: ["jobs"] });
      void queryClient.invalidateQueries({ queryKey: ["stats"] });
      if (!isEditing) navigate(`/jobs/${job._id}/edit`, { replace: true });
    },
    onError: (error) => {
      if (version.caught(error)) return;
      toast.error(errorMessage(error, "Could not save"));
    },
  });

  // The job form's button has no disabled condition, so neither does this --
  // only guard against firing a second save while one is in flight.
  useSaveShortcut(() => save.mutate(), !save.isPending);

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
        {errorMessage(existing.error, "Could not load this job")}
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
          <Link to="/jobs" className="text-slate-400 hover:text-slate-700" aria-label="Back">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-xl font-semibold text-slate-900">
            {isEditing ? "Edit job" : "New job"}
          </h1>
          {dirty && <span className="text-xs text-amber-600">Unsaved changes</span>}
        </div>

        {/* Who last touched this. Blank for records saved before it was tracked. */}
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
          <Button size="sm" loading={save.isPending} onClick={() => save.mutate()}>
            {isEditing ? "Save changes" : "Create job"}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-4">
          <section className="space-y-3 rounded-xl bg-white p-4 ring-1 ring-slate-200">
            <h2 className="text-sm font-semibold text-slate-900">Role</h2>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Title" required>
                <Input
                  value={form.title}
                  placeholder="Senior SAP ABAP Consultant"
                  onChange={(event) => patch({ title: event.target.value })}
                />
              </Field>
              <Field
                label="Job code"
                required
                hint="Used in the public URL: /careers/<job code>"
              >
                <Input
                  value={form.jobCode}
                  placeholder="AWC-SAP-014"
                  onChange={(event) => patch({ jobCode: event.target.value })}
                />
              </Field>
              <Field label="Designation" required>
                <Input
                  value={form.designation}
                  onChange={(event) => patch({ designation: event.target.value })}
                />
              </Field>
              <Field label="Function" required>
                <Input
                  value={form.function}
                  placeholder="Technology"
                  onChange={(event) => patch({ function: event.target.value })}
                />
              </Field>
            </div>

            <Field label="Description" required>
              <Textarea
                rows={6}
                value={form.description}
                onChange={(event) => patch({ description: event.target.value })}
              />
            </Field>
          </section>

          <section className="space-y-3 rounded-xl bg-white p-4 ring-1 ring-slate-200">
            <h2 className="text-sm font-semibold text-slate-900">
              Skills &amp; responsibilities
            </h2>

            <Field label="Skills" required>
              <StringListInput
                value={form.skills}
                onChange={(skills) => patch({ skills })}
                placeholder="SAP ABAP"
                addLabel="Add skill"
              />
            </Field>

            <Field label="Key responsibilities" required>
              <StringListInput
                value={form.keyResponsibilities}
                onChange={(keyResponsibilities) => patch({ keyResponsibilities })}
                placeholder="Own end-to-end delivery of…"
                addLabel="Add responsibility"
              />
            </Field>

            <Field label="Mandatory skills">
              <StringListInput
                value={form.mandatorySkills}
                onChange={(mandatorySkills) => patch({ mandatorySkills })}
                addLabel="Add mandatory skill"
              />
            </Field>

            <Field label="Requirements">
              <StringListInput
                value={form.requirements}
                onChange={(requirements) => patch({ requirements })}
                addLabel="Add requirement"
              />
            </Field>
          </section>
        </div>

        <div className="space-y-4">
          <section className="space-y-3 rounded-xl bg-white p-4 ring-1 ring-slate-200">
            <h2 className="text-sm font-semibold text-slate-900">Visibility</h2>
            <Select
              value={form.isActive ? "open" : "closed"}
              onChange={(event) => patch({ isActive: event.target.value === "open" })}
            >
              <option value="open">Open — listed on careers page</option>
              <option value="closed">Closed — hidden from the site</option>
            </Select>
            <p className="text-xs text-slate-500">
              Closing keeps the job and its applications; only the public listing
              hides it.
            </p>
          </section>

          <section className="space-y-3 rounded-xl bg-white p-4 ring-1 ring-slate-200">
            <h2 className="text-sm font-semibold text-slate-900">Details</h2>

            <Field label="Location" required>
              <Input
                value={form.location}
                placeholder="Noida, India"
                onChange={(event) => patch({ location: event.target.value })}
              />
            </Field>

            <Field label="Work model" required>
              <Select
                value={form.workModel}
                onChange={(event) => patch({ workModel: event.target.value })}
              >
                <option value="">Select…</option>
                {WORK_MODELS.map((model) => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Employment type" required>
              <Select
                value={form.employmentType}
                onChange={(event) => patch({ employmentType: event.target.value })}
              >
                <option value="">Select…</option>
                {EMPLOYMENT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Experience" required hint="Shown on the job card">
              <Input
                value={form.experience}
                placeholder="5–8 years"
                onChange={(event) => patch({ experience: event.target.value })}
              />
            </Field>

            <Field label="Total experience" required>
              <Input
                value={form.totalExperience}
                placeholder="8 years"
                onChange={(event) => patch({ totalExperience: event.target.value })}
              />
            </Field>

            <Field label="Qualification" required>
              <Input
                value={form.qualification}
                placeholder="B.Tech / MCA"
                onChange={(event) => patch({ qualification: event.target.value })}
              />
            </Field>

            <Field label="Joining availability" required>
              <Input
                value={form.joiningAvailability}
                placeholder="Immediate to 30 days"
                onChange={(event) =>
                  patch({ joiningAvailability: event.target.value })
                }
              />
            </Field>
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
        type="job"
        id={id}
        version={version}
        saving={save.isPending}
        onForce={() => save.mutate({ force: true })}
        historyOpen={historyOpen}
        onCloseHistory={() => setHistoryOpen(false)}
        onRestored={() => {
          void queryClient.invalidateQueries({ queryKey: ["job", id] });
          void queryClient.invalidateQueries({ queryKey: ["jobs"] });
          setDirty(false);
          clearDraft();
        }}
      />
    </div>
  );
};
