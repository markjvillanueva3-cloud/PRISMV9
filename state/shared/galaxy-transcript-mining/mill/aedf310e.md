# mill session aedf310e (2026-06-24, 17.4MB, spine 166KB, 2 slice(s), model gpt-oss:20b)

**SHIPPED**  
- Octopus local‑only mode (`2d6060c041`, `9e73ea428b`) + `/octopus-local` skill (`0085d44e74`).  
- Commit‑reservation wiki lesson & doctrine guard (`385c5972c0`).  
- Raw‑graph‑parse regression lock (`1ffd8c2299`) + CLI lint (`d777e57aa6`).  
- PreToolUse(Bash) guard commit (`0c0f7f7bfc`).  
- dead‑pixel‑guard fix (`42bf1c598c`).  
- Guard scope expansion (`cb09c71d45`).  
- Scratch/.tmp & symlink exclusion (`d816c76a11`).  
- knowledgeDispatcher raw‑parse replacement (`46ad816923`).  
- Worktree‑root resolution for slot isolation (`567130d5fe`).

**DECISIONS**  
- Adopt local‑only octopus mode to cut cloud voice costs.  
- Use PreToolUse(Bash) as sole commit gate; no `[MAIN-FORCE]` bypass.  
- Expand guard scope beyond `scripts/`.  
- Employ cap‑safe readers (`readGraphStreaming`, `countGraphArrayStreaming`) + size gate to avoid V8 string‑cap OOMs.  
- Exclude scratch/symlink files to eliminate false positives.  
- Include worktree root resolution for slot isolation.

**OPERATOR DIRECTIVES**  
- Keep hardening; schedule sidecar shard build in next GREEN session.  
- Re‑register degraded tasks (`Conhost Janitor`, `OCR Training Loop`) via PowerShell.  
- Arm account‑switch before 5 h limit:  
  ```
  node scripts/capture-claude-credentials.mjs <acct>
  node scripts/arm-account-switch.mjs --auto
  ```  
- Restart MCP server to apply knowledgeDispatcher fix.  
- Clear stale `VITEST_REPORT.json` (`npx vitest run …`).  

**FINDINGS/BUGS**  
- Portable‑node heap ceiling 384 MB on Windows; raising triggers MCP over‑commit crash.  
- Raw‑graph‑parse guard false positive fixed by excluding loop‑var names.  
- Git lock contention handled by `commit-coordinator.mjs`.  
- No active bug in octopus dispatch after adding `localOnlyOverrides`.  
- Live landmine: dead‑pixel‑guard raw parse 875 MB graph → silent crash.  
- Live landmine: knowledgeDispatcher raw parse same graph → silent `exists:false`.  
- Silent data loss: peer deleted machine‑handbook files; restored from HEAD.  
- Stale test report gate (`stop_on_failing_tests`) blocks all commits.

**DOMAIN SPECIFICS**  
- Engines/dispatchers: `octopus-dispatch.mjs`, `dispatchOctopus`, `octopus-with-hermes-rag.mjs`, `knowledgeDispatcher.ts`, `WeeklySynthesisEngine.ts`.  
- Actions/skills: `/octopus-local` skill, raw‑graph‑parse guard CLI, PreToolUse(Bash) hook.  
- Metrics/paths: Master‑index sidecar size 266 MB; heap ceiling 151 MB (slot claim); V8 string cap 512 MiB.  
- Systems: PRISM slot‑claim wrapper (`chat-slots.mjs`), system‑viz query pipeline, Obsidian vault integration.

**TOOLS USED**  
- PRISM helpers: `chat-slots.mjs`, `slot-bind-enforce.mjs`.  
- Scripts: `raw-graph-parse-guard.mjs`, `ensure-heap-floor.mjs`, `commit-coordinator.mjs`, `readGraphStreaming`, `countGraphArrayStreaming`, `capture-claude-credentials.mjs`, `arm-account-switch.mjs`.  
- CLI tools: `.claude/bin/portable-node`, Git hooks, PowerShell.

**OPEN THREADS**  
- Master-index sidecar shard build (GREEN session).  
- Wire raw‑graph‑parse guard into pre‑commit hooks across all slot worktrees.  
- Re‑register degraded scheduled tasks & arm account-switch before next session limit.  
- Resolve stale `VITEST_REPORT.json` to clear `stop_on_failing_tests`.  
- Final write‑side guard for raw‑graph‑parse pending.  
- Continue landmine hunt in remaining file types/dirs.
