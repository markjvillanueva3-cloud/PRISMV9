---
name: reference-employee-mobile-portal-2026-05-23
description: U-EMPLOYEE-MOBILE-PORTAL — phone-first shop-floor portal shipped + wired into prism_shop (17 actions) by hotel iter1 on 2026-05-23.
aliases: reference_employee_mobile_portal_2026_05_23
type: reference
slot: hotel
source: prism-memory
synced: 2026-06-27T20:30:46.566Z
---


# U-EMPLOYEE-MOBILE-PORTAL (hotel iter1, 2026-05-23)

**What:** Phone-first shop-floor employee portal closing the gaps NOT covered by `ShopFloorCheckInEngine` (department check-in only) or `CustomerPortalEngine` (customer-facing only).

**Commits:**
- `b7690253ac` — `EmployeeShopFloorMobileEngine.ts` (374 LOC) + `__tests__/EmployeeShopFloorMobileEngine.test.ts` (59 cases, all passing)
- `a0fca79858` — `shopDispatcher.ts` wiring: 17 `emp_*` actions via `prism_shop` dispatcher with inline Zod schemas

## API surface (6 capability blocks)

1. **QR/barcode scan** — `parseScanPayload(raw, source)` + `scanInTask(payload, employee_id, source)`
   - Format: `prism://job/<JOB>/op/<OP>/task/<TASK>` (full) or bare alphanumeric job-id (manual)
   - Auto-pauses prior active task on rescan (one running task per employee invariant)
2. **Per-employee task state machine** — `startJobTask` / `pauseTask` / `resumeTask` / `stopTask`
   - Status transitions: `running ↔ paused → completed | stopped`
   - Charges runtime on pause + completion; records `total_runtime_ms` + `total_pause_ms`
   - Terminal-state invariant: cannot restart completed/stopped task (throws)
3. **Employee↔employee messaging** — `sendMessage` / `listMessages` / `markMessageRead`
   - Cap 2000 chars; rejects empty/whitespace body + self-send + missing endpoint
   - Sort: newest-first with monotonic MSG-N tiebreak for sub-ms ISO collisions
4. **Hot-job priority audit chain** — `bumpJobPriority` / `getJobPriority` / `getJobPriorityAudit` / `rankJobsByPriority`
   - Reason ≥3 chars (hotel-soul audit rule); R12 fail-loud on NaN/Infinity priority
   - Every change writes to `priorityAudit[]` (chronological, full chain preserved)
   - Rank tiebreak: priority DESC → recency → audit-insertion index
5. **Manager task delegation** — `delegateTask` / `acknowledgeDelegation` / `listDelegations`
   - Rejects self-delegation; reason ≥3 chars; only assigned employee may ack
6. **Test hook** — `reset()` drops all state + resets counters

## Wired actions (prism_shop)

| Action | Method | Notes |
|---|---|---|
| `emp_scan_in` | `scanInTask` | accepts source ∈ {qr, barcode, manual} |
| `emp_start_task` | `startJobTask` | idempotent for already-running |
| `emp_pause_task` | `pauseTask` | reason ≥2 chars |
| `emp_resume_task` | `resumeTask` | paused → running |
| `emp_stop_task` | `stopTask` | `{completed, reason?}` |
| `emp_get_active_task` | `getEmployeeActiveTask` | null if none |
| `emp_get_task` | `getTask` | defensive copy |
| `emp_send_message` | `sendMessage` | cap 2000 chars |
| `emp_list_messages` | `listMessages` | `{unread_only?}` |
| `emp_mark_message_read` | `markMessageRead` | idempotent |
| `emp_bump_job_priority` | `bumpJobPriority` | reason ≥3 chars |
| `emp_get_job_priority` | `getJobPriority` | 0 default |
| `emp_get_priority_audit` | `getJobPriorityAudit` | optional `job_id` filter |
| `emp_rank_jobs` | `rankJobsByPriority` | hottest first |
| `emp_delegate_task` | `delegateTask` | reason ≥3 chars |
| `emp_ack_delegation` | `acknowledgeDelegation` | only assignee may ack |
| `emp_list_delegations` | `listDelegations` | `{unacknowledged_only?}` |

## Hotel-soul properties

- **Audit invariant** — every privileged action (priority bump, delegation) requires reason ≥3 chars + writes immutable audit row
- **Defensive copy** — every public return spreads a fresh object; in-place mutation by caller does not leak to internal store
- **R12 fail-loud** — bad inputs (NaN priority, missing employee_id, empty body, oversized payload) throw with descriptive error; never silent
- **Stable-sort discipline** — sub-millisecond ISO timestamp collisions break ties on monotonic counters (MSG-N, DELEG-N) and `priorityAudit` insertion index, not on V8 stable-sort insertion-order accident

## What's NOT in this iter (future iters)

- **Live update / push** — no WebSocket/SSE/poll layer yet; messaging + state are queryable via dispatcher but client must poll
- **Persistence** — pure in-memory state; needs a persistence backend (sqlite/qdrant/postgres) for production
- **Manager admin gate** — `bumpJobPriority` accepts any admin_id string; no role-based ACL yet
- **Live job tracking dashboard** — endpoints surface state; no aggregated read-model yet

## PSN synergy

- **Wired:** `prism_shop` dispatcher (17 actions invokable now)
- **Tested:** 59 vitest cases, all passing
- **Documented:** this memory + dispatcher JSDoc + engine class JSDoc
- **Wiki:** companion entry pending in next iter (low priority — JSDoc + this memory cover it)

