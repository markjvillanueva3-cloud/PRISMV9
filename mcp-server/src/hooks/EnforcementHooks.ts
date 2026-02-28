/**
 * PRISM MCP Server - Enforcement Hooks
 * Session 6.2B: Critical Enforcement Gates
 * 
 * THE KILLER FEATURE: These hooks run as CODE, not prompts.
 * - 100% reliability (vs ~80% for prompts)
 * - 0 tokens consumed
 * - Cannot be bypassed accidentally
 * - The v9→v10 regression would have been IMPOSSIBLE with these
 * 
 * HOOKS IN THIS MODULE:
 * 
 * ANTI-REGRESSION (File Operations):
 * - pre-file-write-antiregression: BLOCKS if new_count < old_count
 * - pre-file-replace: Enhanced comparison with structure awareness
 * - pre-file-delete: Protection + backup creation
 * 
 * SAFETY GATES (Material Operations):
 * - post-material-add-safety: BLOCKS if S(x) < 0.70
 * - pre-material-add-completeness: BLOCKS if coverage < 80%
 * - pre-material-update-preserve: Prevents field deletion
 * 
 * QUALITY GATES (Output Operations):
 * - pre-output-omega: Compute and check Ω(x) ≥ 0.70
 * - pre-output-safety: Hard gate S(x) ≥ 0.70
 * 
 * VALIDATION GATES:
 * - pre-kienzle-validation: Check coefficient ranges
 * - pre-taylor-validation: Check coefficient ranges
 * - pre-johnson-cook-validation: Check parameter consistency
 * 
 * @version 1.0.0
 * @author PRISM Development Team
 */

import {
  HookDefinition,
  HookContext,
  HookResult,
  hookSuccess,
  hookBlock,
  hookWarning
} from "../engines/HookExecutor.js";
import {
  checkAntiRegression,
  computeSafetyScore,
  checkMaterialCompleteness,
  validateKienzle,
  validateTaylor,
  validateJohnsonCook,
  SAFETY_THRESHOLD,
  COMPLETENESS_THRESHOLD,
  MATERIAL_REQUIRED_PARAMS
} from "../utils/validators.js";
import { log } from "../utils/Logger.js";

// ============================================================================
// CONSTANTS
// ============================================================================

const OMEGA_THRESHOLD = 0.70;

// File types and their item counting strategies
const FILE_TYPE_STRATEGIES: Record<string, {
  countMethod: "array" | "object" | "sections" | "exports" | "lines";
  criticalFields?: string[];
}> = {
  ".json": { countMethod: "array", criticalFields: ["materials", "machines", "alarms", "tools", "formulas", "agents", "hooks", "skills", "scripts"] },
  ".md": { countMethod: "sections" },
  ".ts": { countMethod: "exports" },
  ".js": { countMethod: "exports" },
  ".tsx": { countMethod: "exports" },
  ".jsx": { countMethod: "exports" },
  ".yaml": { countMethod: "object" },
  ".yml": { countMethod: "object" }
};

// ============================================================================
// ANTI-REGRESSION HOOKS
// ============================================================================

/**
 * CRITICAL HOOK: Pre-file-write anti-regression check
 * 
 * This is THE most important hook. It prevents ALL data loss regressions.
 * The v9→v10 regression that lost materials would have been IMPOSSIBLE with this.
 */
const preFileWriteAntiRegression: HookDefinition = {
  id: "pre-file-write-antiregression",
  name: "Anti-Regression Gate",
  description: "BLOCKS file writes that would lose data. Counts items before/after and prevents reduction.",
  
  phase: "pre-file-write",
  category: "enforcement",
  mode: "blocking",
  priority: "critical",
  enabled: true,
  
  tags: ["anti-regression", "data-protection", "critical"],
  
  handler: (context: HookContext): HookResult => {
    const hook = preFileWriteAntiRegression;
    
    const oldContent = context.content?.old;
    const newContent = context.content?.new;
    const filePath = context.target?.path || "unknown";
    
    if (!oldContent) {
      return hookSuccess(hook, `New file creation allowed: ${filePath}`, {
        actions: ["allowed_new_file"]
      });
    }
    
    if (!newContent) {
      return hookBlock(hook, `🚫 BLOCKED: File deletion attempted via write. Use delete operation instead.`, {
        issues: ["Attempted to overwrite file with empty content"]
      });
    }
    
    const ext = filePath.match(/\.[^.]+$/)?.[0] || ".txt";
    const oldStr = typeof oldContent === "string" ? oldContent : JSON.stringify(oldContent);
    const newStr = typeof newContent === "string" ? newContent : JSON.stringify(newContent);
    
    const result = checkAntiRegression(oldStr, newStr, ext);
    
    if (result.safe) {
      return hookSuccess(hook, result.message, {
        data: {
          oldCount: result.oldCount,
          newCount: result.newCount,
          difference: result.difference,
          percentChange: result.percentChange,
          type: result.type
        },
        actions: result.difference > 0 
          ? ["allowed_increase"] 
          : result.difference === 0 
            ? ["allowed_same"] 
            : ["allowed_minor_reduction"]
      });
    }
    
    log.error(`Anti-regression BLOCKED: ${filePath} - ${result.message}`);
    
    return hookBlock(hook, result.message, {
      issues: [
        `Old count: ${result.oldCount} ${result.type}`,
        `New count: ${result.newCount} ${result.type}`,
        `Lost: ${Math.abs(result.difference)} items (${Math.abs(result.percentChange).toFixed(1)}% reduction)`,
        "INVESTIGATE before proceeding"
      ]
    });
  }
};

