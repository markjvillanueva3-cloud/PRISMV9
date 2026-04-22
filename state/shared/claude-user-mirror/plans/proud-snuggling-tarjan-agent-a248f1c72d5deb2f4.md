# ROUND 2 SCRUTINY — PRISM INFRA ROADMAP
## 5 New Specialist Roles (Roles 36-40)

**Assessment Date:** 2026-04-01  
**Round 1 Average:** 46.4/100  
**Round 2 Scope:** Financial, Legal, Customer Success, Hardware/Edge, QA/ISO

---

## ROLE 36: FINANCIAL CONTROLLER / CFO
**Score: 28/100** — CRITICAL findings across all financial dimensions

### Infrastructure Cost Analysis

#### CRITICAL Finding 1: No Cost Breakdown by Component
The roadmap lists effort units (40-80 hours each) but provides **zero cost estimation** for:
- **PostgreSQL infrastructure:** No per-unit storage cost, backup frequency, replication cost, or cloud provider pricing (AWS RDS, Azure Database, GCP Cloud SQL)
- **Redis infrastructure:** No per-node cost, persistence overhead (RDB snapshots), or HA cost (Redis Sentinel/Cluster adds 2-3x cost)
- **Kubernetes:** Phase 8 (U-DEP2) says "Create K8s manifests" but no:
  - Cluster provisioning cost (AWS EKS: $0.10/hr base + node costs $0.01-0.10/hr each)
  - Ingress controller cost
  - Persistent volume cost (EBS: $0.10/GB/month)
  - Network egress cost (critical for OPC-UA streams)
- **Observability stack:** Prometheus + Grafana + OpenTelemetry SDKs add:
  - Storage cost (time-series data: 1-2KB per metric per hour = 9-18GB/month for 1000 metrics)
  - No mention of cost limits or sampling strategy

**Impact:** Cannot determine if roadmap is $1K/month or $50K/month. Phase 5-10 may be unaffordable.

---

#### CRITICAL Finding 2: No Per-Shop Cost Model
The plan says "After P1-2, what can I show a customer?" but roadmap is **centralized SaaS only**, not per-shop deployment:
- **No on-premise option costed** — Phase 39 (Hardware/Edge Engineer) asks "Can PRISM run on-premise?" but this isn't in the cost model at all
- **No multi-tenant isolation cost** — If shops share one Postgres instance, how is data isolation enforced? Row-level security (RLS) in Postgres adds 5-10% query overhead
- **No per-shop billing mechanism** — The API endpoints don't track which shop is calling; tier enforcement (Phase 3, U-AUTH2) counts globally, not per-shop
- **No revenue unlock timeline** — Which phases generate 0→1→10→100 paying customers?

**Impact:** Cannot pitch to investors. Cannot determine break-even point.

---

#### HIGH Finding 3: No Phase Prioritization by ROI
The dependency graph says P1 is critical path, but:
- **Phase 1 (DB foundation):** Cost to execute: ~10 effort units × $200/unit = $2K development. Revenue unlock: **$0** (no customer-facing feature)
- **Phase 2 (Search):** Cost: ~15 effort units = $3K. Revenue unlock: Semantic search is nice-to-have, not "aha moment" (see Role 38)
- **Phase 5 (Feedback loop / Calibration):** Cost: ~21 effort units = $4.2K. Revenue unlock: **$50K+** if this is what customers pay for
- **Phases 3-4, 6-7-10:** Multiple phases with moderate cost but unclear revenue impact

**Recommendation:** Reorder phases by ROI/effort ratio, not topological dependency. Phase 5 should be Phase 2.

---

#### HIGH Finding 4: Operating Burn Rate Unspecified
The roadmap says "10 Phases | 20 Sessions | ~48 Units" but:
- No calendar dates (assumes "sometime in 2026" or later?)
- No parallelization benefit calculated — Phase 2-5,7,10 run in parallel (6 terminals), but no reduction in total calendar time or cost savings from parallelism
- No full-time vs. part-time staffing model — Are these 48 units 48 weeks at 1 engineer, or 2 engineers for 6 weeks?
- **BullMQ job queue (Phase 4)** requires a separate worker pool — adds ~2 more servers (dev + prod) = extra $200-500/month

