---
name: fleet-coordination-discipline
category: software-engineering
domain: backend-dev
tags: [multi-agent, fleet, slots, chat-bus, claims, coordination, peer-awareness, prism-development]
last_updated: 2026-05-18
---

# Fleet Coordination Discipline

PRISM runs up to 13 concurrent Claude chats — 12 work slots (`alpha..foxtrot` + `hotel..mike`) plus 1 hygiene slot (`golf`, the integrator). They share `H:/prism` and `H:/prism/.git`, so they collide unless coordinated. This wiki names the runtime layer — slot claims, chat bus, peer-claim avoidance, cross-tree commit collision class, conflict-fork rule — and how a chat stays *aware* of its peers without stepping on them. [[slot-worktree-playbook]] covers the branch/worktree mechanics; this is the live-coordination complement.

## The model in one sentence

A chat is a **slot identity** (one of 13 NATO names) that owns **claims** (units it's building, files it's editing) on a **branch and worktree** it doesn't share, while posting to a **chat bus** that all peers read on every prompt.

When any of those four — identity, claims, isolation, awareness — fails, peers collide.

## Identity — the slot

Each chat binds to one of 13 slots on `/checkin-<nato>` (or auto-binds via stable-session-id → `claude-<8hex>` → `chat-slots.json`). The slot is the stable handle other chats use to refer to this one across `/compact` / `/clear` / fresh-window.

Slot identity lives in `state/shared/chat-slots.json` (heartbeat + `terminalWindowId` pin + `lastSeen`). Two failure modes:

- **Slot drift after /compact** — model copies a stale `claude-<id>` from the conversation summary instead of the live Chat Isolation line. The `slot-bind-enforce` hook (Recent regressions 2026-05-18) reads stdin `session_id` and force-claims the named slot for `/checkin-<nato>` prompts — don't bypass it.
- **PID-reuse false attribution** — `chat-slots.json[slot].pid` is the ephemeral subshell that ran the claim. Don't infer liveness from it; use `lastHeartbeat` instead.

## Claims — what you own this session

Two claim ledgers, both lockfile-guarded:

- **`mcp-server/data/claims/<unit>/claim.json`** — file-level (which chat is editing `engineX.ts`). Read by the `file-claim-guard` PreToolUse hook, which BLOCKS Edit/Write on files claimed by a peer.
- **`state/shared/slot-task-claims.json`** — unit-level (`MILESTONE::U-ID`). Forward-only phase (`claimed → building → testing → committing`). Auto-released by the `.git/hooks/post-commit` hook on a `[SCOPE]/U-ID` commit subject.

Liveness gating: a stale claim with no heartbeat for >5 min is reapable. **Do not reap a peer's claim unilaterally** — the fleet-reaper has a 10-min confirm-after-N-ticks gate for a reason ([[reference_fleet_reaper]]). Patient retry beats premature override.

## Chat bus — peer awareness, post-before-edit

The bus is `state/shared/AGENT_CHAT.jsonl` (machine) + `AGENT_CHAT.md` (human). Every UserPromptSubmit hook reads it and injects a `## 🔗 Chat Bus — you=... · N peers online · M foreign claims · K unread` line. That line tells you who else is working *right now*.

**Doctrine — post BEFORE edits, not after** ([[feedback_chat_bus_post_before_edits]]). If you're about to touch a CLAUDE-md / settings.json / shared-state file, post first so peers see your intent and back off. Posting after the edit just announces a collision that already happened.

Post via the helper:
```
node H:/prism/.claude/helpers/agent-coordination.mjs post --agent <slot> --status <verb> --current "<what>" --next "<resume>"
```

## Peer-claim avoidance — three guards stacked

1. **`file-claim-guard` PreToolUse hook** — hard-blocks Edit/Write on files where `claims/<file>/claim.json` names a peer. The block message names the peer. Honor it; don't bypass with PRISM_HOOK_PROFILE.
2. **Slot-task-claim filter on `/pick-unit`** — `--chatId` filter skips units claimed by peers ([[reference_per_slot_claim_ms0_2026_05_16]]).
3. **Worktree isolation** — once you migrate to `slot/<nato>` via `/checkin-<slot>` Step 2c, three hooks arm: `main-tree-write-block`, `git-add-lane-guard`, `worktree-commit-route`. Edits to `H:/prism` are blocked; commits route into your slot worktree.

When all three trip on you mid-task, [[git-shared-index-hazards]]'s conflict-fork rule is the canonical fix.

## Cross-tree commit collision class — the silent banner-swap

Lived in this very session multiple times. Setup: your chat is on shared `H:/prism` main tree (not yet slot-worktree-migrated), staging files for a `git commit`. A peer chat on the same tree runs `git commit -a` (or `git add .`). The peer's commit sweeps **your staged files** under **their** commit subject. Your work lands, correctly on disk and in HEAD — but git-blame and audit trails attribute it to a unit you didn't write.

Visible signature: `git log -1 --name-only` shows files you wrote, under a commit subject naming a peer's unit.

**Mitigation hierarchy** (strongest first):
1. Migrate to your slot worktree (`/checkin-<slot>` Step 2c). Peer chats can't sweep what isn't in their tree.
2. Pathspec commit: `git add <exact-files> && git commit -m "..." -- <exact-files>`. The `-- <pathspec>` clamps the commit to only those paths even if the index is dirty with peer work.
3. Literal `-m "[MAIN] [SCOPE]/U-ID: title"` (no shell variables). The `worktree-commit-route` hook parses the raw command string; `$MSG` hides the prefix and gets rejected.

