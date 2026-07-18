# CAD-COMPLETE-MS0/U-AI-07 — [MAIN] [CAD-COMPLETE-MS0]/U-AI-07 (slot:delta iter9): CADPreviewEngine — pure dry-run preview over CADTransactionEngine; real cadWorldModelEngine NEVER mutated

**Commit:** `642de4aecf0c` · **By:** markjvillanueva3-cloud · **At:** 2026-05-22T22:05:08-05:00
**Tags:** cad-complete-ms0, u-ai-07, auto-distilled

## Subject
[MAIN] [CAD-COMPLETE-MS0]/U-AI-07 (slot:delta iter9): CADPreviewEngine — pure dry-run preview over CADTransactionEngine; real cadWorldModelEngine NEVER mutated

## Body
```
[MAIN] [CAD-COMPLETE-MS0]/U-AI-07 (slot:delta iter9): CADPreviewEngine — pure dry-run preview over CADTransactionEngine; real cadWorldModelEngine NEVER mutated

Composes the U-AI-08 snapshot-then-rollback pattern in a strictly side-effect-free shape:
each preview() / previewAll() seeds a fresh ephemeral CADWorldModelEngine sandbox
with a deep-copy of the real world's baseline state, runs ops via a sandbox-bound
CADTransactionEngine, captures the CADWorldDiff via the canonical
CADWorldModelEngine.diff() static, and returns. The real cadWorldModelEngine
singleton is never invoked with a mutating call — confirmed by a fake-real-world
probe that throws on any non-read method.

For docIds unknown to the real world the engine FABRICATES an empty baseline
locally instead of calling realWorld.getOrCreate (which would silently materialise
an empty doc in production state — the strict-purity invariant that callers can
preview an op against any docId without leaving fingerprints).

Engine (513 LOC): CADPreviewEngine.ts — preview(), previewAll(), injectable
CADRealWorldLike + sandboxFactory for deterministic tests. 47 tests (PASS): single
op happy / runtime rejection capture / static-input validation / strict-purity
probe (real world never mutated — opCount + entities + parameters + selection
unchanged across 100+ previews against a known doc) / baseline isolation /
multi-op happy / atomicity (any op throws → applied=false, projectedState=null,
opsApplied counts successful ops before throw) / determinism (same baseline+ops
yield identical diff) / float-epsilon delegation to CADWorldModelEngine.diff /
cross-call sandbox independence / adversarial (empty kind, numeric kind→stringify,
deep entity tree, 50-op chain, very-long parameter name).

Dispatcher (+78 LOC): cad_preview_apply + cad_preview_apply_all wired as ONE
case cluster with a single lazy import. Defense-in-depth: schema enforces
ops.max(1000), dispatcher ALSO checks length > 1000 (in case schema is bypassed).
Snake_case doc_id → docId aliasing via the existing paramNormalizer.

Schema (+57 LOC): cad_preview_apply + cad_preview_apply_all Zod schemas matching
the cad_txn_apply / cad_txn_apply_all shape exactly. Strict-min docId.

Per-file scrutiny gate: 4-of-4 reviewer PASS (code-analyzer + reviewer on engine
pair; wiring-review-agent + reviewer on dispatcher pair). All 5 P2 findings
deferred (string-length DoS caps, memory amplification on very large baselines,
explicit-else discriminator, positional-arg-drift hardening, snake_case alias
regression test) — at-parity with sibling cad_txn cluster.

Build: 0 NEW tsc errors. 7 pre-existing tsc errors at cadDispatcher.ts:3192 +
:4016-4021 + :4638 are far above my insertion at line ~5150 and not mine.

Tests: 107 PASS (47 CADPreviewEngine + 60 CADTransactionEngine regression-clean).
```

## Files touched (5)
- mcp-server/src/__tests__/CADPreviewEngine.test.ts | 758 ++++++++++++++++++++++
- mcp-server/src/engines/CADPreviewEngine.ts        | 295 +++++++++
- mcp-server/src/schemas/cadActionSchemas.ts        |  51 ++
- mcp-server/src/tools/dispatchers/cadDispatcher.ts |  67 ++
- 4 files changed, 1171 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 642de4aecf0c`
- Milestone envelope: `mcp-server/data/milestones/CAD-COMPLETE-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._