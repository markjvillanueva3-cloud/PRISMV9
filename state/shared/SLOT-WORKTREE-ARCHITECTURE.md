# SLOT-WORKTREE ARCHITECTURE — structural chat isolation

**Status:** design · proposed 2026-05-14 by claude-f4388359 (slot alpha)
**Replaces:** WORKTREE-CONSOLIDATE-MS0's "land stranded commits into shared tree" framing
**Why:** the same shared-tree pain (index.lock races, peer-file auto-staging,
5,481-file dirty noise, 47 stale worktrees, 3 leaked stashes) keeps recurring
because there is no structural separation between chats. This replaces
recovery tooling with prevention.

---

## Goal

≥8 chats can `git commit` simultaneously with **zero serialization** and
**zero cross-contamination**, and the git tree stays organized indefinitely
because each chat is structurally unable to touch another chat's lane.

---

## Architecture

### One worktree per slot, one branch per worktree

| Slot | Worktree | Branch | Role |
|---|---|---|---|
| alpha | `H:/prism-slot-alpha` | `slot/alpha` | work slot 1 |
| bravo | `H:/prism-slot-bravo` | `slot/bravo` | work slot 2 |
| charlie | `H:/prism-slot-charlie` | `slot/charlie` | work slot 3 |
| delta | `H:/prism-slot-delta` | `slot/delta` | work slot 4 |
| echo | `H:/prism-slot-echo` | `slot/echo` | work slot 5 |
| foxtrot | `H:/prism-slot-foxtrot` | `slot/foxtrot` | work slot 6 |
| golf | `H:/prism-slot-golf` | `slot/golf` | hygiene slot |
| hotel | `H:/prism-slot-hotel` | `slot/hotel` | work slot 7 (new) |
| india | `H:/prism-slot-india` | `slot/india` | work slot 8 (new) |
| _(extensible to N)_ | `H:/prism-slot-<NATO>` | `slot/<NATO>` | _juliet/kilo/lima/…_ |

`H:/PRISM` (main) is `cad-fusion-live-ms0` and becomes **integration-only** —
slot chats READ it (for rebase + reference) but never WRITE to it.

### Why 8+ concurrent commits truly parallelize

Each `git commit` touches:

| Lock | Scope | Shared between slots? |
|---|---|---|
| `.git/worktrees/<wt>/index.lock` | **per-worktree** | no — N independent indexes |
| `.git/refs/heads/slot/<name>.lock` | **per-branch** | no — each slot writes its own |
| `.git/objects/*` | content-addressed by SHA | no — different objects, parallel-safe by design |
| `.git/HEAD` | only touched on `checkout`/`switch` | not touched during `commit` |
| `.git/packed-refs` | only touched by `git pack-refs` | not touched during `commit` |

The ONLY shared lock during a commit is the per-branch ref lock — and each
slot writes its own branch. **No contention between simultaneous commits
across slots, by design.**

### The integrator path

Slot branches advance independently. To get work onto `cad-fusion-live-ms0`:

1. **Rebase** — each slot rebases `slot/<name>` onto `origin/cad-fusion-live-ms0`
   periodically (cron, or `/checkin`, or on demand). Rebase happens IN the
   slot's worktree against an updated remote-tracking ref — no shared lock.
2. **Land** — once a slot's branch is clean + green, the **integrator role**
   (initially golf, later optionally rotating) fast-forwards
   `cad-fusion-live-ms0` from `slot/<name>` in the main `H:/PRISM` tree. This
   is the ONLY operation that touches the main tree's index/refs. It's
   single-threaded by definition and uses `coord-sqlite` to mint a
   "main-tree-integration-token" so even two operators can't race.

### What's enforced by hooks (the prevention layer)

1. **`worktree-commit-route.mjs`** (currently DORMANT — activate). Rejects
   any `git commit` from a path that doesn't match the slot's worktree. A
   chat claiming slot `alpha` can ONLY commit from `H:/prism-slot-alpha`.
2. **`git-add-lane-guard.mjs`** (NEW). Refuses `git add <path>` if `<path>`
   resolves outside the slot's lane. Closes the "peer files auto-staged
   into my commit" class of bug at the source.
3. **`main-tree-write-block.mjs`** (NEW). Hard-refuses any Edit/Write to
   `H:/PRISM/**` from a chat whose slot is not `integrator`. Same idea as
   `golf-slot-write-allowlist.mjs` but inverted: golf is unrestricted on
   the main tree, slot chats are blocked.
