---
title: Bug Findings → Wiki (always)
tags: [lesson, doctrine, hooks, bug-findings, wiki, dev-discipline]
created: 2026-05-17
slot: lima
chat: claude-77971357
shipped-with: U-BUG-FINDINGS-WIKI-HOOK
sibling-memory: feedback_always_update_wiki_on_bug_finding
domain: backend-dev
---

# Lesson: every bug finding gets a wiki entry

## Symptom

A bug is shipped and "captured" (a regression line in CLAUDE.md, a memory file, a `[fix]` commit) but no companion wiki entry is written. Three weeks later, a different chat in a different slot makes the *same* mistake — the lesson never reached them. The fleet has 26 concurrent chats; per-chat memory files don't cross-pollinate, but wiki entries do via `wiki-precheck-inject` (UserPromptSubmit) and `wiki-recall-on-read` (PostToolUse:Read).

## Root cause

CLAUDE.md and per-chat memory files are *event logs* — they record "this happened to this chat." Wiki entries are *teaching surfaces* — they record "this is how to avoid this class of bug." The two doc surfaces serve different consumers:

| Surface | Consumer | Lifetime | Cross-chat reach |
|---|---|---|---|
| CLAUDE.md `## Recent regressions` | Operators auditing fleet health | Append-only forever | All chats read it (system prompt) |
| `memory/feedback_*.md` / `reference_*_bug_*.md` | This-chat continuity | Per-chat (with limited cross-chat injection) | None unless the slug surfaces via memory-relevance-inject |
| `knowledge/wiki/lessons/<slug>.md` | Wiki precheck for any chat about to do similar work | Compounding (Karpathy LLM-Wiki) | Every chat, indexed for retrieval |

A regression line without a wiki entry is the rot pattern: the symptom is captured, the prevention isn't.

## Detection

`.claude/hooks/stop-bug-finding-wiki-gate.mjs` (Stop advisory, tier T3) runs on every chat close and detects bug findings via three signals:

1. **CLAUDE.md `## Recent regressions` delta** — diff of `git log HEAD~3..HEAD -- CLAUDE.md` for new lines matching `^\+-\s*\d{4}-\d{2}-\d{2}\s*\|\s*\*\*(.+?)\*\*`.
2. **Memory file additions** — `git log --name-only HEAD~3..HEAD` + uncommitted `git status --short` matched against `MEMORY_BUG_PATTERNS` (`feedback_*.md`, `reference_*_(bug|regression|fix|fail|rot|silent)_*.md`).
3. **Commit subject keywords** — `git log --pretty=format:"%H %s" HEAD~3..HEAD` matched case-insensitively against `BUG_KEYWORDS` (`[fix]`, `regression`, `silent`, `corruption`, `R12`, `BLOCK`, `FAILLOUD`, `fail-loud`, `rot`, etc.).

For each detected finding, `hasCompanionWikiEntry(slug, {wikiRoot})` scans `knowledge/wiki/{lessons,code-tribal,architecture}/` for a markdown file whose name contains the slug or any ≥4-character token from the slug. If absent → the gate emits a `systemMessage` advisory naming the missing entries and pointing at the doctrine memory.

## Prevention

1. **Author the wiki entry IN THE SAME COMMIT as the bug-finding artifact.** The hook fires on Stop, so it will warn on the *next* Stop — but the operator pattern should be "bug-finding artifact + wiki entry = one atomic ship."
2. **Use `knowledge/wiki/lessons/<bug-class-kebab-slug>.md`** for architectural lessons; **`knowledge/wiki/code-tribal/<slug>.md`** for shop-floor / operator-wisdom lessons.
3. **Required wiki sections**: `§ Symptom`, `§ Root cause`, `§ Detection`, `§ Prevention`, `§ Cross-refs`. The cross-refs link memory + commit + source file:line.
4. **No useful generalization?** Still write a one-paragraph stub naming why — silence is the rot pattern.
5. **Disable knob (one-shot only)**: `PRISM_BUG_FINDING_WIKI_GATE_DISABLE=1`. Setting it permanently defeats the rule.

