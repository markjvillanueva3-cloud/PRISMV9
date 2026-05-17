---
unit_id: U-PRECOMMIT-PATHSPEC-ONLY
milestone: JULIETT-12CHAT-ALLOCATION-MS0
owner_slot: echo
wave: W1
cost: S
status: pending
peer_claims_check_at: 2026-05-17T00:00:00Z
tool_plan_ref: pending-rgs-build
depends_on: []
unblocks: [prevents-6th-collateral-staging-incident]
roi_score: 8.5
generated_at: 2026-05-17
generator_version: hand-written-v1
---

# U-PRECOMMIT-PATHSPEC-ONLY

## Goal
Add a pre-commit hook (.git/hooks layer or pre-commit.d/) that REJECTS `git add -A` / `git add -a` / `git add .` / `git add --all` when other chats have active file-claims on the same files. **Doctrine driver:** 5 collateral-staging incidents in 48h ([[reference_misc_tasks_extraction_2026_05_16]] §Recent regressions class). Chats use `git add -A` defensively but absorb peer work.

**Acceptance:** `git add -A` while peer claims active → REJECTED with helpful error listing claimed files + recommend explicit pathspec. `git add <explicit-path>` always allowed.

## Activate (do-not-build)
- `.git/hooks/pre-commit` (existing chain hook)
- `state/shared/AGENT_CHAT.jsonl` (chat-bus claim reader — same pattern as `chat-bus-inject.mjs`)
- `H:/prism/.claude/helpers/chat-slots.mjs` (slot identification)
- `H:/prism/.claude/hooks/git-add-lane-guard.mjs` (sibling pattern; case-insensitive path compare per 2026-05-16 fix)
- `H:/prism/.claude/hooks/worktree-commit-route.mjs` (sibling worktree-aware gate)

## Build (net-new)
ONE new pre-commit guard `H:/prism/.git/hooks/pre-commit.d/05-pathspec-only.sh` (or `.mjs`):
- Hook fires on `git commit` (NOT `git add` — git's add hooks are unreliable on Windows)
- Inspects `git diff --cached --name-only` (staged files)
- Reads `state/shared/AGENT_CHAT.jsonl` last 50 lines for active file-claims by OTHER chats
- If any staged file matches a peer-claim path → REJECT with explanation + recommended `git reset <path>` commands
- Knob: `PRISM_PATHSPEC_ONLY_DISABLE=1` (emergency bypass; logged to `state/shared/pathspec-bypasses.jsonl`)
- Self-chat exempt: if claim is by THIS chat's slot, allow

## Files-touched
- `H:/prism/.git/hooks/pre-commit.d/05-pathspec-only.sh` (Write, new) OR `.mjs` if shell incompat with Windows
- `H:/prism/scripts/pathspec-only-guard.mjs` (Write, new — testable lib that the hook shim invokes)
- `H:/prism/scripts/pathspec-only-guard.test.mjs` (Write, new)

## Pre-flight
1. Claim: `node H:/prism/.claude/helpers/slot-task-claim.mjs claim --slot echo --chatId <id> --unitId JULIETT-12CHAT-ALLOCATION-MS0::U-PRECOMMIT-PATHSPEC-ONLY`
2. `Read .git/hooks/pre-commit` (existing chain)
3. `Read .claude/hooks/git-add-lane-guard.mjs` + `worktree-commit-route.mjs` (siblings; verify no overlap)
4. Check chat-bus claim file: `prism_context:chat_post { kind:"claim", path:"H:/prism/scripts/pathspec-only-guard.mjs", ttlMin:30 }`

## Test plan
- Stage own-claim file → allow (chat's own slot)
- Stage peer-claim file → reject with explicit error message naming peer chat
- Stage mix of own + peer → reject with per-file breakdown
- Stage with no peer claims → allow
- Knob disabled → allow + log to bypass ledger
- Real-data: simulate `git add -A` while peer has 3 active claims → reject; `git add <single-non-peer-file>` → allow
- Cross-platform: Windows PowerShell parent invocation works (echo's prior commit suggests this is a common surface)

## Wiring
- Symlink or copy to `.git/hooks/pre-commit.d/05-pathspec-only.sh`
- If `.git/hooks/pre-commit` doesn't chain to `pre-commit.d/`, add a chainer (echo to verify if existing setup chains)

## Test-shipped-criteria
- `node --test H:/prism/scripts/pathspec-only-guard.test.mjs` all pass
- Smoke: with a peer-claim active in AGENT_CHAT.jsonl, `git add -A && git commit -m "test"` rejects pre-commit
- `git add <explicit-non-peer-path> && git commit -m "test"` succeeds
- `state/shared/pathspec-bypasses.jsonl` exists (empty initially)

## Rollback
- Knob `PRISM_PATHSPEC_ONLY_DISABLE=1` (immediate)
- Remove from `.git/hooks/pre-commit.d/` or rename to `.disabled` (per [[feedback_never_delete_only_disable]])
- Lib script preserved

## References
- [[reference_misc_tasks_extraction_2026_05_16]] §Recent regressions — 5 collateral-staging incidents in 48h
- [[feedback_conflict_fork_rule]] — fork rule when shared-tree contention high
- [[reference_dev_tools_audit_meta_scripts_2026_05_17]] — echo's recent META artifacts pattern
- A8 NEW UNIT origin: U-PRECOMMIT-PATHSPEC-ONLY
- V1 allocation §2 W1 row + §3 echo assignment
- Sibling hook: `git-add-lane-guard.mjs` (case-insensitive path compare — same domain, different gate)
