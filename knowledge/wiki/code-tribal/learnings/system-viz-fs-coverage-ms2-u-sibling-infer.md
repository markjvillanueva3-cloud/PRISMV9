# SYSTEM-VIZ-FS-COVERAGE-MS2/U-SIBLING-INFER — sibling-prefix dispatcher inference — UNKNOWN tail 331 → 139

**Commit:** `16442459533c` · **By:** markjvillanueva3-cloud · **At:** 2026-05-15T20:30:07-05:00
**Tags:** system-viz-fs-coverage-ms2, u-sibling-infer, auto-distilled

## Subject
[SYSTEM-VIZ-FS-COVERAGE-MS2]/U-SIBLING-INFER: sibling-prefix dispatcher inference — UNKNOWN tail 331 → 139

## Body
```
[SYSTEM-VIZ-FS-COVERAGE-MS2]/U-SIBLING-INFER: sibling-prefix dispatcher inference — UNKNOWN tail 331 → 139

Sibling-pattern inference fallback closes the keyword-rule blind spot. When inferDispatcher() returns UNKNOWN (no domain keyword match), now consults a wired-engine map (2,746 imports across 30 dispatchers) to find longest-shared-prefix wired siblings and propose the most-common dispatcher among them.

Confidence breakdown (810 unwired ghosts):
  high (≥0.80):   169
  medium (≥0.60): 289 + 0 = 289 (no sibling-promotion to medium tier yet)
  low (≥0.50):    22 + 192 = ~213 (sibling-derived, scaled 0.40-0.65)
  UNKNOWN:        331 → 139 (-192, 58% reduction)

Coverage: 480/810 (59%) → 671/810 (83%) confident proposed-wire edges.

New library: scripts/lib/wired-engine-mapper.mjs (6 exports, atomic + pure):
  extractEngineImports(src) — regex grep for both static + dynamic engine imports
  buildEngineDispatcherMap(dir) — scans dispatcher dir, returns Map<engineName, Set<namespace>>
  dispatcherFileToNamespace(filename) — 28-entry override table + generic <X>Dispatcher → prism_<x>
  inferDispatcherBySibling(name, wiredMap) — longest-common-prefix match, mode-vote dispatcher
  commonPrefixLen(a, b) — pure char-comparison

Confidence formula (sibling tier): 0.40 + 0.05 * prefixLen + 0.10 * (purity - 0.5), capped at 0.65 (always below keyword-tier 0.85).

Top dispatcher targets (post sibling-inference):
  prism_cam: 186  ·  UNKNOWN: 139  ·  prism_turning: 89  ·  prism_dev: 68  ·  prism_calc: 54

Tests: 23/23 PASS (existing) + 29/29 PASS (new mapper test file) = 52 cases.
  extractEngineImports: 6 cases (static, dynamic, dedup, case-sensitive, empty, mixed)
  buildEngineDispatcherMap: 4 cases (file filtering, multi-disp, missing dir, unmappable)
  dispatcherFileToNamespace: 5 cases (overrides + generic + suffix-tolerant + null)
  inferDispatcherBySibling: 8 cases (longest-prefix, mode-vote, min-prefix gate, self-skip, etc)
  commonPrefixLen: 5 cases

Graph state: 373,635 → 373,635 nodes (no new ghosts, just updated proposed_wiring on existing 810)
            592,047 → 592,239 edges (+192 new sibling-derived ghost-wire edges)

Cumulative session: 7 commits, 0 UNKNOWN ratio 41% → 17% on the 810 unwired engines.
```

## Files touched (4)
- scripts/lib/wired-engine-mapper.mjs      | 163 ++++++++++++++++++++++
- scripts/lib/wired-engine-mapper.test.mjs | 224 +++++++++++++++++++++++++++++++
- scripts/seed-ghost-from-unwired.mjs      |  27 ++--
- 3 files changed, 406 insertions(+), 8 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 16442459533c`
- Milestone envelope: `mcp-server/data/milestones/SYSTEM-VIZ-FS-COVERAGE-MS2.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._