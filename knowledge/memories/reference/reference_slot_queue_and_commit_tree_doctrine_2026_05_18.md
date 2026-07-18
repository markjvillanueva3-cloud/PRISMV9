---
name: reference-slot-queue-and-commit-tree-doctrine-2026-05-18
description: "Each chat slot has its OWN task queue (state/shared/slot-task-queues.json) AND its OWN commit tree (H:/prism-slot-<name> on slot/<name> branch). Slot binding via /checkin-<nato> wires both together — the queue is what /loop picks from, the tree is where commits land."
aliases: reference_slot_queue_and_commit_tree_doctrine_2026_05_18
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.207Z
---


# Doctrine — each chat slot owns its task queue AND its commit tree

Operator directive 2026-05-18 (slot=golf, claude-b23a56ef): "each chat slot should have a task queue ... make a memory or wiki about each chat slot having its own task queue and commit tree."

This pulls together two pieces of architecture that already exist but were not previously documented as a single pattern:

1. **Per-slot task queue** — `state/shared/slot-task-queues.json` (schema 1.1.0)
2. **Per-slot commit tree (worktree + branch)** — `H:/prism-slot-<nato>` on `slot/<nato>` branch

The slot binding (via `/checkin-<nato>` or bare `/checkin --preferSlot <nato>`) wires both together. They're not parallel; they're complementary.

## The 13 slots

`alpha · bravo · charlie · delta · echo · foxtrot · golf · hotel · india · juliett · kilo · lima · mike`

- 12 work slots (alpha..foxtrot + hotel..mike) — claim with `/checkin-<nato>`
- 1 hygiene slot (golf) — owns the [[reference_fleet_reaper|fleet-reaper]] + [[reference_fleet_memory_monitor_2026_05_16|fleet-memory-monitor]] + cleanup orchestrators (doctrine moved alpha→golf 2026-05-16 per [[feedback_golf_owns_reaper]])

## Layer 1 — per-slot task queue

**File:** `state/shared/slot-task-queues.json`
**Reader:** `scripts/slot-queue.mjs --pick --slot <nato> --chatId <stable-id>`
**Schema:** `queues[<slot>][]` is an array of unit objects; each unit has:

```json
{
  "unit_id": "U-<TOPIC>-<NN>",
  "wave": "P0 | P1 | P2 | W0..W4 | DEV-INFRA | ...",
  "cost": "XS | S | M | L | XL | ?",
  "spec": "<file path | pending-generator>",
  "depends_on": ["U-..."],
  "summary": "<one-paragraph what + why>",
  "milestone": "<MILESTONE-NAME>",
  "source_roadmap": "<where this came from>",
  "peer_claim_risk": "<optional — peer chat that owns the file>",
  "tier_hint": 0
}
```

**Doctrine line (from the file itself):** "Each slot's queue IS that slot's /goal when invoked via /checkin-<nato>. Slot consumes queue head-to-tail; /loop exits when queue empty (after dep-blocked units recheck). Items priority-ordered by wave (W0→W1→W2→W3→W4→synergy) within each slot. Cross-slot dependencies surface via depends_on array. Already-shipped (MILESTONE_PROGRESS) and peer-claimed (slot-task-claims) filtered automatically by scripts/slot-queue.mjs --pick."

**Operator workflow (from the file itself):**

1. `/checkin-<nato>` → slot binds + reads its queue + auto-engages /loop
2. `/loop` iterates → pick next eligible unit (not shipped, not peer-claimed, deps met)
3. build + per-file scrutiny + commit
4. tick loop-state → repeat
5. queue exhausted → `/loop` ends gracefully → `/handoff`

## Layer 2 — per-slot commit tree (worktree + branch)

**Worktree:** `H:/prism-slot-<nato>` (sibling of `H:/prism` main tree)
**Branch:** `slot/<nato>`
**Activation:** `/checkin` Step 2c migrates onto the slot worktree once `chat-slots.json[slot].branch` starts with `slot/`
**Enforcement hooks** (default-on, arm per-chat once slot branch is `slot/*`):

