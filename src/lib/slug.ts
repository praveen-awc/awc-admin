/**
 * Mirrors slugify(input, { lower: true, strict: true }) on the server, so the
 * URL preview shown while typing matches what actually gets stored.
 *
 * The server is still authoritative -- it also de-duplicates against existing
 * slugs, which the client cannot know about.
 */
export const slugify = (input: string): string =>
  input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
