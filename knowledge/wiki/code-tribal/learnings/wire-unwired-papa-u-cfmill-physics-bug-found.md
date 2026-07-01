# WIRE-UNWIRED-PAPA/U-CFMILL-PHYSICS-BUG-FOUND — [MAIN-FORCE] [WIRE-UNWIRED-PAPA]/U-CFMILL-PHYSICS-BUG-FOUND (slot:papa): reclassify CounterfactualMill CLEAN->DEFERRED (divergent inlined physics constants)

**Commit:** `fe87a3ea2278` · **By:** markjvillanueva3-cloud · **At:** 2026-06-15T02:08:37-05:00
**Tags:** wire-unwired-papa, u-cfmill-physics-bug-found, auto-distilled

## Subject
[MAIN-FORCE] [WIRE-UNWIRED-PAPA]/U-CFMILL-PHYSICS-BUG-FOUND (slot:papa): reclassify CounterfactualMill CLEAN->DEFERRED (divergent inlined physics constants)

## Body
```
[MAIN-FORCE] [WIRE-UNWIRED-PAPA]/U-CFMILL-PHYSICS-BUG-FOUND (slot:papa): reclassify CounterfactualMill CLEAN->DEFERRED (divergent inlined physics constants)

Loop iter9 outcome: assessed CounterfactualMillEngine for a prism_cam wire; found it INLINES 12
DIVERGENT (wrong) Kienzle mc + Taylor C/n constants vs CANONICAL_KIENZLE/CANONICAL_TAYLOR in
src/physics/constants.ts (Sandvik 2024 + ISO 3685:1993). Kienzle mc K/N/S wrong; Taylor C P/M/K/S/H
wrong; Taylor n K/N/S/H wrong. The engine's force + tool-life + all deltas are computed from wrong
coefficients -> real prediction-correctness defect.

REFUSED to wire (R13: never a consumer atop an unsound foundation; no-inline rail) and REFUSED an
unauthorized behavior-changing mill-domain physics edit (papa soul defer-physics-edits-to-domain-slot).
Documented + routed instead (R12 fail-loud, R7 surface-don't-average). Fix unit
U-FIX-CFMILL-CANONICAL-CONSTANTS (import canonical + physics-review + downstream-impact check) -> foxtrot/kilo.
Memory: reference_counterfactual_mill_divergent_constants_2026_06_15 (domain-tagged mill, auto-fed to Obsidian).

No wire shipped this iter (correct outcome -- refusing a buggy wire is the comprehensive route, not a shortcut).
Loop stays 8/23 wired. Next CLEAN group: prism_turning (SwissType/TurretLayout, no physics issue).
```

## Files touched (2)
- state/shared/specs/PAPA-WIRE-UNWIRED-WORKLIST-2026-06-14.md | 2 +-
- 1 file changed, 1 insertion(+), 1 deletion(-)

## Lessons surfaced in commit body
- wrong) Kienzle mc + Taylor C/n constants vs CANONICAL_KIENZLE/CANONICAL_TAYLOR in
- wrong; Taylor C P/M/K/S/H
- wrong; Taylor n K/N/S/H wrong. The engine's force + tool-life + all deltas are computed from wrong

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show fe87a3ea2278`
- Milestone envelope: `mcp-server/data/milestones/WIRE-UNWIRED-PAPA.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._