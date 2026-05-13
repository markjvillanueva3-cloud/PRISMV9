---
description: Deterministic next-unit picker from the two master roadmaps (devtools first, then revenue). Subtracts already-shipped units, sorts by priority + tier, returns top-N with spec paths. Use when the user says "pick a unit" or "pick the next thing to ship."
allowed-tools: Bash, Read
---

# /pick-unit — Always pick from the right roadmap, in the right order

User standing rule (2026-05-13): *"when I say pick a unit, units are picked from those 2 road maps with development tools taking first priority."*

The pickable roadmaps are encoded in `state/shared/atomic-roadmap.json`:

| Priority | Roadmap | Field | Count (as of 2026-05-13) |
|----------|---------|-------|---|
| **0 (first)** | `BACKEND-DEVTOOLS-RGS6-MEGA-ROADMAP` | `roadmap_priority === 0` | 3078 units |
| **0 (first)** | `TRIBAL-PIPELINE` — JM Die / docustra / tribal-knowledge → end-to-end mill/lathe/wire-EDM pipelines + lathe-program conversion to optimized mix of hardcoded / macro / conversational / all-toolpath for all 3 machine types. Composed of `TRAINING-LEARNING-MS0` (template-corpus feeder), `MACRO-PROGRAM-PIPELINE-MS0` (safety-gated emit), `BLUEPRINT-OCR-TRAINING-MS1` (OCR context). Injected 2026-05-13 by `scripts/inject-tribal-pipeline-into-atomic-roadmap.mjs`. | `track === "training-pipeline"` (`roadmap_priority === 0`) | 19 units |
| **1 (second)** | `REVENUE-ROADMAP-v7.6` | `roadmap_priority === 1` (`track === "revenue"`) | 585 units |

Devtools + training-pipeline share priority 0 and are picked before revenue. Within each priority, sort by tier asc → milestone asc → unit_id asc. Already-shipped units (from `MILESTONE_PROGRESS.json`) are dropped.

**Inject more milestones** into the pickable pool: `node scripts/inject-tribal-pipeline-into-atomic-roadmap.mjs` — reads named milestone envelopes (default: TRAINING-LEARNING-MS0 + MACRO-PROGRAM-PIPELINE-MS0 + BLUEPRINT-OCR-TRAINING-MS1) and appends pending units to atomic-roadmap.json + assigns to slot alpha. Idempotent. Edit `TRIBAL_PIPELINE_MILESTONES` in the script to add more.

## Invocation

```
/pick-unit                                # top 5 from current slot's lane, devtools-only
/pick-unit --slot bravo                   # explicit slot (alpha|bravo|charlie|delta|echo|foxtrot)
/pick-unit --priority revenue             # revenue track only (use when devtools-lane is exhausted)
/pick-unit --priority any                 # both roadmaps — devtools still ranks first
/pick-unit --tier 0                       # tier-0 only (highest priority within roadmap)
/pick-unit --limit 1                      # just the top recommendation
/pick-unit --json                         # machine-readable (for chaining)
```

Backed by `scripts/pick-unit.mjs`. Pure read — no state mutation. Re-runs always pick from the live atomic-roadmap + MILESTONE_PROGRESS so picks reflect what other chats have shipped.

## How it ranks

```
sort by:
  1. roadmap_priority   asc  (0 = devtools wins)
  2. tier               asc  (t0 wins within roadmap)
  3. milestone          asc  (deterministic tie-break)
  4. unit_id            asc  (deterministic tie-break)
```

Same query always returns the same top — no random sampling, no LLM hallucination. Two chats running `/pick-unit` against the same lane state get the same answer.

## What you get per pick

```
[devtools/t1] ACP-MS0 / P0-U02
  Inventory hook definitions (existing + CCM planned) and map to automation lifecycle stages
  spec: H:/prism/mcp-server/data/milestones/ACP-MS0.json
  depends_on: P0-U01
  effort: ~40 min
```

The `spec:` path is the milestone envelope JSON. Open it + grep for the unit_id to find:
- Full `build_description`
- `files_created` / `files_modified` lists
- `exit_conditions` (acceptance criteria)
- `dependencies` (other units that must ship first)
- `rollback` procedure

## Slot → chat mapping

```
alpha = 1   bravo = 2   charlie = 3   delta = 4   echo = 5   foxtrot = 6
```

`/checkin` claims a slot; `/pick-unit` reads it from the slot binding. If the helper can't resolve the slot, falls back to alpha (chat 1).

## When to use `--priority revenue`

Devtools is first priority, but the lane has finite work. If `/pick-unit` returns no candidates after `--priority devtools` (lane exhausted for this chat), switch to `--priority revenue` to start on revenue units. You can also use `--priority any` to see both lists merged.

## Companion

- `/checkin` — claim slot + verify lane is safe before starting work
- `/master-index <q>` — search the codebase for context on the picked unit
- `/awareness-snapshot` — see what's built/wired/utilized before changing anything
- `/orphan-inventory` — see the actionable unwired engines (concrete wiring targets)

Shipped 2026-05-13 OBSIDIAN-PRISM-OS-MS0/U-PICK-UNIT (slot alpha) per user directive that "pick a unit" must be deterministic + devtools-first.
