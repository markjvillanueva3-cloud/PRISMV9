---
name: prism-error-catalog
description: |
  Comprehensive error reference and resolution guide for PRISM v9.0.
  Catalogs all error codes (1000-9999), root causes, fixes, and prevention
  patterns. Organized by category: SYSTEM, DATABASE, PHYSICS, CAD/CAM,
  VALIDATION, UI/UX, NETWORK, SECURITY, LEARNING. Essential for debugging
  and error recovery workflows.
  Part of SP.6 Reference Skills.
---
# PRISM Error Catalog Skill
## Comprehensive Error Reference and Resolution Guide
### Version 9.0.0

---

## Section 1: Error Architecture Overview

### 1.1 Error Classification System

```
PRISM ERROR HIERARCHY
═════════════════════

CATEGORY    CODE RANGE    SEVERITY    DESCRIPTION
─────────────────────────────────────────────────────────────
SYSTEM      1000-1999     CRITICAL    Infrastructure failures
DATABASE    2000-2999     HIGH        Data access/integrity
PHYSICS     3000-3999     MEDIUM      Calculation errors
CAD/CAM     4000-4999     MEDIUM      Geometry/toolpath errors
VALIDATION  5000-5999     LOW-MED     Input validation failures
UI/UX       6000-6999     LOW         Interface errors
NETWORK     7000-7999     VARIABLE    Connectivity issues
SECURITY    8000-8999     CRITICAL    Auth/access violations
LEARNING    9000-9999     LOW-MED     AI/ML system errors
```

### 1.2 Error Code Structure

```javascript
/**
 * PRISM Error Code Format: XYYY-ZZZ
 * 
 * X    = Category (1-9)
 * YYY  = Specific error within category (000-999)
 * ZZZ  = Sub-error or variant (optional)
 * 
 * Examples:
 *   1001     = System initialization failure
 *   2015-001 = Database connection timeout (variant 1)
 *   3042     = Physics engine calculation overflow
 */

const PRISM_ERROR = {
    // Error code generator
    createCode(category, number, variant = null) {
        const code = `${category}${String(number).padStart(3, '0')}`;
        return variant ? `${code}-${String(variant).padStart(3, '0')}` : code;
    },
    
    // Parse error code
    parseCode(code) {
        const match = code.match(/^(\d)(\d{3})(?:-(\d{3}))?$/);
        if (!match) return null;
        
        return {
            category: parseInt(match[1]),
            number: parseInt(match[2]),
            variant: match[3] ? parseInt(match[3]) : null,
            full: code
        };
    },
    
    // Get category name
    getCategoryName(categoryCode) {
        const categories = {
            1: 'SYSTEM',
            2: 'DATABASE',
            3: 'PHYSICS',
            4: 'CAD_CAM',
            5: 'VALIDATION',
            6: 'UI_UX',
            7: 'NETWORK',
            8: 'SECURITY',
            9: 'LEARNING'
        };
        return categories[categoryCode] || 'UNKNOWN';
    }
};
```

### 1.3 Standard Error Object

```javascript
/**
 * PRISM Standard Error Object
 * All errors must conform to this structure
 */
class PRISMError extends Error {
    constructor(code, message, details = {}) {
        super(message);
        
        this.name = 'PRISMError';
        this.code = code;
        this.timestamp = new Date().toISOString();
        this.severity = this._getSeverity(code);
        this.category = this._getCategory(code);
        this.details = details;
        this.recoverable = details.recoverable ?? true;
        this.userFacing = details.userFacing ?? false;
        this.suggestions = details.suggestions || [];
        
        // Capture stack trace
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, PRISMError);
        }
    }
    
    _getSeverity(code) {
        const category = parseInt(String(code).charAt(0));
        const severityMap = {
            1: 'CRITICAL', 2: 'HIGH', 3: 'MEDIUM',
            4: 'MEDIUM', 5: 'LOW', 6: 'LOW',
            7: 'VARIABLE', 8: 'CRITICAL', 9: 'LOW'
        };
        return severityMap[category] || 'UNKNOWN';
    }
    
    _getCategory(code) {
        return PRISM_ERROR.getCategoryName(parseInt(String(code).charAt(0)));
    }
    
    toJSON() {
        return {
            name: this.name,
            code: this.code,
            message: this.message,
            severity: this.severity,
            category: this.category,
            timestamp: this.timestamp,
            recoverable: this.recoverable,
            userFacing: this.userFacing,
            suggestions: this.suggestions,
            details: this.details,
            stack: this.stack
        };
    }
    
    toUserMessage() {
        if (!this.userFacing) {
            return 'An unexpected error occurred. Please try again.';
        }
        return this.message;
    }
}
```

---

## Section 2: System Errors (1000-1999)

### 2.1 Initialization Errors (1000-1099)

| Code | Name | Message | Cause | Resolution |
|------|------|---------|-------|------------|
| 1001 | INIT_FAILURE | System initialization failed | Core module load error | Check module dependencies, restart |
| 1002 | CONFIG_MISSING | Configuration file not found | Missing config.json | Create default config, check paths |
| 1003 | CONFIG_INVALID | Invalid configuration format | Malformed JSON/schema | Validate config against schema |
| 1004 | MODULE_LOAD_FAIL | Failed to load module: {name} | Corrupt or missing module | Reinstall module, check deps |
| 1005 | DEPENDENCY_MISSING | Missing dependency: {name} | Unmet dependency | Install required package |
| 1006 | VERSION_MISMATCH | Version mismatch: expected {v1}, got {v2} | Incompatible versions | Update to compatible version |
| 1007 | LICENSE_INVALID | Invalid or expired license | License verification failed | Renew or validate license |
| 1008 | STARTUP_TIMEOUT | Startup timed out after {n}ms | Slow initialization | Increase timeout, check resources |
| 1009 | CIRCULAR_DEP | Circular dependency detected | Module dependency loop | Refactor dependencies |
| 1010 | INIT_ORDER_FAIL | Invalid initialization order | Dependencies not ready | Fix initialization sequence |

```javascript
// Error definitions
const SYSTEM_INIT_ERRORS = {
    1001: {
        name: 'INIT_FAILURE',
        message: 'System initialization failed',
        severity: 'CRITICAL',
        recoverable: false,
        suggestions: [
            'Check browser console for detailed errors',
            'Verify all required modules are present',
            'Try clearing browser cache and reloading',
            'Contact support if issue persists'
        ]
    },
    1002: {
        name: 'CONFIG_MISSING',
        message: 'Configuration file not found',
        severity: 'CRITICAL',
        recoverable: true,
        resolution: async () => {
            return await PRISM_GATEWAY.request('config.createDefault');
        },
        suggestions: [
            'Configuration file will be auto-generated',
            'Review settings after creation'
        ]
    },
    1003: {
        name: 'CONFIG_INVALID',
        message: 'Invalid configuration format',
        severity: 'HIGH',
        recoverable: true,
        suggestions: [
            'Validate JSON syntax',
            'Check against configuration schema',
            'Reset to defaults if needed'
        ]
    },
    1004: {
        name: 'MODULE_LOAD_FAIL',
        message: (params) => `Failed to load module: ${params.moduleName}`,
        severity: 'HIGH',
        recoverable: false,
        suggestions: [
            'Check network connectivity',
            'Verify module file exists',
            'Check for JavaScript errors in module'
        ]
    },
    1005: {
        name: 'DEPENDENCY_MISSING',
        message: (params) => `Missing dependency: ${params.dependency}`,
        severity: 'HIGH',
        recoverable: false,
        suggestions: [
            'Install missing package',
            'Check package.json dependencies',
            'Run npm install or equivalent'
        ]
    }
};
```

### 2.2 Resource Errors (1100-1199)

| Code | Name | Message | Cause | Resolution |
|------|------|---------|-------|------------|
| 1101 | MEMORY_EXCEEDED | Memory limit exceeded | Large data operation | Reduce batch size, optimize |
| 1102 | STORAGE_FULL | Local storage quota exceeded | Too much cached data | Clear old cache, increase quota |
| 1103 | CPU_OVERLOAD | Calculation timeout | Heavy computation | Optimize algorithm, use workers |
| 1104 | GPU_UNAVAILABLE | WebGL/GPU not available | No hardware acceleration | Fall back to CPU rendering |
| 1105 | FILE_TOO_LARGE | File exceeds size limit: {size}MB | Import too large | Split file, compress, or upgrade |
| 1106 | THREAD_EXHAUSTED | Worker threads exhausted | Too many parallel ops | Queue operations, reduce parallel |
| 1107 | HANDLE_LEAK | Resource handle not released | Memory leak detected | Review disposal patterns |
| 1108 | QUOTA_EXCEEDED | API quota exceeded | Rate limiting | Wait and retry, upgrade plan |

```javascript
const SYSTEM_RESOURCE_ERRORS = {
    1101: {
        name: 'MEMORY_EXCEEDED',
        message: 'Memory limit exceeded',
        severity: 'HIGH',
        recoverable: true,
        resolution: async (context) => {
            await PRISM_GATEWAY.request('cache.clear', { 
                threshold: 0.5
            });
            if (globalThis.gc) globalThis.gc();
            return { freed: true };
        },
        suggestions: [
            'Reduce number of open projects',
            'Clear calculation history',
            'Close unused features'
        ]
    },
    1102: {
        name: 'STORAGE_FULL',
        message: 'Local storage quota exceeded',
        severity: 'MEDIUM',
        recoverable: true,
        resolution: async () => {
            const cleared = await PRISM_GATEWAY.request('storage.cleanup', {
                olderThan: 30 * 24 * 60 * 60 * 1000
            });
            return { cleared };
        },
        suggestions: [
            'Clear browser data for this site',
            'Export and remove old projects',
            'Upgrade to cloud storage'
        ]
    },
    1103: {
        name: 'CPU_OVERLOAD',
        message: 'Calculation timeout',
        severity: 'MEDIUM',
        recoverable: true,
        suggestions: [
            'Reduce complexity of operation',
            'Break into smaller calculations',
            'Enable background processing'
        ]
    }
};
```

### 2.3 Gateway Errors (1200-1299)

| Code | Name | Message | Cause | Resolution |
|------|------|---------|-------|------------|
| 1201 | ROUTE_NOT_FOUND | Route not found: {route} | Unregistered route | Register route or check name |
| 1202 | ROUTE_TIMEOUT | Route timeout: {route} | Handler too slow | Optimize handler, increase timeout |
| 1203 | HANDLER_ERROR | Handler threw exception | Bug in handler | Fix handler code, check logs |
| 1204 | INVALID_RESPONSE | Invalid response format | Handler returned bad data | Fix handler return value |
| 1205 | MIDDLEWARE_FAIL | Middleware chain broken | Middleware threw error | Fix middleware, check order |
| 1206 | CIRCULAR_ROUTE | Circular route detected | Route calls itself | Refactor to avoid recursion |
| 1207 | RATE_LIMITED | Too many requests to {route} | Rate limit exceeded | Implement caching, reduce calls |

---

## Section 3: Database Errors (2000-2999)

### 3.1 Connection Errors (2000-2099)

| Code | Name | Message | Cause | Resolution |
|------|------|---------|-------|------------|
| 2001 | DB_CONNECT_FAIL | Database connection failed | Server unreachable | Check connectivity, retry |
| 2002 | DB_TIMEOUT | Database timeout | Slow query or network | Optimize query, increase timeout |
| 2003 | DB_AUTH_FAIL | Database authentication failed | Bad credentials | Verify credentials |
| 2004 | DB_UNAVAILABLE | Database temporarily unavailable | Maintenance/overload | Retry with backoff |
| 2005 | POOL_EXHAUSTED | Connection pool exhausted | Too many connections | Increase pool, close unused |
| 2006 | SSL_HANDSHAKE_FAIL | SSL handshake failed | Certificate issue | Check certificates |

```javascript
const DATABASE_CONNECTION_ERRORS = {
    2001: {
        name: 'DB_CONNECT_FAIL',
        message: 'Database connection failed',
        severity: 'CRITICAL',
        recoverable: true,
        retryStrategy: {
            maxAttempts: 5,
            baseDelay: 1000,
            maxDelay: 30000,
            backoffMultiplier: 2
        },
        suggestions: [
            'Check internet connection',
            'Verify server is running',
            'Check firewall settings'
        ]
    },
    2002: {
        name: 'DB_TIMEOUT',
        message: 'Database operation timed out',
        severity: 'HIGH',
        recoverable: true,
        suggestions: [
            'Check query complexity',
            'Add appropriate indexes',
            'Increase timeout for large operations'
        ]
    }
};
```

### 3.2 Query Errors (2100-2199)

| Code | Name | Message | Cause | Resolution |
|------|------|---------|-------|------------|
| 2101 | INVALID_QUERY | Invalid query syntax | Malformed query | Fix query syntax |
| 2102 | RECORD_NOT_FOUND | Record not found: {id} | Missing data | Verify ID, handle missing |
| 2103 | DUPLICATE_KEY | Duplicate key violation | Uniqueness constraint | Use different key or update |
| 2104 | FOREIGN_KEY_FAIL | Foreign key constraint failed | Referenced record missing | Create referenced record first |
| 2105 | FIELD_NOT_FOUND | Field not found: {field} | Schema mismatch | Update schema or query |
| 2106 | TYPE_MISMATCH | Type mismatch: expected {t1}, got {t2} | Wrong data type | Cast or convert type |
| 2107 | INDEX_NOT_FOUND | Index not found: {index} | Missing index | Create index |
| 2108 | QUERY_TOO_COMPLEX | Query exceeds complexity limit | Too many joins/conditions | Simplify or split query |

### 3.3 Data Integrity Errors (2200-2299)

