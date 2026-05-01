# PHASE R4: ENTERPRISE + API LAYER    v14.2 (STUB    expand via Brainstorm-to-Ship at phase start)
### RECOMMENDED_SKILLS: prism-hook-system, prism-design-patterns, prism-codebase-packaging
### HOOKS_EXPECTED: DISPATCH, FILE, STATE, AGENT, ORCH, BATCH
### DATA_PATHS: C:\PRISM\mcp-server\src\dispatchers

# Status: not-started | Sessions: 3-4 | Role: Platform Engineer
# DEPENDS ON: R3 complete (intelligence actions live, formula registry integrated)
# v14.2: Expanded MS3 to include external API consumption layer (Gap 8    SA Audit Finding 10).
#   REST/GraphQL endpoints exposing PRISM intelligence to external systems.
#   F7 Bridge provides architecture. R4 exposes production API endpoints.
# v13.9: Cross-Audit Governance Hardening    artifact manifest, fault injection, test levels (XA-1,13,7).
# v13.5: ONE-SESSION-PER-TENANT architecture mandated (SL-2    prevents compaction data leakage).
#         API versioning strategy required (AG-8    R5 builds against stable v1 API).
#         Monitoring/alerting architecture foundations (AG-5). Offline cache design (AG-1).
# v13.3: Tool anchors added (tenant, compliance, bridge, logging dispatcher calls per MS).
#         Structured output expansion noted (material, thread, PFP schemas).
# v13.0: Data Residency (inference_geo). Compaction API for multi-tenant sessions.
#         Structured logging with fine-grained streaming. Compliance at medium effort.

---

<!-- ANCHOR: r4_quick_reference_standalone_after_compaction_no_other_doc_needed -->
## QUICK REFERENCE (standalone after compaction    no other doc needed)
```
BUILD:      npm run build (NEVER standalone tsc    OOM at current scale)
SAFETY:     S(x) >= 0.70 is HARD BLOCK
POSITION:   Update CURRENT_POSITION.md every 3 calls
FLUSH:      Write results to disk after each logical unit of work
ERROR:      Fix ONE build error, rebuild, repeat. >5 from one edit â†’ git revert
IDEMPOTENT: Read-only = safe to re-run. Write = check if already done first.
STUCK:      3 same-approach fails â†’ try different approach. 6 total â†’ skip if non-blocking.
TRANSITION: Update CURRENT_POSITION first, ROADMAP_TRACKER second.
RECOVERY:   Read PRISM_RECOVERY_CARD.md for full recovery steps.
ENV:        R4 = Claude Code 90% | Sonnet, Opus at gate. Platform Engineer.
```

---

<!-- ANCHOR: r4_knowledge_contributions_what_this_phase_feeds_into_the_hierarchical_index -->
## KNOWLEDGE CONTRIBUTIONS (what this phase feeds into the hierarchical index)
```
BRANCH 1 (Execution Chain): Multi-tenant isolation patterns, compliance dispatcher wiring.
  New action chains for tenant-scoped operations documented in CODEBASE_INDEX.
BRANCH 4 (Session Knowledge): Security architecture decisions, tenant isolation strategies,
  compliance framework selections, access control patterns.
AT PHASE GATE: CODEBASE_INDEX.json updated with tenant and compliance dispatcher chains.
```

---

<!-- ANCHOR: r4_context_bridge -->
## CONTEXT BRIDGE

WHAT THIS PHASE DOES: Build enterprise infrastructure: multi-tenant isolation, compliance-as-code templates, structured logging, API gateway hardening, data residency controls.

WHAT COMES AFTER: R5 (Visual Platform) and R6 (Production Hardening) both build on R4 infrastructure.

ARTIFACT MANIFEST (XA-1):
  REQUIRES: R2_CALC_RESULTS.md, PHASE_FINDINGS.md (R2 section)
  PRODUCES: PHASE_FINDINGS.md (R4 section), src/__tests__/tenantIsolation.test.ts,
            src/__tests__/compliance.test.ts, src/__tests__/apiGateway.test.ts

TEST LEVELS: L1-L4 required (unit + contract + integration + orchestration)

