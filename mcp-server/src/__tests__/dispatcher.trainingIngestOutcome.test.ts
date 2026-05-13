/**
 * dispatcher.trainingIngestOutcome.test.ts — round-trip integration for
 * TRAINING-LEARNING-MS0/U-TL-U6 dispatcher wiring.
 *
 * Drives the 3 outcome-ingest actions through their real dispatchers:
 *   - prism_turning:training_ingest_lathe_outcome
 *   - prism_cam:training_ingest_mill_outcome
 *   - prism_edm:training_ingest_wedm_outcome
 *
 * Each writes a record to an isolated tmp ledger and verifies the dispatcher
 * bridges engine's discriminated `{ok}` to dispatcher's `{success}`.
 *
 * @milestone TRAINING-LEARNING-MS0 / U-TL-U6
 */

import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { registerTurningDispatcher } from "../tools/dispatchers/turningDispatcher.js";
import { registerCamDispatcher } from "../tools/dispatchers/camDispatcher.js";
import { registerEdmDispatcher } from "../tools/dispatchers/edmDispatcher.js";

interface CapturedTool {
  name: string;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<unknown>;
}

function makeStubServer() {
  const tools: CapturedTool[] = [];
  return {
    tools,
    tool(name: string, _d: string, _s: unknown, h: CapturedTool["handler"]) {
      tools.push({ name, handler: h });
    },
  };
}

async function invoke(
  handler: CapturedTool["handler"],
  action: string,
  params: Record<string, unknown> = {},
): Promise<Record<string, unknown>> {
  const res = (await handler({ action, params })) as Record<string, unknown>;
  if (Array.isArray((res as { content?: unknown[] }).content)) {
    const arr = (res as { content: Array<{ text?: string }> }).content;
    return JSON.parse(arr[0]?.text ?? "{}") as Record<string, unknown>;
  }
  return res;
}

let turningHandler: CapturedTool["handler"];
let camHandler: CapturedTool["handler"];
let edmHandler: CapturedTool["handler"];

beforeAll(() => {
  const ts = makeStubServer();
  registerTurningDispatcher(ts as unknown as Parameters<typeof registerTurningDispatcher>[0]);
  const t = ts.tools.find((x) => x.name === "prism_turning");
  if (!t) throw new Error("prism_turning not registered");
  turningHandler = t.handler;

  const cs = makeStubServer();
  registerCamDispatcher(cs as unknown as Parameters<typeof registerCamDispatcher>[0]);
  const c = cs.tools.find((x) => x.name === "prism_cam");
  if (!c) throw new Error("prism_cam not registered");
  camHandler = c.handler;

  const es = makeStubServer();
  registerEdmDispatcher(es as unknown as Parameters<typeof registerEdmDispatcher>[0]);
  const e = es.tools.find((x) => x.name === "prism_edm");
  if (!e) throw new Error("prism_edm not registered");
  edmHandler = e.handler;
});

let tmp: string;
beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "prism-train-disp-"));
});

describe("prism_turning :: training_ingest_lathe_outcome", () => {
  it("happy path: writes record + returns success:true with seq=1", async () => {
    const r = await invoke(turningHandler, "training_ingest_lathe_outcome", {
      outcome_input: {
        job_id: "LATHE-JOB-001",
        family: "shaft",
        outcome: "success",
        customer: "ITW",
        material: "AISI 1045",
      },
      opts: { dir: tmp },
    });
    expect(r.success).toBe(true);
    const data = r.data as { record: { seq: number; domain: string; job_id: string }; ledger_size: number };
    expect(data.record.domain).toBe("lathe");
    expect(data.record.job_id).toBe("LATHE-JOB-001");
    expect(data.record.seq).toBe(1);
    expect(data.ledger_size).toBe(1);
    // Verify file written
    expect(fs.existsSync(path.join(tmp, "lathe-outcomes.jsonl"))).toBe(true);
  });

  it("flat-params fallback accepted (no `outcome_input` nesting)", async () => {
    const r = await invoke(turningHandler, "training_ingest_lathe_outcome", {
      job_id: "FLAT-1",
      family: "flange",
      outcome: "partial",
      opts: { dir: tmp },
    });
    expect(r.success).toBe(true);
    const data = r.data as { record: { job_id: string; family: string } };
    expect(data.record.job_id).toBe("FLAT-1");
    expect(data.record.family).toBe("flange");
  });

  it("missing job_id → success:false, error=missing_job_id at dispatcher level", async () => {
    const r = await invoke(turningHandler, "training_ingest_lathe_outcome", {
      outcome_input: { family: "shaft", outcome: "success" },
      opts: { dir: tmp },
    });
    expect(r.success).toBe(false);
    expect(r.error).toBe("missing_job_id");
  });

  it("invalid outcome → success:false, error=invalid_outcome", async () => {
    const r = await invoke(turningHandler, "training_ingest_lathe_outcome", {
      outcome_input: { job_id: "X", family: "shaft", outcome: "kinda" },
      opts: { dir: tmp },
    });
    expect(r.success).toBe(false);
    expect(r.error).toBe("invalid_outcome");
  });
});