**Do NOT rewrite history** to fix a swept commit. The misattributed commit is downstream-visible (Obsidian, system-viz, peer chats already pulled it). Record the misattribution as a `reference_*` memory naming the SHA + the real unit so future audits can correct ([[reference_cross_chat_commit_misattribution_2026_05_18]]). The wrong banner is a known artifact; the work is correct.

## index.lock contention — diagnose before deciding

A `.git/index.lock` you can't get past is one of three things:

| Signature | Diagnosis | Action |
|---|---|---|
| Size 0, mtime <2s, churning | Healthy — waiting committer | Retry 6-30s |
| Size 0, mtime >60s, owner alive | Wedged peer commit | Patient retry (don't kill below fleet-reaper threshold) |
| Size >0, mtime frozen >60s, no owner | Stale orphan from crashed peer | `Remove-Item .git\index.lock -Force` |

See [[git-shared-index-hazards]] for the full table. **Do not `Stop-Process` a peer commit** — let the fleet-reaper's 10-min confirm window handle it.

## Heartbeat liveness vs claim ownership

These are NOT the same thing.

- **Liveness** (`chat-slots.json[slot].lastHeartbeat`) — is this slot's chat still alive? Goes stale if the chat closed, the host froze, or the heartbeat hook failed. Used by reapers + peer-audit.
- **Claim ownership** (`claim.json[unit].owner`) — does this slot own this unit's work? Persists across slot crashes; the post-commit auto-release is the canonical clearance path.

A dead slot can still hold un-released claims. A live slot can have no active claims. Don't infer one from the other.

## Conflict-fork rule

When routing hooks block your commit and migration is genuinely not viable this turn, the one-off fallback is:

```
git worktree add ../prism-<scope> -b work/<scope>
```

That gives you an independent worktree + branch so milestone work stays mergeable without further peer collision. The slot-worktree migration via `/checkin-<slot>` is the canonical path — conflict-fork is the escape hatch ([[feedback_conflict_fork_rule]]).

## Golf — the integrator role

Golf is the 7th slot AND the slot-worktree-model integrator. Its job is merging `slot/<nato>` branches into `cad-fusion-live-ms0` on cadence. Work slots ship into their slot branches; golf integrates. Two failure modes:

- **Golf offline → slot work stagnates** ([[wiki-automation-discipline]] "lima isolation"). Peer chats reading main tree never see slot/lima commits until golf merges.
- **Golf treated as a work slot** — golf was historically hygiene-only with a write-allowlist; the `--golf` claim flow bypasses the allowlist when used as a work slot. Most chats should not be golf.

## What you read every prompt — and what each tells you

The UserPromptSubmit chain injects four awareness blocks. Internalize what each means:

| Block | What it tells you |
|---|---|
| `## 🔗 Chat Bus — you=... · N peers · M foreign claims · K unread` | Live peer count + outstanding messages addressed to you |
| `## 🧭 Master-index pre-search` | Top-K graph hits for your prompt tokens — read before re-deriving |
| `## 📚 Wiki precheck` | Known wiki entries matching your prompt — read before writing new |
| `─── /loop awareness ───` | Your loop state + other fleet loops + Karpathy R10 reminder |

The blocks are short on purpose — they amortize across the session. Skim, don't re-derive. The `inventory-check-guard`, `master-index-search-gate`, and `duplication-hard-block` hooks fire downstream and HARD BLOCK if you ignore them and try to create a duplicate.

## Anti-patterns

- **Editing a peer-claimed file via PRISM_HOOK_PROFILE bypass** — the claim guard is load-bearing, not advisory. If you genuinely need it, post on the chat bus first asking the owner to release.
- **`git commit -a` on shared `H:/prism`** — sweeps every dirty file in the index, including peer work. Always pathspec on shared trees.
- **Killing a peer's `git commit` process** — almost always a wedged commit will land eventually; killing it corrupts the index. Below the fleet-reaper threshold, wait.
- **Inferring liveness from `chat-slots.pid`** — pid is ephemeral; use `lastHeartbeat`.
- **Picking a unit without `--chatId`** — `slot-task-claim` won't filter peer-claimed units; you'll race-build the same unit.
- **Posting to chat bus AFTER editing** — defeats the purpose; the bus is a write-intent declaration, not a press release.

## Checklist — every fleet-aware action

- [ ] My slot is bound and heartbeating? (`/checkin-<slot>` if drifted)
- [ ] On the chat bus: do I see foreign claims on files I want to edit? Wait, ask, or pivot.
- [ ] For unit pickup: `--chatId` filter on? (`/pick-unit` or `slot-queue.mjs --chatId <me>`)
- [ ] On shared tree → pathspec commit + literal `-m` string?
- [ ] After commit: does `git log -1 --name-only` match what I expected? If not, [[reference_cross_chat_commit_misattribution_2026_05_18]].
- [ ] index.lock blocking me? Diagnose by size+mtime+owner before acting.
- [ ] Bus posted my next intent so peers can plan around it?

## Related

- [[slot-worktree-playbook]] — branch/worktree mechanics layer
- [[git-shared-index-hazards]] — lock contention diagnosis + retry patterns
- [[handoff-discipline]] — per-chat handoff (the session-boundary complement)
- [[feedback_chat_bus_post_before_edits]] — the post-first rule, full why
- [[feedback_conflict_fork_rule]] — escape-hatch worktree fork
- [[feedback_file_claim_namespace_bug]] — historical claim-namespace gotcha
- [[reference_per_slot_claim_ms0_2026_05_16]] — slot-task-claim system
- [[reference_cross_chat_commit_misattribution_2026_05_18]] — the swept-commit class
- CLAUDE.md §PER-CHAT HANDOFF · §GOLF SLOT · §ENGINE WIRING · §SESSION CONTINUITY STACK
