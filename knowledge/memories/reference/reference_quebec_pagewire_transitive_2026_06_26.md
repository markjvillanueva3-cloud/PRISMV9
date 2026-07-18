---
name: reference_quebec_pagewire_transitive_2026_06_26
description: audit-page-wiring blind-spot fix — thin wrapper pages wired via child/context were mis-flagged dead; 13->9 honest dead. The FE->BE buildable queue is now trustworthy.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.139Z
aliases: reference_quebec_pagewire_transitive_2026_06_26
---


**U-PAGEWIRE-TRANSITIVE (slot:quebec, 2026-06-26, commit 2d5da0543b)**

`scripts/audit-page-wiring.mjs` — the source of the "wire the entire backend to the new Claude-Design frontend" buildable queue — inspected ONLY each page file's own body. Thin wrapper pages that delegate data-fetching to imported child components / context providers (e.g. `WireEdmStudioPage -> StepReview -> ../../api/wedmStudio`) had no backend call in their own body and were mis-flagged **dead**. Same blind-spot class as the engine->engine fix in [[reference_audit_wired_via_engine_2026_06_10]].

**Fix:** `classifyPage` left UNTOUCHED (back-compat). Added `classifyPageTransitive` — if a page is dead-by-self, BFS its relative import graph (depth<=2, cycle-safe visited set, fileCap=120, fs reads confined to `web/src`) and reclassify dead->wired only on a GENUINE data op.

**`childHasBackendWiring` is STRICTER than the page-level heuristic** (this was the 2-arm-scrutiny P1 — a bare `/api` import is OK at page level but transitively a shared UI/infra import would poison every importing page):
- TRUE only on: raw `/api` fetch, a react-query hook, a request helper (`request/apiGet/apiPost/callTool/fetchJson`), or a CALL/member-access of a symbol imported from a NON-infra `/api/` client.
- EXCLUDES: `/hooks/` UI hooks (`useHaptics`), api-infra modules (`requestCore/client/types/...`), and **type-only imports** (`import type {...}`, type-position `import('../api/types').Foo` — the `features/operating-system/contracts.ts` adapter seam, which is types-only and Claude-owned-backend-is-final-authority).

**Live result:** 161 pages, **13 false-dead -> 9 honest dead**. 4 genuine transitive-wired: `WireEdmStudioPage<-StepReview`, `EmployeePortalPage<-liveProvider`, `CaptureOpsPage/MessagesPage<-WorkspaceAICopilot`. `ValueStreamPage` (documented 501-stub) correctly STAYS dead. Tests 10->29 (incl every FP class: useHaptics, requestCore, types-only, cycle, depth-2, member-call). schemaVersion 1.0.0->1.1.0; `+transitiveWired` count in the dashboard.

**The 9 trustworthy dead pages = the FE->BE buildable queue** (confirm each before wiring per the auditor's conservative contract): CADRegenerationDashboardPage(todo-wiring), PostProcessorPage(coming-soon, echo domain), LatheStudioPage/MillTurnPage/SwissPage(lathe, whiskey domain), MillStudioPage/MillingResultsPage(mill), ValueStreamPage(501-stub), WireEdmResultsPage(wedm).

**Pre-existing deferred (out of scope):** `classifyPage` page-level still counts commented-out imports as wired (arm-C P2) — needs a shared `stripComments` if the page-level FP ever bites.

**Headline BLOCKER (unchanged):** the Kienzle Tool Crib page (`Kienzle Tool Crib.dc.html`) is still blocked on the design asset — no `.dc.html` on disk, URL 403, no `claude_design` MCP / `/design-login` in this env. Backend already bridged (`/api/v1/tool-crib`, `web/src/api/toolCrib.ts`). Drop-zone: `mcp-server/web/design-imports/`. Per [[reference_quebec_fe_be_wiring_state_2026_06_25]] Claude Design owns UI; quebec owns DATA/API wiring.
