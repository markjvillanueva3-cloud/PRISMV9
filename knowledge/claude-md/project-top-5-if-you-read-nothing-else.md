---
source: project
section: TOP 5 — IF YOU READ NOTHING ELSE
slug: top-5-if-you-read-nothing-else
indexed_at: 2026-04-30T16:35:05.314Z
---

## TOP 5 — IF YOU READ NOTHING ELSE

1. **SCRUTINY GATE** blocks Stop until you dispatch a reviewer agent + run `node .claude/scripts/scrutiny-mark.mjs --session-id <id> --self --agent --notes "<one-line>"`. The block message tells you the session id. (§SCRUTINY GATE)
2. **Handoffs go to** `state/shared/handoffs/HANDOFF-<id>-<topic>.md` via `helpers/per-agent-handoff.mjs` — **NEVER** write to legacy `state/HANDOFF.md`. Topic suffix is mandatory; `enforce-handoff-topic.mjs` Stop hook will rename topicless files but don't rely on it. (§PER-CHAT HANDOFF)
3. **Before creating any engine/hook/skill**: `duplicationGuardEngine.mustCheckBeforeCreating()` — it THROWS on dup. The `duplication-hard-block.mjs` PreToolUse hook also fires automatically; trust it, don't re-paste guard code. (§MANDATORY SELF-AWARENESS)
4. **Physics constants** ALWAYS imported from `mcp-server/src/physics/constants.ts` — inlining Kienzle/Taylor values is hook-blocked. (§SAFETY)
5. **If commit blocked by another chat** (commit-ownership-guard / git-anti-clobber): fork to `git worktree add ../prism-<milestone> -b work/<milestone>` — do NOT retry. (§Lane discipline + conflict-fork rule)

You are 1 of ~6 concurrent Claude chats on this repo. Counts (engines/dispatchers/actions) come from `PRISM-INVENTORY-LATEST.md` — never trust numbers in this file's prose.
