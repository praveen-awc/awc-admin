import {
  BookOpen,
  Briefcase,
  FileText,
  Mail,
  Newspaper,
  Users,
  type LucideIcon,
} from "lucide-react";

/**
 * Tailwind scans source for complete class names, so an accent can't be built
 * as `bg-${colour}-50` -- that class would never make it into the stylesheet
 * and the chip would render transparent. Every variant is spelled out.
 */
export interface ModuleAccent {
  /**
   * The icon chip: solid accent, white glyph. A tinted `-50` background was
   * tried first and read as plain white at 36px -- at that size the chip needs
   * the full shade to register as a colour at all.
   *
   * Every shade stays at 600: white on amber-600 clears the 3:1 a non-text
   * graphic needs with little to spare, and 500 would drop below it.
   */
  chip: string;
  /** The count, when it is work waiting to be done. */
  text: string;
  arrowHover: string;
}

const accent = (
  chip: string,
  text: string,
  arrowHover: string
): ModuleAccent => ({ chip, text, arrowHover });

const ACCENTS = {
  blue: accent(
    "bg-blue-600 text-white",
    "text-blue-600",
    "group-hover:text-blue-600"
  ),
  violet: accent(
    "bg-violet-600 text-white",
    "text-violet-600",
    "group-hover:text-violet-600"
  ),
  emerald: accent(
    "bg-emerald-600 text-white",
    "text-emerald-600",
    "group-hover:text-emerald-600"
  ),
  amber: accent(
    "bg-amber-600 text-white",
    "text-amber-600",
    "group-hover:text-amber-600"
  ),
  indigo: accent(
    "bg-indigo-600 text-white",
    "text-indigo-600",
    "group-hover:text-indigo-600"
  ),
  rose: accent(
    "bg-rose-600 text-white",
    "text-rose-600",
    "group-hover:text-rose-600"
  ),
} as const;

export interface AdminModule {
  to: string;
  label: string;
  icon: LucideIcon;
  accent: ModuleAccent;
}

/**
 * The six content areas, defined once. The sidebar and the dashboard both read
 * from here: they used to declare their own icons and had already drifted into
 * giving Case Studies and Jobs two near-identical briefcases.
 *
 * Only the icon is shared with the sidebar -- accents are for the light
 * dashboard cards, and would fight the dark sidebar.
 */
export const MODULES = {
  blogs: {
    to: "/blogs",
    label: "Blog",
    icon: FileText,
    accent: ACCENTS.blue,
  },
  news: {
    to: "/news",
    label: "News & Events",
    icon: Newspaper,
    accent: ACCENTS.violet,
  },
  caseStudies: {
    to: "/case-studies",
    label: "Case Studies",
    icon: BookOpen,
    accent: ACCENTS.emerald,
  },
  jobs: {
    to: "/jobs",
    label: "Jobs",
    icon: Briefcase,
    accent: ACCENTS.amber,
  },
  applications: {
    to: "/applications",
    label: "Applications",
    icon: Users,
    accent: ACCENTS.indigo,
  },
  leads: {
    to: "/leads",
    label: "Contact Leads",
    icon: Mail,
    accent: ACCENTS.rose,
  },
} as const satisfies Record<string, AdminModule>;
