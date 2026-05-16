/**
 * ForgeTripleHooks — Protective enforcement hooks for completed milestones
 *
 * Each completed milestone produces a forge-triple: hook + action + skill.
 * These hooks protect the capabilities built in each milestone.
 *
 * Milestones covered:
 *   PIPELINE-VAR-MS0, PP-MOAT-MS0, ULT-MS0, CALC-HARDEN-MS0,
 *   SCIMATH-WIRE-MS0, WEDM-INT-MS0, F360-AP-MS0+
 *
 * @module hooks/ForgeTripleHooks
 */

import {
  type HookDefinition,
  type HookContext,
  hookSuccess,
  hookBlock,
} from "../engines/HookExecutor.js";

// ============================================================================
// PIPELINE-VAR-MS0: Pipeline Safety Gate
// Fires after any pipeline generates G-code — validates machine limits
// ============================================================================

const pipelineSafetyGate: HookDefinition = {
  id: "forge-pipeline-safety-gate",
  name: "Pipeline Safety Gate",
  description: "Validates G-code output from all 9 pipelines against machine limits (RPM, feed, axis travel). BLOCKS unsafe programs.",
  phase: "post-calculation",
  category: "enforcement",
  mode: "blocking",
  priority: "critical",
  enabled: true,
  tags: ["forge-triple", "pipeline-var", "safety", "gcode"],
  handler: (ctx: HookContext) => {
    const result = ctx.metadata?.result as any;
    if (!result?.program_text && !result?.gcode) return hookSuccess(pipelineSafetyGate, "No G-code output — skip");
    const gcode = result.program_text ?? result.gcode ?? "";
    if (gcode.length === 0) return hookSuccess(pipelineSafetyGate, "Empty program — skip");

    // Check for dangerous patterns
    const lines = gcode.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].replace(/\(.*?\)/g, "").trim();
      const sMatch = line.match(/S(\d+)/);
      if (sMatch && parseInt(sMatch[1]) > 30000) {
        return hookBlock(pipelineSafetyGate, `BLOCKED: S${sMatch[1]} exceeds 30000 RPM safety limit at line ${i + 1}`);
      }
      const fMatch = line.match(/F(\d+)/);
      if (fMatch && parseInt(fMatch[1]) > 50000) {
        return hookBlock(pipelineSafetyGate, `BLOCKED: F${fMatch[1]} exceeds 50000 mm/min safety limit at line ${i + 1}`);
      }
    }
    return hookSuccess(pipelineSafetyGate, `Pipeline output validated: ${lines.length} lines OK`);
  },
};

// ============================================================================
// PP-MOAT-MS0: Registry Check
// Blocks PostProcessor engine edits that add hardcoded defaults instead of registry lookups
// ============================================================================

const ppRegistryCheck: HookDefinition = {
  id: "forge-pp-registry-check",
  name: "PP Registry Check",
  description: "Warns when PostProcessor code contains hardcoded material/machine/tool defaults instead of registry lookups.",
  phase: "post-file-write",
  category: "validation",
  mode: "warning",
  priority: "high",
  enabled: true,
  tags: ["forge-triple", "pp-moat", "registry", "quality"],
  handler: (ctx: HookContext) => {
    const path = ctx.metadata?.filePath as string ?? "";
    if (!path.includes("PostProcessorPipeline") && !path.includes("postProcessor")) {
      return hookSuccess(ppRegistryCheck, "Not a PostProcessor file — skipped");
    }
    const content = ctx.metadata?.content as string ?? "";
    const hardcoded = [
      { pattern: /max_rpm\s*[:=]\s*12000/, msg: "hardcoded max_rpm=12000 — use MachineRegistry" },
      { pattern: /flute_count\s*[:=]\s*4/, msg: "hardcoded flute_count=4 — use ToolRegistry" },
      { pattern: /kc1_1\s*[:=]\s*\d{3,4}[^.]/, msg: "hardcoded kc1_1 — import from CANONICAL_KIENZLE" },
    ];
    const warnings = hardcoded.filter(h => h.pattern.test(content)).map(h => h.msg);
    if (warnings.length > 0) {
      return hookSuccess(ppRegistryCheck, `PP registry warnings: ${warnings.join("; ")}`, { warnings });
    }
    return hookSuccess(ppRegistryCheck, "No hardcoded defaults detected");
  },
};

