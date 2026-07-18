#!/usr/bin/env node
/**
 * write-golf-engine-wiki.mjs — CLEANUP-MS0 / U-CLEANUP-D8
 *
 * Wiki-entry writer for the golf-watchdog engine family. Emits one
 * `knowledge/wiki/architecture/<engine-kebab>.md` entry per golf engine,
 * with the standard frontmatter + body sections every architecture wiki
 * entry carries (title / date / agent / slot / milestone / tags /
 * boost_keywords / links).
 *
 * Per the envelope (U-CLEANUP-D8), these wiki entries BLOCK E2 close-out
 * under the `feedback_always_close_out` rule — a golf engine without a wiki
 * entry is silent close-out debt. This script is the deterministic, idempotent
 * way to discharge that debt.
 *
 * Engine family (5 entries):
 *   - peer-commit-auditor  → PeerCommitAuditorEngine (B1)
 *   - wiring-potential     → WiringPotentialEngine   (C1)
 *   - ledger-store         → LedgerStoreEngine       (B10)
 *   - ledger-projector     → LedgerProjectorEngine   (B11)
 *   - golf-heartbeat       → golf-liveness capability (B8-CONSOLIDATED;
 *                            NOTE: not an engine class — it's the
 *                            chat-slots.mjs `golf-liveness` subcommand —
 *                            but it gets a wiki entry so the family is
 *                            discoverable as a unit)
 *
 * Idempotency: each entry is only (re)written when its content hash differs
 * from what's on disk. `--force` rewrites unconditionally. `--dry-run` prints
 * the plan without writing.
 *
 * Why a generator (not hand-authored): the 5 entries share a structure; a
 * generator keeps them consistent and lets a future golf engine be added by
 * appending one metadata record rather than copy-pasting a markdown file.
 *
 * @module scripts/write-golf-engine-wiki
 */

import {
  existsSync, mkdirSync, readFileSync, writeFileSync, renameSync, unlinkSync,
} from "node:fs";
import * as path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

// ── CONSTANTS ────────────────────────────────────────────────────────────────

export const SCHEMA_VERSION = 1;
export const DEFAULT_REPO_ROOT = "H:/prism";
export const WIKI_ARCH_RELATIVE = "knowledge/wiki/architecture";
export const MILESTONE = "CLEANUP-MS0";
export const WIKI_DATE = "2026-05-14";

/**
 * The golf engine family metadata. Adding a new golf engine = appending one
 * record here. `kebab` is the wiki filename stem; `sourceRel` is the on-disk
 * source (relative to repo root; null for the heartbeat capability which has
 * no engine class); `summary` is the one-line; `sections` is an ordered list
 * of {heading, body} pairs rendered into the entry.
 */
