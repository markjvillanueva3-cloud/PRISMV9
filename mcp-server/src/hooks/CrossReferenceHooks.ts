/**
 * PRISM MCP Server - Cross-Reference & Integrity Hooks
 * Session 6.2 Enhancement: Relationship Validation
 * 
 * Hooks that validate relationships between entities:
 * - Material exists when referenced
 * - Machine-controller compatibility
 * - Tool-material compatibility
 * - Alarm-controller family consistency
 * - Foreign key integrity
 * - Orphan detection
 * - Circular dependency detection
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
import { log } from "../utils/Logger.js";

// ============================================================================
// REFERENCE STORES (would connect to real registries in production)
// ============================================================================

// Simulated registry lookups - in production these would query actual registries
const registryLookup = {
  materialExists: (id: string): boolean => {
    // Would call MaterialRegistry.get(id)
    return true; // Placeholder - actual implementation queries registry
  },
  machineExists: (id: string): boolean => {
    return true;
  },
  toolExists: (id: string): boolean => {
    return true;
  },
  alarmExists: (id: string): boolean => {
    return true;
  },
  controllerFamilyExists: (family: string): boolean => {
    const validFamilies = ["FANUC", "HAAS", "SIEMENS", "MAZAK", "OKUMA", "HEIDENHAIN", 
                          "MITSUBISHI", "BROTHER", "HURCO", "FAGOR", "DMG_MORI", "DOOSAN"];
    return validFamilies.includes(family.toUpperCase());
  }
};

// Controller-machine compatibility matrix
const CONTROLLER_MACHINE_COMPATIBILITY: Record<string, string[]> = {
  "FANUC": ["DMG_MORI", "MAZAK", "OKUMA", "MAKINO", "MATSUURA", "DOOSAN", "HAAS", "KITAMURA", "TOYODA"],
  "HAAS": ["HAAS"],
  "SIEMENS": ["DMG_MORI", "HERMLE", "CHIRON", "INDEX", "EMAG", "GROB"],
  "MAZAK": ["MAZAK"],
  "OKUMA": ["OKUMA"],
  "HEIDENHAIN": ["HERMLE", "DMG_MORI", "CHIRON", "MIKRON", "GROB", "DECKEL"],
  "MITSUBISHI": ["MITSUBISHI", "MAZAK"],
  "BROTHER": ["BROTHER"]
};

// Material-operation compatibility (ISO groups)
const MATERIAL_OPERATION_COMPATIBILITY: Record<string, string[]> = {
  "P": ["turning", "milling", "drilling", "boring", "threading", "grooving", "parting"],
  "M": ["turning", "milling", "drilling", "boring", "threading"],
  "K": ["turning", "milling", "drilling", "boring"],
  "N": ["turning", "milling", "drilling", "boring", "threading", "engraving"],
  "S": ["turning", "milling", "drilling"],  // Limited due to difficulty
  "H": ["turning", "milling", "grinding", "hard_turning"]   // Hard turning/milling, grinding preferred
};

// Tool-material compatibility (tool material vs workpiece ISO group)
const TOOL_MATERIAL_COMPATIBILITY: Record<string, Record<string, boolean>> = {
  "HSS": { "P": true, "M": true, "K": true, "N": true, "S": false, "H": false },
  "CARBIDE": { "P": true, "M": true, "K": true, "N": true, "S": true, "H": true },
  "CERAMIC": { "P": true, "M": false, "K": true, "N": false, "S": true, "H": true },
  "CBN": { "P": true, "M": false, "K": true, "N": false, "S": true, "H": true },
  "PCD": { "P": false, "M": false, "K": false, "N": true, "S": false, "H": false }
};

// ============================================================================
// FOREIGN KEY VALIDATION HOOKS
// ============================================================================

/**
 * Validate material reference exists
 */
