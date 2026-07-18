---
description: Generate per-unit implementation plans for PSN-INCORPORATION-MS0 deep-learning, machine-learning, and deep-reasoning units. Real-content specs (no stubs). Pickable by fleet slots.
allowed-tools: Bash, Read, Write, TaskCreate
---

# /psn-automate — PSN DL/ML/reasoning unit automation kernel

Generates concrete per-unit implementation plans for the 58 deep-learning + machine-learning + deep-reasoning units in `PSN-INCORPORATION-MS0` (commit 4606d6066a). Each plan is real-content (file paths + dependencies + dispatcher targets + exit criteria + close-out steps) — NO stubs per CLAUDE.md §SAFETY + `feedback_dont_soften_completeness_gates`.

## When to use

- After `PSN-INCORPORATION-MS0` envelope ships (it has)
- When fleet slots are about to pick up DL/ML/reasoning units and need concrete build plans
- When operator wants to see the buildable-now subset for a specific slot

## Invocation

```bash
# All 58 eligible units → state/shared/specs/psn-incorp/<unit-id>.md
node scripts/psn-incorp-automate.mjs

# Filter to charlie's wire-EDM domain (regex-matched)
node scripts/psn-incorp-automate.mjs --slot charlie

# Single unit (e.g. R3 TOP-10 picks)
node scripts/psn-incorp-automate.mjs --unit U-PSN-R3-VER-02

# Single phase
node scripts/psn-incorp-automate.mjs --phase P9-R3-REASONING

# JSON manifest of eligible units (no file emit)
node scripts/psn-incorp-automate.mjs --json
```

## Slot-domain filters built in

| Slot | Domain | Picks units mentioning |
|---|---|---|
| alpha | mill | mill/milling/kienzle/chatter |
| bravo | lathe | lathe/turning/swiss |
| charlie | wire-EDM | WEDM/wire/spark/recast/HAZ/kerf/flush/electrode/safety_gate/EDM |
| delta | CAD | CAD/blueprint/OCR/drawing/SAM/CLIP |
| echo | CAM | CAM/toolpath/hyperMILL/Mastercam |
| foxtrot | tribal/wiki | tribal/wiki/knowledge/memory |
| hotel | ERP/workflow | ERP/cost/quote/workflow/temporal/inngest |
| india | post-processor | post/controller/Fanuc/Siemens/Heidenhain/Outlines |
| juliett | speed-feed | speed/feed/active learning/curriculum |
| kilo | print-to-program | print-to-program/p2p/intake |
| lima | academy/mobile | academy/mobile/Continue |

## Output format per unit

Each generated `state/shared/specs/psn-incorp/<unit-id>.md` carries:
1. Rationale (from envelope `note` field)
2. **8-step concrete build plan**: pre-flight dedup → engine target → test target → dispatcher wiring (engine-wire-to-all-sources) → PSN-leg integration → per-file scrutiny gate → exit criteria → 4-surface close-out
3. R12 out-of-scope deferrals (named)
4. Cross-references

## What this does NOT do

- ❌ Does NOT generate engine source code (no stubs allowed)
- ❌ Does NOT auto-flip envelope statuses (advisory only per [[feedback_auto_close_out]])
- ❌ Does NOT bypass the per-file scrutiny gate (each plan REQUIRES it on build)

## Companion Stop hook

`stop-psn-automate-status.mjs` surfaces "N units have ready implementation plans; M still raw" on session end when DL/ML/reasoning units are in scope.

## Doctrine

- `feedback_psn_definition` — 11-leg PSN map (plans cite which legs each unit touches)
- `feedback_roadmap_close_out` — 4-surface close-out per shipped unit
- `feedback_dont_soften_completeness_gates` — no stubs in generated specs
- CLAUDE.md §PER-FILE SCRUTINY GATE — applies to each engine build the spec triggers

## Cross-refs

- Source envelope: `mcp-server/data/milestones/PSN-INCORPORATION-MS0.json` (commit 4606d6066a)
- Source specs: PSN-{HIGH-ROI-SURFACE-AUDIT,INCORPORATION-RESEARCH-R2,INCORPORATION-RESEARCH-R3-LEARNING-REASONING}-2026-05-23.md
- Memory: [[reference_psn_incorporation_ms0_2026_05_23]]
