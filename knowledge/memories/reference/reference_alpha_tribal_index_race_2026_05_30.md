---
name: reference_alpha_tribal_index_race_2026_05_30
description: CONFIRMED lost-update race on state/shared/tribal-embed-index.json (5 unguarded RMW writers); fix = new ATOMIC scripts/lib/exclusive-file-lock.mjs (system-graph-write-lock has a TOCTOU race — do NOT use it for contention)
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.471Z
aliases: reference_alpha_tribal_index_race_2026_05_30
---


Brain-upgrade rank 12 (tribal-index writer lock), **2026-05-30 slot alpha**. Lock PRIMITIVE +
ADAPTER **built + validated + scrutiny-cleared** (20/20 tests; commit `27d8ee7235`); the 5-writer
embedder WIRING is the remaining Ollama-gated follow-up. Plan:
`state/shared/specs/TRIBAL-INDEX-WRITER-LOCK-PLAN-2026-05-30.md`.

**The bug (confirmed):** `state/shared/tribal-embed-index.json` (**~200 MB** — the corpus
`tribal-by-domain-inject` → `tribal-rerank` ranks over; an entry not in it can never auto-inject)
is mutated by FIVE unguarded read-modify-write writers: `embed-{cited-tips,engines,knowledge-store,
wiki}-into-tribal-index.mjs` + `retag-tribal-backend-dev.mjs`. `atomicWriteJSON` (tmp+rename) makes
a single write atomic but does NOT serialize a cross-process RMW → lost-update. The author already
flagged it (embed-wiki:267-273: "if either is ever scheduled, a shared lock … is required"). The
200 MB write window makes the race wide. Plausible contributor to the LIVE signal **tribal coverage
31.5% / 26K wiki files missing**.

**THE KEY FINDING (load-bearing — saves the next chat a wrong turn):** I first built the adapter on
`scripts/lib/system-graph-write-lock.mjs` (an existing path-parameterized PID lock). The
cross-process oracle CAUGHT IT FAILING — 4 hammering writers → only 3 appends survived. **Its acquire
is read-decide-then-`writeFileSync` = a TOCTOU race**: two processes both read "free", both write
their pid, both enter the critical section. Safe for its low-contention regen-viz use, **UNSAFE for
contention**. (Real latent bug in that module — flagged for sierra/viz.) Correct primitive = ATOMIC
O_EXCL (`fs.openSync(path,"wx")` — EEXIST if held, no TOCTOU), the pattern my rank-6
`galaxy-synthesis-claim.mjs` + `slot-task-claim.mjs` already use privately.

**Built:** `scripts/lib/exclusive-file-lock.mjs` — the CANONICAL generic atomic O_EXCL lock
(mtime stale-steal, release-only-own, SHORT-critical-section hold contract; galaxy-synth + slot-task
should migrate to it — follow-up). `scripts/lib/tribal-index-lock.mjs` — thin adapter (`.lock` path +
decoupled call-time knob `PRISM_TRIBAL_INDEX_LOCK_OFF` + `withTribalIndexLock`). Tests: 8
(exclusive-file-lock, incl. a 5-writer cross-process oracle that PASSES — the fail-on-revert proof
the PID lock failed) + 9 (tribal adapter, hermetic). 20/20 green, **no Ollama needed** — the lock's
correctness is independent of the embedding step.

**Adjacent bug (own+route, separate unit):** `embed-cited-tips` treats `entries` as an object-map
while the others use array `entries[]` → its appends silently vanish on `JSON.stringify(array)` AND it
rewrites the 200 MB file (a dangerous clobberer). Lock it (stops the clobber); fix its schema apart.

**Wiring (deferred — Ollama-gated):** wrap each writer's RMW in
`withTribalIndexLock(INDEX_PATH, () => { reread → merge → atomicWrite })` with the slow embed OUTSIDE
the lock (short section → 30s stale-steal never reclaims a live holder); `!r.ran` →
`EXIT_TRIBAL_INDEX_LOCK_SKIP` (4). End-to-end embed-run validation needs `nomic-embed-text` (Ollama
was dead this session) — that's the only Ollama-gated piece; the lock itself is proven.

**Lessons:** (1) the real cross-process oracle caught a bug a hermetic mock never would (RGS-MS1 /
[[reference_fleet_reaper|FLEET-REAPER]] "hermetic fakes don't prove wiring" — applied + paid off). (2) "atomic write" ≠ "atomic
read-modify-write"; and a PID lock that reads-then-writes is NOT atomic. (3) before building a lock,
`ls scripts/lib/ | grep -E 'lock|atomic'` — but ALSO verify the candidate's acquire is truly atomic.
(4) a cross-process oracle proves the path it EXERCISES (happy-path serialization) — it can miss a
code path it never drives: per-file CODE REVIEW (arm A) caught a stale-steal double-unlink TOCTOU the
oracle never hit (no lock ever went stale in a 500ms run). Fixed with an atomic rename-steal. And a
concurrency oracle is platform-dependent: arm B empirically showed the steal oracle is NOT strict
fail-on-revert on Windows (fd closes immediately → the blind-unlink window never opens) — so it's a
serialization/liveness test, honestly labeled. Tests + adversarial review are complementary, not
redundant. Sibling race: [[reference_alpha_galaxy_synthesis_claim_2026_05_30]] (rank 6). Standing rule:
[[feedback_always_fill_gaps]].
