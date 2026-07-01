---
name: staged-sanity
title: Staged Sanity — Pre-Commit Lane + Drift + Peer Check (One Shot)
description: Manual pre-commit dry-run that combines four checks into one report — (1) peer-claim conflicts on staged files (via /peer-file-isolation), (2) envelope drift on milestones touched by staged files, (3) lane discipline (does the staged scope match this chat's slot + branch?), (4) untracked-but-related-files surface (catch un-staged tests / specs). Surfaces a single PROCEED / BLOCK verdict. Companion to (not replacement for) the existing PreToolUse:Bash runtime gates (`commit-ownership-guard`, `file-claim-commit-guard`, `staged-pretest-guard`).
type: skill
model: sonnet
effort: low
context: development
allowed-tools:
  - Bash
  - Read

# ── Auto-trigger frontmatter (forward-compat for Phase D orchestrator) ──
triggers:
  - event: UserPromptSubmit
    matcher:
      type: keyword
      value: "staged sanity|pre-commit check|am i ready to commit|sanity check commit|commit dry-run|pre-flight commit"
    score: 0.85
    action: suggest
  - event: PreToolUse
    matcher:
      type: tool
      value: "Bash"
      command_regex: "^git\\s+commit(\\s|$)"
    score: 0.90
    action: suggest

pipeline_integrations:
  - pipeline: forge                       # /forge, /forge2..7
    phase: P6-commit
    trigger: "pre-commit pre-flight"
    action: invoke
  - pipeline: checkin                     # /checkin
    phase: step-9-after-bus
    trigger: "after fleet check-in, before any commit"
    action: invoke-if-staged
  - pipeline: handoff                     # /handoff
    phase: pre-write
    trigger: "verify staged content reflects handoff narrative"
    action: invoke-if-staged
  - pipeline: commit-pre-flight           # CLAUDE.md doctrine, no slash command today
    phase: gate
    trigger: "before any git commit on shared branch"
    action: invoke

loop_contract:
  max_iterations: 1                # single-shot dry-run
  initial_delay: 0
  inter_iteration_delay: 0
  break_when: all-pass
  state_signal: verdict
  rollback_on_runaway: false
  done_signals:
    - '{"done": true, "verdict": "PROCEED", "staged_count": <N>, "warnings": []}'
    - '{"done": true, "verdict": "PROCEED_WITH_NOTES", "staged_count": <N>, "warnings": [<...>]}'
    - '{"done": true, "verdict": "BLOCK", "blockers": [<...>]}'

impact:
  upstream:
    - git index (staged files)
    - state/shared/chat-bus/claims/*.json (peer claims — via /peer-file-isolation)
    - mcp-server/data/milestones/*.json (envelope status vs git reality)
    - state/shared/MILESTONE_PROGRESS.json (delta from build-milestone-progress.mjs)
    - state/shared/chat-slots.json (this chat's slot + branch binding)
    - .claude/hooks/commit-ownership-guard.mjs (the runtime gate this skill complements)
    - .claude/hooks/file-claim-commit-guard.mjs (the runtime gate)
    - .claude/hooks/staged-pretest-guard.mjs (the test-existence runtime gate)
  downstream:
    - operator decision: proceed | unstage | re-stage related files | wait
    - feeds: commit verdict into the next /forge P6 / /handoff
    - never modifies state, never runs the actual git commit
  bounded: true
  reversible: true  # read-only on every input
composes_with:
  - "/checkin"
  - "/close-out"
  - "/envelope-sync"
  - "/forge"
  - "/handoff"
  - "/peer-file-isolation"
---
# /staged-sanity — Pre-Commit Pre-Flight (lane + peer + drift + completeness)

> **Goal:** the bash hook `commit-ownership-guard.mjs` already blocks commits that touch peer-owned files; `staged-pretest-guard.mjs` already blocks engines without tests. Both fire *during* `git commit`, which means the commit has been typed, the operator's intent is committed (mentally), and the block feels adversarial.
>
> This skill is the **proactive** version. Run it *before* you type `git commit`. It runs the same checks plus two more (envelope drift on touched milestones, lane mismatch) and surfaces a single PROCEED / PROCEED_WITH_NOTES / BLOCK verdict in one place.
>
> **Built for:** the recurring "I typed git commit, got blocked, had to re-stage half my files" cycle that happens 3-5×/day in the 6-chat fleet. Catching the same conflicts pre-emptively cuts the cycle to zero.

## When to use

- Before any `git commit` on a shared branch (`cad-fusion-live-ms0` and friends)
- After `/forge` P5 (impl) → before P6 (commit)
- After staging large multi-file batches (more likely to mix scopes)
- Inside a fork worktree, before flipping back to main for `ff-only` merge
- As the cron-friendly pre-commit gate (run via `/loop 30s /staged-sanity` during long forge sessions to surface staged-but-unfinished state early)

## When NOT to use

- For pure-status checks (use `/checkin`) — this skill assumes you're about to commit
- For full milestone close-out checks (use `/close-out` per [[feedback_roadmap_close_out]]) — staged-sanity is the commit-only subset
- For runtime *blocking* — the PreToolUse hooks `commit-ownership-guard` + `file-claim-commit-guard` + `staged-pretest-guard` are the runtime gates; this skill is the proactive scan. Never disable the hooks in favor of this skill.

## Usage

```
/staged-sanity                                   # default: all 4 checks, surface verdict
/staged-sanity --check=peer,envelope,lane,related  # comma-separated check selector (default: all)
/staged-sanity --explain                         # show each check's reasoning in detail
/staged-sanity --output-json                     # write state/shared/STAGED_SANITY_REPORT.json
/staged-sanity --no-related-scan                 # skip the "you staged FooEngine.ts but Foo.test.ts is unstaged" walk
```

## Protocol

### Step 0 — Resolve parameters + chat context
```bash
STABLE="claude-<8hex from this turn's SessionStart Chat Isolation line>"
BRANCH=$(git -C H:/prism rev-parse --abbrev-ref HEAD 2>/dev/null)
SLOT=$(node H:/prism/.claude/helpers/chat-slots.mjs lookup --chatId "$STABLE" 2>/dev/null | jq -r .slot 2>/dev/null)
```
If `--check=...` provided, validate every token is in `{peer, envelope, lane, related}`; reject unknown tokens.

### Step 1 — Enumerate staged files
```bash
git -C H:/prism diff --cached --name-only -z   # NUL-delimited
```
If 0 files staged → emit `{"done": true, "verdict": "NOOP", "staged_count": 0}` and exit (no commit possible).

### Step 2 — CHECK[peer] — peer-claim conflicts on staged
Delegate to `/peer-file-isolation --staged --output-json` (skill is a sibling per Phase B.2). Parse the resulting `state/shared/PEER_ISOLATION_REPORT.json`:
- `conflicts.length > 0` and ANY row.recommendation ∈ {`wait`, `fork-to-worktree`, `escalate-via-main-tree`} → **BLOCK** with that row.
- Conflicts present but all `post-proposing` or `claim-was-stale` → **WARN** (operator may proceed but must post-proposing first).
- No conflicts → CLEAR.

### Step 3 — CHECK[envelope] — envelope drift on touched milestones
For each staged file path, extract any milestone IDs referenced via:
- Commit-message scope tags ([SCOPE-MS#] from this chat's last 3 commits)
- Path segments matching `mcp-server/data/milestones/<MS-ID>/...`
- The most recent commit's `[SCOPE-MS#]` tag (default fallback)

For each milestone ID found, read `mcp-server/data/milestones/<MS-ID>.json`:
- If `status === "completed"` AND the staged files include source code (`.ts`/`.mjs` outside `state/shared`, `knowledge/`, `mcp-server/data/docs/`) → **WARN** "milestone <MS-ID> is closed; staging code changes here re-opens it. Either bump to a new milestone or amend the envelope first."
- If `status === "in_progress"` → CLEAR (normal).
- If `status === "not_started"` → **WARN** "milestone <MS-ID> envelope says not_started; consider flipping to in_progress with /envelope-sync."

### Step 4 — CHECK[lane] — slot + branch + scope alignment
Read this chat's slot lookup:
```bash
node H:/prism/.claude/helpers/chat-slots.mjs lookup --chatId "$STABLE"
```
Verify:
- `slot.branch === current branch` (no commit on a branch this chat doesn't own)
- The commit's likely scope (extracted from `[SCOPE-MS#]` tag in pending commit message OR the most-recently-touched milestone in staged paths) is part of the chat's declared `topic` field
- If the chat is in a worktree (`H:/prism-<scope>` not `H:/prism`), verify `slot.branch.startsWith("work/")` AND the worktree path matches the slot's topic — alignment drift here is the precursor to the "I edited the wrong tree" bug.

Output:
- All three aligned → CLEAR
- Branch mismatch → **BLOCK** "this chat's slot is bound to <branch1>; you're committing to <branch2>. Either re-bind via /checkin or switch branches."
- Scope mismatch → **WARN** "staged files reference <SCOPE> but this chat's topic is <other>; verify intentional."
- Worktree mismatch → **WARN** "in worktree <P> but slot says <Q>; possible chat-slot drift."

### Step 5 — CHECK[related] — related-files completeness walk
For each staged file, look up its natural companions and warn if unstaged:
| Staged | Look for unstaged | Severity |
|--------|-------------------|----------|
| `src/engines/<Foo>Engine.ts` | `src/__tests__/<Foo>Engine.test.ts` OR `src/__tests__/<Foo>.test.ts` | **WARN** |
| `src/tools/dispatchers/<X>.ts` | `src/__tests__/*<X>*.test.ts` | **WARN** |
| Any `.ts` in `mcp-server/src/` | corresponding `.test.ts` modified in last commit OR unstaged | **NOTE** |
| `<file>.md` in `knowledge/wiki/architecture/` | the source `.ts` it documents (if symlinked) | **NOTE** |
| `state/shared/*.json` | accompanying `state/shared/*.md` rendered counterpart | **NOTE** |
| `.claude/commands/<x>.md` | nothing required (skills are leaf docs) | — |
| `.claude/hooks/<x>.mjs` | `state/shared/HOOK_REGISTRY.json` regen (auto-handled by `hook-registry-regen.mjs`) | — |

Skip `--no-related-scan` if the operator is intentionally landing a partial bundle.

### Step 6 — Synthesize verdict
- Any BLOCK from steps 2-4 → **BLOCK**
- Any WARN → **PROCEED_WITH_NOTES** (operator may proceed; notes printed)
- All CLEAR → **PROCEED**

### Step 7 — Surface report
```
┌─ /staged-sanity ──────────────────────────────────────
│ Chat: <STABLE>     Slot: <SLOT>     Branch: <BRANCH>
│ Staged: <N> files     Workdir: <H:/prism | H:/prism-<scope>>
├──────────────────────────────────────────────────────
│ ✓ peer            no conflicts
│ ⚠ envelope        MS-FOO-BAR closed; staging code re-opens it
│ ✓ lane            slot/branch/scope aligned
│ ⚠ related         FooEngine.ts staged but FooEngine.test.ts is unstaged
├──────────────────────────────────────────────────────
│ VERDICT: PROCEED_WITH_NOTES (2 warnings)
│
│ Next:
│   1. git add src/__tests__/FooEngine.test.ts  (or accept the WARN)
│   2. EITHER bump milestone scope tag in commit msg
│      OR flip MS-FOO-BAR back to in_progress via /envelope-sync --fix
│   3. /staged-sanity (re-verify) → then git commit
└──────────────────────────────────────────────────────
```

### Step 8 — (if --output-json) write report (atomic temp+rename)
```jsonc
{
  "schemaVersion": 1,
  "timestamp": "<ISO>",
  "chat": "<STABLE>",
  "slot": "<SLOT>",
  "branch": "<BRANCH>",
  "workdir": "<absolute>",
  "staged_count": <N>,
  "checks": {
    "peer":     { "status": "CLEAR|WARN|BLOCK", "details": { ... } },
    "envelope": { "status": "...", "details": { ... } },
    "lane":     { "status": "...", "details": { ... } },
    "related":  { "status": "...", "details": { ... } }
  },
  "verdict": "PROCEED | PROCEED_WITH_NOTES | BLOCK",
  "blockers": [ "<reason>", ... ],
  "warnings": [ "<note>", ... ]
}
```

### Step 9 — Emit verdict JSON

## Implementation notes

- **No state mutation.** This skill never invokes `git commit`, never edits envelopes, never modifies claims. The operator is always in the loop.
- **/peer-file-isolation reuse:** Step 2 explicitly delegates to that skill (DRY). If `/peer-file-isolation` isn't installed yet (Phase B.2 not landed), the skill surfaces "peer check unavailable; install /peer-file-isolation" and proceeds with the other 3 checks.
- **Performance:** typical run <2 s (most cost is `/peer-file-isolation` JSON write + envelope JSON parsing). Suitable for `/loop 30s /staged-sanity` during long forge sessions.
- **Atomic JSON write:** use `fs.writeFile(.tmp)` + `rename` for `STAGED_SANITY_REPORT.json` — multi-chat readers must never see partial JSON.
- **Worktree detection:** `git rev-parse --git-dir` returns the worktree's git dir (e.g. `H:/prism/.git/worktrees/<name>`), not `.git`. Use this to detect "am I in the main tree?" reliably.
- **Companion runtime hooks NOT replaced:**
  - `commit-ownership-guard.mjs` — still runs at PreToolUse:Bash on `git commit`
  - `file-claim-commit-guard.mjs` — still runs
  - `staged-pretest-guard.mjs` — still runs
  - This skill is the proactive scan that catches the same issues BEFORE the bash invocation. Both layers are intentional.

## What this skill does NOT do

- Does NOT run `git commit`
- Does NOT auto-stage related test files (it surfaces; operator stages)
- Does NOT flip envelope status (use `/envelope-sync` per Phase B.5 once shipped)
- Does NOT release peer claims (use `/checkin` / `agent-coordination.mjs release`)
- Does NOT replace the runtime PreToolUse:Bash commit gates

## Examples

### Example 1 — vanilla pre-commit dry-run
```
/staged-sanity
```
Runs all 4 checks. Most common usage.

### Example 2 — just the peer check (already passed envelope / lane recently)
```
/staged-sanity --check=peer
```
Useful when you already ran /checkin 30 seconds ago and just want the conflict scan against your fresh stages.

### Example 3 — looping during a long /forge session
```
/loop 30s /staged-sanity
```
Every 30 seconds, scan staged. Catches "I staged this 5 minutes ago and never committed; peer just claimed it" within one loop cycle.

### Example 4 — pre-handoff verification
```
/staged-sanity --output-json
# then /handoff reads STAGED_SANITY_REPORT.json to verify nothing was left in a half-committed state
```

### Example 5 — explain reasoning per check
```
/staged-sanity --explain
```
Adds a "why" line under each check — useful when teaching a new chat what the gate covers.

## See also

- `.claude/hooks/commit-ownership-guard.mjs` — runtime PreToolUse:Bash gate (the hard block this skill proactively avoids)
- `.claude/hooks/file-claim-commit-guard.mjs` — runtime PreToolUse:Bash gate
- `.claude/hooks/staged-pretest-guard.mjs` — runtime test-coverage gate
- `.claude/commands/peer-file-isolation.md` — Phase B.2 — Step 2 delegate
- `.claude/commands/envelope-sync.md` — current sibling (read-only); Phase B.5 will add `--fix`
- `.claude/commands/checkin.md` — broader fleet check; this skill is the commit subset
- `state/shared/MILESTONE_PROGRESS.json` — drift data consumed by Step 3
- `state/shared/SKILL-AUTO-TRIGGER-PLAN.md` Phase B.3 — this skill's milestone
- [[feedback_roadmap_close_out]] — broader close-out doctrine; staged-sanity is the commit-subset
