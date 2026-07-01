---
name: feedback-always-update-wiki-on-bug-finding
description: Standing rule 2026-05-17 (user directive lima 77971357) — every bug finding shipped this session MUST have a companion wiki entry under knowledge/wiki/lessons/ or knowledge/wiki/code-tribal/. Without wiki capture the lesson rots; the bug re-happens.
aliases: feedback_always_update_wiki_on_bug_finding
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.398Z
---


**Standing rule (2026-05-17, user directive lima slot 77971357):**

> "make it a rule to always update wiki for bug findings to avoid them in the future. that should be hooked"

Every bug finding shipped this session — whether captured as:
- A new line in `H:/prism/CLAUDE.md` § Recent regressions, OR
- A new `feedback_*.md` or `reference_*_(bug|regression|fix)_*.md` memory file, OR
- A commit subject containing `[fix]`, `[regression]`, `silent`, `fail-silent`, `Karpathy R12`, `corruption`, `wrong`, `BLOCK`

…MUST have a companion wiki entry in `H:/prism/knowledge/wiki/lessons/` or `H:/prism/knowledge/wiki/code-tribal/`. The wiki entry names:
- The bug class (what kind of error this is — e.g., "silent-merge-failure", "ESM-cjs-require-bridge", "control-byte-stripped-by-tool")
- The detection pattern (how to find it again — what to grep for, what to inspect)
- The prevention check (what gate/test/lint catches it next time)
- Cross-links to the memory file, the commit, and the source file:line

**Why:**
- A regression line in CLAUDE.md is a fact ("this happened"); a wiki entry is a *teaching* ("this is what to do"). The fleet's 13 concurrent chats read CLAUDE.md but RE-DERIVE knowledge from wiki entries via `wiki-precheck-inject` + `wiki-recall-on-read` — without the wiki entry, the lesson never reaches another chat that's about to make the same mistake.
- 96.9% of MEMORY.md is index, not knowledge — the memory file alone won't surface in wiki-precheck. Wiki is the durable cross-session teaching surface; memory is per-chat continuity.
- "Captured" without prevention is rot.

**How to apply:**
1. After landing a regression line or memory file with bug-finding intent, write `knowledge/wiki/lessons/<bug-class-kebab-slug>.md` with frontmatter `tags: [bug, lesson, <domain>]` and sections § Symptom · § Root cause · § Detection · § Prevention · § Cross-refs.
2. If the bug is tribal-specific (operator-floor wisdom not directly architectural), use `knowledge/wiki/code-tribal/<slug>.md` instead.
3. The wiki entry MUST be in the same commit as the bug-finding regression line — `stop-bug-finding-wiki-gate.mjs` (Stop advisory) detects new regression lines without companion wiki entries and reminds.
4. If the bug-finding has no useful generalization (e.g., one-off typo), STILL write a one-paragraph wiki entry naming why no generalization applies — silence on bug findings is the rot pattern.

**Hook enforcement:** `.claude/hooks/stop-bug-finding-wiki-gate.mjs` (Stop advisory, NOT block — the per-file scrutiny gate + 3-of-3 stays in front of this). Knob: `PRISM_BUG_FINDING_WIKI_GATE_DISABLE=1`.

**Bootstrap example (this session, the rule itself):**
- Regression-class fix: U-REGEN-VIZ-MERGE-FAILLOUD (commit f9dc218d78) → wiki entry pending in this commit.
- Doc-alignment: U-SOURCEHASH-DOC-ALIGN (commit 0bac2d4c2f) → wiki entry pending.
- Heuristic improvement: U-COMPLEXITY-FALLBACK (commit 3d416cb040) → wiki entry pending.
- All three shipped without wiki entries earlier this session — exactly the gap this rule closes. The hook will catch this pattern on the next Stop after a regression line lands.

Sibling memories: [[reference_u_regen_viz_merge_faillod_2026_05_17]], [[feedback_always_capture_lessons]] (this rule is the operational enforcement layer for that broader doctrine).
