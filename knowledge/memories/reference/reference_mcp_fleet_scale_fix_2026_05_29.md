---
name: reference_mcp_fleet_scale_fix_2026_05_29
description: Fleet 26-chat MCP-disconnect + slash-command-starvation root cause + the fix set applied (prism_safe drop, probe fix, command sync, tsserver cap) vs deferred (rebuild/watchdog/limiter/narrowing → golf)
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.652Z
aliases: reference_mcp_fleet_scale_fix_2026_05_29
---


2026-05-29 (slot:bravo): two deep workflows (assessment wk4d1c1c6 + apply wq0m0k9yh) found the fleet was DESIGNED to scale (N thin stdio bridges → 1 shared :3100 server, ~770MB total) but the slot-worktree rollout silently broke it; real ceiling was ~12-16 chats, not 26.

**Root causes:** (1) every chat ran a 2nd full `dist/index.js` monolith via the `prism_safe` stdio server in `.mcp.json` (~19GB redundant at 26 chats; the U-MCP-DROP-PRISM-SAFE commit `4b5cc7a46f` only reached cad-fusion-live-ms0, never the 24 slot worktrees). (2) those monoliths leak on parent death (no stdin-EOF in mcp-server/src/index.ts; slot reaper blanket-protected all dist/index.js). (3) shared server OOMs with NO preemptive watchdog + supervisor was DEAD. (4) tsserver-per-worktree = 22GB uncapped (true RAM ceiling). (5) the "DISCONNECTED" banner was a FALSE POSITIVE — `mcp-connectivity-check.mjs` probed HEAD `/` (404) with a 1s timeout while `/health` answered 200 in ~222ms.

**SHIPPED (commits main `454d5dc029` + bravo `94e7dc2b75`; config applied to all 26 worktrees on-disk):** prism_safe dropped from 26 `.mcp.json` + 18 `enabledMcpjsonServers`; `MCP_MAX_CONCURRENT` 6→3 + `PRISM_MCP_READY_BUDGET_MS=120000`; probe → GET `/health` + 3s timeout + 5s re-probe floor (banner fixed, LIVE); commands synced to all 26 worktrees (27 checkin wrappers each — fixes [[reference_slot_worktree_command_gap_2026_05_29]]); tsserver `maxTsServerMemory=2048` in 27 `.vscode`; zombie-hunter regex matches relative `dist/index.js`; index.ts stdin-EOF orphan guard (source committed).

**DEFERRED → golf/sierra (chat-bus posted; spec state/shared/specs/MCP-FLEET-SCALE-FIX-2026-05-29.md):** DEPLOY index.ts (`npm run build:fast` + restart :3100); register durable supervisor task + preemptive RSS watchdog (SIGTERM child at 2500MB); 503 in-flight limiter (POST /mcp); process-slot-map PROTECTED_PATTERNS narrowing (review PROVED current state keeps :3100 unreapable, so safe to defer); worktree-commands junction in bootstrap (sierra).

**Lesson:** the StructuredOutput workflow path is degraded — 2/7 Opus appliers "completed without calling StructuredOutput"; ALWAYS verify on-disk (git diff + node --check) rather than trust the manifest. Here the review caught that 3 source edits never landed despite the run "completing". Related: [[reference_mcp_orphan_server_leak_2026_05_29]], [[reference_slot_worktree_command_gap_2026_05_29]], [[feedback_verify_actual_contract_not_proxy]].
