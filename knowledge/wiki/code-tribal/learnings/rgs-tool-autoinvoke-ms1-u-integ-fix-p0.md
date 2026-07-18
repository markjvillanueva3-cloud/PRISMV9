# RGS-TOOL-AUTOINVOKE-MS1/U-INTEG-FIX-P0 — [MAIN] [RGS-TOOL-AUTOINVOKE-MS1]/U-INTEG-FIX-P0: fix 10 P0 integration bugs + real-data E2E oracle

**Commit:** `b287c161442a` · **By:** markjvillanueva3-cloud · **At:** 2026-05-16T13:55:41-05:00
**Tags:** rgs-tool-autoinvoke-ms1, u-integ-fix-p0, auto-distilled

## Subject
[MAIN] [RGS-TOOL-AUTOINVOKE-MS1]/U-INTEG-FIX-P0: fix 10 P0 integration bugs + real-data E2E oracle

## Body
```
[MAIN] [RGS-TOOL-AUTOINVOKE-MS1]/U-INTEG-FIX-P0: fix 10 P0 integration bugs + real-data E2E oracle

MS0 shipped with 97 unit tests that injected FAKE readers — every P0 lived in
the orchestrator's REAL reader factories, untested end-to-end. This unit fixes
all 10 and adds the missing real-data E2E test (rgs-tool-planner.e2e.test.mjs):
11 failing assertions on the buggy code -> 84/84 green after the fixes.

P0-1  makeTribalReader: destructure {hits} from runTribalSearch's {tokens,hits}
      object (was .map()'d directly -> swallowed TypeError -> tribal:[]); map
      h.title (real field), not h.tip/text/label.
P0-2  ollama-hook-bridge: default host localhost -> 127.0.0.1 (Node resolves
      localhost to IPv6 ::1; Ollama binds IPv4-only -> ECONNREFUSED).
P0-3  makeOllamaReader: pass timeoutMs 30000 (bridge default 500ms aborted
      every qwen-7b call, which takes 2.5-4.3s).
P0-4  makeCapabilitiesReader: tokenize unit text + query findInGraph per token
      + union (was passing whole phrase to a substring matcher -> 0 hits).
P0-5  rgs-pipeline-rules: drop the literal forge-triple phrase trigger — it
      matched milestone-header boilerplate on ~98.6% of units. Structural
      engine+skill/hook signal still catches genuine triples.
P0-6a pick-prefresh-inject: sidecar stores ToolPlan FLAT — drop the entry.plan
      nesting guard that made 0 picked events ever fire.
P0-6b extractOutcomes: split composite MS::U-id keys so the bare U-id matches
      commit bodies (shipped units were misclassified blocked).
P0-6c outcome record schema: carry tier+verdict end-to-end (pick-prefresh ->
      picked.jsonl -> extractOutcomes -> outcomes.jsonl); makeOutcomesReader
      aggregates by (pipeline in predictedPipelines, tier, verdict) counting
      rec.outcome — was filtering on fields the record never had.
P0-7  rgs-plan-coverage: read entry.source (flat sidecar), not entry.plan.source
      — bySource was always {unknown}. Fixture corrected to the real flat shape.
P0-8  rgs.md: add ## Route: tool-plan + tool-plan-coverage handlers (gitignored).
P0-10 rgs-outcome-record-stop: spawnSync git timeout 8000ms -> 2500ms (below
      the 3000ms harness timeout so the git child is reaped cleanly).

Core lesson: a 'pure core + injected readers' design MUST ship one real-data
E2E test — hermetic fakes do not prove production wiring. The 6 reader
factories are now exported for that test.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (10)
- .claude/hooks/lib/ollama-hook-bridge.mjs  |   4 +-
- .claude/hooks/pick-prefresh-inject.mjs    |  13 +-
- .claude/hooks/rgs-outcome-record-stop.mjs |  11 +-
- scripts/lib/rgs-pipeline-rules.mjs        |  10 +-
- scripts/lib/rgs-plan-outcome.mjs          |  24 +-
- scripts/rgs-plan-coverage.mjs             |   7 +-
- scripts/rgs-plan-coverage.test.mjs        |  10 +-
- scripts/rgs-tool-planner.e2e.test.mjs     | 362 ++++++++++++++++++++++++++++++
- scripts/rgs-tool-planner.mjs              |  70 ++++--
- 9 files changed, 469 insertions(+), 42 deletions(-)

## Lessons surfaced in commit body
- till catches genuine triples.
- lesson: a 'pure core + injected readers' design MUST ship one real-data

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show b287c161442a`
- Milestone envelope: `mcp-server/data/milestones/RGS-TOOL-AUTOINVOKE-MS1.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._