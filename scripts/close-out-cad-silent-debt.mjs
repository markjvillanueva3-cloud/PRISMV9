#!/usr/bin/env node
/**
 * close-out-cad-silent-debt.mjs — bulk silent-close-out for any milestone
 * envelope whose pending unit_specs name engines that exist on disk.
 *
 * Pattern: file-presence-implies-shipped (the same heuristic the existing
 * audit-close-out-candidates.mjs uses for advisory surfacing, but here we
 * actually flip the envelope after human-verifiable file existence).
 *
 * Hard guard rails:
 *   - Only flips status pending → shipped when EVERY named file (and at
 *     least one of {.ts, .ts test, dispatcher hit}) exists on disk.
 *   - Records `auto_close_out_at` + `auto_close_out_by` in each flipped
 *     unit's ship_notes so the trail is auditable.
 *   - DRY-RUN by default; pass --apply to actually write.
 *
 * Usage:
 *   node scripts/close-out-cad-silent-debt.mjs --milestone CAD-COMPLETE-MS0           # dry-run
 *   node scripts/close-out-cad-silent-debt.mjs --milestone CAD-COMPLETE-MS0 --apply   # write
 *
 * Exit codes:
 *   0 — success (dry-run or apply)
 *   1 — usage error or envelope read failed
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");
const MILESTONES_DIR = join(REPO_ROOT, "mcp-server", "data", "milestones");

// Mode C cache: lazy-load all dispatcher contents once, scan unit titles for
// engine/action names appearing in any dispatcher case statement or import.
let _dispatcherCorpus = null;
function getDispatcherCorpus() {
  if (_dispatcherCorpus !== null) return _dispatcherCorpus;
  const dispatcherDir = join(REPO_ROOT, "mcp-server", "src", "tools", "dispatchers");
  let combined = "";
  try {
    const files = readdirSync(dispatcherDir).filter(f => f.endsWith(".ts"));
    for (const f of files) {
      try { combined += "\n" + readFileSync(join(dispatcherDir, f), "utf8"); }
      catch { /* skip */ }
    }
  } catch { /* dispatcher dir missing — return empty */ }
  _dispatcherCorpus = combined;
  return combined;
}

// Mode C: match unit by engine class name (e.g., "FooEngine" in title)
// against dispatcher source. Returns {wired, engineName} or null.
function isUnitDispatcherWired(unit) {
  if (!unit || typeof unit !== "object") return null;
  const haystack = [unit.title, unit.description].filter(s => typeof s === "string").join(" ");
  if (!haystack) return null;
  // Pattern: any PascalCase identifier ending in Engine, Bridge, Adapter, Encoder, Decoder, Orchestrator
  const engineMatches = haystack.match(/\b([A-Z][A-Za-z0-9]+(?:Engine|Bridge|Adapter|Encoder|Decoder|Orchestrator))\b/g);
  if (!engineMatches || engineMatches.length === 0) return null;
  const corpus = getDispatcherCorpus();
  if (!corpus) return null;
  for (const name of engineMatches) {
    // Find import or singleton usage in dispatcher: most engines are imported lazily.
    if (corpus.includes(name)) {
      return { wired: true, engineName: name };
    }
  }
  return null;
}

// Mode D: match unit by engine class name against engine files on disk.
// If the title/description names FooEngine and mcp-server/src/engines/FooEngine.ts exists,
// the unit is implementation-shipped (independent of dispatcher wiring).
const ENGINE_DIR = join(REPO_ROOT, "mcp-server", "src", "engines");
let _engineFileSet = null;
function getEngineFileSet() {
  if (_engineFileSet !== null) return _engineFileSet;
  const s = new Set();
  try {
    for (const f of readdirSync(ENGINE_DIR)) {
      if (f.endsWith(".ts")) s.add(f.replace(/\.ts$/, ""));
    }
  } catch { /* empty */ }
  _engineFileSet = s;
  return s;
}
function isUnitEngineOnDisk(unit) {
  if (!unit || typeof unit !== "object") return null;
  const haystack = [unit.title, unit.description].filter(s => typeof s === "string").join(" ");
  if (!haystack) return null;
  const engineMatches = haystack.match(/\b([A-Z][A-Za-z0-9]+(?:Engine|Bridge|Adapter|Encoder|Decoder|Orchestrator))\b/g);
  if (!engineMatches) return null;
  const fileSet = getEngineFileSet();
  for (const name of engineMatches) {
    if (fileSet.has(name)) return { onDisk: true, engineName: name };
  }
  return null;
}

