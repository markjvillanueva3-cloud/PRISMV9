#!/usr/bin/env node
/**
 * nn-feedback-to-memory.mjs — ECHO-UNDONE H4 / U-NEURAL-FEEDBACK-LOOP.
 *
 * Closes the learning loop for the GraphSAGE tier-5 wiring classifier: every
 * NN retrain ROUND that actually trained + evaluated emits a durable,
 * verifiable memory entry. Without this, retrain telemetry only ever lived in
 * a JSONL ledger that nothing reads back.
 *
 * Pipeline:
 *   1. Read the retrain ledger  state/shared/nn-graph/retrain-lifecycle.jsonl
 *      (one JSON object per line, appended by nn-graph-retrain-lifecycle.mjs).
 *   2. Select NOTEWORTHY rounds — those where `trained === true`. A `skip`
 *      round (no drift => no retrain) produced no learning signal and is
 *      deliberately ignored.
 *   3. For each noteworthy round NOT yet captured, write a `reference`-type
 *      memory file to knowledge/memories/reference/ carrying the concrete
 *      metrics (AUROC / macroF1 / Brier) + the promote verdict — a signal a
 *      future session can verify against.
 *   4. Record captured round ids in a sidecar so re-runs are idempotent.
 *
 * The retrain lifecycle is a headless Windows scheduled task, so this writes
 * straight to the on-disk vault knowledge/memories/reference/ — the same
 * location the Obsidian feed reconciles to — rather than the Claude C:-side
 * memory dir (which only a live Claude Stop hook drains).
 *
 * Usage:  node scripts/nn-feedback-to-memory.mjs [--dry-run]
 * Exit:   0 ok (incl. nothing-to-do) · 2 runtime error
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, "..");

export const SCHEMA_VERSION = "1.0.0";

const LEDGER_PATH = path.join(ROOT, "state/shared/nn-graph/retrain-lifecycle.jsonl");
const SIDECAR_PATH = path.join(ROOT, "state/shared/nn-graph/feedback-captured.json");
const MEMORY_DIR = path.join(ROOT, "knowledge/memories/reference");

// ───────────────────────── pure core ─────────────────────────

/**
 * Parse a retrain-lifecycle JSONL document into an array of round objects.
 * Malformed lines are skipped (the ledger is appended by an independent
 * process — a torn final write must not abort the feedback loop).
 */
export function parseLedger(text) {
  const rounds = [];
  for (const line of String(text || "").split("\n")) {
    const t = line.trim();
    if (!t) continue;
    try {
      const obj = JSON.parse(t);
      if (obj && typeof obj === "object" && typeof obj.ts === "string") rounds.push(obj);
    } catch { /* torn / malformed line — skip */ }
  }
  return rounds;
}

/**
 * A round is noteworthy iff the lifecycle actually trained a candidate this
 * pass. `skip` rounds (no significant drift) carry no learning signal.
 */
export function isNoteworthy(round) {
  return !!(round && round.trained === true);
}

/** Stable per-round id — the ISO timestamp is unique per lifecycle pass. */
export function roundId(round) {
  return round && typeof round.ts === "string" ? round.ts : null;
}

/** ts -> a filesystem-safe slug fragment, e.g. 2026-05-20T00:35:56.198Z -> 2026-05-20-0035. */
export function tsSlug(ts) {
  const m = String(ts || "").match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}-${m[4]}${m[5]}` : "unknown";
}

const num = (v) => (typeof v === "number" && Number.isFinite(v) ? v : null);
const fmt = (v) => { const n = num(v); return n === null ? "n/a" : n.toFixed(4); };
/**
 * Collapse a value to a single line. The retrain ledger is appended by an
 * independent process; an `action`/`ts`/`reason` carrying a newline would
 * silently corrupt the YAML frontmatter (R12). All externally-sourced strings
 * pass through this before interpolation.
 */
const oneLine = (v) => String(v ?? "").replace(/[\r\n]+/g, " ").trim();

/**
 * Render the {name, filename, markdown} for one noteworthy round.
 * Pure — no I/O, deterministic from the round object.
 */
export function renderMemoryEntry(round) {
  // ts drives the slug/filename; tsSlug already regex-validates it. Keep a
  // newline-stripped copy for the human-facing interpolations.
  const ts = oneLine(round.ts);
  const slug = tsSlug(round.ts);
  const name = `nn-retrain-${slug}`;
  const filename = `reference_nn_retrain_${slug.replace(/-/g, "_")}.md`;

  const metrics = round.assessment && round.assessment.metrics ? round.assessment.metrics : {};
  const auroc = fmt(metrics.auroc);
  const macroF1 = fmt(metrics.macroF1);
  const brier = fmt(metrics.brier);
  const fp = round.fingerprint || {};
  const action = oneLine(round.action) || "unknown";
  const promoted = round.promoted === true;
  const driftReason = round.drift && typeof round.drift.reason === "string"
    ? oneLine(round.drift.reason) : "(no reason recorded)";
  const errs = (Array.isArray(round.errors) ? round.errors : []).map(oneLine).filter(Boolean);

  const verdict = promoted
    ? "PROMOTED — candidate cleared all NN-GRAPH-MS0 gates and was atomically swapped to live."
    : `NOT PROMOTED — action "${action}". Candidate retained, live checkpoint untouched.`;

  const description = `GNN tier-5 retrain ${ts} — AUROC ${auroc} · macroF1 ${macroF1} · `
    + `Brier ${brier} · ${promoted ? "promoted" : action}`;

  const markdown = `---
