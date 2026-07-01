# BUILD-QUALITY-PAPA/U-TSC-DOMAIN-MIKE — [MAIN-FORCE] [BUILD-QUALITY-PAPA]/U-TSC-DOMAIN-MIKE (slot:papa): mike/WEDM tsc batch1 — 5 mechanical fixes (457->438)

**Commit:** `358c6bbce73d` · **By:** markjvillanueva3-cloud · **At:** 2026-06-16T13:43:52-05:00
**Tags:** build-quality-papa, u-tsc-domain-mike, auto-distilled

## Subject
[MAIN-FORCE] [BUILD-QUALITY-PAPA]/U-TSC-DOMAIN-MIKE (slot:papa): mike/WEDM tsc batch1 — 5 mechanical fixes (457->438)

## Body
```
[MAIN-FORCE] [BUILD-QUALITY-PAPA]/U-TSC-DOMAIN-MIKE (slot:papa): mike/WEDM tsc batch1 — 5 mechanical fixes (457->438)

Type-correct reconciliation, behavior-neutral, 0 fabricated values:
- WedmProgramIndexEngine: Dirent<string>[] annotation (@types/node v25 generic)
- WEDMGapVoltageControlEngine: let low/high :number (literal-narrowing; EDM_PHYSICS values unchanged)
- WEDMArchiveBackfillEngine: this.statePath guard + JSON.stringify trace metadata
- WireEDMDeepAIHardeningEngine: removed dead firstPass.on/off override (runtime-identical, 15/5/10 defaults preexisting)
- WEDMFeedbackIngestionEngine: dropped predicted/error_pct from post() opts (post() never stored them)

DEFER->mike (shop-floor domain decisions, papa will NOT guess):
- WEDMSetupSheetEngine: agent swapped hasTaper taper->skim (SEMANTIC BUG, corrupts operator tip selection) + wire_consumption=0/per_pass=[]/passes_per_profile->num_passes display decisions
- WireEDMMachineTechDataEngine: method required->optional weakens TechLookupResult (needs found/not-found discriminated union)
- WEDMJobCreator/WEDMNeuralTraining incomplete; WEDMNeural+WEDMProductionReadiness+WEDMCalculatorAI blocked on AIReasoningDomain wedm_* enum decision
- WEDMSafetyEnvelope: axis envelope-limit VALUES (never fabricate safety envelope)
```

## Files touched (6)
- mcp-server/src/engines/WEDMArchiveBackfillEngine.ts    | 12 ++++++------
- mcp-server/src/engines/WEDMFeedbackIngestionEngine.ts  |  2 --
- mcp-server/src/engines/WEDMGapVoltageControlEngine.ts  |  4 ++--
- mcp-server/src/engines/WedmProgramIndexEngine.ts       |  5 +++--
- mcp-server/src/engines/WireEDMDeepAIHardeningEngine.ts | 10 ++++------
- 5 files changed, 15 insertions(+), 18 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 358c6bbce73d`
- Milestone envelope: `mcp-server/data/milestones/BUILD-QUALITY-PAPA.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._