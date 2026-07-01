# Patch-sibling — HyperMillACScriptExecutor mock branches (P1-1)

> Author: claude-3db3fb3d (slot=echo), 2026-05-20.
> Source: peer-reviewer agent a4553ad14430ed1b4 finding P1-1 from
> CAD-PIPELINE-AUDIT-2026-05-20 / ACSERVER-BRIDGE-AUDIT-2026-05-20.
> Patch-sibling because `HyperMillACScriptExecutor.ts` is peer-owned in this
> shared-main-tree multi-chat session (per [[feedback_commit_prefix_main_on_shared_tree]]
> + [[feedback_conflict_fork_rule]]).

## Finding

`HyperMillACScriptExecutor.mockExecute` (`mcp-server/src/engines/HyperMillACScriptExecutor.ts:133-148`) returns synthetic stdout for these script keywords:

- `geometry_json` → returns `MOCK_GEOMETRY_JSON`
- `operation_tree_json` → returns `MOCK_OPERATION_TREE_JSON`
- `open_project` → returns `{"opened": <filePath>}`
- `export_step` → returns `{"exported": <outputPath>}`
- `close_project` → returns `{"closed": true}`

The new `HyperMillACBridgeEngine.buildExtractScript` and `buildOptimizeScript` generate Python that calls `prism_ac.extract_databases(...)` and `prism_ac.optimize_ppp(...)`. Neither keyword appears in the executor's mock match list, so `mockStdout = ""`. The downstream job reports `state: "succeeded"` with empty stdout — operators in mock mode may misread this as a real (but empty) response.

## Proposed patch (apply when the file is unclaimed)

```typescript
// In HyperMillACScriptExecutor.mockExecute, add two more keyword branches
// BEFORE the existing fall-through (or as additional `else if` clauses):

else if (script.includes("extract_databases")) {
  mockStdout = JSON.stringify({
    ok: true,
    protocol_version: 1,
    mock: true,
    extracted: 0,
    files: [],
  });
}
else if (script.includes("optimize_ppp")) {
  mockStdout = JSON.stringify({
    ok: true,
    protocol_version: 1,
    mock: true,
    optimized: false,
    reason: "mock_mode",
    suggestions: [],
    savings_pct: 0,
  });
}
```

## Why patch-sibling

- The chat-bus snapshot at session start shows 3-7 concurrent peers; this file is part of the hyperMILL AC cluster that's actively-touched by other chats.
- The patch is a surgical 2-clause addition with no risk of breaking the existing 5 keyword branches.
- Per `feedback_never_delete_only_disable` doctrine — the existing branches stay; the patch is strictly additive.

## Merge checklist (whichever chat picks this up)

1. Confirm no peer is currently editing `HyperMillACScriptExecutor.ts` (check chat-bus + file-claim).
2. Add the two clauses above to `mockExecute` between the existing `close_project` branch and the fall-through.
3. Verify by running the new ACServer bridge tests with `PRISM_CAD_MOCK=1`: extract/optimize routes' resulting jobs should parse their stdout as `{ok: true, mock: true}` instead of empty string.
4. Commit format: `[MAIN] [CAD-FUSION-LIVE-MS0]/U-AC-EXECUTOR-MOCK-EXTRACT-OPTIMIZE: add mock branches`.
5. Delete this patch sibling after merge.

## See also

- `state/shared/specs/ACSERVER-BRIDGE-AUDIT-2026-05-20.md`
- `state/shared/specs/HYPERCAD-TEST-PLAYBOOK-2026-05-20.md` (Tier 1 mock test exposes this gap)
- `mcp-server/src/engines/HyperMillACScriptExecutor.ts` (target file)
- Peer reviewer output: agent `a4553ad14430ed1b4`
