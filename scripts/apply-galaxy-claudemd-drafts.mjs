#!/usr/bin/env node
// scripts/apply-galaxy-claudemd-drafts.mjs
//
// PER-SLOT-CLAUDEMD-MS0 / U-PSCM-FINETUNE -- apply verified staging drafts of the
// per-galaxy CLAUDE.md (from state/shared/slot-claude-md-drafts/<g>.md) onto the live
// mcp-server/src/engines/<g>/CLAUDE.md. The Phase-C Workflow drafts + adversarially
// verifies each galaxy; this is the controlled apply step (git tracks the live files,
// so every apply is revertible -- no separate backup needed).
//
// SAFETY GATES before overwriting a live doctrine file:
//   - the staging draft must EXIST and be non-trivial (>= MIN_BYTES)
//   - it must carry the §0 universal-core pointer to H:/prism/CLAUDE.md (the template's
//     mandatory safety section) -- refuse to apply a draft that dropped it
//   - it must carry a "## " heading (looks like a real CLAUDE.md, not an error dump)
// A draft failing any gate is SKIPPED + reported (never silently applied).
//
// DRY-RUN by default. --apply writes. --galaxies a,b,c limits to a subset (default: all
// drafts present in the staging dir). --min-bytes N overrides the floor.
//
// Usage:
//   node scripts/apply-galaxy-claudemd-drafts.mjs                 # dry-run, all staged
//   node scripts/apply-galaxy-claudemd-drafts.mjs --galaxies mill,cad --apply
//   node scripts/apply-galaxy-claudemd-drafts.mjs --apply         # apply all staged that pass gates

import fs from "node:fs";
import path from "node:path";

const PRISM = process.env.PRISM_ROOT || "H:/prism";
const DRAFTS_DIR = path.join(PRISM, "state/shared/slot-claude-md-drafts");
const ENGINES_DIR = path.join(PRISM, "mcp-server/src/engines");

const argv = process.argv.slice(2);
const APPLY = argv.includes("--apply");
const galIdx = argv.indexOf("--galaxies");
const galFilter = galIdx >= 0 && argv[galIdx + 1] ? argv[galIdx + 1].split(",").map((s) => s.trim()).filter(Boolean) : null;
const mbIdx = argv.indexOf("--min-bytes");
const MIN_BYTES = mbIdx >= 0 && argv[mbIdx + 1] ? parseInt(argv[mbIdx + 1], 10) : 600;

// The §0 universal-core pointer must reference the root CLAUDE.md. Accept either the
// forward-slash or the exact phrase the template prescribes.
const POINTER_RE = /H:\/prism\/CLAUDE\.md|root\s+CLAUDE\.md/i;

function listStagedGalaxies() {
  if (!fs.existsSync(DRAFTS_DIR)) return [];
  return fs
    .readdirSync(DRAFTS_DIR)
    .filter((f) => f.endsWith(".md") && !f.startsWith("_"))
    .map((f) => f.replace(/\.md$/, ""));
}

// Pure gate: is this draft body safe to apply onto a live galaxy CLAUDE.md?
export function gateDraft(body) {
  const reasons = [];
  if (typeof body !== "string" || body.length < MIN_BYTES) reasons.push(`too-small (<${MIN_BYTES}B)`);
  if (typeof body === "string") {
    if (!POINTER_RE.test(body)) reasons.push("missing-§0-universal-core-pointer");
    if (!/^##\s/m.test(body)) reasons.push("no-section-heading");
  }
  return { ok: reasons.length === 0, reasons };
}

function main() {
  const staged = listStagedGalaxies();
  const targets = galFilter ? galFilter.filter((g) => staged.includes(g)) : staged;
  if (galFilter) {
    const missing = galFilter.filter((g) => !staged.includes(g));
    for (const g of missing) console.log(`  ~ ${g}: NO staging draft (skipped)`);
  }
  if (targets.length === 0) {
    console.log(`No staged drafts to apply (dir: ${DRAFTS_DIR}).`);
    return;
  }

  let applied = 0, skipped = 0, unchanged = 0;
  for (const g of targets.sort()) {
    const draftPath = path.join(DRAFTS_DIR, `${g}.md`);
    const livePath = path.join(ENGINES_DIR, g, "CLAUDE.md");
    let body;
    try { body = fs.readFileSync(draftPath, "utf8"); } catch { console.log(`  ! ${g}: draft unreadable -- skipped`); skipped++; continue; }

    const gate = gateDraft(body);
    if (!gate.ok) { console.log(`  ! ${g}: GATE FAIL [${gate.reasons.join(", ")}] -- skipped`); skipped++; continue; }

    if (!fs.existsSync(path.dirname(livePath))) { console.log(`  ! ${g}: no engines/${g}/ dir -- skipped`); skipped++; continue; }

    const cur = fs.existsSync(livePath) ? fs.readFileSync(livePath, "utf8") : null;
    if (cur === body) { console.log(`  = ${g}: identical, no change`); unchanged++; continue; }

    const delta = cur ? `${cur.split("\n").length}->${body.split("\n").length} ln` : `new ${body.split("\n").length} ln`;
    if (APPLY) {
      fs.writeFileSync(livePath, body);
      console.log(`  + ${g}: APPLIED (${delta})`);
    } else {
      console.log(`  + ${g}: would apply (${delta}) [dry-run]`);
    }
    applied++;
  }
  console.log(`\n${APPLY ? "APPLIED" : "DRY-RUN"}: ${applied} ${APPLY ? "written" : "to-apply"}, ${unchanged} unchanged, ${skipped} gate-skipped, of ${targets.length} targeted.`);
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("scripts/apply-galaxy-claudemd-drafts.mjs")) {
  main();
}
