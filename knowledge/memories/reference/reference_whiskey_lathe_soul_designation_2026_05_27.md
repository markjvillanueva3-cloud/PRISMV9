---
name: reference-whiskey-lathe-soul-designation-2026-05-27
description: Whiskey designated as canonical lathe-specialist slot per operator directive 2026-05-27 — closes lathe-soul gap noted in CLAUDE.md JULIETT-12CHAT-ALLOCATION-MS0 D3 amendment.
type: reference
slot: whiskey
source: prism-memory
synced: 2026-06-27T20:30:47.261Z
aliases: reference_whiskey_lathe_soul_designation_2026_05_27
---


# Whiskey lathe-soul designation (2026-05-27)

Operator directive on slot:whiskey `/checkin-whiskey`: **"whiskey is the designated lathe chat slot."** This closes the `lathe-soul` line item in CLAUDE.md §[[reference_juliett_12chat_allocation_2026_05_17|JULIETT-12CHAT-ALLOCATION]]-MS0 D3 amendment's "Pending wedm-soul + lathe-soul + cad-soul + ..." list.

## Why this codifies existing reality (not a new assignment)

Whiskey has been the de-facto lathe slot for 137+ iterations of in-flight work, despite the soul file (`state/shared/slot-souls/whiskey.md`) still claiming `role: work` / `domain_filter: any` / `Currently unallocated`. Evidence on disk before this designation:

- [[reference_whiskey_lathe_implementation_state_iter137_2026_05_27]] — 5 P0 lathe engines shipped + 81 hermetic tests + E2E composition smoke (G76 thread validator, shop tool-library bridge, tribal-query engine, wizard vendor-lookup, A/B-version locator).
- [[reference_whiskey_lathe_corpus_state_2026_05_27_iter101]] — corpus-state snapshot iter101.
- [[reference_whiskey_lathe_corpus_state_2026_05_27_iter42]] — corpus-state snapshot iter42 (cumulative 42 iters of lathe work).
- Wiki precedent: `jm-die-lathe-upgrade-ms0-u-okuma-lathe-g50-check`, `jm-die-lathe-upgrade-ms0-u-outcome-capture-disable-knob`, `lathe-unwired-wire-ms0-u-luw02` (wired 43 unwired Lathe engines via latheDispatcher) — every one of these wiki entries already attributed to `slot:whiskey`.

The soul update is doctrinal cleanup that brings the frontmatter into alignment with the work history, not a new domain claim.

## What the new soul encodes (vs prior generic-work soul)

| Field | Before | After |
|-------|--------|-------|
| role | work | lathe-specialist |
| voice | direct | physics-first |
| tone | balanced | rigorous |
| domain_filter | any | lathe\|turning\|css\|g50\|g96\|g97\|chip-thinning\|threading\|parting\|grooving\|boring\|chuck\|tailstock\|sub-spindle\|bar-feed\|swiss\|live-tool\|mill-turn |
| preferred_subagent_type | code-analyzer | physics-reviewer |
| hermes_role | work | specialist-lathe |
| refuse_list | (none) | inline-physics-constants, stub-engine-creation, softening-safety-thresholds, skipping-spindle-torque-gate, skipping-chuck-jaw-force-verify |
| escalation_path | standard | validate-kc-taylor-constants-before-edit; defer-spindle-torque-to-physics-reviewer; verify-chuck-jaw-force-before-program-emit |

Body section now spells out: G50/G96/G97 dispatch correctly; multi-pass threading discipline (G76 rough → semi-finish → finish); chuck-jaw + pull-out + lift-off + part-catcher gates before any program emit; spindle-torque + spindle-power envelope on every operation; Okuma OSP / Fanuc / Mazatrol / Haas-NGC dialect awareness; JM Die ~51-58 customer lathe-program corpus; preferred dispatcher surface (`prism_turning`, `prism_turning_program`, `prism_calc:turning_force/lathe_*`); preferred skill surface (`/lathe-studio`, `/lathe`, `/lathe-print-to-program`, `/lathe-thread`, `/lathe-groove`, `/lathe-postgen`, `/lathe-masterpost`, `/lathe-lora`, `/lathe-optimize`, `/auto-speed-feed-lathe`, `/quality-check-lathe`, `/quality-gate-lathe`, `/ship-lathe`).

## Surfaces updated (4-surface reflect rule per [[feedback_reflect_all_changes_post_update]])

1. **Soul file** — `state/shared/slot-souls/whiskey.md` (rewritten from work-slot template to lathe-specialist).
2. **HTML twin** — `state/shared/slot-souls/whiskey.html` + `state/shared/dashboards/fleet-souls.html` regenerated via `node scripts/emit-soul-html.mjs whiskey` (renderer is batch-mode — rebuilds all 27 souls + fleet rollup in one pass; this is normal, not a bug).
3. **CLAUDE.md** — §[[reference_juliett_12chat_allocation_2026_05_17|JULIETT-12CHAT-ALLOCATION]]-MS0 D3 amendment: removed `lathe-soul +` from "Pending …" list; added `whiskey=lathe` to canonical galaxy↔slot mapping.
4. **MEMORY.md index** — pointer line added under "Standing doctrine (feedback_*)" section.

Obsidian mirror happens automatically via the `stop-obsidian-memory-feed.mjs` Stop hook ([[feedback_auto_memory_feeds_obsidian_stophook.md]]).

## Remaining JULIETT D3 gaps (operator follow-up)

After this commit, the D3 "Pending …" list still has: `wedm-soul + cad-soul + cam-soul + shop-floor-soul + cad-fusion-live-soul + tribal-knowledge-soul + compliance-safety-soul + quality-soul` (8 of original 9 — lathe-soul now closed).

Note: charlie's slot soul (read earlier this session) was *already* a `specialist-wire-edm` role even though D3 lists wedm-soul as pending. There is doctrine drift between the slot-soul frontmatter and the JULIETT D3 amendment text. Tracked but not in scope for this commit — see [[feedback_reflect_all_changes_post_update]] for the standing reconciliation rule.

## Verification

```bash
# soul role frontmatter
rg "^role: lathe-specialist" H:/prism/state/shared/slot-souls/whiskey.md
# HTML twin reflects new role
rg "specialist-lathe" H:/prism/state/shared/slot-souls/whiskey.html
# CLAUDE.md gap closed
rg "lathe-soul" H:/prism/CLAUDE.md   # expect 0 matches in §JULIETT D3 Pending list
```
