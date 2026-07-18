# BLACKWELL-DB-GEN-MS0/U-CGP-NUMPARALLEL-RECO — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [BLACKWELL-DB-GEN-MS0]/U-CGP-NUMPARALLEL-RECO (slot:romeo): make the measured-speedup tool ACTIONABLE — recommend the host's OLLAMA_NUM_PARALLEL + point at the existing config lever.

**Commit:** `ca4395947b22` · **By:** markjvillanueva3-cloud · **At:** 2026-06-04T10:26:48-05:00
**Tags:** blackwell-db-gen-ms0, u-cgp-numparallel-reco, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [BLACKWELL-DB-GEN-MS0]/U-CGP-NUMPARALLEL-RECO (slot:romeo): make the measured-speedup tool ACTIONABLE — recommend the host's OLLAMA_NUM_PARALLEL + point at the existing config lever.

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [BLACKWELL-DB-GEN-MS0]/U-CGP-NUMPARALLEL-RECO (slot:romeo): make the measured-speedup tool ACTIONABLE — recommend the host's OLLAMA_NUM_PARALLEL + point at the existing config lever.

Closes the efficiency arc: iter1 made the extractor parallel, iter2 MEASURED 2x (capped by live OLLAMA_NUM_PARALLEL=2), this surfaces the one config lever to reach the ceiling. New SSOT helper recommendOllamaNumParallel(profile) (blackwell 4 / highend 2 / else 1) — mirrors golf's host-aware scripts/system-health/05-soft-config-tweaks.ps1 (which ALREADY sets 4 on Blackwell; R8 read-first avoided duplicating it). measure-catalog-extraction-rate now emits underProvisioned + an actionable note: 'OLLAMA_NUM_PARALLEL=2 below recommended 4 -> run 05-soft-config-tweaks.ps1 + restart on next idle window -> unlock x3 (currently x2)'.

HONEST: advisory only (points at golf's script, never auto-applies, requires restart, caps the promise at min(workers,recommended)); underProvisioned is false for unset (unverified, not a false-warn). Cross-file PARITY test pins JS values == PS table (fails loud on drift, R9). +7 tests (profile 33, measure 16). 2-arm scrutiny PASS/PASS 0 P0/P1 (both flagged the parity gap -> closed).
```

## Files touched (6)
- scripts/lib/catalog-gpu-profile.mjs                | 18 ++++++++++++++++++
- scripts/lib/catalog-gpu-profile.test.mjs           | 31 +++++++++++++++++++++++++++++++
- scripts/measure-catalog-extraction-rate.mjs        | 22 ++++++++++++++++++++--
- scripts/measure-catalog-extraction-rate.test.mjs   | 12 ++++++++++++
- state/shared/blackwell-db-gen-rate-projection.json |  4 +++-
- 5 files changed, 84 insertions(+), 3 deletions(-)

## Lessons surfaced in commit body
- note: 'OLLAMA_NUM_PARALLEL=2 below recommended 4 -> run 05-soft-config-tweaks.ps1 + restart on next idle window -> unlock x3 (currently x2)'.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show ca4395947b22`
- Milestone envelope: `mcp-server/data/milestones/BLACKWELL-DB-GEN-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._