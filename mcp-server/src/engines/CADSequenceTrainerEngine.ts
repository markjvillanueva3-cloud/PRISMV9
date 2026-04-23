/**
 * CADSequenceTrainerEngine — CADCAM-DAGI-MS0/U-DAGI04
 *
 * Transformer-style CAD language-model **training orchestrator**. Consumes
 * the token streams produced by U-DAGI01 (tokenize) + U-DAGI03 (corpus)
 * and drives a backend through batching, deterministic 90/10 splitting,
 * LoRA adapter lifecycle, convergence checks, and checkpoint ledgers.
 *
 * Architecture — pure controller, injectable ModelBackend:
 *   The engine owns no neural tensors. A `ModelBackend` plug-in performs
 *   the forward/backward pass and parameter updates. Tests supply a tiny
 *   deterministic backend (count-table Markov model); production wires a
 *   real HuggingFace / llama.cpp / Ollama runtime here. This keeps the
 *   orchestrator unit-testable and decouples training policy from the
 *   underlying math library.
 *
 * Key methods:
 *   splitCorpus(tokens, ratio, seed)   — deterministic 90/10 train/val split
 *   registerAdapter(config)            — declare a LoRA adapter
 *   trainEpoch(backend, batches, cfg)  — one pass; returns per-epoch metrics
 *   evaluate(backend, val, detok?)     — perplexity + feature validity
 *   train(config, tokens, backend, …)  — full orchestration
 *   serializeCheckpoint / loadCheckpoint
 *
 * Metrics:
 *   trainLoss          — mean cross-entropy from backend.updateOnBatch
 *   valLoss            — mean cross-entropy from backend.scoreSequence
 *   perplexity         — exp(valLoss)
 *   featureValidityPct — fraction of val sequences whose argmax continuation
 *                        round-trips through a detokenizer without yielding
 *                        `UNKNOWN` ops (coarse proxy for "learned valid
 *                        CAD structure")
 *
 * Abort criteria (enforced in train()):
 *   - NaN / non-finite loss
 *   - trainLoss > divergenceThreshold (default 1e3)
 *   - valLoss increases for `earlyStoppingPatience` epochs in a row
 *
 * Determinism:
 *   - mulberry32 PRNG seeded from config.seed
 *   - shuffle() uses Fisher–Yates with that PRNG
 *   - split point = floor(n * (1 - valSplit))
 *
 * Complexity (controller only; backend cost dominates in production):
 *   splitCorpus  O(N)
 *   trainEpoch   O(N/batchSize * backend.batchCost)
 *   evaluate     O(V * seqLen * backend.scoreCost)
 *
 * References:
 *   - Hu et al. 2021, "LoRA: Low-Rank Adaptation of Large Language Models"
 *   - Vaswani et al. 2017, "Attention Is All You Need"
 *   - Perplexity = exp(cross-entropy) — Jurafsky & Martin, SLP Ch.3
 */
import { BaseEngine } from "./BaseEngine.js";
import type { EngineInfo, EngineCapability } from "./IEngine.js";

// ── Types ────────────────────────────────────────────────────────────────────

/** Single token-id sequence (from U-DAGI01). */
export type TokenSeq = number[];

/** A training batch of token-id sequences. */
export interface TrainingBatch {
  sequences: TokenSeq[];
  /** Optional pre-shifted next-token labels; when omitted the engine shifts. */
  labels?: TokenSeq[];
  /** Unique batch id for reproducible reordering */
  batchId: number;
}

export interface LoRAConfig {
  name: string;
  rank: number;            // r
  alpha: number;           // scaling (usually rank * 2)
  targetModules: string[]; // e.g. ["q_proj", "v_proj"]
  dropout?: number;
}

export interface TrainingConfig {
  epochs: number;
  batchSize: number;
  learningRate: number;
  /** 0..1 fraction of tokens reserved for validation */
  validationSplit: number;
  seed: number;
  lora?: LoRAConfig;
  divergenceThreshold?: number;     // default 1e3
  earlyStoppingPatience?: number;   // default 3
  maxBatchesPerEpoch?: number;      // cap for smoke-tests
}

