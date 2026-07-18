---
description: TF-IDF synthesis over recent vault activity — surfaces the dominant concept emerging from knowledge/memories in the last 24h/7d/30d. Returns thesis sentence + confidence + supporting files. Use to anchor daily/weekly summaries in actual vault content rather than hallucination.
allowed-tools: mcp__prism_safe__prism_memory, Read
composes_with:
  - "/awareness-snapshot"
  - "/master-index"
  - "/utilization-dashboard"
  - "/weekly-synthesis"
consumes:
  - "prism_memory:emerging_thesis"
---
# /emerging-thesis — What is the vault saying right now?

Computes the implicit thesis emerging from recent activity in `knowledge/memories/` using TF-IDF (term-frequency × inverse-document-frequency). Returns:

- **thesis** — one-sentence statement naming the dominant concept
- **confidence** — [0,1] that collapses on contradiction, low signal, or empty vault
- **top_concepts** — up to 8 ranked terms with their TF-IDF scores
- **supporting_files** — up to 8 vault paths that contributed most

Backed by `EmergingThesisEngine` (`mcp-server/src/engines/EmergingThesisEngine.ts`) — wired as `prism_memory:emerging_thesis`. O(D × tokens) single-pass over markdown bodies, validated <2s on 1000-file vault.

## Confidence model

```
agreement    = (# docs containing top concept) / (# analyzed docs)
signal       = clamp(topScore / SIGNAL_FLOOR, 0, 1)
confidence   = agreement × signal
```

**Why agreement instead of dominance:** related concepts split a theme across tokens ("thin-wall" / "thin" / "wall" / "milling"). A unanimous corpus shouldn't be penalized for fragmentation; agreement measures "do most docs talk about *this*?" — robust to vocabulary splits.

**Contradictory vaults collapse cleanly:** when each doc carries a different concept, the top term appears in only 1 of N docs → agreement → 1/N → low confidence.

## When to use

- Anchor `/weekly-synthesis` / `/daily-personal-brief` outputs
- "What have I been thinking about lately?" — vault introspection
- Detect drift: high confidence + theme matches expectations = healthy; low confidence = scattered focus
- Compare across windows: 24h vs 7d vs 30d → spot newly-emerging themes vs persistent ones

## How to run

```
/emerging-thesis                # default 7d window, top-8 concepts
/emerging-thesis 24h            # last day only
/emerging-thesis 30d 12         # 30 days, top-12 concepts
```

Action call:

```
prism_memory:emerging_thesis  { window: "24h"|"7d"|"30d", topK?: number }
```

## Output interpretation

| Confidence | Meaning |
|-----------:|---------|
| ≥ 0.6 | High agreement — the vault is converging on a clear theme |
| 0.3..0.6 | Mixed signal — multiple themes competing |
| < 0.3 | Scattered / contradictory — no single thesis |
| ≤ SPARSE_FLOOR | Vault too sparse in this window to draw conclusions |

## Companion surfaces

- `/master-index <query>` — keyword search across the full system+vault
- `/utilization-dashboard` — graph-wide node classification
- `/awareness-snapshot` — rolled-up built/wired/utilized digest
- `/weekly-synthesis` — uses this engine to anchor weekly summaries

## Why this exists

cyrilXBT framing (per `reference_cyrilxbt_obsidian_article_delta_2026-05-07`):
> "the vault is never too empty to find something worth thinking about"

So even an empty vault produces a thesis naming the smallest-vault path forward instead of returning null. Companion to `/awareness-snapshot` (which reads system-graph) — this one reads the vault content.

Shipped 2026-05-08 OBSIDIAN-COMPOUND-MS1/S2/U-EMERGING-THESIS (engine + dispatcher wiring); skill landed 2026-05-13 (loop iter 7, slot alpha).
