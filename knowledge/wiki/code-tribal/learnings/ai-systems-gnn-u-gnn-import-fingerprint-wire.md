# AI-SYSTEMS-GNN/U-GNN-IMPORT-FINGERPRINT-WIRE — [MAIN-FORCE] [AI-SYSTEMS-GNN]/U-GNN-IMPORT-FINGERPRINT-WIRE (slot:india): non-engine import-fingerprint dense GNN feature, default-OFF + leak-free + adjacency-clean

**Commit:** `2acc3984e8b6` · **By:** markjvillanueva3-cloud · **At:** 2026-06-21T21:36:21-05:00
**Tags:** ai-systems-gnn, u-gnn-import-fingerprint-wire, auto-distilled

## Subject
[MAIN-FORCE] [AI-SYSTEMS-GNN]/U-GNN-IMPORT-FINGERPRINT-WIRE (slot:india): non-engine import-fingerprint dense GNN feature, default-OFF + leak-free + adjacency-clean

## Body
```
[MAIN-FORCE] [AI-SYSTEMS-GNN]/U-GNN-IMPORT-FINGERPRINT-WIRE (slot:india): non-engine import-fingerprint dense GNN feature, default-OFF + leak-free + adjacency-clean

The next leg-#10 lever after the text/source feature was exhausted (deployed GHOST_SOURCE
= 23/43 dispatcher-class separability @ 0.0527; action-surface measured +0.0018 redundant).
Designed via a read-only fan-out (spec state/shared/specs/GNN-NEXT-LEVER-IMPORT-FINGERPRINT-2026-06-21.md).

NEW pure lib scripts/lib/engine-import-fingerprint.mjs (mirrors engine-action-surface.mjs):
extractNonEngineImports / buildImportFingerprintMap / buildImportIdfMap / importFingerprintText.
Per engine, the IDF-weighted set of NON-engine module import paths (utility/formula/domain
libs) -- a STRUCTURAL signal independent of description prose (a calc engine imports
kinematics/material libs; a CAM engine imports gcode/toolpath libs).

WIRED into build-node-embeddings.mjs sourceSignalById behind PRISM_NNG_GHOST_IMPORT_FP=1
(default OFF -> deployed embeddings byte-identical), same seam as the action-surface wire.

LEAK-FREE (anti fake-0.98): import paths are structural .ts properties, independent of which
dispatcher routes to the engine; no label appears in an import path. An engine with no
non-engine imports (or all-universal idf=0) -> empty fingerprint -> no-op.

ADJACENCY-CLEAN (per-file scrutiny arm-B P1, fixed in-commit): the engines tree is FLAT, so
an engine importing a sibling writes ./XEngine.js (no /engines/ substring) which survived as a
bare engine-stem token -- readmitting the RULED-OUT engine->engine 1-hop adjacency (arm-B
measured 27% of engines). Fix: a keyset second-pass in buildImportFingerprintMap drops any
token equal to a known engine stem (exact, not a name-suffix heuristic). LIVE: engine-stem
readmission 1024 engines -> 0.

VERIFIED: 25/25 lib tests (happy + >=3 failure + >=2 adversarial + flat-same-dir-drop
regression + live-data invariant); existing build-node-embeddings 53/53 still pass (default-OFF
byte-identical). Per-file 2-arm scrutiny: arm-A PASS, arm-B P1 fixed + re-verified 0 readmission.

SCOPE (R12 honest): wires the feature default-OFF; does NOT retrain, does NOT flip the deployed
default, does NOT mutate the 542MB graph. NEXT = the live OFF-vs-ON deployed-format separability
measure vs the 23/43 @ 0.0527 baseline (separate --out, never clobber .cwref-newemb.jsonl); per
the kill-criterion (<+2 separable classes OR meanMargin gain <0.010) this thin-coverage feature
(~1 surviving non-engine token/engine after the adjacency-clean) may well be ruled out.
```

## Files touched (4)
- scripts/build-node-embeddings.mjs              |  28 ++++++++-
- scripts/lib/engine-import-fingerprint.mjs      | 232 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/lib/engine-import-fingerprint.test.mjs | 410 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 3 files changed, 667 insertions(+), 3 deletions(-)

## Lessons surfaced in commit body
- tility/formula/domain
- till pass (default-OFF

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 2acc3984e8b6`
- Milestone envelope: `mcp-server/data/milestones/AI-SYSTEMS-GNN.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._