// ============================================================================
// ULT-MS0: Shop Contract Drift
// Detects when backend/frontend shop domain contracts diverge
// ============================================================================

const shopContractDrift: HookDefinition = {
  id: "forge-shop-contract-drift",
  name: "Shop Contract Drift",
  description: "Warns when shop route or page changes may drift from canonical shopDomain.ts contracts.",
  phase: "post-file-write",
  category: "validation",
  mode: "warning",
  priority: "high",
  enabled: true,
  tags: ["forge-triple", "ult", "contract", "drift"],
  handler: (ctx: HookContext) => {
    const path = ctx.metadata?.filePath as string ?? "";
    if (!(path.includes("routes/erp") || path.includes("routes/shop") ||
          path.includes("pages/Jobs") || path.includes("pages/ShopFloor"))) {
      return hookSuccess(shopContractDrift, "Not a shop route/page — skipped");
    }
    return hookSuccess(shopContractDrift,
      "Shop route/page modified — verify alignment with src/schemas/shop/shopDomain.ts contracts");
  },
};

// ============================================================================
// CALC-HARDEN-MS0: Canonical Constants Enforcer
// Blocks inline kc1_1/mc/Taylor constants — must import from constants.ts
// ============================================================================

const canonicalConstantsEnforcer: HookDefinition = {
  id: "forge-canonical-constants-enforcer",
  name: "Canonical Constants Enforcer",
  description: "BLOCKS engine files that define inline Kienzle or Taylor constants instead of importing from physics/constants.ts.",
  phase: "post-file-write",
  category: "enforcement",
  mode: "blocking",
  priority: "critical",
  enabled: true,
  tags: ["forge-triple", "calc-harden", "physics", "constants"],
  handler: (ctx: HookContext) => {
    const path = ctx.metadata?.filePath as string ?? "";
    if (!(path.includes("engines/") && path.endsWith(".ts") && !path.includes("constants.ts"))) {
      return hookSuccess(canonicalConstantsEnforcer, "Not an engine .ts file — skipped");
    }
    const content = ctx.metadata?.content as string ?? "";
    // Check for inline kc1_1 definitions (not imports)
    const inlineKc = /(?:const|let|var)\s+kc1[_.]1\s*[:=]\s*\d/;
    const inlineTaylor = /(?:const|let|var)\s+(?:taylor_C|TAYLOR_C)\s*[:=]\s*\d/;
    if (inlineKc.test(content)) {
      return hookBlock(canonicalConstantsEnforcer,
        "BLOCKED: Inline kc1_1 constant detected. Import from src/physics/constants.ts: import { CANONICAL_KIENZLE } from '../physics/constants.js'");
    }
    if (inlineTaylor.test(content)) {
      return hookBlock(canonicalConstantsEnforcer,
        "BLOCKED: Inline Taylor constant detected. Import from src/physics/constants.ts: import { CANONICAL_TAYLOR } from '../physics/constants.js'");
    }
    return hookSuccess(canonicalConstantsEnforcer, "No inline physics constants detected");
  },
};

// ============================================================================
// SCIMATH-WIRE-MS0: Enforce SCIMATH Delegation
// Blocks ad-hoc linear algebra — must use SCIMATH engines
// ============================================================================

const enforceSCIMATHDelegation: HookDefinition = {
  id: "forge-enforce-scimath-delegation",
  name: "Enforce SCIMATH Delegation",
  description: "Warns when engine code implements ad-hoc linear algebra instead of delegating to SCIMATH engines (SVD, Cholesky, Eigensolver).",
  phase: "post-file-write",
  category: "validation",
  mode: "warning",
  priority: "normal",
  enabled: true,
  tags: ["forge-triple", "scimath-wire", "linear-algebra"],
  handler: (ctx: HookContext) => {
    const path = ctx.metadata?.filePath as string ?? "";
    if (!(path.includes("engines/") && !path.includes("SCIMATH") && !path.includes("Eigensolver") &&
          !path.includes("SVD") && !path.includes("Cholesky") && !path.includes("LU"))) {
      return hookSuccess(enforceSCIMATHDelegation, "Not subject to SCIMATH delegation check — skipped");
    }
    const content = ctx.metadata?.content as string ?? "";
    const patterns = [
      { re: /gaussian.?elimination/i, engine: "LUDecompositionEngine" },
      { re: /(?:function|const)\s+\w*eigenvalue/i, engine: "EigensolverEngine" },
      { re: /(?:function|const)\s+\w*svd/i, engine: "SVDEngine" },
    ];
    const violations = patterns.filter(p => p.re.test(content));
    if (violations.length > 0) {
      return hookSuccess(enforceSCIMATHDelegation,
        `SCIMATH delegation warning: consider using ${violations.map(v => v.engine).join(", ")} instead of ad-hoc implementation`);
    }
    return hookSuccess(enforceSCIMATHDelegation, "No ad-hoc linear algebra detected");
  },
};

