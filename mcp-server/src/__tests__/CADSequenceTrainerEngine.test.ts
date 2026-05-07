/**
 * CADSequenceTrainerEngine tests — CADCAM-DAGI-MS0/U-DAGI04 exit-gate.
 *
 * Exit gate: 20+ tests, coverage target 92%. Covers:
 *   — mulberry32 determinism + distribution
 *   — shuffleInPlace determinism vs seed change
 *   — splitCorpus: ratio semantics, boundary cases, determinism, error cases
 *   — makeBatches: size, label shift, deterministic permutation
 *   — LoRA adapter registry (register / get / list / validation)
 *   — trainEpoch + evaluate pipelines with a deterministic mock backend
 *   — train(): convergence, early stop, divergence abort, LoRA install
 *   — serialize/loadCheckpoint round-trip
 *   — BaseEngine contract (execute / validate / getCapabilities / healthCheck)
 */
import { describe, it, expect } from "vitest";
import {
  cadSequenceTrainerEngine,
  CADSequenceTrainerEngine,
  __mulberry32ForTesting,
  __shuffleForTesting,
  type ModelBackend,
  type TokenSeq,
  type TrainingBatch,
  type TrainingConfig,
  type LoRAConfig,
} from "../engines/CADSequenceTrainerEngine.js";

// ── Mock backend ─────────────────────────────────────────────────────────────

/**
 * Deterministic count-table backend. Loss starts at log(V) and decreases as
 * tokens repeat within the training stream — mimics a convergent optimizer.
 * No real tensors; every operation is a dictionary lookup.
 */
class MockBackend implements ModelBackend {
  private counts = new Map<string, Map<number, number>>();
  private adapter: LoRAConfig | null = null;
  public steps = 0;
  constructor(public vocabSize: number, private seedOffset = 0) {}
  getParamCount() {
    return this.vocabSize * this.vocabSize + (this.adapter ? this.adapter.rank * this.adapter.alpha : 0);
  }
  installAdapter(cfg: LoRAConfig) { this.adapter = { ...cfg }; }
  updateOnBatch(batch: TrainingBatch, lr: number): { loss: number; gradNorm: number } {
    this.steps += 1;
    for (const seq of batch.sequences) {
      for (let i = 0; i < seq.length - 1; i++) {
        const ctx = String(seq[i]);
        if (!this.counts.has(ctx)) this.counts.set(ctx, new Map());
        const bucket = this.counts.get(ctx)!;
        bucket.set(seq[i + 1], (bucket.get(seq[i + 1]) ?? 0) + 1);
      }
    }
    const raw = Math.log(this.vocabSize);
    const decay = Math.exp(-lr * this.steps * 0.05);
    return { loss: raw * decay + this.seedOffset * 0.001, gradNorm: 0.5 * decay };
  }
  scoreSequence(seq: TokenSeq): number {
    if (seq.length < 2) return 0;
    let total = 0;
    let n = 0;
    for (let i = 0; i < seq.length - 1; i++) {
      const ctx = String(seq[i]);
      const next = seq[i + 1];
      const bucket = this.counts.get(ctx);
      const count = bucket?.get(next) ?? 0;
      const totalCount = bucket ? Array.from(bucket.values()).reduce((a, b) => a + b, 0) : 0;
      const p = (count + 1) / (totalCount + this.vocabSize); // add-1 smoothing
      total += -Math.log(p);
      n += 1;
    }
    return n > 0 ? total / n : 0;
  }
  predictNext(ctx: TokenSeq): number {
    const last = String(ctx[ctx.length - 1] ?? 0);
    const bucket = this.counts.get(last);
    if (!bucket || bucket.size === 0) return 0;
    let bestTok = 0;
    let bestCount = -1;
    for (const [tok, c] of bucket) {
      if (c > bestCount) { bestCount = c; bestTok = tok; }
    }
    return bestTok;
  }
  serializeCheckpoint(): string {
    return JSON.stringify({
      vocabSize: this.vocabSize,
      counts: Array.from(this.counts.entries()).map(([k, v]) => [k, Array.from(v.entries())]),
      adapter: this.adapter,
    });
  }
  loadCheckpoint(data: string): void {
    const obj = JSON.parse(data) as {
      vocabSize: number;
      counts: Array<[string, Array<[number, number]>]>;
      adapter: LoRAConfig | null;
    };
    this.vocabSize = obj.vocabSize;
    this.counts = new Map(obj.counts.map(([k, entries]) => [k, new Map(entries)]));
    this.adapter = obj.adapter;
  }
  hasAdapter(): boolean { return this.adapter !== null; }
}

