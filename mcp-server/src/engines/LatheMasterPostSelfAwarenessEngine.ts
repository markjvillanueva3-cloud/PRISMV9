/**
 * LatheMasterPostSelfAwarenessEngine — LATHE-MASTER U-LTH27
 *
 * Continuously audits lathe sub-posts to detect drift (dialect changes,
 * new validator failures) and flags for regeneration. Produces remediation
 * recommendations based on detected issues.
 *
 * Exit Gate: Seeded drift detection produces remediation recommendation.
 *
 * @module LatheMasterPostSelfAwarenessEngine
 * @version 1.0.0
 * @milestone LATHE-MASTER U-LTH27
 */

import { z } from "zod";

// ── Types ───────────────────────────────────────────────────────────────────

export type SubPostDialect = "okuma" | "fanuc" | "mitsubishi" | "haas" | "mazak" | "citizen" | "generic";

export interface SubPostEntry {
  id: string;
  name: string;
  dialect: SubPostDialect;
  version: string;
  lastAuditedAt: string;
  lastModifiedAt: string;
  machineIds: string[];
  features: SubPostFeatures;
  validationStatus: ValidationStatus;
  checksum: string;
}

export interface SubPostFeatures {
  cssSupport: boolean;
  cannedCycles: string[];
  liveTooling: boolean;
  subSpindle: boolean;
  cAxis: boolean;
  yAxis: boolean;
  bAxis: boolean;
  barFeeder: boolean;
  partCatcher: boolean;
}

export interface ValidationStatus {
  lastValidatedAt: string;
  passed: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  parityPercent: number;
  safetyCriticalCount: number;
}

export interface ValidationError {
  code: string;
  message: string;
  severity: "critical" | "major" | "minor";
  lineNumber?: number;
  block?: string;
}

export interface ValidationWarning {
  code: string;
  message: string;
  suggestion?: string;
}

export interface DriftDetectionResult {
  subPostId: string;
  hasDrift: boolean;
  driftType: DriftType[];
  driftSeverity: "none" | "low" | "medium" | "high" | "critical";
  detectedAt: string;
  changes: DriftChange[];
  requiresRegeneration: boolean;
  remediationRecommendations: RemediationRecommendation[];
}

export type DriftType =
  | "dialect_change"
  | "feature_change"
  | "validation_failure"
  | "parity_drop"
  | "safety_divergence"
  | "version_mismatch"
  | "checksum_mismatch"
  | "missing_sub_post"
  | "orphaned_sub_post";

export interface DriftChange {
  type: DriftType;
  field?: string;
  previousValue: string | number | boolean | null;
  currentValue: string | number | boolean | null;
  description: string;
  impact: "low" | "medium" | "high";
}

export interface RemediationRecommendation {
  priority: number;
  action: RemediationAction;
  description: string;
  estimatedEffort: "trivial" | "small" | "medium" | "large";
  automated: boolean;
  steps: string[];
}

export type RemediationAction =
  | "regenerate_sub_post"
  | "update_dialect_mapping"
  | "fix_validation_errors"
  | "restore_parity"
  | "address_safety_issues"
  | "sync_version"
  | "recalculate_checksum"
  | "register_sub_post"
  | "remove_orphaned_post"
  | "update_features";

export interface AuditReport {
  auditId: string;
  auditedAt: string;
  totalSubPosts: number;
  audited: number;
  passed: number;
  failed: number;
  driftDetected: number;
  criticalIssues: number;
  results: DriftDetectionResult[];
  summary: AuditSummary;
}

export interface AuditSummary {
  healthStatus: "healthy" | "degraded" | "critical";
  overallScore: number;
  topIssues: string[];
  immediateActions: string[];
  scheduledMaintenance: string[];
}

export interface SubPostSnapshot {
  subPostId: string;
  capturedAt: string;
  dialect: SubPostDialect;
  version: string;
  features: SubPostFeatures;
  validationStatus: ValidationStatus;
  checksum: string;
}

// ── Zod Schemas ─────────────────────────────────────────────────────────────