| Code | Name | Message | Cause | Resolution |
|------|------|---------|-------|------------|
| 2201 | DATA_CORRUPT | Data corruption detected | Storage failure | Restore from backup |
| 2202 | CHECKSUM_FAIL | Checksum verification failed | Data tampering or corruption | Re-download/restore |
| 2203 | VERSION_CONFLICT | Version conflict on {record} | Concurrent modification | Merge or choose version |
| 2204 | SCHEMA_MISMATCH | Schema version mismatch | Migration needed | Run migrations |
| 2205 | REFERENTIAL_INTEGRITY | Referential integrity violated | Orphaned reference | Clean up references |
| 2206 | CONSTRAINT_VIOLATION | Constraint violated: {name} | Business rule violation | Fix data to meet constraint |
| 2207 | TRANSACTION_FAIL | Transaction rolled back | Error during transaction | Retry transaction |
| 2208 | DEADLOCK | Deadlock detected | Concurrent lock conflict | Retry with random backoff |

---



## Section 4: Physics Errors (3000-3999)

### 4.1 Calculation Errors (3000-3099)

| Code | Name | Message | Cause | Resolution |
|------|------|---------|-------|------------|
| 3001 | CALC_OVERFLOW | Numerical overflow in calculation | Value exceeds range | Check input magnitudes |
| 3002 | CALC_UNDERFLOW | Numerical underflow | Value too small | Adjust precision/scale |
| 3003 | DIVISION_BY_ZERO | Division by zero | Zero divisor | Add zero check, handle edge case |
| 3004 | NEGATIVE_SQRT | Square root of negative number | Invalid geometry | Check input values |
| 3005 | CONVERGENCE_FAIL | Iteration did not converge | Poor initial guess | Adjust starting values |
| 3006 | MATRIX_SINGULAR | Singular matrix encountered | No unique solution | Check matrix conditioning |
| 3007 | EIGENVALUE_FAIL | Eigenvalue computation failed | Matrix issues | Check matrix properties |
| 3008 | INTEGRATION_FAIL | Numerical integration failed | Function issues | Reduce step size |

```javascript
const PHYSICS_CALC_ERRORS = {
    3001: {
        name: 'CALC_OVERFLOW',
        message: 'Numerical overflow in calculation',
        severity: 'MEDIUM',
        recoverable: true,
        debug: (context) => ({
            operation: context.operation,
            values: context.operands,
            max_allowed: Number.MAX_SAFE_INTEGER
        }),
        suggestions: [
            'Check that input values are in expected ranges',
            'Verify units are correct (mm vs m)',
            'Consider using normalized values'
        ]
    },
    3003: {
        name: 'DIVISION_BY_ZERO',
        message: (params) => `Division by zero in ${params.function}`,
        severity: 'MEDIUM',
        recoverable: true,
        resolution: (context) => {
            // Return safe default or infinity based on context
            if (context.allowInfinity) {
                return context.numerator > 0 ? Infinity : -Infinity;
            }
            return context.defaultValue || 0;
        }
    },
    3005: {
        name: 'CONVERGENCE_FAIL',
        message: (params) => `Iteration failed to converge after ${params.iterations} iterations`,
        severity: 'MEDIUM',
        recoverable: true,
        suggestions: [
            'Adjust initial guess closer to expected solution',
            'Increase maximum iterations',
            'Reduce convergence tolerance',
            'Check for discontinuities in function'
        ]
    }
};
```

### 4.2 Cutting Physics Errors (3100-3199)

| Code | Name | Message | Cause | Resolution |
|------|------|---------|-------|------------|
| 3101 | FORCE_NEGATIVE | Negative cutting force calculated | Parameter error | Check kc, geometry inputs |
| 3102 | POWER_EXCEEDED | Required power exceeds machine capacity | Too aggressive parameters | Reduce DOC, speed, or feed |
| 3103 | TORQUE_EXCEEDED | Required torque exceeds spindle capacity | Too aggressive parameters | Reduce parameters |
| 3104 | DEFLECTION_EXCEEDED | Tool deflection exceeds limit | Tool too long/thin | Use shorter tool, reduce DOC |
| 3105 | CHATTER_DETECTED | Unstable cutting predicted | SLD boundary crossed | Adjust RPM or DOC |
| 3106 | TEMP_EXCEEDED | Cutting temperature exceeds limit | Speed too high | Reduce speed, add coolant |
| 3107 | CHIP_LOAD_INVALID | Invalid chip load calculated | Feed/geometry mismatch | Check feed and tool params |
| 3108 | HELIX_ANGLE_INVALID | Invalid helix angle for calculation | Out of range (0-90) | Use valid helix angle |

```javascript
const PHYSICS_CUTTING_ERRORS = {
    3102: {
        name: 'POWER_EXCEEDED',
        message: (params) => `Required power ${params.required}kW exceeds machine capacity ${params.available}kW`,
        severity: 'HIGH',
        recoverable: true,
        userFacing: true,
        resolution: (context) => {
            // Calculate safe parameters
            const powerRatio = context.available / context.required;
            return {
                recommended: {
                    mrr_reduction: 1 - powerRatio,
                    new_depth: context.depth * Math.sqrt(powerRatio),
                    new_speed: context.speed * powerRatio
                }
            };
        },
        suggestions: [
            'Reduce depth of cut',
            'Reduce feed rate',
            'Use multiple passes',
            'Select more powerful machine'
        ]
    },
    3105: {
        name: 'CHATTER_DETECTED',
        message: 'Unstable cutting conditions predicted - chatter likely',
        severity: 'HIGH',
        recoverable: true,
        userFacing: true,
        resolution: async (context) => {
            // Find stable RPM using stability lobe diagram
            const stableRPM = await PRISM_GATEWAY.request('physics.find_stable_rpm', {
                current_rpm: context.rpm,
                current_doc: context.depth,
                machine: context.machine,
                tool: context.tool
            });
            return stableRPM;
        },
        suggestions: [
            'Adjust spindle speed to stable pocket',
            'Reduce depth of cut',
            'Use variable pitch/helix tool',
            'Increase tool rigidity'
        ]
    },
    3104: {
        name: 'DEFLECTION_EXCEEDED',
        message: (params) => `Tool deflection ${params.actual}mm exceeds limit ${params.limit}mm`,
        severity: 'MEDIUM',
        recoverable: true,
        userFacing: true,
        suggestions: [
            'Use shorter tool overhang',
            'Use larger diameter tool',
            'Reduce cutting forces (DOC, feed)',
            'Use carbide instead of HSS',
            'Add support/guide bushing'
        ]
    }
};
```

### 4.3 Thermal Errors (3200-3299)

| Code | Name | Message | Cause | Resolution |
|------|------|---------|-------|------------|
| 3201 | THERMAL_RUNAWAY | Thermal runaway detected | Heat buildup too fast | Reduce speed, add cooling |
| 3202 | COOLANT_INEFFECTIVE | Coolant effectiveness below threshold | Wrong type or flow | Change coolant strategy |
| 3203 | WORKPIECE_DISTORTION | Thermal distortion predicted | Uneven heating | Adjust strategy, cool |
| 3204 | TOOL_SOFTENING | Tool softening temperature reached | Excessive heat | Reduce speed, coolant |
| 3205 | WORKPIECE_HARDENING | Work hardening zone detected | Heat affected zone | Adjust parameters |

---

## Section 5: CAD/CAM Errors (4000-4999)

### 5.1 Geometry Errors (4000-4099)

| Code | Name | Message | Cause | Resolution |
|------|------|---------|-------|------------|
| 4001 | INVALID_GEOMETRY | Invalid geometry detected | Corrupt or impossible shape | Repair or recreate |
| 4002 | SELF_INTERSECTION | Self-intersecting geometry | Modeling error | Fix intersections |
| 4003 | OPEN_SURFACE | Surface not closed | Gap in model | Close/stitch surface |
| 4004 | DEGENERATE_FACE | Degenerate face detected | Zero area face | Remove or fix face |
| 4005 | INVERTED_NORMAL | Inverted surface normal | Wrong face orientation | Flip normal |
| 4006 | GAP_DETECTED | Gap in geometry | Discontinuity | Heal or bridge gap |
| 4007 | OVERLAP_DETECTED | Overlapping geometry | Duplicate faces | Remove duplicates |
| 4008 | TOLERANCE_FAIL | Geometry tolerance exceeded | Imprecise model | Increase precision |

```javascript
const CAD_GEOMETRY_ERRORS = {
    4001: {
        name: 'INVALID_GEOMETRY',
        message: 'Invalid geometry detected',
        severity: 'HIGH',
        recoverable: true,
        resolution: async (context) => {
            // Attempt automatic repair
            const repaired = await PRISM_GATEWAY.request('cad.repair_geometry', {
                geometry: context.geometry,
                options: {
                    heal_gaps: true,
                    remove_degenerates: true,
                    fix_normals: true
                }
            });
            return repaired;
        },
        suggestions: [
            'Run geometry repair tool',
            'Check original CAD file',
            'Simplify complex features',
            'Re-export with different settings'
        ]
    },
    4002: {
        name: 'SELF_INTERSECTION',
        message: (params) => `Self-intersection at ${params.location}`,
        severity: 'MEDIUM',
        recoverable: true,
        suggestions: [
            'Review model at intersection point',
            'Simplify overlapping features',
            'Use boolean operations to clean up'
        ]
    },
    4006: {
        name: 'GAP_DETECTED',
        message: (params) => `Gap of ${params.size}mm detected in geometry`,
        severity: 'MEDIUM',
        recoverable: true,
        resolution: async (context) => {
            if (context.size < 0.01) { // Small gap, auto-heal
                return await PRISM_GATEWAY.request('cad.heal_gap', {
                    location: context.location,
                    method: 'extend'
                });
            }
            // Large gap needs manual intervention
            return { needsManualFix: true, location: context.location };
        }
    }
};
```

### 5.2 Toolpath Errors (4100-4199)

| Code | Name | Message | Cause | Resolution |
|------|------|---------|-------|------------|
| 4101 | TOOLPATH_EMPTY | Empty toolpath generated | No machinable area | Check stock, tool selection |
| 4102 | GOUGE_DETECTED | Tool gouge detected | Tool contact where shouldn't | Adjust approach, use smaller tool |
| 4103 | COLLISION_TOOL | Tool collision predicted | Tool hits fixture/stock | Change approach, modify fixture |
| 4104 | COLLISION_HOLDER | Holder collision detected | Holder interference | Use longer tool, modify path |
| 4105 | RAPID_COLLISION | Collision during rapid move | Unsafe rapid | Modify retract heights |
| 4106 | UNDERCUT_IMPOSSIBLE | Cannot reach undercut | Tool geometry limits | Use angled head, 5-axis |
| 4107 | STEPOVER_INVALID | Invalid stepover value | Outside valid range | Adjust stepover 5-95% |
| 4108 | STEPDOWN_INVALID | Invalid stepdown value | Outside valid range | Adjust stepdown |
| 4109 | LEAD_CONFLICT | Lead-in/lead-out conflict | Geometry too tight | Reduce lead distance |
| 4110 | LINKING_FAIL | Toolpath linking failed | Cannot connect moves | Adjust linking strategy |

```javascript
const CAM_TOOLPATH_ERRORS = {
    4102: {
        name: 'GOUGE_DETECTED',
        message: (params) => `Gouge detected at Z=${params.z}, depth=${params.depth}mm`,
        severity: 'CRITICAL',
        recoverable: true,
        userFacing: true,
        resolution: async (context) => {
            // Find alternative approach
            return await PRISM_GATEWAY.request('cam.alternative_approach', {
                location: context.location,
                currentTool: context.tool,
                strategies: ['smaller_tool', 'angle_change', 'multiple_passes']
            });
        },
        suggestions: [
            'Use smaller diameter tool',
            'Increase tool angle/tilt',
            'Add rest machining operation',
            'Consider 5-axis approach'
        ]
    },
    4103: {
        name: 'COLLISION_TOOL',
        message: (params) => `Tool collision with ${params.object} at ${params.location}`,
        severity: 'CRITICAL',
        recoverable: true,
        userFacing: true,
        suggestions: [
            'Modify fixture design',
            'Change tool approach angle',
            'Use extended reach tool',
            'Reorient workpiece'
        ]
    },
    4105: {
        name: 'RAPID_COLLISION',
        message: 'Potential collision during rapid traverse',
        severity: 'CRITICAL',
        recoverable: true,
        resolution: (context) => {
            // Calculate safe retract height
            const safeHeight = Math.max(
                context.currentRetract,
                context.highestObstacle + context.clearance
            );
            return { recommendedRetract: safeHeight };
        },
        suggestions: [
            'Increase retract height',
            'Enable collision avoidance',
            'Use safe retract plane',
            'Review fixture heights'
        ]
    }
};
```

### 5.3 Feature Recognition Errors (4200-4299)

| Code | Name | Message | Cause | Resolution |
|------|------|---------|-------|------------|
| 4201 | FEATURE_NOT_RECOGNIZED | Feature type not recognized | Complex or unusual geometry | Manually define |
| 4202 | HOLE_INCOMPLETE | Incomplete hole feature | Missing bottom or entry | Complete hole definition |
| 4203 | POCKET_OPEN | Open pocket detected | Missing walls | Define boundary |
| 4204 | BOSS_AMBIGUOUS | Ambiguous boss feature | Multiple interpretations | Clarify intent |
| 4205 | THREAD_INVALID | Invalid thread specification | Non-standard thread | Use custom thread |
| 4206 | CHAMFER_CONFLICT | Chamfer definition conflict | Overlapping chamfers | Resolve order |
| 4207 | FILLET_TOO_LARGE | Fillet radius too large | Exceeds geometry | Reduce radius |

---

## Section 6: Validation Errors (5000-5999)

### 6.1 Input Validation Errors (5000-5099)

