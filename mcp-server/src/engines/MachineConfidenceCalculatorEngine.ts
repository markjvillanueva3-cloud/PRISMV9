/**
 * MCAT-MS0 P1-U04: Machine Confidence Calculator Engine
 *
 * Calculates confidence scores for machine packages based on data completeness,
 * provenance quality, and field-level ambiguities. Manages ambiguity queues
 * for incomplete machine data that requires human resolution.
 *
 * Key features:
 * - Field-level confidence scoring (0-1 scale)
 * - Aggregate machine confidence with weighted components
 * - Ambiguity queue for unresolved data gaps
 * - Priority ranking for resolution tasks
 * - Confidence trend tracking over time
 *
 * @module engines/MachineConfidenceCalculatorEngine
 * @milestone MCAT-MS0/P1-U04
 */

import { log } from "../utils/Logger.js";
import type { MachineFieldProvenance, MachineAmbiguity, MachineConfidenceBreakdown, CanonicalMachinePackage } from "../types/MachinePackage.js";

// ============================================================================
// TYPES
// ============================================================================

export interface FieldConfidenceRule {
  field: string;
  weight: number;
  requiredForCalculator: boolean;
  minConfidence: number;
  penaltyIfMissing: number;
}

export interface ConfidenceResult {
  machineId: string;
  overall: number;
  breakdown: MachineConfidenceBreakdown;
  fieldScores: Record<string, number>;
  issues: ConfidenceIssue[];
  calculatorReady: boolean;
  timestamp: string;
}

export interface ConfidenceIssue {
  field: string;
  severity: "blocker" | "warning" | "info";
  message: string;
  suggestedAction?: string;
}

export interface AmbiguityQueueItem {
  id: string;
  machineId: string;
  ambiguity: MachineAmbiguity;
  priority: number;
  addedAt: string;
  assignedTo?: string;
  status: "pending" | "in_progress" | "resolved" | "deferred";
  resolutionNote?: string;
  resolvedAt?: string;
}

export interface AmbiguityQueueStats {
  total: number;
  pending: number;
  inProgress: number;
  resolved: number;
  deferred: number;
  byMachine: Record<string, number>;
  bySeverity: Record<string, number>;
  averageAge: number;
  oldestPending?: AmbiguityQueueItem;
}

// ============================================================================
// CONFIDENCE RULES
// ============================================================================

const FIELD_RULES: FieldConfidenceRule[] = [
  { field: "manufacturer", weight: 0.05, requiredForCalculator: true, minConfidence: 0.8, penaltyIfMissing: 0.1 },
  { field: "model", weight: 0.05, requiredForCalculator: true, minConfidence: 0.8, penaltyIfMissing: 0.1 },
  { field: "type", weight: 0.05, requiredForCalculator: true, minConfidence: 0.9, penaltyIfMissing: 0.15 },
  { field: "controller.family", weight: 0.1, requiredForCalculator: true, minConfidence: 0.7, penaltyIfMissing: 0.15 },
  { field: "controller.model", weight: 0.05, requiredForCalculator: false, minConfidence: 0.6, penaltyIfMissing: 0.05 },
  { field: "spindle.max_rpm", weight: 0.15, requiredForCalculator: true, minConfidence: 0.9, penaltyIfMissing: 0.25 },
  { field: "spindle.power", weight: 0.1, requiredForCalculator: true, minConfidence: 0.8, penaltyIfMissing: 0.15 },
  { field: "spindle.torque", weight: 0.08, requiredForCalculator: false, minConfidence: 0.7, penaltyIfMissing: 0.05 },
  { field: "envelope.x", weight: 0.05, requiredForCalculator: true, minConfidence: 0.8, penaltyIfMissing: 0.1 },
  { field: "envelope.y", weight: 0.05, requiredForCalculator: true, minConfidence: 0.8, penaltyIfMissing: 0.1 },
  { field: "envelope.z", weight: 0.05, requiredForCalculator: true, minConfidence: 0.8, penaltyIfMissing: 0.1 },
  { field: "coolant.type", weight: 0.07, requiredForCalculator: false, minConfidence: 0.7, penaltyIfMissing: 0.05 },
  { field: "coolant.pressure", weight: 0.05, requiredForCalculator: false, minConfidence: 0.6, penaltyIfMissing: 0.03 },
  { field: "axes.count", weight: 0.05, requiredForCalculator: true, minConfidence: 0.9, penaltyIfMissing: 0.1 },
  { field: "tool_changer.capacity", weight: 0.05, requiredForCalculator: false, minConfidence: 0.7, penaltyIfMissing: 0.03 },
];

