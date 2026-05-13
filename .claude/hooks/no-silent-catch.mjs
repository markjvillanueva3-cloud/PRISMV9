// tier: T4
/**
 * no-silent-catch.mjs — Phase 1 Tier 5D Workflow Hook
 * Blocks empty catch blocks in engines.
 */

import * as path from "path";

const SILENT_CATCH = /catch\s*\([^)]*\)\s*\{\s*\}/;

function isEngineFile(filePath) {
  return filePath && filePath.includes("/engines/") && filePath.endsWith(".ts");
}

export default async function noSilentCatch({ tool, input }) {
  if (tool !== "Write" && tool !== "Edit") return { allow: true };
  const filePath = input.file_path || input.path;
  if (!filePath || !isEngineFile(filePath)) return { allow: true };
  
  const content = input.content || input.new_string || "";
  if (SILENT_CATCH.test(content)) {
    return { allow: false, message: `NO SILENT CATCH: Empty catch block in ${path.basename(filePath)}. Log or rethrow errors.` };
  }
  return { allow: true };
}

export const metadata = { id: "no-silent-catch", phase: "1", tier: "5D", event: "PreToolWrite" };
