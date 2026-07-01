# PLAYBOOK-CAPABILITY/U-PB-CONFLICT-DETECT-CONDITIONS-ALL — [MAIN] [PLAYBOOK-CAPABILITY]/U-PB-CONFLICT-DETECT-CONDITIONS-ALL (slot:foxtrot): close P2 — fold conditions_all into co-fire detection

**Commit:** `ba21bc16c300` · **By:** markjvillanueva3-cloud · **At:** 2026-05-22T17:52:00-05:00
**Tags:** playbook-capability, u-pb-conflict-detect-conditions-all, auto-distilled

## Subject
[MAIN] [PLAYBOOK-CAPABILITY]/U-PB-CONFLICT-DETECT-CONDITIONS-ALL (slot:foxtrot): close P2 — fold conditions_all into co-fire detection

## Body
```
[MAIN] [PLAYBOOK-CAPABILITY]/U-PB-CONFLICT-DETECT-CONDITIONS-ALL (slot:foxtrot): close P2 — fold conditions_all into co-fire detection

Closes the P2 recall gap I logged this morning in U-PB-CONFLICT-DETECT.
`MachiningPlaybookEngine.conditionDiscretes` now folds BOTH OR-logic
`rule.conditions` AND AND-logic `rule.conditions_all` into the discrete-
condition set. Two rules co-fire when a single query can satisfy both,
so the UNION of their trigger surfaces is the correct overlap basis.

Before this fix, ~13 canonical rules whose discrete trigger lives only
in `conditions_all` silently never co-fired with anything. The new
"KILLER CASE" test exhibits the exact missed-recall path: R1 fires on
(material P AND operation drill), R2 fires on (feature pocket OR material
P). The query {material=P, feature=pocket, operation=drill} satisfies
BOTH, but the old discretes ignored conditions_all so the intersection
was empty → null co-fire → MISSED. After the fix the material-P overlap
is detected via the cross-array union.

- Engine: 2-array outer loop in conditionDiscretes; same defensive
  guards (Array.isArray + null/object check + per-element string check)
  applied to both arrays. JSDoc updated to document the fold.
- Tests: +11 in a new describe block "conditions_all (AND-logic) co-fire
  detection" — material/feature/operation discrete overlap, the killer
  cross-array case, mixed conditions+conditions_all, disjoint rejection,
  always-in-conditions_all, 3 adversarial (non-array conditions_all,
  null entries, non-string array members), canonical-corpus invariants
  unchanged. 48/48 passing (was 37). tsc clean.
- Wiki: knowledge/wiki/architecture/playbook-capability-extensions.md
  follow-up table — PB-CONFLICT-P2-CONDITIONS-ALL row flipped from P2
  to CLOSED with same-day commit reference. "What it currently misses"
  bullet for conditions_all removed; "Recall scope" paragraph updated.

Per-file scrutiny + comprehensive-build enforcement honored: every
asset shipped with real tests (concrete invariants, no toBeDefined
stubs), ≥3 failure modes (disjoint negative, 3 adversarial), ≥2
adversarial (non-array conditions_all, null entries, non-string members),
variability across 4 condition types (material/feature/operation/always)
and 2 categories (milling, hole_making). The dispatcher action surface
is unchanged (no new wire needed — semantic fix to existing behavior).
```

## Files touched (4)
- .../architecture/playbook-capability-extensions.md |   5 +-
- .../__tests__/PlaybookConflictDetection.test.ts    | Bin 16239 -> 25826 bytes
- mcp-server/src/engines/MachiningPlaybookEngine.ts  |  52 ++++++++++++---------
- 3 files changed, 31 insertions(+), 26 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show ba21bc16c300`
- Milestone envelope: `mcp-server/data/milestones/PLAYBOOK-CAPABILITY.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._