export function sanitizePostgrestSearch(value: string) {
  return value.replace(/[%,_*()\\"]/g, ' ').replace(/\s+/g, ' ').trim();
}