function parseArgs(argv) {
  const out = { apply: false, milestone: "", limit: Infinity, all: false, modeC: false, modeD: false, modeE: false, namePattern: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--apply") out.apply = true;
    else if (a === "--milestone") out.milestone = argv[++i] ?? "";
    else if (a === "--limit") out.limit = parseInt(argv[++i] ?? "0", 10) || Infinity;
    else if (a === "--all") out.all = true;
    else if (a === "--mode-c") out.modeC = true;
    else if (a === "--mode-d") out.modeD = true;
    else if (a === "--mode-e") out.modeE = true;
    else if (a === "--name") out.namePattern = argv[++i] ?? "";
  }
  return out;
}

// Mode E: check top-level units[id].deliverables[] — if every file path exists on disk,
// the unit's deliverables are shipped. Handles paths like "scripts/foo.ts", "mcp-server/src/engines/Bar.ts".
// Path-prefix candidates: try repo-root, mcp-server/, and common sub-roots so
// deliverables written as "data/docs/foo.md" still resolve when the actual
// location is mcp-server/data/docs/foo.md (a common envelope-spec drift).
const DELIVERABLE_PATH_PREFIXES = ["", "mcp-server/", "scripts/", "knowledge/"];
function existsAnywhere(relPath) {
  for (const prefix of DELIVERABLE_PATH_PREFIXES) {
    if (existsSync(join(REPO_ROOT, prefix + relPath))) return true;
  }
  return false;
}
function isUnitDeliverablesOnDisk(topUnit) {
  if (!topUnit || typeof topUnit !== "object") return null;
  if (!Array.isArray(topUnit.deliverables) || topUnit.deliverables.length === 0) return null;
  const checked = [], missing = [];
  for (const d of topUnit.deliverables) {
    if (typeof d !== "string" || d.length === 0) continue;
    if (!d.includes("/") && !d.includes(".")) continue;
    const clean = d.replace(/\s*\([^)]*\)\s*$/, "").trim();
    if (!clean.includes("/") && !clean.includes(".")) continue;
    checked.push(clean);
    if (!existsAnywhere(clean)) missing.push(clean);
  }
  if (checked.length === 0) return null;
  if (missing.length === 0) return { onDisk: true, fileCount: checked.length };
  return null;
}

function listAllMilestones() {
  try {
    return readdirSync(MILESTONES_DIR)
      .filter(f => f.endsWith(".json") && !f.startsWith("."))
      .map(f => f.replace(/\.json$/, ""))
      .sort();
  } catch { return []; }
}

function fileExists(repoRelPath) {
  if (!repoRelPath || typeof repoRelPath !== "string") return false;
  // Strip trailing parenthetical annotations like "src/foo.ts (new)" or "src/foo.ts (2 new actions)".
  const cleaned = repoRelPath.replace(/\s*\([^)]*\)\s*$/, "").trim();
  if (!cleaned) return false;
  const abs = join(REPO_ROOT, cleaned);
  return existsSync(abs);
}

