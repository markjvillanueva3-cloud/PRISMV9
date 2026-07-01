---
title: Atomic-swap over a resumable-with-deferred-retry stream -- coverage != completeness
tags: [code-tribal, lora, resumable, atomic-write, state-machine, ollama, reaper, R12, R15, slot-papa]
slot: papa
date: 2026-06-25
related: [[reference_papa_tribal_corpus_lora_2026_06_25]] [[ollama-burst-wedge-and-stale-vs-hung-task-signals]] [[reference_xray_ocr_corpus_resumable_multipage]] [[brain-accel-u-tribal-embed-resumable]]
commits: [09ff81009a, 65628c77bf, 17f972870a]
---

# Atomic-swap over a resumable-with-deferred-retry stream -- coverage != completeness

Two reusable lessons from the slot:papa LoRA-distill work (2026-06-24/25), where a long Ollama
`--distill` batch (`scripts/{domain-corpus,tribal-corpus}-to-lora-dataset.mjs`) turns raw pdftotext
rows into grounded Q&A. Both bit hard; the second was caught by the per-file scrutiny gate BEFORE it
shipped (commit `65628c77bf` reverted by `17f972870a`).

## 1. A long SILENT Ollama batch belongs to the reaper-aware loop/cron, NOT a foreground chat turn

A full `--distill` run makes ~one Ollama call per text-bearing entry (~398 for cad/cam) and the
converters printed ONLY an end-of-run summary -- so the process is SILENT for ~20+ min. Observed: a
foreground full run was KILLED twice (`exit 255`, no stdout, ~5 min in at 69/398 -- the whole bash
subprocess tree reaped). A bounded `--limit 12` run completes clean in ~30 s. So the reap is specific
to the LONG silent run, not the code.

- **Fix shipped (`09ff81009a`):** a per-chunk `console.error(progressLine(...))` every N entries (stderr
  only, so it never pollutes the jsonl) -- keeps the run observable + idle-kill-resistant.
- **Doctrine:** the resumable cursor completes these across MANY short loop/cron runs (the same way
  domain-knowledge accumulated 97 distilled). A long silent local-LLM batch is the loop's job in short
  (<5 min) increments, never a single foreground turn (R5/spiral). If a reaped run leaves the dataset
  short, restore the raw baseline via a fast raw `--out` (no Ollama, un-reapable) -- the jsonl is
  gitignored/regenerable.

## 2. An atomic-swap-on-complete over a resumable + deferred-retry stream is a SUBTLE state machine

To stop a reaped run from leaving a partial (a count-regression), the natural idea is: stream `--distill`
to `outPath.inprogress`, leave the live dataset untouched, and atomically `rename()` onto it only "when
complete." **The trap: "complete" is not what it looks like**, because the resumable cursor uses a
DEFERRED-RETRY self-heal (a raw-fallback-under-cap entry writes a cursor LINE but NO output row, to be
retried next pass) AND `parseCursorState` counts cursor LINES (not the `attempts` JSON field), so a
no-text entry (one line) never reaches the attempts cap.

Two real bugs the scrutiny gate caught (both arise from this interaction):

- **P0 -- multi-run narrow clobber.** After a complete swap the cursor is full and `.inprogress` is gone.
  A re-run that re-processes only the still-retryable raw-fallback entries builds a FRESH NARROW
  `.inprogress`; since coverage is still "full", the swap fires and `rename()`s the narrow stream over the
  full live dataset -- destroying every previously-published row. Silent (the dataset is gitignored ->
  feeds the LoRA corpus).
- **P1 -- incomplete publish labeled COMPLETE.** Within one run, a coverage gate (`seen >= total`) fires as
  soon as every entry has a cursor LINE, even when deferred raw-fallback entries contributed ZERO rows ->
  the swapped dataset is missing those rows.

**The lesson (generalizes to ANY atomic-swap over a resumable stream with deferred work):**

1. **Coverage (every item SEEN) != completeness (every item's final OUTPUT is in the stream).** A deferred
   item makes "seen" lie. Gate the swap on completeness, not coverage.
2. A swap that renames a per-run stream over a shared live artifact must guarantee the stream is a SUPERSET
   of (or a deliberate full replacement for) the live artifact -- else a narrow re-run clobbers it. Retire/
   reset the resume cursor on swap so a post-swap re-run is a fresh FULL cycle, never a narrow append.
3. Don't mix DEFERRED-retry with atomic-swap unless the swap waits for every deferral to resolve. Simpler:
   in atomic mode, never defer -- always write each item's (best-so-far) row, and do quality retries as a
   separate fresh cycle.
4. Validate the swap on LIVE data with a small complete corpus (here `--domains cad`, 12 entries) -- the
   R15 behavioral proof is what surfaced both P0 and P1 before they shipped; the unit tests alone passed.

**Status:** the atomic-distill was reverted; the distill stays the loop's truncate-then-accumulate job
until a redesign implements (1)-(3). Constraints are captured here + in [[reference_papa_tribal_corpus_lora_2026_06_25]].
