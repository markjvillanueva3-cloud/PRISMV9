---
name: peer-file-isolation
title: Peer File Isolation — Conflict Matrix Against Active Chat-Bus Claims
description: Cross-reference this chat's working-tree mutations (staged + unstaged + untracked) against the chat-bus file-claim ledger (`state/shared/chat-bus/claims/*.json`). Surface a per-file conflict matrix with recommended action per row (proceed / wait / post / fork). Sharp subset of `/checkin` step 4 — useful before any commit or milestone unit start.
type: skill
model: sonnet
effort: low
context: development
allowed-tools:
  - Bash
  - Read

# ── Auto-trigger frontmatter (forward-compat for Phase D orchestrator) ──
# Consumed by Phase D's `skill-auto-trigger.mjs` per SKILL-AUTO-TRIGGER-PLAN §P3.
# Until Phase D ships, manual invocation only.
triggers:
  - event: UserPromptSubmit
    matcher:
      type: keyword
      value: "peer file isolation|file claim conflict|am i stepping on|file ownership check|peer chat overlap|whose file is this|peer claim"
    score: 0.85
    action: suggest
  - event: PreToolUse
    matcher:
      type: tool
      value: "Bash"
      command_regex: "^git commit"
    score: 0.70
    action: suggest

pipeline_integrations:
  - pipeline: checkin                        # /checkin
    phase: step-4
    trigger: "extension of chat-bus-inject overlap check"
    action: invoke
  - pipeline: handoff                        # /handoff
    phase: pre-write
    trigger: "verify no peer files leaked into handoff context"
    action: invoke
  - pipeline: commit-pre-flight              # CLAUDE.md doctrine — NO slash command today
    phase: pre-commit
    trigger: "before git commit (multi-chat lane safety)"
    action: invoke
  - pipeline: forge                          # /forge, /forge2..7
    phase: P6-commit
    trigger: "before any commit on a shared branch"
    action: invoke-if-shared-branch

loop_contract:
  max_iterations: 1                # single-shot conflict scan
  initial_delay: 0
  inter_iteration_delay: 0
  break_when: all-pass
  state_signal: conflict_matrix
  rollback_on_runaway: false
  done_signals:
    - '{"done": true, "verdict": "CLEAR", "files_scanned": <N>}'
    - '{"done": true, "verdict": "CONFLICT", "conflicts": <K>, "peers": [<chatId>, ...]}'

