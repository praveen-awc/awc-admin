import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Briefcase,
  BriefcaseBusiness,
  FileText,
  Mail,
  Newspaper,
  Users,
  type LucideIcon,
} from "lucide-react";
import { getStats } from "@/features/stats/stats.api";
import { useAuth } from "@/auth/useAuth";
import { errorMessage } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";

const Card = ({
  to,
  icon: Icon,
  title,
  primary,
  primaryLabel,
  secondary,
}: {
  to: string;
  icon: LucideIcon;
  title: string;
  primary: number;
  primaryLabel: string;
  secondary?: string;
}) => (
  <Link
    to={to}
    className="rounded-xl bg-white p-4 ring-1 ring-slate-200 transition-shadow hover:shadow-sm"
  >
    <div className="flex items-center gap-2 text-slate-500">
      <Icon className="h-4 w-4" />
      <span className="text-xs font-medium uppercase tracking-wide">{title}</span>
    </div>
    <p className="mt-2 text-2xl font-semibold text-slate-900">{primary}</p>
    <p className="text-xs text-slate-500">{primaryLabel}</p>
    {secondary && <p className="mt-1 text-xs text-slate-400">{secondary}</p>}
  </Link>
);

export const DashboardPage = () => {
  const { user } = useAuth();

  const query = useQuery({ queryKey: ["stats"], queryFn: getStats });

  if (query.isPending) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="h-7 w-7" />
      </div>
    );
  }

  if (query.isError) {
    return (
      <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
        {errorMessage(query.error, "Could not load dashboard")}
      </p>
    );
  }

  const stats = query.data;

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
        <Link to="/blogs/new">
          <Button size="sm">New blog post</Button>
        </Link>
      </div>

      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
          Content
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Card
            to="/blogs"
            icon={FileText}
            title="Blog"
            primary={stats.blogs.live}
            primaryLabel="published"
            secondary={`${stats.blogs.drafts} draft${
              stats.blogs.drafts === 1 ? "" : "s"
            } · ${stats.blogs.scheduled} scheduled`}
          />
          <Card
            to="/news"
            icon={Newspaper}
            title="News & Events"
            primary={stats.news.published}
            primaryLabel="published"
            secondary={`${stats.news.drafts} draft${
              stats.news.drafts === 1 ? "" : "s"
            }`}
          />
          <Card
            to="/case-studies"
            icon={Briefcase}
            title="Case Studies"
            primary={stats.caseStudies.total}
            primaryLabel="published"
          />
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
          Recruitment
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Card
            to="/jobs"
            icon={BriefcaseBusiness}
            title="Jobs"
            primary={stats.jobs.open}
            primaryLabel="open roles"
            secondary={`${stats.jobs.closed} closed`}
          />
          <Card
            to="/applications"
            icon={Users}
            title="Applications"
            primary={stats.applications.new}
            primaryLabel="awaiting review"
            secondary={`${stats.applications.total} total`}
          />
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
          Inbox
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Card
            to="/leads"
            icon={Mail}
            title="Contact Leads"
            primary={stats.leads.new}
            primaryLabel="new enquiries"
            secondary={`${stats.leads.total} total`}
          />
        </div>
      </section>
    </div>
  );
};
