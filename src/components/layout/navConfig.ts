import {
  Briefcase,
  BriefcaseBusiness,
  FileText,
  LayoutDashboard,
  Mail,
  Newspaper,
  Shield,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { AdminRole } from "@/auth/auth.api";

export interface NavItem {
  to: string;
  icon: LucideIcon;
  label: string;
  /** Items from a later phase render disabled with a "Soon" pill. */
  phase?: 2 | 3;
  role?: AdminRole;
}

export interface NavSection {
  label: string;
  items: NavItem[];
}

/**
 * The full information architecture is visible from day one so Phase 2 and 3
 * slot in without re-laying-out the sidebar.
 */
export const NAV: NavSection[] = [
  {
    label: "Overview",
    items: [{ to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" }],
  },
  {
    label: "Content",
    items: [
      { to: "/blogs", icon: FileText, label: "Blog" },
      { to: "/news", icon: Newspaper, label: "News & Events", phase: 3 },
      { to: "/case-studies", icon: Briefcase, label: "Case Studies", phase: 3 },
    ],
  },
  {
    label: "Recruitment",
    items: [
      { to: "/jobs", icon: BriefcaseBusiness, label: "Jobs", phase: 2 },
      { to: "/applications", icon: Users, label: "Applications", phase: 2 },
    ],
  },
  {
    label: "Inbox",
    items: [{ to: "/leads", icon: Mail, label: "Contact Leads", phase: 3 }],
  },
  {
    label: "Admin",
    items: [{ to: "/settings/users", icon: Shield, label: "Users", role: "admin" }],
  },
];
