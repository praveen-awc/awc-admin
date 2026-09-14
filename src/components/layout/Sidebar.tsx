import { NavLink } from "react-router-dom";
import { cn } from "@/lib/cn";
import { useAuth } from "@/auth/useAuth";
import { useAdminStats } from "@/features/stats/useAdminStats";
import { NAV } from "./navConfig";
// White mark, not the colour one: the colour logo's "Passion to excel" tagline
// is dark navy and disappears against the sidebar.
import whiteLogo from "@/assets/logos/WhiteLogo.svg";

export const Sidebar = ({ onNavigate }: { onNavigate?: () => void }) => {
  const { user } = useAuth();

  // Unread counts, from the shared polled query -- so the badges now keep
  // themselves current instead of only moving when the admin does something.
  // A failure here must not break navigation, so the badge simply does not
  // render.
  const stats = useAdminStats();

  const badgeCount = (key: "applications" | "leads"): number =>
    stats.data?.[key]?.new ?? 0;

  return (
    <nav className="flex h-full flex-col gap-6 overflow-y-auto p-4 text-slate-300">
      <div className="px-2 py-1">
        <img src={whiteLogo} alt="AWC" className="h-9 w-auto" />
      </div>

      {NAV.map((section) => {
        const items = section.items.filter(
          (item) => !item.role || item.role === user?.role
        );
        if (items.length === 0) return null;

        return (
          <div key={section.label}>
            <p className="px-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
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
                            ? "bg-brand-600 text-white"
                            : "text-slate-300 hover:bg-white/5 hover:text-white"
                        )
                      }
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="flex-1">{item.label}</span>
                      {/* brand-500, not 600: against the dark rail the darker
                          blue sinks into the background. */}
                      {count > 0 && (
                        <span className="rounded-full bg-brand-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
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
