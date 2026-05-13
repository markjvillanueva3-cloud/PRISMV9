#!/usr/bin/env node
// tier: T4
/**
 * SessionStart hook — surfaces CAD_COVERAGE_MATRIX.json so every session
 * knows which CAD file formats can be generated vs. are gaps on H: drive.
 *
 * Directly supports the directive: "be able to generate every single CAD
 * file in the H drive".
 *
 * Exits 0 on any failure (continueOnError: true contract).
 */

import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";

const MATRIX_PATH = resolve("H:/prism/mcp-server/data/state/CAD_COVERAGE_MATRIX.json");

function main() {
  try {
    const raw = readFileSync(MATRIX_PATH, "utf8");
    const doc = JSON.parse(raw);
    const s = doc.summary || {};
    const mtime = statSync(MATRIX_PATH).mtimeMs;
    const ageHours = ((Date.now() - mtime) / 3600_000).toFixed(1);

    const topGaps = (doc.byExtension || [])
      .filter((e) => e.classification === "gap" || e.classification === "write-gap")
      .slice(0, 5)
      .map((e) => `${e.ext}(${e.count},${e.classification === "write-gap" ? "W" : "R+W"})`)
      .join(" ");

    process.stdout.write(
      `cad-coverage: ${s.totalFiles ?? 0} CAD files, ${s.fullyCovered ?? 0}/${doc.byExtension?.length ?? 0} exts covered (${s.fullyCoveredVolume ?? 0} files), ${s.writeGap ?? 0} write-gap, ${s.fullGap ?? 0} full-gap exts — top gaps: ${topGaps} (${ageHours}h old)\n`
    );
    process.exit(0);
  } catch (err) {
    process.stdout.write(
      `cad-coverage: unavailable (${err && err.message ? err.message : "unknown"}) — run 'npx tsx mcp-server/scripts/build-cad-coverage-matrix.ts \"H:/prism/JM DIE\"' to seed\n`
    );
    process.exit(0);
  }
}

try { main(); } catch { process.stdout.write(JSON.stringify({ continue: true })); }
