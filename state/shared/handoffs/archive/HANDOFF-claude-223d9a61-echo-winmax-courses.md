# HANDOFF — claude-223d9a61 (slot echo) — winmax / master-post validation

**Topic:** winmax-master-post · **Updated:** 2026-05-31 · Slot echo (post-processor)

## CAM→pocket→post chain: COMPLETE (U-POCKET-HOLDER-CHAIN + U-POCKET-HOLDER-FIX + U-POCKET-FROM-CAM)
`scripts/winmax-tool-pocket-autoselect.mjs` (50/50 tests). Full chain end-to-end: **CAM program file → `camProgramToTools({cam,file})` extractor (fusion/mastercam/hypermill over :3100) → tools+holders → `buildPocketMap` (holder-aware dedup; same cutter+different holder/gauge = own pocket) → `buildPostParams` → `master_post_hurco_v11`.** CLI: `--from-cam <fusion|mastercam|hypermill> <file>` | `--from-tools <csv|json>` | `--emit post-params`. Holders survive throughout (verified). Live run vs a real .f3d/.mcam/.hmt needs :3100 un-saturated (was "Max subscriptions: 500") + confirming each extractor's response carries holder fields.

## NEXT — back to TRAINING (operator directive "then we can get back to training")
The CAM-pocket-post + closed-loop + SFC-fix work is the substrate; training (india-domain self-improving AI / closed-loop learning) is the operator's next focus. Echo's contribution is ready: the closed loop (`post-closed-loop-tick.mjs` verify→score→learn ledger + `post-closed-loop-correct.mjs --sfc` regenerate-better) produces the training signal.

## OPEN FOLLOW-UPS (not blocking training)
- **task #9** — Fusion + Mastercam holder + machine DB exporters (hyperMILL done as template).
- **task #8** — oscar: SFC `speed_feed` material-blind stub + drill op-path returns milling Vc.

## (prior) RESUME — task #9
Build the **Fusion + Mastercam holder + machine DB exporters** (the 4th user deliverable; hyperMILL done as the template). Steps:
1. Get param schemas for `fusion_export_tool_library` + `mastercam_tool_export` from `camDispatcher.ts` (they rejected my minimal params). Drive live on `:3100` to capture the real **Fusion .json** tool-library schema + **Mastercam .tooldb** format (Mastercam .tooldb is SQLite — like hyperMILL .hmt).
2. Build `scripts/export-{fusion,mastercam}-{holder,machine}-db.mjs` mirroring `scripts/export-hypermill-holder-db.mjs` / `export-hypermill-machine-db.mjs` (source: `ToolHolderDatabaseEngine` HOLDER_DB for holders, `ShopConfigurationEngine` for machines). Each with a `--selftest` + real-value asserts. Emit to `state/shared/master-post-validation/exports/{fusion,mastercam}/`.
3. Verify uploadable (Fusion valid JSON schema; Mastercam SQLite loads).

## SHIPPED this session (16 units, all committed)
**WinMax harness:** course framework + vision-free driver + FSM map (TOOL_OFFSETS mapped) + HelpText probe.
**Closed loop:** `post-nc-conformance.mjs` (semantic verify, +`--structural` mode P1-d, 30 tests) · `post-closed-loop-tick.mjs` (verify→score→learn ledger) · `post-closed-loop-correct.mjs` (regenerate speeds+feeds toward SFC, chip-load preserved). Demonstrated: broken NC 87%→100%.
**SFC engine FIXED** (`U-SFC-ENGINE-FIX`, commit 4abd8d9156): `calcDispatcher` tool_diameter→tool_diameter_mm plumbing — `ultimate_speed_feed` now material+diameter-correct for ALL callers, verified live on :3100. (`speed_feed`=material-blind stub, `sf_orchestrate`=broken — oscar's, see [[reference_sfc_speed_feed_bugs_2026_05_31]].)
**Master-post validation** (`U-MASTERPOST-VALIDATE`, commit 09cf8d5cf3): 19-agent workflow. 123-feature checklist (`state/shared/master-post-validation/MASTER-HURCO-POST-CHECKLIST.md`); 52/52 generated + dialect-lint clean across 127-combo pairwise (13 axes); auto-pocket (`winmax-tool-pocket-autoselect.mjs`, verified 5 ops→4 pockets); hyperMILL holder+machine exporters.

## Open findings for OTHER chats (peer-owned, reported NOT edited)
- **P1-a** dispatcher clamps `work_offset` to [54,59] → extended-WCS G54.1 dead code (`camDispatcher.ts:6731-6741` vs engine `:1056-1064`). Fix: widen schema to P1..P300.
- **P1-b** AGI path emits Haas `G187` for Hurco (`MasterPostProcessorUnifiedAGIEngine`) — use `master_post_hurco_v11`, not the AGI path.
- **P1-c** AGI kinematics can't resolve `jmdie_hurco_v11` (register VMX42 travels).
- **P2-a** post emits no `G94` feed-mode block before first cut.
- **oscar (task #8):** SFC `speed_feed` material-blind + drill op-path returns milling Vc.

## KEY FACTS
- Master post engine: `mcp-server/src/engines/HurcoV11MillMasterPostEngine.ts` (READ-only, 16 in-flight peer handoffs). Drive via `master_post_hurco_v11` on :3100 (params: operations[].operation_type ∈ face/pocket/contour/drill/tap/bore/slot/3d_surface/adaptive + tool_diameter_mm; machine.spindle).
- Engine mm-native; JM jobs INCH (G20). 25.4× guard always.
- :3100 stateful (serial POSTs); crash-loops under fleet load (retry on empty-content 200).
- Commit from H:/prism: `[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [ECHO-WINMAX]/U-ID`, own files, `command git`, clear `.git/*.lock` first, write commit msg via Write tool (printf heredocs mangle in this shell).
- WinMax GUI Draw-verify still blocked: OS screen-capture disabled here; Draw not in UIA tree.
