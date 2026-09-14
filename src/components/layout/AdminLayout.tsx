import { useEffect, useRef, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Menu, Search, X } from "lucide-react";
import { useActivityNotifications } from "@/hooks/useActivityNotifications";
import { isModifier, isTypingTarget } from "@/lib/keyboard";
import { CommandPalette } from "@/components/palette/CommandPalette";
import { ShortcutsHelp } from "@/components/palette/ShortcutsHelp";
import { NotificationBell } from "./NotificationBell";
import { Sidebar } from "./Sidebar";
import { UserMenu } from "./UserMenu";

/** Matches the modifier the shortcut actually uses on this platform. */
const MOD_LABEL =
  typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform)
    ? "⌘"
    : "Ctrl ";

export const AdminLayout = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  // Here rather than in a page: this shell never unmounts, so the polling and
  // the tab-title count survive navigation between pages.
  useActivityNotifications();

  /**
   * The app's global shortcuts, bound once here rather than per page.
   *
   * Both are guarded against firing while someone is typing -- the blog editor
   * is a contenteditable, so an unguarded "?" would make the character
   * impossible to type. Cmd+K is guarded too: inside the palette's own input
   * it should close, which it does through the palette's own handler.
   */
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isModifier(event) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((open) => !open);
        return;
      }

      if (event.key === "?" && !isTypingTarget(event.target)) {
        event.preventDefault();
        setHelpOpen(true);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const mainRef = useRef<HTMLElement>(null);
  const { pathname } = useLocation();

  /**
   * <main> is the scroll container, not the window, so React Router's usual
   * scroll behaviour does not apply. Without this, scrolling halfway down the
   * leads list and then navigating elsewhere lands you mid-page.
   */
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 });
  }, [pathname]);

  return (
    /*
     * App shell: the frame itself never scrolls, only <main> does, so the
     * sidebar and top bar stay put.
     *
     * h-dvh rather than h-screen -- on mobile browsers 100vh ignores the
     * address bar and overflows the visible area.
     */
    <div className="flex h-dvh overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 border-r border-white/10 bg-ink-900 lg:block">
        <Sidebar />
      </aside>

      {/* Mobile drawer -- fixed to the viewport, so the shell does not clip it */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        >
          <aside
            // Same surface as the desktop rail, so the two don't disagree.
            className="h-full w-60 bg-ink-900"
            onClick={(event) => event.stopPropagation()}
          >
            <Sidebar onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      {/* overflow-hidden lets this flex child shrink, which is what makes the
          overflow-y-auto on <main> below actually take effect. */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4">
          <button
            type="button"
            className="text-slate-500 hover:text-slate-900 lg:hidden"
            onClick={() => setMobileOpen((open) => !open)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          {/* Discoverability: the shortcut is worth nothing if nobody knows
              it exists. Opens the palette on click for mouse users too. */}
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="ml-auto hidden items-center gap-2 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-400 hover:bg-slate-50 hover:text-slate-600 sm:flex"
          >
            <Search className="h-3.5 w-3.5" />
            Search
            <kbd className="rounded border border-slate-200 bg-slate-50 px-1 py-0.5 text-[10px] font-medium">
              {MOD_LABEL}K
            </kbd>
          </button>

          <div className="ml-auto flex items-center gap-1 sm:ml-2">
            <NotificationBell />
            <UserMenu />
          </div>
        </header>

        {/* The one scroll container in the app. */}
        <main
          ref={mainRef}
          className="min-w-0 flex-1 overflow-y-auto p-4 lg:p-6"
        >
          <Outlet />
        </main>
      </div>

      {/* Mounted per open, so it starts empty every time without a reset
          effect. Same pattern as ShortcutsHelp below. */}
      {paletteOpen && <CommandPalette onClose={() => setPaletteOpen(false)} />}
      {helpOpen && <ShortcutsHelp onClose={() => setHelpOpen(false)} />}
    </div>
  );
};
