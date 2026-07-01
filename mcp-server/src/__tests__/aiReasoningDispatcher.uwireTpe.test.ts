/**
 * aiReasoningDispatcher U-WIRE-TPE round-trip tests — TPEHyperparameterSearchEngine.
 *
 * Validates the 9 new actions (tpe_suggest / tpe_tell / tpe_best_trial /
 * tpe_list_trials / tpe_get_config / tpe_is_exhausted / tpe_snapshot /
 * tpe_load_snapshot / tpe_clear) wire through prism_ai and that the Optuna-style
 * ask-tell hyperparameter search behaves per contract: suggest a candidate,
 * report (tell) its loss, repeat to the 8-trial budget, then suggest returns
 * null; best_trial returns the min-loss trial; snapshot/load round-trips state.
 *
 * Pattern: LIVE dispatcher round-trip. prism_ai wraps results as
 * JSON.stringify({success, data: slimResponse(result)}); engine payload nests
 * under `.data`; slimResponse strips null/empty but keeps false/0 (assert null
 * suggestion/best via ?? null, empty trials via ?? []). The engine is a module
 * singleton with a SEEDED PRNG -> clearAll() (called in beforeEach) re-seeds for
 * determinism. tell() throws on a non-finite loss / out-of-order trial_id /
 * invalid sample. Tests reuse the engine's own suggested sample for tell so the
 * sample is always contract-valid and trial_id stays in order.
 *
 * Wired slot:papa 2026-06-15 -- WIRE-UNWIRED-PAPA autonomous loop iteration 7.
 *
 * @milestone WIRE-UNWIRED-PAPA
 * @unit U-WIRE-TPE
 */

import { describe, it, expect, beforeEach } from "vitest";
import { registerAIReasoningDispatcher } from "../tools/dispatchers/aiReasoningDispatcher.js";
import { tpeHyperparameterSearchEngine } from "../engines/TPEHyperparameterSearchEngine.js";

interface CapturedTool {
  name: string; description: string; schema: unknown;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<unknown>;
}
class MockMCPServer {
  tools: CapturedTool[] = [];
  tool(name: string, description: string, schema: unknown, handler: CapturedTool["handler"]) {
    this.tools.push({ name, description, schema, handler });
  }
}
async function call(server: MockMCPServer, action: string, params: Record<string, unknown> = {}): Promise<{ ok: boolean; data: Record<string, unknown> }> {
  const tool = server.tools[0]!;
  const raw = (await tool.handler({ action, params })) as { content: { type: string; text: string }[] };
  const text = raw.content[0]!.text;
  let parsed: Record<string, unknown>;
  try { parsed = JSON.parse(text); } catch { return { ok: false, data: { rawText: text } }; }
  if (parsed && typeof parsed === "object" && "success" in parsed) {
    if ((parsed as { success: boolean }).success === false) return { ok: false, data: parsed };
    return { ok: true, data: ((parsed as { data?: Record<string, unknown> }).data ?? {}) };
  }
  return { ok: false, data: parsed };
}
function newServer(): MockMCPServer {
  const s = new MockMCPServer();
  registerAIReasoningDispatcher(s as unknown as { tool: Function });
  return s;
}
// Suggest a candidate, then report it with the given loss (advances the search).
async function suggestThenTell(s: MockMCPServer, loss: number, completed_at = 1) {
  const sg = await call(s, "tpe_suggest");
  const sugg = sg.data.suggestion as { trial_id: number; sample: unknown; source: string };
  return call(s, "tpe_tell", { ...sugg, loss, elapsed_ms: 10, completed_at });
}

