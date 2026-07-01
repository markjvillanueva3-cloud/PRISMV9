# OLLAMA-GEN-JUDGE/U-ALPHA-JUDGED-REAPER-ROOTCAUSE — [MAIN-FORCE] [OLLAMA-GEN-JUDGE]/U-ALPHA-JUDGED-REAPER-ROOTCAUSE (slot:alpha): judged sweep root-caused (fleet-reaper kills >10min runs, NOT a bug) + 14b n=3 data validates the tri-state abstain guard LIVE

**Commit:** `87c428c0bd2a` · **By:** markjvillanueva3-cloud · **At:** 2026-06-25T18:40:56-05:00
**Tags:** ollama-gen-judge, u-alpha-judged-reaper-rootcause, auto-distilled

## Subject
[MAIN-FORCE] [OLLAMA-GEN-JUDGE]/U-ALPHA-JUDGED-REAPER-ROOTCAUSE (slot:alpha): judged sweep root-caused (fleet-reaper kills >10min runs, NOT a bug) + 14b n=3 data validates the tri-state abstain guard LIVE

## Body
```
[MAIN-FORCE] [OLLAMA-GEN-JUDGE]/U-ALPHA-JUDGED-REAPER-ROOTCAUSE (slot:alpha): judged sweep root-caused (fleet-reaper kills >10min runs, NOT a bug) + 14b n=3 data validates the tri-state abstain guard LIVE

The full-ladder judged n=3 sweep kept dying exit-255. ROOT CAUSE (R12, NOT my code): the fleet-reaper
("MUST KEEP RUNNING", ~10-min confirm threshold) kills any judged sweep running >10 min (judge call per
case -> ~15-20 min). PROOF the runner is fine: keyword sweep completes; the judge works in isolation; a
single-MODEL judged sweep completes in ~4 min. FIX = per-model invocations (each <10 min), the pattern
the architecture memory names -- never one long multi-model judged sweep.

The 14b judged n=3 run (completed) VALIDATES the false-0/tri-state work LIVE: the matrix shows
`summarize-medium 14b=0%(ns1/2)` + `summarize-hard 14b=33%(ns1/3)` -- the `(ns#/#)` tags are the
tri-state ABSTAIN guard firing: when the 32b judge could not grade (timeout/no-verdict) the case is
marked no-signal, NEVER silently charged to the subject as a false 0%. 14b: strong easy + all explain
tiers, weaker on hard SUMMARIZE. Doc updated: state/shared/ollama-generative-stratified-2026-06-25.md.
```

## Files touched (2)
- state/shared/ollama-generative-stratified-2026-06-25.md | 23 +++++++++++++++++++++++
- 1 file changed, 23 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 87c428c0bd2a`
- Milestone envelope: `mcp-server/data/milestones/OLLAMA-GEN-JUDGE.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._