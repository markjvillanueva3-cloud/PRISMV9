---
title: BACKEND-DEV-LOOP — unit-knowledge-pack (per-unit Ollama+Obsidian surface)
type: architecture
milestone: BACKEND-DEV-LOOP
unit: U-UKP01
created: 2026-05-18
slot: charlie
---

# `unit-knowledge-pack` — per-unit Obsidian+Ollama+wiki+tribal+git knowledge

## What it answers

Operator directive 2026-05-18 charlie: *"expand ollama and obsidian
utilization for the purpose of developing with all relevant knowledge
dedicated to the specific task and unit that a chat slot would work on in
their respective task queues"*.

The 26-chat fleet runs `/checkin-<slot> /loop <task>` and the auto-injected
hook chain surfaces a generic master-index slice on every prompt — but
*nothing* surfaced the knowledge that is **dedicated to the SPECIFIC unit a
slot is currently working on**. A chat picking up `BRIDGE-WIRING::U-WIRE-X`
got the same wiki precheck as a chat picking up `LATHE-PROD::U-LP05`. This
script closes that gap.

## Deliverable — `scripts/unit-knowledge-pack.mjs` (U-UKP01)

Given a unit-id OR an active slot claim, compose a markdown pack:

| Layer | Source | How |
|---|---|---|
| Roadmap context | `state/shared/specs/ROADMAP-CONSOLIDATED.json` | `lookupUnit` walks `pending_units` → `shipped_units` → `bridge_units` → `unconsolidated_prose`, accepts bare `U-X` or `MILESTONE::U-X` |
| Master-index hits | `state/shared/system-viz/system-graph.json` + pre-joined wiki + Obsidian memory entries | Reuses `scripts/lib/master-index-search-lib.mjs::runMasterIndexSearch` (BM25-lite) |
| Tribal tips | `tribal-embed-index.json` | Reuses `runTribalSearch`, filtered by `inferDomain(milestone)` — `mill`/`lathe`/`wedm`/`cam`/`cad` keyword routing |
| Prior commits | git log | `git log -n<N> --oneline --fixed-strings --grep "[<MILESTONE>]"` — milestone-token validated against `/^[A-Z0-9][A-Z0-9_\-]{0,80}$/` first |
| Bridge preheat | `scripts/ollama-prism-bridge.mjs` | Emits a ready-to-paste prompt seeded with `unitId + title + milestone` — operator runs locally for ~0-Claude-token drill |

```
node scripts/unit-knowledge-pack.mjs U-BRIDGE-WIRE-ELECTRODE
node scripts/unit-knowledge-pack.mjs --slot charlie --k 12 --tribal-k 5
node scripts/unit-knowledge-pack.mjs U-X --json --no-write
```

Output: stdout markdown (or JSON with `--json`) + `state/shared/unit-knowledge-packs/<safe-id>.md` (unless `--no-write`).

## Design

Pure decision functions + dep-injected readers:
- `parseArgs(argv)` — positional unit-id + `--slot`/`--json`/`--no-write`/`--k`/`--tribal-k`/`--git-n` (numeric flags clamped, `Number.isFinite(n) ? n : default` fallback for parse failures — NOT `|| default` which swallows 0)
- `resolveSlotToUnit(slot, readImpl)` — reads `state/shared/slot-task-claims.json`
- `lookupUnit(unitId, readImpl)` — walks 4 pools, accepts bare + composite ids
- `buildQueryTokens(unitId, unit)` — strips `U-` prefix, joins milestone + title
- `inferDomain(unit)` — 5-domain keyword router with `null` fallback
- `gitCommitsForMilestone(unit, n, spawnImpl)` — milestone-token validated before invocation
- `composePack(unitId, opts)` — main composer; warnings[] envelope for every fail-soft path
- `writePack(pack, outDir)` — whitelist-sanitized filename slug
- `renderPackMarkdown(pack)` — markdown emitter with per-section empty-state copy

### Safety properties

- **Read-only** — no writes outside `state/shared/unit-knowledge-packs/` (whitelist regex sanitizes filename slug).
- **Argv corruption defense** — `unit.milestone` from `ROADMAP-CONSOLIDATED.json` is untrusted JSON content; validated against `/^[A-Z0-9][A-Z0-9_\-]{0,80}$/` before reaching `spawnSync(git, ...)`. Hostile inputs (NUL, newline, lowercase, leading-dash) reject before invocation. Regression test with 5 hostile inputs + `spawnImpl` call-counter asserts the spawn never fires on rejected tokens.
- **Fail-soft at every IO boundary** — `JSON.parse` failure → null; spawnSync non-zero → []; thrown search → warning; missing roadmap → warning with `(unknown)` placeholders.
- **R12 fail-loud-as-advisory** — every degradation surfaces as a discrete `warnings[]` line in the markdown's `## ⚠ Pack composition warnings` block. The pack NEVER claims success on a degraded composition.

### Per-file 2-reviewer scrutiny

- Reviewer A (code-analyzer): **PASS**, 0 P0/P1. Confirmed search composition, CLI parser fidelity, real-data E2E integrity, R12 honesty.
- Reviewer B (independent reviewer): **PASS** with 1 P1 **fixed in-session** — milestone-token validation added. P2 advisories (schemaVersion, distinguishable ENOENT vs malformed-JSON, writePack coverage gap, NaN test) logged for follow-on.

## Tests

32 cases via `node:test` covering: `parseArgs` (positional/flags/numeric clamps), `resolveSlotToUnit` (4 cases), `lookupUnit` (4 cases incl. composite), `buildQueryTokens` (3 cases), `inferDomain` (6 cases), `gitCommitsForMilestone` (5 cases incl. hostile-token rejection), `composePack` (5 cases — null-id warning, unknown-id warning, domain propagation to tribal, error swallow, prompt seeding), `renderPackMarkdown` (4 cases — headers, hit/commit/prompt verbatim, empty-state, warnings), real-data E2E on `U-BRIDGE-WIRE-ELECTRODE`.

## Related

- `scripts/lib/master-index-search-lib.mjs` — shared BM25-lite (this script composes, does NOT re-implement)
- [[ollama-prism-bridge]] — Layer 2 of the Ollama bridge ladder; the bridge prompt this script emits is meant for it
- [[ollama-expand-ms0]] — Layer 1 (`ask-ollama.mjs`)
- [[ollama-pipeline-ms0]] — passive Ollama pipeline-injector hooks
- `.claude/hooks/pick-prefresh-inject.mjs` — staleness/freshness on `/pick-unit` (orthogonal — surfaces state, not per-unit knowledge)
- `.claude/hooks/goal-prereq-inject.mjs` — pre-`/goal` gate state (orthogonal)