- `worktree-commit-route` — routes `git commit` from `H:/prism` to the slot worktree
- `git-add-lane-guard` — prevents `git add` from staging files outside the slot's lane
- `main-tree-write-block` — blocks Edit/Write into `H:/prism` once bound to a slot tree (golf is exempt — golf is the integrator)

**Integration path:** slot/<nato> branches integrate into `cad-fusion-live-ms0` (the main shared branch) via golf — see [[reference_slot_worktree_activation_2026_05_16]].

## How they wire together

```
/checkin-mike
    ├─→ Layer 1: claim slot=mike + read queues.mike from slot-task-queues.json
    │     └─→ /loop picks next eligible unit
    │           └─→ scripts/slot-queue.mjs --pick --slot mike
    │
    └─→ Layer 2: bind chat-slots branch=slot/mike
          └─→ worktree-commit-route arms → commits land at H:/prism-slot-mike
                └─→ commit format: [SLOT-MIKE] [SCOPE]/U-ID: title
                      └─→ slot/mike branch grows independently of main tree
```

The pipeline is intentionally redundant — Layer 1 picks WHAT to work on; Layer 2 ensures the work LANDS in a slot-specific commit history. Either layer alone is insufficient:

- Queue without slot tree → all chats commit to the shared main, collide on the same files
- Slot tree without queue → chats have no task source; `/loop` exits immediately because nothing to pick

## Why this matters (the original failure mode)

Before the slot-worktree + slot-queue architecture, the 13-chat fleet ran into:

1. **Same-file commit collisions** — two chats editing CLAUDE.md or MEMORY.md simultaneously created repeated merge conflicts; the workboard's "lane discipline" rule was best-effort with no enforcement.
2. **Task-pickup ambiguity** — every chat read the same `atomic-roadmap.json` and the same `MILESTONE_PROGRESS.md`; nothing prevented two chats from picking the same unit.
3. **Handoff drift** — a chat's RESUME directive pointed at "the next thing in the master roadmap" but the master roadmap was a moving target across 13 concurrent chats.

The doctrine pinned both:
- **Layer 1** gives each slot its own pickup pool — no two slots see the same head-of-queue (modulo `depends_on` and the global shipped/claimed filters)
- **Layer 2** gives each slot its own commit graph — collisions surface as merge points at integration time (golf's job), not as midcommit lock contention

## Anti-patterns to avoid

- **Mixing slot queues** — don't merge another slot's queue into yours unless operator explicitly says so. Each queue is owned by its slot. (Exception: golf may consolidate orphan threads from any slot into a target slot, per [[HANDOFF-mike-golf-consolidation-2026-05-18]] — but that's an operator-directed move, not a default.)
- **Committing slot work to main tree** — once your slot is on `slot/<nato>`, the `worktree-commit-route` hook will route commits to the slot worktree. Don't fight it; that's the wiring.
- **Editing a peer-claimed file from the wrong slot tree** — the claim namespace (`file-claim-guard.mjs`) is global across all slot worktrees; a claim by another slot blocks your edit regardless of which tree you're in.

## Golf is the exception

Golf is the integrator — it's the only slot allowed to commit into the shared `cad-fusion-live-ms0` branch and to write to the main `H:/prism` tree. The `golf-slot-write-allowlist.mjs` hook still applies (legacy hygiene-mode allowlist) unless the operator opts in via `PRISM_GOLF_WRITE_ALLOWLIST_BYPASS=1`, but golf-as-work-slot is supported.

## Cross-refs

- [[reference_slot_worktree_activation_2026_05_16]] — Layer 2 activation history
- [[reference_per_slot_claim_ms0_2026_05_16]] — slot-task-claims (peer-claim filter for Layer 1)
- [[reference_juliett_12chat_allocation_2026_05_17]] — first big multi-slot queue population
- [[checkin-loop-fullstack-2026-05-16]] — the full pipeline contract
- [[feedback_golf_owns_reaper]] — golf's role + integrator exception
