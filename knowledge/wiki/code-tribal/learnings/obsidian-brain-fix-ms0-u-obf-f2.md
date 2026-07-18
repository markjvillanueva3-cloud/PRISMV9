# OBSIDIAN-BRAIN-FIX-MS0/U-OBF-F2 — [MAIN] [OBSIDIAN-BRAIN-FIX-MS0]/U-OBF-F2: claude-md-collapse-milestones tool (live apply deferred — CLAUDE.md claimed by claude-88486e9e)

**Commit:** `e484539c0fc9` · **By:** markjvillanueva3-cloud · **At:** 2026-05-17T17:08:52-05:00
**Tags:** obsidian-brain-fix-ms0, u-obf-f2, auto-distilled

## Subject
[MAIN] [OBSIDIAN-BRAIN-FIX-MS0]/U-OBF-F2: claude-md-collapse-milestones tool (live apply deferred — CLAUDE.md claimed by claude-88486e9e)

## Body
```
[MAIN] [OBSIDIAN-BRAIN-FIX-MS0]/U-OBF-F2: claude-md-collapse-milestones tool (live apply deferred — CLAUDE.md claimed by claude-88486e9e)

Script + test for collapsing 22 milestone-narrative sections in CLAUDE.md to
one-line wiki-pointer replacements. Live dry-run on H:/prism/CLAUDE.md at HEAD
d61331d16a: 783 -> 334 lines, 134KB -> 62KB, 22/22 sections resolved, 0 skipped.
Doctrine sections (SCRUTINY GATE, ENGINE WIRING, MASTER INDEX, MANDATORY
SELF-AWARENESS, BUILD/TEST/CI, etc.) and the Recent regressions section (with
F1's HTML-comment pointer) are intentionally preserved.

Pure-core `collapseSection(text, headerPrefix, replacement)` + FS-layer `run()`
with atomic write (tmp + rename), --dry-run + --json flags, PRISM_CLAUDE_MD env
override. Convention-mirror of sibling `claude-md-archive-regressions.mjs` (F1).

Idempotency design (load-bearing, per Reviewer A P1 fix mid-build):

1. Match headerPrefix FIRST; matches.length > 1 -> header_ambiguous.
2. matches.length === 0 -> check if any line equals replacement; if so,
   alreadyCollapsed (legitimate state for entries whose replacement
   intentionally drops the original headerPrefix shape, e.g. headerPrefix
   '## GOLF SLOT (7th hygiene chat' -> replacement '## GOLF SLOT - ...'). If
   no match, surface header_not_found loudly.
3. matches.length === 1 -> if lines[startIdx] === replacement,
   alreadyCollapsed; else collapse the section body.

The ordering matters: if the replacement-presence check ran FIRST (initial
design), a pasted replacement line elsewhere in the file would silently mask
an uncollapsed body and the run would falsely report 'already done'. The
final order matches headerPrefix first so an un-collapsed section is always
collapsed when found.

Splice emits an explicit blank between replacement and next '## ' section
(wantsBlank guard) so adjacent collapsed sections stay legible. CRLF detected
via includes('\r\n') and preserved through join(eol).

17/17 node:test PASS incl. two regression-guard tests for the false-idempotent
class (replacement-presence-only mask + headerPrefix-gone-replacement-present).

Per-file 2-reviewer scrutiny gate PASS:
- Arm A (code-analyzer): PASS w/ P1 ordering finding (fixed); P2 noted.
- Arm B (reviewer, independent): PASS. Live dry-run hits target; Recent
  regressions preserved; convention matches archive script; no .gitattributes
  conflict; mirror hook is C:->H: only so atomic-rename safe.

LIVE APPLY DEFERRED — H:/prism/CLAUDE.md is owned by claude-88486e9e (active
3.8 min ago, 8 files claimed). Per commit-ownership-guard 4h threshold I will
not force-take. Will apply via `node scripts/claude-md-collapse-milestones.mjs`
after ownership clears OR through the F3/F4/GOLF chat. The TOOL ships now so
peer chats can use it; the live edit is the orthogonal half.

Spec: state/shared/specs/BRAVO-TASK-QUEUE-OBSIDIAN-BRAIN-FIX-2026-05-17.md
Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (4)
- knowledge/wiki/os/pipelines/pipeline.html          | 140 +++++++++++++++++++++
- knowledge/wiki/os/pipelines/pipeline.md            |  98 +++++++++++++++
- mcp-server/data/milestones/COMMAND-KERNEL-MS0.json |  26 +++-
- 3 files changed, 261 insertions(+), 3 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show e484539c0fc9`
- Milestone envelope: `mcp-server/data/milestones/OBSIDIAN-BRAIN-FIX-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._