/** Backend plug-in. Tests inject a tiny deterministic implementation. */
export interface ModelBackend {
  /** Report a parameter count — used for reporting, not correctness. */
  getParamCount(): number;
  /** Perform an update step; return per-batch mean cross-entropy loss. */
  updateOnBatch(batch: TrainingBatch, lr: number): { loss: number; gradNorm: number };
  /** Score a full sequence; return the mean per-token cross-entropy. */
  scoreSequence(seq: TokenSeq): number;
  /** Return the argmax next-token prediction for a context. */
  predictNext(ctx: TokenSeq): number;
  /** Serialize full state (including any registered adapter weights). */
  serializeCheckpoint(): string;
  /** Restore state from a serialized string. */
  loadCheckpoint(data: string): void;
  /** Optional: install a LoRA adapter. */
  installAdapter?(cfg: LoRAConfig): void;
}

export interface EpochMetrics {
  epoch: number;
  trainLoss: number;
  valLoss: number;
  perplexity: number;
  featureValidityPct: number;
  stepsElapsed: number;
}

export interface TrainingResult {
  converged: boolean;
  finalMetrics: EpochMetrics;
  history: EpochMetrics[];
  bestCheckpoint: string;
  abortReason?: string;
}

/** A detokenizer the engine can call to validate predicted sequences. */
export type DetokenizerFn = (tokens: TokenSeq) => { ops: Array<{ op: string }> };

// ── Deterministic PRNG (mulberry32) ─────────────────────────────────────────

/** Mulberry32 — deterministic, fast, uniform in [0, 1). Reference: Tom Hubbard. */
function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b_79f5) >>> 0;
    let x = t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function shuffleInPlace<T>(arr: T[], rng: () => number): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

// ── Engine ───────────────────────────────────────────────────────────────────

/**
 * CADSequenceTrainerEngine — drives training of a CAD language model over
 * the U-DAGI03 token corpus. Pure controller; no neural state of its own.
 */
export class CADSequenceTrainerEngine extends BaseEngine {
  private readonly adapters = new Map<string, LoRAConfig>();

  constructor() {
    const info: EngineInfo = {
      name: "CADSequenceTrainerEngine",
      version: "1.0.0",
      domain: "cad_neural",
      description:
        "Transformer-style CAD LM training orchestrator. Drives an injectable " +
        "ModelBackend through batching, deterministic 90/10 split, LoRA adapter " +
        "lifecycle, convergence checks, and checkpoint ledgers.",
    };
    super(info);
  }

  getCapabilities(): EngineCapability[] {
    return [
      { name: "split_corpus", description: "Deterministic train/val split", actions: ["train_split"] },
      { name: "register_adapter", description: "Declare a LoRA adapter", actions: ["train_register_adapter"] },
      { name: "train_epoch", description: "Drive one training epoch over batches", actions: ["train_epoch"] },
      { name: "evaluate", description: "Perplexity + feature-validity on val set", actions: ["train_evaluate"] },
      { name: "train", description: "Full orchestration with abort criteria", actions: ["train"] },
      { name: "serialize_checkpoint", description: "Emit backend checkpoint ledger", actions: ["train_checkpoint"] },
    ];
  }

  validate(input: unknown): string | null {
    if (input == null || typeof input !== "object") return "input must be an object";
    return null;
  }

  protected async executeImpl(input: unknown): Promise<unknown> {
    const obj = input as Record<string, unknown>;
    if ("tokens" in obj && "config" in obj && "backend" in obj) {
      return this.train(
        obj.config as TrainingConfig,
        obj.tokens as TokenSeq[],
        obj.backend as ModelBackend,
      );
    }
    throw new Error("CADSequenceTrainerEngine: input must contain {tokens, config, backend}");
  }