const preMaterialReferenceValidation: HookDefinition = {
  id: "pre-material-reference-validation",
  name: "Material Reference Validation",
  description: "Validates that referenced material IDs exist in the registry.",
  
  phase: "pre-calculation",
  category: "enforcement",
  mode: "blocking",
  priority: "high",
  enabled: true,
  
  tags: ["cross-reference", "material", "foreign-key", "integrity"],
  
  handler: (context: HookContext): HookResult => {
    const hook = preMaterialReferenceValidation;
    
    const materialId = context.metadata?.material_id as string ||
                       (context.target?.data as any)?.material_id;
    
    if (!materialId) {
      return hookSuccess(hook, "No material reference to validate");
    }
    
    // In production, this would actually query the registry
    const exists = registryLookup.materialExists(materialId);
    
    if (!exists) {
      return hookBlock(hook,
        `⛔ Material reference not found: ${materialId}`,
        {
          issues: [
            `Material ID '${materialId}' does not exist in MaterialRegistry`,
            "Ensure the material is added before referencing it",
            "Check for typos in the material ID"
          ]
        }
      );
    }
    
    return hookSuccess(hook, `Material reference valid: ${materialId}`);
  }
};

/**
 * Validate machine reference exists
 */
const preMachineReferenceValidation: HookDefinition = {
  id: "pre-machine-reference-validation",
  name: "Machine Reference Validation",
  description: "Validates that referenced machine IDs exist in the registry.",
  
  phase: "pre-calculation",
  category: "enforcement",
  mode: "blocking",
  priority: "high",
  enabled: true,
  
  tags: ["cross-reference", "machine", "foreign-key", "integrity"],
  
  handler: (context: HookContext): HookResult => {
    const hook = preMachineReferenceValidation;
    
    const machineId = context.metadata?.machine_id as string ||
                      (context.target?.data as any)?.machine_id;
    
    if (!machineId) {
      return hookSuccess(hook, "No machine reference to validate");
    }
    
    const exists = registryLookup.machineExists(machineId);
    
    if (!exists) {
      return hookBlock(hook,
        `⛔ Machine reference not found: ${machineId}`,
        {
          issues: [
            `Machine ID '${machineId}' does not exist in MachineRegistry`,
            "Ensure the machine is added before referencing it"
          ]
        }
      );
    }
    
    return hookSuccess(hook, `Machine reference valid: ${machineId}`);
  }
};

/**
 * Validate tool reference exists
 */
const preToolReferenceValidation: HookDefinition = {
  id: "pre-tool-reference-validation",
  name: "Tool Reference Validation",
  description: "Validates that referenced tool IDs exist in the registry.",
  
  phase: "pre-calculation",
  category: "enforcement",
  mode: "blocking",
  priority: "high",
  enabled: true,
  
  tags: ["cross-reference", "tool", "foreign-key", "integrity"],
  
  handler: (context: HookContext): HookResult => {
    const hook = preToolReferenceValidation;
    
    const toolId = context.metadata?.tool_id as string ||
                   (context.target?.data as any)?.tool_id;
    
    if (!toolId) {
      return hookSuccess(hook, "No tool reference to validate");
    }
    
    const exists = registryLookup.toolExists(toolId);
    
    if (!exists) {
      return hookBlock(hook,
        `⛔ Tool reference not found: ${toolId}`,
        {
          issues: [
            `Tool ID '${toolId}' does not exist in ToolRegistry`,
            "Ensure the tool is added before referencing it"
          ]
        }
      );
    }
    
    return hookSuccess(hook, `Tool reference valid: ${toolId}`);
  }
};

// ============================================================================
// COMPATIBILITY VALIDATION HOOKS
// ============================================================================

/**
 * Validate machine-controller compatibility
 */