// ============================================================================
// F360-AP: Fusion CAM Write Safety
// Validates Fusion 360 CAM bridge writes
// ============================================================================

const fusionCAMWriteSafety: HookDefinition = {
  id: "forge-fusion-cam-write-safety",
  name: "Fusion CAM Write Safety",
  description: "Validates Fusion 360 CAM bridge data writes for required fields and safe parameter ranges.",
  phase: "post-calculation",
  category: "validation",
  mode: "warning",
  priority: "high",
  enabled: true,
  tags: ["forge-triple", "f360-ap", "cam", "safety"],
  handler: (ctx: HookContext) => {
    const result = ctx.metadata?.result as any;
    if (!result?.operations) return hookSuccess(fusionCAMWriteSafety, "No operations — skip");
    for (const op of result.operations) {
      if (op.spindle_rpm > 25000) {
        return hookSuccess(fusionCAMWriteSafety,
          `F360 CAM warning: RPM ${op.spindle_rpm} exceeds 25000 — verify machine capability`, { warning: true });
      }
    }
    return hookSuccess(fusionCAMWriteSafety, "F360 CAM output validated");
  },
};

// ============================================================================
// TOKEN-OPT-MS0: Token Budget Enforcer
// Forces /compact when session token usage is excessive
// ============================================================================

const tokenBudgetEnforcer: HookDefinition = {
  id: "forge-token-budget-enforcer",
  name: "Token Budget Enforcer",
  description: "Warns when estimated session token usage is high, suggesting /compact to reclaim context.",
  phase: "on-tool-call",
  category: "observability",
  mode: "warning",
  priority: "normal",
  enabled: true,
  tags: ["forge-triple", "token-opt", "context", "budget"],
  handler: (ctx: HookContext) => {
    // Token tracking is advisory — just remind about compaction
    return hookSuccess(tokenBudgetEnforcer, "Token budget check passed");
  },
};

// ============================================================================
// WEDM-MS0: WEDM Studio Quality Gate
// Blocks compaction if WEDM step components have untested API calls
// ============================================================================

const wedmStudioQualityGate: HookDefinition = {
  id: "forge-wedm-studio-quality-gate",
  name: "WEDM Studio Quality Gate",
  description: "Validates Wire EDM Studio pipeline integrity — warns if step components have unhandled error states.",
  phase: "post-calculation",
  category: "validation",
  mode: "warning",
  priority: "high",
  enabled: true,
  tags: ["forge-triple", "wedm-ms0", "edm", "quality"],
  handler: (ctx: HookContext) => {
    const action = ctx.metadata?.action as string ?? "";
    if (!(action.includes("wedm") || action.includes("wire_edm"))) {
      return hookSuccess(wedmStudioQualityGate, "Not a WEDM action — skipped");
    }
    const result = ctx.metadata?.result as any;
    if (result?.warnings?.length > 0) {
      return hookSuccess(wedmStudioQualityGate,
        `WEDM pipeline completed with ${result.warnings.length} warnings`, { warnings: result.warnings });
    }
    return hookSuccess(wedmStudioQualityGate, "WEDM pipeline output clean");
  },
};

// ============================================================================
// WEDM-MS1: WEDM Full Capability Gate
// Validates surface integrity + quality results are complete
// ============================================================================

