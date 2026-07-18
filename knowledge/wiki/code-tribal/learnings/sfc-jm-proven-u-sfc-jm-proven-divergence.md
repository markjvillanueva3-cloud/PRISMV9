# SFC-JM-PROVEN/U-SFC-JM-PROVEN-DIVERGENCE — [MAIN-FORCE] [SFC-JM-PROVEN]/U-SFC-JM-PROVEN-DIVERGENCE (slot:oscar): PRISM-vs-JM-proven turning-speed divergence -- physics-reviewer caught + fixed a material-state mapping error

**Commit:** `76594260f8c5` · **By:** markjvillanueva3-cloud · **At:** 2026-06-24T22:45:07-05:00
**Tags:** sfc-jm-proven, u-sfc-jm-proven-divergence, auto-distilled

## Subject
[MAIN-FORCE] [SFC-JM-PROVEN]/U-SFC-JM-PROVEN-DIVERGENCE (slot:oscar): PRISM-vs-JM-proven turning-speed divergence -- physics-reviewer caught + fixed a material-state mapping error

## Body
```
[MAIN-FORCE] [SFC-JM-PROVEN]/U-SFC-JM-PROVEN-DIVERGENCE (slot:oscar): PRISM-vs-JM-proven turning-speed divergence -- physics-reviewer caught + fixed a material-state mapping error

The "test PRISM against ALL JM parts" artifact: compares each JM-proven CSS vs PRISM's
CANONICAL_TURNING_SPEEDS band (imported, never inlined) per ISO group x op -> conservative
(JM slow) / in-band (agrees) / aggressive (JM hot) / suspect-units. Pure helpers (speeds
injected) + main() tsx-reexec-guarded; specialized ops (parting/grooving/threading/drilling)
excluded honestly (own speed regime), excluded count surfaced.

PHYSICS-REVIEWER CAUGHT A REAL ERROR (FAIL -> fixed -> re-verified PASS): the first cut mapped
tool_steel/tungsten_carbide -> ISO H (hardened), inflating every JM cut to a fabricated +246%
"aggressive" -- but JM machines tool steel ANNEALED (soft = P band), and 450 m/min is itself
proof of soft stock (you cannot turn HRC62 at 450). Fixes: tool_steel -> P (only explicit
"hardened" -> H); tungsten_carbide/carbide/ceramic/cbn/diamond EXCLUDED (not conventionally
turned); new SUSPECT-UNITS verdict (css > 1.8x band) flags the SFM->m/min extraction artifact
(700 SFM = 213 m/min = in-band) distinct from a real aggressive cut, per UNITS-FIRST doctrine.

LIVE (corrected): 14 comparable / 36 excluded -> CONSERVATIVE 3 / IN-BAND 6 / AGGRESSIVE 3
(real +41%/+41%/+9%) / SUSPECT-UNITS 2 (carbon_steel 700/640). 10/10 tests, 2-arm scrutiny PASS.
Follow-up (flagged, out of scope): chase the 700/640 SFM artifact back to extract-jm-proven-speedfeed.mjs.
```

## Files touched (3)
- mcp-server/scripts/sfc-jm-proven-divergence.mjs      | 260 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/scripts/sfc-jm-proven-divergence.test.mjs | 146 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 2 files changed, 406 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 76594260f8c5`
- Milestone envelope: `mcp-server/data/milestones/SFC-JM-PROVEN.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._