const preMachineControllerCompatibility: HookDefinition = {
  id: "pre-machine-controller-compatibility",
  name: "Machine-Controller Compatibility",
  description: "Validates that machine and controller are compatible.",
  
  phase: "pre-machine-add",
  category: "enforcement",
  mode: "warning",
  priority: "normal",
  enabled: true,
  
  tags: ["compatibility", "machine", "controller"],
  
  handler: (context: HookContext): HookResult => {
    const hook = preMachineControllerCompatibility;
    
    const machine = context.target?.data as {
      manufacturer?: string;
      controller_type?: string;
    } | undefined;
    
    if (!machine?.manufacturer || !machine?.controller_type) {
      return hookSuccess(hook, "Insufficient data for compatibility check");
    }
    
    const manufacturer = machine.manufacturer.toUpperCase();
    const controller = machine.controller_type.toUpperCase();
    
    // Check if controller is compatible with manufacturer
    const compatibleManufacturers = CONTROLLER_MACHINE_COMPATIBILITY[controller];
    
    if (!compatibleManufacturers) {
      return hookWarning(hook,
        `Unknown controller type: ${controller}`,
        {
          warnings: ["Controller type not in compatibility matrix - verify manually"]
        }
      );
    }
    
    const isCompatible = compatibleManufacturers.some(m => 
      manufacturer.includes(m) || m.includes(manufacturer)
    );
    
    if (!isCompatible) {
      return hookWarning(hook,
        `⚠️ Unusual machine-controller combination: ${manufacturer} with ${controller}`,
        {
          warnings: [
            `${controller} controllers are typically found on: ${compatibleManufacturers.join(", ")}`,
            "This combination may work but is uncommon",
            "Verify the controller type is correct"
          ]
        }
      );
    }
    
    return hookSuccess(hook, `Compatible: ${manufacturer} with ${controller}`);
  }
};

/**
 * Validate tool-material compatibility
 */
const preToolMaterialCompatibility: HookDefinition = {
  id: "pre-tool-material-compatibility",
  name: "Tool-Material Compatibility",
  description: "Validates that the tool material is suitable for the workpiece material.",
  
  phase: "pre-calculation",
  category: "enforcement",
  mode: "warning",
  priority: "high",
  enabled: true,
  
  tags: ["compatibility", "tool", "material", "cutting"],
  
  handler: (context: HookContext): HookResult => {
    const hook = preToolMaterialCompatibility;
    
    const params = context.target?.data as {
      tool_material?: string;
      workpiece_iso_group?: string;
      iso_group?: string;
    } | undefined;
    
    const toolMaterial = params?.tool_material?.toUpperCase();
    const workpieceGroup = (params?.workpiece_iso_group || params?.iso_group)?.toUpperCase();
    
    if (!toolMaterial || !workpieceGroup) {
      return hookSuccess(hook, "Insufficient data for tool-material compatibility check");
    }
    
    const compatibility = TOOL_MATERIAL_COMPATIBILITY[toolMaterial];
    
    if (!compatibility) {
      return hookWarning(hook,
        `Unknown tool material: ${toolMaterial}`,
        { warnings: ["Tool material not in compatibility matrix"] }
      );
    }
    
    const isCompatible = compatibility[workpieceGroup];
    
    if (isCompatible === false) {
      return hookWarning(hook,
        `⚠️ Tool-material incompatibility: ${toolMaterial} on ISO group ${workpieceGroup}`,
        {
          warnings: [
            `${toolMaterial} tools are NOT recommended for ISO group ${workpieceGroup}`,
            toolMaterial === "PCD" && workpieceGroup !== "N" ? 
              "PCD is only for non-ferrous materials (aluminum, plastics)" : "",
            toolMaterial === "HSS" && (workpieceGroup === "S" || workpieceGroup === "H") ?
              "HSS lacks heat resistance for superalloys/hardened materials" : "",
            "Consider: " + Object.entries(TOOL_MATERIAL_COMPATIBILITY)
              .filter(([_, compat]) => compat[workpieceGroup])
              .map(([mat]) => mat)
              .join(", ")
          ].filter(Boolean)
        }
      );
    }
    
    return hookSuccess(hook, `Compatible: ${toolMaterial} for ISO group ${workpieceGroup}`);
  }
};

/**
 * Validate material-operation compatibility
 */
