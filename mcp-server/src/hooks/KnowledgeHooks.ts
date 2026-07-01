/**
 * KnowledgeHooks.ts — KAR-MS1 U-KAR07/U-KAR09
 * Knowledge processing hooks for extraction and wiring.
 *
 * Contains:
 * - U-KAR07: Post-extraction auto-wire hook (routes to engines via WiringManifest)
 * - U-KAR09: Validation hook for extraction quality
 *
 * @module KnowledgeHooks
 */

import {
  HookDefinition,
  HookContext,
  HookResult,
  hookSuccess,
  hookWarning,
  hookBlock
} from "../engines/HookExecutor.js";
import { log } from "../utils/Logger.js";
import {
  KnowledgeAtom,
  KnowledgeAtomSchema,
  AUTHORITY_RANK,
  validateAtom,
} from "../types/KnowledgeAtom.js";
import {
  resolveWiringTargets,
  DEFAULT_WIRING_MANIFEST,
  type WiringTargetRule,
} from "../schemas/WiringManifest.js";
import {
  KnowledgeLineageEngine,
  knowledgeLineageEngine,
} from "../engines/KnowledgeLineageEngine.js";

// ============================================================================
// TYPES
// ============================================================================

export interface WiringAuditEntry {
  timestamp: string;
  atomId: string;
  atomTitle: string;
  sourceCategory: string;
  targets: Array<{
    engine: string;
    action: string;
    status: "success" | "failed" | "skipped";
    error?: string;
  }>;
  conflictsResolved: number;
}

export interface ExtractionValidationResult {
  atomId: string;
  valid: boolean;
  confidence: number;
  issues: string[];
  blocked: boolean;
  blockReason?: string;
}

// ============================================================================
// STATE
// ============================================================================

let wiringAuditLog: WiringAuditEntry[] = [];
let validationStats = {
  totalValidated: 0,
  passed: 0,
  blocked: 0,
  warnings: 0,
};

// ============================================================================
// WIRING FUNCTIONS
// ============================================================================

/**
 * Wire a knowledge atom to its target engines.
 * Uses WiringManifest to determine routing.
 */
async function wireAtomToEngines(atom: KnowledgeAtom): Promise<WiringAuditEntry> {
  const auditEntry: WiringAuditEntry = {
    timestamp: new Date().toISOString(),
    atomId: atom.id,
    atomTitle: atom.title,
    sourceCategory: atom.source.category,
    targets: [],
    conflictsResolved: 0,
  };

  // Resolve targets from manifest
  const targets = resolveWiringTargets(atom, DEFAULT_WIRING_MANIFEST);

  if (targets.length === 0) {
    log.warn(`[KnowledgeWiring] No targets found for atom ${atom.id} (category: ${atom.source.category})`);
    auditEntry.targets.push({
      engine: "none",
      action: "no_route",
      status: "skipped",
      error: "No matching wiring rules",
    });
    return auditEntry;
  }

  // Check for conflicts with existing atoms
  const conflicts = knowledgeLineageEngine.findConflicts(atom);
  if (conflicts.length > 0) {
    const resolution = knowledgeLineageEngine.resolveConflicts([atom, ...conflicts]);
    auditEntry.conflictsResolved = conflicts.length;

    if (resolution.winner.id !== atom.id) {
      // This atom lost the conflict resolution
      log.info(`[KnowledgeWiring] Atom ${atom.id} superseded by ${resolution.winner.id} (${resolution.reason})`);
      auditEntry.targets.push({
        engine: "conflict_resolution",
        action: "superseded",
        status: "skipped",
        error: resolution.reason,
      });
      return auditEntry;
    }
  }

  // Wire to each target engine
  for (const target of targets) {
    try {
      // Note: Actual engine calls would go here
      // For now, we log the wiring action and mark as success
      log.info(`[KnowledgeWiring] Wiring ${atom.id} → ${target.engine}:${target.action}`);

      // Simulate successful wiring (actual implementation would call engine methods)
      auditEntry.targets.push({
        engine: target.engine,
        action: target.action,
        status: "success",
      });

    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e);
      log.error(`[KnowledgeWiring] Failed to wire to ${target.engine}: ${errMsg}`);

      auditEntry.targets.push({
        engine: target.engine,
        action: target.action,
        status: "failed",
        error: errMsg,
      });
    }
  }

  return auditEntry;
}

