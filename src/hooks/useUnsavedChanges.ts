import { useEffect } from "react";
import { useBlocker, type Blocker } from "react-router-dom";

/**
 * Warns before losing unsaved edits, covering both ways out of a form:
 * closing/reloading the tab (beforeunload) and navigating inside the app
 * (useBlocker).
 *
 * Returns the blocker so the caller can render its own confirm dialog rather
 * than a browser prompt; call blocker.proceed() or blocker.reset() from it.
 */
export const useUnsavedChanges = (dirty: boolean): Blocker => {
  useEffect(() => {
    if (!dirty) return;

    const handler = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  return useBlocker(
    ({ currentLocation, nextLocation }) =>
      // Compare pathnames, not just `dirty`: a query-string change (the list
      // filters write to the URL) and the editor's own post-create
      // navigate(replace) both stay on the same page and must not be blocked.
      dirty && currentLocation.pathname !== nextLocation.pathname
  );
};
