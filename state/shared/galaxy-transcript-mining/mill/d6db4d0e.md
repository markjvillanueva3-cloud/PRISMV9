# mill session d6db4d0e (2026-06-17, 11.8MB, spine 87KB, 1 slice(s), model gpt-oss:20b)

**SHIPPED (slot /bravo)**  
- `U-ZBL-GIT‑GROUNDED‑SHIPPED` – zulu build‑loop pointer now uses git reality for shipped detection.  
- `U-ZBL‑REVERT‑PRECISE` – scrutiny‑driven revert of a buggy “revert” commit detector.  
- `MCP‑CLIENT‑ENFORCE‑MS1` – PreToolUse hard‑gate that blocks stale MCP bridges and auto‑broadcasts `/mcp`.  
- `U-DRAIN‑CLEAN‑EXIT` – consensus‑drain now exits cleanly (no orphaned node processes).  
- `U-DRAIN‑PROBE‑IS‑RIGHT` – documentation of single‑voter consensus caused by GPU contention; dual‑pin approach discarded.  

**DECISIONS**  
- Use a PreToolUse hard‑gate for MCP bridge enforcement, with fail‑open semantics and explicit deny contract.  
- Ground shipped‑detection in git history (`U-ZBL-C<n>` commits) instead of hand‑maintained prose to avoid drift.  
- Introduce an exclusive file lock around the consensus‑drain queue read/modify/write; run the long Ollama work outside the lock for serialisation.  
- Force a clean exit after `main()` resolves in the drain to eliminate hanging orphan processes.  
- Set `OLLAMA_NUM_PARALLEL=4` and enable Ultimate Performance power plan; keep context length at 131 k for Hermes.  

**OPERATOR DIRECTIVES**  
- Reorientate to most recent sessions and continue engineered loops, harnesses, crons using Hermes agents, Obsidian vault, and Ollama offloading optimally.  
- Remove the iteration cap permanently for all galaxies; update system settings accordingly.  
- Accelerate Prism OS AI‑system learning (consensus drain).  
- Keep looping autonomously; pick highest‑value bounded unit; defer any credential‑gated work.  

**FINDINGS/BUGS**  
- Staging‑harm: hard‑block on fleet bridge count caused all chats to lose staging commits. Fixed by gating only on per‑chat sentinel and making the gate advisory for fleet counts.  
- Consensus drain race: missing lockfile allowed concurrent drains to overwrite each other; fixed with `exclusive-file-lock.mjs`.  
- Drain hang: Ollama keep‑alive sockets kept event loop alive → exit 255; solved by adding `process.exit(0)` after successful write.  
- Dual‑pin consensus attempt failed due to GPU contention (gpt‑oss 20b timed out); reverted to probe‑based panel selection.  

**DOMAIN SPECIFICS**  
- **MCP architecture**: harness → per‑chat stdio bridge (`mcp-http-bridge.mjs`) → shared HTTP daemon (`dist/index.js` on :3100).  
- **PreToolUse hook contract**: `{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"deny"}}`.  
- **Lane‑guard**: cd‑aware `effectiveCwdFromCmd`; `[MAIN]` prefix satisfies worktree route.  
- **Zulu build loop**: driver (`zulu-build-loop.mjs`) + pointer (`state/shared/zulu-build-loop-next.json`).  
- **Consensus drain**: queue file (`consensus-queue.jsonl`), decisions file, lockfile via `exclusive-file-lock.mjs`.  
- **Octopus engine**: `MultiModelConsensusEngine.ts`; panel resolution uses GPU‑probe to filter models.  

**TOOLS USED**  
- PRISM helpers: `/checkin-bravo`, `chat-slots.mjs`, `audit-roadmap-drift.mjs`.  
- Hooks/scripts: `mcp-bridge-enforce-pretool.mjs`, `exclusive-file-lock.mjs`, `consensus-queue-drain.mjs`, `stop-consensus-drain.mjs`.  
- Skills: PreToolUse hard‑gate, lockfile wrapper, clean‑exit logic.  

**OPEN THREADS**  
- **B1 – Hermes 5h‑quota/account auto‑switch** (credential‑gated; operator must configure).  
- **Idle‑window GPU scheduling for dual‑pin consensus** (deferred; requires dist rebuild and careful GPU utilisation).  
- **Full loop‑cap removal verified, but ensure all galaxies honour the new default target** (already committed).  

These items capture everything needed to resume work in this galaxy.
