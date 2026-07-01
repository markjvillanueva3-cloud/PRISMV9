---
name: reference-hook-wiring-audit-2026-05-15
description: "2026-05-15 audit of orphan hooks in PRISM .claude/settings.json. ITER 9 found 11 documented-as-wired hooks missing. UPDATE 2026-05-15 post-rewire: audit was partly wrong — 5 of the 11 ARE wired in user-level H:/.claude/settings.json (audit only checked project-level). The 6 genuinely-missing hooks are now wired in project-level per the docstring guidance for scrutinize-before-stop. RESOLVED."
metadata:  
source: prism-memory
synced: 2026-05-18T01:02:09.436Z
aliases: reference_hook_wiring_audit_2026_05_15
---


# 2026-05-15 — Stop/Pre/Post hook wiring audit (RESOLVED — rewired)

## TL;DR

ITER 9 audit found 11 documented-as-wired hooks missing from `H:/prism/.claude/settings.json` (project-level). On re-verification (post-/compact), 5 were actually wired in `H:/.claude/settings.json` (user-level — the audit only checked project-level). The remaining 6 were genuinely orphaned; they have now been wired in project-level per the docstring guidance for `scrutinize-before-stop.mjs` (which explicitly says "Wired in **project settings.json** (NOT user/global)").

The 3-of-3 scrutiny gate is no longer dormant.

## Commit landing

`ca75a49a7` on `cad-fusion-live-ms0` (FF-merged 2026-05-15 from `work/hva-validator-and-parser-fix`):
- `[BACKEND-DEVTOOLS-HVA]/U-HVA-REWIRE-ORPHAN-HOOKS`: +35/-5 in `.claude/settings.json`
- Committed in H:/prism-hva worktree, reverse-merged into cad-fusion-live-ms0, FF-merged.

## Final wiring state

### Wired in project-level (H:/prism/.claude/settings.json — this commit added them)

| Hook | Event | Tier | Timeout | Notes |
|---|---|---|---|---|
| `scrutinize-before-stop.mjs` | Stop | T0 BLOCKING | 10000 | Was DORMANT — 3-of-3 scrutiny gate now active |
| `enforce-handoff-topic.mjs` | Stop | T4 | 3000 | Auto-renames topicless HANDOFF-{id}.md → HANDOFF-{id}-{topic}.md |
| `error-pattern-promote.mjs` | Stop | T4 | 5000 | Promotes recurring error fingerprints to wiki lesson stubs |
| `leave-a-copy-behind-guard.mjs` | Stop | T0 BLOCKING | 5000 | Prevents file moves/deletes without copy-behind |
| `wiki-precheck-inject.mjs` | UserPromptSubmit | T4 | 5000 | Karpathy LLM-Wiki BM25 + cosine top-3 inject |
| `chat-bus-inject.mjs` | UserPromptSubmit | T2 | 3000 | Inter-chat signal inject (active peers / file claims / unread messages) |

### Already wired in user-level (H:/.claude/settings.json — audit was wrong about these)

| Hook | Event | Line | Notes |
|---|---|---|---|
| `awareness-snapshot-inject.mjs` | SessionStart | 157 | 15-line digest auto-inject |
| `stop-system-viz-reminder.mjs` | Stop | 461 | Nudges /system-viz refresh on session end |
| `skill-auto-trigger.mjs` | UserPromptSubmit | 655 | Top-K skill suggestion based on prompt keywords |
| `master-index-precheck-inject.mjs` | UserPromptSubmit | 670 | Top-5 system-graph hits auto-inject |
| `heartbeat-keepalive.mjs` | UserPromptSubmit | 735 | Refreshes slot heartbeat when stale |

### Precompact-auto-trigger dedupe

Per the script's own docstring guidance — *"canonical entry is PreToolUse only — wiring on both Pre+Post doubled the transcript read per tool call for no benefit"*:

