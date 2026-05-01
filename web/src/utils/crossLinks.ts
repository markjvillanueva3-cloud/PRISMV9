/**
 * L8-P1-MS2 P0-U13: Cross-Links to SFC & PPG
 * Navigation helpers that pre-fill SFC calculator and PPG templates.
 */

/** Build SFC calculator URL pre-filled with material */
export function buildSfcUrl(material: string): string {
  const params = new URLSearchParams({ material });
  return `/calculator?${params.toString()}`;
}

/** Build PPG post-processor URL pre-filled with operation type */
export function buildPpgUrl(operation: string): string {
  const params = new URLSearchParams({ operation });
  return `/ppg?${params.toString()}`;
}

/** Build learning knowledge URL for a topic */
export function buildKnowledgeUrl(query: string, domain?: string): string {
  const params = new URLSearchParams({ q: query });
  if (domain) params.set('domain', domain);
  return `/learning/knowledge?${params.toString()}`;
}
