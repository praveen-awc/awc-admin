import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { FileText, PenLine, CalendarClock } from "lucide-react";
import { listBlogs } from "@/features/blogs/blog.api";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";

const Stat = ({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof FileText;
  label: string;
  value: number | string;
}) => (
  <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
    <div className="flex items-center gap-2 text-slate-500">
      <Icon className="h-4 w-4" />
      <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
    </div>
    <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
  </div>
);

export const DashboardPage = () => {
  const all = useQuery({
    queryKey: ["blogs", { limit: 100 }],
    queryFn: () => listBlogs({ limit: 100 }),
  });

  const posts = all.data?.posts ?? [];
  const now = Date.now();

  const drafts = posts.filter((p) => p.status === "draft").length;
  const scheduled = posts.filter(
    (p) => p.publishedAt != null && new Date(p.publishedAt).getTime() > now
  ).length;
  const live = posts.length - drafts - scheduled;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Dashboard</h1>
        <Link to="/blogs/new">
          <Button size="sm">New post</Button>
        </Link>
      </div>

      {all.isPending ? (
        <Spinner />
      ) : (
        <div className="grid gap-3 sm:grid-cols-3">
          <Stat icon={FileText} label="Published" value={live} />
          <Stat icon={PenLine} label="Drafts" value={drafts} />
          <Stat icon={CalendarClock} label="Scheduled" value={scheduled} />
        </div>
      )}
    </div>
  );
};
