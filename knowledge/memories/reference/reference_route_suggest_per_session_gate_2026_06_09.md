---
name: reference_route_suggest_per_session_gate_2026_06_09
description: "Route-suggest doctrineSurface+footer gated once-per-session (#4, 25→1 fires); en route the 3-of-3 caught a real shared-file lost-update race in the doctrine rate-limiter (fixed atomic + env-isolated). Scrutiny-under-parallel-load lesson."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.149Z
aliases: reference_route_suggest_per_session_gate_2026_06_09
---


# Route-suggest per-session gate + the race the 3-of-3 caught (#4 + #11b, 2026-06-09)

**#4 (8c945662ac).** `mcp-route-suggest.mjs` keyed its doctrineSurface reminder +
take-rate footer per-(session,file), so a /loop Reading 25 distinct
`.claude/hooks/` files re-fired the IDENTICAL doctrine block 25× (measured live:
doctrineSurface=25 in the Stop spend summary). Re-keyed both on a fixed
per-SESSION sentinel (`_DOCTRINE_SESSION_KEY` / `_FOOTER_SESSION_KEY`) reusing the
existing rate-limit machinery → ~25→1 fires/session. Footer marks-seen only when
actually produced (above-threshold sessions stay un-marked so it can fire later).

**#11b (a6aee37203).** `handoff-consolidate.mjs` orphaned `*.md.tmp-<pid>-<ts>`
temps when a process was killed between writeFileSync and renameSync (the catch
never runs). Added `sweepStaleTmpOrphans(dir, 1h)` in `writeConsolidated`; swept 6
real orphans live → 0.

**The bug the scrutiny gate caught (the real value of this fire).** The
end-of-task 3-of-3 ran each new test **100–200× and under 5-way parallel load** —
something my own 1–2× runs never did — and caught TWO flaky tests + one genuine
**production** race:
1. `sweepStaleTmpOrphans` age check `now - mtimeMs >= maxAgeMs` went NEGATIVE for a
   just-written file (`statSync().mtimeMs` carries sub-ms fraction, `Date.now()` is
   integer) → maxAge=0 boundary failed ~83% of runs. Fix: `Math.max(0, now-mtimeMs)`.
2. The #4 doctrine rate-limiter does a **non-atomic read-modify-write of a
   process-GLOBAL shared file** (`os.tmpdir()/.../mcp-route-doctrine-seen.json`)
   written by every fleet slot. Under concurrency a peer's write clobbers another
   session's key (lost-update) → false re-emit (~72% test fail under 5-way load).
   **This was a latent PRODUCTION bug** (the gate could over-fire on the 26-slot
   fleet), pre-existing in the rate-limiter, made load-bearing by #4. Fix
   (98312e8a08): atomic `_saveDoctrineSeen` (per-PID temp+rename, mirrors the
   telemetry sidecar) + env-overridable `_DOCTRINE_RATE_FILE` so the test isolates
   per-process. Residual lost-update is over-fire-ONLY + harmless (worst case 1
   extra fire, still ~25× fewer than pre-#4); no under-fire/corruption path
   (reviewer C proved causality: revert prod fix → 60% fail, restore → 0).

**Lessons.**
- **Run flakiness-prone tests MANY times + UNDER PARALLEL LOAD, not once.** A test
  that shares ANY process-global state (a cache/stamp/rate file in os.tmpdir) is
  not hermetic just because its KEYS are unique — a concurrent process can still
  clobber the FILE. Isolate the file per-process (env-override the path), the way
  #11b isolates via `mkdtempSync`. Same class as [[reference_precompact_autotrigger_stamp_leak_2026_06_09]].
- **A best-effort dedup on a shared file needs atomic temp+rename** (prevents torn
  reads) and must tolerate lost-update gracefully (over-fire, never under-fire).
- **The 3-of-3 gate earns its cost**: it caught a real production concurrency bug
  two rounds deep that single-run validation + my own claims missed (R12 — my
  "26/26"/"4/4" held only on the lucky runs). Trust the FAIL; fix the root cause.

Fire commits: `826be35aa4`+`4a939fc35f` (#11a), `05e3c45196` (autotrigger
hermeticity), `8c945662ac` (#4), `a6aee37203` (#11b), `c28c8875ca` (flaky fix),
`98312e8a08` (race fix). Synthesis: `OBSIDIAN-TOKEN-CONTEXT-SYNTHESIS-2026-06-09.md`.
