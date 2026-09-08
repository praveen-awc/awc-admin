import { NavLink } from "react-router-dom";
import { cn } from "@/lib/cn";
import { useAuth } from "@/auth/useAuth";
import { NAV } from "./navConfig";

export const Sidebar = ({ onNavigate }: { onNavigate?: () => void }) => {
  const { user } = useAuth();

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

                if (item.phase) {
                  return (
                    <li key={item.to}>
                      <span
                        className="flex cursor-not-allowed items-center gap-2.5 rounded-lg px-2 py-2 text-sm text-slate-400"
                        title={`Coming in phase ${item.phase}`}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="flex-1">{item.label}</span>
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                          Soon
                        </span>
                      </span>
                    </li>
                  );
                }

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
                      {item.label}
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
