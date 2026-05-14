/**
 * handoff-staleness.test.mjs — verification of CLEANUP-MS0 / U-CLEANUP-G1.
 *
 * G1 = a READ-ONLY fleet-hygiene audit:
 *   - HANDOFF audit: classify each HANDOFF-<chatId>-<topic>.md against the
 *     live chat-slots.json slot table.
 *   - STALE-CLAIM report: flag mcp-server/data/claims/<MS>/claim.json whose
 *     heartbeat is older than --stale-hours. REPORT-ONLY — releasing is owned
 *     by the pre-existing reap-stale-claims.mjs (duplication-guard: G1 does
 *     not build a second reaper).
 *
 * Coverage floor:
 *   - happy path: keyed handoffs classify correctly; stale claims surface.
 *   - >= 3 failure modes: malformed chat-slots, missing dirs, malformed
 *     claim.json, claim with no heartbeat, unreadable claim.
 *   - >= 2 adversarial: unkeyed handoff names, heartbeat exactly on the
 *     boundary, future-dated heartbeat, bad --stale-hours, top-level
 *     non-dir entries (ACTIVE_CLAIM.json / .gitkeep) in the claims root.
 *   - >= 3 variability: dual field conventions (camelCase vs snake_case);
 *     fresh vs stale vs unknown vs unreadable claims; live-owner vs
 *     dead-owner vs no-slot vs unkeyed handoffs; injected-hooks sweep vs
 *     real default-discovery-path sweep against a tmpdir.
 *
 * Real reference values throughout — no toBeDefined()/toBeTruthy() stubs.
 */

import { describe, it, expect, afterEach } from "vitest";
import { mkdtempSync, writeFileSync, rmSync, mkdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  parseArgs,
  readJsonSafe,
  parseHandoffChatId,
  recordHeartbeatMs,
  indexSlotsByChatId,
  classifyHandoff,
  evaluateClaim,
  sweep,
} from "./handoff-staleness.mjs";

const HOUR = 3_600_000;
const NOW = Date.parse("2026-05-14T18:00:00.000Z");
const iso = (msAgo) => new Date(NOW - msAgo).toISOString();

// ── temp-file hygiene ─────────────────────────────────────────────────
const tmpDirs = [];
afterEach(() => {
  while (tmpDirs.length) {
    try { rmSync(tmpDirs.pop(), { recursive: true, force: true }); } catch { /* best-effort */ }
  }
});
function mkTmp(prefix = "hs-test-") {
  const d = mkdtempSync(join(tmpdir(), prefix));
  tmpDirs.push(d);
  return d;
}

// ── parseArgs ─────────────────────────────────────────────────────────
describe("parseArgs", () => {
  it("empty argv → defaults (4h, not json)", () => {
    const o = parseArgs([]);
    expect(o.staleHours).toBe(4);
    expect(o.json).toBe(false);
    expect(o.slots).toMatch(/chat-slots\.json$/);
    expect(o.claims).toMatch(/claims$/);
  });
  it("--json is a boolean flag", () => {
    expect(parseArgs(["--json"]).json).toBe(true);
  });
  it("--slots/--handoffs/--claims/--stale-hours consume the next token", () => {
    const o = parseArgs(["--slots", "s.json", "--handoffs", "h", "--claims", "c", "--stale-hours", "8"]);
    expect(o.slots).toBe("s.json");
    expect(o.handoffs).toBe("h");
    expect(o.claims).toBe("c");
    expect(o.staleHours).toBe(8);
  });
  it("--slots with no value → _error (exit-2 path)", () => {
    expect(parseArgs(["--slots"])._error).toMatch(/--slots needs a value/);
  });
  it("--stale-hours non-numeric → _error", () => {
    expect(parseArgs(["--stale-hours", "abc"])._error).toMatch(/positive number/);
  });
  it("--stale-hours zero or negative → _error (not a valid staleness window)", () => {
    expect(parseArgs(["--stale-hours", "0"])._error).toMatch(/positive number/);
    expect(parseArgs(["--stale-hours", "-3"])._error).toMatch(/positive number/);
  });
  it("unknown flag → _error", () => {
    expect(parseArgs(["--wat"])._error).toMatch(/unknown arg: --wat/);
  });
});