| Wiring | Before | After |
|---|---|---|
| Project PreToolUse `--pre` (matcher: "") | 1× canonical | 1× canonical (kept) |
| Project PostToolUse `--post` (matcher: `^(Bash|Edit|Write|MultiEdit|...)$`) | 1× | no-op stub (preserved type/command shape for settings-guard) |
| Project PostToolUse `--post` (matcher: `^(Read|Glob|Grep)$`) | 1× | no-op stub |
| User PreToolUse `--pre` (matcher: "") | 1× | 1× (untouched — separate file) |
| User PostToolUse `--post` (matcher: "") | 1× | 1× (untouched — separate file; should be no-op'd in a follow-up via canonical C:\Users\...) |

Net fires per tool: 6 (3 pre + 3 post) → 3 (2 pre + 1 post). 50% reduction.

The 2× pre fire is residual cross-file dup (project + user level both have matcher:""). To dedupe fully, no-op the user-level `--post` entry via the canonical `C:\Users\Mark Villanueva\.claude\settings.json` + c-to-h-mirror path. Logged as follow-up — non-blocking.

## Smoke tests

All 6 newly-wired hooks tested with synthetic stdin JSON:
- `scrutinize-before-stop` → `{"continue":true}` exit 0 (no tracked changes detected)
- `enforce-handoff-topic` → `{"continue":true,"systemMessage":"...no handoff yet"}` exit 0
- `error-pattern-promote` → `{"continue":true}` exit 0 (no ledger entries past threshold)
- `leave-a-copy-behind-guard` → `{"continue":true}` exit 0 (no deleted/renamed tracked files)
- `wiki-precheck-inject` → `{"continue":true,"hookSpecificOutput":{...top-3 wiki entries...}}` exit 0 (wiki recall confirmed working)
- `chat-bus-inject` → `{"continue":true}` exit 0 (no unread peer messages)

JSON validates (`node -e "JSON.parse(...)"`).

## What the audit got right

- The 6 genuinely-orphaned hooks were missing. Wiring them was correct.
- The hypothesis that orphan-rescue commits landed only in user-level settings.json (not project-level) was confirmed for 5 of the 11 claimed-orphans.
- The 3-of-3 scrutiny gate (`scrutinize-before-stop`) was indeed dormant — CLAUDE.md claimed "blocks" but settings.json contradicted it. Now actually wired.

## What the audit got wrong

- Looked only at H:/prism/.claude/settings.json (project-level) and ignored H:/.claude/settings.json (user-level). PRISM sessions run hooks from BOTH files, so a hook wired in either fires correctly.
- Counted precompact-auto-trigger as "3× wired" but it was 3× in project + 2× in user = 5× total fires per tool. The dedup fixed project-level (3→1) but did not touch user-level.
- Recommended re-wiring all 11 hooks. Actually only 6 needed wiring; the other 5 were correctly user-level.

## Verification commands

```bash
# Confirm 6 new hooks in project-level:
rg -n 'scrutinize-before-stop|wiki-precheck-inject|enforce-handoff-topic|chat-bus-inject|error-pattern-promote|leave-a-copy-behind-guard' H:/prism/.claude/settings.json

# Confirm 5 hooks in user-level:
rg -n 'awareness-snapshot-inject|stop-system-viz-reminder|skill-auto-trigger|master-index-precheck-inject|heartbeat-keepalive' H:/.claude/settings.json

# Smoke-test scrutiny gate is alive:
echo '{"session_id":"test","transcript_path":"/dev/null","tool_name":"Bash","cwd":"H:/prism"}' \
  | "H:/.claude/bin/portable-node" H:/prism/.claude/hooks/scrutinize-before-stop.mjs
```

## Follow-up (logged, non-blocking)

- User-level `--post` precompact entry can also be no-op'd via canonical `C:\Users\Mark Villanueva\.claude\settings.json` + c-to-h-mirror to bring residual 2× pre + 1× post down to 1× pre + 0× post per docstring canonical.
- The 5 user-level entries (master-index-precheck-inject etc.) could be migrated to project-level for consistency, but they work where they are.

## Companion memories

- [[reference_hva_validator_collision]] (iter1-2 of /loop session 6d0595bf — engine NEEDS_WIRING validator)
- [[reference_hook_orphan_validator]] (iter4 — the validator that would have caught this drift earlier)
- [[reference_master_index_surface]] (CLAIM: "wired 2026-05-14 by claude-a2b1b5ca" → CONFIRMED in user-level)
- [[reference_awareness_stack]] (CLAIM: "auto-injects 15-line digest" → CONFIRMED in user-level)
- [[reference_reverse_merge_then_ff_only]] (the worktree merge pattern used to land the rewire)


## Related
[[skills/prism|/prism]] • [[skills/settings|/settings]] • [[skills/compact|/compact]] • [[skills/global|/global]] • [[skills/hva-validator-and-parser-fix|/hva-validator-and-parser-fix]] • [[skills/-|/-]] • [[skills/prism-hva|/prism-hva]] • [[skills/deletes|/deletes]] • [[skills/system-viz|/system-viz]] • [[skills/command|/command]]