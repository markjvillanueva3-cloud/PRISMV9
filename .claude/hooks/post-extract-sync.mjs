#!/usr/bin/env node
// tier: T3
/**
 * Post-Extract Sync Hook — AI-AWARE-HARDEN/U-AWR24
 *
 * Runs after any /pdf-learn or /video-learn extraction (or manual edit of
 * extraction-log.json) to rebuild the doNotExtract array. This keeps the
 * DuplicationGuardEngine's block list aligned with the actual extractions
 * list — no drift, no gaps.
 *
 * Wired as a PostToolUse hook on Edit/Write against extraction-log.json,
 * or called manually after a /pdf-learn run.
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const LOG = resolve(process.env.PRISM_ROOT ?? "H:/prism", "mcp-server", "data", "state", "extraction-log.json");

if (!existsSync(LOG)) {
  console.log(JSON.stringify({ ok: true, reason: "extraction-log.json not found — skipping" }));
  process.exit(0);
}

let content;
try {
  content = JSON.parse(readFileSync(LOG, "utf-8"));
} catch (e) {
  console.error(`[post-extract-sync] parse failed: ${e.message}`);
  process.exit(0);
}

const extractions = Array.isArray(content.extractions) ? content.extractions : [];
const before = (content.doNotExtract ?? []).length;

function buildDoNotExtract(entries) {
  const out = [];
  for (const e of entries) {
    if (e.status && e.status !== "completed") continue;
    const id = e.id ?? e.name ?? "unknown";
    let count = " - already extracted";
    if (typeof e.tipsGenerated === "number") {
      count = ` - ${e.tipsGenerated} tips already extracted`;
    } else if (typeof e.programsIndexed === "number") {
      count = ` - ${e.programsIndexed} programs already indexed`;
    }
    out.push(`${id}${count}`);
  }
  return out;
}

const rebuilt = buildDoNotExtract(extractions);
content.doNotExtract = rebuilt;
content.lastUpdated = new Date().toISOString();

try {
  writeFileSync(LOG, JSON.stringify(content, null, 2));
  console.log(JSON.stringify({
    ok: true,
    synced: true,
    before,
    after: rebuilt.length,
    added: rebuilt.filter(x => !(content.doNotExtract ?? []).includes(x)).length,
  }));
} catch (e) {
  console.error(`[post-extract-sync] write failed: ${e.message}`);
  process.exit(1);
}
