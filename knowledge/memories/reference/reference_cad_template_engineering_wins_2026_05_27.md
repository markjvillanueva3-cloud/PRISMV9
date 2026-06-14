---
name: reference-cad-template-engineering-wins-2026-05-27
description: "Four engineering moves that delivered 68 templates in one chat session (91→159) — classifier-refactor + regex-enrich + 2x category-expansion. Pattern: EXPAND CLASSIFICATION UNIVERSE > ADD MORE CORPUS for CAD template generation."
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.042Z
aliases: reference_cad_template_engineering_wins_2026_05_27
---


# CAD template engineering wins (slot:delta iter25→iter38, 2026-05-27)

## Headline finding
Across 14 iters in one chat session, **engineering moves delivered 6× the templates per tool-call as YouTube harvests**.

| Move type | Iters | Net templates | Tool-cost-per-template |
|-----------|-------|---------------|------------------------|
| YouTube harvests (6 queries + pipeline) | 25→31 + 33→34 + 36 | ~14 templates | ~5 tools each |
| Engineering moves (1 edit + regen) | 32, 35, 37, 38 | **52 templates** | ~2 tools each |

## The four wins (all on `H:/prism-slot-delta/scripts/generate-cad-function-templates.mjs`)

### iter32 — classifier refactor (+6 templates)
`inferFunction()` switched first-match-wins → most-hits-wins.
**Why it worked:** feature-3d at position [1] in FUNCTION_CATEGORIES absorbed any tutorial mentioning extrude/fillet, blocking specialist categories. Counting global regex hits and picking highest broke that monopoly.

### iter35 — regex enrichment (+3 templates, fixed 1 broken test)
Added more keyword variants to 10 specialist categories (sheet-metal +k-factor/gauge/blank; weldments +fishmouth/miter/skeletal; routing +tubing-path/conduit/p-clamp; etc.) + fixed `fusion[\s-]*360` to match hyphenated form.
**Why it worked:** the most-hits classifier rewards categories with more keyword surface area. Enriching specialist regex outscores generic feature-3d on truly specialist content.

### iter37 — add 6 new categories (+29 templates)
Added: rendering, animation, mbd-pmi, parametric, query-measure, data-management.
**Why it worked:** existing 2520-entry tribal corpus had abundant content matching these concepts but they were defaulting to "general" or feature-3d. Adding the category gave them a home.

### iter38 — add 4 more CAD-pure categories (+14 templates)
Added: direct-edit, sketch-3d, mesh-3dprint, derived-parts.
**Why it worked:** same as iter37 — content existed, classification universe didn't.

## Pattern (for future delta chats)
**When coverage plateaus on a YouTube harvest path: ask whether the bottleneck is corpus or classification.**

If the regex categories are too coarse → enrich them. (iter35 pattern)
If the regex categories are too narrow (missing concepts) → add them. (iter37/38 pattern)
If the classifier has order-of-precedence issues → restructure scoring. (iter32 pattern)

**Always check tests after editing FUNCTION_CATEGORIES** — the corpus assertion at the bottom of `generate-cad-function-templates.test.mjs` covers regression.

## What does NOT scale
- Adding more YouTube harvests on the same regex universe — diminishing returns wall.
- Adding kilo's CAM categories (5-axis, post-processing, NC-code) — lane violation, kilo owns CAM.

## Memory anchors
- `reference_cad_template_coverage_plateau_2026_05_27` — predecessor (documented the wall before this session)
- `feedback_use_lima_pypdf_page_extractor` — alternative pipeline when YouTube is exhausted
- `feedback_commit_to_slot_worktree` — slot/delta commit hygiene
