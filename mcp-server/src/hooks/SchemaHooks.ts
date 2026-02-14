/**
 * PRISM MCP Server - Schema & Migration Hooks
 * Session 6.2 Enhancement: Schema Validation and Migration Safety
 * 
 * Hooks for schema validation and migration safety:
 * - Schema version validation
 * - Field deprecation warnings
 * - Migration compatibility checks
 * - Data format validation
 * - Backward compatibility
 * - Forward compatibility warnings
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
// SCHEMA DEFINITIONS
// ============================================================================

// Current schema versions
const CURRENT_SCHEMA_VERSIONS: Record<string, string> = {
  material: "3.0.0",
  machine: "2.5.0",
  tool: "2.0.0",
  alarm: "1.5.0",
  formula: "1.0.0",
  agent: "1.0.0"
};

// Minimum compatible versions (for migration)
const MIN_COMPATIBLE_VERSIONS: Record<string, string> = {
  material: "2.0.0",
  machine: "2.0.0",
  tool: "1.5.0",
  alarm: "1.0.0",
  formula: "1.0.0",
  agent: "1.0.0"
};

// Deprecated fields by entity type and version deprecated
const DEPRECATED_FIELDS: Record<string, Array<{
  field: string;
  deprecatedIn: string;
  removedIn: string | null;
  replacement: string | null;
  reason: string;
}>> = {
  material: [
    { field: "cutting_speed_min", deprecatedIn: "2.5.0", removedIn: "4.0.0", replacement: "cutting_speed.min", reason: "Nested structure for range values" },
    { field: "cutting_speed_max", deprecatedIn: "2.5.0", removedIn: "4.0.0", replacement: "cutting_speed.max", reason: "Nested structure for range values" },
    { field: "machinability_index", deprecatedIn: "3.0.0", removedIn: null, replacement: "machinability_rating", reason: "Standardized naming" },
    { field: "taylor_n", deprecatedIn: "2.8.0", removedIn: null, replacement: "taylor_coefficients.n", reason: "Grouped with other Taylor coefficients" }
  ],
  machine: [
    { field: "max_rpm", deprecatedIn: "2.0.0", removedIn: "3.0.0", replacement: "spindle.max_rpm", reason: "Nested under spindle object" },
    { field: "x_travel", deprecatedIn: "2.0.0", removedIn: "3.0.0", replacement: "travels.x", reason: "Consolidated travel specifications" },
    { field: "y_travel", deprecatedIn: "2.0.0", removedIn: "3.0.0", replacement: "travels.y", reason: "Consolidated travel specifications" },
    { field: "z_travel", deprecatedIn: "2.0.0", removedIn: "3.0.0", replacement: "travels.z", reason: "Consolidated travel specifications" }
  ],
  alarm: [
    { field: "family", deprecatedIn: "1.2.0", removedIn: "2.0.0", replacement: "controller_family", reason: "Clearer naming" }
  ]
};

// Required fields by entity type
const REQUIRED_FIELDS: Record<string, string[]> = {
  material: ["material_id", "name", "iso_group", "category"],
  machine: ["machine_id", "manufacturer", "model", "controller_type"],
  tool: ["tool_id", "type", "diameter"],
  alarm: ["alarm_id", "code", "controller_family", "severity"],
  formula: ["formula_id", "name", "expression", "domain"],
  agent: ["agent_id", "name", "type", "capabilities"]
};

// Field type validators
const FIELD_VALIDATORS: Record<string, Record<string, (value: unknown) => boolean>> = {
  material: {
    iso_group: (v) => typeof v === "string" && /^[PMKNSH]$/.test(v),
    hardness_min: (v) => typeof v === "number" && v >= 0 && v <= 70,
    hardness_max: (v) => typeof v === "number" && v >= 0 && v <= 70,
    density: (v) => typeof v === "number" && v > 0 && v < 25,
    thermal_conductivity: (v) => typeof v === "number" && v > 0
  },
  machine: {
    controller_type: (v) => typeof v === "string" && ["FANUC", "HAAS", "SIEMENS", "MAZAK", "OKUMA", "HEIDENHAIN", "MITSUBISHI", "BROTHER"].includes((v as string).toUpperCase()),
    spindle_max_rpm: (v) => typeof v === "number" && v > 0 && v <= 100000,
    spindle_power: (v) => typeof v === "number" && v > 0 && v <= 200
  },
  alarm: {
    severity: (v) => typeof v === "string" && ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"].includes((v as string).toUpperCase())
  }
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function parseVersion(version: string): { major: number; minor: number; patch: number } {
  const parts = version.split(".").map(Number);
  return {
    major: parts[0] || 0,
    minor: parts[1] || 0,
    patch: parts[2] || 0
  };
}

function compareVersions(v1: string, v2: string): number {
  const p1 = parseVersion(v1);
  const p2 = parseVersion(v2);
  
  if (p1.major !== p2.major) return p1.major - p2.major;
  if (p1.minor !== p2.minor) return p1.minor - p2.minor;
  return p1.patch - p2.patch;
}

function isVersionCompatible(version: string, minVersion: string): boolean {
  return compareVersions(version, minVersion) >= 0;
}

// ============================================================================
// SCHEMA VERSION HOOKS
// ============================================================================

/**
 * Validate schema version
 */
