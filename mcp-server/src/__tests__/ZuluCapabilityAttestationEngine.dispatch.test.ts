/**
 * ZuluCapabilityAttestationEngine (C7) -- dispatcher round-trip (R15 E2E).
 *
 * Exercises attestation_record_outcome / attestation_score / attestation_score_all /
 * attestation_bid_modifier THROUGH registerSessionDispatcher. HERMETIC:
 * PRISM_ZULU_ATTESTATION_PATH -> a unique tmp store set at top-level BEFORE any dispatch
 * (the dispatcher lazy-imports the engine whose singleton binds the path on first call).
 */
import { describe, it, expect, afterAll } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

const TMP_STORE = path.join(os.tmpdir(), `zulu-attest-dispatch-${process.pid}-${Math.random().toString(36).slice(2)}.json`);
process.env.PRISM_ZULU_ATTESTATION_PATH = TMP_STORE;
const NOW = "2026-06-15T12:00:00.000Z";

afterAll(() => {
  try {
    const dir = path.dirname(TMP_STORE);
    for (const f of fs.readdirSync(dir)) {
      if (f.startsWith(path.basename(TMP_STORE))) fs.rmSync(path.join(dir, f), { force: true });
    }
  } catch { /* best-effort */ }
});

type Handler = (args: { action: string; params?: Record<string, unknown> }) => Promise<{ content: Array<{ type: "text"; text: string }> }>;

async function captureInvoke() {
  const { registerSessionDispatcher } = await import("../tools/dispatchers/sessionDispatcher.js");
  let captured: Handler | undefined;
  registerSessionDispatcher({ tool: (_n: string, _d: string, _s: unknown, h: Handler) => { captured = h; } } as never);
  if (typeof captured !== "function") throw new Error("dispatcher did not register a handler");
  return async (action: string, params: Record<string, unknown>) =>
    JSON.parse((await captured!({ action, params })).content[0].text) as Record<string, never>;
}

describe("prism_session attestation_* round-trip (R15 E2E, hermetic tmp store)", () => {
  it("record 25 outcomes (20 success) -> score reflects rate 0.8 + advisory modifier > 1", async () => {
    const invoke = await captureInvoke();
    for (let i = 0; i < 25; i++) {
      const r = await invoke("attestation_record_outcome", { slot: "foxtrot", domain: "mill", success: i < 20, now: NOW });
      expect((r.result as { ok: boolean }).ok).toBe(true);
    }
    const s = await invoke("attestation_score", { slot: "foxtrot", domain: "mill", now: NOW, declaredDomains: ["mill"] });
    const score = s.score as { sample_n: number; successes: number; empirical_success_rate: number; bid_modifier: number; declared_affinity: boolean; over_claim: boolean };
    expect(score.sample_n).toBe(25);
    expect(score.successes).toBe(20);
    expect(score.empirical_success_rate).toBeCloseTo(0.8, 6);
    expect(score.declared_affinity).toBe(true);
    expect(score.bid_modifier).toBeGreaterThan(1.0); // proven competence rewards the bid
    expect(score.over_claim).toBe(false);
  });

  it("a declared-but-failing slot is flagged over_claim with modifier < 1 (advisory discount)", async () => {
    const invoke = await captureInvoke();
    for (let i = 0; i < 25; i++) await invoke("attestation_record_outcome", { slot: "foxtrot", domain: "lathe", success: i < 5, now: NOW });
    const s = await invoke("attestation_score", { slot: "foxtrot", domain: "lathe", now: NOW, declaredDomains: ["lathe"] });
    const score = s.score as { over_claim: boolean; bid_modifier: number };
    expect(score.over_claim).toBe(true);
    expect(score.bid_modifier).toBeLessThan(1.0);
    expect(score.bid_modifier).toBeGreaterThan(0); // NEVER a veto
  });

  it("attestation_bid_modifier matches attestation_score.bid_modifier; record_outcome rejects bad input", async () => {
    const invoke = await captureInvoke();
    await invoke("attestation_record_outcome", { slot: "oscar", domain: "speed-feed", success: true, now: NOW });
    const m = await invoke("attestation_bid_modifier", { slot: "oscar", domain: "speed-feed", now: NOW });
    const s = await invoke("attestation_score", { slot: "oscar", domain: "speed-feed", now: NOW });
    expect((m.bid_modifier as unknown as number)).toBeCloseTo((s.score as { bid_modifier: number }).bid_modifier, 9);
    // thin evidence (n=1) -> neutral modifier
    expect((m.bid_modifier as unknown as number)).toBe(1.0);
    const bad = await invoke("attestation_record_outcome", { slot: "BAD SLOT", domain: "mill", success: true, now: NOW });
    expect((bad.result as { ok: boolean }).ok).toBe(false);
  });

  it("attestation_score_all returns every recorded pair", async () => {
    const invoke = await captureInvoke();
    await invoke("attestation_record_outcome", { slot: "alpha", domain: "cad", success: true, now: NOW });
    const all = await invoke("attestation_score_all", { now: NOW });
    expect((all.count as unknown as number) >= 1).toBe(true);
    const pairs = (all.scores as Array<{ slot: string; domain: string }>).map((s) => `${s.slot}|${s.domain}`);
    expect(pairs).toContain("alpha|cad");
  });
});
