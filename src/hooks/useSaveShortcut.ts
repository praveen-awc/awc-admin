import { useEffect, useRef } from "react";
import { isModifier, isTypingTarget } from "@/lib/keyboard";

/**
 * Cmd/Ctrl+S saves the editor instead of offering to save the web page.
 *
 * Unlike the other shortcuts this one DOES fire while typing -- that is the
 * whole point, since you press it mid-sentence. `preventDefault` is therefore
 * essential: without it the browser opens its "Save page as" dialog, which is
 * both useless here and hard to dismiss.
 *
 * The handler is held in a ref so the listener is bound once. Editors pass a
 * new closure every render (it reads form state), and re-subscribing on each
 * keystroke would add and remove a window listener for every character typed.
 */
export const useSaveShortcut = (onSave: () => void, enabled = true) => {
  const handler = useRef(onSave);

  // Updated after commit, not during render: a ref write while rendering is
  // not safe under concurrent rendering, since that render may be discarded.
  useEffect(() => {
    handler.current = onSave;
  });

  useEffect(() => {
    if (!enabled) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (!isModifier(event) || event.key.toLowerCase() !== "s") return;
      // Not a typing guard: a SELECT has no text to save from, and letting the
      // browser dialog through there would be just as unhelpful.
      if (event.altKey) return;

      event.preventDefault();
      handler.current();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled]);
};

/** Re-exported so editors do not need to know where the guard lives. */
export { isTypingTarget };