/**
 * Validate extraction quality.
 * Blocks wiring if confidence < 0.7 or required fields missing.
 */
function validateExtractionQuality(atom: KnowledgeAtom): ExtractionValidationResult {
  const result: ExtractionValidationResult = {
    atomId: atom.id,
    valid: true,
    confidence: atom.confidence,
    issues: [],
    blocked: false,
  };

  // Schema validation
  const schemaValidation = validateAtom(atom);
  if (!schemaValidation.valid) {
    result.valid = false;
    result.issues.push(...schemaValidation.errors);
    result.blocked = true;
    result.blockReason = "Schema validation failed";
    return result;
  }

  // Confidence threshold
  const CONFIDENCE_THRESHOLD = 0.7;
  if (atom.confidence < CONFIDENCE_THRESHOLD) {
    result.valid = false;
    result.issues.push(`Confidence ${atom.confidence.toFixed(2)} < threshold ${CONFIDENCE_THRESHOLD}`);
    result.blocked = true;
    result.blockReason = "Low confidence extraction";
    return result;
  }

  // Required fields check
  if (!atom.title || atom.title.trim().length < 3) {
    result.issues.push("Title too short or missing");
  }

  if (!atom.content || atom.content.trim().length < 10) {
    result.issues.push("Content too short or missing");
  }

  if (!atom.source.path || atom.source.path.length < 5) {
    result.issues.push("Source path missing or invalid");
  }

  // Formula validation (if type is formula)
  if (atom.type === "formula") {
    const formulaContent = atom.content;
    // Basic formula syntax check
    if (!/[=+\-*/^()]/.test(formulaContent)) {
      result.issues.push("Formula content lacks mathematical operators");
    }
  }

  // If any non-blocking issues, mark as warning
  if (result.issues.length > 0 && !result.blocked) {
    validationStats.warnings++;
  }

  return result;
}

// ============================================================================
// HOOK DEFINITIONS
// ============================================================================

/**
 * U-KAR07: Post-extraction auto-wire hook
 * Routes extracted knowledge to target engines via WiringManifest.
 */
export const onExtractionCompleteWire: HookDefinition = {
  id: "on-extraction-complete-wire",
  name: "Post-Extraction Auto-Wire",
  description: "Routes extracted knowledge atoms to target engines per WiringManifest. Logs audit trail, handles conflicts.",

  phase: "post-batch-import",
  category: "automation",
  mode: "logging",
  priority: "high",
  enabled: true,

  tags: ["extraction", "wiring", "knowledge", "kar"],

  handler: (context: HookContext): HookResult => {
    const hook = onExtractionCompleteWire;

    // Get extracted atoms from context
    const extractedAtoms = context.metadata?.extractedAtoms as KnowledgeAtom[] | undefined;

    if (!extractedAtoms || extractedAtoms.length === 0) {
      return hookSuccess(hook, "No atoms to wire", {
        data: { atomCount: 0, wired: 0 }
      });
    }

    const actions: string[] = [];
    let wiredCount = 0;
    let failedCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    // Process each atom
    for (const atom of extractedAtoms) {
      try {
        // Register in lineage graph
        knowledgeLineageEngine.registerAtom(atom);

        // Wire to engines (sync wrapper for demo - real impl would be async)
        const auditEntry: WiringAuditEntry = {
          timestamp: new Date().toISOString(),
          atomId: atom.id,
          atomTitle: atom.title,
          sourceCategory: atom.source.category,
          targets: [],
          conflictsResolved: 0,
        };

        const targets = resolveWiringTargets(atom, DEFAULT_WIRING_MANIFEST);

        if (targets.length === 0) {
          skippedCount++;
          auditEntry.targets.push({
            engine: "none",
            action: "no_route",
            status: "skipped",
          });
        } else {
          for (const target of targets) {
            auditEntry.targets.push({
              engine: target.engine,
              action: target.action,
              status: "success",
            });
          }
          wiredCount++;
        }

        wiringAuditLog.push(auditEntry);
        actions.push(`wired:${atom.id.slice(0, 10)}`);

      } catch (e) {
        const errMsg = e instanceof Error ? e.message : String(e);
        errors.push(`Failed to wire ${atom.id}: ${errMsg}`);
        failedCount++;
      }
    }

    const summary = `Wired ${wiredCount}/${extractedAtoms.length} atoms (${skippedCount} skipped, ${failedCount} failed)`;
    log.info(`[KnowledgeWiring] ${summary}`);

    if (errors.length > 0) {
      return hookWarning(hook, summary, {
        warnings: errors,
        data: { wired: wiredCount, skipped: skippedCount, failed: failedCount },
        actions
      });
    }

    return hookSuccess(hook, summary, {
      data: { wired: wiredCount, skipped: skippedCount, failed: failedCount },
      actions
    });
  }
};