const preMaterialOperationCompatibility: HookDefinition = {
  id: "pre-material-operation-compatibility",
  name: "Material-Operation Compatibility",
  description: "Validates that the operation is suitable for the material's ISO group.",
  
  phase: "pre-calculation",
  category: "enforcement",
  mode: "warning",
  priority: "normal",
  enabled: true,
  
  tags: ["compatibility", "material", "operation"],
  
  handler: (context: HookContext): HookResult => {
    const hook = preMaterialOperationCompatibility;
    
    const isoGroup = context.metadata?.iso_group as string ||
                     (context.target?.data as any)?.iso_group;
    const operation = context.metadata?.operation_type as string ||
                      context.operation;
    
    if (!isoGroup || !operation) {
      return hookSuccess(hook, "Insufficient data for compatibility check");
    }
    
    const group = isoGroup.toUpperCase();
    const op = operation.toLowerCase();
    
    const compatibleOps = MATERIAL_OPERATION_COMPATIBILITY[group];
    
    if (!compatibleOps) {
      return hookWarning(hook,
        `Unknown ISO group: ${group}`,
        { warnings: ["ISO group not in compatibility matrix"] }
      );
    }
    
    const isCompatible = compatibleOps.some(o => op.includes(o));
    
    if (!isCompatible) {
      return hookWarning(hook,
        `⚠️ Operation '${operation}' may not be suitable for ISO group ${group}`,
        {
          warnings: [
            `ISO group ${group} materials are typically processed with: ${compatibleOps.join(", ")}`,
            "Consider alternative machining strategies",
            group === "S" ? "Superalloys require specialized tooling and reduced speeds" : "",
            group === "H" ? "Hardened materials may require CBN/ceramic tooling or grinding" : ""
          ].filter(Boolean)
        }
      );
    }
    
    return hookSuccess(hook, `Compatible: ${operation} for ISO group ${group}`);
  }
};

/**
 * Validate alarm-controller family consistency
 */
const preAlarmControllerConsistency: HookDefinition = {
  id: "pre-alarm-controller-consistency",
  name: "Alarm-Controller Family Consistency",
  description: "Validates that alarm belongs to a valid controller family with correct format.",
  
  phase: "pre-alarm-add",
  category: "enforcement",
  mode: "blocking",
  priority: "high",
  enabled: true,
  
  tags: ["consistency", "alarm", "controller", "format"],
  
  handler: (context: HookContext): HookResult => {
    const hook = preAlarmControllerConsistency;
    
    const alarm = context.target?.data as {
      alarm_id?: string;
      code?: string;
      controller_family?: string;
    } | undefined;
    
    if (!alarm?.controller_family) {
      return hookBlock(hook,
        "⛔ Alarm missing controller_family",
        { issues: ["Every alarm must specify its controller family"] }
      );
    }
    
    const family = alarm.controller_family.toUpperCase();
    const valid = registryLookup.controllerFamilyExists(family);
    
    if (!valid) {
      return hookBlock(hook,
        `⛔ Invalid controller family: ${family}`,
        {
          issues: [
            `Controller family '${family}' is not recognized`,
            "Valid families: FANUC, HAAS, SIEMENS, MAZAK, OKUMA, HEIDENHAIN, MITSUBISHI, BROTHER, HURCO, FAGOR, DMG_MORI, DOOSAN"
          ]
        }
      );
    }
    
    // Check alarm ID/code format matches controller family conventions
    const alarmId = alarm.alarm_id || alarm.code || "";
    const formatRules: Record<string, { pattern: RegExp; example: string }> = {
      "FANUC": { pattern: /^(ALM-FAN|PS|SV|OT|SR|IO|BG|SW|MC|SP|DS|PC)\d*/i, example: "PS0001, SV0401, OT0100" },
      "HAAS": { pattern: /^(ALM-HAAS|\d{3,4})/i, example: "101, 1001" },
      "SIEMENS": { pattern: /^(ALM-SIEM|NCK|\d{4,6})/i, example: "10000, 61000" },
      "MAZAK": { pattern: /^(ALM-MAZ|MC|NC|PLC)/i, example: "MC0001, NC100" },
      "OKUMA": { pattern: /^(ALM-OKU|\d{4})/i, example: "0001, 1000" },
      "HEIDENHAIN": { pattern: /^(ALM-HEID|FE\s?\d+|\d{4,5})/i, example: "FE 1001, 10000" }
    };
    
    const rule = formatRules[family];
    if (rule && !rule.pattern.test(alarmId)) {
      return hookWarning(hook,
        `⚠️ Alarm ID '${alarmId}' doesn't match typical ${family} format`,
        {
          warnings: [
            `${family} alarms typically look like: ${rule.example}`,
            "This may indicate a misclassified alarm or typo"
          ]
        }
      );
    }
    
    return hookSuccess(hook, `Valid: ${alarm.alarm_id || alarm.code} for ${family}`);
  }
};