| Code | Name | Message | Cause | Resolution |
|------|------|---------|-------|------------|
| 5001 | REQUIRED_MISSING | Required field missing: {field} | No value provided | Provide required value |
| 5002 | TYPE_INVALID | Invalid type for {field}: expected {type} | Wrong data type | Convert to correct type |
| 5003 | RANGE_EXCEEDED | Value out of range: {value} not in [{min}, {max}] | Value too high/low | Adjust to valid range |
| 5004 | FORMAT_INVALID | Invalid format for {field} | Pattern mismatch | Use correct format |
| 5005 | LENGTH_EXCEEDED | Value exceeds max length: {length}/{max} | Too many characters | Truncate or abbreviate |
| 5006 | ENUM_INVALID | Invalid enum value: {value} | Not in allowed list | Use allowed value |
| 5007 | PATTERN_MISMATCH | Value doesn't match pattern | Regex failure | Match required pattern |
| 5008 | DEPENDENCY_MISSING | Dependent field missing: {field} | Related field required | Provide dependent field |

```javascript
const VALIDATION_INPUT_ERRORS = {
    5001: {
        name: 'REQUIRED_MISSING',
        message: (params) => `Required field missing: ${params.field}`,
        severity: 'LOW',
        recoverable: true,
        userFacing: true,
        suggestions: [
            `Please provide a value for ${params.field}`,
            'This field is required to continue'
        ]
    },
    5003: {
        name: 'RANGE_EXCEEDED',
        message: (params) => `${params.field}: ${params.value} is outside valid range [${params.min}, ${params.max}]`,
        severity: 'LOW',
        recoverable: true,
        userFacing: true,
        resolution: (context) => {
            // Clamp to valid range
            const clamped = Math.max(context.min, Math.min(context.max, context.value));
            return { clampedValue: clamped, wasAdjusted: true };
        }
    },
    5006: {
        name: 'ENUM_INVALID',
        message: (params) => `Invalid value "${params.value}" for ${params.field}`,
        severity: 'LOW',
        recoverable: true,
        userFacing: true,
        debug: (context) => ({
            allowedValues: context.allowedValues,
            suggestion: PRISM_COMPARE.findClosestMatch(context.value, context.allowedValues)
        })
    }
};
```

### 6.2 Manufacturing Validation Errors (5100-5199)

| Code | Name | Message | Cause | Resolution |
|------|------|---------|-------|------------|
| 5101 | TOLERANCE_IMPOSSIBLE | Tolerance tighter than machine capability | Machine limit | Upgrade machine or relax |
| 5102 | FINISH_IMPOSSIBLE | Surface finish tighter than achievable | Process limit | Change process or relax |
| 5103 | MATERIAL_INCOMPATIBLE | Material incompatible with process | Wrong material/process | Change material or process |
| 5104 | TOOL_INCOMPATIBLE | Tool incompatible with material | Wrong tool selection | Select appropriate tool |
| 5105 | FEATURE_IMPOSSIBLE | Feature cannot be manufactured | DFM violation | Redesign feature |
| 5106 | RATIO_EXCEEDED | L/D ratio exceeds recommendation | Deep hole/thin wall | Consider alternatives |
| 5107 | ACCESS_IMPOSSIBLE | Tool cannot access feature | Interference | Redesign or multi-setup |
| 5108 | UNDERSIZE_STOCK | Stock smaller than part | Wrong stock selected | Use larger stock |

```javascript
const VALIDATION_MFG_ERRORS = {
    5101: {
        name: 'TOLERANCE_IMPOSSIBLE',
        message: (params) => `Tolerance ±${params.specified} cannot be achieved. Machine capability: ±${params.achievable}`,
        severity: 'MEDIUM',
        recoverable: true,
        userFacing: true,
        resolution: async (context) => {
            // Find machines that can achieve tolerance
            const capableMachines = await PRISM_GATEWAY.request('machines.find_capable', {
                tolerance: context.specified,
                process: context.process
            });
            return {
                alternatives: capableMachines,
                secondaryProcess: context.specified < 0.005 ? 'grinding' : null
            };
        },
        suggestions: [
            'Select a more precise machine',
            'Add secondary finishing operation',
            'Review if tight tolerance is necessary'
        ]
    },
    5105: {
        name: 'FEATURE_IMPOSSIBLE',
        message: (params) => `Feature "${params.feature}" cannot be manufactured as designed`,
        severity: 'HIGH',
        recoverable: true,
        userFacing: true,
        suggestions: [
            'Review DFM guidelines',
            'Consider alternative feature design',
            'Consult with manufacturing engineering'
        ]
    },
    5106: {
        name: 'RATIO_EXCEEDED',
        message: (params) => `${params.ratioType} ratio ${params.actual}:1 exceeds recommendation ${params.max}:1`,
        severity: 'MEDIUM',
        recoverable: true,
        userFacing: true,
        suggestions: params => {
            if (params.ratioType === 'L/D') {
                return [
                    'Use gun drill for deep holes',
                    'Pilot drill first',
                    'Peck drilling required',
                    'Consider boring from both ends'
                ];
            }
            return ['Review design for manufacturability'];
        }
    }
};
```

---



## 7. UI/UX ERRORS (6000-6999)

### 7.1 Rendering Errors (6000-6099)

| Code | Name | Message | Cause | Resolution |
|------|------|---------|-------|------------|
| 6001 | RENDER_FAILED | Failed to render component | WebGL/Canvas error | Fallback renderer |
| 6002 | WEBGL_UNAVAILABLE | WebGL not supported | Browser/hardware | Use 2D fallback |
| 6003 | CANVAS_SIZE_EXCEEDED | Canvas exceeds maximum size | Too large model | Reduce resolution |
| 6004 | SHADER_COMPILE_FAIL | Shader compilation failed | GPU incompatibility | Use fallback shaders |
| 6005 | TEXTURE_TOO_LARGE | Texture exceeds GPU limits | Image too large | Downscale texture |
| 6006 | MEMORY_CONTEXT_LOST | WebGL context lost | GPU reset/timeout | Restore context |
| 6007 | ANIMATION_FRAME_DROP | Animation frame rate dropped | Performance | Reduce complexity |
| 6008 | MESH_TOO_COMPLEX | Mesh exceeds vertex limit | Too many triangles | Decimate mesh |

```javascript
const UI_RENDER_ERRORS = {
    6001: {
        name: 'RENDER_FAILED',
        message: 'Failed to render 3D view',
        severity: 'MEDIUM',
        recoverable: true,
        userFacing: true,
        resolution: async (context) => {
            // Try fallback rendering
            const fallbacks = ['webgl2', 'webgl', 'canvas2d', 'svg'];
            for (const renderer of fallbacks) {
                try {
                    if (await PRISM_RENDERER.isSupported(renderer)) {
                        return { useRenderer: renderer };
                    }
                } catch (e) { continue; }
            }
            return { showStaticImage: true };
        },
        suggestions: [
            'Try refreshing the page',
            'Update graphics drivers',
            'Use a different browser'
        ]
    },
    6002: {
        name: 'WEBGL_UNAVAILABLE',
        message: 'WebGL is not available in your browser',
        severity: 'MEDIUM',
        recoverable: true,
        userFacing: true,
        resolution: () => ({
            enableFallback2D: true,
            showNotice: 'Using simplified 2D view. Enable WebGL for full 3D experience.'
        }),
        suggestions: [
            'Enable hardware acceleration in browser settings',
            'Update your graphics drivers',
            'Try Chrome or Firefox'
        ]
    },
    6006: {
        name: 'MEMORY_CONTEXT_LOST',
        message: 'Graphics context was lost and needs to be restored',
        severity: 'MEDIUM',
        recoverable: true,
        userFacing: true,
        resolution: async (context) => {
            // Wait for context restoration
            await new Promise(resolve => setTimeout(resolve, 100));
            try {
                await PRISM_RENDERER.restoreContext();
                await PRISM_RENDERER.reloadResources();
                return { restored: true };
            } catch (e) {
                return { reloadRequired: true };
            }
        }
    },
    6008: {
        name: 'MESH_TOO_COMPLEX',
        message: (params) => `Mesh has ${params.triangles.toLocaleString()} triangles, exceeding limit of ${params.limit.toLocaleString()}`,
        severity: 'MEDIUM',
        recoverable: true,
        userFacing: true,
        resolution: async (context) => {
            // Auto-decimate mesh
            const targetTriangles = Math.min(context.limit * 0.8, context.triangles / 2);
            const decimated = await PRISM_MESH_ENGINE.decimate(context.mesh, {
                targetTriangles,
                preserveNormals: true,
                preserveUVs: true,
                preserveTopology: context.forSimulation
            });
            return { 
                decimatedMesh: decimated,
                reductionPercent: (1 - targetTriangles / context.triangles) * 100
            };
        }
    }
};
```

### 7.2 Input/Interaction Errors (6100-6199)

| Code | Name | Message | Cause | Resolution |
|------|------|---------|-------|------------|
| 6101 | FORM_VALIDATION_FAILED | Form has invalid fields | User input errors | Highlight fields |
| 6102 | FILE_TYPE_UNSUPPORTED | File type not supported | Wrong file format | Show accepted types |
| 6103 | FILE_SIZE_EXCEEDED | File exceeds size limit | File too large | Compress or reject |
| 6104 | DRAG_DROP_FAILED | Drag and drop operation failed | Browser issue | Use file picker |
| 6105 | CLIPBOARD_DENIED | Clipboard access denied | Permission | Request permission |
| 6106 | SELECTION_EMPTY | No items selected | User missed selection | Guide user |
| 6107 | UNDO_STACK_EMPTY | Nothing to undo | No history | Inform user |
| 6108 | REDO_STACK_EMPTY | Nothing to redo | No forward history | Inform user |
| 6109 | HOTKEY_CONFLICT | Hotkey already assigned | Duplicate binding | Show conflict |
| 6110 | GESTURE_UNRECOGNIZED | Touch gesture not recognized | Invalid gesture | Show help |

```javascript
const UI_INPUT_ERRORS = {
    6101: {
        name: 'FORM_VALIDATION_FAILED',
        message: 'Please correct the highlighted fields',
        severity: 'LOW',
        recoverable: true,
        userFacing: true,
        resolution: (context) => {
            // Collect all field errors
            const fieldErrors = context.fields.filter(f => !f.valid).map(f => ({
                field: f.name,
                message: f.errorMessage,
                element: f.element
            }));
            // Scroll to first error
            if (fieldErrors.length > 0) {
                fieldErrors[0].element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                fieldErrors[0].element?.focus();
            }
            return { fieldErrors, focusedFirst: true };
        }
    },
    6102: {
        name: 'FILE_TYPE_UNSUPPORTED',
        message: (params) => `File type ".${params.extension}" is not supported`,
        severity: 'LOW',
        recoverable: true,
        userFacing: true,
        resolution: (context) => ({
            acceptedTypes: context.accepted,
            suggestion: PRISM_FILE_UTILS.suggestConverter(context.extension, context.accepted)
        }),
        suggestions: (params) => [
            `Supported formats: ${params.accepted.join(', ')}`,
            'Convert your file to a supported format',
            'Check if your CAD system can export to STEP or IGES'
        ]
    },
    6103: {
        name: 'FILE_SIZE_EXCEEDED',
        message: (params) => `File size ${PRISM_UNITS.formatBytes(params.size)} exceeds limit of ${PRISM_UNITS.formatBytes(params.limit)}`,
        severity: 'LOW',
        recoverable: true,
        userFacing: true,
        resolution: async (context) => {
            // Check if file can be compressed
            if (PRISM_FILE_UTILS.canCompress(context.file)) {
                const compressed = await PRISM_FILE_UTILS.compress(context.file);
                if (compressed.size <= context.limit) {
                    return { compressedFile: compressed, wasCompressed: true };
                }
            }
            return { 
                needsReduction: true,
                suggestions: [
                    'Reduce model detail/tessellation',
                    'Remove unnecessary features',
                    'Split into multiple files'
                ]
            };
        }
    }
};
```

### 7.3 State/Navigation Errors (6200-6299)

| Code | Name | Message | Cause | Resolution |
|------|------|---------|-------|------------|
| 6201 | STATE_CORRUPTED | Application state is corrupted | Bug/crash | Reset state |
| 6202 | ROUTE_NOT_FOUND | Page not found | Invalid URL | Show 404 |
| 6203 | DEEP_LINK_INVALID | Deep link cannot be resolved | Deleted/moved | Redirect home |
| 6204 | SESSION_EXPIRED | Your session has expired | Timeout | Re-authenticate |
| 6205 | UNSAVED_CHANGES | You have unsaved changes | Navigation attempt | Prompt to save |
| 6206 | STATE_SYNC_FAILED | Failed to sync state | Network/conflict | Retry or reload |
| 6207 | HISTORY_CORRUPTED | Browser history corrupted | State mismatch | Clear history |
| 6208 | MODAL_STACK_ERROR | Modal dialog error | Stack overflow | Close all |

