#!/usr/bin/env node
/**
 * dream-stage-memory-receipt.mjs — stage a Hermes-Dreaming receipt bundle from
 * the current auto-memory snapshot.
 *
 * DREAM-RECEIPT-MS0 / U-DR08 (slot:bravo 2026-05-26). Detached-spawn from
 * stop-obsidian-memory-feed.mjs when PRISM_DREAM_STAGE_MEMORY=1. Strictly
 * advisory: writes a STAGED bundle under state/shared/dream-artifacts/<id>/
 * for operator review via /dream-review — NEVER mutates memory directly.
 *
 * Pattern: matches the engine API in DreamArtifactBundleEngine.ts but uses
 * pure-fs ops so the Stop-hook context never needs to import the compiled
 * TS engine. Engine remains the source of truth for the bundle schema; this
 * script reproduces only the structural surface needed for staging.
 *
 * Strategy:
 *   1. Hash every C:/Users/<u>/.claude/projects/H--prism/memory/*.md
 *   2. Diff against state/shared/dream-stage-memory-baseline.json
 *   3. If any added/removed/changed → write 4-file bundle (manifest.json +
 *      sources.jsonl + proposals.jsonl + REPORT.md) at status="staged"
 *   4. Update baseline snapshot for next run
 *   5. No diff → no bundle (idempotent skip)
 *
 * Knobs:
 *   PRISM_DREAM_STAGE_DRY_RUN=1     — compute diff, do not write bundle
 *   PRISM_DREAM_STAGE_QUIET=1       — suppress non-error stdout
 *   PRISM_DREAM_STAGE_MAX_FILES=N   — cap per-bundle proposal count (default 200)
 *
 * Exit: 0 ok · 1 baseline-read-failure · 2 runtime error · 3 memory-dir-missing
 *
 * @module scripts/dream-stage-memory-receipt
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import os from "node:os";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const MEMORY_DIR = path.join(os.homedir(), ".claude", "projects", "H--prism", "memory");
const BASELINE_PATH = path.join(ROOT, "state", "shared", "dream-stage-memory-baseline.json");
const ARTIFACTS_ROOT = path.join(ROOT, "state", "shared", "dream-artifacts");
const BUNDLE_SCHEMA_VERSION = "1.0.0";
const DEFAULT_MAX_FILES = 200;

const QUIET = process.env.PRISM_DREAM_STAGE_QUIET === "1";
const DRY_RUN = process.env.PRISM_DREAM_STAGE_DRY_RUN === "1";

/** Pure: SHA-256 hex digest of a buffer. */
export function sha256(buf) {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

/** Pure: scan a directory's .md files, return {id → {sha, bytes}}. */
export function scanMemoryDir(dir, fsImpl = fs) {
  const out = {};
  let names;
  try { names = fsImpl.readdirSync(dir); }
  catch { return out; }
  for (const name of names) {
    if (!name.endsWith(".md")) continue;
    const full = path.join(dir, name);
    try {
      const buf = fsImpl.readFileSync(full);
      out[name] = { sha: sha256(buf), bytes: buf.length };
    } catch { /* skip unreadable */ }
  }
  return out;
}

/** Pure: diff two snapshots. */
export function diffSnapshots(baseline, current) {
  const added = [];
  const removed = [];
  const changed = [];
  for (const id of Object.keys(current)) {
    if (!(id in baseline)) added.push(id);
    else if (baseline[id].sha !== current[id].sha) changed.push(id);
  }
  for (const id of Object.keys(baseline)) {
    if (!(id in current)) removed.push(id);
  }
  return {
    added,
    removed,
    changed,
    unchanged_count: Object.keys(current).filter((id) => id in baseline && baseline[id].sha === current[id].sha).length,
    total_a: Object.keys(baseline).length,
    total_b: Object.keys(current).length,
  };
}

/** Pure: synthesize an artifact id matching engine's convention. */
export function artifactId(now = Date.now()) {
  const ts = new Date(now).toISOString().replace(/[:.]/g, "-");
  const rand = crypto.randomBytes(3).toString("hex");
  return `mem-${ts}-${rand}`;
}

/** Pure: render REPORT.md skeleton mirroring DreamArtifactBundleEngine.renderReport. */
export function renderReport({ artifact_id, created_at, created_by, source_summary, proposalCount, sourceCount }) {
  return [
    `# Dream Artifact Bundle — ${artifact_id}`,
    "",
    `- **Status**: staged`,
    `- **Created**: ${created_at}`,
    `- **Created by**: ${created_by}`,
    `- **Schema**: ${BUNDLE_SCHEMA_VERSION}`,
    "",
    `## Source summary`,
    "",
    source_summary,
    "",
    `## Proposals (${proposalCount})`,
    `## Sources (${sourceCount})`,
    "",
    "_Review via `/dream-review " + artifact_id + "` before any apply._",
    "",
  ].join("\n");
}

/** Pure: build the 4 file contents. */
export function buildBundleFiles({ diff, current, baseline, artifact_id, created_at, created_by, maxFiles }) {
  const summary = `memory-diff +${diff.added.length} -${diff.removed.length} ~${diff.changed.length} (=${diff.unchanged_count}) | a=${diff.total_a} b=${diff.total_b}`;
  // Cap proposals to avoid runaway bundles
  const limited = {
    added: diff.added.slice(0, maxFiles),
    removed: diff.removed.slice(0, maxFiles),
    changed: diff.changed.slice(0, maxFiles),
  };
  const proposals = [];
  for (const id of limited.added) {
    proposals.push({
      proposal_id: `mem-add-${id}`,
      target_path: `auto-memory/${id}`,
      mutation_type: "write",
      risk_class: "memory",
      before_sha256: null,
      after_content: "",
      provenance: `memory-diff added id=${id}`,
      rationale: "new entry in current snapshot, absent from baseline",
    });
  }
  for (const id of limited.removed) {
    proposals.push({
      proposal_id: `mem-del-${id}`,
      target_path: `auto-memory/${id}`,
      mutation_type: "delete",
      risk_class: "memory",
      before_sha256: baseline[id]?.sha ?? null,
      after_content: "",
      provenance: `memory-diff removed id=${id}`,
      rationale: "in baseline, absent from current snapshot",
    });
  }
  for (const id of limited.changed) {
    proposals.push({
      proposal_id: `mem-chg-${id}`,
      target_path: `auto-memory/${id}`,
      mutation_type: "patch",
      risk_class: "memory",
      before_sha256: baseline[id]?.sha ?? null,
      after_content: "",
      provenance: `memory-diff changed id=${id}`,
      rationale: "hash differs between baseline and current",
    });
  }
  const sources = Object.keys(current).slice(0, maxFiles).map((id) => ({
    source_id: `mem-${id}`,
    source_type: "memory",
    locator: `auto-memory/${id}`,
    sha256: current[id].sha,
    bytes: current[id].bytes,
  }));
  const manifest = {
    schemaVersion: BUNDLE_SCHEMA_VERSION,
    artifact_id,
    status: "staged",
    created_at,
    created_by,
    parent_trace: null,
    source_summary: summary,
    proposal_count: proposals.length,
    source_count: sources.length,
  };
  const report = renderReport({
    artifact_id,
    created_at,
    created_by,
    source_summary: summary,
    proposalCount: proposals.length,
    sourceCount: sources.length,
  });
  return {
    "manifest.json": JSON.stringify(manifest, null, 2),
    "REPORT.md": report,
    "sources.jsonl": sources.map((s) => JSON.stringify(s)).join("\n") + (sources.length ? "\n" : ""),
    "proposals.jsonl": proposals.map((p) => JSON.stringify(p)).join("\n") + (proposals.length ? "\n" : ""),
  };
}

/** I/O wrapper. */
export function run({
  memoryDir = MEMORY_DIR,
  baselinePath = BASELINE_PATH,
  artifactsRoot = ARTIFACTS_ROOT,
  now = Date.now,
  fsImpl = fs,
  maxFiles = Number(process.env.PRISM_DREAM_STAGE_MAX_FILES) || DEFAULT_MAX_FILES,
  dryRun = DRY_RUN,
} = {}) {
  if (!fsImpl.existsSync(memoryDir)) {
    return { ok: false, reason: "memory-dir-missing", path: memoryDir };
  }
  let baseline = {};
  if (fsImpl.existsSync(baselinePath)) {
    try { baseline = JSON.parse(fsImpl.readFileSync(baselinePath, "utf8")).files || {}; }
    catch { return { ok: false, reason: "baseline-read-failed", path: baselinePath }; }
  }
  const current = scanMemoryDir(memoryDir, fsImpl);
  const diff = diffSnapshots(baseline, current);
  const hasChanges = diff.added.length + diff.removed.length + diff.changed.length > 0;
  if (!hasChanges) {
    return { ok: true, skipped: true, reason: "no-changes", diff };
  }
  const id = artifactId(now());
  const created_at = new Date(now()).toISOString();
  const files = buildBundleFiles({
    diff,
    current,
    baseline,
    artifact_id: id,
    created_at,
    created_by: "stop-obsidian-memory-feed",
    maxFiles,
  });
  if (dryRun) {
    return { ok: true, dryRun: true, artifact_id: id, diff, bundleBytes: Object.values(files).reduce((s, c) => s + c.length, 0) };
  }
  const bundleDir = path.join(artifactsRoot, id);
  try {
    fsImpl.mkdirSync(bundleDir, { recursive: true });
    for (const [name, content] of Object.entries(files)) {
      fsImpl.writeFileSync(path.join(bundleDir, name), content);
    }
    // Update baseline with current snapshot.
    fsImpl.mkdirSync(path.dirname(baselinePath), { recursive: true });
    fsImpl.writeFileSync(baselinePath, JSON.stringify({ updated_at: created_at, files: current }, null, 2));
  } catch (e) {
    return { ok: false, reason: "write-failed", error: e instanceof Error ? e.message : String(e), bundleDir };
  }
  return { ok: true, artifact_id: id, bundleDir, diff, proposalCount: diff.added.length + diff.removed.length + diff.changed.length };
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("dream-stage-memory-receipt.mjs")) {
  try {
    const result = run();
    if (!QUIET) process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    process.exit(result.ok ? 0 : (result.reason === "memory-dir-missing" ? 3 : (result.reason === "baseline-read-failed" ? 1 : 2)));
  } catch (e) {
    process.stderr.write(`dream-stage-memory-receipt: ${e instanceof Error ? e.message : String(e)}\n`);
    process.exit(2);
  }
}
