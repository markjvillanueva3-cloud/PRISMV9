# Tribal-embed-index writer-lock plan (BRAIN-UPGRADE rank 12)

## UPDATE 2026-05-30 (same session) — lock PRIMITIVE + ADAPTER shipped + validated

The lock half is now **built and validated** (the 5-writer embedder wiring is the remaining
Ollama-gated follow-up). Two corrections to the original plan below:

1. **Do NOT reuse `system-graph-write-lock.mjs` — it has a TOCTOU race.** Its acquire is
   read-decide-then-`writeFileSync` (two syscalls); under tight contention two processes both read
   "free" and both write their pid → concurrent critical sections → lost update. **Proven**: a
   4-writer cross-process oracle over that lock produced 3 surviving appends, not 4. (This is a
   real latent bug in that module too — flagged for sierra/viz, out of scope here.)
2. **Built the canonical ATOMIC lock instead:**
   - `scripts/lib/exclusive-file-lock.mjs` — generic O_EXCL (`fs.openSync(path,"wx")`) lock, no
     TOCTOU, mtime stale-steal, release-only-own. The dedup-canonical copy of the pattern that
     `galaxy-synthesis-claim.mjs` + `slot-task-claim.mjs` carry privately (their migration to it is
     a documented follow-up). 8 tests incl. a 5-writer cross-process oracle that PASSES (all appends
     survive) — the fail-on-revert proof the system-graph lock failed.
   - `scripts/lib/tribal-index-lock.mjs` — thin adapter: `.lock` path + decoupled call-time knob
     `PRISM_TRIBAL_INDEX_LOCK_OFF` + `withTribalIndexLock`. 9 hermetic tests.
   - 17/17 green. Lock + adapter are the validated foundation; the embedder wiring drops onto them.

**5 writers (not 4)** — `retag-tribal-backend-dev.mjs` (write@150) is the 5th, confirmed.
**Adjacent bug (own+route, separate unit):** `embed-cited-tips` treats `entries` as an object-map
while engines/knowledge-store/wiki use an array `entries[]` → cited-tips' appends silently vanish on
`JSON.stringify(array)` AND it still rewrites the 200MB file (a dangerous clobberer). Lock it (stops
the clobber); fix its schema separately.

**Corrected wiring recipe** (supersedes the `withGraphWriteLock` recipe below): use
`withTribalIndexLock(INDEX_PATH, () => { reread → merge → atomicWrite })` with the SLOW embed OUTSIDE
the lock (short critical section → the 30s stale-steal never wrongly reclaims a live holder); on
`!r.ran` return `EXIT_TRIBAL_INDEX_LOCK_SKIP` (4). RE-READ inside the lock is mandatory.

---

**Status:** PRIMITIVE+ADAPTER SHIPPED+VALIDATED · 5-embedder WIRING **NOT yet wired** (R12: the race is still OPEN until all 5 writers use the lock).
**Author:** claude-da9aacf5 slot alpha · 2026-05-30 (autonomous brain-upgrade /loop).
**Why not built this turn (R13 — verifiable/validated foundation first):** the fix is a
4-writer *integration*, and the wired path can only be end-to-end validated by running a real
embedder, which needs the `nomic-embed-text` model — **Ollama `/api/chat`/`/api/embeddings` was
DEAD this session** (SessionStart probe: timeout 8009ms). Wiring a lock into 4 scripts I cannot
run, on a host that was thrashing (ripgrep/glob timing out at 20s, node spawns ETIMEDOUT), is
"wiring blind." This spec lands the verified diagnosis + the dedup-correct reuse plan so the fix
is a clean, validatable unit when Ollama + the host recover.

---

## The bug (CONFIRMED — lost-update race + a torn-write)

