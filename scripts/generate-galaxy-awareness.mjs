#!/usr/bin/env node
/**
 * generate-galaxy-awareness.mjs -- emit a dedicated per-galaxy AWARENESS.md for
 * EVERY galaxy (AI-SYNERGY-AUDIT-MS0/U-AISYN-AWARENESS-MD, slot:charlie).
 *
 * ONE generic generator (R15 build-once, NOT 34 cloned generate-<g>-awareness.mjs)
 * writes mcp-server/src/engines/<galaxy>/AWARENESS.md from the live audit artifact
 * state/shared/specs/AI-SYNERGY-AUDIT.json, using the PURE renderer in
 * scripts/lib/galaxy-awareness-render.mjs. This closes the audit's worst dimension
 * (awarenessSurface: only quoting had a dedicated surface) with a DURABLE, version-
 * controlled doctrine file -- auto-loaded by the Bibryam context cascade when a chat
 * works in the galaxy dir.
 *
 * The generated AWARENESS.md IS the galaxy's awarenessSurface dimension: the audit
 * generator (audit-ai-synergy.mjs) credits its presence as awarenessKind=dedicated-gen.
 *
 * Idempotent (re-run safe), ASCII-only, fail-soft (a missing audit -> clear error, a
 * single galaxy write error -> logged + skipped, never aborts the fleet).
 *
 * Usage:
 *   node scripts/generate-galaxy-awareness.mjs           # write all galaxies' AWARENESS.md
 *   node scripts/generate-galaxy-awareness.mjs --galaxy mill   # one galaxy
 *   node scripts/generate-galaxy-awareness.mjs --dry     # report, write nothing
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { renderAwarenessMd } from "./lib/galaxy-awareness-render.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const ENGINES_DIR = path.join(ROOT, "mcp-server/src/engines");
const AUDIT_JSON = path.join(ROOT, "state/shared/specs/AI-SYNERGY-AUDIT.json");
const AUDIT_MD_REL = "state/shared/specs/AI-SYNERGY-AUDIT.md";

const argv = process.argv.slice(2);
const DRY = argv.includes("--dry");
const onlyIdx = argv.indexOf("--galaxy");
const ONLY = onlyIdx >= 0 ? argv[onlyIdx + 1] : null;

function fail(msg) {
  process.stderr.write(`generate-galaxy-awareness: ${msg}\n`);
  process.exit(1);
}

function loadAudit() {
  let txt;
  try {
    txt = fs.readFileSync(AUDIT_JSON, "utf8");
  } catch {
    fail(`audit artifact not found at ${path.relative(ROOT, AUDIT_JSON)} -- run \`node scripts/audit-ai-synergy.mjs\` first.`);
  }
  let doc;
  try {
    doc = JSON.parse(txt);
  } catch (e) {
    fail(`audit artifact is not valid JSON: ${e.message}`);
  }
  if (!doc || !Array.isArray(doc.galaxies)) fail("audit artifact has no galaxies[] -- regenerate it.");
  return doc;
}

function main() {
  const audit = loadAudit();
  const auditDate = (audit.generatedAt || "").slice(0, 10) || "unknown";
  let written = 0;
  let skipped = 0;
  const errors = [];

  for (const record of audit.galaxies) {
    const g = record && record.galaxy;
    if (!g) continue;
    if (ONLY && g !== ONLY) continue;
    const gDir = path.join(ENGINES_DIR, g);
    // Only write for a real galaxy dir (one that carries a CLAUDE.md doctrine file).
    if (!fs.existsSync(path.join(gDir, "CLAUDE.md"))) {
      skipped += 1;
      continue;
    }
    let md;
    try {
      md = renderAwarenessMd(record, { auditDate, auditPath: AUDIT_MD_REL });
    } catch (e) {
      errors.push(`${g}: render failed -- ${e.message}`);
      continue;
    }
    const outPath = path.join(gDir, "AWARENESS.md");
    // Read existing content first so BOTH the real and the --dry path skip a byte-
    // identical file (idempotent; avoids churn + mirror noise; accurate dry preview).
    let prev = null;
    try {
      prev = fs.readFileSync(outPath, "utf8");
    } catch {
      /* absent */
    }
    if (prev === md) {
      skipped += 1;
      continue;
    }
    if (DRY) {
      process.stdout.write(`[dry] would ${prev == null ? "create" : "update"} ${path.relative(ROOT, outPath)} (${md.length} bytes)\n`);
      written += 1;
      continue;
    }
    try {
      fs.writeFileSync(outPath, md);
      written += 1;
    } catch (e) {
      errors.push(`${g}: write failed -- ${e.message}`);
    }
  }

  process.stdout.write(
    `generate-galaxy-awareness: ${DRY ? "(dry) " : ""}wrote ${written}, skipped ${skipped}` +
      (errors.length ? `, ${errors.length} error(s)` : "") +
      ` of ${audit.galaxies.length} audited.\n`
  );
  for (const e of errors) process.stderr.write(`  ! ${e}\n`);
  // Fail loud (R12) if a galaxy errored -- a silent partial would over-claim coverage.
  if (errors.length) process.exit(2);
}

const invokedDirectly = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invokedDirectly) main();

export { loadAudit };
