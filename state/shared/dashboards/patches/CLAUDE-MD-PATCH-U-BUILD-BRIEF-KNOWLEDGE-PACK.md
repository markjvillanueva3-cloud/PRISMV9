# CLAUDE.md patch — U-BUILD-BRIEF-KNOWLEDGE-PACK (slot juliett, 2026-05-19)

CLAUDE.md is peer-locked (dirty in shared main tree). This patch sibling carries the doctrine pointer that should land in CLAUDE.md when the lock clears or as part of the next batched CLAUDE.md update by the slot that owns the file.

## Target section

Insert under the existing **`KNOWLEDGE-CONVERSION-MS0`** / `OLLAMA-PIPELINE-MS0` / **`/checkin-<nato> /loop <task>` — full-stack dev pipeline contract** cluster of pointer sections, OR under a new **`BACKEND-DEV-LOOP / U-BUILD-BRIEF-KNOWLEDGE-PACK`** heading.

## Proposed CLAUDE.md insertion

```markdown
## BUILD-BRIEF (2026-05-19, slot juliett, BACKEND-DEV-LOOP / U-BUILD-BRIEF-KNOWLEDGE-PACK)

`/build-brief <target>` — deep pre-build knowledge composer. Sits BETWEEN SessionStart headline injections (~350 tok, names) and a multi-file build. Pulls FULL bodies of the most relevant wiki entries (5), memory feedback files (3), tribal tips (5), prior commits in the milestone (last 20), regressions touching the area (top 6) into one query-ranked markdown brief persisted to `state/shared/briefs/<slug>.md`. Target is a unit-id (resolves milestone + commits + per-unit wiki), milestone-id, slot keyword (auto-picks the slot's claimed unit), or free-text topic. ~1500-3000 tokens buys ~20× context depth over `/master-index` — right trade when the next action is multi-file.

Architecture is a thin composer — no new search/index logic. Reuses `unit-knowledge-pack.mjs` (2026-05-18 charlie U-UKP01), `master-index-search-lib.mjs` (2026-05-15 echo), `_leaf-index.jsonl` (28K leaves). Pure functions + injected readers; two real-repo E2E tests guard production wiring (per PRISM doctrine: pure-core + injected readers MUST ship a real-data E2E test). 34 node:test cases including IDF score-ratio + LEAF_MEATY_MULT regression oracles + path-traversal containment guard + topic-mode + unit-mode `composeBrief`. Per-file scrutiny PASS/PASS on production + test files across 2 rounds (4 reviewer agents).

Use after `/checkin-<slot>` at the start of every `/loop` iteration — replace "I'll Grep for X" with "I'll `/build-brief X`". After every `/compact`, before resuming the resume-directive — restores rich context the compact summary stripped.

Files: `scripts/build-brief.mjs`, `scripts/build-brief.test.mjs`, `.claude/commands/build-brief.md`. Wiki: [`knowledge/wiki/architecture/build-brief.md`](knowledge/wiki/architecture/build-brief.md). Memory: [[reference_build_brief_2026_05_19]].
```

## Application

- DRY-RUN today; do NOT live-edit CLAUDE.md from juliett — it's claimed by another slot.
- Whoever next holds the CLAUDE.md write lock should integrate this section (1 pointer paragraph, ~13 lines).
- Once landed, this patch-sibling file should be deleted; a wiki/memory recall already covers the same content if the section is missed.

## Provenance

- Source: U-BUILD-BRIEF-KNOWLEDGE-PACK
- Slot: juliett
- Session: claude-e91338dc
- Date: 2026-05-19
- Doctrine: PATCH-SIBLING convention per [[reference_juliett_devtools_synergy_map_2026_05_17]]
