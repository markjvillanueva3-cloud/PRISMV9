---
name: stop-unwired-assets-false-positive-2026-05-23
description: "stop_on_unwired_assets.mjs Stop hook reports 5 cam_bridge_* actions as UNHANDLED in camDispatcher.ts, but the case handlers exist at lines 5183, 5190, 5203, 5212, 5222. Hook has a detection bug — likely scan-range cutoff or regex miss."
aliases: reference_stop_unwired_assets_false_positive_2026_05_23
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.212Z
---


# False positive: stop_on_unwired_assets reports handled actions as UNHANDLED (2026-05-23)

## Symptom

Stop hook `H:/prism/.claude/hooks/stop_on_unwired_assets.mjs` blocks with:

```
WIRING ENFORCEMENT — 1 unwired/unhandled/untested asset(s) detected:
  • UNHANDLED ACTIONS in mcp-server/src/tools/dispatchers/camDispatcher.ts:
    cam_bridge_cad_cam_handoff, cam_bridge_operator_gates_emit,
    cam_bridge_sfc_fusion, cam_bridge_sfc_hypermill, cam_bridge_sfc_inventorhsm
```

## Reality

`awk` over `H:/prism/mcp-server/src/tools/dispatchers/camDispatcher.ts` shows the actions appear at line 1129 in the z.enum AND each has a case handler in the dispatch switch:

| Action | z.enum line | case handler line |
|---|---|---|
| `cam_bridge_cad_cam_handoff` | 1129 | 5183 |
| `cam_bridge_operator_gates_emit` | 1129 | 5190 |
| `cam_bridge_sfc_fusion` | 1129 | 5203 |
| `cam_bridge_sfc_hypermill` | 1129 | 5212 |
| `cam_bridge_sfc_inventorhsm` | 1129 | 5222 |

All 5 cases EXIST. The hook's "UNHANDLED" detection is wrong.

## Likely root cause

Three candidates worth investigating:

1. **Scan-range cutoff** — the hook may read only the first N lines of the dispatcher file, missing cases that live at line 5000+. camDispatcher.ts is ~10K LOC.
2. **Regex miss** — the case handler may use a non-standard pattern (e.g., grouped/fall-through case statement) that the hook's regex doesn't match.
3. **Stale cache** — the hook may compare against a cached action map that wasn't regenerated after recent dispatcher edits.

## Mitigation while bug stands

- **Escape hatch:** `PRISM_ALLOW_UNWIRED=1` (documented in the hook's error message) bypasses for one session — use ONLY when the false-positive is confirmed (awk over the dispatcher to verify case existence).
- **Per [[feedback_dont_soften_completeness_gates]]:** never flip the gate's `continueOnError:true` permanently. Use the per-session env var ONLY.
- **Permanent fix path:** echo slot (CAM domain) should debug and patch `stop_on_unwired_assets.mjs` — the bug class is "static scan misses real cases" so the fix is likely a regex or scan-range tweak.

## Apply

- When this Stop gate fires with `UNHANDLED ACTIONS` listed, run `awk '/case "<action>"/{print NR}' <dispatcher.ts>` to verify before acting.
- If the case exists, the hook is wrong — use the escape hatch and log the false positive (this memory pattern).
- If the case is genuinely missing, fix the wire (don't escape).

Related: [[feedback_dont_soften_completeness_gates]] · [[reference_audit_unwired_engines_table_driven_action_map_detection]] · [[reference_iter4_hpm_wire_2026_05_23]] (sibling bug class: substring-search audits miss missing case handlers — this is the opposite, regex-based audit invents missing cases when they exist)
