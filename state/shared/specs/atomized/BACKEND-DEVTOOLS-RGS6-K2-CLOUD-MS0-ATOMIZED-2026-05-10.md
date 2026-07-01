---
milestone: K2-CLOUD-MS0 (extended)
parent_roadmap: BACKEND-DEVTOOLS-RGS6-MEGA-ROADMAP-2026-05-10.md
inherits_protocol: BACKEND-DEVTOOLS-RGS6-AUTONOMOUS-EXECUTION-PROTOCOL.md (§7 implicit)
assigned_lane: lane-B-octopus-cost
commit_prefix: "[lane-B-octopus-cost][K2-CLOUD-MS0]"
total_units: 14
critical_path_role: depends on HOOK-SYNERGY H1+H6 (cross-worktree firewall); unblocks COST-CASCADE and OCTOPUS-NEURAL
loop_registrations: 1 (cost-quality probe weekly)
date: 2026-05-10
---

# K2-CLOUD-MS0 — atomized (extended)

> Octopus 5th tentacle (Kimi K2.6:cloud) + cost cascade ladder + 5-of-5 scrutiny upgrade. WAITS on lane-A's H6 firewall before any edit to `AISystemRouterEngine.ts`.

---

## K2-K0 — Build `KimiTransportEngine` (entry unit, mirror of U-OCN01)

See `OCTOPUS-NEURAL-MS0-ATOMIZED` U-OCN01 for full micro_steps. **This milestone owns the BUILD; OCTOPUS-NEURAL-MS0 owns the consumers.**

- depends_on: [HOOK-SYNERGY H1, H6]
- blocks: [K2-K1, U-OCN01]

---

## K2-K1 — Wire K2.6 cloud route in `AISystemRouterEngine.route()`

- pillar: octopus
- tier: T1
- ai_priority_score: 85
- leverage_score: 12
- why: router needs to know Kimi exists to route to it
- depends_on: [K2-K0, HOOK-SYNERGY H6]
- blocks: [K2-K2..K12]
- parallel_with: []
- viz_node_id: `eng.ai.aisystemrouterengine` (existing, extend)
- closes_synergy_edge: router × kimi
- loop_schedule: none

verifies_via:
  channel: integration
  tool: `node -e "require('./mcp-server/dist/engines/AISystemRouterEngine.js').aiSystemRouterEngine.route({effort:'low'})"`
  expected_signal: returns provider `kimi-k2.6` for low-effort tier-2 tasks
  re_run_cost: 1s
  baseline: returns claude-haiku for everything

micro_steps:
  - step-1:
      tool: Read
      path: `mcp-server/src/engines/AISystemRouterEngine.ts`
      action: identify route() switch + tier decision logic
      verify: file readable
  - step-2:
      tool: Edit
      path: `mcp-server/src/engines/AISystemRouterEngine.ts`
      action: add tier-2 routing branch → `kimi-k2.6`; check tier from `state/shared/cascade-thresholds.json` if exists, fall back to defaults
      verify: edit applies, TS compiles
  - step-3:
      tool: Edit
      path: `mcp-server/src/__tests__/AISystemRouterEngine.test.ts`
      action: add 3 tests — low-effort routes to Kimi, high-effort routes to Opus, threshold-config respected
      verify: 3 added tests pass
  - step-4:
      tool: Bash
      path: `mcp-server/`
      action: build verify
      verify: `npm run build:fast 2>&1 | tail -3` no errors

adversarial_cases:
  - cascade-thresholds.json corrupt → fall back to defaults
  - tier inference ambiguous

variability_axis:
  - haiku / sonnet / opus / kimi / qwen (5 providers)
  - low / med / high effort tiers

failure_modes:
  - Kimi 401/429 → cascade to qwen
  - threshold config missing → defaults
  - router test regression → block commit via test gate

---

## K2-K2 — Cost-model entry for K2.6 in `cost-cascade-config.json`

- pillar: cost
- tier: T1
- ai_priority_score: 82
- leverage_score: 12
- why: cost-aware routing needs the price-per-token for K2.6
- depends_on: [K2-K1]
- blocks: [K2-K4, COST-CASCADE-MS0]
- parallel_with: [K2-K3]
- viz_node_id: `fs.deep.state.shared.f.cost_cascade_config_json` (TBD-create)
- closes_synergy_edge: cost × providers
- loop_schedule: 30d (refresh on price changes)

verifies_via:
  channel: test
  tool: `node -e "const j=require('./state/shared/cost-cascade-config.json'); console.log(j.providers.kimi_k2_6)"`
  expected_signal: prints `{input_per_1m:..., output_per_1m:..., effective_date:...}`
  re_run_cost: 0.5s
  baseline: file doesn't exist or missing kimi

micro_steps:
  - step-1:
      tool: Read
      path: `state/shared/research/2026-05-10-pass2-octopus-neural.md`
      action: confirm Kimi K2.6 pricing data
      verify: pricing section readable
  - step-2:
      tool: Write
      path: `state/shared/cost-cascade-config.json`
      action: emit per-provider price table (claude-haiku, sonnet, opus; kimi-k2.6; qwen-local=0)
      verify: file exists, schema-valid
  - step-3:
      tool: Edit
      path: `mcp-server/src/engines/AISystemRouterEngine.ts`
      action: consume cost-cascade-config in route() for cost-aware decisions
      verify: TS compiles

