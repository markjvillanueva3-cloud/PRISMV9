---
name: reference_tsc_route_tool_2026_06_18
description: tsc-route-by-owner.mjs META-tool (self-updating per-owner tsc routing) + the BUILD_STATE-staleness/already-wired-Gilbert dedup lesson (slot:papa 2026-06-18)
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.230Z
aliases: reference_tsc_route_tool_2026_06_18
---


**tsc-route-by-owner.mjs — self-updating per-owner tsc routing (slot:papa 2026-06-18, BUILD-QUALITY-PAPA).** Commits `b0456226e5` (tool+8 tests) + `9fc175ac07` (fresh auto-doc).

**What:** parses a tsc log (or `--run-tsc`) and routes every error to the domain-owner slot that can safely fix it, so the per-owner queue never goes stale. Automates the one-shot hand routing (U-TSC-BASELINE-ROUTE + TSC-DEFER-ROUTING-2026-06-17.md). `scripts/tsc-route-by-owner.mjs` exports `parseTscErrors` (ANSI-strip+dedup) / `ownerForFile` / `routeByOwner` / `summarize` / `renderMarkdown` / `classifyViaOllama`.
**Use:** `node scripts/tsc-route-by-owner.mjs --run-tsc --out state/shared/specs/TSC-ROUTING-BY-OWNER-LATEST.md` (or `--log <path>`, `--json`, `--ollama-classify`).
**Ordering is load-bearing (tested):** CAM before MILL (hyperMILL contains MILL), RL before CAM (ReinforcementLearningCAMFeedback=india), WEDM before EDM; dir-fallback routes path-significant build-infra files (hooks/routes/mcp/index.ts -> papa). Live 89-error routing: delta:23, papa:12, mike:12, oscar:8, india/whiskey/kilo:6, echo:3, lima:2, charlie/hotel:1, 3 ambiguous UNKNOWN.
**Ollama-classify (opt-in):** offloads the UNKNOWN tail to local qwen2.5-coder:32b ($0, real HTTP, fail-soft, clearable timeout). HONEST: filename-only classification is APPROXIMATE (7b mis-routed ProcessIntelligenceRouter->mike), so results are labeled `ollamaSuggested` -- deterministic rules stay authoritative.

**3 real bugs caught by the test gate (R12 -- fix code, not the test):** (1) incomplete ANSI strip -> colorized tsc lines (the `\x1b[0m` reset between `TS####` and `:`) went unparsed; fix: strip ALL ANSI before matching. (2) basename-only routing lost the directory signal (`hooks/index.ts` -> basename `index.ts` matched no rule); fix: dir-fallback. (3) `opts.fetchImpl || globalFetch` fell through to a REAL 20s network call on explicit `fetchImpl: null`; fix: `"fetchImpl" in opts`.

**KEY DEDUP LESSON (verify-before-wire):** I nearly dispatched an agent to wire `GilbertEconomicSpeedEngine -> prism_calc` because BUILD_STATE.md's `MS-CRITWIRE/U-CW-07` row lists it unwired. It is ALREADY fully wired (calcDispatcher `gilbert_econ_speed_{compute,compare_vc,stats}`, commit U-WIRE-BACKLOG-SF-GILBERT 2026-05-20). The BUILD_STATE.md curated row is STALE; the LIVE audit (state/shared/UNWIRED-ENGINE-AUDIT-2026-06-18.json) correctly shows it wired, and the detector already handles lazy/dynamic imports (fixed 2026-06-18). **Always verify an "unwired" claim against the live audit + grep the dispatcher for `await import(".../<Engine>.js")` before wiring -- curated MS-rows rot.** The 18 truly-unwired are mostly "review-manually" external-CAD bridges (delta's domain judgment), not papa-clean.

**State:** papa-clean tsc clearables + clean wiring are EXHAUSTED (89 remaining = domain-entangled defers, owner-routed). Cron `1b150d99` (:17/:47, 7-day) sustains the papa loop. Sibling: [[reference_papa_tsc_infra_2026_06_17]] · [[reference_cloud_model_stack_2026_06_17]].
