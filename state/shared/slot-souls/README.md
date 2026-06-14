---
title: Slot Souls — Hermes-pattern personality files per slot
type: doctrine
hermes_layer: personality
mapped_to: U-HERMES02 + U-MWO14
date: 2026-05-26
last_audit: 2026-05-26 (U-MWO14, slot:bravo /goal /loop iter3)
---

# Slot Souls — per-slot personality + behavior contracts

Closes the 🟡 personality gap identified in [[hermes-evolving-skills-gap-2026-05-17]]. Hermes
patterns one `soul.md` per agent — "concise / sarcastic / blunt / formal / fast / thoughtful";
PRISM patterns one soul file per NATO slot, capturing voice + escalation path + refuse-list
+ preferred subagent type + domain filter + Hermes role mapping.

## Why this lives at `H:/prism/state/shared/slot-souls/` and not `.claude/souls/`

The Hermes-convention path would be `.claude/souls/<slot>.md`. PRISM deliberately diverges:
souls live at **`state/shared/slot-souls/`** so the 26-chat fleet sees one canonical set per
project (multi-host shareable via git). The `.claude/` tree is per-machine
(c-to-h-mirror replicates but per-machine churn is real — settings.json, cache,
worktrees). Slot souls MUST be identical fleet-wide for soul-inject + zulu routing to
work; state/shared is the right home.

The `slot-soul-inject.mjs` hook reads from `state/shared/slot-souls/<slot>.md` directly
(verify with `grep "slot-souls" .claude/hooks/slot-soul-inject.mjs`). Future migration to
`.claude/souls/` is a non-goal unless Hermes interop becomes a hard requirement.

## Schema (frontmatter)

| Field | Type | Purpose |
|---|---|---|
| `slot` | string | Slot name (alpha..zulu). Must match filename. |
| `role` | string | One-word role tag (orchestrator, mill-specialist, hygiene, …). |
| `voice` | string | How the slot writes — terse / physics-first / clinical / etc. |
| `tone` | string | How the slot reasons — decisive / rigorous / maintenance-first / etc. |
| `escalation_path` | string | When the slot punts vs decides. |
| `refuse_list` | string[] | What this slot will NOT do regardless of prompt. |
| `preferred_subagent_type` | string | Default `subagent_type` for parallel reviewer dispatch. |
| `domain_filter` | string | Pipe-separated keyword filter (matched against task text by zulu). |
| `hermes_role` | string | Mapping to Hermes 4-layer topology: orchestrator-hermes / specialist-X / maintenance-specialist. |

## How souls are consumed

1. **`slot-soul-inject.mjs` hook** (UserPromptSubmit) — reads `state/shared/slot-souls/<slot>.md`
   for the current slot, injects the frontmatter + the "Voice" + "Behavior" sections as
   `additionalContext` on every prompt. Keeps slot character consistent across `/compact`.
2. **Zulu orchestrator** — reads `domain_filter` + `refuse_list` from every slot's soul to
   route work (specialist match) and avoid dispatch into refused scopes.
3. **Per-file scrutiny gate** — `preferred_subagent_type` drives the default Arm A reviewer
   choice when the file type doesn't override (e.g. mill engine → physics-reviewer for bravo).

## Current population (28 files on 2026-05-26 audit, U-MWO14)

**Rich specialist souls (~1.6-2.4 KB, full Voice/Behavior/Refuses/When-in-doubt sections):**
- `alpha.md` · `bravo.md` (mill) · `charlie.md` · `delta.md` (CAD) · `echo.md` (CAM)
- `foxtrot.md` (machining-knowhow+tribal) · `golf.md` (hygiene+reaper)
- `hotel.md` (erp+hr) · `india.md` (post-processor) · `juliett.md` (speed-feed)
- `kilo.md` (print-to-program) · `lima.md` (PRISM Academy) · `mike.md` (misc)

13 souls = 13 of the 26 slots. Covers the original NATO fleet pre-SLOT-RECLAIM (alpha..mike).

**Placeholder souls (~800 B, "currently unallocated; picks from priority queue"):**
- `november.md` · `oscar.md` · `papa.md` · `quebec.md` · `romeo.md` · `sierra.md`
- `tango.md` · `uniform.md` · `victor.md` · `whiskey.md` · `xray.md` · `yankee.md` · `zulu.md` · `zulu.md`

Wait — `zulu.md` is **NOT** a placeholder; it carries the **orchestrator-hermes** role (the
Hermes designated routing slot). It is named alphabetically with the post-SLOT-RECLAIM
expansion but is one of the load-bearing rich souls in the fleet. The 13 placeholders are
`november..yankee + zulu` (13 entries total — same count as the expansion).

**Audit reality (2026-05-26):** 13 rich + 1 orchestrator (zulu) + 13 placeholders = 27 functional + README.

## Future work (U-MWO11 in MEMORY-WIKI-OPTIMIZATION-MS0)

Either materialize november-zulu as specialists (5-7 of them have natural domain homes —
audit-only, vendor-portal, video-learn, knowledge-graph), or formalize the placeholder
charter (currently each placeholder says only "picks from priority queue like any work
slot" — the charter should specify default subagent, escalation paths for
physics/safety/post/CAM work, and a real `refuse_list`).

## See also

- [[hermes-evolving-skills-gap-2026-05-17]] — original research
- `state/shared/specs/HERMES-EVOLVING-SKILLS-RESEARCH-2026-05-17.md` — spec
- `state/shared/specs/CLAUDE-MD-PROJECT-FOLDER-OPTIMIZATION-2026-05-26.md` — U-MWO14 + U-MWO11 audit
- `.claude/hooks/slot-soul-inject.mjs` — the injector hook

<!-- AI-SYSTEMS-STATE:BEGIN -->
## AI-systems fleet state (synergy pointer)
> Live fleet AI-systems state -- GNN selective-deploy, octopus consensus, RAG/CAG, Ollama
> offload, AI-synergy -- is persisted at `knowledge/memories/patterns/ai-systems-fleet-state.md`
> (recall-discoverable; this galaxy's reasoning-bridge + CAG already consume it). Regenerate:
> `node scripts/ai-systems-fleet-state.mjs`. Synergy: [[reference_ai_systems_fleet_state_2026_06_11]]
> - [[gnn-selective-deploy]] - [[psn-octopus-fleet-synergy-ms0]] - [[zulu-ledger-reconciler]].
<!-- AI-SYSTEMS-STATE:END -->