name: ${name}
description: ${description}
metadata:
  type: reference
  run_log: true
---

# NN-GRAPH retrain round — ${ts}

A self-retrain lifecycle pass of the GraphSAGE tier-5 wiring classifier
(NN-GRAPH-MS2 / U2). Captured automatically by the U-NEURAL-FEEDBACK-LOOP (H4)
from \`state/shared/nn-graph/retrain-lifecycle.jsonl\` — one verifiable signal
per real retrain.

- **Graph fingerprint:** ${num(fp.nodeCount) ?? "?"} nodes · ${num(fp.edgeCount) ?? "?"} edges · ${num(fp.ghostCount) ?? "?"} ghosts
- **Drift trigger:** ${driftReason}
- **Eval metrics:** AUROC ${auroc} · macroF1 ${macroF1} · Brier ${brier}
- **Outcome:** ${verdict}
${errs.length ? `- **Errors:** ${errs.map((e) => String(e)).join("; ")}\n` : ""}
**Verifiable signal:** the three metrics above are the candidate model's graded
performance on the held-out wiring-classification eval. A future session can
re-check them against the live checkpoint's \`auroc\` and the NN-GRAPH-MS0
gates (AUROC ≥ 0.78 · macroF1 ≥ 0.55 · Brier ≤ 0.15).

Related: [[reference_nn_graph_ms2_u2_2026_05_17]] · [[reference_nn_graph_ms0_2026_05_16]]
`;

  return { name, filename, markdown, roundTs: ts };
}

/**
 * Pure: given all ledger rounds + the set of already-captured round ids,
 * return the memory entries that still need writing (deterministic order:
 * oldest round first).
 */
export function computeNewEntries(rounds, capturedIds) {
  const captured = capturedIds instanceof Set ? capturedIds : new Set(capturedIds || []);
  const noteworthy = (Array.isArray(rounds) ? rounds : [])
    .filter(isNoteworthy)
    .filter((r) => { const id = roundId(r); return id && !captured.has(id); });
  // dedupe by ts within this batch, sort oldest-first for stable output
  const seen = new Set();
  const unique = [];
  for (const r of noteworthy.sort((a, b) => String(a.ts).localeCompare(String(b.ts)))) {
    const id = roundId(r);
    if (seen.has(id)) continue;
    seen.add(id);
    unique.push(r);
  }
  return unique.map(renderMemoryEntry);
}

// ───────────────────────── I/O wrapper ─────────────────────────

function loadSidecar() {
  try {
    const obj = JSON.parse(fs.readFileSync(SIDECAR_PATH, "utf8"));
    const ids = obj && Array.isArray(obj.capturedRoundIds) ? obj.capturedRoundIds : [];
    return new Set(ids.filter((x) => typeof x === "string"));
  } catch {
    return new Set();
  }
}

function writeSidecar(idSet) {
  const payload = {
    schemaVersion: SCHEMA_VERSION,
    updatedAt: new Date().toISOString(),
    capturedRoundIds: [...idSet].sort(),
  };
  fs.mkdirSync(path.dirname(SIDECAR_PATH), { recursive: true });
  fs.writeFileSync(SIDECAR_PATH, JSON.stringify(payload, null, 2));
}

export function main(argv = []) {
  const dryRun = argv.includes("--dry-run");

  let ledgerText;
  try {
    ledgerText = fs.readFileSync(LEDGER_PATH, "utf8");
  } catch {
    console.log(`no retrain ledger at ${LEDGER_PATH} — nothing to capture`);
    return 0;
  }

  let entries, captured;
  try {
    const rounds = parseLedger(ledgerText);
    captured = loadSidecar();
    entries = computeNewEntries(rounds, captured);
  } catch (e) {
    console.error(`FATAL: ledger processing failed — ${e.message}`);
    return 2;
  }

  if (entries.length === 0) {
    console.log("no new noteworthy retrain rounds — feedback loop up to date");
    return 0;
  }

  if (dryRun) {
    console.log(`[dry-run] would write ${entries.length} memory entr${entries.length === 1 ? "y" : "ies"}:`);
    for (const e of entries) console.log(`  ${e.filename}`);
    return 0;
  }

  let written = 0;
  try {
    fs.mkdirSync(MEMORY_DIR, { recursive: true });
    for (const e of entries) {
      fs.writeFileSync(path.join(MEMORY_DIR, e.filename), e.markdown);
      captured.add(e.roundTs);
      written++;
    }
    writeSidecar(captured);
  } catch (e) {
    console.error(`FATAL: write failed after ${written} entr${written === 1 ? "y" : "ies"} — ${e.message}`);
    return 2;
  }

  console.log(`captured ${written} retrain round(s) → knowledge/memories/reference/`);
  for (const e of entries) console.log(`  ${e.filename}`);
  return 0;
}

const isMain = (() => {
  try { return process.argv[1] && path.normalize(fs.realpathSync(process.argv[1])) === path.normalize(fileURLToPath(import.meta.url)); }
  catch { return false; }
})();
if (isMain) process.exit(main(process.argv.slice(2)));
