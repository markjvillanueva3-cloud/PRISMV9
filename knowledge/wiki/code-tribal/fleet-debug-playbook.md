---
name: fleet-debug-playbook
category: code-tribal
domain: backend-dev
tags: [fleet, debug, stale-slot, ghost-process, lock-contention, prism-development, ai-development]
last_updated: 2026-05-18
---

# Fleet Debug Playbook — diagnosing the 13-chat fleet

PRISM's 13-chat fleet runs across 1-2 PCs. When things go wrong, the symptoms are non-obvious: stale slot bindings, ghost processes, lock contention, RAM exhaustion, scheduled-task silence. This playbook is the diagnostic checklist.

## Symptom 1 — "My slot moved to peer's name"

Chat resumed after /compact and the handoff says slot `charlie` but terminal-pin landed on `lima`. Cause: peer chat took `charlie` while THIS chat was crashed or compacting; terminal-pin claimed the next-available slot.

Diagnostic:
1. `node H:/prism/scripts/fleet-status.mjs` — who holds each slot now?
2. `node H:/prism/.claude/helpers/chat-slots.mjs find --chatId claude-XXXX` — was this chat ever bound?

Resolution:
- Live with `lima`: re-bind handoff via `/checkin --topic charlie-<scope>`
- Force-take `charlie` ONLY if peer is genuinely dead: `chat-slots.mjs claim --preferSlot charlie --force true --confirmRecent true`

The 2026-05-18 lima session hit this. The handoff filename retained `lima` (pinned) even after operator force-take attempts.

## Symptom 2 — "Bash commands hang or fail with `cygheap` errors"

`error: child_copy: cygheap read copy failed, 0x0..0x80000D4C0` on git operations. Cause: Cygwin fork edge case when memory pressure is high. Operation usually completes despite the warning.

Diagnostic:
1. `node scripts/fleet-memory-monitor.mjs --once --json` — system phys + commit %
2. Check `state/shared/fleet-memory-history.jsonl` for trend
3. Check `state/shared/.fleet-reaper-actions.jsonl` for recent reaps

Resolution:
- If commit > 92%: run `/fleet-reaper` to reap orphans, or wait for cron tick
- If single chat is the outlier: `/compact` on that chat
- Persistent: enable `PRISM_FLEET_REAPER_SERVICE_RESTART=1` (advisory; doesn't auto-restart Docker daemon, only wedged services)

## Symptom 3 — "Git index.lock exists but no git process running"

`fatal: Unable to create '.git/index.lock': File exists.` Cause: previous git command crashed mid-write; the lock wasn't released.

Diagnostic:
1. `ps -ef | grep git` (or PowerShell `Get-Process git`) — any live git?
2. `ls -la .git/index.lock` — owner + age?
3. `git-lock-sweeper.mjs` PreToolUse hook — did it run recently?

Resolution:
- No live git AND lock > 30s old: `rm -f .git/index.lock`
- Live git: wait for it to finish
- Recurring: investigate which chat keeps crashing mid-commit. Common cause: heredoc with embedded `git branch -D` literal triggers git-safety hook block.

The `git-lock-sweeper.mjs` `TOP_LOCKS` array covers `.git/index.lock` + `.git/objects/info/commit-graphs/commit-graph-chain.lock` (added 2026-05-18). Other paths still need manual sweep.

## Symptom 4 — "Scheduled task says 'Last Result: 0x0' but no telemetry"

Task is enabled, principal is correct, AtStartup + cadence triggers fire, but the JSONL telemetry file shows no recent entries. Cause: 90% of the time, a stamp-throttle file says "skip this run".

Diagnostic:
1. `find state/shared -name "*.stamp" -mmin -30` — recent stamps?
2. Read the script's throttle logic for the stamp path
3. Delete the stamp, fire task manually: `Start-ScheduledTask -TaskName "PRISM XXX"`

If still no telemetry: the script itself is failing silently. Run it directly outside the scheduled-task harness:

```
node H:/prism/scripts/<task-script>.mjs --once --verbose
```

## Symptom 5 — "Chat is slow to respond / context budget high"

Cause: context filling with hook injections, peer chat-bus posts, large pre-search results. Each UserPromptSubmit adds ~3-5k tokens of injected context.

Diagnostic:
1. Check `mcp-server/data/state/hook-fire-counts.jsonl` for which hooks fire most
2. Read `state/shared/CLAUDE-BRIEF.md` size (should be <100KB)
3. Check `state/shared/AGENT_CHAT.jsonl` recent volume

Resolution:
- High peer chat-bus volume: silence via `PRISM_CHAT_BUS_INJECT_DISABLE=1` for this session
- Master-index over-injection: `PRISM_MASTER_INDEX_K=2` (lower top-K)
- Discipline expert injection too verbose: `PRISM_DISCIPLINE_EXPERT_DISABLE=1`

The 2026-05-18 charlie U-OE-DASH-KEEP-BREAKDOWN lesson: hook-budget telemetry IS the diagnostic surface. Don't guess at hook cost; read the JSONL.

## Symptom 6 — "Wiki precheck returns stale entries"

`_leaf-index.jsonl` is stale OR `_embeddings.jsonl` is stale. Cause: regen cron missed a tick, or the fingerprint-gate skipped a regen that should have run.

Diagnostic:
1. `ls -la knowledge/wiki/architecture/_leaf-index.jsonl _embeddings.jsonl` — mtime
2. Compare to last commit touching `knowledge/wiki/`
3. Check `state/shared/regen-wiki-from-viz-history.jsonl` for recent runs

Resolution:
- `node scripts/regen-wiki-from-viz.mjs` (wiki-only, ~2-3min)
- `node scripts/regen-viz.mjs` (full system-viz regen, ~8min)
- `node scripts/build-wiki-embeddings.mjs` (re-embed via Ollama)

## Symptom 7 — "Multiple chats race to claim same unit"

Both chat A and chat B try to claim `MILESTONE::U-XXX`; one wins, the other gets a stale claim. Cause: `slot-task-claim.mjs` was bypassed by one of them.

Diagnostic:
1. `cat state/shared/slot-task-claims.json | jq '.<unit>'` — who holds it?
2. `git log --grep=U-XXX --since=1.hour` — has anyone already committed?

Resolution:
- If committed: pick a different unit
- If genuinely contested: chat-bus post claiming + ETA; the late chat releases
- Recurring race: enforce `/pick-unit --chatId <self>` (filters peer-claimed)

## The "always check chat-slots.json first" rule

For ANY fleet-coordination diagnostic, start at `state/shared/chat-slots.json`. It's the ground truth for who-is-bound-where. Mismatches between expected and observed slot binding cascade into every other symptom.

```
node H:/prism/scripts/fleet-status.mjs
```

This is the operator's `top` equivalent — slot table + activity + heartbeat ages.

## Knobs (for diagnostics)

- `PRISM_FLEET_REAPER_DRY_RUN=1` — see what would reap without acting
- `PRISM_FLEET_MEMMON_VERBOSE=1` — verbose memory monitor
- `PRISM_HOOK_PROFILE=diagnostic` — run only essential hooks (faster diagnostic)
- `PRISM_CHAT_BUS_COMPACT` — unset to see full bus content

## Related

- [[multi-chat-coordination]] — the 5 mechanisms when they work
- [[scheduled-task-patterns]] — task-side diagnostics
- [[slot-worktree-playbook]] — slot worktree failures
- CLAUDE.md "FLEET-REAPER-MS0/MS1/MS2"
- CLAUDE.md "FLEET-MEMORY-MONITOR-MS0"
- CLAUDE.md "FLEET-TASK-HEALTH-MS0"
