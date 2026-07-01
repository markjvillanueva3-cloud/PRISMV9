# ai-training session aedf310e (2026-06-24, 17.4MB, spine 166KB, 2 slice(s), model gpt-oss:20b)

**SHIPPED**  
- Octopus local‑only mode (`2d6060c041`, `9e73ea428b`) – $0 consensus, ≥2‑voice gate.  
- `/octopus-local` skill (`0085d44e74`).  
- Commit‑reservation wiki lesson & doctrine guard (`385c5972c0`).  
- Raw‑graph‑parse regression lock (`1ffd8c2299`).  
- Guard CLI lint (`d777e57aa6`).  
- Wired fleet‑wide Bash guard to block raw JSON.parse of merged graph on every commit (`0c0f7f7bfc`).  
- Fixed unwired dead‑pixel‑guard (875 MB parse) with cap‑safe reader + size gate (`42bf1c598c`).  
- Broadened guard scope recursively to `.claude/hooks`, `.claude/helpers`, `mcp-server/scripts` (`cb09c71d45`).  
- Added scratch/symlink skip in scanner; prevented cross‑slot false blocks (`d816c76a11`).  
- Replaced raw parse in `knowledgeDispatcher.ts` with `countGraphArrayStreaming`; build & tsc clean (`46ad816923`).  
- Updated precommit hook to resolve commit’s worktree root for slot‑specific scanning (`567130d5fe`).  

**DECISIONS**  
- Guard architecture: PreToolUse‑Bash hook, fail‑open, no `[MAIN-FORCE]` bypass; string‑cap safety on every commit.  
- Scope expansion: recursive scan of all script directories to catch landmines beyond `scripts/`.  
- Cap‑safe readers: use `readGraphStreaming` / `countGraphArrayStreaming` with size gate instead of raw JSON.parse.  
- Worktree awareness: hook now scans the commit’s own tree, catching local violations that shared‑tree scan misses.  
- Do not build master‑index sidecar shard now; session limits and YELLOW context require GREEN session.  
- Wire guard CLI into pre‑commit in next session.  
- Keep hardening units small, safe, fully tested before committing.  

**OPERATOR DIRECTIVES**  
- Re‑register degraded scheduled tasks (Conhost Janitor, OCR Training Loop, Slot Worktree Migration Status, System Awareness Freshness) via elevated PowerShell.  
- Arm account‑switch (`capture‑claude‑credentials.mjs`, `arm-account-switch.mjs`) before next 5 h window / session limit.  
- Start fresh or `/compact` session and issue “keep going” to resume pre‑commit wiring + sidecar shard work.  
- Restart MCP server to activate committed `knowledgeDispatcher` fix.  
- Diagnose & fix stale `VITEST_REPORT.json` gate (run `npx vitest run --reporter=json --outputFile=data/state/VITEST_REPORT.json`).  

**FINDINGS / BUGS**  
- Master‑index sidecar (266 MB) exceeds reader ceiling (151 MB); intentional due to Windows commit‑reservation limits.  
- Raw‑graph‑parse guard now passes all fleet scans; no raw 875 MB JSON.parse remains.  
- Unwired dead‑pixel‑guard caused silent OOM on 875 MB graph.  
- Raw parse in `knowledgeDispatcher.ts` silently returned `exists:false`.  
- Machine‑handbook files deleted by peer; restored from HEAD.  
- Stale vitest report gate blocking all commits (42+ days old).  

**DOMAIN SPECIFICS**  
- Sierra slot, system‑viz, master graph, obsidian vault, hermes agents.  
- Octopus consensus engine (local‑only mode).  
- Guard CLI lint, commit‑reservation lesson.  
- Raw‑graph‑parse guard: PreToolUse‑Bash hook, settings.json entry, scanner lib recursive roots.  
- Cap‑safe readers: `readGraphStreaming`, `countGraphArrayStreaming` in `scripts/lib/graph-io.mjs`.  
- Worktree root resolution: `resolveRepoRoot` used by precommit hook.  
- Scratch/symlink skip logic added to scanner and guard.  

**TOOLS USED**  
- `chat-slots.mjs` (slot claiming), `portable-node` (hook execution).  
- Scripts: `ensure-heap-floor.mjs`, `raw-graph-parse-guard.mjs`, `octopus-dispatch.mjs`, `/octopus-local` skill, `commit‑coordinator.mjs`, `slot-commit-bypass.mjs`.  
- Git hooks (pre‑commit), `capture‑claude‑credentials.mjs`, `arm-account-switch.mjs`.  
- CronCreate / CronDelete; Node scripts: `ask‑ollama.mjs`, `ask‑hermes.mjs`.  
- Settings.json for hook configuration.  
- Scanner lib, precommit hook, build scripts (tsc, esbuild).  

**OPEN THREADS**  
- Implement master-index sidecar shard in GREEN session once write guard ready.  
- Wire guard CLI into pre‑commit hook across all worktrees.  
- Re‑register degraded scheduled tasks.  
- Implement write-side guard using `writeGraphStreamingAtomic`.  
- Resolve stale vitest report gate (verify config, run full suite).  
- Restart MCP server to deploy `knowledgeDispatcher` fix.