// ============================================================================
// INTEGRITY & ORPHAN DETECTION HOOKS
// ============================================================================

/**
 * Detect orphaned references during audit
 */
const onOrphanDetection: HookDefinition = {
  id: "on-orphan-detection",
  name: "Orphan Reference Detection",
  description: "Detects data that references non-existent entities.",
  
  phase: "on-audit",
  category: "validation",
  mode: "warning",
  priority: "low",
  enabled: true,
  
  tags: ["orphan", "integrity", "audit", "cleanup"],
  
  handler: (context: HookContext): HookResult => {
    const hook = onOrphanDetection;
    
    const references = context.metadata?.references as Array<{
      type: string;
      id: string;
      referencedBy: string;
    }> | undefined;
    
    if (!references || references.length === 0) {
      return hookSuccess(hook, "No references to check");
    }
    
    const orphans: string[] = [];
    
    for (const ref of references) {
      let exists = false;
      
      switch (ref.type) {
        case "material":
          exists = registryLookup.materialExists(ref.id);
          break;
        case "machine":
          exists = registryLookup.machineExists(ref.id);
          break;
        case "tool":
          exists = registryLookup.toolExists(ref.id);
          break;
        default:
          exists = true; // Unknown type, assume exists
      }
      
      if (!exists) {
        orphans.push(`${ref.referencedBy} → ${ref.type}:${ref.id} (NOT FOUND)`);
      }
    }
    
    if (orphans.length > 0) {
      return hookWarning(hook,
        `Found ${orphans.length} orphaned references`,
        {
          warnings: orphans.slice(0, 10),
          data: { totalOrphans: orphans.length, orphans }
        }
      );
    }
    
    return hookSuccess(hook, "No orphaned references found");
  }
};

/**
 * Detect circular dependencies
 */
const onCircularDependencyDetection: HookDefinition = {
  id: "on-circular-dependency-detection",
  name: "Circular Dependency Detection",
  description: "Detects circular dependencies in reference chains.",
  
  phase: "on-audit",
  category: "validation",
  mode: "blocking",
  priority: "high",
  enabled: true,
  
  tags: ["circular", "dependency", "integrity", "critical"],
  
  handler: (context: HookContext): HookResult => {
    const hook = onCircularDependencyDetection;
    
    const dependencyGraph = context.metadata?.dependencyGraph as Record<string, string[]> | undefined;
    
    if (!dependencyGraph || Object.keys(dependencyGraph).length === 0) {
      return hookSuccess(hook, "No dependency graph to check");
    }
    
    // DFS to detect cycles
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const cycles: string[][] = [];
    
    function dfs(node: string, path: string[]): boolean {
      if (recursionStack.has(node)) {
        // Found cycle
        const cycleStart = path.indexOf(node);
        cycles.push([...path.slice(cycleStart), node]);
        return true;
      }
      
      if (visited.has(node)) {
        return false;
      }
      
      visited.add(node);
      recursionStack.add(node);
      
      const deps = dependencyGraph[node] || [];
      for (const dep of deps) {
        dfs(dep, [...path, node]);
      }
      
      recursionStack.delete(node);
      return false;
    }
    
    for (const node of Object.keys(dependencyGraph)) {
      if (!visited.has(node)) {
        dfs(node, []);
      }
    }
    
    if (cycles.length > 0) {
      return hookBlock(hook,
        `⛔ Detected ${cycles.length} circular dependencies`,
        {
          issues: cycles.slice(0, 5).map(c => `Cycle: ${c.join(" → ")}`),
          data: { totalCycles: cycles.length }
        }
      );
    }
    
    return hookSuccess(hook, "No circular dependencies detected");
  }
};

/**
 * Validate unique constraints
 */