const LAYER_CONFIDENCE: Record<string, number> = {
  "USER": 1.0,
  "LEVEL5": 0.95,
  "ENHANCED": 0.8,
  "BASIC": 0.6,
};

const MATCH_TYPE_CONFIDENCE: Record<string, number> = {
  "exact": 1.0,
  "alias": 0.95,
  "fuzzy": 0.7,
  "pattern": 0.6,
  "default": 0.3,
};

// ============================================================================
// ENGINE IMPLEMENTATION
// ============================================================================

class MachineConfidenceCalculatorEngine {
  private ambiguityQueue: Map<string, AmbiguityQueueItem> = new Map();
  private confidenceCache: Map<string, ConfidenceResult> = new Map();

  /**
   * Calculate confidence score for a machine package
   */
  calculateConfidence(
    pkg: CanonicalMachinePackage,
    provenance: Record<string, MachineFieldProvenance>
  ): ConfidenceResult {
    const fieldScores: Record<string, number> = {};
    const issues: ConfidenceIssue[] = [];
    let calculatorReady = true;

    for (const rule of FIELD_RULES) {
      const fieldValue = this.getNestedValue(pkg, rule.field);
      const fieldProv = provenance[rule.field];

      let score = 0;

      if (fieldValue === undefined || fieldValue === null || fieldValue === 0) {
        score = 0;
        if (rule.requiredForCalculator) {
          calculatorReady = false;
          issues.push({
            field: rule.field,
            severity: "blocker",
            message: `Missing required field: ${rule.field}`,
            suggestedAction: `Add ${rule.field} from manufacturer spec or user input`,
          });
        } else {
          issues.push({
            field: rule.field,
            severity: "warning",
            message: `Missing optional field: ${rule.field}`,
          });
        }
      } else if (fieldProv) {
        const layerConf = LAYER_CONFIDENCE[fieldProv.layer] ?? 0.5;
        const provConf = fieldProv.confidence ?? 0.5;
        score = Math.min(layerConf, provConf);

        if (score < rule.minConfidence && rule.requiredForCalculator) {
          issues.push({
            field: rule.field,
            severity: "warning",
            message: `Low confidence for ${rule.field}: ${(score * 100).toFixed(0)}% (need ${(rule.minConfidence * 100).toFixed(0)}%)`,
            suggestedAction: `Verify ${rule.field} from higher-authority source`,
          });
        }
      } else {
        score = 0.5;
      }

      fieldScores[rule.field] = score;
    }

    const breakdown = this.computeBreakdown(fieldScores);
    const overall = this.computeOverall(fieldScores, issues);

    const result: ConfidenceResult = {
      machineId: pkg.canonical_id,
      overall,
      breakdown,
      fieldScores,
      issues,
      calculatorReady,
      timestamp: new Date().toISOString(),
    };

    this.confidenceCache.set(pkg.canonical_id, result);
    return result;
  }

  private getNestedValue(obj: any, path: string): any {
    const parts = path.split(".");
    let current = obj;
    for (const part of parts) {
      if (current === undefined || current === null) return undefined;
      current = current[part];
    }
    return current;
  }

