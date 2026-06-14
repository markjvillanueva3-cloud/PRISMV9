---
name: reference-tribal-coverage-audit-2026-05-18
description: META audit mapping the 4245 tribal-tip wiki leaves to the 5 high-ROI machining categories — first measurement of where shop-floor knowledge is thinnest.
aliases: reference_tribal_coverage_audit_2026_05_18
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.976Z
---


# Tribal coverage audit — first run, 2026-05-18

`/loop [10m] /goal` directive from slot golf (claude-de36f7ad): "generate high-ROI obsidian memories and tribal knowledge injection for all machining related data we have when it comes to tooling selection, work holding practices, part setup, operation ordering, proper machining tactics."

## What shipped

`scripts/audit-tribal-coverage.mjs` (~280 LOC) + `scripts/audit-tribal-coverage.test.mjs` (34 tests). Re-runnable META artifact per Boris compounding-gains discipline — NOT a content generator. Tells the next /loop iteration which category to author first.

## First-run baseline (the verification channel)

- Tips scanned: **8727** (4808 leaf-index + 3919 tribal-fs)
- Uncategorized: **5526 (63.3%)** — most "tribal" tag is auto-extracted vendor docs, not shop-floor wisdom
- Per-category (weakest first):
  1. **Operation ordering** — 353 (4.0%) ← author-first target
  2. Workholding — 424 (4.9%)
  3. Part-setup — 448 (5.1%)
  4. Machining tactics — 695 (8.0%)
  5. Tooling selection — 1281 (14.7%) ← strongest

## Key design notes (why-not-what)

- **First-match-wins ordering** — CATEGORIES is deliberately ordered with action-phrase categories FIRST (operation-ordering, part-setup) so "drill before bore + reamer" classifies as ordering (the verb is the signal), not tooling (the incidental noun). Reordered after 3 test failures caught the noun-collision bug live — R12 worked.
- **63% uncategorized is honest** — many `tribal-tip:` wiki entries are vendor-doc-extraction (e.g. BobCAD tips, hyperMILL keyboard shortcuts) rather than shop-floor wisdom. Surfacing this is a meta-finding: the registry is broader than the 5 named-category scope.
- **No content authored this session** — context budget exhausted on audit+tests. The audit's value is unblocking the next iteration with a numbered target.

## Re-run

```bash
node H:/prism/scripts/audit-tribal-coverage.mjs         # text dashboard
node H:/prism/scripts/audit-tribal-coverage.mjs --json  # machine-readable
node H:/prism/scripts/audit-tribal-coverage.mjs --gaps  # weakest categories only
```

## Pickup for next /loop iter

Author 2-4 canonical entries under `knowledge/wiki/code-tribal/canonical/`. Start with operation-ordering (weakest at 4%). The `tribal-by-domain-inject` UserPromptSubmit hook + `wiki-precheck-inject` will surface new entries automatically — no wiring required.

Cross-refs: [[reference_tribal_by_domain_inject]] · [[reference_ollama_pipeline_ms0_2026_05_15]] · [[feedback_auto_memory_feeds_obsidian_stophook]]
