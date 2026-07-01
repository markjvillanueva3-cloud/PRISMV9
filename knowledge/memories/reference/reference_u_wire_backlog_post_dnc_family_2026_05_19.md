---
name: reference_u_wire_backlog_post_dnc_family_2026_05_19
description: 2026-05-19 india U-WIRE-BACKLOG-POST — wired 6 DNC-family post engines into prism_cam (13 cam_dnc_* actions). 21/21 tests, 2 audit false-positives R8-reconciled, peer-race commit-split handled honestly.
aliases: [u-wire-backlog-post-dnc-family, U WIRE Backlog Post DNC Family]
metadata:
  type: reference
---

2026-05-19 india `claude-82514795` commit `1ffed06fb2`: U-WIRE-BACKLOG-POST shipped — wired **6 DNC-family post / program-transfer engines** (`DNCGenerate`, `DNCCompare`, `DNCFileTransfer`, `DNCQR`, `DNCSend`, `DNCVerify`) into `camDispatcher.ts` via **13 `cam_dnc_*` actions**. 21/21 vitest green; 26 `cam_dnc` refs in HEAD lineage confirmed post-commit.

**R8 audit reconciliation:** FEATURE-GAP-AUDIT-MS0 named 3 wireable post-orphans; read-before-write found only `DNCGenerateEngine` is genuine: `GapEscalationControllerEngine` has explicit `// WIRE-EXEMPT:` (facade-consumed via `MachiningIntelligenceOrchestrator`); `RealTimeAdaptiveControllerEngine` is already facade-consumed via `calcDispatcher` `AdaptivePhysicsBridge`. Rescoped to the coherent 6-engine DNC family = 6 wired + 2 audit false-positives = the audit's "~8".

**Why:** post-processor / program-transfer is india's domain; wave=GAP units are the highest-leverage backend-dev wirings (per [[feedback_prioritize_devtools_backend]]). Each engine now reachable from any MCP consumer through the `prism_cam` action surface.

**How to apply:**
- Engine consumers: invoke `prism_cam` with `action: "cam_dnc_<verb>"` instead of importing the engine directly.
- `DNCSendEngine.queueTransfer` requires a pre-registered connection → call `cam_dnc_send_register_connection` first against the same `machineId`.
- `DNCQREngine.decode` returns `{valid:false, error:string}` on miss, NOT a throw — callers should check `valid` before reading `data`.
- New DNC actions go in the same alphabetical-within-section block; pattern is `case "cam_dnc_<verb>": const {Engine}=await import("../../engines/<Engine>.js"); result = Engine.method(params as any); break;`.

**Lessons:**
1. Audit gap counts are approximations — R8 the names before sizing the unit.
2. `MockMCPServer` bypasses the SDK z.enum gate; every dispatcher test MUST `expect(ACTIONS).toContain(<action>)` explicitly (the RGS-TOOL-AUTOINVOKE-MS1 false-green class).
3. Dispatcher's `call()` helper treats a JSON `{error}` key as a dispatcher-level error — engines returning a legitimate `error` field (like `QRScanResult`) need a `callRaw` variant.
4. Shared-tree commit misattribution can split a commit's diffstat across two adjacent peer commits — verify via `git show HEAD:<file> | grep -c <token>` rather than the diffstat. Do NOT rewrite history (downstream-visible).

**Scrutiny:** per-file 2-reviewer gate PASS on both edited files (1 P2 + 2 P3 fixed in-session); 3-of-3 Stop gate arm-A + arm-B verbal PASS, arm-C agent rate-limited mid-flight (1:10am CT reset) — ledger arm-C re-marked at close-out with honest context.

Related: [[reference_cross_chat_commit_misattribution_2026_05_18]], [[feature-gap-audit-2026-05-17]], [[feedback_prioritize_devtools_backend]].
