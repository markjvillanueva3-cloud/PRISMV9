# PRISM Feature Roadmap — F1-F8 ✅ ALL COMPLETE
> Source: PRISM_Feature_Roadmap.docx (Feb 2026)
> Status: **ALL 8 FEATURES COMPLETE** — Built, Ralph-validated, synergized (2026-02-13)
> 8 features, ~6,858 lines, 31 dispatchers, 368 actions, 3.9MB build
> All grades A-/A, all Ω≥0.89

## COMPLETION STATUS
| Feature | Grade | Ω | Engine | Dispatcher |
|---------|-------|------|--------|------------|
| F1 PFP | A- | ~0.89 | PFPEngine.ts (765L) | prism_pfp (6) |
| F2 Memory Graph | A- | 0.91 | MemoryGraphEngine.ts (774L) | prism_memory (6) |
| F3 Telemetry | A- | ~0.90 | TelemetryEngine.ts (615L) | prism_telemetry (7) |
| F4 Certificates | A | 0.917 | CertificateEngine.ts (620L) | (auto via hooks) |
| F5 Multi-Tenant | A- | 0.898 | MultiTenantEngine.ts (592L) | prism_tenant (15) |
| F6 NL Hooks | A- | ~0.91 | NLHookEngine.ts (920L) | prism_nl_hook (8) |
| F7 Protocol Bridge | A- | 0.892 | ProtocolBridgeEngine.ts (484L) | prism_bridge (13) |
| F8 Compliance | A- | 0.912 | ComplianceEngine.ts (722L) | prism_compliance (8) |
| Synergy | — | — | synergyIntegration.ts (276L) | (cross-feature) |

---
## ORIGINAL PLANNING (retained for reference)

## Build Order & Dependency Phases

### Phase FA — Foundation (Weeks 1-8) ← **START HERE**

**F3: Dispatcher Telemetry & Self-Optimization** | HIGH | 5-7 wk | No deps
- InstrumentationWrapper: transparent proxy, <1ms overhead, lock-free ring buffers
- MetricsAggregator: 1m/5m/1h/24h windows, p50/p95/p99 latency, error rate, throughput
- AnomalyDetector: 2σ deviation alerts (LATENCY_SPIKE, ERROR_RATE_INCREASE, THROUGHPUT_DROP, TOKEN_CONSUMPTION_SURGE)
- RouteOptimizer: EWMA scoring, dampened weight changes (max 15% per cycle), stability penalty
- TelemetryAPI: new prism_telemetry dispatcher
- 🛑 CRITICAL: Metrics snapshot corruption → fault-tolerant init (empty metrics on failure)
- ⚠️ Risks: overhead at high throughput (ring buffers), false positives low traffic (min 5 calls), oscillation (dampening), token estimation (calibration action)

**F1: Predictive Failure Prevention (PFP)** | HIGH | 6-8 wk | No deps
- ActionHistoryStore: JSONL append-only at state/pfp/action_history.jsonl
- PatternExtractor: parameter patterns (chi-squared), sequence patterns (prefix tree 3-7 window), resource patterns (quartile bins)
- RiskScorer: 0.0-1.0, exponential decay (half-life 100 actions), in-memory pattern cache
- DecisionGate: GREEN(<0.30) pass | YELLOW(0.30-0.65) checkpoint+pass | RED(≥0.65) block+recommend
- RecommendationEngine: alternate params, different routing, prerequisite actions
- 🛑 CRITICAL: Risk scorer latency → in-memory cache, <5ms target, bypass at >50ms
- ⚠️ Risks: corruption (write queue + CRC32), overfitting (min 10 samples, confidence intervals), feedback loop (blocked≠failed), memory growth (50K rolling compaction)

### Phase FB — Core Differentiators (Weeks 5-18)

**F4: Formal Verification Certificates** | CRITICAL | 8-10 wk | Needs F3
- Ed25519 signed tamper-evident JSON certificates
- VCE: input/output SHA-256, validation chain from hooks, quality scores (S(x), Ω, evidence, PFP risk), telemetry snapshot, environment hashes
- Async issuance (<50ms), background queue, batch-sign at 100+
- Revocation: signed entries in revocations.jsonl
- Standalone verification CLI + web verifier
- Key rotation: old key signs endorsement of new public key
- 🛑 CRITICAL: Private key exposure → 0400 permissions, DPAPI on Windows, never log/export
- ⚠️ Risks: canonicalization (RFC 8785 strict), issuance latency (async), clock drift (NTP check), hash collision (SHA-3-256 option)

**F2: Cross-Session Memory Graph** | HIGH | 8-12 wk | Needs F1
- DAG: 5 node types (Decision/Outcome/Pattern/Milestone/Context), 6 edge types (CAUSED_BY/FOLLOWED_BY/SIMILAR_TO/RESOLVED_BY/PATTERN_MATCH/CONTEXT_AT)
- Storage: nodes.jsonl + edges.jsonl + index.json (periodic rebuild)
- prism_memory dispatcher: trace_decision, find_similar, impact_analysis, root_cause, session_summary, pattern_effectiveness
- Index rebuild: cadence auto-function every 50 calls, in-memory live updates
- 🛑 CRITICAL: Node writes during compaction → compaction-aware component, flush+sync
- ⚠️ Risks: SIMILAR_TO O(n²) (limit 10 recent), index corruption (atomic rename), cycles (visited set), memory (100 bytes/node)

