---
name: reference_viz_wiki_narrative_2026_06_09
description: "U-VIZ-WIKI-NARRATIVE (sierra 2026-06-09, commit cd54edb940): flag-gated $0-Claude local-LLM what/why narrative for viz->wiki entries. The OLLAMA-SYNERGY backlog #1 sierra-lane build. Live-rejected gpt-oss:20b (empty .response + 38s cold-load); qwen2.5-coder:32b works ~1.25s."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.253Z
aliases: reference_viz_wiki_narrative_2026_06_09
---


**U-VIZ-WIKI-NARRATIVE** (slot:sierra, 2026-06-09, commit `cd54edb940`). OLLAMA-SYNERGY backlog #1 (sierra-lane) -- the system-viz->wiki creation-offload unit. Pairs with [[reference_ollama_synergy_audit_2026_06_09]] (the audit that ranked it) + T2 (wired pipeline-injector).

## What
The viz->wiki entries (`knowledge/wiki/architecture/{layer,domain,dispatcher}-*.md`) were 100% procedural field-dumps (counts/tables/Mermaid) with NO prose. This adds a 1-2 sentence local-LLM "what/why" narrative -- $0-Claude, never-Claude CREATION that lifts search recall on PRISM's own canonical wiki tier.

## How (design choices that passed 3-of-3 + per-file 2-arm)
- `scripts/lib/viz-wiki-narrative.mjs` -- PURE inject/strip/extract + content-hash helpers; idempotent marker block (`<!-- viz-narrative:start (local-llm) -->`), distinct from the generators' AUTO-START/END so neither eats the other. 15 tests (idempotency invariant + AUTO-coexistence, mutation-verified non-tautological).
- `scripts/generate-viz-wiki-narrative.mjs` -- flag-gated post-pass (`PRISM_VIZ_WIKI_NARRATIVE=1`; default OFF so the every-commit regen hot path is UNCHANGED). Reuses `generateBlurb` from contextual-blurb.mjs (do NOT fork ollama calls). Upfront `/api/tags` probe (no 148-fetch spin if down); fail-soft (null blurb -> entry untouched); content-hash cache keyed on narrative-STRIPPED content (no re-narrate loop). `--dry-run` is count-only (no Ollama).
- Wired into `regen-wiki-from-viz.mjs` after the 3 field-dump generators, before crosslinks/leaf-index (recall-searchable).

## R12 catches (live validation, not assumption)
1. **gpt-oss:20b REJECTED live** -- the audit recommended it for "prose" but it returns an EMPTY `.response` (harmony/thinking format routes output elsewhere) + ~38s cold-load > generateBlurb's 30s timeout -> null. **qwen2.5-coder:32b is the right model** (generateBlurb's own default): warm ~1.25s, clean situating blurb. Lesson: validate the model choice on live data; an audit's model rec can be wrong in practice.
- model knob: `PRISM_VIZ_WIKI_NARRATIVE_MODEL` (default qwen2.5-coder:32b).
2. **layer-stack-overview.md EXCLUDED** (per-file reviewer P1) -- it matches the layer-*.md regex but `generate-layer-stack-overview.mjs` FULL-overwrites it later (no AUTO-preserve), so an injected narrative would be wiped every run. `EXCLUDE` set fixes it. Independent collision audit (3-of-3 arm B): only that one entry collides across all later generators.

## Validated
15/15 tests; live enrich on real entries (enriched=2, idempotent re-run byte-identical); dry-run 0s/0-ollama; flag-off no-op. Per-file 2-arm (A PASS, B found overview-P1+dry-run-P2 -> fixed) + end-of-session 3-of-3 A/B/C all PASS (session claude-51a18b50). Worst-case when enabled: sequential ~30s/entry timeout ceiling for ~135 entries on a cold-but-up daemon (P2-deferred: an early-abort-after-N-timeouts budget) -- acceptable for a flag-gated opt-in; warm steady-state is cache-fast.

## Activation
OFF by default. To enrich: `PRISM_VIZ_WIKI_NARRATIVE=1` then run `regen-wiki-from-viz.mjs` (or the standalone generator). Covers the 3 backbone entry types (layer/domain/dispatcher); engine/action/etc. entries are deliberately out of scope (thousands of entries, lower per-entry value -- the audit scoped to the backbone).
