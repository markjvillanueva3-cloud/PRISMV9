# india session aedf310e (2026-06-24, 17.4MB, spine 166KB, 2 slice(s), model gpt-oss:20b)

**SHIPPED**  
- Octopus local‑only mode (`localOnly` flag in `octopus-dispatch.mjs`) – commits `2d6060c041`, `9e73ea428b`.  
- `/octopus-local` skill (one‑command free invoke) – commit `0085d44e74`.  
- Commit‑reservation wiki lesson & doctrine pointer – commit `385c5972c0`.  
- Raw‑graph‑parse regression lock (prevents `JSON.parse(readFileSync(..., "utf8"))` on 875 MB graph) – commit `1ffd8c2299`.  
- Guard CLI (`raw-graph-parse-guard.mjs`) – commit d777e57aa6.  
- Wired PreToolUse‑Bash commit gate to fleet‑wide hook (block raw JSON.parse of merged graph) – commit `0c0f7f7bfc`.  
- Fixed dead‑pixel‑guard landmine – replaced string‑cap parse with cap‑safe `readGraphStreaming` + size gate – commit `42bf1c598c`.  
- Broadened guard scope recursively to `scripts/`, `.claude/hooks`, `.claude/helpers`, `mcp-server/scripts`; single‑sourced roots – commit `cb09c71d45`.  
- Added scratch/symlink safe scan to avoid false positives from temp files – commit `d816c76a11`.  
- Fixed knowledgeDispatcher raw‑parse bug – swapped to `countGraphArrayStreaming` – commit `46ad816923`.  
- Updated precommit guard to resolve `REPO_ROOT` for worktree commits – commit `567130d5fe`.

**DECISIONS**  
- Added `localOnlyOverrides()` to octopus dispatch; disables all cloud voices, uses Ollama Blackwell panel (`gpt‑oss:20b`, `qwen2.5-coder:32b`).  
- Chose not to raise hook‑heap (Windows COMMIT reservation would trigger MCP‑FLEET‑CAPACITY crash).  
- Sidecar shard is a load‑bearing change → deferred to GREEN session.  
- Wire guard CLI into pre‑commit later; keep current hardening units small and safe in YELLOW.  
- Adopted `ensureHeapFloor` pattern only for daemon/spawn contexts, not for concurrent hooks.  
- Guard design: use PreToolUse‑Bash hook with fail‑open, kill‑switch; block on raw JSON.parse of merged graph.  
- Scope expansion: recursive scan across all script directories (`scripts/`, `.claude/hooks`, `.claude/helpers`, `mcp-server/scripts`) to catch landmines beyond `scripts/`.  
- Scratch file handling: skip `.tmp` and symlinks to avoid false positives.  
- Cap‑safe readers: replace string‑cap parsing with `readGraphStreaming` / `countGraphArrayStreaming` for large graphs.

**OPERATOR DIRECTIVES**  
- Re‑register degraded scheduled tasks: `Conhost Janitor`, `OCR Training Loop`, `Slot Worktree Migration Status`, `System Awareness Freshness`.  
- Arm account‑switch before the 5 h session limit fires (`node scripts/arm-account-switch.mjs --auto`).  
- Capture Claude credentials (`node scripts/capture-claude-credentials.mjs account-N`).  
- Start a fresh/compacted session and issue “keep going” to resume guard wiring & sidecar shard.

**FINDINGS / BUGS**  
- Portable‑node defers to inherited `NODE_OPTIONS=--max-old-space-size=384`, causing 266 MB sidecar rejection → cheap‑search falls back to legacy path.  
- Raw‑graph‑parse guard false positive on loop‑var reuse fixed by excluding reused names.  
- Existing lock‑retry helper (`commit-coordinator.mjs`) already handles `index.lock` contention – no new helper needed.  
- Sidecar shard required for full coverage; must be built in GREEN session to avoid over‑commit crash.  
- Dead‑pixel‑guard raw parse of 875 MB graph caused silent soft‑skip; fixed.  
- knowledgeDispatcher raw parse bug silently reported `exists:false`; fixed.  
- Machine‑handbook files deleted in working tree; restored from HEAD.  
- Stale `VITEST_REPORT.json` gate blocking commits; report not refreshed due to wrong runner.

**AI‑SYSTEM SPECIFICS**  
- Octopus MultiModelConsensusEngine (localOnly mode disables Claude/Grok/Gemini/Codex/DeepSeek/GLM, uses Ollama Blackwell panel `gpt‑oss:20b`, `qwen2.5-coder:32b`).  
- Raw‑graph‑parse guard ensures no 512 MiB string‑cap violation on V8; passes 13/13 fleet‑lock tests (guard tests 18/18 passed, raw‑graph‑parse guard 0 violations).  
- Sidecar index size ≈266 MB > 151 MB ceiling (384 MB heap ×0.35); fallback to architecture‑graph path.  
- PreToolUse‑Bash hook: blocks JSON output, fail‑open on error; fleet‑wide Bash hook guarding merged graph substrate.  
- Scanner lib: recursive scan roots (`scripts/`, `.claude/hooks`, `.claude/helpers`, `mcp-server/scripts`), single‑sourced.  
- Graph I/O helpers: `readGraphStreaming`, `countGraphArrayStreaming`.  
- Metrics: guard tests 18/18 passed; scanner tests 19/19 after expansion.

**OPEN THREADS**  
- Wire `raw-graph-parse-guard` CLI into pre‑commit hook (fleet‑wide).  
- Implement sidecar shard (shard index under 151 MB; load‑bearing change – requires GREEN session).  
- Arm account‑switch before next session limit.  
- Re‑register degraded scheduled tasks (`Conhost Janitor`, `OCR Training Loop`, `Slot Worktree Migration Status`, `System Awareness Freshness`).  
- Write‑side guard for raw‑graph‑parse (planned).  
- Fix stale `VITEST_REPORT.json` refresh command.  
- Restart MCP server to apply knowledgeDispatcher fix.
