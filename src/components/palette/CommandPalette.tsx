import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CornerDownLeft, Search } from "lucide-react";
import { searchAll, type SearchHit } from "@/features/search/search.api";
import { MODULES } from "@/config/modules";
import { useAuth } from "@/auth/useAuth";
import { cn } from "@/lib/cn";
import { Spinner } from "@/components/ui/Spinner";

/**
 * Cmd/Ctrl+K: go anywhere, or find any record, without leaving the keyboard.
 *
 * Built rather than pulled in. `cmdk` is the obvious dependency, but its main
 * job is client-side filtering of a known list, and the half that matters here
 * -- finding a blog post among hundreds -- is a server query. The repo also
 * already carries three dependencies nothing imports; a fourth that is half
 * used would not help.
 */

interface Command {
  id: string;
  label: string;
  hint: string;
  href: string;
  /** Hidden from editors, who cannot open these pages. */
  adminOnly?: boolean;
}

const COMMANDS: Command[] = [
  { id: "dashboard", label: "Dashboard", hint: "Go to", href: "/dashboard" },
  { id: "blogs", label: MODULES.blogs.label, hint: "Go to", href: MODULES.blogs.to },
  { id: "blog-new", label: "New blog post", hint: "Create", href: "/blogs/new" },
  { id: "news", label: MODULES.news.label, hint: "Go to", href: MODULES.news.to },
  { id: "news-new", label: "New news item", hint: "Create", href: "/news/new" },
  {
    id: "casestudies",
    label: MODULES.caseStudies.label,
    hint: "Go to",
    href: MODULES.caseStudies.to,
  },
  {
    id: "casestudy-new",
    label: "New case study",
    hint: "Create",
    href: "/case-studies/new",
  },
  { id: "jobs", label: MODULES.jobs.label, hint: "Go to", href: MODULES.jobs.to },
  { id: "job-new", label: "New job", hint: "Create", href: "/jobs/new" },
  {
    id: "applications",
    label: MODULES.applications.label,
    hint: "Go to",
    href: MODULES.applications.to,
  },
  { id: "leads", label: MODULES.leads.label, hint: "Go to", href: MODULES.leads.to },
  { id: "activity", label: "Activity", hint: "Go to", href: "/activity", adminOnly: true },
  { id: "users", label: "Users", hint: "Go to", href: "/settings/users", adminOnly: true },
  { id: "trash", label: "Trash", hint: "Go to", href: "/trash", adminOnly: true },
  { id: "password", label: "Change password", hint: "Account", href: "/settings/password" },
];

interface Row {
  key: string;
  label: string;
  hint: string;
  href: string;
}

/**
 * Mounted only while open, so "reset when it opens" is just initial state --
 * no effect, and no cascading render from setting three values on show.
 */