const preSchemaVersionValidation: HookDefinition = {
  id: "pre-schema-version-validation",
  name: "Schema Version Validation",
  description: "Validates that data conforms to compatible schema version.",
  
  phase: "pre-material-add",
  category: "schema",
  mode: "blocking",
  priority: "critical",
  enabled: true,
  
  tags: ["schema", "version", "compatibility"],
  
  handler: (context: HookContext): HookResult => {
    const hook = preSchemaVersionValidation;
    
    const entityType = context.target?.type || "unknown";
    const data = context.target?.data as { _schema_version?: string } | undefined;
    const dataVersion = data?._schema_version;
    
    const currentVersion = CURRENT_SCHEMA_VERSIONS[entityType];
    const minVersion = MIN_COMPATIBLE_VERSIONS[entityType];
    
    if (!currentVersion) {
      return hookSuccess(hook, `No schema version defined for ${entityType}`);
    }
    
    // If data has no version, assume current
    if (!dataVersion) {
      return hookWarning(hook,
        `No schema version in ${entityType} data`,
        {
          warnings: [
            "Data should include _schema_version field",
            `Assuming current version: ${currentVersion}`
          ]
        }
      );
    }
    
    // Check if version is too old
    if (minVersion && !isVersionCompatible(dataVersion, minVersion)) {
      return hookBlock(hook,
        `⛔ Schema version ${dataVersion} is incompatible`,
        {
          issues: [
            `${entityType} data version ${dataVersion} is below minimum ${minVersion}`,
            "Data migration required before import",
            "Run migration tool to upgrade data format"
          ]
        }
      );
    }
    
    // Check if version is newer than current (forward compatibility warning)
    if (compareVersions(dataVersion, currentVersion) > 0) {
      return hookWarning(hook,
        `⚠️ Schema version ${dataVersion} is newer than current ${currentVersion}`,
        {
          warnings: [
            "Data may contain fields not recognized by current system",
            "Some features may not work as expected",
            "Consider upgrading PRISM to latest version"
          ]
        }
      );
    }
    
    return hookSuccess(hook, `Schema version ${dataVersion} is compatible`);
  }
};

// ============================================================================
// DEPRECATION HOOKS
// ============================================================================

/**
 * Check for deprecated fields
 */
