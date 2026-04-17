# AGI-INFRA Phase A — Hook Wiring Patch

Hook scripts created in `.claude/hooks/` by the AGI-INFRA Phase A work.
This doc describes the `settings.json` additions needed to activate them.

**Coordination note:** The `.claude/settings.json` file is being modified
concurrently by multiple chats (Universal skills/scripts/hooks roadmap,
milling consolidation, Wire EDM AGI, Lathe AGI, Post-processor AGI).
Apply this patch only after confirming the target file is stable, or fold
it into the next Universal roadmap batch merge.

## Additions

Add these two entries to `.claude/settings.json` under `hooks.PreToolUse`
(append to the existing array — do not replace):

```json
{
  "matcher": "^Read$",
  "hooks": [
    {
      "type": "command",
      "command": "node H:/prism/.claude/hooks/file-read-cache.mjs",
      "timeout": 1500,
      "continueOnError": true
    }
  ]
},
{
  "matcher": "^Grep$",
  "hooks": [
    {
      "type": "command",
      "command": "node H:/prism/.claude/hooks/grep-result-cache.mjs",
      "timeout": 1500,
      "continueOnError": true
    }
  ]
}
```

## Why `continueOnError: true`

These hooks are token-efficiency optimizations, not safety gates. A crash
in the cache hook must not break normal tool use — always fall through.

## Why separate matcher entries

Both hooks match a single tool name each. Keeping them as separate array
entries (rather than combining with `^(Read|Grep)$`) lets the Universal
roadmap chat reorder, disable, or replace one without touching the other.

## Cache location

Both hooks write to `H:/prism/.claude/cache/` (shared across worktrees):

- `file-read-cache.json` — TTL 2h, keyed by session+path+mtime+offset+limit
- `grep-result-cache.json` — TTL 5min, keyed by session+pattern+path+glob+type

The session_id component ensures concurrent chats never block each other's
reads or greps. Caches auto-prune expired entries on every invocation.

## Verification

Smoke test both hooks before wiring:

```bash
# FileReadCache — first call silent, second denies
echo '{"tool_name":"Read","tool_input":{"file_path":"H:/prism/mcp-server/package.json"},"session_id":"test"}' \
  | node .claude/hooks/file-read-cache.mjs
echo '{"tool_name":"Read","tool_input":{"file_path":"H:/prism/mcp-server/package.json"},"session_id":"test"}' \
  | node .claude/hooks/file-read-cache.mjs

# GrepResultCache — first call silent, second denies
echo '{"tool_name":"Grep","tool_input":{"pattern":"foo","path":"src"},"session_id":"test"}' \
  | node .claude/hooks/grep-result-cache.mjs
echo '{"tool_name":"Grep","tool_input":{"pattern":"foo","path":"src"},"session_id":"test"}' \
  | node .claude/hooks/grep-result-cache.mjs
```

Expected: second call of each pair emits a JSON `permissionDecision: deny`.

## SessionStart wiring — Inventory refresh

Add under `hooks.SessionStart` (append to existing array):

```json
{
  "matcher": "*",
  "hooks": [
    {
      "type": "command",
      "command": "node H:/prism/.claude/hooks/inventory-refresh.mjs",
      "timeout": 3000,
      "continueOnError": true
    }
  ]
}
```

The refresh hook spawns the updater detached + unref'd, so the 3s timeout
only covers the launch step, not the inventory scan itself. 24h throttle
prevents spam across consecutive sessions.

## PreToolUse wiring — Bash result cache

Add under `hooks.PreToolUse` (append to existing array):

```json
{
  "matcher": "^Bash$",
  "hooks": [
    {
      "type": "command",
      "command": "node H:/prism/.claude/hooks/bash-result-cache.mjs",
      "timeout": 1500,
      "continueOnError": true
    }
  ]
}
```

Denies duplicate Bash calls within 3min for a narrow whitelist (read-only
git, ls, wc, du, stat, file, pwd, whoami, date). Any command containing
redirects, pipes, chaining, or a blocklisted primitive (rm/cp/mv/git add/
commit/push/pull/reset, npm, node, curl, wget, etc.) is passed through
silently without caching.

Cache: `H:/prism/.claude/cache/bash-result-cache.json` (session-keyed).

Smoke test:

```bash
echo '{"tool_name":"Bash","tool_input":{"command":"git log --oneline -5"},"session_id":"t"}' \
  | node .claude/hooks/bash-result-cache.mjs  # 1st: silent pass
echo '{"tool_name":"Bash","tool_input":{"command":"git log --oneline -5"},"session_id":"t"}' \
  | node .claude/hooks/bash-result-cache.mjs  # 2nd: deny
echo '{"tool_name":"Bash","tool_input":{"command":"git commit -m x"},"session_id":"t"}' \
  | node .claude/hooks/bash-result-cache.mjs  # side-effect: silent pass
```

## Stop wiring — Session cost summary

Add under `hooks.Stop` (append or create):

```json
{
  "matcher": "*",
  "hooks": [
    {
      "type": "command",
      "command": "node H:/prism/.claude/hooks/session-cost-summary.mjs",
      "timeout": 2000,
      "continueOnError": true
    }
  ]
}
```

Reads `hook-telemetry.jsonl` (written by all cache hooks + capability
reminder), filters to the current session, appends a summary entry to
`state/shared/TOKEN_USAGE_LOG.json` with per-hook deny/miss/fire counts
and a conservative bytes-saved estimate.

