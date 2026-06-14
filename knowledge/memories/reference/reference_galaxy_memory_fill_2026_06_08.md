---
name: reference_galaxy_memory_fill_2026_06_08
description: Filled 34/34 galaxy MEMORY.md to canonical 4-section brain structure from synthesis + honest corpus counts; reviewers caught 20x corpus inflation + a self-defeating RED test
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.126Z
aliases: reference_galaxy_memory_fill_2026_06_08
---


# Galaxy MEMORY.md canonical-section fill (slot:bravo, 2026-06-08)

Operator directive: "a lot of galaxies dont have all the memories, file paths, wikis and tribal knowledge properly mapped to their individual galaxies… utilize obsidian and our ollama/docker setup to fill the gaps further."

**What:** 29 of 34 galaxy `mcp-server/src/engines/<g>/MEMORY.md` had only `## Master-brain link` (1/4 canonical sections), with placeholder stubs (`## Candidate <g>-domain memories`, `## Proposed structure`) instead of the real `## High-ROI memories` / `## Indexed memories` / `## Cross-galaxy bridges` / `## Known failure modes`. The compounded knowledge already existed in `knowledge/memories/patterns/<g>_synthesis.md` — it just wasn't surfaced into MEMORY.md.

**Fix:** `scripts/fill-galaxy-memory-sections.mjs` (+ `.test.mjs`, 13 tests) inserts an idempotent managed block `<!-- GALAXY-BRAIN-FILL:BEGIN/END -->` after the human-authored Master-brain link, additive-only (never clobbers Karpathy/Cross-refs). Sources: synthesis patterns/decisions/threads + live corpus counts. Mirrored to vault via `syncGalaxyMemories()`. Result: **34/34 at 4/4** (engine tree + Obsidian vault).

**Two real defects the 2-reviewer scrutiny caught in my OWN work (R12 / bravo-soul weak-test-assertion refuse):**
1. **20× corpus inflation** — `cam mem=1362` but only **66 were real**; 1296 were auto-generated `node_*` graph-node dumps. `wiring` 7234→56 real (99% noise). The "Indexed memories" line presented the inflated number as a domain inventory a slot would trust. FIX: `countCorpus` excludes `/^node_/` files (mirrors the existing `patterns/` exclusion), reports curated count + discloses `(plus N auto-generated node_* files excluded)`.
2. **Self-defeating RED test** — the cam test asserted `1/4→4/4`, but the build's own `--apply` makes cam 4/4, so the test could never pass again (6/7). FIX: exported the pure functions, guarded `main()` behind an import.meta-vs-argv[1] CLI check, rewrote the test to verify the transition against SYNTHETIC input deterministically + a real-cam smoke asserting the post-fill invariant.

**Mutation-test confirmation:** a `return memText; // MUTATION` was injected into `applyBlock` (no-op) — test 6 caught it (RED), proving the deterministic test has real R9 teeth. Removed; 13/13 green.

**Lane note:** `ai-training_synthesis.md` was all-NUL (corrupt, written 11:54 by india/zulu). The fill degrades honestly ("No usable synthesis — regenerate") rather than fabricating "Distilled from". ai-training is INDIA's galaxy — flagged to india to regenerate via `galaxy-synthesis-refresh.mjs`; did NOT fix in india's domain (R7 lane discipline).

Verify: `node --test scripts/fill-galaxy-memory-sections.test.mjs` (13/13) · re-score any galaxy's MEMORY.md for the 4 canonical headers.
