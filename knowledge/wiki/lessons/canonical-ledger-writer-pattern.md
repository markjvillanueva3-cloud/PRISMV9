---
title: Canonical ledger writer pattern (build-once WRITE side, symmetric to the READ side)
type: lesson
domain: ai-training
slot: india
created: 2026-06-24
tags: [closed-loop, learning-loop, blueprint-accuracy, event-schema, build-once, R8, R15]
related:
  - "[[closed-loop-event-type-drops]]"
  - "[[reference_cad_learning_loop_closures_2026_06_24]]"
  - "[[ai-systems-synergy-u-ais01]]"
---

# Canonical ledger writer pattern

## Lesson
When a closed-loop ledger (an append-only JSONL the learning loop consumes) has a
canonical READER but the WRITE side is scattered, the event SHAPE and the APPEND
both drift. Fix it by building the symmetric WRITE-side lib: a pure
`build<X>Event()` (shape) + an `append<X>Event()` (I/O), mirroring the reader lib.
Every producer then imports ONE writer instead of re-deriving the shape and
re-implementing `appendFileSync(JSON.stringify(event)+"\n")` inline.

Two properties make the writer safe to share:
- **Fail-LOUD on a malformed event, fail-SOFT on I/O.** Reject a typeless/garbage
  event with a throw (a typeless row silently drops to the consumer's `unknown`
  bucket -- the exact silent-drop failure in [[closed-loop-event-type-drops]]).
  Tolerate a genuine disk error with a `{success:false}` return so it stays a
  drop-in for existing adapters (which treat a write failure as a recorded-but-
  degraded outcome, surfaced via exit code -- never buried).
- **Append-only, never read-modify-write.** Concurrent chats appending one
  complete line per `appendFileSync('a')` call cannot clobber each other. The
  only RMW surface (the consumer's offset/counter) lives in the consumer, not
  the writer.

## Prediction vs confirmed outcome (the semantic trap)
A model PREDICTION (e.g. a RAG extraction emitted for later operator confirmation)
is NOT a confirmed ground-truth outcome. Record both as the consumer's routable
`type` (so neither drops), but:
- tag the prediction with a distinct `payload.kind` (e.g. `rag_extraction`) so a
  downstream miner can tell them apart, and
- set the confirmation-only field to a sentinel (`accurate: null`) rather than a
  fake boolean.
Verify the distinct kind does not break sibling consumers: PRISM's
template-aggregator skips a row with no `part_class` (it mines a different
extraction shape), so the new kind is skipped, not mis-mined or crashed --
confirm this empirically, do not assume it.

## Concrete case (U-BPA-EVENT-WRITER-LIB, 2026-06-24, commit 6606d0c8bf)
`scripts/lib/blueprint-accuracy-event-writer.mjs` is the WRITE-side counterpart to
`blueprint-accuracy-consumer-lib.mjs`. It consolidated 2 byte-identical inline
appenders (`harvest-prints-to-training.mjs`) and added the builder that closes the
MCP-path RAG-extraction prediction->outcome loop. Validated live: 5 real JM-Die
ledger rows + 1 new `rag_extraction` row through the REAL consumer -> all consumed
(`unknown` 0), and a stub harvest on the JM Die corpus wrote a row via the
canonical appender.

## CORRECTION (2026-06-24): the dispatcher wiring was NOT a one-liner
The earlier claim that the `blueprint_rag_extract` `recordOutcome` wiring was "a
de-risked one-liner (`recordOutcome: async (ext) => recordExtractionOutcome(ext)`)"
was WRONG (R12). The canonical writer is a repo-root `.mjs`; the dispatcher is a
`.ts` compiled to `mcp-server/dist/`. No clean `import` spans that boundary. The
real wiring (shipped `e2fa23c46f`, U-BPA-RAG-RECORDOUTCOME) is a CWD-independent
**dynamic import** resolved via the file's own `import.meta.url`:

```js
recordOutcome: async (extraction) => {
  const pathMod = await import("path"); const urlMod = await import("url");
  const dispatcherDir = pathMod.dirname(urlMod.fileURLToPath(import.meta.url));
  const repoMcpRoot = pathMod.resolve(dispatcherDir, "..", "..", "..");      // mcp-server/
  const writerPath  = pathMod.resolve(repoMcpRoot, "..", "scripts/lib/blueprint-accuracy-event-writer.mjs"); // repo root
  const { recordExtractionOutcome } = await import(urlMod.pathToFileURL(writerPath).href);
  await recordExtractionOutcome(extraction);
}
```

Three load-bearing details: (1) **co-depth** -- `src/tools/dispatchers` and
`dist/tools/dispatchers` are the SAME 3 segments under `mcp-server/`, so the
resolve is correct in both tsx-from-src (tests) AND bundled-dist (prod); clone the
proven in-file `import.meta.url` idiom, never `process.cwd()`. (2) **`+1 ..`** over
the in-file idiom escapes `mcp-server/` to the repo root where `scripts/` lives.
(3) **silent-breakage risk** -- the engine wraps `recordOutcome` in an EMPTY catch
(advisory), so a WRONG dist path fails SILENTLY; the only proof is a test that
round-trips THROUGH the dispatcher handler + the REAL consumer-lib (parseEventsBlob
+ applyEvents) asserting the row routes to `outcome_record`, not the `unknown` drop
bucket. "It's a one-liner" is the trap: the line is short, the *path resolution +
through-the-real-consumer test* is the actual work.

## Why it matters
A scattered write side is where a closed loop silently rots: one producer emits a
slightly-wrong shape, the consumer drops it, the model never learns from it, and
nothing fails loudly. One canonical writer (proven against the real reader) makes
every producer correct-by-construction and turns the remaining wirings into
trivial, low-risk follow-ups.
