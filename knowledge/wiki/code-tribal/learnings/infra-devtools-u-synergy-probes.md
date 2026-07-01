# INFRA-DEVTOOLS/U-SYNERGY-PROBES — [MAIN] [INFRA-DEVTOOLS]/U-SYNERGY-PROBES: commit system-synergy-map.mjs with 3 false-negative probe fixes (21.11% -> 24.44%)

**Commit:** `b081cebb1b3f` · **By:** markjvillanueva3-cloud · **At:** 2026-05-18T12:33:49-05:00
**Tags:** infra-devtools, u-synergy-probes, auto-distilled

## Subject
[MAIN] [INFRA-DEVTOOLS]/U-SYNERGY-PROBES: commit system-synergy-map.mjs with 3 false-negative probe fixes (21.11% -> 24.44%)

## Body
```
[MAIN] [INFRA-DEVTOOLS]/U-SYNERGY-PROBES: commit system-synergy-map.mjs with 3 false-negative probe fixes (21.11% -> 24.44%)

This is the FIRST commit of scripts/system-synergy-map.mjs — the file was
shipped 2026-05-16 by slot foxtrot during /forge-audit-v2 SYSTEM-SYNERGY-AUDIT
but per standing 'never commit unless asked' rule was never committed
(see memory reference_synergy_regression_watch_2026_05_16).

This commit lands the script with three detector-accuracy improvements
applied in-session:

  Probe 1 (dispatchers->docker):  hardcoded "none" -> probe sessionDispatcher
                                  + localDispatcher for docker_health |
                                  ollama_health actions -> auto
  Probe 2 (dispatchers->handoffs): hardcoded "none" -> probe sessionDispatcher
                                  for handoff_(prepare|write|read|coord)
                                  -> auto
  Probe 3 (hooks->tribal):        hardcoded "none" -> probe for tribal-spike
                                  or tribal-by-domain-inject hook wired in
                                  settings.json -> auto

All three couplings ALREADY EXIST in PRISM. The detector was false-negative.
No new capability built — detector now correctly counts existing wirings.

Results:
  Synergy ratio:  21.11% -> 22.22% -> 23.33% -> 24.44% (+3.33pp)
  auto cells:     19 -> 20 -> 21 -> 22
  none cells:     55 -> 54 -> 53 -> 52
  P0 alert:       firing -> CLEAR (exit code 1 -> 0)
  Position:       1.09pp below May 9 baseline -> 2.24pp ABOVE

Compounding pattern: ~40 more hardcoded "none" probes remain in the matrix.
Each verified false-negative is +1.11pp. Next-iteration candidates:
memories->wiki, skills->system-viz, handoffs->system-viz, tribal->neural.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (2)
- scripts/system-synergy-map.mjs | 270 +++++++++++++++++++++++++++++++++++++++++
- 1 file changed, 270 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show b081cebb1b3f`
- Milestone envelope: `mcp-server/data/milestones/INFRA-DEVTOOLS.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._