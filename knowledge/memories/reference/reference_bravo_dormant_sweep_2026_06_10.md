---
name: reference_bravo_dormant_sweep_2026_06_10
description: "Ultracode bounded sweep (Workflow wf_4d625bda-f67, 4 agents / 374K subagent tokens / 3 Explore finders + 1 synthesis, rate-limit-safe <=3 concurrent) for dormant bravo-lane features AFTER the untested-wired-hook queue was cleared this session. VERIFIED top prize = B1 the dream-queue PRODUCER GAP: stop-dream-queue-surface.mjs fires daily but always shows nothing because NOTHING writes state/shared/dream-queue/dream-<slot>-<date>.json; DreamLoopProposalEngine.ts EXISTS (+ siblings DreamConsolidationEngine, DreamArtifactBundleEngine) returns structs but never writes disk. B2 = orchestrator-directives producer gap (orchestrator-advisory-inject.mjs reads orchestrator-directives.json, no producer). Both producer-absences VERIFIED via grep (R12/honesty). Synthesis applied R12 rigor: rejected finder over-claims (WIRED-UNTESTED is NOT dormancy; out-of-lane lathe/token hooks; unverified dispatcher-action gaps demoted)."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.484Z
aliases: reference_bravo_dormant_sweep_2026_06_10
---


# Bravo-lane dormant-feature sweep -- verified ranked punch-list (slot:bravo, 2026-06-10)

## How (rate-limit-safe ultracode)
Operator: "use ultracode to sweep across the codebase to dig further." Workflow
`wf_4d625bda-f67` (bravo-dormant-sweep): 3 read-only `Explore` finders (hooks /
engines+scripts / producers+dispatchers) running <=3 concurrent (under the >3-4 burst
guard) + 1 synthesis. 4 agents, 374K subagent tokens, ~17min, background. Excluded
everything already activated this session (the 6 consensus/octopus/orchestration hooks).

## The synthesis was R12-rigorous (rejected finder over-claims)
- "WIRED-UNTESTED" is NOT a dormancy class -- a wired hook that fires is HEALTHY; missing
  a test is a coverage gap (which I already closed for the 5 consensus hooks this session).
- Out-of-lane items dropped: lathe-gcode-lint-guard, whiskey-lathe-context-inject,
  alpha-token-domain-awareness-inject (lathe/token galaxies, not bravo).
- Unverified dispatcher-action "gaps" demoted -- finder 3 admitted it never ran the greps;
  it even self-contradicted ("all 71 orchestrationDispatcher actions FULLY WIRED").

## VERIFIED ranked punch-list

### TOP NEXT UNIT (B1) -- dream-queue PRODUCER [MEATIER, verified-real, HIGH value]
- Consumer (live, correct): `.claude/hooks/stop-dream-queue-surface.mjs` fires daily,
  reads `state/shared/dream-queue/dream-<slot>-<date>.json`, shows refuse-rule/skill
  candidates for operator promote-or-discard. (I covered its READ side earlier; it works.)
- GAP: **nothing produces those files** -- VERIFIED via grep (no writer besides the
  consumer). So the surface always renders empty -> the whole dream-cycle loop is dark.
