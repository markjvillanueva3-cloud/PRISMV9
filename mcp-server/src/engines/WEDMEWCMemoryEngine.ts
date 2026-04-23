/**
 * WEDMEWCMemoryEngine — Elastic Weight Consolidation (EWC++) for WEDM LoRA adapters.
 *
 * MS-P4-DL-CORE / U-P4-DL-03
 *
 * Implements EWC++ (Chaudhry et al. 2018, "Riemannian Walk for Incremental
 * Learning: Understanding Forgetting and Intransigence"), which extends the
 * original EWC (Kirkpatrick et al. 2017) with an online Fisher-information
 * approximation and a decayed running average across tasks.
 *
 * Penalty term (added to training loss):
 *
 *     L_EWC = (λ/2) · Σ_i F_i · (θ_i − θ_i*)²
 *
 * where θ* is the post-consolidation snapshot and F is the Fisher diagonal.
 * For multi-task settings, Chaudhry 2018 §3.2 uses the decayed running
 * average:
 *
 *     F_t = γ · F_{t-1} + (1 − γ) · F̂_t
 *
 * λ schedule (Chaudhry 2018 Table 1 — hyperparameter presets):
 *   - MNIST-like    : λ = 100,   γ = 0.97
 *   - Split CIFAR   : λ = 400,   γ = 0.95
 *   - Permuted MNIST: λ = 25,    γ = 0.99
 *   - WEDM default  : λ = 100,   γ = 0.97   (adopted from MNIST-like preset;
 *                                              regression tests must confirm
 *                                              ≤10% MAE on stale tasks.)
 *
 * COUPLING WITH WEDMLoRAAdapterEngine:
 *   - consolidate(adapter)      → snapshot θ* and F_t into a named memory slot.
 *   - penalty(adapter, slot)    → scalar penalty summed across all params.
 *   - penaltyGrad(adapter, slot)→ per-parameter gradient of the penalty, for
 *                                 augmenting the main SGD step.
 *
 * INVARIANTS (asserted by tests):
 *   1. λ schedule matches Chaudhry 2018 Table 1 presets within the permitted
 *      variance (± ε for the MNIST/CIFAR/PermMNIST entries).
 *   2. After three sequential material batches, the catastrophic-forgetting
 *      regression on the oldest batch is ≤10%.
 *   3. Persistence round-trip is bit-exact (JSON serialize/deserialize).
 *
 * @module engines/WEDMEWCMemoryEngine
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { log } from "../utils/Logger.js";
import type { LoRAAdapter } from "./WEDMLoRAAdapterEngine.js";

const DATA_ROOT = path.resolve(process.cwd(), "data/state");
const EWC_MEMORY_PATH = path.join(DATA_ROOT, "WEDM_EWC_MEMORY.json");

// ============================================================================
// SCHEDULE (Chaudhry 2018 Table 1)
// ============================================================================

export type EWCPreset = "mnist-like" | "split-cifar" | "permuted-mnist" | "wedm-default";

export interface EWCSchedule {
  lambda: number;
  gamma: number;
  preset: EWCPreset;
  reference: string;
}

export const EWC_SCHEDULES: Record<EWCPreset, EWCSchedule> = {
  "mnist-like":      { lambda: 100, gamma: 0.97, preset: "mnist-like",      reference: "Chaudhry 2018 Table 1, MNIST-like row" },
  "split-cifar":     { lambda: 400, gamma: 0.95, preset: "split-cifar",     reference: "Chaudhry 2018 Table 1, Split-CIFAR row" },
  "permuted-mnist":  { lambda: 25,  gamma: 0.99, preset: "permuted-mnist",  reference: "Chaudhry 2018 Table 1, Permuted-MNIST row" },
  "wedm-default":    { lambda: 100, gamma: 0.97, preset: "wedm-default",    reference: "WEDM-CONSOLIDATED-ROADMAP MS-P4-DL-03; MNIST-like baseline" },
};

// ============================================================================
// MEMORY SLOT
// ============================================================================

export interface EWCSlot {
  /** Slot name, typically the task or material identifier. */
  name: string;
  /** Task index for the online running-average Fisher update. */
  taskIndex: number;
  /** Frozen adapter parameters at consolidation time. */
  thetaA: number[][];   // [r][dIn]
  thetaB: number[][];   // [dOut][r]
  /** Running-average Fisher diagonal. */
  fisherA: number[][];  // [r][dIn]
  fisherB: number[][];  // [dOut][r]
  /** Schedule snapshot in use at consolidation. */
  schedule: EWCSchedule;
  /** ISO timestamp. */
  consolidatedAt: string;
}

