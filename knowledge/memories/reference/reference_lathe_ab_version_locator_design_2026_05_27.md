---
name: reference-lathe-ab-version-locator-design-2026-05-27
description: Design notes for U-LATHE-AB-VERSION-LOCATOR — find "upgraded" B versions in JM-Die archive paired with original "amateur" A versions. Enables 3-way A/B/C compare for wizard training-signal extraction.
type: reference
slot: whiskey
source: prism-memory
synced: 2026-06-09T14:54:09.186Z
aliases: reference_lathe_ab_version_locator_design_2026_05_27
---


# A/B-version locator design

## Why this exists

The operator said original JM-Die programs were "amateur-made" and that an upgraded "B" version exists for each. To train the wizard with real before/after improvement signal, we need:
- **A version**: original amateur program
- **B version**: human-improved version (the operator's earlier upgrade pass)
- **C version**: the AI/wizard-generated proposal (what we ship)

A→B→C comparison drives the wizard's improvement-target signal.

## Filename / location conventions to scan

Typical JM-Die archive paths probably follow patterns like:
- `JM DIE/<customer>/<part-num>/<part-num>.MIN` — original
- `JM DIE/<customer>/<part-num>/<part-num>_REV2.MIN` — upgraded
- `JM DIE/<customer>/<part-num>/<part-num>-B.MIN`
- `JM DIE/<customer>/<part-num>/upgraded/<part-num>.MIN` — sibling folder
- `JM DIE/<customer>/<part-num>/v2/...`

Scan patterns (regex):
```
/(_REV\d+|_v\d+|-B|-NEW|-UPDATED|_upgraded?)/i
```

## Pairing heuristic

For each `.MIN` / `.PIM` file F:
1. Extract `(customer, part_num_canonical)` from path
2. Find all sibling files in same customer-part tree
3. Group by suffix pattern; tag each: `version_tag in {A_original, B_upgraded, ambiguous}`
4. Pair (A, B) by ascending-timestamp + matching part-num-stem

When >1 candidate B exists, surface all with operator-confirmation prompt (R12 fail-loud).

## Comparison vector (per pair)

```
{
  customer, part_num,
  a_version: { path, mtime, lines, sloc },
  b_version: { path, mtime, lines, sloc },
  diff_signal: {
    canned_cycles_changed: [{ a: "G92", b: "G76" }],
    feed_changes: [{ tool: "T0101", a_F: 0.020, b_F: 0.012 }],
    speed_changes: [{ tool: "T0101", a_G96: 200, b_G96: 350 }],
    tools_added: ["T0303-finishing"],
    tools_removed: [],
    canned_cycle_added: ["G70"],   // finish pass was missing!
    safety_added: ["G50 S3200"],   // missing in A
    structural_changes: { ... }
  },
  quality_delta: {
    a_score: 42,
    b_score: 78,
    delta: 36,
    levers_engaged: ["multi-edge", "G50-cap", "G70-finish-pass"]
  }
}
```

The `levers_engaged` list maps directly to [[reference_lathe_cycle_time_levers_2026_05_27]] — which knobs the human upgrader pulled.

## Output artifact

`mcp-server/data/ingestion_cache/jm-die-ab-pairs-<date>.jsonl`

Each line is one A/B pair record. Enables:
- Training the wizard's improvement-strategy model on real human-upgrade decisions
- Operator review: "do you want every program upgraded to follow the B-version pattern?"
- Validation harness: run wizard on A version → grade output against B version
- Surface upgrade-cohorts: customers/parts that need attention because no B exists

## Implementation steps

1. Glob `H:/PRISM/JM DIE/CNC LATHE/**/*.MIN` + `**/*.PIM` + sibling formats
2. Parse path into `(customer, part_num_canonical, version_tag)`
3. Group by `(customer, part_num_canonical)`
4. Pair A/B by version_tag + timestamp
5. Run `lathe-quality-pipeline.mjs` on each
6. Compute diff signal + lever-engagement
7. Emit JSONL artifact
8. Surface stats: total pairs found, customers/parts with no B, mean Δ-score

## Constraints

- Must run in slot-worktree without main-tree contention
- Must not modify any `.MIN` file — read-only scan
- Output goes to `mcp-server/data/ingestion_cache/` (avoids `state/shared/extracted-pdfs/` root-guard)
- Hermetic tests should NOT scan the real archive — use 6-8 synthetic file pairs

## Estimated time + scope

- Glob + path-parse: ~50 LOC, ~30 mins
- Diff signal extraction: ~150 LOC (reuses `lathe-quality-pipeline.mjs parseProgram`)
- Artifact emission: ~50 LOC
- Tests: ~200 LOC / 25 cases
- Total: ~450 LOC, ~3-4 hours including tests

Next session — when shop-tool-library bridge ([[reference_shop_tool_library_bridge_design_2026_05_27]]) goes first, this is the immediate follow-up.

## Related

- [[lathe-baseline-ALCOA-2026-05-26]] — first quantitative measurement (11 programs, all A-versions, score ~44/100)
- [[reference_lathe_cycle_time_levers_2026_05_27]] — the levers we expect B-versions to engage
- [[reference_lathe_program_quality_rubric_2026_05_27]] — scoring rubric for the Δ-score computation
- [[reference_shop_tool_library_bridge_design_2026_05_27]] — co-requisite for tool resolution during A/B scoring
- [[feedback_use_lima_pypdf_page_extractor]] — if setup-sheet PDFs are paired, they'd be parsed by lima's extractor
