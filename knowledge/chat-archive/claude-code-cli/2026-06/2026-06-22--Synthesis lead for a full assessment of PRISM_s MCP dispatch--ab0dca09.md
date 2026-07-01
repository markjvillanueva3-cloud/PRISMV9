---
type: "chat-session"
source: "claude-code-cli"
session_id: "ab0dca09-bdc3-4069-83d6-963041f28da6"
title: "Synthesis lead for a full assessment of PRISM's MCP dispatcher layer. GROUNDING "
date: "2026-06-22"
first_ts: "2026-06-22T13:58:14.739Z"
last_ts: "2026-06-22T13:59:46.762Z"
cwd: "H:\\prism"
messages: 2
user_msgs: 1
assistant_msgs: 1
raw_file: "H:/.claude/projects/H--prism/ab0dca09-bdc3-4069-83d6-963041f28da6/subagents/workflows/wf_bfbc1792-5ff/agent-ae8e21ed77be194ba.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:21"
---

# Synthesis lead for a full assessment of PRISM's MCP dispatcher layer. GROUNDING 

> **claude-code-cli** | 2026-06-22 | 2 msgs (1 user / 1 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/ab0dca09-bdc3-4069-83d6-963041f28da6/subagents/workflows/wf_bfbc1792-5ff/agent-ae8e21ed77be194ba.jsonl`

## Transcript

### User | 2026-06-22T13:58:14.739Z

Synthesis lead for a full assessment of PRISM's MCP dispatcher layer. GROUNDING (deterministic scout, slot:bravo 2026-06-22): 111 dispatchers, 14257 total actions (mcp-server/data/docs/DISPATCHER_DIGEST.md, regenerated today). Integrity detectors already run: dispatcher-import-liveness = 0 DEAD named imports; audit-dispatcher-engine-methods = 61 MISSING across 10 dispatchers (ledger state/shared/DISPATCHER-ENGINE-METHOD-AUDIT.{json,md}); audit-dispatcher-ghost-actions writes state/shared/DISPATCHER-GHOST-ACTION-AUDIT.json. NOTE: digest flags several dispatchers "(no server.tool found)" incl aiReasoningDispatcher (619 actions!), aiDispatcher (0), cplDispatcher (54), awarenessMiddleware (0), claudeAccountDispatcher (0) -- investigate whether genuinely unregistered/dead or a digest false-read. Big: camDispatcher 2488, calcDispatcher 1475, devDispatcher 1043, businessDispatcher 1042, aiReasoningDispatcher 619, cadDispatcher 600.

6 dimension reports below. Answer the operator: "do we ENHANCE or BUILD MORE dispatchers?"


===== DIMENSION: inventory-coverage =====
Confirmed: `cadAutomationDispatcher`, `camFunctionDispatcher`, and `securityDispatcher` are NOT in index.ts (only `machineLiveDispatcher` and `machineSetupDispatcher` matched). `machineDispatcher` (69 actions) also absent. Now I have everything to produce the full report.

---

## Findings

### 1. Digest False-Read — "no server.tool found" is a Generator Bug

The digest generator (`scripts/generate-dispatcher-digest.mjs`) scans for `server.tool(` as a single-line token. All flagged dispatchers DO have `server.tool(` calls — the call spans a line break (e.g., `aiReasoningDispatcher.ts:5337-5338`: `export function registerAIReasoningDispatcher(server: { tool: Function }): void {` / `server.tool(`). The generator's regex misses the split. **This affects the reported action count of 0 for 16 entries in the digest table — the counts are wrong, not the code.**

Confirmed false-reads (file:line cited):
- `aiReasoningDi
... [+64081 chars truncated]

### Assistant | 2026-06-22T13:59:46.762Z

## MCP Dispatcher Layer Assessment — Synthesis

**Grounding:** 111 dispatcher files, 14,257 advertised actions, 6 dimension audits completed.

---

## Verdict: 85% ENHANCE/HARDEN, 15% BUILD-NEW

The infrastructure is fundamentally sound. 99 of 111 dispatchers are correctly registered. The registration loop, Zod middleware, dedup guard, and per-request server pattern all work. The debt is concentrated: 61 broken method calls, 57 phantom actions, a 20K-line monolith, a silent schema pass-through, and 52% of dispatchers with zero test coverage. These are surgical fixes, not architectural rebuilds.

The 15% BUILD-NEW allocation covers four genuinely absent domain surfaces (probing, ERP write-back, GNN/neural inference, fleet/slot management) where no existing dispatcher provides even a thin skeleton.

---

## Health Scorecard

| Dimension | Rating | Evidence |
|---|---|---|
| **Integrity** | 7/10 | 0 dead imports, 0 ghost actions, but 61 engine-method mismatches cause runtime throws; 57 phantom actions (cpl=54, ai=3) |
| **Schema** | 5/10 | `validateActionParams` in 96/111 dispatchers, but pass-through default (`dispatcherMiddleware.ts:83`) means ~40% of calc actions and unknown fraction of cam actions are unvalidated at runtime; 2,334 `params as any` casts |
| **Test coverage** | 3/10 | 58/111 dispatchers (52%) have zero test files; round-trip literal action coverage ~1.7%; 25 UnwiredBatch tests bypass the routing layer entirely |
| **Reachability** | 8/10 | 99/111 registered correctly; `cadAIStateMachine.ts:57` is the only P0 frontend broken path; tango-dormant group is documented |
| **Coverage** | 7/10 | All major manufacturing domains present; grinding (10 actions), 5-axis (15), secondary ops (3), industry compliance (4) are thin but exist |
| **Structure** | 4/10 | `camDispatcher.ts` at 20,822 lines / 2,488 actions is a single-file 17% of the fleet; sfc_ is 3-way duplicated; `businessDispatcher` contains lathe_agi and academy foreign actions |

---

## P0 — Must-F
... [+12240 chars truncated]
