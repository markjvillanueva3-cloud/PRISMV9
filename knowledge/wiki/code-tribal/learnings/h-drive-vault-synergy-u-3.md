# H-DRIVE-VAULT-SYNERGY/U-3 — [MAIN-FORCE] [H-DRIVE-VAULT-SYNERGY]/U-3 (slot:papa): graph<->vault coverage parity (fail-loud)

**Commit:** `e544cbfc9eaf` · **By:** markjvillanueva3-cloud · **At:** 2026-06-15T04:58:55-05:00
**Tags:** h-drive-vault-synergy, u-3, auto-distilled

## Subject
[MAIN-FORCE] [H-DRIVE-VAULT-SYNERGY]/U-3 (slot:papa): graph<->vault coverage parity (fail-loud)

## Body
```
[MAIN-FORCE] [H-DRIVE-VAULT-SYNERGY]/U-3 (slot:papa): graph<->vault coverage parity (fail-loud)

Loop iteration 15 (H-DRIVE backlog). scripts/h-drive-graph-parity.mjs joins U-1's vault coverage map
(state/shared/H-DRIVE-COVERAGE.json, per-domain hasNote) against the system-viz graph's fs-coverage
layer (expand-system-viz-l12-files L9/L11/L12 nodes tagged namespace) to prove graph<->vault parity:
graphOnly (graph has fs file-nodes for a namespace the vault has not categorized -> GATES exit 1),
vaultOnly (note but no graph nodes -> advisory), prismAggregate (the H:/prism subdirs scope all
collapse to ns=prism -> one aggregate). Streams the 762MB graph via graph-io.streamGraphArray
(off-heap Buffer + per-element parse; dodges V8 string cap; no --max-old-space-size needed). exit
0 parity / 1 graphOnly drift / 2 measurement-failure.

16 node:test cases incl. 3 subprocess exit-code oracles + a REAL streamGraphArray fixture wiring test
+ the fsCoverageDetected=false fail-on-revert guard.

EVAL-GATE CAUGHT A REAL BUG (R12): the first live run reported a FALSE 'PARITY OK' -- the CURRENT
merged system-graph.json does NOT carry the expand-system-viz-l12-files fs-coverage layer (verified:
NO L12 layer at all; L9 use subgroup not namespace; L11 are ghost/corpus nodes), so every fs node
fell into the skipped (none) bucket -> nothing compared -> false clean (silent-no-op class). FIX:
computeParity now returns fsCoverageDetected (any non-(none) namespace has fileNodes>0); main() treats
!fsCoverageDetected as a MEASUREMENT FAILURE (exit 2) naming the regen fix -- never a false OK. Live
run now honestly exits 2: '344968 nodes scanned, 0 namespaced fs file-nodes, fs-coverage layer absent'.

DATA-DEPENDENCY FINDING -> route to SIERRA (system-viz owner): the merged graph lacks the
expand-system-viz-l12-files L11/L12 fs layer (the documented generate-system-viz vs regen-viz
divergence). U-3 is fixture-proven to run green (exit 0/1) once that layer is merged back; until then
it correctly fails loud. This also keeps U-7 (DIRECTORY_DIGEST reconcile, depends on U-3) blocked
until the fs layer is restored.

Per-file scrutiny: arm A (code-analyzer) + arm B (reviewer) -> BOTH PASS, 0 P0/P1. Applied 2 cheap
P2 fixes inline (namespaceForName -> path.basename byte-faithful to the KEEP-IN-SYNC source; +scope/
heap docstring notes). Deferred P3s (middot is R11 house-style; cross-fn maintainability nit).
```

## Files touched (3)
- scripts/h-drive-graph-parity.mjs      | 238 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/h-drive-graph-parity.test.mjs | 212 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 2 files changed, 450 insertions(+)

## Lessons surfaced in commit body
- til then
- til the fs layer is restored.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show e544cbfc9eaf`
- Milestone envelope: `mcp-server/data/milestones/H-DRIVE-VAULT-SYNERGY.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._