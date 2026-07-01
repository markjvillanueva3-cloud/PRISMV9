# COORD-MS0/U-COORD09 — [MAIN] [COORD-MS0]/U-COORD09: Ambient Awareness Badge (compact mode)

**Commit:** `2173b99814f6` · **By:** markjvillanueva3-cloud · **At:** 2026-05-16T16:04:32-05:00
**Tags:** coord-ms0, u-coord09, auto-distilled

## Subject
[MAIN] [COORD-MS0]/U-COORD09: Ambient Awareness Badge (compact mode)

## Body
```
[MAIN] [COORD-MS0]/U-COORD09: Ambient Awareness Badge (compact mode)

Closes COORD-MS0 — 11/12 -> 12/12 (final pending unit). RE-SCOPED from
spec's "Update session-awareness-inject.mjs" (file lived only in a
stale worktree, never canonical) to the deliverable's INTENT:
single-line ambient awareness badge on the canonical chat-bus
UserPromptSubmit injector that today emits the verbose multi-line
peer/claim/message block.

HOOK (.claude/hooks/chat-bus-inject.mjs)
- New exported helper formatCompactBadge() returns a single-line badge
  `## 🔗 Chat Bus — you=X · N peers online · M foreign claims · K unread`
  with an inline footer naming the env-knob escape route. Empty-return
  contract symmetric to formatBrief (zero across all three categories
  -> "" so caller skips injection).
- Exported formatBrief + COMPACT_MODE_ENV constant.
- main() branches per call on process.env[PRISM_CHAT_BUS_COMPACT] === "1"
  (strict opt-in; default off; backward compat).
- New entrypoint gate (process.argv[1] === fileURLToPath(import.meta.url)
  with path.resolve + fail-safe TRUE on path-resolution error). Without
  it, `node --test chat-bus-inject.test.mjs` ran main() at import time
  and polluted TAP stdout (exit 255). R12: fail-OPEN on resolution
  error so production never silently goes quiet across the fleet.

TEST (.claude/hooks/chat-bus-inject.test.mjs)
- 15 node:test cases (vitest broken in .claude/ per fleet-reaper-ms1).
  Covers env-name export, empty-return, single-category, all-three +
  separator invariant (kills the middot-removal mutation), singular vs
  plural agreement, single-line invariant, bounded size at 50/100/100
  input scale, session-id verbatim, footer-names-env-knob, formatBrief
  regression guards (peers-only suppression unchanged, empty unchanged,
  verbose multi-line still emitted when claims present).
- 15/15 PASS via `node --test`. Production smoke confirms ~85% token
  reduction (verbose ~1.5KB -> compact ~250B at fleet scale).

PER-FILE 2-ARM SCRUTINY: PASS/PASS (Arm A code-analyzer + Arm B
reviewer). 3 mutations KILLED, 3 SURVIVED — all 3 survivors P2
integration-shaped follow-ups (env-knob truthy-vs-strict, entrypoint-
gate removal, Windows path-case normalization). Mutation #3 (separator)
killed in-line via assert.match(out, / · /).

ENVELOPE: COORD-MS0/U-COORD09 pending -> complete. COORD-MS0 12/12 done.

HONEST RESIDUALS
- Compact mode drops actionable detail (peer ids, claim paths, message
  bodies). Footer names PRISM_CHAT_BUS_COMPACT for the verbose escape.
- Windows case-folding on path-resolved === is not bullet-proof; the
  fallback-to-true escape hatch in the entrypoint gate keeps production
  fail-safe.
- Compact badge surfaces peers-only state which formatBrief swallows —
  deliberate deviation; peers-only IS the badge's value proposition.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (4)
- .claude/hooks/chat-bus-inject.mjs         |  82 ++++++++++-
- .claude/hooks/chat-bus-inject.test.mjs    | 231 ++++++++++++++++++++++++++++++
- mcp-server/data/milestones/COORD-MS0.json |   7 +-
- 3 files changed, 313 insertions(+), 7 deletions(-)

## Lessons surfaced in commit body
- till emitted when claims present).

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 2173b99814f6`
- Milestone envelope: `mcp-server/data/milestones/COORD-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._