---
milestone: OCTOPUS-NEURAL-MS0
parent_roadmap: BACKEND-DEVTOOLS-RGS6-MEGA-ROADMAP-2026-05-10.md
research_source: state/shared/research/2026-05-10-pass2-octopus-neural.md
total_units: 5
critical_path_role: octopus 5/5 + neural-coordinated cascade — depends on K2-CLOUD-MS0
loop_registrations: 1 (cascade-calibration probe 7d)
date: 2026-05-10
---

# OCTOPUS-NEURAL-MS0 — atomized

> Multi-LLM coordination synthesis: MoA (Wang 2406.04692) + Reflexion (Shinn 2303.11366) + FrugalGPT (Chen 2305.05176) + Self-MoA (2502.00674) + RMoA (2505.24442) + Puppeteer (2505.19591) + GraphRouter (2410.03834) + GATEKEEPER (2502.19335) — plus Kimi K2.6 (Apr 2026) as native mid-tier swarm host.

---

## U-OCN01 — Build `KimiTransportEngine` (mid-tier tentacle)

- pillar: octopus
- tier: T1
- ai_priority_score: 90
- leverage_score: 14
- why: 5/5 octopus consensus needs all tentacles; Kimi K2.6 is ~10× cheaper than Opus at 256K context with native 300-sub-agent swarms
- depends_on: [K2-CLOUD-MS0 H6 (cross-worktree firewall)]
- blocks: [U-OCN02, U-OCN03, U-OCN04, U-OCN05]
- parallel_with: []
- viz_node_id: `eng.ai.kimitransportengine` (TBD-create)
- closes_synergy_edge: octopus × octopus (currently 3/5, this makes 4/5)
- loop_schedule: none

verifies_via:
  channel: integration
  tool: `curl ... | node scripts/kimi-roundtrip-test.mjs`
  expected_signal: HTTP 200 + valid JSON response within 30s
  re_run_cost: 30s
  baseline: nonexistent

micro_steps:
  - step-1:
      tool: Read
      path: `state/shared/research/2026-05-10-pass2-octopus-neural.md`
      action: extract Moonshot OpenAI-compat API spec
      verify: spec section identified
  - step-2:
      tool: Write
      path: `mcp-server/src/engines/KimiTransportEngine.ts`
      action: HTTP client w/ bearer auth, stream support, retry-with-backoff, timeout 30s
      verify: file exists, exports singleton
  - step-3:
      tool: Write
      path: `mcp-server/src/__tests__/KimiTransportEngine.test.ts`
      action: 7 tests — happy, 401, 429, timeout, invalid JSON, stream cancel, prompt-injection in response
      verify: 7 passed (mock fetch)
  - step-4:
      tool: Edit
      path: `mcp-server/src/schemas/aiReasoningActionSchemas.ts`
      action: add `kimi_invoke` Zod schema (input: prompt, model, max_tokens; output: text, usage)
      verify: TS compiles
  - step-5:
      tool: Edit
      path: `mcp-server/src/tools/dispatchers/aiReasoningDispatcher.ts`
      action: wire `kimi_invoke` action with lazy import
      verify: round-trip MCP returns mock response
  - step-6:
      tool: Bash
      path: `mcp-server/`
      action: build + integration test
      verify: `npm run build:fast && npx vitest run KimiTransport` → all green

adversarial_cases:
  - prompt injection in API response (jailbreak attempt)
  - 4GB streaming response (memory exhaustion)
  - bearer token leaked in error message (security)

variability_axis:
  - kimi-k2.6 / kimi-k2.5 / fallback-qwen-cloud (3 model variants)
  - 1k / 10k / 100k context input sizes
  - happy-path / rate-limit / network-partition

failure_modes:
  - 401 unauthorized → emit alarm + fall back to Claude
  - 429 rate-limit → exponential backoff (1s/2s/4s/8s, max 4 retries)
  - timeout → cascade fallback to Qwen (local) per `AISystemRouterEngine`

---

## U-OCN02 — Build `MoaLayer2Engine` (aggregator over current 3-of-3)

- pillar: octopus
- tier: T1
- ai_priority_score: 80
- leverage_score: 13
- why: MoA pattern beats single-model by 30%+; aggregator distills proposer outputs into senior-model final pass
- depends_on: [U-OCN01]
- blocks: [U-OCN03, U-OCN05]
- parallel_with: [U-OCN04]
- viz_node_id: `eng.ai.moalayer2engine` (TBD-create)
- closes_synergy_edge: octopus × dispatchers (currently manual)
- loop_schedule: none

