import {
  Activity,
  LayoutDashboard,
  Shield,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { MODULES } from "@/config/modules";
import type { AdminRole } from "@/auth/auth.api";

export interface NavItem {
  to: string;
  icon: LucideIcon;
  label: string;
  /** Key into the /admin/stats response, shown as an unread count. */
  badge?: "applications" | "leads";
  role?: AdminRole;
}

export interface NavSection {
  label: string;
  items: NavItem[];
}

/**
 * Route, label and icon come from MODULES so the sidebar and the dashboard can
 * never disagree; only what's specific to the sidebar -- grouping, unread
 * badges, role gating -- is spelled out here. Dashboard and Users aren't
 * content modules, so they keep their own entries.
 */
export const NAV: NavSection[] = [
  {
    label: "Overview",
    items: [{ to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" }],
  },
  {
    label: "Content",
    items: [{ ...MODULES.blogs }, { ...MODULES.news }, { ...MODULES.caseStudies }],
  },
  {
    label: "Recruitment",
    items: [
      { ...MODULES.jobs },
      { ...MODULES.applications, badge: "applications" },
    ],
  },
  {
    label: "Inbox",
    items: [{ ...MODULES.leads, badge: "leads" }],
  },
  {
    label: "Admin",
    items: [
      { to: "/settings/users", icon: Shield, label: "Users", role: "admin" },
      { to: "/activity", icon: Activity, label: "Activity", role: "admin" },
      { to: "/trash", icon: Trash2, label: "Trash", role: "admin" },
    ],
  },
];
