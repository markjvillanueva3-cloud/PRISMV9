---
name: reference_slot_drift_worktree_transcript_2026_05_30
description: "Root cause + fix for fleet-wide chat-slot drift — the U-SDF03/04 transcript-liveness gate hardcoded the H--prism project dir, so worktree chats (H--prism-slot-<nato>) were never found alive and their slots got stolen by peer auto-pin. Fix U-SDF05."
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.952Z
aliases: reference_slot_drift_worktree_transcript_2026_05_30
---


2026-05-30 (slot:bravo, operator-reported "chats disconnect + fall out of their slot"): found + fixed the **fleet-wide slot-drift root cause**. Commit `827bcd8ce7` on main (`[MAIN] [SLOT-DRIFT-FIX-MS0]/U-SDF05`).

**The bug:** `chat-slots.mjs` decides "is this slot's window still alive?" via `isWindowAlive()`, whose PRIMARY signal (U-SDF03/04) is **transcript-mtime freshness** — `findTranscriptFile(chatId)` stat's the chat's `<id>.jsonl`. But `findTranscriptFile` hardcoded `CLAUDE_PROJECT_PREFIX = "H--prism"` and looked ONLY in `<home>/.claude/projects/H--prism/`. The **slot-worktree migration** (SLOT-WORKTREE-MS0, 2026-05-16) moved every chat into `H:/prism-slot-<nato>`, whose Claude transcript dir is **`H--prism-slot-<nato>`**, not `H--prism`. So `findTranscriptFile` returned `null` for EVERY worktree chat → `isTranscriptFresh` false → fell through to the U-SDF02 PID gate → the twid is tier-4 `tw-wt-<guid>` (WT_SESSION, **no PID encoded**) → `extractWindowPid` null → `isWindowAlive` **false** → `shouldKeepSlotAlive` false → the auto-reclaim sweep treated the live, pinned chat as abandoned → the next peer's `session-start-auto-pin` stole the slot. Live proof: bravo drifted twice in minutes (`claude-43392021` → `claude-9b19c951`) while I watched.

**Why it hid for so long:** U-SDF03/04 (2026-05-17) was written + tested when chats ran in the shared `H:/prism` tree, so `H--prism` was correct THEN. The worktree migration (a DIFFERENT milestone) silently invalidated the path assumption. Two correct-in-isolation changes composed into a fleet-wide regression — neither milestone's tests caught it because the test used `PRISM_SLOT_TRANSCRIPT_BASE` (single-dir override), masking the multi-dir reality.

**The fix (U-SDF05):** `findTranscriptFile` now scans the shared dir AND **every sibling `H--prism*` worktree project dir**, returning the freshest matching transcript. `PRISM_SLOT_TRANSCRIPT_BASE` still pins one dir for tests. Empirically verified on the live fleet (finds the real `H--prism-slot-bravo/<id>.jsonl`, `isWindowAlive=true`; negative control false) + 3 regression tests + 23/23 existing bindings still pass.

**Lesson (R8 + cross-milestone blast radius):** a path/dir assumption baked into one milestone (`H--prism`) can be silently broken by a LATER structural migration (per-slot worktrees). When you migrate where chats live, grep for every consumer that hardcodes the old project-dir shape. The slot-worktree model is canonical now — anything keyed on `H--prism` must be `H--prism*`.

**Second, SEPARATE issue (MCP disconnects — NOT this fix):** `.mcp.json` makes every chat spawn 3 MCP servers — `prism` (thin bridge → shared :3100, fine) + `claude-flow` (`npx -y claude-flow mcp start`: 20 servers + 30 npx-shims ≈ 5 GB) + `shadcn` (bunx). Plus ~13 tsservers (~5 GB). The :3100 prism server itself is healthy (1 supervisor + 1 HTTP). Disconnects = resource-starvation spikes that blow the prism bridge's 120 s ready-budget (only 5 of ~20 chats had a live prism bridge). Highest-leverage fix = drop unused `claude-flow`/`shadcn` from `.mcp.json` (operator decision pending). Related: [[reference_mcp_orphan_server_leak_2026_05_29]], [[reference_mcp_fleet_scale_fix_2026_05_29]], [[feedback_commit_to_slot_worktree]].