  private computeBreakdown(fieldScores: Record<string, number>): MachineConfidenceBreakdown {
    const avg = (keys: string[]): number => {
      const scores = keys.map(k => fieldScores[k] ?? 0).filter(s => s > 0);
      return scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    };

    const breakdown: MachineConfidenceBreakdown = {
      controller: avg(["controller.family", "controller.model"]),
      spindle: avg(["spindle.max_rpm", "spindle.power", "spindle.torque"]),
      coolant: avg(["coolant.type", "coolant.pressure"]),
      envelope: avg(["envelope.x", "envelope.y", "envelope.z"]),
      axes: avg(["axes.count"]),
      tool_changer: avg(["tool_changer.capacity"]),
      overall: 0,
    };

    const weights = { controller: 0.2, spindle: 0.3, coolant: 0.1, envelope: 0.2, axes: 0.1, tool_changer: 0.1 };
    breakdown.overall = Object.entries(weights).reduce(
      (sum, [k, w]) => sum + (breakdown[k as keyof typeof breakdown] as number) * w,
      0
    );

    return breakdown;
  }

  private computeOverall(fieldScores: Record<string, number>, issues: ConfidenceIssue[]): number {
    let weighted = 0;
    let totalWeight = 0;

    for (const rule of FIELD_RULES) {
      const score = fieldScores[rule.field] ?? 0;
      weighted += score * rule.weight;
      totalWeight += rule.weight;
    }

    let overall = totalWeight > 0 ? weighted / totalWeight : 0;

    const blockers = issues.filter(i => i.severity === "blocker").length;
    const warnings = issues.filter(i => i.severity === "warning").length;

    overall -= blockers * 0.1;
    overall -= warnings * 0.02;

    return Math.max(0, Math.min(1, overall));
  }

  // ============================================================================
  // AMBIGUITY QUEUE MANAGEMENT
  // ============================================================================

  /**
   * Add ambiguities from a merge result to the queue
   */
  queueAmbiguities(machineId: string, ambiguities: MachineAmbiguity[]): void {
    for (const amb of ambiguities) {
      const priority = this.computePriority(amb);
      const item: AmbiguityQueueItem = {
        id: amb.id,
        machineId,
        ambiguity: amb,
        priority,
        addedAt: new Date().toISOString(),
        status: "pending",
      };
      this.ambiguityQueue.set(amb.id, item);
      log.info(`[MachineConfidenceCalculator] Queued ambiguity ${amb.id} for ${machineId} with priority ${priority}`);
    }
  }

  private computePriority(amb: MachineAmbiguity): number {
    let priority = 50;

    if (amb.severity === "blocker") priority += 40;
    else if (amb.severity === "warning") priority += 20;
    else priority += 10;

    const requiredFields = FIELD_RULES.filter(r => r.requiredForCalculator).map(r => r.field);
    if (requiredFields.some(f => amb.field_path.startsWith(f))) {
      priority += 20;
    }

    return Math.min(100, priority);
  }

  /**
   * Get next ambiguity to resolve (highest priority pending)
   */
  getNextToResolve(): AmbiguityQueueItem | null {
    const pending = Array.from(this.ambiguityQueue.values())
      .filter(item => item.status === "pending")
      .sort((a, b) => b.priority - a.priority);

    return pending[0] ?? null;
  }

  /**
   * Get all pending ambiguities for a machine
   */
  getMachineAmbiguities(machineId: string): AmbiguityQueueItem[] {
    return Array.from(this.ambiguityQueue.values())
      .filter(item => item.machineId === machineId)
      .sort((a, b) => b.priority - a.priority);
  }

  /**
   * Mark an ambiguity as resolved
   */
  resolveAmbiguity(
    ambiguityId: string,
    resolution: { value: any; source: string; note?: string }
  ): boolean {
    const item = this.ambiguityQueue.get(ambiguityId);
    if (!item) return false;

    item.status = "resolved";
    item.resolvedAt = new Date().toISOString();
    item.resolutionNote = resolution.note ?? `Resolved with value: ${JSON.stringify(resolution.value)}`;

    log.info(`[MachineConfidenceCalculator] Resolved ambiguity ${ambiguityId}`);
    return true;
  }