## Hardening modes (opt-in, U-BUG-FINDING-WIKI-FOLLOWUPS)

The gate is **advisory by default** — `systemMessage` only, never blocks (the per-file scrutiny gate + 3-of-3 strict consensus stay in front for real correctness issues). Two opt-in modes harden it for operators who want stricter discipline:

| Mode | Env knob | Behaviour |
|---|---|---|
| **AUTOSTUB** | `PRISM_BUG_FINDING_WIKI_GATE_AUTOSTUB=1` | For each gap, `createWikiStub()` writes a skeleton `knowledge/wiki/lessons/<slug>.md` with the five required sections + frontmatter tagged `status: stub` / `auto_generated: true`. The gap converts from "no entry" to "empty entry to fill". Idempotent (never overwrites) and fail-soft (a write error just leaves the gap genuine). The advisory still names every stub created so it gets filled the same session. |
| **HARD** | `PRISM_BUG_FINDING_WIKI_GATE_HARD=1` | Returns `{decision:"block"}` while a genuine gap remains (no entry **and** no stub) — refuses the Stop until a wiki entry exists. |

The two compose cleanly: with **both** on, AUTOSTUB satisfies every gap with a skeleton, so HARD never bites — you get auto-skeletons + an advisory nudge, never a block. HARD only blocks when AUTOSTUB is off (or a stub write fails). The **tradeoff of AUTOSTUB**: a `status: stub` skeleton counts as a companion entry, so the gate goes quiet on the *next* session even if the stub is still empty — the `status: stub` + `auto_generated: true` frontmatter is the greppable marker for a later wiki-lint sweep to catch unfilled stubs.

`runGate()` takes an optional `findings` array (test seam) that bypasses the live-git scan, making the AUTOSTUB / HARD branches fully unit-testable against a tmp wiki root.

## Cross-refs

- Memory: `feedback_always_update_wiki_on_bug_finding.md` (the rule)
- Hook: `H:/prism/.claude/hooks/stop-bug-finding-wiki-gate.mjs`
- Tests: `H:/prism/.claude/hooks/stop-bug-finding-wiki-gate.test.mjs` (34 cases — incl. autostub + hard-block + injected-findings seam)
- Sibling doctrine: [[feedback_always_capture_lessons]] (broader "capture the lesson" rule)
- Sibling doctrine: [[feedback_roadmap_close_out]] (close-out always touches 4+ doc surfaces)
- Anti-pattern this fixes: the U-REGEN-VIZ-MERGE-FAILLOUD + U-SOURCEHASH-DOC-ALIGN + U-COMPLEXITY-FALLBACK ships earlier in lima session 77971357 — three regression-class fixes shipped with regression-line + memory + commit but ZERO wiki entries. This unit closes that gap and BACKFILLS by surfacing the missing entries on next Stop.

## Knobs

| Env var | Default | Purpose |
|---|---|---|
| `PRISM_BUG_FINDING_WIKI_GATE_DISABLE` | unset | `=1` disables the gate (one-shot override) |
| `PRISM_BUG_FINDING_WIKI_GATE_HORIZON` | `3` | Look-back commit count for `git log HEAD~N..HEAD` |
| `PRISM_BUG_FINDING_WIKI_GATE_MAX_LIST` | `8` | Advisory line cap before "…and N more" |
| `PRISM_BUG_FINDING_WIKI_GATE_AUTOSTUB` | unset | `=1` auto-creates a skeleton wiki stub for each gap |
| `PRISM_BUG_FINDING_WIKI_GATE_HARD` | unset | `=1` blocks the Stop while a genuine gap remains |
| `PRISM_MEMORY_DIR` | platform default | Override memory dir (test-only) |