adversarial_cases:
  - price data stale (provider changed pricing)
  - price = 0 (free tier abused)

variability_axis:
  - 5 providers × {input, output, cached} prices

failure_modes:
  - config missing → conservative defaults (assume Claude price)
  - price update mid-session → reload on file mtime change

---

## K2-K3 — Scrutiny-3way → scrutiny-5way (add Kimi + Qwen arms)

- pillar: octopus
- tier: T1
- ai_priority_score: 78
- leverage_score: 11
- why: 5-of-5 consensus per user's "octopus" directive
- depends_on: [K2-K0]
- blocks: [U-OCN02, U-OCN05]
- parallel_with: [K2-K2]
- viz_node_id: `core.script.scrutiny5way` (TBD-extend existing 3way)
- closes_synergy_edge: scrutiny × octopus
- loop_schedule: none

verifies_via:
  channel: integration
  tool: `node .claude/scripts/scrutiny-3way.mjs --target HEAD --providers=all`
  expected_signal: 5 marks recorded (codex, gemini, opus, kimi, qwen)
  re_run_cost: 90s
  baseline: 3 marks

micro_steps:
  - step-1:
      tool: Read
      path: `.claude/scripts/scrutiny-3way.mjs`
      action: pattern reference
      verify: file readable
  - step-2:
      tool: Write
      path: `.claude/scripts/scrutiny-5way.mjs`
      action: copy + extend with Kimi + Qwen invocation arms; support `--providers=all|3way|5way`
      verify: file exists
  - step-3:
      tool: Edit
      path: `H:/prism/CLAUDE.md`
      action: update §SCRUTINY GATE pointer to 5way option
      verify: doc updated

adversarial_cases:
  - 5th provider returns contradictory verdict (deadlock)
  - quorum unreachable (some CLIs offline)

variability_axis:
  - 3-of-5 / 4-of-5 / 5-of-5 quorum
  - quick-pass / deep-pass review depth

failure_modes:
  - Kimi or Qwen offline → fall back to 3way + warning
  - timeout on slow provider → 60s cap per arm
  - deadlock → escalate to maintainer

---

## K2-K4..K12 — 9 cascade/wiring units

Each unit decomposed below in compact form (same template as K2-K1-K2 above; abbreviated due to similar shape):

### K2-K4 — CascadeCalibrationEngine integration (consumer of U-OCN04)
- depends_on: [K2-K2, U-OCN04]
- verify: `node scripts/cascade-calibrate.mjs --probes=50` produces threshold delta
- micro_steps: wire CascadeCalibrationEngine to router; consume thresholds; test cascade-down on K2 fail

### K2-K5 — Fallback chain (K2 → Qwen → Claude-Haiku)
- depends_on: [K2-K2]
- verify: kill K2 endpoint → next request lands on Qwen → if Qwen down lands on Haiku
- micro_steps: extend AISystemRouterEngine with fallback list; test 3-step degradation

### K2-K6 — Telemetry per-provider (which provider served which request)
- depends_on: [K2-K1]
- verify: telemetry includes `provider` field; query last-100 shows distribution
- micro_steps: extend pipeline-telemetry to record `provider`; backfill dashboard

### K2-K7 — Cost dashboard `scripts/cost-dashboard.mjs`
- depends_on: [K2-K6]
- verify: dashboard prints per-provider cost + token totals for last 24h
- micro_steps: read telemetry, multiply by cost-cascade-config, emit MD report

### K2-K8 — Cost alarm (>$X/day → notify)
- depends_on: [K2-K7]
- verify: simulate $50 spend → alarm fires
- micro_steps: PostToolUse hook tracks running cost; threshold from adaptive-thresholds.json; alarm via chat-bus

### K2-K9 — Schema versioning for K2 responses
- depends_on: [K2-K0]
- verify: K2 response wrapped in v1 envelope; v1→v2 migration tested
- micro_steps: Zod schema for K2 response; envelope with `schemaVersion`

### K2-K10 — Error class taxonomy (K2-specific error types)
- depends_on: [K2-K0]
- verify: 6 error subclasses each round-trip with correct status code
- micro_steps: extend `Error` with K2RateLimitError, K2AuthError, K2TimeoutError, etc.

### K2-K11 — Retry-with-backoff policy
- depends_on: [K2-K10]
- verify: 429 triggers exponential backoff (1s/2s/4s); 401 doesn't retry
- micro_steps: per-error-class retry policy in KimiTransport

### K2-K12 — Token-refresh cron (if Kimi uses rotating tokens)
- depends_on: [K2-K0]
- verify: `cat .claude/cron-registry.json` includes K2 token-refresh; runs daily
- micro_steps: scripts/kimi-token-refresh.mjs reads vault, rotates, validates

---

## §X — Closing notes

**Lane ownership:** lane-B-octopus-cost.

**Critical-path:** K2-K0 → K2-K1 (depends on lane-A H6). Then K2-K2..K12 fan out.

**Cross-lane dependency:** WAIT on lane-A H6 before K2-K1. Coordinate via chat-bus.

**Cron:** `/loop --interval 7d` for K2-K4 probe refresh; K2-K12 token rotation daily.

**Synergy closed:** 7 (router × kimi, cost × providers, scrutiny × octopus, telemetry × providers, dashboards × cost, alarms × cost, retry × policy).
