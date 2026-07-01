# BACKEND-DEV-LOOP/U-OBSIDIAN-PRECHECK — [MAIN] [BACKEND-DEV-LOOP]/U-OBSIDIAN-PRECHECK: UserPromptSubmit hook — surface relevant Obsidian memories on every prompt

**Commit:** `aa58c8f3eb15` · **By:** markjvillanueva3-cloud · **At:** 2026-05-18T15:24:38-05:00
**Tags:** backend-dev-loop, u-obsidian-precheck, auto-distilled

## Subject
[MAIN] [BACKEND-DEV-LOOP]/U-OBSIDIAN-PRECHECK: UserPromptSubmit hook — surface relevant Obsidian memories on every prompt

## Body
```
[MAIN] [BACKEND-DEV-LOOP]/U-OBSIDIAN-PRECHECK: UserPromptSubmit hook — surface relevant Obsidian memories on every prompt

Sibling hook to wiki-precheck-inject. Scans the 644+ memory files under
knowledge/memories/{feedback,reference,project,user}/ on every
UserPromptSubmit, parses YAML frontmatter for name + description, runs
BM25-lite over the prompt tokens, and emits the top-3 hits as
additionalContext.

Why a SEPARATE hook (not a wiki-precheck extension):
  1. Memory frontmatter (name + description) differs from wiki index.md
     format — different parser, different tokenization choices.
  2. wiki-precheck-inject is 523 lines with its own BM25 pipeline;
     adding 644 more entries risks dilution and the tests already pin
     its surface.
  3. Independent kill-switch (PRISM_OBSIDIAN_PRECHECK=0) is operator-
     useful — wiki vs memory recall have different value-noise profiles.

Live-verified on the real 644-file memory store: query "kienzle cutting
force in feedback rules" surfaces:
  - feedback_obsidian_low_token_2nd_brain_protocol (score 2.33)
  - feedback_ai_first_development (and 1 more)
Silent no-op on uncorrelated prompts (the score gate is the canonical
quality filter).

Pure-core + injected-readers throughout. 33 hermetic + REAL-DATA tests
(all PASS). Coverage:
  - tokenize: lowercase + stopwords + non-string handling
  - parseMemoryFrontmatter: quoted values, missing-fields-null,
    malformed-fence-null
  - loadMemoryCorpus: hermetic walk + exclusion (_*.md + MEMORY.md +
    MEMORY-ARCHIVE.md) + unreadable-subdir-skip + missing-frontmatter-
    skip + REAL-DATA >100 entries
  - scoreMemory: density bonus pinned
  - rankMemories: minScore filter + topK clamp (MAX_TOP_K=6)
  - renderInject: header + truncate
  - runHook E2E: DISABLE knob + no-stdin + empty-prompt + corpus-empty
    + matching + zero-match + composer-throws (fail-soft)
  - REAL-DATA: 'kienzle' query oracle on live memory store

Knobs:
  PRISM_OBSIDIAN_PRECHECK=0          — kill switch
  PRISM_OBSIDIAN_PRECHECK_K=N        — top-K (default 3, cap 6)
  PRISM_OBSIDIAN_PRECHECK_MIN_SCORE=N  — score cutoff (default 0.6)
  PRISM_OBSIDIAN_PRECHECK_DIR=<path> — memories dir override
  PRISM_OBSIDIAN_PRECHECK_CACHE_DIR=<path>  — cache override (tests)

R12 fail-loud / safety:
  - File without name+description frontmatter → null (not partial)
  - MEMORY.md / MEMORY-ARCHIVE.md / _*.md excluded (pointer indexes)
  - Unreadable subdir skipped, not fatal
  - 4-depth recursion cap, symlink-loop seen-set defense
  - existsImpl dep-injected for hermetic test full coverage

Settings.json wiring is NOT in this commit — that file lives outside
the repo at `C:/Users/<u>/.claude/settings.json` (auto-mirrored to
`H:/.claude/settings.json`). Operator wires by adding to the
UserPromptSubmit chain after wiki-precheck-inject.mjs.

Worktree note: this commit lands on cad-fusion-live-ms0 with [MAIN]
override (matching the session's prior 5 ships) because the slot/delta
worktree at H:/prism-slot-delta has a pre-existing unmerged conflict
in mcp-server/src/schemas/cadActionSchemas.ts that blocks any new
commit there. Resolving that conflict is separate work for whichever
chat owns that prior slot/delta state — not in scope for this unit.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (3)
- .claude/hooks/obsidian-precheck-inject.mjs      | 286 +++++++++++++++++++
- .claude/hooks/obsidian-precheck-inject.test.mjs | 349 ++++++++++++++++++++++++
- 2 files changed, 635 insertions(+)

## Lessons surfaced in commit body
- note: this commit lands on cad-fusion-live-ms0 with [MAIN]

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show aa58c8f3eb15`
- Milestone envelope: `mcp-server/data/milestones/BACKEND-DEV-LOOP.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._