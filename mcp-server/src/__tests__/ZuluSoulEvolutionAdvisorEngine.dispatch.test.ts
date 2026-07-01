/**
 * ZuluSoulEvolutionAdvisorEngine (C8) -- dispatcher round-trip (R15 E2E).
 *
 * Exercises the FULL C7->C8 composition through registerSessionDispatcher: record
 * outcomes via C7 (attestation_record_outcome), then soul_evolution_propose reads C7's
 * live AttestationScores and produces advisory proposals; soul_evolution_emit /
 * _proposals_list round-trip the durable ledger. HERMETIC: both store env paths set at
 * top-level before any dispatch.
 */
import { describe, it, expect, afterAll } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

const ATTEST_STORE = path.join(os.tmpdir(), `zulu-c8-attest-${process.pid}-${Math.random().toString(36).slice(2)}.json`);
const PROPOSAL_LEDGER = path.join(os.tmpdir(), `zulu-c8-prop-${process.pid}-${Math.random().toString(36).slice(2)}.jsonl`);
process.env.PRISM_ZULU_ATTESTATION_PATH = ATTEST_STORE;
process.env.PRISM_ZULU_SOUL_PROPOSALS_PATH = PROPOSAL_LEDGER;
const NOW = "2026-06-15T12:00:00.000Z";

afterAll(() => {
  for (const base of [ATTEST_STORE, PROPOSAL_LEDGER]) {
    try {
      const dir = path.dirname(base);
      for (const f of fs.readdirSync(dir)) if (f.startsWith(path.basename(base))) fs.rmSync(path.join(dir, f), { force: true });
    } catch { /* best-effort */ }
  }
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

describe("prism_session soul_evolution_* round-trip (R15 E2E -- full C7->C8 composition)", () => {
  it("declared-but-failing slot -> propose reads C7 -> remove_domain advisory; emit+list round-trip", async () => {
    const invoke = await captureInvoke();
    // C7: foxtrot declares lathe but fails it (5/25) -> over_claim.
    for (let i = 0; i < 25; i++) await invoke("attestation_record_outcome", { slot: "foxtrot", domain: "lathe", success: i < 5, now: NOW });

    const prop = await invoke("soul_evolution_propose", { slot: "foxtrot", declaredDomains: ["lathe"], now: NOW });
    const proposals = prop.proposals as Array<{ change_type: string; domain: string; operator_approval_required: boolean; auto_apply: boolean; target_field: string }>;
    expect(proposals).toHaveLength(1);
    expect(proposals[0].change_type).toBe("remove_domain");
    expect(proposals[0].domain).toBe("lathe");
    expect(proposals[0].operator_approval_required).toBe(true);
    expect(proposals[0].auto_apply).toBe(false);
    expect(proposals[0].target_field).toBe("domain_filter"); // never refuse_list
    expect(prop.chat_message as unknown as string).toContain("operator approval required");

    // emit -> list round-trip on the durable ledger.
    const emit = await invoke("soul_evolution_emit", { proposals, now: NOW });
    expect((emit.result as { ok: boolean; written: number })).toEqual({ ok: true, written: 1 });
    const list = await invoke("soul_evolution_proposals_list", { slot: "foxtrot" });
    expect((list.count as unknown as number)).toBe(1);
    expect((list.proposals as Array<{ domain: string }>)[0].domain).toBe("lathe");
  });

  it("a competent declared slot yields NO proposal (no churn)", async () => {
    const invoke = await captureInvoke();
    for (let i = 0; i < 25; i++) await invoke("attestation_record_outcome", { slot: "oscar", domain: "speed-feed", success: i < 24, now: NOW });
    const prop = await invoke("soul_evolution_propose", { slot: "oscar", declaredDomains: ["speed-feed"], now: NOW });
    // slimResponse strips empty arrays -> a stripped `proposals` means zero proposals.
    expect(((prop.proposals as unknown[] | undefined) ?? [])).toHaveLength(0);
  });

  it("SAFETY: a discredited safety-sensitive domain is refused, never proposed", async () => {
    const invoke = await captureInvoke();
    for (let i = 0; i < 25; i++) await invoke("attestation_record_outcome", { slot: "golf", domain: "compliance", success: i < 4, now: NOW });
    const prop = await invoke("soul_evolution_propose", { slot: "golf", declaredDomains: ["compliance"], now: NOW });
    expect(((prop.proposals as unknown[] | undefined) ?? [])).toHaveLength(0); // never emitted (empty -> slimmed)
    expect((prop.refused as Array<{ domain: string; refused_reason: string }>)[0].domain).toBe("compliance");
    expect((prop.refused as Array<{ refused_reason: string }>)[0].refused_reason).toMatch(/safety-sensitive/);
  });
});
