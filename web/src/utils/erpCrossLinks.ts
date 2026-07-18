/**
 * ERP Cross-Links — navigation helpers connecting ERP to SFC, PPG, and Learning.
 */

/** Build URL to SFC calculator pre-filled with operation params */
export function sfcRecalculateLink(params: {
  material?: string;
  operation?: string;
  speed?: number;
  feed?: number;
}): string {
  const search = new URLSearchParams();
  if (params.material) search.set("material", params.material);
  if (params.operation) search.set("operation", params.operation);
  if (params.speed) search.set("speed", String(params.speed));
  if (params.feed) search.set("feed", String(params.feed));
  return `/sfc?${search.toString()}`;
}

/** Build URL to PPG with controller and template pre-selected */
export function ppgGenerateLink(params: {
  controller?: string;
  template?: string;
}): string {
  const search = new URLSearchParams();
  if (params.controller) search.set("controller", params.controller);
  if (params.template) search.set("template", params.template);
  return `/ppg?${search.toString()}`;
}

/** Build URL to Learning tool wizard for a specific tool type */
export function learningToolLink(toolType?: string): string {
  if (toolType) return `/learning?tool=${encodeURIComponent(toolType)}`;
  return "/learning";
}

/** Map ERP operation names to PPG template IDs */
export function operationToTemplate(operation: string): string | null {
  const map: Record<string, string> = {
    facing: "facing",
    drilling: "drilling",
    boring: "boring",
    threading: "threading",
    pocketing: "pocket",
    profiling: "profile",
    turning: "turning",
    grooving: "grooving",
    tapping: "tapping",
  };
  return map[operation.toLowerCase()] ?? null;
}