export const GOLF_ENGINES = [
  {
    kebab: "peer-commit-auditor",
    engineName: "PeerCommitAuditorEngine",
    unit: "U-CLEANUP-B1",
    sourceRel: "mcp-server/src/engines/PeerCommitAuditorEngine.ts",
    summary: "Polls the git log for peer-chat commits, dispatches reviewer agents, attributes bugs to the originating chat slot.",
    tags: ["golf", "watchdog", "peer-audit", "bug-attribution", "engine"],
    boostKeywords: ["peer commit auditor", "peer-audit", "tickFromCli", "watchdog", "bug attribution"],
    sections: [
      {
        heading: "What it does",
        body: "Renamed from `WatchdogEngine` to avoid collision with `tool-watchdog.mjs`. Entry point `tickFromCli()` runs one poll cycle: reads `helpers/git-log-tail.mjs` output since the last `.watchdog-last-poll.iso`, identifies commits authored by peer chats, and dispatches a reviewer agent per commit (chunked, throttled). A recently-analyzed cache persisted to `.peer-audit-cache.json` with a 5-minute TTL prevents re-reviewing the same commit across overlapping ticks.",
      },
      {
        heading: "Wiring",
        body: "Dispatcher: `prism_dev:peer_audit_tick` / `peer_audit_attribution` / `peer_audit_dispatch_plan` (U-CLEANUP-B2). Cron: `scripts/system-health/06-peer-audit-tick.ps1` invokes `tickFromCli` via `node -e import` (NOT the MCP HTTP bridge — R1). The G15 activity gate short-circuits dispatch when `git log --since=48h --not --author=golf` returns 0, writing an `IDLE-FLEET` ledger row instead.",
      },
      {
        heading: "Downstream",
        body: "Bug attributions land in the `bug_attribution` SQLite table (via B10 `LedgerStoreEngine`). The C5 `golf-watchdog-wiring-bridge.mjs` polls the same audit ticks to fan new engine files into C1/C3/F8.",
      },
    ],
    links: ["[[ledger-store]]", "[[wiring-potential]]", "[[reference_h8_coordination_store]]"],
  },
  {
    kebab: "wiring-potential",
    engineName: "WiringPotentialEngine",
    unit: "U-CLEANUP-C1",
    sourceRel: "mcp-server/src/engines/WiringPotentialEngine.ts",
    summary: "Scores unwired engines for dispatcher-wiring candidacy by routing candidate lookups through MasterIndexEngine.",
    tags: ["golf", "wiring", "master-index", "system-viz", "engine"],
    boostKeywords: ["wiring potential", "analyzeBatch", "unwired engines", "dispatcher candidate", "wiring candidate"],
    sections: [
      {
        heading: "What it does",
        body: "`analyze(engine)` + `analyzeBatch(engines[])` score how wireable an unwired engine is. R4-P0-1: candidate lookup routes through `MasterIndexEngine.search` via `prism_session:master_index_query` — it does NOT reimplement search. Reads each node's `knowledge.wikiEntries[]` + `memoryEntries[]` pre-joins straight from the system-viz graph. Consumes F7's dispatcher-capacity output so a dispatcher already at >=80% action-limit is excluded as a wiring target.",
      },
      {
        heading: "Wiring",
        body: "Dispatcher: `prism_dev:wiring_potential` with 3 modes — `analyze`, `batch_unwired`, `dashboard` (U-CLEANUP-C2). Skill: `/wiring-potential` (U-CLEANUP-C4) returns top-5 candidates with rationale + ready-to-paste dispatcher edit.",
      },
      {
        heading: "Consumers",
        body: "C5 `golf-watchdog-wiring-bridge.mjs` calls `analyze` per new engine file the B1 auditor surfaces. F1 `orphan-inventory.mjs` calls `analyzeBatch` over the ~875 unwired engines to emit a ranked-candidate column.",
      },
    ],
    links: ["[[peer-commit-auditor]]", "[[reference_master_index_surface]]"],
  },
  {
    kebab: "ledger-store",
    engineName: "LedgerStoreEngine",
    unit: "U-CLEANUP-B10",
    sourceRel: "mcp-server/src/engines/LedgerStoreEngine.ts",
    summary: "SQLite WAL ledger for the golf slot — bug_attribution, peer_audit_ticks, chat_bus_signals, golf_envelope_mutations.",
    tags: ["golf", "ledger", "sqlite", "wal", "engine"],
    boostKeywords: ["ledger store", "bug_attribution", "chat_bus_signals", "golf-ledger", "coordination.db"],
    sections: [
      {
        heading: "What it does",
        body: "Wraps the SAME SQLite WAL database as `CoordinationStoreEngine` (`state/shared/coordination.db`) via an independent connection — better-sqlite3 + WAL supports multiple concurrent connections, so atomicity is preserved without coupling engine lifecycles. Four tables: `bug_attribution` (per-bug audit trail), `peer_audit_ticks` (poll cycles), `chat_bus_signals` (structured cross-chat signals), `golf_envelope_mutations` (queued envelope mutations). DDL lives in `src/migrations/golf-ledger-v{n}.sql`.",
      },
      {
        heading: "Schema versioning",
        body: "`LEDGER_SCHEMA_VERSION = 2`. v2 (U-CLEANUP-B5) added 6 cost-attribution columns to `bug_attribution`: `tokens_spent`, `cost_usd_micros`, `agent_type`, `dispatch_prompt`, `expected_files_json`, `originating_tick_id`. Migrations are column-existence-gated so re-running at the current version is a no-op. Cost is stored in integer micro-USD (`MICROS_PER_USD = 1_000_000`) so SUM aggregates never drift; the integer representation never leaks past the engine API boundary.",
      },
      {
        heading: "Safety",
        body: "`query()` rejects any statement that isn't `SELECT` / `WITH`. All hot-path queries use prepared statements with named binds. `migrate(version)` is idempotent. Consumers MUST `close()` or rely on `process.exit` cleanup.",
      },
    ],
    links: ["[[ledger-projector]]", "[[peer-commit-auditor]]", "[[reference_h8_coordination_store]]"],
  },
  {
    kebab: "ledger-projector",
    engineName: "LedgerProjectorEngine",
    unit: "U-CLEANUP-B11",
    sourceRel: "mcp-server/src/engines/LedgerProjectorEngine.ts",
    summary: "In-process INSERT callback that projects ledger rows to JSONL so legacy chat-bus-inject + MILESTONE_PROGRESS readers stay untouched.",
    tags: ["golf", "ledger", "projection", "jsonl", "engine"],
    boostKeywords: ["ledger projector", "jsonl projection", "ledger callback", "legacy reader compat"],
    sections: [
      {
        heading: "What it does",
        body: "Registers an in-process callback on every `LedgerStoreEngine` INSERT and emits a JSONL projection of the row. This is the backward-compat bridge: the structured SQLite tables are the source of truth, but legacy readers (`chat-bus-inject.mjs`, `MILESTONE_PROGRESS` consumers) still expect line-oriented JSONL — the projector keeps both surfaces in sync without those readers being rewritten.",
      },
      {
        heading: "Cache invalidation",
        body: "Projection files carry an mtime-based cache key so a reader can cheaply detect staleness. The projector writes are append-only per row, so a torn write can only ever lose the last record.",
      },
    ],
    links: ["[[ledger-store]]"],
  },
  {
    kebab: "golf-heartbeat",
    engineName: "(capability — chat-slots.mjs golf-liveness)",
    unit: "U-CLEANUP-B8-CONSOLIDATED",
    sourceRel: null,
    summary: "Golf-slot liveness derived from chat-slots.json last-seen — NOT a dedicated heartbeat file (R3-UU2).",
    tags: ["golf", "heartbeat", "liveness", "chat-slots", "capability"],
    boostKeywords: ["golf heartbeat", "golf-liveness", "chat-slots", "golf liveness", "stale slot"],
    sections: [
      {
        heading: "What it is",
        body: "NOT an engine class — this wiki entry documents a *capability*. Per R3-UU2 the golf slot has no dedicated heartbeat file; liveness is the same `chat-slots.json` `lastHeartbeat` field the 6 work slots use. Query via `node .claude/helpers/chat-slots.mjs golf-liveness` — returns `{status, isAlive, ageMs, staleThresholdMs, crashedThresholdMs}` already classified.",
      },
      {
        heading: "Why it gets a wiki entry anyway",
        body: "The U-CLEANUP-D8 envelope lists `golf-heartbeat` in the golf engine family. Even though it's a helper subcommand rather than an engine, documenting it here keeps the family discoverable as a unit — a reader searching the architecture wiki for 'golf heartbeat' finds the real implementation pointer instead of a dead end.",
      },
    ],
    links: ["[[peer-commit-auditor]]"],
  },
];

