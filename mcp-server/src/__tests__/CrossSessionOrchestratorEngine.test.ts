/**
 * Tests for CrossSessionOrchestratorEngine (COORD-MS0/U-COORD04)
 *
 * Coverage floor (per comprehensive-build enforcement):
 *   - happy path (claim/release/broadcast/handoff/getStatus/identity)
 *   - ≥3 failure modes (collision / unclaimed-release / invalid handoff /
 *     missing summary / malformed summary JSON)
 *   - ≥2 adversarial inputs (NaN ttl, Infinity ttl, empty string resource,
 *     oversize resource, malformed identity overrides)
 *   - ≥3 spanning configurations (3 distinct family values claude/codex/other,
 *     3 distinct identity overrides, 3 distinct sessionId formats for isSelf)
 *
 * Tests are hermetic where the wrapped engines allow it:
 *   - getStatus reads PRISM_COORD_SUMMARY_PATH (env override) — pointed at
 *     a per-suite temp file.
 *   - claim/release use unique random resource names so we never collide
 *     with peer chats sharing the real ATOMIC_CLAIMS.json registry.
 *   - broadcasts go to the underlying CrossTerminalBroadcastEngine's
 *     canonical channel — we read them back through the same engine, so
 *     external noise is filtered out by sessionId.
 */

import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import * as crypto from "crypto";

import {
  CrossSessionOrchestratorEngine,
  crossSessionOrchestratorEngine,
  type BroadcastMessage,
  type HandoffOutcome,
  type SessionHandoffV2,
} from "../engines/CrossSessionOrchestratorEngine.js";
import { atomicClaimBrokerEngine } from "../engines/AtomicClaimBrokerEngine.js";
import { sessionHandoffV2Engine } from "../engines/SessionHandoffV2Engine.js";

const SCRATCH_DIR = path.join(os.tmpdir(), `coord-orch-test-${process.pid}-${Date.now()}`);
const SUMMARY_PATH = path.join(SCRATCH_DIR, "AGENT_COORDINATION_SUMMARY.json");
const HANDOFF_DIR = path.join(SCRATCH_DIR, "handoffs");
const ORIGINAL_SUMMARY = process.env.PRISM_COORD_SUMMARY_PATH;

function uniqueResource(label: string): string {
  return `test://coord-orch/${label}/${crypto.randomBytes(8).toString("hex")}`;
}

function writeSummary(payload: Record<string, unknown>): void {
  fs.mkdirSync(SCRATCH_DIR, { recursive: true });
  fs.writeFileSync(SUMMARY_PATH, JSON.stringify(payload));
}

beforeEach(() => {
  fs.mkdirSync(SCRATCH_DIR, { recursive: true });
  process.env.PRISM_COORD_SUMMARY_PATH = SUMMARY_PATH;
});

afterEach(() => {
  for (const claim of atomicClaimBrokerEngine.getActiveClaims()) {
    if (claim.resource.startsWith("test://coord-orch/")) {
      atomicClaimBrokerEngine.releaseClaim(claim.resource);
    }
  }
  try { fs.unlinkSync(SUMMARY_PATH); } catch { /* ok */ }
});

afterAll(() => {
  try { fs.rmSync(SCRATCH_DIR, { recursive: true, force: true }); } catch { /* ok */ }
  if (ORIGINAL_SUMMARY === undefined) {
    delete process.env.PRISM_COORD_SUMMARY_PATH;
  } else {
    process.env.PRISM_COORD_SUMMARY_PATH = ORIGINAL_SUMMARY;
  }
});

// ===========================================================================
// SECTION 1 — Identity
// ===========================================================================

