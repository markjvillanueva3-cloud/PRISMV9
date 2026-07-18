---
name: reference_node_heap_384_cap_windows_commit_2026_06_25
description: "The fleet NODE_OPTIONS=384 cap is DELIBERATE Windows commit-reservation protection -- do NOT raise it globally (2026-06-25, slot:sierra)"
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.664Z
aliases: reference_node_heap_384_cap_windows_commit_2026_06_25
---


**The "432MB node heap cap" is DELIBERATE and must NOT be raised globally (2026-06-25, slot:sierra).**

Source: `H:/.claude/bin/portable-node:45` (+ `.cmd:22`) sets `NODE_OPTIONS="--max-old-space-size=${PRISM_HOOK_HEAP_MB:-384}"` (only when NODE_OPTIONS is unset). `which node` in the Bash tool resolves to this wrapper, so EVERY node call in the Bash tool inherits the 384MB cap (heap_size_limit ~432MB). It is NOT a node default and NOT a Windows env var (PowerShell shows NODE_OPTIONS empty at process/user/machine scope -- the wrapper injects it).

**WHY 384 is deliberate (MCP-FLEET-CAPACITY-MS0, 2026-06-08) -- DO NOT "fix" it by raising:**
On **Windows, `--max-old-space-size` is a COMMIT RESERVATION** (counts against the system commit ceiling even when unused -- unlike Linux's lazy mmap). A prior version set a BLANKET 4GB on every hook; with ~84 concurrent hook procs (6+ chats x ~30 Stop hooks) that reserved ~210GB commit charge against a 227GB ceiling -> at >=96% commit Windows refuses new process spawns (ERROR_NO_SYSTEM_RESOURCES 0x800710E0) -> the MCP supervisor task can't launch -> false "MCP Server failing". The 384 cap fixed that. A hook uses ~50-100MB; 384 is generous; a rare heavy hook OOMs LOUD (an intended outlier signal, never silent).

**Therefore: raising the global cap (NODE_OPTIONS / PRISM_HOOK_HEAP_MB) re-introduces the commit-storm fleet-break. It is NET-HARMFUL, not a Blackwell "no hard caps" win.** The 136GB RAM is not the binding constraint -- the Windows COMMIT ceiling is.

**The CORRECT pattern for a heavy script (the wrapper comment prescribes it):** opt into a larger heap via the script's OWN flag -- a one-shot self-respawn with `--max-old-space-size=<generous>` as a CLI arg (overrides the inherited NODE_OPTIONS=384 in the child). This reserves the big heap ONLY for that rare, transient, single heavy invocation -- NOT the concurrent hook swarm. Implemented in `scripts/lib/viz-query-heap-reexec.mjs` (`respawnWithHeap` + `planHeapRespawn`), applied to system-viz-query (16384) + system-viz-node-dispatch (4096). See [[reference_sierra_viz_query_oom_heap_respawn_2026_06_25]].

**Knob:** `PRISM_HOOK_HEAP_MB` raises the hook default if a class of hooks genuinely needs more -- but weigh it against the per-process Windows commit reservation x concurrent-hook-count. Prefer per-script respawn over a global bump.

**Refinement note:** the per-script respawn values (16384 for viz-query) are commit reservations too -- right-size them to the real need (a 644MB graph materializes to ~2-4GB, so 16384 is generous-but-wasteful; transient + rare so acceptable). Lower if commit pressure ever surfaces.

Lesson: an env var / config that LOOKS like a missing optimization (a low heap cap) can be a deliberate, hard-won fix -- READ its rationale (git history / wrapper comments / file-history) before "lifting" it. Sibling of [[feedback_read_full_content_not_titles]].
