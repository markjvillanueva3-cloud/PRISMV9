/**
 * hermesDispatcher round-trip tests -- exercises the full prism_hermes path
 * (schema validation -> normalize -> route -> HermesAutomationBridge), not just
 * the engine singleton. Hermetic: PRISM_HERMES_HOME points at a temp fixture.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { dispatchHermes } from "./hermesDispatcher.js";

let home: string;
const prevHome = process.env["PRISM_HERMES_HOME"];

beforeAll(() => {
  home = mkdtempSync(join(tmpdir(), "hermes-disp-"));
  writeFileSync(join(home, "active_profile"), "zulu");
  mkdirSync(join(home, "cron"), { recursive: true });
  writeFileSync(
    join(home, "cron", "jobs.json"),
    JSON.stringify([{ id: "a1", name: "morning", skill: "prism-vault-loop", model: "gpt-oss:120b", schedule_display: "7 6 * * *", enabled: true }]),
  );
  writeFileSync(
    join(home, "auth.json"),
    JSON.stringify({ active_provider: "anthropic", anthropic: [{ id: "ok1", auth_type: "oauth", expiresAt: 9_999_999_999_999 }] }),
  );
  process.env["PRISM_HERMES_HOME"] = home;
});

afterAll(() => {
  if (prevHome === undefined) delete process.env["PRISM_HERMES_HOME"];
  else process.env["PRISM_HERMES_HOME"] = prevHome;
  rmSync(home, { recursive: true, force: true });
});

describe("dispatchHermes round-trip", () => {
  it("hermes_status returns an AtomicValue through the dispatcher", async () => {
    const r = (await dispatchHermes("hermes_status")) as Record<string, unknown>;
    expect(r.source).toBe("hermes-bridge:status");
    const v = r.value as Record<string, unknown>;
    expect(v.homeExists).toBe(true);
    expect(v.activeProfile).toBe("zulu");
    expect(v.sandbox).toBe("allowed");
  });

  it("hermes_auth_status surfaces the OAuth pool through the dispatcher", async () => {
    const r = (await dispatchHermes("hermes_auth_status")) as Record<string, unknown>;
    const v = r.value as Record<string, unknown>;
    expect(v.activeProvider).toBe("anthropic");
    expect(v.oauthCount).toBe(1);
  });

  it("hermes_cron_list returns parsed jobs", async () => {
    const r = (await dispatchHermes("hermes_cron_list")) as Record<string, unknown>;
    expect((r.value as Record<string, unknown>).count).toBe(1);
  });

  it("hermes_run stays mock-by-default (no spawn) through the dispatcher", async () => {
    const r = (await dispatchHermes("hermes_run", { args: ["model", "list"] })) as Record<string, unknown>;
    expect((r.value as Record<string, unknown>).wouldRun).toBe(true);
  });

  it("rejects invalid params (empty args) at the schema layer", async () => {
    const r = (await dispatchHermes("hermes_run", { args: [] })) as unknown;
    expect(JSON.stringify(r).toLowerCase()).toContain("invalid params");
  });

  it("hermes_routine_plan emits source-verified cron automations through the dispatcher", async () => {
    const r = (await dispatchHermes("hermes_routine_plan")) as Record<string, unknown>;
    expect(r.source).toBe("hermes-bridge:routine_plan");
    const v = r.value as Record<string, unknown>;
    expect(v.deliver).toBe("telegram");
    expect((v.count as number) >= 4).toBe(true);
    const routines = v.routines as Array<Record<string, unknown>>;
    expect((routines[0].command as string).startsWith("hermes cron create ")).toBe(true);
  });

  it("hermes_routine_plan honors a deliver override param", async () => {
    const r = (await dispatchHermes("hermes_routine_plan", { deliver: "slack" })) as Record<string, unknown>;
    expect((r.value as Record<string, unknown>).deliver).toBe("slack");
  });
});

describe("dispatchHermes -- opus-fast-max + graph-improve planning (U-ALPHA-HERMES-GRAPH-IMPROVE)", () => {
  it("hermes_opus_agent_spec sizes a budget-bounded opus fan-out through the dispatcher", async () => {
    const r = (await dispatchHermes("hermes_opus_agent_spec", { budget_tokens: 1_500_000, desired_agents: 12 })) as Record<string, unknown>;
    const spec = r.spec as Record<string, unknown>;
    expect(spec.model).toBe("opus");
    expect(spec.effort).toBe("max");
    expect(spec.fastMode).toBe(true);
    expect(typeof r.recommended_parallel).toBe("number");
    expect((r.recommended_parallel as number) > 0).toBe(true);
  });

  it("hermes_opus_agent_spec rejects a missing budget at the schema layer", async () => {
    const r = (await dispatchHermes("hermes_opus_agent_spec", { desired_agents: 5 } as never)) as unknown;
    expect(JSON.stringify(r).toLowerCase()).toContain("invalid params");
  });

  it("hermes_graph_improve_plan plans a parallel opus fan-out from a wiring queue through the dispatcher", async () => {
    const r = (await dispatchHermes("hermes_graph_improve_plan", {
      queue: [
        { domain: "MiscDomains", unwired: 69, leverageScore: 138 },
        { domain: "Speed", unwired: 5, leverageScore: 5 },
        { domain: "Mill", unwired: 2, leverageScore: 2 },
      ],
      budget_tokens: 5_000_000,
      desired_agents: 6,
    })) as Record<string, unknown>;
    expect(r.ok).toBe(true);
    const batch = r.agentBatch as Array<Record<string, unknown>>;
    expect(batch.length).toBeGreaterThanOrEqual(3);
    expect((batch[0].spec as Record<string, unknown>).model).toBe("opus");
    // galaxy-owner routing surfaced (speed->oscar) among the assigned slots.
    const slots = batch.map((a) => a.slot as string);
    expect(slots).toContain("oscar");
  });

  it("hermes_graph_improve_plan rejects a malformed queue entry at the schema layer", async () => {
    const r = (await dispatchHermes("hermes_graph_improve_plan", { queue: [{ id: "x" }] } as never)) as unknown;
    expect(JSON.stringify(r).toLowerCase()).toContain("invalid params");
  });
});

describe("dispatchHermes -- substrate health (HERMES-WORK-LOOP-MS0/U1, read-only no-spawn)", () => {
  it("hermes_substrate_health grades a supplied probe through the dispatcher (R15 round-trip, not just the singleton)", async () => {
    const probe = {
      proxy: { url: "http://127.0.0.1:8645/health", ok: true, authenticated: false },
      roundTrip: { ran: true, source: "ollama", reachedHermes: false },
      tasks: [{ name: "PRISM Hermes Proxy", state: "Ready", lastResult: 0 }],
      expectedTasks: ["PRISM Hermes Proxy"],
    };
    const r = (await dispatchHermes("hermes_substrate_health", { probe })) as Record<string, unknown>;
    // proxy up but authenticated:false + a fallback round-trip => degraded, never falsely ok.
    expect(r.overall).toBe("degraded");
    expect(Array.isArray(r.components)).toBe(true);
    expect((r.recommendations as unknown[]).length).toBeGreaterThan(0);
  });

  it("an empty probe (no proxy/round-trip sub-shapes) grades non-ok, never a fabricated clean receipt", async () => {
    const r = (await dispatchHermes("hermes_substrate_health", { probe: { tasks: [] } })) as Record<string, unknown>;
    expect(r.overall).not.toBe("ok");
  });

  it("a missing probe is rejected at the schema layer (fail-closed -- probe is required)", async () => {
    const r = (await dispatchHermes("hermes_substrate_health", {})) as unknown;
    expect(JSON.stringify(r).toLowerCase()).toContain("invalid params");
  });
});
