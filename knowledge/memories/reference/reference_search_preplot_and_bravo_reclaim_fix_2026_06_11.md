---
name: reference_search_preplot_and_bravo_reclaim_fix_2026_06_11
description: SEARCH-PREPLOT (3-surface precomputed codebase search index + query CLI for 0-grep lookups) + the bravo post-/compact slot-reclaim fix (terminal-pin null-windowId silent no-op). Both shipped 2026-06-11 slot:alpha under /yolo-mode + Ultracode.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.151Z
aliases: reference_search_preplot_and_bravo_reclaim_fix_2026_06_11
---


# SEARCH-PREPLOT + bravo slot-reclaim fix (2026-06-11, slot:alpha)

## SEARCH-PREPLOT -- precomputed codebase search, 0 live grep
Operator /goal: "ensure codebase searches are done efficiently every time" + "run loops until all
possible searches for each domain are pre plotted" + "do the same thing for hooks". Verified first
(the hard lesson) that NO per-domain search-plot existed -- genuine new build.

- **Generator:** `scripts/generate-code-surface-plots.mjs` (deterministic, re-runnable). Emits THREE
  flat surface plots under `state/shared/search-plots/`:
  - `_engines.json` -- 3790 `mcp-server/src/engines/*.ts`, name-classified into 21 galaxies via
    `GALAXY_PATTERNS` (lathe:237 cam:205 wedm:196 cad:155 mill:106 post:106 ... + a fully-searchable
    `shared` bucket of 2542 generic-named engines). Entry: `{name,file,domain,purpose,exports<=12}`.
  - `_scripts.json` -- 1350 `scripts/**/*.mjs`.
  - `_hooks.json` -- 691 `.claude/hooks/*.mjs` with harness `trigger` (658 triggered).
- **Consumer:** `scripts/search-plot-query.mjs` -- `query "<term>" [--surface] [--domain] [--k] [--json]`.
  ONE cheap JSON read, ranked (name 3 / export 2 / purpose 1). Live: `kienzle`->KienzleForceModelEngine.ts,
  `spark --domain wedm`->WEDM spark engines, `terminal-pin --surface hooks`->the hook. 10 node:test.
- **Commits:** `e997289501` (scripts/hooks) -> `39d75dd011` (engines surface) -> `9c094f71a6` (query CLI).
- **Pivot lesson:** first tried a 33-domain **Workflow** (per-domain expert agents) for accurate
  classification; it STALLED 17min under box memory pressure (R14-stopped). Deterministic name-prefix
  classification is robust + good-enough for a SEARCH plot (the well-named mfg domains are accurate;
  generic engines fall to the searchable `shared` bucket). On a memory-pressured box, prefer
  deterministic generators over big agent fan-outs. Complements (does not duplicate) the graph-based
  `system-viz-query.mjs` + master-index/pre-grep stack -- this is a precomputed FLAT-surface lookup.
- **Refine:** extend `GALAXY_PATTERNS` to shrink the shared bucket; auto-wire into pre-grep nudge (deferred).

## Bravo post-/compact slot-reclaim fix (commit `ab9c547a6a`)
Operator bug: "bravo self compacted but didn't automatically check back into its slot." A
regression-hunter (fresh-context subagent) LIVE-reproduced it. ROOT CAUSE:
`session-start-terminal-pin.mjs:300-301` hard-exited with SILENCE when `resolveWindowId()` returned
null -- BEFORE reaching the priorSlot resolution + force-reclaim path. So a post-/compact window-id
miss (WT_SESSION absent + ancestor-walk flake, a known Win11 class) left the chat silently slotless.
The sticky-cache fallback DATA was intact (`lastKnownSlotForChat` returns the slot) but unreachable
past the gate -- every prior SLOT-DRIFT fix added richer fallback SOURCES, all downstream of this gate.
FIX: on null windowId, resolve the prior slot via the existing `readPriorSlotFromHandoff` (ps-pin ->
handoff -> sticky-cache chain) and force-reclaim BY NAME (preferSlot path needs no windowId),
double-gated by `shouldForceReclaim` (compact/clear only) + `peerBlocksForceReclaim` (never evicts a
healthy peer). Also: `--terminalWindowId` made conditional (empty mis-parsed as boolean true) + the
chat-slots read made PRISM_ROOT-aware. 8 node:test. Sister: [[reference_self_compaction_state_and_dedup_lesson_2026_06_11]].