FAULT INJECTION TEST (XA-13):
  R4 FAULT TEST: Simulate tenant disconnect â†’ verify no data leakage to other tenants.
  WHEN: After multi-tenant isolation is implemented.
  HOW: Create 2 tenant sessions. Abruptly terminate tenant A. Query as tenant B.
  EXPECTED: Tenant B sees ONLY its own data. No remnants of tenant A's session.
  PASS: Complete isolation confirmed. No cross-tenant data leakage.
  FAIL: Tenant B can see any data from tenant A's session.
  EFFORT: ~8 calls.

---

<!-- ANCHOR: r4_mandatory_requirements_brainstorm_must_include_all_of_these -->
## MANDATORY REQUIREMENTS (brainstorm MUST include ALL of these)

```
1. WAL implementation uses MAINTENANCE_MODE pattern from P0-MS3 during migration
2. Graceful shutdown handler (SIGTERM/SIGINT) with WAL flush + state save + 5s timeout
3. Structured JSON logging with pino + correlationId per request
4. Version pinning verified BEFORE any npm install (Law 7 enforcement)
5. All state file writes use atomic pattern (write .tmp â†’ rename) from Code Standards
6. AbortController timeout on ALL external API calls (Code Standards)
7. Input validation with zod/joi at ALL REST API boundaries
8. Rate limiting on all public endpoints
9. Health check endpoint updated with enterprise metrics
10. ONE-SESSION-PER-TENANT ARCHITECTURE (SL-2):
    Each tenant gets its own session. NO session sharing between tenants.
    WHY: The Compaction API takes ONE set of instructions per call. If a session serves
    multiple tenants, compaction summaries may include Tenant A's proprietary data visible
    to Tenant B. This is a SECURITY BREACH for manufacturing IP (material formulations, etc.).
    TRADE-OFF: Each session has ~37K token overhead. For N tenants, overhead = N Ã— 37K.
    This is acceptable for enterprise (2-10 tenants). Not scalable to 100+ without session pooling.
11. API VERSIONING (AG-8):
    All API endpoints use version prefix: /v1/calc/speed_feed, /v1/data/material_get.
    R4 establishes v1 as the first stable API. R5 builds against v1.
    Breaking changes in future phases create v2. v1 remains supported.
    WHY: Without versioning, R5 dashboard breaks every time R3/R4/R6 changes a response shape.
12. MONITORING FOUNDATIONS (AG-5):
    Health check polling: external watchdog curls health endpoint every 60s.
    Alerting thresholds: heap > 3000MB, S(x) < 0.70 in production, error rate > 1%.
    Notification: at minimum Slack webhook or email. Full alerting stack deferred to R6.
13. OFFLINE CACHE DESIGN (AG-1):
    Design (not implement) a read-only cache of computed parameters for top 200 materials.
    Cache populated from R3 batch results. Served when Anthropic API is unavailable.
    Response includes WARNING: "cached result    not live-computed."
    Implementation in R6. Architecture must be designed in R4 so R6 has a spec to implement.
```

<!-- ANCHOR: r4_stub_objectives_expand_at_phase_start_using_phase_template_md -->
## STUB OBJECTIVES (expand at phase start using PHASE_TEMPLATE.md)

1. Multi-tenant isolation: prism_tenant with per-tenant data boundaries
2. Compliance templates: prism_compliance templates for ISO 9001, AS9100, ITAR
3. Data residency: inference_geo="us" for ITAR-controlled operations
4. Structured logging: JSON-structured logs (pino) replacing console.error
5. API gateway: prism_bridge hardened with rate limiting, auth, audit trail
6. Zero Data Retention: ZDR flag for sensitive manufacturing IP


<!-- ANCHOR: r4_milestone_assignments_apply_during_brainstorm_to_ship_expansion -->
## MILESTONE ASSIGNMENTS (apply during Brainstorm-to-Ship expansion)

| MS | Role | Model | Effort | Sessions |
|-----|------|-------|--------|----------|
| MS0: Tenant Isolation | Platform Engineer | Opus (security arch) then Sonnet (impl) | L (18 calls) | 1-2 |
| MS1: Compliance Templates | Platform Engineer | Sonnet (template creation + validation) | M (12 calls) | 1 |
| MS2: Data Residency + Auth | Platform Engineer | Opus (security model) then Sonnet (impl) | M (12 calls) | 1 |
| MS3: API Gateway + External Layer | Platform Engineer | Opus (API schema design) then Sonnet (endpoint impl) | L (15 calls) | 1-2 |
| MS4: Phase Gate | Platform Engineer | Opus (security audit + gate) | S (8 calls) | 0.5 |