verifies_via:
  channel: eval
  tool: `node scripts/moa-eval.mjs --queries=10`
  expected_signal: aggregated quality >= individual-best by ≥10% on rubric
  re_run_cost: 60s
  baseline: scrutiny-3way returns 3 verdicts, no aggregation layer

micro_steps:
  - step-1:
      tool: Read
      path: `mcp-server/src/engines/ScrutinyLedgerEngine.ts`
      action: pattern reference for 3-way consensus
      verify: file readable
  - step-2:
      tool: Write
      path: `mcp-server/src/engines/MoaLayer2Engine.ts`
      action: collect 3-of-3 proposer outputs → senior-model aggregation prompt → return distilled
      verify: file exists
  - step-3:
      tool: Write
      path: `mcp-server/src/__tests__/MoaLayer2Engine.test.ts`
      action: 6 tests — happy, single proposer (degenerate), disagreement (high entropy), all-fail, senior model offline, oversized aggregation
      verify: 6 passed
  - step-4:
      tool: Edit
      path: `mcp-server/src/tools/dispatchers/aiReasoningDispatcher.ts`
      action: add `moa_aggregate` action
      verify: round-trip MCP

adversarial_cases:
  - 2 of 3 proposers return identical (collusion / over-fitting)
  - Self-MoA dilution risk: homogeneous responses

variability_axis:
  - 3 / 5 / 7 proposer pool
  - Claude / Sonnet / Kimi senior aggregator

failure_modes:
  - senior aggregator down → fall back to majority vote
  - dilution (per Self-MoA 2502.00674) → anchor with senior verdict, downweight proposers when entropy low
  - aggregation > context limit → truncate per proposer (keep top-N by confidence)

---

## U-OCN03 — Build `NeuralRoutingEngine` (GraphRouter on scrutiny ledger)

- pillar: octopus
- tier: T1
- ai_priority_score: 75
- leverage_score: 12
- why: GraphRouter (2410.03834) replaces hardcoded routing chains with learned topology; PRISM has scrutiny ledger for training data
- depends_on: [U-OCN02]
- blocks: []
- parallel_with: [U-OCN04, U-OCN05]
- viz_node_id: `eng.ai.neuralroutingengine` (TBD-create)
- closes_synergy_edge: neural × dispatchers (currently auto, this productizes)
- loop_schedule: 24h (retrain on new ledger entries)

verifies_via:
  channel: eval
  tool: `node scripts/neural-routing-eval.mjs --holdout=20`
  expected_signal: routing accuracy > 70%
  re_run_cost: 90s
  baseline: hardcoded routing accuracy ~50%

micro_steps:
  - step-1:
      tool: Read
      path: `mcp-server/data/state/SCRUTINY_LEDGER.json`
      action: confirm ledger has ≥50 entries for training
      verify: `jq '.entries|length' SCRUTINY_LEDGER.json` ≥ 50
  - step-2:
      tool: Write
      path: `mcp-server/src/engines/NeuralRoutingEngine.ts`
      action: lightweight GNN — embed (change-class, file-types, peer-count) → route decision
      verify: file exists
  - step-3:
      tool: Write
      path: `scripts/neural-routing-train.mjs`
      action: train script — reads ledger, outputs model weights to `state/shared/neural-routing-weights.json`
      verify: weights file produced
  - step-4:
      tool: Write
      path: `scripts/neural-routing-eval.mjs`
      action: 80/20 split eval, reports accuracy
      verify: script runs, prints metric
  - step-5:
      tool: Edit
      path: `mcp-server/src/tools/dispatchers/aiReasoningDispatcher.ts`
      action: wire `neural_route_decision` action
      verify: round-trip MCP

adversarial_cases:
  - ledger poisoned with fake entries
  - distribution shift (training data stale)

variability_axis:
  - small / medium / large change-class
  - 50 / 200 / 1000 training entries

failure_modes:
  - cold-start (< 50 entries) → fall back to hardcoded rules
  - drift → 24h retrain catches; manual reset path
  - GNN OOM on large graphs → batch + average

---

## U-OCN04 — Build `CascadeCalibrationEngine` (probe-based offload)