const SubPostDialectSchema = z.enum(["okuma", "fanuc", "mitsubishi", "haas", "mazak", "citizen", "generic"]);

const SubPostFeaturesSchema = z.object({
  cssSupport: z.boolean(),
  cannedCycles: z.array(z.string()),
  liveTooling: z.boolean(),
  subSpindle: z.boolean(),
  cAxis: z.boolean(),
  yAxis: z.boolean(),
  bAxis: z.boolean(),
  barFeeder: z.boolean(),
  partCatcher: z.boolean(),
});

const ValidationErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  severity: z.enum(["critical", "major", "minor"]),
  lineNumber: z.number().optional(),
  block: z.string().optional(),
});

const ValidationStatusSchema = z.object({
  lastValidatedAt: z.string(),
  passed: z.boolean(),
  errors: z.array(ValidationErrorSchema),
  warnings: z.array(z.object({
    code: z.string(),
    message: z.string(),
    suggestion: z.string().optional(),
  })),
  parityPercent: z.number().min(0).max(100),
  safetyCriticalCount: z.number().min(0),
});

export const SubPostEntrySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  dialect: SubPostDialectSchema,
  version: z.string(),
  lastAuditedAt: z.string(),
  lastModifiedAt: z.string(),
  machineIds: z.array(z.string()),
  features: SubPostFeaturesSchema,
  validationStatus: ValidationStatusSchema,
  checksum: z.string(),
});

export const AuditConfigSchema = z.object({
  includeOrphans: z.boolean().optional().default(true),
  parityThreshold: z.number().min(0).max(100).optional().default(95),
  maxSafetyDivergences: z.number().min(0).optional().default(0),
  validateAll: z.boolean().optional().default(false),
});

export const RegisterSubPostInputSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  dialect: SubPostDialectSchema,
  version: z.string().default("1.0.0"),
  machineIds: z.array(z.string()).default([]),
  features: SubPostFeaturesSchema.optional(),
});

export type AuditConfig = z.infer<typeof AuditConfigSchema>;
export type RegisterSubPostInput = z.infer<typeof RegisterSubPostInputSchema>;

// ── In-Memory Registry ──────────────────────────────────────────────────────

const subPostRegistry: Map<string, SubPostEntry> = new Map();
const snapshotHistory: Map<string, SubPostSnapshot[]> = new Map();

// ── Engine Implementation ───────────────────────────────────────────────────

export class LatheMasterPostSelfAwarenessEngine {
  private static readonly VERSION = "1.0.0";
  private static readonly PARITY_THRESHOLD = 95;
  private static readonly MAX_SNAPSHOTS_PER_POST = 10;

  /**
   * Register a new sub-post or update existing one.
   */
  static registerSubPost(input: RegisterSubPostInput): SubPostEntry {
    const validated = RegisterSubPostInputSchema.parse(input);
    const now = new Date().toISOString();

    const features: SubPostFeatures = validated.features ?? {
      cssSupport: true,
      cannedCycles: ["G70", "G71", "G72", "G73", "G74", "G75", "G76"],
      liveTooling: false,
      subSpindle: false,
      cAxis: false,
      yAxis: false,
      bAxis: false,
      barFeeder: false,
      partCatcher: false,
    };

    const entry: SubPostEntry = {
      id: validated.id,
      name: validated.name,
      dialect: validated.dialect,
      version: validated.version,
      lastAuditedAt: now,
      lastModifiedAt: now,
      machineIds: validated.machineIds,
      features,
      validationStatus: {
        lastValidatedAt: now,
        passed: true,
        errors: [],
        warnings: [],
        parityPercent: 100,
        safetyCriticalCount: 0,
      },
      checksum: this.computeChecksum(validated.id, validated.version, features),
    };

    subPostRegistry.set(validated.id, entry);
    this.captureSnapshot(entry);

    return entry;
  }

  /**
   * Get a registered sub-post by ID.
   */
  static getSubPost(id: string): SubPostEntry | undefined {
    return subPostRegistry.get(id);
  }

