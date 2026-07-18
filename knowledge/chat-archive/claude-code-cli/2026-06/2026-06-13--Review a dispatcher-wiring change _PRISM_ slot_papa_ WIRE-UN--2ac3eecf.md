---
type: "chat-session"
source: "claude-code-cli"
session_id: "2ac3eecf-3fc4-4cd2-90ac-8c73ec7f4bde"
title: "Review a dispatcher-wiring change (PRISM, slot:papa, WIRE-UNWIRED-PAPA/U-WIRE-TE"
date: "2026-06-13"
first_ts: "2026-06-13T06:58:27.589Z"
last_ts: "2026-06-13T07:00:10.155Z"
cwd: "H:\\prism-slot-papa"
messages: 17
user_msgs: 7
assistant_msgs: 10
raw_file: "H:/.claude/projects/H--prism-slot-papa/2ac3eecf-3fc4-4cd2-90ac-8c73ec7f4bde/subagents/agent-abcf2b179c667e290.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:06"
---

# Review a dispatcher-wiring change (PRISM, slot:papa, WIRE-UNWIRED-PAPA/U-WIRE-TE

> **claude-code-cli** | 2026-06-13 | 17 msgs (7 user / 10 assistant) | cwd: H:\prism-slot-papa
> Raw: `H:/.claude/projects/H--prism-slot-papa/2ac3eecf-3fc4-4cd2-90ac-8c73ec7f4bde/subagents/agent-abcf2b179c667e290.jsonl`

## Transcript

### User | 2026-06-13T06:58:27.589Z

Review a dispatcher-wiring change (PRISM, slot:papa, WIRE-UNWIRED-PAPA/U-WIRE-TENANT-ONBOARD). Read each file END TO END. The change wires `TenantOnboardingRunbookEngine` (read-only surfaces) into the `prism_dev` dispatcher with 4 new actions: `tenant_onboarding_stats`, `tenant_onboarding_runbook`, `tenant_onboarding_report`, `tenant_onboarding_tenants`.

Files to verify (read all fully):
1. H:\prism\mcp-server\src\engines\TenantOnboardingRunbookEngine.ts — the engine (singleton `tenantOnboardingRunbookEngine`; the class is now `export class`; read methods: getStats, getRunbook, generateReport, listTenants). Confirm the class export is additive/safe (no behavior change).
2. H:\prism\mcp-server\src\tools\dispatchers\devDispatcher.ts — verify: (a) `import type { TenantTier, TenantStatus } from "../../engines/TenantOnboardingRunbookEngine.js"` near line 26; (b) the 4 action strings in the `as const` action array (after the loki_* block, ~line 656); (c) the 4 switch cases before `default:` (~line 11410). Confirm enum entries, schema, and switch cases all MATCH (same 4 action names, no typos) — the MockMCPServer z.enum-bypass gap means a missing enum entry passes tests but fails prod.
3. H:\prism\mcp-server\src\schemas\devActionSchemas.ts — verify the 4 `tenant_onboarding_*` zod schema entries in ACTION_DEV_SCHEMAS (~line 100); `tenant_onboarding_tenants` fields (tier/status/region enums) must match the dispatcher case's param reads and the engine's TenantTier/TenantStatus types.
4. H:\prism\mcp-server\src\__tests__\devDispatcher.uwireTenantOnboard.test.ts — the round-trip test.

Confirm: every action in the enum has BOTH a schema entry AND a switch case; the engine method names called (getStats/getRunbook/generateReport/listTenants) exist; lazy import path correct; the wire mirrors the proven sibling pattern (loki_*/chaos_*/backup_* in the same files).

NOTE for context (not a defect to fix): the project currently has ~637 pre-existing tsc errors from a peer's (charlie)
... [+295 chars truncated]

### Assistant | 2026-06-13T06:58:32.295Z

I'll read all four files end to end before forming any verdict.

### Assistant | 2026-06-13T06:58:32.725Z

[tool_use: Read]

### Assistant | 2026-06-13T06:58:33.385Z

[tool_use: Read]

### User | 2026-06-13T06:58:52.387Z

