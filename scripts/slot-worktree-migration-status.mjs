#!/usr/bin/env node
/**
 * slot-worktree-migration-status.mjs — U-WAVE5c-AUTO (2026-05-19)
 *
 * Cron-able audit that answers ONE question: which of the 13 NATO chat slots
 * are bound to a `slot/<nato>` branch (lane-routing hooks ARMED) vs still
 * drifting on the shared main-tree `cad-fusion-live-ms0` branch (hooks
 * SILENTLY DORMANT)?
 *
 * Inputs:
 *   - `git worktree list --porcelain` (which slot worktrees exist on disk)
 *   - `chat-slots.json` via chat-slots.mjs readSlots() (per-slot branch state)
 *   - `state/shared/slot-branch-bindings.json` via readSlotBranchBindings()
 *     (operator-intent layer from U-WAVE5a)
 *
 * Outputs:
 *   - `state/shared/SLOT-WORKTREE-MIGRATION-STATUS.json`
 *   - `state/shared/SLOT-WORKTREE-MIGRATION-STATUS.md`
 *   - stdout summary line
 *
 * Exit codes: 0 ok (report written; ANY mix of migrated/drifting is fine —
 *                   this is advisory, never gates) ·
 *             1 ran but encountered a non-fatal subprocess failure ·
 *             2 misuse / refused-unsafe
 *
 * Usage:
 *   node scripts/slot-worktree-migration-status.mjs              # write report
 *   node scripts/slot-worktree-migration-status.mjs --json       # also emit JSON to stdout
 *   node scripts/slot-worktree-migration-status.mjs --quiet      # no stdout summary
 *   node scripts/slot-worktree-migration-status.mjs --dry-run    # compute, do not write
 *   node scripts/slot-worktree-migration-status.mjs --report PATH  # override report dir
 *   node scripts/slot-worktree-migration-status.mjs --help
 */

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync, renameSync, unlinkSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  SLOT_NAMES,
  readSlots,
  readSlotBranchBindings,
} from "../.claude/helpers/chat-slots.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(__dirname, "..");
const DEFAULT_REPORT_DIR = join(REPO, "state", "shared");
const DEFAULT_WORKTREE_ROOT = "H:/";
const GIT_TIMEOUT_MS = Number(process.env.PRISM_GIT_TIMEOUT_MS) || 60_000;
const SCHEMA_VERSION = 1;

// ─── Pure core ──────────────────────────────────────────────────────────

/**
 * Parse `git worktree list --porcelain` text into entries.
 * @param {string} porcelain
 * @returns {Array<{path:string,head:string|null,branch:string|null}>}
 */
