# System Apply-and-Efficiency Assessment (2026-06-17, slot:golf)

> Operator question: "assess our full system to see if we're applying everything we've built effectively and efficiently."
> High-signal pass from live evidence (this session + BUILD_STATE + live injection behavior). NOT an exhaustive
> per-engine audit -- that is a dedicated structured run (best with fresh context + when 429 pressure eases).

## Verdict
**Build + wiring is excellent; the apply-measure-reconcile layer has systematic gaps.**
- `3787 / 3805` engines wired (~100%), 1293 wiki entries. The "did we wire what we built" answer = clear YES.
- But "applied EFFECTIVELY + EFFICIENTLY" exposes a consistent pattern: built faster than verified-firing,
  firing-correctly, measured, de-duplicated, and reconciled.

## The 5 gap classes (with live 2026-06-17 evidence)
1. **Built-but-dormant / bypassed.** `PRISM_ALLOW_UNWIRED=1` in settings.json (orphan-block gate OFF fleet-wide).
   This session: the MCP self-healer was DISABLED + blind to the MCP tasks; 3 reapers (WSL Memory Guard, Zombie
   Reaper v2, Zulu Orchestrator) were silently disabled -- all built, all dormant until re-armed today.
2. **Built-but-partially-applied.** The static-once injection dedup WORKS (live: 5 injectors show `not re-injected
   (token-save)`) but the heavy hitters -- DISCIPLINE-EXPERT, AI-synergy, cross-galaxy, + the 4 redundant knowledge
   prechecks (master-index/wiki/obsidian/memory) -- still fire every turn. ~half the surface. This IS the 429 bloat.
3. **Built-but-mis-applied.** DISCIPLINE-EXPERT injected Post-Processor + UI/UX expertise into a FLEET-HYGIENE chat
   (live, twice this session). Wrong domain, every turn.
4. **Built-but-unmeasured.** The injection-ROI audit is dated 2026-05-25 (3+ wks stale). We built a token-waste
   auditor and stopped running it -- flying blind on the exact bloat causing the 429s.
5. **Built faster than reconciled.** 2955 pending units / 110 milestones + **192 milestones with status-drift**.
   That drift is why this session repeatedly surfaced queue units already done/stale (U-FH02, U-SR06,
   U-SKILL-MIRROR-RECONCILE) -- effort re-spent because tracking != reality.

## Meta-pattern
PRISM optimizes for BUILD + WIRE; under-invests in APPLY + MEASURE + RECONCILE.

## Prioritized fixes (effectively + efficiently)
1. **Re-run the injection-ROI audit** (`scripts/*injection*roi*` / the generator) -- measure the live bloat FIRST.
2. **Finish the dedup rollout** -- apply static-once to the remaining heavy injectors + collapse the 4 knowledge
   prechecks to 1 + gate them to substantive prompts (skip "continue"/"yes"). Direct 429 relief, zero value lost.
   (alpha token-optimization domain; golf can build with care.)
3. **Relevance-gate the mis-targeted injectors** (discipline-expert, cross-galaxy) to in-domain prompts only.
4. **Reconcile the 192 drift milestones** (`build-milestone-progress.mjs`) -- stop re-spending on done work.
5. **Consciously re-arm or retire the bypassed gates** (`PRISM_ALLOW_UNWIRED`, etc.) -- an off safety net is debt.

## Execution method -- FREE LOCAL MODELS to beat the 429s (operator 2026-06-17)
"since they're all free, can we run all 3 simultaneously to combine their work?" -> YES. Push the MECHANICAL ANALYSIS
onto the 3 GPU-resident Ollama models in PARALLEL ($0, NO API rate limit): qwen2.5-coder:32b + gpt-oss:120b +
gpt-oss:20b (~92GB, fits the 96GB Blackwell concurrently). COMBINE via the **octopus** (`MultiModelConsensusEngine` /
`/octopus`) or parallel `ask-ollama` (`scripts/ask-ollama.mjs`). Map:
  - #1 parse-transcript + count injection markers -> free models, consensus the token costs.
  - #2 read-code + find the still-firing heavy injectors / 4 redundant prechecks -> free models, combine.
  - #4 diff envelope-status vs git-reality across 192 milestones -> free models.
