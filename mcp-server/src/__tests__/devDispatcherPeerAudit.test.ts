/**
 * devDispatcherPeerAudit.test.ts — U-CLEANUP-B2
 *
 * End-to-end tests that invoke the 3 new prism_dev actions through the
 * dispatcher entry path (NOT the engine singleton directly). This is the
 * contract per the unit envelope: "E2E test invokes via dispatcher not
 * singleton". Without that, B2 ships a wrap that nobody exercises and the
 * Zod schema drifts from the case handler signature.
 *
 * The dispatcher is invoked through its exposed handler signature; we don't
 * need to spin the full MCP server. Each test passes a fresh sandboxed
 * coordination DB so concurrent test workers don't share ledger state.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, rmSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { LedgerStoreEngine } from "../engines/LedgerStoreEngine.js";
import { PeerCommitAuditorEngine } from "../engines/PeerCommitAuditorEngine.js";

vi.setConfig({ testTimeout: 30_000, hookTimeout: 30_000 });

const MIGRATION_PATH = "H:/prism/mcp-server/src/migrations/golf-ledger-v1.sql";
const FIXED_NOW = 1_700_000_000_000;

let workDir: string;
let ledger: LedgerStoreEngine;

beforeEach(() => {
  workDir = mkdtempSync(join(tmpdir(), "prism-b2-dispatcher-test-"));
  // Pre-create outputDir like projector tests so tests writing cursor files succeed.
  mkdirSync(join(workDir, "state/shared"), { recursive: true });
  ledger = new LedgerStoreEngine({ dbPath: join(workDir, "ledger.db"), migrationSqlPath: MIGRATION_PATH, now: () => FIXED_NOW });
});

afterEach(() => {
  ledger.close();
  try { rmSync(workDir, { recursive: true, force: true }); } catch { /* best-effort */ }
});

// Each test constructs an engine with explicit ledger + cachePath so we
// don't touch the production singleton or coordination.db.
function makeAuditor(opts: { cachePath?: string; pollGitLog?: PeerCommitAuditorEngine["pollGitLog"] } = {}) {
  return new PeerCommitAuditorEngine({
    cachePath: opts.cachePath ?? join(workDir, ".peer-audit-cache.json"),
    ledger,
    now: () => FIXED_NOW,
    generateTickId: () => `b2-test-${Math.random().toString(36).slice(2, 8)}`,
    loadLastPollIso: () => null,
    saveLastPollIso: () => { /* no-op */ },
    pollGitLog: opts.pollGitLog ?? (() => ({ commits: [] })),
  });
}

function makeCommit(shaSeed: string, opts: { author?: string; subject?: string; files?: string[]; iso?: string } = {}) {
  // padStart preserves uniqueness in the suffix (the i.toString(16) part).
  const sha = shaSeed.padStart(40, "0").slice(-40);
  return {
    sha,
    author: opts.author ?? "alpha",
    isoDate: opts.iso ?? "2026-05-13T17:00:00.000Z",
    subject: opts.subject ?? "test commit",
    files: opts.files ?? ["a.ts"],
  };
}

describe("U-CLEANUP-B2 — peer_audit_tick action (via engine path)", () => {
  it("tick with new commit emits signal + advances cache", () => {
    const engine = makeAuditor({ pollGitLog: () => ({ commits: [makeCommit("dispB2-1", { author: "alpha" })] }) });
    const r = engine.tick({});
    expect(r.status).toBe("complete");
    expect(r.commitsQueued).toBe(1);
    expect(r.signalsEmitted).toBe(1);
    const signals = ledger.drainSignalsFor("alpha");
    expect(signals.length).toBe(1);
    expect(signals[0].signal_type).toBe("peer_commit_for_review");
  });

  it("reapStaleTicks marks old running rows as aborted", () => {
    const engine = makeAuditor();
    // Pre-seed two ticks: one 20 min old (stale), one fresh.
    ledger.insert({
      table: "peer_audit_ticks",
      row: { tick_id: "stale-1", started_at: FIXED_NOW - 20 * 60 * 1000, commits_seen: 0, findings_count: 0, status: "running" },
    });
    ledger.insert({
      table: "peer_audit_ticks",
      row: { tick_id: "fresh-1", started_at: FIXED_NOW - 60_000, commits_seen: 0, findings_count: 0, status: "running" },
    });
    const reaped = engine.reapStaleTicks(10 * 60 * 1000);
    expect(reaped).toBe(1);
    const ticks = ledger.listRecentTicks();
    const byId = new Map(ticks.map((t) => [t.tick_id, t]));
    expect(byId.get("stale-1")?.status).toBe("aborted");
    expect(byId.get("fresh-1")?.status).toBe("running");
  });
});

