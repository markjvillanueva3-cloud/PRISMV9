---
type: "chat-session"
source: "claude-code-cli"
session_id: "2d0621bf-a688-4f84-9b31-5683407dd137"
title: "Review the new file H:/prism/scripts/audit-page-wiring.mjs (and its test H:/pris"
date: "2026-06-25"
first_ts: "2026-06-25T20:39:19.193Z"
last_ts: "2026-06-25T20:40:38.330Z"
cwd: "H:\\prism"
messages: 22
user_msgs: 9
assistant_msgs: 13
raw_file: "H:/.claude/projects/H--prism/2d0621bf-a688-4f84-9b31-5683407dd137/subagents/agent-aca4e9c7dfa6f7812.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:09"
---

# Review the new file H:/prism/scripts/audit-page-wiring.mjs (and its test H:/pris

> **claude-code-cli** | 2026-06-25 | 22 msgs (9 user / 13 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/2d0621bf-a688-4f84-9b31-5683407dd137/subagents/agent-aca4e9c7dfa6f7812.jsonl`

## Transcript

### User | 2026-06-25T20:39:19.193Z

Review the new file H:/prism/scripts/audit-page-wiring.mjs (and its test H:/prism/scripts/audit-page-wiring.test.mjs) end-to-end. It is a deterministic per-page backend-wiring auditor for the PRISM SPA (mcp-server/web/src/pages). It classifies each .tsx page as wired/partial/dead/static-ok by detecting api-client imports, raw /api fetches, and mock/dead signals, then writes state/shared/dashboards/PAGE-WIRING-AUDIT.{json,md}.

Context it must NOT duplicate: scripts/audit-frontend-backend-contract.mjs (route-prefix coverage) and scripts/audit-fe-route-action-contract.mjs (route->dispatcher action). This auditor checks the THIRD seam: does each PAGE call live backend data.

Grade PASS or FAIL and report P0/P1/P2 findings with file:line. Focus on:
1. Correctness of the regex detection (false-positive / false-negative risks in classifyPage). Are there page-import patterns it would miss (e.g. `import * as api`, alias `@/api`, dynamic import())? Are dead-signal regexes prone to false flags?
2. The isMain guard (resolve(process.argv[1]) === fileURLToPath(import.meta.url)) — correct on Windows? Does importing from the test re-run main()?
3. R12/R9: does the tool over-claim? It labels itself "conservative heuristic" — is that honest, or could a 'wired' verdict mask a genuinely dead page?
4. Any crash risks (empty dir, unreadable file, non-tsx).
5. Convention conformance with the other scripts/audit-*.mjs (ASCII-only, exit codes, output paths).

Be concise: PASS/FAIL + numbered findings with severity + the one-line fix each. Do not rewrite the file.

### Assistant | 2026-06-25T20:39:23.576Z

I'll review both files end-to-end. Let me start by reading them.

### Assistant | 2026-06-25T20:39:24.050Z

[tool_use: Read]

### Assistant | 2026-06-25T20:39:24.105Z

[tool_use: Read]

### User | 2026-06-25T20:39:25.393Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * audit-page-wiring.mjs -- per-PAGE backend-wiring liveness audit for the PRISM SPA.
4	 *
5	 * The THIRD seam in the FE<->BE wiring stack. The two existing audits cover:
6	 *   - audit-frontend-backend-contract.mjs : does a backend ROUTE exist for each SPA /api prefix?
7	 *   - audit-fe-route-action-contract.mjs  : does each route's callTool action exist on its dispa
... [+10530 chars truncated]

### User | 2026-06-25T20:39:26.048Z

[tool_result] 1	// Tests for audit-page-wiring.mjs classifier core.
2	// Run directly: node scripts/audit-page-wiring.test.mjs  (node:test auto-runs on exit;
3	// `node --test <file>` reports 0 tests in this env -- see RECENT-REGRESSIONS 2026-06-17.)
4	import { test } from 'node:test';
5	import assert from 'node:assert/strict';
6	import { classifyPage, inferDomain, STATIC_OK } from './audit-page-wiring.mjs';
7	
... [+3830 chars truncated]

### Assistant | 2026-06-25T20:39:32.292Z

Now let me verify a few claims by examining the sibling audit scripts and the actual pages directory to ground my findings.

### Assistant | 2026-06-25T20:39:33.250Z

[tool_use: Read]

### Assistant | 2026-06-25T20:39:35.115Z

[tool_use: Bash]

### User | 2026-06-25T20:39:35.180Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * audit-fe-route-action-contract.mjs -- CLI for the FE-route to dispatcher-action verifier.
4	 *
5	 * U-FE-ROUTE-ACTION-CONTRACT (slot:sierra). Reports every REST route that calls a
6	 * dispatcher action that does not resolve -- the silent 200+{error} footgun the SPA's
7	 * `if (!res.ok)` cannot catch. P0 = a MOUNTED router with such a call (live breakage).
8	 *
9	 
... [+2697 chars truncated]

### Assistant | 2026-06-25T20:39:36.713Z

[tool_use: Bash]

### User | 2026-06-25T20:39:39.173Z

[tool_result] const gaps = [], ok = [];
for (const [pre, fileCount] of [...spaPrefixes].sort()) {
  (covered(pre) ? ok : gaps).push({ prefix: pre, referencingFiles: fileCount });
}

const result = {
  generatedAt: new Date().toISOString(),
  note: "Prefix-level STATIC heuristic. A gap = a SPA /api prefix whose domain is served by NO backend route. Mounts in routes/index.ts are resolved to their router source fi
... [+1748 chars truncated]

### User | 2026-06-25T20:39:40.670Z

[tool_result] A3ReportPage.tsx
AILearningDashboardPage.tsx
AdditiveQuotePage.tsx
AdminPage.tsx
AlarmPage.tsx
AuditManagerPage.tsx
BatchPlanningPage.tsx
BlueprintQuotePage.tsx
BusinessSuitePage.tsx
CADAIStatePage.tsx
CADRegenerationDashboardPage.tsx
CADRegressionDashboardPage.tsx
CalculatorPage.tsx
CalibrationPage.tsx
CamStrategyPage.tsx
CapacityPlanningPage.tsx
CaptureOpsPage.tsx
CheckoutOutcomePage.tsx
CncOpsP
... [+568 chars truncated]

### Assistant | 2026-06-25T20:39:45.599Z

There's a `recovery/` subdirectory. Let me check what's in it and verify how real pages actually import their API client (to ground false-positive/false-negative risk against live code).

### Assistant | 2026-06-25T20:39:47.818Z

[tool_use: Bash]

### Assistant | 2026-06-25T20:39:50.519Z

[tool_use: Bash]

### User | 2026-06-25T20:39:51.476Z

[tool_result] === recovery dir contents ===
recoveryUtils.ts
=== sample of real import patterns across pages (api/hooks/barrel) ===
     78 from '../api/client'
     35 from '../api/types'
      8 from '../api/knowledge'
      5 from '../hooks/useWebSocket'
      4 from '../api/calculatorData'
      3 from '../api/speedfeed'
      3 from '../api/parts'
      3 from '../api/orphanRoutes'
      1 from '../hooks/u
... [+1108 chars truncated]

### User | 2026-06-25T20:39:54.381Z

[tool_result] === how is the api client actually imported? namespace/alias/default? ===
=== count pages using @/ alias path style at all ===
0
=== dynamic import() of api ===
mcp-server/web/src/pages/CalculatorPage.tsx:12264:      const { fetchJson } = await import('../api/requestCore');
mcp-server/web/src/pages/CalculatorPage.tsx:12265:      const { getRequestHeaders } = await import('../api/client');
mcp-serv
... [+284 chars truncated]

### Assistant | 2026-06-25T20:39:58.085Z

Key findings confirmed against live code. Let me verify two remaining things: whether the `recovery/recoveryUtils.ts` (a `.ts`, non-`.tsx`) is correctly skipped, and check the `.recovery/` subdir page handling plus whether dead-signal regexes false-flag on real wired pages.

### Assistant | 2026-06-25T20:40:01.401Z

[tool_use: Bash]

### User | 2026-06-25T20:40:05.700Z

[tool_result] === does any WIRED page contain a dead-signal token that would false-trip? (mock-identifier / sample-data) ===
2  RootCausePage.tsx

### Assistant | 2026-06-25T20:40:38.330Z

I have everything I need. Let me compile the review.

## Review Summary

VERDICT: PASS

summary: `audit-page-wiring.mjs` is a sound, honest third-seam auditor. Its core classification logic matches how the live pages actually wire (`../api/client`, `../hooks/use*`, raw `/api` fetch), the `STATIC_OK`/dead/partial/wired ladder is reasonable, the `isMain` guard is correct on Windows, and it does not over-claim (it self-labels conservative and a 'dead' verdict only narrows candidates). I found no P0/P1 correctness or crash defects. The findings below are real-but-deferrable accuracy/robustness gaps the tool's own "confirm before wiring" disclaimer already covers.

findings:

- **[P2] `audit-page-wiring.mjs:43,89` — dynamic `import('../api/...')` is a false-negative.** `RE_API_IMPORT` only matches static `from '...'` clauses, so a page wired exclusively via `await import('../api/client')` would be classed `dead`. This is live: `CalculatorPage.tsx:12264-12265` and `ViewerPage.tsx:40,54` both wire through dynamic import. CalculatorPage is saved by its other static imports, but a page wired *only* dynamically would be mislabeled. Fix: add an alternation for `import\(\s*['"][^'"]*\/(?:api|hooks)\/` to `hasBackendPath` detection.

- **[P2] `audit-page-wiring.mjs:108` — `>=2 dead signals` downgrades a genuinely-wired page to `partial`.** Verified false-positive: `RootCausePage.tsx` imports `../api/client` yet trips 2 signals (`mockX`/`Math.random`), so it would be reported `partial` in the buildable queue despite being wired. This is the documented conservative-over-flag direction (safe, not silent-dead), but it adds queue noise. Fix: none required given the disclaimer; optionally require the signal to be outside a comment, or note in the `note` field that `partial` is advisory.

- **[P2] `audit-page-wiring.mjs:51-52` — `mock-identifier`/`MOCK_const` regexes flag legitimate tokens.** `\bmock[A-Z]` matches `mockData` but also any innocent identifier like `mockingMode`, and `\bM
... [+3075 chars truncated]
