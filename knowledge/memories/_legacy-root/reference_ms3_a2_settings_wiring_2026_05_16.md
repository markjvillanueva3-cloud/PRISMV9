---
name: reference-ms3-a2-settings-wiring-2026-05-16
description: OBSIDIAN-INTELLIGENCE-MS3/A2 settings.json wiring + peer-absorption + read-side wiring gap surfaced
metadata:  
source: prism-memory
synced: 2026-05-18T01:02:09.565Z
aliases: reference_ms3_a2_settings_wiring_2026_05_16
---


OBSIDIAN-INTELLIGENCE-MS3/A2 U-REREAD-SIGNAL-FINISH closed 2026-05-16 by slot charlie claude-549c9f4f via /checkin → /loop iter 1/10. The unit's hook (`.claude/hooks/wiki-recall-on-write.mjs`) and test (`mcp-server/src/__tests__/WikiRecallCounter.write-events.test.ts`) were ALREADY on disk from prior peer-absorption — A2 had a 2-files-of-3 partial-ship state, missing only the settings.json wiring.

**The 1 thing this unit actually shipped:** appended a 9th PostToolUse entry to `C:/Users/wompu/.claude/settings.json` with matcher `Edit|Write|MultiEdit` → `wiki-recall-on-write.mjs` (timeout 3000ms). The c-to-h-mirror hook auto-replicated to `H:/.claude/settings.json` within milliseconds (confirmed both files have `PostToolUse.length === 9` + last entry's matcher matches + last command matches). Settings.json now actually fires the hook on real Write/Edit/MultiEdit events.

**Functional verification:** 14/14 vitest cases PASS in 51ms (`WikiRecallCounter.write-events.test.ts`). Hook smoke via bash stdin pipe: payload `{tool_name:"Write", tool_input:{file_path:".../feedback_a2_smoke.md"}}` → response `{continue:true, hookSpecificOutput:{additionalContext:"recall-counter-write: +1 memory/feedback/feedback_a2_smoke via Write (count=1)"}}`. PowerShell pipe-to-stdin did NOT work (`{continue:true}` no-message) — PS-native `& node` doesn't deliver pipeline strings to Node's synchronous `readFileSync(0)`. Use bash heredoc for hook smoke tests on Windows. See [[feedback_powershell_node_stdin]] (worth writing).

**Peer-absorption pattern hit again:** mid-session at commit time, commit-ownership-guard blocked my envelope commit because claude-c0f06dee touched OBSIDIAN-INTELLIGENCE-MS3.json 0 minutes earlier and auto-bumped `completed_units` 0→2 (my 0→1 absorbed + theirs +1). My `first_unit_completed: A2 (...)` text + `ship_record` block survived on-disk. Per [[feedback_conflict_fork_rule]] + the conflict-fork doctrine: did NOT fight for the tree lock — peer's commit will carry my A2 line. 7th shared-tree absorption in the fleet this week ([[reference_u_ppl_d5_bridge_shipped]] = 5th, [[reference_u_ppl_d4_program_equivalent_index]] = 6th, this = 7th).

**Honest scope gap surfaced (Karpathy R12 — fail loud):** the READ-side hook (`.claude/hooks/wiki-recall-on-read.mjs`) is on disk but ALSO unwired in both `C:/Users/wompu/.claude/settings.json` AND `H:/.claude/settings.json`. Confirmed via `grep wiki-recall` → 0 matches BEFORE my edit, 1 match (write only) AFTER. This is a SEPARATE wiring gap from A2's scope — surfacing as a follow-up unit candidate (`U-WIRE-READ-RECALL-HOOK`, S, single settings.json append). Doctrine: see [[feedback_settings_wiring_drift_2026_05_16]] — must verify wiring via grep after every settings-touching unit ships.

**Reapplied lessons:**
1. The /checkin pipeline kilo→charlie fallback worked correctly: `kilo` isn't a NATO slot name (canonical 10: alpha · bravo · charlie · delta · echo · foxtrot · hotel · india · juliett + golf hygiene). Slot-claim auto-picked first free. Operator's intent honored by fleet-aware fallback. See [[feedback_fleet_design_10_chats]] — confirms 10 slots, kilo is NOT one of them.
2. RTK wrapping `npx` triggered `npm error Missing script: "vitest"` — `rtk` doesn't proxy `npx` cleanly. Use raw `npx` or invoke vitest module via portable node (`H:/Tools/nodejs/node.exe ./node_modules/vitest/vitest.mjs run ...`).
3. The `--reporter=basic` flag on vitest 4.x triggers `ERR_LOAD_URL` on the custom-reporter loader. Use default reporter or `--reporter=verbose`.
4. Peer-absorption is now a recognized pattern, not a bug. Trust the chat-bus + commit-ownership-guard to route attribution — never fight the lock on shared trees.

Follow-up candidates surfaced this session:
- `U-WIRE-READ-RECALL-HOOK` (S): mirror today's settings.json append for the wiki-recall-on-read.mjs side.
- `U-POWERSHELL-NODE-STDIN-FIX` (S/M): document/script the PS→Node stdin gap (Windows .ps1 wrapper around hooks that need stdin testing).


## Related
[[skills/checkin|/checkin]] • [[skills/loop|/loop]] • [[skills/hooks|/hooks]] • [[skills/wiki-recall-on-write|/wiki-recall-on-write]] • [[skills/src|/src]] • [[skills/wompu|/wompu]] • [[skills/settings|/settings]] • [[skills/feedback|/feedback]] • [[skills/wiki-recall-on-read|/wiki-recall-on-read]] • [[skills/nodejs|/nodejs]]