# Harness / Loop / Cron Upgrade Plan — article-grounded (2026-06-18, slot:bravo)

> Operator directive: *"make upgrades to harnessed loops and crons relative to all the articles
> regarding harnesses and loops and crons."* This is the synthesized, dependency-ordered, safety-classed
> plan. Source articles (`state/shared/articles/` + `state/shared/specs/`): anthropic-harness-dynamic-workflows,
> addy-osmani-loop-engineering, mikenevermiss-overnight-workflows, BORIS-LOOP-AGENT-DOCTRINE,
> hermes-obsidian-self-learning-loop. 54 principles extracted + cross-referenced against the live
> loop/cron implementation gap map (loop-state.mjs, loop-iteration-inject.mjs, stop-force-loop-continue.mjs,
> precompact-auto-trigger.mjs, zulu-build-loop.mjs, consensus-queue-drain.mjs).

## SHIPPED this session (slot:bravo)
- **U-ZBL-CRON-FAILLOUD** (`c2039c6872`) — zulu-build-loop spec-fallback + fail-loud failed-ledger-row + structured `ledgerRecord` (status/source/at). Grounds: overnight #1/#3/#12/#22/#24 ("validate data source / log every failure never silent / structured state"). 12/12 tests, live-validated, 2-arm PASS.
- **U-ZBL-CRON-FALLBACK-ISO** (`d9f9bd8a6d`) — constrain spec-fallback to ISO-dated `-YYYY-MM-DD.md` candidates (a non-dated sibling can't out-rank a real date). Closes the 2-arm P2.

## RANKED PENDING UPGRADES (each: article-grounding -> current gap [file] -> safety/effort)

### SAFE + buildable-now (highest ROI first)
1. **stop-force-loop-continue idempotency regex `m`->`s`** — Boris loop-doctrine "state-spine integrity". GAP: `injectResumeLoop` (`stop-force-loop-continue.mjs`) idempotency regex uses `m` not `s` (dotAll), so a multiline prior RESUME_LOOP block may not fully replace -> hybrid old+new. [SAFE, S] — same class as the 2026-06-10 m-flag regression.
2. **consensus-queue-drain fleet overlap-lock** — overnight #7/#8 ("overlap lock first-class / stagger"). GAP: no fleet-wide drain lock; 26 slots' Stop hooks each spawn a drain -> up to 26 concurrent Ollama consensus calls thundering one GPU (`consensus-queue-drain.mjs`, no concurrency cap). [SAFE — a skip-if-held lock is resource-protection, NOT fleet-control, M].
3. **zulu-build-loop overlap-lock (G11)** — overnight #7. GAP: no concurrency lock on the cron run; ledger appendFileSync torn-line risk on overlap (`zulu-build-loop.mjs`). [SAFE, S/M] — O_EXCL nonce lock + stale-reap (reuse the C2 ZuluTaskContinuityEngine lock pattern).
4. **loop-state per-iteration eval-gate WARN + absolute runaway backstop** — addy loop-eng "eval-gate each iteration"; #8/#20. GAP: `cmdTick` stores `evalScore` but never warns/blocks below threshold when `target=1e9` + no explicit `next`; the `iter > 2*target` runaway guard is unreachable at DEFAULT_TARGET=1e9 (`loop-state.mjs`). [SAFE additive advisory, M].
5. **loop-iteration-inject anti-drift Karpathy-every-5** — #17 ("anti-drift every N units as a hard milestone"). GAP: no tick-counter trigger; the 5-question checklist is "mental" only (`loop-iteration-inject.mjs`). [SAFE additive injection, S].
6. **precompact-auto-trigger pending-marker TTL refresh** — overnight resumption. GAP: 30-min TTL expires on a long tool-call -> false HARD re-block after the handoff was already written (`precompact-auto-trigger.mjs`). [needs-care — touches a HARD block, S].
7. **PostCompact loop-state re-inject hook** — #15 ("PostCompact re-injects critical instructions"). GAP: no PostCompact hook re-injects `loop-state.json` + current-unit context post-compaction. [SAFE additive new hook, M].
8. **zulu-build-loop git-log shipped-window idempotency** — overnight #6 ("durable cursor"). GAP: `readShippedCommitsText` scans last 400 commits; a >400-commit milestone drops oldest shipped units out of window -> re-emitted pending (`zulu-build-loop.mjs`). [SAFE, S].
9. **consensus-queue-drain producer-side lock (EPERM race)** — overnight #7. GAP: producers append WITHOUT the queue lock -> Windows `renameSync` EPERM race -> drain silently exits, queue accumulates (`consensus-queue-drain.mjs:130`, deferred follow-up). [SAFE, M].
10. **structured-state + atomic-append for consensus-queue-drain processed log** — #12/#24. GAP: `appendProcessed` non-atomic -> partial JSON line on kill (`consensus-queue-drain.mjs`). [SAFE, S].

### SAFE — self-learning loop (Obsidian substrate)
11. **corrections-confidence-ledger** (#17, #23) — promote repeat corrections (count>=3, conf>0.7) + POSITIVE success-patterns to MEMORY/tribal via `error-pattern-promote.mjs`. [SAFE additive, M].
12. **turn/tool-counter learning passes** (#14 @10 turns, #15 @15 tool-calls) — accumulation counter in `loop-iteration-inject.mjs` -> Ollama preference/skill extraction -> AGENT_CHAT advisory (not auto-write). [SAFE, M].
13. **nightly dream-synthesis cron** (#20, #16) — read last-24h new `feedback_*/reference_*` -> Ollama -> synthesized delta to galaxy MEMORY.md. [SAFE, M].
14. **unified nightly review-queue sink + single morning summary** (#4, #9) — all 77 tasks append `{output,status,timestamp,workflow}` to one sink; one morning AGENT_CHAT roll-up (extend `fleet-task-health-watch.mjs`). [SAFE, M].
15. **self-scheduling audits** (#13) — `/forge-audit-v2` etc. register a 7-day re-run via CronCreate at end-of-run (one-shot -> loop). [SAFE, S].

### NEEDS-GOVERNANCE (bravo REFUSES unsafe-fleet-control-before-governance — defer to readiness-audit ordering)
16. **classifier-routes-to-typed-subagent in the loop** (harness #5) — a classifier pass selects coder/dispatcher-wirer/physics-reviewer before handoff. [needs-governance — autonomous dispatch routing].
17. **independent done-check verifier subagent** (loop #4/#9) — a separate model evaluates the stop condition before the loop exits. [SAFE-ish but spawns autonomous agents — gate].
18. **morning triage cron auto-opens worktree+maker+checker per finding** (#29) — fully-autonomous build dispatch. [needs-governance].
19. **zulu-build-loop unattended per-unit 2-arm scrutiny gate** (loop #25 "unattended loop = mistakes unattended") — autonomous commit-gating. [needs-governance].

## Notes
- The PRISM `/loop` ScheduleWakeup dynamic-mode runtime is gated off outside a `/loop` skill invocation; the harnessed loop re-enters via `/startup-bravo /loop [10m] /goal` (the handoff re-entry) + the `PRISM Zulu Build Loop` durable cron.
- Full 54-principle extraction + the gap map are in this session's transcript; the actionable subset is captured above. Re-mine via the same article set if deeper grounding is needed.
- Memory: [[reference_harness_loop_cron_upgrade_plan_2026_06_18]].