4. **`worktree-checkout-route.mjs`** (NEW). When a slot chat starts, the
   `/startup` skill auto-cd's into the slot's worktree if it isn't already
   there. Eliminates "I forgot to switch trees" mistakes.

### What stays the same

- The 7-slot NATO claim system (`chat-slots.json`) — unchanged. Just gains a
  one-line "expected worktree path" derivation: `H:/prism-slot-<slot>`.
- The handoff protocol — unchanged. Handoffs already live in `state/shared/`
  (a shared resource accessed via append-only filenames). Now the file gets
  WRITTEN from the slot's worktree, but the path is the same.
- The chat bus + coordination store — unchanged. They're shared-resource
  services already designed for concurrent access.
- The 3-of-3 scrutiny gate — unchanged. Runs in the slot worktree against
  the slot's diff.
- The autonomous loops, /pick-unit, /checkin, etc. — unchanged behavior, just
  always run from the slot worktree.

---

## Migration from today's 48-worktree state

### Phase 0 — Bootstrap (one commit from main, then never again)

The architecture itself is the first thing that lands. Single commit on
`cad-fusion-live-ms0`, made from `H:/PRISM` (the last legitimate commit from
main). Contents:

- `state/shared/SLOT-WORKTREE-ARCHITECTURE.md` (this doc)
- `scripts/slot-worktree-bootstrap.mjs` — creates the 8 slot worktrees
- `scripts/slot-worktree.mjs` — runtime manager (enter/status/rebase/repair)
- `.claude/hooks/git-add-lane-guard.mjs` (off by default; opt-in via env)
- `.claude/hooks/main-tree-write-block.mjs` (off by default; opt-in)
- Activation of `.claude/hooks/worktree-commit-route.mjs` (was dormant)
- Update CLAUDE.md §LANE DISCIPLINE to point at this doc

After this commit lands and is pushed, the new rules apply to the next
SessionStart in every chat.

### Phase 1 — Stand up the 8 canonical slot worktrees

Operator runs once:
```bash
node scripts/slot-worktree-bootstrap.mjs --slots alpha,bravo,charlie,delta,echo,foxtrot,golf,hotel
```
For each slot:
1. `git worktree add H:/prism-slot-<name> -b slot/<name> origin/cad-fusion-live-ms0`
2. Create a junction `H:/prism-slot-<name>/node_modules → H:/PRISM/node_modules`
   (Windows `mklink /J`) so vitest works without npm-install × 8
3. Create a junction `H:/prism-slot-<name>/mcp-server/node_modules → H:/PRISM/mcp-server/node_modules`
4. Push `slot/<name>` to origin
5. Record in `state/shared/slot-worktrees.json`

`node_modules` junctions are a known compromise — they share between slots
which means a `package.json` change requires fleet-wide coordination. Given
package.json changes are rare and ALREADY require coordination, the
simplification is worth it. (Alternative: pnpm content-addressable store —
larger migration, defer.)

### Phase 2 — Drain the 40 non-canonical worktrees

For each of the 40 existing non-canonical worktrees (the audit identifies
them — `WORKTREE-AUDIT-2026-05-14.md`):

- **PRUNE (1 worktree: prism-awareness-mega)** — `git worktree remove`, tag-archive the branch (per "never delete, only disable"), done.
- **KEEP (27 worktrees: live activity / live owner)** — wait for the owner
  chat to complete its milestone, then drain (cherry-pick stranded commits
  into the appropriate slot's branch via `cherry-pick-consolidator.mjs`,
  prune the worktree). Soft deadline: by end of the next 2 weeks.
- **INVESTIGATE (20 worktrees)** — operator-by-operator triage. Use the
  consolidator's dry-run to see what's stranded; decide per-tree:
  cherry-pick salvage vs. archive-tag-and-prune.

The `audit-worktrees.mjs` + `cherry-pick-consolidator.mjs` I built this
session are EXACTLY the migration tooling for this phase. They don't
become useless under Option A — they're the once-per-tree migration tool,
then retire.

### Phase 3 — Lock the door

Once the fleet is on slot worktrees:

1. Flip `git-add-lane-guard` and `main-tree-write-block` from opt-in to
   on-by-default.
2. The `cleanup-orchestrator` cron task adds a new check: fail if any
   non-canonical worktree exists.
