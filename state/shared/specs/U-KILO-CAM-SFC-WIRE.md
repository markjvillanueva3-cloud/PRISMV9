# U-KILO-CAM-SFC-WIRE — wire `cam_bridge_sfc_mastercam` + `cam_bridge_sfc_esprit` into camDispatcher.ts

**Milestone:** KILO-CAM-MASTERY-MS0
**Predecessor:** U-KILO-CAM-SFC-BRIDGES (slot:kilo iter1) — ships KiloCamSfcBridgesEngine with Mastercam + Esprit bridges (33/33 vitest PASS)
**Owner slot:** any (small wire-only unit, ~10 min)
**Sequencing:** pick up at merge point — slot/kilo is 874 commits behind main, AND echo's CamBridgeKitEngine is still uncommitted in shared tree as of 2026-05-24
**Estimated effort:** 1 commit, 3 file-edits, ≤20 LOC delta

## Why this is a SEPARATE unit

slot/kilo's `camDispatcher.ts` is 874 commits behind main. Wiring the 2 new
actions in slot/kilo would (a) be lost at merge, (b) collide with the 14,145
uncommitted edits in main's shared tree. Cleanest play: ship the engine + tests
self-contained (iter1) and emit this spec for whoever next touches a wired
camDispatcher.ts (any slot post-merge, or echo when CamBridgeKitEngine lands).

## Pre-flight checks

1. `H:/prism/mcp-server/src/engines/KiloCamSfcBridgesEngine.ts` exists in tree.
2. `H:/prism/mcp-server/src/__tests__/KiloCamSfcBridgesEngine.test.ts` exists.
3. `npx vitest run src/__tests__/KiloCamSfcBridgesEngine.test.ts` PASS (33/33).
4. Search `camDispatcher.ts` for the existing line containing `"cam_bridge_sfc_inventorhsm"` — that locates the z.enum slice + the lazy-case cluster.

## Edit 1 — z.enum action list (single-line addition)

Find in `H:/prism/mcp-server/src/tools/dispatchers/camDispatcher.ts` (line ~1129):

```ts
"cam_bridge_cad_cam_handoff", "cam_bridge_operator_gates_emit",
"cam_bridge_sfc_fusion", "cam_bridge_sfc_hypermill", "cam_bridge_sfc_inventorhsm",
```

Add two comma-separated entries (anywhere in the same enum is fine; grouping with siblings is preferred):

```ts
"cam_bridge_sfc_mastercam", "cam_bridge_sfc_esprit",
```

## Edit 2 — lazy-case dispatch (mirror the proven pattern)

Locate the existing `case "cam_bridge_sfc_inventorhsm":` block (a ~8-line
lazy-import + call + return shape). Duplicate twice immediately below, adjusting
the action name + engine method:

```ts
case "cam_bridge_sfc_mastercam": {
  const { kiloCamSfcBridgesEngine } = await import("../../engines/KiloCamSfcBridgesEngine.js");
  return kiloCamSfcBridgesEngine.sfcMastercamBridge(args.sfc, args.opts);
}
case "cam_bridge_sfc_esprit": {
  const { kiloCamSfcBridgesEngine } = await import("../../engines/KiloCamSfcBridgesEngine.js");
  return kiloCamSfcBridgesEngine.sfcEspritBridge(args.sfc, args.opts);
}
```

Adjust the relative-import depth (`../../engines/`) to match the sibling cases
in your version of the dispatcher.

## Edit 3 — dispatcher-integration test (append to existing test file)

Add to `H:/prism/mcp-server/src/__tests__/KiloCamSfcBridgesEngine.test.ts`
inside the top-level `describe("KiloCamSfcBridgesEngine", ...)` block, after the
existing "Cross-bridge invariants" block:

```ts
describe("Dispatcher Integration (KILO-CAM-MASTERY)", () => {
  it("camDispatcher ACTIONS array contains cam_bridge_sfc_mastercam", async () => {
    const { ACTIONS } = await import("../tools/dispatchers/camDispatcher.js");
    expect(ACTIONS).toContain("cam_bridge_sfc_mastercam");
  });
  it("camDispatcher ACTIONS array contains cam_bridge_sfc_esprit", async () => {
    const { ACTIONS } = await import("../tools/dispatchers/camDispatcher.js");
    expect(ACTIONS).toContain("cam_bridge_sfc_esprit");
  });
});
```

## Acceptance criteria

- [ ] `npx vitest run src/__tests__/KiloCamSfcBridgesEngine.test.ts` returns 35/35 PASS (33 from iter1 + 2 dispatcher-integration)
- [ ] `npm run build:fast` clean (no tsc errors, no esbuild errors)
- [ ] `node scripts/audit-unwired-engines.mjs --since-engine KiloCamSfcBridgesEngine` reports wired
- [ ] `grep -c '"cam_bridge_sfc_"' camDispatcher.ts` returns 5 (was 3 — Fusion, hyperMILL, InventorHSM; now +Mastercam, +Esprit)

## Cross-refs

- Predecessor: KiloCamSfcBridgesEngine (slot:kilo iter1)
- Sibling: `CamBridgeKitEngine` (echo, ECHO-CAM-BRIDGES-MS0 — uncommitted in shared tree as of 2026-05-24 14:00)
- Doctrine: CLAUDE.md §ENGINE WIRING — WIRE TO ALL SOURCES (2026-04-28)
- Memory: feedback_engine_tests_in_tests_dir.md, feedback_commit_to_slot_worktree.md

## Follow-up

After this unit lands, the schema-dedupe follow-up `U-KILO-CAM-SFC-SCHEMA-DEDUPE`
becomes pickable (echo's `SFCResultSchema` and kilo's local `SFCResultSchema` can
be unified into a shared `src/schemas/sfc-result.ts` module).
