#!/usr/bin/env node
// tier: T4
/**
 * SessionStart hook — UNKNOWN_CAD_EXTENSIONS.jsonl surface.
 *
 * CAD-UNIVERSAL-CONTROL-MS0 / U-CUC04. Surfaces candidate CAD
 * extensions that the scanner found on H:/PRISM/JM DIE but that are
 * NOT in CAD_EXTENSIONS (taxonomy) and NOT in KNOWN_NON_CAD
 * (exclusion list). Each such extension needs a human/AI decision:
 *   - add to CAD_EXTENSIONS + build a bridge, OR
 *   - add to KNOWN_NON_CAD as confirmed non-CAD.
 *
 * The surface forces that decision to happen early (at SessionStart)
 * instead of silently accumulating on disk.
 *
 * Exits 0 on any failure (continueOnError: true contract).
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const UNKNOWN = resolve("H:/prism/mcp-server/data/state/UNKNOWN_CAD_EXTENSIONS.jsonl");
const MAX_SHOWN = 5;

function main() {
  if (!existsSync(UNKNOWN)) { process.exit(0); return; }
  try {
    const raw = readFileSync(UNKNOWN, "utf8");
    const lines = raw.split("\n").filter((l) => l.trim() && !l.startsWith("#"));
    if (!lines.length) {
      // File exists but contains only the "no unknowns" comment.
      process.exit(0);
      return;
    }
    const records = [];
    for (const line of lines) {
      try { records.push(JSON.parse(line)); } catch { /* skip bad line */ }
    }
    if (!records.length) { process.exit(0); return; }
    records.sort((a, b) => (b.count ?? 0) - (a.count ?? 0));
    const top = records.slice(0, MAX_SHOWN).map((r) => `${r.ext}(${r.count})`).join(" ");
    process.stdout.write(
      `cad-unknown-ext: ${records.length} candidate extension${records.length === 1 ? "" : "s"} need classification — top: ${top} — decide in data/state/UNKNOWN_CAD_EXTENSIONS.jsonl\n`,
    );
    process.exit(0);
  } catch (err) {
    process.stdout.write(
      `cad-unknown-ext: unavailable (${err && err.message ? err.message : "unknown"})\n`,
    );
    process.exit(0);
  }
}

try { main(); } catch { process.stdout.write(JSON.stringify({ continue: true })); }
