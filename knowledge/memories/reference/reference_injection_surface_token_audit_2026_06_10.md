---
name: reference_injection_surface_token_audit_2026_06_10
description: "Operator-directed token-efficiency audit of the auto-injected context surface (slot:bravo, 2026-06-10). LIVE-MEASURED surface = 59 UserPromptSubmit hooks + 55 SessionStart hooks fire every prompt/session across 26 slots. SHIPPED win: cag-router-inject no-signal suppression (the HYBRID conf-0%/no-sources route is the MOST COMMON classification fleet-wide per summarize()'s own comment -- now emits 0 bytes instead of ~290B/~50 tokens while STILL writing the sidecar the consumers read). Prioritized backlog: master-index relevance-floor (needs eval-harness calibration), the memory-index score:0.0 DISPLAY-artifact trap (RRF scale, NOT noise -- do NOT suppress), Ollama-offload belongs on the cron/synthesis path not the per-prompt path, slot-injector gating audit, take-rate-driven prioritization."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.623Z
aliases: reference_injection_surface_token_audit_2026_06_10
---


# Auto-injection token-efficiency audit (slot:bravo, 2026-06-10)

Operator directive: "improve token efficiency across the entire galaxies, domains
and systems. looks like we're auto inject a bunch of context. make it more token
efficient without sacrificing quality. if we can offload into ollama lets try it
or other ideas, make suggestions."

## LIVE-MEASURED surface (read from H:/.claude/settings.json, not estimated)
- **59 UserPromptSubmit hooks** fire on EVERY prompt.
- **55 SessionStart hooks** fire on EVERY session start.
- Across 26 NATO slots this is the dominant recurring context cost.
- Quality-preserving lever = **relevance-floor suppression**: stay SILENT when a
  surface's own signal is below threshold, instead of injecting noise every prompt.
  This removes tokens with zero quality loss (a 0-relevance hit carries no signal).

## SHIPPED (TOKEN-EFFICIENCY-INJECT/U-CAG-NOSIGNAL-SUPPRESS)
`.claude/hooks/cag-router-inject.mjs` -- the classifier's MOST COMMON output
(per `summarize()`'s own code comment) is the no-keyword-match route:
`HYBRID (conf 0%) -> (no sources)`. The hook ALWAYS emitted a ~3-line visible
block for it. The SIDECAR is the real product (downstream master-index /
memory-relevance / tribal-by-domain injectors read it via cag-consume.mjs to
short-circuit on COLD hits); the visible block is operator-facing only.
- FIX: suppress the VISIBLE emit when `confidence < minConf (0.15) AND zero
  cold/hot sources AND savings==0`; the sidecar is still written first, so the
  consume path is byte-identical. `verbose` keeps the surface;
  `PRISM_CAG_ROUTER_MIN_CONF=0` restores legacy always-emit.
- LIVE: no-signal prompt stdout 290B->0B (~50 tokens/prompt/slot saved on the
  majority route); doctrine prompt still emits 410B (signal preserved).
- 17/17 tests (4 new: suppress-but-write-sidecar, verbose-override,
  minConf=0-legacy, route-with-sources-never-suppressed).

## SHIPPED 2 (TOKEN-EFFICIENCY-INJECT/U-MASTER-INDEX-THROTTLE, commit 7bcdd4b49b)
`.claude/hooks/master-index-precheck-inject.mjs` had NO same-prompt throttle, so a
/loop (re-submits the IDENTICAL prompt every tick) re-injected the same ~1KB top-K
block each tick. Sibling memory-index-precheck-inject already throttles via
`scripts/lib/inject-throttle.mjs` (per-session, atomic-write, fail-open).
- FIX: wire the SAME proven lib -- import + THROTTLE_MS knob
  (PRISM_MASTER_INDEX_THROTTLE_MS, default 60000, 0=off) + shouldThrottleInject()
  AFTER sid resolves, BEFORE the CAG-skip + search, so a suppressed tick does ZERO
  downstream work. Fail-open (no sid / ttl<=0 / I/O error -> inject).
- LIVE: tick1 1172B -> tick2 (identical /loop re-fire) 0B = ~290 tokens/repeat-tick.
  9/9 tests (2 new subprocess). 2-arm scrutiny PASS (0 P0/P1).

## SHIPPED 3 (TOKEN-EFFICIENCY-INJECT/U-TRIBAL-DOMAIN-THROTTLE, commit 87e5057dd1)
`.claude/hooks/tribal-by-domain-inject.mjs` spawns the tribal-rerank subprocess +
an Ollama embed (~3-4s, ~2KB) on every prompt; had NO same-prompt throttle. Third
application of the inject-throttle pattern.
- FIX: shouldThrottleInject before the CAG read AND the rerank subprocess (zero
  work on a throttled tick), using this hook's approve()/tele() idiom (NOT
  process.exit -- would bypass main().catch()). Knob PRISM_TRIBAL_DOMAIN_INJECT_-
  THROTTLE_MS (IIFE-parsed so "0" stays off). Fixed adjacent header doc-drift
  (TIMEOUT_MS 4000->2500).