// ── ARGS ─────────────────────────────────────────────────────────────────────

export function parseArgs(argv) {
  const out = { json: false, dryRun: false, force: false, repoRoot: null, help: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    switch (a) {
      case "--json":       out.json = true; break;
      case "--dry-run":    out.dryRun = true; break;
      case "--force":      out.force = true; break;
      case "--repo-root":  out.repoRoot = argv[i + 1]; i++; break;
      case "--help":
      case "-h":           out.help = true; break;
      default:
        if (a && a.startsWith("--")) throw new Error(`Unknown flag: ${a}`);
    }
  }
  return out;
}

export function resolveRepoRoot(opts) {
  if (opts.repoRoot) return path.resolve(opts.repoRoot);
  try {
    const here = fileURLToPath(import.meta.url);
    return path.resolve(path.dirname(path.dirname(here)));
  } catch {
    return DEFAULT_REPO_ROOT;
  }
}

// ── ENTRY RENDERING ──────────────────────────────────────────────────────────

/**
 * Render one golf engine's wiki markdown entry. Pure — deterministic given
 * the metadata record. Tests verify exact frontmatter + section content.
 */
export function renderWikiEntry(engine) {
  if (!engine || typeof engine !== "object") {
    throw new Error("renderWikiEntry: engine metadata required");
  }
  const { kebab, engineName, unit, sourceRel, summary, tags, boostKeywords, sections, links } = engine;
  const fm = [
    "---",
    `title: ${engineName} — ${summary}`,
    `date: ${WIKI_DATE}`,
    `agent: claude-43742a02`,
    `slot: alpha`,
    `milestone: ${MILESTONE}`,
    `unit: ${unit}`,
    `tags: [${(tags ?? []).join(", ")}]`,
    `boost_keywords: [${(boostKeywords ?? []).map((k) => /[\s:]/.test(k) ? `"${k}"` : k).join(", ")}]`,
    "links:",
    ...(links ?? []).map((l) => `  - "${l}"`),
    "---",
    "",
  ].join("\n");

  const titleLine = `# ${engineName} — golf engine family`;
  const sourceLine = sourceRel
    ? `**Source:** \`${sourceRel}\``
    : `**Source:** _(capability — no engine class; see §What it is)_`;
  const unitLine = `**Unit:** ${unit} (${MILESTONE})`;
  const summaryLine = `\n> ${summary}\n`;

  const body = (sections ?? []).map((s) => `## ${s.heading}\n\n${s.body}`).join("\n\n");

  const footer = [
    "",
    "## Provenance",
    "",
    `This entry was generated by \`scripts/write-golf-engine-wiki.mjs\` (U-CLEANUP-D8) — the deterministic wiki-entry writer for the golf engine family. Re-run it with \`--force\` after editing the engine's contract.`,
    "",
  ].join("\n");

  return [fm, titleLine, "", sourceLine, "  ", unitLine, summaryLine, body, footer].join("\n");
}

