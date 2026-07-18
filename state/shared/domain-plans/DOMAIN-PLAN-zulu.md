---
artifact: domain-buildout-plan
slot: zulu
galaxy: hermes-zulu
galaxy_dir: mcp-server/src/engines/hermes-zulu/
kienzle_pages: ["Kienzle System Sync.dc.html"]
backend_dispatchers: [prism_orchestrate, prism_session, prism_context, memoryDispatcher]
frontend_owner: quebec
status: draft
generated_by: zulu-plan-agent (fanout-rescue)
generated_at: 2026-06-27
---

# DOMAIN BUILDOUT PLAN — ZULU (hermes-zulu)

> Finalized plan to take the hermes-zulu galaxy to **PhD-master depth**, then
> **test → simulate → validate → fine-tune**, then **build/flesh out the frontend** from the
> Kienzle Claude-Design build (`Kienzle System Sync.dc.html`).
> Universal rails (R1–R16 · scrutiny 3-of-3 · no-stub · no-inline-constants · canonical
> physics from `src/physics/constants.ts`) bind every step → `H:/prism/CLAUDE.md`.
> Parent: `state/shared/domain-plans/00-MASTER-ORCHESTRATION-PLAN.md`.
>
> **Domain nuance (R12):** hermes-zulu is the fleet ORCHESTRATION galaxy — not a machining
> domain. JM Die machining jobs do NOT ground §5/§6; orchestration scenarios do (fleet sweep
> dry-runs, resolver correctness, slot-claim validity, octopus consensus convergence, cron
> health). This is structurally correct — the same adaption a hypothetical "network
> infrastructure" domain would make if included in a manufacturing-domain plan set.

---

## §1 — Domain identity & scope

- **Owns:** Fleet orchestration runtime — cross-slot synthesis, parallel fanout planning,
  file-scope partitioning (no-collide), per-fanout token/turn budgets, verdict aggregation,
  self-correction loops, dream-marker scanning and proposal conversion, fleet task auctioning
  (`ZuluTaskAuctionEngine`), fleet authority checking (`ZuluFleetGovernorEngine`, READ-ONLY),
  dashboard control surface (`ZuluDashboardControlEngine`), Opus invocation routing
  (`MoonshotClientEngine`), model-provenance ledger (`ModelAttributionEngine`), model-tier
  complexity routing (`OpusCapabilityEngine`), targeted slot-brief channel (`SlotBriefEngine`),
  soul-aware fanout extension (`SoulAwareFanoutExtenderEngine`), agent specialization profiling
  (`AgentSpecializationProfileEngine`), weekly self-reflection cron (Sunday 20:53), account-
  cycle coordinator (5h-quota switch, INERT until `PRISM_5H_WEIGHTED_TOKEN_TRIGGER` set),
  octopus consensus integration (`MultiModelConsensusEngine`, `ConsensusAIBridgeEngine`,
  `ConsensusNeuralFeedbackEngine`), hermes–Obsidian memory bridge, and the System Sync
  orchestrator/fleet dashboard (Kienzle frontend).
- **Excludes:** domain-specialist builds (mill→foxtrot, lathe→whiskey, wedm→mike,
  quoting→charlie, post→echo, SFC→oscar, CAD→delta). Zulu is the CONDUCTOR above the 25
  worker slots — never a 13th worker. Do NOT add `zebra` to `SLOT_NAMES`. Physics constants
  (`src/physics/constants.ts`) are imported but never the subject of computation here —
  orchestration has no machining physics of its own.
- **Slot worktree:** `H:/prism-slot-zulu` · branch `slot/zulu` (note: worktree has diverged
  previously; verify `git -C H:/prism-slot-zulu status` before committing — use shared-tree
  `[MAIN] (slot:zulu)` fallback if diverged per [[reference_slot_zulu_diverged_cannot_commit_2026_06_11]])
- **Galaxy brain:** `mcp-server/src/engines/hermes-zulu/{CLAUDE,MEMORY,PATHS,TOOLBELT,AWARENESS}.md`
- **Builder vs runtime:** bravo BUILDS hermes-zulu; zulu IS the live runtime orchestrator.
  Same galaxy dir, two roles. This plan targets both sides.

---

## §2 — Current state (verified — R12)

- **Scaffolding:** PASS on all 5 primary artifacts (CLAUDE, MEMORY, PATHS, TOOLBELT, AWARENESS
  present). AI-synergy audit (2026-06-11): all 4 dims = 1 (discoverability, ownsOrWiresAi,
  vaultSynergy, crossSubstrate). Obsidian synthesis brain present at
  `knowledge/memories/patterns/hermes-zulu_synthesis.md`.