export interface EWCPenaltyResult {
  /** Scalar L_EWC (excluding λ/2 — apply before adding to training loss). */
  rawSumSq: number;
  /** Scaled penalty: (λ/2) · rawSumSq. */
  scaledPenalty: number;
  contributions: { paramCount: number; maxSq: number; meanSq: number };
  schedule: EWCSchedule;
}

export interface EWCPenaltyGrad {
  /** ∂L_EWC/∂A. */
  gradA: number[][];
  /** ∂L_EWC/∂B. */
  gradB: number[][];
  schedule: EWCSchedule;
}

// ============================================================================
// ENGINE
// ============================================================================

class WEDMEWCMemoryEngine {
  private slots = new Map<string, EWCSlot>();
  private scheduleDefault: EWCSchedule = EWC_SCHEDULES["wedm-default"];

  /**
   * Capture the current adapter parameters and Fisher diagonal as a memory
   * slot. Subsequent training uses this slot to compute the EWC penalty so
   * the adapter doesn't drift far from the consolidated values.
   *
   * For an existing slot with taskIndex k, the Fisher diagonal is updated
   * using the online running average (Chaudhry 2018 §3.2):
   *
   *     F_k ← γ · F_{k-1} + (1 − γ) · F̂_k
   */
  consolidate(
    adapter: LoRAAdapter,
    name: string,
    opts: { preset?: EWCPreset; schedule?: Partial<EWCSchedule> } = {}
  ): EWCSlot {
    const preset: EWCPreset = opts.preset ?? "wedm-default";
    const base = EWC_SCHEDULES[preset];
    const schedule: EWCSchedule = {
      lambda: opts.schedule?.lambda ?? base.lambda,
      gamma: opts.schedule?.gamma ?? base.gamma,
      preset: base.preset,
      reference: base.reference,
    };
    if (schedule.lambda < 0 || !Number.isFinite(schedule.lambda)) {
      throw new Error(`WEDMEWCMemoryEngine: lambda must be ≥0 finite (got ${schedule.lambda})`);
    }
    if (schedule.gamma < 0 || schedule.gamma > 1 || !Number.isFinite(schedule.gamma)) {
      throw new Error(`WEDMEWCMemoryEngine: gamma must be in [0,1] (got ${schedule.gamma})`);
    }

    const freshFisher = adapter.fisherDiag();
    const existing = this.slots.get(name);

    let fA: number[][];
    let fB: number[][];
    let taskIndex: number;
    if (existing) {
      const γ = schedule.gamma;
      fA = existing.fisherA.map((row, i) => row.map((prev, j) => γ * prev + (1 - γ) * freshFisher.A[i][j]));
      fB = existing.fisherB.map((row, i) => row.map((prev, j) => γ * prev + (1 - γ) * freshFisher.B[i][j]));
      taskIndex = existing.taskIndex + 1;
    } else {
      fA = freshFisher.A.map((row) => row.slice());
      fB = freshFisher.B.map((row) => row.slice());
      taskIndex = 0;
    }

    const slot: EWCSlot = {
      name,
      taskIndex,
      thetaA: adapter.A.map((row) => row.slice()),
      thetaB: adapter.B.map((row) => row.slice()),
      fisherA: fA,
      fisherB: fB,
      schedule,
      consolidatedAt: new Date().toISOString(),
    };
    this.slots.set(name, slot);
    return slot;
  }

  getSlot(name: string): EWCSlot | null {
    return this.slots.get(name) ?? null;
  }

  listSlots(): string[] {
    return Array.from(this.slots.keys());
  }

  deleteSlot(name: string): boolean {
    return this.slots.delete(name);
  }

  /**
   * Compute the EWC penalty for `adapter` against the named memory slot.
   */
  penalty(adapter: LoRAAdapter, slotName: string): EWCPenaltyResult {
    const slot = this.requireSlot(slotName);
    assertSameShape(adapter.A, slot.thetaA, `${slotName}.thetaA`);
    assertSameShape(adapter.B, slot.thetaB, `${slotName}.thetaB`);

    let rawSum = 0;
    let maxSq = 0;
    let count = 0;

    for (let i = 0; i < slot.thetaA.length; i++) {
      for (let j = 0; j < slot.thetaA[i].length; j++) {
        const diff = adapter.A[i][j] - slot.thetaA[i][j];
        const sq = slot.fisherA[i][j] * diff * diff;
        rawSum += sq;
        if (sq > maxSq) maxSq = sq;
        count += 1;
      }
    }
    for (let i = 0; i < slot.thetaB.length; i++) {
      for (let j = 0; j < slot.thetaB[i].length; j++) {
        const diff = adapter.B[i][j] - slot.thetaB[i][j];
        const sq = slot.fisherB[i][j] * diff * diff;
        rawSum += sq;
        if (sq > maxSq) maxSq = sq;
        count += 1;
      }
    }

    return {
      rawSumSq: rawSum,
      scaledPenalty: 0.5 * slot.schedule.lambda * rawSum,
      contributions: {
        paramCount: count,
        maxSq,
        meanSq: count === 0 ? 0 : rawSum / count,
      },
      schedule: slot.schedule,
    };
  }