```javascript
const UI_STATE_ERRORS = {
    6201: {
        name: 'STATE_CORRUPTED',
        message: 'Application state has become corrupted and needs to be reset',
        severity: 'HIGH',
        recoverable: true,
        userFacing: true,
        resolution: async (context) => {
            // Try to salvage what we can
            const salvageable = {};
            try {
                salvageable.recentFiles = await PRISM_STATE.get('recentFiles');
                salvageable.userPreferences = await PRISM_STATE.get('preferences');
            } catch (e) { /* ignore */ }
            
            // Clear and reset state
            await PRISM_STATE.clear();
            await PRISM_STATE.initialize();
            
            // Restore salvaged data
            if (salvageable.recentFiles) {
                await PRISM_STATE.set('recentFiles', salvageable.recentFiles);
            }
            if (salvageable.userPreferences) {
                await PRISM_STATE.set('preferences', salvageable.userPreferences);
            }
            
            return { wasReset: true, salvaged: Object.keys(salvageable) };
        },
        suggestions: [
            'Your work has been auto-saved',
            'Application will restart with fresh state',
            'Your preferences have been preserved'
        ]
    },
    6205: {
        name: 'UNSAVED_CHANGES',
        message: 'You have unsaved changes that will be lost',
        severity: 'LOW',
        recoverable: true,
        userFacing: true,
        resolution: async (context) => {
            // Return action options for UI to present
            return {
                actions: [
                    { id: 'save', label: 'Save Changes', primary: true },
                    { id: 'discard', label: 'Discard Changes', destructive: true },
                    { id: 'cancel', label: 'Stay on Page' }
                ],
                unsavedItems: context.unsavedItems,
                canAutoSave: PRISM_AUTOSAVE.isEnabled()
            };
        }
    },
    6206: {
        name: 'STATE_SYNC_FAILED',
        message: 'Failed to synchronize application state',
        severity: 'MEDIUM',
        recoverable: true,
        userFacing: true,
        resolution: async (context) => {
            // Retry with exponential backoff
            const retryStrategy = {
                maxAttempts: 3,
                baseDelay: 1000,
                maxDelay: 5000,
                backoffMultiplier: 2
            };
            
            for (let attempt = 1; attempt <= retryStrategy.maxAttempts; attempt++) {
                try {
                    await PRISM_STATE.sync();
                    return { synced: true, attempts: attempt };
                } catch (e) {
                    if (attempt < retryStrategy.maxAttempts) {
                        const delay = Math.min(
                            retryStrategy.baseDelay * Math.pow(retryStrategy.backoffMultiplier, attempt - 1),
                            retryStrategy.maxDelay
                        );
                        await new Promise(r => setTimeout(r, delay));
                    }
                }
            }
            
            return { 
                synced: false, 
                useLocalState: true,
                warning: 'Working offline. Changes will sync when connection is restored.'
            };
        }
    }
};
```

---

## 8. NETWORK ERRORS (7000-7999)

### 8.1 Connection Errors (7000-7099)

| Code | Name | Message | Cause | Resolution |
|------|------|---------|-------|------------|
| 7001 | NETWORK_OFFLINE | No internet connection | Network down | Queue for later |
| 7002 | CONNECTION_REFUSED | Server refused connection | Server down/firewall | Retry or contact |
| 7003 | CONNECTION_TIMEOUT | Connection timed out | Slow network | Retry with longer timeout |
| 7004 | DNS_RESOLUTION_FAILED | Could not resolve hostname | DNS issue | Check network |
| 7005 | SSL_CERTIFICATE_ERROR | SSL certificate invalid | Cert expired/mismatch | Check date/cert |
| 7006 | PROXY_ERROR | Proxy connection failed | Proxy misconfigured | Check proxy settings |
| 7007 | WEBSOCKET_CLOSED | WebSocket connection closed | Server disconnect | Reconnect |
| 7008 | WEBSOCKET_ERROR | WebSocket error | Protocol error | Reconnect |

```javascript
const NETWORK_CONNECTION_ERRORS = {
    7001: {
        name: 'NETWORK_OFFLINE',
        message: 'You appear to be offline',
        severity: 'HIGH',
        recoverable: true,
        userFacing: true,
        resolution: async (context) => {
            // Enable offline mode
            PRISM_OFFLINE.enable();
            
            // Queue operation for later
            if (context.operation) {
                await PRISM_OFFLINE.queueOperation(context.operation);
            }
            
            // Set up online listener
            PRISM_NETWORK.onOnline(async () => {
                await PRISM_OFFLINE.syncQueuedOperations();
            });
            
            return {
                offlineMode: true,
                queuedOperation: context.operation?.id,
                message: 'Working offline. Changes will sync automatically when online.'
            };
        },
        suggestions: [
            'Check your internet connection',
            'Changes are saved locally',
            'Will sync automatically when online'
        ]
    },
    7003: {
        name: 'CONNECTION_TIMEOUT',
        message: (params) => `Connection timed out after ${params.timeout / 1000}s`,
        severity: 'MEDIUM',
        recoverable: true,
        userFacing: true,
        retryStrategy: {
            maxAttempts: 3,
            baseTimeout: 10000,
            maxTimeout: 60000,
            timeoutMultiplier: 2
        },
        resolution: async (context) => {
            const strategy = NETWORK_CONNECTION_ERRORS[7003].retryStrategy;
            
            for (let attempt = 1; attempt <= strategy.maxAttempts; attempt++) {
                const timeout = Math.min(
                    strategy.baseTimeout * Math.pow(strategy.timeoutMultiplier, attempt - 1),
                    strategy.maxTimeout
                );
                
                try {
                    const result = await PRISM_NETWORK.request(context.request, { timeout });
                    return { success: true, result, attempt, timeout };
                } catch (e) {
                    if (attempt === strategy.maxAttempts) {
                        return { 
                            success: false, 
                            suggestion: 'Server may be experiencing high load. Try again later.'
                        };
                    }
                }
            }
        }
    },
    7007: {
        name: 'WEBSOCKET_CLOSED',
        message: 'Real-time connection was closed',
        severity: 'MEDIUM',
        recoverable: true,
        userFacing: false,
        resolution: async (context) => {
            // Implement reconnection with backoff
            const reconnectStrategy = {
                maxAttempts: 10,
                baseDelay: 1000,
                maxDelay: 30000,
                backoffMultiplier: 1.5
            };
            
            let delay = reconnectStrategy.baseDelay;
            
            for (let attempt = 1; attempt <= reconnectStrategy.maxAttempts; attempt++) {
                try {
                    await PRISM_WEBSOCKET.connect(context.url);
                    
                    // Resubscribe to channels
                    for (const channel of context.subscribedChannels) {
                        await PRISM_WEBSOCKET.subscribe(channel);
                    }
                    
                    return { reconnected: true, attempt };
                } catch (e) {
                    delay = Math.min(delay * reconnectStrategy.backoffMultiplier, reconnectStrategy.maxDelay);
                    await new Promise(r => setTimeout(r, delay));
                }
            }
            
            return {
                reconnected: false,
                fallbackToPolling: true,
                pollInterval: 5000
            };
        }
    }
};
```

### 8.2 API Errors (7100-7199)

| Code | Name | Message | Cause | Resolution |
|------|------|---------|-------|------------|
| 7100 | API_BAD_REQUEST | Bad request (400) | Invalid request | Fix request |
| 7101 | API_UNAUTHORIZED | Unauthorized (401) | Auth required | Login |
| 7102 | API_FORBIDDEN | Forbidden (403) | No permission | Check permissions |
| 7103 | API_NOT_FOUND | Not found (404) | Resource missing | Check ID/path |
| 7104 | API_METHOD_NOT_ALLOWED | Method not allowed (405) | Wrong HTTP method | Use correct method |
| 7105 | API_CONFLICT | Conflict (409) | Resource conflict | Resolve conflict |
| 7106 | API_RATE_LIMITED | Too many requests (429) | Rate limit hit | Wait and retry |
| 7107 | API_SERVER_ERROR | Server error (500) | Server issue | Retry or report |
| 7108 | API_SERVICE_UNAVAILABLE | Service unavailable (503) | Maintenance | Wait and retry |

```javascript
const NETWORK_API_ERRORS = {
    7101: {
        name: 'API_UNAUTHORIZED',
        message: 'Your session has expired. Please log in again.',
        severity: 'HIGH',
        recoverable: true,
        userFacing: true,
        resolution: async (context) => {
            // Try to refresh token first
            try {
                const newToken = await PRISM_AUTH.refreshToken();
                if (newToken) {
                    // Retry original request with new token
                    const result = await PRISM_NETWORK.request(context.originalRequest, {
                        headers: { Authorization: `Bearer ${newToken}` }
                    });
                    return { success: true, result, tokenRefreshed: true };
                }
            } catch (e) {
                // Token refresh failed
            }
            
            // Require re-authentication
            return {
                requiresLogin: true,
                returnUrl: context.returnUrl,
                savedData: await PRISM_STATE.saveToSessionStorage()
            };
        }
    },
    7105: {
        name: 'API_CONFLICT',
        message: 'Another user has modified this resource',
        severity: 'MEDIUM',
        recoverable: true,
        userFacing: true,
        resolution: async (context) => {
            // Fetch both versions for comparison
            const serverVersion = await PRISM_API.get(context.resourceId);
            const localVersion = context.localData;
            
            // Create diff
            const diff = PRISM_DIFF.compare(localVersion, serverVersion);
            
            return {
                conflict: true,
                serverVersion,
                localVersion,
                diff,
                mergeOptions: [
                    { id: 'keep_local', label: 'Keep My Changes' },
                    { id: 'keep_server', label: 'Use Server Version' },
                    { id: 'merge', label: 'Merge Changes', available: diff.canAutoMerge }
                ]
            };
        }
    },
    7106: {
        name: 'API_RATE_LIMITED',
        message: (params) => `Rate limit exceeded. Please wait ${params.retryAfter} seconds.`,
        severity: 'MEDIUM',
        recoverable: true,
        userFacing: true,
        resolution: async (context) => {
            const retryAfter = context.retryAfter || 60;
            
            // Queue the request
            const queueId = await PRISM_REQUEST_QUEUE.add({
                request: context.request,
                executeAfter: Date.now() + (retryAfter * 1000),
                priority: context.priority || 'normal'
            });
            
            return {
                queued: true,
                queueId,
                executeAt: new Date(Date.now() + retryAfter * 1000),
                message: `Request queued. Will retry in ${retryAfter} seconds.`
            };
        }
    },
    7107: {
        name: 'API_SERVER_ERROR',
        message: 'An unexpected server error occurred',
        severity: 'HIGH',
        recoverable: true,
        userFacing: true,
        retryStrategy: {
            maxAttempts: 3,
            baseDelay: 2000,
            maxDelay: 10000,
            backoffMultiplier: 2
        },
        resolution: async (context) => {
            const strategy = NETWORK_API_ERRORS[7107].retryStrategy;
            
            for (let attempt = 1; attempt <= strategy.maxAttempts; attempt++) {
                const delay = Math.min(
                    strategy.baseDelay * Math.pow(strategy.backoffMultiplier, attempt - 1),
                    strategy.maxDelay
                );
                
                await new Promise(r => setTimeout(r, delay));
                
                try {
                    const result = await PRISM_NETWORK.request(context.request);
                    return { success: true, result, attempt };
                } catch (e) {
                    if (attempt === strategy.maxAttempts) {
                        // Log for support
                        const errorId = await PRISM_ERROR_REPORTER.submit({
                            code: 7107,
                            request: context.request,
                            serverResponse: context.response,
                            timestamp: new Date().toISOString()
                        });
                        
                        return {
                            success: false,
                            errorId,
                            message: `Error reported (ID: ${errorId}). Our team has been notified.`
                        };
                    }
                }
            }
        }
    }
};
```

### 8.3 Data Transfer Errors (7200-7299)

| Code | Name | Message | Cause | Resolution |
|------|------|---------|-------|------------|
| 7201 | UPLOAD_FAILED | File upload failed | Network/server | Retry with resume |
| 7202 | DOWNLOAD_FAILED | File download failed | Network/server | Retry with resume |
| 7203 | TRANSFER_CORRUPTED | Data corruption detected | Network issue | Re-transfer |
| 7204 | CHUNK_MISSING | Upload chunk missing | Incomplete upload | Re-upload chunk |
| 7205 | TRANSFER_CANCELLED | Transfer was cancelled | User cancelled | Clean up |
| 7206 | BANDWIDTH_EXCEEDED | Bandwidth limit exceeded | Quota | Wait or upgrade |

```javascript
const NETWORK_TRANSFER_ERRORS = {
    7201: {
        name: 'UPLOAD_FAILED',
        message: (params) => `Upload failed at ${Math.round(params.progress * 100)}%`,
        severity: 'MEDIUM',
        recoverable: true,
        userFacing: true,
        resolution: async (context) => {
            // Implement resumable upload
            const uploadState = await PRISM_UPLOAD.getState(context.uploadId);
            
            if (uploadState && uploadState.chunks) {
                // Find incomplete chunks
                const incompleteChunks = uploadState.chunks.filter(c => !c.complete);
                
                // Resume from last successful chunk
                return {
                    canResume: true,
                    completedChunks: uploadState.chunks.filter(c => c.complete).length,
                    totalChunks: uploadState.chunks.length,
                    resumeFrom: incompleteChunks[0]?.index || 0,
                    action: () => PRISM_UPLOAD.resume(context.uploadId)
                };
            }
            
            return {
                canResume: false,
                suggestion: 'Upload needs to restart from the beginning'
            };
        }
    },
    7203: {
        name: 'TRANSFER_CORRUPTED',
        message: 'Downloaded data is corrupted (checksum mismatch)',
        severity: 'HIGH',
        recoverable: true,
        userFacing: true,
        resolution: async (context) => {
            // Clear corrupted data
            await PRISM_CACHE.delete(context.cacheKey);
            
            // Re-download with verification
            const result = await PRISM_DOWNLOAD.withVerification(context.url, {
                expectedChecksum: context.expectedChecksum,
                checksumAlgorithm: 'sha256',
                retries: 3
            });
            
            if (result.verified) {
                return { success: true, data: result.data };
            }
            
            return {
                success: false,
                suggestion: 'Server file may be corrupted. Contact support.'
            };
        }
    }
};
```

---

## 9. SECURITY ERRORS (8000-8999)

### 9.1 Authentication Errors (8000-8099)

| Code | Name | Message | Cause | Resolution |
|------|------|---------|-------|------------|
| 8001 | AUTH_FAILED | Authentication failed | Invalid credentials | Re-enter credentials |
| 8002 | TOKEN_EXPIRED | Access token expired | Token timeout | Refresh token |
| 8003 | TOKEN_INVALID | Invalid access token | Tampered/corrupt | Re-authenticate |
| 8004 | REFRESH_TOKEN_EXPIRED | Refresh token expired | Long inactivity | Full re-login |
| 8005 | MFA_REQUIRED | Multi-factor auth required | Security policy | Complete MFA |
| 8006 | MFA_FAILED | MFA verification failed | Wrong code | Retry MFA |
| 8007 | ACCOUNT_LOCKED | Account temporarily locked | Too many failures | Wait or contact |
| 8008 | PASSWORD_EXPIRED | Password has expired | Policy requirement | Change password |
| 8009 | SESSION_HIJACK_DETECTED | Potential session hijack | IP/device change | Re-verify |