describe("U-WIRE-TPE — TPEHyperparameterSearchEngine via prism_ai", () => {
  beforeEach(() => { tpeHyperparameterSearchEngine.clearAll(); });

  it("registers exactly one prism_ai tool", () => {
    expect(newServer().tools).toHaveLength(1);
    expect(newServer().tools[0]!.name).toBe("prism_ai");
  });

  it("tpe_suggest first -> warmup trial 0 with a contract-valid sample", async () => {
    const s = newServer();
    const r = await call(s, "tpe_suggest");
    expect(r.ok).toBe(true);
    const sugg = r.data.suggestion as { trial_id: number; source: string; sample: { rank: number; alpha: number } };
    expect(sugg.trial_id).toBe(0);
    expect(sugg.source).toBe("warmup");
    expect([8, 16, 32, 64]).toContain(sugg.sample.rank);
    expect([sugg.sample.rank, 2 * sugg.sample.rank]).toContain(sugg.sample.alpha);
  });

  it("tpe_get_config -> default budget/warmup/seed", async () => {
    const s = newServer();
    const r = await call(s, "tpe_get_config");
    expect(r.ok).toBe(true);
    expect(r.data.total_budget).toBe(8);
    expect(r.data.warmup_trials).toBe(2);
    expect(r.data.seed).toBe(1337);
  });

  it("tpe_is_exhausted false on a fresh search (false survives slimming)", async () => {
    const s = newServer();
    const r = await call(s, "tpe_is_exhausted");
    expect(r.ok).toBe(true);
    expect(r.data.exhausted).toBe(false);
  });

  it("tpe_tell after suggest -> recorded TrialRecord", async () => {
    const s = newServer();
    const r = await suggestThenTell(s, 0.5);
    expect(r.ok).toBe(true);
    expect(r.data.trial_id).toBe(0);
    expect(r.data.loss).toBe(0.5);
  });

  it("full ask-tell loop exhausts the 8-trial budget -> suggest null + is_exhausted", async () => {
    const s = newServer();
    for (let i = 0; i < 8; i++) await suggestThenTell(s, 0.5 - i * 0.01, i + 1);
    const sg = await call(s, "tpe_suggest");
    expect(sg.ok).toBe(true);
    expect(sg.data.suggestion ?? null).toBe(null);
    const ex = await call(s, "tpe_is_exhausted");
    expect(ex.data.exhausted).toBe(true);
  });

  it("tpe_tell with an out-of-order trial_id -> error (engine throws, failure mode)", async () => {
    const s = newServer();
    const sg = await call(s, "tpe_suggest");
    const sugg = sg.data.suggestion as { sample: unknown; source: string };
    const r = await call(s, "tpe_tell", { trial_id: 5, sample: sugg.sample, loss: 0.1, elapsed_ms: 1, completed_at: 1, source: sugg.source });
    expect(r.ok).toBe(false);
  });

  it("tpe_tell missing loss -> error (schema, failure mode)", async () => {
    const s = newServer();
    const sg = await call(s, "tpe_suggest");
    const sugg = sg.data.suggestion as { trial_id: number; sample: unknown; source: string };
    const r = await call(s, "tpe_tell", { trial_id: sugg.trial_id, sample: sugg.sample, elapsed_ms: 1, completed_at: 1, source: sugg.source });
    expect(r.ok).toBe(false);
  });

  it("tpe_tell with an invalid sample (alpha != rank|2*rank) -> error (engine throws)", async () => {
    const s = newServer();
    const sg = await call(s, "tpe_suggest");
    const sugg = sg.data.suggestion as { trial_id: number; sample: Record<string, unknown>; source: string };
    const r = await call(s, "tpe_tell", {
      trial_id: sugg.trial_id, sample: { ...sugg.sample, alpha: 999 }, loss: 0.1, elapsed_ms: 1, completed_at: 1, source: sugg.source,
    });
    expect(r.ok).toBe(false);
  });

  it("tpe_tell with a non-finite loss -> error (engine throws)", async () => {
    const s = newServer();
    const sg = await call(s, "tpe_suggest");
    const sugg = sg.data.suggestion as { trial_id: number; sample: unknown; source: string };
    const r = await call(s, "tpe_tell", {
      trial_id: sugg.trial_id, sample: sugg.sample, loss: Number.POSITIVE_INFINITY, elapsed_ms: 1, completed_at: 1, source: sugg.source,
    });
    expect(r.ok).toBe(false);
  });

  it("tpe_best_trial returns the minimum-loss trial", async () => {
    const s = newServer();
    await suggestThenTell(s, 0.5, 1);
    await suggestThenTell(s, 0.2, 2); // min
    await suggestThenTell(s, 0.8, 3);
    const r = await call(s, "tpe_best_trial");
    expect(r.ok).toBe(true);
    expect((r.data.best as { loss: number }).loss).toBe(0.2);
  });

  it("tpe_best_trial on an empty search -> null (?? null)", async () => {
    const s = newServer();
    const r = await call(s, "tpe_best_trial");
    expect(r.ok).toBe(true);
    expect(r.data.best ?? null).toBe(null);
  });

  it("tpe_list_trials reflects reported trials", async () => {
    const s = newServer();
    await suggestThenTell(s, 0.5, 1);
    await suggestThenTell(s, 0.3, 2);
    const r = await call(s, "tpe_list_trials");
    expect(r.ok).toBe(true);
    expect((r.data.trials as unknown[]).length).toBe(2);
  });

  it("tpe_snapshot -> versioned snapshot with config + trials", async () => {
    const s = newServer();
    await suggestThenTell(s, 0.5, 1);
    const r = await call(s, "tpe_snapshot");
    expect(r.ok).toBe(true);
    expect(r.data.schemaVersion).toBe(1);
    expect((r.data.config as { total_budget: number }).total_budget).toBe(8);
    expect((r.data.trials as unknown[]).length).toBe(1);
  });

  it("tpe_snapshot -> clear -> load round-trips trials + best", async () => {
    const s = newServer();
    await suggestThenTell(s, 0.5, 1);
    await suggestThenTell(s, 0.2, 2);
    await suggestThenTell(s, 0.8, 3);
    const snap = (await call(s, "tpe_snapshot")).data;
    await call(s, "tpe_clear");
    expect(((await call(s, "tpe_list_trials")).data.trials ?? []) as unknown[]).toHaveLength(0);
    const loaded = await call(s, "tpe_load_snapshot", { snapshot: snap });
    expect(loaded.ok).toBe(true);
    expect(loaded.data.trial_count).toBe(3);
    expect(((await call(s, "tpe_list_trials")).data.trials as unknown[]).length).toBe(3);
    expect(((await call(s, "tpe_best_trial")).data.best as { loss: number }).loss).toBe(0.2);
  });

  it("tpe_clear resets the search (suggest restarts at trial 0)", async () => {
    const s = newServer();
    await suggestThenTell(s, 0.5, 1);
    const c = await call(s, "tpe_clear");
    expect(c.ok).toBe(true);
    expect(c.data.cleared).toBe(true);
    const sg = await call(s, "tpe_suggest");
    expect((sg.data.suggestion as { trial_id: number }).trial_id).toBe(0);
  });

  it("tpe_suggest after warmup -> source 'tpe'", async () => {
    const s = newServer();
    await suggestThenTell(s, 0.5, 1); // warmup trial 0
    await suggestThenTell(s, 0.3, 2); // warmup trial 1
    const r = await call(s, "tpe_suggest"); // trial 2 -> TPE phase
    expect(r.ok).toBe(true);
    expect((r.data.suggestion as { source: string }).source).toBe("tpe");
  });

  it("tpe_load_snapshot with an unsupported schemaVersion -> error (engine throws)", async () => {
    const s = newServer();
    const r = await call(s, "tpe_load_snapshot", {
      snapshot: {
        schemaVersion: 2,
        config: { total_budget: 8, warmup_trials: 2, gamma_split: 0.25, candidates_per_tpe_step: 24, seed: 1337 },
        trials: [],
      },
    });
    expect(r.ok).toBe(false);
  });
});