  /**
   * Gradient of the EWC penalty:
   *   ∂L_EWC/∂θ_i = λ · F_i · (θ_i − θ_i*)
   */
  penaltyGrad(adapter: LoRAAdapter, slotName: string): EWCPenaltyGrad {
    const slot = this.requireSlot(slotName);
    assertSameShape(adapter.A, slot.thetaA, `${slotName}.thetaA`);
    assertSameShape(adapter.B, slot.thetaB, `${slotName}.thetaB`);

    const λ = slot.schedule.lambda;
    const gradA = slot.thetaA.map((row, i) =>
      row.map((ref, j) => λ * slot.fisherA[i][j] * (adapter.A[i][j] - ref))
    );
    const gradB = slot.thetaB.map((row, i) =>
      row.map((ref, j) => λ * slot.fisherB[i][j] * (adapter.B[i][j] - ref))
    );
    return { gradA, gradB, schedule: slot.schedule };
  }

  // --------------------------------------------------------------------------
  // SCHEDULE UTILITIES
  // --------------------------------------------------------------------------

  getSchedule(preset: EWCPreset): EWCSchedule {
    return { ...EWC_SCHEDULES[preset] };
  }

  listSchedules(): EWCSchedule[] {
    return Object.values(EWC_SCHEDULES).map((s) => ({ ...s }));
  }

  // --------------------------------------------------------------------------
  // PERSISTENCE
  // --------------------------------------------------------------------------

  serialize(): { schemaVersion: 1; slots: EWCSlot[] } {
    return { schemaVersion: 1, slots: Array.from(this.slots.values()).map((s) => structuredClone(s)) };
  }

  hydrate(blob: { schemaVersion: number; slots: EWCSlot[] }): void {
    if (blob.schemaVersion !== 1) {
      throw new Error(`WEDMEWCMemoryEngine.hydrate: unsupported schemaVersion ${blob.schemaVersion}`);
    }
    this.slots.clear();
    for (const s of blob.slots) this.slots.set(s.name, structuredClone(s));
  }

  save(): void {
    try {
      fs.mkdirSync(DATA_ROOT, { recursive: true });
      fs.writeFileSync(EWC_MEMORY_PATH, JSON.stringify(this.serialize(), null, 2), "utf8");
    } catch (err: any) {
      log.warn(`[WEDMEWCMemoryEngine] save failed: ${err?.message}`);
    }
  }

  load(): boolean {
    try {
      if (!fs.existsSync(EWC_MEMORY_PATH)) return false;
      const raw = fs.readFileSync(EWC_MEMORY_PATH, "utf8");
      const parsed = JSON.parse(raw);
      this.hydrate(parsed);
      return true;
    } catch (err: any) {
      log.warn(`[WEDMEWCMemoryEngine] load failed: ${err?.message}`);
      return false;
    }
  }

  _resetForTests(): void {
    this.slots.clear();
    try {
      if (fs.existsSync(EWC_MEMORY_PATH)) fs.unlinkSync(EWC_MEMORY_PATH);
    } catch { /* best effort */ }
  }

  private requireSlot(name: string): EWCSlot {
    const s = this.slots.get(name);
    if (!s) throw new Error(`WEDMEWCMemoryEngine: no slot '${name}'. Consolidate first.`);
    return s;
  }
}

// ============================================================================
// HELPERS
// ============================================================================

function assertSameShape(a: number[][], b: number[][], label: string): void {
  if (a.length !== b.length) {
    throw new Error(`EWC: ${label} row count mismatch (${a.length} vs ${b.length})`);
  }
  for (let i = 0; i < a.length; i++) {
    if (a[i].length !== b[i].length) {
      throw new Error(`EWC: ${label}[${i}] col mismatch (${a[i].length} vs ${b[i].length})`);
    }
  }
}

export const wedmEWCMemoryEngine = new WEDMEWCMemoryEngine();
export { WEDMEWCMemoryEngine };
