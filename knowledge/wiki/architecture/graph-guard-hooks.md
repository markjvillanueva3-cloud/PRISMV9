---
title: Graph guard hooks (stale-graph + hallucinated-node-id) -- GAC07/GAC08
type: architecture
layer: L4
created: 2026-06-15
slot: sierra
unit: GRAPH-AS-LLM-CONTEXT-MS0/U-GAC07+U-GAC08
tags: [pretooluse-hook, guard, stale-graph, node-id, hallucination, fail-open, system-viz]
related:
  - graph-context-lens-engine
  - spatial-address-book-engine
  - cheap-node-access-ms0
---

# Graph guard hooks (GAC07 + GAC08)

The final two units of GRAPH-AS-LLM-CONTEXT-MS0 (slot:sierra): two PreToolUse guards that
protect agents from acting on a stale graph (GAC07) or on fictional node-ids (GAC08).

## SAFETY DOCTRINE (both)

Both default to **advisory/warn**, NOT hard-block. The spec's literal "default deny" is a
fleet-wide footgun (GAC07 would deny read-only viz queries whenever the 644MB graph goes
stale between regens; GAC08 would deny creating any NEW engine id, which is not in the graph
yet). Hard-block is strictly opt-in via env, and the verifies_via tests run in block mode.
Both are cheap (no 644MB load) and fail-soft (emit `{}` / advisory on any error, never crash).
(R12-documented divergences from the spec defaults; per safety rails + R7.)

## U-GAC07 -- stale-graph-guard.mjs

PreToolUse guard: when a viz / graph-context tool runs against a stale `system-graph.json`,
warn (default) or deny (block mode). **statSync mtime only** -- never reads the 644MB content.
Self-gates to viz tool names (`viz|system.?graph|master_index|graph_context|graphrag|
spatial_resolve|node_card|community_summary`). Complements (does NOT duplicate) the existing
`sessionstart-graph-staleness-inject` (SessionStart) + `stop-graph-staleness-backstop` (Stop) --
this is the per-QUERY PreToolUse gate. Wired under the `^mcp__prism.*` PreToolUse matcher.

- future mtime (clock skew) -> treated as fresh (never blocks).
- missing graph -> advisory only (never blocks; bootstrap/build states).
- block mode emits `{decision:"deny", ...permissionDecision:"deny"}`.
- Knobs: `PRISM_STALE_GRAPH_GUARD` (warn|block|off, default warn) · `PRISM_STALE_GRAPH_HOURS` (6) ·
  `PRISM_VIZ_GRAPH_PATH`.

## U-GAC08 -- hallucinated-node-id-guard.mjs

PreToolUse guard: scans a **Bash command** (NOT Edit/Write content -- docs/code legitimately
mention ids; scanning content would be a false-positive storm) for canonical-prefix node-id
tokens. **Default = advisory, ZERO index load** (regex only) -> injects a "verify via
prism_session:node_card" reminder. **Block mode** (`PRISM_NODEID_GUARD_BLOCK=1`) validates each
id against the authoritative find-cache id-set and denies a CONFIRMED-absent id -- emitting BOTH
a stdout `decision:block` JSON AND exit 2 + stderr (covers the direct exit-2 contract and any
JSON-parsing runner). **FAILS OPEN**: a missing/empty/unreadable id-set -> advisory + exit 0,
NEVER a block (a stale/absent index must never deny a legitimate id). Wired under the `Bash`
PreToolUse matcher.

- Knobs: `PRISM_NODEID_GUARD_DISABLE=1` · `PRISM_NODEID_GUARD_BLOCK=1` · `PRISM_NODEID_GUARD_K` (20) ·
  `PRISM_VIZ_FINDCACHE_PATH`.

## Tests + 2-agent scrutiny

`graph-guards-gac07-gac08.test.mjs` -- 15 node:test cases (G07: warn/block/fresh/non-viz/off/
empty-stdin; G08: advisory/non-Bash/no-id/noisy-token-exclusion/block-known/block-unknown-deny/
fail-open/disabled), spawning each hook with piped stdin + env over temp graph/find-cache fixtures.
A+B scrutiny: A flagged the exit-2-without-stdout risk (resolved -- deny now emits stdout JSON
before exit 2, belt+suspenders); both flagged the `/g` ID_RE `lastIndex` reuse trap (reset in
scanIds). seekCard was REJECTED as the GAC08 validator -- it collapses "index stale" and "id
absent" to the same null, which would false-flag every real id on a stale offset index; the
authoritative find-cache id-set with fail-open is correct.

## Lessons

- A fleet-wide PreToolUse hook must default to advisory, not deny -- a wrong block on every
  matching tool call is catastrophic; make hard-block opt-in.
- An existence-checker that cannot distinguish "I can't tell" from "definitely absent" must NOT
  drive a block (fail-open). seekCard's null-on-both is exactly that trap.
- `process.exit()` after `process.stdout.write()` can truncate a piped stdout; for a deny that
  needs both stdout JSON and a nonzero exit, write first and accept the established exit-2 contract.
- A `/g` regex carries stateful `lastIndex` -- reset it per scan or a reused instance silently
  skips leading matches.

## Milestone GRAPH-AS-LLM-CONTEXT-MS0: 8/8 COMPLETE
GAC01 GraphContextLensEngine · GAC02 GraphRAGRetrievalEngine · GAC03 CodeGraphProjectionEngine ·
GAC04 DualChannelContextEngine · GAC05 SpatialAddressBookEngine · GAC06 CommunitySummaryEngine ·
GAC07 stale-graph-guard · GAC08 hallucinated-node-id-guard.
