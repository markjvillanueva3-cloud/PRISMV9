/**
 * Knowledge route adapter tests (FEATURE-AI-DASHBOARD-WIRE/U-KNOWLEDGE-ROUTER-MOUNT, slot:india).
 *
 * Verifies the /api/v1/knowledge/* router (web app's api/knowledge.ts contract):
 *  - every endpoint forwards to the CORRECT prism_knowledge (learn_*) action with the body
 *  - the {ok,data} envelope matches the sibling learning.ts contract
 *  - the fleet read normalizers map REAL engine fields to the frontend shape (no fabrication)
 *  - errors surface as HTTP 500 {ok:false}
 *  - the pure helpers (ingestActionFor + both normalizers) hit reference values + edge cases
 *
 * Mounts the router in isolation on a throwaway express app + a mocked callTool, so it
 * does not pull the full route tree (R9: tests verify intent, not a hardcoded constant).
 */
import express from "express";
import http from "node:http";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  createKnowledgeRouter,
  ingestActionFor,
  normalizeFleetStatus,
  normalizeFleetSummary,
} from "../routes/knowledge.js";

type CallRecord = { toolName: string; action: string; params?: Record<string, any> };

let server: http.Server;
let port = 0;
let calls: CallRecord[] = [];
let nextThrow = false;
let nextResolve: any = null;

// Real-shaped FleetDeploymentLearningEngine outputs (deployment-currency centric).
const FLEET_STATUS_RAW = {
  action: "fleet_status",
  machines: [{ serial: "VMC-01", model: "Haas VF-2" }, { serial: "VMC-02", model: "Okuma" }],
  latest_post_version: "v3.2",
  summary: { current: 5, update_available: 2, outdated: 1, custom: 1 },
  programs_registered: 42,
  standards_active: 7,
  feedback_entries: 18,
};
const FLEET_SUMMARY_RAW = {
  action: "fleet_summary",
  fleet: { total_machines: 9, current: 5, needing_update: 2, outdated: 1, custom: 1 },
  programs: { total: 42, by_tolerance_class: {}, by_physics_tier: {} },
  quality: {
    standards_active: 7,
    feedback_entries: 18,
    calibrated_machine_material_pairs: 4,
    prediction_confidence_avg: 0.83,
  },
  top_issues: ["VMC-02 post outdated"],
  recommendations: ["Update VMC-02 to v3.2"],
};

function httpRequest(method: string, urlPath: string, body?: Record<string, any>) {
  return new Promise<{ status: number; data: any }>((resolve, reject) => {
    const serialized = body ? JSON.stringify(body) : undefined;
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port,
        path: urlPath,
        method,
        headers: serialized
          ? { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(serialized) }
          : {},
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c: Buffer) => chunks.push(c));
        res.on("end", () => {
          const text = Buffer.concat(chunks).toString();
          try {
            resolve({ status: res.statusCode ?? 0, data: JSON.parse(text) });
          } catch {
            resolve({ status: res.statusCode ?? 0, data: text });
          }
        });
      },
    );
    req.on("error", reject);
    if (serialized) req.write(serialized);
    req.end();
  });
}

beforeAll(async () => {
  const app = express();
  app.use(express.json());
  const callTool = async (toolName: string, action: string, params?: Record<string, any>) => {
    calls.push({ toolName, action, params });
    if (nextThrow) throw new Error("dispatcher boom");
    if (nextResolve) return nextResolve;
    if (action === "learn_fleet_status") return FLEET_STATUS_RAW;
    if (action === "learn_fleet_summary") return FLEET_SUMMARY_RAW;
    return { echoed_action: action, echoed_params: params };
  };
  app.use("/api/v1/knowledge", createKnowledgeRouter(callTool));
  server = app.listen(0);
  await once(server, "listening");
  port = (server.address() as AddressInfo).port;
});

afterAll(() => {
  server?.close();
});

beforeEach(() => {
  calls = [];
  nextThrow = false;
  nextResolve = null;
});

