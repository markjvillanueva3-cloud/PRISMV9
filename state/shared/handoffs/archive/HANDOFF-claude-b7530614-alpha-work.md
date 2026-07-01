---
session: claude-b7530614
topic: alpha-work
slot: alpha
written_at: 2026-05-19T02:10:00.000Z
source: live-chat
---

# HANDOFF — alpha-work — system-index sidecar

## RESUME

Build **U-MASTER-INDEX-SIDECAR** — the complete design is on disk at
`state/shared/specs/UNITS/U-MASTER-INDEX-SIDECAR.md`. Read that spec first;
it is fully self-contained.

FIRST: `git add state/shared/specs/UNITS/U-MASTER-INDEX-SIDECAR.md` and commit
it — `[MAIN] [DEV-TOOL-CONFLICT-AUDIT-2026-05-17]/U-MASTER-INDEX-SIDECAR: spec`.
It is on disk but uncommitted (peer `.git/index.lock` contention blocked the
commit last session; retry — the lock clears).

THEN the 5-file build (per the spec):
1. NEW `scripts/build-graph-index.mjs` — offline generator. Reads the full
   372 MB `state/shared/system-viz/system-graph.json`, emits a compact
   ~15 MB `state/shared/system-viz/system-graph-index.json` sidecar:
   `{schemaVersion, generatedAt, sourceMtimeMs, nodeCount, nodes[compact],
   inverted: token->[nodeIdx]}`. Reuse `tokenize` + the blob construction
   from `master-index-search-lib.mjs` `loadGraph` EXACTLY (import `tokenize`)
   so the index matches — hit-scoring drifts otherwise. Atomic write,
   fail-loud on graph-missing/0-nodes.
2. NEW `scripts/build-graph-index.test.mjs` (node:test) — sidecar shape,
   posting-index validity, tokenize parity, atomic write, real-fs E2E.
3. EDIT `scripts/lib/master-index-search-lib.mjs` `loadGraph` — additive
   sidecar fast-path: if `system-graph-index.json` exists AND fresh
   (`sidecar.sourceMtimeMs >= graph mtime`) AND schemaVersion matches ->
   rebuild `{nodes, inverted}` from the sidecar, return (<1.5 s). Stale /
   missing / schema-mismatch -> fall through to the EXISTING legacy path
   UNCHANGED (zero regression). Knob `PRISM_GRAPH_SIDECAR_DISABLE=1`.
   Returned shape MUST stay `{nodes, inverted}` so `searchGraphHits` /
   `runMasterIndexSearch` work unchanged.
4. EDIT `scripts/regen-viz.mjs` — add a post-merge stage spawning
   `build-graph-index.mjs` (after the graph is final; non-fatal on failure).
5. EXTEND `scripts/lib/master-index-search-lib.test.mjs` — fresh-sidecar /
   stale / schema-mismatch / disable-knob / no-sidecar-regression cases.

Per-file scrutiny gate applies (2 reviewers after EACH file). Then commit
`[MAIN] [DEV-TOOL-CONFLICT-AUDIT-2026-05-17]/U-MASTER-INDEX-SIDECAR`, tick
`loop-state.mjs tick --session b7530614`, continue the /loop on the alpha
queue (`state/shared/slot-task-queues.json` -> queues.alpha, 83 units;
U-VIZ-F11-CROSS-LOCK + U-CLEAR-AUTO-RESUME already done; next after sidecar
is U-ACTIVATE-BEFORE-BUILD-PRECHECK — its spec Pre-flight #2 is STALE, it is
buildable, and the sidecar makes its master-index search full-coverage).

## STATE

Post-compact session (slot alpha, claude-b7530614, loop-state b7530614 iter
2/30 running) shipped 2 real alpha units + spec'd a 3rd:

- **U-VIZ-F11-CROSS-LOCK** — committed `4022e99606`. Shared
  `.system-graph-write.pid` PID cross-lock for the 3 `system-graph.json`
  writers (regen-viz, system-viz-on-commit, system-viz-add-node flushQueue).
  NEW `scripts/lib/system-graph-write-lock.mjs` (+25-case test). 7-file
  changeset, 10 reviewer agents across 5 per-file rounds; all P0/P1/P2 closed
  (exit-code collision vs merge-guard, on-commit 3rd-writer wiring, TIER-1b
  test coverage, seed-ghost WIRE-NOTE).
- **U-CLEAR-AUTO-RESUME** — committed `c004ad1cb8` (+ `5b16e56c68`). Wired a
  SessionStart `clear` matcher arm to `session-start-auto-resume.mjs` so
  `/clear` gets the same handoff auto-resume as `/compact`. Harness-config
  unit — deliverable is the user-global `H:/.claude/settings.json` (outside
  the repo). VERIFIED LIVE: auto-resume matchers `[compact,clear]` in C: AND
  H: (parity true), smoke `source=clear` accepted, compact path
  regression-free. NOTE: `5b16e56c68` incidentally re-tracked
  `mcp-server/.claude/settings.json` via an over-broad git-add glob (benign —
  valid JSON, historically tracked); `c004ad1cb8` is the honest correction.
- **U-MASTER-INDEX-SIDECAR** — spec WRITTEN + on disk, UNCOMMITTED (peer
  index.lock). Diagnosis of the user-reported "system index issue":
  `master-index-search-lib.mjs` `loadGraph` caps at 200 MB; the merged
  `system-graph.json` is 372 MB / 243,687 nodes -> the JULIETT F1 fallback
  silently routes every master-index search to the 28 MB architecture-graph
  (~24,940 nodes — degraded, not blind; search WORKS at ~380 ms). Raising the
  cap to 512 MB was MEASURED at 138 s / 1.6 GB RSS per call -> certain
  fleet-OOM (12 chats x 1.6 GB) + the 2-5 s hook timeout -> reverted clean.
  The user chose the inverted-index sidecar fix (moves the 138 s parse
  offline). Full design in the spec file.

## CONTEXT TO PRESERVE

- The handoff helper `per-agent-handoff.mjs write` and general Bash calls
  began returning exit 255 late this session — the known
  [[reference_harness_hang_prevention]] degradation mode (long session + 12
  concurrent chats + 80-96% host commit memory). This handoff was written
  via the Write tool directly because the helper failed. `/compact` (fresh
  session) is the recovery.
- The cap-raise measurements (138 s / 1.6 GB; 380 ms architecture fallback)
  are decision evidence — do NOT re-measure; they are recorded in the spec.
- system-graph.json is healthy at 372 MB (an earlier "0 MB" reading was an
  `awk` column mis-parse — false alarm).
- alpha real queue (`slot-task-queues.json` queues.alpha) = 83 units; the
  carryover/misc-mined entries were removed earlier per a user correction
  ("they weren't real units").