`state/shared/tribal-embed-index.json` is the canonical embedding corpus that the automatic
tribal-knowledge injection pipeline ranks over (`tribal-by-domain-inject.mjs` →
`tribal-rerank.mjs` → cosine over `entries[]`). **An entry not in this file can never be
surfaced by that hook** (embed-wiki's own header, lines 7-13). It is mutated by **four
independent writers**, each doing an *unguarded* read-modify-write:

| Writer | reads | writes | write mode |
|---|---|---|---|
| `scripts/embed-cited-tips-into-tribal-index.mjs` | line 104 | line 113 | **plain `fs.writeFileSync`** ⚠ |
| `scripts/embed-engines-into-tribal-index.mjs` | line 134 | (below 134) | (verify at wiring) |
| `scripts/embed-knowledge-store-into-tribal-index.mjs` | line 301 | line 346 | `atomicWriteJSON` (tmp+rename) |
| `scripts/embed-wiki-into-tribal-index.mjs` | line 337 | line 426 | `atomicWriteJSON` (tmp+rename) |

Two distinct defects:

1. **Lost-update race (all 4).** `atomicWriteJSON` (tmp+rename) makes a *single write* atomic —
   it does **NOT** serialize a cross-process read-modify-write. Interleave:
   `P1 read G0 → P2 read G0 → P1 write G0+A (rename) → P2 write G0+B (rename)` → **P1's appended
   entries A are silently lost.** This is the exact class CLAUDE.md documents for
   `system-graph.json` (3-writer) and `roadmap-index.json` (5-writer). It is a plausible
   contributor to the **live SessionStart signal: tribal coverage 31.5%, 26,051 wiki files
   missing from the index** — appended embeddings clobbered by a concurrent writer would present
   exactly as "embedded but not in the index."
2. **Torn-write / corruption (cited-tips only).** `embed-cited-tips` uses **plain
   `fs.writeFileSync`** (line 113), not the atomic tmp+rename the siblings use. A crash mid-write,
   or a concurrent reader (`tribal-rerank`, `build-psn-training-corpus`,
   `spawned-agent-context-lib`, `audit-mill-psn-coverage`), can see a **truncated/torn** index.

Also: **inconsistent path resolution** — `embed-knowledge-store` (91) + `embed-wiki` (109) honor
`PRISM_TRIBAL_INDEX_PATH`; `embed-cited-tips` (38) + `embed-engines` (58) hardcode
`path.join(PRISM_ROOT,"state","shared","tribal-embed-index.json")`. They resolve to the same file
today, but a future env-override would split them. Normalize at wiring time.

**Readers are OUT of scope.** `build-psn-training-corpus`, `spawned-agent-context-lib`,
`audit-mill-psn-coverage` only READ the index. Against an atomic-rename writer a reader always
sees a complete old-or-new snapshot (never torn → no lost-update on read). They do NOT need the
lock. (They DO see torn data from the cited-tips plain-write — fixed by defect-2 below.)

---

## The fix — REUSE the existing lock primitive (do NOT build a new one)

**R8 dedup finding (load-bearing — this nearly became a duplicate lib):**
`scripts/lib/system-graph-write-lock.mjs` is ALREADY a generic, **path-parameterized**
cross-process PID-write-lock (every fn takes `pidPath`; dead-PID reclaim via `process.kill(pid,0)`
ESRCH + a 30-min TTL backstop against Windows PID-reuse phantoms + a scoped `withGraphWriteLock`
helper + `installGraphWriteLockReleaseOnExit`). It was built for the system-graph 3-writer race
(U-VIZ-F11-CROSS-LOCK) but the lock LOGIC is generic. **Building a new tribal-specific lock
(or a `json-rmw-lock.mjs`) would be a `duplication-hard-block` violation** and would create the
two-contradicting-patterns smell R7 warns about.

### Recommended wiring (per embedder)

Wrap each embedder's read→mutate→write critical section in `withGraphWriteLock`, passing a
**tribal-specific lock path** so it does not share the system-graph lock file:

```js
import { withGraphWriteLock, EXIT_GRAPH_WRITE_LOCK_SKIP } from "./lib/system-graph-write-lock.mjs";

const r = withGraphWriteLock(() => {
  const idx = JSON.parse(fs.readFileSync(INDEX_PATH, "utf8"));   // READ inside the lock
  // …mutate idx (append/dedup entries)…
  atomicWriteJSON(INDEX_PATH, idx);                              // WRITE inside the lock
}, { pidPath: INDEX_PATH + ".lock.pid" });
if (!r.ran) {
  // a peer embedder holds the lock — DEFER, do not clobber. Re-run later
  // (cron/loop) or exit with a benign "skip" code, NOT a corrupting write.
  process.exit(EXIT_GRAPH_WRITE_LOCK_SKIP);   // 4 = benign concurrent skip
}
```

Two correctness requirements at wiring time:
- **The READ must move INSIDE the lock.** Locking only the write preserves the lost-update race
  (P1/P2 both read before either locks). The critical section is read→mutate→write.
- **Fix defect 2:** replace `embed-cited-tips`'s plain `fs.writeFileSync` (line 113) with the
  same `atomicWriteJSON` (tmp+rename) the siblings use — OR import the shared
  `scripts/lib/atomic-json.mjs` (verify its API first; embed-wiki/knowledge-store currently use a
  LOCAL `atomicWriteJSON`, a separate minor dedup smell worth collapsing).

### Decoupling caveat (DO NOT reuse the system-graph disable knob)

`system-graph-write-lock.mjs` has a single module-level `DISABLED =
PRISM_SYSTEM_GRAPH_WRITE_LOCK_OFF==="1"`. If the tribal embedders import it directly, setting that
knob to escape a *viz* wedge would **silently un-lock the tribal index too** — a cross-domain
coupling bug. Options (pick at wiring time):
- **(A) cheap, recommended first:** the tribal embedders honor their OWN knob
  (`PRISM_TRIBAL_INDEX_LOCK_OFF`) at the call site (skip the `withGraphWriteLock` wrap when set);
  accept that the shared module's own OFF knob also disables it (acceptable — OFF is a global
  escape hatch either way).
