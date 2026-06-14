---
name: reference_obsidian_galaxy_brain_recall_2026_06_09
description: "Context-EXPANSION + vault-VALUE win: wired the 34 per-galaxy MEMORY.md domain brains into semantic recall. They were structurally absent — the embedding-cache builder's flat-memo filter ^(feedback|reference|project|user)_ never matched MEMORY.md. Builder now embeds them keyed galaxy/<name> with an explicit path; loadEmbedCache+semanticTopK plumb path through; the recall hook resolves s.path||MEMORY_DIR/name + a dedicated k=1 galaxy-tier pass at GALAXY_MIN=0.60. LIVE: 34/34 resolvable, mill file→[[galaxy/mill]] 0.642 surfaces, spurious suppressed. 3-of-3 PASS. Lesson: a long domain DOCUMENT scores LOWER vs a short query than a short memo does — galaxy recall needs its own lower-but-precise floor, calibrated from real cosines."
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.231Z
aliases: reference_obsidian_galaxy_brain_recall_2026_06_09
---


# Galaxy-brain semantic recall (2026-06-09, slot:alpha)

Commits `<HEAD~1>` (U-OBS-GALAXY-BRAIN-RECALL) + `<HEAD>` (P2). The fresh-discovery
clause-3 (context EXPANSION) + clause-5 (vault VALUE) win for [OBSIDIAN-VAULT-SYNERGY].

## The gap (structural, not a tuning miss)
`scripts/build-memo-embedding-cache.mjs` built the semantic-recall corpus from the
flat C: auto-memory dir, filtered `^(feedback|reference|project|user)_.+\.md$`. The 34
per-galaxy domain brains live at `mcp-server/src/engines/<galaxy>/MEMORY.md` — named
`MEMORY.md`, in a different tree → the filter NEVER matched them. So the richest
per-domain context PRISM has was 100% absent from semantic recall.

## The wire (4 files, one atomic contract)
- `memo-embed-lib.mjs`: `loadEmbedCache` carries an optional `path`; `semanticTopK`
  surfaces `path` + gained an optional `nameFilter` predicate (run a tier over the
  same Map without a second cache).
- `build-memo-embedding-cache.mjs`: `listGalaxyBrains()` (keyed `galaxy/<dir>`, explicit
  forward-slash abs `path`); work-items generalized `string`→`{name,path}`; `mkEntry`
  single-sources the emit shape so the reuse + fresh-embed sites can't drift.
- `memory-relevance-inject.mjs` (consumer): resolves `s.path || join(MEMORY_DIR,s.name)`;
  a dedicated **k=1 galaxy-tier pass at GALAXY_MIN=0.60**; galaxy hits rendered COMPACT
  (pointer, no body) + FIRST so the 1500-char budget never truncates them; `existsSync`
  resolvability guard (not a full readFileSync — reviewer-C P2).
- `memo-embed-lib.test.mjs`: +3 R9 tests (path plumb x2 + nameFilter, mutation-proven).

## THE LESSON (calibrated from LIVE cosines, R15)
A long domain DOCUMENT scores LOWER against a short filename-derived query than a short
memo does. Measured: in-domain code-file → its galaxy 0.63+ (mill 0.642, lathe 0.633);
out-of-domain / WRONG-galaxy top out ≤0.597 (lock→bug-hunting 0.535, WireEdm→**wiring**
0.553 [wrong!], generic→agent-orch 0.597). So:
1. Galaxy brains need their OWN floor (the flat 0.6 + k=2 crowds them out).
2. **0.60 is the precision floor**: keeps strong CORRECT matches, cuts every observed
   wrong/spurious one. k=1 + 0.60 → the wrong-galaxy (wedm→wiring 0.553) is suppressed.
3. Precision > recall for an auto-injection — a WRONG domain brain is worse than none
   (R12). wedm files currently get no brain (correct galaxy ranks 3rd <0.60) — an
   accepted recall gap, knob-tunable via `PRISM_MEMORY_GALAXY_MIN`.

## Validation trap caught (why R15 live-validate matters)
First build "looked done" — 34/34 embedded + resolvable. But the live hook surfaced
NOTHING: (a) the galaxy brain was TRUNCATED off by the 1500-char budget (appended last);
(b) at the original 0.42 floor it admitted spurious wrong galaxies. BOTH only visible by
firing the real consumer hook. Fix: render compact+first + raise floor to 0.60. Pairs
with [[reference_obsidian_recall_node_exclude_2026_06_09]] (the recall-quality sibling).
