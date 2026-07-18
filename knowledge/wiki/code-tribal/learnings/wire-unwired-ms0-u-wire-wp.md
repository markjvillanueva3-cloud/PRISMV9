# WIRE-UNWIRED-MS0/U-WIRE-WP — [MAIN] [WIRE-UNWIRED-MS0]/U-WIRE-WP: wire WiringPotentialEngine into prism_dev (2 read actions, engine-pair test already exists)

**Commit:** `003ebf46a595` · **By:** markjvillanueva3-cloud · **At:** 2026-05-17T08:31:32-05:00
**Tags:** wire-unwired-ms0, u-wire-wp, auto-distilled

## Subject
[MAIN] [WIRE-UNWIRED-MS0]/U-WIRE-WP: wire WiringPotentialEngine into prism_dev (2 read actions, engine-pair test already exists)

## Body
```
[MAIN] [WIRE-UNWIRED-MS0]/U-WIRE-WP: wire WiringPotentialEngine into prism_dev (2 read actions, engine-pair test already exists)

Wires 2 pure-read meta-wiring helpers through prism_dev:
- wp_analyze        -> analyze(engineName, opts)
- wp_analyze_batch  -> analyzeBatch(engineNames[], opts)

Meta-tool: ranks dispatcher candidates for any orphan engine using
3 signals (heuristic name-match + MasterIndex semantic + DISPATCHER_CAPACITY).
Weight blend: W_SEMANTIC=0.45 + W_CAPACITY=0.40 + W_DOCS_DEPTH=0.15.

Note: engine-direct test file (WiringPotentialEngine.test.ts) already
exists from CLEANUP-MS0/U-CLEANUP-C1. This commit adds ONLY the
dispatcher round-trip layer.

PATH-TRAVERSAL GUARD (schema restriction): the engine's opts param
includes `capacityFile?: string` (LLM-supplied arbitrary file path —
attack surface) plus `capacityReport?: object` (non-serializable) and
`masterIndex?: function` (non-serializable). NONE of these forward
through the dispatcher schema. Only engine_name + min_confidence +
top_k are exposed. Engine falls back to its default
state/shared/DISPATCHER_CAPACITY.json and the masterIndexEngine
singleton.

Verified by explicit test: PATH-TRAVERSAL GUARD test parses a hostile
payload {engine_name:'X', capacityFile:'/etc/passwd'} through the
schema and asserts parsed.data has ONLY the engine_name key — no
capacityFile leak.

DoS guards:
- engine_name: 1-256 chars
- engine_names batch: 1-100 items
- min_confidence: [0, 1]
- top_k: 1-10 (matches engine's MAX_TOP_K)

Test coverage (dispatcher only): 14/14 vitest PASS:
- Zod schema validation (4 — required + caps + path-traversal guard)
- wp_analyze (4 — shape/echo + 3-engine variability with engineName
  round-trip + routing proof candidate_count parity + top_k cap)
- wp_analyze_batch (3 — count parity + 3-input order-preserving
  variability + routing proof batch length)
- error envelope (3 — missing engine_name / top_k > 10 / batch > 100)

First call takes ~7s (MasterIndex graph cold load on system-graph.json);
subsequent calls are ~5-15 ms per engine name as the engine doc says.

Why a meta-wiring tool now: this engine is recursively useful for the
ongoing /loop wire-unwired work. Calling wp_analyze with a candidate
engine name returns ranked dispatcher targets + confidence + capacity
warnings, replacing the manual 'grep methods + check singleton'
inspection step.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (4)
- .../__tests__/dispatcher.wiringPotential.test.ts   | 195 +++++++++++++++++++++
- mcp-server/src/schemas/devActionSchemas.ts         |  27 +++
- mcp-server/src/tools/dispatchers/devDispatcher.ts  |  39 ++++-
- 3 files changed, 260 insertions(+), 1 deletion(-)

## Lessons surfaced in commit body
- Note: engine-direct test file (WiringPotentialEngine.test.ts) already
- tile

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 003ebf46a595`
- Milestone envelope: `mcp-server/data/milestones/WIRE-UNWIRED-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._