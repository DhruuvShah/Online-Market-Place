import type { TagType } from "@/services/base.api";

/**
 * What each of the assistant's tools changes on the server.
 *
 * The assistant does not go through this app to do its work — it calls the
 * services itself — so no mutation runs here and nothing in the cache is ever
 * marked stale. The service reports which tools it ran and this maps them back
 * onto the cache tags that are now out of date.
 *
 * A tool that only reads (searching the catalog) is deliberately absent.
 */
const TAGS_BY_TOOL: Record<string, TagType[]> = {
  addProductToCart: ["Cart"],
};

export function tagsForActions(tools: readonly string[]): TagType[] {
  return [...new Set(tools.flatMap((tool) => TAGS_BY_TOOL[tool] ?? []))];
}
