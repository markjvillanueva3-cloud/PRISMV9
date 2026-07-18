---
name: commit-message-conventions
category: software-engineering
domain: backend-dev
tags: [git, commits, conventions, automation, hooks, slot-claims, milestone-progress, prism-development]
last_updated: 2026-05-18
---

# Commit Message Conventions — the subject is a machine-readable contract

PRISM commit subjects are not free-form. Three downstream systems parse the subject string: the `.git/hooks/post-commit` hook (auto-releases `slot-task-claim` entries), `build-milestone-progress.mjs` (credits shipped units to milestone envelopes), and the `worktree-commit-route` PreToolUse hook (decides whether to allow the commit on the current tree). Wrong subject = silent close-out debt, dangling claims, or a blocked commit. This wiki is the canonical format spec + scope vocabulary + the hook-parsing rules that make it load-bearing.

## The canonical format

```
[<SCOPE>]/<UNIT-ID>: <terse title — present tense, no period>
```

Examples that parse correctly:

- `[CAMX-MS0.3]/U-CAMX22-VISIBLE-SKIP: sync AutoSpeedFeed in PrintToProgram pipeline`
- `[MAIN] [HIGH-VALUE-WIKI]/U-PARALLEL-TOOL-DISCIPLINE: parallel-tool-call-discipline wiki`
- `[MAIN] [TSC-FIX]/MachiningPlaybook+PlaybookRules: add getAllRules() canonical API (-1)`
- `[FLEET-REAPER-MS1]/U-FR-TIER1-AGGRESSIVE-THRESHOLDS: graduated pressure gate`

Examples that BREAK the parsers:

- `fix bug in cam dispatcher` → no scope, no U-ID → unclaimed by milestone-progress, slot-task-claim never auto-releases
- `WIP cam stuff` → no scope, no U-ID, plus the WIP-class is an anti-pattern by itself
- `[CAMX] fix some things` → has scope but no U-ID → milestone-progress can't credit
- `MAIN: [TSC-FIX]/U-X: ...` → bare `MAIN:` (no brackets) — `worktree-commit-route` does not see the [MAIN] override

## What each piece means

### `[SCOPE]` — the milestone or work-stream tag

Always in square brackets. Conventional choices:

| Pattern | Meaning | Example |
|---|---|---|
| `[<MILESTONE>-MS<N>]` | Milestone unit | `[FLEET-REAPER-MS1]`, `[CAMX-MS0.3]` |
| `[<MILESTONE>-MS<N>.<sub>]` | Sub-milestone unit | `[OBSIDIAN-INTELLIGENCE-MS3]` |
| `[BACKEND-DEV-LOOP]` | Generic backend-dev iteration | `[BACKEND-DEV-LOOP]/U-UKP01-DOCS` |
| `[TSC-FIX]` | TypeScript-error reduction unit | `[TSC-FIX]/file-with-error: -N` |
| `[HIGH-VALUE-WIKI]` | High-leverage wiki ship | `[HIGH-VALUE-WIKI]/U-FLEET-COORDINATION-DISCIPLINE` |
| `[MAIN]` (override prefix only) | Force-route to main tree | `[MAIN] [SCOPE]/U-ID: ...` — see "[MAIN] semantics" below |

If you're shipping under an existing milestone, use that milestone's canonical scope tag (read recent commits to learn it — `git log -10 --oneline | head -10` shows the active vocabulary). Don't invent a new tag for one-off work that fits an existing scope.

### `/U-<ID>` — the unit identifier

The U-prefix is the convention; the body is short-kebab-case or short-CAPS-DASH. Conventional shapes:

- `U-CAMX22-VISIBLE-SKIP` — milestone unit ID
- `U-FR-TIER1-AGGRESSIVE-THRESHOLDS` — milestone-internal unit
- `U-CK11` — short-coded milestone unit
- `U-PARALLEL-TOOL-DISCIPLINE` — descriptive (one-off ship)
- `U-SDF13` — short-coded series

