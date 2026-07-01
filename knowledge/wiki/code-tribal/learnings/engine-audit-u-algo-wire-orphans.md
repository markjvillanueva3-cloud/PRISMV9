# ENGINE-AUDIT/U-ALGO-WIRE-ORPHANS — [MAIN-FORCE] [ENGINE-AUDIT]/U-ALGO-WIRE-ORPHANS (slot:bravo): wire 2 orphaned MIT-OCW algorithms into prism_algorithm (control_statespace + ml_tsne)

**Commit:** `67a74c34602c` · **By:** markjvillanueva3-cloud · **At:** 2026-06-19T11:00:16-05:00
**Tags:** engine-audit, u-algo-wire-orphans, auto-distilled

## Subject
[MAIN-FORCE] [ENGINE-AUDIT]/U-ALGO-WIRE-ORPHANS (slot:bravo): wire 2 orphaned MIT-OCW algorithms into prism_algorithm (control_statespace + ml_tsne)

## Body
```
[MAIN-FORCE] [ENGINE-AUDIT]/U-ALGO-WIRE-ORPHANS (slot:bravo): wire 2 orphaned MIT-OCW algorithms into prism_algorithm (control_statespace + ml_tsne)

The engine/algo/formula audit surfaced 3 complete-but-orphaned algorithm ports
(in no registry, imported by no engine, absent from the gateway catalog). Wire
the 2 cleanly-JSON-serializable ones via the proven control_fuzzy ALGO-SYNERGY
pattern (lazy import -> validate -> calculate -> ok/err):
 - control_statespace -> LinearStateSpaceModel: state-space (A,B,C,D) analysis
   (transfer_function | frequency_response | ranks). Distinct from control_transfer
   (which takes TF polynomials). simulate excluded (needs non-serializable u(t)).
 - ml_tsne -> TSNEAlgorithm.embed: nonlinear dim-reduction; integer seed -> mulberry32
   PRNG for determinism (embed takes an rng fn that cannot cross the dispatcher).
13 round-trip tests through the REAL dispatcher (R15), hand-computed references
(char poly s^2+3s+2 |coeffs|={1,2,3}; Kalman ranks 2/2; uncontrollable-mode rank 1;
seeded determinism). All 13 PASS, tsc clean, 2-arm per-file scrutiny PASS (0 P0/P1).
FiniteElementMethod1D deferred (source(x) fn needs a serialization adapter).
```

## Files touched (3)
- .../src/__tests__/algorithm-dispatcher-statespace-tsne.test.ts   | 147 +++++++++++++++++++++++++++++
- mcp-server/src/tools/dispatchers/algorithmDispatcher.ts          |  55 +++++++++++
- 2 files changed, 202 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 67a74c34602c`
- Milestone envelope: `mcp-server/data/milestones/ENGINE-AUDIT.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._