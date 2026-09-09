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
  /** Key into the /admin/stats response, shown as an unread count. */
  badge?: "applications" | "leads";
  role?: AdminRole;
}

export interface NavSection {
  label: string;
  items: NavItem[];
}

export const NAV: NavSection[] = [
  {
    label: "Overview",
    items: [{ to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" }],
  },
  {
    label: "Content",
    items: [
      { to: "/blogs", icon: FileText, label: "Blog" },
      { to: "/news", icon: Newspaper, label: "News & Events" },
      { to: "/case-studies", icon: Briefcase, label: "Case Studies" },
    ],
  },
  {
    label: "Recruitment",
    items: [
      { to: "/jobs", icon: BriefcaseBusiness, label: "Jobs" },
      {
        to: "/applications",
        icon: Users,
        label: "Applications",
        badge: "applications",
      },
    ],
  },
  {
    label: "Inbox",
    items: [
      { to: "/leads", icon: Mail, label: "Contact Leads", badge: "leads" },
    ],
  },
  {
    label: "Admin",
    items: [{ to: "/settings/users", icon: Shield, label: "Users", role: "admin" }],
  },
];
