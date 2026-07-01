# HANDOFF — claude-fd3acf9c (chat 13840683) — ENGINE-WIRE-MS0

**Topic:** ENGINE-WIRE-MS0 (engine audit + SFC + WEDM-post wiring)
**Last write:** 2026-05-07T09:48Z
**Branch:** `cad-fusion-live-ms0` (main worktree at H:/prism)
**Status:** SFC batch wired + tested; commit blocked by 5+ min stale peer git lock; WEDM post batch DEFERRED.

---

## RESUME (next session, 1 paragraph)

A 5-minute-stale `H:/prism/.git/index.lock` (timestamp 1778165016 = 09:43 local, owner unknown) blocked the SFC batch commit. The work is fully on disk and validated: `mcp-server/src/schemas/calcActionSchemas.ts` adds 3 SFC schemas (sfc_compare, sfc_optimize, gilbert_economic_speed); `mcp-server/src/tools/dispatchers/calcDispatcher.ts` adds matching action enum entries + 3 lazy-import case handlers; `mcp-server/src/__tests__/calcDispatcher.uwire-sfc-batch1.test.ts` is 13 tests passing through the dispatcher. Also shipped: `state/shared/UNWIRED-ENGINE-AUDIT-2026-05-07.json` (verified-true count: 1015 unwired of 3157 engines, with mtime + suggested dispatcher per engine), `scripts/audit-unwired-engines.mjs` (re-runnable scan, eliminates singleton/route/registry/orchestrator/hook false-positives that the original Explore-agent count missed), and a memory entry `feedback_copy_never_move.md` codifying Mark's "always copy, never move/delete" rule. **Resume by:** (1) confirming the lock is gone or removing it if confirmed orphan; (2) committing the staged SFC bundle with the prepared subject below; (3) running scrutiny-3way against that commit; (4) starting Phase 6C — WEDM post-router wiring (single action, all 5 vendor engines reachable through `WEDMPostDialectRouterEngine`) into `edmDispatcher.ts`.

---

## WHAT'S ON DISK (uncommitted, ready)

```
M mcp-server/src/schemas/calcActionSchemas.ts            # +3 schemas
M mcp-server/src/tools/dispatchers/calcDispatcher.ts     # +3 actions + 3 case handlers
?? mcp-server/src/__tests__/calcDispatcher.uwire-sfc-batch1.test.ts   # 13 tests passing
?? scripts/audit-unwired-engines.mjs                     # audit re-runner
?? state/shared/UNWIRED-ENGINE-AUDIT-2026-05-07.json     # 1015-engine deliverable
?? c:/Users/Mark Villanueva/.claude/projects/H--PRISM/memory/feedback_copy_never_move.md
```

Test verification:
```
node ./mcp-server/node_modules/vitest/vitest.mjs run src/__tests__/calcDispatcher.uwire-sfc-batch1.test.ts --root mcp-server
# → Test Files  1 passed (1) · Tests 13 passed (13)
```

Type-check verification: my edits add **0 new tsc errors**. The 4 errors at lines 1143, 1147, 8829, 8844 of calcDispatcher.ts are pre-existing (1450 total tsc errors in the codebase, all unrelated to my edits).

## PREPARED COMMIT MESSAGE

