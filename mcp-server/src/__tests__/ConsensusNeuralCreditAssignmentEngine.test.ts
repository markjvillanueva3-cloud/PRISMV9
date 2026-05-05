/**
 * ConsensusNeuralCreditAssignmentEngine — INTEL-OLLAMA-OBSIDIAN-MS0 / U-NEURAL-CREDIT-ASSIGN.
 *
 * Verifies the engine that closes the multi-model consensus learning loop:
 * per-model credit math, online apply-from-result, batch apply-from-feed,
 * cursor idempotency, fail-open paths, and adversarial inputs.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  ConsensusNeuralCreditAssignmentEngine,
  type ApplyFromResultInput,
} from "../engines/ConsensusNeuralCreditAssignmentEngine.js";
import type { ConsensusResultLike, NeuralFeedDatum } from "../engines/ConsensusNeuralFeedbackEngine.js";

function tmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "prism-credit-"));
}

function makeResult(overrides: Partial<ConsensusResultLike> = {}): ConsensusResultLike {
  return {
    ok: true,
    mode: "compare",
    responses: [
      { model: "claude-opus-4-7", vendor: "anthropic", ok: true, answer: "42", latencyMs: 1200, tokens: 50, error: null },
      { model: "gpt-5.5",         vendor: "openai",    ok: true, answer: "42", latencyMs: 1500, tokens: 60, error: null },
      { model: "gemini-3-pro",    vendor: "google",    ok: true, answer: "42", latencyMs: 1100, tokens: 55, error: null },
      { model: "deepseek-r1:14b", vendor: "ollama",    ok: true, answer: "41", latencyMs: 800,  tokens: 70, error: null },
    ],
    successCount: 4,
    agreementScore: 0.75,
    consensus: { answer: "42", voters: ["claude-opus-4-7", "gpt-5.5", "gemini-3-pro"], confidence: 0.75 },
    recommendation: "accept",
    totalLatencyMs: 1500,
    factCheck: {},
    ...overrides,
  };
}

function makeDatum(overrides: Partial<NeuralFeedDatum> = {}): NeuralFeedDatum {
  return {
    schema_version: "1.0.0",
    ts: "2026-05-05T15:00:00.000Z",
    prompt_hash: "abc",
    prompt: "what is 6*7",
    task_type: "decide",
    source_session: "test",
    recommendation: "accept",
    agreement_score: 0.8,
    total_latency_ms: 1500,
    reward: 0.6,
    reward_components: { rec_score: 1.0, agree_score: 0.8, fact_score: 1.0, latency_penalty: 0.75 },
    models: [
      { model: "claude-opus-4-7", vendor: "anthropic", ok: true, latency_ms: 1200, tokens: 50, factuality_score: 1.0, hallucination_count: 0, in_consensus_voters: true,  answer_chars: 2 },
      { model: "gpt-5.5",         vendor: "openai",    ok: true, latency_ms: 1500, tokens: 60, factuality_score: 1.0, hallucination_count: 0, in_consensus_voters: true,  answer_chars: 2 },
      { model: "deepseek-r1:14b", vendor: "ollama",    ok: true, latency_ms: 800,  tokens: 70, factuality_score: null, hallucination_count: 0, in_consensus_voters: false, answer_chars: 2 },
    ],
    ...overrides,
  };
}

describe("ConsensusNeuralCreditAssignmentEngine", () => {
  let dir: string;
  let perfPath: string;
  let cursorPath: string;
  let feedPath: string;
  let engine: ConsensusNeuralCreditAssignmentEngine;

  beforeEach(() => {
    dir = tmpDir();
    perfPath = path.join(dir, "perf.json");
    cursorPath = path.join(dir, "cursor.json");
    feedPath = path.join(dir, "feed.jsonl");
    engine = new ConsensusNeuralCreditAssignmentEngine();
  });

  afterEach(() => {
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* ignore */ }
  });

  // ---- computeCredit pure math ----

  it("computeCredit assigns full voter bonus to consensus voters and half to dissenters", () => {
    const result = makeResult();
    const credits = engine.computeCredit(result, 1.0);
    expect(credits).toHaveLength(4);
    const claude = credits.find((c) => c.model === "claude-opus-4-7")!;
    const ollama = credits.find((c) => c.model === "deepseek-r1:14b")!;
    expect(claude.voterBonus).toBe(1.0);
    expect(claude.credit).toBe(1.0);
    expect(ollama.voterBonus).toBe(0.5);
    expect(ollama.credit).toBe(0.5);
  });

  it("computeCredit zeroes credit for failed models even when they voted", () => {
    const result = makeResult({
      responses: [
        { model: "claude-opus-4-7", vendor: "anthropic", ok: false, answer: "",  latencyMs: 9999, tokens: null, error: "timeout" },
        { model: "gpt-5.5",         vendor: "openai",    ok: true,  answer: "42", latencyMs: 1500, tokens: 60,   error: null },
      ],
      successCount: 1,
      agreementScore: 1.0,
      consensus: { answer: "42", voters: ["claude-opus-4-7", "gpt-5.5"], confidence: 1.0 },
      totalLatencyMs: 9999,
    });
    const credits = engine.computeCredit(result, 1.0);
    const claude = credits.find((c) => c.vendor === "anthropic")!;
    const openai = credits.find((c) => c.vendor === "openai")!;
    expect(claude.failed).toBe(true);
    expect(claude.credit).toBe(0);
    expect(openai.credit).toBe(1.0);
  });

  it("computeCredit applies factuality penalty when factCheck has scores", () => {
    const result = makeResult({
      factCheck: {
        "claude-opus-4-7": { totalMentions: 4, verifiedMentions: 3, factualityScore: 0.75, hallucinations: [] },
        "gpt-5.5":         { totalMentions: 4, verifiedMentions: 4, factualityScore: 1.0,  hallucinations: [] },
      },
    });
    const credits = engine.computeCredit(result, 1.0);
    const claude = credits.find((c) => c.model === "claude-opus-4-7")!;
    const gpt = credits.find((c) => c.model === "gpt-5.5")!;
    expect(claude.factFactor).toBe(0.75);
    expect(claude.credit).toBe(0.75);
    expect(gpt.factFactor).toBe(1.0);
    expect(gpt.credit).toBe(1.0);
  });

  it("computeCredit treats empty factCheck as factor=1.0 (no penalty when no signal)", () => {
    const result = makeResult({ factCheck: {} });
    const credits = engine.computeCredit(result, 0.6);
    for (const c of credits) {
      expect(c.factFactor).toBe(1.0);
    }
  });

  it("computeCredit clamps NaN to 0 (no signal) and Infinity to 1 (clamp-to-max)", () => {
    const result = makeResult();
    // NaN reward → all models get 0 (fail-closed on no signal)
    const nanCredits = engine.computeCredit(result, NaN);
    for (const c of nanCredits) expect(c.credit).toBe(0);
    // Infinity reward → standard clamp-to-1, voter bonus still applied
    const infCredits = engine.computeCredit(result, Infinity);
    const voter = infCredits.find((c) => c.model === "claude-opus-4-7")!;
    const dissenter = infCredits.find((c) => c.model === "deepseek-r1:14b")!;
    expect(voter.credit).toBe(1.0);     // 1 * 1.0 (voter) * 1.0 (no fact) * 1 (ok) = 1
    expect(dissenter.credit).toBe(0.5); // 1 * 0.5 (non-voter) * 1.0 * 1 = 0.5
  });

  it("computeCredit returns empty array for malformed input", () => {
    expect(engine.computeCredit(null as never, 1)).toEqual([]);
    expect(engine.computeCredit({} as never, 1)).toEqual([]);
    expect(engine.computeCredit({ responses: "not array" } as never, 1)).toEqual([]);
  });

  // ---- applyFromResult online path ----

  it("applyFromResult moves vendor EMAs from cold-start (0.5) toward observed credit", () => {
    const result = makeResult({ recommendation: "accept", agreementScore: 1.0, totalLatencyMs: 0, factCheck: {} });
    const out = engine.applyFromResult({ result, taskType: "decide", perfStatePath: perfPath });
    expect(out.ok).toBe(true);
    expect(out.applied).toBe(4);
    expect(out.persisted).toBe(true);

    const claudeDiff = out.diffs.find((d) => d.vendor === "anthropic")!;
    expect(claudeDiff.emaBefore).toBe(0.5);
    // Cold-start: nBefore=0 means newEma = reward (1.0), not blended.
    expect(claudeDiff.emaAfter).toBe(1.0);
    expect(claudeDiff.nBefore).toBe(0);

    const ollamaDiff = out.diffs.find((d) => d.vendor === "ollama")!;
    expect(ollamaDiff.emaAfter).toBe(0.5); // half-credit on cold-start
  });

  it("applyFromResult persists state to disk and is reloadable", () => {
    const result = makeResult({ recommendation: "accept", agreementScore: 1.0, totalLatencyMs: 0 });
    const out = engine.applyFromResult({ result, taskType: "review", perfStatePath: perfPath });
    expect(out.persisted).toBe(true);
    expect(fs.existsSync(perfPath)).toBe(true);
    const reload = JSON.parse(fs.readFileSync(perfPath, "utf-8"));
    expect(reload.vendors.anthropic.tasks.review.n).toBe(1);
    expect(reload.vendors.anthropic.tasks.review.ema).toBe(1.0);
  });

  it("applyFromResult with persist=false computes diffs but does not write state", () => {
    const result = makeResult();
    const out = engine.applyFromResult({ result, taskType: "decide", perfStatePath: perfPath, persist: false });
    expect(out.ok).toBe(true);
    expect(out.diffs.length).toBe(4);
    expect(out.persisted).toBe(false);
    expect(fs.existsSync(perfPath)).toBe(false);
  });

  it("applyFromResult on escalate run produces lower credits than accept run", () => {
    const acceptOut = engine.applyFromResult({
      result: makeResult({ recommendation: "accept", agreementScore: 1.0, totalLatencyMs: 0 }),
      taskType: "build",
      perfStatePath: perfPath,
      persist: false,
    });
    const escalateOut = engine.applyFromResult({
      result: makeResult({ recommendation: "escalate", agreementScore: 0.25, totalLatencyMs: 0 }),
      taskType: "build",
      perfStatePath: perfPath,
      persist: false,
    });
    const claudeAccept = acceptOut.diffs.find((d) => d.vendor === "anthropic")!.emaAfter;
    const claudeEsc = escalateOut.diffs.find((d) => d.vendor === "anthropic")!.emaAfter;
    expect(claudeAccept).toBeGreaterThan(claudeEsc);
    // escalate: rec=0.1, agree=0.25, fact=1, latency=1 → reward=0.025
    expect(claudeEsc).toBeCloseTo(0.025, 3);
  });

  it("applyFromResult rejects null input gracefully", () => {
    const out = engine.applyFromResult({ } as ApplyFromResultInput);
    expect(out.ok).toBe(false);
    expect(out.error).toMatch(/result required/);
  });

  it("applyFromResult repeated calls converge EMA via alpha smoothing", () => {
    const result = makeResult({ recommendation: "accept", agreementScore: 1.0, totalLatencyMs: 0 });
    // First call: cold-start, ema becomes 1.0
    engine.applyFromResult({ result, taskType: "decide", perfStatePath: perfPath });
    // Second call with worse run: alpha=0.2, prev=1.0, reward=0.5 → ema = 0.2*0.5 + 0.8*1.0 = 0.9
    const halfReward = makeResult({
      recommendation: "review", // 0.5
      agreementScore: 1.0,
      totalLatencyMs: 0,
      consensus: { answer: "42", voters: ["claude-opus-4-7", "gpt-5.5", "gemini-3-pro"], confidence: 1.0 },
    });
    const out2 = engine.applyFromResult({ result: halfReward, taskType: "decide", perfStatePath: perfPath });
    const claudeDiff = out2.diffs.find((d) => d.vendor === "anthropic")!;
    expect(claudeDiff.nBefore).toBe(1);
    expect(claudeDiff.emaBefore).toBe(1.0);
    expect(claudeDiff.emaAfter).toBeCloseTo(0.9, 3);
  });

  // ---- applyFromFeed batch path ----

  it("applyFromFeed returns ok=true with processed=0 when feed file missing", () => {
    const out = engine.applyFromFeed({ feedPath, cursorPath, perfStatePath: perfPath });
    expect(out.ok).toBe(true);
    expect(out.processed).toBe(0);
  });

  it("applyFromFeed processes JSONL lines and updates per-vendor totals", () => {
    const datum1 = makeDatum({ ts: "2026-05-05T15:00:00.000Z", reward: 0.8 });
    const datum2 = makeDatum({ ts: "2026-05-05T15:01:00.000Z", reward: 0.6 });
    fs.writeFileSync(feedPath, JSON.stringify(datum1) + "\n" + JSON.stringify(datum2) + "\n");

    const out = engine.applyFromFeed({ feedPath, cursorPath, perfStatePath: perfPath });
    expect(out.ok).toBe(true);
    expect(out.processed).toBe(2);
    expect(out.skipped).toBe(0);
    expect(out.persisted).toBe(true);
    expect(out.perVendor.anthropic.observations).toBe(2);
    expect(out.perVendor.ollama.observations).toBe(2);
    expect(out.cursor.lines_processed).toBe(2);
    expect(out.cursor.last_offset_bytes).toBeGreaterThan(0);
  });

  it("applyFromFeed is idempotent — re-running over consumed feed processes 0 new", () => {
    const datum = makeDatum();
    fs.writeFileSync(feedPath, JSON.stringify(datum) + "\n");

    const first = engine.applyFromFeed({ feedPath, cursorPath, perfStatePath: perfPath });
    expect(first.processed).toBe(1);

    const second = engine.applyFromFeed({ feedPath, cursorPath, perfStatePath: perfPath });
    expect(second.processed).toBe(0);
    expect(second.cursor.last_offset_bytes).toBe(first.cursor.last_offset_bytes);
  });

  it("applyFromFeed cursor resume picks up only NEW lines after partial consumption", () => {
    const d1 = makeDatum({ ts: "2026-05-05T15:00:00.000Z" });
    fs.writeFileSync(feedPath, JSON.stringify(d1) + "\n");
    engine.applyFromFeed({ feedPath, cursorPath, perfStatePath: perfPath });

    // Append two more lines.
    const d2 = makeDatum({ ts: "2026-05-05T15:01:00.000Z" });
    const d3 = makeDatum({ ts: "2026-05-05T15:02:00.000Z" });
    fs.appendFileSync(feedPath, JSON.stringify(d2) + "\n" + JSON.stringify(d3) + "\n");

    const out = engine.applyFromFeed({ feedPath, cursorPath, perfStatePath: perfPath });
    expect(out.processed).toBe(2);
    expect(out.cursor.last_ts).toBe("2026-05-05T15:02:00.000Z");
  });

  it("applyFromFeed skips malformed JSON lines and keeps moving", () => {
    const good = makeDatum();
    fs.writeFileSync(
      feedPath,
      JSON.stringify(good) + "\n" + "{garbage no close" + "\n" + JSON.stringify(good) + "\n"
    );
    const out = engine.applyFromFeed({ feedPath, cursorPath, perfStatePath: perfPath });
    expect(out.processed).toBe(2);
    expect(out.skipped).toBe(1);
  });

  it("applyFromFeed resets cursor when feed_path mismatches stored cursor", () => {
    fs.writeFileSync(feedPath, JSON.stringify(makeDatum()) + "\n");
    engine.applyFromFeed({ feedPath, cursorPath, perfStatePath: perfPath });

    // Pretend we rotated to a different feed file.
    const altFeed = path.join(dir, "feed-rotated.jsonl");
    fs.writeFileSync(altFeed, JSON.stringify(makeDatum({ ts: "2026-05-05T16:00:00.000Z" })) + "\n");
    const out = engine.applyFromFeed({ feedPath: altFeed, cursorPath, perfStatePath: perfPath });
    expect(out.cursorReset).toBe(true);
    expect(out.processed).toBe(1);
    expect(out.cursor.feed_path).toBe(altFeed);
  });

  it("applyFromFeed resets offset when feed has shrunk since last run (truncation/rotation)", () => {
    const big = JSON.stringify(makeDatum()) + "\n" + JSON.stringify(makeDatum()) + "\n";
    fs.writeFileSync(feedPath, big);
    engine.applyFromFeed({ feedPath, cursorPath, perfStatePath: perfPath });

    // Truncate to a single short line — offset > new file size
    fs.writeFileSync(feedPath, JSON.stringify(makeDatum({ ts: "2026-05-05T17:00:00.000Z" })) + "\n");
    const out = engine.applyFromFeed({ feedPath, cursorPath, perfStatePath: perfPath });
    expect(out.processed).toBe(1);
  });

  it("applyFromFeed batchSize caps lines processed in one run", () => {
    const lines = [makeDatum({ ts: "t1" }), makeDatum({ ts: "t2" }), makeDatum({ ts: "t3" })]
      .map((d) => JSON.stringify(d))
      .join("\n") + "\n";
    fs.writeFileSync(feedPath, lines);
    const out = engine.applyFromFeed({ feedPath, cursorPath, perfStatePath: perfPath, batchSize: 2 });
    expect(out.processed).toBe(2);

    // Continue processing — third line picked up.
    const out2 = engine.applyFromFeed({ feedPath, cursorPath, perfStatePath: perfPath });
    expect(out2.processed).toBe(1);
  });

  it("applyFromFeed with persist=false leaves state and cursor untouched", () => {
    fs.writeFileSync(feedPath, JSON.stringify(makeDatum()) + "\n");
    const out = engine.applyFromFeed({ feedPath, cursorPath, perfStatePath: perfPath, persist: false });
    expect(out.ok).toBe(true);
    expect(out.processed).toBe(1);
    expect(out.persisted).toBe(false);
    expect(fs.existsSync(perfPath)).toBe(false);
    expect(fs.existsSync(cursorPath)).toBe(false);
  });

  it("applyFromFeed updates EMA so two-run total matches single-run-via-applyFromResult equivalent", () => {
    const datum = makeDatum({
      reward: 1.0,
      models: [
        { model: "claude-opus-4-7", vendor: "anthropic", ok: true, latency_ms: 0, tokens: 10, factuality_score: null, hallucination_count: 0, in_consensus_voters: true, answer_chars: 2 },
      ],
    });
    fs.writeFileSync(feedPath, JSON.stringify(datum) + "\n");
    const out = engine.applyFromFeed({ feedPath, cursorPath, perfStatePath: perfPath });
    const ema = out.state.vendors.anthropic.tasks.decide.ema;
    expect(ema).toBe(1.0); // cold-start replaces
  });

  // ---- cursor persistence ----

  it("loadCursor returns zero cursor when file missing or malformed", () => {
    const empty = engine.loadCursor(path.join(dir, "no-such.json"));
    expect(empty.last_offset_bytes).toBe(0);
    expect(empty.last_ts).toBe(null);

    fs.writeFileSync(cursorPath, "{not json");
    const fallback = engine.loadCursor(cursorPath);
    expect(fallback.last_offset_bytes).toBe(0);
  });

  it("saveCursor writes atomically and round-trips", () => {
    const cursor = {
      schemaVersion: "1.0.0",
      feed_path: feedPath,
      last_offset_bytes: 4096,
      last_ts: "2026-05-05T15:00:00.000Z",
      lines_processed: 12,
    };
    engine.saveCursor(cursor, cursorPath);
    expect(fs.existsSync(cursorPath)).toBe(true);
    const reloaded = engine.loadCursor(cursorPath);
    expect(reloaded).toEqual(cursor);
  });
});
