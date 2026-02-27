---
name: prism-error-catalog
description: |
  Comprehensive error reference. Codes 1000-9999 with causes and fixes.
---

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
