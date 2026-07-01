# POST-BRIDGE-SYNERGY-MS0/U-WIZARD-NODE-BRIDGE — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [POST-BRIDGE-SYNERGY-MS0]/U-WIZARD-NODE-BRIDGE (slot:echo /loop iter38 /yolo): unified mill/lathe/wire-EDM wizard contract.

**Commit:** `caa870ff7755` · **By:** markjvillanueva3-cloud · **At:** 2026-05-27T02:44:47-05:00
**Tags:** post-bridge-synergy-ms0, u-wizard-node-bridge, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [POST-BRIDGE-SYNERGY-MS0]/U-WIZARD-NODE-BRIDGE (slot:echo /loop iter38 /yolo): unified mill/lathe/wire-EDM wizard contract.

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [POST-BRIDGE-SYNERGY-MS0]/U-WIZARD-NODE-BRIDGE (slot:echo /loop iter38 /yolo): unified mill/lathe/wire-EDM wizard contract.

Today PRISM has three domain wizards (mill, lathe, wire_edm) that each
carry their own UI flow, state machine, answer collection, and output
schema. Operators trained on one get lost in another, and the
shop-floor consumer code has to special-case every domain. This unit
defines ONE contract so the shop-floor UI is one component with three
configs (mill | lathe | wire_edm).

Contract:
  WIZARD_DOMAINS = ['mill', 'lathe', 'wire_edm']
    Refuses unknown domains at createWizard() → null (no shadow wizards)
  STEP_KINDS = ['question', 'computation', 'validation', 'emit']
    Refuses unknown kinds (filtered out at create time)
  STATUS_VALUES = ['in_progress', 'blocked', 'complete', 'errored']

  createWizard({domain, steps[]}) — immutable wizard instance with
    starting state {currentIndex:0, answers:{}, status:'in_progress'}
  currentStep() — null past end (no out-of-bounds reads)
  canAdvance() — true iff current step has all required input + passes
    validator. Validator throws are caught → false (fail safe, not crash)
  advance(wizard, answer) — fold answer + advance cursor IF valid;
    invalid answer → status='blocked', cursor unchanged (no silent
    skip past a bad answer)
  collectAnswers() — returns a COPY (mutating the result doesn't
    affect the wizard's own answer state — defensive against caller bugs)
  emit() — null if incomplete; full {schemaVersion, domain, wizardId,
    completedAtIso, answers, stepCount} otherwise
  summarizeProgress() — {current, total, percentage, status} for UI
  reset() — back to step 0, clear answers, status='in_progress'
  jumpToStep(index) — bounded; out-of-bounds returns wizard unchanged
  summarizeWizardShape() — per-kind step tally + requiredCount for
    dashboards (audit: how many steps does each domain's wizard have?)

14 exports. 50 concrete-value tests including:
  - 3 domain happy-paths (mill, lathe, wire_edm all create)
  - validator-throws caught (no crash)
  - immutability after every advance() call (original w0 unchanged)
  - blocked status when invalid answer attempted on required step
  - 3-step full walkthrough → status='complete' → emit() yields full output
  - reset() rewinds + clears + restores in_progress
  - jumpToStep out-of-bounds refused

Next: U-SFC-NODE-BRIDGE (iter39, kills 5+ duplicate Speed/Feed paths)
+ U-POST-GEN-BRIDGE (iter40, postgen ↔ bridge unification).
```

## Files touched (3)
- scripts/lib/wizard-node-bridge.mjs      | 183 ++++++++++++++++++
- scripts/lib/wizard-node-bridge.test.mjs | 326 ++++++++++++++++++++++++++++++++
- 2 files changed, 509 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show caa870ff7755`
- Milestone envelope: `mcp-server/data/milestones/POST-BRIDGE-SYNERGY-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._