- **Engines (verified in CLAUDE.md §2 — 15 engines, all in flat `mcp-server/src/engines/`
  namespace, none inside the galaxy subdir):**
  | Engine | Role |
  |--------|------|
  | `HermesParallelFanoutPlannerEngine.ts` | Parallel-agent burst planner |
  | `HermesFileScopePartitionerEngine.ts` | No-collide file partitioning |
  | `HermesParallelBudgetEnvelopeEngine.ts` | Per-fanout token/turn budget |
  | `HermesParallelVerdictAggregatorEngine.ts` | Parallel verdict merger |
  | `HermesSelfCorrectionEngine.ts` | Self-correction loop |
  | `DreamMarkerScannerEngine.ts` | Dream-marker scanner + proposal converter |
  | `ZuluTaskAuctionEngine.ts` | Fleet task auctioneer |
  | `ZuluFleetGovernorEngine.ts` | Fleet authority check (READ-ONLY) |
  | `ZuluDashboardControlEngine.ts` | Dashboard control surface |
  | `MoonshotClientEngine.ts` | Opus invocation (zulu's reasoning lever) |
  | `ModelAttributionEngine.ts` | Model-provenance ledger |
  | `OpusCapabilityEngine.ts` | Model-tier complexity router |
  | `SlotBriefEngine.ts` | Targeted slot-brief channel |
  | `SoulAwareFanoutExtenderEngine.ts` | Soul-aware fanout extension |
  | `AgentSpecializationProfileEngine.ts` | Agent specialization profiler |
  Also: `ConsensusAIBridgeEngine`, `ConsensusNeuralFeedbackEngine` (AWARENESS.md §AI assets).
- **Dispatcher surface (verified against CLAUDE.md §3 — all route via `prism_session`,
  `prism_context`, or `memoryDispatcher`; no dedicated "hermes" dispatcher exists by design):**
  - `prism_session`: `hermes_fanout_plan`, `hermes_file_scope_partition`,
    `hermes_budget_estimate`, `hermes_verdict_aggregate`, `hermes_self_correct`,
    `dream_scan`, `dream_markers_to_proposals`, `zulu_task_auction`, `zulu_authority_check`,
    `model_attribution_record`, `opus_assess_complexity`, `opus_stats`,
    `model_attribution_summary`, `model_attribution_recent`, `model_attribution_find`,
    `model_attribution_badge`, `zulu_authority_check_render`
  - `prism_context`: `slot_brief_write`, `slot_brief_list`
  - `memoryDispatcher`: `weekly_synthesis_get`
  - `prism_orchestrate`: `agent_execute`, `agent_parallel`, `agent_pipeline`, `swarm_execute`,
    `swarm_parallel`, `swarm_consensus`, `plan_create`, `plan_execute`, `roadmap_plan`,
    `roadmap_next_batch`, `roadmap_advance`, `roadmap_gate` (and 15+ others confirmed in
    `orchestrationDispatcher.ts` line 46–60; full list verified this session)
- **Knowledge legs (PSN 11-leg, from AWARENESS.md):**
  - #1 Obsidian brain: PASS — synthesis present at `knowledge/memories/patterns/hermes-zulu_synthesis.md`
  - #3 Wiki: PASS — 37 entries confirmed (MEMORY.md corpus count)
  - #5 Tribal: 57 tips (MEMORY.md corpus count) — PARTIAL (orchestration tips thin vs machining galaxies)
  - #6 system-viz: PASS — cross-substrate edges (owned-by-slot, documented-by, consensus-of)
  - #10 NN/GNN: PASS — via galaxy-reasoning-bridge; AUROC 0.808 selective-deploy at minConf=0.7
  - #2 PRISM OS: PARTIAL — `prism_operating_system` dispatcher wired; zulu sweep liveness
    restored (installed 2026-06-03); but `:8767` control path governance = NO-GO
  - #11 PRISM AI: PASS — `ConsensusAIBridgeEngine` + `ConsensusNeuralFeedbackEngine` wired
- **Known landmines (R12 — verified from MEMORY.md + CLAUDE.md §5/§12):**
  1. **No-named-dispatcher trap** — grepping `DISPATCHER_DIGEST.md` for "hermes" or "zulu"
     returns zero hits intentionally. All hermes-zulu actions live on `prism_session` /
     `prism_context` / `memoryDispatcher`. Never search for a `hermes_*` dispatcher by name.
  2. **ZuluFleetGovernorEngine is READ-ONLY** — `:8767` control path (veto/escalate/promote)
     is GOVERNANCE-GATED. Zero slots have `zuluOptIn`. Readiness = NO-GO as of
     [[reference_hermes_control_readiness_nogo_2026_06_01]]. Do NOT actuate the :8767 path.
  3. **Hostile-payload in self-reflect input** — populater consumes peer chat output. Parse
     with bounded `firstBrace..matched-pair` scan ONLY. Never `JSON.parse` on unbounded peer
     output (greedy-slice exploitability class, caught by Arm-B scrutiny 2026-06-10).
  4. **`prism_memory:semantic_search` silent failure** — returns `{ok:false}` on Qdrant-down
     with no exception. Always check liveness before calling; fall back to `MEMORY.md`.
  5. **Wrong inter-channel choice = fleet noise** — three distinct channels with strict rules:
     chat-bus (`AGENT_CHAT.jsonl`) = broadcast, soul-file = persistent persona (schemaVersion-
     gated), slot-brief = targeted consume-once. Never broadcast a targeted message.
  6. **CRLF landmine** — repo is de-facto CRLF on Windows/Git-for-Windows; LF is un-stickable.
     Do NOT spend budget fighting EOL. [[reference_git_crlf_windows_reality_2026_06_02]]
  7. **Self-reflect cron offset overlap** — Sunday 20:53 offset avoids Fleet Reaper (+210s),
     Memory Monitor (+330s), Cleanup Orchestrator (+60s). Any time change requires re-running
     the offset calc.
  8. **Stale ledger rot** — `ZULU-MASTER-CONTEXT-LEDGER-2026-06-11.md` shows 5 of 7 "OPEN"
     items were already SHIPPED when reconciled. Run `scripts/reconcile-zulu-ledger.mjs` FIRST
     before trusting any ROI order from the ledger. [[reference_zulu_ledger_reconciler_2026_06_11]]
  9. **5h-coordinator account-switch is INERT** — `PRISM_5H_WEIGHTED_TOKEN_TRIGGER` env var
     must be set to arm auto-switch; default is inert to prevent unsafe fleet-control before
     governance. The keystone (five-hour-token-sum chain) IS live as of 2026-06-11.
  10. **`outcome-bus-auto-tap.mjs` is ABSENT from disk** — verified absent in CLAUDE.md §12.
      The xproc_* action names in §10 are marked UNVERIFIED. Do NOT cite as live wiring.
  11. **papa-rebind / cron-stale-slot bug class** — a durable `/startup-papa` cron + slot-
      blind handoff read caused repeated slot rebinding (2026-06-18 fixes: `claimSlot`
      one-owner invariant + ps-window-pin args + stale-slot-cron-advisory hook). Verify
      `scripts/stale-slot-cron-advisory.mjs` is wired at SessionStart before relying on it.
  12. **TSC baseline is NOT clean** — 655 errors in 252 files pre-exist on trunk (verified
      2026-06-02). New zulu edits must contribute ZERO new errors; never claim "tsc clean"
      without measuring your delta against that baseline.

---

## §3 — Deepening roadmap → PhD master

> "PhD master" for hermes-zulu = an *engineered orchestration loop*, not one-shot knowledge.
> The "product" is the fleet orchestrator itself: the crons, sweeps, consensus cycles, and
> ledger-reconciler that run continuously. Deepening = hardening + documenting + instrumenting
> those loops, not accumulating machining tips.

- **Tribal tips:** 57 current → 90+ target. Sources for orchestration tips:
  - JM Die corpus: NOT applicable (orchestration domain — no machining data per CLAUDE.md §8).
  - Applicable sources: Anthropic Engineering "Building Effective Agents" article (VERIFIED,
    cited in MEMORY.md §Domain anchors); PRISM transcript mining (24 domain memories +
    ZULU-MASTER-CONTEXT-LEDGER); past bravo/zulu session commit messages (the "lessons"
    section of every `## Recent regressions` entry); Karpathy agent-discipline wiki leaf
    (`knowledge/wiki/architecture/karpathy-agent-discipline.md`).
  - Capture via `prism_knowledge:tribal_capture slot=zulu`. Mine existing sessions:
    `scripts/mine-galaxy-transcripts.mjs --galaxy hermes-zulu` (Ollama-first,
    `qwen2.5-coder:32b` for summarize/classify; `gpt-oss:120b` for deep orchestration
    reasoning on Blackwell 96GB).
  - Target tips by sub-topic: slot-claim/handoff resolver patterns (7+), fanout burst
    correctness patterns (5+), octopus consensus reliability (5+), cron-offset discipline
    (3+), soul-file schemaVersion discipline (3+), fleet-channel selection rules (5+),
    dream-cycle patterns (4+), stale-ledger discipline (3+).

- **Wiki entries to write/cross-link:**
  - `knowledge/wiki/architecture/hermes-zulu-orchestrator-engines.md` — authoritative map of
    all 15+ engines, their dispatcher action, when to invoke, and their safety rail. Cross-
    link: [[architecture/hermes-self-reflect-populater]], [[architecture/hermes-dream-cycle]].
  - `knowledge/wiki/architecture/fleet-channel-selection.md` — canonical 3-channel rule
    (chat-bus=broadcast · soul-file=persona · slot-brief=targeted-consume-once) with failure
    examples of wrong channel choice.
  - `knowledge/wiki/lessons/slot-rebind-root-causes.md` — consolidated lessons from the
    papa-rebind 2026-06-18 cluster: claimSlot one-owner invariant, ps-window-pin args,
    stale-slot cron advisory. Cross-link [[reference_papa_rebind_resolver_cron_fix_2026_06_18]].
  - `knowledge/wiki/architecture/zulu-ledger-reconciler.md` — the reconciler pattern:
    `scripts/reconcile-zulu-ledger.mjs` as a FIRST-action discipline; OPEN/SHIPPED/COVERED
    verdict taxonomy; the lesson that a hand-curated task ledger rots in hours on a high-
    velocity fleet. (Stub exists as [[zulu-ledger-reconciler]] — promote to full leaf.)
  - `knowledge/wiki/architecture/octopus-consensus-reliability.md` — co-resident diverse
    2-voice local panel, forceProbe + prewarm guarantee, model-tagged voice ids, vendor-level
    weight norm. Source: MEMORY.md §OCTOPUS-CONSENSUS arc 2026-06-10.
  - `knowledge/wiki/lessons/hermes-hostile-payload-class.md` — the bounded parse rule,
    greedy-slice exploitability, Arm-B scrutiny discovery pattern. (Stub at
    [[lessons/hostile-payload-class]] — promote to full leaf.)

- **Memories to write:**
  - `reference_zulu_fleet_channel_rules_<date>.md` — the 3-channel invariant as a pinned
    reference (chat-bus / soul-file / slot-brief contract + anti-patterns).
  - `reference_zulu_cron_offset_map_<date>.md` — the 6-cron Sunday offset schedule: Reaper
    (0s) · Cleanup (+60s) · Memory-monitor (+330s) · Self-reflect (+20:53) · Account-switch
    (gated) · Hermes-Obsidian-bridge (+15m cycle). Used to verify no future offset collision.
  - `reference_zulu_governance_nogo_<date>.md` — current governance state: zero slots have
    `zuluOptIn`; `:8767` veto/escalate/promote path = NO-GO; readiness unblocked ONLY by
    [[reference_hermes_control_readiness_nogo_2026_06_01]] criteria.
  - `feedback_zulu_ledger_first_discipline.md` — standing doctrine: always run
    `reconcile-zulu-ledger.mjs` before trusting any ROI order from the ledger.

- **RAG corpus:** `knowledge/memories/patterns/hermes-zulu_synthesis.md` (primary CAG cold-
  anchor); supplement with the 37 wiki entries in the hermes-zulu namespace and the 33 domain
  memory files (MEMORY.md corpus count). Embed target: 100+ chunked passages from past bravo/
  zulu session summaries indexed by `scripts/embed-cited-tips.mjs`. Also: the Anthropic
  "Building Effective Agents" article already cited in MEMORY.md §Domain anchors — chunk and
  embed the orchestration-relevant sections.

- **CAG cold-anchor:** galaxy CLAUDE.md + `knowledge/memories/patterns/hermes-zulu_synthesis.md`
  + `knowledge/wiki/architecture/hermes-zulu-orchestrator-engines.md` (once written). Route
  via `scripts/lib/cag-router.mjs`. Note: NO physics constants to anchor here — orchestration
  domain.

- **NN/GNN features:** `HermesParallelFanoutPlannerEngine`, `ZuluTaskAuctionEngine`, and
  `MultiModelConsensusEngine` nodes need 768-d feature vectors for GNN refpool. Route via
  `vault-to-gnn-refpool.mjs`. Owner: india for the retrain; bravo/zulu produce the labels.

- **LoRA dataset:** `hermes-zulu_lora_train.jsonl` / `hermes-zulu_lora_test.jsonl` in
  `mcp-server/data/state/lora-datasets/`. Source: weekly self-reflection outputs
  (`state/shared/dashboards/weekly-hermes-reflection-*.md`), slot-brief interactions, and
  reconciler verdict records. India trains; zulu produces dataset + acceptance gate.

- **Engineered loop + cron (these ARE the galaxy's product):**
  1. **Weekly self-reflection** (Sunday 20:53 local): `scripts/hermes-self-reflect-populater.mjs`
     (or equivalent) → `state/shared/dashboards/weekly-hermes-reflection-<date>.md` →
     `memoryDispatcher:weekly_synthesis_get` reads it. Liveness signal:
     `hermes_reflection.exists=false` in the dispatcher response = cron dead → re-register
     the PS1 installer script (verify script name before citing — // OWNER-GATE per CLAUDE.md §5).
  2. **Ledger reconciliation** (context-regain trigger + on-demand): `scripts/reconcile-zulu-
     ledger.mjs` → `state/shared/ZULU-LEDGER-RECONCILE-LATEST.json` (atomic sidecar). Run
     FIRST before any build/planning pass. Acceptance: ≤2 TRUE-OPEN items unreconciled.
  3. **Hermes-Obsidian bridge** (`PRISM Hermes-Obsidian Bridge` scheduled task, every 15m):
     `scripts/hermes-obsidian-memory-bridge.mjs` → `knowledge/hermes-brain/` (SHA-256 dedup,
     fail-soft). Liveness: verify task state=Ready in scheduled-task registry.
  4. **Zulu orchestrator sweep** (`PRISM Zulu Orchestrator` scheduled task, every 5m ~21:17
     effective): slot-pressure advisory + dry-run SendKeys gate (zero slots zuluOptIn = all
     sweeps noop currently). Liveness: `fleet-task-health-watch.mjs` monitors 39 PRISM tasks.
  5. **Galaxy reflection synthesis** (on-demand, post-deepening): `scripts/galaxy-synthesis-
     refresh.mjs --galaxy hermes-zulu` → refreshes `hermes-zulu_synthesis.md` in Obsidian.
  - Acceptance signal: self-reflect cron fresh (≤7 days), reconciler run, Hermes-Obsidian
    bridge task state=Ready, tribal coverage ≥90 tips, wiki leaves ≥6 in hermes-zulu namespace.

- **Ollama offload:**
  - Draft slot-brief / classify a slot's lane / summarize a handoff → `gpt-oss:20b`
  - Lint engine code / stub-sweep triage / tribal-tip classify → `qwen2.5-coder:32b`
  - Deep orchestration reasoning / cross-slot synthesis / octopus consensus design → `gpt-oss:120b`
  - Reserve Claude for new governance design, safety-critical control-path decisions, and
    scrutiny review of cross-slot directive correctness.

---

## §4 — Test plan (real assertions — R9)

All tests round-trip **through the dispatcher** (`prism_session` or `prism_context` or
`prism_orchestrate` action enum + Zod schema + lazy import). Never `toBeDefined()` — always
concrete behavioral assertions on dispatch correctness and resolver invariants.

- **Unit — `mcp-server/src/__tests__/ZuluFleetGovernorEngine.test.ts` (extend existing
  `zulu_governor_wire.test.ts`):**
  - `zulu_authority_check` with a valid slot+domain returns `{approved:true}` when domain
    matches soul-file `domain_filter`; returns `{approved:false, reason}` when domain is
    excluded (not a throw — structured error object per engine conventions).
  - `zulu_authority_check` with a malformed regex in domain_filter: fails CLOSED (returns
    `{approved:false}`) rather than throwing — safety-critical direction (R12).
  - `zulu_authority_check_render` returns a display-safe string; empty slot input → structured
    error, not a runtime exception.
  - Adversarial: null slot → structured error; slot not in SLOT_NAMES → structured error;
    `zuluOptIn` false on all slots → every non-read action returns `{approved:false}`.

- **Unit — `mcp-server/src/__tests__/HermesParallelFanoutPlannerEngine.test.ts` (extend):**
  - Fanout of 3 parallel tasks: file-scope partitioner assigns non-overlapping file sets
    (intersection of any two sets = empty).
  - Budget envelope: total assigned token budget ≤ parent envelope; each agent gets ≥1 turn.
  - `hermes_verdict_aggregate`: 3 verdicts with 2 PASS + 1 FAIL → aggregate = FAIL (not
    majority-pass); all 3 PASS → aggregate = PASS. Regression lock for stub-assertion class.
  - Self-correction loop (`hermes_self_correct`): a verdict containing a P0 finding triggers
    a correction plan; a verdict with only P3 findings does not (below threshold).
  - Adversarial: empty task list → structured error; overlapping file claims → partitioner
    raises conflict before dispatch (fail before fleet noise, not after).

- **Unit — `mcp-server/src/__tests__/DreamMarkerScannerEngine.test.ts` (extend
  `dream_scanner_wire.test.ts`):**
  - `dream_scan` on a fixture file containing `DREAM: build-X` markers: returns all markers
    extracted, count matches fixture.
  - `dream_markers_to_proposals` converts markers to `DreamArtifactBundle` with concrete
    fields (title, description, priority non-null); verifies no marker is silently dropped.
  - Adversarial: malformed `DREAM:` line (missing body) → returns partial result, not crash;
    empty input file → returns `{markers:[], proposals:[]}`.

- **Integration — `mcp-server/src/__tests__/slot-brief-channel.test.ts` (new/extend):**
  - Round-trip via `prism_context:slot_brief_write` then `slot_brief_list`: the written brief
    appears in list with correct slot key.
  - Consume-once semantics: after injection the brief is removed (or marked consumed);
    `slot_brief_list` no longer returns it.
  - Security: a brief written for slot `alpha` is NOT returned in a `slot_brief_list` for
    slot `bravo` (lane isolation — no cross-slot leakage).
  - Zod schema: missing `slot` field → rejected with descriptive error before engine call.
  - Adversarial: brief body containing `JSON.parse`-hostile payload (no closing brace) →
    bounded parse succeeds (extracts what it can) without throwing (hostile-payload guard).

- **Integration — `mcp-server/src/__tests__/weekly-synthesis-get.test.ts` (new):**
  - `memoryDispatcher:weekly_synthesis_get` with a fresh sidecar (≤7 days old) returns
    `{hermes_reflection:{exists:true, ...}}`.
  - With an absent/stale sidecar → returns `{hermes_reflection:{exists:false}}` (not a throw;
    liveness-signal contract verified).
  - Dispatcher Zod schema: action `"weekly_synthesis_get"` in z.enum; round-trip through
    dispatcher not singleton.

- **Integration — reconciler round-trip (new):**
  - `scripts/reconcile-zulu-ledger.mjs` in --dry-run mode on a fixture ledger with 3 items
    (1 SHIPPED, 1 TRUE-OPEN, 1 COVERED): emits exactly 3 verdict entries; categories match
    fixture; sidecar JSON is schema-valid; no disk mutation in dry-run mode.
  - Stale sidecar guard: reconciler exits 1 with `--strict` when sidecar is >2h old
    (regression lock for the "5 of 7 items already shipped" stale-ledger finding).

- **Coverage floor:** happy path + ≥3 failure modes (bad slot, bad domain, malformed payload)
  + ≥2 adversarial (hostile JSON, null input, overlapping file claims) + ≥3 spanning
  scenarios (fanout, slot-brief, dream-scan). Runner:
  `rtk npx vitest run mcp-server/src/__tests__/ZuluFleetGovernorEngine.test.ts
  mcp-server/src/__tests__/HermesParallelFanoutPlannerEngine.test.ts
  mcp-server/src/__tests__/DreamMarkerScannerEngine.test.ts
  mcp-server/src/__tests__/slot-brief-channel.test.ts
  mcp-server/src/__tests__/weekly-synthesis-get.test.ts`
  Also per CLAUDE.md §11:
  `rtk npx vitest run -t "Hermes|Zulu|Dream|Moonshot|SlotBrief|ModelAttrib|OpusCapab|SoulAware|AgentSpec"`

---

## §5 — Simulation plan

> This is an ORCHESTRATION galaxy. Simulations are dry-run fleet sweeps, resolver correctness
> probes, and consensus convergence tests — NOT machining physics simulations. JM Die machining
> jobs do not apply here. The "simulation" is the orchestrator running against representative
> fleet scenarios.

- **What to simulate:**
  1. Fleet sweep dry-run — zulu orchestrator sweep with `DRY_RUN=1` across a synthetic
     `chat-slots.json` fixture with 26 slots (alpha..zulu) at varying pressure levels: 3 RED,
     5 YELLOW, 18 GREEN. Expected: no SendKeys fired; advisory messages emitted for RED slots;
     zero slots with `zuluOptIn` → all actions are no-ops (governance gate respected).
  2. Slot-claim resolver correctness — `claimSlot` called on a chat that owns 2 slots (the
     papa-rebind bug class): verify one-owner invariant enforced; only the canonical slot
     retained; the dangling slot record released and not re-surfaced by any injector.
  3. Handoff resolver tie-break — `per-agent-handoff.mjs read --terminal <id>` on a chat with
     handoffs under both `slot/papa` and `slot/alpha`: verify the `same-instance-current-slot`
     tier (0.4) resolves to the CURRENT slot's handoff, not the global newest (regression lock
     for [[reference_papa_rebind_resolver_cron_fix_2026_06_18]]).
  4. Octopus consensus convergence — `MultiModelConsensusEngine.ask()` with 2 diverse local
     voices (qwen2.5-coder:32b + gpt-oss:20b): verify both voices produce tagged ids;
     consensus ledger written (not a 522B stub); `consensus-of` cross-substrate edge emitted.
  5. Stale-slot cron detection — `stale-slot-cron-advisory.mjs` on a synthetic scheduled-task
     list containing a `startup-papa` cron where the claiming slot is `alpha` (rebind case):
     verify advisory emits a `CronDelete` plan for the stale cron; no false-positive on
     legitimately-claimed slot crons.

- **Tools:**
  - `prism_orchestrate:swarm_execute` (dry-run mode) for fleet sweep scenario
  - `prism_session:zulu_authority_check` for governance gate probes
  - `scripts/reconcile-zulu-ledger.mjs --dry-run` for ledger scenarios
  - `node .claude/helpers/chat-slots.mjs` for slot-claim correctness probes
  - `node .claude/helpers/per-agent-handoff.mjs read --terminal <id>` for resolver probes

- **Pass criteria:**
  - Zero unauthorized SendKeys in dry-run sweep (governance gate enforced)
  - One-owner invariant holds across 5 random 2-slot-ownership fixtures
  - Handoff resolver returns correct-slot handoff in 100% of tie-break scenarios
  - Octopus consensus ledger > 100 bytes (not the 522B stub regression)
  - Stale-cron advisory flags 100% of stale-targeting crons with 0 false-positives on clean fixtures

---

## §6 — Validation plan (live signals + numbers — R12/R15)

> Validation for an orchestration galaxy uses live fleet signals, not machining part data.
> JM Die machining jobs do not ground this domain. These are the equivalent "production
> workloads" for a fleet orchestrator.

- **Live-data validation:**
  1. **Zulu sweep liveness** — `PRISM Zulu Orchestrator` scheduled task state=Ready; last
     result=0; last run ≤10 min ago. Report: slot-pressure distribution across 26 slots.
  2. **Self-reflect cron freshness** — `memoryDispatcher:weekly_synthesis_get` returns
     `hermes_reflection.exists=true` with `age ≤ 7 days`. Report the actual age in hours.
  3. **Hermes-Obsidian bridge liveness** — `PRISM Hermes-Obsidian Bridge` task state=Ready;
     files present in `knowledge/hermes-brain/` (count ≥ 1); last sync ≤ 15 min.
  4. **Ledger reconciler accuracy** — run `reconcile-zulu-ledger.mjs` against the live
     `ZULU-MASTER-CONTEXT-LEDGER-2026-06-11.md`; report count of TRUE-OPEN / SHIPPED /
     COVERED items. Acceptance: ≤3 unreconciled TRUE-OPEN items after the deepening pass.
  5. **Octopus consensus ledger size** — `knowledge/memories/patterns/ai-systems-fleet-state.md`
     ledger entry for `multiModelConsensus`; ledger > 1000 bytes (regression lock for the
     522B stub). Report actual byte count.
  6. **Fleet-task-health coverage** — `fleet-task-health-watch.mjs` monitors exactly 39 PRISM
     scheduled tasks (verified 2026-06-01 `213a1da6f8`). Report monitored count vs actual
     registered count; flag any delta.
  7. **Slot-brief channel correctness** — write a test brief for slot `alpha` via
     `prism_context:slot_brief_write`; verify the `slot-brief-inject.mjs` hook delivers it on
     the next UserPromptSubmit for alpha; verify it does NOT appear on beta's context.

- **Acceptance gates:**
  - Zulu sweep: last run ≤ 10 min, result = 0 (no crash), advisory log non-empty (≥ 1 pressure signal)
  - Self-reflect: age ≤ 7 days, `exists=true`
  - Hermes-Obsidian bridge: files in `knowledge/hermes-brain/` count ≥ 1, last sync ≤ 15 min
  - Ledger: TRUE-OPEN count ≤ 3
  - Octopus ledger: > 1000 bytes
  - Fleet-task coverage: monitored count = registered count (0 delta)
  - Slot-brief: isolated delivery confirmed (no cross-slot leakage)

- **Safety gate:** `prism_session:zulu_authority_check` + `prism_safety:validate_physics` for
  any cross-slot directive that touches safety-relevant dispatch surfaces. The governance NO-GO
  on `:8767` is itself the primary safety gate — do not relax it without clearing
  [[reference_hermes_control_readiness_nogo_2026_06_01]] criteria.

---

## §7 — Fine-tune loop (results → retrain)

- **Outcome capture:** weekly self-reflection sidecar (`state/shared/dashboards/weekly-
  hermes-reflection-<date>.md`) + ledger reconciler verdicts (`ZULU-LEDGER-RECONCILE-
  LATEST.json`) + slot-brief delivery confirmations. These are the orchestration domain's
  equivalent of SFC outcome records.
- **LoRA:** failed resolver scenarios, wrong-channel events, hostile-payload near-misses,
  stale-ledger surprises → append to `hermes-zulu_lora_train.jsonl`. India retrains on weekly
  cadence. Promotion gate: dispatcher round-trip tests green + resolver correctness simulation
  (§5) all scenarios PASS post-retrain. Never promote on a single seed.
- **RAG/CAG:** new wiki leaves (§3) and tribal tips → `scripts/embed-cited-tips.mjs`
  re-embeds; galaxy synthesis brain refreshed via `scripts/galaxy-synthesis-refresh.mjs
  --galaxy hermes-zulu` on every deepening cycle.
- **NN/GNN:** reconciler COVERED verdicts → `vault-to-gnn-refpool.mjs` labels hermes-zulu
  engine nodes → GraphSAGE selective retrain (india). Promote IFF AUROC ≥ 0.78 / macro-F1
  ≥ 0.55 / Brier ≤ 0.15 at minConf = 0.70 selective gate (current: AUROC 0.808 PASS at
  selective gate; full-coverage Brier 0.179 still below gate — do NOT promote full-coverage).
- **Trigger + cadence:**
  - Weekly: self-reflect cron → LoRA dataset append → (india) weekly retrain
  - On-threshold: ≥5 new resolved ledger items → reconciler → refpool label update
  - On-demand: `scripts/galaxy-synthesis-refresh.mjs` after any tribal/wiki deepening pass
  - GNN retrain: on-threshold (refpool growth) → india → promote IFF all gates met
- **Governance retrain:** when governance readiness criteria change (e.g. first slot opts in
  via `zuluOptIn`), re-run `zulu_authority_check` tests against live data to confirm the
  control path behaves correctly before any SendKeys actuation goes live.

---

## §8 — Frontend build (Kienzle Claude-Design rollout)

- **Assigned Kienzle page:** `mcp-server/web/design-imports/kienzle-app-build/Kienzle System Sync.dc.html`
  (183 lines; 2-panel layout: left = interactive data-flow SVG graph with animated edges;
  right = scenario selector + propagation impact list + correlation guarantee card).
- **Design intent (read from the .dc.html source):**
  - Dark canvas `#070809` / `#0A0B0D` / `#0C0D10` — matches PRISM dark theme tokens.
  - Hub node: `jm-data.js` / "SOURCE OF TRUTH" at SVG center (380, 320). In the PRISM
    implementation this maps to the live `prism_orchestrate` / `prism_session` dispatcher
    surface as the single source of truth for fleet state.
  - 19 screen nodes positioned around the hub (left = MAKE: sfc/crib/post/trilobe/cad/
    thermal/materials; right = BIZ+RUN: quote/jobcost/erp/inventory/shop/floor/sched/
    payroll/portal/quality/academy/alarm). Animated dashed edges to "touched" nodes on
    scenario selection. Color coding: `#FF5A2B` (PRISM accent orange) for active/touched;
    `rgba(255,255,255,0.07)` for dormant edges.
  - Right panel: 4 scenarios (SIG cavity feeds, D2 kc recalibration, Add 13th machine,
    New customer RFQ). Each shows affected screens + effect description + "CORRELATION
    GUARANTEE" card explaining why one-source-of-truth prevents drift.
  - Responsive scale: `transform:scale()` driven by `Math.min(window.innerWidth/1600,
    window.innerHeight/980)` — translates to mobile-responsive CSS scale in React.
  - Status indicator: "IN SYNC" / "OUT OF SYNC" pulsing dot (top-right header).
  - Fonts: Space Grotesk (headings), Archivo (body), JetBrains Mono (data/labels) — all
    already in PRISM DESIGN.md token set. Use CSS vars; never inline font-family strings.

- **Target React page:** `mcp-server/web/src/pages/SystemSyncPage.tsx` — NEW (confirmed:
  no existing page with this name or similar found in the 102+ page inventory). Create new.
  Route: add to `App.tsx` under `/system-sync`. Sidebar nav entry under "System" section.

- **Backend wiring (concrete prism_* actions this page consumes):**
  - **Fleet state source of truth:** `prism_session:master_index_query` — fetches live node
    status (built/wired/ghost) for the SVG graph nodes. Map each of the 19 Kienzle screen
    nodes to a real dispatcher+route on `:3100`.
  - **Scenario propagation data:** `prism_orchestrate:roadmap_next_batch` — surfaces which
    roadmap units are affected by a scenario change. The "PROPAGATES TO" panel maps to this.
  - **Sync status indicator:** `prism_session:master_index_node_status` — drives the "IN SYNC"
    / "OUT OF SYNC" header badge (all referenced engines built+wired = IN SYNC).
  - **Zulu sweep status:** `prism_session:zulu_authority_check` — surfaces governance readiness
    for the control-path status chip.
  - **Orchestrate sweep advisory:** `prism_orchestrate:swarm_status` — surfaces last sweep
    result + slot pressure distribution for a live fleet-health panel (add to right panel as
    a 5th "scenario" — fleet orchestration state).
  - **API client:** `mcp-server/web/src/api/systemSyncApi.ts` — new file. POST to
    `:3100/api/v1/session/master-index-query` and `:3100/api/v1/orchestrate/swarm-status`.
    Verify both routes live before shipping (grep `mcp-server/src/routes/` for `session` and
    `orchestrate`). Dead-wire prevention: if routes absent → flag as open gap in §10.

- **Design language:** iOS fleet tokens from `mcp-server/web/DESIGN.md`; PRISM dark base
  (`var(--bg-base)`, `var(--bg-surface)`, `var(--border)`). Accent: `var(--accent-orange)`
  (`#FF5A2B` in the Kienzle source) as the single dominant accent for this page — matches the
  Kienzle design exactly. JetBrains Mono for all data labels / node ids / status text.
  Space Grotesk for headings. Never inline hex or px — only CSS vars. Mobile-first: 44pt tap
  targets, safe-area padding via `<MobileSafeArea>`, Capacitor 6 compatible.

- **SVG graph implementation notes:**
  - The 19 nodes + animated edges are the core interactive element. In React: render the SVG
    statically; drive `touched` set from selected scenario state; use CSS animation class
    toggle (`animation: kzdash 0.8s linear infinite`) for the dashed-edge marching ants.
    Do NOT use a third-party graph library — the Kienzle design uses plain SVG with
    hard-coded coordinates (feasible at this scale).
  - The `{{ scale }}` template variable → React state `scale = Math.min(window.innerWidth /
    1600, window.innerHeight / 980)`; update on `window resize` via `useEffect`.
  - The `{{ nodes }}` and `{{ edges }}` template loops → `useMemo` computed from selected
    scenario + static NODES array. Touched nodes highlighted orange; dormant nodes dim.

- **Build/verify loop:** `npm run build:fast` → Playwright screenshot at 3 viewports →
  compare to `.dc.html` intent → iterate. No inline physics constants in frontend JS (none
  apply here — orchestration page). All fleet-state values fetched from backend via
  `systemSyncApi.ts`, never hardcoded in the React component.

- **3-viewport acceptance:**
  1. 375×667 (iPhone SE) — single-column stacked; SVG graph above fold (full-width);
     scenario selector scrollable below; "IN SYNC" badge visible in header.
  2. 390×844 (iPhone 14) — primary iOS target; SVG graph at ≥280px height; right panel
     scrollable; scenario cards tappable (≥44pt touch targets).
  3. 1440×900 (desktop) — 2-column Kienzle layout intact; SVG graph left panel fills
     available width; right panel 392px fixed as in design; animated edges visible.

- **Acceptance:** page renders live fleet-state data from `:3100`; scenario selection updates
  SVG highlighting + right-panel propagation list in ≤200ms; "IN SYNC" badge reflects real
  dispatcher state; 3-viewport screenshots match design intent; per-file 2-arm scrutiny PASS
  on `SystemSyncPage.tsx` and `systemSyncApi.ts`.

---

## §9 — Dependencies & sequencing

- **Blocked by:**
  - **sierra** — `prism_session:master_index_query` and `master_index_node_status` must be
    live on `:3100` before the System Sync page can display real fleet-node status. Verify
    route existence in `mcp-server/src/routes/` before building the API client.
  - **india** — LoRA retrain and GNN refpool promotion (zulu produces datasets/labels;
    india trains). The selective GNN gate (AUROC 0.808) is already met; full-coverage gate
    requires refpool growth (india/sierra).
  - **Governance readiness** — `:8767` control path remains NO-GO until
    [[reference_hermes_control_readiness_nogo_2026_06_01]] criteria clear. Do NOT build any
    frontend actuation for the control path until governance gate passes.
  - **`outcome-bus-auto-tap.mjs`** — verified ABSENT from disk. The xproc_* action wiring
    (CLAUDE.md §10) remains UNVERIFIED. Do not build a consumer until the bus is confirmed live.

- **Blocks:**
  - **All 25 worker slots** — zulu's fleet orchestration (task auction, fanout, slot-brief
    channel, ledger reconciler) unblocks discoverability and correct handoff resolution for
    every domain slot. Per master plan §5: zulu is INFRA-FIRST and unblocks the whole fleet.
  - **quebec (frontend)** — System Sync is the fleet orchestration surface; it aggregates
    data from every other domain. It should be built AFTER the first wave of domain backends
    are validated (so the "PROPAGATES TO" panel shows real data, not stubs).
  - **india (AI/NN)** — octopus consensus outcomes feed india's LoRA corpus; zulu's galaxy-
    reasoning-bridge outputs feed the GNN refpool.

- **Logical order (R13):** deepen core (§3 — loops, tribal, wiki) → test resolver/dispatch
  (§4) → simulate fleet scenarios (§5) → validate live fleet signals (§6) → fine-tune loop
  live (§7) → frontend System Sync page (§8). Frontend LAST — never build the fleet dashboard
  atop an unvalidated orchestration backend.

- **Sequencing note (master plan §5):** zulu is in the INFRA-FIRST wave alongside india,
  romeo, and sierra. The hermes-zulu deepening should complete before the physics/core-domain
  wave (oscar, foxtrot, whiskey, mike) begins their fine-tune phase, because those domains
  depend on zulu's fleet-wide discoverability and loop infrastructure.

---

## §10 — Done-definition (R15: WIRE → TEST → VALIDATE → APPLY)

- [ ] **WIRE:** every new asset (wiki leaves, tribal tips, LoRA dataset, GNN labels,
  `systemSyncApi.ts`, `SystemSyncPage.tsx`) wired to its consumer in the same commit (no
  orphan). `SystemSyncPage.tsx` route wired in `App.tsx`. `systemSyncApi.ts` wired to real
  `:3100` routes (not dead wires — routes verified alive before commit). `hermes-zulu_lora_
  train.jsonl` wired to india's retrain pipeline. Any new `prism_session` actions wired in
  `sessionDispatcher.ts` z.enum (anti-regression: action count must not decrease).
- [ ] **TEST:** all test files from §4 green; no `.skip`; ≥3 failure modes + ≥2 adversarial
  + ≥3 spanning scenarios; round-tripped through `prism_session`/`prism_context`/
  `prism_orchestrate` dispatchers (not singletons). Stub-hunter (`scripts/stub-sweep-full.mjs`)
  clean on all new test files — zero `toBeDefined()` or `toBeTruthy()` without concrete values.
- [ ] **VALIDATE:** all §6 live-signal acceptance gates met with reported numbers: sweep
  age ≤10min, self-reflect age ≤7d, Hermes-Obsidian bridge file count ≥1, ledger TRUE-OPEN
  ≤3, octopus ledger >1000 bytes, fleet-task coverage delta=0, slot-brief isolation confirmed.
- [ ] **APPLY:** deepening cron loop live (self-reflect + reconciler + Obsidian-bridge
  scheduled tasks all state=Ready); tribal tips ≥90; wiki leaves ≥6 in hermes-zulu namespace;
  `SystemSyncPage.tsx` rendering live fleet-state at 3 viewports; LoRA dataset produced;
  GNN refpool labeled; galaxy-synthesis-refresh run and `hermes-zulu_synthesis.md` updated.
- [ ] **GOVERNANCE check:** zulu_authority_check passes clean on all 26 slots in READ-ONLY
  mode; `:8767` actuation path remains NO-GO until readiness criteria explicitly cleared.
- [ ] **STUB-HUNTER:** `scripts/stub-sweep-full.mjs` + `scripts/audit-unwired-engines.mjs` +
  `scripts/reconcile-zulu-ledger.mjs` all clean (zero new orphans, zero new stubs).
- [ ] Per-file 2-arm scrutiny on every new/modified code file + 3-of-3 Stop gate on the session.
