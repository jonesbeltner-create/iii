/**
 * Prefix a bare host with https:// so the iframe and address bar accept
 * inputs like "wikipedia.org" as well as full URLs.
 */
export function normalizeUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}