  /**
   * Get all registered sub-posts.
   */
  static getAllSubPosts(): SubPostEntry[] {
    return Array.from(subPostRegistry.values());
  }

  /**
   * Get sub-posts by dialect.
   */
  static getSubPostsByDialect(dialect: SubPostDialect): SubPostEntry[] {
    return this.getAllSubPosts().filter(p => p.dialect === dialect);
  }

  /**
   * Detect drift for a specific sub-post.
   */
  static detectDrift(
    subPostId: string,
    currentState?: Partial<SubPostEntry>,
  ): DriftDetectionResult {
    const entry = subPostRegistry.get(subPostId);
    const now = new Date().toISOString();

    if (!entry) {
      return {
        subPostId,
        hasDrift: true,
        driftType: ["missing_sub_post"],
        driftSeverity: "critical",
        detectedAt: now,
        changes: [{
          type: "missing_sub_post",
          previousValue: null,
          currentValue: null,
          description: `Sub-post '${subPostId}' is not registered`,
          impact: "high",
        }],
        requiresRegeneration: true,
        remediationRecommendations: [{
          priority: 1,
          action: "register_sub_post",
          description: "Register the missing sub-post",
          estimatedEffort: "small",
          automated: true,
          steps: [
            "Identify the dialect for this sub-post",
            "Register via registerSubPost()",
            "Run full validation suite",
          ],
        }],
      };
    }

    const changes: DriftChange[] = [];
    const driftTypes: DriftType[] = [];

    // Check dialect drift
    if (currentState?.dialect && currentState.dialect !== entry.dialect) {
      driftTypes.push("dialect_change");
      changes.push({
        type: "dialect_change",
        field: "dialect",
        previousValue: entry.dialect,
        currentValue: currentState.dialect,
        description: `Dialect changed from '${entry.dialect}' to '${currentState.dialect}'`,
        impact: "high",
      });
    }

    // Check version drift
    if (currentState?.version && currentState.version !== entry.version) {
      driftTypes.push("version_mismatch");
      changes.push({
        type: "version_mismatch",
        field: "version",
        previousValue: entry.version,
        currentValue: currentState.version,
        description: `Version changed from '${entry.version}' to '${currentState.version}'`,
        impact: "medium",
      });
    }

    // Check feature drift
    if (currentState?.features) {
      const featureChanges = this.detectFeatureDrift(entry.features, currentState.features);
      if (featureChanges.length > 0) {
        driftTypes.push("feature_change");
        changes.push(...featureChanges);
      }
    }

    // Check validation status drift
    if (currentState?.validationStatus) {
      const valChanges = this.detectValidationDrift(
        entry.validationStatus,
        currentState.validationStatus,
      );
      if (valChanges.length > 0) {
        for (const change of valChanges) {
          if (!driftTypes.includes(change.type)) {
            driftTypes.push(change.type);
          }
        }
        changes.push(...valChanges);
      }
    }

    // Check checksum
    if (currentState?.checksum && currentState.checksum !== entry.checksum) {
      driftTypes.push("checksum_mismatch");
      changes.push({
        type: "checksum_mismatch",
        field: "checksum",
        previousValue: entry.checksum,
        currentValue: currentState.checksum,
        description: "Checksum mismatch indicates unauthorized changes",
        impact: "high",
      });
    }

    const severity = this.computeDriftSeverity(changes);
    const requiresRegeneration = severity === "critical" || severity === "high" ||
      driftTypes.includes("safety_divergence");
    const recommendations = this.generateRemediations(driftTypes, changes, entry);

    return {
      subPostId,
      hasDrift: changes.length > 0,
      driftType: driftTypes,
      driftSeverity: severity,
      detectedAt: now,
      changes,
      requiresRegeneration,
      remediationRecommendations: recommendations,
    };
  }

