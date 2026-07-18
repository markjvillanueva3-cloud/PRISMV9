# U-DOCKER-HOOK-BROKER — handed off to claude-cee63f1f

**From:** claude-99eca613 (forge-rgs-pipeline-r lane)
**To:** claude-cee63f1f (obsidian / cli-settings lane — owns hook + memory infrastructure)
**Date:** 2026-05-09
**Origin:** /forge6 hook-optimization investigation (user constraint: "I don't care about token cost, just the memory")

## Why this lane owns it

claude-cee63f1f has been the de-facto hook-infrastructure owner across recent chats — recall-counter-track.mjs, wiki-link-suggest.mjs, memory-mirror-to-vault.mjs, settings.json edits. The Docker hook-broker is the natural next step in that lane.

## Constraint clarification

User explicitly said: **memory only, not tokens.** So no Ollama-compressor work; pure RAM-relief plan.

## Pain we are fixing

Chronic xmalloc errors and stop-hook bash OOMs across all 6 concurrent chats. Root cause: every PreToolUse / PostToolUse / UserPromptSubmit / Stop event spawns N node subprocesses × 6 chats. Bash itself runs out of heap before the hooks finish. 25+ new hookify.*.local.md rules added in the last week made this worse.

## 4-tier Docker plan (memory-only, ranked by RAM relief)

### Tier 1 — Hook-broker daemon (THIS UNIT)

One persistent container `prism-hooks` listening on `localhost:9876`. Loads every `.claude/hooks/*.mjs` once at startup, holds them warm. Each `.mjs` file gets rewritten as a ~10-line stub that POSTs to the broker with stdin payload, returns the broker's JSON response. No more bash → portable-node → mjs cold-start tree per event.

### Tier 2 — MCP server consolidation
One `prism-mcp` container on port 3100 shared by all chats. Replaces N×in-process MCP servers.

### Tier 3 — Agent isolation containers
Subagents run in containers with `--memory=512m` and overlayfs (read-only base = canonical repo, thin writable layer per agent). Kills the agent-* worktree leakage that's holding ~12K duplicate engine files in OS FS cache.

### Tier 4 — TSserver pen
One TS LSP container per worktree. OS-level lifetime tracking. Replaces the chronic zombie-tsserver class that 02-kill-zombie-tsservers.ps1 keeps fighting.

## Tier 1 build spec (do this first; it's the unblocker)

### Files to create

```
docker-compose.yml                      (root)
docker/hook-broker/Dockerfile
docker/hook-broker/server.mjs           (HTTP server, loads all .claude/hooks/*.mjs)
.claude/hooks/_rpc-shim.mjs             (the 10-line POST stub template)
scripts/migrate-hooks-to-rpc.mjs        (rewrites every .claude/hooks/*.mjs to call _rpc-shim)
```

### Broker server.mjs contract

- Read every `.claude/hooks/*.mjs` at startup, dynamic-import them, cache module exports.
- HTTP route `POST /hook/:name` — body is the stdin payload the harness would normally pipe to the hook. Response is the JSON the hook would normally print to stdout (with `continue`, `additionalContext`, `systemMessage`, `decision`, etc).
- Health route `GET /healthz` — returns 200 when all hooks loaded.
- Hot-reload route `POST /reload` — picks up edits to `.claude/hooks/*.mjs` without restart.
- Concurrency: serve hooks in parallel (Node's event loop handles it; no need for worker threads unless a hook is genuinely CPU-bound).

### Hook stub template (`_rpc-shim.mjs`)

```js
import { request } from "node:http";
const stdin = await new Response(process.stdin).text();
const name = process.argv[2]; // hook filename without .mjs
const req = request({ host: "127.0.0.1", port: 9876, path: `/hook/${name}`, method: "POST" }, (res) => {
  let body = ""; res.on("data", (c) => body += c);
  res.on("end", () => { process.stdout.write(body); process.exit(res.statusCode === 200 ? 0 : 1); });
});
req.on("error", async () => {
  // Broker down — fall back to inline import (zero-rollback safety)
  const mod = await import(`./${name}.original.mjs`);
  const result = await mod.default(stdin);
  process.stdout.write(JSON.stringify(result)); process.exit(0);
});
req.write(stdin); req.end();
```

### Migration script (`migrate-hooks-to-rpc.mjs`)

For every `.claude/hooks/*.mjs`:
1. Rename to `<name>.original.mjs` (preserved for fallback)
2. Write a new `<name>.mjs` that's just `import "./_rpc-shim.mjs";` with the hook's name as argv

Reversible: a single git revert restores all hooks.

### Verification gates

- `docker compose up prism-hooks` → broker comes up healthy in <5s
- `curl localhost:9876/healthz` returns 200 with hook count matching `ls .claude/hooks/*.original.mjs | wc -l`
- Run a manual `echo '{}' | node .claude/hooks/duplication-hard-block.mjs` — output must match pre-migration output
- Memory check: `Get-Process node | sort WS -desc | select -first 10` — broker holds steady ~80-150MB; per-event spawns should drop to ~zero

### Rollback

`git revert <commit>` restores the original hook files. Broker can keep running or be stopped — no data loss either way.

## Acceptance criteria

- [ ] All 50+ `.claude/hooks/*.mjs` migrated to RPC stubs
- [ ] Broker serves 1000 sequential hook events without leaking memory (smoke test in `docker/hook-broker/__tests__/`)
- [ ] Bash xmalloc errors disappear from `.claude/cache/stop-bg-logs/` after 24h soak
- [ ] No regression in any hook's existing behavior (output bytes match pre-migration on a sampled set)

## Out of scope for this unit

- Tiers 2-4 (MCP consolidation, agent containers, TSserver pen) — separate units after Tier 1 proves stable
- Ollama compressor — user excluded token-cost work
- Hookify rule deduplication — claude-0413eca6 already has audit-hook-duplicates.mjs and dedupe-cross-file-hooks.mjs claimed; coordinate, do not duplicate

## Coordination

- Lane: claude-cee63f1f
- Worktree: prefer creating `H:/prism-docker-broker/` via `git worktree add ../prism-docker-broker -b work/docker-broker` to keep this isolated from the obsidian/cli-settings work
- Chat-bus claim: file claims for `docker-compose.yml`, `docker/hook-broker/**`, `.claude/hooks/**` before edits

## Origin context

This was unit 1 of a /forge6 investigation into hook utilization. The investigation hit context-cap immediately on session resume (19M tokens at first prompt), confirming the problem at a meta level — the hook stack is now too expensive even to scout. claude-99eca613's handoff at `state/shared/handoffs/HANDOFF-claude-99eca613-forge-rgs-pipeline-r.md` has the full investigation plan deferred to a cold session.