**Safety Rule:** All security-related milestones (MS0, MS2) require Opus for architecture.
**Bulk Rule:** No Haiku-eligible work in R4 (all requires security judgment).

<!-- ANCHOR: r4_tool_anchors_concrete_starting_points_for_brainstorm_to_ship_expansion -->
## TOOL ANCHORS (concrete starting points for Brainstorm-to-Ship expansion)

```
THESE ARE THE KEY DISPATCHER CALLS FOR EACH FUTURE MS:

MS0    TENANT ISOLATION:
  prism_tenant action=list  [effort=low]  â†’ audit current tenant state
  prism_tenant action=create name="test_tenant_1" config='{"data_residency":"us"}'  [effort=medium]
  â†’ Verify: prism_tenant action=list  [effort=low]  â†’ new tenant appears
  prism_tenant action=verify tenant_id="[id]"  [effort=high]
  â†’ Verify: data queries from tenant_1 do NOT see data from default tenant.
  COMPACTION PER TENANT: Each tenant session uses Compaction API independently.
  Tenant-specific compaction instructions preserve THAT tenant's state only.
  CRITICAL: Cross-tenant data leakage in compaction summaries = security breach.

MS1    COMPLIANCE TEMPLATES:
  prism_compliance action=list_templates  [effort=medium]  â†’ audit existing templates
  prism_compliance action=create_template template="ISO_9001" standard="ISO 9001:2015"  [effort=medium]
  prism_compliance action=create_template template="AS9100" standard="AS9100 Rev D"  [effort=medium]
  prism_compliance action=create_template template="ITAR" standard="22 CFR 120-130"  [effort=medium]
  â†’ Verify each: prism_compliance action=check target="speed_feed 4140 turning" template="ISO_9001"  [effort=medium]
  PASS criteria: check returns compliance status with specific clause references.

MS2    DATA RESIDENCY:
  Wire inference_geo parameter into API call wrapper:
  For ITAR-controlled calcs: inference_geo="us" (1.1x pricing).
  For general operations: inference_geo="global" (standard pricing).
  Wire as configurable per-tenant setting.
  Verify: run safety calc with ITAR material â†’ confirm API call includes inference_geo="us".

MS3    API GATEWAY HARDENING + EXTERNAL API LAYER (v14.2    Gap 8):
  âš¡ CLAUDE CODE: API endpoint implementation (boilerplate routes, validation schemas,
    OpenAPI spec generation) is ideal for Claude Code code generation.
  prism_bridge action=health  [effort=low]  â†’ baseline health
  Wire: rate limiting (use p-queue), auth (API key validation), audit trail (structured logging).
  prism_bridge action=test_rate_limit  [effort=medium]  â†’ verify rate limiting works
  prism_bridge action=test_auth  [effort=medium]  â†’ verify auth rejects invalid keys

  EXTERNAL API CONSUMPTION LAYER (NEW in v14.2):
  Source: SA Audit Finding 10    no way for external systems to call PRISM without MCP.
  F7 Bridge (complete) provides REST/gRPC/GraphQL/WebSocket/MQ architecture.
  This MS exposes PRISM manufacturing intelligence through F7 as production endpoints:

    REST ENDPOINTS:
      POST /api/v1/speed-feed     â†’ speed_feed_calc with safety validation
      POST /api/v1/job-plan       â†’ job_plan with full operation sequence
      GET  /api/v1/material/:id   â†’ material_get with enriched data
      GET  /api/v1/tool/:id       â†’ tool_get from normalized index
      POST /api/v1/optimize       â†’ optimize_parameters (after R7)
      POST /api/v1/alarm-decode   â†’ alarm_decode + alarm_diagnose

    EACH ENDPOINT INCLUDES:
      Authentication: API key per tenant (from MS0 tenant isolation)
      Rate limiting: configurable per tenant per endpoint
      Response format: standard JSON with safety metadata:
        { result: {...}, safety: { score, warnings }, meta: { formula_used, uncertainty } }
      Audit logging: every call logged with correlationId
      Error handling: structured error responses with codes

    GraphQL ALTERNATIVE:
      Single endpoint: POST /api/v1/graphql
      Schema exposes: materials, machines, tools, formulas, calculations
      Enables: clients query exactly what they need (less bandwidth)

    DOCUMENTATION:
      OpenAPI/Swagger spec auto-generated from endpoint definitions
      Hosted at /api/v1/docs (Swagger UI)

  Wire through F7 Bridge (prism_bridge dispatcher).
  Test: external HTTP client calls /api/v1/speed-feed with valid API key â†’ gets result.

  NEW HOOKS:
    api_rate_limit       blocking, per-request, enforces tenant rate limits
    api_auth_validate    blocking, per-request, validates API key + tenant scope

MS4    STRUCTURED LOGGING:
  Replace all console.error with pino logger from src/utils/logger.ts.
  Add correlationId per request. Add log rotation configuration.
  prism_dev action=code_search pattern="console\.error\|console\.log" path="src/"  [effort=high]
  â†’ Replace each instance with structured logger call.

STRUCTURED OUTPUT EXPANSION (extend schemas to more return types):
  Create src/schemas/materialGetSchema.ts (for material_get 127-param responses)
  Create src/schemas/threadSpecsSchema.ts (for thread specification responses)
  Create src/schemas/pfpAnalyzeSchema.ts (for PFP prediction responses)

QUALITY GATE:
  prism_ralph action=assess target="R4 Enterprise Foundation"  [effort=max]
  prism_omega action=compute target="R4 complete"  [effort=max]
```

