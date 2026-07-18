---
name: reference-u-psn-aliases-frontmatter-2026-05-23
description: "2026-05-23 sierra /loop iter3 — adopted `aliases: [a, b, c]` frontmatter convention for memory + wiki notes (cyrilXBT pattern). First-wave population on 7 high-leverage anchor memories."
type: reference
slot: sierra
source: prism-memory
synced: 2026-06-27T20:30:47.242Z
aliases: reference_u_psn_aliases_frontmatter_2026_05_23
---


## What shipped

Adopted the cyrilXBT "aliases" pattern (from his 2026-05-22 X article on Obsidian linking) as PRISM's canonical multi-name resolution schema. The convention:

```yaml
---
name: feedback-psn-definition
description: …
aliases: [PSN, Synergy Network, PRISM Synergy Network, PSN-11, 11-leg-PSN]
metadata:
  type: feedback
---
```

`aliases:` is an **inline YAML array** at frontmatter top-level. Each entry is a 4+ char string. Order is irrelevant. Empty array (`aliases: []`) is valid (= "no aliases yet").

## Why

Concepts have multiple names in human prose. Writing `PSN`, `Synergy Network`, `PRISM Synergy Network`, and `PSN-11` all in different memory + wiki entries fragments the master-index hit-ranking — searches for one form miss the other forms. With aliases, every form resolves to the same canonical slug.

## Consumers (PSN legs wired)

1. **`scripts/lib/unlinked-mentions-scan.mjs`** — already consumes aliases. `buildKnownNameRegex()` adds every alias to the name-list with `slugByName[alias.toLowerCase()] = canonicalSlug`. A bare mention of "Synergy Network" in any note body resolves to `[[feedback-psn-definition]]` candidate.

2. **`scripts/find-unlinked-mentions.mjs`** — frontmatter parser recognizes the inline-array `aliases:` form.

3. **Master-index integration (future iter)** — `scripts/lib/master-index-search-lib.mjs` doesn't read aliases yet. Wiring is left for U-PSN-CONNECTION-FINDER or a dedicated `U-PSN-ALIASES-MASTER-INDEX` follow-up.

## First-wave population (7 anchor memories)

- `feedback_psn_definition.md` — `[PSN, Synergy Network, PRISM Synergy Network, PSN-11, 11-leg-PSN]`
- `feedback_golf_owns_reaper.md` — `[golf-slot, hygiene-slot, fleet-hygiene, GOLF-reaper, golf-owns-reaper]` (normalized from a pre-existing scalar-string `aliases:` form)
- `feedback_karpathy_discipline.md` — `[Karpathy 5-step, R1, R1-mechanism, classify-technique-edge-failure-write, Karpathy-discipline, pre-coding-checklist]`
- `feedback_r5_thru_r12_doctrine.md` — `[R1-R12, R5-R12, R5 thru R12, R12, agent-era-rules, PRISM-rules, Karpathy-plus-agent-rules]`
- `feedback_atcs.md` — `[ATCS, Autonomous Task Completion, prism_atcs, autonomous-loop-substrate]`
- `feedback_svi_psi.md` — `[SVI, Psi-delta, system-viability-index, Psi-ranking, SVI-Psi, SVIRankedBacklog]`
- `feedback_psk_kernel.md` — `[PSK, PRISM Syscall Kernel, prism_session-psk, COMMAND-KERNEL-MS0, syscall-kernel]`

Together these 7 memories anchor ~35 alias forms. The next `find-unlinked-mentions.mjs` run will pick up bare "PSN" / "Karpathy" / "ATCS" / "SVI" / "PSK" mentions across the vault that the slug-only scan missed.

## R12 fail-loud disclosure

- Pre-existing scalar-string `aliases:` form in `feedback_golf_owns_reaper.md` was silently ignored by the array-only scanner parser. Now normalized to inline-array. Other memories may still carry the scalar form — a sweep is owed as a follow-up.
- Master-index lib hasn't been wired to aliases yet — searches for "Synergy Network" still won't surface `feedback-psn-definition` at the top via master-index until U-PSN-MASTER-INDEX-ALIASES lands.

## PSN legs connected

Memory vault frontmatter → unlinked-mentions scanner → eventually master-index search ranking. Closes 1 of 6 cyrilXBT-pattern gaps from the 2026-05-22 X article.

## Closes

`PSN-ENHANCE-MS0/U-PSN-ALIASES-FRONTMATTER`.
