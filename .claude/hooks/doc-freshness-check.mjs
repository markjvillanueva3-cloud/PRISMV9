// tier: T4
/**
 * doc-freshness-check.mjs — Phase 0.15 Documentation Freshness Check
 *
 * SessionStart hook that checks if managed documents are stale
 * and warns if doc-sync is needed.
 */

import * as fs from "fs";
import * as path from "path";

const MANAGED_DOCS = [
  "CLAUDE.md",
  "mcp-server/CLAUDE.md",
  "state/shared/PRISM-COMMANDS-MANIFEST.md",
  "state/shared/PRISM-SELF-AWARENESS-DIRECTIVE.md"
];

const SOURCES = [
  "mcp-server/data/state/BASELINE_INVENTORY.json",
  "mcp-server/data/state/WEDM_DIGEST.json"
];

const MAX_STALENESS_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function getFileMtime(filePath) {
  try {
    const stats = fs.statSync(filePath);
    return stats.mtimeMs;
  } catch {
    return 0;
  }
}

export default async function docFreshnessCheck({ session }) {
  const basePath = process.cwd();
  const stale = [];

  // Find newest source
  let newestSource = 0;
  for (const source of SOURCES) {
    const mtime = getFileMtime(path.join(basePath, source));
    if (mtime > newestSource) newestSource = mtime;
  }

  // Check each managed doc
  for (const doc of MANAGED_DOCS) {
    const docPath = path.join(basePath, doc);
    const mtime = getFileMtime(docPath);

    // Stale if doc is older than source or older than threshold
    if (mtime < newestSource || Date.now() - mtime > MAX_STALENESS_MS) {
      stale.push(doc);
    }
  }

  if (stale.length > 0) {
    console.log(`[DOC-FRESHNESS] ${stale.length} stale doc(s) detected:`);
    stale.forEach(d => console.log(`  - ${d}`));
    console.log(`Run /doc-sync to refresh.`);

    return {
      inject: {
        docFreshness: {
          stale: stale.length,
          docs: stale
        }
      },
      message: `Doc freshness: ${stale.length} stale (run /doc-sync)`
    };
  }

  return {
    inject: { docFreshness: { stale: 0 } },
    message: "Docs fresh"
  };
}

// Hook metadata
export const metadata = {
  id: "doc-freshness-check",
  phase: "0.15",
  priority: 6,
  dependsOn: ["svi-inject"],
  event: "SessionStart"
};