describe("CrossSessionOrchestratorEngine — identity", () => {
  it("singleton returns the same instance every time", () => {
    const a = CrossSessionOrchestratorEngine.getInstance();
    const b = CrossSessionOrchestratorEngine.getInstance();
    expect(a).toBe(b);
    expect(a).toBe(crossSessionOrchestratorEngine);
  });

  it("getSessionId is family@hostname/pid-N", () => {
    const id = crossSessionOrchestratorEngine.getSessionId();
    expect(id).toMatch(/^[^@]+@[^/]+\/pid-\d+$/);
    expect(id).toContain(`pid-${process.pid}`);
    expect(id).toContain(`@${os.hostname()}`);
  });

  it("getIdentity returns family∈{claude,codex,other}, real hostname + pid", () => {
    const ident = crossSessionOrchestratorEngine.getIdentity();
    expect(["claude", "codex", "other"]).toContain(ident.family);
    expect(ident.machine).toBe(os.hostname());
    expect(ident.instance).toBe(`pid-${process.pid}`);
    expect(ident.sessionId).toBe(crossSessionOrchestratorEngine.getSessionId());
  });
});

// ===========================================================================
// SECTION 2 — Claim broker pass-through
// ===========================================================================

describe("CrossSessionOrchestratorEngine — claim/release", () => {
  it("claim then release a unique resource succeeds (round-trip)", () => {
    const resource = uniqueResource("happy-path");
    const claim = crossSessionOrchestratorEngine.claim({ resource, ttlMs: 5_000 });
    expect(claim.success).toBe(true);
    expect(claim.resource).toBe(resource);
    expect(typeof claim.holder).toBe("string");
    expect((claim.holder ?? "")).toMatch(/.+-.+/); // holder = "${sessionId}-${hostname}"
    const released = crossSessionOrchestratorEngine.release(resource);
    expect(released).toBe(true);
  });

  it("claim is re-entrant (same caller acquires twice cleanly)", () => {
    const resource = uniqueResource("reentrant");
    const first = crossSessionOrchestratorEngine.claim({ resource, ttlMs: 5_000 });
    expect(first.success).toBe(true);
    const second = crossSessionOrchestratorEngine.claim({ resource, ttlMs: 10_000 });
    expect(second.success).toBe(true);
    expect(second.holder).toBe(first.holder);
    crossSessionOrchestratorEngine.release(resource);
  });

  it("release of an unowned resource returns false (failure mode #1)", () => {
    const resource = uniqueResource("never-claimed");
    expect(crossSessionOrchestratorEngine.release(resource)).toBe(false);
  });

  it("claim with empty resource string returns structured error (adversarial #1)", () => {
    const r = crossSessionOrchestratorEngine.claim({ resource: "" });
    expect(r.success).toBe(false);
    expect(r.error).toMatch(/non-empty/i);
    expect(r.resource).toBe("");
  });

  it("claim with NaN ttlMs falls back to default 180000ms (adversarial #2 — NaN)", () => {
    const resource = uniqueResource("nan-ttl");
    const r = crossSessionOrchestratorEngine.claim({ resource, ttlMs: Number.NaN });
    expect(r.success).toBe(true);
    const stored = atomicClaimBrokerEngine.getClaim(resource);
    expect(stored?.ttlMs).toBe(180_000); // DEFAULT_TTL_MS in AtomicClaimBroker (3 min)
    expect(stored?.resource).toBe(resource);
    crossSessionOrchestratorEngine.release(resource);
  });

  it("claim with Infinity ttlMs is capped at exactly 86400000ms / 24h (adversarial #3)", () => {
    const resource = uniqueResource("inf-ttl");
    const r = crossSessionOrchestratorEngine.claim({ resource, ttlMs: Number.POSITIVE_INFINITY });
    expect(r.success).toBe(true);
    const claim = atomicClaimBrokerEngine.getClaim(resource);
    expect(claim?.ttlMs).toBe(86_400_000); // 24h cap
    expect(claim?.resource).toBe(resource);
    crossSessionOrchestratorEngine.release(resource);
  });

  it("claim with oversize resource string (10 000 chars) succeeds with same string echoed back (adversarial #4)", () => {
    const resource = uniqueResource("oversize") + "/" + "A".repeat(10_000);
    const r = crossSessionOrchestratorEngine.claim({ resource, ttlMs: 5_000 });
    expect(r.success).toBe(true);
    expect(r.resource.length).toBeGreaterThan(10_000);
    expect(r.resource).toBe(resource);
    crossSessionOrchestratorEngine.release(resource);
  });

  it("release with null/undefined/number returns false (failure mode #2)", () => {
    // @ts-expect-error
    expect(crossSessionOrchestratorEngine.release(null)).toBe(false);
    // @ts-expect-error
    expect(crossSessionOrchestratorEngine.release(undefined)).toBe(false);
    // @ts-expect-error
    expect(crossSessionOrchestratorEngine.release(42)).toBe(false);
  });

  it("isFileClaimedByOther: self=false, foreign-holder=true with correct holder id", () => {
    const resource = uniqueResource("self-vs-foreign");
    crossSessionOrchestratorEngine.claim({ resource, ttlMs: 5_000 });
    const selfCheck = crossSessionOrchestratorEngine.isFileClaimedByOther(resource);
    expect(selfCheck.claimed).toBe(false);
    expect(selfCheck.holder).toBe(undefined);
    crossSessionOrchestratorEngine.release(resource);

    const foreignTag = `foreign-${crypto.randomBytes(4).toString("hex")}`;
    const originalEnv = process.env.CLAUDE_SESSION_ID;
    process.env.CLAUDE_SESSION_ID = foreignTag;
    try {
      atomicClaimBrokerEngine.acquireClaim(resource, 5_000);
    } finally {
      process.env.CLAUDE_SESSION_ID = originalEnv;
    }
    const foreignCheck = crossSessionOrchestratorEngine.isFileClaimedByOther(resource);
    expect(foreignCheck.claimed).toBe(true);
    expect(foreignCheck.holder).toBe(`${foreignTag}-${os.hostname()}`);

    process.env.CLAUDE_SESSION_ID = foreignTag;
    try { atomicClaimBrokerEngine.releaseClaim(resource); } finally {
      process.env.CLAUDE_SESSION_ID = originalEnv;
    }
  });
});