- LIVE: tick-1 stamps state; identical 2nd tick ts UNCHANGED (suppression proof,
  Ollama-agnostic). 51/51 tests (2 new). 2-arm scrutiny PASS (0 P0/P1).
- QUALITY CAVEAT (arm-B P2): within 60s an identical looped prompt won't re-surface
  tribal hits if a peer rebuilds the index mid-window. Acceptable + sibling-consistent
  (advisory ranking, not safety; fresh prompts never throttled).

## SHIPPED 4 (TOKEN-EFFICIENCY-INJECT/U-WIKI-TRIBAL-DEDUP, commit 392195175b)
Backlog item #5 below -- the two SessionStart wiki-tribal coverage blocks. The
GLOBAL hook (`wiki-tribal-coverage-inject.mjs`) emitted a fleet-wide headline
PLUS a "Top N missing" file list; the per-domain sibling emits worst-N domains
with actionable samples. The global "Top N missing" is the LOW-signal half
(deterministic-sorted global files, not slot-relevant).
- FIX: the global hook drops its sample list when the per-domain sibling WILL
  render (keeps the unique headline + footer). Imports the sibling's PURE gate
  fns (loadReport/pickWorst + newly-exported REPORT_PATH) so the gate is
  single-sourced; new `perDomainWillRender(reportPath,nowMs)` honors the SAME
  sibling knobs; fail-safe -> false (keep samples) on ANY error. formatDigest
  stays pure (opts.suppressSamples); I/O prediction in main() only. Knob
  PRISM_WIKI_TRIBAL_DEDUP=0 = legacy.
- LIVE A/B (real data, sibling rendering): 552B -> 372B = ~180B/~45 tokens per
  SessionStart, fleet-wide. Headline 69.2% + footer kept, "Top" dropped.
- 29/29 parent (+7), 39/39 with sibling. 2-arm scrutiny PASS 0 P0/P1; convergent
  P2 (predictor re-derives gate vs calling formatPayload) hardened inline with a
  coupling comment in the sibling's formatPayload.
- QUALITY: zero loss -- when per-domain is stale/disabled/empty the global samples
  are KEPT (no regression). Worst case on a wrong prediction = mild redundancy,
  never suppression of unique signal.

## SHIPPED 5 (TOKEN-EFFICIENCY-INJECT/U-ROUTE-SAVINGS-BAND-GATE, commits 4cbcfdaf60 + f9d8624aa8)
Backlog item #6b below -- the route-savings SessionStart banner, the single
largest persistent SessionStart waster by `bytes x fires x (1-take)`. It fired
10,210x at a stuck 0.4% take-rate, re-emitting the SAME "0.4% below target"
~322B banner every session x 26 slots.
- FIX: a rate-BAND gate. `computeRateBand` buckets the measured take-rate into
  5pp bands (warming / b0 / b1 / ...). `shouldEmitBanner` emits ONLY when the
  band moved since last shown fleet-wide (either direction), or the last show is
  >24h old (daily-refresh floor), or there is no/garbage/future shownAt. Else
  silent. `formatBanner` output is byte-identical (refactored to share a new
  `rateOf()` helper -- single-sourced rate, R7; all 24 original tests still green).