```javascript
const SECURITY_AUTH_ERRORS = {
    8001: {
        name: 'AUTH_FAILED',
        message: 'Invalid username or password',
        severity: 'HIGH',
        recoverable: true,
        userFacing: true,
        // Note: Don't reveal which field is wrong
        resolution: async (context) => {
            // Track failed attempts
            const attemptCount = await PRISM_SECURITY.incrementFailedAttempts(context.identifier);
            
            if (attemptCount >= 5) {
                // Trigger lockout
                await PRISM_SECURITY.lockAccount(context.identifier, 15 * 60 * 1000); // 15 min
                return {
                    locked: true,
                    lockDuration: 15 * 60,
                    message: 'Account temporarily locked due to multiple failed attempts'
                };
            }
            
            return {
                remainingAttempts: 5 - attemptCount,
                suggestion: 'Check your credentials and try again'
            };
        }
    },
    8002: {
        name: 'TOKEN_EXPIRED',
        message: 'Your session has expired',
        severity: 'MEDIUM',
        recoverable: true,
        userFacing: false, // Handle silently if possible
        resolution: async (context) => {
            try {
                // Attempt silent refresh
                const newTokens = await PRISM_AUTH.refreshTokens();
                
                // Retry original request
                const result = await PRISM_NETWORK.request(context.originalRequest, {
                    headers: { Authorization: `Bearer ${newTokens.accessToken}` }
                });
                
                return { success: true, result, refreshedSilently: true };
            } catch (e) {
                // Silent refresh failed
                return {
                    success: false,
                    requiresLogin: true,
                    message: 'Please log in again to continue'
                };
            }
        }
    },
    8005: {
        name: 'MFA_REQUIRED',
        message: 'Multi-factor authentication is required',
        severity: 'MEDIUM',
        recoverable: true,
        userFacing: true,
        resolution: async (context) => {
            // Get available MFA methods
            const methods = await PRISM_AUTH.getMFAMethods(context.userId);
            
            return {
                mfaRequired: true,
                availableMethods: methods.map(m => ({
                    type: m.type,
                    label: m.type === 'totp' ? 'Authenticator App' :
                           m.type === 'sms' ? `SMS to ${m.masked}` :
                           m.type === 'email' ? `Email to ${m.masked}` : m.type,
                    default: m.isDefault
                })),
                mfaToken: context.mfaToken // Temporary token for MFA flow
            };
        }
    },
    8007: {
        name: 'ACCOUNT_LOCKED',
        message: (params) => `Account locked. Try again in ${Math.ceil(params.remainingSeconds / 60)} minutes.`,
        severity: 'HIGH',
        recoverable: false,
        userFacing: true,
        suggestions: [
            'Wait for the lockout period to expire',
            'Contact support if you need immediate access',
            'Use account recovery if you forgot your password'
        ]
    },
    8009: {
        name: 'SESSION_HIJACK_DETECTED',
        message: 'Unusual activity detected on your account',
        severity: 'CRITICAL',
        recoverable: true,
        userFacing: true,
        resolution: async (context) => {
            // Invalidate all sessions
            await PRISM_AUTH.invalidateAllSessions(context.userId);
            
            // Log security event
            await PRISM_SECURITY_LOG.record({
                event: 'POTENTIAL_HIJACK',
                userId: context.userId,
                currentIP: context.currentIP,
                expectedIP: context.expectedIP,
                timestamp: new Date().toISOString()
            });
            
            // Require re-verification
            return {
                allSessionsInvalidated: true,
                requiresVerification: true,
                verificationMethods: ['email', 'sms', 'security_questions'],
                message: 'For your security, please verify your identity'
            };
        }
    }
};
```

### 9.2 Authorization Errors (8100-8199)

| Code | Name | Message | Cause | Resolution |
|------|------|---------|-------|------------|
| 8101 | PERMISSION_DENIED | Permission denied | No access rights | Request access |
| 8102 | ROLE_INSUFFICIENT | Insufficient role level | Role too low | Upgrade role |
| 8103 | FEATURE_LOCKED | Feature requires upgrade | Free tier limit | Upgrade plan |
| 8104 | LICENSE_EXPIRED | License has expired | Subscription ended | Renew license |
| 8105 | LICENSE_INVALID | Invalid license key | Wrong/corrupt key | Verify key |
| 8106 | SEAT_LIMIT_EXCEEDED | User seat limit reached | Too many users | Purchase seats |
| 8107 | RESOURCE_LIMIT_EXCEEDED | Resource limit reached | Plan limits | Upgrade plan |

