---
title: "unit-knowledge-pack-2026-05-18"
name: unit-knowledge-pack-2026-05-18
kind: reference
status: promoted
category: reference
domain: knowledge-vault
promoted_from: knowledge/memories/reference/reference_unit_knowledge_pack_2026_05_18.md
promoted_at: 2026-06-06T04:55:56.776Z
source_refs: 4
---

# U-UKP01 — `unit-knowledge-pack` (2026-05-18 charlie)

Closes operator directive 2026-05-18 charlie:

> *"move to development back end building capabilities not prism app features.
> expand ollama and obsidian utilization for the purpose of developing with
> all relevant knowledge dedicated to the specific task and unit that a chat
> slot would work on in their respective task queues"*

## What it is

`scripts/unit-knowledge-pack.mjs` — given a unit-id (or an active slot
claim resolved via `state/shared/slot-task-claims.json`), emits a markdown
pack with knowledge **dedicated to that specific unit**:

| Section | Source |
|---|---|
| Roadmap context | `state/shared/specs/ROADMAP-CONSOLIDATED.json` (milestone + title) |
| 🧭 Master-index hits | `system-graph.json` + pre-joined wiki + Obsidian memory entries (BM25-lite) |
| 🧠 Tribal tips | `tribal-embed-index.json`, domain-filtered by milestone scope |
| 📜 Prior commits | `git log --fixed-strings --grep "[<MILESTONE>]"` |
| 🐙 Ollama bridge preheat | Ready-to-paste `ollama-prism-bridge.mjs` prompt seeded with unitId + title + milestone |

The bridge preheat is the load-bearing payoff: paste the prompt into a
local Ollama session and the model drills the pack via the 3 read-only
PRISM knowledge tools (`viz_search`/`wiki_lookup`/`read_excerpt`) at
**~0 Claude tokens** for the entire investigation.

## Design pin

- Pure decision functions + dep-injected readers (`readImpl`, `spawnImpl`,
  `searchImpl`, `tribalImpl`) — testable end-to-end without a live model.
- Reuses `scripts/lib/master-index-search-lib.mjs` for BM25 — does NOT
  re-implement search (single-implementation rule).
- Fail-soft at every IO boundary; R12 fail-loud-as-advisory via the
  `warnings[]` envelope (every degradation is a discrete markdown line).
- Whitelist-regex filename sanitization (`/[^A-Za-z0-9_\-]/g` → `_`)
  blocks `../` traversal; composite ids like `MILESTONE::U-X` deterministically
  become `MILESTONE__U-X.md`.

## P1 caught + fixed in-session (Reviewer B)

`ROADMAP-CONSOLIDATED.json` is **untrusted file content**. `spawnSync` uses
an arg array so there is no shell-injection vector — BUT a milestone string
containing NUL or newline could corrupt the argv. Fix: validate
`unit.milestone` against `/^[A-Z0-9][A-Z0-9_\-]{0,80}$/` before reaching
git. Regression test with 5 hostile inputs (`42`, `"FOO\nBAR"`, `"FOO\x00BAR"`,
lowercase, leading-dash) + `spawnImpl` call-counter asserts spawn never
fires on rejected tokens.

Lesson restated: a "pure core + injected readers" design MUST validate at
the trust boundary even when the SDK boundary (arg-array spawnSync) makes
shell-injection impossible. The argv-corruption class is the next subtle
one and easy to miss.

## Stats

- 32 `node:test` cases (PASS)
- Real-data E2E on `U-BRIDGE-WIRE-ELECTRODE` (composed in this session)
- 2-reviewer per-file scrutiny PASS (A: 0 P0/P1 · B: 1 P1 fixed)

## Sister entries

- [[reference_ollama_prism_bridge_l2]] — the Ollama harness this script
  seeds preheat for
- [[reference_ollama_expand_ms0]] — Layer 1 (`ask-ollama.mjs`)
- [[reference_ollama_expand_charlie_iter_2026_05_18]] — earlier charlie
  iters: dashboard adjusted offload rate + 33× wiki-leaf scan

## P2 advisories logged (deferred to follow-on)

- `schemaVersion` on output envelope (currently missing — Reviewer B)
- Distinguish ENOENT vs malformed JSON in roadmap-missing warning (R12
  fail-loud quality of warning text)
- `writePack` coverage — sanitization regression test
- `--tribal-k 0` clamp + `--k abc` NaN tests for completeness
- Nested `roadmap.milestones[*].units` shape if ROADMAP-CONSOLIDATED schema
  evolves
- `/checkin-<slot>` integration — emit the pack path in §Report when a
  claim is active (skill is peer-contended, deferred)

## Verify

```bash
node H:/prism/scripts/unit-knowledge-pack.mjs U-BRIDGE-WIRE-ELECTRODE --k 5 --git-n 5
node --test H:/prism/scripts/unit-knowledge-pack.test.mjs
```

## Source

Promoted from memory [[reference_unit_knowledge_pack_2026_05_18]] (referenced 4x across the vault). The memory remains the editable source of truth.
