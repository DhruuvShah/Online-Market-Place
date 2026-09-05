/**
 * The catalog keeps its page in the URL so a reader who opens a product and
 * comes back — or reloads the tab — returns to what they were reading.
 * The param is 1-based because that is the number the pager shows.
 */
export function pageFromParam(value: string | null): number {
  const parsed = Math.trunc(Number(value));
  if (!Number.isFinite(parsed) || parsed < 1) return 0;
  return parsed - 1;
}

export function pageToParam(page: number): string {
  return String(page + 1);
}
