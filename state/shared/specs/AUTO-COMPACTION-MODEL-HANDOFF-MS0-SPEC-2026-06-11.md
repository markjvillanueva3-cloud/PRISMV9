# AUTO-COMPACTION-MODEL-HANDOFF-MS0 -- the formula (spec, 2026-06-11, slot:alpha)

> Operator directive (2026-06-11): "formulize auto compaction fleet wide so that when we hit
> 90-95% each chat slot auto initiates precompaction session handoff (MUST NOT BE DONE BY HELPER
> SINCE IT LEAVES STUBS!!!) -- session handoff needs to contain optimal context. optimize prism
> awareness and prism injection for all galaxies."
>
> This RESOLVES the deferred U-PRECOMPACT-HARDBLOCK-INTENT toward option-a (restore the 90-95%
> trigger) with a hard constraint: the handoff is MODEL-authored, never helper-synthesized.

## THE FORMULA (mechanism, fleet-wide, all 26 slots)

```
ctx% >= 88% (SOFT 880K)  -> inject a MODEL-AUTHORING DIRECTIVE: "write an OPTIMAL handoff NOW
                            (template below) via per-agent-handoff write with REAL content;
                            do NOT invoke the stub-helper skill." Non-blocking.
ctx% >= 94% (HARD 940K)  -> decision:block the next tool call with the SAME directive until a
                            FRESH model-authored handoff exists this session.
ctx% >= 95% (950K)       -> native autocompact (CLAUDE_AUTOCOMPACT_PCT_OVERRIDE=95) fires.
                            The PreCompact helper MUST detect the fresh model handoff and SKIP
                            (no generateSmartResume stub, no padFileToBytes padding).
```
CONTEXT_CAP=1,000,000; 90-95% == 900K-950K == the existing SOFT(880K)/HARD(940K) band. Thresholds
are already ~right; the work is (a) reliable firing, (b) model-authoring directive, (c) helper-skip.

## WHY NOT A HELPER (operator !!!)
`precompact-handoff.mjs` (PreCompact hook) auto-writes via `generateSmartResume()` + `padFileToBytes()`
-- a synthesized RESUME padded to a fixed byte size. That is the "stub" the operator banned (aligns
with [[feedback_handoff_writers]]). Only the MODEL knows the real session state (goals, commits/SHAs,
in-flight work, key file:lines, open decisions). The helper becomes a FALLBACK-of-last-resort only.

## THREE UNITS TO BUILD (logical order)

### U1 -- model-authoring directive (precompact-auto-trigger.mjs, SOFT + HARD messages)
Replace the current "Invoke the precompact skill" text with a directive that instructs the MODEL to
author the handoff itself per the OPTIMAL-CONTEXT TEMPLATE (below), writing through
`node H:/prism/.claude/helpers/per-agent-handoff.mjs write --terminal <stable> --resume "<next>" --state "<md>"`.
Preserve the test-matched substrings `CONTEXT AT` / `PRECOMPACT` (HARD) and `/precompact REQUIRED`-class
marker (SOFT) OR update precompact-auto-trigger.test.mjs in lockstep. SAFE (text-only; no threshold logic change).

### U2 -- reliable firing (THE under-fire fix; PREREQUISITE for U1 to matter)
5 tests in precompact-auto-trigger.test.mjs fail: HARD/SOFT return silent {continue:true} when tokens
are legitimately >= HARD/SOFT. ROOT CAUSE CONFIRMED (clean spawnSync probe): the OS env sets PRECOMPACT_{SOFT,HARD}_TOKENS=99000000
(99M; NOT in any settings/tracked file) so tokens never reach HARD -> never fires. The 5 tests fail
because they inherit that env. See [[reference_precompact_autotrigger_disabled_99m_2026_06_11]]. The hook
CODE is correct. (Earlier iter-2 probes were FIXTURE-broken, (echo/printf quoting mangled the stdin JSON + the isolated slots.json was never
written), so they proved nothing. REQUIRED: a CLEAN spawnSync probe (write fixtures via node fs, not
shell echo) driving the real hook with sidecar tokens=945K and with an assistant-source 950K
transcript; instrument tokenSource. Then fix whichever read path (sidecar / lastAssistantTokens /
estimateFromBytes) drops the >=HARD value to silent. Do NOT ship U1 as "working" until U2 is green
(R12 -- a directive that never fires is a dead promise).

### U3 -- PreCompact helper defers to the model handoff
`precompact-handoff.mjs`: before writing, check for a FRESH (<this session) model-authored handoff via
per-agent-handoff read; if present, SKIP entirely (no stub, no pad). Only synthesize when the model
left nothing (true last-resort). Removes the stub-overwrite the operator banned.

## OPTIMAL-CONTEXT HANDOFF TEMPLATE (what the model writes -- the "optimal context")
```
## RESUME
<one-line next action -- the single most important thing to do next>

## GOAL (standing)
<the active goal/loop task verbatim>

## DONE + VERIFIED (this session)
- <commit SHA> <unit> -- <what + how verified (tests/numbers)>

## IN-FLIGHT (not yet committed)
- <file:line> <what is half-done + the exact next step>

## KEY FILE:LINE REFS
- <the 3-8 file:line anchors the next session needs (no re-discovery)>

## OPEN DECISIONS / BLOCKERS
- <operator-gated or cross-slot items>

## MEMORY / SPEC POINTERS
- [[reference_*]] / state/shared/specs/*  (durable context already written)
```
Rule: facts + file:line + SHAs, NOT prose. <= the size the next session can act on without re-deriving.

## FLEET-WIDE + ALL-GALAXY (parts 2-3 of the directive)
- The trigger hook is fleet-global (fires for every slot) -- U1/U2/U3 apply to all 26 slots with no
  per-slot work.
- PRISM injection optimization for all galaxies: SHIPPED this session (fleet-wide via settings.json env)
  -- 4 injector throttles 60s->300s + rewriter same-prompt throttle (52d3ae14e7) + 2 dead-hook disables;
  per-slot awareness hooks verified ALREADY throttled. See [[reference_injection_throttle_tuning_2026_06_11]].
- PRISM awareness optimization: the per-turn awareness stack is the same injector chain now throttled.
  Remaining: SessionStart injector audit (CLAUDE-BRIEF/PSN/BUILD_STATE/CAG-anchor/wiki-tribal x2) -- fires
  once/session so lower per-turn impact; queued.

## ACCEPTANCE (R15)
- U2: clean spawnSync probe shows HARD block fires at 945K sidecar AND 950K assistant; 5 red tests -> green.
- U1: at >=SOFT, injected directive instructs MODEL to author the handoff (no skill-invoke), template present.
- U3: with a fresh model handoff on disk, precompact-handoff.mjs writes NOTHING (asserted).
- Round-trip: simulate 88%->94%->95% -> model writes optimal handoff -> /startup resumes from it cleanly.
- Fleet: knob-gated (PRECOMPACT_SOFT_TOKENS / PRECOMPACT_HARD_TOKENS / CLAUDE_AUTOCOMPACT_PCT_OVERRIDE).
