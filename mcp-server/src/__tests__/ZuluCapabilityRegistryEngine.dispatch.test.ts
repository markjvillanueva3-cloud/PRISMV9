/**
 * ZuluCapabilityRegistryEngine (C6) -- dispatcher round-trip (R15 E2E).
 *
 * Exercises capability_registry_snapshot / capability_attest THROUGH
 * registerSessionDispatcher. HERMETIC: PRISM_CHAT_SLOTS_FILE +
 * PRISM_SLOT_TASK_CLAIMS_FILE -> unique tmp fixtures written at top-level BEFORE any
 * dispatch (the dispatcher lazy-imports the engine, whose singleton binds the env paths
 * on first read -- no live chat-slots accretion). Read-only: no store is mutated.
 */
import { describe, it, expect, afterAll } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

const NOW = "2026-06-15T12:00:00.000Z";
const SLOTS_FILE = path.join(os.tmpdir(), `zulu-cap-disp-slots-${process.pid}-${Math.random().toString(36).slice(2)}.json`);
const CLAIMS_FILE = path.join(os.tmpdir(), `zulu-cap-disp-claims-${process.pid}-${Math.random().toString(36).slice(2)}.json`);

fs.writeFileSync(SLOTS_FILE, JSON.stringify({
  slots: {
    bravo: { chatId: "claude-b1", claimedAt: "2026-06-15T10:00:00.000Z", lastHeartbeat: "2026-06-15T11:59:00.000Z", topic: "hermes-build", branch: "slot/bravo" },
    oscar: { chatId: "claude-o1", claimedAt: "2026-06-15T11:55:00.000Z", lastHeartbeat: "2026-06-15T11:00:00.000Z", branch: "slot/oscar" }, // crashed (60m heartbeat)
  },
}), "utf8");
fs.writeFileSync(CLAIMS_FILE, JSON.stringify({
  schemaVersion: 1,
  claims: { "U-1": { slot: "bravo", phase: "building" }, "U-2": { slot: "bravo", phase: "testing" }, "U-3": { slot: "oscar", released: true } },
}), "utf8");
process.env.PRISM_CHAT_SLOTS_FILE = SLOTS_FILE;
process.env.PRISM_SLOT_TASK_CLAIMS_FILE = CLAIMS_FILE;

afterAll(() => {
  for (const f of [SLOTS_FILE, CLAIMS_FILE]) { try { fs.rmSync(f, { force: true }); } catch { /* best-effort */ } }
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

describe("prism_session capability_* round-trip (R15 E2E, hermetic tmp fixtures)", () => {
  it("capability_registry_snapshot aggregates live slots + active claim counts", async () => {
    const invoke = await captureInvoke();
    const snap = await invoke("capability_registry_snapshot", { now: NOW });
    expect((snap.ok as unknown as boolean)).toBe(true);
    expect((snap.count as unknown as number)).toBe(2);
    const atts = snap.attestations as unknown as Array<{ slot: string; liveness: string; queue_depth: number; domain_affinity: string }>;
    const bravo = atts.find((a) => a.slot === "bravo")!;
    expect(bravo.liveness).toBe("alive");
    expect(bravo.queue_depth).toBe(2); // 2 active claims, U-3(released) excluded
    expect(bravo.domain_affinity).toBe("hermes-build");
    const oscar = atts.find((a) => a.slot === "oscar")!;
    expect(oscar.liveness).toBe("crashed");
    expect(oscar.queue_depth).toBe(0); // its only claim was released
    expect(atts[0].slot).toBe("bravo"); // alive sorts before crashed
  });

  it("capability_attest returns one slot's live attestation through the dispatcher", async () => {
    const invoke = await captureInvoke();
    const r = await invoke("capability_attest", { slot: "bravo", now: NOW, activeModels: ["qwen2.5-coder:32b"] });
    const a = r.attestation as unknown as { slot: string; liveness: string; queue_depth: number; active_models: string[]; active_models_source: string };
    expect(a.slot).toBe("bravo");
    expect(a.liveness).toBe("alive");
    expect(a.queue_depth).toBe(2);
    expect(a.active_models).toEqual(["qwen2.5-coder:32b"]);
    expect(a.active_models_source).toBe("provided");
  });

  it("capability_attest on an unknown slot -> idle (read-only, never throws)", async () => {
    const invoke = await captureInvoke();
    const r = await invoke("capability_attest", { slot: "zzz-nonexistent", now: NOW });
    const a = r.attestation as unknown as { slot: string; liveness: string; queue_depth: number; active_models_source: string };
    expect(a.slot).toBe("zzz-nonexistent");
    expect(a.liveness).toBe("idle");
    expect(a.queue_depth).toBe(0);
    expect(a.active_models_source).toBe("unavailable"); // R12 honest: no model probe wired
  });
});