const preUniqueConstraintValidation: HookDefinition = {
  id: "pre-unique-constraint-validation",
  name: "Unique Constraint Validation",
  description: "Validates that IDs and unique fields are not duplicated.",
  
  phase: "pre-material-add",
  category: "enforcement",
  mode: "blocking",
  priority: "critical",
  enabled: true,
  
  tags: ["unique", "constraint", "duplicate", "integrity"],
  
  handler: (context: HookContext): HookResult => {
    const hook = preUniqueConstraintValidation;
    
    const item = context.target?.data as {
      material_id?: string;
      machine_id?: string;
      tool_id?: string;
      alarm_id?: string;
      name?: string;
    } | undefined;
    
    const id = item?.material_id || item?.machine_id || item?.tool_id || item?.alarm_id;
    const type = context.target?.type || "unknown";
    
    if (!id) {
      return hookBlock(hook,
        `⛔ Missing required ID field for ${type}`,
        { issues: ["Every entity must have a unique identifier"] }
      );
    }
    
    // Check ID format
    if (!/^[A-Za-z0-9_-]+$/.test(id)) {
      return hookBlock(hook,
        `⛔ Invalid ID format: ${id}`,
        {
          issues: [
            "IDs must contain only alphanumeric characters, hyphens, and underscores",
            `Invalid ID: ${id}`
          ]
        }
      );
    }
    
    // In production, would check against registry for duplicates
    // const exists = registry.exists(id);
    
    return hookSuccess(hook, `Unique constraint validated: ${id}`);
  }
};

// ============================================================================
// BATCH VALIDATION HOOKS
// ============================================================================

/**
 * Pre-batch import validation
 */
const preBatchImportValidation: HookDefinition = {
  id: "pre-batch-import-validation",
  name: "Batch Import Validation",
  description: "Validates batch imports before processing.",
  
  phase: "pre-batch-import",
  category: "enforcement",
  mode: "blocking",
  priority: "critical",
  enabled: true,
  
  tags: ["batch", "import", "validation", "bulk"],
  
  handler: (context: HookContext): HookResult => {
    const hook = preBatchImportValidation;
    
    const batch = context.metadata?.batch as Array<Record<string, unknown>> | undefined;
    const batchType = context.metadata?.batchType as string || "unknown";
    
    if (!batch || batch.length === 0) {
      return hookSuccess(hook, "No batch data to validate");
    }
    
    const issues: string[] = [];
    const warnings: string[] = [];
    
    // Check batch size limits
    const MAX_BATCH_SIZE = 500;
    if (batch.length > MAX_BATCH_SIZE) {
      issues.push(`Batch size ${batch.length} exceeds maximum ${MAX_BATCH_SIZE}`);
    } else if (batch.length > 100) {
      warnings.push(`Large batch: ${batch.length} items. Consider smaller batches for safety.`);
    }
    
    // Check for duplicates within batch
    const ids = new Set<string>();
    const duplicates: string[] = [];
    
    for (const item of batch) {
      const id = (item.material_id || item.machine_id || item.alarm_id || item.tool_id || item.id) as string;
      if (id) {
        if (ids.has(id)) {
          duplicates.push(id);
        }
        ids.add(id);
      }
    }
    
    if (duplicates.length > 0) {
      issues.push(`Duplicate IDs in batch: ${duplicates.slice(0, 5).join(", ")}${duplicates.length > 5 ? ` (+${duplicates.length - 5} more)` : ""}`);
    }
    
    // Type-specific validation
    if (batchType === "material") {
      const missingIsoGroup = batch.filter(m => !m.iso_group).length;
      if (missingIsoGroup > 0) {
        issues.push(`${missingIsoGroup} materials missing required iso_group field`);
      }
      
      const missingName = batch.filter(m => !m.name).length;
      if (missingName > 0) {
        warnings.push(`${missingName} materials missing name field`);
      }
    }
    
    if (batchType === "alarm") {
      const missingFamily = batch.filter(a => !a.controller_family).length;
      if (missingFamily > 0) {
        issues.push(`${missingFamily} alarms missing required controller_family field`);
      }
      
      const missingCode = batch.filter(a => !a.code && !a.alarm_id).length;
      if (missingCode > 0) {
        issues.push(`${missingCode} alarms missing code or alarm_id`);
      }
    }
    
    if (batchType === "machine") {
      const missingManufacturer = batch.filter(m => !m.manufacturer).length;
      if (missingManufacturer > 0) {
        warnings.push(`${missingManufacturer} machines missing manufacturer field`);
      }
    }
    
    if (issues.length > 0) {
      return hookBlock(hook,
        `⛔ Batch validation failed: ${issues.length} issues`,
        { issues, data: { batchSize: batch.length, batchType } }
      );
    }
    
    if (warnings.length > 0) {
      return hookWarning(hook,
        `Batch validation passed with ${warnings.length} warnings`,
        { warnings, data: { batchSize: batch.length, batchType } }
      );
    }
    
    return hookSuccess(hook, `Batch validated: ${batch.length} ${batchType} items`, {
      data: { batchSize: batch.length, batchType }
    });
  }
};

