/**
 * dispatcher.nadcapProcessQualification.test.ts — round-trip coverage for
 * WIRE-UNWIRED-MS0/U-WIRE-NPQ (NadcapProcessQualificationEngine).
 *
 * 2 pure compute/read actions through real `prism_dev`:
 *   npq_qualify     → qualify(input) — Nadcap special-process audit check
 *   npq_get_stats   → getStats() — covered AC7xxx process types
 *
 * No DEFER list: every engine method is pure (no state mutation).
 */

import { describe, it, expect, beforeAll } from "vitest";
import { registerDevDispatcher } from "../tools/dispatchers/devDispatcher.js";
import { ACTION_DEV_SCHEMAS } from "../schemas/devActionSchemas.js";
import { nadcapProcessQualificationEngine } from "../engines/NadcapProcessQualificationEngine.js";

interface CapturedTool {
  name: string;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<unknown>;
}

function makeStubServer(): {
  tools: CapturedTool[];
  tool: (name: string, desc: string, schema: unknown, h: CapturedTool["handler"]) => void;
} {
  const tools: CapturedTool[] = [];
  return {
    tools,
    tool(name, _desc, _schema, handler) { tools.push({ name, handler }); },
  };
}

async function invokeHandler(
  handler: CapturedTool["handler"],
  action: string,
  params: Record<string, unknown> = {},
): Promise<Record<string, unknown>> {
  const res = (await handler({ action, params })) as Record<string, unknown>;
  if (Array.isArray((res as { content?: unknown[] }).content)) {
    const text = ((res as { content: Array<{ text?: string }> }).content[0]?.text) ?? "";
    return JSON.parse(text) as Record<string, unknown>;
  }
  return res;
}

let devHandler: CapturedTool["handler"];

beforeAll(() => {
  const srv = makeStubServer();
  registerDevDispatcher(srv as unknown as Parameters<typeof registerDevDispatcher>[0]);
  const t = srv.tools.find((x) => x.name === "prism_dev");
  if (!t) throw new Error("prism_dev not registered");
  devHandler = t.handler;
});

// Canonical clean-audit input — all compliant, certs in order.
const CLEAN_NDT_INPUT = {
  process: "ndt" as const,
  cycle_months: 24,
  last_audit_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  operator_certs: ["NAS-410 L2 UT", "NAS-410 L2 PT"],
  line_items: [
    { ref: "AC7114 §1", description: "Operator certification current", status: "compliant" as const },
    { ref: "AC7114 §2", description: "Calibration block on file", status: "compliant" as const },
    { ref: "AC7114 §3", description: "Process spec rev current", status: "compliant" as const },
  ],
};

