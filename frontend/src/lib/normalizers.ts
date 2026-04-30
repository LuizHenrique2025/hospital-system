export function normalizeLogin(value: string) {
  return value
    .trimStart()
    .toLowerCase()
    .replace(/\s+/g, '.')
    .replace(/[^a-z0-9._-]/g, '');
}