describe("knowledge route -> dispatcher action mapping", () => {
  const cases: Array<[string, Record<string, any> | undefined, string]> = [
    ["/auto-tag", { text: "carbide endmill" }, "learn_auto_tag"],
    ["/search", { query: "feed rate" }, "learn_search_knowledge"],
    ["/stats", {}, "learn_get_stats"],
    ["/courses/catalog", {}, "learn_course_catalog"],
    ["/courses/build", { level: "beginner" }, "learn_course_build"],
    ["/courses/quiz", { count: 5 }, "learn_course_quiz"],
    ["/courses/pricing", {}, "learn_course_pricing"],
    ["/courses/export", { format: "json" }, "learn_course_export"],
    ["/fleet/similarity", { source: {}, target: {} }, "learn_transfer_similarity"],
    ["/fleet/record", { machine_id: "VMC-01" }, "learn_feedback_record"],
    ["/fleet/feedback", { machine_serial: "VMC-01" }, "learn_fleet_feedback"],
  ];
  for (const [path, body, action] of cases) {
    it(`POST ${path} -> prism_knowledge:${action} (passthrough)`, async () => {
      const res = await httpRequest("POST", `/api/v1/knowledge${path}`, body);
      expect(res.status).toBe(200);
      expect(res.data.ok).toBe(true);
      expect(calls).toHaveLength(1);
      expect(calls[0]).toMatchObject({ toolName: "prism_knowledge", action, params: body ?? {} });
      // passthrough routes return the raw engine result under data
      expect(res.data.data).toMatchObject({ echoed_action: action });
    });
  }

  it("POST /ingest dispatches by content_type", async () => {
    const map: Array<[string | undefined, string]> = [
      ["text", "learn_ingest_text"],
      ["url", "learn_ingest_url"],
      ["document", "learn_ingest_document"],
      ["video", "learn_ingest_video"],
      [undefined, "learn_ingest_text"],
    ];
    for (const [ct, action] of map) {
      calls = [];
      const body = ct ? { content_type: ct, content: "x" } : { content: "x" };
      const res = await httpRequest("POST", "/api/v1/knowledge/ingest", body);
      expect(res.status).toBe(200);
      expect(calls[0].action).toBe(action);
    }
  });
});

describe("fleet read normalization (real fields -> frontend shape)", () => {
  it("POST /fleet/status maps deployment currency to calibration-shaped summary", async () => {
    const res = await httpRequest("POST", "/api/v1/knowledge/fleet/status", {});
    expect(res.status).toBe(200);
    expect(calls[0].action).toBe("learn_fleet_status");
    const d = res.data.data;
    // total = current+update_available+outdated+custom = 5+2+1+1 = 9
    expect(d.summary.total).toBe(9);
    expect(d.summary.calibrated).toBe(5); // current
    expect(d.summary.drifting).toBe(3); // update_available + outdated
    expect(d.summary.uncalibrated).toBe(1); // custom
    expect(d.machines).toHaveLength(2); // real machines passed through
    expect(d.programs_registered).toBe(42);
    expect(d.standards_active).toBe(7);
  });

  it("POST /fleet/summary maps real fields + honest defaults (no fabrication)", async () => {
    const res = await httpRequest("POST", "/api/v1/knowledge/fleet/summary", {});
    expect(res.status).toBe(200);
    const d = res.data.data;
    expect(d.fleet.total_machines).toBe(9);
    expect(d.fleet.calibrated).toBe(5); // fleet.current
    expect(d.fleet.drifting).toBe(3); // needing_update + outdated = 2 + 1
    expect(d.programs.total).toBe(42);
    expect(d.programs.active).toBe(42); // honest default = total
    expect(d.quality.mean_accuracy).toBeCloseTo(0.83, 5); // prediction_confidence_avg
    expect(d.quality.worst_machine).toBe(""); // engine doesn't produce -> explicit empty
    expect(d.top_issues).toEqual(["VMC-02 post outdated"]);
    expect(d.recommendations).toEqual(["Update VMC-02 to v3.2"]);
  });
});

