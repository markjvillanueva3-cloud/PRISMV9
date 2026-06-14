---
name: reference-d4-action-traces-2026-05-16
description: OBSIDIAN-INTELLIGENCE-MS3/D4 U-ACTION-TRACES shipped — ActionTraceEngine append-only agent-write trace log + prism_session:action_trace_query + system-viz overlay
aliases: reference_d4_action_traces_2026_05_16
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.074Z
---


# D4 U-ACTION-TRACES shipped (OBSIDIAN-INTELLIGENCE-MS3)

2026-05-16, slot **charlie** (claude-c0f06dee), /loop continuation post-/compact. Ship commit `f432ace730f57d1332b6d66b1fcd70c9a7d7f15c` on `cad-fusion-live-ms0` (main tree). Envelope flip same session: MS3 `completed_units` 7→8/24, D4 `status=completed` + `ship_record`.

**Deliverables (4 files, 899 ins):**
- `mcp-server/src/engines/ActionTraceEngine.ts` — append-only JSONL logger (`state/shared/action-traces.jsonl`) + `queryTraces` filter/limit/order + inline strict Zod `ActionTraceEdgeSchema` `{ts,agent,sessionId,promptHash,tool,target,action}` + frozen singleton.
- `mcp-server/src/tools/dispatchers/sessionDispatcher.ts` — wired `prism_session:action_trace_query` (ACTIONS enum + lazy-import case; absolute log path stripped to basename through MCP surface).
- `mcp-server/src/schemas/sessionActionSchemas.ts` — `action_trace_query` `.strict()` entry, all filters optional.
- `mcp-server/src/__tests__/ActionTrace.test.ts` — 22 hermetic cases (`PRISM_ACTION_TRACE_FILE` temp-file, env save/restore).
- `scripts/system-viz-action-overlay.mjs` — read-only staging overlay (`promptHash`+`sessionId` dropped from `recent[]`, atomic write + tmp-orphan sweep, honest empty-state).

**Quality:** 22/22 vitest PASS. D4 type-clean vs the repo's pre-existing tsc baseline. Per-file scrutiny gate: **8 dispatches (4 files × 2 arms) all PASS**, 4 P0 + 7 P1 fixed AT the gates (not deferred). End-of-task 3-of-3: all arms (opus+claude+codex/analyst) PASS against explicit `--target f432ace7` (clean 37KB diff — avoided the D2 mid-review peer-churn failure by committing first then scrutinizing the SHA).

**Key design decisions worth remembering:**
- **ts normalized to canonical UTC Z in `recordTrace`** makes the `sinceTs` lexical-sort invariant true *by construction* — Arm A's shared P1. Pattern: when a downstream string-compare assumes a canonical form, normalize at the write boundary, don't validate-and-hope.
- **Path-leak P1 (Arm B, close-out-blocking):** returning the absolute log `file` through the MCP surface is a zero-benefit host-layout disclosure → strip to basename. Generalizable: any engine result spread through a dispatcher `ok({...result})` — audit string fields for host paths.
- **"Dead guard" that isn't:** the `limit<=0` fallback looked dead to Arm A (dispatcher schema `.positive()` gates it) but is load-bearing for direct-API callers (test + future hook bypass the schema). Resolved by *documenting intent*, not deleting legitimate defense. Lesson: a guard unreachable via ONE caller path is not dead if other callers lack the gate.
- **WIRE status:** engine is non-orphan via the query action; `recordTrace` write-path has no production caller yet (future PostToolUse hook, out of D4 scope, documented in-file) — honest-scoping, not a stub.

**Cumulative this charlie chat (across compactions):** 9 MS3 units — A2+C1+C3+D1+G1+G3+D2+D4 mine; C2 hotel-forked.

Sister: [[reference_e1_ideablock_extractor_2026_05_15]] · [[feedback_scrutiny_gate_finds_hostile_payload_class]] (per-file gate consistently catches real bugs — D4 added: ts-tz, path-leak, env-clobber). Wiki: `knowledge/wiki/architecture/action-trace-engine.md`.

**Next pickable for charlie MS3:** D3 (U-CONFLICT-RESOLUTION, deps none) · D5 (U-CONTEXT-EVAL-GATE, deps D4 ✓ now) · B-series cron workflows (B1-B6, deps A1 partial). Avoid F2 (spec-blocker, PDFKnowledgeIngestEngine missing) + E1-E4 (hotel-series) + C2 (hotel-forked).
