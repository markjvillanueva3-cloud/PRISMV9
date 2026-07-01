---
name: reference-stop-advisory-wiring-cluster-2026-05-15
description: "Stop chain has a peer-coordination cluster (session-end-peer-share + duplication-guard-stop). Insert new non-blocking advisories BETWEEN those two — keeps related hooks adjacent + makes their order audit-able as a unit. Used 2026-05-15 to land stop-cross-tree-collision-advisory.mjs at Stop[7]/36 timeout=3000ms in both C: and H: settings.json (c-to-h-mirror replicates). Zero-risk wiring pattern: hook returns {continue:true,suppressOutput:true} on the no-collision path, so adding it can never break a Stop that previously succeeded."
metadata:  
source: prism-memory
synced: 2026-05-18T01:02:09.955Z
aliases: reference_stop_advisory_wiring_cluster_2026_05_15
---


# Stop advisory wiring cluster (2026-05-15)

**Pattern adopted:** The Stop hook chain in `.claude/settings.json` has a natural peer-coordination cluster:

```
... session-end-peer-share.mjs (peer state share)
    ← INSERT NON-BLOCKING ADVISORIES HERE →
    duplication-guard-stop.mjs (peer-file claim guard)
```

When you add a new T3 advisory (cross-tree collision, slot drift, fleet-pipeline mismatch, etc.), inserting BETWEEN these two:
1. Keeps related peer-coordination logic adjacent for easier audit (`grep -A30 session-end-peer-share settings.json`)
2. Sits AFTER critical Stop gates (goal-complete-gate, stop-auto-wire, git-sync-stop, output-cache-capture, roadmap-checkpoint)
3. Sits BEFORE the heavy regression gates (stop_on_unwired_assets, stop_on_failing_tests, commit-pressure-stop-gate)
4. Inherits the safe-silent-default ethos of the surrounding hooks

**Zero-risk wiring rule:** before inserting a new advisory hook, verify the no-finding path returns `{continue:true,suppressOutput:true}` (or equivalent). Then wiring CANNOT regress a previously-passing Stop — the worst-case behavior is silent extra spawn cost (3-second timeout caps it).

**Edit C: only:** the `c-to-h-mirror` PostToolUse hook auto-replicates `C:\Users\<u>\.claude\settings.json` → `H:\.claude\settings.json` on every Edit/Write. Editing H: directly is allowed but won't replicate back to C:. Verify after edit: `node -e "const c=require('C:/.../settings.json'); const h=require('H:/.claude/settings.json'); console.log(JSON.stringify(c)===JSON.stringify(h))"` should print `true`.

**Example use 2026-05-15:** Wired `stop-cross-tree-collision-advisory.mjs` at Stop[7]/36 with timeout=3000ms between `session-end-peer-share` (Stop[6]) and `duplication-guard-stop` (Stop[8]). Hook fires once-per-4h via marker file (`PRISM_CROSS_TREE_ADVISORY_TTL_MS`), emits migration hint when a chat is in `H:/prism` with critical files dirty AND a sibling `H:/prism-<topic>` worktree matches the chat's topic. Disable: `PRISM_CROSS_TREE_ADVISORY_DISABLE=1`.

**Lesson reinforced:** the [[reference_hook_wiring_audit_2026_05_15]] memo confirmed 10+ Stop/Pre/Post hook orphans live in `.claude/hooks/` while documented as "wired" — always grep settings.json before claiming a hook is live.

**Related:** [[reference_hook_wiring_audit_2026_05_15]], [[reference_session_continuity_stack_2026_05_15]].


## Related
[[skills/settings|/settings]] • [[skills/prism|/prism]] • [[skills/prism-|/prism-]] • [[skills/hooks|/hooks]]