describe("WIRE-UNWIRED-MS0/U-WIRE-NPQ — Zod schemas", () => {
  it("npq_qualify requires process enum + line_items array", () => {
    expect(ACTION_DEV_SCHEMAS["npq_qualify"].safeParse({}).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["npq_qualify"].safeParse({
      process: "INVALID", line_items: [],
    }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["npq_qualify"].safeParse({
      process: "heat_treat", line_items: [],
    }).success).toBe(true);
  });

  it("npq_qualify caps line_items at 500 + operator_certs at 64 (DoS)", () => {
    expect(ACTION_DEV_SCHEMAS["npq_qualify"].safeParse({
      process: "heat_treat",
      line_items: new Array(501).fill({ ref: "x", description: "y", status: "compliant" }),
    }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["npq_qualify"].safeParse({
      process: "heat_treat",
      line_items: [],
      operator_certs: new Array(65).fill("cert"),
    }).success).toBe(false);
  });

  it("npq_get_stats accepts {}", () => {
    expect(ACTION_DEV_SCHEMAS["npq_get_stats"].safeParse({}).success).toBe(true);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-NPQ — prism_dev :: npq_qualify", () => {
  it("clean NDT input -> verdict='approved' + 0 findings + cert_gaps[] = []", async () => {
    const r = await invokeHandler(devHandler, "npq_qualify", CLEAN_NDT_INPUT);
    expect(r.verdict).toBe("approved");
    expect((r.total_findings as number | undefined) ?? 0).toBe(0);
    expect((r.cert_gap_count as number | undefined) ?? 0).toBe(0);
  });

  it("1 critical finding -> verdict='denied' (engine line 156)", async () => {
    const r = await invokeHandler(devHandler, "npq_qualify", {
      ...CLEAN_NDT_INPUT,
      line_items: [
        ...CLEAN_NDT_INPUT.line_items,
        { ref: "AC7114 §99", description: "PPE missing", status: "critical" },
      ],
    });
    expect(r.verdict).toBe("denied");
    expect((r.total_findings as number | undefined) ?? 0).toBe(1);
  });

  it("3+ major findings -> verdict='conditional' (engine line 158)", async () => {
    const r = await invokeHandler(devHandler, "npq_qualify", {
      ...CLEAN_NDT_INPUT,
      line_items: [
        ...CLEAN_NDT_INPUT.line_items,
        { ref: "AC7114 §10", description: "M1", status: "major" },
        { ref: "AC7114 §11", description: "M2", status: "major" },
        { ref: "AC7114 §12", description: "M3", status: "major" },
      ],
    });
    expect(r.verdict).toBe("conditional");
  });

  it("VARIABILITY — all 9 process types accepted + verdict computed for each", async () => {
    const processes = [
      "heat_treat", "chemical_processing", "non_conventional_machining",
      "ndt", "surface_enhancement", "composites",
      "conventional_machining", "materials_testing", "fluids_distribution",
    ];
    for (const proc of processes) {
      const r = await invokeHandler(devHandler, "npq_qualify", {
        process: proc, line_items: [], operator_certs: [],
      });
      // empty line_items + missing required certs -> 'denied' (cert gap)
      expect(["approved", "conditional", "denied"]).toContain(r.verdict);
      const result = (r as { result: { process: string } }).result;
      expect(result.process).toBe(proc);
    }
  });

  it("missing required cert for heat_treat triggers cert_gap + verdict denied (engine line 156)", async () => {
    const r = await invokeHandler(devHandler, "npq_qualify", {
      process: "heat_treat",
      line_items: [
        { ref: "AC7102 §1", description: "Pyrometry calibrated", status: "compliant" },
      ],
      operator_certs: [],  // missing 'pyrometry_qualified'
    });
    expect(r.verdict).toBe("denied");
    expect((r.cert_gap_count as number | undefined) ?? 0).toBeGreaterThan(0);
  });

  it("heat_treat WITHOUT tus_last_date triggers tus_overdue=true (engine line 136-138)", async () => {
    const r = await invokeHandler(devHandler, "npq_qualify", {
      process: "heat_treat",
      line_items: [
        { ref: "AC7102 §1", description: "Pyrometry calibrated", status: "compliant" },
      ],
      operator_certs: ["pyrometry_qualified L1"],
      // tus_last_date omitted
    });
    const result = (r as { result: { tus_overdue?: boolean } }).result;
    expect(result.tus_overdue).toBe(true);
    expect(r.verdict).toBe("denied");
  });

  it("audit overdue (last_audit_date > cycle_months ago) -> verdict denied + audit_overdue=true", async () => {
    const longAgo = new Date(Date.now() - 365 * 5 * 24 * 60 * 60 * 1000).toISOString();
    const r = await invokeHandler(devHandler, "npq_qualify", {
      ...CLEAN_NDT_INPUT,
      cycle_months: 24,
      last_audit_date: longAgo,
    });
    const result = (r as { result: { audit_overdue: boolean } }).result;
    expect(result.audit_overdue).toBe(true);
    expect(r.verdict).toBe("denied");
  });

  it("ROUTING PROOF — wire result.verdict equals engine-direct qualify().verdict", async () => {
    const r = await invokeHandler(devHandler, "npq_qualify", CLEAN_NDT_INPUT);
    const direct = nadcapProcessQualificationEngine.qualify(CLEAN_NDT_INPUT);
    const wireVerdict = (r as { result: { verdict: string } }).result.verdict;
    expect(wireVerdict).toBe(direct.verdict);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-NPQ — prism_dev :: npq_get_stats", () => {
  it("returns processes array of length 9 + reference string", async () => {
    const r = await invokeHandler(devHandler, "npq_get_stats", {});
    expect((r.process_count as number | undefined) ?? 0).toBe(9);
    const stats = (r as { stats: { processes: string[]; reference: string } }).stats;
    expect(stats.processes.length).toBe(9);
    expect(stats.reference.length).toBeGreaterThan(0);
    expect(stats.reference).toContain("AC7");  // Nadcap AC7xxx series
  });

  it("processes list includes all 9 Nadcap process types", async () => {
    const r = await invokeHandler(devHandler, "npq_get_stats", {});
    const procs = (r as { stats: { processes: string[] } }).stats.processes;
    const expected = [
      "heat_treat", "chemical_processing", "non_conventional_machining",
      "ndt", "surface_enhancement", "composites",
      "conventional_machining", "materials_testing", "fluids_distribution",
    ];
    for (const p of expected) {
      expect(procs).toContain(p);
    }
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-NPQ — error envelope", () => {
  it("npq_qualify without process → schema rejects", async () => {
    const r = await invokeHandler(devHandler, "npq_qualify", { line_items: [] });
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });

  it("npq_qualify with invalid process enum → schema rejects", async () => {
    const r = await invokeHandler(devHandler, "npq_qualify", {
      process: "INVALID_PROCESS", line_items: [],
    });
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });

  it("npq_qualify with > 500 line_items → schema rejects", async () => {
    const r = await invokeHandler(devHandler, "npq_qualify", {
      process: "heat_treat",
      line_items: new Array(999).fill({ ref: "x", description: "y", status: "compliant" }),
    });
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });
});