const preDeprecatedFieldCheck: HookDefinition = {
  id: "pre-deprecated-field-check",
  name: "Deprecated Field Check",
  description: "Warns about deprecated fields that should be migrated.",
  
  phase: "pre-material-add",
  category: "schema",
  mode: "warning",
  priority: "normal",
  enabled: true,
  
  tags: ["deprecated", "migration", "fields"],
  
  handler: (context: HookContext): HookResult => {
    const hook = preDeprecatedFieldCheck;
    
    const entityType = context.target?.type || "unknown";
    const data = context.target?.data as Record<string, unknown> | undefined;
    
    if (!data) {
      return hookSuccess(hook, "No data to check");
    }
    
    const deprecatedList = DEPRECATED_FIELDS[entityType] || [];
    const foundDeprecated: string[] = [];
    const migrationInstructions: string[] = [];
    
    for (const dep of deprecatedList) {
      if (dep.field in data) {
        foundDeprecated.push(dep.field);
        
        if (dep.replacement) {
          migrationInstructions.push(`${dep.field} → ${dep.replacement} (${dep.reason})`);
        }
        
        if (dep.removedIn) {
          migrationInstructions.push(`  ⚠️ Will be REMOVED in version ${dep.removedIn}`);
        }
      }
    }
    
    if (foundDeprecated.length > 0) {
      return hookWarning(hook,
        `Found ${foundDeprecated.length} deprecated fields`,
        {
          warnings: [
            `Deprecated fields: ${foundDeprecated.join(", ")}`,
            "Migration recommended:",
            ...migrationInstructions
          ]
        }
      );
    }
    
    return hookSuccess(hook, "No deprecated fields found");
  }
};

// ============================================================================
// REQUIRED FIELD HOOKS
// ============================================================================

/**
 * Validate required fields
 */
const preRequiredFieldValidation: HookDefinition = {
  id: "pre-required-field-validation",
  name: "Required Field Validation",
  description: "Validates that all required fields are present.",
  
  phase: "pre-material-add",
  category: "schema",
  mode: "blocking",
  priority: "critical",
  enabled: true,
  
  tags: ["required", "fields", "validation"],
  
  handler: (context: HookContext): HookResult => {
    const hook = preRequiredFieldValidation;
    
    const entityType = context.target?.type || "unknown";
    const data = context.target?.data as Record<string, unknown> | undefined;
    
    if (!data) {
      return hookBlock(hook, "No data provided", { issues: ["Data object is empty or undefined"] });
    }
    
    const requiredFields = REQUIRED_FIELDS[entityType] || [];
    const missingFields: string[] = [];
    
    for (const field of requiredFields) {
      if (!(field in data) || data[field] === null || data[field] === undefined) {
        missingFields.push(field);
      }
    }
    
    if (missingFields.length > 0) {
      return hookBlock(hook,
        `⛔ Missing ${missingFields.length} required fields`,
        {
          issues: [
            `Missing required fields: ${missingFields.join(", ")}`,
            `Required fields for ${entityType}: ${requiredFields.join(", ")}`
          ]
        }
      );
    }
    
    return hookSuccess(hook, `All ${requiredFields.length} required fields present`);
  }
};

// ============================================================================
// FIELD TYPE VALIDATION HOOKS
// ============================================================================

/**
 * Validate field types and ranges
 */
const preFieldTypeValidation: HookDefinition = {
  id: "pre-field-type-validation",
  name: "Field Type Validation",
  description: "Validates that field values have correct types and ranges.",
  
  phase: "pre-material-add",
  category: "schema",
  mode: "blocking",
  priority: "high",
  enabled: true,
  
  tags: ["type", "validation", "range"],
  
  handler: (context: HookContext): HookResult => {
    const hook = preFieldTypeValidation;
    
    const entityType = context.target?.type || "unknown";
    const data = context.target?.data as Record<string, unknown> | undefined;
    
    if (!data) {
      return hookSuccess(hook, "No data to validate");
    }
    
    const validators = FIELD_VALIDATORS[entityType] || {};
    const failures: string[] = [];
    
    for (const [field, validator] of Object.entries(validators)) {
      if (field in data) {
        const value = data[field];
        if (!validator(value)) {
          failures.push(`${field}: invalid value '${value}'`);
        }
      }
    }
    
    if (failures.length > 0) {
      return hookBlock(hook,
        `⛔ Field validation failed for ${failures.length} fields`,
        {
          issues: failures
        }
      );
    }
    
    return hookSuccess(hook, "All field values valid");
  }
};