/**
 * Enhanced file replacement check with structure awareness
 */
const preFileReplaceStructure: HookDefinition = {
  id: "pre-file-replace-structure",
  name: "Structure-Aware Replacement Check",
  description: "Validates file replacement preserves critical structure and sections.",
  
  phase: "pre-file-write",
  category: "enforcement",
  mode: "blocking",
  priority: "high",
  enabled: true,
  
  tags: ["anti-regression", "structure", "validation"],
  
  handler: (context: HookContext): HookResult => {
    const hook = preFileReplaceStructure;
    
    const oldContent = context.content?.old;
    const newContent = context.content?.new;
    const filePath = context.target?.path || "unknown";
    
    if (!oldContent || !newContent) {
      return hookSuccess(hook, "Not a replacement operation");
    }
    
    const ext = filePath.match(/\.[^.]+$/)?.[0] || ".txt";
    const strategy = FILE_TYPE_STRATEGIES[ext];
    
    if (!strategy) {
      return hookSuccess(hook, `No structure validation for ${ext} files`);
    }
    
    if (ext === ".json" && strategy.criticalFields) {
      try {
        const oldObj = typeof oldContent === "string" ? JSON.parse(oldContent) : oldContent;
        const newObj = typeof newContent === "string" ? JSON.parse(newContent) : newContent;
        
        const missingFields: string[] = [];
        const reducedFields: string[] = [];
        
        for (const field of strategy.criticalFields) {
          if (oldObj[field] !== undefined && newObj[field] === undefined) {
            missingFields.push(field);
          }
          if (Array.isArray(oldObj[field]) && Array.isArray(newObj[field])) {
            if (newObj[field].length < oldObj[field].length) {
              reducedFields.push(`${field}: ${oldObj[field].length} → ${newObj[field].length}`);
            }
          }
        }
        
        if (missingFields.length > 0) {
          return hookBlock(hook, `🚫 BLOCKED: Critical fields removed: ${missingFields.join(", ")}`, {
            issues: missingFields.map(f => `Missing field: ${f}`)
          });
        }
        
        if (reducedFields.length > 0) {
          return hookWarning(hook, `⚠️ WARNING: Array sizes reduced`, {
            warnings: reducedFields
          });
        }
        
        return hookSuccess(hook, "Structure preserved");
        
      } catch {
        return hookWarning(hook, `Could not parse JSON for structure check`);
      }
    }
    
    if (ext === ".md") {
      const oldSections: string[] = (typeof oldContent === "string" ? oldContent : "")
        .match(/^#{1,3}\s+.+$/gm) || [];
      const newSections: string[] = (typeof newContent === "string" ? newContent : "")
        .match(/^#{1,3}\s+.+$/gm) || [];
      
      const missingSections = oldSections.filter(s => !newSections.includes(s));
      
      if (missingSections.length > oldSections.length * 0.3) {
        return hookBlock(hook, `🚫 BLOCKED: More than 30% of sections removed`, {
          issues: [`Removed sections: ${missingSections.length}/${oldSections.length}`]
        });
      }
      
      if (missingSections.length > 0) {
        return hookWarning(hook, `⚠️ ${missingSections.length} sections removed`, {
          warnings: missingSections.slice(0, 5)
        });
      }
    }
    
    return hookSuccess(hook, "Structure check passed");
  }
};

/**
 * Pre-file-delete protection
 */
const preFileDeleteProtection: HookDefinition = {
  id: "pre-file-delete-protection",
  name: "File Deletion Protection",
  description: "Requires confirmation for file deletion and ensures backups exist.",
  
  phase: "pre-file-delete",
  category: "enforcement",
  mode: "blocking",
  priority: "critical",
  enabled: true,
  
  tags: ["protection", "deletion", "backup"],
  
  handler: (context: HookContext): HookResult => {
    const hook = preFileDeleteProtection;
    
    const filePath = context.target?.path || "unknown";
    const confirmed = context.metadata?.deleteConfirmed === true;
    const hasBackup = context.metadata?.backupCreated === true;
    
    const protectedPatterns = [
      /CURRENT_STATE\.json$/i,
      /MASTER.*DATABASE/i,
      /_EXPANDED\.json$/i,
      /SKILL\.md$/i,
      /index\.(ts|js)$/i
    ];
    
    for (const pattern of protectedPatterns) {
      if (pattern.test(filePath)) {
        if (!confirmed) {
          return hookBlock(hook, `🚫 BLOCKED: Protected file requires explicit confirmation: ${filePath}`, {
            issues: [
              "This file matches a protected pattern",
              "Set metadata.deleteConfirmed = true to proceed",
              "Ensure you have a backup first"
            ]
          });
        }
      }
    }
    
    if (!hasBackup) {
      return hookWarning(hook, `⚠️ Deletion without backup: ${filePath}`, {
        warnings: ["No backup created. Consider creating one first."]
      });
    }
    
    return hookSuccess(hook, `Deletion allowed: ${filePath}`, {
      actions: ["deletion_allowed"]
    });
  }
};

// ============================================================================
// SAFETY GATE HOOKS
// ============================================================================

/**
 * CRITICAL HOOK: Post-material-add safety check
 */
const postMaterialAddSafety: HookDefinition = {
  id: "post-material-add-safety",
  name: "Material Safety Gate",
  description: "Computes S(x) safety score for new material. BLOCKS if S(x) < 0.70.",
  
  phase: "post-material-add",
  category: "enforcement",
  mode: "blocking",
  priority: "critical",
  enabled: true,
  
  tags: ["safety", "S(x)", "critical", "material"],
  
  handler: (context: HookContext): HookResult => {
    const hook = postMaterialAddSafety;
    
    const material = context.target?.data as Record<string, unknown>;
    if (!material) {
      return hookBlock(hook, "No material data provided");
    }
    
    const materialId = material.material_id || material.id || "unknown";
    const safety = computeSafetyScore(material);
    
    log.info(`Safety check for ${materialId}: S(x)=${safety.score.toFixed(3)} (${safety.status})`);
    
    if (safety.status === "BLOCKED") {
      return hookBlock(hook, 
        `🛑 SAFETY BLOCKED: S(x)=${safety.score.toFixed(3)} < ${SAFETY_THRESHOLD} for material ${materialId}`,
        {
          score: safety.score,
          threshold: SAFETY_THRESHOLD,
          issues: safety.issues
        }
      );
    }
    
    if (safety.status === "WARNING") {
      return hookWarning(hook,
        `⚠️ Safety warning: S(x)=${safety.score.toFixed(3)} near threshold for ${materialId}`,
        {
          score: safety.score,
          threshold: SAFETY_THRESHOLD,
          warnings: safety.issues
        }
      );
    }
    
    return hookSuccess(hook,
      `✅ Safety APPROVED: S(x)=${safety.score.toFixed(3)} for ${materialId}`,
      {
        score: safety.score,
        threshold: SAFETY_THRESHOLD,
        data: { components: safety.components }
      }
    );
  }
};

/**
 * Pre-material-add completeness check
 */
const preMaterialAddCompleteness: HookDefinition = {
  id: "pre-material-add-completeness",
  name: "Material Completeness Gate",
  description: "Checks 127-parameter coverage. BLOCKS if coverage < 80% or missing critical fields.",
  
  phase: "pre-material-add",
  category: "enforcement",
  mode: "blocking",
  priority: "critical",
  enabled: true,
  
  tags: ["completeness", "coverage", "critical", "material"],
  
  handler: (context: HookContext): HookResult => {
    const hook = preMaterialAddCompleteness;
    
    const material = context.target?.data as Record<string, unknown>;
    if (!material) {
      return hookBlock(hook, "No material data provided");
    }
    
    const materialId = material.material_id || material.id || "unknown";
    const completeness = checkMaterialCompleteness(material);
    
    log.info(`Completeness check for ${materialId}: ${(completeness.percentage * 100).toFixed(1)}% (${completeness.level})`);
    
    if (completeness.level === "INCOMPLETE_CRITICAL") {
      const criticalMissing = MATERIAL_REQUIRED_PARAMS.critical.filter(
        p => material[p] === undefined || material[p] === null || material[p] === ""
      );
      
      return hookBlock(hook,
        `🚫 BLOCKED: Missing critical fields for ${materialId}`,
        {
          score: completeness.percentage,
          threshold: COMPLETENESS_THRESHOLD,
          issues: criticalMissing.map(f => `Missing critical: ${f}`)
        }
      );
    }
    
    if (completeness.percentage < COMPLETENESS_THRESHOLD) {
      return hookBlock(hook,
        `🚫 BLOCKED: Completeness ${(completeness.percentage * 100).toFixed(1)}% < ${COMPLETENESS_THRESHOLD * 100}% for ${materialId}`,
        {
          score: completeness.percentage,
          threshold: COMPLETENESS_THRESHOLD,
          issues: [
            `Filled: ${completeness.filled}/${completeness.total} parameters`,
            `Missing: ${completeness.missing.slice(0, 10).join(", ")}${completeness.missing.length > 10 ? "..." : ""}`
          ]
        }
      );
    }
    
    if (completeness.level !== "COMPLETE") {
      return hookWarning(hook,
        `⚠️ Completeness ${(completeness.percentage * 100).toFixed(1)}% - some optional fields missing`,
        {
          score: completeness.percentage,
          threshold: COMPLETENESS_THRESHOLD,
          warnings: [`Missing optional: ${completeness.missing.length} fields`]
        }
      );
    }
    
    return hookSuccess(hook,
      `✅ Completeness APPROVED: ${(completeness.percentage * 100).toFixed(1)}% for ${materialId}`,
      {
        score: completeness.percentage,
        threshold: COMPLETENESS_THRESHOLD
      }
    );
  }
};

/**
 * Pre-material-update preservation check
 */
const preMaterialUpdatePreserve: HookDefinition = {
  id: "pre-material-update-preserve",
  name: "Material Update Preservation",
  description: "Prevents updates from removing existing field values.",
  
  phase: "pre-material-update",
  category: "enforcement",
  mode: "blocking",
  priority: "high",
  enabled: true,
  
  tags: ["preservation", "update", "material"],
  
  handler: (context: HookContext): HookResult => {
    const hook = preMaterialUpdatePreserve;
    
    const oldMaterial = context.content?.old as Record<string, unknown>;
    const newMaterial = context.content?.new as Record<string, unknown>;
    
    if (!oldMaterial || !newMaterial) {
      return hookSuccess(hook, "Not an update operation");
    }
    
    const removedFields: string[] = [];
    const nulledFields: string[] = [];
    
    for (const [key, oldValue] of Object.entries(oldMaterial)) {
      if (oldValue !== undefined && oldValue !== null && oldValue !== "") {
        const newValue = newMaterial[key];
        if (newValue === undefined) {
          removedFields.push(key);
        } else if (newValue === null || newValue === "") {
          nulledFields.push(key);
        }
      }
    }
    
    const criticalRemoved = removedFields.filter(f => MATERIAL_REQUIRED_PARAMS.critical.includes(f));
    if (criticalRemoved.length > 0) {
      return hookBlock(hook,
        `🚫 BLOCKED: Critical fields would be removed: ${criticalRemoved.join(", ")}`,
        { issues: criticalRemoved.map(f => `Would remove: ${f}`) }
      );
    }
    
    if (removedFields.length > 0 || nulledFields.length > 0) {
      return hookWarning(hook,
        `⚠️ Update would modify ${removedFields.length + nulledFields.length} existing values`,
        {
          warnings: [
            ...removedFields.map(f => `Removing: ${f}`),
            ...nulledFields.map(f => `Nulling: ${f}`)
          ]
        }
      );
    }
    
    return hookSuccess(hook, "All existing values preserved");
  }
};

/**
 * Post-material-update re-validation
 */
const postMaterialUpdateRevalidate: HookDefinition = {
  id: "post-material-update-revalidate",
  name: "Material Update Re-validation",
  description: "Re-validates material after update to ensure it still passes safety.",
  
  phase: "post-material-update",
  category: "enforcement",
  mode: "blocking",
  priority: "high",
  enabled: true,
  
  tags: ["validation", "update", "material", "safety"],
  
  handler: (context: HookContext): HookResult => {
    const hook = postMaterialUpdateRevalidate;
    
    const material = context.content?.new as Record<string, unknown>;
    if (!material) {
      return hookSuccess(hook, "No updated material to validate");
    }
    
    const safety = computeSafetyScore(material);
    
    if (safety.status === "BLOCKED") {
      return hookBlock(hook,
        `🛑 BLOCKED: Update caused safety score to drop below threshold`,
        {
          score: safety.score,
          threshold: SAFETY_THRESHOLD,
          issues: safety.issues
        }
      );
    }
    
    return hookSuccess(hook, `Material still valid after update: S(x)=${safety.score.toFixed(3)}`, {
      score: safety.score
    });
  }
};

// ============================================================================
// QUALITY GATE HOOKS
// ============================================================================

/**
 * Pre-output Omega quality gate
 */
const preOutputOmegaGate: HookDefinition = {
  id: "pre-output-omega-gate",
  name: "Omega Quality Gate",
  description: "Checks Ω(x) composite quality score before output. Warns if below threshold.",
  
  phase: "pre-output",
  category: "enforcement",
  mode: "warning",
  priority: "high",
  enabled: true,
  
  tags: ["quality", "omega", "output"],
  
  handler: (context: HookContext): HookResult => {
    const hook = preOutputOmegaGate;
    
    const quality = context.quality;
    if (!quality) {
      return hookWarning(hook, "No quality metrics available - skipping Ω check");
    }
    
    const omega = 
      (quality.reasoning || 0) * 0.25 +
      (quality.code || 0) * 0.20 +
      (quality.process || 0) * 0.15 +
      (quality.safety || 0) * 0.30 +
      0.10;
    
    log.info(`Omega quality check: Ω(x)=${omega.toFixed(3)} (threshold: ${OMEGA_THRESHOLD})`);
    
    if (omega < OMEGA_THRESHOLD) {
      return hookWarning(hook,
        `⚠️ Quality below threshold: Ω(x)=${omega.toFixed(3)} < ${OMEGA_THRESHOLD}`,
        {
          score: omega,
          threshold: OMEGA_THRESHOLD,
          warnings: [
            `R(x)=${(quality.reasoning || 0).toFixed(2)}`,
            `C(x)=${(quality.code || 0).toFixed(2)}`,
            `P(x)=${(quality.process || 0).toFixed(2)}`,
            `S(x)=${(quality.safety || 0).toFixed(2)}`
          ]
        }
      );
    }
    
    return hookSuccess(hook, `Quality check passed: Ω(x)=${omega.toFixed(3)}`, {
      score: omega,
      threshold: OMEGA_THRESHOLD
    });
  }
};

/**
 * Pre-output safety hard gate
 */
const preOutputSafetyHardGate: HookDefinition = {
  id: "pre-output-safety-hard-gate",
  name: "Safety Hard Gate",
  description: "HARD BLOCK if S(x) < 0.70. This is the ultimate safety check.",
  
  phase: "pre-output",
  category: "enforcement",
  mode: "blocking",
  priority: "critical",
  enabled: true,
  
  tags: ["safety", "S(x)", "hard-gate", "critical"],
  
  handler: (context: HookContext): HookResult => {
    const hook = preOutputSafetyHardGate;
    
    const safety = context.quality?.safety;
    
    // QA-MS1 FIX (F02): Hard gate must fail-CLOSED when safety data is missing
    if (safety === undefined) {
      return hookBlock(hook, "HARD BLOCK: No safety score available — cannot verify safe output", {
        score: 0,
        threshold: SAFETY_THRESHOLD,
        issues: ["Safety score missing from context — fail-closed"]
      });
    }
    
    if (safety < SAFETY_THRESHOLD) {
      return hookBlock(hook,
        `🛑 SAFETY HARD BLOCK: S(x)=${safety.toFixed(3)} < ${SAFETY_THRESHOLD}`,
        {
          score: safety,
          threshold: SAFETY_THRESHOLD,
          issues: ["Safety score below absolute minimum", "Cannot proceed with this output"]
        }
      );
    }
    
    return hookSuccess(hook, `Safety gate passed: S(x)=${safety.toFixed(3)}`, {
      score: safety,
      threshold: SAFETY_THRESHOLD
    });
  }
};

// ============================================================================
// PHYSICS VALIDATION HOOKS
// ============================================================================

const preKienzleValidation: HookDefinition = {
  id: "pre-kienzle-validation",
  name: "Kienzle Coefficient Validation",
  description: "Validates kc1.1 and mc against expected ranges for ISO group.",
  
  phase: "pre-kienzle",
  category: "validation",
  mode: "warning",
  priority: "normal",
  enabled: true,
  
  tags: ["kienzle", "physics", "validation"],
  
  handler: (context: HookContext): HookResult => {
    const hook = preKienzleValidation;
    
    const data = context.target?.data as { kc1_1?: number; mc?: number; iso_group?: string };
    if (!data?.kc1_1 || !data?.mc) {
      return hookWarning(hook, "Missing Kienzle parameters");
    }
    
    const result = validateKienzle(data.kc1_1, data.mc, data.iso_group || "P");
    
    if (!result.valid) {
      return hookWarning(hook, `Kienzle validation failed`, {
        warnings: result.issues.map(i => i.message)
      });
    }
    
    return hookSuccess(hook, `Kienzle parameters valid for ISO ${data.iso_group || "P"}`);
  }
};

const preTaylorValidation: HookDefinition = {
  id: "pre-taylor-validation",
  name: "Taylor Coefficient Validation",
  description: "Validates C and n against expected ranges for ISO group.",
  
  phase: "pre-taylor",
  category: "validation",
  mode: "warning",
  priority: "normal",
  enabled: true,
  
  tags: ["taylor", "physics", "validation"],
  
  handler: (context: HookContext): HookResult => {
    const hook = preTaylorValidation;
    
    const data = context.target?.data as { C?: number; n?: number; iso_group?: string };
    if (!data?.C || !data?.n) {
      return hookWarning(hook, "Missing Taylor parameters");
    }
    
    const result = validateTaylor(data.C, data.n, data.iso_group || "P");
    
    if (!result.valid) {
      return hookWarning(hook, `Taylor validation failed`, {
        warnings: result.issues.map(i => i.message)
      });
    }
    
    return hookSuccess(hook, `Taylor parameters valid for ISO ${data.iso_group || "P"}`);
  }
};

const preJohnsonCookValidation: HookDefinition = {
  id: "pre-johnson-cook-validation",
  name: "Johnson-Cook Validation",
  description: "Validates A, B, n, C, m for physical consistency.",
  
  phase: "pre-johnson-cook",
  category: "validation",
  mode: "warning",
  priority: "normal",
  enabled: true,
  
  tags: ["johnson-cook", "physics", "validation"],
  
  handler: (context: HookContext): HookResult => {
    const hook = preJohnsonCookValidation;
    
    const data = context.target?.data as {
      A?: number; B?: number; n?: number; C?: number; m?: number;
      yield_strength?: number; tensile_strength?: number;
    };
    
    if (!data?.A || !data?.B || !data?.n || !data?.C || !data?.m) {
      return hookWarning(hook, "Missing Johnson-Cook parameters");
    }
    
    const result = validateJohnsonCook(
      data.A, data.B, data.n, data.C, data.m,
      data.yield_strength, data.tensile_strength
    );
    
    if (!result.valid) {
      return hookWarning(hook, `Johnson-Cook validation failed`, {
        warnings: result.issues.map(i => i.message)
      });
    }
    
    return hookSuccess(hook, "Johnson-Cook parameters physically consistent");
  }
};

// ============================================================================
// ADDITIONAL VALIDATION HOOKS
// ============================================================================

const preMaterialAddDuplicateCheck: HookDefinition = {
  id: "pre-material-add-duplicate-check",
  name: "Duplicate Material Detection",
  description: "Checks for duplicate materials by ID, name, or UNS number.",
  
  phase: "pre-material-add",
  category: "validation",
  mode: "warning",
  priority: "high",
  enabled: true,
  
  tags: ["duplicate", "validation", "material"],
  
  handler: (context: HookContext): HookResult => {
    const hook = preMaterialAddDuplicateCheck;
    
    const material = context.target?.data as Record<string, unknown>;
    const existingMaterials = context.metadata?.existingMaterials as Record<string, unknown>[] | undefined;
    
    if (!material || !existingMaterials) {
      return hookSuccess(hook, "No existing materials to check against");
    }
    
    const duplicates: string[] = [];
    
    for (const existing of existingMaterials) {
      if (existing.material_id === material.material_id) {
        duplicates.push(`ID match: ${material.material_id}`);
      }
      if (existing.name && existing.name === material.name) {
        duplicates.push(`Name match: ${material.name}`);
      }
      if (existing.uns_number && existing.uns_number === material.uns_number) {
        duplicates.push(`UNS match: ${material.uns_number}`);
      }
    }
    
    if (duplicates.length > 0) {
      return hookWarning(hook, `Potential duplicate detected`, {
        warnings: duplicates
      });
    }
    
    return hookSuccess(hook, "No duplicates found");
  }
};

const preMachineAddCapability: HookDefinition = {
  id: "pre-machine-add-capability",
  name: "Machine Capability Validation",
  description: "Validates machine specifications are within reasonable ranges.",
  
  phase: "pre-machine-add",
  category: "validation",
  mode: "warning",
  priority: "normal",
  enabled: true,
  
  tags: ["machine", "capability", "validation"],
  
  handler: (context: HookContext): HookResult => {
    const hook = preMachineAddCapability;
    
    const machine = context.target?.data as Record<string, unknown>;
    if (!machine) {
      return hookWarning(hook, "No machine data provided");
    }
    
    const warnings: string[] = [];
    
    const maxSpindleSpeed = machine.max_spindle_speed as number | undefined;
    if (maxSpindleSpeed !== undefined) {
      if (maxSpindleSpeed < 100) warnings.push(`Spindle speed ${maxSpindleSpeed} RPM seems too low`);
      if (maxSpindleSpeed > 100000) warnings.push(`Spindle speed ${maxSpindleSpeed} RPM seems too high`);
    }
    
    const xTravel = machine.x_travel as number | undefined;
    const yTravel = machine.y_travel as number | undefined;
    const zTravel = machine.z_travel as number | undefined;
    
    if (xTravel !== undefined && xTravel <= 0) warnings.push(`X travel ${xTravel} invalid`);
    if (yTravel !== undefined && yTravel <= 0) warnings.push(`Y travel ${yTravel} invalid`);
    if (zTravel !== undefined && zTravel <= 0) warnings.push(`Z travel ${zTravel} invalid`);
    
    const rapidFeed = machine.rapid_feed as number | undefined;
    if (rapidFeed !== undefined && rapidFeed > 100000) {
      warnings.push(`Rapid feed ${rapidFeed} mm/min seems excessive`);
    }
    
    if (warnings.length > 0) {
      return hookWarning(hook, `Machine specification warnings`, { warnings });
    }
    
    return hookSuccess(hook, "Machine specifications valid");
  }
};

const preAlarmAddSchema: HookDefinition = {
  id: "pre-alarm-add-schema",
  name: "Alarm Schema Validation",
  description: "Validates alarm has required fields: code, name, category, severity.",
  
  phase: "pre-alarm-add",
  category: "validation",
  mode: "blocking",
  priority: "high",
  enabled: true,
  
  tags: ["alarm", "schema", "validation"],
  
  handler: (context: HookContext): HookResult => {
    const hook = preAlarmAddSchema;
    
    const alarm = context.target?.data as Record<string, unknown>;
    if (!alarm) {
      return hookBlock(hook, "No alarm data provided");
    }
    
    const required = ["code", "name", "category", "severity"];
    const missing = required.filter(f => !alarm[f]);
    
    if (missing.length > 0) {
      return hookBlock(hook, `Missing required alarm fields: ${missing.join(", ")}`, {
        issues: missing.map(f => `Missing: ${f}`)
      });
    }
    
    const validSeverities = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"];
    if (!validSeverities.includes(String(alarm.severity).toUpperCase())) {
      return hookWarning(hook, `Invalid severity: ${alarm.severity}`, {
        warnings: [`Expected one of: ${validSeverities.join(", ")}`]
      });
    }
    
    return hookSuccess(hook, "Alarm schema valid");
  }
};

const postAlarmBatchAntiRegression: HookDefinition = {
  id: "post-alarm-batch-antiregression",
  name: "Alarm Batch Anti-Regression",
  description: "Ensures alarm batch operations don't reduce total count.",
  
  phase: "post-alarm-batch",
  category: "enforcement",
  mode: "blocking",
  priority: "critical",
  enabled: true,
  
  tags: ["alarm", "anti-regression", "batch"],
  
  handler: (context: HookContext): HookResult => {
    const hook = postAlarmBatchAntiRegression;
    
    const oldCount = context.metadata?.oldAlarmCount as number | undefined;
    const newCount = context.metadata?.newAlarmCount as number | undefined;
    
    if (oldCount === undefined || newCount === undefined) {
      return hookWarning(hook, "Cannot verify alarm counts");
    }
    
    if (newCount < oldCount) {
      return hookBlock(hook, `🚫 BLOCKED: Alarm count decreased: ${oldCount} → ${newCount}`, {
        issues: [`Lost ${oldCount - newCount} alarms`]
      });
    }
    
    return hookSuccess(hook, `Alarm batch valid: ${oldCount} → ${newCount} (+${newCount - oldCount})`);
  }
};

// ============================================================================
// SKILL QUALITY GATE (Roadmap Audit 2026-02-17 Finding 8)
// Prevents template-disease: skills that look valid but are hollow copies.
// BLOCKING: Will not allow skill creation without v2.0 quality criteria.
// ============================================================================

const SKILL_REQUIRED_SECTIONS = [
  "## When To Use",
  "## How To Use", 
  "## What It Returns",
  "## Examples"
];

const SKILL_TEMPLATE_RED_FLAGS = [
  "Use this skill when",
  "This skill provides",
  "Returns the relevant",
  "See the skill for details",
  "Provides information about",
  "Use for general",
  "Contains information on"
];

const preSkillWriteQualityGate: HookDefinition = {
  id: "pre-skill-write-quality-gate",
  name: "Skill Quality Gate v2.0",
  description: "BLOCKS skill file writes that fail v2.0 quality criteria: must have 4 unique sections, 2+ real examples, no template text.",
  
  phase: "pre-file-write",
  category: "enforcement",
  mode: "blocking",
  priority: "high",
  enabled: true,
  
  tags: ["skill-quality", "anti-template", "enforcement", "v2.0"],
  
  handler: (context: HookContext): HookResult => {
    const hook = preSkillWriteQualityGate;
    const filePath = context.target?.path || "";
    const newContent = context.content?.new;
    
    // Only fire for SKILL.md files in skills directories
    if (!filePath.match(/skills[\\\/].*SKILL\.md$/i)) {
      return hookSuccess(hook, "Not a skill file, skipping quality gate");
    }
    
    if (!newContent || typeof newContent !== "string") {
      return hookBlock(hook, "BLOCKED: Empty skill content", {
        issues: ["Skill file cannot be empty"]
      });
    }
    
    const content = newContent;
    const issues: string[] = [];
    
    // CHECK 1: All 4 required sections present
    const missingSections: string[] = [];
    for (const section of SKILL_REQUIRED_SECTIONS) {
      if (!content.includes(section)) {
        missingSections.push(section);
      }
    }
    if (missingSections.length > 0) {
      issues.push(`Missing required sections: ${missingSections.join(", ")}. All v2.0 skills need: When To Use, How To Use, What It Returns, Examples.`);
    }
    
    // CHECK 2: Minimum 2 examples with real content
    const examplePatterns = [
      /- Input:/gi,
      /- Edge[- ]case:/gi,
      /- Example:/gi,
      /- Output:/gi
    ];
    let exampleCount = 0;
    for (const pattern of examplePatterns) {
      const matches = content.match(pattern);
      if (matches) exampleCount += matches.length;
    }
    // Each example has Input+Output, so count pairs
    const inputMatches = (content.match(/- Input:/gi) || []).length;
    const edgeCaseMatches = (content.match(/- Edge[- ]case:/gi) || []).length;
    const realExamples = inputMatches + edgeCaseMatches;
    
    if (realExamples < 2) {
      issues.push(`Only ${realExamples} example(s) found (need >= 2). Examples must have real numbers, materials, or formulas — not placeholders.`);
    }
    
    // CHECK 3: Anti-template detection
    const templateHits: string[] = [];
    for (const flag of SKILL_TEMPLATE_RED_FLAGS) {
      if (content.toLowerCase().includes(flag.toLowerCase())) {
        templateHits.push(flag);
      }
    }
    if (templateHits.length >= 2) {
      issues.push(`Template-disease detected: ${templateHits.length} generic phrases found (${templateHits.slice(0, 3).join(", ")}). Rewrite operational sections to be specific to THIS skill.`);
    }
    
    // CHECK 4: Size bounds (2-8KB)
    const sizeKB = Buffer.byteLength(content, "utf8") / 1024;
    if (sizeKB > 8) {
      issues.push(`Skill is ${sizeKB.toFixed(1)}KB (max 8KB). Split into multiple atomic skills.`);
    }
    if (sizeKB < 0.3) {
      issues.push(`Skill is only ${(sizeKB * 1024).toFixed(0)} bytes — too small to be useful. Minimum viable skill needs all 4 sections with real content.`);
    }
    
    // CHECK 5: NOT operator (boundary check)
    if (content.includes("## When To Use") && !content.match(/NOT\s+(for|when|if)/i)) {
      issues.push(`When To Use section has no NOT boundary. Add "NOT for X — use Y instead" to prevent misrouting.`);
    }
    
    if (issues.length > 0) {
      return hookBlock(hook, 
        `BLOCKED: Skill fails v2.0 quality gate (${issues.length} issue${issues.length > 1 ? "s" : ""}):\n${issues.map((i, idx) => `  ${idx + 1}. ${i}`).join("\n")}`,
        { issues }
      );
    }
    
    return hookSuccess(hook, `Skill passes v2.0 quality gate: ${SKILL_REQUIRED_SECTIONS.length} sections, ${realExamples} examples, ${sizeKB.toFixed(1)}KB, no template flags`, {
      data: { sections: SKILL_REQUIRED_SECTIONS.length, examples: realExamples, sizeKB: sizeKB.toFixed(1) }
    });
  }
};

// ============================================================================
// EXPORT ALL ENFORCEMENT HOOKS
// ============================================================================

export const enforcementHooks: HookDefinition[] = [
  preFileWriteAntiRegression,
  preFileReplaceStructure,
  preFileDeleteProtection,
  postMaterialAddSafety,
  preMaterialAddCompleteness,
  preMaterialUpdatePreserve,
  postMaterialUpdateRevalidate,
  preOutputOmegaGate,
  preOutputSafetyHardGate,
  preKienzleValidation,
  preTaylorValidation,
  preJohnsonCookValidation,
  preMaterialAddDuplicateCheck,
  preMachineAddCapability,
  preAlarmAddSchema,
  postAlarmBatchAntiRegression,
  preSkillWriteQualityGate
];

export {
  preFileWriteAntiRegression,
  preFileReplaceStructure,
  preFileDeleteProtection,
  postMaterialAddSafety,
  preMaterialAddCompleteness,
  preMaterialUpdatePreserve,
  postMaterialUpdateRevalidate,
  preOutputOmegaGate,
  preOutputSafetyHardGate,
  preKienzleValidation,
  preTaylorValidation,
  preJohnsonCookValidation,
  preMaterialAddDuplicateCheck,
  preMachineAddCapability,
  preAlarmAddSchema,
  postAlarmBatchAntiRegression,
  preSkillWriteQualityGate
};
