---
name: reference-claude-md-collapse-tool-2026-05-17
description: U-OBF-F2 — claude-md-collapse-milestones tool: collapses 22 milestone-narrative sections in CLAUDE.md to one-line wiki-pointer replacements. Live dry-run 783→334 lines. Doctrine sections preserved. Idempotency-by-replacement-presence after headerPrefix-match-first (Reviewer A P1 fix mid-build).
aliases: [claude-md-collapse-tool, Claude MD Collapse TOOL, reference-claude-md-collapse-tool-2026-05-17]
metadata:
  type: reference
  date: 2026-05-17
  unit: U-OBF-F2
  milestone: OBSIDIAN-BRAIN-FIX-MS0
  slot: bravo
  commit: d19c488fba
---

# reference — claude-md-collapse-tool (U-OBF-F2, 2026-05-17)

`scripts/claude-md-collapse-milestones.mjs` collapses milestone-narrative
sections in CLAUDE.md (~50 KB of per-milestone prose) to one-line wiki-pointer
replacements. Doctrine sections ([[project_scrutiny_gate|SCRUTINY GATE]], ENGINE WIRING, BUILD/TEST/CI,
SAFETY, etc.) and the `## Recent regressions` section (with F1's HTML-comment
pointer) are intentionally preserved.

**Pure-core** `collapseSection(text, headerPrefix, replacement)` + FS-layer
`run({ claudeMd, spec, dryRun })`. Atomic write (tmp + rename), `--dry-run` +
`--json` flags, `PRISM_CLAUDE_MD` env override. 22-entry `COLLAPSE_SPEC`
exported.

**Idempotency design (load-bearing)** — three entries in `COLLAPSE_SPEC` have
replacements that intentionally drop the original headerPrefix shape (e.g.
headerPrefix `## GOLF SLOT (7th hygiene chat` → replacement `## GOLF SLOT —
...`). The first-cut `startsWith(headerPrefix)` idempotency check returned
`header_not_found` on second runs for those — making "missing section" and
"already done" indistinguishable.

Reviewer A flagged this as P1: had the replacement-presence check run *before*
the headerPrefix match, a pasted replacement line elsewhere in the file would
silently mask an uncollapsed body. Final order: match headerPrefix first
(`matches > 1` → ambiguous; `matches === 1 && line === replacement` →
alreadyCollapsed; `matches === 0 && line-equal-replacement-exists` →
alreadyCollapsed; else `header_not_found`).

**Live dry-run** on H:/prism/CLAUDE.md at HEAD d61331d16a: 783→334 lines,
134KB→62KB, 22/22 sections resolved, 0 skipped. 334 exceeds the F2 spec's ≤250
target — the remainder is the ~108 lines of doctrine + regression-log inbox,
which is the floor for what must stay in-context.

**Tests** — 17/17 PASS, `node --test`. Includes 2 regression guards for the
false-idempotent class: (1) "replacement-presence MUST NOT mask uncollapsed
body when headerPrefix is still present" (verifies ambiguous return when both
a pasted replacement and the real un-collapsed header coexist), (2)
"headerPrefix gone, replacement present, returns alreadyCollapsed" (verifies
legitimate already-collapsed-under-renamed-shape).

**Per-file gate** — Arm A code-analyzer PASS with the P1 fixed mid-build;
Arm B reviewer (independent) PASS — live dry-run hits target, Recent
regressions preserved, convention matches sibling `claude-md-archive-
regressions.mjs` (F1), no `.gitattributes` rule on CLAUDE.md, mirror hook is
C:→H: only so atomic-rename safe.

**Ship state** — TOOL shipped at commit `d19c488fba` (F2-FIXUP — the prior
commit `e484539c0f` carried the F2 subject but a precommit hook substituted
unrelated files; FIXUP lands the actual deliverable). LIVE APPLY DEFERRED
— H:/prism/CLAUDE.md is owned by `claude-88486e9e` (active 3.8 min ago, 8
files claimed); per commit-ownership-guard 4h threshold the bravo chat did
not force-take. Apply via `node H:/prism/scripts/claude-md-collapse-
milestones.mjs` after ownership clears.

Spec: `H:/prism/state/shared/specs/BRAVO-TASK-QUEUE-OBSIDIAN-BRAIN-FIX-2026-05-17.md`
unit U-OBF-F2. Sibling: [[reference_claude_md_archive_regressions_2026_05_17]] (F1).
Wiki: [[claude-md-collapse-tool]].
