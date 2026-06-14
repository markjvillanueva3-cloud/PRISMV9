#!/usr/bin/env node
/**
 * inject-galaxy-ai-capabilities.mjs -- ensure every galaxy's brain files name their AI
 * access (AI-SYNERGY-AUDIT-MS0/U-AISYN-DISCOVER, slot:charlie).
 *
 * The audit's `discoverability` dimension reads each galaxy's own CLAUDE.md + MEMORY.md
 * and counts DISTINCT AI terms named there. Several galaxies' brain files never name
 * their (real) AI access -> the AI capability is an ISLAND, undiscoverable from the
 * galaxy's own knowledge surface (the operator's finding). This CLI splices a GROUNDED,
 * idempotent "## AI capabilities" section (from the pure renderer) into whichever brain
 * surface is SHORT (< the lib's saturation threshold of distinct AI terms), using the
 * audit's OWN term counter so the fix is measured by the same instrument it satisfies.
 *
 * Only touches a surface that is genuinely short -- a galaxy whose CLAUDE.md already
 * names 3+ terms is left untouched there (no churn). ASCII-only, idempotent, fail-soft.
 *
 * Usage:
 *   node scripts/inject-galaxy-ai-capabilities.mjs          # inject into all short surfaces
 *   node scripts/inject-galaxy-ai-capabilities.mjs --dry    # report what would change
 *   node scripts/inject-galaxy-ai-capabilities.mjs --galaxy mill
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { distinctAiTerms, DISCOVERABILITY_TERMS_FOR_FULL } from "./lib/ai-synergy-audit-lib.mjs";
import { renderAiCapabilitiesSection, spliceAiCapabilities } from "./lib/galaxy-ai-capabilities-render.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const ENGINES_DIR = path.join(ROOT, "mcp-server/src/engines");
const AUDIT_JSON = path.join(ROOT, "state/shared/specs/AI-SYNERGY-AUDIT.json");

// Saturation threshold: a surface naming this many DISTINCT AI terms scores full on its
// half of discoverability. Imported from the audit lib (NOT re-inlined) so the injector's
// surface-selection gate can never drift from the scorer (reviewer-B P2 anti-drift).
const TERMS_FOR_FULL = DISCOVERABILITY_TERMS_FOR_FULL;
const SURFACES = ["CLAUDE.md", "MEMORY.md"];

const argv = process.argv.slice(2);
const DRY = argv.includes("--dry");
const onlyIdx = argv.indexOf("--galaxy");
const ONLY = onlyIdx >= 0 ? argv[onlyIdx + 1] : null;

function fail(msg) {
  process.stderr.write(`inject-galaxy-ai-capabilities: ${msg}\n`);
  process.exit(1);
}

function readOptional(p) {
  try {
    return fs.readFileSync(p, "utf8");
  } catch {
    return null;
  }
}

function loadAudit() {
  const txt = readOptional(AUDIT_JSON);
  if (txt == null) fail(`audit artifact not found at ${path.relative(ROOT, AUDIT_JSON)} -- run \`node scripts/audit-ai-synergy.mjs\` first.`);
  let doc;
  try {
    doc = JSON.parse(txt);
  } catch (e) {
    fail(`audit artifact is not valid JSON: ${e.message}`);
  }
  if (!doc || !Array.isArray(doc.galaxies)) fail("audit artifact has no galaxies[].");
  return doc;
}

function main() {
  const audit = loadAudit();
  let changed = 0;
  let alreadyOk = 0;
  const errors = [];
  const touched = [];

  for (const record of audit.galaxies) {
    const g = record && record.galaxy;
    if (!g) continue;
    if (ONLY && g !== ONLY) continue;
    const gDir = path.join(ENGINES_DIR, g);
    if (!fs.existsSync(path.join(gDir, "CLAUDE.md"))) continue; // not a real galaxy dir

    let section = null; // render lazily (only if a surface is short)
    for (const surface of SURFACES) {
      const p = path.join(gDir, surface);
      const body = readOptional(p);
      // A missing MEMORY.md is a real absence: we create it so the galaxy brain names AI.
      const current = body || "";
      // Count distinct AI terms OUTSIDE our own managed block, so re-runs are stable and
      // we never "credit ourselves" into thinking a stale surface is fine.
      const outsideBlock = current.replace(/<!-- AI-CAPABILITIES:BEGIN[\s\S]*?AI-CAPABILITIES:END -->/g, "");
      const hasBlock = current.includes("AI-CAPABILITIES:BEGIN");
      const termsOutside = distinctAiTerms(outsideBlock).size;
      // Already saturated by its own prose AND no managed block -> leave untouched.
      if (termsOutside >= TERMS_FOR_FULL && !hasBlock) {
        alreadyOk += 1;
        continue;
      }
      if (!section) section = renderAiCapabilitiesSection(record);
      const next = spliceAiCapabilities(body, section);
      if (next === current) {
        alreadyOk += 1;
        continue;
      }
      if (DRY) {
        process.stdout.write(`[dry] ${g}/${surface}: ${hasBlock ? "refresh" : "inject"} AI-capabilities (had ${termsOutside} terms outside block)\n`);
        changed += 1;
        touched.push(`${g}/${surface}`);
        continue;
      }
      try {
        fs.writeFileSync(p, next);
        changed += 1;
        touched.push(`${g}/${surface}`);
      } catch (e) {
        errors.push(`${g}/${surface}: ${e.message}`);
      }
    }
  }

  process.stdout.write(
    `inject-galaxy-ai-capabilities: ${DRY ? "(dry) " : ""}${changed} surface(s) changed, ${alreadyOk} already-ok` +
      (errors.length ? `, ${errors.length} error(s)` : "") + ".\n"
  );
  if (touched.length) process.stdout.write(`  touched: ${touched.join(", ")}\n`);
  for (const e of errors) process.stderr.write(`  ! ${e}\n`);
  if (errors.length) process.exit(2);
}

const invokedDirectly = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invokedDirectly) main();

export { loadAudit };