```javascript
const SECURITY_AUTHZ_ERRORS = {
    8101: {
        name: 'PERMISSION_DENIED',
        message: (params) => `You don't have permission to ${params.action}`,
        severity: 'MEDIUM',
        recoverable: false,
        userFacing: true,
        resolution: async (context) => {
            // Get who can grant permission
            const admins = await PRISM_AUTH.getResourceAdmins(context.resourceId);
            
            return {
                canRequest: true,
                requiredPermission: context.requiredPermission,
                currentPermissions: context.userPermissions,
                admins: admins.map(a => ({ name: a.name, email: a.email })),
                requestAction: () => PRISM_AUTH.requestPermission({
                    resourceId: context.resourceId,
                    permission: context.requiredPermission,
                    reason: context.requestReason
                })
            };
        }
    },
    8103: {
        name: 'FEATURE_LOCKED',
        message: (params) => `"${params.feature}" requires ${params.requiredPlan} plan`,
        severity: 'LOW',
        recoverable: false,
        userFacing: true,
        resolution: async (context) => {
            // Get upgrade options
            const plans = await PRISM_BILLING.getPlans();
            const eligiblePlans = plans.filter(p => p.features.includes(context.feature));
            
            return {
                currentPlan: context.currentPlan,
                requiredPlan: context.requiredPlan,
                upgradeOptions: eligiblePlans.map(p => ({
                    name: p.name,
                    price: p.price,
                    billingCycle: p.billingCycle,
                    features: p.features
                })),
                upgradeUrl: '/settings/billing/upgrade'
            };
        }
    },
    8104: {
        name: 'LICENSE_EXPIRED',
        message: (params) => `Your license expired on ${params.expiredDate}`,
        severity: 'HIGH',
        recoverable: false,
        userFacing: true,
        resolution: async (context) => {
            // Check for grace period
            const daysSinceExpiry = Math.floor((Date.now() - context.expiryDate) / (24 * 60 * 60 * 1000));
            const inGracePeriod = daysSinceExpiry <= 14;
            
            return {
                expiredDate: context.expiryDate,
                daysSinceExpiry,
                inGracePeriod,
                gracePeriodRemaining: inGracePeriod ? 14 - daysSinceExpiry : 0,
                readOnlyMode: !inGracePeriod,
                renewUrl: '/settings/license/renew',
                message: inGracePeriod 
                    ? `Grace period: ${14 - daysSinceExpiry} days remaining. Renew now to avoid data access restrictions.`
                    : 'License expired. Application is in read-only mode until renewed.'
            };
        }
    }
};
```

### 9.3 Data Security Errors (8200-8299)

| Code | Name | Message | Cause | Resolution |
|------|------|---------|-------|------------|
| 8201 | ENCRYPTION_FAILED | Data encryption failed | Key/algorithm issue | Check config |
| 8202 | DECRYPTION_FAILED | Data decryption failed | Wrong key/corrupt | Verify key |
| 8203 | SIGNATURE_INVALID | Digital signature invalid | Tampered data | Reject data |
| 8204 | CERTIFICATE_EXPIRED | Certificate expired | Cert not renewed | Renew cert |
| 8205 | KEY_ROTATION_REQUIRED | Encryption key rotation needed | Policy | Rotate keys |
| 8206 | SENSITIVE_DATA_EXPOSURE | Potential data exposure | Security breach | Alert and log |

```javascript
const SECURITY_DATA_ERRORS = {
    8202: {
        name: 'DECRYPTION_FAILED',
        message: 'Failed to decrypt data',
        severity: 'CRITICAL',
        recoverable: false,
        userFacing: true,
        resolution: async (context) => {
            // Try alternate keys if available
            const keys = await PRISM_CRYPTO.getAvailableKeys(context.keyId);
            
            for (const key of keys) {
                try {
                    const decrypted = await PRISM_CRYPTO.decrypt(context.encryptedData, key);
                    return { success: true, decryptedData: decrypted, keyUsed: key.id };
                } catch (e) {
                    continue;
                }
            }
            
            // Log security event
            await PRISM_SECURITY_LOG.record({
                event: 'DECRYPTION_FAILURE',
                dataId: context.dataId,
                keyId: context.keyId,
                timestamp: new Date().toISOString()
            });
            
            return {
                success: false,
                dataLost: true,
                checkBackups: true,
                message: 'Data cannot be decrypted. It may be corrupted or the encryption key is unavailable.'
            };
        }
    },
    8203: {
        name: 'SIGNATURE_INVALID',
        message: 'Data signature verification failed - data may have been tampered',
        severity: 'CRITICAL',
        recoverable: false,
        userFacing: true,
        resolution: async (context) => {
            // Log security event
            await PRISM_SECURITY_LOG.record({
                event: 'SIGNATURE_VERIFICATION_FAILURE',
                dataId: context.dataId,
                expectedSignature: context.expectedSignature,
                actualSignature: context.actualSignature,
                timestamp: new Date().toISOString()
            });
            
            return {
                dataRejected: true,
                securityAlert: true,
                message: 'This data has been rejected because it may have been tampered with.',
                suggestions: [
                    'Request the data again from a trusted source',
                    'Contact the data provider to verify integrity',
                    'Check if the signing certificate is correct'
                ]
            };
        }
    },
    8206: {
        name: 'SENSITIVE_DATA_EXPOSURE',
        message: 'Potential exposure of sensitive data detected',
        severity: 'CRITICAL',
        recoverable: false,
        userFacing: false, // Handle internally, notify admins
        resolution: async (context) => {
            // Immediate actions
            await Promise.all([
                // Log incident
                PRISM_SECURITY_LOG.record({
                    event: 'DATA_EXPOSURE',
                    severity: 'CRITICAL',
                    details: context.details,
                    timestamp: new Date().toISOString()
                }),
                // Notify security team
                PRISM_NOTIFICATIONS.sendUrgent({
                    channel: 'security',
                    subject: 'CRITICAL: Potential Data Exposure',
                    body: JSON.stringify(context.details, null, 2)
                }),
                // Invalidate affected sessions
                context.affectedUserIds && PRISM_AUTH.invalidateSessions(context.affectedUserIds)
            ]);
            
            return {
                incidentLogged: true,
                securityNotified: true,
                sessionsInvalidated: context.affectedUserIds?.length || 0,
                nextSteps: [
                    'Security team has been notified',
                    'Affected sessions have been terminated',
                    'Incident response protocol initiated'
                ]
            };
        }
    }
};
```

---


## 10. LEARNING/ML ERRORS (9000-9999)

### 10.1 Model Errors (9000-9099)

| Code | Name | Message | Cause | Resolution |
|------|------|---------|-------|------------|
| 9001 | MODEL_LOAD_FAILED | Failed to load ML model | File missing/corrupt | Re-download model |
| 9002 | MODEL_VERSION_MISMATCH | Model version incompatible | API mismatch | Update model |
| 9003 | MODEL_INFERENCE_FAILED | Model inference failed | Runtime error | Use fallback |
| 9004 | MODEL_TIMEOUT | Model inference timed out | Complex input | Simplify or skip |
| 9005 | MODEL_NOT_FOUND | Specified model not found | Wrong ID | Check model ID |
| 9006 | MODEL_OUTDATED | Model is outdated | New version available | Update model |
| 9007 | MODEL_CALIBRATION_NEEDED | Model needs recalibration | Drift detected | Recalibrate |
| 9008 | ENSEMBLE_DISAGREEMENT | Ensemble models disagree | High uncertainty | Review inputs |

```javascript
const ML_MODEL_ERRORS = {
    9001: {
        name: 'MODEL_LOAD_FAILED',
        message: (params) => `Failed to load model "${params.modelId}"`,
        severity: 'HIGH',
        recoverable: true,
        userFacing: false,
        resolution: async (context) => {
            // Try to re-download model
            try {
                await PRISM_ML.clearModelCache(context.modelId);
                const model = await PRISM_ML.downloadModel(context.modelId);
                await PRISM_ML.validateModel(model);
                return { success: true, redownloaded: true };
            } catch (e) {
                // Fall back to older version if available
                const versions = await PRISM_ML.getAvailableVersions(context.modelId);
                if (versions.length > 1) {
                    const fallbackVersion = versions[1]; // Previous version
                    await PRISM_ML.loadModel(context.modelId, fallbackVersion);
                    return { 
                        success: true, 
                        usedFallbackVersion: fallbackVersion,
                        warning: 'Using previous model version'
                    };
                }
                
                return { 
                    success: false, 
                    usePhysicsOnly: true,
                    message: 'ML model unavailable. Using physics-based calculations only.'
                };
            }
        }
    },
    9003: {
        name: 'MODEL_INFERENCE_FAILED',
        message: 'ML model prediction failed',
        severity: 'MEDIUM',
        recoverable: true,
        userFacing: false,
        resolution: async (context) => {
            // Log for debugging
            await PRISM_ML_LOG.record({
                event: 'INFERENCE_FAILURE',
                modelId: context.modelId,
                input: context.input,
                error: context.error,
                timestamp: new Date().toISOString()
            });
            
            // Return physics-only fallback
            return {
                useFallback: true,
                fallbackType: 'physics',
                confidenceImpact: -0.15, // Reduce confidence without ML input
                message: 'Using physics-based calculation as fallback'
            };
        }
    },
    9007: {
        name: 'MODEL_CALIBRATION_NEEDED',
        message: 'Model predictions may be inaccurate - recalibration recommended',
        severity: 'MEDIUM',
        recoverable: true,
        userFacing: true,
        resolution: async (context) => {
            // Get calibration data requirements
            const requirements = await PRISM_ML.getCalibrationRequirements(context.modelId);
            
            // Check if we have enough data
            const availableData = await PRISM_LEARNING_DB.getRecentResults({
                modelId: context.modelId,
                limit: requirements.minSamples
            });
            
            if (availableData.length >= requirements.minSamples) {
                // Trigger background recalibration
                const calibrationJob = await PRISM_ML.startCalibration({
                    modelId: context.modelId,
                    data: availableData,
                    background: true
                });
                
                return {
                    calibrationStarted: true,
                    jobId: calibrationJob.id,
                    estimatedTime: calibrationJob.estimatedTime,
                    continueWithCurrentModel: true
                };
            }
            
            return {
                calibrationDeferred: true,
                samplesNeeded: requirements.minSamples - availableData.length,
                message: `Need ${requirements.minSamples - availableData.length} more data points before recalibration`
            };
        }
    },
    9008: {
        name: 'ENSEMBLE_DISAGREEMENT',
        message: 'Prediction uncertainty is high due to model disagreement',
        severity: 'LOW',
        recoverable: true,
        userFacing: true,
        resolution: async (context) => {
            // Analyze which models disagree
            const analysis = {
                predictions: context.predictions,
                mean: context.predictions.reduce((a, b) => a + b, 0) / context.predictions.length,
                stdDev: Math.sqrt(context.predictions.reduce((sum, p) => 
                    sum + Math.pow(p - context.mean, 2), 0) / context.predictions.length),
                range: {
                    min: Math.min(...context.predictions),
                    max: Math.max(...context.predictions)
                }
            };
            
            return {
                highUncertainty: true,
                analysis,
                recommendation: 'conservative', // Use conservative (lower speed/feed)
                confidenceReduction: analysis.stdDev / analysis.mean,
                suggestions: [
                    'Consider running a test cut to validate',
                    'Use conservative parameters',
                    'Review input parameters for unusual values'
                ]
            };
        }
    }
};
```

### 10.2 Training Errors (9100-9199)

| Code | Name | Message | Cause | Resolution |
|------|------|---------|-------|------------|
| 9101 | TRAINING_DATA_INSUFFICIENT | Not enough training data | Few samples | Collect more data |
| 9102 | TRAINING_DATA_IMBALANCED | Training data is imbalanced | Skewed distribution | Balance dataset |
| 9103 | TRAINING_DIVERGED | Training loss diverged | Bad hyperparameters | Adjust learning rate |
| 9104 | OVERFITTING_DETECTED | Model is overfitting | Too complex | Add regularization |
| 9105 | UNDERFITTING_DETECTED | Model is underfitting | Too simple | Increase capacity |
| 9106 | VALIDATION_DEGRADED | Validation performance dropped | Data drift | Retrain on new data |
| 9107 | FEATURE_IMPORTANCE_SHIFT | Feature importance changed | Domain shift | Review features |

```javascript
const ML_TRAINING_ERRORS = {
    9101: {
        name: 'TRAINING_DATA_INSUFFICIENT',
        message: (params) => `Training requires ${params.required} samples, only ${params.available} available`,
        severity: 'MEDIUM',
        recoverable: true,
        userFacing: false,
        resolution: async (context) => {
            // Check if data augmentation can help
            const augmentedCount = context.available * 3; // Typical augmentation multiplier
            
            if (augmentedCount >= context.required) {
                return {
                    useAugmentation: true,
                    augmentationStrategies: ['noise_injection', 'interpolation', 'physics_based_synthesis'],
                    targetSamples: context.required
                };
            }
            
            // Can't train yet
            return {
                cannotTrain: true,
                samplesNeeded: context.required - context.available,
                dataCollectionEstimate: `~${Math.ceil((context.required - context.available) / 10)} more jobs`,
                fallbackToPhysics: true
            };
        }
    },
    9103: {
        name: 'TRAINING_DIVERGED',
        message: 'Training loss diverged to infinity',
        severity: 'HIGH',
        recoverable: true,
        userFacing: false,
        resolution: async (context) => {
            // Try with reduced learning rate
            const newLR = context.learningRate * 0.1;
            
            try {
                const result = await PRISM_ML.train({
                    ...context.config,
                    learningRate: newLR,
                    gradientClipping: true,
                    clipValue: 1.0
                });
                
                return { success: true, usedLR: newLR, result };
            } catch (e) {
                // Check for data issues
                const dataAnalysis = await PRISM_ML.analyzeTrainingData(context.data);
                
                return {
                    success: false,
                    dataIssues: dataAnalysis.issues,
                    suggestions: [
                        'Check for outliers in training data',
                        'Normalize input features',
                        'Remove corrupt data points',
                        'Try different model architecture'
                    ]
                };
            }
        }
    },
    9104: {
        name: 'OVERFITTING_DETECTED',
        message: (params) => `Training accuracy ${params.trainAcc}% vs validation ${params.valAcc}%`,
        severity: 'MEDIUM',
        recoverable: true,
        userFacing: false,
        resolution: async (context) => {
            // Apply regularization strategies
            const strategies = [
                { name: 'dropout', config: { rate: 0.3 } },
                { name: 'l2_regularization', config: { lambda: 0.01 } },
                { name: 'early_stopping', config: { patience: 5 } },
                { name: 'data_augmentation', config: { factor: 2 } }
            ];
            
            return {
                overfitting: true,
                gapPercent: context.trainAcc - context.valAcc,
                recommendedStrategies: strategies,
                autoApply: ['early_stopping', 'dropout']
            };
        }
    },
    9106: {
        name: 'VALIDATION_DEGRADED',
        message: 'Model performance has degraded on recent data',
        severity: 'MEDIUM',
        recoverable: true,
        userFacing: false,
        resolution: async (context) => {
            // Analyze drift
            const driftAnalysis = await PRISM_ML.analyzeDrift({
                oldData: context.trainingData,
                newData: context.recentData
            });
            
            if (driftAnalysis.significantDrift) {
                return {
                    driftDetected: true,
                    driftedFeatures: driftAnalysis.driftedFeatures,
                    recommendation: 'retrain',
                    includeRecentData: true,
                    retrainConfig: {
                        useLastNMonths: 6,
                        weightRecent: true
                    }
                };
            }
            
            return {
                driftDetected: false,
                possibleCause: 'outliers',
                suggestion: 'Monitor performance, may be temporary'
            };
        }
    }
};
```

### 10.3 Feedback Loop Errors (9200-9299)

| Code | Name | Message | Cause | Resolution |
|------|------|---------|-------|------------|
| 9201 | FEEDBACK_REJECTED | Feedback data rejected | Invalid format | Fix format |
| 9202 | FEEDBACK_CONFLICT | Feedback conflicts with physics | Unrealistic values | Review feedback |
| 9203 | FEEDBACK_SUSPICIOUS | Suspicious feedback pattern | Possible manipulation | Flag for review |
| 9204 | LEARNING_RATE_EXCEEDED | Learning rate too aggressive | Fast adaptation | Slow down |
| 9205 | CONFIDENCE_COLLAPSE | Model confidence collapsed | Bad feedback | Revert to baseline |

```javascript
const ML_FEEDBACK_ERRORS = {
    9202: {
        name: 'FEEDBACK_CONFLICT',
        message: 'Reported results conflict with physical limits',
        severity: 'MEDIUM',
        recoverable: true,
        userFacing: true,
        resolution: async (context) => {
            // Validate against physics
            const physicsCheck = await PRISM_PHYSICS.validate({
                speed: context.feedback.actualSpeed,
                feed: context.feedback.actualFeed,
                material: context.feedback.material,
                tool: context.feedback.tool
            });
            
            if (!physicsCheck.valid) {
                return {
                    feedbackRejected: true,
                    violations: physicsCheck.violations,
                    suggestions: [
                        'Verify the measured values',
                        'Check unit conversion (mm vs inch)',
                        'Confirm material was correctly identified'
                    ],
                    allowOverride: false // Don't allow physics violation
                };
            }
            
            // Physics valid but unusual
            return {
                feedbackFlagged: true,
                unusualAspects: physicsCheck.warnings,
                requiresConfirmation: true,
                message: 'These parameters are unusual but physically possible. Please confirm.'
            };
        }
    },
    9203: {
        name: 'FEEDBACK_SUSPICIOUS',
        message: 'Feedback pattern appears suspicious',
        severity: 'HIGH',
        recoverable: false,
        userFacing: false,
        resolution: async (context) => {
            // Log for security review
            await PRISM_SECURITY_LOG.record({
                event: 'SUSPICIOUS_FEEDBACK',
                userId: context.userId,
                pattern: context.suspiciousPattern,
                feedbackIds: context.feedbackIds,
                timestamp: new Date().toISOString()
            });
            
            // Quarantine feedback
            await PRISM_LEARNING_DB.quarantine(context.feedbackIds, {
                reason: 'suspicious_pattern',
                reviewer: 'system'
            });
            
            return {
                feedbackQuarantined: true,
                reviewRequired: true,
                userNotified: false // Don't alert potential manipulator
            };
        }
    },
    9205: {
        name: 'CONFIDENCE_COLLAPSE',
        message: 'Model confidence has become unreliable',
        severity: 'HIGH',
        recoverable: true,
        userFacing: false,
        resolution: async (context) => {
            // Revert to baseline model
            const baselineVersion = await PRISM_ML.getBaselineVersion(context.modelId);
            
            await PRISM_ML.revertToVersion(context.modelId, baselineVersion);
            
            // Clear recent problematic training
            await PRISM_LEARNING_DB.markForReview({
                modelId: context.modelId,
                since: context.collapseStarted
            });
            
            return {
                revertedToBaseline: true,
                baselineVersion,
                dataMarkedForReview: true,
                message: 'Model reverted to baseline. Recent training data queued for review.'
            };
        }
    }
};
```

---

## 11. ERROR HANDLING PATTERNS

### 11.1 Unified Error Handler

```javascript
/**
 * PRISM Unified Error Handler
 * Processes all errors through consistent pipeline
 */
const PRISM_ERROR_HANDLER = {
    /**
     * Handle any error with full resolution pipeline
     */
    async handle(error, context = {}) {
        // 1. Normalize error
        const normalized = this._normalizeError(error);
        
        // 2. Log error
        await this._logError(normalized, context);
        
        // 3. Attempt resolution
        const resolution = await this._attemptResolution(normalized, context);
        
        // 4. Update metrics
        await this._updateMetrics(normalized, resolution);
        
        // 5. Notify if needed
        if (normalized.severity === 'CRITICAL' || !resolution.success) {
            await this._notify(normalized, resolution);
        }
        
        // 6. Return result
        return {
            handled: true,
            error: normalized,
            resolution,
            userMessage: this._getUserMessage(normalized, resolution)
        };
    },
    
    /**
     * Normalize any error to PRISM format
     */
    _normalizeError(error) {
        // Already a PRISM error
        if (error instanceof PRISMError) {
            return error;
        }
        
        // Standard Error
        if (error instanceof Error) {
            // Try to identify known error patterns
            const code = this._identifyErrorCode(error);
            return new PRISMError(
                code || 1999, // Unknown system error
                error.message,
                { originalError: error.stack }
            );
        }
        
        // Unknown format
        return new PRISMError(1999, String(error), { raw: error });
    },
    
    /**
     * Identify error code from error message/type
     */
    _identifyErrorCode(error) {
        const patterns = [
            { regex: /network|offline|connection/i, code: 7001 },
            { regex: /timeout/i, code: 7003 },
            { regex: /unauthorized|401/i, code: 7101 },
            { regex: /forbidden|403/i, code: 7102 },
            { regex: /not found|404/i, code: 7103 },
            { regex: /rate limit|429/i, code: 7106 },
            { regex: /server error|500/i, code: 7107 },
            { regex: /webgl|canvas/i, code: 6001 },
            { regex: /memory|heap/i, code: 1100 },
            { regex: /database|db|sql/i, code: 2000 },
            { regex: /decrypt|encrypt/i, code: 8201 },
            { regex: /permission denied/i, code: 8101 }
        ];
        
        for (const pattern of patterns) {
            if (pattern.regex.test(error.message)) {
                return pattern.code;
            }
        }
        
        return null;
    },
    
    /**
     * Log error with context
     */
    async _logError(error, context) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            code: error.code,
            name: error.name,
            message: error.message,
            severity: error.severity,
            category: error.category,
            context: {
                userId: context.userId,
                sessionId: context.sessionId,
                route: context.route,
                action: context.action
            },
            stack: error.stack,
            details: error.details
        };
        
        // Log to appropriate destination based on severity
        switch (error.severity) {
            case 'CRITICAL':
                await PRISM_LOGGER.critical(logEntry);
                break;
            case 'HIGH':
                await PRISM_LOGGER.error(logEntry);
                break;
            case 'MEDIUM':
                await PRISM_LOGGER.warn(logEntry);
                break;
            default:
                await PRISM_LOGGER.info(logEntry);
        }
    },
    
    /**
     * Attempt automatic resolution
     */
    async _attemptResolution(error, context) {
        // Get error definition
        const errorDef = PRISM_ERROR_CATALOG.get(error.code);
        
        if (!errorDef || !errorDef.resolution) {
            return { success: false, reason: 'no_resolution_defined' };
        }
        
        if (!errorDef.recoverable) {
            return { success: false, reason: 'not_recoverable' };
        }
        
        try {
            const result = await errorDef.resolution({
                ...error.details,
                ...context
            });
            
            return {
                success: result.success !== false,
                result,
                recoveryType: 'automatic'
            };
        } catch (resolutionError) {
            return {
                success: false,
                reason: 'resolution_failed',
                resolutionError: resolutionError.message
            };
        }
    },
    
    /**
     * Get user-friendly message
     */
    _getUserMessage(error, resolution) {
        if (!error.userFacing) {
            return 'An unexpected error occurred. Please try again.';
        }
        
        let message = typeof error.message === 'function' 
            ? error.message(error.details) 
            : error.message;
        
        if (resolution.success && resolution.result?.message) {
            message += '\n\n' + resolution.result.message;
        }
        
        if (error.suggestions) {
            const suggestions = typeof error.suggestions === 'function'
                ? error.suggestions(error.details)
                : error.suggestions;
            
            if (suggestions.length > 0) {
                message += '\n\nSuggestions:\n• ' + suggestions.join('\n• ');
            }
        }
        
        return message;
    }
};
```

### 11.2 Try-Catch Wrapper

```javascript
/**
 * Safe execution wrapper with automatic error handling
 */