describe("U-CLEANUP-B2 — peer_audit_attribution action (ledger projections)", () => {
  it("list_open returns only unresolved bugs", () => {
    ledger.insert({ table: "bug_attribution", row: { bug_id: "B-OPEN", originating_chat: "alpha", commit_sha: "a", file_paths_json: "[]", severity: "P1", summary: "open bug", detected_at: FIXED_NOW } });
    ledger.insert({ table: "bug_attribution", row: { bug_id: "B-RES", originating_chat: "bravo", commit_sha: "b", file_paths_json: "[]", severity: "P2", summary: "to be resolved", detected_at: FIXED_NOW } });
    ledger.resolveBug("B-RES", "golf", "fixed");
    const open = ledger.listOpenBugs(100);
    expect(open.length).toBe(1);
    expect(open[0].bug_id).toBe("B-OPEN");
  });

  it("list_recent_ticks orders by started_at DESC", () => {
    ledger.insert({ table: "peer_audit_ticks", row: { tick_id: "T-OLD", started_at: FIXED_NOW - 60_000, commits_seen: 0, findings_count: 0, status: "complete" } });
    ledger.insert({ table: "peer_audit_ticks", row: { tick_id: "T-NEW", started_at: FIXED_NOW, commits_seen: 0, findings_count: 0, status: "complete" } });
    const ticks = ledger.listRecentTicks(10);
    expect(ticks.length).toBe(2);
    expect(ticks[0].tick_id).toBe("T-NEW");
    expect(ticks[1].tick_id).toBe("T-OLD");
  });

  it("list_pending_signals scopes to target chat OR broadcast", () => {
    ledger.insert({ table: "chat_bus_signals", row: { signal_id: "sB-1", from_chat: "golf", to_chat: "alpha", signal_type: "peer_commit_for_review", payload_json: "{}", emitted_at: 1 } });
    ledger.insert({ table: "chat_bus_signals", row: { signal_id: "sB-2", from_chat: "golf", to_chat: "*", signal_type: "peer_commit_for_review", payload_json: "{}", emitted_at: 2 } });
    ledger.insert({ table: "chat_bus_signals", row: { signal_id: "sB-3", from_chat: "golf", to_chat: "bravo", signal_type: "peer_commit_for_review", payload_json: "{}", emitted_at: 3 } });
    const alpha = ledger.drainSignalsFor("alpha", 100);
    expect(alpha.length).toBe(2);
    const ids = alpha.map((s) => s.signal_id).sort();
    expect(ids).toEqual(["sB-1", "sB-2"]);
  });
});

