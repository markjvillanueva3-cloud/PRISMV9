---
name: reference_quebec_toolcrib_inventory_health_2026_06_27
description: "Quebec FE-BE wiring loop -- Kienzle Tool Crib header now surfaces real backend inventory health; verified 143/162 pages already wired, 9 dead; jsdom/test gotchas."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.139Z
aliases: reference_quebec_toolcrib_inventory_health_2026_06_27
---


# Quebec — Kienzle Tool Crib inventory-health wire (2026-06-27, commit 6d7d559255)

Operator goal: apply the Claude Design build `Kienzle Tool Crib.dc.html` and wire ALL backend
to the new frontend (web + electron + ios/android). This session shipped iter-1 of that loop.

## What shipped
- Committed the Kienzle Tool Crib page (`mcp-server/web/src/pages/ToolCribPage.tsx`, was UNTRACKED — the
  prior `U-KIENZLE-TOOLCRIB-FOUNDATION` commit landed only the data/geometry core) + **deepened its one
  live backend wire**: the header subtitle now surfaces real `InventoryReport.total_items` +
  `below_reorder.length` (`CRIB N TOOLS · M LOW STOCK / STOCK OK`, amber/emerald), sourced from the
  existing `toolCribApi.inventory()` TanStack query. Previously those fields were fetched-then-DROPPED
  (only `below_reorder` fed CribTab's life-map). Fail-soft + `Array.isArray` shape-guarded.
- 22/22 tests green; 2-arm per-file scrutiny PASS (both reviewers).

## Verified gap map (the real "wire EVERYTHING" state — NOT fabricated)
`node scripts/audit-page-wiring.mjs` → **162 SPA pages: 143 WIRED, 9 DEAD, 10 static-ok.** So at the
page-data-flow level the FE↔BE goal is ~88% done. The 9 dead pages (the backlog): CADRegenerationDashboard,
PostProcessor, LatheStudio, MillTurn, Swiss, MillStudio, MillingResults, ValueStream, WireEdmResults.
Report: `state/shared/dashboards/PAGE-WIRING-AUDIT.{json,md}`. Tool Crib was "wired" but SHALLOW.

## Tool Crib backend contract (for the next wires)
`/api/v1/tool-crib/{inventory,reorder,checkout,checkin}` → `prism_calc:tool_crib_*` → `ToolCribEngine`
(`mcp-server/src/routes/toolCrib.ts`, `web/src/api/toolCrib.ts`). The page consumes only `inventory`;
`reorder`/`checkout`/`checkin` are still UNWIRED to the UI (but the design has no explicit UI surface for
them, so wire faithfully or leave). KNOWN INERT: CribTab life-map joins crib `name` vs inventory
`description` — they never match (design seed names ≠ catalog descriptions), and the report returns only
`below_reorder`. A robust per-row life wire needs the engine to return all items + a join id (calc galaxy).

## Test/infra gotchas hit (save the next quebec session time)
- **jsdom serializes inline `color:#36D399` as `rgb(54,211,153)`** — assert the rgb form, not the hex.
- `OffsetsTab` renders MILL headers `TOOL TAG / GAUGE (in) / DIA (in) / WEAR` (NOT `LEN`/`DIA`; `LEN` is
  lathe-only). A stale test asserting `LEN` was a real "element never appears" failure (masquerades as a
  waitFor timeout). Read the component for the actual rendered text before asserting.
- `getByText(/Tool Crib/i)` and `getByText(/OD rough turning/i)` are AMBIGUOUS (heading vs "Tool crib"
  tab; crib row vs triage panel "...reach tight") → use exact strings or `getAllByText().length`.
- Under the 26-chat fleet load, testing-library `waitFor` default (1000ms) flakes — bump to 4000/6000ms.
- `mcp-server/web` has NO local vite/vitest config or setup file (inherits from a parent).

## Honest constraints this session
- **Hermes proxy is DOWN** (HUNG, serves nothing — xAI OAuth likely expired). "Use Hermes to the max"
  degrades to parallel Claude subagents + Workflow. Operator must `hermes auth reset xai-oauth` + restart.
- Shared-tree `index.lock` contention from reaped peers — wait for the lock to clear; don't remove a
  non-stale lock. The slot worktree `H:/prism-slot-quebec` is the cleaner long-term commit lane.

## In flight
Background Workflow `plan-dead-page-wiring` (10 Sonnet agents) is producing a per-page wiring spec +
prioritized buildable queue for the 9 dead pages → drives iter-2+ of the loop.
