---
name: reference_dispatcher_ghost_audit_2026_06_18
description: "Dispatcher ghost-action audit (romeo, backend/frontend-unblock) -- static detection is unreliable on PRISM's delegation/handler-table/nested-switch dispatchers; 0 confirmed ghosts this pass"
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.554Z
aliases: reference_dispatcher_ghost_audit_2026_06_18
---


# Dispatcher ghost-action audit (slot:romeo, 2026-06-18, operator goal: backend -> unblock frontend)

`scripts/audit-dispatcher-ghost-actions.mjs` sweeps all 111 dispatchers for "ghost actions" -- a name in a
`*_ACTIONS` enum with no handler (a frontend `lib/api.ts` -> bridge :3100 call that passes validation then
500s). Reuses the pure `findUnhandledActions(rawBody)` from `.claude/hooks/stop_on_unwired_assets.mjs`.

## KEY FINDING (R12): static detection is UNRELIABLE here -> 0 confirmed ghosts
First raw run flagged **197 "ghosts" across 8 dispatchers** -- IMPLAUSIBLE (real dispatchers don't ship most
of their API broken). Verified the smell: ALL flags are detector blind-spots, NOT real ghosts:
- **2-level engine delegation** (intelligenceDispatcher, materialProcessingDispatcher): `switch(name)` cases
  are ENGINE names; the ACTION (e.g. coating_select, process_route) is handled by a delegated sub-engine.
  findUnhandledActions sees the action in the enum, no matching case -> false flag.
- **Handler-table (Record)** (machiningKnowledgeBaseDispatcher 56/56, cadDrawingKnowledge 11/11): action->fn
  Record indexed by `[action]`; no literal `case`.
- **String-not-aware comment-strip** (ROOT CAUSE, verified): ppDispatcher `case "pp_label_stats"` (line
  6289) IS real, but findUnhandledActions flagged it unhandled because its comment-strip
  (`.replace(/\/\*[\s\S]*?\*\//g," ")`) is NOT string-aware -> a `/*` inside a glob STRING `"**/*.MIN"`
  started a fake block-comment that ate a 2000+ char span INCLUDING the real `case`. CONFIRMED bug in the
  shared Stop-gate detector `.claude/hooks/stop_on_unwired_assets.mjs` (~line 310); the Stop gate can
  false-block the same way. FIX = string-aware strip (match string/template literals first, keep them;
  strip only real comments) -- exact patch ROUTED to golf via chat-bus line 461 (I can't edit it:
  `.claude/hooks/*.mjs` is hard-blocked cross-worktree from slot:romeo -- harness-exec drift protection,
  correctly NOT bypassed). Residual edge: `/*` inside a regex literal still unhandled (rare).

The audit was reframed HONESTLY: **NOTHING is reported as a confirmed ghost** -- output is
`provenClean` (81, inline switch-case pattern, 0 unhandled) / `candidatesNeedRuntimeProbe` /
`routingNotStaticallyVisible` (high unhandled-fraction = detector-blind) / `noActionArray` (z.enum-only, 22).
Manually traced every low-count candidate (materialProcessing coating_select x2, ppDispatcher pp_label_* x3)
-> ALL handled (delegation / nested case). **0 real ghosts found; the dispatcher API surface is clean as
far as static + manual trace can tell.**

## RELIABLE method = RUNTIME dispatch probe (not static)
Confirming a ghost needs actually dispatching each action + checking for an "unknown action" error -- needs
the MCP bridge / `prism_safe` (down this session). The static audit is a TRIAGE (proven-clean vs
needs-probe), never a confirmed-bug reporter. Lesson: a static single-file regex cannot see delegation /
Record tables / nested switches -- high unhandled-fraction means detector-blind, never "N broken actions"
(same false-positive class as the 2026-06-11 `stop_on_unwired_assets` array-dispatch fix + the JM-audit
GAP-2 false alarm). Output: `state/shared/DISPATCHER-GHOST-ACTION-AUDIT.json`. UNCOMMITTED (lane guard).
