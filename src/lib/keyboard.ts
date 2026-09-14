/**
 * Shared keyboard helpers.
 *
 * The one rule that matters: a shortcut must never fire while someone is
 * typing. The rich text editor is a contenteditable, so "?" and plain letters
 * are ordinary input there -- a global listener that ignored that would make
 * the editor impossible to type in, which is a far worse bug than a missing
 * shortcut.
 */

/** True when the event came from somewhere text is being entered. */
export const isTypingTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) return false;

  if (target.isContentEditable) return true;

  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
};

/** Cmd on macOS, Ctrl everywhere else -- one check for both. */
export const isModifier = (event: KeyboardEvent): boolean =>
  event.metaKey || event.ctrlKey;
