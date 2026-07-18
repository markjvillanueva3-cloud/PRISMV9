---
unit_id: U-MASTER-INDEX-SIDECAR
milestone: DEV-TOOL-CONFLICT-AUDIT-2026-05-17
owner_slot: alpha
wave: DEV-INFRA
cost: M
status: pending
depends_on: []
unblocks: [U-ACTIVATE-BEFORE-BUILD-PRECHECK, full-graph-master-index-recall]
roi_score: 9.0
generated_at: 2026-05-18
generator_version: alpha-investigation-b7530614
---

# U-MASTER-INDEX-SIDECAR — pre-built inverted-index sidecar for master-index search

## Problem (measured this session, slot alpha, 2026-05-18)
`scripts/lib/master-index-search-lib.mjs` `loadGraph()` caps graph loads at
**200 MB** (`PRISM_GRAPH_MAX_BYTES` default). The merged
`state/shared/system-viz/system-graph.json` is **372 MB / 243,687 nodes**, so
the JULIETT F1 fallback (`master-index-search-lib.mjs:~150`) silently routes
every search to the **28 MB architecture-graph.json (~24,940 nodes)** — full
engine/dispatcher/hook/skill/action/layer coverage but NO L11/L12 filesystem-
coverage leaves.

**Measured (do NOT re-measure — these are the decision evidence):**
- `loadGraph()` on the 28 MB architecture fallback: **~380 ms** cold (works fine).
- `loadGraph()` on the full 372 MB graph (cap raised to 512 MB, then reverted):
  **137,952 ms (138 s)** + **1.6 GB RSS** per call. Catastrophic — the hook
  `master-index-precheck-inject.mjs` fires on EVERY UserPromptSubmit with a
  2-5 s timeout; 12 concurrent chats × 1.6 GB ≈ 19 GB on an 80-96%-commit host.
- Raising the byte cap is therefore **non-viable** (operator-confirmed reverted).
- The lib's own docstring (`loadGraph` JSDoc, ~line 139) already names this fix:
  *"Pre-built inverted-index sidecars are the deeper fix (tracked for follow-up)."*

The 138 s cost is fine **offline** (once, at regen time). It is fatal **online**
(every prompt). The sidecar moves the cost offline.

## Goal
Build the compact token-index ONCE when the graph regenerates; the search hook
loads the sidecar in ~1.5 s with FULL 243K-node coverage.

**MEASURED (production graph, 2026-05-19):** sidecar = **105.6 MB** (243,687/243,687
nodes, 0 skipped, 119,707 tokens); `build-graph-index.mjs` build = **70.8 s**;
`loadGraph()` cold on the sidecar = **1.45 s** (vs 138 s direct / 380 ms
degraded-arch). The earlier "~10-20 MB" estimate was wrong — the real sidecar is
105 MB, but it still loads in <1.5 s, so the acceptance target holds.

## Design

### Sidecar file: `state/shared/system-viz/system-graph-index.json`
```
{
  "schemaVersion": "1.0.0",
  "generatedAt": "<ISO>",
  "sourceGraph": "system-graph.json",
  "sourceMtimeMs": <number>,       // graph mtime at build time — staleness gate
  "sourceSizeBytes": <number>,
  "nodeCount": <number>,            // INDEXED nodes (post-skip) === nodes.length
  "nodes": [                        // compact per-node metadata, index-addressed
    // Stored in searchGraphHits' OWN consumed shape so the loader needs NO
    // reshape — note `knowledge.{wikiEntries,memoryEntries}`, NOT flat keys.
    { "id", "label"?, "layer"?, "status"?, "info"?,
      "knowledge"?: { "wikiEntries"?: [...], "memoryEntries"?: [...] } }
  ],
  "inverted": { "<token>": [<nodeIdx>, <nodeIdx>, ...] }  // postings = INDICES into nodes[]
}
```
Postings store integer indices (not string ids) → large size saving. The
loader rebuilds `Map<token, Set<nodeId>>` from `nodes[idx].id` and uses
`nodes` verbatim (already searchGraphHits-shaped). `inverted` MUST be read
back with `Object.entries`/`Object.keys` — a token named `__proto__` is a
real (rare) case.

### File 1 (NEW) — `scripts/build-graph-index.mjs`
- Reads the full `system-graph.json` (~138 s parse OK — offline).
- Builds `inverted` + compact `nodes[]` using the **EXACT** `tokenize` + blob
  construction from `master-index-search-lib.mjs` `loadGraph` (R8 — import
  `tokenize` from the lib; replicate the blob: `${id} ${label} ${info}
  ${wikiNames} ${memNames}` with the same `entryName` map + `Array.isArray`
  guards). The index MUST match what `loadGraph` builds today or hit-scoring drifts.