**Impact:** Cannot forecast cash needs. Cannot adjust team size.

---

#### MEDIUM Finding 5: SaaS Pricing Tier Enforcement Missing
Phase 3 (U-AUTH2) says "Persist rate limit buckets to Redis" but:
- No tier definitions (Free/Pro/Enterprise?) or limits
- No pricing per tier or per-customer cost
- Tier gating exists (tierGate.ts:194) but is **currently broken** — counters never incremented
- **Revenue leakage:** If tiers aren't enforced, all customers get unlimited access = $0 revenue

**Recommendation:** Define tiers, costs, and enforcement before Phase 8 shipping.

---

#### MEDIUM Finding 6: No SLA Cost
The roadmap specifies latency SLAs:
- Query latency <200ms p95 (Phase 2, U-VEC3)
- ONNX inference <100ms p95 (Phase 9, U-ML1)
- But no SLA penalties, uptime commitment, or cost to achieve them (e.g., read replicas, CDN, GPU acceleration)

---

## ROLE 37: LEGAL / IP ATTORNEY
**Score: 22/100** — CRITICAL IP and licensing exposure

### Embedding Models & Open-Source Licenses

#### CRITICAL Finding 1: Embedding Model License Undefined
Phase 2 (U-VEC2) specifies:
> "Build embedding pipeline using `sentence-transformers/all-mpnet-base-v2` (768 dims, ~50ms/embed)"

**Status:** NOT in package.json. Current dependencies: `dotenv`, `express`, `zod`, `@anthropic-ai/sdk` — no `sentence-transformers` or ONNX runtime.

**License Risk:**
- `sentence-transformers` is **Apache 2.0** (compatible with PROPRIETARY)
- But underlying model (`all-mpnet-base-v2`) is from **Hugging Face Hub**
- Hugging Face models are typically **CC-BY-4.0** or MIT, BUT:
  - Model weights are not source code — legal status ambiguous
  - Commercial use may require training data attribution
  - No formal license agreement for model distribution
