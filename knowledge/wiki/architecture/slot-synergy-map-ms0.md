---
title: SLOT-SYNERGY-MAP-MS0 — /system-viz augmentation per-slot end-to-end pipeline
type: architecture
status: shipped
shipped: 2026-05-19
slot: foxtrot
commit: 6e39ec54c8d88994c9f3a890eb5dd474072aa8ae
milestone: SLOT-SYNERGY-MAP-MS0
unit: U-SLOT-SYNERGY-MAP
tags: [system-viz, augmentation, chat-slot, synergy, doctrine]
---

# SLOT-SYNERGY-MAP-MS0 — /system-viz per-slot pipeline visibility

## Intent

Render the END-TO-END pipeline per chat slot as a `/system-viz` subgraph. Before this milestone, the per-slot work surface (handoff → queue → claims → branch → commits → memories → wikis → tribal → CLAUDE.md → GSD → precompact → compact → doctrine) was scattered across multiple JSON files / dirs / git log — no single graph view connected the dots. This generator emits one ghost roost (`ghost.slot_synergy`) + 16 subsystem anchors + 13 slot nodes (one per NATO chat slot), with per-slot edges weight-encoding the count of connections to each subsystem.

## Generated graph shape

```
ghost.planned_features
└─ ghost.slot_synergy                          [roost, L8]
   ├─ ghost.slot_synergy.subsystem.handoff      [synergy-subsystem, L9, purple]
   ├─ ghost.slot_synergy.subsystem.queue
   ├─ ghost.slot_synergy.subsystem.claims
   ├─ ghost.slot_synergy.subsystem.commits
   ├─ ghost.slot_synergy.subsystem.branch
   ├─ ghost.slot_synergy.subsystem.skills
   ├─ ghost.slot_synergy.subsystem.scripts
   ├─ ghost.slot_synergy.subsystem.hooks
   ├─ ghost.slot_synergy.subsystem.memories
   ├─ ghost.slot_synergy.subsystem.wikis
   ├─ ghost.slot_synergy.subsystem.tribal
   ├─ ghost.slot_synergy.subsystem.claudemd
   ├─ ghost.slot_synergy.subsystem.gsd
   ├─ ghost.slot_synergy.subsystem.precompact
   ├─ ghost.slot_synergy.subsystem.compact
   ├─ ghost.slot_synergy.subsystem.doctrine
   ├─ ghost.slot_synergy.slot.alpha             [slot-synergy-node, L9, blue]
   ├─ ghost.slot_synergy.slot.bravo
   ├─ ghost.slot_synergy.slot.charlie
   ├─ ghost.slot_synergy.slot.delta
   ├─ ghost.slot_synergy.slot.echo
   ├─ ghost.slot_synergy.slot.foxtrot
   ├─ ghost.slot_synergy.slot.golf              [slot-synergy-node, L9, amber — hygiene]
   ├─ ghost.slot_synergy.slot.hotel
   ├─ ghost.slot_synergy.slot.india
   ├─ ghost.slot_synergy.slot.juliett
   ├─ ghost.slot_synergy.slot.kilo
   ├─ ghost.slot_synergy.slot.lima
   └─ ghost.slot_synergy.slot.mike

Edges (174 in the live first run):
  ghost.slot_synergy.slot.<nato> --[slot-uses-subsystem, weight=N, label="<key>=N"]--> ghost.slot_synergy.subsystem.<key>
  (one per (slot, subsystem) pair where count > 0)
```

## Per-subsystem signal source

| Subsystem | Signal | Count source |
|---|---|---|
| handoff   | filename attribution | `state/shared/handoffs/HANDOFF-*.md` matching `handoff-<slot>-*` OR `*-<slot>-*` OR `*-<slot>.md` |
| queue     | array length | `state/shared/slot-task-queues.json::queues.<slot>.length` |
| claims    | filter | `state/shared/slot-task-claims.json` entries with `c.slot === <slot>` |
| commits   | subject regex | `git log --format=%s -200` matching `(slot:<nato>)` modern OR `[<NATO>]` legacy uppercase-only prefix |
| branch    | slot-state field | `chat-slots.json::slots.<slot>.branch` startsWith `slot/<nato>` |
| skills    | static doctrine | 4 wrappers per slot (`/checkin /handoff /precompact /startup`) × 13 = 52 fleet-wide |
| scripts   | static doctrine | 5 slot-aware scripts (`chat-slots`, `slot-task-claim`, `slot-queue`, `allocate-rgs-per-slot`, `topup-slot-queues`) |
| hooks     | static doctrine | 3 work hooks (`slot-bind-enforce`, `stop-slot-task-claims-advisory`, `fleet-task-health-stop`); 5 for golf (+ `golf-slot-write-allowlist` + `golf-slot-reaper-guardian`) |
| memories  | doctrine | 1 — per [[reference_auto_memory_feeds_obsidian_stophook]] |
| wikis     | doctrine | 1 — per [[reference_session_continuity_stack_2026_05_15]] §Doc reflection rule |
| tribal    | doctrine | 1 — per slot's domain mapping (alpha=mill, bravo=lathe, charlie=wire-edm, delta=cad, echo=cam, foxtrot=machining-knowhow+tribal, golf=hygiene+database, hotel=erp+business, india=post-processor+master-post, juliett=speed-feed, kilo=print-to-program, lima=prism-academy+learning, mike=misc) |
| claudemd  | doctrine | 1 — CLAUDE.md is the doctrine pointer index per [[knowledge-vault-schema]] |
| gsd       | doctrine | 1 — `mcp-server/data/docs/gsd/` shared across all slots |
| precompact| doctrine | 1 — `precompact-handoff.mjs` PreCompact hook auto-writes slot handoff per [[reference_precompact_hook_autowrite_2026_05_15]] |
| compact   | doctrine | 1 — `session-start-auto-resume.mjs` SessionStart:compact hook re-injects RESUME |
| doctrine  | doctrine | 1 — TDD per-file scrutiny + 3-of-3 Stop gate + DSL shortcodes apply uniformly |