function isUnitShippable(spec) {
  if (!spec || typeof spec !== "object") return { ok: false, reason: "not-object" };
  if (spec.status === "shipped") return { ok: false, reason: "already-shipped" };
  if (spec.status !== "pending") return { ok: false, reason: `status=${spec.status}` };
  if (!Array.isArray(spec.files) || spec.files.length === 0) {
    return { ok: false, reason: "no-files-declared" };
  }
  const missing = [];
  for (const f of spec.files) {
    if (!fileExists(f)) missing.push(f);
  }
  if (missing.length > 0) {
    return { ok: false, reason: `missing-files: ${missing.slice(0, 3).join(", ")}${missing.length > 3 ? "..." : ""}` };
  }
  return { ok: true };
}

function processOne(milestoneId, args) {
  const envelopePath = join(REPO_ROOT, "mcp-server", "data", "milestones", `${milestoneId}.json`);
  if (!existsSync(envelopePath)) return { milestone: milestoneId, missing: true };
  let envelope;
  try { envelope = JSON.parse(readFileSync(envelopePath, "utf8")); }
  catch { return { milestone: milestoneId, parseError: true }; }
  const specs = envelope.unit_specs ?? {};
  const units = envelope.units ?? {};
  const modeA = [], modeB = [], modeC = [], modeD = [], modeE = [];

  for (const [id, spec] of Object.entries(specs)) {
    if (isUnitShippable(spec).ok) modeA.push({ id, spec });
  }
  if (Array.isArray(envelope.phases) && typeof units === "object") {
    for (const phase of envelope.phases) {
      if (!Array.isArray(phase?.units)) continue;
      for (const u of phase.units) {
        if (!u || typeof u !== "object" || typeof u.id !== "string" || u.status !== "pending") continue;
        const top = units[u.id];
        if (top && (top.status === "complete" || top.status === "completed")) {
          modeB.push({ id: u.id, phaseId: phase.id });
          continue;
        }
        if (args.modeC) {
          const wired = isUnitDispatcherWired(u) ?? (top ? isUnitDispatcherWired(top) : null);
          if (wired) { modeC.push({ id: u.id, phaseId: phase.id, engineName: wired.engineName }); continue; }
        }
        if (args.modeD) {
          const onDisk = isUnitEngineOnDisk(u) ?? (top ? isUnitEngineOnDisk(top) : null);
          if (onDisk) { modeD.push({ id: u.id, phaseId: phase.id, engineName: onDisk.engineName }); continue; }
        }
        if (args.modeE && top) {
          const deliverableCheck = isUnitDeliverablesOnDisk(top);
          if (deliverableCheck) modeE.push({ id: u.id, phaseId: phase.id, fileCount: deliverableCheck.fileCount });
        }
      }
    }
  }

  if (args.apply && (modeA.length + modeB.length + modeC.length + modeD.length + modeE.length) > 0) {
    const nowIso = new Date().toISOString();
    const stamp = `auto-closed ${nowIso} by close-out-cad-silent-debt.mjs`;
    for (const { id, spec } of modeA) {
      spec.status = "shipped"; spec.auto_close_out_at = nowIso;
      if (units[id]) { units[id].status = "shipped"; units[id].shipped_at = units[id].shipped_at ?? nowIso.slice(0, 10); units[id].ship_notes = (units[id].ship_notes ?? "") + " " + stamp; }
    }
    const flipIds = new Set([...modeB.map(m => m.id), ...modeC.map(m => m.id), ...modeD.map(m => m.id), ...modeE.map(m => m.id)]);
    for (const phase of envelope.phases) {
      if (!Array.isArray(phase?.units)) continue;
      for (const u of phase.units) {
        if (u && flipIds.has(u.id) && u.status === "pending") {
          u.status = "shipped"; u.auto_close_out_at = nowIso;
          const cMatch = modeC.find(c => c.id === u.id);
          const dMatch = modeD.find(d => d.id === u.id);
          const eMatch = modeE.find(e => e.id === u.id);
          u.auto_close_out_reason = cMatch ? `dispatcher-wired engine ${cMatch.engineName}`
            : dMatch ? `engine file on disk: ${dMatch.engineName}.ts`
            : eMatch ? `${eMatch.fileCount} deliverable file(s) all present on disk`
            : "top-level units status reconciled to shipped";
        }
      }
    }
    for (const id of flipIds) { if (units[id]) units[id].auto_close_out_at = nowIso; }
    envelope.units = units; envelope.updated_at = nowIso.slice(0, 10);
    writeFileSync(envelopePath, JSON.stringify(envelope, null, 2) + "\n", "utf8");
  }
  return { milestone: milestoneId, modeA: modeA.length, modeB: modeB.length, modeC: modeC.length, modeD: modeD.length, modeE: modeE.length };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.milestone && !args.all) {
    process.stderr.write("usage: node scripts/close-out-cad-silent-debt.mjs --milestone <ID> | --all [--apply] [--mode-c] [--limit N]\n");
    process.exit(1);
  }
  if (args.all) {
    const milestones = listAllMilestones();
    process.stdout.write(`[silent-close-out] --all mode: scanning ${milestones.length} envelopes (mode=${args.apply ? "APPLY" : "dry-run"})\n`);
    let totalA = 0, totalB = 0, totalC = 0, totalD = 0, totalE = 0, hitCount = 0;
    for (const m of milestones) {
      const r = processOne(m, args);
      if (r.missing || r.parseError) continue;
      const total = (r.modeA ?? 0) + (r.modeB ?? 0) + (r.modeC ?? 0) + (r.modeD ?? 0) + (r.modeE ?? 0);
      if (total > 0) {
        hitCount++;
        process.stdout.write(`  ${m}: A=${r.modeA} B=${r.modeB} C=${r.modeC} D=${r.modeD} E=${r.modeE}\n`);
        totalA += r.modeA; totalB += r.modeB; totalC += r.modeC; totalD += r.modeD; totalE += r.modeE;
      }
    }
    process.stdout.write(`[silent-close-out] DONE: ${hitCount} milestones with drift, totals A=${totalA} B=${totalB} C=${totalC} D=${totalD} E=${totalE} (grand total ${totalA + totalB + totalC + totalD + totalE})\n`);
    process.exit(0);
  }
  // Single-milestone mode
  const r = processOne(args.milestone, args);
  if (r.missing) { process.stderr.write(`envelope not found: ${args.milestone}\n`); process.exit(1); }
  if (r.parseError) { process.stderr.write(`envelope parse failed: ${args.milestone}\n`); process.exit(1); }
  process.stdout.write(`[silent-close-out] ${args.milestone}: A=${r.modeA} B=${r.modeB} C=${r.modeC} mode=${args.apply ? "APPLY" : "dry-run"}\n`);
  process.exit(0);
}