// ============================================================================
// MIGRATION SAFETY HOOKS
// ============================================================================

/**
 * Pre-migration safety check
 */
const preMigrationSafetyCheck: HookDefinition = {
  id: "pre-migration-safety-check",
  name: "Migration Safety Check",
  description: "Validates that migration can be performed safely.",
  
  phase: "pre-batch-import",
  category: "schema",
  mode: "blocking",
  priority: "critical",
  enabled: true,
  
  tags: ["migration", "safety", "backup"],
  
  handler: (context: HookContext): HookResult => {
    const hook = preMigrationSafetyCheck;
    
    const migration = context.metadata?.migration as {
      fromVersion?: string;
      toVersion?: string;
      entityType?: string;
      recordCount?: number;
      hasBackup?: boolean;
    } | undefined;
    
    if (!migration) {
      return hookSuccess(hook, "Not a migration operation");
    }
    
    const issues: string[] = [];
    const warnings: string[] = [];
    
    // Check backup exists
    if (!migration.hasBackup) {
      issues.push("No backup found - migration requires backup before proceeding");
    }
    
    // Check version jump is not too large
    if (migration.fromVersion && migration.toVersion) {
      const from = parseVersion(migration.fromVersion);
      const to = parseVersion(migration.toVersion);
      
      if (to.major - from.major > 1) {
        issues.push(`Major version jump (${from.major} → ${to.major}) - incremental migration required`);
      }
      
      if (to.major < from.major) {
        issues.push("Downgrade migration not supported");
      }
    }
    
    // Warn about large migrations
    if (migration.recordCount && migration.recordCount > 1000) {
      warnings.push(`Large migration: ${migration.recordCount} records`);
      warnings.push("Consider migrating in batches of 500");
    }
    
    if (issues.length > 0) {
      return hookBlock(hook,
        `⛔ Migration safety check failed`,
        { issues, warnings }
      );
    }
    
    if (warnings.length > 0) {
      return hookWarning(hook,
        "Migration safety check passed with warnings",
        { warnings }
      );
    }
    
    return hookSuccess(hook, "Migration safety check passed");
  }
};

/**
 * Post-migration validation
 */
const postMigrationValidation: HookDefinition = {
  id: "post-migration-validation",
  name: "Post-Migration Validation",
  description: "Validates data integrity after migration.",
  
  phase: "post-batch-import",
  category: "schema",
  mode: "blocking",
  priority: "critical",
  enabled: true,
  
  tags: ["migration", "validation", "integrity"],
  
  handler: (context: HookContext): HookResult => {
    const hook = postMigrationValidation;
    
    const migration = context.metadata?.migration as {
      expectedCount?: number;
      actualCount?: number;
      failedRecords?: number;
    } | undefined;
    
    if (!migration) {
      return hookSuccess(hook, "Not a migration operation");
    }
    
    const issues: string[] = [];
    
    // Check record counts match
    if (migration.expectedCount && migration.actualCount) {
      if (migration.actualCount < migration.expectedCount) {
        issues.push(`Record count mismatch: expected ${migration.expectedCount}, got ${migration.actualCount}`);
        issues.push(`${migration.expectedCount - migration.actualCount} records may have been lost`);
      }
    }
    
    // Check for failed records
    if (migration.failedRecords && migration.failedRecords > 0) {
      const failureRate = migration.expectedCount ? 
        (migration.failedRecords / migration.expectedCount * 100).toFixed(1) : "unknown";
      
      issues.push(`${migration.failedRecords} records failed migration (${failureRate}%)`);
      
      if (migration.expectedCount && migration.failedRecords / migration.expectedCount > 0.05) {
        issues.push("Failure rate > 5% - rollback recommended");
      }
    }
    
    if (issues.length > 0) {
      return hookBlock(hook,
        `⛔ Post-migration validation failed`,
        { issues }
      );
    }
    
    return hookSuccess(hook, "Migration completed successfully", {
      data: { actualCount: migration.actualCount }
    });
  }
};