## Implementation

| File | Role | LOC |
|---|---|---|
| `scripts/generate-slot-synergy-features.mjs` | Pure `generate()` + `main()` + `readJsonSoft` + `readRecentCommits` (execFileSync git, no shell). R12 caveats[] surface for input degradation. | ~330 |
| `scripts/generate-slot-synergy-features.test.mjs` | 48 node:test cases: drift guards (5) · safeId (3) · handoffMatchesSlot (5) · commitMatchesSlot (6) · generate invariants (12) · dedup (2) · failure modes (3) · adversarial (3) · integration (2) · misc (7). | ~310 |
| `scripts/regen-viz.mjs` | FAST[] entry: `"generate-slot-synergy-features.mjs"` after `generate-domain-pipeline-features.mjs`. | +1 |
| `scripts/merge-augmentations.mjs` | `loadOptional("slot-synergy-augmentation.json")` + `versions.slotSynergy` + 30-line splice block (mirrors 5 existing identical blocks). | +33 |

## R12 fail-loud surface

Per [[reference_silent_close_out_drift_2026_05_17]], silent-degrade on missing inputs would be the worst failure mode (all slots labeled FREE/0 with no signal). `main()` collects a `caveats: string[]` per unavailable input:
- `chat-slots.json unavailable (missing|parse: ...) — all slots will render as FREE`
- `slot-task-queues.json unavailable (...) — per-slot queue counts = 0`
- `slot-task-claims.json unavailable (...) — per-slot claim counts = 0`
- `git log unavailable (git log: ...) — per-slot commit counts = 0`

The caveats array is written to the augmentation JSON AND to stderr so an operator running `node scripts/generate-slot-synergy-features.mjs` sees `[slot-synergy] N caveat(s)` immediately. Zero caveats = all 4 inputs healthy.

## Drift guards

The test suite re-parses `SLOT_NAMES` from `.claude/helpers/chat-slots.mjs` source and asserts byte-equality (line 45 of the test file). Adding a 14th NATO slot to chat-slots.mjs without updating this generator will fail this test. The 16-key `SUBSYSTEMS` invariant + per-key explicit `keys.includes("...")` assertion catches silent subsystem-list drift.

## Cross-references

- [[reference_priority_queue_ms0_2026_05_16]] — sibling generator pattern.
- [[reference_misc_tasks_extraction_2026_05_16]] — sibling generator pattern.
- [[reference_per_slot_claim_ms0_2026_05_16]] — `state/shared/slot-task-claims.json` source.
- [[reference_slot_worktree_activation_2026_05_16]] — slot/<nato> branch convention.
- [[reference_session_continuity_stack_2026_05_15]] — handoff + precompact + compact session-continuity stack.
- [[domain-pipeline-ms0]] — domain mapping per slot.
- [[reference_silent_close_out_drift_2026_05_17]] — fail-loud-on-degrade pattern this generator extends.

## Verify

```bash
# 48-case test suite
node --test H:/prism/scripts/generate-slot-synergy-features.test.mjs
# expect: # tests 48 # pass 48 # fail 0

# Live generate
node H:/prism/scripts/generate-slot-synergy-features.mjs
# expect: roost emitted: 1 / subsystem anchors: 16 / slot nodes: 13/13 / edges emitted: 100+

# Full regen-viz pipeline picks up the augmentation
node H:/prism/scripts/regen-viz.mjs
# expect: stat slot-synergy nodes + edges in the merge summary

# Commit reference
git -C H:/prism show 6e39ec54c8d88994c9f3a890eb5dd474072aa8ae --stat
```