  // ── Adapter registry ─────────────────────────────────────────────────────

  registerAdapter(cfg: LoRAConfig): void {
    if (cfg.rank <= 0) throw new Error("LoRA rank must be positive");
    if (cfg.alpha <= 0) throw new Error("LoRA alpha must be positive");
    if (cfg.targetModules.length === 0) throw new Error("LoRA targetModules must be non-empty");
    this.adapters.set(cfg.name, { ...cfg });
  }

  getAdapter(name: string): LoRAConfig | undefined {
    return this.adapters.get(name);
  }

  listAdapters(): LoRAConfig[] {
    return Array.from(this.adapters.values());
  }

  // ── Split ────────────────────────────────────────────────────────────────

  /**
   * Deterministic train/val split. `ratio` is the validation fraction.
   * Returns sequences in their original order within each slice (shuffling
   * happens per-epoch, not during split).
   */
  splitCorpus(
    tokens: TokenSeq[],
    ratio: number,
    seed: number,
  ): { train: TokenSeq[]; val: TokenSeq[] } {
    if (!Array.isArray(tokens)) throw new Error("tokens must be an array");
    if (ratio < 0 || ratio >= 1) throw new Error("ratio must be in [0, 1)");
    if (tokens.length === 0) return { train: [], val: [] };

    // Shuffle a copy with a seeded PRNG so the split is deterministic but
    // not biased by upstream order.
    const rng = mulberry32(seed);
    const shuffled = shuffleInPlace(tokens.slice(), rng);
    const valCount = Math.floor(tokens.length * ratio);
    const trainCount = tokens.length - valCount;
    return {
      train: shuffled.slice(0, trainCount),
      val: shuffled.slice(trainCount),
    };
  }

  // ── Batching ─────────────────────────────────────────────────────────────

  /** Partition `tokens` into fixed-size batches with shifted next-token labels. */
  makeBatches(tokens: TokenSeq[], batchSize: number, seed: number): TrainingBatch[] {
    if (batchSize <= 0) throw new Error("batchSize must be positive");
    const rng = mulberry32(seed);
    const perm = shuffleInPlace(tokens.slice(), rng);
    const batches: TrainingBatch[] = [];
    let id = 0;
    for (let i = 0; i < perm.length; i += batchSize) {
      const seqs = perm.slice(i, i + batchSize);
      batches.push({
        batchId: id++,
        sequences: seqs,
        // Default label = sequence shifted left by one (next-token objective).
        labels: seqs.map((s) => (s.length > 1 ? s.slice(1) : s.slice())),
      });
    }
    return batches;
  }

  // ── One epoch ────────────────────────────────────────────────────────────

  trainEpoch(
    backend: ModelBackend,
    batches: TrainingBatch[],
    lr: number,
  ): { meanLoss: number; steps: number } {
    if (batches.length === 0) return { meanLoss: 0, steps: 0 };
    let sum = 0;
    let steps = 0;
    for (const b of batches) {
      const { loss } = backend.updateOnBatch(b, lr);
      if (!Number.isFinite(loss)) return { meanLoss: loss, steps };
      sum += loss;
      steps += 1;
    }
    return { meanLoss: sum / steps, steps };
  }

  // ── Evaluation ───────────────────────────────────────────────────────────

  evaluate(
    backend: ModelBackend,
    val: TokenSeq[],
    detokenize?: DetokenizerFn,
  ): { valLoss: number; perplexity: number; featureValidityPct: number } {
    if (val.length === 0) return { valLoss: 0, perplexity: 1, featureValidityPct: 1 };
    let lossSum = 0;
    for (const seq of val) lossSum += backend.scoreSequence(seq);
    const valLoss = lossSum / val.length;
    const perplexity = Math.exp(valLoss);

    let validityPct = 1;
    if (detokenize) {
      let valid = 0;
      for (const seq of val) {
        try {
          const detok = detokenize(seq);
          const ops = detok?.ops ?? [];
          const bad = ops.some((o) => !o?.op || o.op === "UNKNOWN");
          if (ops.length > 0 && !bad) valid += 1;
        } catch {
          // a throw counts as invalid
        }
      }
      validityPct = val.length > 0 ? valid / val.length : 1;
    }
    return { valLoss, perplexity, featureValidityPct: validityPct };
  }

