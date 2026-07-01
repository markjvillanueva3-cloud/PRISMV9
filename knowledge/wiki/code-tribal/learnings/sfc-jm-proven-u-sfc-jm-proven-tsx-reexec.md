# SFC-JM-PROVEN/U-SFC-JM-PROVEN-TSX-REEXEC — [MAIN-FORCE] [SFC-JM-PROVEN]/U-SFC-JM-PROVEN-TSX-REEXEC (slot:oscar): bare-node/cron-safe the JM proven-speedfeed extractor + activate the dormant pipeline

**Commit:** `86293ba299ba` · **By:** markjvillanueva3-cloud · **At:** 2026-06-24T22:12:42-05:00
**Tags:** sfc-jm-proven, u-sfc-jm-proven-tsx-reexec, auto-distilled

## Subject
[MAIN-FORCE] [SFC-JM-PROVEN]/U-SFC-JM-PROVEN-TSX-REEXEC (slot:oscar): bare-node/cron-safe the JM proven-speedfeed extractor + activate the dormant pipeline

## Body
```
[MAIN-FORCE] [SFC-JM-PROVEN]/U-SFC-JM-PROVEN-TSX-REEXEC (slot:oscar): bare-node/cron-safe the JM proven-speedfeed extractor + activate the dormant pipeline

extract-jm-proven-speedfeed.mjs dynamic-imports .ts engines but had NO tsx-reexec
guard -> a bare `node` launch (overnight cron / scheduled task) crashes with
ERR_MODULE_NOT_FOUND (the same class fixed in U-SFC-TSX-REEXEC for the 4 sweep
scripts). Added the shared guard (import + first-line-of-main reexecUnderTsxIfNeeded;
inside main() not module-top so test-imports of the pure helpers stay side-effect-free,
matching the sfc-convergence-diff precedent). Reviewer PASS, no findings.

ACTIVATED the dormant JM-Die proven-speedfeed pipeline (its header warned getProvenParams
was empty in every process -> the orchestrator proven-blend was dead code). Live full-corpus
run (now bare-node-safe): 16,524 JM lathe programs -> 94,015 samples -> 50 proven
(material-group x operation) configs, 9,633 outliers flagged, 17 high-confidence. The
proven-store (data/state/jm-proven-speedfeed-store.json, gitignored generated data) is now
populated -- getProvenParams returns real JM-proven CSS/feed per (material,op).

Findings (follow-up, not this commit): (1) 48% of samples classify as op=unknown -- the
Okuma parser op-classifier is the lever for more/deeper proven sets; (2) only 17/50 configs
are high-confidence -- the other 33 have high cross-program variance, validating the operator
premise that the amateur-programmed values are inconsistent (trust the 17, override the 33).
```

## Files touched (2)
- mcp-server/scripts/extract-jm-proven-speedfeed.mjs | 5 +++++
- 1 file changed, 5 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 86293ba299ba`
- Milestone envelope: `mcp-server/data/milestones/SFC-JM-PROVEN.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._