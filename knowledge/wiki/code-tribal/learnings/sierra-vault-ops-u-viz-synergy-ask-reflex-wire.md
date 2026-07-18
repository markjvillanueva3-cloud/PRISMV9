# SIERRA-VAULT-OPS/U-VIZ-SYNERGY-ASK-REFLEX-WIRE — [MAIN-FORCE] [SIERRA-VAULT-OPS]/U-VIZ-SYNERGY-ASK-REFLEX-WIRE (slot:sierra): route the orientation-question reflex into synergy-ask via the existing audit-viz-first injector

**Commit:** `ca7af888b52c` · **By:** markjvillanueva3-cloud · **At:** 2026-06-24T13:17:26-05:00
**Tags:** sierra-vault-ops, u-viz-synergy-ask-reflex-wire, auto-distilled

## Subject
[MAIN-FORCE] [SIERRA-VAULT-OPS]/U-VIZ-SYNERGY-ASK-REFLEX-WIRE (slot:sierra): route the orientation-question reflex into synergy-ask via the existing audit-viz-first injector

## Body
```
[MAIN-FORCE] [SIERRA-VAULT-OPS]/U-VIZ-SYNERGY-ASK-REFLEX-WIRE (slot:sierra): route the orientation-question reflex into synergy-ask via the existing audit-viz-first injector

The graph+vault->Ollama combiner (synergy-ask.mjs, shipped 715755e2ed) was
reachable only by name. This wires the fleet's "where is / how many / what
exists / list all" orientation reflex INTO it -- WITHOUT a new hook (the
injection layer is over-supplied, per the utilization protocol's explicit
anti-pattern). audit-viz-first-inject.mjs already auto-runs system-viz-query
find (graph-only) on those intents; buildBody now appends a one-line
synergy-ask pointer -- but ONLY for WEAK/orientation intents (which want a
grounded NL answer), never STRONG/audit intents (audit/orphan/unwired/enumerate
want the raw node list). Additive array-spread, pure ASCII, dedup-key unchanged
(keys on intent::noun, not body). Fires fleet-wide on every slot's
UserPromptSubmit -> all-galaxies coverage.

TEST: buildBody exported; +4 R9 routing tests (WEAK->pointer present + names all
3 substrates + threads the noun; STRONG->absent; node-list+Knobs survive both
branches; pointer is ASCII-only). 35/35 pass (31 pre-existing + 4 new).
VALIDATE (live-fired): "how many MasterIndexEngine" -> synergy-ask pointer with
noun threaded; "audit MasterIndexEngine for orphans" -> no pointer (node list
only). Both directions correct.
```

## Files touched (3)
- .claude/hooks/__tests__/audit-viz-first-rate-gate.test.mjs | 44 ++++++++++++++++++++++++++++++++++++
- .claude/hooks/audit-viz-first-inject.mjs                   | 11 ++++++++-
- 2 files changed, 54 insertions(+), 1 deletion(-)

## Lessons surfaced in commit body
- tilization protocol's explicit

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show ca7af888b52c`
- Milestone envelope: `mcp-server/data/milestones/SIERRA-VAULT-OPS.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._