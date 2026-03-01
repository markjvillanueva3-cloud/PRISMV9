/**
 * Cross-page navigation utilities.
 * Links Learning wizards to SFC calculator and PPG generator.
 */

/** Build SFC calculator URL pre-filled with material */
export function buildSfcUrl(material: string): string {
  return `/sfc?material=${encodeURIComponent(material)}`;
}

/** Build PPG URL pre-filled with operation type */
export function buildPpgUrl(operation: string): string {
  return `/ppg?operation=${encodeURIComponent(operation)}`;
}

/** Build learning knowledge search URL with query */
export function buildKnowledgeUrl(query: string, domain?: string): string {
  const params = new URLSearchParams({ q: query });
  if (domain) params.set("domain", domain);
  return `/learning/knowledge?${params.toString()}`;
}

/** Build learning assessment URL for specific domains */
export function buildAssessmentUrl(domains?: string[]): string {
  if (!domains?.length) return "/learning/assessment";
  return `/learning/assessment?domains=${domains.join(",")}`;
}