  /**
   * Perform a full audit of all registered sub-posts.
   */
  static auditAllSubPosts(config?: AuditConfig): AuditReport {
    const cfg = AuditConfigSchema.parse(config ?? {});
    const now = new Date().toISOString();
    const auditId = `audit-${Date.now()}`;

    const subPosts = this.getAllSubPosts();
    const results: DriftDetectionResult[] = [];
    let passed = 0;
    let failed = 0;
    let driftDetected = 0;
    let criticalIssues = 0;

    for (const post of subPosts) {
      // Simulate current state check (in production would read actual files)
      const currentState = this.simulateCurrentState(post, cfg);
      const result = this.detectDrift(post.id, currentState);

      results.push(result);

      if (result.hasDrift) {
        driftDetected++;
        if (result.driftSeverity === "critical") {
          criticalIssues++;
          failed++;
        } else if (result.driftSeverity === "high") {
          failed++;
        } else {
          passed++;
        }
      } else {
        passed++;
      }

      // Update last audited timestamp
      post.lastAuditedAt = now;
    }

    const summary = this.generateAuditSummary(results, subPosts.length);

    return {
      auditId,
      auditedAt: now,
      totalSubPosts: subPosts.length,
      audited: subPosts.length,
      passed,
      failed,
      driftDetected,
      criticalIssues,
      results,
      summary,
    };
  }

  /**
   * Update validation status for a sub-post (after running validator).
   */
  static updateValidationStatus(
    subPostId: string,
    status: ValidationStatus,
  ): SubPostEntry | null {
    const entry = subPostRegistry.get(subPostId);
    if (!entry) return null;

    const previousStatus = entry.validationStatus;
    entry.validationStatus = status;
    entry.lastModifiedAt = new Date().toISOString();

    // Capture snapshot if status changed significantly
    if (previousStatus.passed !== status.passed ||
        Math.abs(previousStatus.parityPercent - status.parityPercent) > 5 ||
        previousStatus.safetyCriticalCount !== status.safetyCriticalCount) {
      this.captureSnapshot(entry);
    }

    return entry;
  }

  /**
   * Get snapshot history for a sub-post.
   */
  static getSnapshotHistory(subPostId: string): SubPostSnapshot[] {
    return snapshotHistory.get(subPostId) ?? [];
  }

  /**
   * Seed drift detection for testing (exit gate validation).
   */
  static seedDriftForTesting(
    subPostId: string,
    driftType: DriftType,
    driftDetails: Partial<SubPostEntry>,
  ): DriftDetectionResult {
    if (!subPostRegistry.has(subPostId)) {
      this.registerSubPost({
        id: subPostId,
        name: `Test Post ${subPostId}`,
        dialect: "generic",
        version: "1.0.0",
        machineIds: [],
      });
    }

    return this.detectDrift(subPostId, driftDetails);
  }

  /**
   * Clear registry (for testing).
   */
  static clearRegistry(): void {
    subPostRegistry.clear();
    snapshotHistory.clear();
  }

  /**
   * Get engine version.
   */
  static getVersion(): string {
    return this.VERSION;
  }

  /**
   * Get registry statistics.
   */
  static getStatistics(): {
    totalSubPosts: number;
    byDialect: Record<SubPostDialect, number>;
    byValidationStatus: { passed: number; failed: number };
    totalSnapshots: number;
  } {
    const posts = this.getAllSubPosts();
    const byDialect: Record<SubPostDialect, number> = {
      okuma: 0,
      fanuc: 0,
      mitsubishi: 0,
      haas: 0,
      mazak: 0,
      citizen: 0,
      generic: 0,
    };

    let passed = 0;
    let failed = 0;
    let totalSnapshots = 0;

    for (const post of posts) {
      byDialect[post.dialect]++;
      if (post.validationStatus.passed) {
        passed++;
      } else {
        failed++;
      }
    }

    for (const history of snapshotHistory.values()) {
      totalSnapshots += history.length;
    }

    return {
      totalSubPosts: posts.length,
      byDialect,
      byValidationStatus: { passed, failed },
      totalSnapshots,
    };
  }

  // ── Private Helpers ─────────────────────────────────────────────────────────

  private static computeChecksum(id: string, version: string, features: SubPostFeatures): string {
    const data = JSON.stringify({ id, version, features });
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(8, "0");
  }