impact:
  upstream:
    - state/shared/chat-bus/claims/*.json (peer file claims — chat-bus ledger)
    - state/shared/chat-bus/presence/*.json (active peer chats)
    - /checkin step 4 (chat-bus-inject block — surfaces same data inline)
    - file-claim-guard.mjs PreToolUse hook (the runtime gate; this skill is the proactive scan)
    - commit-ownership-guard.mjs PreToolUse hook (the commit-time gate)
  downstream:
    - operator decision: proceed | wait | post-proposing | fork-to-worktree
    - if --post-proposing is passed: posts a CLAIMED chat-bus message via agent-coordination.mjs
    - informs: conflict-fork rule application ([[feedback_conflict_fork_rule]])
    - informs: commit-vs-defer decision in /forge P6 and /handoff
  bounded: true
  reversible: true  # default is read-only; --post-proposing writes one chat-bus message
---

# /peer-file-isolation — Conflict Matrix Against Peer Claims

> **Goal:** answer the question *"of the files I've touched this session, which ones is another chat already working on?"* in one command. Today this question is answerable only by squinting at `/checkin` step 4's chat-bus-inject output and mentally diffing it against `git status`. This skill does that diff explicitly and recommends a row-by-row action.
>
> **Built for:** the multi-chat fleet's #1 silent-failure mode — chat A edits a file, chat B is also editing it, the runtime guards (`file-claim-guard`, `commit-ownership-guard`) catch the *commit*, but the operator only finds out after a `git reset` rolls back work. This skill catches it *before* the commit, often before the second edit.

## When to use

- Right before `git commit` on any shared branch (`cad-fusion-live-ms0` and friends)
- After `/checkin` shows peer files in the chat-bus-inject — to enumerate *which of mine overlap*
- After resolving an `index.lock` collision — peer was committing your file, so check exposure
- Before `/handoff` — to verify the handoff narrative doesn't claim work on a peer-owned file
- During `/forge` P6 commit phase
- Anytime a `permission-denied-retry` hook trips on a write

## When NOT to use

- For pure-read sessions (this skill scans for mutations — read-only sessions return immediate CLEAR)
- As a replacement for `/checkin` (this skill is the focused subset of step 4 only)
- For the **runtime** block (the PreToolUse hooks `file-claim-guard.mjs` + `commit-ownership-guard.mjs` already enforce; this skill is proactive)

## Usage

```
/peer-file-isolation                            # default: scan staged + modified + untracked vs claims
/peer-file-isolation --staged                   # only staged files
/peer-file-isolation --unstaged                 # only modified + untracked
/peer-file-isolation --include-self             # ALSO show my own active claims (default: filter out mine)
/peer-file-isolation --post-proposing=<msg>     # if conflict found, post a chat-bus CLAIMED `proposing:` message
/peer-file-isolation --output-json              # write state/shared/PEER_ISOLATION_REPORT.json (atomic temp+rename)
/peer-file-isolation --max-age-min=<N>          # treat claims older than N min as stale and skip (default 10)
```

## Protocol

### Step 0 — Resolve parameters + this chat's id
```bash
STABLE="claude-<8hex from this turn's SessionStart Chat Isolation line>"
```
(Same convention as `/checkin` step 1 — read the 8-hex off the SessionStart context block.)

If the operator can't surface the stable id (e.g. running before `/checkin`), the skill still completes but cannot filter out *its own* claims; surface a warning row "self-id unresolved; --include-self forced ON" and proceed.

### Step 1 — Enumerate this chat's working-tree mutations
```bash
git -C H:/prism status --porcelain=v1 -z       # NUL-delimited, robust to spaces in paths
```
Parse into 3 lists:
- `staged[]` — index entries (status code `XY` where `X ∈ {A,M,D,R,C}`)
- `unstaged[]` — worktree entries (`Y ∈ {M,D}`)
- `untracked[]` — `??`

Normalize each path to **absolute, lowercase-drive, forward-slash** (same as `file-claim-guard.mjs` lines 1-50 — the claim ledger uses normalized keys).

### Step 2 — Load active peer claims
```bash
CLAIMS_DIR=H:/prism/state/shared/chat-bus/claims
```
For each `*.json` in `CLAIMS_DIR`:
- Read; parse the shape `{chatId, files: [<normalizedPath>], createdAt, ttlMs}`.
- Skip if `chatId === <this STABLE>` UNLESS `--include-self`.
- Skip if `Date.now() - mtime > max_age_min * 60_000` (stale claim).
- Build `peerClaimMap: Map<normalizedPath, [{chatId, age_min}, ...]>`.

If `CLAIMS_DIR` is missing or empty → no conflicts possible; emit CLEAR and exit.

### Step 3 — Build conflict matrix
For each file in staged ∪ unstaged ∪ untracked:
- Normalize the path.
- Look up `peerClaimMap[normalized]`.
- If hit → conflict row.

Conflict row shape:
```
{
  path: "<repo-relative>",
  status: "staged" | "unstaged" | "untracked" | "staged+unstaged",
  claimedBy: [{chatId: "claude-<id>", age_min: <N>}, ...],
  recommendation: "wait" | "post-proposing" | "fork-to-worktree" | "claim-was-stale"
}
```

### Step 4 — Recommendation heuristic (per row)
| Condition | Recommendation |
|-----------|----------------|
| Claim ≥ 5 min stale AND active peer NOT in presence list | `claim-was-stale` (operator may force-take) |
| Single claim, peer in presence list, age < 2 min | `wait` (peer actively editing — give it time) |
| Single claim, peer in presence list, age 2-10 min | `post-proposing` (use --post-proposing to post a CLAIMED proposal) |
| Multiple peers claim same file | `fork-to-worktree` (multi-claim is a thrash zone — escape per [[feedback_conflict_fork_rule]]) |
| File is in `MINIMAL_ALLOWLIST` of [cross-worktree firewall](state/shared/chat-bus/) (settings.json, .mcp.json, state/shared/*.{json,md}, top-level CLAUDE.md/AGENTS.md) | `escalate-via-main-tree` (no peer ever writes to these from a worktree — peer is operating in the main tree; coordinate via chat bus) |

### Step 5 — Surface table
If no conflicts:
```
┌─ /peer-file-isolation ──────────────────────────────────
│ Working-tree mutations: <staged>S + <unstaged>U + <untracked>?? = <total>
│ Active peer claims: <K> (<P> peers in presence list)
│ ✅ NO CONFLICTS — proceed.
└────────────────────────────────────────────────────────
```
If conflicts:
```
┌─ /peer-file-isolation ──────────────────────────────────
│ Working-tree mutations: <total>     Conflicts: <K>     Affected peers: <P>
├────────────────────────────────────────────────────────
│ Path                                Status     Peer            Age   Recommend
│ src/engines/FooEngine.ts            staged     claude-a1b2     3m    post-proposing
│ src/__tests__/Foo.test.ts           unstaged   claude-a1b2     3m    post-proposing
│ state/shared/MILESTONE_PROGRESS.md  staged     claude-c3d4     1m    wait
│ .claude/settings.json               staged     claude-e5f6     0m    escalate-via-main-tree
└────────────────────────────────────────────────────────

ACTION:
  - Same-peer same-burst (FooEngine.ts + Foo.test.ts both by claude-a1b2): post-proposing
  - MILESTONE_PROGRESS.md: wait 60s, peer is mid-edit; re-run /peer-file-isolation
  - settings.json: do NOT edit from worktree; coordinate via chat-bus message to claude-e5f6

Next:
  /peer-file-isolation --post-proposing="proposing FooEngine.ts wiring for U-B2"
  # or
  git worktree add ../prism-<scope> -b work/<scope>      # per conflict-fork rule
```

### Step 6 — (if --post-proposing=<msg>)
- For each unique `claimedBy.chatId` in the conflict matrix, post one chat-bus message:
  ```bash
  node H:/prism/.claude/helpers/agent-coordination.mjs post --to "<peerChatId>" --type CLAIMED \
    --body "proposing: <msg> — files: <comma-separated paths> — from <STABLE>"
  ```
- Cap at 5 distinct peers (broadcast spam guard); if >5 distinct, error out and recommend `/checkin` for an overview.

### Step 7 — (if --output-json)
Write `state/shared/PEER_ISOLATION_REPORT.json` via **temp+rename**:
```jsonc
{
  "schemaVersion": 1,
  "timestamp": "<ISO>",
  "thisChat": "<STABLE>",
  "scanned": { "staged": <N>, "unstaged": <N>, "untracked": <N> },
  "claims_loaded": <K>,
  "claims_stale_skipped": <S>,
  "max_age_min": <N>,
  "conflicts": [
    { "path": "<p>", "status": "<s>", "claimedBy": [{"chatId": "<c>", "age_min": <a>}], "recommendation": "<r>" },
    ...
  ],
  "summary": { "total_conflicts": <K>, "distinct_peers": <P> }
}
```

### Step 8 — Emit verdict JSON
- `{"done": true, "verdict": "CLEAR", "files_scanned": <N>}` if no conflicts
- `{"done": true, "verdict": "CONFLICT", "conflicts": <K>, "peers": [<chatId>, ...]}` otherwise

## Implementation notes

- **Path normalization MUST mirror `file-claim-guard.mjs`** — absolute, lowercase drive letter, forward slashes. If `peer-file-isolation` normalizes one way and the guard another, a real conflict slips through silently. The claim ledger is the source of truth for the normalization (`file-claim-guard.mjs` lines 1-50).
- **Performance:** typical claim count is <50 files, scan time <100 ms. Safe to invoke before every commit.
- **Multi-chat safety:** read-only on claims directory; the JSON output write uses temp+rename. Two chats running this skill concurrently are independent.
- **`--post-proposing` is the only mutation** — it writes a chat-bus message. The skill never modifies, deletes, or releases peer claims. Releasing your OWN claim (after handoff) is `/checkin` / `agent-coordination.mjs release`, not this skill.
- **Stale-claim heuristic:** the default 10-minute window matches `commit-ownership-guard.mjs`'s peer-claim stale check. If you change it here, change both — drift between the two surfaces is the source of "skill says clear but commit guard blocks" confusion.
- **Cross-worktree firewall awareness:** Step 4's `escalate-via-main-tree` recommendation references the firewall installed 2026-05-12 (`hook-cross-worktree-block.mjs` per CLAUDE.md §Multi-Chat). A worktree chat seeing a peer claim on settings.json/state/shared/* should NEVER fork — the firewall blocks the write anyway; coordinate via chat bus.

## What this skill does NOT do

- Does NOT release your own claims (use `/checkin` or `agent-coordination.mjs release`)
- Does NOT force-take peer claims (use `chat-slots.mjs claim --force` + manual claim revoke)
- Does NOT block any commit (the runtime hook `commit-ownership-guard.mjs` does that — this skill is the *proactive* scan)
- Does NOT touch the cross-worktree firewall (read-only on the claim ledger)
- Does NOT post to `AGENT_CHAT.md` directly (writes go through `agent-coordination.mjs` for canonical formatting)

## Examples

### Example 1 — pre-commit safety check
```
/peer-file-isolation
```
Default scan. CLEAR → commit. CONFLICT → review the recommendation column.

### Example 2 — find conflicts in staged only (committing now)
```
/peer-file-isolation --staged
```
Useful at `/forge` P6 — staged is what's about to commit; untracked junk is irrelevant to the commit collision.

### Example 3 — broadcast my intent
```
/peer-file-isolation --post-proposing="wiring U-B2 file-isolation skill — touching .claude/commands/peer-file-isolation.md only"
```
If conflict matrix flags claude-a1b2's claim on a related file, posts a CLAIMED proposal so the peer sees my intent before its next prompt.

### Example 4 — generate machine-readable report
```
/peer-file-isolation --output-json
```
For ingestion by `/forge` P6 or `/handoff` pre-write — surface conflicts as structured data, not just a table.

### Example 5 — include my own active claims (audit my own footprint)
```
/peer-file-isolation --include-self --output-json
```
Useful when verifying my heartbeat is healthy and my claims didn't drift.

## See also

- `state/shared/chat-bus/claims/*.json` — the claim ledger (one file per claim, schema mirrors `ChatBusEngine.ts`)
- `state/shared/chat-bus/presence/*.json` — active peer chat presence
- `.claude/hooks/file-claim-guard.mjs` — PreToolUse runtime block (this skill is the proactive scan; the hook is the runtime gate)
- `.claude/hooks/commit-ownership-guard.mjs` — commit-time runtime block
- `.claude/hooks/chat-bus-inject.mjs` — UserPromptSubmit injection of peer-claim overview (this skill drills down with row-level diff)
- `.claude/hooks/hook-cross-worktree-block.mjs` — cross-worktree firewall (referenced in Step 4's escalation recommendation)
- `.claude/helpers/agent-coordination.mjs` — chat-bus message poster (used by `--post-proposing`)
- `.claude/helpers/chat-slots.mjs` — fleet slot claim/reap (sibling, not invoked here)
- `/checkin` step 4 — broader chat-bus context; this skill is the focused subset
- `state/shared/CLAUDE-CODEX-COORDINATION-DIRECTIVE.md` — multi-chat conflict doctrine
- [[feedback_conflict_fork_rule]] — fork-to-worktree escape pattern when multi-claim conflicts arise
- `state/shared/SKILL-AUTO-TRIGGER-PLAN.md` Phase B.2 — this skill's milestone
