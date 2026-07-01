---
name: reference_tango_discovery_sweep_2026_06_15
description: tango 6-class discovery-sweep workflow (52 findings/32 confirmed) + 5 meta-tool fail-loud/date-stamp fixes + fresh audit regen + romeo handoff. slot tango 2026-06-15.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.218Z
aliases: reference_tango_discovery_sweep_2026_06_15
---


**TANGO DISCOVERY SWEEP (slot tango, 2026-06-15)** under operator "continue hunting inefficiencies and dormant or underutilized high roi builds" (Ultracode on). Ran a 6-class parallel discovery-sweep **Workflow** (`wf_471937e7-027`, 58 agents, 944 tool-uses, ~50min, 2.15M subagent tokens): multi-modal sweep -> adversarial verify-on-disk per finding. **52 findings: 32 confirmed, 16 partial, 4 correctly REFUTED** (the adversarial verify worked — it debunked 4 false positives incl. a "broken schema import" non-bug). Fanout-gate blocked at cost 24>=12; override = `[SCOPED]` in the Workflow tool's TOP-LEVEL `description` param (the gate reads `tool_input.description`, NOT `meta.description` inside the script — `agent-fanout-pressure-gate.mjs:156-158`).

**KEY LESSON — verify-on-disk in the CURRENT tree beats the agents' stale-branch read.** The sweep agents ran in the `H:/prism-slot-tango` worktree (~1900 commits behind `cad-fusion-live-ms0` per [[reference_tango_stale_slot_worktree_2026_05_29]]); their line numbers + several findings were stale. Tango re-verified every wiring item against the current tree before surfacing — e.g. the agent said "prism_pp dispatcher commented out"; current tree has it WIRED (index.ts:237/780). DROP stale-branch findings; trust current-tree verification.

**5 META-TOOL FIXES (auto-fix-inline, all confirmed by the sweep's silent-fail + stale-audit agents):**
1. `audit-unwired-engines.mjs` (commit `f004aa153d`) — **date-stamp OUTPUT** (was frozen `UNWIRED-ENGINE-AUDIT-2026-05-07.json` -> read as 39d stale FOREVER; the file is UNTRACKED so every worktree LACKING it regenerated every SessionStart = 180s waste fleet-wide) + fail-loud on unreadable consumer file (was silent false-UNWIRED). `PRISM_UNWIRED_AUDIT_DATE` override.
2. `build-state-snapshot.mjs` (`529e5d65eb`) — fail-loud on unwired-audit refresh failure (was `catch{}` "no problem" feeding stale/missing audit to every BUILD_STATE consumer).
3. `node-staleness-rank.mjs` (`81f47be059`) — injectionAudit no longer returns false `"fresh"` when no settings parsed (now `"unknown"` + `configsRead`/`configErrors`); appendHistory writes `null` not `undefined` for the delegated `ghost`/`orphan`/`ghostPct` (printHuman already guarded the delegated case).
4. `reconcile-roadmap-drift.mjs` (`50d65c4c93`) — loadEnvelope fail-loud on corrupt-but-present envelope (was `catch{}` -> milestone reconciled envelope-less -> stale index status wins = silent close-out debt).
5. `mcp-server/scripts/unwired-audit.mjs` (`502b811ecf`) — derive REPO_ROOT from `fileURLToPath(import.meta.url)` (was hardcoded `H:/prism` -> wrote to WRONG repo from any worktree) + date-stamp UNWIRED-REFINED output.

**Regenerated fresh audit** -> `UNWIRED-ENGINE-AUDIT-2026-06-15.json`: **45 UNWIRED** (was 50 stale — 5 wired in the 39d gap). Re-ranked: 10 dormant / 32 leaf / 3 maybe-wired (down from 5 — WetRun engines correctly reclassified). NOTE: UNWIRED-ENGINE-AUDIT files are UNTRACKED-by-convention (local per-machine artifacts; `git ls-files` empty) — do NOT commit them; the date-stamp fix makes each worktree regen once/24h not every-SessionStart.

**HIGHEST-ROI DORMANT FIND (surfaced to romeo, NOT wired — romeo's lane):** 3 dispatchers — `mlDispatcher` (prism_ml ~100 actions), `localDispatcher`, `resourceExtractionDispatcher` (14 actions) — have FILES PRESENT but ZERO `index.ts` registration on cad-fusion-live-ms0 = ~115+ MCP actions permanently unreachable. Plus 13 confirmed dormant engines (DesignToFloorPipelineEngine 1335L, NXOpenAssemblyDrawingEngine 1221L, reactiveChainBootstrap 632L, the EntryExit/IntelligentSequencing Adapters) + Engine-vs-Adapter dedup pairs (wire-Adapter-then-retire-Engine). Full report: `state/shared/specs/TANGO-DISCOVERY-SWEEP-2026-06-15.md` (commit `259d96ebc4`); posted to chat bus for romeo.

Wiki: [[unwired-ranker-consumer-fanin]]. Sister: [[reference_unwired_ranker_consumer_fanin_2026_06_15]] (the ranker-layer fixes), [[reference_audit_wired_via_engine_2026_06_10]] (sierra's WIRED-VIA-ENGINE audit fix, already in the canonical tool), [[reference_dormant_engine_triage_2026_06_10]] (sierra's prior dormant triage).
