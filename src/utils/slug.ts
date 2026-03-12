/**
 * Generate a URL-safe slug from a full name
 * "Francisca Vargas Muñoz" → "francisca-vargas-munoz"
 */
export function generateSlug(fullName: string): string {
  return fullName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/ñ/g, 'n')
    .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
    .trim()
    .replace(/\s+/g, '-') // Spaces to hyphens
    .replace(/-+/g, '-'); // Dedupe hyphens
}

/**
 * Validate slug format: lowercase, a-z, 0-9, hyphens only
 */
export function validateSlug(slug: string): boolean {
  if (!slug || slug.length < 3 || slug.length > 60) return false;
  return /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(slug);
}
