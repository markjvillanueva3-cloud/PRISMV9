---
title: Schema-read-blindness + the green-but-blind test anti-pattern
type: lesson
layer: L8
created: 2026-06-15
slot: sierra
session: ed91599e
tags: [schema-read-blindness, silent-failure, test-integrity, R9, R12, state-files, audit]
related:
  - nn-graded-schema-read-fix
  - nn-leg-schema-read-fix
  - feedback_verify_actual_contract_not_proxy
  - feedback_read_full_content_not_titles
---

# Schema-read-blindness + the green-but-blind test anti-pattern

**Source:** SYSTEM-BUG-AUDIT-2026-06-14 Round 4 (slot:sierra). 5 confirmed instances fixed this
session; 2 prior fleet instances (`nn-graded-schema-read-fix`, `nn-leg-schema-read-fix`).
Full report: `state/shared/specs/SYSTEM-BUG-AUDIT-2026-06-14.md`.

## The bug class

**Schema-read-blindness:** a CONSUMER reads a JSON state file with a field path that does NOT match
the shape the WRITER emits. The read silently yields `undefined`, and the consumer then fabricates a
default, mis-classifies, or emits a *wrong but confident* diagnosis. Nothing throws. The feature looks
alive but is dead or lying.

It is the silent-failure sibling of "existence != content" — the file/field *name* exists in the
consumer's mental model, but the actual on-disk shape diverges.

### Confirmed shapes seen in PRISM
| Reader read | Writer actually emits | Effect |
|---|---|---|
| `ledger[session_id]` | `ledger.entries[session_id]` | 239/418 scrutiny passes never captured |
| `entry.opusReviewed === "pass"` | `opusReviewed: true` (boolean) | gate never matched |
| `health.awareness?.score \|\| 0.8` | no `awareness` key (has `status`) | drift/stability advisories fed a constant, neutered |
| `claims[slotName]` | `claims[unitId]` (rows carry `.slot`) | UserPromptSubmit injector never fired |
| `evalDoc.auroc` | `checkpointMeta.auroc` (nested) | fabricated "embeddingSource mismatch" diagnosis |

## The green-but-blind test (the dangerous part)

The unit-knowledge-pack injector (`U-SBF-5`) had a full test suite — **35 tests, all green** — yet the
feature had **never worked in production**. Why:

1. The test fixture *encoded the same wrong shape as the bug*: `claims: { charlie: c }` (keyed by slot
   name), matching the buggy `claims[slot]` lookup. Reader and fixture agreed with each other and
   disagreed with the real writer (`claims[unitId]`).
2. The "real-data E2E" passed **trivially**: it read the live `slot-task-claims.json`, which is usually
   empty, so "no claim -> continue" was the asserted happy path. An empty input can never exercise the
   shape mismatch.

A test that builds its own fixture from the consumer's assumptions cannot catch a consumer/producer
shape divergence — it only re-confirms the assumption. This is R9 ("tests verify intent, not behavior")
in the wild: the test passed without ever exercising the real contract.

## Detection (how to hunt this class)

1. For every reader of a state file, find the **WRITER** and diff the emitted shape vs the read path —
   never trust the field name, read the writer's `JSON.stringify`/store-mutation.
2. Be suspicious of nested vs top-level (`doc.a.b` vs `doc.b`), and of type (string `"pass"` vs boolean
   `true`), and of key-namespace (keyed by slot-name vs unitId).
3. `??`/`|| default` after a state read is a smell: it hides the `undefined` from a wrong path. Ask "what
   real value should this be, and does the writer ever produce it?"

## Prevention

- **Tests must build fixtures from the REAL writer**, or import the writer and round-trip through it —
  not from a hand-written object matching the reader's assumption. If reader and producer disagree, a
  round-trip test fails; a hand-built-fixture test cannot.
- **A real-data E2E must use a NON-empty input.** An empty live file makes the happy path trivially
  green and proves nothing about the contract.
- **Verify the artifact, not the proxy** (see `U-SBF-4`): regen-viz checked a child process's exit code
  (proxy) and shipped a stale sidecar; the fix verifies the artifact's mtime (the real outcome). Same
  discipline: assert the thing you care about, not a stand-in for it. → [[feedback_verify_actual_contract_not_proxy]]
- Centralize the read: one canonical reader (e.g. `classifyGnn`) that handles every writer shape, so a
  shape change is fixed in one place — not re-mis-read by N consumers (the NN-EVAL fixes did this).

## Single-glance rule

> A green test suite over a hand-built fixture is **not** evidence a feature works against real data.
> Diff every state-file reader against its writer; round-trip tests through the producer; E2E on
> non-empty inputs.