  private static captureSnapshot(entry: SubPostEntry): void {
    const snapshot: SubPostSnapshot = {
      subPostId: entry.id,
      capturedAt: new Date().toISOString(),
      dialect: entry.dialect,
      version: entry.version,
      features: { ...entry.features },
      validationStatus: { ...entry.validationStatus },
      checksum: entry.checksum,
    };

    let history = snapshotHistory.get(entry.id);
    if (!history) {
      history = [];
      snapshotHistory.set(entry.id, history);
    }

    history.push(snapshot);

    // Keep only last N snapshots
    if (history.length > this.MAX_SNAPSHOTS_PER_POST) {
      history.shift();
    }
  }

  private static detectFeatureDrift(
    previous: SubPostFeatures,
    current: SubPostFeatures,
  ): DriftChange[] {
    const changes: DriftChange[] = [];

    const checkField = (field: keyof SubPostFeatures) => {
      const prev = previous[field];
      const curr = current[field];
      if (JSON.stringify(prev) !== JSON.stringify(curr)) {
        changes.push({
          type: "feature_change",
          field,
          previousValue: typeof prev === "object" ? JSON.stringify(prev) : prev,
          currentValue: typeof curr === "object" ? JSON.stringify(curr) : curr,
          description: `Feature '${field}' changed`,
          impact: field === "cssSupport" || field === "liveTooling" ? "high" : "medium",
        });
      }
    };

    checkField("cssSupport");
    checkField("liveTooling");
    checkField("subSpindle");
    checkField("cAxis");
    checkField("yAxis");
    checkField("bAxis");
    checkField("barFeeder");
    checkField("partCatcher");

    // Check canned cycles separately
    const prevCycles = new Set(previous.cannedCycles);
    const currCycles = new Set(current.cannedCycles);
    const addedCycles = [...currCycles].filter(c => !prevCycles.has(c));
    const removedCycles = [...prevCycles].filter(c => !currCycles.has(c));

    if (addedCycles.length > 0 || removedCycles.length > 0) {
      changes.push({
        type: "feature_change",
        field: "cannedCycles",
        previousValue: previous.cannedCycles.join(","),
        currentValue: current.cannedCycles.join(","),
        description: `Canned cycles changed: +[${addedCycles.join(",")}] -[${removedCycles.join(",")}]`,
        impact: "medium",
      });
    }

    return changes;
  }

  private static detectValidationDrift(
    previous: ValidationStatus,
    current: ValidationStatus,
  ): DriftChange[] {
    const changes: DriftChange[] = [];

    // Check pass/fail status change
    if (previous.passed && !current.passed) {
      changes.push({
        type: "validation_failure",
        field: "passed",
        previousValue: true,
        currentValue: false,
        description: "Validation status changed from passed to failed",
        impact: "high",
      });
    }

    // Check parity drop
    if (current.parityPercent < previous.parityPercent - 5) {
      changes.push({
        type: "parity_drop",
        field: "parityPercent",
        previousValue: previous.parityPercent,
        currentValue: current.parityPercent,
        description: `Parity dropped from ${previous.parityPercent}% to ${current.parityPercent}%`,
        impact: current.parityPercent < this.PARITY_THRESHOLD ? "high" : "medium",
      });
    }

    // Check safety divergences
    if (current.safetyCriticalCount > previous.safetyCriticalCount) {
      changes.push({
        type: "safety_divergence",
        field: "safetyCriticalCount",
        previousValue: previous.safetyCriticalCount,
        currentValue: current.safetyCriticalCount,
        description: `Safety-critical divergences increased from ${previous.safetyCriticalCount} to ${current.safetyCriticalCount}`,
        impact: "high",
      });
    }

    // Check for new errors
    const newErrors = current.errors.filter(
      e => !previous.errors.some(pe => pe.code === e.code && pe.message === e.message),
    );
    if (newErrors.length > 0) {
      const criticalNew = newErrors.filter(e => e.severity === "critical");
      if (criticalNew.length > 0) {
        changes.push({
          type: "validation_failure",
          field: "errors",
          previousValue: previous.errors.length,
          currentValue: current.errors.length,
          description: `${criticalNew.length} new critical validation errors`,
          impact: "high",
        });
      }
    }

    return changes;
  }

