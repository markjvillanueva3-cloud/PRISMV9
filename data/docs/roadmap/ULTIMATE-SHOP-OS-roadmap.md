# Ultimate Shop OS Roadmap

Generated on 2026-03-27 using the `generate-roadmap` RGS pattern in [C:\PRISM\.claude\commands\generate-roadmap.md](C:\PRISM\.claude\commands\generate-roadmap.md) and the forge-triple model documented in [C:\PRISM\CAMX-RESTRUCTURED-ROADMAP-v24.md](C:\PRISM\CAMX-RESTRUCTURED-ROADMAP-v24.md).

## Canonical Roadmap Note

`C:\PRISM\CAMX-RESTRUCTURED-ROADMAP-v24.md` remains the canonical roadmap. This ULT document now serves as the detailed connected-shop operating-system subtrack that feeds v24 Phase 5/6 frontend-business execution.

Current ownership split:

- Claude owns backend implementation and final production contracts.
- Codex owns frontend provider seams, shared workflow primitives, employee-shell UX, and contract-ready desk integration.

## MCP FULL UTILIZATION PROTOCOL (MANDATORY — applies to EVERY session)

```
SESSION START:  prism_session:context_boot → dispatcher_map → memory_recall → system_snapshot → action_search "<goal>"
DURING WORK:    prism_session:auto_checkpoint (every 5-10 calls) → action_search → tool_route_best → wip_capture
SESSION END:    prism_session:memory_save → system_snapshot → checkpoint_enhanced
PLUGINS:        mcp__vitest__run_tests | mcp__eslint__lint-files | codebase-memory-mcp search_graph
FEATURE CASCADE: Read SESSION_ARTIFACTS.json at start → write via PostCompact hook at end
CONTEXT RETAIN: .compaction-survival.md + HANDOFF.md + SVI-compact.md + MEMORY.md (all auto-synced)
```

## Mission

Build PRISM into a true all-in-one shop operating system:

- one canonical source of truth for jobs, travelers, labor, quantities, approvals, attachments, and live events
- one role-aware experience layer for employees, leads, planners, managers, and admins
- one operational workflow spine across jobs, scheduling, shortages, approvals, and comments
- one bidirectional sync and intelligence fabric for ERP, accounting, analytics, and offline recovery
- one accounting, legal/compliance, and customer-service layer that stays attached to the same canonical records instead of becoming side systems
- one production launch layer with command-center visibility, replay, readiness scoring, and release gates

## RGS Interpretation

This roadmap follows the `/rgs` shape as a modular milestone package:

- milestone envelopes in `mcp-server/data/milestones/`
- execution state in `mcp-server/data/state/{MILESTONE-ID}/`
- registration in `mcp-server/data/roadmap-index.json`
- a human-readable overview in this document

There is no dedicated `forge-triple` slash command file in the active checkout, so forge-triple is applied as a roadmap rule:

- every milestone includes core build units
- every milestone includes a command or skill style surface for operator use
- every milestone includes a guard or hook plus tests for durability

## Milestone Stack

| Milestone | Title | Sessions | Depends On | Outcome |
| --- | --- | --- | --- | --- |
| `ULT-MS0` | Canonical Shop Domain + Event Spine | `2-3` | none | canonical schema, state engine, live routes, contract guard |
| `ULT-MS1` | Live Shop Execution Core | `2-3` | `ULT-MS0` | traveler scans, department check-ins, concurrent labor timers, live fanout |
| `ULT-MS2` | Role-Aware Experience Layer | `2-3` | `ULT-MS1` | employee sign-in, role-filtered shells, hidden sensitive tabs, override policy |
| `ULT-MS3` | Operational Workflow OS | `2-3` | `ULT-MS0`, `ULT-MS1`, `ULT-MS2` | unified approvals, comments, shortages, command-center queues |
| `ULT-MS4` | External Sync + Intelligence Fabric | `2-3` | `ULT-MS1`, `ULT-MS3` | E2 sync, accounting sync, offline replay, business intelligence |
| `ULT-MS5` | Launch, Hardening, and Adoption | `3-4` | `ULT-MS2`, `ULT-MS4` | launch command center, replay, readiness scoring, production release gate |

## Dependency View