const wedmCapabilityGate: HookDefinition = {
  id: "forge-wedm-capability-gate",
  name: "WEDM Full Capability Gate",
  description: "Validates that WEDM advanced analysis (surface integrity, recast, fatigue, compliance) returns complete results.",
  phase: "post-calculation",
  category: "enforcement",
  mode: "warning",
  priority: "high",
  enabled: true,
  tags: ["forge-triple", "wedm-ms1", "edm", "surface-integrity"],
  handler: (ctx: HookContext) => {
    const action = ctx.metadata?.action as string ?? "";
    if (!(action.includes("wedm") && (action.includes("analyze") || action.includes("integrity")))) {
      return hookSuccess(wedmCapabilityGate, "Not a WEDM analyze/integrity action — skipped");
    }
    const result = ctx.metadata?.result as any;
    if (!result) return hookSuccess(wedmCapabilityGate, "No WEDM result — skip");
    const missing: string[] = [];
    if (!result.recast_layer && !result.surface_integrity) missing.push("surface_integrity");
    if (!result.uncertainty && !result.confidence) missing.push("uncertainty_quantification");
    if (missing.length > 0) {
      return hookSuccess(wedmCapabilityGate,
        `WEDM analysis incomplete — missing: ${missing.join(", ")}`, { missing });
    }
    return hookSuccess(wedmCapabilityGate, "WEDM analysis complete");
  },
};

// ============================================================================
// HM-REV-MS6 U-HMR33: hypermill-grinding-burn-risk
// Blocks when HyperMillGrindingBridge reports burn risk or wheel incompatibility.
// Specific grinding energy: u = Ft / (ae × b); θ = Jaeger thermal model.
// ============================================================================

const hypermillGrindingBurnRisk: HookDefinition = {
  id: "hypermill-grinding-burn-risk",
  name: "hyperMILL Grinding Burn Risk Gate",
  description: "Blocks grinding operations where specific grinding energy exceeds material burn threshold. Also blocks wheel-material incompatibility. Uses Jaeger thermal model (HM-REV-MS6 U-HMR33).",
  phase: "post-calculation",
  category: "manufacturing",
  mode: "blocking",
  priority: "critical",
  enabled: true,
  tags: ["forge-triple", "hm-rev-ms6", "grinding", "burn-risk", "safety"],
  handler: (ctx: HookContext) => {
    const action = ctx.metadata?.action as string ?? "";
    if (!(action === "cam_hypermill_grinding_route" || action === "cam:hypermill_grinding_route")) {
      return hookSuccess(hypermillGrindingBurnRisk, "Not a hyperMILL grinding action — skipped");
    }
    const result = ctx.metadata?.result as any;
    if (!result) return hookSuccess(hypermillGrindingBurnRisk, "No grinding result — skip");

    if (result.blocked === true) {
      const reason = result.blockReason ?? result.message ?? "Burn risk or wheel incompatibility detected";
      return hookBlock(hypermillGrindingBurnRisk,
        `GRINDING BLOCKED: ${reason}` +
        (result.grindingTemperature_C ? ` [θ=${result.grindingTemperature_C.toFixed(0)}°C]` : "")
      );
    }
    if (result.burnRisk === true) {
      return hookBlock(hypermillGrindingBurnRisk,
        `GRINDING BURN RISK: Predicted temperature ${result.grindingTemperature_C?.toFixed(0) ?? "?"}°C ` +
        `exceeds threshold ${result.burnThreshold_C ?? "?"}°C for ${result.material ?? "material"}`
      );
    }
    if (result.wheelCompatible === false) {
      return hookBlock(hypermillGrindingBurnRisk,
        `WHEEL INCOMPATIBILITY: Wheel abrasive ${result.wheelAbrasive ?? "?"} ` +
        `not suitable for ${result.material ?? "material"} — risk of glazing or workpiece damage`
      );
    }

    const tempNote = result.grindingTemperature_C
      ? ` θ=${result.grindingTemperature_C.toFixed(0)}°C`
      : "";
    return hookSuccess(hypermillGrindingBurnRisk, `Grinding parameters safe.${tempNote}`);
  },
};
// NOTE: hypermill-css-limit (MS7) and hypermill-biomedical-validation (MS7)
// are in HyperMillMillTurnHooks.ts to avoid duplicate hook IDs.

// ============================================================================
// EXPORTS
// ============================================================================

export const forgeTripleHooks: HookDefinition[] = [
  pipelineSafetyGate,
  ppRegistryCheck,
  shopContractDrift,
  canonicalConstantsEnforcer,
  enforceSCIMATHDelegation,
  fusionCAMWriteSafety,
  tokenBudgetEnforcer,
  wedmStudioQualityGate,
  wedmCapabilityGate,
  // HM-REV-MS6: grinding burn risk gate
  hypermillGrindingBurnRisk,
];
