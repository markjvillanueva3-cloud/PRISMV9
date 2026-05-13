// tier: T4
/**
 * schema-version-bump.mjs — Phase 1 Tier 5D Workflow Hook
 * Requires schemaVersion in state JSON files.
 */

import * as path from "path";

function isStateJson(filePath) {
  if (!filePath || !filePath.endsWith(".json")) return false;
  return filePath.includes("/state/") || filePath.includes("/data/state/");
}

export default async function schemaVersionBump({ tool, input }) {
  if (tool !== "Write") return { allow: true };
  const filePath = input.file_path || input.path;
  if (!filePath || !isStateJson(filePath)) return { allow: true };
  
  const content = input.content || "";
  try {
    const json = JSON.parse(content);
    if (!json.schemaVersion) {
      return { allow: false, message: `SCHEMA VERSION: ${path.basename(filePath)} needs schemaVersion field.` };
    }
  } catch { /* not valid JSON, let other checks handle */ }
  return { allow: true };
}

export const metadata = { id: "schema-version-bump", phase: "1", tier: "5D", event: "PreToolWrite" };
