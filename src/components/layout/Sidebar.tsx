import { NavLink } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/cn";
import { useAuth } from "@/auth/useAuth";
import { getStats } from "@/features/stats/stats.api";
import { NAV } from "./navConfig";

export const Sidebar = ({ onNavigate }: { onNavigate?: () => void }) => {
  const { user } = useAuth();

  // Unread counts. A failure here must not break navigation, so the badge
  // simply does not render.
  const stats = useQuery({
    queryKey: ["stats"],
    queryFn: getStats,
    staleTime: 60_000,
  });

  const badgeCount = (key: "applications" | "leads"): number =>
    stats.data?.[key]?.new ?? 0;

  return (
    <nav className="flex h-full flex-col gap-6 overflow-y-auto p-4">
      <div className="px-2">
        <span className="text-sm font-semibold tracking-tight text-slate-900">
          AWC Admin
        </span>
      </div>

      {NAV.map((section) => {
        const items = section.items.filter(
          (item) => !item.role || item.role === user?.role
        );
        if (items.length === 0) return null;

        return (
          <div key={section.label}>
            <p className="px-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              {section.label}
            </p>
            <ul className="mt-1.5 space-y-0.5">
              {items.map((item) => {
                const Icon = item.icon;
                const count = item.badge ? badgeCount(item.badge) : 0;

                return (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      onClick={onNavigate}
                      className={({ isActive }) =>
                        cn(
                          "flex items-center gap-2.5 rounded-lg px-2 py-2 text-sm font-medium transition-colors",
                          isActive
                            ? "bg-brand-50 text-brand-700"
                            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                        )
                      }
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="flex-1">{item.label}</span>
                      {count > 0 && (
                        <span className="rounded-full bg-brand-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                          {count > 99 ? "99+" : count}
                        </span>
                      )}
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );
};