export function parseWorktreeList(porcelain) {
  /** @type {Array<{path:string,head:string|null,branch:string|null}>} */
  const entries = [];
  let cur = null;
  for (const rawLine of String(porcelain || "").split(/\r?\n/)) {
    const line = rawLine.trimEnd();
    if (line.startsWith("worktree ")) {
      if (cur) entries.push(cur);
      cur = { path: line.slice("worktree ".length), head: null, branch: null };
    } else if (!cur) continue;
    else if (line.startsWith("HEAD ")) cur.head = line.slice("HEAD ".length);
    else if (line.startsWith("branch ")) cur.branch = line.slice("branch ".length).replace(/^refs\/heads\//, "");
  }
  if (cur) entries.push(cur);
  return entries;
}

/**
 * Compute migration status for every NATO slot. Pure function — no I/O.
 *
 * @param {Object} input
 * @param {Array<{path:string,head:string|null,branch:string|null}>} input.worktreeList
 * @param {Record<string,any>} input.slotsFile  parsed chat-slots.json contents
 * @param {Record<string,string>} input.bindings  slot -> "slot/<nato>"
 * @param {string} [input.worktreeRoot]
 * @returns {{
 *   schemaVersion:number,
 *   generatedAt:string,
 *   summary:{total:number,migrated:number,driftingMain:number,unbound:number,armed:number,dormant:number},
 *   slots:Array<{
 *     slot:string,
 *     expectedBranch:string,
 *     expectedWorktreePath:string,
 *     worktreeExists:boolean,
 *     worktreeOnExpectedBranch:boolean,
 *     chatSlotBranch:string|null,
 *     bindingPresent:boolean,
 *     bindingValue:string|null,
 *     status:"migrated"|"drifting-main"|"unbound"|"misconfigured",
 *     laneRoutingArmed:boolean,
 *     notes:string[],
 *   }>
 * }}
 */
export function computeMigrationStatus(input) {
  const worktreeList = Array.isArray(input?.worktreeList) ? input.worktreeList : [];
  const slotsFile = (input?.slotsFile && typeof input.slotsFile === "object") ? input.slotsFile : { slots: {} };
  const bindings = (input?.bindings && typeof input.bindings === "object") ? input.bindings : {};
  const worktreeRoot = typeof input?.worktreeRoot === "string" ? input.worktreeRoot : DEFAULT_WORKTREE_ROOT;

  // Index worktrees by lowercased absolute path for case-insensitive Windows match.
  const wtByPath = new Map();
  for (const w of worktreeList) {
    if (w && typeof w.path === "string") {
      wtByPath.set(resolve(w.path).toLowerCase(), w);
    }
  }

  /** @type {ReturnType<typeof computeMigrationStatus>["slots"]} */
  const slots = [];
  let migrated = 0, driftingMain = 0, unbound = 0, armed = 0, dormant = 0, misconfigured = 0;

  for (const slot of SLOT_NAMES) {
    const expectedBranch = `slot/${slot}`;
    const expectedWorktreePath = join(worktreeRoot, `prism-slot-${slot}`);
    const wtMatch = wtByPath.get(resolve(expectedWorktreePath).toLowerCase()) || null;
    const worktreeExists = !!wtMatch;
    const worktreeOnExpectedBranch = !!wtMatch && wtMatch.branch === expectedBranch;
    const s = slotsFile.slots?.[slot] || null;
    const chatSlotBranch = s && typeof s.branch === "string" ? s.branch : null;
    const bindingValue = typeof bindings[slot] === "string" ? bindings[slot] : null;
    const bindingPresent = !!bindingValue && bindingValue.startsWith("slot/");
    // Lane-routing hooks gate on `state.branch?.startsWith("slot/")` — they
    // arm regardless of cwd, so this is the canonical "armed?" check.
    const laneRoutingArmed = !!chatSlotBranch && chatSlotBranch.startsWith("slot/");
    const notes = [];

    /** @type {"migrated"|"drifting-main"|"unbound"|"misconfigured"} */
    let status;
    if (!s) {
      status = "unbound";
      notes.push("no chat-slots.json entry — slot is empty/unclaimed");
    } else if (laneRoutingArmed && chatSlotBranch === expectedBranch && worktreeOnExpectedBranch) {
      status = "migrated";
    } else if (chatSlotBranch === "cad-fusion-live-ms0" || chatSlotBranch === null) {
      status = "drifting-main";
    } else {
      status = "misconfigured";
      notes.push(`branch field is '${chatSlotBranch}' — neither slot/<nato> nor cad-fusion-live-ms0`);
    }

    if (!worktreeExists) notes.push(`worktree ${expectedWorktreePath} does not exist on disk`);
    if (worktreeExists && !worktreeOnExpectedBranch) {
      notes.push(`worktree present but branch is ${wtMatch.branch || "(detached)"}, expected ${expectedBranch}`);
    }
    if (!bindingPresent && worktreeExists) {
      notes.push("slot-branch-bindings sidecar missing entry — run slot-worktree-bootstrap.mjs --slots " + slot);
    }
    if (laneRoutingArmed) { armed += 1; } else { dormant += 1; }
    if (status === "migrated") migrated += 1;
    else if (status === "drifting-main") driftingMain += 1;
    else if (status === "unbound") unbound += 1;
    else if (status === "misconfigured") misconfigured += 1;

    slots.push({
      slot,
      expectedBranch,
      expectedWorktreePath,
      worktreeExists,
      worktreeOnExpectedBranch,
      chatSlotBranch,
      bindingPresent,
      bindingValue,
      status,
      laneRoutingArmed,
      notes,
    });
  }

  return {
    schemaVersion: SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    summary: {
      total: SLOT_NAMES.length,
      migrated,
      driftingMain,
      unbound,
      misconfigured,
      armed,
      dormant,
    },
    slots,
  };
}

/**
 * Render the report as operator-readable markdown.
 * @param {ReturnType<typeof computeMigrationStatus>} report
 */
export function renderMarkdown(report) {
  const { summary, slots, generatedAt } = report;
  const rows = slots.map((s) => {
    const tag = { migrated: "✓", "drifting-main": "✗", unbound: "·", misconfigured: "!" }[s.status] || "?";
    return `| ${tag} | ${s.slot.padEnd(8)} | ${s.status.padEnd(13)} | ${s.laneRoutingArmed ? "ARMED" : "dormant"} | ${s.chatSlotBranch || "(null)"} | ${s.worktreeExists ? "yes" : "no"} | ${s.bindingPresent ? "yes" : "no"} |`;
  }).join("\n");
  return `# Slot worktree migration status

> Generated: ${generatedAt}
> Audit: \`node H:/prism/scripts/slot-worktree-migration-status.mjs\` (U-WAVE5c-AUTO)
> See: [[slot-worktree-migration]] wiki for the operator runbook.

## Summary

- **${summary.armed}/${summary.total}** slots have lane-routing hooks ARMED (branch starts with \`slot/\`)
- **${summary.migrated}** fully migrated (branch + worktree + binding all aligned)
- **${summary.driftingMain}** still drifting on the shared main tree
- **${summary.unbound}** unclaimed (no chat owns the slot right now)
- **${summary.misconfigured}** misconfigured (branch field is neither expected)

## Per-slot detail

|   | slot     | status        | hooks   | chat-slots.branch        | worktree | binding |
|---|----------|---------------|---------|--------------------------|----------|---------|
${rows}

## Notes

${slots.flatMap((s) => s.notes.map((n) => `- **${s.slot}** — ${n}`)).join("\n") || "_(no per-slot notes)_"}

## Doctrine

This report is **advisory only**. It never mutates chat-slots.json or any
worktree state. To migrate a drifting slot, follow [[slot-worktree-migration]]:

1. \`node H:/prism/scripts/slot-worktree-bootstrap.mjs --slots <nato>\` (writes the U-WAVE5a binding sidecar)
2. New PowerShell window: \`cd H:/prism-slot-<nato>; claude\`
3. \`slot-bind-enforce\` re-pins; the 3 lane-routing hooks arm automatically.
`;
}

// ─── I/O wrappers (impure shell) ────────────────────────────────────────

function readWorktreeListShell({ repo = REPO, timeoutMs = GIT_TIMEOUT_MS } = {}) {
  try {
    const out = execFileSync("git", ["worktree", "list", "--porcelain"], {
      cwd: repo,
      encoding: "utf8",
      timeout: timeoutMs,
      maxBuffer: 16 * 1024 * 1024,
      windowsHide: true,
    });
    return { ok: true, entries: parseWorktreeList(out) };
  } catch (err) {
    return { ok: false, entries: [], error: (err?.stderr || err?.message || String(err)).toString().trim() };
  }
}

function atomicWrite(path, content) {
  ensureDir(path);
  const tmp = `${path}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2, 10)}.tmp`;
  writeFileSync(tmp, content);
  try {
    if (existsSync(path)) {
      try { renameSync(tmp, path); }
      catch { try { unlinkSync(path); } catch {} renameSync(tmp, path); }
    } else {
      renameSync(tmp, path);
    }
  } catch (err) {
    try { unlinkSync(tmp); } catch {}
    throw err;
  }
}

function ensureDir(path) {
  const d = dirname(path);
  if (!existsSync(d)) mkdirSync(d, { recursive: true });
}

// ─── CLI ─────────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const args = {
    json: false,
    quiet: false,
    dryRun: false,
    reportDir: DEFAULT_REPORT_DIR,
    worktreeRoot: DEFAULT_WORKTREE_ROOT,
    help: false,
  };
  const errors = [];
  for (let i = 0; i < argv.length; i += 1) {
    let raw = argv[i];
    let inline = null;
    const eq = raw.indexOf("=");
    if (raw.startsWith("--") && eq !== -1) {
      inline = raw.slice(eq + 1);
      raw = raw.slice(0, eq);
    }
    if (raw === "--json") args.json = true;
    else if (raw === "--quiet") args.quiet = true;
    else if (raw === "--dry-run") args.dryRun = true;
    else if (raw === "--help" || raw === "-h") args.help = true;
    else if (raw === "--report") {
      const v = inline ?? argv[++i];
      if (!v || v.startsWith("--")) errors.push("--report requires a directory path");
      else args.reportDir = v;
    } else if (raw === "--worktree-root") {
      const v = inline ?? argv[++i];
      if (!v || v.startsWith("--")) errors.push("--worktree-root requires a value");
      else args.worktreeRoot = v;
    } else {
      errors.push(`unknown argument: ${raw}`);
    }
  }
  return { args, errors };
}