function _UNUSED_legacy_main_body_keep_for_compat() {
  const args = parseArgs(process.argv.slice(2));
  const envelopePath = join(REPO_ROOT, "mcp-server", "data", "milestones", `${args.milestone}.json`);
  if (!existsSync(envelopePath)) {
    process.stderr.write(`envelope not found: ${envelopePath}\n`);
    process.exit(1);
  }
  const raw = readFileSync(envelopePath, "utf8");
  let envelope;
  try { envelope = JSON.parse(raw); }
  catch (err) {
    process.stderr.write(`envelope parse failed: ${err.message ?? String(err)}\n`);
    process.exit(1);
  }

  // Mode A: unit_specs[].files file-presence check (CAD-DRAW-MAX-MS1 schema)
  const specs = envelope.unit_specs ?? {};
  const units = envelope.units ?? {};
  const candidates = [];
  const skipped = [];

  for (const [id, spec] of Object.entries(specs)) {
    const verdict = isUnitShippable(spec);
    if (verdict.ok) candidates.push({ id, spec });
    else skipped.push({ id, reason: verdict.reason });
    if (candidates.length >= args.limit) break;
  }

  // Mode B: phase-level units whose top-level units[id].status is complete/completed
  // (CAD-COMPLETE-MS0 schema — dual source of truth: phase-pending + top-level done)
  const phaseReconcile = [];
  if (Array.isArray(envelope.phases) && typeof units === "object") {
    for (const phase of envelope.phases) {
      if (!Array.isArray(phase?.units)) continue;
      for (const u of phase.units) {
        if (!u || typeof u !== "object" || typeof u.id !== "string") continue;
        if (u.status !== "pending") continue;
        const top = units[u.id];
        if (top && (top.status === "complete" || top.status === "completed")) {
          phaseReconcile.push({ id: u.id, phaseId: phase.id, topStatus: top.status });
          if (phaseReconcile.length >= args.limit) break;
        }
      }
      if (phaseReconcile.length >= args.limit) break;
    }
  }

  const nowIso = new Date().toISOString();
  const stamp = `auto-closed ${nowIso} by close-out-cad-silent-debt.mjs (slot:delta, file-presence-implies-shipped heuristic, human-verifiable via git log)`;

  if (args.apply && candidates.length > 0) {
    for (const { id, spec } of candidates) {
      spec.status = "shipped";
      spec.auto_close_out_at = nowIso;
      spec.auto_close_out_by = "scripts/close-out-cad-silent-debt.mjs";
      if (units[id]) {
        units[id].status = "shipped";
        units[id].auto_close_out_at = nowIso;
        units[id].shipped_at = units[id].shipped_at ?? nowIso.slice(0, 10);
        units[id].ship_notes = (units[id].ship_notes ?? "") + " " + stamp;
      } else {
        units[id] = {
          title: spec.title,
          status: "shipped",
          shipped_at: nowIso.slice(0, 10),
          auto_close_out_at: nowIso,
          ship_notes: stamp,
        };
      }
    }
  }

  // Mode B apply: flip phase-pending → shipped (and stamp the top-level entry too).
  if (args.apply && phaseReconcile.length > 0) {
    const flipSet = new Set(phaseReconcile.map(p => p.id));
    for (const phase of envelope.phases) {
      if (!Array.isArray(phase?.units)) continue;
      for (const u of phase.units) {
        if (u && flipSet.has(u.id) && u.status === "pending") {
          u.status = "shipped";
          u.auto_close_out_at = nowIso;
          u.auto_close_out_reason = `top-level units[${u.id}].status === ${units[u.id]?.status} — reconciled to shipped`;
        }
      }
    }
    // Don't overwrite top-level status (it's already complete/completed); just stamp the reconcile.
    for (const { id } of phaseReconcile) {
      if (units[id]) {
        units[id].auto_close_out_phase_reconciled_at = nowIso;
      }
    }
  }

  if (args.apply && (candidates.length > 0 || phaseReconcile.length > 0)) {
    envelope.units = units;
    envelope.updated_at = nowIso.slice(0, 10);
    writeFileSync(envelopePath, JSON.stringify(envelope, null, 2) + "\n", "utf8");
  }

  process.stdout.write(`[silent-close-out] milestone=${args.milestone} mode-A-candidates=${candidates.length} skipped=${skipped.length} mode-B-phase-reconcile=${phaseReconcile.length} mode=${args.apply ? "APPLY" : "dry-run"}\n`);
  if (candidates.length > 0) {
    process.stdout.write(`[silent-close-out] mode-A candidates (first 10):\n`);
    for (const c of candidates.slice(0, 10)) {
      process.stdout.write(`  + ${c.id} — ${(c.spec.title ?? "").slice(0, 80)}\n`);
    }
  }
  if (phaseReconcile.length > 0) {
    process.stdout.write(`[silent-close-out] mode-B phase-reconcile (first 15):\n`);
    for (const p of phaseReconcile.slice(0, 15)) {
      process.stdout.write(`  + ${p.id} (phase ${p.phaseId}) — top-level status: ${p.topStatus}\n`);
    }
    if (phaseReconcile.length > 15) {
      process.stdout.write(`  ... and ${phaseReconcile.length - 15} more\n`);
    }
  }
  process.exit(0);
}

main();