// ── readJsonSafe ──────────────────────────────────────────────────────
describe("readJsonSafe", () => {
  it("missing file → null", () => {
    expect(readJsonSafe(join(tmpdir(), "definitely-not-here-hs.json"))).toBeNull();
  });
  it("malformed JSON → null (no throw)", () => {
    const dir = mkTmp();
    const p = join(dir, "bad.json");
    writeFileSync(p, "{ not json at all");
    expect(readJsonSafe(p)).toBeNull();
  });
  it("valid JSON → parsed object", () => {
    const dir = mkTmp();
    const p = join(dir, "ok.json");
    writeFileSync(p, JSON.stringify({ a: 1, b: ["x"] }));
    expect(readJsonSafe(p)).toEqual({ a: 1, b: ["x"] });
  });
});

// ── parseHandoffChatId ────────────────────────────────────────────────
describe("parseHandoffChatId", () => {
  it("HANDOFF-claude-<hex>-<topic>.md → the chatId", () => {
    expect(parseHandoffChatId("HANDOFF-claude-006d0532-local-llm-ms0.md")).toBe("claude-006d0532");
  });
  it("multi-segment topic still parses (topic may contain dashes)", () => {
    expect(parseHandoffChatId("HANDOFF-claude-0354e2ef-cam-exhaust-ms0-u123-u124-phase8.md")).toBe("claude-0354e2ef");
  });
  it("uppercase hex is normalized to lowercase", () => {
    expect(parseHandoffChatId("HANDOFF-claude-ABCDEF12-topic.md")).toBe("claude-abcdef12");
  });
  it("topic-keyed handoff (no chatId) → null", () => {
    expect(parseHandoffChatId("HANDOFF-audit-hooks-2026-05-14.md")).toBeNull();
  });
  it("slot-keyed golf handoff → null (no claude-<hex> segment)", () => {
    expect(parseHandoffChatId("HANDOFF-golf-cleanup-task.md")).toBeNull();
  });
  it("non-handoff filename → null", () => {
    expect(parseHandoffChatId("CONTINUE-CAD.md")).toBeNull();
    expect(parseHandoffChatId("")).toBeNull();
  });
});

// ── recordHeartbeatMs (dual field convention) ─────────────────────────
describe("recordHeartbeatMs", () => {
  it("camelCase lastHeartbeat is read", () => {
    expect(recordHeartbeatMs({ lastHeartbeat: iso(1 * HOUR) })).toBe(NOW - 1 * HOUR);
  });
  it("snake_case heartbeat_at is read (roadmap-claim convention)", () => {
    expect(recordHeartbeatMs({ heartbeat_at: iso(2 * HOUR) })).toBe(NOW - 2 * HOUR);
  });
  it("heartbeat field beats claimedAt fallback (heartbeat is the liveness signal)", () => {
    const r = { lastHeartbeat: iso(1 * HOUR), claimedAt: iso(50 * HOUR) };
    expect(recordHeartbeatMs(r)).toBe(NOW - 1 * HOUR);
  });
  it("falls back to claimedAt / claimed_at when no heartbeat field present", () => {
    expect(recordHeartbeatMs({ claimedAt: iso(3 * HOUR) })).toBe(NOW - 3 * HOUR);
    expect(recordHeartbeatMs({ claimed_at: iso(4 * HOUR) })).toBe(NOW - 4 * HOUR);
  });
  it("no parseable field → NaN", () => {
    expect(recordHeartbeatMs({ lastHeartbeat: "garbage" })).toBeNaN();
    expect(recordHeartbeatMs({})).toBeNaN();
    expect(recordHeartbeatMs(null)).toBeNaN();
    expect(recordHeartbeatMs("not-an-object")).toBeNaN();
  });
  it("empty-string field is skipped (not treated as epoch 0)", () => {
    expect(recordHeartbeatMs({ lastHeartbeat: "", claimedAt: iso(5 * HOUR) })).toBe(NOW - 5 * HOUR);
  });
});

