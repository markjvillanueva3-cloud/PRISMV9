# Context / Awareness / Obsidian improvements — RECONCILED supplement (2026-06-21, slot:alpha)

> **R8/dedup correction:** the byte-side of this concern was already audited rigorously in
> [`FLEET-INJECTION-BUDGET-AUDIT-2026-06-11.md`](FLEET-INJECTION-BUDGET-AUDIT-2026-06-11.md)
> (10-agent measured pass over all 60 UserPromptSubmit + 57 SessionStart injectors). That audit is
> CANONICAL for injection byte-budget. This file does NOT duplicate it — it records only what is
> genuinely NEW from running the stack live this session, and corrects one over-estimate of mine.

## What the 06-11 audit already established (do NOT re-find)
- Measured per-turn injection cost: **~3,208 B (~917 tok) identical-prompt, ~9,247 B (~2,642 tok) changing-content ceiling** per slot.
- The big structural sink **slot-context-bundle was already deduped 2026-06-09** (U-OBS-SLOTBUNDLE-DEDUP).
- prompt-context-inject stale-daemon notice fixed; several "offenders" were FALSE POSITIVES (signal-gated guards emitting 0B on a normal turn).
- Audit's own conclusion: **the remaining byte levers are INCREMENTAL** (dedup-wrap a few standalone emitters; restart the context-bundle daemon so one compact bundle replaces the legacy injectors). The structural win is banked.

## My over-estimate, corrected (R12)
My first pass claimed the static blocks waste "~15-25KB/turn." **Wrong.** I conflated the galaxy-doctrine *persisted-to-disk* file (13KB, externalized — only a ~2KB preview is in-context) with in-context cost. The live-measured ceiling is ~2.6K tok/turn (06-11), and the structural fix already shipped. The TTL-expiry effect below is bounded by that ceiling, not additive to a 15-25KB phantom.

## GENUINELY NEW findings (not in the byte-budget audit)

### AW-1 [VERIFIED, the real lever] — conflicting context-pressure signals (a CORRECTNESS issue, orthogonal to byte cost)
- **First-hand, repeated this session:** `zulu-advisory-inject` emitted "pressure=critical ~1004K tokens → /compact recommended" while `slot-context-bundle-inject` simultaneously emitted "decision: noop — token-zone-green". The model gets contradictory readings of its OWN context every turn.
- **Why the 06-11 audit missed it:** that audit measured BYTES (zulu-advisory is gated/small → "not waste"). This is about the CORRECTNESS of the pressure reading, not its size. Different axis.
- **Root cause:** `zulu-advisory-inject` still derives "critical" from a transcript-byte estimate — the same phantom class fixed for chat-token-watch (`reference_compact_phantom_byte_estimate_fix_2026_06_11`) + token-awareness stale-zone (`reference_token_awareness_stale_zone_fix_2026_06_11`), but zulu-advisory was not brought onto the authoritative per-turn `usage` signal.
- **Fix:** route zulu-advisory's pressure verdict through the SAME authoritative per-turn `usage` that slot-context-bundle uses; demote the byte-estimate to a labeled secondary line that can never actuate a "critical"/`/compact`. One coherent pressure reading per turn. **This is the #1 buildable unit.** Note: `zulu-advisory-inject` is zulu-lane — coordinate or build with the alpha-owned token-awareness libs it should consume.

### CU-1 [RESOLVED 2026-06-21 — MEASURED non-problem, do NOT build] — dedup TTL (5min) vs deep-work cadence
> **Measured close-out (2026-06-21, slot:alpha, post-AW-1):** ran the doctrine-prescribed `audit-injection-surface.mjs --bytes`. Verdict: the per-turn injection surface is ALREADY comprehensively optimized — **0 knobless context-injectors**, 64/65 UserPromptSubmit injectors gated, byte cut-list tops at session-reorient 2484B (a ~1-in-15 firer, max-fire not per-turn). The stable blocks (slot-soul/slot-domain/blackwell) already route through `injection-dedup`/`dedupeOrMarker` (1-line marker on repeat within TTL); slot-domain confirmed via `dedupeOrMarker`. Even if the 5min TTL expires across a deep-cadence turn, the re-emit is bounded by the measured ~2.6K tok/turn ceiling and the stable blocks are a small fraction of that. A `STABLE_SESSION_TTL_MS` class is NOT worth the added state/complexity. This is the `feedback_measure_injection_before_dedup_fix` lesson applied: measuring STOPPED a fix for a non-problem. The remaining tok-savings levers are base-context (CAG cold-anchor already caches it) + free-model offload, NOT per-turn injection dedup (DONE).
- `slot-soul-inject.mjs:25 DEDUP_TTL_MS = 5min` (comment: "stable across burst prompts within /loop iters"). The 06-11 measure ran r1/r2 back-to-back (within TTL) so it saw the dedup marker (~219B) and judged dedup "good." But across REAL turns >5min apart (agent/scrutiny work), the TTL expires → session-STABLE blocks (slot-soul, slot-domain, slot-brief, blackwell-doctrine) re-emit full, not marker.
- **Honest sizing:** bounded by the measured ~2.6K tok/turn ceiling — material only if deep-cadence turns dominate AND these blocks are a large fraction of first-emit. NOT the 15-25KB I first claimed. **Verify with a real cross-turn measurement (run the injectors with realistic >5min gaps) before building.** If confirmed material: add a `STABLE_SESSION_TTL_MS` (~session lifetime) class in `injection-dedup.mjs` for genuinely-static blocks (safe — a content change always re-emits via hash miss regardless of TTL).
- CU-1b [RESOLVED 2026-06-21 — measured ~0 value, do NOT build]: `synergy-definition-inject` does have 0 dedup refs (verified, reading the code), BUT it is hard keyword-gated by `SYNERGY_RE` and emits NOTHING unless a synergy-token is in the prompt — it does not appear in the byte cut-list at all. Adopting the dedup lib would only help on the rare turns a synergy-prompt repeats within the TTL; steady-state savings ≈ 0. Not worth the import + sidecar write. (Its `PRISM_SYNERGY_DEFINITION_INJECT_DISABLE` knob already exists for the only real lever — turning it off entirely if undesired.)

## Downgraded (near-optimal / low-value — do NOT chase)
- **CAG 3% cold hit-rate** — the SessionStart headline itself reports "243 of 283 misses are unavoidable first-asks; 2 recoverable (doctrine-fingerprint churn)." Warm-traffic is 82%. Cold-start is inherently unavoidable; the 2 recoverable is negligible. Not a real lever.
- **Retrieval-injector overlap** — already partially arbitrated (CAG skips master-index when it answers). Remaining overlap is small per the 06-11 false-positive analysis.

## Context RETENTION
No new bug. The retention stack (per-chat handoff + topic suffix, current-slot resolver, 3-layer compaction recovery, auto-resume — all USED successfully this session, memory mirroring + semantic recall) is solid. The only retention risk is AW-1 (a false-critical triggering an unnecessary /compact that discards a healthy working set) — fixing AW-1 covers it.

## Bottom line
The byte-budget improvements were largely already FOUND + the structural one SHIPPED (06-11). The one genuinely-new, verified, high-value improvement is **AW-1: unify the context-pressure signals onto the authoritative per-turn usage** (correctness, not bytes). Everything else is incremental or near-optimal. Build AW-1 next (fresh context recommended; coordinate the zulu-lane injector).