[tool_result] 1	/**
2	 * TenantOnboardingRunbookEngine — U-LPR-OPS-ONBOARD
3	 *
4	 * Tenant-onboarding runbook state machine:
5	 *   MOU → KMS key provision → ACL setup → RBAC assignment →
6	 *   data-residency routing → telemetry mTLS cert issuance
7	 *
8	 * Each step declares prerequisites. The engine enforces dependency ordering
9	 * (a step cannot start until all prerequisites are complete), tracks per-tena
... [+24166 chars truncated]

### User | 2026-06-13T06:58:58.006Z

[tool_result] 1	/**
2	 * Dev Action Schemas - Zod schemas for prism_dev dispatcher actions
3	 */
4	import { z } from "zod";
5	
6	// ── RoadmapIntelligenceEngine shared sub-schemas (ENGINE-WIRE: prism_dev roadmap_intel_* actions) ──
7	const _riMilestoneUnit = z.object({
8	  id: z.string(), name: z.string(), description: z.string(),
9	  estimated_hours: z.number().nonnegative().optional(),
10	  actual_hours: z.nu
... [+12506 chars truncated]

### Assistant | 2026-06-13T06:59:01.759Z

Good. Now let me read the devDispatcher.ts to find the enum and switch cases for the tenant_onboarding actions.

### Assistant | 2026-06-13T06:59:02.853Z

[tool_use: Grep]

### Assistant | 2026-06-13T06:59:03.643Z

[tool_use: Grep]

### User | 2026-06-13T06:59:05.797Z

[tool_result] 655-  "loki_retention",
656-  "loki_query",
657-  \ U-WIRE-TENANT-ONBOARD \ WIRE-UNWIRED-PAPA: TenantOnboardingRunbookEngine read surfaces (4 read actions, slot:papa 2026-06-13).
658:  "tenant_onboarding_stats",
659:  "tenant_onboarding_runbook",
660:  "tenant_onboarding_report",
661:  "tenant_onboarding_tenants",
662-] as const;
663-
664-const CODE_TEMPLATES: Record<string, string> = {
--
11414- 
... [+1358 chars truncated]

### User | 2026-06-13T06:59:06.107Z

[tool_result] 23-import type { BackupTier, BackupCategory } from "../../engines/BackupRestoreDrillEngine.js";
24-import type { ChaosCategory, ChaosCadence, ChaosSeverity, ChaosEnvironment, ExecutionStatus } from "../../engines/ChaosDrillSchedulerEngine.js";
25-import type { LogLevel } from "../../engines/LokiLogSinkEngine.js";
26:import type { TenantTier, TenantStatus } from "../../engines/TenantOnboardingRunbo
... [+2003 chars truncated]

### Assistant | 2026-06-13T06:59:09.310Z

Let me read the rest of the `tenant_onboarding_tenants` switch case and then the test file.

### Assistant | 2026-06-13T06:59:10.533Z

[tool_use: Read]

### Assistant | 2026-06-13T06:59:10.832Z

[tool_use: Read]

### User | 2026-06-13T06:59:27.026Z

[tool_result] 1	/**
2	 * devDispatcher U-WIRE-TENANT-ONBOARD round-trip tests — TenantOnboardingRunbookEngine.
3	 *
4	 * Validates the 4 new read actions (tenant_onboarding_stats / _runbook / _report /
5	 * _tenants) wire through prism_dev and that the engine's 6-step runbook,
6	 * prerequisite-ordering state machine, and aggregate reporting behave per its
7	 * NIST SP 800-53 / SOC 2 contract.
8	 *
9	 * Pattern
... [+10749 chars truncated]

### User | 2026-06-13T06:59:27.034Z

[tool_result] 11432	          case "tenant_onboarding_tenants": {
11433	            const { tenantOnboardingRunbookEngine } = await import("../../engines/TenantOnboardingRunbookEngine.js");
11434	            const filter = {
11435	              tier: typeof params.tier === "string" ? (params.tier as TenantTier) : undefined,
11436	              status: typeof params.status === "string" ? (params.status as Tenant
... [+740 chars truncated]

### Assistant | 2026-06-13T07:00:10.155Z

I have read all four files end to end. Now I can form the complete verdict.

---

## Dispatcher Wiring Review — U-WIRE-TENANT-ONBOARD

**Engine:** `TenantOnboardingRunbookEngine`
**File:** `H:\prism\mcp-server\src\engines\TenantOnboardingRunbookEngine.ts`
**Dispatcher:** `devDispatcher` (`prism_dev`)
**Actions:** `tenant_onboarding_stats`, `tenant_onboarding_runbook`, `tenant_onboarding_report`, `tenant_onboarding_tenants`

---

### Step 1 — Engine File

`TenantOnboardingRunbookEngine.ts` is a full, non-stub implementation. The class is `export class TenantOnboardingRunbookEngine` and the singleton is exported as `export const tenantOnboardingRunbookEngine = new TenantOnboardingRunbookEngine()`. The four methods called by the dispatcher cases exist and have the correct signatures:

- `getStats()` — line 473, returns `OnboardingStats`
- `getRunbook()` — line 513, returns `OnboardingStep[]`
- `generateReport(now?)` — line 424, returns `OnboardingReport`
- `listTenants(filter?)` — line 258, accepts `{ tier?, status?, region? }`, returns `Tenant[]`

`TenantTier` (`"enterprise" | "mid-market" | "smb"`) and `TenantStatus` (`"pending" | "in_progress" | "active" | "suspended"`) are both exported. The class export is purely additive — no behavior was changed, the prior singleton pattern is intact.

---

### Step 2 — devDispatcher.ts

**2a. Import type (line 26)**
`import type { TenantTier, TenantStatus } from "../../engines/TenantOnboardingRunbookEngine.js";` — present, correct path, correct exported names.

**2b. z.enum entries (lines 658–661)**
All four action strings appear in the `as const` action array, in order, immediately after the `loki_*` block:
```
"tenant_onboarding_stats"
"tenant_onboarding_runbook"
"tenant_onboarding_report"
"tenant_onboarding_tenants"
```

**2c. Switch cases (lines 11417–11441)**
All four cases are present, each with a lazy import of the singleton and no static top-level import of the engine class:

- `tenant_onboarding_stats` — calls `tenantO
... [+5236 chars truncated]
