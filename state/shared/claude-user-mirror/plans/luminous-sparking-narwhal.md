# Plan: PHASE 6 — Backend Business Platform (E2/QB/Xometry/Fictiv Feature Parity)

**This is a NEW phase addition to v24, inserted after Phase 5 checkpoint.**

## Context

Codex did deep research on how the frontend should look, modeling after E2 Shop System, QuickBooks, Xometry, and Fictiv. Phase 5 (already inserted this session) handled ERP hardening (persistence, physics costing, registry wiring, E2 connector). Phase 6 builds the BACKEND features those competitive platforms have that PRISM currently lacks: file upload/CAD storage, instant quoting, DFM analysis, QuickBooks connector, approval workflows, job travelers, role-based desks, customer portal, preset libraries, and learning progression.

## Competitive Intelligence (informing each session)

- **E2**: Routing-step execution, dual time tracking (setup+cycle), planning board, QR-scan shop floor
- **QuickBooks**: OAuth 2.0, webhooks, GL mapping, 3-way matching, cash/accrual reporting
- **Xometry**: CAD upload → instant DFM → instant price, qty breaks, lead times, 12+ milestones
- **Fictiv**: Parts Library with revisions, pre/post DFM, GD&T, FAI/certs, cross-workspace sharing

## PASL Route Misalignments to Fix (Session 6-1)

1. Speed/feed route split-brain (unmounted /api/v1/speed-feed/*)
2. CAM generate/post contract mismatch
3. PPG route/action drift (6 action names missing from dispatchers)
4. ERP analytics drift (oee_calculate not wired)
5. Context catalog returns zero entries

## Implementation: Insert into CAMX-RESTRUCTURED-ROADMAP-v24.md

- **Insertion point**: After Phase 5 CHECKPOINT 5 COMPLETE (currently ~line 5382)
- **Before**: SESSION 0-D-ARCH

## 10 Sessions, 28 Units

| Session | Title | Units | Key Backend Deliverables |
|---------|-------|-------|--------------------------|
| 6-1 | Route Contract Stabilization | U-ROUTEFIX1/2/3 | Fix 5 PASL misalignments, 24+ integration tests |
| 6-2 | File Upload + CAD Storage + Parts Library | U-BLOB1/2/3 | FileStorageEngine, PartsLibraryEngine, SHA-256 dedup, revisions |
| 6-3 | Instant Quote Pipeline | U-IQUOTE1/2/3 | InstantQuoteEngine (CAD→price), qty breaks, lead times, revisions |
| 6-4 | DFM Analysis + GD&T Backend | U-DFM1/2 | DFMPipelineEngine, tolerance feasibility Cpk, cost impact per issue |
| 6-5 | QuickBooks Online Connector | U-QBO1/2/3 | OAuth 2.0, webhook sync, GL mapping, 3-way matching, rate-limited queue |
| 6-6 | Approval Workflows + Audit Trails | U-APPR1/2/3 | Generic ApprovalWorkflowEngine, record timelines, comments, attachments |
| 6-7 | Job Traveler + Dual Time Tracking | U-TRAV1/2/3 | JobTravelerEngine, MachineDispatchEngine, setup+cycle, planning board |
| 6-8 | Role-Based Desks + Global Search | U-DESK1/2 | DeskPayloadEngine, GlobalSearchEngine, saved views, pins, recents |
| 6-9 | Customer Portal + Milestone Tracking | U-PORTAL1/2/3 | 14-milestone template, token-based portal, quality docs, messaging |
| 6-10 | Preset Libraries + Learning Backend | U-PRESET1, U-LEARN1/2 | PresetLibraryEngine, LearningProgressionEngine, knowledge facets |

## DB Migration Sequence (8 files, 23 new tables)

```
002-file-storage.sql       — files, file_versions, file_attachments, parts, part_revisions
003-quote-revisions.sql    — quote_revisions, quote_status_history
004-integrations.sql       — oauth_tokens, integration_sync_log, webhook_events
005-workflows.sql          — approval_workflows, approval_instances, approval_decisions, record_timeline, comments
006-job-routing.sql        — job_routing_steps, routing_time_entries, machine_queue
007-desks.sql              — saved_views, user_pins, user_recents
008-milestones.sql         — order_milestones, quality_documents
009-presets-learning.sql   — presets, preset_compare_history, learning_courses, enrollments, checkpoints, media
```

## FORGE-TRIPLE per Session (10 total)

| Session | Hook | MCP Action | Skill |
|---------|------|------------|-------|
| 6-1 | Block routes calling non-existent dispatcher actions | prism_dev:route_health_audit | /route-audit |
| 6-2 | Block raw FS writes outside FileStorageEngine | prism_data:parts_library_search | /part-lookup |
| 6-3 | Enforce CI95 bounds on all quotes (never bare prices) | prism_product:instant_quote | /instant-quote |
| 6-4 | Enforce physics_basis string on DFM issues | prism_calc:dfm_analyze | /dfm-check |
| 6-5 | Block plaintext OAuth token storage | prism_integration:qbo_sync | /qbo-setup |
| 6-6 | Block status changes that bypass approval workflow | prism_business:workflow_pending | /approvals |
| 6-7 | Enforce dual time (setup+cycle) on routing step completion | prism_business:dispatch_board | /traveler |
| 6-8 | Ensure desk_get returns role-appropriate data only | prism_data:search_global | /find |
| 6-9 | Ensure portal endpoints never expose internal cost data | prism_business:milestone_advance | /order-status |
| 6-10 | Validate preset params within sane machining ranges | prism_data:preset_search | /my-presets |

## Frontend Contract (what Codex gets from Phase 6)

```
1.  GET  /api/v1/desk                        → role-based payload with live counts
2.  GET  /api/v1/search?q=                   → cross-entity ranked search
3.  GET  /api/v1/workflows/:type/:id/timeline → full record timeline
4.  POST /api/v1/quotes/instant              → price + DFM + qty breaks + lead times
5.  GET  /api/v1/traveler/:job_id            → routing steps with dual time tracking
6.  GET  /api/v1/dispatch/board              → all machines with queued jobs
7.  GET  /api/v1/portal/order/:token         → customer-facing milestone tracker
8.  POST /api/v1/files/upload                → file attachment with SHA-256 dedup
9.  GET  /api/v1/parts/:id/revisions         → part revision history
10. GET  /api/v1/presets                     → saved calculator/toolpath configs
11. POST /api/v1/learning/checkpoint         → quiz submission with scoring
12. POST /api/v1/integrations/qbo/authorize  → QuickBooks OAuth 2.0 redirect
```

## Totals

- **17 new engines**, **23 new DB tables**, **12 new route files**, **~120 new API endpoints**
- Each session: SMART CONFIG, KNOWLEDGE SOURCES, INTENT, WORK, 4-LOOP, FORGE-TRIPLE, EXIT GATE
- Each session ends with `/compact` and starts with `/startup → /handoff read`

## Verification

After insertion:
1. All unit IDs unique (no collision with Phase 5 units)
2. KNOWLEDGE SOURCES reference real file paths
3. EXIT GATES are specific and testable
4. Header session count updated
5. Phase 5 checkpoint → Phase 6 → 0-D-ARCH ordering correct

## Full Roadmap Text

The complete v24-format session blocks are in the Plan agent output (70.5KB). All 10 sessions follow identical structure to Phase 5 sessions already inserted.