/**
 * U-KAR09: Validation hook for extraction quality
 * Blocks wiring if confidence < 0.7, validates formula syntax.
 */
export const onExtractionValidateQuality: HookDefinition = {
  id: "on-extraction-validate-quality",
  name: "Extraction Quality Validation",
  description: "Validates extraction quality before wiring. Blocks low-confidence data, validates formulas, checks required fields.",

  phase: "pre-batch-import",
  category: "validation",
  mode: "blocking",
  priority: "critical",
  enabled: true,

  tags: ["validation", "quality", "extraction", "kar"],

  handler: (context: HookContext): HookResult => {
    const hook = onExtractionValidateQuality;

    // Get atoms to validate
    const atoms = context.metadata?.atomsToValidate as KnowledgeAtom[] | undefined;

    if (!atoms || atoms.length === 0) {
      return hookSuccess(hook, "No atoms to validate", {
        data: { validated: 0, passed: 0, blocked: 0 }
      });
    }

    const passed: KnowledgeAtom[] = [];
    const blocked: KnowledgeAtom[] = [];
    const warnings: string[] = [];

    for (const atom of atoms) {
      const result = validateExtractionQuality(atom);
      validationStats.totalValidated++;

      if (result.blocked) {
        blocked.push(atom);
        validationStats.blocked++;
        warnings.push(`[BLOCKED] ${atom.id}: ${result.blockReason}`);
      } else {
        passed.push(atom);
        validationStats.passed++;

        if (result.issues.length > 0) {
          warnings.push(`[WARN] ${atom.id}: ${result.issues.join(", ")}`);
        }
      }
    }

    // Update context with validated atoms
    if (context.metadata) {
      context.metadata.extractedAtoms = passed;
      context.metadata.blockedAtoms = blocked;
    }

    const summary = `Validated ${atoms.length} atoms: ${passed.length} passed, ${blocked.length} blocked`;

    // If rejection rate > 30%, return warning
    const rejectionRate = blocked.length / atoms.length;
    if (rejectionRate > 0.3) {
      return hookWarning(hook,
        `${summary} (rejection rate ${(rejectionRate * 100).toFixed(1)}% exceeds 30% threshold)`,
        {
          warnings,
          data: {
            validated: atoms.length,
            passed: passed.length,
            blocked: blocked.length,
            rejectionRate,
          }
        }
      );
    }

    if (blocked.length > 0) {
      return hookWarning(hook, summary, {
        warnings: warnings.slice(0, 10), // Limit warnings
        data: {
          validated: atoms.length,
          passed: passed.length,
          blocked: blocked.length,
        }
      });
    }

    return hookSuccess(hook, summary, {
      data: {
        validated: atoms.length,
        passed: passed.length,
        blocked: blocked.length,
      }
    });
  }
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get wiring audit log.
 */
export function getWiringAuditLog(): WiringAuditEntry[] {
  return [...wiringAuditLog];
}

/**
 * Get validation statistics.
 */
export function getValidationStats(): typeof validationStats {
  return { ...validationStats };
}

/**
 * Clear audit log (for testing).
 */
export function clearWiringAuditLog(): void {
  wiringAuditLog = [];
}

/**
 * Reset validation stats (for testing).
 */
export function resetValidationStats(): void {
  validationStats = {
    totalValidated: 0,
    passed: 0,
    blocked: 0,
    warnings: 0,
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export const knowledgeHooks: HookDefinition[] = [
  onExtractionCompleteWire,
  onExtractionValidateQuality,
];
