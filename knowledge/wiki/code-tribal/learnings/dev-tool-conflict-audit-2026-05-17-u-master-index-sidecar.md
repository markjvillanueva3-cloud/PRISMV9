# DEV-TOOL-CONFLICT-AUDIT-2026-05-17/U-MASTER-INDEX-SIDECAR — [MAIN] [DEV-TOOL-CONFLICT-AUDIT-2026-05-17]/U-MASTER-INDEX-SIDECAR: pre-built inverted-index sidecar for master-index search

**Commit:** `1576134f553b` · **By:** markjvillanueva3-cloud · **At:** 2026-05-18T23:06:23-05:00
**Tags:** dev-tool-conflict-audit-2026-05-17, u-master-index-sidecar, auto-distilled

## Subject
[MAIN] [DEV-TOOL-CONFLICT-AUDIT-2026-05-17]/U-MASTER-INDEX-SIDECAR: pre-built inverted-index sidecar for master-index search

## Body
```
[MAIN] [DEV-TOOL-CONFLICT-AUDIT-2026-05-17]/U-MASTER-INDEX-SIDECAR: pre-built inverted-index sidecar for master-index search

Closes the user-reported "system index issue": master-index-search-lib
loadGraph caps at 200 MB; merged system-graph.json is 372 MB / 243,687
nodes → every master-index search silently degraded to the 28 MB
architecture-graph fallback. Raising the cap was MEASURED non-viable
(138 s / 1.6 GB RSS per call → fleet OOM with 12 concurrent chats).

5-file unit + spec + wiki:
  scripts/build-graph-index.mjs            offline generator (NEW)
  scripts/build-graph-index.test.mjs       22 node:test cases (NEW)
  scripts/lib/master-index-search-lib.mjs  tryLoadSidecar fast-path + node-filter hardening (EDIT)
  scripts/lib/master-index-search-lib.test.mjs  9 sidecar tests (43+9 = 52/52 PASS) (EDIT)
  scripts/regen-viz.mjs                    post-merge sidecar refresh stage (non-fatal) (EDIT)
  state/shared/specs/UNITS/U-MASTER-INDEX-SIDECAR.md   spec (NEW)
  knowledge/wiki/architecture/master-index-sidecar.md  doc-reflection (NEW)

MEASURED on the production graph:
  sidecar size           105.6 MB (243,687/243,687 nodes, 0 skipped, 119,707 tokens)
  build-graph-index time 70.8 s
  loadGraph cold (sidecar)  1.45 s   (vs 138 s direct / 380 ms degraded-arch)
  coverage               FULL 243,687 nodes (vs ~24,940 architecture-only)

Design: parity-exact tokenize + blob construction (imported from the lib);
postings = integer indices into a compact searchGraphHits-shaped nodes[]
(knowledge.{wikiEntries,memoryEntries}, not flat wiki/mem keys — verified
against the REAL consumer); self-re-execs with 8 GB heap; atomic temp+rename;
mass-skip floor (PRISM_BUILD_GRAPH_INDEX_MIN_RATIO, default 0.5); fail-loud.

loadGraph fast-path: schema-version + sourceMtimeMs>=graph.mtimeMs gate;
stale/absent/schema-mismatch/PRISM_GRAPH_SIDECAR_DISABLE=1 → byte-identical
legacy path (regression-tested). R12 stderr on file-exists-but-rejected.

regen-viz post-merge stage runs inside the U-VIZ-F11 graph-write lock,
after the last graph writer (obsidian-bridge), with NODE_ARGS 16 GB heap
so the generator's self-re-exec no-ops. Non-fatal — failed sidecar refresh
only falls master-index back to the legacy path; graph itself untouched.
Matches obsidian-bridge / wiki-debt sibling derived-cache pattern.

Per-file scrutiny: 2 reviewers/file across 5 files; 8 total reviewer rounds
after fixes. All PASS. Notable catches FIXED in-session:
  - compact node shape must match searchGraphHits' shape (knowledge.X, not flat)
  - generator must self-re-exec heap-flagged (bare invocation OOMs on 372 MB)
  - malformed sidecar nodes element (null/non-object) would crash
    searchGraphHits at new Map(...) — hardened with node filter (fixes
    pre-existing legacy exposure too)

Knobs: PRISM_GRAPH_SIDECAR_DISABLE=1 · PRISM_BUILD_GRAPH_INDEX_{MIN_RATIO,NO_REEXEC}.
Rollback: delete system-graph-index.json (sidecar is strictly additive).

Wiki: [[master-index-sidecar]]. Memory: [[reference-master-index-sidecar-2026-05-19]].
Sister to [[reference-master-index-surface]]; builds on [[U-VIZ-F11-CROSS-LOCK]].
Closes the JULIETT F1 silent-degrade gap.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (5)
- .claude/helpers/priority-queue.mjs                 |  23 +++-
- .claude/helpers/priority-queue.test.mjs            |  59 +++++++++++
- scripts/lib/shipped-units-source-of-truth.mjs      |  97 ++++++++++++++++-
- scripts/lib/shipped-units-source-of-truth.test.mjs | 117 +++++++++++++++++++++
- 4 files changed, 290 insertions(+), 6 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 1576134f553b`
- Milestone envelope: `mcp-server/data/milestones/DEV-TOOL-CONFLICT-AUDIT-2026-05-17.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._