  private static computeDriftSeverity(changes: DriftChange[]): DriftDetectionResult["driftSeverity"] {
    if (changes.length === 0) return "none";

    const highImpact = changes.filter(c => c.impact === "high").length;
    const mediumImpact = changes.filter(c => c.impact === "medium").length;

    const hasSafety = changes.some(c => c.type === "safety_divergence");
    const hasDialect = changes.some(c => c.type === "dialect_change");

    if (hasSafety || highImpact >= 3) return "critical";
    if (hasDialect || highImpact >= 2) return "high";
    if (highImpact >= 1 || mediumImpact >= 3) return "medium";
    return "low";
  }

  private static generateRemediations(
    driftTypes: DriftType[],
    changes: DriftChange[],
    entry: SubPostEntry,
  ): RemediationRecommendation[] {
    const recommendations: RemediationRecommendation[] = [];

    if (driftTypes.includes("safety_divergence")) {
      recommendations.push({
        priority: 1,
        action: "address_safety_issues",
        description: "Address safety-critical divergences immediately",
        estimatedEffort: "medium",
        automated: false,
        steps: [
          "Review all safety-critical divergences",
          "Compare against reference JM Die programs",
          "Update post-processor logic to match safe patterns",
          "Regenerate and revalidate",
        ],
      });
    }

    if (driftTypes.includes("dialect_change")) {
      recommendations.push({
        priority: 2,
        action: "update_dialect_mapping",
        description: `Update dialect mapping for ${entry.id}`,
        estimatedEffort: "small",
        automated: true,
        steps: [
          "Update dialect in router configuration",
          "Verify controller-to-dialect mapping",
          "Run dialect-specific validation suite",
        ],
      });
    }

    if (driftTypes.includes("validation_failure")) {
      recommendations.push({
        priority: 2,
        action: "fix_validation_errors",
        description: "Fix validation errors before production use",
        estimatedEffort: "medium",
        automated: false,
        steps: [
          "Review validation error details",
          "Fix structural issues in post output",
          "Ensure modal state consistency",
          "Rerun validation suite",
        ],
      });
    }

    if (driftTypes.includes("parity_drop")) {
      recommendations.push({
        priority: 3,
        action: "restore_parity",
        description: "Restore structural parity with reference programs",
        estimatedEffort: "large",
        automated: false,
        steps: [
          "Diff generated output against reference .MIN files",
          "Identify structural divergences",
          "Update post-processor templates",
          "Validate parity ≥95%",
        ],
      });
    }

    if (driftTypes.includes("version_mismatch")) {
      recommendations.push({
        priority: 4,
        action: "sync_version",
        description: "Synchronize version numbers",
        estimatedEffort: "trivial",
        automated: true,
        steps: [
          "Update registry version",
          "Recalculate checksum",
          "Update snapshot history",
        ],
      });
    }

    if (driftTypes.includes("checksum_mismatch")) {
      recommendations.push({
        priority: 3,
        action: "recalculate_checksum",
        description: "Investigate checksum mismatch",
        estimatedEffort: "small",
        automated: true,
        steps: [
          "Determine if change was authorized",
          "If authorized: recalculate and update checksum",
          "If unauthorized: revert to last known good state",
        ],
      });
    }

    if (driftTypes.includes("feature_change")) {
      recommendations.push({
        priority: 4,
        action: "update_features",
        description: "Update feature registry to reflect actual capabilities",
        estimatedEffort: "trivial",
        automated: true,
        steps: [
          "Review feature changes",
          "Update feature flags in registry",
          "Ensure router reflects new capabilities",
        ],
      });
    }

    // Sort by priority
    return recommendations.sort((a, b) => a.priority - b.priority);
  }