- DESIGN CORRECTION vs the #6b note below: the note said "store lastShownRateBand
  in the sidecar." DON'T -- the route-suggest sidecar is written by the telemetry
  collector; a 2nd writer races it. The band-state lives in its OWN file
  (`state/shared/route-savings-banner-band.json`), fleet-global (the stat IS
  fleet-global, so suppressing 25/26 redundant copies/session is the real win).
- LIVE A/B (real sidecar, 10210 fires / 0.4% / band b0): run1 emits 322B + writes
  state; identical run2 suppresses (0B). Quality-preserved: operator still sees
  every real rate move + a daily heartbeat; /route-suggest-stats always available.
- 42/42 tests (24 original byte-identical + 18 new: band boundaries 49vs50,
  emit/suppress/refresh/future-ts, 5 E2E subprocess incl legacy + full-disable).
- SCRUTINY NOTE (R12): the 3 Claude scrutiny agents were org-bucket rate-limited
  (0-token errors, ~10 peer loops). Review was routed to LOCAL Ollama
  (qwen2.5-coder:32b) + primary self-cross-check -- the offload is itself on-goal.
  Ollama found 1 real issue (future-shownAt over-suppression, fixed in -HARDEN);
  its other 5 findings were hallucinated missing try-catch (verified present).
  The full 3-Claude-arm pass remains PENDING for when the org bucket recovers.
- Knobs: PRISM_ROUTE_SAVINGS_BANNER_BAND=0 (legacy always-emit), _BAND_WIDTH_PCT,
  _BANNER_MAX_SILENT_MS, _STATE / PRISM_ROUTE_SUGGEST_SIDECAR (hermetic test).

