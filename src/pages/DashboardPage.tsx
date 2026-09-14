import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { MODULES, type AdminModule } from "@/config/modules";
import { getStats } from "@/features/stats/stats.api";
import { listLeads } from "@/features/leads/lead.api";
import { listApplications } from "@/features/applications/application.api";
import { useAuth } from "@/auth/useAuth";
import { errorMessage } from "@/lib/api";
import { formatRelative } from "@/lib/format";
import { Spinner } from "@/components/ui/Spinner";

/**
 * Route, label, icon and colour all travel together on the module, so a card
 * can't end up pointing one place and labelled another.
 *
 * `attention` marks a count that represents work waiting to be done (unreviewed
 * applications, unanswered enquiries) rather than a neutral total. It colours
 * the number so the eye lands on it first -- but only while the count is
 * non-zero: an emptied queue is not something to shout about. The chip stays
 * solid either way; it identifies the module, it doesn't signal urgency.
 */
const StatCard = ({
  module: { to, label, icon: Icon, accent },
  primary,
  primaryLabel,
  secondary,
  attention = false,
}: {
  module: AdminModule;
  primary: number;
  primaryLabel: string;
  secondary?: string;
  attention?: boolean;
}) => {
  const urgent = attention && primary > 0;

  return (
    <Link
      to={to}
      className="group rounded-xl bg-white p-5 ring-1 ring-slate-200 transition-all hover:ring-slate-300 hover:shadow-md"
    >
      <div className="flex items-center gap-2.5">
        <span
          className={`flex h-9 w-9 items-center justify-center rounded-lg ${accent.chip}`}
        >
          <Icon className="h-4 w-4" />
        </span>
        <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
          {label}
        </span>
        <ArrowRight
          className={`ml-auto h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-0.5 ${accent.arrowHover}`}
        />
      </div>

      <p
        className={`mt-3 text-3xl font-semibold tabular-nums ${
          urgent ? accent.text : "text-slate-900"
        }`}
      >
        {primary}
      </p>
      <p className="text-xs text-slate-500">{primaryLabel}</p>
      {secondary && <p className="mt-1 text-xs text-slate-400">{secondary}</p>}
    </Link>
  );
};

const RecentPanel = ({
  title,
  viewAllTo,
  loading,
  empty,
  children,
}: {
  title: string;
  viewAllTo: string;
  loading: boolean;
  empty: boolean;
  children: React.ReactNode;
}) => (
  <section className="rounded-xl bg-white ring-1 ring-slate-200">
    <header className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </h2>
      <Link
        to={viewAllTo}
        className="text-xs font-medium text-brand-600 hover:underline"
      >
        View all
      </Link>
    </header>

    {loading ? (
      <div className="flex justify-center py-10">
        <Spinner />
      </div>
    ) : empty ? (
      <p className="px-5 py-8 text-center text-sm text-slate-400">
        Nothing yet.
      </p>
    ) : (
      <ul className="divide-y divide-slate-100">{children}</ul>
    )}
  </section>
);

export const DashboardPage = () => {
  const { user } = useAuth();

  const stats = useQuery({ queryKey: ["stats"], queryFn: getStats });

  // Counts alone don't say who is waiting. These two make the dashboard
  // somewhere you can act from, not just a scoreboard.
  const recentLeads = useQuery({
    queryKey: ["leads", { page: 1, limit: 5 }],
    queryFn: () => listLeads({ page: 1, limit: 5 }),
  });
  const recentApplications = useQuery({
    queryKey: ["applications", { page: 1, limit: 5 }],
    queryFn: () => listApplications({ page: 1, limit: 5 }),
  });

  if (stats.isPending) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="h-7 w-7" />
      </div>
    );
  }

  if (stats.isError) {
    return (
      <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
        {errorMessage(stats.error, "Could not load dashboard")}
      </p>
    );
  }

  const s = stats.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            Welcome back, {user?.name?.split(" ")[0]}
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Everything on awcsoftware.com you can change from here.
          </p>
        </div>
      </div>

      {/*
        One grid rather than three sections of 3, 2 and 1 cards: those left one
        and two empty slots on the second and third rows. Six cards at three
        columns fills two rows exactly, and the sidebar already groups these.
      */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          module={MODULES.blogs}
          primary={s.blogs.live}
          primaryLabel="published"
          secondary={`${s.blogs.drafts} draft${
            s.blogs.drafts === 1 ? "" : "s"
          } · ${s.blogs.scheduled} scheduled`}
        />
        <StatCard
          module={MODULES.news}
          primary={s.news.published}
          primaryLabel="published"
          secondary={`${s.news.drafts} draft${s.news.drafts === 1 ? "" : "s"}`}
        />
        <StatCard
          module={MODULES.caseStudies}
          primary={s.caseStudies.total}
          primaryLabel="published"
        />
        <StatCard
          module={MODULES.jobs}
          primary={s.jobs.open}
          primaryLabel="open roles"
          secondary={`${s.jobs.closed} closed`}
        />
        <StatCard
          module={MODULES.applications}
          primary={s.applications.new}
          primaryLabel="awaiting review"
          secondary={`${s.applications.total} total`}
          attention
        />
        <StatCard
          module={MODULES.leads}
          primary={s.leads.new}
          primaryLabel="new enquiries"
          secondary={`${s.leads.total} total`}
          attention
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <RecentPanel
          title="Latest enquiries"
          viewAllTo="/leads"
          loading={recentLeads.isPending}
          empty={(recentLeads.data?.leads.length ?? 0) === 0}
        >
          {(recentLeads.data?.leads ?? []).map((lead) => (
            <li key={lead._id} className="px-5 py-3">
              <div className="flex items-baseline gap-2">
                <span className="truncate text-sm font-medium text-slate-900">
                  {lead.fullName}
                </span>
                <span className="ml-auto shrink-0 text-xs text-slate-400">
                  {formatRelative(lead.createdAt)}
                </span>
              </div>
              <p className="mt-0.5 truncate text-xs text-slate-500">
                {lead.companyName} &middot; {lead.country}
              </p>
            </li>
          ))}
        </RecentPanel>

        <RecentPanel
          title="Latest applications"
          viewAllTo="/applications"
          loading={recentApplications.isPending}
          empty={(recentApplications.data?.applications.length ?? 0) === 0}
        >
          {(recentApplications.data?.applications ?? []).map((application) => (
            <li key={application._id} className="px-5 py-3">
              <div className="flex items-baseline gap-2">
                <span className="truncate text-sm font-medium text-slate-900">
                  {application.fullName}
                </span>
                <span className="ml-auto shrink-0 text-xs text-slate-400">
                  {formatRelative(application.createdAt)}
                </span>
              </div>
              <p className="mt-0.5 truncate text-xs text-slate-500">
                {/* The job row can be deleted while its applications remain. */}
                {application.jobId?.title ?? "Job removed"}
              </p>
            </li>
          ))}
        </RecentPanel>
      </div>
    </div>
  );
};