  private static simulateCurrentState(
    post: SubPostEntry,
    _config: AuditConfig,
  ): Partial<SubPostEntry> {
    // In production, this would read actual post files and run validators
    // For now, return the entry as-is (no drift)
    return {
      dialect: post.dialect,
      version: post.version,
      features: post.features,
      validationStatus: post.validationStatus,
      checksum: post.checksum,
    };
  }

  private static generateAuditSummary(
    results: DriftDetectionResult[],
    total: number,
  ): AuditSummary {
    const criticalResults = results.filter(r => r.driftSeverity === "critical");
    const highResults = results.filter(r => r.driftSeverity === "high");
    const driftResults = results.filter(r => r.hasDrift);

    let healthStatus: AuditSummary["healthStatus"];
    let overallScore: number;

    if (criticalResults.length > 0) {
      healthStatus = "critical";
      overallScore = Math.max(0, 100 - (criticalResults.length * 25) - (highResults.length * 10));
    } else if (highResults.length > 0 || driftResults.length > total * 0.3) {
      healthStatus = "degraded";
      overallScore = Math.max(50, 100 - (highResults.length * 15) - (driftResults.length * 5));
    } else {
      healthStatus = "healthy";
      overallScore = Math.max(70, 100 - (driftResults.length * 3));
    }

    const topIssues: string[] = [];
    const immediateActions: string[] = [];
    const scheduledMaintenance: string[] = [];

    for (const result of criticalResults.slice(0, 3)) {
      topIssues.push(`CRITICAL: ${result.subPostId} - ${result.driftType.join(", ")}`);
      if (result.remediationRecommendations.length > 0) {
        immediateActions.push(result.remediationRecommendations[0].description);
      }
    }

    for (const result of highResults.slice(0, 3)) {
      if (topIssues.length < 5) {
        topIssues.push(`HIGH: ${result.subPostId} - ${result.driftType.join(", ")}`);
      }
      if (result.remediationRecommendations.length > 0) {
        scheduledMaintenance.push(result.remediationRecommendations[0].description);
      }
    }

    return {
      healthStatus,
      overallScore: Math.round(overallScore),
      topIssues,
      immediateActions,
      scheduledMaintenance,
    };
  }
}

// Export singleton (instance methods forward to static)
export const latheMasterPostSelfAwarenessEngine = {
  registerSubPost: LatheMasterPostSelfAwarenessEngine.registerSubPost.bind(LatheMasterPostSelfAwarenessEngine),
  getSubPost: LatheMasterPostSelfAwarenessEngine.getSubPost.bind(LatheMasterPostSelfAwarenessEngine),
  getAllSubPosts: LatheMasterPostSelfAwarenessEngine.getAllSubPosts.bind(LatheMasterPostSelfAwarenessEngine),
  getSubPostsByDialect: LatheMasterPostSelfAwarenessEngine.getSubPostsByDialect.bind(LatheMasterPostSelfAwarenessEngine),
  detectDrift: LatheMasterPostSelfAwarenessEngine.detectDrift.bind(LatheMasterPostSelfAwarenessEngine),
  auditAllSubPosts: LatheMasterPostSelfAwarenessEngine.auditAllSubPosts.bind(LatheMasterPostSelfAwarenessEngine),
  updateValidationStatus: LatheMasterPostSelfAwarenessEngine.updateValidationStatus.bind(LatheMasterPostSelfAwarenessEngine),
  getSnapshotHistory: LatheMasterPostSelfAwarenessEngine.getSnapshotHistory.bind(LatheMasterPostSelfAwarenessEngine),
  seedDriftForTesting: LatheMasterPostSelfAwarenessEngine.seedDriftForTesting.bind(LatheMasterPostSelfAwarenessEngine),
  clearRegistry: LatheMasterPostSelfAwarenessEngine.clearRegistry.bind(LatheMasterPostSelfAwarenessEngine),
  getVersion: LatheMasterPostSelfAwarenessEngine.getVersion.bind(LatheMasterPostSelfAwarenessEngine),
  getStatistics: LatheMasterPostSelfAwarenessEngine.getStatistics.bind(LatheMasterPostSelfAwarenessEngine),
};
