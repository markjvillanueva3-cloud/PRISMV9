---
type: "chat-session"
source: "claude-code-cli"
session_id: "360ea971-de27-4678-9497-7a20405d3b93"
title: "Review a single focused change to `H:/prism/mcp-server/src/routes/erp.ts` (PRISM"
date: "2026-06-25"
first_ts: "2026-06-25T16:56:45.462Z"
last_ts: "2026-06-25T16:58:58.927Z"
cwd: "H:\\prism\\mcp-server"
messages: 50
user_msgs: 21
assistant_msgs: 29
raw_file: "H:/.claude/projects/H--/360ea971-de27-4678-9497-7a20405d3b93/subagents/agent-a6c006e480715c852.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:38:48"
---

# Review a single focused change to `H:/prism/mcp-server/src/routes/erp.ts` (PRISM

> **claude-code-cli** | 2026-06-25 | 50 msgs (21 user / 29 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--/360ea971-de27-4678-9497-7a20405d3b93/subagents/agent-a6c006e480715c852.jsonl`

## Transcript

### User | 2026-06-25T16:56:45.462Z

Review a single focused change to `H:/prism/mcp-server/src/routes/erp.ts` (PRISM ERP HTTP routes). I added 8 new Express routes (a "Compliance writes" block) right after the existing `/osha-near-miss` route (~line 175). Read the file region lines 160-210 end-to-end.

The change wires previously-dead FE client calls to EXISTING `prism_business` dispatcher actions using the in-file `rfqRoute(action, getParams?)` helper (defined ~line 111), which unwraps the `prism_business` `{type,text}` slimResponse envelope (JSON.parse the .text) — this is the canonical, correct pattern for this dispatcher (callTool cannot peel that envelope; reading `.data` without unwrap = permanently-empty page).

New routes:
- POST /osha-incident-create → osha_record_incident (requireRole lead/hr_manager/admin)
- POST /osha-log-300 → osha_300_log, params {year: req.body.year}
- GET  /audit-schedules → internal_audit_annual_coverage, params {} (requireRole)
- POST /audit-schedule → internal_audit_schedule (requireRole)
- POST /audit-finding-create → internal_audit_record_finding (requireRole)
- POST /audit-capa-create → audit_capa_create (requireRole)
- POST /management-review-package → management_review_schedule (requireRole)
- POST /audit-mgmt-review → nc_management_review_summary, params {period_start, period_end} (requireRole)

VERIFY (cite file:line):
1. Every action string above EXISTS in `src/tools/dispatchers/businessDispatcher.ts` (grep each `case "<action>":`). I claim all 8 are present. Confirm or refute.
2. The FE client functions in `web/src/api/client.ts` call these EXACT paths with these EXACT param shapes (grep oshaIncidentCreate/oshaLog300/auditSchedules/auditSchedule/auditFindingCreate/auditCapaCreate/managementReviewPackage/auditMgmtReview). Flag any path or param-name mismatch (e.g. FE sends `{start_date,end_date}` but route forwards `{period_start,period_end}`).
3. **management-review-package**: FE `managementReviewPackage` sends `{start_date, end_date}` but I route to `manag
... [+690 chars truncated]

### Assistant | 2026-06-25T16:56:50.161Z

I'll review this change systematically. Let me start by reading the target file region and the helper, then verify each claim.

### Assistant | 2026-06-25T16:56:51.080Z

[tool_use: Read]

### User | 2026-06-25T16:56:51.988Z

[tool_result] 100	  // prism_business returns slimResponse({type:"text", text:JSON.stringify({success,data})}) with NO
101	  // content[] wrapper, so the production callTool (index.ts: result?.content?.[0]?.text) CANNOT peel it
102	  // and hands the route the RAW {type,text}. So we MUST parse the envelope first, then read .success/.data
103	  // -- otherwise res.data is the {type,text} object, the FE's Array.i
... [+9738 chars truncated]

### Assistant | 2026-06-25T16:56:52.896Z

[tool_use: Grep]

### User | 2026-06-25T16:56:53.897Z

[tool_result] 6433:          case "internal_audit_schedule": {
6443:          case "internal_audit_record_finding": {
6463:          case "internal_audit_annual_coverage": {
6469:          case "management_review_schedule": {
7255:          case "audit_capa_create": {
7501:          case "nc_management_review_summary": {
7744:          case "osha_record_incident": {
7796:          case "osha_300_log": {

### Assistant | 2026-06-25T16:57:01.705Z

I'm in plan mode but this is a read-only code review task — I'll investigate and report findings rather than write a plan. All 8 action cases exist in the dispatcher (confirmed by the grep above). Now I need to read each dispatcher case body for the param contracts, check the FE client, and verify the management-review-package mapping (the highest-risk row).

Let me read the relevant dispatcher case bodies and the FE client functions.

### Assistant | 2026-06-25T16:57:03.124Z

[tool_use: Read]

### User | 2026-06-25T16:57:04.032Z

[tool_result] 6425	            const { quotingEngine } = await import("../../engines/QuotingEngine.js");
6426	            const q = params as { job_spec?: any; jobSpec?: any; options?: any };
6427	            const jobSpec = q.job_spec ?? q.jobSpec;
6428	            if (!jobSpec) throw new Error("quoting_engine_estimate: job_spec (JobSpec) is required");
6429	            result = { success: true, data: quotingE
... [+5348 chars truncated]

### Assistant | 2026-06-25T16:57:04.066Z

[tool_use: Read]

### Assistant | 2026-06-25T16:57:05.005Z

[tool_use: Read]

### User | 2026-06-25T16:57:05.039Z

[tool_result] 7245	            const { departmentAuditDashboardEngine } = await import("../../engines/DepartmentAuditDashboardEngine.js");
7246	            result = { success: true, data: departmentAuditDashboardEngine.buildRow(params as any) };
7247	            break;
7248	          }
7249	          case "dept_audit_system_viz_roost": {
7250	            const { departmentAuditDashboardEngine } = await import("
... [+2333 chars truncated]

### Assistant | 2026-06-25T16:57:05.723Z

[tool_use: Read]

### User | 2026-06-25T16:57:06.119Z

[tool_result] 7495	          }
7496	          case "nc_close": {
7497	            const { nonConformanceAndCorrectiveActionEngine } = await import("../../engines/NonConformanceAndCorrectiveActionEngine.js");
7498	            result = { success: true, data: nonConformanceAndCorrectiveActionEngine.closeNC(params as any) };
7499	            break;
7500	          }
7501	          case "nc_management_review_summary"
... [+2197 chars truncated]

### User | 2026-06-25T16:57:06.954Z

[tool_result] 7740	            result = { success: true, data: { state: employeeTimeClockEngine.deriveState((params as any).punches ?? []) } };
7741	            break;
7742	          }
7743	          // ─── HOTEL/U-OSHA-300-LOG — federal OSHA 1904 injury & illness log ───
7744	          case "osha_record_incident": {
7745	            const { osha300LogEngine } = await import("../../engines/OSHA300LogEngine.js")
... [+5589 chars truncated]

### Assistant | 2026-06-25T16:57:14.266Z

All 8 dispatcher cases are confirmed present with their engine method bindings. Now I need the engine method signatures for the highest-risk row (management_review_schedule's scheduleReview) and the FE client functions. Let me read those.

### Assistant | 2026-06-25T16:57:16.619Z

[tool_use: Grep]

### Assistant | 2026-06-25T16:57:18.138Z

[tool_use: Grep]

### User | 2026-06-25T16:57:18.413Z

[tool_result] src\engines\AuditFindingToCAPABridgeEngine.ts:6: * KaizenLeanSigmaEngine. One bridge call: createCapaFromFinding(finding) →
src\engines\AuditFindingToCAPABridgeEngine.ts:67:  createCapaFromFinding(args: BridgeInput): BridgeRecord {
src\engines\AuditManagerEngine.ts:58:  scheduleAudit(params: Omit<AuditSchedule, "id" | "created_at">): AuditSchedule {
src\engines\InternalAuditCalendarEngine.ts:54:  
... [+2364 chars truncated]

### User | 2026-06-25T16:57:20.074Z

[tool_result] 2625-export async function oshaPpeRecords(): Promise<PrismResponse> {
2626-  return request('GET', '/erp/ppe-records');
2627-}
2628-
2629:export async function oshaIncidentCreate(params: Record<string, unknown>): Promise<PrismResponse> {
2630-  return request('POST', '/erp/osha-incident-create', params);
2631-}
2632:export async function oshaLog300(year: number): Promise<PrismResponse> {
2633-  re
... [+1614 chars truncated]

### Assistant | 2026-06-25T16:57:27.322Z

This confirms the highest-risk row. The FE `managementReviewPackage` sends `{start_date, end_date}` but `management_review_schedule` → `ManagementReviewEngine.scheduleReview` requires `chair_employee_id`, `scheduled_for`, and `≥2 attendees`. Let me read the full `scheduleReview` signature, the `osha-incidents` GET route's auth tier (sibling for tier-consistency), and the `auditMgmtReview`/`auditFindingCreate`/`auditSchedule` FE callers to verify param contracts plus the `osha_record_incident` engine input.

### Assistant | 2026-06-25T16:57:28.685Z

[tool_use: Read]

### Assistant | 2026-06-25T16:57:29.516Z

[tool_use: Read]

### User | 2026-06-25T16:57:29.696Z

[tool_result] 80	  private reviews: Map<string, ManagementReview> = new Map();
81	  private actionItems: Map<string, ReviewActionItem> = new Map();
82	  private nextReviewId = 1;
83	  private nextActionId = 1;
84	
85	  scheduleReview(args: {
86	    scheduled_for: string;
87	    chair_employee_id: string;
88	    attendees_employee_ids: string[];
89	  }): ManagementReview {
90	    if (!args.chair_employee_id) {
9
... [+2181 chars truncated]

### Assistant | 2026-06-25T16:57:30.012Z

[tool_use: Read]

### User | 2026-06-25T16:57:30.679Z

[tool_result] 300	      status: "closed" as const,
301	      closed_at: new Date().toISOString(),
302	    });
303	    this.ncs.set(nc.id, updated);
304	    return updated;
305	  }
306	
307	  /** §9.3.2(c) input — NC summary for management review meeting. */
308	  managementReviewSummary(args?: { since?: string }): {
309	    total_ncs: number;
310	    by_severity: Readonly<Record<NCSeverity, number>>;
311	    by
... [+1232 chars truncated]

### User | 2026-06-25T16:57:31.192Z

[tool_result] 140	
141	  /** Compute the federal reporting window (in hours from incident time). */
142	  reportingWindow(input: IncidentInput): { hours: number | null; reasons: string[] } {
143	    const reasons: string[] = [];
144	    let minHours: number | null = null;
145	
146	    if (input.severity === "death") {
147	      reasons.push("fatality — 8h reporting window (1904.39(b)(1))");
148	      minHours =
... [+1707 chars truncated]

### Assistant | 2026-06-25T16:57:39.110Z

I now have everything needed to verify the highest-risk row and the param contracts. Let me confirm the OSHA incidents GET sibling route's auth tier and check the FE callers for `auditMgmtReview`/`auditSchedule`/`auditFindingCreate` param shapes, plus verify whether `osha-incidents` GET (sibling) has requireRole — to judge tier consistency. I also want to check the AuditManagerPage to see what params the FE actually passes for the schedule/finding forms.

### Assistant | 2026-06-25T16:57:41.460Z

[tool_use: Grep]

### User | 2026-06-25T16:57:42.517Z

[tool_result] web\src\pages\AuditManagerPage.tsx:6:  managementReviewPackage,
web\src\pages\AuditManagerPage.tsx:102:      const response = await managementReviewPackage({
web\src\pages\AuditManagerPage.tsx:108:      setActionMessage(firstText(payload ?? {}, ['message', 'summary']) || 'Management review package generated.');
web\src\pages\AuditManagerPage.tsx:111:      setError(errorMessage(issue, 'Unable to ge
... [+1237 chars truncated]

### Assistant | 2026-06-25T16:57:42.570Z

[tool_use: Grep]

### User | 2026-06-25T16:57:43.658Z

[tool_result] H:\prism\mcp-server\web\src\pages\AuditManagerPage.tsx-43-    setError(null);
H:\prism\mcp-server\web\src\pages\AuditManagerPage.tsx-44-    try {
H:\prism\mcp-server\web\src\pages\AuditManagerPage.tsx-45-      const [auditResponse, findingResponse] = await Promise.all([
web\src\pages\AuditManagerPage.tsx:46:        auditSchedules(),
H:\prism\mcp-server\web\src\pages\AuditManagerPage.tsx-47-       
... [+3204 chars truncated]

### Assistant | 2026-06-25T16:57:48.932Z

Let me read the AuditManagerPage management-review-package call site (line 102) to see exactly what params the FE form sends, and check the osha-incidents/audit-findings GET sibling routes' auth tier in erp.ts for tier-consistency. Let me also check there's a corresponding `/erp/audit-findings` route (FE calls it but it wasn't in your new block — could be pre-existing).

### Assistant | 2026-06-25T16:57:49.974Z

[tool_use: Read]

### User | 2026-06-25T16:57:51.009Z

[tool_result] 95	  async function handleGeneratePackage() {
96	    if (!startDate || !endDate) return;
97	
98	    setActionLoading(true);
99	    setActionMessage(null);
100	    setError(null);
101	    try {
102	      const response = await managementReviewPackage({
103	        start_date: startDate,
104	        end_date: endDate,
105	      });
106	      const payload = asRecord(payloadOf(response)) ?? asRecord(
... [+595 chars truncated]

### Assistant | 2026-06-25T16:57:51.034Z

[tool_use: Grep]

### User | 2026-06-25T16:57:52.422Z

[tool_result] 171:  router.get("/osha-incidents", verifyToken, rfqRoute("osha_incidents", (req) => ({ year: req.query.year })));
190:  // GET /audit-schedules surfaces the annual coverage rollup (the page's schedule list); the FE sends no
194:  router.get("/audit-schedules", verifyToken, requireRole("lead", "hr_manager", "admin"), rfqRoute("internal_audit_annual_coverage", () => ({})));
195:  router.post("/audi
... [+251 chars truncated]

### Assistant | 2026-06-25T16:58:01.679Z

I now have full verification of the highest-risk row and all param contracts. The FE `managementReviewPackage` form sends only `{start_date, end_date}`, but the engine `scheduleReview` requires `chair_employee_id`, `scheduled_for`, and `≥2 attendees` — and will throw on the very first guard. Let me do one final check: confirm `auditSchedule` and the `auditMgmtReview` FE callers' actual usage, and verify whether there is an `/audit-findings` GET route (FE calls it pre-existing) — to be complete on the "consumer left unupdated" axis. Let me also confirm the auth tier of the pre-existing sibling write route (e.g. `/rfq-create`, `/credit-review-all`) and whether `osha_record_incident` engine's `assertNoPII` could cause silent failures.

### Assistant | 2026-06-25T16:58:04.029Z

[tool_use: Grep]

### Assistant | 2026-06-25T16:58:05.440Z

[tool_use: Grep]

### Assistant | 2026-06-25T16:58:06.128Z

[tool_use: Read]

### User | 2026-06-25T16:58:06.836Z

[tool_result] No matches found

### User | 2026-06-25T16:58:07.272Z

[tool_result] 127:  router.post("/rfq-create", verifyToken, rfqRoute("rfq_receive"));

### User | 2026-06-25T16:58:07.581Z

[tool_result] 54	  scheduleAudit(args: {
55	    scope: string;
56	    clauses_in_scope: string[];
57	    processes_in_scope?: string[];
58	    scheduled_for: string;
59	    lead_auditor_id: string;
60	    auditees_employee_ids: string[];
61	  }): InternalAudit {
62	    if (!args.scope || !args.lead_auditor_id) {
63	      throw new Error("InternalAuditCalendarEngine.scheduleAudit: scope + lead_auditor_id require
... [+2999 chars truncated]

### Assistant | 2026-06-25T16:58:16.454Z

I have everything I need. Let me note that `audit-findings` GET route was NOT found in erp.ts — the FE `auditFindings()` calls `/erp/audit-findings` which appears to have no route (a pre-existing dead panel, not part of this diff, but relevant to whether the page works end-to-end). Let me do a final confirmation grep for that route across erp.ts to be certain before reporting, and check the `auditSchedule`/`auditMgmtReview` FE wiring (no page calls them — they're exported but unused, which is fine for the diff but worth noting).

### Assistant | 2026-06-25T16:58:17.721Z

[tool_use: Grep]

### Assistant | 2026-06-25T16:58:18.641Z

[tool_use: Read]

### User | 2026-06-25T16:58:19.187Z

[tool_result] No matches found

### User | 2026-06-25T16:58:19.652Z

[tool_result] 40	
41	  const loadDesk = useCallback(async () => {
42	    setLoading(true);
43	    setError(null);
44	    try {
45	      const [auditResponse, findingResponse] = await Promise.all([
46	        auditSchedules(),
47	        auditFindings(),
48	      ]);
49	      setAudits(arrayFromPayload(auditResponse, ['audits', 'items', 'records']));
50	      setFindings(arrayFromPayload(findingResponse, ['findi
... [+697 chars truncated]

### Assistant | 2026-06-25T16:58:58.927Z

I have completed the review. All files read end-to-end where load-bearing (dispatcher cases, engine signatures, FE client, AuditManagerPage). Here is my verdict.

---

VERDICT: FAIL

summary: All 8 dispatcher action strings exist and are correctly bound, all 8 routes use `rfqRoute` (no envelope bypass), and the auth tiers match the established hotel/sibling precedent. However, the `management-review-package` row is a genuine P0 shape mismatch: the FE sends `{start_date, end_date}` to an action whose engine (`ManagementReviewEngine.scheduleReview`) requires `chair_employee_id` + `scheduled_for` + `≥2 attendees` and throws on the very first guard, so every invocation of that button is guaranteed to 400. The `auditMgmtReview` row (`nc_management_review_summary`) is the action that actually consumes a period window — strong evidence "package" was wired to the wrong action.

findings:
- [P0] `H:/prism/mcp-server/src/routes/erp.ts:198` (route) + `H:/prism/mcp-server/web/src/api/client.ts:2671-2676` (FE) + `H:/prism/mcp-server/web/src/pages/AuditManagerPage.tsx:102-105` (caller) -- `management-review-package` forwards the raw body `{start_date, end_date}` to `management_review_schedule` -> `ManagementReviewEngine.scheduleReview` (`H:/prism/mcp-server/src/engines/ManagementReviewEngine.ts:85-100`), which requires `chair_employee_id` (throws at :90-92), `scheduled_for` matching `^\d{4}-\d{2}-\d{2}$` (throws at :93-95), and `attendees_employee_ids.length >= 2` (throws at :96-100). The FE never sends any of these. `scheduled_for` is `undefined` -> fails the regex; even if start_date were renamed, the chair + attendees guards still throw. Result: the "Generate management review package" button 400s on every click (`success:false` -> rfqRoute 400 at erp.ts:116-118 -> the page's catch at AuditManagerPage.tsx:109). The button reads as a *report generator* over a date window, not a meeting scheduler. -- Fix: re-map `/management-review-package` to an action that takes a period and r
... [+4094 chars truncated]
