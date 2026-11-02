/** Lowercase ASCII slug: accents stripped, runs of other characters become one hyphen. */
export function slugify(text: string, maxLength: number): string {
  return text
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, maxLength)
    .replace(/-+$/, "");
}

/** A slug plus a short random suffix so two listings or sellers with the same name never collide. */
export function uniqueSlug(text: string, suffix: string, maxLength: number, fallback: string): string {
  return `${slugify(text, maxLength) || fallback}-${suffix.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8)}`;
}