```
[CAD-FUSION-LIVE-MS0]/U-WIRE-SFC-BATCH1: wire 3 unwired SFC engines + ship 1015-engine unwired audit

Wires speed-feed-calculator domain into prism_calc:
  - sfc_compare           → SFCCompareEngine.compare       (SPC stats vs spec, Cpk)
  - sfc_optimize          → SFCOptimizeEngine.optimize     (target-Ra parameter solver)
  - gilbert_economic_speed → gilbertEconomicSpeedEngine.compute  (Gilbert 1950 min-cost Vc)

13 round-trip dispatcher tests cover happy + 3 failure modes + 2 adversarial + 3
operation-spans (turning/milling/grinding) + 2 regression guards (all 3 actions
reachable, revenue-aware Gilbert returns max-profit fields).

Ships engine-audit deliverables:
  - state/shared/UNWIRED-ENGINE-AUDIT-2026-05-07.json — 1015 truly-unwired
    engines of 3157 total, sorted oldest-first with suggested dispatcher per
    engine. Eliminates false positives from singleton/route/registry/orchestrator/
    hook wiring paths that the naive direct-import scan missed.
  - scripts/audit-unwired-engines.mjs — re-runnable audit script.

Orphan summary: only 3 unique engines exist outside the canonical folder
(MilestoneIntelligenceEngine, OperatingSystemIntelligenceEngine, SolidCAMiMachiningEngine
in legacy H:/prism/src/engines/). prism-forge-archive/ is a full mirror,
prism-*/ worktrees are expected per-milestone scaffolding. Per user policy
"copy never move/delete", no source files were relocated this session.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## SCRUTINY GATE STATE

**3-of-3 not yet recorded** for this session id (13840683-2b5d-48a1-8227-f894464fcd01).
Need to run:

```bash
node .claude/scripts/scrutiny-3way.mjs --target HEAD       # after committing
# → records --codex and --gemini, emits opusReviewerPrompt
# Then dispatch reviewer agent with the prompt
# Then: node .claude/scripts/scrutiny-3way.mjs --mark-opus pass --target HEAD --notes "<one-liner>"
```

If the same chat resumes and the original session id is preserved, run with
`--session-id 13840683-2b5d-48a1-8227-f894464fcd01` instead of `--target HEAD`.

## NEXT BATCH — Phase 6C (WEDM post-processors)

Verified during this session, ready to wire:

| Engine | Status | Method | Wire to |
|---|---|---|---|
| `WEDMPostDialectRouterEngine` | Truly unwired (only string refs in registries) | `route(input)` | `prism_edm` (NOT mill/cam — peer chat owns those) |

The router internally consumes all 5 vendor engines (Mitsubishi, Sodick, Makino, Agie, Fanuc) — wiring just the router gives one action that reaches all 5.

**Plan:**
1. Claim `mcp-server/src/tools/dispatchers/edmDispatcher.ts` + `mcp-server/src/schemas/edmActionSchemas.ts` via `prism_context:claim_file`.
2. Add action `wedm_post_route` to edmDispatcher's z.enum + a case handler that lazy-imports `WEDMPostDialectRouterEngine` and calls `.route(params)`.
3. Add matching schema entry (mirrors WEDMPostInput from `WEDMPostTypes.ts`).
4. Test file `edmDispatcher.uwire-wedm-post-batch1.test.ts` with: 5 vendor variability spans + happy + 3 failure modes + 2 adversarial.
5. Commit with subject `[CAD-FUSION-LIVE-MS0]/U-WIRE-WEDM-POST-BATCH1: wire WEDM post-router (5 vendors) to prism_edm`.

## OTHER SESSION CONTEXT

- 7121 uncommitted changes in working tree at session-end (5+ peer chats).
- Peer claims at start of next session likely on: `intelligenceDispatcher`, `aiReasoningDispatcher`, `millDispatcher`, `cadDispatcher`. Avoid those.
- The 3 legacy-only engines (MilestoneIntelligence, OperatingSystemIntelligence, SolidCAMiMachining) are still uncopied — Mark chose audit-only for Phase 5, then redirected to active wiring on SFC + post-processor lanes only. Copy of the 3 legacy-uniques is a separate, low-priority follow-up.
- Audit JSON groups unwired engines by suggested dispatcher — pull a worklist with:
  ```bash
  node -e "const j=require('./state/shared/UNWIRED-ENGINE-AUDIT-2026-05-07.json');
  console.log(j.unwiredEngines.filter(e=>e.suggestedDispatcher==='prism_edm').slice(0,10))"
  ```