<!-- ANCHOR: r4_opus_4_6_patterns_for_r4 -->
## OPUS 4.6 PATTERNS FOR R4

```
DATA RESIDENCY: inference_geo parameter on API calls.
  For ITAR-controlled material calculations: inference_geo="us" (1.1x pricing).
  For general operations: inference_geo="global" (standard pricing).
  Wire as configurable per-tenant setting.

COMPACTION API FOR MULTI-TENANT: Each tenant session uses Compaction API independently.
  Tenant-specific compaction instructions preserve THAT tenant's state only.
  Prevents cross-tenant data leakage in compaction summaries.

STRUCTURED LOGGING + FINE-GRAINED STREAMING:
  Log API calls with effort level, response schema, compaction events.
  Fine-grained streaming for large audit log entries.
  Enables real-time monitoring of safety calc execution.

COMPLIANCE AT MEDIUM EFFORT: prism_compliance action=check (effort=medium)
  Compliance checks are rule-matching, not deep reasoning.
  Save MAX effort for safety calcs, not compliance template matching.

STRUCTURED OUTPUTS FOR AUDIT: All API gateway responses schema-validated.
  Audit trail entries guaranteed well-formed. No malformed log entries.
```

<!-- ANCHOR: r4_gate_requirements -->
## GATE REQUIREMENTS
Ralph >= A- | Omega >= 0.70 | Build passes | Tenant isolation verified | Data residency functional

---

<!-- ANCHOR: r4_r4_companion_assets_v14_5_built_per_ms_verified_at_r4_ms4_gate -->
## R4 COMPANION ASSETS (v14.5 -- built per-MS, verified at R4-MS4 gate)

<!-- ANCHOR: r4_per_ms_companion_schedule -->
### PER-MS COMPANION SCHEDULE:
```
MS0 PRODUCES:
  HOOK: tenant_isolation_verify (blocking, post-tenant-create, verifies no cross-tenant leakage)
  Verify: Create 2 tenants, query as tenant B -> sees ONLY its data

MS1 PRODUCES:
  SKILL: prism-compliance-guide (ISO 9001, AS9100, ITAR template usage and interpretation)
  Verify: Ask about ITAR compliance for titanium part -> skill loads with clause refs

MS2 PRODUCES:
  HOOK: api_version_check (warning, pre-deploy, verifies /v1/ prefix on all endpoints)
  SKILL: prism-tenant-management (multi-tenant patterns, data residency, session isolation)

MS3 PRODUCES:
  SKILL: prism-api-reference (auto-generated from endpoint schema, teaches API usage)
  SCRIPT: api_smoke_test (hits all endpoints, verifies auth + rate limiting)

MS4 GATE VERIFIES:
  Both hooks fire, all 3 skills load, api_smoke_test passes
  SCRIPT: tenant_health_check (verifies all tenants isolated and healthy)
```