- **Worse:** If you fine-tune the model (Phase 2 doesn't plan this, but Phase 9 ML retraining might) — ownership of improved weights is unclear

**Impact:** Cannot ship semantic search without clearing model licensing with legal.

---

#### CRITICAL Finding 2: Training Data Ownership — Tribal Knowledge Tips
Phase 5 (U-CAL2 + U-KG2) says:
> "When a machinist confirms 'this tool + material + machine combo works', persist the edge with outcome data."

**Who owns the IP in that machinist's tribal knowledge?**

Current state:
- 3,700+ tribal tips in `data/` (hardcoded in TypeScript)
- Tips are structured: `{ id, title, tags, body, source }`
- Phase 10 (U-KG2) adds: "operator-confirmed setups persist" — creating a **knowledge graph of shop-specific learnings**

**Legal exposure:**
1. **If machinist A generates tip "how to machine titanium on machine X" via feedback loop** → Who owns this IP?
   - Shop owns it? PRISM owns it? The machinist owns it?
   - License says "PROPRIETARY" but proprietary *to whom*?
2. **If PRISM later sells this knowledge to competitor shop B** → Shop A can sue
3. **No terms of service** mentioning that operator feedback becomes training data for other customers
4. **GDPR/privacy:** Storing cycle times, tool life, and material combinations = manufacturing process secrets

**Recommendation:** Define "operator contribution" vs. "PRISM intellectual property" in ToS before Phase 5 ships.

---

#### HIGH Finding 3: Open-Source License Compatibility Matrix Missing
Roadmap dependencies NOT checked for license compatibility:

| Dependency | License | Current? | Phase | Risk |
|---|---|---|---|---|
| `pg` (PostgreSQL client) | MIT | NOT in package.json | Phase 1 (U-DB1) | **BLOCKER:** Need to add to deps + verify with legal |
| `ioredis` | MIT | NOT in package.json | Phase 3 (U-AUTH1) | OK compatibility-wise, but needs licensing review |
| `BullMQ` | MIT | NOT in package.json | Phase 4 (U-QUEUE1) | OK but clarify if it's `bullmq` or `bull` package |
| `@opentelemetry/*` | Apache 2.0 | NOT listed | Phase 6 (U-OBS1) | Compatible but requires review |
| `onnxruntime-node` | MIT | NOT in package.json | Phase 9 (U-ML1) | **Research:** Does ONNX runtime have patent issues for inference? |
| `zod-to-json-schema` | MIT | Already in deps ✓ | Phase 7 (U-API1) | Good |
| Existing: `@anthropic-ai/sdk` | Apache 2.0 | In deps ✓ | N/A | OK |
| Existing: `express` | MIT | In deps ✓ | N/A | OK |

**Impact:** Cannot add Phase 1-9 dependencies without legal sign-off on license compatibility.

---

#### HIGH Finding 4: Third-Party Plugin SDK Licensing Undefined
Phase 7 (U-PLG1, U-PLG2) adds a **plugin system** for CAM vendors and integrators:
> "Create plugin manifest format (JSON schema). Define plugin lifecycle (register → validate → activate → deactivate)."

**Questions for legal:**
1. Can a third-party plugin use commercial libraries (e.g., MATLAB Runtime, proprietary solver)?
2. If a plugin contains proprietary code, how is it distributed? (Docker image? npm package with proprietary tarball?)
3. If a plugin fails and corrupts a job, is PRISM liable? Is the plugin author liable?
4. Can PRISM inspect/audit plugin source code before activation?

**Current state:** CAMPluginSDKEngine.ts (lines 14-80) is just inline physics constants — no plugin system exists.

---

#### MEDIUM Finding 5: Data Provenance for Physics Constants
Phase 5 (U-CAL2) creates `prediction_outcomes` table with `measurement_type, material_key, machine_id, validated_at`.
Phase 9 (U-ML2) adds feature lineage: "Build training data export (Parquet format)."

**Legal question:** If PRISM's ML model is trained on customer production data, do customers own a stake in the model?

Example:
- Shop A provides 1,000 cycle-time measurements
- Shop B provides 500
- PRISM trains model on all 1,500
- Model is sold to Shop C
- Does Shop A get attribution? Royalty? Ability to opt-out?

**Current state:** Zero opt-out mechanism. Phase 9 doesn't address data ownership.

---

#### MEDIUM Finding 6: FLSA / Intellectual Property of Tool Designs
ToolRegistry has 95,608 tools with geometry, speeds, feeds:
- Some from manufacturers (open data)
- Some reverse-engineered by PRISM
- Some from tribal knowledge

**Risk:** If PRISM publishes speeds/feeds for patented cutting geometry (e.g., Kennametal's TiN coating formula), does PRISM infringe?

---

## ROLE 38: CUSTOMER SUCCESS MANAGER
**Score: 31/100** — Roadmap doesn't address customer adoption pathway

### Customer Value & "Aha Moments"

#### CRITICAL Finding 1: No Customer-Visible Features Until Phase 8 (6+ months)
The roadmap timeline:
- **Phase 1-2:** Database + semantic search (internal plumbing)
- **Phase 3-4:** Auth + job queue (internal plumbing)
- **Phase 5:** Calibration wiring (technical foundation)
- **Phase 6-7:** Observability + API (still internal-facing or dev-facing)
- **Phase 8:** Docker + K8s (infrastructure; still not customer-visible)
- **Phase 9-10:** ML models + knowledge graph (foundational, not customer feature)

**Where is the UI feature?**
- Web app exists (`mcp-server/web/src/`, 45 pages, "partially wired")
- But roadmap has **zero units** dedicated to wiring pages to Phase 1-10 infrastructure
- **Action needed:** "Show me semantic search results" requires:
  1. Phase 2 search engine (done by U-VEC3, ~week 10-14)
  2. Web UI form + results page (NOT in roadmap)
  3. Authentication UI (Phase 3, done by week 6-8, but no web wiring)
  4. Machine selection + material selection dropdowns (Phase 1 data + Phase 7 API, but no UI)

**Impact:** Customer sees nothing for 6 months. Revenue = $0 until Phase 8+ shipping.

---

#### HIGH Finding 2: Semantic Search "Aha Moment" Unclear
The plan says:
> "What's the 'aha moment' for a machinist using semantic search?"

**Current implementation:**
- TribalKnowledgeEngine.search() does String.includes() on 3,700 tips
- Phase 2 (U-VEC3) replaces this with hybrid vector + trigram search
- Example query: "carbide endmill for titanium roughing"

**Problem 1: No baseline to beat**
- Current String.includes() search for "carbide endmill titanium" probably returns tips with all three keywords
- New semantic search returns tips about "carbide tools on superalloys" or "tool life in exotic metals"
- **Is this better?** Unknown. No A/B test planned. No quality metrics.

**Problem 2: Trivial use case**
- Machinists searching tribal tips is a **nice-to-have**, not a revenue driver
- **Real aha moment** would be: "PRISM predicted my tool life ±2min, saving me restart time" (Phase 9, ML model accuracy)
- Or: "Feedback loop calibrated my machine auto-speeds" (Phase 5)
- Semantic search tips? Useful but not "aha."

**Recommendation:** Measure current TribalKnowledge.search() accuracy (precision@10, recall) before Phase 2. Define success criteria.

---

#### HIGH Finding 3: Feedback Loop Value to Shop Owner Undefined
Phase 5 (U-CAL1 → U-CAL3) wires calibration feedback:
1. Collect actual cycle times, tool life, cutting forces
2. Run Bayesian update on Kienzle kc1.1, mc exponents
3. Next SpeedFeedOrchestrator uses calibrated constants

**Questions:**
- How long until calibration improves predictions? (10 measurements? 100? 1000?)
- How much does accuracy improve? (±5% → ±3%? ±2%?)
- **Which customer sees value first?** A shop with 1 machine doing 100 jobs/week? Or 10 machines doing 10 jobs/week?
- **No ROI story to customers:** "Invest time entering actuals → PRISM improves → faster cycles" — but no numbers

**Current state:**
- AdaptiveCalibrationEngine exists with 6 methods (Bayesian, Kalman, CUSUM, bootstrap, thermal, AIC/BIC)
- But it's isolated in TypeScript (no actual measurements being ingested)
- actuals ingestion endpoint (U-CAL3) is planned but no acceptance criteria for measurement quality

---

#### MEDIUM Finding 4: No Customer Success Metrics Post-Phase 1-2
After Phase 1 (DB) + Phase 2 (Search), what can CSM show to a customer?

Options:
1. **Dashboard showing search latency:** "Queries now <200ms p95" — technical, not business value
2. **Semantic search accuracy:** Needs ground truth labels (Phase 2 doesn't include labeling effort)
3. **Calibration confidence:** Requires Phase 5 + actual data; Phase 1-2 has no data

**Recommendation:** Add CSM-focused units:
- **U-CS1** (effort 30): Build customer dashboard showing:
  - Jobs completed this month
  - Avg cycle time vs. quote
  - Predicted vs. actual tool life (when available)
  - Favorite materials + machines (popularity signals)
- **U-CS2** (effort 20): Export "proof of value" report for new customers (template)

---

#### MEDIUM Finding 5: No Trial / POC Timeline
Roadmap is 10 phases, ~48 effort units, but **no plan for customer onboarding or POC**:
- Phase 8 says "docker-compose up" works, but what's the customer deployment process?
- No mention of:
  - Customer training (how to upload drawings, set parameters)
  - Data import (tool library, machine specs, materials)
  - First job walkthrough
  - Success metrics agreement

**Impact:** Even after Phase 8 (infrastructure done), customer adoption stalls on "how do I start?"

---

## ROLE 39: HARDWARE / EDGE COMPUTING ENGINEER
**Score: 26/100** — On-premise deployment completely unspecified

### On-Premise Deployment & Edge Computing

#### CRITICAL Finding 1: No On-Premise Architecture Defined
The roadmap assumes **cloud/SaaS deployment** (Postgres, Redis, K8s):
- All phases 1-8 target centralized cloud database
- No off-premise variant specified

**Customer asks:** "Can PRISM run in my shop, isolated from cloud?"

**Roadmap answer:** Phase 39 question asks "Can PRISM run on-premise on a shop floor server?" but:
- Dockerfile targets Linux/Docker (not edge, not on-premise Windows shops)
- Schema.sql assumes PostgreSQL (can't run on-premise without Postgres install)
- node-opcua is in deps, but how does it connect to shop-floor machines?

**Minimum hardware spec for on-premise:**
- Current Docker: 4GB RAM (docker-compose reservations: 1GB, limits: 4GB)
- No GPU usage (ONNX inference runs on CPU, ~100ms p95)
- CPU: 2 cores recommended (reservations: 0.5, limits: 2)
- **Storage:** Postgres + data files + model files = ?
  - Schema.sql: Basic tables, no size estimate
  - Tool registry: 95,608 tools (assume ~1KB each = 96MB)
  - Materials: 2,957 (assume ~500B each = 1.5MB)
  - Machines: 910 (assume ~2KB each = 2MB)
  - Vectors (Phase 2): 95K tools + 3,700 tips, 768-dim float32 = (95,000+3,700) × 768 × 4 bytes = ~300MB
  - **Total:** ~400MB minimum, but Postgres defaults to 10GB tablespace
  - No mention of disk I/O limits or SSD requirement

**Impact:** Cannot sell on-premise to shops without clear spec.

---

#### HIGH Finding 2: OPC-UA Integration Latency Unknown
package.json includes `node-opcua: ^2.164.2` and Dockerfile marks it as external (not bundled).

**Phase 4 (U-EVT2):** "Wire OpcUaConnectorEngine → RealtimeEventBridge → Redis Streams"
- OPC-UA client connects to shop-floor PLC
- Sends machine data → Redis Streams → SSE clients
- Back-pressure: "pause OPC-UA if consumer lag >30s"

**Missing specs:**
- **Network latency budget:** How often does OPC-UA read (10Hz? 1Hz?). What if shop network is slow?
  - Phase 4 doesn't specify polling rate or subscription strategy
- **Clock sync:** OPC-UA uses server timestamps; Redis Streams use server time; SSE clients use browser time — what's sync strategy?
- **Failover:** If Redis goes down, how long before machine data loss?
  - Phase 4 mentions "dead letter handling" but doesn't specify buffering strategy on OPC-UA side

**Recommendation:** Add OPC-UA spec:
- Polling rate (e.g., 1Hz for machine positions, 10Hz for spindle speed)
- Subscription strategy (subscription vs. polling vs. hybrid)
- Local buffering (if Redis unavailable, buffer in BullMQ queue)
- Latency SLA (e.g., <1s end-to-end from PLC to web dashboard)

---

#### HIGH Finding 3: Embedding Model & ONNX Inference — CPU-Only Unclear
Phase 2 specifies:
> "sentence-transformers/all-mpnet-base-v2 (768 dims, ~50ms/embed)"

Phase 9 specifies:
> "Add `onnxruntime-node`. ... <100ms p95 inference SLA"

**Questions:**
1. **Where runs embedding?** Server? Client? Shop-floor edge device?
   - Server: Every tool/tip search runs embedding pipeline (Phase 2, U-VEC2) — 50ms + network round-trip = slow
   - Client: Browser can't run 768-dim embeddings (too slow in JS)
   - Edge: Would need local ONNX runtime on shop PC — needs separate deployment

2. **Can ONNX run on CPU-only?**
   - Yes, `onnxruntime-node` runs on CPU
   - But no GPU acceleration option if customer wants to parallelize (e.g., 10 tool selections simultaneously)

3. **Model size:** all-mpnet-base-v2 is ~438MB
   - Docker image bloat (Dockerfile has "minimal image" claim, but +438MB is not minimal)
   - Edge deployment? 438MB on a shop PC is feasible, but not on a CNC control center with 512MB RAM

**Recommendation:**
- Define embedding inference location (server vs. client vs. edge)
- If edge: specify runtime (ONNX, TVM, or commercial solution)
- If server: specify caching strategy (embed on-demand vs. pre-compute all 95K tools weekly)

---

#### MEDIUM Finding 4: No On-Premise Data Isolation Specified
Phase 3 (U-AUTH2) mentions tier enforcement but doesn't address on-premise multi-tenant isolation:

If PRISM runs on-premise in a shop (not shared SaaS):
- User A (engineer) accesses all jobs/quotes/materials?
- User B (operator) sees only their assigned machine?
- User C (admin) audits everything?

**Current schema (schema.sql):**
- `users` table has role: admin/engineer/operator/viewer
- NO row-level security (RLS) in Phase 1-3
- Phase 3 (U-AUTH2) only covers Redis token TTL and tier gating, not data authorization

**Impact:** On-premise shop cannot isolate sensitive data (quotes, costs, supplier info) from operators.

---

#### MEDIUM Finding 5: No Shop-Floor Reliability Requirements
OPC-UA network on shop floor is **noisy**:
- PLC resets happen (firmware updates, power dips)
- Network drops (WiFi interference, Ethernet switch failures)
- Latency spikes (network congestion during job transfers)

**Phase 4 (U-EVT2) specifies:**
- Back-pressure: pause OPC-UA if consumer lag >30s ✓
- Circuit breaker: revert to safe defaults if lag >10s ✓
- DLQ for failed events ✓

**But missing:**
- How long does OPC-UA buffer locally if Redis is down? (Phase 4 doesn't mention local queue)
- What's the "safe defaults"? (Hardcoded speeds/feeds from memory?)
- How does circuit breaker notify the operator that the system is degraded?

**Recommendation:** Add reliability spec:
- OPC-UA local buffer: 1-hour window (in case Redis down for <1hr)
- Safe defaults: Load from constants.ts, not from calibration feedback (conservative)
- Dashboard alert: Show "OPC-UA degraded, using safe speeds" in red

---

## ROLE 40: QUALITY ASSURANCE / ISO AUDITOR
**Score: 24/100** — Audit trail & compliance completely missing

### AS9100 / ISO Compliance & Traceability

#### CRITICAL Finding 1: prediction_outcomes Table Insufficient for Audit
Phase 5 (U-CAL2) specifies:
```sql
CREATE TABLE prediction_outcomes (
  id, model_id, input_features JSONB,
  predicted_value, actual_value,
  measurement_type, material_key, machine_id,
  validated_at, confidence
)
```

**AS9100 traceability requires:**
1. **Who made the measurement?** (operator ID, name, signature)
   - Missing: no `measured_by` or `operator_id` field
2. **How was it measured?** (instrument, procedure, calibration cert)
   - Missing: no `instrument_id`, `procedure_ref`, `calibration_date`
3. **When was it measured?** (timestamp with TZ)
   - Has: `validated_at` (when validated, not when measured)
   - Missing: `measured_at` (when actual measurement occurred)
4. **Was it approved?** (technician sign-off)
   - Missing: no `approved_by`, `approval_timestamp`
5. **Is it immutable?** (Phase 5 says "trigger prevents UPDATE/DELETE")
   - Good, but missing: `created_at` and deletion protection is via trigger (fragile)

**Phase 6 observability doesn't address audit logging:**
- Prometheus tracks metrics (latency, success rate) but not:
  - Who accessed what calibration data
  - When parameters were changed
  - Why an operator overrode a prediction

**Impact:** Cannot pass AS9100 audit. Regulatory risk for aerospace customers.

---

#### CRITICAL Finding 2: Parameter Change History Non-Existent
AS9100 C.1.4 requires: "Identify and maintain control of changes in the delivery of product requirements."

**Current state:**
- Phase 5 (U-CAL1) allows SpeedFeedOrchestrator to use `calibration_overrides` with source (Bayesian/Kalman/manual)
- But no change log: when did kc1.1 change from 1800 → 1900? Who approved it? Why?

**Missing schema:**
```sql
CREATE TABLE calibration_changes (
  id UUID PRIMARY KEY,
  model_id UUID,        -- which material/machine?
  parameter_name TEXT,  -- "kc1_1", "mc", etc.
  old_value NUMERIC,    -- 1800
  new_value NUMERIC,    -- 1900
  source TEXT,          -- "bayesian", "manual"
  changed_by UUID REFERENCES users(id),
  changed_at TIMESTAMPTZ,
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  reason TEXT,
  revision_id UUID      -- link to job that triggered it
);
```

**Phase 5 doesn't define this table.** U-CAL2 is only `prediction_outcomes`, not change history.

**Impact:** Cannot trace why a job used different parameters than a previous job. ISO audit failure.

---

#### HIGH Finding 3: No Auditable Physics Constants Document Control
src/physics/constants.ts has Kienzle coefficients:
```typescript
const KIENZLE: Record<string, KienzleRow> = {
  "P":  { kc1_1: 1800, mc: 0.25 },  // Steel
```

**AS9100 D.1.3 requires:** "Maintain product-related documentation including ... ... material specifications."

**Current issues:**
1. **No version history** in constants.ts (git tracks it, but not in the application)
   - When did Kienzle constants change? Why?
2. **No source citation** (where did kc1_1=1800 for steel come from? ISBN? Standard? Historical data?)
3. **No expiration date** (when should these constants be recalibrated?)
4. **No change approval process**
   - If an engineer changes kc1_1 from 1800 → 1750, does it need approval?
   - Current code: just modify file + rebuild + deploy (no approval gate)

**Phase 7 (U-API2) adds "changelog generation from schema diffs," but this is for API schemas, not physics constants.**

**Recommendation:** Add schema:
```sql
CREATE TABLE physics_constants_audit (
  id UUID PRIMARY KEY,
  constant_name TEXT,  -- "kienzle_kc1_1_P", etc.
  value NUMERIC,
  valid_from TIMESTAMPTZ,
  valid_until TIMESTAMPTZ,
  source TEXT,         -- "ISO 3685", "customer data", "calibration"
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ,
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ
);
```

---

#### HIGH Finding 4: GDPR Data Retention Policy Missing
Phase 5 (U-KG2) says: "operator-confirmed setups persist" (indefinite retention)
Phase 9 (U-ML2) says: "Training data export" (all historical prediction_outcomes available)

**GDPR Article 5(1)(e) requires:** "kept in a form which permits identification of data subjects for no longer than necessary."

**Issues:**
1. **No retention policy** — Do prediction_outcomes stay in DB forever? For 3 years (statute of limitations)? For 7 years (ISO)?
   - Phase 5-9 don't specify
2. **No anonymization** — If a job is deleted, are its prediction_outcomes deleted too?
   - schema.sql has no CASCADE delete; prediction_outcomes would orphan
3. **No right to erasure** — If an operator requests "delete my calibration feedback," how do we comply?
   - Current schema: prediction_outcomes are immutable (trigger prevents deletion)
   - This violates GDPR Article 17 (right to erasure)

**Impact:** EU customer cannot use PRISM. Regulatory risk.

---

#### HIGH Finding 5: No Document Control Process for Schema Changes
Phase 1 (U-DB2) creates a `schema_migrations` table (applied_migrations).
Phase 2-10 add tables (embeddings, calibration, knowledge graph, features).

**But no control process:**
1. **Who approves a new table?** (QA? Product manager?)
2. **Is the migration tested on production-like data?** (Phase 1 has dry-run, but no "test" environment mandate)
3. **Is the migration reversible?** (Phase 1 mentions rollback, but no rollback test in exit gate)
4. **Is downtime acceptable?** (Adding columns with NOT NULL requires exclusive lock in Postgres; Phase 1 doesn't mention zero-downtime strategy)

**AS9100 document control:** Every schema change should be:
- Numbered (001, 002, ...)
- Reviewed and approved
- Reversible (rollback plan documented)
- Tested before prod
- Logged with who/when/why

**Phase 1 (U-DB2) doesn't define this process.**

---

#### MEDIUM Finding 6: Audit Report Generation Not Planned
AS9100 C.4.1 requires: "Maintain objective evidence of conformity to product requirements."

**Current state:**
- No `/api/audit-report` endpoint
- No dashboard showing:
  - Which jobs used which calibration constants
  - Which measurements were accepted vs. rejected (outlier detection in Phase 5, U-CAL3)
  - Which parameters changed and when
  - Who accessed what data

**Recommendation:** Add unit:
- **U-AUD1** (effort 50): Build audit report generator:
  - Job traceability (inputs → outputs → who/when)
  - Calibration history (constants used, measurements collected, updates applied)
  - Access log (who viewed/modified calibration data)
  - Export to PDF for customer + regulator

---

## SUMMARY SCORECARD — ROLES 36-40

| Role | Score | Severity | Key Gap |
|---|---|---|---|
| 36: Financial/CFO | 28 | CRITICAL | No cost model, ROI, or per-shop pricing |
| 37: Legal/IP Attorney | 22 | CRITICAL | Embedding model license + tribal knowledge IP undefined |
| 38: Customer Success | 31 | CRITICAL | No customer features until Phase 8; "aha moment" undefined |
| 39: Hardware/Edge | 26 | CRITICAL | On-premise deployment completely unspecified |
| 40: QA/ISO Auditor | 24 | CRITICAL | prediction_outcomes insufficient for AS9100; no audit trail or change history |

**Round 2 Average (Roles 36-40):** (28+22+31+26+24)/5 = **26.2/100**

**Combined Round 1 + Round 2:** (46.4 + 26.2) / 2 = **36.3/100** ← Roadmap quality declined

---

## ROOT CAUSE ANALYSIS

The roadmap was written from a **technical perspective** (Phases 1-10 follow topological dependency order) but **ignores business, legal, and audit constraints** that determine whether the product can actually ship:

1. **No customer value** until infrastructure is complete (Phase 8) — classic "missing MVP definition"
2. **No legal review** of embedding models, training data, or open-source licensing
3. **No cost model** to pitch to investors or justify business case
4. **No AS9100 compliance** framework (critical for aerospace customers, the stated target market)
5. **No on-premise option** (many shops won't run cloud infrastructure)

---

## RECOMMENDATIONS FOR REVISED ROADMAP

### Immediate (Before Phase 1 Execution)

1. **Create "Business Viability Gate"** — Before breaking ground on code:
   - Finalize SaaS pricing tiers + per-shop cost model (Role 36)
   - Clear embedding model + training data IP with legal (Role 37)
   - Define "aha moment" + POC success criteria (Role 38)
   - Outline AS9100 compliance framework (Role 40)

2. **Reorder phases by customer value, not technical dependencies:**
   - **Phase 1:** DB foundation ✓ (necessary)
   - **Phase A (NEW):** Customer onboarding + training (MVP)
   - **Phase B (NEW):** Feedback loop UI + data ingestion (Phase 5 UI wiring)
   - **Phase C (NEW):** Basic calibration accuracy metrics + dashboard
   - **Phase 2-10:** Infrastructure + advanced features (current order OK)

3. **Add compliance phase:**
   - **Phase 11 (NEW):** AS9100 audit trail + change history + GDPR compliance
   - **Phase 12 (NEW):** On-premise deployment option + edge computing support

### Short-Term (During Execution)

4. **Define exit gates for business decisions:**
   - Phase 1 exit: NOT "Postgres connects" but "Cost/month is <$X and on-premise option is viable"
   - Phase 2 exit: NOT "latency <200ms" but "Customer POC semantic search accuracy is >Y%"
   - Phase 5 exit: NOT "calibration engine wired" but "Customer measured ROI: reduced tool breakage by Z%"

5. **Add cost tracking:**
   - Every phase estimates infrastructure cost (AWS, Postgres, Redis, K8s)
   - Roadmap generates monthly burn rate forecast
   - Executive dashboard shows cost-per-customer-feature

---

## CRITICAL NEXT STEPS

**Before Phase 1 starts:**

1. Finance: Generate full cost model with cloud provider pricing (AWS RDS, ElastiCache, EKS)
2. Legal: Review all Phase 1-10 dependencies for license compatibility
3. Product: Define MVP (what minimum features unlock $10K/month revenue?)
4. QA: Draft AS9100 compliance checklist; map requirements to schema changes
5. Engineering: Confirm on-premise Dockerfile + local Postgres deployment works

**These are blocking issues, not "nice-to-haves."**