export const CommandPalette = ({ onClose }: { onClose: () => void }) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [term, setTerm] = useState("");
  const [debounced, setDebounced] = useState("");
  const [active, setActive] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  /** Where focus came from, so Escape puts it back. */
  const opener = useRef<HTMLElement | null>(null);

  // Same idea as the list SearchBox, slightly tighter: the palette is a
  // keyboard flow and 300ms is noticeable when you are mid-thought.
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(term), 250);
    return () => window.clearTimeout(timer);
  }, [term]);

  useEffect(() => {
    opener.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    inputRef.current?.focus();

    return () => {
      // Focus restore. Without this, closing the palette leaves focus on
      // <body> and the next Tab starts from the top of the page.
      opener.current?.focus();
    };
  }, []);

  const results = useQuery({
    queryKey: ["search", debounced],
    queryFn: () => searchAll(debounced),
    enabled: debounced.trim().length >= 2,
    staleTime: 30_000,
  });

  const rows: Row[] = useMemo(() => {
    const visible = COMMANDS.filter(
      (command) => !command.adminOnly || user?.role === "admin"
    );

    const needle = term.trim().toLowerCase();

    const commandRows = (
      needle
        ? visible.filter((command) =>
            `${command.hint} ${command.label}`.toLowerCase().includes(needle)
          )
        : visible
    ).map((command) => ({
      key: `command:${command.id}`,
      label: command.label,
      hint: command.hint,
      href: command.href,
    }));

    const hitRows = (results.data ?? []).map((hit: SearchHit) => ({
      key: `hit:${hit.module}:${hit.id}`,
      label: hit.title,
      hint: hit.moduleLabel,
      href: hit.href,
    }));

    // Records first once there are any: if you typed a name, that is what you
    // were looking for, not the page that lists names.
    return [...hitRows, ...commandRows];
  }, [term, results.data, user?.role]);

  // Clamp during render rather than in an effect: results arrive
  // asynchronously and can leave the highlight past the end of a shorter list,
  // which would otherwise be visible for one frame.
  const activeIndex = rows.length === 0 ? 0 : Math.min(active, rows.length - 1);

  const go = (href: string) => {
    onClose();
    navigate(href);
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((index) => (rows.length === 0 ? 0 : (index + 1) % rows.length));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((index) =>
        rows.length === 0 ? 0 : (index - 1 + rows.length) % rows.length
      );
    } else if (event.key === "Enter") {
      event.preventDefault();
      const row = rows[activeIndex];
      if (row) go(row.href);
    } else if (event.key === "Escape") {
      event.preventDefault();
      onClose();
    } else if (event.key === "Tab") {
      // The only focusable thing inside is the input, so trapping is just
      // refusing to leave. Cheaper and more reliable than cycling a list of
      // one, and it keeps the palette keyboard-modal.
      event.preventDefault();
    }
  };

  // Keep the highlighted row on screen when arrowing past the fold.
  useEffect(() => {
    listRef.current
      ?.querySelector('[data-active="true"]')
      ?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/40 p-4 pt-[12vh]"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className="w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-slate-200"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={onKeyDown}
      >
        <div className="flex items-center gap-2 border-b border-slate-100 px-3">
          <Search className="h-4 w-4 shrink-0 text-slate-400" />
          <input
            ref={inputRef}
            value={term}
            onChange={(event) => {
              setTerm(event.target.value);
              setActive(0);
            }}
            placeholder="Search posts, jobs, candidates — or jump to a page"
            aria-label="Search or jump to"
            aria-controls="palette-results"
            className="w-full bg-transparent py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
          />
          {results.isFetching && <Spinner className="h-4 w-4 shrink-0" />}
        </div>

        <ul
          id="palette-results"
          ref={listRef}
          role="listbox"
          className="max-h-80 overflow-y-auto py-1"
        >
          {rows.length === 0 ? (
            <li className="px-3 py-8 text-center text-sm text-slate-400">
              {term.trim().length === 1
                ? "Keep typing…"
                : `Nothing matches “${term}”`}
            </li>
          ) : (
            rows.map((row, index) => {
              const isActive = index === activeIndex;

              return (
                <li key={row.key} role="option" aria-selected={isActive}>
                  <button
                    type="button"
                    data-active={isActive}
                    // Mouse hover moves the highlight so the two selection
                    // models never disagree about what Enter would open.
                    onMouseEnter={() => setActive(index)}
                    onClick={() => go(row.href)}
                    className={cn(
                      "flex w-full items-center gap-2 px-3 py-2 text-left text-sm",
                      isActive ? "bg-brand-50 text-brand-900" : "text-slate-700"
                    )}
                  >
                    <span className="w-24 shrink-0 text-xs uppercase tracking-wide text-slate-400">
                      {row.hint}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{row.label}</span>
                    {isActive && (
                      <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    )}
                  </button>
                </li>
              );
            })
          )}
        </ul>

        <footer className="flex items-center gap-3 border-t border-slate-100 px-3 py-1.5 text-[11px] text-slate-400">
          <span>↑↓ move</span>
          <span>↵ open</span>
          <span>esc close</span>
          <span className="ml-auto">? for shortcuts</span>
        </footer>
      </div>
    </div>
  );
};