- **(B) cleaner, follow-up:** generalize — extract the generic core to
  `scripts/lib/pid-write-lock.mjs` with a **per-lock** disable/TTL/path knob, and make
  `system-graph-write-lock.mjs` a thin re-export preserving its current API + knob (back-compat,
  it is wired into `regen-viz.mjs` + `system-viz-add-node.mjs` — HOT, sierra/viz-owned; refactor
  needs its own validation). This is a SEPARATE low-priority unit; do NOT bundle it with the
  tribal wiring.

---

## Acceptance gate (R12 — the race is NOT closed until ALL pass)

1. Read moved inside the lock in all 4 embedders; cited-tips write is atomic.
2. Per-file scrutiny (2 reviewers) on each of the 4 edited writers.
3. **Integration test with a REAL embed run** (requires Ollama up): run two embedders
   concurrently against a tmp `PRISM_TRIBAL_INDEX_PATH`; assert NO entries are lost (the
   fail-on-revert oracle the lost-update bug demands — a hermetic mock will NOT prove the
   cross-process serialization; cf. the RGS-TOOL-AUTOINVOKE-MS1 + FLEET-REAPER service-restart
   "hermetic fakes don't prove production wiring" lessons).
4. Re-measure tribal coverage after a full re-embed; if 31.5% rises materially, the race was a
   real contributor (confirm, don't assume).

## Out of scope / follow-ups
- `system-graph.json` (3-writer) + `roadmap-index.json` (5-writer) documented races: the SAME
  `system-graph-write-lock.mjs` (graph already uses it for F11) / `atomic-json.mjs` reuse applies.
  Tracked in CLAUDE.md `## Recent regressions`. Separate units.
- Option-B generic `pid-write-lock.mjs` extraction (above).

**Memory:** [[reference_alpha_tribal_index_race_2026_05_30]].
**Sibling race-class:** rank-6 [[reference_alpha_galaxy_synthesis_claim_2026_05_30]] (this is the
same lost-update class on a different brain leg — tribal recall vs galaxy synthesis).