describe("prism_cam :: training_ingest_mill_outcome", () => {
  it("happy path: writes mill ledger record", async () => {
    const r = await invoke(camHandler, "training_ingest_mill_outcome", {
      outcome_input: {
        job_id: "MILL-JOB-001",
        family: "plate",
        outcome: "success",
        customer: "Alcoa",
      },
      opts: { dir: tmp },
    });
    expect(r.success).toBe(true);
    const data = r.data as { record: { domain: string }; ledger: string };
    expect(data.record.domain).toBe("mill");
    expect(fs.existsSync(path.join(tmp, "mill-outcomes.jsonl"))).toBe(true);
    // Lathe ledger should NOT be written.
    expect(fs.existsSync(path.join(tmp, "lathe-outcomes.jsonl"))).toBe(false);
  });

  it("invalid scrap_rate → success:false, error=invalid_customer_actuals", async () => {
    const r = await invoke(camHandler, "training_ingest_mill_outcome", {
      outcome_input: {
        job_id: "BAD-SCRAP",
        family: "plate",
        outcome: "success",
        customer_actuals: { scrap_rate: 2.0 },
      },
      opts: { dir: tmp },
    });
    expect(r.success).toBe(false);
    expect(r.error).toBe("invalid_customer_actuals");
  });
});

describe("prism_edm :: training_ingest_wedm_outcome", () => {
  it("happy path: writes wedm ledger record", async () => {
    const r = await invoke(edmHandler, "training_ingest_wedm_outcome", {
      outcome_input: {
        job_id: "WEDM-JOB-001",
        family: "punch-die",
        outcome: "success",
        customer: "Holo-Krome",
        material: "D2 tool steel",
      },
      opts: { dir: tmp },
    });
    expect(r.success).toBe(true);
    const data = r.data as { record: { domain: string; family: string } };
    expect(data.record.domain).toBe("wedm");
    expect(data.record.family).toBe("punch-die");
    expect(fs.existsSync(path.join(tmp, "wedm-outcomes.jsonl"))).toBe(true);
  });

  it("missing family → success:false, error=missing_family", async () => {
    const r = await invoke(edmHandler, "training_ingest_wedm_outcome", {
      outcome_input: { job_id: "X", outcome: "success" },
      opts: { dir: tmp },
    });
    expect(r.success).toBe(false);
    expect(r.error).toBe("missing_family");
  });
});

describe("cross-domain isolation", () => {
  it("3 different domains write to 3 different ledger files", async () => {
    await invoke(turningHandler, "training_ingest_lathe_outcome", {
      job_id: "L1",
      family: "shaft",
      outcome: "success",
      opts: { dir: tmp },
    });
    await invoke(camHandler, "training_ingest_mill_outcome", {
      job_id: "M1",
      family: "plate",
      outcome: "success",
      opts: { dir: tmp },
    });
    await invoke(edmHandler, "training_ingest_wedm_outcome", {
      job_id: "W1",
      family: "punch-die",
      outcome: "success",
      opts: { dir: tmp },
    });
    expect(fs.existsSync(path.join(tmp, "lathe-outcomes.jsonl"))).toBe(true);
    expect(fs.existsSync(path.join(tmp, "mill-outcomes.jsonl"))).toBe(true);
    expect(fs.existsSync(path.join(tmp, "wedm-outcomes.jsonl"))).toBe(true);

    const latheCount = fs
      .readFileSync(path.join(tmp, "lathe-outcomes.jsonl"), "utf8")
      .split("\n")
      .filter((l) => l.trim()).length;
    const millCount = fs
      .readFileSync(path.join(tmp, "mill-outcomes.jsonl"), "utf8")
      .split("\n")
      .filter((l) => l.trim()).length;
    const wedmCount = fs
      .readFileSync(path.join(tmp, "wedm-outcomes.jsonl"), "utf8")
      .split("\n")
      .filter((l) => l.trim()).length;
    expect(latheCount).toBe(1);
    expect(millCount).toBe(1);
    expect(wedmCount).toBe(1);
  });
});