## SHIPPED 6 (TOKEN-EFFICIENCY-INJECT/U-INJECTION-SURFACE-CENSUS) -- the SAFE core of #6
`scripts/audit-injection-surface.mjs` (+ .test.mjs, 17/17) -- a read-only,
data-driven census of the recurring auto-injection surface. Parses settings.json
-> enumerates SessionStart + UserPromptSubmit injectors -> detects each one's
disable knob + whether it emits context -> enriches with fire-rate from the
existing hook-fire ledger (reuses hook-fire-rank.mjs exports, no fork).
- WHY NOT the full `bytes x fires x (1-take)` ranker (the #6 REMAINING item): it
  is NOT buildable on a proven foundation yet (R13). (a) bytes needs to EXECUTE
  each hook (side-effect risk -> needs a sandboxed harness); (b) fires telemetry
  is mostly ABSENT -- the hook-fire ledger instruments only **2 of 114** of these
  injectors (verified live: only skill-auto-trigger 190.9/hr + tribal-by-domain
  3.3/hr have entries); (c) per-injector TAKE telemetry does not exist at all.
  So the ranker's 3 inputs are all largely missing. Census ships the safe half.
- KEY REFINEMENT (R12): separate context-EMITTING injectors (real token gap) from
  infrastructure GUARDS (git-health-guard, portable-node-guard, dotclaude-
  junctions-guard, ...) that emit ~no context. The naive count was 32 knobless;
  the ACTIONABLE count is 6 knobless context-injectors. Don't mislabel a guard.
- LIVE: 114 recurring injectors (55 SS + 59 UPS, matches the manual figure above),
  78 context-emitting, 71.9% knob coverage, 0 unresolved.
- **6 KNOBLESS context-injectors = the next token-efficiency targets (add a
  disable knob to each):** auto-consensus-userprompt [UPS], chat-state-isolator
  [SS], inventory-check-guard [SS], local-compute-intent [UPS], session-reorient-
  inject [UPS], stale-state-warn [UPS]. Each emits context every prompt/session
  with NO way to silence.
- NEXT (dependency-ordered): (i) add a `PRISM_<NAME>_DISABLE` gate to each of the
  6 (trivial, high-value, closes this gap) -- verify each is not peer-owned first;
  (ii) the byte+fires instrumentation layer (a sandboxed hook-output measurer +
  extend the fire ledger to all injectors) that would finally enable the full
  `bytes x fires x (1-take)` ranker. Re-run the census after each: `node
  scripts/audit-injection-surface.mjs`.

## SHIPPED 7 (CENSUS self-correction + KNOB-CLOSE) -- the closed loop
A complete find->fix->verify arc on the census's own output:
- **U-CENSUS-KNOB-ACCURACY:** R8-reading the 6 flagged hooks caught 2 FALSE
  POSITIVES (local-compute-intent HAS PRISM_LOCAL_COMPUTE_SILENT/_AUTOSTART;
  stale-state-warn HAS PRISM_STALE_STATE_WARN=0). detectKnobs missed SILENT/WARN
  + the `=== "0"`/`!== "0"` gating idiom. Widened: name-verb set + idiom-match;
  config vars (TIMEOUT_MS, WIKI_ROOT) still excluded. knobless 6 -> 3 (accurate).
- **U-KNOB-CLOSE:** added disable knobs to the 3 GENUINELY-knobless context-
  injectors. PRISM_AUTO_CONSENSUS_DISABLE (auto-consensus-userprompt),
  PRISM_SESSION_REORIENT_DISABLE (session-reorient-inject -- the TOP per-prompt
  consumer, ~2069B per the U-FORGE-AUDIT-INJECTOR-BUDGET-FINDING memo),
  PRISM_CHAT_STATE_ISOLATOR_SILENT (chat-state-isolator -- SILENCE knob that
  KEEPS the load-bearing dir-isolation work, only drops the context line).
- LIVE: census knob coverage 71.9 -> 78.1%; KNOBLESS context-injectors 6 -> 3 -> 0.
  Every recurring context-emitting injector is now operator-silenceable.
- 4/4 knob-gate subprocess tests (.claude/hooks/__tests__/injection-knob-gates.test.mjs)
  incl a negative control proving each knob is load-bearing (R9).
- LESSON: R8 (read the real thing before acting on a tool's output) caught my own
  tool's 33% false-positive rate before I acted on the wrong list. Get the
  measurement RIGHT before the fix (R13). This is the #2 closed-loop self-correction.
- KNOWN FOLLOW-UP: the census parses the 250K-line hook-fire ledger every run for
  a 2/114-match fire-rate enrichment (slow). A `U-MWO08` byte-measure script
  reportedly exists -- wiring REAL per-injector bytes into the census (+ defaulting
  --no-fire-rate) is the next census enrichment toward the full bytes x fires ranker.

## SHIPPED 8 (TOKEN-EFFICIENCY-INJECT/U-INJECTION-BYTES-RANK, commit on cad-fusion-live-ms0) -- the bytes dimension
Wired REAL per-injector bytes into the census (awareness-roadmap unit #1).
- **Reuse, no fork:** found `U-MWO08` = `scripts/measure-userpromptsubmit-budget.mjs`
  (Measure-UserPromptSubmit-budget). Imported its proven `probeHook` +
  `PROBE_PROMPT_DEFAULT`. probeHook runs a hook with a probe stdin and measures
  the emitted `additionalContext` bytes.
- **New surface in audit-injection-surface.mjs:** `--bytes` (opt-in; RUNS each
  hook -> side-effect + slow, documented), `--probe "<text>"` (drive realistic
  emissions; default the richer MWO08 prompt). `computeWeight(bytes, fires)` pure
  (null when either missing, rejects negatives). buildAudit 4th arg `bytesByKey`
  (optional, back-compat). Two cut lists: `topByBytes` (PRIMARY -- raw bytes, the
  dominant signal, works even with no fire data) + `topByWeight` (REFINED --
  bytes x fires/hr, only hooks the fire-counter instruments). 27/27 tests.
- **LIVE-VALIDATED (UPS surface, real numbers):** the cut list ranks by payload --
  `slot-domain-awareness-inject` **1461B** (#1 -- emits all 26 slot domains every
  prompt), master-index-precheck 867B, obsidian-vault-precheck 844B,
  psn-leg-state 662B, memory-index-precheck 454B, cag-router 375B. All gated.
- **R7 conflict resolved:** my own handoff said "default --no-fire-rate", but
  bytes x fires NEEDS fires -> kept fire-rate default-on; --no-fire-rate stays the
  fast knob-only path. **R12 honest limits surfaced (not hidden):** (a) probed
  bytes are a LOWER BOUND (synthetic probe under-emits keyword/state-gated hooks);
  (b) the fire-counter ledger instruments only **12 hooks** total -> fireRate is
  honestly null (never 0-faked) for the rest, so topByWeight is thin BY DESIGN
  until the fire-counter is widened (a separate unit, not this one).
- **TEES UP roadmap unit #2:** gate/compress the worst-by-bytes injectors --
  `slot-domain-awareness-inject` (1461B/prompt, all 26 slot domains) is the #1
  compression target; it already has PRISM_SLOT_DOMAIN_AWARENESS_DISABLE.
- Ollama qwen2.5-coder:32b + self-cross-check review (free, RATE-LIMIT GUARD);
  3-Claude-arm scrutiny gate DEFERRED (org bucket rate-limited all session).

## SHIPPED 9 (TOKEN-EFFICIENCY-INJECT/U-INJECTION-KNOB-ENFORCE) -- AUTO-ENFORCEMENT, not suggestion
Operator sharpened deliverable #2: "we need auto enforcement when necessary, not
suggestions so you actually follow your own instructions." The census + knob-adds
+ cut-list were all ADVISORY -- a chat can ignore them. This unit makes the
knob-coverage discipline SELF-ENFORCING.
- **`.claude/hooks/injection-knob-enforce.mjs`** (PreToolUse Write, tier-0): HARD-
  BLOCKS (`permissionDecision:"deny"`) the creation of a SessionStart/UserPromptSubmit
  context-injector that has NO PRISM_* disable knob. Block message carries the exact
  one-line fix + the suggested knob name (basename -> PRISM_<NAME>_DISABLE).
- **Build-once detector, now ENFORCES:** imports `detectKnobs` + `emitsContext` from
  `scripts/audit-injection-surface.mjs` -- the SAME logic the census MEASURES with,
  so measure + enforce can never drift apart.
- **Precise signal (bounds false-positives):** emitsContext AND hookEventName is
  SessionStart|UserPromptSubmit AND zero knob. Stop/PostToolUse emitters, no-context
  guards, and already-gated injectors all PASS. Write-only scope (Edit-introduced
  emission is a documented gap -- Write is where injectors are born). Fail-OPEN on any
  throw. Bypass: PRISM_INJECTION_KNOB_ENFORCE_DISABLE=1.
- **WIRED** settings.json PreToolUse "Write|MultiEdit" group (C: edited -> c-to-h-mirror
  -> H:; both refs verified, both valid JSON). 11/11 tests; LIVE: knobless injector
  Write -> deny w/ fix; gated/non-hooks -> allow.
- This is the U-MWO08-flagged "enforcement gate left to a follow-up" finally built,
  and the first ENFORCEMENT (vs measurement) unit of the token/awareness goal.

## MEASUREMENT CORRECTION (R12 -- do NOT chase the overstated 1461B)
The U-INJECTION-BYTES-RANK `--bytes` probe sends NO session_id, so it measures
FIRST-EMIT size. `slot-domain-awareness-inject` already has session-scoped dedup
(`scripts/lib/injection-dedup.mjs`): PROVEN live 1461B (first) -> **126B (repeat)**,
an 11.6x overstatement. Its steady-state per-prompt cost is ~126B, NOT 1461B -- it is
ALREADY optimized for the repeat case. LESSON (same as SHIPPED 7): the cut-list's
raw-bytes ranking is a FIRST-EMIT upper bound; for dedup-adopting hooks the real
recurring cost is the repeat-emit size. A future steady-state probe (two-probe with a
shared session_id) would make the cut-list rank by true per-prompt cost -- but that is
MORE measurement; the operator wants enforcement, so it is deprioritized.

## Per-prompt throttle family status (the heavy injectors)
memory-index = had throttle. master-index + tribal-by-domain = ADDED this session.
The 3 heaviest per-prompt injectors now all short-circuit /loop re-fires. Candidate
remaining per-prompt injectors to audit for the same gap: none confirmed heavy yet.

## PRIORITIZED BACKLOG (verified findings -- suggestions to operator)

1. **master-index-precheck relevance-floor [MED, needs calibration].**
   `master-index-precheck-inject.mjs` emits top-K AFTER lexical-rerank with NO
   minimum-score gate. This turn it surfaced 5 `surface-finish` nodes for a
   token-efficiency prompt -- they scored ~0.19 off a SINGLE common token
   ("finish" in "surface finish"). `lexical-rerank.mjs scoreCandidate` returns
   ~0..1 (weights sum 1.0). A floor ~0.2 would suppress these. RISK: must use
   the U-RAG-5 eval harness (`prism_dev:rag_eval_run`) to calibrate so it never
   drops a legitimate single-strong-token match. The rerank currently DISCARDS
   its score (returns `s.cand`); the floor needs `rerank()` to expose the score.

2. **memory-index `score: 0.0` is a DISPLAY artifact, NOT noise -- do NOT suppress.**
   When ollama is up, `runMemoryIndexSearch` takes the HYBRID path: `tryHybridFuse`
   returns Reciprocal-Rank-Fusion scores (`1/(60+rank+1) ~= 0.016`) which
   `.toFixed(1)` renders as "0.0". Those hits passed a dense-cosine `sim>0` gate
   -- they ARE semantically retrieved. A naive "suppress score 0.0" floor would
   NUKE the entire hybrid path = quality loss. The real improvement is a DISPLAY
   fix (show source `hybrid`/rank instead of a misleading 0.0), not suppression.
   (Documented so no one "optimizes" this wrongly -- it is a trap.)

3. **Ollama offload belongs on the CRON/synthesis path, NOT the per-prompt inject path.**
   Per-prompt injectors are synchronous + latency-bound; `lexical-rerank.mjs`
   explicitly says a per-prompt model/network call there is "architecturally
   wrong". The right Ollama targets are the SessionStart SUMMARY/SYNTHESIS
   producers (CLAUDE-BRIEF, awareness-snapshot, wiki-tribal-coverage) -- already
   pre-computed by scripts/crons; route THEIR summarization to qwen2.5-coder:32b
   (gpt-oss:120b for deep). Offload is 11% vs 30% target -- the headroom is here,
   not on the prompt path.

   **CORRECTION 2026-06-10 (R12 -- VERIFIED, this premise was WRONG):** grepped
   all 4 named producers for REAL model-invocation signatures (fetch/11434/
   /api/generate/anthropic/askOllama/messages.create/.generate). ALL FOUR have
   **0 model calls -- they are pure deterministic file-assembly**:
   `generate-claude-brief.mjs` (the 26 keyword hits were the literal word
   "claude", not API calls), `awareness-snapshot.mjs`, `wiki-tribal-cross-ref-
   audit.mjs`, `audit-tribal-coverage-by-domain.mjs` -- all 0. They spend NO
   model tokens, so there is NOTHING on these producers to offload to Ollama.
   The 11%-vs-30% offload gap is NOT here. The real Ollama-offload headroom is
   in the TASK-ROUTING layer (OllamaHookBridgeEngine / ask-ollama for
   code-explain/summarize/lint/triage TASK TYPES the model does inline) -- a
   different surface than the auto-inject context the operator pointed at.
   #3 is RETIRED as written. Next Ollama-offload work should target the
   task-routing layer (which inline Claude tasks could route to qwen2.5-coder:
   32b), measured via ollama-offload-dashboard.mjs -- NOT the inject producers.

4. **Slot-injector gating audit [VERIFIED NO-OP 2026-06-10 -- gating is SOUND].**
   Audited the 11 slot-specific awareness injectors (delta-cad, echo-post,
   xray-blueprint, foxtrot-mill, sierra-graph, lima-academy, charlie-quoting x2,
   whiskey-lathe, alpha-token, india-awareness). Each gates correctly:
   `shouldInject = keywordHit || activeSlotIsX` (own-slot ALWAYS + domain-keyword
   cross-slot), and india is stricter (own-slot only). Cross-slot keyword-relevant
   context is a QUALITY feature, NOT waste -- so NO fix is warranted (documented so
   it is not "optimized" wrongly). Lesson: verify gating before assuming waste.

5. **Duplicate SessionStart coverage. [SHIPPED 2026-06-10 -- commit 392195175b]**
   `wiki-tribal-coverage-inject` AND `wiki-tribal-coverage-per-domain-inject`
   both emit overlapping coverage data at SessionStart. RESOLVED via U-WIKI-
   TRIBAL-DEDUP (see SHIPPED 4 above): the global hook drops its redundant
   "Top N missing" list when the per-domain block renders, keeping its unique
   headline. ~180B/~45 tok/SessionStart saved, fleet-wide, zero quality loss.

6. **Take-rate-driven prioritization is the systematic path.** route-savings
   telemetry fired 10,169x at 0.4% take-rate. `feature-counter.mjs` already
   instruments some injectors. Extend per-injector fire-vs-take instrumentation,
   rank by `(bytes x fires x (1 - takeRate))`, and gate/cut the worst. This is
   the measurement-driven version of the operator's instinct ("we auto-inject a
   bunch of context").

   **MEASURED 2026-06-10 (#6 progress, zero-spend pass) -- the SessionStart
   banner cost, with the worst offender quantified:**
   - `route-savings-session-start-inject.mjs` (tier T4) emits a **3-line ~290B
     block EVERY SessionStart**: `## 💰 Route-savings telemetry` + the
     fires/take/est line + the disable-knob line. LIVE: 10,193 fires @ **0.4%
     take (38/10,193)** -- persistently "below 30% target" for the entire
     window. Sidecar `state/shared/mcp-route-suggest-stats.json`. Disable knob
     already exists: `PRISM_ROUTE_SAVINGS_INJECT_DISABLE=1`.
   - Sibling PSN-savings block (~4 lines ~480B) renders right after it.
   - Combined ~770B/SessionStart x 26 slots x sessions/day. By the #6 metric
     `bytes x fires x (1-take)` this is the single largest persistent
     SessionStart waster (max bytes, max fires, take ~= 0).
   - **RECOMMENDATION (operator decision -- this is alpha's token-optimization
     telemetry; bravo defers the cut/gate to operator sign-off rather than
     unilaterally editing a peer galaxy's ROI dashboard, R7):** one of --
     (a) **compress to 1 line** when rate is persistently below target (the
     multi-line breakdown adds ~0 signal once the message is just "still 0.4%");
     (b) **gate to fire only on rate-CHANGE / target-cross** (a banner that says
     the same "0.4% below target" every session is a standing nag at 0.4% take,
     not a fresh signal); or (c) leave as-is if the operator values the constant
     visibility. Lowest-risk + quality-preserving = (b): emit only when the
     measured rate crosses a band boundary since last shown (store last-shown
     rate in the sidecar), else silent. Est. save ~770B/session on the steady
     state, zero signal loss (operator still sees every actual change).
   - **(b) SHIPPED 2026-06-10 as U-ROUTE-SAVINGS-BAND-GATE (see SHIPPED 5 above).**
     Built as a rate-BAND gate (5pp bands, 24h refresh) with its OWN state file
     (NOT the sidecar -- corrected the design note). ~322B/session saved fleet-wide.
   - REMAINING NEXT BUILD: the general `bytes x fires x (1-take)` ranker over
     `feature-counter.mjs` + route-suggest stats, to make injector cuts
     data-driven fleet-wide instead of eyeballed. This is the systematic #6 path
     (one ranker -> a ranked punch list of the worst injectors). Real code unit
     needing 2-arm scrutiny -- next dependency-ordered pick for a fresh-budget tick.

## Related
[[token_saving_infrastructure]] - [[reference_cag_router_2026_05_26]] -
[[reference_alpha_cag_cold_cache_anchor]] - [[reference_alpha_token_awareness_surface]] -
[[reference_cag_router_hook_inject_2026_05_26]] - [[feedback_ollama_token_routing]]
