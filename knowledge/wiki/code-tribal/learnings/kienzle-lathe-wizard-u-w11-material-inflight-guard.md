# KIENZLE-LATHE-WIZARD/U-W11-MATERIAL-INFLIGHT-GUARD — [MAIN-FORCE] [KIENZLE-LATHE-WIZARD]/U-W11-MATERIAL-INFLIGHT-GUARD (slot:whiskey): add async-init in-flight guard to MaterialRegistry.load() -- collapses concurrent redundant full loads

**Commit:** `81cae6250d8d` · **By:** markjvillanueva3-cloud · **At:** 2026-06-26T15:29:42-05:00
**Tags:** kienzle-lathe-wizard, u-w11-material-inflight-guard, auto-distilled

## Subject
[MAIN-FORCE] [KIENZLE-LATHE-WIZARD]/U-W11-MATERIAL-INFLIGHT-GUARD (slot:whiskey): add async-init in-flight guard to MaterialRegistry.load() -- collapses concurrent redundant full loads

## Body
```
[MAIN-FORCE] [KIENZLE-LATHE-WIZARD]/U-W11-MATERIAL-INFLIGHT-GUARD (slot:whiskey): add async-init in-flight guard to MaterialRegistry.load() -- collapses concurrent redundant full loads

Follow-up to U-W10 (EMFILE cap). MaterialRegistry is a singleton (line 1722) but load() guarded
only on "if (this.loaded) return" with NO in-flight promise. The closed-loop harness generates
programs in parallel, so many callers raced past that check before the first load set loaded=true,
each starting its own full 3989-material load (multiple 'MaterialRegistry loaded: 3989' lines) ->
slow (harness timed out) and the concurrency that compounded the EMFILE storm.

Fix: standard async-init in-flight guard -- load() shares one "loadPromise" so concurrent callers
await the same load; doLoad() holds the original body unchanged. Public contract unchanged (all 9
importers still call "await load()").

Validated via the harness at DEFAULT 4GB heap: full registry loads 4+ -> 1, EXIT 0 (was OOM/timeout)
in 5s, EMFILE 0, accuracy unchanged (60 programs, 0 errors, 100% SFM). tsc clean for this file.
Together U-W10 + U-W11 fully resolve the fleet-wide silent-empty-registry bug.
reference_whiskey_jm_stock_turning_state_2026_06_26
```

## Files touched (2)
- mcp-server/src/registries/MaterialRegistry.ts | 19 +++++++++++++++++--
- 1 file changed, 17 insertions(+), 2 deletions(-)

## Lessons surfaced in commit body
- till call "await load()").

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 81cae6250d8d`
- Milestone envelope: `mcp-server/data/milestones/KIENZLE-LATHE-WIZARD.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._