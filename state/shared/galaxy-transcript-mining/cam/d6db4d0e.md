# cam session d6db4d0e (2026-06-17, 11.8MB, spine 87KB, 1 slice(s), model gpt-oss:20b)

**SHIPPED**  
- `U-ZBL-GIT‑GROUNDED‑SHIPPED` – git‑grounded shipped‑detection for the Zulu build queue (replaces prose‑drift).  
- `U-ZBL‑REVERT‑PRECISE` – scrutiny‑approved revert of a buggy “Revert” commit matcher.  
- `U-DRAIN‑CLEAN‑EXIT` – consensus‑drain now exits cleanly, eliminating orphaned Stop‑hook processes.  
- `U-DRAIN‑PROBE‑IS‑RIGHT` – documentation confirming probe‑based single‑voter behavior and the failed dual‑pin experiment.  
- MCP‑CLIENT‑ENFORCE‑MS1 (PreToolUse hard‑gate for connection enforcement + staging‑harm fix).  

**DECISIONS**  
- Use a PreToolUse hard‑gate to enforce chat connectivity; block on per‑chat sentinel only, not fleet‑wide bridge count → prevents staging‑harm.  
- Ground shipped detection in git history (`U-ZBL-GIT‑GROUNDED‑SHIPPED`) instead of hand‑maintained prose → eliminates stale pointer bugs.  
- Wrap consensus‑drain claim under `exclusive-file-lock.mjs` and run the heavy Ollama work outside the lock → serializes all drains, removes race & orphan leaks.  
- Revert dual‑pin approach after GPU‑contention diagnosis; keep probe‑based narrowing (single‑voter) as correct behavior until a safe idle‑window scheduler is built.  
- Set `OLLAMA_NUM_PARALLEL=4` and switch to Ultimate Performance power plan → cuts VRAM spike and removes CPU clock‑gating latency.  

**OPERATOR DIRECTIVES**  
- Reorientate to most recent sessions; continue engineered loops, harnesses, crons using Hermes agents, Obsidian vault, and Ollama offloading optimally.  
- Remove the iteration cap permanently for all galaxies.  
- Accelerate Prism OS AI‑system learning if possible (e.g., consensus drain cron).  
- Keep looping autonomously; “your pick” – select highest‑value bounded units, defer credential‑gated work.  
- Immediate fix of staging‑harm caused by hard‑block on fleet‑wide bridge count.  

**FINDINGS/BUGS**  
- Staging‑harm: hard‑block on stale fleet‑wide bridge count evicted `git add/commit` across all chats.  
- Consensus drain race: missing lockfile → concurrent drains clobber queue, orphan processes.  
- Dual‑pin experiment failed due to GPU contention; gpt‑oss:20b timed out under 8‑chat load.  
- Single‑voter consensus caused by probe narrowing (free‑VRAM check).  
- Commit‑memory hangs traced to stop‑hook fork‑storm (102 hooks × 384 MB).  
- OLLAMA_NUM_PARALLEL=8 caused ~88 GB VRAM spike; NUM_PARALLEL=4 mitigates.  

**DOMAIN SPECIFICS**  
- **Engines/Actions**: `mcp-http-bridge.mjs` (per‑chat stdio bridge), `singleton-service-guard.mjs`, `mcp-server-supervisor.mjs`, `PreToolUse` hook contract, `exclusive-file-lock.mjs`, `zulu-build-loop.mjs`, `consensus-queue-drain.mjs`, `stop-consensus-drain.mjs`.  
- **Dispatchers**: chat‑slot claim (`chat-slots.mjs`), slot‑worktree commit guard (cd‑aware lane‑guard).  
- **Metrics/Paths**: `state/shared/zulu-build-loop-next.json`, `state/shared/loop-state/loop‑<sid>.json`, `state/shared/consensus-queue.jsonl`.  
- **Unique to this galaxy**: Hermes agent auto‑switch (B1), Octopus multi‑model consensus, Obsidian vault integration for wiki gates.  

**TOOLS USED**  
- PRISM hooks: `mcp-bridge-enforce-pretool.mjs`, `exclusive-file-lock.mjs`.  
- Scripts/skills: `chat-slots.mjs`, `checkin.md` pipeline, `zulu-build-loop.mjs`, `consensus-queue-drain.mjs`, `stop-consensus-drain.mjs`.  
- Settings scripts: `setx OLLAMA_NUM_PARALLEL 4`, `powercfg /setactive <GUID>`.  
- Git helpers: `git -C H:/prism rev‑parse --abbrev-ref HEAD`, lane‑guard commit workflow.  

**OPEN THREADS**  
1. **B1 – Hermes 5h‑quota/account auto‑switch** (credential‑gated, operator‑only).  
2. **Idle‑window GPU scheduler** to reliably run dual‑pin consensus without timeouts.  
3. **AI‑learning acceleration cron**: schedule recurring `consensus-queue-drain` with lockfile and small batch size.  
4. **Persisted settings**: ensure OLLAMA env vars and power plan survive restarts (currently set in this session only).  
5. **Further optimization of stop‑hook heap usage** (`PRISM_HOOK_HEAP_MB`) to reduce commit‑memory hangs.
