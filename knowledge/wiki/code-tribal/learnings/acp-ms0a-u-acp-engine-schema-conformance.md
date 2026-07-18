# ACP-MS0A/U-ACP-ENGINE-SCHEMA-CONFORMANCE — [MAIN-FORCE] [ACP-MS0A]/U-ACP-ENGINE-SCHEMA-CONFORMANCE (slot:alpha): bridge AutomationChainEngine runtime to the frozen contract (R15 VALIDATE) -- 18 tests

**Commit:** `2c74add91f6d` · **By:** markjvillanueva3-cloud · **At:** 2026-06-22T09:42:00-05:00
**Tags:** acp-ms0a, u-acp-engine-schema-conformance, auto-distilled

## Subject
[MAIN-FORCE] [ACP-MS0A]/U-ACP-ENGINE-SCHEMA-CONFORMANCE (slot:alpha): bridge AutomationChainEngine runtime to the frozen contract (R15 VALIDATE) -- 18 tests

## Body
```
[MAIN-FORCE] [ACP-MS0A]/U-ACP-ENGINE-SCHEMA-CONFORMANCE (slot:alpha): bridge AutomationChainEngine runtime to the frozen contract (R15 VALIDATE) -- 18 tests

AutomationChainEngine (ACP-MS0A+MS1, wired to devDispatcher) re-declares its OWN local TaskClass/ChainTier/FailBehavior/AutomationChain types that DUPLICATE the canonical Zod contract in automationChainSchema.ts (single-source split, R7) and nothing proved its runtime chains honor that contract -- so the two could silently drift. This adds the missing VALIDATE leg (R15): round-trips every engine-produced chain through AutomationChainSchema + pins the classifier intent. Builds directly on the contract frozen by 6b6d02c841 (R13 dependency order).

Tests (18, all pass, tsc-clean): getChain(x) for all 9 task classes safeParses against AutomationChainSchema (the runtime conforms to the frozen contract, defaults filling triggers/version/enabled); parsed task_class matches the fetch key; operational chains have >=1 executable step while general is the documented step-less catch-all (caught + corrected a wrong "every chain has steps" assumption -- R9: the test failed, I read the engine, general intentionally has steps:[]); listChains() enumerates exactly the 9 classes; classify() returns an on-contract TaskClass for any prompt + routes 5 unambiguous single-domain prompts to their expected class (web/cad_python/post_process/erp/speed_feed) + falls back to general for keyword-less input + confidence in [0,1]; telemetry forward-compat (engine emittable statuses subset of contract; documents the timeout/budget_exceeded capability gap).

FINDINGS routed (not fixed here -- engine is wired+tested, reconciliation is a design decision R7/R8): (1) engine re-declares schema types instead of importing them (single-source-of-truth dedup -- a safe follow-up: the 3 enums are byte-identical); (2) engine TelemetryEvent.status omits the contract outcomes timeout + budget_exceeded, so the token-budget enforcement cannot yet emit a budget_exceeded event. slot:alpha
```

## Files touched (2)
- mcp-server/src/__tests__/automationChainEngineSchemaConformance.test.ts | 148 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 1 file changed, 148 insertions(+)

## Lessons surfaced in commit body
- wrong "every chain has steps" assumption -- R9: the test failed, I read the engine, general intentionally has steps:[]); listChains() enumerates exactly the 9 classes; classify() returns an on-contract TaskClass for any prompt + routes 5 unambiguous single-domain prompts to their expected class (web/cad_python/post_process/erp/speed_feed) + falls back to general for keyword-less input + confidence in [

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 2c74add91f6d`
- Milestone envelope: `mcp-server/data/milestones/ACP-MS0A.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._