/**
 * Stable content hash of a rendered entry — used for idempotency. We hash the
 * BODY only (everything after the frontmatter `date:` line) so that re-running
 * on a different day doesn't churn every file. Actually we hash the entire
 * content minus the `date:` line, so date-only diffs don't trigger rewrites.
 */
export function contentHash(rendered) {
  const stripped = rendered.replace(/^date: .*$/m, "date: <ignored>");
  return createHash("sha256").update(stripped, "utf-8").digest("hex").slice(0, 16);
}

// ── WRITE ────────────────────────────────────────────────────────────────────

function atomicWrite(file, body) {
  try { mkdirSync(path.dirname(file), { recursive: true }); } catch { /* ignore */ }
  const tmp = `${file}.tmp-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  try {
    writeFileSync(tmp, body, "utf-8");
    renameSync(tmp, file);
  } catch (e) {
    try { unlinkSync(tmp); } catch { /* ignore */ }
    throw e;
  }
}

/**
 * Write all golf engine wiki entries. Idempotent: a file is only rewritten
 * when its content hash (date-insensitive) differs, or when `force` is set.
 *
 * Returns a stats summary {written[], unchanged[], wouldWrite[]}.
 */
export function writeGolfEngineWiki(opts = {}) {
  const repoRoot = resolveRepoRoot(opts);
  const archDir = path.join(repoRoot, WIKI_ARCH_RELATIVE);
  const engines = opts.engines ?? GOLF_ENGINES;
  const writer = opts.writeFile ?? atomicWrite;

  const written = [];
  const unchanged = [];
  const wouldWrite = [];

  for (const engine of engines) {
    const rendered = renderWikiEntry(engine);
    const targetPath = path.join(archDir, `${engine.kebab}.md`);
    const newHash = contentHash(rendered);

    let existingHash = null;
    if (existsSync(targetPath)) {
      try {
        existingHash = contentHash(readFileSync(targetPath, "utf-8"));
      } catch {
        existingHash = null;
      }
    }

    const needsWrite = opts.force || existingHash !== newHash;
    if (!needsWrite) {
      unchanged.push({ kebab: engine.kebab, path: targetPath });
      continue;
    }
    if (opts.dryRun) {
      wouldWrite.push({ kebab: engine.kebab, path: targetPath, reason: existingHash === null ? "new" : "changed" });
      continue;
    }
    writer(targetPath, rendered);
    written.push({ kebab: engine.kebab, path: targetPath, reason: existingHash === null ? "new" : "changed" });
  }

  return {
    schemaVersion: SCHEMA_VERSION,
    generator: "U-CLEANUP-D8 (write-golf-engine-wiki)",
    generatedAtMs: Date.now(),
    archDir,
    engineCount: engines.length,
    writtenCount: written.length,
    unchangedCount: unchanged.length,
    wouldWriteCount: wouldWrite.length,
    written,
    unchanged,
    wouldWrite,
    dryRun: Boolean(opts.dryRun),
    force: Boolean(opts.force),
  };
}

// ── CLI ──────────────────────────────────────────────────────────────────────

export function runCli(argv, { stdout, stderr } = {}) {
  const out = stdout ?? process.stdout;
  const err = stderr ?? process.stderr;
  let opts;
  try { opts = parseArgs(argv); }
  catch (e) {
    err.write(`write-golf-engine-wiki: ${e instanceof Error ? e.message : String(e)}\n`);
    return 2;
  }
  if (opts.help) {
    out.write([
      "usage: write-golf-engine-wiki [--json] [--dry-run] [--force] [--repo-root PATH]",
      "",
      "U-CLEANUP-D8 — emit knowledge/wiki/architecture/<kebab>.md per golf engine.",
      "Idempotent (content-hash gated). --force rewrites unconditionally.",
      "",
    ].join("\n"));
    return 2;
  }
  let stats;
  try {
    stats = writeGolfEngineWiki(opts);
  } catch (e) {
    err.write(`write-golf-engine-wiki: ${e instanceof Error ? e.message : String(e)}\n`);
    return 1;
  }
  if (opts.json) {
    out.write(JSON.stringify(stats, null, 2) + "\n");
  } else {
    out.write(`[d8] written=${stats.writtenCount} unchanged=${stats.unchangedCount}` +
      (stats.dryRun ? ` would-write=${stats.wouldWriteCount}` : "") + "\n");
  }
  return 0;
}

// ── ENTRY ────────────────────────────────────────────────────────────────────

const __filename = fileURLToPath(import.meta.url);
const __entry = process.argv[1] ? path.resolve(process.argv[1]) : null;
if (__entry && __filename === __entry) {
  process.exit(runCli(process.argv.slice(2)));
}
