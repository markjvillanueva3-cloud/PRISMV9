# F1-F8 Implementation Plan — COMPLETED 2026-02-13
> ✅ ALL 8 FEATURES BUILT, RALPH-VALIDATED, SYNERGIZED
> 32 dispatchers | 382+ actions | 73 engines | 5.6MB build

## COMPLETION STATUS
| Feature | Engine | Dispatcher | Grade | Ω | Lines |
|---------|--------|------------|-------|------|-------|
| F1 PFP | PFPEngine.ts | prism_pfp (6) | A- | ~0.89 | 765 |
| F2 Memory Graph | MemoryGraphEngine.ts | prism_memory (6) | A- | 0.91 | 651 |
| F3 Telemetry | TelemetryEngine.ts | prism_telemetry (7) | A- | ~0.90 | 615 |
| F4 Certificates | CertificateEngine.ts | (auto via hooks) | A | 0.917 | 726 |
| F5 Multi-Tenant | MultiTenantEngine.ts | prism_tenant (15) | A- | 0.898 | 848 |
| F6 NL Hooks | NLHookEngine.ts | prism_nl_hook (8) | A- | ~0.91 | 1231 |
| F7 Protocol Bridge | ProtocolBridgeEngine.ts | prism_bridge (13) | A- | 0.892 | 719 |
| F8 Compliance | ComplianceEngine.ts | prism_compliance (8) | A- | 0.912 | 1027 |
| **Synergy** | synergyIntegration.ts | (cross-feature) | — | — | 276 |
| **TOTAL** | | | | | **~6,858** |

## SYNERGY INTEGRATIONS
- F8 Compliance cadence fires every 25 calls via autoHookWrapper
- F4 auto-signs compliance audit results
- Cross-engine health check piggybacks on telemetry cadence (every 15 calls)
- F1 PFP registers F5/F7/F8 dispatchers at startup for risk monitoring
- F5↔F2 tenant-scoped memory namespacing
- F5↔F7 tenant-scoped API keys

---
## ORIGINAL PLAN (retained for reference)

# F1-F8 Implementation Plan — Mapping to Current MCP Architecture
> Based on analysis of src/index.ts, autoHookWrapper.ts, cadenceExecutor.ts, 24 dispatchers

## ARCHITECTURE INSIGHT — WHY THIS IS ACTUALLY CLEAN

The existing `autoHookWrapper.ts` proxy pattern in `index.ts` (lines 125-155) already
wraps EVERY `prism_*` dispatcher with before/after hooks, cadence enforcement, and error
capture. This is the PERFECT integration point for F1, F3, and F4:

```
Request → TenantRouter(F5) → PFP PreFilter(F1) → AutoHookWrapper(existing) 
  → InstrumentationWrapper(F3) → Dispatcher → PostHooks → Certificate(F4)
  → MemoryGraph capture(F2) → Response
```

The wrapper proxy just needs additional layers. No refactoring needed.

---

## PHASE 1: Foundation (F3 Telemetry + F1 PFP) — Week 1-2

### F3: Dispatcher Telemetry & Self-Optimization

**New Files:**
| File | Purpose | Est. Lines |
|------|---------|-----------|
| `src/engines/TelemetryEngine.ts` | Ring buffers, MetricsAggregator, AnomalyDetector | ~600 |
| `src/tools/dispatchers/telemetryDispatcher.ts` | prism_telemetry (7 actions) | ~200 |
| `src/types/telemetry-types.ts` | TelemetryRecord, DispatcherMetrics, AnomalyAlert, etc. | ~100 |