// ============================================================================
// DATA FORMAT HOOKS
// ============================================================================

/**
 * Validate JSON structure
 */
const preJsonStructureValidation: HookDefinition = {
  id: "pre-json-structure-validation",
  name: "JSON Structure Validation",
  description: "Validates JSON data structure matches expected format.",
  
  phase: "pre-file-write",
  category: "schema",
  mode: "blocking",
  priority: "high",
  enabled: true,
  
  tags: ["json", "structure", "format"],
  
  condition: (context: HookContext): boolean => {
    const path = context.target?.path || "";
    return path.endsWith(".json");
  },
  
  handler: (context: HookContext): HookResult => {
    const hook = preJsonStructureValidation;
    
    const content = context.content?.new;
    
    if (!content) {
      return hookSuccess(hook, "No content to validate");
    }
    
    // Try to parse if string
    let parsed: unknown;
    if (typeof content === "string") {
      try {
        parsed = JSON.parse(content);
      } catch (e) {
        return hookBlock(hook,
          "⛔ Invalid JSON syntax",
          { issues: [(e as Error).message] }
        );
      }
    } else {
      parsed = content;
    }
    
    // Check for common structural issues
    const warnings: string[] = [];
    
    if (Array.isArray(parsed)) {
      if (parsed.length === 0) {
        warnings.push("Array is empty - verify this is intentional");
      }
      
      // Check array consistency (all items same structure)
      if (parsed.length > 1) {
        const firstKeys = parsed[0] && typeof parsed[0] === "object" ? 
          Object.keys(parsed[0] as object) : [];
        
        let inconsistent = 0;
        for (let i = 1; i < Math.min(parsed.length, 100); i++) {
          const item = parsed[i];
          if (item && typeof item === "object") {
            const keys = Object.keys(item as object);
            if (keys.length !== firstKeys.length || 
                !keys.every(k => firstKeys.includes(k))) {
              inconsistent++;
            }
          }
        }
        
        if (inconsistent > 0) {
          warnings.push(`${inconsistent} items have inconsistent structure with first item`);
        }
      }
    }
    
    if (warnings.length > 0) {
      return hookWarning(hook, "JSON structure warnings", { warnings });
    }
    
    return hookSuccess(hook, "JSON structure valid");
  }
};

// ============================================================================
// SCHEMA STATE ACCESS
// ============================================================================

/**
 * Get schema information
 */
export function getSchemaInfo() {
  return {
    currentVersions: CURRENT_SCHEMA_VERSIONS,
    minCompatibleVersions: MIN_COMPATIBLE_VERSIONS,
    deprecatedFieldCounts: Object.fromEntries(
      Object.entries(DEPRECATED_FIELDS).map(([k, v]) => [k, v.length])
    ),
    requiredFieldCounts: Object.fromEntries(
      Object.entries(REQUIRED_FIELDS).map(([k, v]) => [k, v.length])
    )
  };
}

/**
 * Get deprecation info for entity type
 */
export function getDeprecationInfo(entityType: string) {
  return DEPRECATED_FIELDS[entityType] || [];
}

// ============================================================================
// EXPORT ALL SCHEMA HOOKS
// ============================================================================

export const schemaHooks: HookDefinition[] = [
  // Version
  preSchemaVersionValidation,
  
  // Deprecation
  preDeprecatedFieldCheck,
  
  // Required fields
  preRequiredFieldValidation,
  
  // Type validation
  preFieldTypeValidation,
  
  // Migration
  preMigrationSafetyCheck,
  postMigrationValidation,
  
  // Format
  preJsonStructureValidation
];

export {
  preSchemaVersionValidation,
  preDeprecatedFieldCheck,
  preRequiredFieldValidation,
  preFieldTypeValidation,
  preMigrationSafetyCheck,
  postMigrationValidation,
  preJsonStructureValidation,
  CURRENT_SCHEMA_VERSIONS,
  MIN_COMPATIBLE_VERSIONS,
  DEPRECATED_FIELDS,
  REQUIRED_FIELDS
};
