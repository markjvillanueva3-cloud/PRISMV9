# FLEET-HYGIENE/U-UPS-DOMAIN-KILLSWITCH — [MAIN-FORCE] [FLEET-HYGIENE]/U-UPS-DOMAIN-KILLSWITCH (slot:golf): close the injection-audit's sole knobless-context-injector gap

**Commit:** `2688fdde17e1` · **By:** markjvillanueva3-cloud · **At:** 2026-06-17T20:49:58-05:00
**Tags:** fleet-hygiene, u-ups-domain-killswitch, auto-distilled

## Subject
[MAIN-FORCE] [FLEET-HYGIENE]/U-UPS-DOMAIN-KILLSWITCH (slot:golf): close the injection-audit's sole knobless-context-injector gap

## Body
```
[MAIN-FORCE] [FLEET-HYGIENE]/U-UPS-DOMAIN-KILLSWITCH (slot:golf): close the injection-audit's sole knobless-context-injector gap

ups-domain-bundle (the fork-storm consolidation running 9 self-gating domain
injectors in one process) gained PRISM_UPS_DOMAIN_DISABLE=1 -- a single operator
switch silences all 9 at once under API pressure without setting 9 separate env
vars. Exported pure isBundleDisabled(env) (revert-proof testable) + a CLI-entry
guard so the test imports without main() awaiting stdin. Default-unset = byte-
identical legacy behavior; fail-open preserved; stdin drained before short-circuit.

audit-injection-surface.mjs: KNOBLESS context-injectors 1 -> 0 (knob coverage
79.2% -> 80%; "every context-emitting recurring injector has a disable knob").
6/6 tests (4 pure + 2 subprocess incl guard-intact end-to-end); 2-of-2 per-file
scrutiny PASS (reviewer + code-analyzer, zero findings).

MEASURE-FIRST FINDING (R12): this overturned the SYSTEM-APPLY-EFFICIENCY spec's
"finish the dedup rollout = 429 relief" premise. Reading the live code proved the
per-turn injection surface is ALREADY comprehensively optimized -- all 5 named
"heavy" injectors have working mitigations: session-reorient (1/15-prompt
throttle), slot-domain/ai-synergy/psn-leg/model-tier/obsidian (dedupeOrMarker),
prompt-route (12-char gate + 5min/class throttle), fleet-work-digest (keyword-
gated, zero steady-state), discipline-expert (5min/bucket + meta/slash suppress),
master/memory-index prechecks (60s prompt-throttle + CAG-skip). This knob is the
one genuine measured injection-side gap. Real 429 lever is base-context + free-
model offload, NOT per-turn injection dedup.
```

## Files touched (3)
- .claude/hooks/bundles/__tests__/ups-domain-bundle.test.mjs | 68 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- .claude/hooks/bundles/ups-domain-bundle.mjs                | 39 ++++++++++++++++++++++++++++++++++-----
- 2 files changed, 102 insertions(+), 5 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 2688fdde17e1`
- Milestone envelope: `mcp-server/data/milestones/FLEET-HYGIENE.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._