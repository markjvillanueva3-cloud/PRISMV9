#!/usr/bin/env node
/**
 * skill-stage.mjs -- PRISM skill write-approval STAGING gate.
 *
 * Applies the Hermes Agent `skills.write_approval` pattern (its
 * `/skills pending|diff|approve|reject` flow) to PRISM's `.claude/commands`
 * skills: an agent-authored skill (from `/learn-skill`, `/forge-skills`, or a
 * skill-creator) is STAGED and reviewed before it goes LIVE -- so a generated
 * SKILL never lands in the 751-skill live command set without a human gate.
 * Hermes ref: hermes-agent.nousresearch.com/docs/user-guide/features/skills
 * (Learning a skill from sources + write_approval). PRISM had skill authoring
 * (forge-skills) + QA (skill-lint/test/trigger-coverage) but NO approval gate.
 *
 * Layout:
 *   .claude/commands-staged/<name>.md   staged skill bodies (pending review)
 *   state/shared/skill-staging.json     manifest { schemaVersion, entries:[...] }
 *   .claude/commands/<name>.md          LIVE skills (ONLY `approve` writes here)
 *
 * CLI:
 *   stage --name <n> --file <path> [--source <s>] [--summary <s>]
 *   pending [--json]
 *   diff <id>
 *   approve <id>
 *   reject <id>
 *
 * Design: pure plan/helper functions (exported, unit-tested) + a thin impure
 * shell that performs the file moves. No Date.now/Math.random in the pure core
 * (caller passes a stamp) so the planning is fully deterministic + testable.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync, unlinkSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve, join } from "node:path";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const LIVE_DIR = join(ROOT, ".claude", "commands");
const STAGED_DIR = join(ROOT, ".claude", "commands-staged");
const MANIFEST = join(ROOT, "state", "shared", "skill-staging.json");
export const SCHEMA_VERSION = "1.0.0";
const VALID_STATUS = ["pending", "approved", "rejected"];

// ───────────────────────── pure helpers ─────────────────────────

export function emptyManifest() {
  return { schemaVersion: SCHEMA_VERSION, entries: [] };
}

/**
 * Normalize + validate a skill slug (the `/<name>` command + `<name>.md` file).
 * Allows one optional namespace segment (e.g. `sparc/ask`). Returns null when
 * invalid so callers fail loud rather than write a garbage path.
 */
export function normalizeSkillName(name) {
  if (typeof name !== "string") return null;
  const n = name.trim().replace(/\.md$/i, "").toLowerCase();
  if (n.length === 0 || n.length > 80) return null;
  if (n.includes("..") || n.startsWith("/") || n.endsWith("/")) return null; // no traversal
  if (!/^[a-z0-9][a-z0-9-]*(\/[a-z0-9][a-z0-9-]*)?$/.test(n)) return null;
  return n;
}

/** Deterministic stage id. stampMs + seq come from the caller (no impurity here). */
export function makeStageId(name, stampMs, seq) {
  const slug = String(name).replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase() || "skill";
  return `stg-${slug}-${stampMs}-${seq}`;
}

export function findEntry(manifest, id) {
  if (!manifest || !Array.isArray(manifest.entries)) return null;
  return manifest.entries.find((e) => e && e.id === id) || null;
}

export function pendingEntries(manifest) {
  if (!manifest || !Array.isArray(manifest.entries)) return [];
  return manifest.entries.filter((e) => e && e.status === "pending");
}

/**
 * Plan a stage op. Pure: validates inputs + computes the new entry + manifest,
 * but does NOT touch the filesystem. `liveExists` (does .claude/commands/<name>.md
 * already exist) is injected so the planner stays pure; the shell probes it.
 * Returns { error } on bad input, else { entry, manifest, stagedRel, liveRel }.
 */