- pillar: octopus
- tier: T1
- ai_priority_score: 70
- leverage_score: 11
- why: FrugalGPT + GATEKEEPER show probe-based deferral cuts cost 98%; PRISM lacks calibration loop
- depends_on: [U-OCN01]
- blocks: [COST-CASCADE-MS0]
- parallel_with: [U-OCN02, U-OCN03]
- viz_node_id: `eng.ai.cascadecalibrationengine` (TBD-create)
- closes_synergy_edge: octopus × cost (currently manual)
- loop_schedule: 7d (probe set refresh)

verifies_via:
  channel: metric
  tool: `node scripts/cascade-calibrate.mjs --probes=50`
  expected_signal: cost-quality frontier produced, defer threshold computed
  re_run_cost: 5min
  baseline: hardcoded thresholds

micro_steps:
  - step-1:
      tool: Write
      path: `mcp-server/src/engines/CascadeCalibrationEngine.ts`
      action: run 50 probe prompts through each tier, compute cost-vs-quality frontier
      verify: file exists
  - step-2:
      tool: Write
      path: `scripts/cascade-calibrate.mjs`
      action: CLI — writes `state/shared/cascade-thresholds.json`
      verify: thresholds file produced
  - step-3:
      tool: Write
      path: `mcp-server/src/__tests__/CascadeCalibrationEngine.test.ts`
      action: 5 tests — happy, all tiers fail probe, oversized probe set, missing baseline, NaN scores
      verify: 5 passed

adversarial_cases:
  - probe set memorized by model → over-fit thresholds
  - probe response truncated mid-stream

variability_axis:
  - 10 / 50 / 200 probes
  - manufacturing / AI / safety domain probes (3 spanning)

failure_modes:
  - all probes fail → preserve last-known-good thresholds + alarm
  - cost runaway → hard cap on probe budget
  - drift → 7d refresh

---

## U-OCN05 — Build `ConsensusQuorumEngine` (dynamic N-of-M from change class)

- pillar: octopus
- tier: T1
- ai_priority_score: 65
- leverage_score: 11
- why: not every change needs 5/5 consensus; minor → 2-of-5 is fine; safety-critical → 5/5 mandatory
- depends_on: [U-OCN02]
- blocks: []
- parallel_with: [U-OCN03, U-OCN04]
- viz_node_id: `eng.ai.consensusquorumengine` (TBD-create)
- closes_synergy_edge: octopus × safety (currently manual)
- loop_schedule: none

verifies_via:
  channel: integration
  tool: classify-then-quorum 10 diffs → assert quorum matches policy
  expected_signal: 10/10 correctly assigned (minor→2, major→3, safety→5)
  re_run_cost: 60s
  baseline: fixed 3-of-3 for everything

micro_steps:
  - step-1:
      tool: Write
      path: `mcp-server/src/engines/ConsensusQuorumEngine.ts`
      action: classify diff (regex on file paths + content patterns) → return quorum requirement
      verify: file exists
  - step-2:
      tool: Write
      path: `mcp-server/src/__tests__/ConsensusQuorumEngine.test.ts`
      action: 6 tests — minor diff, major refactor, safety-critical (physics constants), test-only, doc-only, mixed
      verify: 6 passed
  - step-3:
      tool: Edit
      path: `.claude/scripts/scrutiny-3way.mjs`
      action: query ConsensusQuorumEngine before dispatching; honor returned N
      verify: scrutiny-Nway now adapts per diff
  - step-4:
      tool: Edit
      path: `mcp-server/src/tools/dispatchers/safetyDispatcher.ts`
      action: add `quorum_required` action
      verify: round-trip MCP

adversarial_cases:
  - mislabeled diff (safety-critical disguised as minor)
  - 1000-file diff (oversized classification)

variability_axis:
  - 1 / 10 / 100 file diff sizes
  - manufacturing / AI / dev-tools / safety domains

failure_modes:
  - misclassification → safety-net: when unsure, escalate to higher quorum
  - quorum unavailable (some CLIs down) → defer with explicit risk acceptance
  - classifier drift → weekly recalibration

---

## §X — Closing notes

**Critical-path:** U-OCN01 (Kimi transport) is the gate. Once built, U-OCN02..05 fan out in parallel.

**K2-CLOUD-MS0 dependency:** specifically waits on H6 (cross-worktree firewall) to land first.

**Cron registrations:** `/loop --interval 7d` for U-OCN04 probe refresh; `/loop --interval 24h` for U-OCN03 GNN retrain.

**Synergy edges closed:** 5 of 56 (octopus × octopus, octopus × dispatchers, neural × dispatchers, octopus × cost, octopus × safety).
