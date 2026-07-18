---
name: reference_build_brief_2026_05_19
description: U-BUILD-BRIEF-KNOWLEDGE-PACK (2026-05-19 juliett /loop) — /build-brief skill + scripts/build-brief.mjs composer that reads FULL wiki bodies + memory + tribal + git + regressions into one query-ranked markdown brief before a multi-file build. Reuses unit-knowledge-pack + master-index-search-lib + _leaf-index.jsonl (28K leaves). 34 tests incl. IDF + LEAF_MEATY_MULT regression oracles + path-traversal containment + 2 real-repo E2E.
aliases: [build-brief, Build Brief]
metadata:
  type: reference
  date: 2026-05-19
  slot: juliett
  milestone: BACKEND-DEV-LOOP
  unit: U-BUILD-BRIEF-KNOWLEDGE-PACK
---

`/build-brief <target>` — the deep pre-build knowledge composer. Sits BETWEEN PRISM's SessionStart headline injections (~350 tok, names only) and a multi-file build. Pulls **full bodies** of the most relevant wiki entries (5), memory feedback files (3), tribal tips (5), prior commits in the milestone (last 20), regressions block touching the area (top 6), then renders one markdown brief persisted to `state/shared/briefs/<slug>.md`. Target can be a unit-id (resolves milestone + commits + per-unit wiki), milestone-id, slot keyword (auto-picks claimed unit), or free-text topic phrase.

**Why:** the more you know about the subject, the higher the quality output. SessionStart injectors give headlines; bodies are where the contract lives. ~1500-3000 tokens buys ~20× context depth over `/master-index` — right trade when the next action is multi-file.

**How to apply:**
- Run at the start of every `/loop` iteration after `/checkin-<slot>` — replace "I'll Grep for X" with "I'll `/build-brief X`".
- After every `/compact`, before resuming the resume-directive — restores rich context the compact summary stripped.
- When entering a new domain (mill→lathe, kernel→post) in a session.
- `--no-write` + `--json` for transient stdout-only briefs; default writes to `state/shared/briefs/<slug>.{md,json}`.
- Clamps: `topK ≤ 40`, `maxExcerpt ≥ 200`. Defaults pinned by `parseArgs([])` regression oracle.

**Architecture:** thin composer — no new search/index logic. Reuses `unit-knowledge-pack.mjs` ([[unit-knowledge-pack-2026-05-18]]), `master-index-search-lib.mjs` ([[subagent-per-task-presearch-2026-05-15]]), `_leaf-index.jsonl` (28K leaves). Pure functions + injected readers — `composeBrief({readImpl, spawnImpl, searchImpl, tribalImpl, searchLeavesImpl, loadLeafImpl, collectBodiesImpl, enrichTribalImpl})`. Two real-repo E2E tests guard production wiring (per PRISM doctrine: pure-core + injected readers MUST ship a real-data E2E).

**Load-bearing test oracles (regression guards):**
- `parseArgs([])` defaults — DEFAULT_MAX_EXCERPT=1400, gitN=20, regrN=6 — silent default drift breaks tests.
- `excerptBody` 200-case fuzz floor 100 — covers all 3 branches (short / plain-clip / sectioned); `out.length <= maxChars` strict invariant.
- `searchWikiLeaves` IDF empirical score-ratio ≈4.36 — assertion `>2x` fails if IDF removed (entries collapse to 1.0 tie).
- `searchWikiLeaves` LEAF_MEATY_MULT=1.25 — architecture must outrank action stub on equal tokens; lowering to 1.0 breaks test.
- `collectBodies` path-traversal — `../../../etc/passwd` blocked.
- `loadWikiLeafIndex` mtime cache — same mtime returns same wrapper reference (no re-read).
- Topic-mode + unit-mode `composeBrief` both pinned; searchImpl-throw → warning, not crash.

**Per-file scrutiny:** 4 reviewers across 2 rounds — production PASS/PASS, test file PASS/PASS. Arm A caught P1 lead-starvation + truncation-overshoot, P1 missing CLI flags + P2 absolute-path containment bypass — all fixed in-session. Arm B caught P1 IDF non-isolation (mixed entry types) + P2 fuzz floor 140 → 100 + P3 unit-mode untested — all fixed. Arm B's final-pass P2 (LEAF_MEATY_MULT ungated) + P3 (DEFAULT_MAX_EXCERPT default unasserted) landed as cheap test-side additions.

**Related:** [[wiki-automation-discipline]] (broader propagation doctrine), [[unit-knowledge-pack-2026-05-18]] (unit/slot resolver), `/deep-search` (stage 1-4 orchestrator), `/master-index` (stage 1 only), `/wiki-query` (single entry).

**Files:**
- `scripts/build-brief.mjs` (32.7K, 14 exports)
- `scripts/build-brief.test.mjs` (19.2K, 34 node:test)
- `.claude/commands/build-brief.md` (skill manifest)
- `knowledge/wiki/architecture/build-brief.md` (wiki entry)