export function planStage(manifest, { name, source = null, summary = null, liveExists = false, stampMs, seq }) {
  const norm = normalizeSkillName(name);
  if (!norm) return { error: `invalid skill name: ${JSON.stringify(name)} (use lowercase a-z0-9-, one optional /namespace)` };
  if (!Number.isFinite(stampMs) || !Number.isInteger(seq) || seq < 0) {
    return { error: "planStage requires a numeric stampMs + non-negative integer seq" };
  }
  const m = manifest && Array.isArray(manifest.entries) ? manifest : emptyManifest();
  const entry = {
    id: makeStageId(norm, stampMs, seq),
    name: norm,
    source: source == null ? null : String(source),
    summary: summary == null ? null : String(summary),
    stagedAtMs: stampMs,
    status: "pending",
    overwrite: Boolean(liveExists),
    stagedRel: `.claude/commands-staged/${norm}.md`,
    liveRel: `.claude/commands/${norm}.md`,
  };
  return { entry, manifest: { ...m, schemaVersion: SCHEMA_VERSION, entries: [...m.entries, entry] }, stagedRel: entry.stagedRel, liveRel: entry.liveRel };
}

/** Plan an approve: the entry must exist AND be pending. Pure manifest mutation. */
export function planApprove(manifest, id) {
  const e = findEntry(manifest, id);
  if (!e) return { error: `no staged skill with id ${id}` };
  if (e.status !== "pending") return { error: `skill ${id} is already ${e.status} (only pending can be approved)` };
  const manifestOut = { ...manifest, entries: manifest.entries.map((x) => (x.id === id ? { ...x, status: "approved" } : x)) };
  return { entry: e, manifest: manifestOut };
}

/** Plan a reject: same pending guard. Pure. */
export function planReject(manifest, id) {
  const e = findEntry(manifest, id);
  if (!e) return { error: `no staged skill with id ${id}` };
  if (e.status !== "pending") return { error: `skill ${id} is already ${e.status} (only pending can be rejected)` };
  const manifestOut = { ...manifest, entries: manifest.entries.map((x) => (x.id === id ? { ...x, status: "rejected" } : x)) };
  return { entry: e, manifest: manifestOut };
}

/** Minimal added/removed line diff (staged vs live) for the review `diff` view. */
export function lineDiff(liveText, stagedText) {
  const live = new Set(String(liveText).split(/\r?\n/));
  const staged = new Set(String(stagedText).split(/\r?\n/));
  const added = [...staged].filter((l) => !live.has(l));
  const removed = [...live].filter((l) => !staged.has(l));
  return { added, removed };
}

// ───────────────────────── impure I/O shell ─────────────────────────

function loadManifest() {
  if (!existsSync(MANIFEST)) return emptyManifest();
  let raw;
  try { raw = readFileSync(MANIFEST, "utf-8"); }
  catch (e) { throw new Error(`cannot read skill-staging manifest ${MANIFEST}: ${e.message}`); }
  try {
    const j = JSON.parse(raw);
    if (!j || !Array.isArray(j.entries)) throw new Error("manifest has no entries array");
    return j;
  } catch (e) {
    // FAIL LOUD: a corrupt manifest must NOT be silently replaced with an empty one --
    // that would lose every pending review entry (the fail-open-clobber class this repo
    // already burned on with the tribal index). Operator fixes/removes it deliberately.
    throw new Error(`skill-staging manifest is corrupt at ${MANIFEST} (${e.message}); refusing to clobber pending review state`);
  }
}

function saveManifest(m) {
  mkdirSync(dirname(MANIFEST), { recursive: true });
  const tmp = `${MANIFEST}.tmp-${process.pid}`;
  writeFileSync(tmp, JSON.stringify(m, null, 2), "utf-8");
  renameSync(tmp, MANIFEST); // atomic on same fs
}

function argVal(args, flag) {
  const i = args.indexOf(flag);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : null;
}

function cmdStage(args) {
  const name = argVal(args, "--name");
  const file = argVal(args, "--file");
  if (!name || !file) { console.error("usage: stage --name <n> --file <path> [--source <s>] [--summary <s>]"); process.exit(2); }
  if (!existsSync(file)) { console.error(`source file not found: ${file}`); process.exit(2); }
  const body = readFileSync(file, "utf-8");
  const manifest = loadManifest();
  const norm = normalizeSkillName(name);
  const liveExists = norm ? existsSync(join(LIVE_DIR, `${norm}.md`)) : false;
  const plan = planStage(manifest, { name, source: argVal(args, "--source"), summary: argVal(args, "--summary"), liveExists, stampMs: Date.now(), seq: manifest.entries.length });
  if (plan.error) { console.error(plan.error); process.exit(2); }
  const stagedAbs = join(ROOT, plan.stagedRel);
  mkdirSync(dirname(stagedAbs), { recursive: true });
  writeFileSync(stagedAbs, body, "utf-8");
  saveManifest(plan.manifest);
  console.log(JSON.stringify({ ok: true, staged: plan.entry.id, name: plan.entry.name, overwrite: plan.entry.overwrite, review: `node scripts/skill-stage.mjs diff ${plan.entry.id}  (then approve/reject)` }, null, 2));
}

