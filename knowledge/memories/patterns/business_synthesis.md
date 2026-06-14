---
name: business_synthesis
description: "[auto-synth · verify] Compounding synthesis of the business domain — recurring patterns, decisions, open threads distilled from 24 memories (LLM-generated; verify against source memories before trusting)"
metadata:
  type: patterns
  galaxy: business
  synthesizedFrom: 24
  model: gpt-oss:120b
  synthesizedAt: 2026-06-11T04:46:52.241Z
  sourceHash: fb41591ac5b1
  advisoryOnly: true
  mustHumanVerify: true
---

# business — domain synthesis (compounding)

> ⚠ ADVISORY — LLM-generated (gpt-oss:120b), `mustHumanVerify`. Auto-distilled by
> `galaxy-reflection-synthesis.mjs` (B1) from 24 domain-relevant memories via the
> A6/A3 hybrid recall. Verify any rule here against its cited source memory before trusting
> it as fact (esp. safety-relevant thresholds). Regenerated on each run — edit the source
> memories, not this file. The compounding arm of the Obsidian brain.

## Recurring patterns
- **Bootstrap‑Slot Enforcement** – Almost every shipped unit is wrapped in a `BOOTSTRAP-SLOT-ENFORCE` wrapper that registers the module under a named slot (e.g., `echo`, `delta`, `golf`) and drives its lifecycle.  Seen in DOMAIN‑GALAXY‑DOCTRINE, WIRE‑BUSINESS‑DIRECT, CIMCO‑INTEGRATION, DELTA‑CONTEXT‑RECON, FLEET‑TASK‑HEALTH, GALAXY‑ENRICH, HERMES‑MASTER‑ORCHESTRATOR, JM‑DOC‑POPULATION, etc.  
- **“Wire” → Status → Consume** – A consistent three‑step flow: a *wire* module (U‑…‑WIRE‑…) injects data or connectivity, a corresponding *status* unit (U‑…‑STATUS) records health/verification, and downstream consumers read that status.  Examples: `U-WIRE-CADBRIDGE` → `prism_cad`, `U-WIRE-ME` → MigrationEngine, `U-RECONCILE-UAI-ENGINE-STATUS` → engine health, `U-FTH-MIGRATION‑FREEZE‑MARKER` → migration gating.  
- **Iterative Slot Naming** – Slots are suffixed with iteration identifiers (`iter10`, `iter11`, `alpha iter2`) to signal progressive refinement and allow safe hot‑swap of logic without breaking downstream consumers.  (e.g., GOAL‑SYNERGY‑LOOP‑MS0, HIGH‑ROI‑TS2).  
- **Business Cleanup via “Real Wire” / “False Wire”** – Dedicated cleanup units replace stale queues or erroneous records with canonical sources and log handoff metadata.  (`U-HOTEL-CUSTOMER-KNOWLEDGE-REAL-WIRE`, `U-HOTEL-FALSE-WIRE-FLEETWIDE-SURFACE`).  
- **Domain‑Specific Digest & Program Status** – Galaxy‑related modules publish digest summaries and program‑status anchors that drive verification pipelines (e.g., `U-GA…‑PER‑GALAXY‑ENGINE‑DIGEST`, `U-GE-DEEPEN-STATUS`, `U-GE-PROGRAM-STATUS`).  
- **Master‑Index Exact‑Match Collapse** – High‑ROI indexing uses a pre‑check exact‑match step to prune 80 % of block‑byte payload before further processing. (`U-MASTER-INDEX-EXACT`).  

## Key decisions & rules
| Decision / Rule | Rationale (cited memories) |
|-----------------|----------------------------|
| **All new business logic must be registered via a bootstrap slot** – Guarantees deterministic init order and enables hot‑reload.  ([reference_post_ship_domain-galaxy-doctrine-ms1-u-galaxy-ms1-c1-pilot-classifier], [reference_post_ship_cimco-integration-ms0-u-cimco-closed-loop-status]) |
| **Unwired components are wired before any downstream consumer is activated** – Prevents null‑data propagation.  (Lathe wiring: `[reference_lathe_100pct_wired_2026_05_23]`, `[reference_post_ship_lathe-unwired-wire-ms0-u-luw02]`; Wire‑CADBridge: `[reference_post_ship_wire-unwired-ms0-u-wire-cadbridge]`) |
| **Status objects are the sole source of truth for health/verification** – Consumers read only status slots, never raw wire output.  (U‑RECONCILE‑UAI‑ENGINE‑STATUS, U‑FTH‑MIGRATION‑FREEZE‑MARKER) |
| **Iterative slot versions must be monotonic and documented in the wiki** – Enables safe rollback and audit trails.  (GOAL‑SYNERGY‑LOOP slots `iter10`/`iter11`, HIGH‑ROI‑TS2 `alpha iter2`) |
| **Business cleanup replaces stale queues with canonical “real wire” modules; false wires are logged with fleetwide handoff records** – Guarantees data integrity across the hotel domain.  (`U-HOTEL-CUSTOMER-KNOWLEDGE-REAL-WIRE`, `U-HOTEL-FALSE-WIRE-FLEETWIDE-SURFACE`) |
| **Program‑specs must reflect verification progress (e.g., “verify‑promoted”, “deepened”)** – Provides a single source for release gating.  (`U-GE-DEEPEN-STATUS`, `U-GE-PROGRAM-STATUS`) |
| **Master‑index exact‑match precheck is mandatory for any high‑ROI pipeline** – Reduces payload size and improves latency.  (`U-MASTER-INDEX-EXACT`) |

## Open threads
- **Remaining Lathe engines** – The LATHE‑UNWIRED‑WIRE closure reports “wire ALL 43 remaining unwired Lathe engines” but the audit notes they were wired via `lathe_introspect router + lathe_eng`. Confirmation of successful runtime wiring is pending. ([reference_post_ship_lathe-unwired-wire-ms0-u-luw02])  
- **CIMCO per‑galaxy plot integration** – The status module (`U-CIMCO-PER-GALAXY-PLOTS`) is deployed, but no follow‑up on verification or downstream consumption is recorded. Potential gap in the galaxy analytics pipeline. ([reference_post_ship_cimco-integration-ms0-u-cimco-per-galaxy-plots])  
- **Goal‑Synergy Loop final roll‑up** – The status‑rollup (`U-GOAL-SYNERGY-STATUS-ROLLUP`) produces meta‑status, yet the consumer that triggers actionable decisions has not been documented. Clarify consumption path and any pending iteration. ([reference_post_ship_goal-synergy-loop-ms0-u-goal-synergy-status-rollup])  
- **Dev‑Tool Conflict Audit HTML sidecar** – The sidecar HTML module (`U-MASTER-INDEX-SIDECAR-HTML`) appears to be a stub (“HT”). Full rendering and integration tests are missing. ([reference_post_ship_dev-tool-conflict-audit-2026-05-17-u-master-index-sidecar-html])  
- **False‑wire fleetwide surface handoff completeness** – The wiki+handoff record for false wires (`U-HOTEL-FALSE-WIRE-FLEETWIDE-SURFACE`) is created, but verification that all erroneous records have been purged across the fleet remains open. ([reference_post_ship_business-cleanup-u-hotel-false-wire-fleetwide-surface])
