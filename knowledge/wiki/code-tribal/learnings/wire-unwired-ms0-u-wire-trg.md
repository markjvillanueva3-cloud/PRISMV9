# WIRE-UNWIRED-MS0/U-WIRE-TRG — [MAIN] [WIRE-UNWIRED-MS0]/U-WIRE-TRG: wire TurningRulesGeneratorEngine into prism_turning (2 actions)

**Commit:** `5e23bc1fab6e` · **By:** markjvillanueva3-cloud · **At:** 2026-05-16T16:37:42-05:00
**Tags:** wire-unwired-ms0, u-wire-trg, auto-distilled

## Subject
[MAIN] [WIRE-UNWIRED-MS0]/U-WIRE-TRG: wire TurningRulesGeneratorEngine into prism_turning (2 actions)

## Body
```
[MAIN] [WIRE-UNWIRED-MS0]/U-WIRE-TRG: wire TurningRulesGeneratorEngine into prism_turning (2 actions)

Wires TurningRulesGeneratorEngine (LATHE-PRO, 344 LOC) into prism_turning.
Two new actions:

  - turning_rules_generate → generate(context): RuleSet
  - turning_rules_stats    → getStats() (zero-arg capability surface)

Generates structured speed/feed/DoC/spindle/chatter envelope rules with
literature-cited bounds. Engine was orphan in dispatcher graph since
LATHE-PRO ship (confirmed via grep — zero dispatcher refs).

PRE-WIRE GATE (new this session, the U-WIRE-TSA lesson): verified the
engine-direct test (TurningRulesGeneratorEngine.test.ts) is GREEN 14/14
BEFORE wiring. An engine whose own shipped test is red is a repair
candidate, not a wire candidate — wiring it propagates breakage to a new
surface (see reverted U-WIRE-TSA: that engine's test was pre-broken 8/11
since 6ec393cf4, so it was correctly NOT wired).

mergeRuleSets intentionally NOT wired — composition-only helper (caller
feeds generate() outputs back); zero standalone value and wiring it would
impose a full MachiningRule serialization contract for no caller. Per
feedback_dont_wire_for_wiring_sake.

Reference values pinned in tests from the engine's published tables:
  - Sandvik Coromant 2023: ISO-P Vc rough [180,260] / finish [260,400];
    ISO-S finish [60,120] m/min
  - Machinery's Handbook 31e: roughing fn [0.2,0.5], ap [1.5,6.0] mm
  - Machine spec: swiss spindle cap 12000 RPM
  - Sandvik chatter ref: carbide L/D=6, dampened L/D=10

4-surface coverage:
  ✓ schema   — 2 Zod schemas (generate: 1 required + 4 gated-optional
                enums; stats: zero-arg passthrough) + 2 export-map entries
  ✓ dispatcher — 2 ACTIONS enum entries + batch case block (1 lazy import)
  ✓ engine-direct test — TurningRulesGeneratorEngine.test.ts (14/14, pre-
                          existing, GREEN-verified before wiring)
  ✓ dispatcher round-trip — 18 new cases:
        2 schema registration
        6 schema rejection (missing/empty material, unknown iso/op/
                            machine_class, material-only accept, stats {})
        7 generate round-trip:
            - material-only → ZERO rules (documented gating, slim-stripped
              empty array → inverse-check pattern)
            - iso_group P → 2 velocity rules @ Sandvik bounds
            - +operation=roughing → 1 vc rule + fn[0.2,0.5] + ap[1.5,6.0]
            - machine_class=swiss → spindle cap 12000 RPM, priority 10
            - tool 'carbide' → L/D=6 chatter; 'anti-vibration' → L/D=10
            - full context → all 5 rule families + count-map sums to len
        2 stats round-trip (6 ISO groups + 7 operations + rule_kinds order)
        1 dispatcher-boundary rejection
  Total: 18/18 vitest green.

Tsc baseline: zero new errors on touched files.

References:
  Sandvik Coromant 2023 turning reference tables
  Machinery's Handbook, 31st Ed. (feed + DoC envelopes)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (4)
- .../dispatcher.turningRulesGenerator.test.ts       | 274 +++++++++++++++++++++
- mcp-server/src/schemas/turningActionSchemas.ts     |  34 +++
- .../src/tools/dispatchers/turningDispatcher.ts     |  34 +++
- 3 files changed, 342 insertions(+)

## Lessons surfaced in commit body
- lesson): verified the

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 5e23bc1fab6e`
- Milestone envelope: `mcp-server/data/milestones/WIRE-UNWIRED-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._