  /**
   * Defer an ambiguity (low priority, revisit later)
   */
  deferAmbiguity(ambiguityId: string, reason: string): boolean {
    const item = this.ambiguityQueue.get(ambiguityId);
    if (!item) return false;

    item.status = "deferred";
    item.resolutionNote = reason;
    item.priority = Math.max(0, item.priority - 30);

    return true;
  }

  /**
   * Claim an ambiguity for resolution
   */
  claimAmbiguity(ambiguityId: string, assignee: string): boolean {
    const item = this.ambiguityQueue.get(ambiguityId);
    if (!item || item.status !== "pending") return false;

    item.status = "in_progress";
    item.assignedTo = assignee;

    return true;
  }

  /**
   * Get queue statistics
   */
  getQueueStats(): AmbiguityQueueStats {
    const items = Array.from(this.ambiguityQueue.values());
    const now = Date.now();

    const byMachine: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};
    let totalAge = 0;
    let oldestPending: AmbiguityQueueItem | undefined;

    for (const item of items) {
      byMachine[item.machineId] = (byMachine[item.machineId] ?? 0) + 1;
      bySeverity[item.ambiguity.severity] = (bySeverity[item.ambiguity.severity] ?? 0) + 1;

      const age = now - new Date(item.addedAt).getTime();
      totalAge += age;

      if (item.status === "pending") {
        if (!oldestPending || new Date(item.addedAt) < new Date(oldestPending.addedAt)) {
          oldestPending = item;
        }
      }
    }

    return {
      total: items.length,
      pending: items.filter(i => i.status === "pending").length,
      inProgress: items.filter(i => i.status === "in_progress").length,
      resolved: items.filter(i => i.status === "resolved").length,
      deferred: items.filter(i => i.status === "deferred").length,
      byMachine,
      bySeverity,
      averageAge: items.length > 0 ? totalAge / items.length / (1000 * 60 * 60) : 0,
      oldestPending,
    };
  }

  // ============================================================================
  // CONFIDENCE THRESHOLDS
  // ============================================================================

  /**
   * Check if machine is ready for calculator use
   */
  isCalculatorReady(machineId: string): boolean {
    const cached = this.confidenceCache.get(machineId);
    return cached?.calculatorReady ?? false;
  }

  /**
   * Get machines below confidence threshold
   */
  getLowConfidenceMachines(threshold: number = 0.7): ConfidenceResult[] {
    return Array.from(this.confidenceCache.values())
      .filter(r => r.overall < threshold)
      .sort((a, b) => a.overall - b.overall);
  }

  /**
   * Get machines with unresolved blockers
   */
  getBlockedMachines(): ConfidenceResult[] {
    return Array.from(this.confidenceCache.values())
      .filter(r => r.issues.some(i => i.severity === "blocker"))
      .sort((a, b) => {
        const aBlockers = a.issues.filter(i => i.severity === "blocker").length;
        const bBlockers = b.issues.filter(i => i.severity === "blocker").length;
        return bBlockers - aBlockers;
      });
  }

  // ============================================================================
  // SELF-AWARENESS
  // ============================================================================

  getSelfAwareness() {
    const stats = this.getQueueStats();
    return {
      engine: "MachineConfidenceCalculatorEngine",
      purpose: "Calculate confidence scores for machine packages and manage ambiguity resolution queue",
      milestone: "MCAT-MS0/P1-U04",
      capabilities: [
        "calculateConfidence",
        "queueAmbiguities",
        "getNextToResolve",
        "getMachineAmbiguities",
        "resolveAmbiguity",
        "deferAmbiguity",
        "claimAmbiguity",
        "getQueueStats",
        "isCalculatorReady",
        "getLowConfidenceMachines",
        "getBlockedMachines",
      ],
      fieldRulesCount: FIELD_RULES.length,
      queueStats: stats,
      confidenceThresholds: {
        calculatorReady: 0.7,
        lowConfidence: 0.7,
        blockerPenalty: 0.1,
        warningPenalty: 0.02,
      },
    };
  }
}

export const machineConfidenceCalculatorEngine = new MachineConfidenceCalculatorEngine();
