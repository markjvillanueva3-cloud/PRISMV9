# POST-PROCESSOR/U-PP-LATHE-ROUTER-GENOS-GATE — [MAIN-FORCE] [POST-PROCESSOR]/U-PP-LATHE-ROUTER-GENOS-GATE (slot:echo): gate GENOS lathe match on an L-number so a GENOS mill can't mis-route to the lathe engine

**Commit:** `b04996a328dd` · **By:** markjvillanueva3-cloud · **At:** 2026-06-26T11:36:18-05:00
**Tags:** post-processor, u-pp-lathe-router-genos-gate, auto-distilled

## Subject
[MAIN-FORCE] [POST-PROCESSOR]/U-PP-LATHE-ROUTER-GENOS-GATE (slot:echo): gate GENOS lathe match on an L-number so a GENOS mill can't mis-route to the lathe engine

## Body
```
[MAIN-FORCE] [POST-PROCESSOR]/U-PP-LATHE-ROUTER-GENOS-GATE (slot:echo): gate GENOS lathe match on an L-number so a GENOS mill can't mis-route to the lathe engine

R16 self-review gap on U-PP-LATHE-ROUTER-WIRE (80137164af): GENOS is BOTH an Okuma lathe
(L-series) and mill (M-series) family. The bare model.includes("GENOS") I added would route a
bare "GENOS M560" mill to the lathe engine. Gated GENOS on (L200|L300|L400) so a GENOS mill
falls through to else-reject. +1 regression test (bare "GENOS M560-V" not->okuma); 51/51.
Latent for JM (no GENOS mill in the fleet) but correct for "all machines". NOTE (pre-existing,
out of scope): a model carrying literal "OKUMA" still matches the leading model.includes("OKUMA")
broad clause -- a separate pre-existing mill-broad-match, documented in the test.
```

## Files touched (3)
- mcp-server/src/__tests__/integration/MasterPostByMachineExpanded.integration.test.ts | 15 ++++++++++++++-
- mcp-server/src/tools/dispatchers/camDispatcher.ts                                    |  5 ++++-
- 2 files changed, 18 insertions(+), 2 deletions(-)

## Lessons surfaced in commit body
- till matches the leading model.includes("OKUMA")

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show b04996a328dd`
- Milestone envelope: `mcp-server/data/milestones/POST-PROCESSOR.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._