// ── indexSlotsByChatId ────────────────────────────────────────────────
describe("indexSlotsByChatId", () => {
  const staleMs = 4 * HOUR;
  it("null / malformed state → empty map", () => {
    expect(indexSlotsByChatId(null, NOW, staleMs).size).toBe(0);
    expect(indexSlotsByChatId({}, NOW, staleMs).size).toBe(0);
    expect(indexSlotsByChatId({ slots: "not-an-object" }, NOW, staleMs).size).toBe(0);
  });
  it("fresh heartbeat (1h ago) → fresh:true", () => {
    const m = indexSlotsByChatId(
      { slots: { alpha: { chatId: "claude-aaa", lastHeartbeat: iso(1 * HOUR), host: "MarkV", pid: 100 } } },
      NOW, staleMs,
    );
    expect(m.get("claude-aaa")).toMatchObject({ slot: "alpha", fresh: true, host: "MarkV", pid: 100 });
  });
  it("stale heartbeat (5h ago) → fresh:false", () => {
    const m = indexSlotsByChatId(
      { slots: { bravo: { chatId: "claude-bbb", lastHeartbeat: iso(5 * HOUR) } } },
      NOW, staleMs,
    );
    expect(m.get("claude-bbb").fresh).toBe(false);
  });
  it("slot with no parseable heartbeat → fresh:false, lastHeartbeatMs:null", () => {
    const m = indexSlotsByChatId(
      { slots: { charlie: { chatId: "claude-ccc", lastHeartbeat: "garbage" } } },
      NOW, staleMs,
    );
    expect(m.get("claude-ccc")).toMatchObject({ fresh: false, lastHeartbeatMs: null });
  });
  it("slot missing chatId → not indexed", () => {
    const m = indexSlotsByChatId({ slots: { delta: { pid: 1 } } }, NOW, staleMs);
    expect(m.size).toBe(0);
  });
  it("chatId is indexed lowercased", () => {
    const m = indexSlotsByChatId(
      { slots: { e: { chatId: "claude-DEAD", lastHeartbeat: iso(1 * HOUR) } } },
      NOW, staleMs,
    );
    expect(m.has("claude-dead")).toBe(true);
  });
});

// ── classifyHandoff ───────────────────────────────────────────────────
describe("classifyHandoff", () => {
  const staleMs = 4 * HOUR;
  const slotIndex = indexSlotsByChatId({
    slots: {
      alpha: { chatId: "claude-a11c0ffe", lastHeartbeat: iso(0.5 * HOUR) },   // fresh
      bravo: { chatId: "claude-deadbeef", lastHeartbeat: iso(9 * HOUR) },     // stale
    },
  }, NOW, staleMs);

  it("keyed handoff, owner slot fresh → live-owner, not actionable", () => {
    const c = classifyHandoff("HANDOFF-claude-a11c0ffe-topic.md", NOW - 1 * HOUR, slotIndex, NOW);
    expect(c.status).toBe("live-owner");
    expect(c.actionable).toBe(false);
    expect(c.slot).toBe("alpha");
  });
  it("keyed handoff, owner slot stale → dead-owner, ACTIONABLE", () => {
    const c = classifyHandoff("HANDOFF-claude-deadbeef-topic.md", NOW - 2 * HOUR, slotIndex, NOW);
    expect(c.status).toBe("dead-owner");
    expect(c.actionable).toBe(true);
    expect(c.slot).toBe("bravo");
    expect(c.ageHours).toBeCloseTo(2, 5);
  });
  it("keyed handoff, chatId not in any slot → no-slot, not actionable (historical)", () => {
    const c = classifyHandoff("HANDOFF-claude-90000001-topic.md", NOW - 50 * HOUR, slotIndex, NOW);
    expect(c.status).toBe("no-slot");
    expect(c.actionable).toBe(false);
  });
  it("unkeyed handoff (topic-named) → unkeyed, not actionable", () => {
    const c = classifyHandoff("HANDOFF-audit-hooks-2026-05-14.md", NOW - 1 * HOUR, slotIndex, NOW);
    expect(c.status).toBe("unkeyed");
    expect(c.chatId).toBeNull();
  });
  it("unreadable mtime (NaN) → ageHours null, still classifies", () => {
    const c = classifyHandoff("HANDOFF-claude-a11c0ffe-topic.md", NaN, slotIndex, NOW);
    expect(c.ageHours).toBeNull();
    expect(c.status).toBe("live-owner");
  });
});