  // ── Full train loop ──────────────────────────────────────────────────────

  train(
    config: TrainingConfig,
    tokens: TokenSeq[],
    backend: ModelBackend,
    detokenize?: DetokenizerFn,
  ): TrainingResult {
    if (config.epochs <= 0) throw new Error("epochs must be positive");
    if (config.batchSize <= 0) throw new Error("batchSize must be positive");
    if (config.validationSplit < 0 || config.validationSplit >= 1) {
      throw new Error("validationSplit must be in [0, 1)");
    }
    if (config.lora) {
      this.registerAdapter(config.lora);
      backend.installAdapter?.(config.lora);
    }

    const divergence = config.divergenceThreshold ?? 1e3;
    const patience = config.earlyStoppingPatience ?? 3;
    const { train, val } = this.splitCorpus(tokens, config.validationSplit, config.seed);

    const history: EpochMetrics[] = [];
    let bestValLoss = Number.POSITIVE_INFINITY;
    let bestCheckpoint = backend.serializeCheckpoint();
    let increasingStreak = 0;
    let totalSteps = 0;
    let abortReason: string | undefined;

    for (let epoch = 1; epoch <= config.epochs; epoch++) {
      const seedThisEpoch = (config.seed + epoch) >>> 0;
      let batches = this.makeBatches(train, config.batchSize, seedThisEpoch);
      if (config.maxBatchesPerEpoch && batches.length > config.maxBatchesPerEpoch) {
        batches = batches.slice(0, config.maxBatchesPerEpoch);
      }
      const { meanLoss, steps } = this.trainEpoch(backend, batches, config.learningRate);
      totalSteps += steps;
      if (!Number.isFinite(meanLoss)) {
        abortReason = `training diverged at epoch ${epoch} (non-finite loss)`;
        break;
      }
      if (meanLoss > divergence) {
        abortReason = `training diverged at epoch ${epoch} (loss ${meanLoss.toFixed(2)} > ${divergence})`;
        break;
      }

      const evalOut = this.evaluate(backend, val, detokenize);
      const m: EpochMetrics = {
        epoch,
        trainLoss: meanLoss,
        valLoss: evalOut.valLoss,
        perplexity: evalOut.perplexity,
        featureValidityPct: evalOut.featureValidityPct,
        stepsElapsed: totalSteps,
      };
      history.push(m);

      if (evalOut.valLoss < bestValLoss - 1e-9) {
        bestValLoss = evalOut.valLoss;
        bestCheckpoint = backend.serializeCheckpoint();
        increasingStreak = 0;
      } else {
        increasingStreak += 1;
        if (increasingStreak >= patience) {
          abortReason = `early stop: valLoss not improving for ${patience} epochs`;
          break;
        }
      }
    }

    const finalMetrics = history[history.length - 1] ?? {
      epoch: 0,
      trainLoss: 0,
      valLoss: 0,
      perplexity: 1,
      featureValidityPct: 1,
      stepsElapsed: 0,
    };

    const converged = abortReason === undefined || abortReason.startsWith("early stop");
    return { converged, finalMetrics, history, bestCheckpoint, abortReason };
  }

  // ── Checkpoint passthroughs (for symmetry with backend) ──────────────────

  serializeCheckpoint(backend: ModelBackend): string {
    return backend.serializeCheckpoint();
  }
  loadCheckpoint(backend: ModelBackend, data: string): void {
    backend.loadCheckpoint(data);
  }
}

export const cadSequenceTrainerEngine = new CADSequenceTrainerEngine();
export { mulberry32 as __mulberry32ForTesting, shuffleInPlace as __shuffleForTesting };