describe("error handling", () => {
  it("returns HTTP 500 {ok:false} when the dispatcher throws", async () => {
    nextThrow = true;
    const res = await httpRequest("POST", "/api/v1/knowledge/search", { query: "x" });
    expect(res.status).toBe(500);
    expect(res.data.ok).toBe(false);
    expect(res.data.error).toContain("dispatcher boom");
  });

  it("forwards a resolved {error} (real callTool catches dispatcher failures -> HTTP 200) under data", async () => {
    // Production callTool (src/index.ts) catches dispatcher/engine throws and RESOLVES
    // { error } at HTTP 200 (it does not re-throw). The adapter forwards that under data,
    // matching the sibling learning.ts contract -- documented here so the behavior is explicit.
    nextResolve = { error: "engine refused: bad input" };
    const res = await httpRequest("POST", "/api/v1/knowledge/search", { query: "x" });
    expect(res.status).toBe(200);
    expect(res.data.ok).toBe(true);
    expect(res.data.data).toEqual({ error: "engine refused: bad input" });
  });
});

describe("ingestActionFor (pure)", () => {
  it("maps each known content_type", () => {
    expect(ingestActionFor("text")).toBe("learn_ingest_text");
    expect(ingestActionFor("url")).toBe("learn_ingest_url");
    expect(ingestActionFor("document")).toBe("learn_ingest_document");
    expect(ingestActionFor("video")).toBe("learn_ingest_video");
  });
  it("is case-insensitive", () => {
    expect(ingestActionFor("URL")).toBe("learn_ingest_url");
    expect(ingestActionFor("Document")).toBe("learn_ingest_document");
  });
  it("defaults unknown/empty to text", () => {
    expect(ingestActionFor(undefined)).toBe("learn_ingest_text");
    expect(ingestActionFor("")).toBe("learn_ingest_text");
    expect(ingestActionFor("pdf")).toBe("learn_ingest_text");
  });
});

describe("normalizeFleetSummary (pure)", () => {
  it("computes reference values from a real summary", () => {
    const out = normalizeFleetSummary(FLEET_SUMMARY_RAW) as any;
    // toMatchObject: the mapped sub-object also preserves the engine's real fields
    expect(out.fleet).toMatchObject({ total_machines: 9, calibrated: 5, drifting: 3 });
    expect(out.quality.mean_accuracy).toBeCloseTo(0.83, 5);
    expect(out.programs.active).toBe(42);
    // real engine breakdown survives the merge-preserve (no data loss)
    expect(out.fleet.outdated).toBe(1);
    expect(out.quality.calibrated_machine_material_pairs).toBe(4);
  });
  it("empty input -> all zeros, no throw (edge)", () => {
    const out = normalizeFleetSummary({}) as any;
    expect(out.fleet).toEqual({ total_machines: 0, calibrated: 0, drifting: 0 });
    expect(out.programs).toEqual({ total: 0, active: 0 });
    expect(out.quality).toEqual({ mean_accuracy: 0, worst_machine: "" });
    expect(out.top_issues).toEqual([]);
    expect(out.recommendations).toEqual([]);
  });
  it("never fabricates worst_machine when absent (adversarial)", () => {
    const out = normalizeFleetSummary({ quality: { prediction_confidence_avg: 0.5 } }) as any;
    expect(out.quality.worst_machine).toBe("");
  });
  it("passes through a real worst_machine when the engine provides one", () => {
    const out = normalizeFleetSummary({ worst_machine: "VMC-03" }) as any;
    expect(out.quality.worst_machine).toBe("VMC-03");
  });
});

describe("normalizeFleetStatus (pure)", () => {
  it("computes reference values from a real status", () => {
    const out = normalizeFleetStatus(FLEET_STATUS_RAW) as any;
    expect(out.summary).toMatchObject({ total: 9, calibrated: 5, drifting: 3, uncalibrated: 1 });
    expect(out.machines).toHaveLength(2);
  });
  it("falls back total -> machines.length when summary missing (edge)", () => {
    const out = normalizeFleetStatus({ machines: [{ serial: "A" }, { serial: "B" }, { serial: "C" }] }) as any;
    expect(out.summary.total).toBe(3);
    expect(out.summary.calibrated).toBe(0);
  });
  it("empty input -> zeros, no throw (adversarial)", () => {
    const out = normalizeFleetStatus({}) as any;
    expect(out.summary.total).toBe(0);
    expect(out.machines).toEqual([]);
    expect(out.programs_registered).toBe(0);
  });
});