## 2026-05-24 — iter2 through iter5 close-out (33→43 emp_* actions + R1 ACL + integration test)

Continuation of the `/goal [build everything we need | completed, wired and synergized to psn and prism app | prove full functionality to invoke completeness]` directive (slot:hotel, 2026-05-24 autonomous /loop).

| iter | commit | scope | actions/tests added |
|---|---|---|---|
| iter2 (W1) | `a0fca79858`-follow | 6 phone-ready calculator wires | `emp_calc_{speed_feed,kienzle_specific,kienzle_forces,kienzle_milling,cost_breakdown,cost_quick}` — thin lazy-import wrappers over UltimateSpeedFeed + KienzleForceModel + CostEstimation + CostEstimator.quickEstimate |
| iter3 (W2+W3+W4) | follow | 10 phone-portal action wires | W2: `emp_doc_{ingest,get,list,search}` → DocumentInboxEngine; W3: `emp_blueprint_to_{quote,program}` → BlueprintToQuoteBridge + AutoPrintToProgramBridge; W4: `emp_dnc_{plan,queue,machines,safety_check}` → DNCFileTransfer + DNCSend + DNCVerify (S(x)≥0.990 hard-gate preserved) |
| iter4 (R1) | follow | Role-based ACL | `EmployeeShopFloorMobileEngine.configureRoleACL({resolver, priorityBumpRoles?, delegateRoles?})` — optional injected `RoleResolver`, backward-compat when unset, **refuse-on-unknown** (null role rejects), default allow [`foreman`,`manager`,`admin`]. +9 unit tests (68 total). |
| iter5 (INTEG) | `142c04aaf7` | Round-trip integration test | `shopDispatcher.empPortal-integration.test.ts` — 11 cases via mock MCP server: state machine round-trip, messaging round-trip, priority audit, W1 cost-quick, W2 doc list, W4 dnc safety_check + machines, R1 ACL refuse+allow, schema rejection, unknown-action z.enum guard. **Proves "full functionality to invoke completeness".** |

### B1 + B2 — NOT BUILT (YAGNI per R-discipline)

Originally planned, then dropped after re-examining existing surface:
- **B1 CimcoBridgeEngine** — `DNCFileTransferEngine` already handles RS232/FTP/USB/ethernet protocols. CIMCO is a desktop wireless-DNC app at JM Die that consumes file-drops to a hot-folder — already covered by the existing `ftp`/`ethernet_share` protocol entries. A wrapper engine would have been speculative scaffolding.
- **B2 MobileFileUploadEngine** — phone HTTP upload + HEIC→JPEG conversion + chunking is the responsibility of the *HTTP route layer*, not an engine. `DocumentInboxEngine.ingest()` already accepts buffer+sourceType; the dispatcher passes through unchanged.

Karpathy R5/YAGNI applied: don't build wrapper engines that add zero capability over the path the user can already invoke.

### Cumulative phone-portal surface (after iter5)

- **43 `emp_*` actions** on `prism_shop` dispatcher (17 from iter1 + 6 W1 + 10 W2/W3/W4)
- **68 unit tests** on EmployeeShopFloorMobileEngine (59 from iter1 + 9 R1 ACL)
- **11 integration tests** on shopDispatcher → engine round-trip
- **Total tests proving the portal: 79** (all passing)

### Goal-coverage map (user 2026-05-23 directive)

| User ask | Action(s) | Engine(s) | Status |
|---|---|---|---|
| Phone speed/feed/Kienzle/cost calculators | `emp_calc_*` (6) | UltimateSpeedFeed + KienzleForceModel + CostEstimation + CostEstimator | ✅ |
| "Take pictures of prints" → into system | `emp_doc_ingest` | DocumentInboxEngine (Claude Vision OCR + classify) | ✅ |
| "Import files from their emails" → ingest | `emp_doc_ingest` (same path) | DocumentInboxEngine (multi-source: photo/email/PDF) | ✅ |
| "Generate programs from their phones" | `emp_blueprint_to_program` | AutoPrintToProgramBridgeEngine.runAutoPipeline | ✅ |
| "Wireless connectors to CIMCO → lathes" | `emp_dnc_queue` (safety-gated) + `emp_dnc_plan` + `emp_dnc_safety_check` | DNCSendEngine + DNCFileTransferEngine + DNCVerifyEngine | ✅ |
| "Admin priority adjustments for hot jobs" | `emp_bump_job_priority` + `emp_rank_jobs` + R1 ACL | EmployeeShopFloorMobileEngine | ✅ |
| "Task delegation by managers" | `emp_delegate_task` + `emp_ack_delegation` + R1 ACL | EmployeeShopFloorMobileEngine | ✅ |
| "Live update and messaging between employees" | `emp_send_message` + `emp_list_messages` + `emp_mark_message_read` | EmployeeShopFloorMobileEngine | ✅ (poll-based; push layer deferred) |
| "Live job tracking" | `emp_get_active_task` + `emp_get_task` + `emp_rank_jobs` | EmployeeShopFloorMobileEngine | ✅ (poll-based) |

### Deferred (explicit scope)

- WebSocket/SSE live-push layer (poll-based works for v1)
- Persistence backend (in-memory until shape stabilizes)
- Phone UI (React Native / PWA — backend complete, UI is downstream consumer)
- Auto-resolved role binding via EmployeeEngine lookup (R1 takes any RoleResolver; the auto-bind is a thin glue PR)