- Atomic write (temp + rename) of the sidecar.
- Per-node try/continue (same defensive posture as `loadGraph`).
- CLI: `node scripts/build-graph-index.mjs [--graph <path>] [--out <path>]`.
- Fail-loud: nonzero exit on graph missing / parse fail / 0 nodes.

### File 2 (NEW) — `scripts/build-graph-index.test.mjs` (node:test)
- Sidecar shape + schemaVersion; postings are valid indices into nodes[].
- tokenize parity: a token present in a node's blob → that node's idx in its posting.
- Atomic write; idempotent; graph-missing → nonzero exit; real-fs E2E on a small fixture.

### File 3 (EDIT) — `master-index-search-lib.mjs` `loadGraph`
- NEW first branch: if `system-graph-index.json` sidecar exists AND is FRESH
  (`sidecar.sourceMtimeMs >= statSync(system-graph.json).mtimeMs` — sidecar
  built from current-or-newer graph) AND `schemaVersion` matches → load it,
  rebuild `{nodes, inverted}` wrapper, return. Fast path (<1.5 s target).
- Sidecar STALE / missing / schema-mismatch → fall through to EXISTING behavior
  unchanged (parse graph if ≤ cap, else F1 architecture fallback). Strictly
  additive — zero regression when no sidecar.
- Knob: `PRISM_GRAPH_SIDECAR_DISABLE=1` → skip sidecar, use legacy path.
- mtime cache (`_graphCache`) keys on the sidecar path when sidecar is used.
- The returned `{nodes, inverted}` shape MUST be identical so `searchGraphHits`
  / `runMasterIndexSearch` work UNCHANGED.

### File 4 (EDIT) — `scripts/regen-viz.mjs`
- Add a post-merge stage AFTER the last graph writer (the obsidian-bridge
  block — it patches `node.knowledge` directly; runs under the
  U-VIZ-F11-CROSS-LOCK held lock): spawn `build-graph-index.mjs` with
  `NODE_ARGS` (16 GB heap → the generator's self-re-exec no-ops).
- Non-fatal on failure: a stale/absent sidecar only makes search fall back to
  the legacy path; the graph itself is unaffected. Warn loudly to stderr but
  do NOT increment `failed` — the sidecar is a derived cache, exactly like the
  obsidian-bridge / wiki-debt-worklist stages which also warn-without-`failed++`.
  (`failed` / the regen exit code signals GRAPH integrity, not cache freshness.)

### File 5 (EXTEND) — `master-index-search-lib.test.mjs`
- Fresh sidecar present → loadGraph uses it, full node count, fast.
- Stale sidecar (sourceMtimeMs < graph mtime) → ignored, legacy path.
- schemaVersion mismatch → ignored.
- `PRISM_GRAPH_SIDECAR_DISABLE=1` → legacy path.
- Regression: no sidecar → byte-identical to today (arch fallback still fires).

## Acceptance (all MEASURED 2026-05-19 — PASS)
- `node scripts/build-graph-index.mjs` emits `system-graph-index.json`
  (105.6 MB) covering all 243,687 nodes (0 skipped) — ✓.
- `loadGraph()` with a fresh sidecar returns the full node set in **1.45 s**
  (target < 1.5 s; vs 138 s direct / 380 ms degraded-arch) — ✓.
- `runMasterIndexSearch("cutting force kienzle")` returns full-graph hits — ✓.
- Stale/missing/schema-mismatch/knob-disabled sidecar → legacy path — ✓
  (verified: fresh-sidecar / stale / disable-knob / malformed-node smokes).
- regen-viz refreshes the sidecar each run (post-merge stage, File 4) — ✓.

## Per-file scrutiny
5-file build → CLAUDE.md PER-FILE SCRUTINY GATE applies: 2 parallel reviewers
after EACH file. End-of-task 3-of-3.

## Rollback
- `PRISM_GRAPH_SIDECAR_DISABLE=1` (immediate, no code change).
- Sidecar is additive — delete `system-graph-index.json` → legacy path resumes.

## References
- Investigation: slot alpha claude-b7530614, 2026-05-18 (this session).
- `master-index-search-lib.mjs` `loadGraph` JSDoc — names the sidecar as "the deeper fix".
- U-ACTIVATE-BEFORE-BUILD-PRECHECK spec — consumer; its stale Pre-flight #2
  referenced "S5 F1 graph cap"; this unit is the real resolution.
