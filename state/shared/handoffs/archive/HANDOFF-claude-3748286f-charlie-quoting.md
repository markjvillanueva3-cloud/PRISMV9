---
session: claude-3748286f
topic: charlie-quoting
slot: charlie
written_at: 2026-05-26T14:50:00.000Z
machine: DESKTOP-N7MI1VB
family: Claude
session_key: claude-3748286f
status: active
---

# HANDOFF: claude-3748286f (charlie)
Updated: 2026-05-26T14:50:00.000Z
Family: Claude | Machine: DESKTOP-N7MI1VB | Session: claude-3748286f

## STATE
Charlie slot reorient 2026-05-26 — mid-session slot-switch from sierra after operator correction.

## RESUME
**U-QP-SAMPLING-BREADTH-V2 (iter41)** — close iter39 mill-skew artifact. iter40 closed the NUMBERED_PREFIX R12 but machine_class is still mill:60 / lathe:5 / wire-edm:4. 5.83x spread came from one mill cluster, not 3-way variance. Bump per-class TARGET in `scripts/quoting-baseline-bootstrap.mjs::balanceByClass` (cap mill at 25, raise lathe + wire-edm to 25 each), re-run with `--scan-archive --balance-by-class --limit 75`, verify per-class variance separately. After: U-QP-REAL-REVENUE-EXTRACT (wire DocustrataHistoricalPricingTrainerEngine to replace placeholder `actual_revenue_usd = size_bytes x 0.0001`).

## CONTEXT

### Slot situation
Operator corrected mid-session: this chat is charlie (quoting), not sierra (PSN). The bind-enforce hook bound to sierra initially and I shipped 2 sierra units before switching:
- `c9e3992e84` U-PSN-HYBRID-MCP-VERIFY — sierra
- absorbed into papa `f875c0f141` — U-CAG-HOOK-INJECT — sierra
Slot now claimed for charlie. **0 charlie commits this session.**

### Charlie pipeline (latest = iter40)
- `scripts/quoting-baseline-bootstrap.mjs` walks JM Die archive to seed `state/shared/quoting/baseline-records.json`
- iter40 `ae75d99e9b`: NUMBERED_PRISM_NON_CUSTOMER filter — closed iter39 R12 (24/24 tests)
- iter39 `4f6a1c92fc`: BALANCED-SAMPLING — 5.83x SPREAD, but mill-skewed (open artifact)
- iter38 `a38d790324`: FIRST_REAL_CUSTOMER_CHAIN — 2.67x spread on real JM customers
- iter37 `491ed8602c`: EXTRACTOR_DEPTH2 — hybrid + machine NON_CUSTOMER filters
- iter36 `eafec0ccb9`: JM_DIE_LAYOUT_AUDIT — STRUCTURAL: real layout is `{MACHINE}/{CUSTOMER}/{file}` NOT `{CUSTOMER}/{MACHINE}`

### Iter41 picks (priority order)
1. **U-QP-SAMPLING-BREADTH-V2** — per-class TARGET for real 3-way variance
2. **U-QP-REAL-REVENUE-EXTRACT** — wire DocustrataHistoricalPricingTrainerEngine
3. **U-QP-MATERIAL-PRICE-FROM-SHEET** — replace hardcoded `$50` with registry lookup

### R12 disclosures
- `/loop` ended iter5/20 (YELLOW zone). Operator may re-invoke for iter6+.
- Sierra detour shipped real work but attribution is split (sierra + papa-absorbed). Future charlie commits should route through `H:/prism-slot-charlie` worktree.
- Test-harness flakiness this session: `node --test` hits Windows subprocess-spawn timeout under fleet load (120+ peer loops). Prefer vitest where possible.

### Cross-refs
- `reference_psn_hybrid_mcp_verify_2026_05_26` (sierra iter27)
- `reference_cag_router_hook_inject_2026_05_26` (sierra iter28)
- `reference_articles_memory_cag_2026_05_26` (peer india article synth)
