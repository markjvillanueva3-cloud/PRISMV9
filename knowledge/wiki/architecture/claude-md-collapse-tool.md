---
title: claude-md-collapse-milestones tool
type: architecture
unit: U-OBF-F2
milestone: OBSIDIAN-BRAIN-FIX-MS0
created: 2026-05-17
slot: bravo
chat: claude-0608ab9a
status: shipped
related:
  - claude-md-archive-regressions (F1 sibling)
  - regression-auto-write.mjs (F1 collaborator)
---

# claude-md-collapse-milestones.mjs (U-OBF-F2)

Closes the second leak in the *"obsidian brain making us aware of everything"* report
(2026-05-17): CLAUDE.md ballooned to 134 KB / 783 lines, ~6× Anthropic's ≤200-line
guidance, past which Claude *ignores* the file's rules. ~50 KB of that mass was
per-milestone NARRATIVE for milestones that already have a
`knowledge/wiki/architecture/<slug>.md` companion entry. CLAUDE.md is meant to be a
≤200-line doctrine *pointer index* (per its own KNOWLEDGE VAULT section), not a
6th namespace.

The tool collapses each `## <MILESTONE>-MS#` narrative block to a single-line
pointer (header + summary + wiki/memory `[[link]]` references). Doctrine sections
(SCRUTINY GATE, ENGINE WIRING, MASTER INDEX, MANDATORY SELF-AWARENESS, BUILD/TEST/CI,
SAFETY, etc.) and the `## Recent regressions` section (with F1's HTML-comment pointer)
are *intentionally preserved* — they encode operational rules that need to be
in-context, not pointers.

## API

**Pure-core** — `collapseSection(text, headerPrefix, replacement)`
```js
{ ok: true, content, replacedLineCount, eol, alreadyCollapsed? }
// or
{ ok: false, reason: "header_not_found" | "header_ambiguous", headerPrefix, matches? }
```

**FS-layer** — `run({ claudeMd, spec, dryRun })` — atomic write (tmp + rename),
returns `{ ok, beforeBytes, afterBytes, beforeLines, afterLines, collapsedCount,
skippedCount, results }`.

**Spec** — `COLLAPSE_SPEC` (exported, 22 entries) — each `{ headerPrefix, replacement }`.

**CLI** — `node scripts/claude-md-collapse-milestones.mjs [--dry-run] [--json]`.
**Env** — `PRISM_CLAUDE_MD` overrides target file path (default `H:/prism/CLAUDE.md`).

## Idempotency design (load-bearing)

Three entries in `COLLAPSE_SPEC` (`## GOLF SLOT (7th hygiene chat`,
`## KNOWLEDGE VAULT — 5-namespace schema`, `` ## `/checkin-<nato> /loop <task>` ``)
have replacements that *intentionally drop the original headerPrefix shape*. The
first-cut `startsWith(headerPrefix)` idempotency check would have returned
`header_not_found` for those on the second run — making "missing section" and
"already done" indistinguishable.

Resolved order (per Reviewer A P1 fix mid-build):

1. Match `headerPrefix` first; `matches.length > 1` → `header_ambiguous`.
2. `matches.length === 0` → check `lines.some(l => l === replacement)`; if true,
   `alreadyCollapsed` (legitimate already-done state). Else `header_not_found`.
3. `matches.length === 1` → if `lines[startIdx] === replacement`, `alreadyCollapsed`.
   Else collapse the section body.

If the replacement-presence check ran *before* the headerPrefix match (the initial
design), a pasted replacement line elsewhere in the file would silently mask an
uncollapsed body. The final order matches headerPrefix first so an un-collapsed
section is always collapsed when found.

Splice emits an explicit blank between replacement and next `## ` section
(`wantsBlank` guard) so adjacent collapsed sections stay legible. CRLF detected via
`includes("\\r\\n")` and preserved through `join(eol)`.

## Tests (17/17 PASS, `node --test`)

- `collapseSection` happy path, not-found, ambiguous, idempotent on same call,
  doctrine preservation, CRLF preservation, section-at-EOF.
- **2 regression guards** for the false-idempotent class:
  - "P1 guard — replacement-presence MUST NOT mask uncollapsed body when
    headerPrefix is still present" — verifies ambiguous return when both
    a pasted replacement and the real un-collapsed header coexist.
  - "headerPrefix gone, replacement present, returns alreadyCollapsed" —
    verifies legitimate already-collapsed-under-renamed-shape.
- `COLLAPSE_SPEC` integrity: unique headerPrefix, single-line replacement
  starting with `##`, every replacement contains `[[link]]` or `knowledge/wiki`.
- `run()` E2E: dry-run, atomic apply, not-found skip, idempotent over real spec
  (second-run all-already-collapsed invariant), read-failure handling.

## Live dry-run result

Target `H:/prism/CLAUDE.md` at HEAD `d61331d16a` (pre-prior-commit):

```
783 → 334 lines, 134KB → 62KB, 22/22 sections resolved, 0 skipped
```

`afterLines = 334` exceeds the F2 spec's ≤250 target. The remainder is the
~108 lines of doctrine + the regression-log inbox. Forcing ≤250 would require
also collapsing doctrine, which is explicitly out of scope.

## Per-file 2-reviewer scrutiny

- **Arm A** (`code-analyzer`): PASS with 1 P1 (idempotency ordering) — fixed
  mid-build; P2 noted (orphan `.tmp-*` file cleanup gap, low impact).
- **Arm B** (`reviewer`, independent): PASS. Live dry-run hits target;
  `## Recent regressions` preserved; convention matches sibling
  `claude-md-archive-regressions.mjs` (F1); no `.gitattributes` rule on
  CLAUDE.md; mirror hook is C:→H: only so atomic-rename safe; test
  integrity confirmed real-value.

## Ship state

- **Tool** shipped at commit `d19c488fba` (F2-FIXUP) — the prior commit
  `e484539c0f` carried the F2 subject but a precommit hook substituted
  unrelated files; the FIXUP commit lands the actual deliverable.
- **Live apply DEFERRED** — `H:/prism/CLAUDE.md` is owned by `claude-88486e9e`
  (active 3.8 min ago, 8 files claimed). Per commit-ownership-guard 4h threshold
  the bravo chat did not force-take. Apply via
  `node H:/prism/scripts/claude-md-collapse-milestones.mjs` after ownership clears
  OR through the F3/F4/GOLF chat.

## Spec source

`H:/prism/state/shared/specs/BRAVO-TASK-QUEUE-OBSIDIAN-BRAIN-FIX-2026-05-17.md`
(unit U-OBF-F2, depends-on F1, blocks ≤250-line/<40KB target).

## Related files

- `H:/prism/scripts/claude-md-collapse-milestones.mjs`
- `H:/prism/scripts/claude-md-collapse-milestones.test.mjs`
- `H:/prism/scripts/claude-md-archive-regressions.mjs` (F1 sibling convention)
- `H:/prism/.claude/hooks/regression-auto-write.mjs` (F1 collaborator)
- `H:/prism/CLAUDE.md` (target, HEAD `d61331d16a`)