**F7: Protocol Bridge (REST/gRPC/GraphQL/MQ/WS)** | CRITICAL | 10-14 wk | No deps
- REST: OpenAPI 3.0 auto-gen from dispatcher schemas
- gRPC: proto auto-gen, unary + server-streaming
- GraphQL: SDL auto-gen, queries/mutations/subscriptions
- Kafka/RabbitMQ: ordered + parallel modes, dead-letter queues, reorder buffer
- WebSocket: bidirectional streaming, ping/pong heartbeat (30s)
- UnifiedActionRequest normalization, AuthNormalizer (INTERSECTION of permissions)
- 🛑 CRITICAL: REST path traversal → strict allowlist regex, gRPC deser → size limits + try/catch
- ⚠️ Risks: MQ ordering, WebSocket leak (3 missed pongs → force close), auth inconsistency, schema drift (hot-reload hooks)

### Phase FC — Market Expansion (Weeks 14-28)

**F6: Natural Language Hook Authoring** | HIGH | 6-9 wk | Needs F4
- HookSpecParser: NL → structured HookSpec (trigger, conditions, action, targets)
- HookCompiler: template library first (threshold/regex/enum/compound/range/presence), LLM only for complex
- HookValidator: static analysis (no imports/FS/network/eval, 100ms timeout, type check)
- HookSandbox: boundary value testing derived from spec
- HookDeployer: atomic shadow registry swap, auto-rollback after 10 errors
- 🛑 CRITICAL: LLM code injection → multi-layer defense, human approval for LLM-generated
- ⚠️ Risks: evidence level ordering (ordinal maps), NL ambiguity (CLARIFICATION_NEEDED), hot-reload race (shadow registry), sandbox gaps (custom test cases)

**F8: Compliance-as-Code Templates** | HIGH | 8-12 wk | Needs F4, F6
- Templates: ISO 13485, AS9100, ITAR, SOC 2, HIPAA, FDA 21 CFR Part 11
- Auto-deploy: hooks (via F6), quality gates, audit trails, certificate params (via F4), access controls
- Compliance Auditor: cadence auto-function every 25 calls
- prism_compliance dispatcher
- Conflict resolution: MAX(numeric), TRUE(boolean), INTERSECT(permissions)
- 🛑 CRITICAL: Template accuracy → DISCLAIMER, expert review, regulatory_reference per requirement
- ⚠️ Risks: multi-template conflicts, compliance drift (tagged hooks), audit log compaction (EXCLUDED)

**F5: Multi-Tenant Isolation w/ Shared Learning** | MEDIUM | 10-14 wk | Needs F2
- Tenant namespace: state/{tenant_id}/ for all paths
- Per-tenant dispatcher registries, execution isolation
- Shared Learning Bus: anonymized pub/sub, 0.5x external weight, local confirmation for promotion
- Governance: opt-out publish, opt-out entirely, pattern type filtering
- 🛑 CRITICAL: Tenant data leakage → AnonymizationFilter, tenant ID injection → frozen context
- ⚠️ Risks: resource starvation (per-tenant limits), SLB poisoning (quarantine), deletion (2-phase)

## Bug Risk Summary
| Severity | Count | Top Risks |
|----------|-------|-----------|
| CRITICAL | 7 | Private key exposure (F4), tenant data leakage (F5), tenant ID injection (F5), REST path traversal (F7), gRPC deser (F7), LLM code injection (F6), template accuracy (F8) |
| HIGH | 18 | Feedback loop (F1), graph cycles (F2), compaction writes (F2), risk scorer latency (F1), routing oscillation (F3), canonicalization (F4), auth inconsistency (F7), compliance drift (F8), audit compaction (F8) |
| MEDIUM | 12 | History corruption (F1), overfitting (F1), memory growth (F1), index corruption (F2), SIMILAR_TO explosion (F2), low-traffic false pos (F3), token estimation (F3), clock drift (F4), schema drift (F7), template conflicts (F8), NL ambiguity (F6), WS leaks (F7) |

## Timeline (2 Engineers Parallel)
| Weeks | Engineer 1 (Systems) | Engineer 2 (Security/Enterprise) |
|-------|---------------------|----------------------------------|
| 1-4 | F3: Telemetry | F1: PFP |
| 5-8 | F3: Self-optimization + F7: REST | F1: Recommendations + F4: Key mgmt |
| 9-12 | F7: gRPC + GraphQL | F4: Signing/revocation + F2: Graph store |
| 13-16 | F7: MQ + WS + F2: Query engine | F6: NL Hooks (parser/compiler/validator) |
| 17-20 | F5: Multi-Tenant isolation | F6: LLM compiler + F8: ISO/AS9100 |
| 21-24 | F5: Shared Learning Bus | F8: ITAR/SOC2/HIPAA/21CFR11 |
| 25-28 | Integration + Performance | Security audit + Penetration testing |