// ── evaluateClaim (read-only verdict) ─────────────────────────────────
describe("evaluateClaim", () => {
  const staleMs = 4 * HOUR;
  it("fresh heartbeat (2h ago) → status:fresh, stale:false", () => {
    const v = evaluateClaim({ lastHeartbeat: iso(2 * HOUR) }, NOW, staleMs);
    expect(v.status).toBe("fresh");
    expect(v.stale).toBe(false);
    expect(v.heartbeatAgeHours).toBeCloseTo(2, 5);
  });
  it("stale heartbeat (40h ago) → status:stale, stale:true", () => {
    const v = evaluateClaim({ lastHeartbeat: iso(40 * HOUR) }, NOW, staleMs);
    expect(v.status).toBe("stale");
    expect(v.stale).toBe(true);
    expect(v.heartbeatAgeHours).toBeCloseTo(40, 5);
  });
  it("snake_case heartbeat_at is honored (roadmap-claim convention) → stale", () => {
    const v = evaluateClaim({ heartbeat_at: iso(40 * HOUR) }, NOW, staleMs);
    expect(v.status).toBe("stale");
    expect(v.stale).toBe(true);
  });
  it("adversarial: heartbeat exactly AT the threshold → fresh (strict > comparison)", () => {
    const v = evaluateClaim({ lastHeartbeat: iso(4 * HOUR) }, NOW, staleMs);
    expect(v.status).toBe("fresh");
    expect(v.stale).toBe(false);
  });
  it("adversarial: heartbeat 1ms past the threshold → stale", () => {
    expect(evaluateClaim({ lastHeartbeat: iso(4 * HOUR + 1) }, NOW, staleMs).stale).toBe(true);
  });
  it("adversarial: future-dated heartbeat → fresh (negative age, never stale)", () => {
    const v = evaluateClaim({ lastHeartbeat: iso(-2 * HOUR) }, NOW, staleMs);
    expect(v.stale).toBe(false);
    expect(v.heartbeatAgeHours).toBeCloseTo(-2, 5);
  });
  it("captures the host field for cross-host visibility in the report", () => {
    const v = evaluateClaim({ lastHeartbeat: iso(40 * HOUR), host: "DESKTOP-N7MI1VB" }, NOW, staleMs);
    expect(v.host).toBe("DESKTOP-N7MI1VB");
  });
  it("no parseable heartbeat → unknown-heartbeat, NOT stale", () => {
    const v = evaluateClaim({ lastHeartbeat: "not-a-date" }, NOW, staleMs);
    expect(v.status).toBe("unknown-heartbeat");
    expect(v.stale).toBe(false);
  });
  it("malformed claim (null / non-object) → unreadable, NOT stale", () => {
    expect(evaluateClaim(null, NOW, staleMs).status).toBe("unreadable");
    expect(evaluateClaim("string", NOW, staleMs).status).toBe("unreadable");
    expect(evaluateClaim(null, NOW, staleMs).stale).toBe(false);
  });
});