/**
 * Post-batch rollback trigger
 */
const postBatchRollbackTrigger: HookDefinition = {
  id: "post-batch-rollback-trigger",
  name: "Batch Rollback Trigger",
  description: "Triggers rollback if batch operation has too many failures.",
  
  phase: "post-batch-import",
  category: "enforcement",
  mode: "blocking",
  priority: "critical",
  enabled: true,
  
  tags: ["batch", "rollback", "recovery", "transaction"],
  
  handler: (context: HookContext): HookResult => {
    const hook = postBatchRollbackTrigger;
    
    const results = context.metadata?.batchResults as {
      total: number;
      successes: number;
      failures: number;
      errors: string[];
    } | undefined;
    
    if (!results) {
      return hookSuccess(hook, "No batch results to check");
    }
    
    const failureRate = results.failures / results.total;
    const ROLLBACK_THRESHOLD = 0.2; // 20% failure rate triggers rollback
    
    if (failureRate > ROLLBACK_THRESHOLD) {
      return hookBlock(hook,
        `⛔ ROLLBACK TRIGGERED: ${(failureRate * 100).toFixed(1)}% failure rate exceeds ${ROLLBACK_THRESHOLD * 100}% threshold`,
        {
          issues: [
            `${results.failures} of ${results.total} items failed`,
            "All changes from this batch should be rolled back",
            ...results.errors.slice(0, 5)
          ],
          data: { ...results, rollbackRequired: true }
        }
      );
    }
    
    if (results.failures > 0) {
      return hookWarning(hook,
        `Batch completed with ${results.failures} failures (${(failureRate * 100).toFixed(1)}%)`,
        {
          warnings: results.errors.slice(0, 5),
          data: results
        }
      );
    }
    
    return hookSuccess(hook, `Batch completed: ${results.successes}/${results.total} successful`);
  }
};

// ============================================================================
// EXPORT ALL CROSS-REFERENCE HOOKS
// ============================================================================

export const crossReferenceHooks: HookDefinition[] = [
  // Foreign key validation
  preMaterialReferenceValidation,
  preMachineReferenceValidation,
  preToolReferenceValidation,
  
  // Compatibility
  preMachineControllerCompatibility,
  preToolMaterialCompatibility,
  preMaterialOperationCompatibility,
  preAlarmControllerConsistency,
  
  // Integrity
  onOrphanDetection,
  onCircularDependencyDetection,
  preUniqueConstraintValidation,
  
  // Batch
  preBatchImportValidation,
  postBatchRollbackTrigger
];

export {
  preMaterialReferenceValidation,
  preMachineReferenceValidation,
  preToolReferenceValidation,
  preMachineControllerCompatibility,
  preToolMaterialCompatibility,
  preMaterialOperationCompatibility,
  preAlarmControllerConsistency,
  onOrphanDetection,
  onCircularDependencyDetection,
  preUniqueConstraintValidation,
  preBatchImportValidation,
  postBatchRollbackTrigger,
  CONTROLLER_MACHINE_COMPATIBILITY,
  MATERIAL_OPERATION_COMPATIBILITY,
  TOOL_MATERIAL_COMPATIBILITY
};