```text
ULT-MS0
  -> ULT-MS1
      -> ULT-MS2
ULT-MS0 + ULT-MS1 + ULT-MS2
  -> ULT-MS3
ULT-MS1 + ULT-MS3
  -> ULT-MS4
ULT-MS2 + ULT-MS4
  -> ULT-MS5
```

## Forge-Triple Output Matrix

| Milestone | Engine / Core Output | Command or Skill Surface | Guard / Hardening Surface |
| --- | --- | --- | --- |
| `ULT-MS0` | `ShopStateEngine`, canonical shop schemas, live route contracts | `commands/shop-live-status.md`, `data/templates/ultimate-app/prism-shop-domain-contract.md` | `src/hooks/shopContractDrift.ts`, contract tests |
| `ULT-MS1` | traveler execution, concurrent labor timers, realtime gateway | `commands/shop-scan.md`, `data/templates/ultimate-app/prism-shop-floor-execution.md` | `src/hooks/duplicateTravelerScanGuard.ts`, execution integration test |
| `ULT-MS2` | experience policy engine, employee portal routes, employee shell | `commands/employee-portal.md`, `data/templates/ultimate-app/prism-role-aware-shell.md` | `src/hooks/routeAuthorizationDrift.ts`, role-aware shell tests |
| `ULT-MS3` | workflow command center, shortages, approvals, comments | `commands/workflow-triage.md`, `data/templates/ultimate-app/prism-workflow-triage.md` | `src/hooks/workflowTransitionGuard.ts`, workflow integration test |
| `ULT-MS4` | E2 connector, accounting sync, analytics, offline queue | `commands/sync-health.md`, `data/templates/ultimate-app/prism-sync-ops.md` | `src/hooks/integrationCredentialGuard.ts`, sync E2E test |
| `ULT-MS5` | launch readiness, replay, unified command center | `commands/launch-gate.md`, `data/templates/ultimate-app/prism-launch-readiness.md` | `src/hooks/productionReadinessGate.ts`, release proof |

## What This Unlocks

After `ULT-MS5`, PRISM can function as the shop's primary operating system:

- intake can register jobs, print QR labels and travelers, and seed department routing
- workers can sign in to a role-aware portal and only see the tools that matter for their jobs
- labor, quantity, and traveler movement can update live across desks, dashboards, and employee devices
- jobs and scheduling share the same blockers, approvals, comments, and shortage state
- cost, quote-variance, ROI, and throughput analytics are driven from real operational data
- ERP and accounting systems can stay synchronized without PRISM losing its canonical state model
- customer-facing status, support, documents, and responses can route through one automated service layer tied directly to quotes, orders, jobs, invoices, and quality records
- legal/compliance posture can stay attached to customer requirements, audit history, and document lineage instead of living in disconnected spreadsheets and email trails
- launch and release decisions can be gated by measurable readiness rather than intuition

## Execution Notes

- Frontend work should keep leaving backend contract notes whenever the UI needs data the backend does not yet expose.
- Backend work should prioritize canonical persistence and websocket/event fanout before page-local enrichments.
- Employee workflows should stay mobile-first and optimized for fast scan, start, pause, and stop actions.
- Sensitive data should never rely on frontend hiding alone; `ULT-MS2` assumes backend-issued role policy claims.
- Universal print/CAD intake should land as a provider-backed frontend desk first, but its canonical backend anchor stays in `v24` Session `6-2` / `6-3` / `6-4`: file intake and parts library first, then quote revision posture, then DFM/GD&T/simulation review.
- Existing accounting engines and pages in the active tree mean accounting is part of the current convergence program, not a future placeholder.
- Legal/compliance should be treated as partially built infrastructure that still needs a full operating layer: retention, acknowledgements, legal-review gates, and customer-document traceability.
- Customer service should be treated as partially built infrastructure that still needs automation across CRM, portal, messages, milestones, SLA/escalation routing, and AI-assisted/self-service support.

## Quote-to-Machining Decision Pipeline Overlay

This ULT subtrack now explicitly carries the quote-to-machining decision spine inside the canonical `v24` Track A flow. The goal is not just "instant quote" or "program release" in isolation. The goal is one explainable system that can decide how a part should be made, whether it should be outsourced, how it should be priced, and how actual shop results should refine the next decision.

