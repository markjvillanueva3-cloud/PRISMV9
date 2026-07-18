---
title: Slot-worktree enforcement — documented-active, factually-inactive (fleet-wide gap)
domain: backend-dev
tier: lesson
created: 2026-05-18
created_by: claude-68aad091 (delta) — /loop iter20 audit per user directive
session: claude-68aad091
related:
  - architecture/slot-worktree-architecture
  - architecture/checkin-loop-fullstack
  - feedback_golf_owns_reaper
tags:
  - fleet-hygiene
  - enforcement
  - silent-degrade
  - operator-action
---

# Lesson — The slot-worktree enforcement is documented active but doesn't actually fire

## TL;DR

CLAUDE.md claims slot-worktree-MS0 has been live since 2026-05-16
(activation commits `b8dfbf208 + 912f10fff`). **In reality, 0 of 13 chat
slots are on `slot/` branches**, and the 3 enforcement hooks
(`worktree-commit-route` / `git-add-lane-guard` / `main-tree-write-block`)
correctly *no-op* because their arming condition is never met. Every chat
commits to the shared `H:/prism` main tree on `cad-fusion-live-ms0` despite
the doctrine saying otherwise. This is a doctrine-vs-reality drift class —
the hardest kind of bug because the docs say it works.

## Audit data (2026-05-18, delta /loop iter17-20)

User directive triggered this audit:
> "make sure the fleet system enforces each chat slot to stage their work
> in designated slot chats and commit to their own designated work tree"

| Layer | State | Note |
|---|---|---|
| Hook files on disk | ✅ all 3 built | worktree-commit-route 572 lines, git-add-lane-guard 458 lines, main-tree-write-block 281 lines |
| Bundle invocations | ✅ all 3 invoked | `bash-bundle.mjs` calls the first two; `edit-bundle.mjs` calls the third |
| Bundles wired in settings.json | ✅ both wired | bash-bundle at PreToolUse[10], edit-bundle at PreToolUse[8] |
| Arming condition | ⚠ **never met** | hooks read `chat-slots.<slot>.branch` and only enforce when it starts with `slot/` |
| `chat-slots.<slot>.branch` per slot | ❌ **0 of 13 slots on slot/** | 11 on `cad-fusion-live-ms0`, 2 unset (hotel/mike) |
| `H:/prism-slot-<nato>` worktrees | ❌ **0 of 13 registered** | All 13 dirs exist with ~54-60 files of leftover scratch, none have `.git` |
| `git worktree list` | ❌ **no `prism-slot-*` entries** | Only agent-* worktrees + 3 work/* are registered |

Net: enforcement is FULLY OFF fleet-wide. Every chat is in the shared tree
on main branch, with no per-slot isolation.

## Why this matters

Without enforcement, the silent-corruption modes the slot-worktree-MS0 was
designed to prevent are all live:

- **Peer-claim violations.** Chat A edits a file Chat B owns; only the
  `file-claim-guard` (a separate hook, PreToolUse[19]) catches it — and that
  guard fires AFTER edit-bundle.
- **Cross-slot commit pollution.** My own commit `b69d6ff273` accidentally
  swept in 3 lima peer files (`wiki-propagation-watchdog-stop.*`) because
  there was no worktree boundary to prevent it.
- **Conflict on shared branch.** Today's commit log shows 5+ chats pushing
  to `cad-fusion-live-ms0` simultaneously, generating constant merge work
  for golf integration.

## Root cause

The `/checkin` Step 2c cutover (documented in CLAUDE.md) is supposed to
migrate the chat onto its slot branch + slot worktree. **The cutover isn't
firing** — neither `/checkin` nor `/checkin-<nato>` skills include the
`git worktree add` invocation or the `chat-slots.<slot>.branch = slot/<nato>`
update. The skills only claim the slot + bind the topic; the migration step
is documented but unimplemented.

The skills' silent omission is the actual gap. The hooks are correct (they
correctly read state); the state is correct (it correctly reflects that no
chat ever migrated); the doctrine doc is the only thing out of sync.

## Recovery — what an operator needs to do

There is no quick paste-ready fix because per-slot worktree creation is
operator-disruptive (each `git worktree add` mutates the working state).
Two viable paths:

### Path A — one-time fleet bootstrap (one operator action)

From the main tree, with a clean working state:

```bash
for s in alpha bravo charlie delta echo foxtrot golf hotel india juliett kilo lima mike; do
  d="H:/prism-slot-${s}"
  if [ ! -d "$d/.git" ]; then
    # remove stray scratch files (after a manual backup if needed)
    rm -rf "$d"
    git -C H:/prism worktree add "$d" -b "slot/${s}" "cad-fusion-live-ms0"
  fi
done
# Then each chat must re-/checkin its slot to pick up the new branch field.
```

Then each slot's next /checkin would update `chat-slots.<slot>.branch =
slot/<nato>`, the hooks arm, enforcement starts firing.

### Path B — fix the skills to auto-bootstrap

Better long-term: extend `/checkin-<nato>` to detect missing worktree +
create on first claim + update chat-slots.branch. Idempotent. Per-chat
self-bootstrap; no fleet-wide operator step needed.

This is the unit `U-CHECKIN-WORKTREE-AUTO-BOOTSTRAP` (proposed, not yet
spec'd). Estimated 1-2 iters by a qualified slot-aware chat.

### Path C — accept the documentation drift

Edit CLAUDE.md to say enforcement is "designed but not activated" instead
of "live since 2026-05-16". Honest doc, no behavior change.

## Anti-patterns

- **Don't auto-create worktrees from inside a /loop iter.** Creating 13
  worktrees from a delta chat would (a) mutate other slots' working state
  and (b) potentially overwrite peer cwds. Operator action only.
- **Don't disable the hooks because they "don't do anything".** They DO
  the right thing — they just have nothing to enforce against until chats
  migrate. Disabling them removes the safety once migration lands.
- **Don't paper over by changing the hooks' arming condition.** Removing
  the `branch starts with slot/` check would force enforcement against
  chats on main, breaking every shared-tree workflow currently in use.

## Why I didn't ship the fix in this iter

R8 (read before write) + R12 (fail loud) + R10 (checkpoint after each
significant step). The fix requires either operator action (Path A),
careful skill edits with per-file scrutiny (Path B), or doctrine update
(Path C) — none of which fit safely in a /loop iter that's already at
target. Surfaced for the next chat to pick up.

## See also

- [[slot-worktree-architecture]] — full design doc
- [[checkin-loop-fullstack]] — the /checkin pipeline that's supposed to
  migrate but doesn't
- [[reference_slot_worktree_activation_2026_05_16]] — the doctrine claim
  that says it's live (factually outdated)