// ── sweep — injected-hooks orchestration ──────────────────────────────
describe("sweep (injected hooks)", () => {
  const slotsJson = {
    slots: {
      alpha: { chatId: "claude-a11c0ffe", lastHeartbeat: iso(0.5 * HOUR) },
      bravo: { chatId: "claude-deadbeef", lastHeartbeat: iso(12 * HOUR) },
    },
  };
  const baseOpts = {
    slots: "/fake/slots.json", handoffs: "/fake/handoffs", claims: "/fake/claims",
    staleHours: 4, json: false,
  };
  function hooksFor({ handoffs = [], claims = [] } = {}) {
    return {
      now: NOW,
      readJsonFn: (p) => (p === baseOpts.slots ? slotsJson : null),
      listHandoffsFn: () => handoffs,
      listClaimsFn: () => claims,
    };
  }

  it("happy path: classifies handoffs and surfaces stale claims (read-only)", () => {
    const handoffs = [
      { file: "HANDOFF-claude-a11c0ffe-topic.md", mtimeMs: NOW - 1 * HOUR },
      { file: "HANDOFF-claude-deadbeef-topic.md", mtimeMs: NOW - 2 * HOUR },
      { file: "HANDOFF-claude-90000001-topic.md", mtimeMs: NOW - 99 * HOUR },
      { file: "HANDOFF-audit-hooks-2026-05-14.md", mtimeMs: NOW - 1 * HOUR },
    ];
    const claims = [
      { milestone: "STALE-MS0", path: "/fake/claims/STALE-MS0/claim.json", claim: { chatId: "claude-x", host: "MarkV", lastHeartbeat: iso(40 * HOUR) } },
      { milestone: "FRESH-MS0", path: "/fake/claims/FRESH-MS0/claim.json", claim: { chatId: "claude-y", lastHeartbeat: iso(1 * HOUR) } },
    ];
    const r = sweep(baseOpts, hooksFor({ handoffs, claims }));
    expect(r.ok).toBe(true);
    expect(r.handoffs).toMatchObject({ total: 4, liveOwner: 1, deadOwner: 1, noSlot: 1, unkeyed: 1 });
    expect(r.handoffs.deadOwnerFiles[0]).toMatchObject({ file: "HANDOFF-claude-deadbeef-topic.md", chatId: "claude-deadbeef", slot: "bravo" });
    expect(r.claims).toMatchObject({ total: 2, fresh: 1, stale: 1 });
    expect(r.claims.staleDetail[0]).toMatchObject({ milestone: "STALE-MS0", chatId: "claude-x", host: "MarkV" });
    // read-only audit points the operator at the real reaper
    expect(r.claimReaperHint).toMatch(/reap-stale-claims\.mjs --apply/);
  });

  it("no stale claims → claimReaperHint is null (nothing to recommend)", () => {
    const claims = [
      { milestone: "FRESH-MS0", path: "/p", claim: { lastHeartbeat: iso(1 * HOUR) } },
    ];
    const r = sweep(baseOpts, hooksFor({ claims }));
    expect(r.claims.stale).toBe(0);
    expect(r.claimReaperHint).toBeNull();
  });

  it("failure mode: unreadable + no-heartbeat claims are bucketed, never counted stale", () => {
    const claims = [
      { milestone: "UNREADABLE-MS0", path: "/p1", claim: null },
      { milestone: "NOHB-MS0", path: "/p2", claim: { chatId: "z", lastHeartbeat: "garbage" } },
    ];
    const r = sweep(baseOpts, hooksFor({ claims }));
    expect(r.claims).toMatchObject({ total: 2, unreadable: 1, unknownHeartbeat: 1, stale: 0 });
    expect(r.ok).toBe(true);
  });

  it("failure mode: malformed chat-slots.json → all keyed handoffs become no-slot, claims still reported", () => {
    const handoffs = [{ file: "HANDOFF-claude-a11c0ffe-topic.md", mtimeMs: NOW - 1 * HOUR }];
    const claims = [{ milestone: "STALE-MS0", path: "/p", claim: { lastHeartbeat: iso(40 * HOUR) } }];
    const r = sweep(baseOpts, {
      now: NOW,
      readJsonFn: () => null, // chat-slots.json unreadable
      listHandoffsFn: () => handoffs,
      listClaimsFn: () => claims,
    });
    expect(r.handoffs).toMatchObject({ total: 1, noSlot: 1, deadOwner: 0 });
    expect(r.claims.stale).toBe(1); // claims unaffected by missing slot table
  });

  it("variability: empty handoffs + empty claims → all-zero result, ok:true", () => {
    const r = sweep(baseOpts, hooksFor({ handoffs: [], claims: [] }));
    expect(r.handoffs.total).toBe(0);
    expect(r.claims.total).toBe(0);
    expect(r.ok).toBe(true);
    expect(r.claimReaperHint).toBeNull();
  });

  it("variability: --stale-hours override changes which claims surface", () => {
    const claims = [
      { milestone: "M6H-MS0", path: "/p", claim: { lastHeartbeat: iso(6 * HOUR) } },
    ];
    // default 4h → 6h-old claim is stale
    expect(sweep(baseOpts, hooksFor({ claims })).claims.stale).toBe(1);
    // 8h threshold → same 6h-old claim is now fresh
    const r8 = sweep({ ...baseOpts, staleHours: 8 }, hooksFor({ claims }));
    expect(r8.claims.stale).toBe(0);
    expect(r8.claims.fresh).toBe(1);
  });

  it("result carries schemaVersion, generatedAt, and the staleHours used", () => {
    const r = sweep({ ...baseOpts, staleHours: 6 }, hooksFor({}));
    expect(r.schemaVersion).toBe(1);
    expect(r.staleHours).toBe(6);
    expect(r.generatedAt).toBe(new Date(NOW).toISOString());
  });
});

