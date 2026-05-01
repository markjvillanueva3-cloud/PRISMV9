/**
 * SafetyConsensusGateAction.test.ts — P4-U02 round-trip test for
 * `prism_safety:consensus_gate`.
 *
 * The dispatcher action takes JSON params and returns a JSON quorum decision.
 * This suite exercises the full handler path:
 *   handleConsensusGate(params) → engine.vote() → arbitration log append.
 *
 * Tests redirect the arbitration log to a fresh tmpdir per spec (env var
 * PRISM_ARBITRATION_LOG_PATH) so test runs cannot scribble on the real
 * H:/prism log.
 *
 * Coverage:
 *   - Unanimous PASS: returns PASS, NO arbitration entry written.
 *   - 3-2 PASS/FAIL: bare-majority-downgrade → CONDITIONAL, arbitration entry
 *     captures dissent details + provider verdicts + cacheKey.
 *   - 4 ollama-only: REFUSED, arbitration entry written with `decision: "REFUSED"`.
 *   - Schema validation rejects empty `input` and accepts well-formed payloads.
 *   - Panel not registered → handler throws.
 *   - Cache hit on identical params, both calls log to arbitration.
 *   - Logging failure does not mask the quorum decision.
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  handleConsensusGate,
  setConsensusPanel,
  setConsensusEngine,
  resetConsensusEngine,
} from "../tools/consensusGateTools.js";
import {
  PRISMConsensusGateEngine,
  type Decision,
  type ProviderVerdict,
  type QuorumProvider,
} from "../engines/PRISMConsensusGateEngine.js";
import { ACTION_SAFETY_SCHEMAS } from "../schemas/safetyActionSchemas.js";
import { readArbitrationEvents } from "../utils/arbitrationWriter.js";

// ── Per-test arbitration log redirect ────────────────────────────────

let tmpRoot: string;
let logPath: string;
let originalEnv: string | undefined;

beforeEach(() => {
  tmpRoot = mkdtempSync(join(tmpdir(), "prism-arb-test-"));
  logPath = join(tmpRoot, "AGENT_CONFLICT_ARBITRATION.json");
  originalEnv = process.env.PRISM_ARBITRATION_LOG_PATH;
  process.env.PRISM_ARBITRATION_LOG_PATH = logPath;
  // Fresh engine per test so its cache cannot leak across cases.
  setConsensusEngine(new PRISMConsensusGateEngine());
});

afterEach(() => {
  setConsensusPanel(null);
  resetConsensusEngine();
  if (originalEnv === undefined) delete process.env.PRISM_ARBITRATION_LOG_PATH;
  else process.env.PRISM_ARBITRATION_LOG_PATH = originalEnv;
  rmSync(tmpRoot, { recursive: true, force: true });
});

// ── Helpers ──────────────────────────────────────────────────────────

function v(d: Decision, rationale = "test", flags: string[] = []): ProviderVerdict {
  return { decision: d, rationale, flags, confidence: 0.9 };
}

function provider(id: string, kind: "cloud" | "ollama", verdict: ProviderVerdict): QuorumProvider {
  return { id, kind, invoke: async () => verdict };
}

const FIVE_PASS = (): QuorumProvider[] => [
  provider("claude", "cloud", v("PASS")),
  provider("codex", "cloud", v("PASS")),
  provider("qwen-coder", "ollama", v("PASS")),
  provider("qwen", "ollama", v("PASS")),
  provider("mistral", "ollama", v("PASS")),
];

// ── 1. Unanimous PASS: NO arbitration write ──────────────────────────

describe("prism_safety:consensus_gate — unanimous PASS", () => {
  it("returns PASS and skips arbitration log on clean unanimous decision", async () => {
    setConsensusPanel(FIVE_PASS());
    const r = await handleConsensusGate({
      input: "// minor JSDoc edit — no functional change",
      context: { sessionId: "claude-test-1", note: "smoke" },
    });
    expect(r.decision).toBe("PASS");
    expect(r.dissent).toEqual([]);
    expect(r.flagsSurfaced).toEqual([]);
    expect(r.arbitrationLogged).toBe(false);
    const events = await readArbitrationEvents({ logPath });
    expect(events).toEqual([]);
  });
});

// ── 2. Bare-majority split: arbitration entry written ────────────────

describe("prism_safety:consensus_gate — bare majority", () => {
  it("3 PASS / 2 FAIL → CONDITIONAL, dissent persisted to arbitration log", async () => {
    setConsensusPanel([
      provider("claude", "cloud", v("PASS")),
      provider("codex", "cloud", v("PASS")),
      provider("qwen-coder", "ollama", v("PASS")),
      provider("qwen", "ollama", v("FAIL", "missing migration test", ["test-coverage"])),
      provider("mistral", "ollama", v("FAIL", "API rename without callers updated", ["api-break"])),
    ]);
    const r = await handleConsensusGate({
      input: "// rename PublicAPI.foo → PublicAPI.bar",
      context: { sessionId: "claude-test-2", commitHash: "abc1234", files: ["a.ts", "b.ts"] },
    });
    expect(r.decision).toBe("CONDITIONAL");
    expect(r.reason).toMatch(/bare-majority-downgrade/);
    expect(r.arbitrationLogged).toBe(true);

    const events = await readArbitrationEvents({ logPath });
    expect(events.length).toBe(1);
    const ev = events[0];
    expect(ev.kind).toBe("consensus-dissent");
    expect(ev.sessionId).toBe("claude-test-2");
    expect(ev.details.decision).toBe("CONDITIONAL");
    expect(ev.details.votes).toEqual({ PASS: 3, CONDITIONAL: 0, FAIL: 2 });
    expect(ev.details.dissentCount).toBe(2);
    expect(ev.details.flagsSurfaced).toEqual(expect.arrayContaining(["test-coverage", "api-break"]));
    const providers = ev.details.providers as Array<{ id: string }>;
    expect(providers.map((p) => p.id)).toEqual(["claude", "codex", "qwen-coder", "qwen", "mistral"]);
    expect(ev.details.context).toMatchObject({
      sessionId: "claude-test-2",
      commitHash: "abc1234",
      files: ["a.ts", "b.ts"],
    });
    expect(typeof ev.details.cacheKey).toBe("string");
    expect((ev.details.cacheKey as string).length).toBe(64); // sha-256 hex
  });
});

// ── 3. Cloud-mandatory: REFUSED + arbitration entry ──────────────────

describe("prism_safety:consensus_gate — cloud-mandatory", () => {
  it("4 ollama-only → REFUSED with arbitration entry recording the refusal", async () => {
    setConsensusPanel([
      provider("qwen-coder", "ollama", v("PASS")),
      provider("qwen", "ollama", v("PASS")),
      provider("mistral", "ollama", v("PASS")),
      provider("llama", "ollama", v("PASS")),
    ]);
    const r = await handleConsensusGate({
      input: "// safety-critical edit but no cloud provider",
    });
    expect(r.decision).toBe("REFUSED");
    expect(r.cloudPresent).toBe(false);
    expect(r.arbitrationLogged).toBe(true);

    const events = await readArbitrationEvents({ logPath });
    expect(events.length).toBe(1);
    expect(events[0].details.decision).toBe("REFUSED");
    expect(events[0].details.cloudPresent).toBe(false);
  });
});

// ── 4. Schema validation ─────────────────────────────────────────────

describe("prism_safety:consensus_gate — schema validation", () => {
  it("Zod schema rejects empty `input` and accepts well-formed payloads", () => {
    const schema = ACTION_SAFETY_SCHEMAS["consensus_gate"];
    const bad = schema.safeParse({ input: "" });
    expect(bad.success).toBe(false);
    if (!bad.success) {
      expect(bad.error.issues.some((i) => i.path[0] === "input")).toBe(true);
    }
    const good = schema.safeParse({ input: "real input", context: { sessionId: "s" } });
    expect(good.success).toBe(true);
    if (good.success) {
      expect(good.data.input).toBe("real input");
      expect(good.data.context?.sessionId).toBe("s");
    }
  });

  it("Zod schema rejects missing `input` outright", () => {
    const schema = ACTION_SAFETY_SCHEMAS["consensus_gate"];
    const r = schema.safeParse({});
    expect(r.success).toBe(false);
  });

  it("handler throws when panel is not registered", async () => {
    // No setConsensusPanel call — panel stays null.
    await expect(
      handleConsensusGate({ input: "// some text" })
    ).rejects.toThrow(/no panel registered/);
  });

  it("handler throws on empty input", async () => {
    setConsensusPanel(FIVE_PASS());
    await expect(handleConsensusGate({ input: "" })).rejects.toThrow(/non-empty/);
  });
});

// ── 5. Cache hit semantics ───────────────────────────────────────────

describe("prism_safety:consensus_gate — cache", () => {
  it("identical params hit the engine cache; arbitration writes both calls for full audit trail", async () => {
    setConsensusPanel([
      provider("claude", "cloud", v("PASS")),
      provider("codex", "cloud", v("PASS")),
      provider("qwen-coder", "ollama", v("PASS")),
      provider("qwen", "ollama", v("FAIL", "objection")),
      provider("mistral", "ollama", v("FAIL", "objection")),
    ]);
    const args = { input: "// caching-test diff", context: { sessionId: "claude-cache" } };

    const r1 = await handleConsensusGate(args);
    const r2 = await handleConsensusGate(args);
    expect(r1.cacheHit).toBe(false);
    expect(r2.cacheHit).toBe(true);
    expect(r1.cacheKey).toBe(r2.cacheKey);

    // Two entries — the cache hits the engine layer only; the dispatcher still
    // writes its dissent record on the second call so the arbitration log
    // reflects the full call history. Skipping the second write would hide
    // multi-chat retries from the audit trail.
    const events = await readArbitrationEvents({ logPath });
    expect(events.length).toBe(2);
    expect(events[0].details.cacheHit).toBe(false);
    expect(events[1].details.cacheHit).toBe(true);
  });
});

// ── 6. Logging-failure resilience ────────────────────────────────────

describe("prism_safety:consensus_gate — logging-failure resilience", () => {
  it("returns the quorum decision even when arbitration write fails", async () => {
    // Pre-create a regular file at the lock-directory location so mkdir(lockDir)
    // can never succeed (mkdir of a path occupied by a non-directory file fails
    // even after retries). The handler must surface the failure as a
    // flagsSurfaced entry rather than throwing.
    const blockingFilePath = `${logPath}.lock`;
    const { writeFileSync, mkdirSync } = await import("node:fs");
    mkdirSync(tmpRoot, { recursive: true });
    writeFileSync(blockingFilePath, "blocking", "utf8");

    setConsensusPanel([
      provider("claude", "cloud", v("PASS")),
      provider("codex", "cloud", v("PASS")),
      provider("qwen", "ollama", v("FAIL")),
      provider("mistral", "ollama", v("FAIL")),
      provider("llama", "ollama", v("FAIL")),
    ]);
    const r = await handleConsensusGate({ input: "// will fail to log" });
    expect(r.decision).toBe("FAIL");
    expect(r.arbitrationLogged).toBe(false);
    expect(r.flagsSurfaced.some((f) => f.startsWith("arbitration-write-failed"))).toBe(true);
  });
});
