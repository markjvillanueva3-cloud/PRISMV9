---
name: reference_galaxy_context_federation_recall_first_2026_05_31
description: "GALAXY-CONTEXT-FEDERATION-MS0 / U-GCF-RECALL-FIRST (shipped 2026-05-31, slot alpha) — Phase D Obsidian token savings: recall-instead-of-reread nudge + savings metric for the brain/memory surface (NOT wiki — deferred to wiki hooks). Estimates bytes/4 read vs ~300 recall."
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.125Z
aliases: reference_galaxy_context_federation_recall_first_2026_05_31
---


**GALAXY-CONTEXT-FEDERATION-MS0 / U-GCF-RECALL-FIRST** (shipped 2026-05-31, slot alpha) — 9th federation unit.
Sisters: [[reference_galaxy_context_federation_push_2026_05_31]], [[reference_galaxy_context_federation_knows_map_2026_05_31]].

**What it is:** recall-instead-of-reread — a nudge + a metric. When a chat is about to Read a large recallable
BRAIN/MEMORY file, nudge it to `prism_memory:semantic_search` (~3 snippets ≈ 300 tok) instead of re-reading the
whole file (≈ bytes/4 tok), with the estimated savings; record the estimate to `recall-first-savings.json`
(feeds U-GCF-SAVINGS-TELEMETRY).

**Shipped:** `scripts/lib/recall-first.mjs` (pure+injected+fail-soft; 21 node:test), `scripts/recall-first.mjs`
(CLI check|summary), `state/shared/dashboards/patches/HOOK-PATCH-GCF-RECALL-FIRST.md` (golf PreToolUse:Read wiring).
Sidecar: `state/shared/dashboards/recall-first-savings.json`. Real: quoting 90KB brain → ~24331 tok est savings.

**How to apply / lessons:**
1. **DEDUP a crowded surface honestly (R8).** There were already 3 recall hooks (recall-counter-track =
   PostToolUse COUNTS; wiki-recall-on-read + wiki-read-offload = wiki). Before building, I read each one's scope.
   recall-first is complementary: PreToolUse NUDGE (vs post-count) + a SAVINGS ESTIMATE (which the counter lacks)
   + the BRAIN/MEMORY surface only (wiki HARD-excluded → classifies recallable:false, deferred to the wiki hooks,
   fail-on-revert tested). Different event from the counter → they coexist. Don't build a 4th overlapping hook;
   carve the uncovered slice + add the missing signal.
2. **RUN THE REAL PROBE — the leading-slash bug (4th catch this session).** classifyRecallable's regexes required
   a leading slash before `knowledge/memories`, so a RELATIVE path (`knowledge/memories/x.md`) classified as
   NOT recallable. Production Read paths are absolute (would work) but the probe exposed it. Fix: `(?:^|\/)`
   anchors match both absolute + relative. Non-capturing group so the galaxy-name capture index doesn't shift.
3. **R12 honesty — estimates, not measurements.** The savings are heuristics (bytes/4 vs ~300). Framed as
   ESTIMATES everywhere; the nudge is conditional ("if the snippets answer your need — re-read the full file only
   if they don't") with a re-read escape hatch. Never claims guaranteed savings. (4th federation unit where the
   reviewer checked for overclaim — bake the qualification in from the first draft now.)
4. **RMW must distrust prior field TYPES (arm-A P2 hardening).** A read-modify-write metric that does
   `(state.total||0)+1` produces `"five"+1="five1"` if a corrupt/peer-poked sidecar has a string total. Coerce
   every accumulator `Number(...)||0` + reject non-object/array priors. Only-this-writer-produces-it today, but a
   schema change or manual poke would propagate garbage. Cheap, strictly-better; fail-on-revert tested.
5. **`parseInt(env)||DEFAULT` treats a legit 0 as falsy.** `PRISM_GCF_RECALL_MIN_BYTES=0` (meaning "no floor")
   silently became 4096. Fix: separate validity (`Number.isFinite(parsed)`) from zero. Classic env-knob trap.
6. **Single-writer-per-file** (6th unit running): own `recall-first-savings.json`, never a peer's stats file.

Knobs: `PRISM_GCF_RECALL_DISABLE=1`, `PRISM_GCF_RECALL_MIN_BYTES=N` (0=no floor). Wiki: [[galaxy-context-federation]].
PSN [[feedback_psn_definition]]. Federation: 9/12 (Phase D = XDEDUP + SAVINGS-TELEMETRY remain; OLLAMA-MAINT gated).
