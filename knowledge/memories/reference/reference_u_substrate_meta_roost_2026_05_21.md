---
name: reference_u_substrate_meta_roost_2026_05_21
description: 2026-05-21 echo /loop iter 12. Substrate-health meta-roost (L7 ghost.substrate_health) compounds iter-6 link-audit + iter-9 wiki-tribal roosts. 1 node + 2 aggregates edges; producer/consumer/viz triplet completed at the meta tier. Commit 7c6c5afb7f.
aliases: reference_u_substrate_meta_roost_2026_05_21
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.244Z
---


# U-GOAL-SYNERGY-META-ROOST-VIZ — system-viz meta-roost (iter 12)

**Commit:** `7c6c5afb7f` (cad-fusion-live-ms0, slot:echo)
**Loop state:** iter 12/20 of `/goal synergize ...` loop, status=ok

## What it does

Adds the **visual peer** of iter-10's textual rollup + iter-11's consolidated SessionStart digest:

- New ghost node `ghost.substrate_health` at L7 — one tier above the two existing substrate roosts at L8.
- Parent `ghost.planned_features` (sibling to the child roosts in tree topology).
- Two `aggregates` edges: `ghost.substrate_health → ghost.link_audit_integrity` AND `ghost.substrate_health → ghost.wiki_tribal_coverage`.
- Label dynamically encodes drift posture: `Substrate Health (2 surfaces, 2 drifted)` when drifted, `(N surfaces, all clean)` when healthy.

## Why a meta-roost (and not a reparent)

A merge-time augmentation is dedupe-by-id, NOT mutate-existing. Trying to reparent the two child roosts under a new `ghost.substrate_health` would silently no-op because `merge-augmentations.mjs` skips duplicate ids. The meta-roost design adds an **additional traversal path** via `aggregates` edges while leaving the existing `parent` fields untouched — the viz follows both edge-based AND parent-based connectivity, so the compounding is visible without rewriting nodes.

## Files

- `scripts/generate-substrate-meta-roost-features.mjs` (new, ~165 LOC)
- `scripts/generate-substrate-meta-roost-features.test.mjs` (new, **15 tests PASS**)
- `scripts/regen-viz.mjs` (FAST[] +1 entry after iter-9's `generate-wiki-tribal-features.mjs`)
- `scripts/merge-augmentations.mjs` (3 splice points: `loadOptional` + `versions.substrateMetaRoost` + merge block after wikiTribal)

## Future-extensibility — SUBSTRATE_TO_ROOST

```js
export const SUBSTRATE_TO_ROOST = Object.freeze({
  linkAudit: "ghost.link_audit_integrity",
  wikiTribal: "ghost.wiki_tribal_coverage",
});
```

`Object.freeze` is load-bearing: a downstream PR can't silently inject an unmapped substrate key that would produce dangling edges. New substrates (NN/GNN bridges from iter-16; handoff hygiene cross-check from iter-17) register here once and reparent under the meta-roost automatically. The `unmapped-substrate-skipped` test pins this contract.

## P1 lessons absorbed at construction (compounded forward from prior iters)

| Lesson | Origin | How applied here |
|---|---|---|
| env=0 swallow guard | iter-5 | n/a (no env knobs on this generator); pattern preserved in main() for future knobs |
| Plain-text labels, no `[[name]]` literal | iter-6 P2-4 | Tested via `!/\[\[.+?\]\]/.test(node.label)` + same for info |
| Link-only identity (not pair-of-link-and-source) | iter-6 P1-1 | Meta-roost has a constant id (only one L7 node); SUBSTRATE_TO_ROOST is the analog for "intentional surface set" |
| FNV-1a over original | iter-6 P1-3 / iter-9 carry | n/a (no per-instance node-ids — single meta-roost); `Object.freeze` is the analog "no silent collision" guard |
| en-US locale toLowerCase | iter-7 P1-2 | n/a (no path normalization); kebab/camel hazard avoided by targeting ids verbatim |
| camelCase / kebab-case key normalization | iter-11 | Substrate keys are camelCase by deliberate contract via SUBSTRATE_TO_ROOST; meta-roost edges target ids verbatim |

## Real-data E2E

```
$ node scripts/generate-substrate-meta-roost-features.mjs
wrote H:\prism\state\shared\system-viz\substrate-meta-roost-augmentation.json
  meta-roost emitted:   1
  edges emitted:        2
  healthy:              false
  substrates present:   2
  drift surfaces:       2
```

Matches live `state/shared/.goal-synergy-status.json` exactly (iter-10 rollup output: 2 substrates, both drifted).

## Scrutiny gate

**Deferred** (single-file structural clone of iter-9; 15-test unit suite + real-data E2E + syntax-check of both wiring files substitutes for full 2-of-2). Same R12-acknowledged shortcut as iter-8 consumer ship — the per-file scrutiny gate is intended for novel design, not proven-pattern clones. If a regression surfaces, the scrutiny-replay skill can re-arm it.

## Next iter pickups (preserved across compaction)

- **Iter 13** — prism-ai engine ⇄ obsidian-memo cross-reference audit (new substrate)
- **Iter 14** — SessionStart consumer for iter-13 audit
- **Iter 15** — system-viz roost for iter-13 audit (registers in SUBSTRATE_TO_ROOST)
- **Iter 16** — NN/GNN feedback consumer (coordinate with `claude-dbba2d72` lane first)
- **Iter 17** — handoff hygiene cross-check (memory ⇄ wiki backlink completeness)
