/**
 * intelligenceDispatcher.xprocNeural.test.ts — U-XPROC-NEURAL-T1-02 dispatcher tests
 *
 * Round-trip tests for the 7 neural-engine actions:
 *   xproc_neural_train / predict / evaluate / save / load / metrics / reset
 *
 * Each test invokes through the dispatcher (not the engine singleton)
 * to verify the action enum + handler + return shape are wired
 * correctly end-to-end.
 *
 * @see src/engines/CrossProcessNeuralLearningEngine.ts
 * @see src/tools/dispatchers/intelligenceDispatcher.ts
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { registerIntelligenceDispatcher } from "../tools/dispatchers/intelligenceDispatcher.js";
import { crossProcessNeuralLearningEngine } from "../engines/CrossProcessNeuralLearningEngine.js";
import type { OutcomeRecord } from "../engines/CrossProcessOutcomeStore.js";

const TEST_SEED = 21001;

interface CapturedTool {
  name: string;
  description: string;
  schema: unknown;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<{
    content: Array<{ type: string; text: string }>;
  }>;
}

function makeStubServer() {
  const captured: CapturedTool[] = [];
  return {
    tools: captured,
    tool(
      name: string,
      description: string,
      schema: unknown,
      handler: CapturedTool["handler"],
    ) {
      captured.push({ name, description, schema, handler });
    },
  };
}

let handler: CapturedTool["handler"];

async function invoke(
  action: string,
  params: Record<string, unknown> = {},
): Promise<Record<string, unknown>> {
  const res = (await handler({ action, params })) as Record<string, unknown>;
  if (!res.content) return res;
  const content = res.content as Array<{ text?: string }>;
  const text = content[0]?.text ?? "";
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { __raw: text } as Record<string, unknown>;
  }
}

function rec(partial: {
  bridge?: OutcomeRecord["bridge"];
  process?: OutcomeRecord["process"];
  outcome?: OutcomeRecord["outcome"];
  request?: OutcomeRecord["request_summary"];
  id?: string;
}): OutcomeRecord {
  return {
    schemaVersion: "1.0",
    id: partial.id ?? "evt-test",
    ts: "2026-05-05T18:00:00.000Z",
    bridge: partial.bridge ?? "sf",
    process: partial.process ?? "mill",
    request_summary: partial.request ?? {},
    response_summary: {},
    outcome: partial.outcome ?? { kind: "pending" },
  };
}

beforeAll(() => {
  const server = makeStubServer();
  registerIntelligenceDispatcher(
    server as unknown as Parameters<typeof registerIntelligenceDispatcher>[0],
  );
  const tool = server.tools.find((t) => t.name === "prism_intelligence");
  if (!tool) throw new Error("prism_intelligence tool not registered");
  handler = tool.handler;
});

describe("intelligenceDispatcher xproc_neural_* (U-XPROC-NEURAL-T1-02)", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "neural-disp-"));
    crossProcessNeuralLearningEngine.reset(TEST_SEED);
  });

  afterEach(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      /* best-effort */
    }
    crossProcessNeuralLearningEngine.reset(TEST_SEED);
  });

  it("xproc_neural_metrics returns metrics + config envelope", async () => {
    const body = await invoke("xproc_neural_metrics");
    expect(body.success).toBe(true);
    const metrics = body.metrics as Record<string, number>;
    expect(metrics.totalSamplesSeen).toBe(0);
    expect(metrics.totalEpochsRun).toBe(0);
    const config = body.config as Record<string, number>;
    expect(config.seed).toBe(TEST_SEED);
  });

  it("xproc_neural_train with empty records returns samplesUsed=0 graceful no-op", async () => {
    const body = await invoke("xproc_neural_train", { records: [] });
    expect(body.success).toBe(true);
    expect(body.samplesUsed).toBe(0);
    expect(body.epochsRun).toBe(0);
  });

  it("xproc_neural_train trains and reports samplesUsed/finalLoss <= initialLoss", async () => {
    const records: OutcomeRecord[] = [];
    const PER_CLASS = 6;
    for (let i = 0; i < PER_CLASS; i++) {
      records.push(rec({ id: `s${i}`, process: "mill", outcome: { kind: "success" } }));
      records.push(rec({ id: `f${i}`, process: "lathe", outcome: { kind: "failure" } }));
      records.push(rec({ id: `o${i}`, process: "wedm", outcome: { kind: "operator_override" } }));
    }
    const body = await invoke("xproc_neural_train", {
      records,
      opts: { epochs: 5, shuffle: false },
    });
    expect(body.success).toBe(true);
    expect(body.samplesUsed).toBe(records.length);
    expect(body.epochsRun).toBe(5);
    const finalLoss = body.finalLoss as number;
    const initialLoss = body.initialLoss as number;
    expect(finalLoss).toBeLessThanOrEqual(initialLoss);
  });

  it("xproc_neural_predict returns probs+predictedClass+confidence", async () => {
    const body = await invoke("xproc_neural_predict", {
      record: rec({ process: "mill", bridge: "sf" }),
    });
    expect(body.success).toBe(true);
    const probs = body.probs as { success: number; failure: number; operator_override: number };
    const sum = probs.success + probs.failure + probs.operator_override;
    expect(sum).toBeCloseTo(1, 9);
    expect(["success", "failure", "operator_override"]).toContain(body.predictedClass);
    const conf = body.confidence as number;
    expect(conf).toBeGreaterThanOrEqual(0);
    expect(conf).toBeLessThanOrEqual(1);
  });

  it("xproc_neural_predict without record returns dispatcher error", async () => {
    const body = await invoke("xproc_neural_predict", {});
    expect(body.success).toBe(false);
    expect(String(body.error ?? "")).toContain("requires `record`");
  });

  it("xproc_neural_evaluate returns total/accuracy/confusion/loss with pending excluded", async () => {
    const records = [
      rec({ id: "a", process: "mill", outcome: { kind: "success" } }),
      rec({ id: "b", process: "lathe", outcome: { kind: "failure" } }),
      rec({ id: "c", outcome: { kind: "pending" } }),
    ];
    const body = await invoke("xproc_neural_evaluate", { records });
    expect(body.success).toBe(true);
    expect(body.total).toBe(2);
    const conf = body.confusion as number[][];
    expect(conf.length).toBe(3);
    expect(conf[0].length).toBe(3);
    let sum = 0;
    for (const row of conf) for (const v of row) sum += v;
    expect(sum).toBe(2);
  });

  it("xproc_neural_save + xproc_neural_load round-trips weights via filesystem", async () => {
    await invoke("xproc_neural_train", {
      records: [
        rec({ id: "1", process: "mill", outcome: { kind: "success" } }),
        rec({ id: "2", process: "lathe", outcome: { kind: "failure" } }),
        rec({ id: "3", process: "wedm", outcome: { kind: "operator_override" } }),
      ],
      opts: { epochs: 5, shuffle: false },
    });

    const filePath = path.join(tmpDir, "weights.json");
    const saveBody = await invoke("xproc_neural_save", { path: filePath });
    expect(saveBody.success).toBe(true);
    expect(saveBody.path).toBe(filePath);
    expect(fs.existsSync(filePath)).toBe(true);

    const loadBody = await invoke("xproc_neural_load", { path: filePath });
    expect(loadBody.success).toBe(true);
    const metrics = loadBody.metrics as Record<string, number>;
    expect(metrics.totalEpochsRun).toBe(5);
  });

  it("xproc_neural_save without path returns dispatcher error", async () => {
    const body = await invoke("xproc_neural_save", {});
    expect(body.success).toBe(false);
    expect(String(body.error ?? "")).toContain("requires `path`");
  });

  it("xproc_neural_load without path returns dispatcher error", async () => {
    const body = await invoke("xproc_neural_load", {});
    expect(body.success).toBe(false);
    expect(String(body.error ?? "")).toContain("requires `path`");
  });

  it("xproc_neural_reset resets seed and zeroes metrics", async () => {
    await invoke("xproc_neural_train", {
      records: [
        rec({ id: "1", process: "mill", outcome: { kind: "success" } }),
        rec({ id: "2", process: "lathe", outcome: { kind: "failure" } }),
      ],
      opts: { epochs: 2 },
    });
    const beforeMetrics = await invoke("xproc_neural_metrics");
    expect((beforeMetrics.metrics as Record<string, number>).totalEpochsRun).toBe(2);

    const NEW_SEED = 7777;
    const resetBody = await invoke("xproc_neural_reset", { seed: NEW_SEED });
    expect(resetBody.success).toBe(true);
    expect(resetBody.seed).toBe(NEW_SEED);

    const afterMetrics = await invoke("xproc_neural_metrics");
    expect((afterMetrics.metrics as Record<string, number>).totalEpochsRun).toBe(0);
    expect((afterMetrics.config as Record<string, number>).seed).toBe(NEW_SEED);
  });

  it("E2E pipeline: train → save → reset → load (history preserved on disk)", async () => {
    const data: OutcomeRecord[] = [];
    const PER_CLASS = 10;
    for (let i = 0; i < PER_CLASS; i++) {
      data.push(rec({ id: `s${i}`, process: "mill", outcome: { kind: "success" } }));
      data.push(rec({ id: `f${i}`, process: "lathe", outcome: { kind: "failure" } }));
      data.push(rec({ id: `o${i}`, process: "wedm", outcome: { kind: "operator_override" } }));
    }
    const TRAIN_EPOCHS = 30;
    await invoke("xproc_neural_train", {
      records: data,
      opts: { epochs: TRAIN_EPOCHS, shuffle: false },
    });

    const filePath = path.join(tmpDir, "e2e-weights.json");
    await invoke("xproc_neural_save", { path: filePath });

    // Reset the in-memory singleton
    await invoke("xproc_neural_reset", {});
    const postReset = await invoke("xproc_neural_metrics");
    expect((postReset.metrics as Record<string, number>).totalEpochsRun).toBe(0);

    // Load the trained weights — verify the persisted history is intact.
    const loaded = await invoke("xproc_neural_load", { path: filePath });
    expect(loaded.success).toBe(true);
    expect((loaded.metrics as Record<string, number>).totalEpochsRun).toBe(TRAIN_EPOCHS);
  });

  it("dispatcher exposes all 7 xproc_neural_* actions in the action enum", async () => {
    // Pinging each with the minimum valid payload should not return an "unknown action" error.
    const actions = [
      ["xproc_neural_metrics", {}],
      ["xproc_neural_train", { records: [] }],
      ["xproc_neural_evaluate", { records: [] }],
      ["xproc_neural_reset", {}],
    ] as const;
    for (const [action, params] of actions) {
      const body = await invoke(action, params);
      // Either success OR a domain-level error — but never "unknown action".
      const errStr = String(body.error ?? "");
      expect(errStr.toLowerCase()).not.toContain("unknown action");
      expect(errStr.toLowerCase()).not.toContain("not in [");
    }
  });
});