const PRISM_SAFE = {
    /**
     * Execute function with automatic error handling
     */
    async execute(fn, options = {}) {
        const {
            context = {},
            fallback = null,
            retries = 0,
            retryDelay = 1000,
            onError = null
        } = options;
        
        let lastError;
        
        for (let attempt = 0; attempt <= retries; attempt++) {
            try {
                const result = await fn();
                return { success: true, result, attempt };
            } catch (error) {
                lastError = error;
                
                // Call custom error handler if provided
                if (onError) {
                    const shouldContinue = await onError(error, attempt);
                    if (!shouldContinue) break;
                }
                
                // Wait before retry
                if (attempt < retries) {
                    await new Promise(r => setTimeout(r, retryDelay * (attempt + 1)));
                }
            }
        }
        
        // All attempts failed
        const handled = await PRISM_ERROR_HANDLER.handle(lastError, context);
        
        if (fallback !== null) {
            return {
                success: false,
                result: typeof fallback === 'function' ? fallback(lastError) : fallback,
                error: handled,
                usedFallback: true
            };
        }
        
        return { success: false, error: handled };
    },
    
    /**
     * Execute calculation with physics fallback
     */
    async calculate(fn, physicsFallback, context = {}) {
        try {
            const result = await fn();
            return { success: true, result, source: 'primary' };
        } catch (error) {
            // Log but don't throw
            await PRISM_LOGGER.warn({
                message: 'Primary calculation failed, using physics fallback',
                error: error.message,
                context
            });
            
            try {
                const fallbackResult = await physicsFallback();
                return {
                    success: true,
                    result: fallbackResult,
                    source: 'physics_fallback',
                    confidenceImpact: -0.1 // Slight confidence reduction
                };
            } catch (fallbackError) {
                // Both failed
                return {
                    success: false,
                    error: await PRISM_ERROR_HANDLER.handle(fallbackError, context)
                };
            }
        }
    }
};

// Usage examples
async function exampleUsage() {
    // Basic safe execution
    const result = await PRISM_SAFE.execute(
        () => PRISM_API.fetchData(id),
        { fallback: defaultData, retries: 2 }
    );
    
    // Calculation with physics fallback
    const speed = await PRISM_SAFE.calculate(
        () => PRISM_ML.predictSpeed(params),
        () => PRISM_PHYSICS.calculateSpeed(params),
        { operation: 'speed_calculation' }
    );
}
```

### 11.3 Error Boundary for UI Components

```javascript
/**
 * React-style error boundary wrapper
 */
class PRISMErrorBoundary {
    constructor(options = {}) {
        this.fallbackUI = options.fallbackUI || this._defaultFallback;
        this.onError = options.onError;
        this.hasError = false;
        this.error = null;
    }
    
    /**
     * Wrap a component/function with error boundary
     */
    wrap(component) {
        return async (...args) => {
            try {
                this.hasError = false;
                this.error = null;
                return await component(...args);
            } catch (error) {
                this.hasError = true;
                this.error = error;
                
                // Handle the error
                const handled = await PRISM_ERROR_HANDLER.handle(error, {
                    component: component.name,
                    args
                });
                
                // Call custom handler if provided
                if (this.onError) {
                    await this.onError(handled);
                }
                
                // Return fallback UI
                return this.fallbackUI(handled);
            }
        };
    }
    
    _defaultFallback(error) {
        return {
            type: 'error',
            component: 'ErrorDisplay',
            props: {
                title: 'Something went wrong',
                message: error.userMessage,
                code: error.error?.code,
                canRetry: error.error?.recoverable,
                onRetry: () => window.location.reload()
            }
        };
    }
}
```

---

## 12. RECOVERY STRATEGIES

### 12.1 Retry Strategies

```javascript
/**
 * Configurable retry strategies for different error types
 */
const PRISM_RETRY_STRATEGIES = {
    // Immediate retry for transient errors
    immediate: {
        maxAttempts: 3,
        delay: 0,
        backoff: 'none'
    },
    
    // Linear backoff for rate limits
    linear: {
        maxAttempts: 5,
        baseDelay: 1000,
        backoff: 'linear', // delay = baseDelay * attempt
        maxDelay: 10000
    },
    
    // Exponential backoff for server errors
    exponential: {
        maxAttempts: 5,
        baseDelay: 1000,
        backoff: 'exponential', // delay = baseDelay * 2^attempt
        maxDelay: 30000,
        jitter: true // Add random jitter to prevent thundering herd
    },
    
    // Aggressive for critical operations
    aggressive: {
        maxAttempts: 10,
        baseDelay: 500,
        backoff: 'exponential',
        maxDelay: 60000,
        jitter: true
    },
    
    /**
     * Execute with retry strategy
     */
    async execute(fn, strategyName, options = {}) {
        const strategy = { ...this[strategyName], ...options };
        let lastError;
        
        for (let attempt = 1; attempt <= strategy.maxAttempts; attempt++) {
            try {
                const result = await fn();
                return { success: true, result, attempts: attempt };
            } catch (error) {
                lastError = error;
                
                if (attempt < strategy.maxAttempts) {
                    const delay = this._calculateDelay(strategy, attempt);
                    await new Promise(r => setTimeout(r, delay));
                }
            }
        }
        
        return { success: false, error: lastError, attempts: strategy.maxAttempts };
    },
    
    _calculateDelay(strategy, attempt) {
        let delay;
        
        switch (strategy.backoff) {
            case 'none':
                delay = strategy.delay || 0;
                break;
            case 'linear':
                delay = strategy.baseDelay * attempt;
                break;
            case 'exponential':
                delay = strategy.baseDelay * Math.pow(2, attempt - 1);
                break;
            default:
                delay = strategy.baseDelay;
        }
        
        // Apply max delay
        delay = Math.min(delay, strategy.maxDelay || Infinity);
        
        // Apply jitter
        if (strategy.jitter) {
            delay = delay * (0.5 + Math.random());
        }
        
        return delay;
    },
    
    /**
     * Get recommended strategy for error code
     */
    forErrorCode(code) {
        const category = Math.floor(code / 1000);
        
        switch (category) {
            case 7: // Network errors
                if (code === 7106) return 'linear'; // Rate limit
                return 'exponential';
            case 2: // Database errors
                if (code === 2299) return 'exponential'; // Deadlock
                return 'immediate';
            case 1: // System errors
                return 'aggressive';
            default:
                return 'immediate';
        }
    }
};
```

### 12.2 Circuit Breaker

```javascript
/**
 * Circuit breaker pattern for failing services
 */
class PRISMCircuitBreaker {
    constructor(options = {}) {
        this.name = options.name || 'default';
        this.failureThreshold = options.failureThreshold || 5;
        this.resetTimeout = options.resetTimeout || 60000; // 1 minute
        this.halfOpenMax = options.halfOpenMax || 3;
        
        this.state = 'CLOSED';
        this.failures = 0;
        this.successes = 0;
        this.lastFailure = null;
        this.halfOpenAttempts = 0;
    }
    
    /**
     * Execute function through circuit breaker
     */
    async execute(fn) {
        if (this.state === 'OPEN') {
            // Check if reset timeout has passed
            if (Date.now() - this.lastFailure >= this.resetTimeout) {
                this.state = 'HALF_OPEN';
                this.halfOpenAttempts = 0;
            } else {
                throw new PRISMError(1299, `Circuit breaker ${this.name} is OPEN`, {
                    retryAfter: this.resetTimeout - (Date.now() - this.lastFailure)
                });
            }
        }
        
        try {
            const result = await fn();
            this._onSuccess();
            return result;
        } catch (error) {
            this._onFailure();
            throw error;
        }
    }
    
    _onSuccess() {
        this.failures = 0;
        
        if (this.state === 'HALF_OPEN') {
            this.successes++;
            if (this.successes >= this.halfOpenMax) {
                this.state = 'CLOSED';
                this.successes = 0;
            }
        }
    }
    
    _onFailure() {
        this.failures++;
        this.lastFailure = Date.now();
        
        if (this.state === 'HALF_OPEN') {
            // Immediate trip on failure in half-open
            this.state = 'OPEN';
            return;
        }
        
        if (this.failures >= this.failureThreshold) {
            this.state = 'OPEN';
        }
    }
    
    getState() {
        return {
            name: this.name,
            state: this.state,
            failures: this.failures,
            lastFailure: this.lastFailure,
            nextRetry: this.state === 'OPEN' 
                ? new Date(this.lastFailure + this.resetTimeout).toISOString()
                : null
        };
    }
}

// Create circuit breakers for external services
const CIRCUIT_BREAKERS = {
    database: new PRISMCircuitBreaker({ name: 'database', failureThreshold: 3 }),
    mlService: new PRISMCircuitBreaker({ name: 'ml_service', failureThreshold: 5 }),
    externalAPI: new PRISMCircuitBreaker({ name: 'external_api', failureThreshold: 5, resetTimeout: 120000 })
};
```

### 12.3 Graceful Degradation

```javascript
/**
 * Graceful degradation configuration
 */
const PRISM_DEGRADATION = {
    /**
     * Define degradation levels
     */
    levels: {
        FULL: {
            ml: true,
            physics: true,
            historical: true,
            realtime: true,
            cloud: true
        },
        REDUCED_ML: {
            ml: false,
            physics: true,
            historical: true,
            realtime: true,
            cloud: true
        },
        LOCAL_ONLY: {
            ml: false,
            physics: true,
            historical: 'local_only',
            realtime: false,
            cloud: false
        },
        MINIMAL: {
            ml: false,
            physics: true,
            historical: false,
            realtime: false,
            cloud: false
        }
    },
    
    currentLevel: 'FULL',
    
    /**
     * Degrade to lower level
     */
    async degrade(reason) {
        const levels = Object.keys(this.levels);
        const currentIndex = levels.indexOf(this.currentLevel);
        
        if (currentIndex < levels.length - 1) {
            const newLevel = levels[currentIndex + 1];
            this.currentLevel = newLevel;
            
            await PRISM_LOGGER.warn({
                event: 'DEGRADATION',
                from: levels[currentIndex],
                to: newLevel,
                reason
            });
            
            // Notify user if significant
            if (newLevel === 'LOCAL_ONLY' || newLevel === 'MINIMAL') {
                PRISM_UI.showNotification({
                    type: 'warning',
                    title: 'Reduced Functionality',
                    message: 'Some features are temporarily unavailable. Using offline mode.',
                    persistent: true
                });
            }
        }
        
        return this.currentLevel;
    },
    
    /**
     * Try to restore higher level
     */
    async tryRestore() {
        const levels = Object.keys(this.levels);
        const currentIndex = levels.indexOf(this.currentLevel);
        
        if (currentIndex > 0) {
            const targetLevel = levels[currentIndex - 1];
            const features = this.levels[targetLevel];
            
            // Test if features are available
            const tests = [];
            if (features.ml) tests.push(this._testML());
            if (features.cloud) tests.push(this._testCloud());
            if (features.realtime) tests.push(this._testRealtime());
            
            try {
                await Promise.all(tests);
                this.currentLevel = targetLevel;
                
                await PRISM_LOGGER.info({
                    event: 'RESTORATION',
                    to: targetLevel
                });
                
                return true;
            } catch (e) {
                return false;
            }
        }
        
        return false;
    },
    
    /**
     * Check if feature is available at current level
     */
    isAvailable(feature) {
        return this.levels[this.currentLevel][feature] === true;
    },
    
    async _testML() {
        return PRISM_ML.healthCheck();
    },
    
    async _testCloud() {
        return PRISM_NETWORK.ping('api.prism.com');
    },
    
    async _testRealtime() {
        return PRISM_WEBSOCKET.isConnected();
    }
};
```

---


## 13. LOGGING AND MONITORING

### 13.1 Error Logging Structure

```javascript
/**
 * Structured error logging for PRISM
 */
