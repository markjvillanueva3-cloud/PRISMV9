# WIRE-UNWIRED-MS0/U-WIRE-LBACKTRACE — [MAIN] [WIRE-UNWIRED-MS0]/U-WIRE-LBACKTRACE: wire LatheProgramBacktraceEngine into prism_turning (2 actions)

**Commit:** `21345a921b97` · **By:** markjvillanueva3-cloud · **At:** 2026-05-17T04:04:58-05:00
**Tags:** wire-unwired-ms0, u-wire-lbacktrace, auto-distilled

## Subject
[MAIN] [WIRE-UNWIRED-MS0]/U-WIRE-LBACKTRACE: wire LatheProgramBacktraceEngine into prism_turning (2 actions)

## Body
```
[MAIN] [WIRE-UNWIRED-MS0]/U-WIRE-LBACKTRACE: wire LatheProgramBacktraceEngine into prism_turning (2 actions)

Wires the lathe program backtrace engine (root-cause analysis on
G-code block streams) into prism_turning. Given a failing block N,
walks backward through the block history to identify:
  - offending tool (T-code)
  - offending offset (H/D/WCS) set in earlier blocks
  - offending feed / spindle state from prior M-codes
  - upstream macro calls that established failing geometry

Produces ordered cause list ranked by KIND_WEIGHT × recency.

Actions (both pure functions, no state mutation):
  - lathe_backtrace_trace → trace({blocks, failing_block_n, max_depth?})
  - lathe_backtrace_stats → getStats() — reference standard

Schema details:
  - block.kind enum: 9 BacktraceBlockKind values (tool_change,
    offset_set, wcs_shift, feed_set, spindle_set, macro_call,
    motion, m_code, comment) — matches engine constants exactly
  - blocks min-length 1
  - failing_block_n nonneg int
  - max_depth ≤ 1000 (DoS guard; engine default 50)

Test suite: 16 cases (5 schema + 2 stats + 5 trace + 4 variability/error)
including:
  - 6-block sample turning program (T01, G54, F0.15, S1200 M3, motion×2)
  - Unknown failing_block_n → empty causes + 'not found' reasoning
  - max_depth=1 → bounded backtrace (causes constrained to immediate
    predecessor)
  - Cause ordering invariant: descending by weight
  - Top suspect kind in {offset_set, tool_change, wcs_shift} per
    KIND_WEIGHT table
  - VARIABILITY floor: 3 failing locations (N20, N40, N60) all valid
  - ROUTING PROOF: wire stats byte-equals engine-direct getStats();
    wire causes count parity with engine-direct trace()

Pre-wire gate: src/__tests__/LatheProgramBacktraceEngine.test.ts 13/13
PASS unmodified.

Session running total: 18 backend-dev wires / 82 actions / 18 engines.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (4)
- .../__tests__/dispatcher.latheBacktrace.test.ts    | 208 +++++++++++++++++++++
- mcp-server/src/schemas/turningActionSchemas.ts     |  30 +++
- .../src/tools/dispatchers/turningDispatcher.ts     |  21 +++
- 3 files changed, 259 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 21345a921b97`
- Milestone envelope: `mcp-server/data/milestones/WIRE-UNWIRED-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._