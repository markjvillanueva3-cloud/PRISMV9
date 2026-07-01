---
name: reference-node-capability-injection-2026-05-22
description: NODE-CAPABILITY-INJECT-MS0/U-NCI-CORE — deterministic 100%-coverage explicit-mention router complementing BM25 top-K injectors
aliases: reference_node_capability_injection_2026_05_22
type: reference
slot: whiskey
source: prism-memory
synced: 2026-06-27T20:30:46.664Z
---


# NODE-CAPABILITY-INJECT-MS0 (2026-05-22, whiskey)

Operator work order, post-/compact: *"devise a system to synergize with PSN so that those nodes you generated are strategically used with 100% coverage capability injection relative to task | ensure node wikis are injected strategically and logically"*. The 7351 pointers shipped by U-NMP-CORE (8c96ebb8b4) were discoverable via BM25 against memory namespace, but BM25 caps at top-K — explicit mentions past K silently dropped. This MS closes the loop: explicit mention → direct route → 100% coverage (within budget).

## What shipped (485 LOC + 40/40 tests)

- `scripts/lib/node-capability-injector.mjs` — pure library (extract/resolve/plan/render). 27/27 tests.
- `scripts/build-node-capability-index.mjs` — walks 7351 pointers → 5.6MB index. 6/6 tests.
- `.claude/hooks/node-capability-inject.mjs` — T2 UserPromptSubmit hook. 7/7 tests.
- Settings.json wiring after `master-index-precheck-inject` (C: master → auto-mirror to H:).
- Wiki entry at `knowledge/wiki/architecture/node-capability-injection.md`.

## Coverage model

For each lowercased prompt mention, 4 fallback candidates (direct, suffix-stripped, kebab-prefix-stripped, dispatcher action-half) are tested against the prebuilt `displayNameToId` map. First hit wins; dedup by nodeId. 100% coverage of resolved mentions within budget (default 12, hard cap 50). BM25 top-K continues to handle ambiguous queries via the sibling master-index / wiki / memory injectors.

## First-build numbers

7351 pointers indexed → 21,751 lookup keys → 5.6MB minified JSON. Atomic write survives concurrent Stop-hook fires.

## End-to-end smoke (post-wire)

`prism_calc:cutting_force` + `alg-kalmanfilter` in a prompt → `node_algorithm_alg_kalmanfilter.md` pointer + wiki path land in the inject block. (Engines without per-engine wiki entries aren't yet in the pointer set — downstream coverage gap for the wiki generator, not a hook bug.)

## Commits

- `slot/whiskey` (operator-mandated worktree for this chat): `1e2b15d0e1`
- `cad-fusion-live-ms0` (cherry-pick so settings.json's H:/prism path resolves): pending second commit for wiki + memory + settings + index

## Knobs

- `PRISM_NODE_CAPABILITY_INJECT=0` (off)
- `PRISM_NODE_CAPABILITY_BUDGET=N` (default 12)
- `PRISM_NODE_CAPABILITY_VERBOSE=1` (diagnostic systemMessage)

## Why it matters (PSN leg-3+4 closure)

PSN = the 11-leg union of Obsidian-brain / PRISM OS / Wiki / Memories / Tribal / System-Viz / Engines / Algorithms / Formulas / NN+GNN / PRISM-AI. The 7351 node pointers were leg-3-and-4 (wiki + memory pointers per node). This MS adds the deterministic router so prompts that name node X guarantee node X's surface lands in context — closing the gap where BM25 silently dropped the (K+1)th mention.

## Follow-up

`U-NCI-STOPHOOK-EXTEND` — extend `stop-wiki-from-nodes-autopopulate.mjs` to ALSO spawn `build-node-capability-index.mjs` on every pointer-regen (today: manual + scheduled task; stale-index >24h surfaces a `systemMessage` warning meanwhile).