Canonical stages:

1. intake packet creation from RFQ, email, print, CAD, and customer requirements
2. manufacturability and capability fit
3. in-house route generation by machine, holder, tooling, workholding, stock, and operation order
4. parameter and toolpath planning by strategy, compatibility, speeds, feeds, DOC, WOC, and prove-out risk
5. full burdened costing with material, tooling, setup, runtime, inspection, logistics, utilities, rent, overhead, maintenance, and scrap reserve
6. outsource comparison by supplier fit, margin, schedule, and strategic value
7. quote / price-strategy recommendation and release handoff
8. actuals feedback from labor, quantities, insert indexing, tooling use, scrap, delays, and inspection

Responsibility split until convergence:

- Claude owns the backend decision spine: orchestration, compatibility, costing, outsource scoring, persistence, contracts, and realtime fanout.
- Codex owns the frontend decision surfaces: intake posture, price-strategy explainability, route and scenario comparison, release review, simulation-oriented walkthroughs, and hardening against live payload behavior.

Convergence rule:

- the remaining frontend queue should continue to close against live contract seams
- once the active frontend tranche is complete, Codex should keep hardening the same desks and run simulation-style walkthroughs against Claude's live backend responses to find the next operational gaps before formal testing

## Accounting + Legal + Customer Service Overlay

The active repo and archive audit clarify the business-platform state:

- accounting already has substantial engine, route, and page coverage in the live tree
- legal/compliance exists as partial infrastructure only
- customer service exists as partial infrastructure only

This means:

1. accounting remains in the current convergence tranche and should finish as part of the live operating-system spine
2. legal/compliance must extend beyond templates and HR-quality pages into a real legal operations layer
3. customer service must extend beyond CRM + messages + token portal into a fully automated service system

Required customer-service capabilities:

- omni-channel intake from portal, email, messages, and status-triggered workflows
- automatic case creation tied to canonical quote/order/job/invoice/quality records
- SLA routing, escalation, and ownership
- AI-assisted responses with auditability
- self-service customer visibility into status, documents, approvals, and follow-up history

Required legal/compliance capabilities:

- terms / NDA / customer requirement acknowledgement
- retention and audit-hold policy
- legal-review-required workflow gates when compliance engines flag them
- document and certification lineage across portal, quality, and accounting surfaces

## Comprehensive Audit + Learning Hardening Overlay (2026-03-29)

The active repo, archive mirror, and Box mirror were audited together and folded back into canonical `v24` via:

- `C:\PRISM\state\shared\COMPREHENSIVE_CONVERGENCE_AUDIT_2026-03-29.md`

Relevant ULT conclusions:

- the connected-shop desks are materially live-backed already, but the highest-value remaining closure points are still:
  - `messages`
  - `hotJobs`
  - parts/files/revision lineage in `Program Release`
  - inventory custody and insert/tool lifecycle events
  - customer portal / milestone / service linkage
- backend-built but frontend-underused business-platform capability already exists for:
  - customer portal
  - compliance/legal route families
  - parts library and quote revision history
  - deeper simulation and knowledge engines

The same audit also introduced a subordinate side-roadmap:

- `C:\PRISM\mcp-server\data\docs\roadmap\RESOURCE-LEARNING-HARDENING-ROADMAP.md`

ULT interpretation:

- resource-learning hardening is a support track for the connected-shop OS, not a separate operating-system roadmap
- it should feed better quoting, setup, alarm handling, simulation posture, post processing, purchasing, inventory, scheduling, and training
- it may begin as audit/registry/spec work now, but the heavier rollout should follow the current finish-first convergence gate

## Branch Model Note (2026-03-29)

The one true-path + side-quest branch plan for canonical `v24` is:

- `C:\PRISM\state\shared\ULTIMATE_V24_BRANCH_PLAN_2026-03-29.md`

ULT interpretation:

- the true path is the connected-shop convergence spine through contract repair, staged-seam closure, realtime, and business-operating completeness
- ULT execution helps drive `MP-0` through `MP-4`
- side quests for auto-generation, learning-resource hardening, database/corpus hardening, and business-platform hardening are subordinate and supportive
- user-supplied business-scenario testing should begin only after the true-path simulation-readiness gate is met for the target workflow