- Engine EXISTS (VERIFIED): `mcp-server/src/engines/DreamLoopProposalEngine.ts` (returns
  proposal structs, never writes disk) + siblings `DreamConsolidationEngine.ts`,
  `DreamArtifactBundleEngine.ts`. So the build is ADAPT (add a propose()->writeFile path),
  NOT build-new (the finder's "missing engine" claim was an over-claim; synthesis caught it).
- Activation (next fire, fresh budget): R8-read the 3 dream engines FIRST; add a
  `propose()->write dream-<slot>-<date>.json` path sourced from soul.md refuse-list deltas
  + a `_skill-triggers.jsonl` scan (item A1, the input); live-validate the surface renders
  it (R15, not "looks fine"). Effort M (~150 LOC), risk med. In-lane (dream-cycle/self-reflect).

### B2 -- orchestrator-directives producer [REFUSED 2026-06-10 -- GOVERNANCE-GATED, do NOT blindly build]
- Consumer (live): `orchestrator-advisory-inject.mjs` reads `state/shared/orchestrator-directives.json`
  every prompt. GAP: no producer (VERIFIED absent).
- **CORRECTION (R8 deep-read, 2026-06-10):** this is NOT a benign dormant-wire. The directives
  carry `action: clear|compact|respawn` -- golf reaching INTO peer chats to COMMAND them. That is
  FLEET COMMAND-CONTROL, which bravo's soul refuses (`unsafe-fleet-control-before-governance`).
  `state/shared/specs/HERMES-CONTROL-READINESS-2026-06-01.md` is **NO-GO**: GOVERNANCE_SAFETY
  NOT_READY (no actor auth on :8767, no veto ceiling, control path bypasses every PreToolUse
  safety hook) and Blocker-2 mandates "GOVERNANCE must land BEFORE COMMAND_CONTROL." Blocker-3's
  update says the PUSH/directive wiring "remains DELIBERATELY UNBUILT, gated behind GOVERNANCE."
- **DECISION: REFUSE to build the producer until operator-greenlit governance lands** (actor auth
  + issuer-soul gate + `hermes_role: fleet-orchestrator` soul with bounded authority + veto ceiling
  + firewall-routed control writes). That is blocker-2 (operator-greenlit, cross-lane), NOT a
  ~100-LOC bravo wire. The original "~100 LOC, scope to writer" framing was WRONG (missed the
  governance gate). Governance FIRST, then producer.

### A1 -- _skill-triggers.jsonl scanner [CLEAN-S] -- but a no-op ALONE; it is B1's INPUT, build WITH B1.
### A2 -- self-awareness-enforce.mjs [VERIFIED DEAD-BY-DESIGN 2026-06-10 -- DO NOT WIRE]
  The "verify not-dead-by-design" caveat resolved: it IS dead. (1) import-unsafe (top-level
  `JSON.parse(readFileSync(process.stdin.fd))` on import, no isDirect guard). (2) WRONG OUTPUT
  CONTRACT -- emits `{decision:"modify", modification:{prompt}}`, which is NOT a supported Claude
  Code UserPromptSubmit hook output (canonical is `{hookSpecificOutput:{hookEventName, additionalContext}}`
  or `{decision:"block"}`); the harness would IGNORE it -> wiring it does nothing. (3) SUPERSEDED --
  its inventory/dedup/master-index "self-awareness protocol" is already delivered by the LIVE stack
  (inventory-check-guard, master-index-precheck-inject, dedup-auto-invoke, duplication-hard-block,
  awareness-snapshot-inject) via the correct contract. LEAVE UNWIRED (or deprecate). Lesson:
  "activate all dormant features" != "wire every unwired file" -- some are dead-by-design.

### (C) BLOCKED/UNVERIFIED -- not actionable: memoryDispatcher consensus/octopus actions
  (existence unconfirmed), "unused orchestration actions" (synthesis says all wired),
  swarm_consensus/multi_agent_coordinate caller-audit (a utilization audit, not a dormant feature).

## Status (2026-06-10 update)
- **B1 SHIPPED** -- commit `69f82bb12c` [DREAM-QUEUE-ACTIVATE]/U-DREAM-PRODUCER. Built scripts/lib/dream-signal.mjs
  + .claude/hooks/stop-dream-queue-produce.mjs (per-slot Stop + --all-slots fleet sweep), 27 tests
  (incl real dist-engine round-trip), wired produce+surface into settings.json Stop, gitignored the
  artifacts. LIVE: 26/26 galaxies materialized; surface renders skill-git-lock-contention 360x. 3-of-3 PASS.
  (Discovered en route: BOTH surface AND stop-soul-evolution were unwired in every settings.json + the
  stop-bundle. The error_patterns input came from ERROR_LEARN_LEDGER.jsonl, not _skill-triggers.jsonl --
  a better source than the A1 plan assumed.)
- **B2 REFUSED** -- governance-gated fleet command-control (see B2 section above). NOT buildable until
  operator provisions governance (HERMES-CONTROL-READINESS blocker-2).

## Next fire (SAFE, in-lane, NOT governance-gated)
- **soul-evolution de-dup+WIRE: SHIPPED** -- commit `a18dbc012e`. De-duped `collectRecentCorrections`
  +`readSoulRefuseList` onto dream-signal.mjs, added run()-export + isDirect + R12 fail-soft + a draft
  CAP (PRISM_SOUL_EVOLVE_MAX=25; the Stop auto-feed mtime-batch otherwise drafted 200 rules/62KB).
  Wired into settings.json Stop. 6 tests, 2-arm scrutiny PASS. COMPLEMENTARY to the dream-queue
  (novelty-gate vs repetition-gate) -- both wired, no conflict (different files, different gates).
- **A2 (next candidate):** `self-awareness-enforce.mjs` -- the one genuinely-unwired hook from the
  sweep. BUT import-unsafe (top-level exec, no isDirect guard) so the finder's "1-line wire" is WRONG;
  add the isDirect guard FIRST + verify it is not dead-by-design before spending a fire.
- A1 (_skill-triggers scanner) is SUPERSEDED -- the dream-queue sourced error_patterns from
  ERROR_LEARN_LEDGER.jsonl instead (a better, live signal). No standalone A1 build needed.
- P3 deferred: soul-evolution cap survivors are readdir-order, not novelty-ranked (sort by
  maxScoreVsExisting in a refinement). Related:
[[reference_consensus_critical_edit_wired_2026_06_10]] - [[reference_bravo_unwired_hooks_audit_2026_06_10]] - [[feedback_git_commit_only_race_proof]].