**Claude (rate-limited API) does ONLY the final synthesis + the actual code edits + commits** -- a fraction of the
calls = the real 429 relief. This is the Ollama-first ladder applied to the efficiency work itself.
CAVEAT: verify the octopus consensus ledger runs REAL (was a stub until `5cb68aaad3`) before relying; ask-ollama needs
`:11434` UP (if DOWN it silently falls back to Claude -- defeats the purpose, so health-check first).

## MEASURED VERDICT (2026-06-18, slot:golf) -- fixes #1-#3 were ALREADY DONE; do NOT re-chase them
Ran `audit-injection-surface.mjs` (#1 measure) THEN read the live code of every named "heavy" injector. The
measurement OVERTURNED this spec's own premise: the per-turn injection surface is ALREADY comprehensively
optimized. Every named target has a working mitigation (verified by reading the source, not assuming):
  - `session-reorient-inject` 2708B -> throttled to ~1-in-15 prompts (the 2708B is its MAX single-fire, not per-turn;
    the byte-probe ranks by max-fire size, which is why it topped the list while firing rarely).
  - `slot-domain` / `ai-synergy` / `psn-leg` / `model-tier` / `obsidian-vault-precheck` -> already route through
    `dedupeOrMarker` / `injection-dedup` (1-line marker on repeat within 5min TTL).
  - `prompt-route-inject` 1355B -> 12-char gate + 5min-per-class throttle (never fires full every turn).
  - `fleet-work-digest` UPS 1223B -> KEYWORD-GATED (`isFleetQuery`); ZERO tokens on steady-state turns.
  - `discipline-expert-inject` -> 5min-per-discipline-bucket rate-limit + meta-task-suppress + slash-suppress +
    20-char gate. The spec's "dumps Post-Processor/UI-UX into golf every turn" (gap class #3) was STALE/false --
    it does not even appear in the measured cut list. **#3 needs no work.**
  - `master-index` / `memory-index` prechecks -> 60s same-prompt throttle (kills the /loop-burst repeat) + (master)
    CAG cold-skip + exact-match collapse (~80% byte cut).
  - SessionStart headlines (claude-brief / savings / cag-hitrate / ai-deep-intel / ai-command) -> fire ONCE per
    session + CAG cold-anchored. Not a per-turn 429 lever.
=> **#2 "finish the dedup rollout" was already satisfied before this session** (gap class #2 premise false). The
ONE genuine measured injection gap -- the sole KNOBLESS context-injector `ups-domain-bundle` -- was CLOSED:
`U-UPS-DOMAIN-KILLSWITCH` (commit `2688fdde17`) added `PRISM_UPS_DOMAIN_DISABLE`; audit knobless 1->0, coverage 80%.
**The real 429 lever is NOT per-turn injection dedup** (that is spent) -- it is base-context size (CAG cold-anchor
already caches it) + free-model offload of analysis off the rate-limited API + accepting Anthropic-side capacity
limits at 16 concurrent chats. Lesson: MEASURE-FIRST before "executing" a fix -- it stopped a fix for a non-problem.

## REMAINING GENUINE GAPS (re-ranked by measured value, 2026-06-18)
1. **#4 RECONCILE the 192 status-drift milestones** (`build-milestone-progress.mjs`) -- the real re-spent-effort
   waste (this session hit 3 stale/done queue units). HIGH value + a perfect FREE-MODEL job (diff envelope-status
   vs git-reality = mechanical, $0 on Ollama, no API). **This is the next unit.**
2. **#5 RE-ARM or consciously retire `PRISM_ALLOW_UNWIRED=1`** (settings.json) -- an off orphan-block safety net = debt.
3. (DONE) injection knobless gap -- closed `2688fdde17`.

## Next action
Execute #4 (reconcile the 192 drift milestones) via the FREE-MODEL route -- it is the genuine remaining efficiency
gap. Do NOT re-open #1-#3 (measured ALREADY-DONE above). Best done with FRESH context.
