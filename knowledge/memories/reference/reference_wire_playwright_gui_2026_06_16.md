---
name: reference_wire_playwright_gui_2026_06_16
description: "Wired PlaywrightAutomationEngine -> prism_knowledge (2 actions); the prior \"browser-dep\" blocker was a STALE FALSE claim caught by verify-before-wire"
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.266Z
aliases: reference_wire_playwright_gui_2026_06_16
---


ROMEO WIRING (slot:romeo, 2026-06-16, commit `cae26e10b1` on cad-fusion-live-ms0 MAIN tree). Wired the previously-unwired `PlaywrightAutomationEngine` (`mcp-server/src/engines/PlaywrightAutomationEngine.ts:329`, zero-arg singleton `playwrightAutomationEngine` at `:546`) into the `prism_knowledge` dispatcher as 2 actions:
- `learn_video_gui_script` -> `generateGUIScript(actions, target)`
- `learn_video_execution_plan` -> `planExecution(actions, prefer)`

Files: `knowledgeActionSchemas.ts` (+`_extractedActionSchema` + 2 schemas in `ACTION_KNOWLEDGE_SCHEMAS`), `knowledgeDispatcher.ts` (+2 `LEARN_ACTIONS` enum + 2 cases), new test `knowledgeDispatcher.playwright-gui-wire.test.ts` (18/18 round-trip). UNWIRED 19->18, WIRED-DIRECT 3590->3591 (validated). 3-of-3 scrutiny PASS.

THREE verify-before-wire catches (the lesson -- every queue/triage claim must be re-verified against source):
1. **"browser-dep" was a STALE FALSE blocker.** Prior romeo sessions parked Playwright as "needs a browser dependency". The engine has NO `from "playwright"` import, NO `child_process`, NO `.launch`/`browser`/`page.` -- it is a PURE GUI-script GENERATOR + cadquery/playwright execution PLANNER. The "playwright" tokens are only mode-enum string literals (`"cadquery"|"playwright"|"hybrid"`). Confirmed by grep. -> see [[feedback_verify_unwired_against_shared_tree]].
2. **The triage's `prism_automation` target was a name-substring FALSE home.** `prism_automation` (automationDispatcher) is the **Shop-Floor Automation** dispatcher (OEE/bottleneck/shift-handoff), NOT browser automation. The real natural home is `prism_knowledge` where the engine's video-pipeline siblings already live (`learn_video_extract_actions/_replay/_pipeline_run`, comment "wires 3 previously-unwired Video engines"). Always READ the dispatcher's actual domain (R8), never trust a name match.
3. **`slimResponse` strips empty arrays from dispatcher envelopes** -> an empty `actions`/`cadquery_steps`/`playwright_steps` arrives at the consumer as ABSENT, not `[]`. Round-trip tests must guard with `?? []` (the `cog-knowledge-wire.test.ts` harness already does this).

Crash-surface guard: `generateGUIScript` calls `mapActionToWorkflow(a.action_type, a.operation)` -> `operation.toLowerCase()` and `substituteParams(t, a.parameters)` -> `Object.entries(parameters)`; both throw on undefined. The dispatcher cases normalize each ExtractedAction with `operation := a.operation ?? a.action_type ?? "unknown"` and `parameters := a.parameters ?? {}`.

REMAINING romeo queue after this wire (clean in-lane EXHAUSTED again): `NXOpenAssemblyDrawingEngine` is NOT a clean singleton (`constructor(opts:{...})` at `:173`, no exported zero-arg instance) AND is CAD domain -> flag to `delta`, do not wire. The other 2 "wireable" are cross-domain AI (WEDMLoRADatasetBuilder->mike, XProcNeuralAutoFire->india). `SemanticAssetIndexEngine` needs a factory (3 ctor args).
