/** Unicode combining marks, stripped so that "Café" and "Cafe" slug identically. */
const COMBINING_MARKS = /[̀-ͯ]/g;

/**
 * Canonical form of a tag name. Uniqueness is enforced on `(ownerId, slug)`, so
 * "Dark Mode", "dark mode" and "dark-mode" all resolve to the same tag rather
 * than to three near-duplicates.
 */
export function slugifyTag(name: string): string {
  return name
    .normalize('NFKD')
    .replace(COMBINING_MARKS, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}
