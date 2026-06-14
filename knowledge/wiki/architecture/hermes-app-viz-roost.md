---
title: Hermes App system-viz roost (P4)
type: architecture
created: 2026-06-05
slot: bravo
milestone: HERMES-APP-INCORPORATION-MS0
unit: U-HERMES-VIZ-ROOST
tags: [hermes, system-viz, obsidian, psn, synergy, ghost-roost]
---

# Hermes App system-viz roost — making the Hermes↔PRISM↔Obsidian↔system-viz synergy observable

`scripts/generate-hermes-features.mjs` (HERMES-APP-INCORPORATION-PLAN-2026-06-02 **P4**) surfaces the **external Nous Research Hermes desktop app** (Electron GUI + Python agent at `C:/Users/wompu/AppData/Local/hermes/`, "external agent #8" — never a NATO slot) as a visible node cluster in the PRISM live system map. This is the PRISM-side half of "fully synergize Hermes with Obsidian/PSN/`/system-viz`": the app was invisible to `/system-viz` before; now its capability surface and its bridge into PRISM are graph nodes.

## What it emits

- `ghost.hermes_app` — parent **ghost-roost** under `ghost.planned_features` (`contains` edge).
- `hermes-capability.native-mcp` — the Hermes native MCP client node, with a **`bridges` edge to `tr.mcp`** (PRISM's MCP Server :3100 transport node). This edge IS the synergy: Hermes auto-registers PRISM's `prism_*` dispatchers as `mcp_prism_*` tools over StreamableHTTP at `http://127.0.0.1:3100/mcp`.
- one `hermes-skill` child per skill-category dir (24 live), `hermes-cron` per cron skill-file (0 until P3 ships shop-briefs), `hermes-output` per `knowledge/hermes-outputs/<lane>` vault sub-lane (5: research/notes/diagrams/scratch/sessions).

Live first run: **31 nodes / 32 edges** (appPresent=true, 24 skills + 5 output lanes).

## Safety invariant (spec §4)

Source = **directory/file NAMES ONLY** via `readdirSync`, fail-soft. The module contains **no `readFileSync` at all** — so `state.db` (Electron WAL lock), `.env`, `auth.json`, `config.yaml` (secrets) can never be opened; only names reach the graph, trimmed to `MAX_INFO` 240. The resolved app path is never emitted (no home-dir leak). A record-every-open fake-fs test asserts `forbidden === []`.

## Wiring (the silent-no-op trap)

Dual-registered exactly like the `dreamArtifacts` sibling:
- `scripts/regen-viz.mjs` FAST[] — `"generate-hermes-features.mjs"`.
- `scripts/merge-augmentations.mjs` — `loadOptional("hermes-augmentation.json")` (filename **byte-matches** `OUT_PATH` — a mismatch is a silent no-op, the #1 failure mode), `versions.hermesApp`, and a dedup splice block (`existingIds` by node id + `edgeKey` by `from|to|type`) setting `G.meta.hermesApp`.

The roost materializes on the next `regen-viz` (sierra owns that leg); merge-splice was validated offline (roost+bridge fold, re-apply idempotent 0/0) to avoid an expensive 548MB full regen.

## Remaining phases (operator GUI verification needed)

P0 (MCP-over-HTTP config), P2 (SOUL.md persona), P3 (cron shop-briefs) all edit the **external app on C:** and the plan flags them "must-verify OPEN QUESTIONS in the running GUI before executing" (config hot-reload, Python interpreter, cron `.skill` format, tool-count cap). Not safe to do blind in YOLO — see `state/shared/specs/HERMES-APP-INCORPORATION-PLAN-2026-06-02.md`.

## Cross-refs
- Spec: `state/shared/specs/HERMES-APP-INCORPORATION-PLAN-2026-06-02.md`
- Pattern parent: [[dream-artifacts roost]] (`generate-dream-artifacts-features.mjs`)
- [[psn-octopus-fleet-synergy-ms0]]