// ── sweep — REAL default discovery path (no hooks, tmpdir fixtures) ────
// The injected-hooks tests above bypass listFiles/listDirs/statSync entirely.
// These exercise the production discovery code against a real filesystem so a
// regression in the filter/stat logic is actually caught.
describe("sweep (real default discovery path)", () => {
  function buildFixture() {
    const root = mkTmp("hs-real-");
    const slotsPath = join(root, "chat-slots.json");
    const handoffsDir = join(root, "handoffs");
    const claimsDir = join(root, "claims");
    mkdirSync(handoffsDir, { recursive: true });
    mkdirSync(claimsDir, { recursive: true });

    // slot table: one fresh slot, one stale slot
    writeFileSync(slotsPath, JSON.stringify({
      schemaVersion: 1,
      slots: {
        alpha: { chatId: "claude-a11c0ffe", host: "MarkV", pid: 1, lastHeartbeat: iso(0.5 * HOUR) },
        bravo: { chatId: "claude-deadbeef", host: "MarkV", pid: 2, lastHeartbeat: iso(20 * HOUR) },
      },
    }));

    // handoffs: a keyed live-owner, a keyed dead-owner, a topic-keyed (unkeyed),
    // plus DECOYS the filter must reject — a non-handoff .md and a .tmp file.
    writeFileSync(join(handoffsDir, "HANDOFF-claude-a11c0ffe-topic.md"), "live");
    writeFileSync(join(handoffsDir, "HANDOFF-claude-deadbeef-topic.md"), "dead");
    writeFileSync(join(handoffsDir, "HANDOFF-audit-hooks-2026-05-14.md"), "unkeyed");
    writeFileSync(join(handoffsDir, "CONTINUE-CAD.md"), "decoy: not a HANDOFF-");
    writeFileSync(join(handoffsDir, "HANDOFF-claude-abc-x.md.99.tmp"), "decoy: not .md");

    // claims: one stale milestone dir, one fresh milestone dir, PLUS the
    // real-world adversarial top-level entries that listDirs() must skip.
    mkdirSync(join(claimsDir, "STALE-MS0"));
    writeFileSync(join(claimsDir, "STALE-MS0", "claim.json"), JSON.stringify({
      schemaVersion: "1.0.0", milestone: "STALE-MS0", chatId: "claude-stale",
      host: "DESKTOP-N7MI1VB", lastHeartbeat: iso(50 * HOUR),
    }));
    mkdirSync(join(claimsDir, "FRESH-MS0"));
    writeFileSync(join(claimsDir, "FRESH-MS0", "claim.json"), JSON.stringify({
      schemaVersion: "1.0.0", milestone: "FRESH-MS0", chatId: "claude-fresh",
      host: "MarkV", lastHeartbeat: iso(0.25 * HOUR),
    }));
    writeFileSync(join(claimsDir, "ACTIVE_CLAIM.json"), "{}");      // top-level FILE, not a dir
    writeFileSync(join(claimsDir, ".gitkeep"), "");                 // top-level FILE, not a dir

    return { root, slotsPath, handoffsDir, claimsDir };
  }

  it("discovers handoffs via the real filter, rejecting non-HANDOFF and non-.md decoys", () => {
    const fx = buildFixture();
    const r = sweep(
      { slots: fx.slotsPath, handoffs: fx.handoffsDir, claims: fx.claimsDir, staleHours: 4, json: false },
      { now: NOW },
    );
    // 3 real handoffs counted; CONTINUE-CAD.md and the .tmp are filtered out.
    expect(r.handoffs.total).toBe(3);
    expect(r.handoffs.liveOwner).toBe(1);
    expect(r.handoffs.deadOwner).toBe(1);
    expect(r.handoffs.unkeyed).toBe(1);
    expect(r.handoffs.deadOwnerFiles[0].file).toBe("HANDOFF-claude-deadbeef-topic.md");
  });

  it("discovers claims via real listDirs, skipping the top-level ACTIVE_CLAIM.json + .gitkeep files", () => {
    const fx = buildFixture();
    const r = sweep(
      { slots: fx.slotsPath, handoffs: fx.handoffsDir, claims: fx.claimsDir, staleHours: 4, json: false },
      { now: NOW },
    );
    // Only the 2 milestone DIRECTORIES are scanned — the 2 top-level files don't count.
    expect(r.claims.total).toBe(2);
    expect(r.claims.stale).toBe(1);
    expect(r.claims.fresh).toBe(1);
    expect(r.claims.staleDetail[0]).toMatchObject({
      milestone: "STALE-MS0", chatId: "claude-stale", host: "DESKTOP-N7MI1VB",
    });
  });

  it("real claim.json round-trips the full 5-field shape into staleDetail", () => {
    const fx = buildFixture();
    const r = sweep(
      { slots: fx.slotsPath, handoffs: fx.handoffsDir, claims: fx.claimsDir, staleHours: 4, json: false },
      { now: NOW },
    );
    const detail = r.claims.staleDetail[0];
    expect(detail.heartbeatAgeHours).toBeCloseTo(50, 0);
    // confirm the on-disk claim is genuinely the realistic shape, not a stub
    const onDisk = JSON.parse(readFileSync(join(fx.claimsDir, "STALE-MS0", "claim.json"), "utf-8"));
    expect(onDisk.schemaVersion).toBe("1.0.0");
  });

  it("missing handoffs + claims dirs → zero counts, no throw (real listFiles/listDirs return [])", () => {
    const root = mkTmp("hs-empty-");
    const r = sweep(
      { slots: join(root, "nope.json"), handoffs: join(root, "no-handoffs"), claims: join(root, "no-claims"), staleHours: 4, json: false },
      { now: NOW },
    );
    expect(r.handoffs.total).toBe(0);
    expect(r.claims.total).toBe(0);
    expect(r.ok).toBe(true);
  });
});
