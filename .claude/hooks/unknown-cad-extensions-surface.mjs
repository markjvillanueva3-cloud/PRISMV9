#!/usr/bin/env node
// tier: T4
/**
 * unknown-cad-extensions-surface.mjs — U-CUC04 SessionStart hook
 *
 * Surfaces any unknown CAD extensions detected by the coverage scanner.
 * Reads UNKNOWN_CAD_EXTENSIONS.jsonl and alerts if new extensions need classification.
 */

import { readFileSync, existsSync, statSync } from "node:fs";
import path from "node:path";

const UNKNOWN_EXT_PATH = "H:/prism/mcp-server/data/state/UNKNOWN_CAD_EXTENSIONS.jsonl";
const MAX_AGE_HOURS = 24;

function main() {
  const result = { continue: true, systemMessage: "" };

  try {
    if (!existsSync(UNKNOWN_EXT_PATH)) {
      console.log(JSON.stringify(result));
      return;
    }

    const stat = statSync(UNKNOWN_EXT_PATH);
    const ageHours = (Date.now() - stat.mtimeMs) / (1000 * 60 * 60);

    // Only surface if file is recent (within 24 hours)
    if (ageHours > MAX_AGE_HOURS) {
      console.log(JSON.stringify(result));
      return;
    }

    const content = readFileSync(UNKNOWN_EXT_PATH, "utf8").trim();
    if (!content) {
      console.log(JSON.stringify(result));
      return;
    }

    const lines = content.split("\n").filter(Boolean);
    const entries = lines.map(line => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    }).filter(Boolean);

    // Get unique extensions that look like CAD
    const cadLike = entries.filter(e => e.looksLikeCad);
    const uniqueExts = [...new Set(cadLike.map(e => e.ext))];

    if (uniqueExts.length === 0) {
      console.log(JSON.stringify(result));
      return;
    }

    // Sum counts for each extension
    const extCounts = new Map();
    for (const entry of cadLike) {
      extCounts.set(entry.ext, (extCounts.get(entry.ext) || 0) + entry.count);
    }

    const sorted = [...extCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const extList = sorted.map(([ext, count]) => `${ext}(${count})`).join(", ");
    const totalFiles = sorted.reduce((sum, [_, count]) => sum + count, 0);

    result.systemMessage = `⚠️ CAD TAXONOMY GAP: ${uniqueExts.length} unknown extension(s) detected on H: drive (${totalFiles} files). Top: ${extList}. Run \`prism_dev:cad_classify_extension\` to add to taxonomy or mark as non-CAD.`;

    console.log(JSON.stringify(result));
  } catch (err) {
    result.systemMessage = `unknown-cad-extensions-surface: ${err.message}`;
    console.log(JSON.stringify(result));
  }
}

main();