// ── Fixtures ─────────────────────────────────────────────────────────────────

function synthSeqs(count: number, vocab: number, seedBase = 42): TokenSeq[] {
  const rng = __mulberry32ForTesting(seedBase);
  const out: TokenSeq[] = [];
  for (let i = 0; i < count; i++) {
    const len = 3 + Math.floor(rng() * 5);
    const seq: number[] = [];
    for (let j = 0; j < len; j++) seq.push(Math.floor(rng() * vocab));
    out.push(seq);
  }
  return out;
}

// ── Group 1: mulberry32 PRNG ─────────────────────────────────────────────────

describe("CADSequenceTrainer PRNG (mulberry32)", () => {
  it("is deterministic for a fixed seed", () => {
    const a = __mulberry32ForTesting(1234);
    const b = __mulberry32ForTesting(1234);
    for (let i = 0; i < 64; i++) expect(a()).toBe(b());
  });

  it("produces values in [0,1)", () => {
    const r = __mulberry32ForTesting(7);
    for (let i = 0; i < 1000; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("yields different streams for different seeds", () => {
    const r1 = __mulberry32ForTesting(1);
    const r2 = __mulberry32ForTesting(2);
    let differed = false;
    for (let i = 0; i < 32 && !differed; i++) differed = r1() !== r2();
    expect(differed).toBe(true);
  });
});

// ── Group 2: shuffleInPlace ──────────────────────────────────────────────────

describe("CADSequenceTrainer shuffleInPlace", () => {
  it("preserves multiset identity", () => {
    const arr = [1, 2, 3, 4, 5, 6, 7, 8];
    const rng = __mulberry32ForTesting(5);
    const shuffled = __shuffleForTesting(arr.slice(), rng);
    expect(shuffled.sort((a, b) => a - b)).toEqual([...arr]);
  });

  it("is deterministic for a fixed seed", () => {
    const a = __shuffleForTesting([1, 2, 3, 4, 5], __mulberry32ForTesting(9));
    const b = __shuffleForTesting([1, 2, 3, 4, 5], __mulberry32ForTesting(9));
    expect(a).toEqual(b);
  });
});

// ── Group 3: splitCorpus ─────────────────────────────────────────────────────

describe("CADSequenceTrainerEngine.splitCorpus", () => {
  const seqs = synthSeqs(100, 16);

  it("respects the validation ratio", () => {
    const { train, val } = cadSequenceTrainerEngine.splitCorpus(seqs, 0.1, 1);
    expect(train.length + val.length).toBe(100);
    expect(val.length).toBe(10);
  });

  it("is deterministic for a fixed seed", () => {
    const a = cadSequenceTrainerEngine.splitCorpus(seqs, 0.2, 42);
    const b = cadSequenceTrainerEngine.splitCorpus(seqs, 0.2, 42);
    expect(a.train).toEqual(b.train);
    expect(a.val).toEqual(b.val);
  });

  it("rejects invalid ratios", () => {
    expect(() => cadSequenceTrainerEngine.splitCorpus(seqs, 1, 1)).toThrow();
    expect(() => cadSequenceTrainerEngine.splitCorpus(seqs, -0.1, 1)).toThrow();
  });

  it("handles an empty corpus", () => {
    const { train, val } = cadSequenceTrainerEngine.splitCorpus([], 0.1, 1);
    expect(train).toEqual([]);
    expect(val).toEqual([]);
  });
});

// ── Group 4: makeBatches ─────────────────────────────────────────────────────

describe("CADSequenceTrainerEngine.makeBatches", () => {
  const seqs = synthSeqs(11, 16);

  it("creates the expected number of batches (ceil)", () => {
    const batches = cadSequenceTrainerEngine.makeBatches(seqs, 4, 3);
    // 11 / 4 = 3 batches (sizes 4, 4, 3)
    expect(batches.length).toBe(3);
    expect(batches[0].sequences.length).toBe(4);
    expect(batches[2].sequences.length).toBe(3);
  });

  it("attaches shifted next-token labels by default", () => {
    const seq: TokenSeq[] = [[1, 2, 3, 4]];
    const [b] = cadSequenceTrainerEngine.makeBatches(seq, 1, 0);
    expect(b.labels?.[0]).toEqual([2, 3, 4]);
  });

  it("rejects non-positive batch size", () => {
    expect(() => cadSequenceTrainerEngine.makeBatches(seqs, 0, 1)).toThrow();
  });

  it("assigns monotonic batch ids", () => {
    const batches = cadSequenceTrainerEngine.makeBatches(seqs, 3, 1);
    for (let i = 0; i < batches.length; i++) expect(batches[i].batchId).toBe(i);
  });
});

// ── Group 5: adapter registry ────────────────────────────────────────────────

describe("CADSequenceTrainerEngine LoRA adapter registry", () => {
  it("registers and retrieves an adapter", () => {
    const eng = new CADSequenceTrainerEngine();
    eng.registerAdapter({ name: "cad-r8", rank: 8, alpha: 16, targetModules: ["q_proj"] });
    expect(eng.getAdapter("cad-r8")?.rank).toBe(8);
  });

  it("rejects invalid LoRA configs", () => {
    const eng = new CADSequenceTrainerEngine();
    expect(() => eng.registerAdapter({ name: "bad", rank: 0, alpha: 4, targetModules: ["q"] })).toThrow();
    expect(() => eng.registerAdapter({ name: "bad", rank: 4, alpha: 0, targetModules: ["q"] })).toThrow();
    expect(() => eng.registerAdapter({ name: "bad", rank: 4, alpha: 4, targetModules: [] })).toThrow();
  });

  it("listAdapters returns all registered", () => {
    const eng = new CADSequenceTrainerEngine();
    eng.registerAdapter({ name: "a", rank: 4, alpha: 8, targetModules: ["q"] });
    eng.registerAdapter({ name: "b", rank: 8, alpha: 16, targetModules: ["v"] });
    expect(eng.listAdapters().map((a) => a.name).sort()).toEqual(["a", "b"]);
  });
});

// ── Group 6: evaluate ────────────────────────────────────────────────────────

describe("CADSequenceTrainerEngine.evaluate", () => {
  it("reports perplexity = exp(valLoss)", () => {
    const backend = new MockBackend(16);
    // Prime the backend so scoreSequence is finite and > 0
    backend.updateOnBatch({ batchId: 0, sequences: [[1, 2, 3, 4, 5, 1, 2, 3]] }, 0.01);
    const val = synthSeqs(5, 16);
    const m = cadSequenceTrainerEngine.evaluate(backend, val);
    expect(m.perplexity).toBeCloseTo(Math.exp(m.valLoss), 6);
    expect(m.perplexity).toBeGreaterThan(0);
  });

  it("defaults feature validity to 1 when no detokenizer provided", () => {
    const backend = new MockBackend(8);
    const m = cadSequenceTrainerEngine.evaluate(backend, synthSeqs(3, 8));
    expect(m.featureValidityPct).toBe(1);
  });

  it("honours the detokenizer validity rule", () => {
    const backend = new MockBackend(8);
    const val: TokenSeq[] = [[1, 2, 3], [4, 5, 6]];
    const badDetok = () => ({ ops: [{ op: "UNKNOWN" }] });
    const goodDetok = () => ({ ops: [{ op: "SKETCH_CREATE" }] });
    expect(cadSequenceTrainerEngine.evaluate(backend, val, badDetok).featureValidityPct).toBe(0);
    expect(cadSequenceTrainerEngine.evaluate(backend, val, goodDetok).featureValidityPct).toBe(1);
  });

  it("returns neutral metrics for empty val set", () => {
    const backend = new MockBackend(8);
    const m = cadSequenceTrainerEngine.evaluate(backend, []);
    expect(m.valLoss).toBe(0);
    expect(m.perplexity).toBe(1);
    expect(m.featureValidityPct).toBe(1);
  });
});

// ── Group 7: train() full loop ───────────────────────────────────────────────

describe("CADSequenceTrainerEngine.train — full loop", () => {
  const baseConfig: TrainingConfig = {
    epochs: 4,
    batchSize: 4,
    learningRate: 0.1,
    validationSplit: 0.1,
    seed: 123,
  };

  it("runs for the configured epochs when metrics keep improving", () => {
    const backend = new MockBackend(16);
    const tokens = synthSeqs(60, 16);
    const r = cadSequenceTrainerEngine.train(baseConfig, tokens, backend);
    expect(r.history.length).toBeGreaterThan(0);
    expect(r.history.length).toBeLessThanOrEqual(baseConfig.epochs);
    expect(r.converged).toBe(true);
    expect(Number.isFinite(r.finalMetrics.perplexity)).toBe(true);
  });

  it("aborts on divergent loss", () => {
    class DivergentBackend extends MockBackend {
      override updateOnBatch(): { loss: number; gradNorm: number } {
        return { loss: 1e6, gradNorm: 99 };
      }
    }
    const tokens = synthSeqs(10, 8);
    const r = cadSequenceTrainerEngine.train(
      { ...baseConfig, epochs: 3, divergenceThreshold: 100 },
      tokens,
      new DivergentBackend(8),
    );
    expect(r.converged).toBe(false);
    expect(r.abortReason).toMatch(/diverged/);
  });

  it("aborts on non-finite loss", () => {
    class NaNBackend extends MockBackend {
      override updateOnBatch(): { loss: number; gradNorm: number } {
        return { loss: Number.NaN, gradNorm: 0 };
      }
    }
    const r = cadSequenceTrainerEngine.train(
      baseConfig,
      synthSeqs(8, 4),
      new NaNBackend(4),
    );
    expect(r.abortReason).toMatch(/non-finite/);
  });

  it("installs the LoRA adapter on the backend when provided", () => {
    const backend = new MockBackend(8);
    const tokens = synthSeqs(16, 8);
    const cfg: TrainingConfig = {
      ...baseConfig,
      epochs: 1,
      lora: { name: "cad-r4", rank: 4, alpha: 8, targetModules: ["q_proj", "v_proj"] },
    };
    cadSequenceTrainerEngine.train(cfg, tokens, backend);
    expect(backend.hasAdapter()).toBe(true);
  });

  it("rejects invalid config", () => {
    expect(() => cadSequenceTrainerEngine.train({ ...baseConfig, epochs: 0 }, [[1, 2]], new MockBackend(4))).toThrow();
    expect(() => cadSequenceTrainerEngine.train({ ...baseConfig, batchSize: 0 }, [[1, 2]], new MockBackend(4))).toThrow();
    expect(() => cadSequenceTrainerEngine.train({ ...baseConfig, validationSplit: 1.5 }, [[1, 2]], new MockBackend(4))).toThrow();
  });

  it("records history entries with monotonic epoch numbers", () => {
    const backend = new MockBackend(16);
    const tokens = synthSeqs(40, 16);
    const r = cadSequenceTrainerEngine.train({ ...baseConfig, epochs: 3 }, tokens, backend);
    for (let i = 1; i < r.history.length; i++) {
      expect(r.history[i].epoch).toBe(r.history[i - 1].epoch + 1);
    }
  });
});

// ── Group 8: checkpoint round-trip ───────────────────────────────────────────

describe("CADSequenceTrainerEngine checkpoint passthrough", () => {
  it("serialize + load restores backend state byte-for-byte", () => {
    const bA = new MockBackend(8);
    bA.updateOnBatch({ batchId: 0, sequences: [[1, 2, 3, 4, 5, 6]] }, 0.1);
    const cp = cadSequenceTrainerEngine.serializeCheckpoint(bA);

    const bB = new MockBackend(8);
    cadSequenceTrainerEngine.loadCheckpoint(bB, cp);
    const cp2 = cadSequenceTrainerEngine.serializeCheckpoint(bB);
    expect(cp2).toBe(cp);
  });
});

// ── Group 9: BaseEngine contract ─────────────────────────────────────────────

describe("CADSequenceTrainerEngine BaseEngine contract", () => {
  it("exposes info + singleton", () => {
    expect(cadSequenceTrainerEngine).toBeInstanceOf(CADSequenceTrainerEngine);
    expect(cadSequenceTrainerEngine.info.name).toBe("CADSequenceTrainerEngine");
    expect(cadSequenceTrainerEngine.info.domain).toBe("cad_neural");
  });

  it("reports at least 6 capabilities", () => {
    const caps = cadSequenceTrainerEngine.getCapabilities();
    expect(caps.length).toBeGreaterThanOrEqual(6);
    expect(caps.map((c) => c.name)).toContain("train");
  });

  it("validate rejects non-object input", () => {
    expect(cadSequenceTrainerEngine.validate(42)).not.toBeNull();
    expect(cadSequenceTrainerEngine.validate(null)).not.toBeNull();
  });

  it("execute() runs the train path and returns success", async () => {
    const backend = new MockBackend(8);
    const tokens = synthSeqs(12, 8);
    const r = await cadSequenceTrainerEngine.execute({
      tokens,
      config: {
        epochs: 1,
        batchSize: 4,
        learningRate: 0.1,
        validationSplit: 0.1,
        seed: 1,
      } satisfies TrainingConfig,
      backend,
    });
    expect(r.success).toBe(true);
    expect(r.source).toBe("CADSequenceTrainerEngine");
  });

  it("healthCheck reports healthy", async () => {
    const h = await cadSequenceTrainerEngine.healthCheck();
    expect(h.healthy).toBe(true);
  });
});