**Modified Files:**
| File | Change | Impact |
|------|--------|--------|
| `src/tools/autoHookWrapper.ts` | Add InstrumentationWrapper around every dispatch | ~50 lines added |
| `src/tools/cadenceExecutor.ts` | Add autoTelemetrySnapshot cadence function | ~30 lines |
| `src/index.ts` | Import + register telemetryDispatcher (#25) | ~5 lines |

**Integration Point:** Inside `wrapWithUniversalHooks()` — add timing + outcome recording
to ring buffer. Already wraps all 24 dispatchers. Zero per-dispatcher changes needed.

**State Directory:** `C:\PRISM\state\telemetry\` (config.json, metrics_snapshot.json)

---

### F1: Predictive Failure Prevention

**New Files:**
| File | Purpose | Est. Lines |
|------|---------|-----------|
| `src/engines/PredictiveFailureEngine.ts` | History, PatternExtractor, RiskScorer | ~500 |
| `src/tools/dispatchers/pfpDispatcher.ts` | prism_pfp (6 actions) | ~180 |
| `src/types/pfp-types.ts` | ActionRecord, FailurePattern, RiskAssessment | ~80 |

**Modified Files:**
| File | Change | Impact |
|------|--------|--------|
| `src/tools/autoHookWrapper.ts` | Add PFP pre-filter BEFORE dispatch | ~40 lines |
| `src/tools/cadenceExecutor.ts` | Add autoPatternExtract cadence | ~25 lines |
| `src/index.ts` | Import + register pfpDispatcher (#26) | ~5 lines |

**Integration Point:** In `proxiedTool()` function (index.ts:125) — PFP check runs
before the handler. If RED risk and >50ms, bypass to hooks directly.

**State Directory:** `C:\PRISM\state\pfp\` (history.jsonl, patterns.json, config.json)

---

## PHASE 2: Intelligence (F2 Memory Graph + F4 Certificates) — Week 3-4

### F2: Cross-Session Memory Graph

**New Files:**
| File | Purpose | Est. Lines |
|------|---------|-----------|
| `src/engines/MemoryGraphEngine.ts` | GraphWriteQueue, nodes/edges/index, WAL, queries | ~700 |
| `src/tools/dispatchers/memoryDispatcher.ts` | prism_memory (6 actions) | ~200 |
| `src/types/graph-types.ts` | GraphNode (discriminated union), GraphEdge, GraphIndex | ~120 |

**Modified Files:**
| File | Change | Impact |
|------|--------|--------|
| `src/tools/autoHookWrapper.ts` | Capture decision/outcome nodes after each dispatch | ~30 lines |
| `src/tools/cadenceExecutor.ts` | Add autoGraphIntegrity cadence (every 50 calls) | ~40 lines |
| `src/index.ts` | Import + register memoryDispatcher (#27) | ~5 lines |

**State Directory:** `C:\PRISM\state\memory_graph\` (nodes.jsonl, edges.jsonl, index.json, wal.jsonl)

---

### F4: Formal Verification Certificates

**New Files:**
| File | Purpose | Est. Lines |
|------|---------|-----------|
| `src/engines/CertificateEngine.ts` | Ed25519 signing, canonicalization, cert store | ~450 |
| `src/types/certificate-types.ts` | VerificationCertificate, ValidationStep, CertSignature | ~80 |

**Modified Files:**
| File | Change | Impact |
|------|--------|--------|
| `src/tools/autoHookWrapper.ts` | Generate certificate after successful validation chains | ~35 lines |
| `src/engines/HookExecutor.ts` | Export validation step results for certificate capture | ~15 lines |
| `src/index.ts` | Import CertificateEngine, init on startup | ~10 lines |

**No new dispatcher** — certificates are generated automatically by the hook wrapper.
Query certs via existing prism_doc dispatcher (add cert query actions) or new sub-actions.

**State Directory:** `C:\PRISM\state\certificates\` (certs/, keys/, cert_index.json)

---

## PHASE 3: Access & Authoring (F7 Protocol Bridge + F6 NL Hooks) — Week 5-6

### F7: Protocol Bridge

**New Files:**
| File | Purpose | Est. Lines |
|------|---------|-----------|
| `src/transports/RestAdapter.ts` | Express routes + OpenAPI schema gen | ~400 |
| `src/transports/GrpcAdapter.ts` | gRPC proto gen + server | ~350 |
| `src/transports/GraphqlAdapter.ts` | SDL gen + resolver | ~350 |
| `src/transports/WebSocketAdapter.ts` | WS server + connection mgmt | ~250 |
| `src/transports/AuthNormalizer.ts` | Protocol-specific auth → canonical | ~150 |
| `src/transports/ProtocolRouter.ts` | Unified request normalization | ~200 |
| `src/types/protocol-types.ts` | UnifiedActionRequest/Response, AuthContext | ~100 |

**Modified Files:**
| File | Change | Impact |
|------|--------|--------|
| `src/index.ts` | Add protocol bridge startup alongside existing stdio/HTTP | ~30 lines |

**Note:** index.ts already has `runHTTP()` with Express. REST adapter extends this.
gRPC/GraphQL/WS are additional transports. MCP native always available as fallback.

---

### F6: Natural Language Hook Authoring

**New Files:**
| File | Purpose | Est. Lines |
|------|---------|-----------|
| `src/engines/NLHookCompiler.ts` | Parser, template matching, code gen, sandbox | ~600 |
| `src/tools/dispatchers/nlHookDispatcher.ts` | prism_nl_hooks (5 actions) | ~180 |
| `src/data/hookTemplates.ts` | 30+ pre-validated hook templates | ~300 |
| `src/types/nl-hook-types.ts` | HookSpec, SandboxResult, etc. | ~80 |

**Modified Files:**
| File | Change | Impact |
|------|--------|--------|
| `src/hooks/hookRegistration.ts` | Add shadow registry + atomic swap support | ~50 lines |
| `src/engines/HookEngine.ts` | Add auto-rollback monitoring for new hooks | ~30 lines |
| `src/index.ts` | Import + register nlHookDispatcher (#28) | ~5 lines |

---

## PHASE 4: Enterprise (F5 Multi-Tenant + F8 Compliance) — Week 7-8

### F5: Multi-Tenant Isolation

**New Files:**
| File | Purpose | Est. Lines |
|------|---------|-----------|
| `src/engines/TenantEngine.ts` | TenantRouter, Namespace, ResourceLimiter, SLB | ~700 |
| `src/types/tenant-types.ts` | TenantContext, TenantConfig, ResourceLimits, SLB types | ~100 |

**Modified Files:**
| File | Change | Impact |
|------|--------|--------|
| `src/index.ts` | TenantRouter wraps the proxiedTool function | ~40 lines |
| `src/tools/autoHookWrapper.ts` | Pass TenantContext through to all operations | ~20 lines |
| `src/utils/fileSystem.ts` | Add FileAccessGuard for namespace enforcement | ~60 lines |

**THIS IS THE MOST INVASIVE CHANGE.** TenantRouter must sit at the very top of the
request pipeline, before autoHookWrapper. Every file operation needs namespace prefixing.
Recommend: build with tenant_id='default' that behaves identically to current system.

---

### F8: Compliance-as-Code

**New Files:**
| File | Purpose | Est. Lines |
|------|---------|-----------|
| `src/engines/ComplianceEngine.ts` | TemplateLibrary, Deployer, Auditor | ~500 |
| `src/tools/dispatchers/complianceDispatcher.ts` | prism_compliance (6 actions) | ~180 |
| `src/data/complianceTemplates/` | 6 framework templates (ISO, AS9100, ITAR, etc.) | ~600 total |
| `src/types/compliance-types.ts` | ComplianceTemplate, Requirement, Status, Violation | ~100 |

**Modified Files:**
| File | Change | Impact |
|------|--------|--------|
| `src/tools/cadenceExecutor.ts` | Add autoComplianceAudit cadence (every 25 calls) | ~40 lines |
| `src/index.ts` | Import + register complianceDispatcher (#29) | ~5 lines |

---

## SUMMARY: Total New Code

| Category | Files | Est. Lines |
|----------|-------|-----------|
| New engines | 8 | ~4,500 |
| New dispatchers | 5 | ~940 |
| New types | 7 | ~660 |
| New templates/data | 2 | ~900 |
| New transports (F7) | 6 | ~1,800 |
| Modified existing | ~10 files | ~500 lines changed |
| **TOTAL** | **28 new + 10 modified** | **~9,300 new lines** |

## IMPLEMENTATION ORDER (dependency-respecting)

```
Week 1: F3 Telemetry (foundation — instruments everything)
         └─ Wraps autoHookWrapper, all dispatchers get free telemetry
         
Week 2: F1 PFP (uses F3 telemetry data)
         └─ Pre-filter in proxiedTool, uses telemetry history
         
Week 3: F2 Memory Graph (captures decision/outcome from dispatches)
         └─ Post-dispatch capture in autoHookWrapper
         
Week 4: F4 Certificates (signs validation results)
         └─ Post-hook certificate generation

Week 5: F7 Protocol Bridge (new transport layer)
         └─ Parallel to existing stdio/HTTP, independent
         
Week 6: F6 NL Hooks (uses F4 for certified hooks)
         └─ Template library + sandbox + hook deployment
         
Week 7: F5 Multi-Tenant (wraps everything)
         └─ TenantRouter at top of pipeline, namespace isolation
         
Week 8: F8 Compliance (uses F4 certs + F6 hooks)
         └─ Templates deploy hooks, auditor cadence function
```

## KEY EXISTING INTEGRATION POINTS

1. **autoHookWrapper.ts** (line ~125 proxy) — F1 pre-filter, F3 instrumentation, F4 post-cert
2. **cadenceExecutor.ts** (25 auto-functions) — F2 integrity, F3 snapshot, F8 audit
3. **index.ts registerTools()** — new dispatcher registration
4. **index.ts proxiedTool()** — F5 tenant routing wraps this
5. **hookRegistration.ts** — F6 shadow registry + atomic swap
6. **index.ts runHTTP()** — F7 extends existing Express app

## BUILD COMMAND
```bash
cd C:\PRISM\mcp-server && npm run build
```
Never use tsc directly (OOM). esbuild handles everything.