function cmdPending(args) {
  const pend = pendingEntries(loadManifest());
  if (args.includes("--json")) { console.log(JSON.stringify(pend, null, 2)); return; }
  if (pend.length === 0) { console.log("no skills pending review."); return; }
  console.log(`${pend.length} skill(s) pending review:`);
  for (const e of pend) console.log(`  ${e.id}  ${e.name}  [${e.overwrite ? "OVERWRITE live" : "new"}]${e.source ? "  src=" + e.source : ""}`);
}

function cmdDiff(id) {
  if (!id) { console.error("usage: diff <id>"); process.exit(2); }
  const e = findEntry(loadManifest(), id);
  if (!e) { console.error(`no staged skill with id ${id}`); process.exit(2); }
  const stagedAbs = join(ROOT, e.stagedRel);
  if (!existsSync(stagedAbs)) { console.error(`staged body missing for ${id} (status=${e.status}); nothing to diff`); process.exit(2); }
  const staged = readFileSync(stagedAbs, "utf-8");
  const liveAbs = join(ROOT, e.liveRel);
  if (e.overwrite && existsSync(liveAbs)) {
    const { added, removed } = lineDiff(readFileSync(liveAbs, "utf-8"), staged);
    console.log(`# diff for ${e.name} (${id}) -- OVERWRITES live ${e.liveRel}`);
    for (const l of removed) console.log(`- ${l}`);
    for (const l of added) console.log(`+ ${l}`);
  } else {
    console.log(`# new skill ${e.name} (${id}) -> ${e.liveRel}\n`);
    console.log(staged);
  }
}

function cmdApprove(id) {
  if (!id) { console.error("usage: approve <id>"); process.exit(2); }
  const manifest = loadManifest();
  const plan = planApprove(manifest, id);
  if (plan.error) { console.error(plan.error); process.exit(2); }
  const stagedAbs = join(ROOT, plan.entry.stagedRel);
  const liveAbs = join(ROOT, plan.entry.liveRel);
  if (!existsSync(stagedAbs)) { console.error(`staged body missing for ${id}; cannot approve`); process.exit(2); }
  mkdirSync(dirname(liveAbs), { recursive: true });
  renameSync(stagedAbs, liveAbs); // the ONLY write into the LIVE command set
  saveManifest(plan.manifest);
  console.log(JSON.stringify({ ok: true, approved: id, name: plan.entry.name, live: plan.entry.liveRel }, null, 2));
}

function cmdReject(id) {
  if (!id) { console.error("usage: reject <id>"); process.exit(2); }
  const manifest = loadManifest();
  const plan = planReject(manifest, id);
  if (plan.error) { console.error(plan.error); process.exit(2); }
  const stagedAbs = join(ROOT, plan.entry.stagedRel);
  if (existsSync(stagedAbs)) unlinkSync(stagedAbs); // discard the staged body; LIVE untouched
  saveManifest(plan.manifest);
  console.log(JSON.stringify({ ok: true, rejected: id, name: plan.entry.name }, null, 2));
}

function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  switch (cmd) {
    case "stage": return cmdStage(rest);
    case "pending": return cmdPending(rest);
    case "diff": return cmdDiff(rest[0]);
    case "approve": return cmdApprove(rest[0]);
    case "reject": return cmdReject(rest[0]);
    default:
      console.error("usage: skill-stage.mjs <stage|pending|diff|approve|reject> [...]");
      process.exit(2);
  }
}

// isMain guard: import-safe for tests (running as the CLI still executes main()).
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { main(); } catch (e) { console.error(String(e && e.message ? e.message : e)); process.exit(1); }
}
