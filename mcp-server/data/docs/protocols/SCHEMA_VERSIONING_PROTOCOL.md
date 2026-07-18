# PRISM Schema Versioning Protocol v1.0

## Overview
This document defines the schema versioning protocol for PRISM MCP Server.
All data structures, API responses, and state files must follow this protocol.

## Version Format (SemVer)

```
MAJOR.MINOR.PATCH
  |     |     |
  |     |     +-- Bug fixes, documentation updates
  |     +-------- New optional fields, additive changes
  +-------------- Breaking changes requiring migration
```

**Current Version**: `2.0.0` (defined in `src/schemas/schemaVersioning.ts`)
**Minimum Supported**: `1.0.0`

## Schema Version Requirements

### 1. All State Files Must Include Version
Every JSON file in `data/state/` must have a `schemaVersion` field:

```json
{
  "schemaVersion": "2.0.0",
  "timestamp": "2026-04-12T10:00:00Z",
  "data": { ... }
}
```

### 2. All Dispatcher Responses Must Include Version Metadata
Use `getVersionMetadata()` from `schemaVersioning.ts`:

```typescript
import { getVersionMetadata } from "../schemas/schemaVersioning.js";

return {
  success: true,
  data: { ... },
  _meta: getVersionMetadata()
};
```

### 3. All Zod Schemas Must Be Versioned
Schemas in `src/schemas/` are fingerprinted for change detection:

```typescript
import { generateSchemaFingerprint } from "./schemaVersioning.js";

const fingerprint = generateSchemaFingerprint(MySchema);
// Returns: "fp_a1b2c3d4"
```

## Entity-Specific Schema Versions

| Entity | Current Version | Min Compatible |
|--------|-----------------|----------------|
| material | 3.0.0 | 2.0.0 |
| machine | 2.5.0 | 2.0.0 |
| tool | 2.0.0 | 1.5.0 |
| alarm | 1.5.0 | 1.0.0 |
| formula | 1.0.0 | 1.0.0 |
| agent | 1.0.0 | 1.0.0 |

## Breaking Change Procedure

When making a breaking change (MAJOR version bump):

### Step 1: Identify Impact
```bash
# Find all consumers of the affected schema
npx ts-node scripts/find-schema-consumers.ts --schema=MaterialSchema
```

### Step 2: Create Migration
Create a migration file in `src/migrations/`:

```typescript
// src/migrations/v2_to_v3_material.ts
export function migrate(data: MaterialV2): MaterialV3 {
  return {
    ...data,
    // Transform deprecated fields to new structure
    cutting_speed: {
      min: data.cutting_speed_min,
      max: data.cutting_speed_max
    }
  };
}
```

### Step 3: Update Version Constant
In `src/schemas/schemaVersioning.ts`:

```typescript
export const SCHEMA_VERSION = "3.0.0" as const;
```

### Step 4: Update Changelog
Add entry to `SCHEMA_CHANGELOG.json`:

```json
{
  "version": "3.0.0",
  "date": "2026-04-12",
  "summary": "Material schema restructure for cutting speed ranges",
  "changes": [
    {
      "schema": "MaterialSchema",
      "field": "cutting_speed_min",
      "type": "breaking",
      "description": "Moved to nested cutting_speed.min",
      "migration": "Use migrate_v2_to_v3_material.ts"
    }
  ]
}
```

## Deprecation Warnings

The `SchemaHooks.ts` automatically warns about deprecated fields:

| Entity | Deprecated Field | Deprecated In | Removed In | Replacement |
|--------|------------------|---------------|------------|-------------|
| material | cutting_speed_min | 2.5.0 | 4.0.0 | cutting_speed.min |
| material | machinability_index | 3.0.0 | TBD | machinability_rating |
| machine | max_rpm | 2.0.0 | 3.0.0 | spindle.max_rpm |
| machine | x_travel | 2.0.0 | 3.0.0 | travels.x |

## Validation Hooks

### Pre-Operation Validation
The `pre-schema-version-validation` hook validates data before operations:
- Checks schema version compatibility
- Warns about deprecated fields
- Blocks incompatible versions

### Post-Migration Validation
The `post-migration-validation` hook verifies migration success:
- Confirms all required fields present
- Validates field types match schema
- Records migration in audit log

## API Version Headers

All API responses include version headers:

```http
X-PRISM-Schema-Version: 2.0.0
X-PRISM-Min-Supported: 1.0.0
X-PRISM-Stable: true
```

## Backward Compatibility Rules

1. **N-1 Support**: Always support at least the previous minor version
2. **Deprecation Period**: 2 major versions before removal
3. **Migration Path**: Every breaking change must have a migration script
4. **Documentation**: Update this protocol when adding new entity types

## Implementation Files

| Purpose | File |
|---------|------|
| Version constants | `src/schemas/schemaVersioning.ts` |
| Version validation | `src/hooks/SchemaHooks.ts` |
| Entity versions | `src/hooks/SchemaHooks.ts` (CURRENT_SCHEMA_VERSIONS) |
| Migrations | `src/migrations/` |
| Action schemas | `src/schemas/*ActionSchemas.ts` |

## Testing Schema Changes

```bash
# Validate schema fingerprints haven't changed unexpectedly
npx vitest run src/__tests__/schema-fingerprint.test.ts

# Run migration tests
npx vitest run src/__tests__/migrations.test.ts

# Full schema validation suite
npx vitest run --filter=schema
```

## Changelog
- 2026-04-12: v1.0 — Initial protocol document