`build-milestone-progress.mjs` matches the SHIPPED set against milestone envelope `units[]` IDs. If your U-ID doesn't appear in the envelope, the credit doesn't land — silent close-out debt ([[silent-close-out-drift]]). For non-envelope work, use a descriptive U-ID (`U-PARALLEL-TOOL-DISCIPLINE`) so the audit can pattern-match it later.

The `.git/hooks/post-commit` `slot-task-claim` auto-release matches `[SCOPE]/U-<ID>` on the subject line — if either is missing, the claim stays held until the slot manually releases or a heartbeat lapses.

### `: <title>`

Present tense imperative. ~80 chars or less for the subject; longer descriptions go in the body. Mention the deliverable, not the activity ("add getAllRules() canonical API" not "added some methods").

For TS-error reductions, the `(-N)` suffix is a count contract: how many TS errors this commit eliminates. Audit scripts grep for these.

## `[MAIN]` semantics — override prefix only

`[MAIN]` is a PREFIX, not a scope. It means "this commit applies to the main `H:/prism` tree, not the slot worktree, and the `worktree-commit-route` PreToolUse hook should let it through unrouted." It is followed by the regular `[SCOPE]/U-ID: title`.

Use `[MAIN]` when:
- You're on the main tree (not yet slot-worktree-migrated) and the commit is genuinely cross-cutting (CLAUDE.md, MEMORY.md, knowledge/wiki/, root scripts/, root state/).
- You're on a slot worktree but explicitly need to route the change to main (rare; usually `/checkin-golf` integrator handles this).

Do NOT use `[MAIN]` when:
- You're in a slot worktree and the change naturally belongs to your slot branch — let the hook route it normally.
- You're trying to bypass a peer-claim guard or any other safety gate. `[MAIN]` is a routing hint, not a privilege escalation.

Format note: `[MAIN]` is literal — `MAIN:` or `[main]` or `[Main]` does NOT match the hook's parser. Use exact brackets + caps.

## How the post-commit hook parses

`.git/hooks/post-commit` reads `git log -1 --format=%s` and tests the subject against a `[SCOPE]/U-<ID>` regex. On match:

1. Looks up the matching entry in `state/shared/slot-task-claims.json`
2. Flips its phase forward (claimed → building → testing → committing → released)
3. Atomically rewrites the claims JSON

If the regex doesn't match, the hook silently does nothing. The claim sits indefinitely until the slot manually releases or a heartbeat-lapse reaper sweeps it (≥ 5 min stale per slot-task-claim policy).

You can verify the parse by checking after commit:

```bash
node H:/prism/.claude/helpers/slot-task-claim.mjs list --chatId claude-<my-id>
```

If the unit you just committed still appears as `committing` or earlier, the subject didn't parse.

## How `worktree-commit-route` parses

The PreToolUse hook reads the **raw command string** passed to Bash (not the rendered commit) and looks for:
- `[MAIN]` literal at subject start → allow on main tree
- otherwise, requires current branch matches `slot/<nato>` → routes to slot worktree
- otherwise blocks

**Critical:** the hook parses the raw shell command. If you use a shell variable for the message (`MSG="[MAIN] ..."; git commit -m "$MSG"`), the hook sees `$MSG` and does NOT see the `[MAIN]` prefix → BLOCK. Always use the literal inline form: `git commit -m "[MAIN] [SCOPE]/U-ID: title"`.

The hook also blocks `git commit -a` on shared trees that have peer-claimed files in the index — see [[fleet-coordination-discipline]] cross-tree commit collision class. Use `git commit -- <pathspec>` to clamp.

## Body conventions

The commit body (lines after the subject) is free-form but a few practices compound:

- **TL;DR first.** A one-paragraph why-this-matters. Audit tools and humans both grep here first.
- **Test counts.** "N/N PASS" or "+M tests" so audit scripts can extract test-delta.
- **Surface-affected list.** `Files: X.ts, Y.test.ts, Z.md` — speeds up cross-reference.
- **Per-file scrutiny verdicts** when applicable. "Reviewer A PASS, Reviewer B FAIL→FIXED (P1 ...)" so the audit trail records the gate outcome.
- **`Co-Authored-By:`** when an AI/agent did meaningful work; CLAUDE.md global instruction includes the line: `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>`.

What NOT to put in the body:
- Inline physics constants (rejected by hooks; canonical-only).
- Stub-completion claims for incomplete work (R12 fail-loud — say what's not done).
- "Misc fixes" without a list.

## Anti-patterns

- **Missing `[SCOPE]/U-ID`** → milestone-progress can't credit + slot-task-claim doesn't auto-release. Both are silent failures.
- **`MAIN:` instead of `[MAIN]`** → bracket-less form does not parse; routing hook blocks.
- **`$MSG` shell variable for `-m`** → hook parses raw command; the prefix is invisible inside `$MSG`.
- **`git commit -a` on shared `H:/prism`** → sweeps peer-staged files under your banner (the cross-tree class).
- **Banner mismatch from commingle** — your file lands in a peer's commit. Don't rewrite history (downstream-visible); log a `reference_*_misattribution_*` memory naming the SHA + real unit ([[reference_cross_chat_commit_misattribution_2026_05_18]]).
- **`fixup!` / `squash!` chains on shared branches** — rebase coordination across 13 chats is impractical. Land discrete commits.
- **Title written in past tense** — "added X" is harder to parse than "add X" (and inconsistent with the conventional-commits world).
- **Reusing a U-ID across commits without continuation suffix** — if you legitimately have a multi-commit unit, use `U-X (iter 2)` or `U-X-FOLLOWUP` so the audit credits each separately.

## Pre-flight checklist — before every commit

- [ ] Subject starts with `[<SCOPE>]/U-<ID>:` (or `[MAIN] [<SCOPE>]/U-<ID>:` if main-tree override needed)?
- [ ] `[MAIN]` is literal (exact brackets + caps), not shell-variable-wrapped?
- [ ] U-ID exists in the milestone envelope OR is descriptive enough for audit pattern-match?
- [ ] Title is present-tense imperative, <80 chars?
- [ ] If `-N` count-contract claimed: actually `-N` net?
- [ ] No peer files in the staged set (`git diff --cached --name-only` matches what I intended)?
- [ ] On shared tree: pathspec clamp via `-- <files>`?
- [ ] Body has TL;DR + test-counts + surface-list when applicable?

## Recipe — the canonical commit invocation

```bash
# Stage only your files (one at a time if the lane-guard is jumpy):
git add <file-1>
git add <file-2>

# Verify the cached set matches what you intend:
git diff --cached --name-only

# Commit with literal -m + pathspec clamp:
git commit \
  -m "[MAIN] [SCOPE]/U-ID: title

  TL;DR: one-paragraph why-this-matters.

  Tests: N/N PASS · +M cases.
  Files: X.ts · Y.test.ts · Z.md.
  Scrutiny: Reviewer A PASS, B PASS.

  Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>" \
  -- <file-1> <file-2>

# Verify the parse landed:
git log -1 --format="%H %s"
node H:/prism/.claude/helpers/slot-task-claim.mjs list --chatId claude-<me>
```

## Related

- [[fleet-coordination-discipline]] — pathspec commit + the cross-tree collision class
- [[git-shared-index-hazards]] — index.lock retry patterns
- [[silent-close-out-drift]] — what happens when U-IDs don't match envelopes
- [[reference_per_slot_claim_ms0_2026_05_16]] — slot-task-claim auto-release mechanics
- [[reference_cross_chat_commit_misattribution_2026_05_18]] — what to do when your work lands under a peer banner
- CLAUDE.md "Commit format: `[SCOPE]/U-ID: title`" — the doctrine pointer
- `.git/hooks/post-commit` — the parser source of truth
- `scripts/build-milestone-progress.mjs` — milestone-credit reconciliation
