import { Construction } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";

/** Placeholder for the Phase 2/3 modules so their routes already resolve. */
export const ComingSoonPage = ({
  title,
  phase,
}: {
  title: string;
  phase: 2 | 3;
}) => (
  <div className="space-y-4">
    <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
    <EmptyState
      icon={Construction}
      title={`${title} arrives in phase ${phase}`}
      description="Blog is phase 1. This module is planned but not built yet."
    />
  </div>
);