## UserPromptSubmit wiring — Capability reminder

Add under `hooks.UserPromptSubmit` (append to existing array — this sits
alongside the `ai-auto-command-router.mjs` entry, not replacing it):

```json
{
  "matcher": "*",
  "hooks": [
    {
      "type": "command",
      "command": "node H:/prism/.claude/hooks/capability-reminder.mjs",
      "timeout": 1500,
      "continueOnError": true
    }
  ]
}
```

The reminder hook matches the user's prompt text against trigger phrases in
`state/shared/CAPABILITY_INDEX.json` and injects `additionalContext` with
one-line hints. 10-min cooldown per entry per session prevents nag loops.
Cache at `H:/prism/.claude/cache/capability-reminder-cooldown.json`.

Smoke test:

```bash
# Matched trigger — expect additionalContext with hint
echo '{"prompt":"how many engines do we have","session_id":"cap-test"}' \
  | node .claude/hooks/capability-reminder.mjs

# Repeat within 10 min — expect silent (cooldown)
echo '{"prompt":"how many engines do we have","session_id":"cap-test"}' \
  | node .claude/hooks/capability-reminder.mjs

# Slash command — expect silent (skipped)
echo '{"prompt":"/dedup foo","session_id":"cap-test-2"}' \
  | node .claude/hooks/capability-reminder.mjs
```

## PreToolUse wiring — Git commit check-in

Add under `hooks.PreToolUse` (append to existing array):

```json
{
  "matcher": "^Bash$",
  "hooks": [
    {
      "type": "command",
      "command": "node H:/prism/.claude/hooks/git-commit-checkin.mjs",
      "timeout": 1500,
      "continueOnError": true
    }
  ]
}
```

On any `git commit` or `git push`, this hook:
1. Posts a `commit-intent [committing_at=<ISO>]: <ACTION> NOW at <clock>` entry
   to AGENT_CHAT.jsonl via `agent-coordination.mjs post` (detached subprocess)
2. Scans the last 50 chat entries for commit/push intent from other sessions
   within a 5 min window (30s = HOT OVERLAP)
3. Emits `permissionDecision: allow` with a coordination warning if overlap
   found — never blocks (git-anti-clobber handles hard serialization)

Smoke test:

```bash
echo '{"tool_name":"Bash","tool_input":{"command":"git commit -m test"},"session_id":"checkin-t"}' \
  | node .claude/hooks/git-commit-checkin.mjs
# Verify AGENT_CHAT.jsonl has a new commit-intent entry with committing_at=<ISO>
```

## UserPromptSubmit wiring — Periodic chat check-in

Add under `hooks.UserPromptSubmit` (append to existing array):

```json
{
  "hooks": [
    {
      "type": "command",
      "command": "node H:/prism/.claude/hooks/periodic-checkin.mjs",
      "timeout": 2000,
      "continueOnError": true
    }
  ]
}
```

Per-session cooldown at `.claude/cache/periodic-checkin-last.json`:
- First prompt in cooldown window (20 min default) → posts a `heartbeat`
  entry to AGENT_CHAT, then polls for unseen entries from other sessions,
  emits `additionalContext` with a poll summary if any are unseen.
- Subsequent prompts in the same window → silent (poll still consulted
  on every call via the detached post, but no duplicate heartbeat).
- Slash commands → silent skip.

Combined with `git-commit-checkin.mjs`, this gives 3-tier coordination:
1. Passive read of AGENT_CHAT on every prompt (existing
   `realtime-session-coordinator.mjs`)
2. Heartbeat post every ~20 min (new `periodic-checkin.mjs`)
3. Commit/push intent post with precise timestamp (new
   `git-commit-checkin.mjs`)

## Related

- AGI-INFRA-MS1: FileReadCache PreToolUse hook
- AGI-INFRA-MS4: GrepResultCache PreToolUse hook
- INV-AUTO-MS1: scripts/update-prism-inventory.mjs
- INV-AUTO-MS2: .claude/hooks/inventory-refresh.mjs (SessionStart)
- INV-AUTO-MS3: H:/.claude/commands/forge-audit.md preflight integration
- CAP-MS1: state/shared/CAPABILITY_INDEX.json (trigger→hint registry)
- CAP-MS2: .claude/hooks/capability-reminder.mjs (UserPromptSubmit)
- CAP-MS3: H:/.claude/commands/capabilities.md (manual discovery)
- CAP-MS4: PRISM-SELF-AWARENESS-DIRECTIVE.md capability-discovery section
- BASH-CACHE: .claude/hooks/bash-result-cache.mjs (PreToolUse)
- HOOK-TEL: shared hook-telemetry.jsonl + inline logTelemetry() in all 4 hooks
- SESS-COST: .claude/hooks/session-cost-summary.mjs (Stop) → TOKEN_USAGE_LOG.json
- CHK-COMMIT: .claude/hooks/git-commit-checkin.mjs (PreToolUse / ^Bash$)
- CHK-PERIODIC: .claude/hooks/periodic-checkin.mjs (UserPromptSubmit, 20min cooldown)
- Related infra (pre-existing): .claude/hooks/git-anti-clobber.mjs (GIT_LOCK.json serializer),
  .claude/helpers/agent-coordination.mjs (post/poll/summary API),
  .claude/helpers/realtime-session-coordinator.mjs (per-prompt passive read)
- Primary roadmap: `UNIVERSAL-SKILLS-SCRIPTS-HOOKS-PLAN-2026-04-15.md`