const PRISM_ERROR_LOGGER = {
    /**
     * Log levels and their destinations
     */
    destinations: {
        CRITICAL: ['console', 'file', 'database', 'alerting', 'pagerduty'],
        HIGH: ['console', 'file', 'database', 'alerting'],
        MEDIUM: ['console', 'file', 'database'],
        LOW: ['file', 'database'],
        DEBUG: ['file'] // Only in development
    },
    
    /**
     * Log error with full context
     */
    async log(error, context = {}) {
        const entry = {
            // Core fields
            id: PRISM_UUID.generate(),
            timestamp: new Date().toISOString(),
            
            // Error info
            code: error.code,
            name: error.name,
            category: PRISM_ERROR.parseCode(error.code).category,
            message: typeof error.message === 'function' 
                ? error.message(error.details)
                : error.message,
            severity: error.severity,
            
            // Context
            userId: context.userId || 'anonymous',
            sessionId: context.sessionId,
            requestId: context.requestId,
            route: context.route,
            action: context.action,
            
            // Technical details
            stack: error.stack,
            details: error.details,
            
            // Environment
            environment: process.env.NODE_ENV,
            version: PRISM_VERSION,
            hostname: os.hostname(),
            
            // Request info (if HTTP)
            request: context.request ? {
                method: context.request.method,
                url: context.request.url,
                userAgent: context.request.headers?.['user-agent'],
                ip: context.request.ip
            } : null,
            
            // Browser info (if client)
            browser: context.browser ? {
                name: context.browser.name,
                version: context.browser.version,
                platform: context.browser.platform,
                screenSize: context.browser.screenSize
            } : null
        };
        
        // Send to all configured destinations
        const destinations = this.destinations[error.severity] || ['file'];
        await Promise.allSettled(
            destinations.map(dest => this._sendTo(dest, entry))
        );
        
        return entry.id;
    },
    
    async _sendTo(destination, entry) {
        switch (destination) {
            case 'console':
                this._logToConsole(entry);
                break;
            case 'file':
                await this._logToFile(entry);
                break;
            case 'database':
                await this._logToDatabase(entry);
                break;
            case 'alerting':
                await this._sendAlert(entry);
                break;
            case 'pagerduty':
                await this._pageDuty(entry);
                break;
        }
    },
    
    _logToConsole(entry) {
        const color = {
            CRITICAL: '\x1b[41m', // Red background
            HIGH: '\x1b[31m',      // Red text
            MEDIUM: '\x1b[33m',    // Yellow
            LOW: '\x1b[36m',       // Cyan
            DEBUG: '\x1b[90m'      // Gray
        }[entry.severity] || '\x1b[0m';
        
        console.log(
            `${color}[${entry.timestamp}] [${entry.severity}] ${entry.code} ${entry.name}: ${entry.message}\x1b[0m`
        );
        if (entry.severity === 'CRITICAL' || entry.severity === 'HIGH') {
            console.log('Stack:', entry.stack);
        }
    },
    
    async _logToFile(entry) {
        const date = entry.timestamp.split('T')[0];
        const filename = `errors_${date}.jsonl`;
        
        await PRISM_FS.appendFile(
            `logs/${filename}`,
            JSON.stringify(entry) + '\n'
        );
    },
    
    async _logToDatabase(entry) {
        await PRISM_DB.insert('error_logs', entry);
    },
    
    async _sendAlert(entry) {
        await PRISM_ALERTING.send({
            channel: entry.severity === 'CRITICAL' ? 'urgent' : 'errors',
            title: `[${entry.severity}] ${entry.code}: ${entry.name}`,
            body: entry.message,
            fields: [
                { name: 'Error ID', value: entry.id },
                { name: 'User', value: entry.userId },
                { name: 'Time', value: entry.timestamp }
            ]
        });
    },
    
    async _pageDuty(entry) {
        await fetch('https://events.pagerduty.com/v2/enqueue', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                routing_key: process.env.PAGERDUTY_KEY,
                event_action: 'trigger',
                payload: {
                    summary: `PRISM ${entry.code}: ${entry.name}`,
                    severity: 'critical',
                    source: entry.hostname,
                    custom_details: {
                        error_id: entry.id,
                        message: entry.message,
                        user_id: entry.userId
                    }
                }
            })
        });
    }
};
```

### 13.2 Error Metrics and Monitoring

```javascript
/**
 * Error metrics collection for monitoring dashboards
 */
const PRISM_ERROR_METRICS = {
    // Counters
    counters: {
        total: 0,
        byCategory: {},
        bySeverity: {},
        byCode: {}
    },
    
    // Time windows for rate calculation
    windows: {
        minute: [],
        hour: [],
        day: []
    },
    
    /**
     * Record error occurrence
     */
    record(error) {
        const now = Date.now();
        const category = PRISM_ERROR.parseCode(error.code).category;
        
        // Increment counters
        this.counters.total++;
        this.counters.byCategory[category] = (this.counters.byCategory[category] || 0) + 1;
        this.counters.bySeverity[error.severity] = (this.counters.bySeverity[error.severity] || 0) + 1;
        this.counters.byCode[error.code] = (this.counters.byCode[error.code] || 0) + 1;
        
        // Add to time windows
        const record = { timestamp: now, code: error.code, severity: error.severity };
        this.windows.minute.push(record);
        this.windows.hour.push(record);
        this.windows.day.push(record);
        
        // Clean old records
        this._cleanWindows(now);
        
        // Check for anomalies
        this._checkAnomalies(error);
    },
    
    _cleanWindows(now) {
        const oneMinuteAgo = now - 60000;
        const oneHourAgo = now - 3600000;
        const oneDayAgo = now - 86400000;
        
        this.windows.minute = this.windows.minute.filter(r => r.timestamp > oneMinuteAgo);
        this.windows.hour = this.windows.hour.filter(r => r.timestamp > oneHourAgo);
        this.windows.day = this.windows.day.filter(r => r.timestamp > oneDayAgo);
    },
    
    _checkAnomalies(error) {
        // Check for error spike
        const lastMinute = this.windows.minute.length;
        if (lastMinute > 100) {
            PRISM_ALERTING.send({
                channel: 'urgent',
                title: 'Error Spike Detected',
                body: `${lastMinute} errors in the last minute`,
                severity: 'warning'
            });
        }
        
        // Check for new error type
        if (this.counters.byCode[error.code] === 1) {
            PRISM_ALERTING.send({
                channel: 'errors',
                title: 'New Error Type Detected',
                body: `First occurrence of error ${error.code}: ${error.name}`,
                severity: 'info'
            });
        }
    },
    
    /**
     * Get metrics snapshot for dashboard
     */
    getSnapshot() {
        const now = Date.now();
        this._cleanWindows(now);
        
        return {
            timestamp: new Date().toISOString(),
            total: this.counters.total,
            rates: {
                perMinute: this.windows.minute.length,
                perHour: this.windows.hour.length,
                perDay: this.windows.day.length
            },
            byCategory: { ...this.counters.byCategory },
            bySeverity: { ...this.counters.bySeverity },
            topErrors: Object.entries(this.counters.byCode)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10)
                .map(([code, count]) => ({ code: parseInt(code), count })),
            health: this._calculateHealth()
        };
    },
    
    _calculateHealth() {
        const critical = this.windows.hour.filter(r => r.severity === 'CRITICAL').length;
        const high = this.windows.hour.filter(r => r.severity === 'HIGH').length;
        
        if (critical > 0) return { status: 'critical', score: 0 };
        if (high > 10) return { status: 'degraded', score: 50 };
        if (high > 0) return { status: 'warning', score: 75 };
        return { status: 'healthy', score: 100 };
    }
};
```

### 13.3 Error Analysis Queries

```javascript
/**
 * Error analysis for troubleshooting and reporting
 */
const PRISM_ERROR_ANALYSIS = {
    /**
     * Get errors by time range
     */
    async byTimeRange(start, end, filters = {}) {
        const query = {
            timestamp: { $gte: start, $lte: end },
            ...filters
        };
        
        return PRISM_DB.query('error_logs', query, {
            sort: { timestamp: -1 },
            limit: 1000
        });
    },
    
    /**
     * Get error trends
     */
    async getTrends(period = 'day', days = 7) {
        const now = Date.now();
        const bucketSize = period === 'hour' ? 3600000 : 86400000;
        const startTime = now - (days * 86400000);
        
        const errors = await this.byTimeRange(new Date(startTime), new Date(now));
        
        // Group into buckets
        const buckets = {};
        for (const error of errors) {
            const bucketKey = Math.floor(new Date(error.timestamp).getTime() / bucketSize) * bucketSize;
            if (!buckets[bucketKey]) {
                buckets[bucketKey] = { total: 0, bySeverity: {}, byCategory: {} };
            }
            buckets[bucketKey].total++;
            buckets[bucketKey].bySeverity[error.severity] = (buckets[bucketKey].bySeverity[error.severity] || 0) + 1;
            buckets[bucketKey].byCategory[error.category] = (buckets[bucketKey].byCategory[error.category] || 0) + 1;
        }
        
        return Object.entries(buckets)
            .map(([time, data]) => ({
                timestamp: new Date(parseInt(time)).toISOString(),
                ...data
            }))
            .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    },
    
    /**
     * Find error patterns
     */
    async findPatterns(options = {}) {
        const { days = 7, minOccurrences = 10 } = options;
        const startTime = new Date(Date.now() - days * 86400000);
        
        const errors = await this.byTimeRange(startTime, new Date());
        
        // Group by code
        const byCode = {};
        for (const error of errors) {
            if (!byCode[error.code]) {
                byCode[error.code] = {
                    code: error.code,
                    name: error.name,
                    count: 0,
                    users: new Set(),
                    times: []
                };
            }
            byCode[error.code].count++;
            byCode[error.code].users.add(error.userId);
            byCode[error.code].times.push(new Date(error.timestamp));
        }
        
        // Analyze patterns
        const patterns = [];
        for (const [code, data] of Object.entries(byCode)) {
            if (data.count < minOccurrences) continue;
            
            // Calculate time pattern
            const timePattern = this._analyzeTimePattern(data.times);
            
            patterns.push({
                code: parseInt(code),
                name: data.name,
                count: data.count,
                uniqueUsers: data.users.size,
                avgPerDay: data.count / days,
                timePattern,
                priority: this._calculatePriority(data)
            });
        }
        
        return patterns.sort((a, b) => b.priority - a.priority);
    },
    
    _analyzeTimePattern(times) {
        if (times.length < 2) return { type: 'single' };
        
        // Check for periodic pattern
        const intervals = [];
        for (let i = 1; i < times.length; i++) {
            intervals.push(times[i] - times[i-1]);
        }
        
        const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        const stdDev = Math.sqrt(
            intervals.reduce((sum, i) => sum + Math.pow(i - avgInterval, 2), 0) / intervals.length
        );
        
        if (stdDev < avgInterval * 0.2) {
            return { type: 'periodic', interval: avgInterval };
        }
        
        // Check for time-of-day pattern
        const hourCounts = new Array(24).fill(0);
        for (const time of times) {
            hourCounts[time.getHours()]++;
        }
        const peakHour = hourCounts.indexOf(Math.max(...hourCounts));
        
        return { type: 'variable', peakHour };
    },
    
    _calculatePriority(data) {
        // Higher priority for: more occurrences, more users, recent errors
        const recency = Math.max(...data.times) > Date.now() - 3600000 ? 2 : 1;
        return (data.count * Math.sqrt(data.users.size) * recency);
    }
};
```

---

## 14. QUICK REFERENCE

### 14.1 Error Code Ranges

| Range | Category | Description |
|-------|----------|-------------|
| 1000-1999 | SYSTEM | Initialization, resources, gateway |
| 2000-2999 | DATABASE | Connections, queries, integrity |
| 3000-3999 | PHYSICS | Calculations, cutting physics, thermal |
| 4000-4999 | CAD/CAM | Geometry, toolpath, features |
| 5000-5999 | VALIDATION | Input validation, manufacturing limits |
| 6000-6999 | UI/UX | Rendering, input, state |
| 7000-7999 | NETWORK | Connections, API, transfers |
| 8000-8999 | SECURITY | Authentication, authorization, data |
| 9000-9999 | LEARNING | ML models, training, feedback |

### 14.2 Severity Levels

| Level | Action | Auto-Resolution | Notification |
|-------|--------|-----------------|--------------|
| CRITICAL | Immediate fix | Attempt | PagerDuty + Slack + Email |
| HIGH | Fix soon | Attempt | Slack + Email |
| MEDIUM | Plan to fix | Attempt with fallback | Slack |
| LOW | Track | Automatic | Log only |

### 14.3 Common Resolution Patterns

| Error Type | Primary Strategy | Fallback |
|------------|------------------|----------|
| Network timeout | Retry with backoff | Offline mode |
| Auth expired | Refresh token | Re-login |
| ML failed | Use physics | Defaults |
| DB connection | Retry 5x | Read-only mode |
| Rate limited | Queue and wait | Notify user |
| Validation | Clamp/suggest | Reject input |
| Collision | Find alternative | Alert user |
| Memory | Clear cache | Restart |

### 14.4 Error Gateway Routes

```javascript
// Register all error handlers
PRISM_GATEWAY.registerRoutes({
    // Error handling routes
    'error.handle': PRISM_ERROR_HANDLER.handle,
    'error.log': PRISM_ERROR_LOGGER.log,
    'error.analyze': PRISM_ERROR_ANALYSIS.findPatterns,
    'error.metrics': PRISM_ERROR_METRICS.getSnapshot,
    
    // Recovery routes
    'recovery.retry': PRISM_RETRY_STRATEGIES.execute,
    'recovery.degrade': PRISM_DEGRADATION.degrade,
    'recovery.restore': PRISM_DEGRADATION.tryRestore,
    
    // Circuit breaker routes
    'circuit.status': (name) => CIRCUIT_BREAKERS[name]?.getState(),
    'circuit.reset': (name) => CIRCUIT_BREAKERS[name]?.reset()
});
```

### 14.5 Creating New Errors

```javascript
// Template for adding new error codes
const NEW_ERROR_TEMPLATE = {
    [CODE]: {
        name: 'ERROR_NAME',
        message: (params) => `Description with ${params.variable}`,
        severity: 'LOW|MEDIUM|HIGH|CRITICAL',
        recoverable: true|false,
        userFacing: true|false,
        retryStrategy: {
            maxAttempts: 3,
            baseDelay: 1000,
            backoff: 'exponential'
        },
        resolution: async (context) => {
            // Automatic resolution logic
            return { success: true, result: {} };
        },
        suggestions: [
            'User-friendly suggestion 1',
            'User-friendly suggestion 2'
        ]
    }
};
```

---

*PRISM Error Catalog v1.0 - Complete error handling reference for PRISM Manufacturing Intelligence*
