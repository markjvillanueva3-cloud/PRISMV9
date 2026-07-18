---
session: claude-dc1f6121
topic: hook-fix-sysviz-masterindex
slot: 
written_at: 2026-05-15T02:42:55.206Z
machine: DESKTOP-N7MI1VB
family: Claude
session_key: claude-dc1f6121
status: active
---

# HANDOFF: claude-dc1f6121
Updated: 2026-05-15T02:42:55.206Z
Family: Claude | Machine: DESKTOP-N7MI1VB | Session: claude-dc1f6121

## STATE
## HOOK FIX (DONE+verified, UNCOMMITTED)
system-viz-live-bridge.mjs: extracted exported telemetryRecordFor(res,stdin) -> returns null for viz-not-running (do not log), keeps pinged + real ping-failed HTTP errors. main() now: const rec=telemetryRecordFor(res,stdin); if(rec) telemetry(env,rec). Test file: +6-test telemetryRecordFor describe block + added to imports. Verified: node --check OK on both, 8/8 direct functional test, live probe proved full path (runBridge fires -> TypeError -> telemetryRecordFor null -> zero telemetry). vitest BROKEN repo-wide (vite-transform bug, exit -1) — ignore it. NEXT: 3-of-3 scrutiny + commit.
LESSON: hook-health-check.mjs reads hook-fire-counts.jsonl (only logs 2 hooks) -> false '0 broken'. Real hook errors: .claude/cache/hook-telemetry.jsonl.

## /SYSTEM-VIZ MASTER-INDEX TASK (explored, NOT started)
MasterIndexEngine + /master-index skill + awareness stack ALREADY EXIST (OBSIDIAN-PRISM-OS-MS0, 2026-05-12). /system-viz skill = 3D viewer launcher only, NOT search. master-index-precheck-inject.mjs (UserPromptSubmit) + awareness-snapshot-inject.mjs (SessionStart) EXIST but ORPHANED — not in any bundle or settings.json. Only master-index-search-gate.mjs is live (edit-bundle.mjs:49). No slash-command pipeline references master-index/system-viz-query. TWO competing impls: MasterIndexEngine (graph) vs MASTER_INDEX_COMPACT.md+search-router-hook.mjs (keyword-route). GENUINE DELTA = wire the 2 orphaned hooks + write memory (search-first via system-viz/obsidian/tribal) + sharpen CLAUDE.md MASTER INDEX section + pipeline integration + reconcile the 2 impls. Consolidate/wire/document, NOT build-new (duplication-guard satisfied). brainstorming HARD-GATE was active; user 'continue/complete/loop' overrides it.
Tasks: #1-8 brainstorming track (paused), #9 #10 #11 hook fix (DONE). loop-state: session dc1f6121, target 8.

## RESUME
Hook-error fix is DONE + verified but UNCOMMITTED (2 files: .claude/hooks/system-viz-live-bridge.mjs + its __tests__ file). STEP 1: run 3-of-3 scrutiny on the session diff + commit. STEP 2: continue the /system-viz-master-index task (user: '/loop until all units+tasks done = /goal') — write a memory, sharpen CLAUDE.md 'MASTER INDEX + AWARENESS STACK' section, and WIRE the 2 orphaned hooks (master-index-precheck-inject.mjs->UserPromptSubmit, awareness-snapshot-inject.mjs->SessionStart) into H:/prism/.claude/settings.json — they EXIST but are NOT wired. Then pipeline integration. Full findings in state below.

## CONTEXT