3. The integrator role rotates monthly (or is permanently golf, TBD).

---

## Resolved design decisions (2026-05-14)

1. **node_modules sharing → junction.** Windows `mklink /J` from each
   slot worktree to the main tree's `node_modules` + `mcp-server/node_modules`.
   Simple, zero extra disk, works without admin. The cost (package.json
   changes need fleet-wide coordination) is already a coordinated event.
   A pnpm content-addressable store is a proper future-state but a
   separate roadmap; not blocking Phase 0.
2. **Integrator role → permanently golf.** Golf is already the hygiene
   slot (`golf-slot-write-allowlist.mjs`, no feature work). Owning the
   fast-forward of `cad-fusion-live-ms0` from cleared `slot/*` branches
   aligns with the hygiene role. Rotation adds coordination overhead
   without clear benefit; defer rotation until/unless golf becomes a
   bottleneck.
3. **Slot count → 8 work + 1 hygiene = 9 total.** alpha, bravo, charlie,
   delta, echo, foxtrot, **golf** _(hygiene/integrator)_, **hotel** _(new
   work slot)_, **india** _(new work slot)_ — matches the "up to 8 chats
   committing at once" requirement (alpha + bravo + charlie + delta + echo
   + foxtrot + hotel + india = 8 work-capable slots; golf integrates
   asynchronously). Adding a 10th later is one CLI flag.
4. **`prism-merge-staging` → drain into `slot/golf` then prune.** The
   2026-05-06 session's merge-staging worktree carries 874 stranded
   commits ahead of `cad-fusion-live-ms0`. Cherry-pick (via the
   consolidator) into `slot/golf`'s branch, fast-forward into
   `cad-fusion-live-ms0` as the standard integrator path, then
   `git worktree remove H:/prism-merge-staging` + archive-tag the branch
   per "never delete, only disable." Phase 2 work, not Phase 0.
5. **Slot binding across sessions → no change.** `chat-slots.json` already
   binds chatId↔slot↔branch↔topic with heartbeats + reclaim. The slot
   worktree path is derived from slot name (`H:/prism-slot-<name>`); no
   new state file needed.

### Acceptance gate before Phase 1 hooks flip from opt-in to default-on

- All 9 slot worktrees exist and are recorded in `state/shared/slot-worktrees.json`
- `cad-fusion-live-ms0` lands a Phase 0 commit announcing the architecture
- At least one slot chat has successfully committed FROM its slot worktree
- The audit at `WORKTREE-AUDIT-<date>.md` shows non-canonical worktree
  count is decreasing (Phase 2 in motion)
- `cleanup-orchestrator` adds a check for unknown worktrees (Phase 1 task)

---

## Failure modes considered

| Failure | What happens | Mitigation |
|---|---|---|
| Slot worktree corrupted | One slot down; others unaffected | `slot-worktree.mjs repair <slot>` recreates from origin |
| Operator forgets to cd into slot worktree | First `git add` from main-tree is blocked by hook | `worktree-checkout-route.mjs` auto-cd's; hook is the safety net |
| package.json change ripples | Junction-shared node_modules go inconsistent across slots | Designate `npm install` as an integrator-only operation; broadcast via chat bus |
| Integrator can't keep up | `cad-fusion-live-ms0` lags slot branches | Slots can READ from other slots' branches for ref; landing latency is the only impact |
| Disk usage | 8 × repo tree = ~few GB | Each slot's working tree is the source-only checkout; node_modules junctioned; objects shared in `.git`. Total overhead ~2-3 GB |
| `git worktree list` slow on 8 trees | Should be fine; was fine on 48 | Re-check post-bootstrap |
| Hooks fire from wrong worktree | Existing hook system uses absolute paths; no change | n/a |

---

## What this is NOT

- NOT a process-level coordination system (the existing `chat-slots.json` +
  coord-sqlite handle that and stay)
- NOT a replacement for the 3-of-3 scrutiny gate (runs in the slot)
- NOT a migration of physical processes — chats are still chats, hooks are
  still hooks. Only the WORKING DIRECTORY changes.
- NOT a deletion of any existing worktree — every existing worktree is
  drained via cherry-pick-consolidator before its working tree is pruned.

---

## Open question for the operator

Before Phase 0 commits: confirm slot count, integrator role, and node_modules
strategy. Defaults proposed above.