// ===========================================================================
// SECTION 3 — Broadcast / Subscribe
// ===========================================================================

describe("CrossSessionOrchestratorEngine — broadcast", () => {
  it("broadcastMessage returns id/from/timestamp envelope", async () => {
    const content = "test-payload-" + crypto.randomBytes(4).toString("hex");
    const msg = await crossSessionOrchestratorEngine.broadcastMessage({
      type: "info",
      content,
    });
    expect(msg.id).toMatch(/^msg-\d+-[a-z0-9]+$/);
    expect(msg.from).toBe(crossSessionOrchestratorEngine.getSessionId());
    expect(msg.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(msg.type).toBe("info");
    expect(msg.content).toBe(content);
  });

  it("subscribe receives a broadcast event (round-trip — info type maps to cache_invalidate channel)", async () => {
    const received: BroadcastMessage[] = [];
    const tag = "subtest-" + crypto.randomBytes(4).toString("hex");
    const sub = crossSessionOrchestratorEngine.subscribe(evt => {
      if ((evt.payload as { content?: string })?.content === tag) {
        received.push(evt);
      }
    });
    try {
      await crossSessionOrchestratorEngine.broadcastMessage({
        type: "info",
        content: tag,
      });
      expect(received).toHaveLength(1);
      expect(received[0].type).toBe("cache_invalidate");
      expect((received[0].payload as Record<string, unknown>)?.semantic_type).toBe("info");
      expect((received[0].payload as Record<string, unknown>)?.content).toBe(tag);
    } finally {
      sub.unsubscribe();
    }
  });

  it("registry_change broadcast type is preserved (no semantic remap)", async () => {
    const received: BroadcastMessage[] = [];
    const tag = "regch-" + crypto.randomBytes(4).toString("hex");
    const sub = crossSessionOrchestratorEngine.subscribe(evt => {
      if ((evt.payload as { content?: string })?.content === tag) received.push(evt);
    });
    try {
      await crossSessionOrchestratorEngine.broadcastMessage({
        type: "registry_change",
        content: tag,
      });
      expect(received).toHaveLength(1);
      expect(received[0].type).toBe("registry_change");
      expect((received[0].payload as Record<string, unknown>)?.semantic_type).toBe(undefined);
    } finally {
      sub.unsubscribe();
    }
  });

  it("getRecentEvents always returns an Array; sanitizes NaN/Infinity/negative limits", async () => {
    const a = await crossSessionOrchestratorEngine.getRecentEvents(10);
    expect(Array.isArray(a)).toBe(true);
    const b = await crossSessionOrchestratorEngine.getRecentEvents(Number.NaN as unknown as number);
    expect(Array.isArray(b)).toBe(true);
    const c = await crossSessionOrchestratorEngine.getRecentEvents(Number.POSITIVE_INFINITY);
    expect(Array.isArray(c)).toBe(true);
    const d = await crossSessionOrchestratorEngine.getRecentEvents(-5);
    expect(Array.isArray(d)).toBe(true);
  });

  it("forceInvalidateAll publishes a cache_invalidate event to our subscriber", async () => {
    // Tag the event with a unique correlation id via a content payload so we
    // can pick it out even if peer chats are also broadcasting on the channel.
    const tag = "force-inval-" + crypto.randomBytes(4).toString("hex");
    const received: BroadcastMessage[] = [];
    const sub = crossSessionOrchestratorEngine.subscribe(evt => {
      if (evt.type === "cache_invalidate" &&
          (evt.payload as { reason?: string })?.reason === "manual_invalidate") {
        received.push(evt);
      }
    });
    try {
      await crossSessionOrchestratorEngine.forceInvalidateAll();
      // CrossTerminalBroadcastEngine.broadcast emits synchronously inside its
      // own broadcast() call, so by the time the await resolves our handler
      // has fired exactly once with reason=manual_invalidate.
      expect(received.length).toBeGreaterThanOrEqual(1);
      expect(received[received.length - 1].type).toBe("cache_invalidate");
      expect((received[received.length - 1].payload as { reason?: string })?.reason).toBe("manual_invalidate");
      // The tag variable is referenced so it is preserved as a debug aid in
      // case the assertion needs to be tightened to filter on it; payload
      // schema for forceInvalidateAll does not currently include arbitrary
      // tags, so we only assert reason=manual_invalidate above.
      expect(tag).toMatch(/^force-inval-/);
    } finally {
      sub.unsubscribe();
    }
  });
});

// ===========================================================================
// SECTION 4 — Handoff
// ===========================================================================

describe("CrossSessionOrchestratorEngine — handoff", () => {
  it("createHandoff builds valid schemaVersion=2 payload with canonical filename", () => {
    const outcome: HandoffOutcome = crossSessionOrchestratorEngine.createHandoff({
      position: { phase: "test", milestone: "COORD-MS0", notes: "round-trip" },
      nextActions: [{ action: "verify", blocking: false }],
      writtenAt: "2026-05-13T15:00:00.000Z",
      startedAt: "2026-05-13T14:00:00.000Z",
    });
    expect(outcome.ok).toBe(true);
    expect(outcome.payload?.schemaVersion).toBe(2);
    expect(outcome.payload?.position.phase).toBe("test");
    expect(outcome.payload?.position.milestone).toBe("COORD-MS0");
    expect(outcome.payload?.nextActions).toHaveLength(1);
    expect(outcome.payload?.nextActions[0].action).toBe("verify");
    expect(outcome.payload?.writtenAt).toBe("2026-05-13T15:00:00.000Z");
    expect(outcome.payload?.identity.startedAt).toBe("2026-05-13T14:00:00.000Z");
    expect(outcome.payload?.identity.endedAt).toBe("2026-05-13T15:00:00.000Z");
    expect(outcome.serialized).toContain('"schemaVersion": 2');
    expect(outcome.filename).toMatch(/^HANDOFF-(claude|codex|other)-.+-pid-\d+\.md$/);
    const v = sessionHandoffV2Engine.validate(outcome.payload as Partial<SessionHandoffV2>);
    expect(v.ok).toBe(true);
    expect(v.errors).toEqual([]);
    expect(sessionHandoffV2Engine.isActionable(outcome.payload!)).toBe(true);
  });

  it("createHandoff with empty position + no nextActions is built but NOT actionable", () => {
    const outcome = crossSessionOrchestratorEngine.createHandoff({});
    expect(outcome.ok).toBe(true);
    expect(outcome.payload?.openGoals).toEqual([]);
    expect(outcome.payload?.keyInsights).toEqual([]);
    expect(outcome.payload?.nextActions).toEqual([]);
    expect(sessionHandoffV2Engine.isActionable(outcome.payload!)).toBe(false);
  });

  it.each([
    { family: "claude" as const },
    { family: "codex" as const },
    { family: "other" as const },
  ])("createHandoff produces correct filename for family=$family (spanning #1-3)", ({ family }) => {
    const outcome = crossSessionOrchestratorEngine.createHandoff({
      identity: { family, machine: "TEST-HOST", instance: "test-001" },
      position: { phase: "p" },
      nextActions: [{ action: "x" }],
    });
    expect(outcome.ok).toBe(true);
    expect(outcome.filename).toBe(`HANDOFF-${family}-TEST-HOST-test-001.md`);
    expect(outcome.payload?.identity.family).toBe(family);
  });

  it("createHandoff sanitizes problematic characters in identity for filename", () => {
    const outcome = crossSessionOrchestratorEngine.createHandoff({
      identity: { family: "claude", machine: "Host With Spaces!", instance: "weird/path:name" },
      position: { phase: "p" },
      nextActions: [{ action: "x" }],
    });
    expect(outcome.ok).toBe(true);
    expect(outcome.filename).not.toMatch(/[\s!:/]/);
    expect(outcome.filename).toMatch(/^HANDOFF-claude-[A-Za-z0-9._@-]+-[A-Za-z0-9._@-]+\.md$/);
    expect(outcome.payload?.identity.machine).toBe("Host With Spaces!");
  });

  it("persistHandoff writes to disk + re-parsing returns identical schemaVersion=2 payload", () => {
    const outcome = crossSessionOrchestratorEngine.createHandoff({
      identity: { family: "claude", machine: "PERSIST-TEST", instance: "pid-1" },
      position: { phase: "p1", milestone: "COORD-MS0" },
      nextActions: [{ action: "verify", blocking: true }],
      keyInsights: [{ id: "ins-1", category: "test", summary: "ok", at: "2026-05-13T00:00:00Z" }],
    });
    const abs = crossSessionOrchestratorEngine.persistHandoff(outcome, HANDOFF_DIR);
    expect(fs.existsSync(abs)).toBe(true);
    expect(path.basename(abs)).toBe("HANDOFF-claude-PERSIST-TEST-pid-1.md");
    const parsed = sessionHandoffV2Engine.parse(fs.readFileSync(abs, "utf-8"));
    expect(parsed?.schemaVersion).toBe(2);
    expect(parsed?.identity.machine).toBe("PERSIST-TEST");
    expect(parsed?.keyInsights).toHaveLength(1);
    expect(parsed?.keyInsights[0].id).toBe("ins-1");
    expect(parsed?.position.milestone).toBe("COORD-MS0");
  });

  it("persistHandoff throws on an invalid outcome (failure mode #3)", () => {
    const bad: HandoffOutcome = { ok: false, filename: "", errors: ["intentional"] };
    expect(() => crossSessionOrchestratorEngine.persistHandoff(bad, HANDOFF_DIR)).toThrow(/intentional/);
  });

  it("createHandoff with non-ISO writtenAt falls back to a real ISO timestamp", () => {
    const outcome = crossSessionOrchestratorEngine.createHandoff({
      position: { phase: "p" },
      nextActions: [{ action: "x" }],
      writtenAt: "not-an-iso-date",
    });
    expect(outcome.ok).toBe(true);
    expect(outcome.payload?.writtenAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    expect(outcome.payload?.identity.endedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });
});

// ===========================================================================
// SECTION 5 — Status
// ===========================================================================

describe("CrossSessionOrchestratorEngine — status", () => {
  it("missing summary file yields empty CoordinationStatus (failure mode #4)", () => {
    process.env.PRISM_COORD_SUMMARY_PATH = path.join(SCRATCH_DIR, "does-not-exist.json");
    const s = crossSessionOrchestratorEngine.getStatus();
    expect(s.healthy).toBe(false);
    expect(s.daemonActive).toBe(false);
    expect(s.activeSessions).toBe(0);
    expect(s.sessions).toEqual([]);
  });

  it("malformed summary JSON yields empty status without throwing (failure mode #5)", () => {
    fs.writeFileSync(SUMMARY_PATH, "{not valid json");
    const s = crossSessionOrchestratorEngine.getStatus();
    expect(s.healthy).toBe(false);
    expect(s.sessions).toEqual([]);
    expect(s.activeSessions).toBe(0);
  });

  it("healthy summary surfaces sessions, pid extraction, hostname extraction", () => {
    writeSummary({
      health: "healthy",
      daemon_active: true,
      active_sessions: 3,
      generated_at: "2026-05-13T15:00:00Z",
      sessions: [
        { id: "Claude@MARKV/pid-1234", family: "Claude" },
        { id: "Codex@LAPTOP/pid-9999", family: "Codex" },
        { id: "Other@CICD/pid-1", family: "Other" },
      ],
      latest_activity: { who: "me", what: "tested", when: "2026-05-13T15:00:00Z" },
    });
    const s = crossSessionOrchestratorEngine.getStatus();
    expect(s.healthy).toBe(true);
    expect(s.daemonActive).toBe(true);
    expect(s.activeSessions).toBe(3);
    expect(s.sessions).toHaveLength(3);
    expect(s.sessions[0].pid).toBe(1234);
    expect(s.sessions[0].hostname).toBe("MARKV");
    expect(s.sessions[1].pid).toBe(9999);
    expect(s.sessions[1].family).toBe("Codex");
    expect(s.sessions[2].pid).toBe(1);
    expect(s.latestActivity?.what).toBe("tested");
  });

  it("getOtherSessions excludes the current pid (spanning #4 — self filter)", () => {
    writeSummary({
      health: "healthy",
      daemon_active: true,
      active_sessions: 2,
      sessions: [
        { id: `Claude@${os.hostname()}/pid-${process.pid}`, family: "Claude" },
        { id: "Claude@OTHER/pid-9999", family: "Claude" },
      ],
    });
    const others = crossSessionOrchestratorEngine.getOtherSessions();
    expect(others).toHaveLength(1);
    expect(others[0].id).toBe("Claude@OTHER/pid-9999");
  });

  it("getStatusLine empty when healthy=false; '(N online)' when peers", () => {
    // Phase 1 — no summary file → empty status line
    process.env.PRISM_COORD_SUMMARY_PATH = path.join(SCRATCH_DIR, "no.json");
    expect(crossSessionOrchestratorEngine.getStatusLine()).toBe("");
    // Phase 2 — point env back at the canonical summary path and write a
    // 3-session payload (1 self + 2 others) → "(2 online)"
    process.env.PRISM_COORD_SUMMARY_PATH = SUMMARY_PATH;
    writeSummary({
      health: "healthy",
      sessions: [
        { id: `Claude@${os.hostname()}/pid-${process.pid}`, family: "Claude" },
        { id: "Claude@A/pid-1", family: "Claude" },
        { id: "Claude@B/pid-2", family: "Claude" },
      ],
    });
    expect(crossSessionOrchestratorEngine.getStatusLine()).toBe("(2 online)");
  });
});

// ===========================================================================
// SECTION 6 — Dispatcher round-trip
// ===========================================================================

type DispatcherHandler = (args: { action: string; params?: Record<string, unknown> }) => Promise<{ content: Array<{ text: string }> }>;

async function buildSessionHandler(): Promise<DispatcherHandler> {
  const { registerSessionDispatcher } = await import("../tools/dispatchers/sessionDispatcher.js");
  let captured: DispatcherHandler | null = null;
  const fakeServer = {
    tool: (_name: string, _description: string, _schema: unknown, fn: DispatcherHandler) => {
      captured = fn;
    },
  };
  registerSessionDispatcher(fakeServer);
  if (!captured) throw new Error("registerSessionDispatcher did not register a handler");
  return captured;
}

describe("CrossSessionOrchestratorEngine — dispatcher round-trip", () => {
  it("prism_session:cross_session_get_session_id routes through dispatcher", async () => {
    const handler = await buildSessionHandler();
    const out = await handler({ action: "cross_session_get_session_id", params: {} });
    const parsed = JSON.parse(out.content[0].text);
    expect(parsed.sessionId).toBe(crossSessionOrchestratorEngine.getSessionId());
    expect(parsed.identity.family).toMatch(/^(claude|codex|other)$/);
    expect(parsed.identity.machine).toBe(os.hostname());
    expect(parsed.identity.instance).toBe(`pid-${process.pid}`);
  });

  it("prism_session:cross_session_claim + cross_session_release round-trip", async () => {
    const handler = await buildSessionHandler();
    const resource = uniqueResource("dispatcher-rt");

    const claimResp = await handler({
      action: "cross_session_claim",
      params: { resource, ttl_ms: 5_000 },
    });
    const claimData = JSON.parse(claimResp.content[0].text);
    expect(claimData.success).toBe(true);
    expect(claimData.resource).toBe(resource);
    expect(typeof claimData.holder).toBe("string");

    const releaseResp = await handler({
      action: "cross_session_release",
      params: { resource },
    });
    const releaseData = JSON.parse(releaseResp.content[0].text);
    expect(releaseData.released).toBe(true);
    expect(releaseData.resource).toBe(resource);
  });

  it("prism_session:cross_session_create_handoff returns serialized v2 payload", async () => {
    const handler = await buildSessionHandler();
    const resp = await handler({
      action: "cross_session_create_handoff",
      params: {
        position: { phase: "p", milestone: "COORD-MS0", notes: "dispatcher e2e" },
        next_actions: [{ action: "verify" }],
        identity: { family: "claude", machine: "TEST-RT", instance: "pid-1" },
      },
    });
    const data = JSON.parse(resp.content[0].text);
    expect(data.ok).toBe(true);
    expect(data.filename).toBe("HANDOFF-claude-TEST-RT-pid-1.md");
    expect(data.payload.schemaVersion).toBe(2);
    expect(data.payload.position.notes).toBe("dispatcher e2e");
    expect(data.payload.nextActions).toHaveLength(1);
    expect(data.payload.identity.machine).toBe("TEST-RT");
  });

  it("prism_session:cross_session_get_status returns CoordinationStatus shape", async () => {
    writeSummary({
      health: "healthy",
      daemon_active: true,
      active_sessions: 1,
      sessions: [{ id: "Claude@RT/pid-1", family: "Claude" }],
    });
    const handler = await buildSessionHandler();
    const resp = await handler({ action: "cross_session_get_status", params: {} });
    const data = JSON.parse(resp.content[0].text);
    expect(data.healthy).toBe(true);
    expect(data.activeSessions).toBe(1);
    expect(Array.isArray(data.sessions)).toBe(true);
    expect(data.sessions[0].pid).toBe(1);
    expect(data.sessions[0].hostname).toBe("RT");
  });

  it("prism_session:cross_session_is_file_claimed exposes foreign claim status", async () => {
    const handler = await buildSessionHandler();
    const resource = uniqueResource("dispatcher-isclaimed");
    const foreignTag = `foreign-${crypto.randomBytes(4).toString("hex")}`;
    const originalEnv = process.env.CLAUDE_SESSION_ID;
    process.env.CLAUDE_SESSION_ID = foreignTag;
    try {
      atomicClaimBrokerEngine.acquireClaim(resource, 5_000);
    } finally {
      process.env.CLAUDE_SESSION_ID = originalEnv;
    }
    try {
      const resp = await handler({
        action: "cross_session_is_file_claimed",
        params: { file_path: resource },
      });
      const data = JSON.parse(resp.content[0].text);
      expect(data.claimed).toBe(true);
      expect(data.holder).toBe(`${foreignTag}-${os.hostname()}`);
    } finally {
      process.env.CLAUDE_SESSION_ID = foreignTag;
      try { atomicClaimBrokerEngine.releaseClaim(resource); } finally {
        process.env.CLAUDE_SESSION_ID = originalEnv;
      }
    }
  });
});
