# PAGE-WIRING-AUDIT

> Deterministic per-page backend-wiring liveness audit (`scripts/audit-page-wiring.mjs`).
> Generated: 2026-06-27T17:46:18.299Z
> CONSERVATIVE heuristic -- "dead" = no backend call in the page OR its child-component/context import graph (depth<=2); confirm before wiring. Route-prefix coverage: audit-frontend-backend-contract.mjs; route->action: audit-fe-route-action-contract.mjs.

Pages: **162** -- wired **143** / partial **0** / dead **9** / static-ok **10**
> 4 page(s) wired via child-component/context import graph (not a direct call in the page body).

## By domain

| domain | wired | partial | dead | static-ok |
|---|---:|---:|---:|---:|
| academy | 7 | 0 | 0 | 0 |
| business-erp | 37 | 0 | 0 | 0 |
| cad | 6 | 0 | 1 | 0 |
| cam-post | 9 | 0 | 1 | 0 |
| lathe | 6 | 0 | 3 | 0 |
| mill | 2 | 0 | 2 | 0 |
| other | 32 | 0 | 1 | 9 |
| quality | 8 | 0 | 0 | 0 |
| quoting | 17 | 0 | 0 | 1 |
| sfc | 3 | 0 | 0 | 0 |
| shop-floor | 12 | 0 | 0 | 0 |
| wedm | 4 | 0 | 1 | 0 |

## Buildable queue -- dead + partial (9)

| status | domain | page | LOC | api modules | signals |
|---|---|---|---:|---|---|
| dead | cad | CADRegenerationDashboardPage.tsx | 473 | - | todo-wiring |
| dead | cam-post | PostProcessorPage.tsx | 1181 | - | coming-soon |
| dead | lathe | LatheStudioPage.tsx | 521 | - | - |
| dead | lathe | MillTurnPage.tsx | 94 | - | - |
| dead | lathe | SwissPage.tsx | 111 | - | - |
| dead | mill | MillStudioPage.tsx | 673 | - | - |
| dead | mill | MillingResultsPage.tsx | 617 | - | - |
| dead | other | ValueStreamPage.tsx | 411 | - | - |
| dead | wedm | WireEdmResultsPage.tsx | 439 | - | - |
