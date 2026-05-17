---
name: obsidian-brain-fix-ms0
kind: architecture
shipped_in: OBSIDIAN-BRAIN-FIX-MS0
units: [U-OBF01, U-OBF02]
shipped_at: 2026-05-17
slot: bravo
last_edited: 2026-05-17
---

# OBSIDIAN-BRAIN-FIX-MS0 — close the topic-drift orphaning that made the brain "not aware"

## The user-reported failure

> *"we were supposed to have built an obsidian brain and memory system so we're always aware of everything but its clearly not working. what more do we have to do to get it to work?"*

Diagnosis traced the felt symptom ("you keep asking me to continue a bravo task queue that doesn't exist / you re-derive things / prior work is forgotten") to a concrete, proven mechanism — **not** a vague "memory is bad".

## Root cause (proven, not theorized)

Per-agent handoffs are **replace-not-merge**. Every `/compact` writes a fresh
`HANDOFF-<base>-<slot>-<topic>.md` carrying only THAT session's `## RESUME`.
The post-/compact resume-read path (`session-start-auto-resume.mjs` →
`per-agent-handoff.mjs read`) resolves the **newest** handoff for the chat
instance. When session N+1 works a different topic, session N's still-
unfinished RESUME is never read again — orphaned by topic-drift.

Confirmed live: the entire `HTML-COMPANION-MS0 → HTML-PRIMARY-MS0 →
MEMORY-SLOT-VIEW-MS0` queue (the "bravo task queue" the operator kept asking
to continue across three sessions) sat unread for days inside
`HANDOFF-claude-339c8ff7-bravo-html-stack.md` because three later sessions
compacted under other topics and none re-stated it. The brain wasn't
forgetting — the read path structurally could not see across topics.

Other confirmed-this-session failures of the awareness stack: MEMORY.md
perpetually at ~99.8% of the 24,576-byte truncation ceiling (watchdog only
*alerts*, never compacts → fleet-wide silent tail-loss); "done" assertions
in handoffs that weren't (SDF13-18 declared resolved while a heartbeat-cache
gap remained). U-OBF03 (MEMORY.md auto-compaction that *acts*) is the
remaining unit.

## What shipped

### U-OBF01 — `scripts/handoff-consolidate.mjs` (the data layer)

Per-SLOT open-threads merger. Walks `state/shared/handoffs/HANDOFF-*` for a
slot, extracts every non-placeholder `## RESUME` (and `## RESUME_LOOP`, and
the precompact `**Resume directive:**` shape), and writes
`state/shared/handoffs/consolidated/<slot>.md` containing every still-open
thread. A thread is dropped **only** when a unit id it names is found at a
token boundary in a `git log` commit subject — **fail-PRESERVE** on every
uncertainty (no unit ids / git unavailable / no match / unparseable slot /
write failure). The asymmetry is deliberate: keeping a shipped thread one
cycle longer is a stale bullet; dropping an unshipped thread is exactly the
orphaning bug. Output lives **outside** the `HANDOFF-*` glob namespace so
`per-agent-handoff.mjs`'s mtime-sort fallbacks can never select it as a
"handoff" and resume blind. Atomic tmp+rename, fail-soft on peer-lock,
per-slot growth cap with explicit elision count.

### U-OBF02 — wire into the resume-read path (`session-start-auto-resume.mjs`)

After the primary RESUME, `getConsolidatedSummary(slot, excludeFile)`
appends a **bounded** block: open-thread count + up to 5 newest headers +
the file path — never the full bodies (that would re-bloat context, the
opposite of the goal: pointer-not-payload). Throttled fresh-on-read
(regenerate only if the slot file is missing or >3 min stale; otherwise
pure read) so 13 chats compacting near-simultaneously do not each spawn a
`git log`. The just-read handoff is excluded from the headers so the
primary RESUME isn't echoed as "open thread 1". Total fail-soft: any
failure → `""` → primary auto-resume byte-preserved.

Live proof: a simulated post-/compact for `claude-339c8ff7` now surfaces
**"39 open cross-topic threads for slot bravo"** + newest headers + pointer
— the orphaned HTML queue (and 38 other forgotten threads) are now reachable.

## Per-file scrutiny record (the gate worked)

Both units went FAIL → fix → re-dispatch → PASS:

- **U-OBF01** round 1: P0 substring-collision (`U-OBF01` killed by `U-OBF010`),
  P1 `## RESUME_LOOP` never matched, P1 slot mis-attribution (first-NATO-token),
  P1 tmp-leak, P1 consumer-namespace collision, P2 pad-bleed / dedup-fail-DROP /
  unbounded. All fixed → round 2 BOTH PASS (arm A 9/10, arm B all-closed).
- **U-OBF02** round 1: split (A PASS, B FAIL: false "cheap per-slot" comment,
  read-path-as-producer herd, self-ref dup, 10-slot drift). All fixed →
  round 2 BOTH PASS.

Lessons (promoted): a "pure-core + injected-readers" design must ship one
real-data path test (hermetic fakes hid the prefix-collision); when
retrofitting a persistence side-effect onto a state machine, wire the
*refresh* path not just the *acquire* path; a produced artifact must not
share a filename namespace with the consumer's fallback globs.

## Files

| File | Role |
|---|---|
| `scripts/handoff-consolidate.mjs` | Per-slot consolidator (pure-core + fs/CLI) |
| `scripts/handoff-consolidate.test.mjs` | 24 node:test real-value cases |
| `.claude/hooks/session-start-auto-resume.mjs` | Resume-read wiring (`getConsolidatedSummary`) |
| `state/shared/handoffs/consolidated/<slot>.md` | Generated per-slot open-threads (runtime, untracked) |

## Related

- [[session-continuity-stack]] — the broader post-/compact continuity machinery
- [[slot-identity-cache]] — sibling SLOT-DRIFT-FIX-MS0 (the SDF13-20 arc, same chat)
- [[per-agent-handoff]] — the handoff writer/reader this consolidates over

## Remaining (U-OBF03, queued)

MEMORY.md auto-compaction hook that *acts* (re-pointerizes over-budget index
lines to ≤200 chars, never deletes a pointer, fail-soft if peer-locked) so
the recurring fleet-wide silent truncation stops being a one-shot manual fix.