function main() {
  const { args, errors } = parseArgs(process.argv.slice(2));
  if (args.help) {
    process.stdout.write(
      "slot-worktree-migration-status — audit lane-routing arm state for 13 NATO slots.\n" +
      "  --json                 also write JSON to stdout\n" +
      "  --quiet                no stdout summary line\n" +
      "  --dry-run              compute, do not write report files\n" +
      "  --report <dir>         override report output dir (default: state/shared)\n" +
      "  --worktree-root <dir>  expected worktree parent (default: " + DEFAULT_WORKTREE_ROOT + ")\n" +
      "  --help\n"
    );
    process.exit(0);
  }
  if (errors.length) {
    for (const e of errors) process.stderr.write(`slot-worktree-migration-status: ${e}\n`);
    process.exit(2);
  }

  const wtRes = readWorktreeListShell();
  if (!wtRes.ok) {
    // R12 fail-loud — but exit 1 so cron sees a failure without blocking.
    process.stderr.write(`slot-worktree-migration-status: git worktree list failed — ${wtRes.error}\n`);
  }
  const slotsFile = readSlots();
  const bindings = readSlotBranchBindings();
  const report = computeMigrationStatus({
    worktreeList: wtRes.entries,
    slotsFile,
    bindings,
    worktreeRoot: args.worktreeRoot,
  });

  if (!args.dryRun) {
    const jsonPath = join(args.reportDir, "SLOT-WORKTREE-MIGRATION-STATUS.json");
    const mdPath = join(args.reportDir, "SLOT-WORKTREE-MIGRATION-STATUS.md");
    try {
      atomicWrite(jsonPath, JSON.stringify(report, null, 2) + "\n");
      atomicWrite(mdPath, renderMarkdown(report));
    } catch (err) {
      process.stderr.write(`slot-worktree-migration-status: write failed — ${err && err.message ? err.message : err}\n`);
      process.exit(1);
    }
  }

  if (args.json) {
    process.stdout.write(JSON.stringify(report, null, 2) + "\n");
  } else if (!args.quiet) {
    const { summary } = report;
    process.stdout.write(
      `slot-worktree-migration-status: ${summary.armed}/${summary.total} slots ARMED · ` +
      `${summary.migrated} migrated · ${summary.driftingMain} drifting · ` +
      `${summary.unbound} unbound · ${summary.misconfigured} misconfigured\n`
    );
    if (!args.dryRun) {
      process.stdout.write(`  → ${join(args.reportDir, "SLOT-WORKTREE-MIGRATION-STATUS.{json,md}")}\n`);
    }
  }

  process.exit(wtRes.ok ? 0 : 1);
}

// Safer than .endsWith() heuristic: pathToFileURL produces the canonical
// file:// URL Node uses for import.meta.url, so equality is exact regardless
// of platform path quirks. Per reviewer A's P2 on U-WAVE5c-AUTO scrutiny.
const isMain = (() => {
  try {
    return process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;
  } catch { return false; }
})();
if (isMain) main();