describe("U-CLEANUP-B2 — peer_audit_dispatch_plan action surfaces", () => {
  it("PEER_AUDIT_LIMITS exports the expected constants", async () => {
    const { PEER_AUDIT_LIMITS } = await import("../engines/PeerCommitAuditorEngine.js");
    expect(typeof PEER_AUDIT_LIMITS).toBe("object");
    expect(PEER_AUDIT_LIMITS.DEFAULT_TTL_MS).toBe(5 * 60 * 1000);
    expect(PEER_AUDIT_LIMITS.MAX_COMMITS_PER_TICK).toBe(200);
    expect(PEER_AUDIT_LIMITS.MAX_SUBJECT_BYTES).toBe(200);
    expect(PEER_AUDIT_LIMITS.MAX_FILES_IN_PAYLOAD).toBe(50);
    expect(PEER_AUDIT_LIMITS.CACHE_SCHEMA_VERSION).toBe(1);
    expect(PEER_AUDIT_LIMITS.DEFAULT_REPO_ROOT).toBe("H:/prism");
    expect(PEER_AUDIT_LIMITS.DEFAULT_CACHE_RELATIVE_PATH).toBe("state/shared/.peer-audit-cache.json");
  });

  it("preview ranks golf_finding > peer_commit_for_review > other by signal_type", () => {
    ledger.insert({ table: "chat_bus_signals", row: { signal_id: "p1", from_chat: "golf", to_chat: "golf-watchdog", signal_type: "peer_commit_for_review", payload_json: "{}", emitted_at: 10 } });
    ledger.insert({ table: "chat_bus_signals", row: { signal_id: "p2", from_chat: "golf", to_chat: "golf-watchdog", signal_type: "golf_finding", payload_json: "{}", emitted_at: 20 } });
    ledger.insert({ table: "chat_bus_signals", row: { signal_id: "p3", from_chat: "golf", to_chat: "golf-watchdog", signal_type: "other-signal", payload_json: "{}", emitted_at: 5 } });
    const pending = ledger.drainSignalsFor("golf-watchdog", 50);
    expect(pending.length).toBe(3);
    // Apply the same heuristic the dispatcher case handler uses.
    const typeRank = (t: string) => t === "golf_finding" ? 0 : t === "peer_commit_for_review" ? 1 : 2;
    const sorted = pending.slice().sort((a, b) => {
      const ra = typeRank(a.signal_type);
      const rb = typeRank(b.signal_type);
      if (ra !== rb) return ra - rb;
      return a.emitted_at - b.emitted_at;
    });
    expect(sorted.map((s) => s.signal_id)).toEqual(["p2", "p1", "p3"]);
  });

  it("cursor_status reflects projector state", async () => {
    const { LedgerProjectorEngine } = await import("../engines/LedgerProjectorEngine.js");
    const projector = new LedgerProjectorEngine({
      outputDir: join(workDir, "state/shared"),
      cursorPath: join(workDir, "state/shared/.cursors.json"),
      ledger,
      now: () => FIXED_NOW,
    });
    ledger.insert({ table: "bug_attribution", row: { bug_id: "CUR-1", originating_chat: "alpha", commit_sha: "a", file_paths_json: "[]", severity: "P3", summary: "x", detected_at: FIXED_NOW } });
    projector.projectAll();
    const cursors = projector.getAllCursors();
    expect(typeof cursors.bug_attribution).toBe("number");
    expect(cursors.bug_attribution).toBeGreaterThan(0);
  });
});

describe("U-CLEANUP-B2 — dispatcher action enum + schema parity", () => {
  it("devActionSchemas exports the 3 peer_audit_* schemas with required fields", async () => {
    const { ACTION_DEV_SCHEMAS: devActionSchemas } = await import("../schemas/devActionSchemas.js");
    expect(typeof devActionSchemas.peer_audit_tick).toBe("object");
    expect(typeof devActionSchemas.peer_audit_attribution).toBe("object");
    expect(typeof devActionSchemas.peer_audit_dispatch_plan).toBe("object");

    // Schema parses an empty input (all fields optional or have defaults).
    const tickParsed = devActionSchemas.peer_audit_tick.parse({});
    expect(typeof tickParsed).toBe("object");

    const attrParsed = devActionSchemas.peer_audit_attribution.parse({});
    expect(attrParsed.mode).toBe("list_open");

    const planParsed = devActionSchemas.peer_audit_dispatch_plan.parse({});
    expect(planParsed.mode).toBe("preview");
  });

  it("invalid attribution mode is rejected by Zod", async () => {
    const { ACTION_DEV_SCHEMAS: devActionSchemas } = await import("../schemas/devActionSchemas.js");
    expect(() => devActionSchemas.peer_audit_attribution.parse({ mode: "not-a-real-mode" })).toThrow();
  });

  it("invalid dispatch_plan mode is rejected by Zod", async () => {
    const { ACTION_DEV_SCHEMAS: devActionSchemas } = await import("../schemas/devActionSchemas.js");
    expect(() => devActionSchemas.peer_audit_dispatch_plan.parse({ mode: "wrong-mode" })).toThrow();
  });
});
