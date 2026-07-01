---
milestone: HOOK-SYNERGY-MS0 (extended)
parent_roadmap: BACKEND-DEVTOOLS-RGS6-MEGA-ROADMAP-2026-05-10.md
inherits_protocol: BACKEND-DEVTOOLS-RGS6-AUTONOMOUS-EXECUTION-PROTOCOL.md (§7 implicit)
assigned_lane: lane-A-hooks-foundation
commit_prefix: "[lane-A-hooks-foundation][HOOK-SYNERGY-MS0]"
total_units: 8
critical_path_role: H1 + H6 unblock K2-CLOUD's edits to AISystemRouterEngine.ts (the K2 unlocker)
loop_registrations: 2 (verify-hook-refs 30min, settings-dedup 6h)
date: 2026-05-10
---

# HOOK-SYNERGY-MS0 — atomized (extended via audit §4 patches)

> Foundation milestone. Without H1+H6, K2-CLOUD's edits get reverted before commit. Lane-A owns this — first wave shipped before any other milestone starts.

---

## U-H1.0 — Build `scripts/verify-hook-refs.mjs` (new sub-unit per audit Finding 1)

- pillar: hook
- tier: T0
- ai_priority_score: 78
- leverage_score: 14
- why: H1 verify channel was aspirational; this script makes it real
- depends_on: []
- blocks: [U-H1]
- parallel_with: [U-H2, U-H3, U-H5, U-H7]
- viz_node_id: `core.script.verifyhookrefs` (TBD-create)
- closes_synergy_edge: hooks × settings
- loop_schedule: 30min

verifies_via:
  channel: test
  tool: `node scripts/verify-hook-refs.mjs --self-test`
  expected_signal: exit 0 (`all references resolve, no duplicates`)
  re_run_cost: 2s
  baseline: script does not exist

micro_steps:
  - step-1:
      tool: Read
      path: `.claude/settings.json`
      action: confirm hooks block structure (PreToolUse / PostToolUse / Stop / UserPromptSubmit / PreCompact arrays)
      verify: file readable, top-level "hooks" key present
  - step-2:
      tool: Write
      path: `scripts/verify-hook-refs.mjs`
      action: parse settings.json hooks → for each entry's `command` field extract referenced script path → ls; emit `{resolved:N, missing:[paths], duplicates:[entries]}`; exit 0 only if missing=[] and duplicates=[]
      verify: file exists, runs without error
  - step-3:
      tool: Bash
      path: `H:/prism/`
      action: smoke run + self-test mode
      verify: `node scripts/verify-hook-refs.mjs --self-test 2>&1` exits 0
  - step-4:
      tool: Bash
      path: `H:/prism/`
      action: register cron `*/30 * * * *`
      verify: `cat .claude/cron-registry.json` includes entry

adversarial_cases:
  - settings.json malformed (bad JSON)
  - referenced script path uses env-var (e.g. `$HOME`)
  - circular hook chain (hook calls another hook)

variability_axis:
  - 0 / 50 / 500 hooks in settings
  - all-resolve / some-missing / all-duplicate

failure_modes:
  - settings.json missing → exit 1 with clear message
  - script path env-var → expand before ls, fall back to literal
  - permission denied on referenced script → flag as warning not error

---

## U-H1 — Generate `HOOK_REGISTRY.json` from `.claude/hooks/*.mjs`

- pillar: hook
- tier: T0
- ai_priority_score: 75
- leverage_score: 13
- why: settings.json scatters hook references; single canonical registry simplifies audit
- depends_on: [U-H1.0]
- blocks: [U-H6]
- parallel_with: [U-H2, U-H3]
- viz_node_id: `fs.deep.state.shared.f.hook_registry_json` (TBD-create)
- closes_synergy_edge: hooks × index
- loop_schedule: per-commit (regen on hook change)

verifies_via:
  channel: test
  tool: `node scripts/verify-hook-refs.mjs` (now that script exists)
  expected_signal: exit 0
  re_run_cost: 2s
  baseline: 0 (no registry)

micro_steps:
  - step-1:
      tool: Glob
      pattern: `.claude/hooks/*.mjs`
      action: enumerate all hook source files
      verify: ≥ 50 hooks discovered
  - step-2:
      tool: Write
      path: `scripts/build-hook-registry.mjs`
      action: scan hook files → extract metadata (event, matcher, command, description from header comment) → emit `state/shared/HOOK_REGISTRY.json`
      verify: script runs
  - step-3:
      tool: Bash
      path: `H:/prism/`
      action: run registry builder
      verify: `ls state/shared/HOOK_REGISTRY.json` exists, JSON parses
  - step-4:
      tool: Edit
      path: `.claude/settings.json`
      action: add post-edit hook on `.claude/hooks/*.mjs` to auto-regen registry
      verify: parse clean

adversarial_cases:
  - hook file without metadata header
  - 1000 hooks (performance)

variability_axis:
  - PreToolUse / PostToolUse / Stop / UserPromptSubmit / PreCompact events
  - command / http / mcp_tool hook types (2.1.89)

failure_modes:
  - missing metadata → infer from filename, flag for review
  - file unreadable → skip + log
  - registry corrupt → restore from `.previous.json` backup

---

## U-H2 — Convert 5 highest-fire warn-style hooks → deterministic autofix

- pillar: hook
- tier: T0
- ai_priority_score: 70
- leverage_score: 12
- why: warn-style suggestions get ignored; autofix removes the bug class entirely
- depends_on: []
- blocks: []
- parallel_with: [U-H1, U-H3, U-H4]
- viz_node_id: `core.hooks.autofix_top5` (TBD-create)
- closes_synergy_edge: hooks × fix
- loop_schedule: 7d (recompute top-5 from telemetry)

verifies_via:
  channel: metric
  tool: tail telemetry, count autofix vs warn fires
  expected_signal: autofix:warn ratio ≥ 5:1 for the 5 converted hooks
  re_run_cost: 5min observation
  baseline: 0:N (all warn)

micro_steps:
  - step-1:
      tool: Bash
      path: `H:/prism/`
      action: identify top-5 warn hooks from telemetry
      verify: `node -e "..."` queries `state/shared/pipeline-telemetry.jsonl` (or equivalent)
  - step-2:
      tool: Edit
      path: `.claude/hooks/<top-1>.mjs`
      action: rewrite to perform the fix deterministically (e.g. auto-quote shell args instead of warning)
      verify: hook runs autonomously
  - step-3..7: repeat for top-2..5
  - step-8:
      tool: Write
      path: `.claude/hooks/__tests__/<each>.test.mjs`
      action: 3 tests each — happy fix, edge case, adversarial
      verify: tests pass

adversarial_cases:
  - autofix changes user intent
  - autofix loops infinitely

variability_axis:
  - top-5 hooks fire counts (sampled from telemetry)
  - per-domain coverage (manufacturing / dev-tools / etc)

failure_modes:
  - autofix wrong → escape hatch `[NO-AUTOFIX]` user phrase
  - infinite loop → max-applications counter per session
  - destructive fix → require user confirmation for hard cases

---

## U-H3 — Settings-dedup pass (inline `node -e` grep until script lands)

- pillar: hook
- tier: T0
- ai_priority_score: 68
- leverage_score: 11
- why: duplicate hooks slow startup + cause double-fire bugs
- depends_on: []
- blocks: []
- parallel_with: [U-H1, U-H2, U-H4]
- viz_node_id: `core.script.auditsettingsdedup` (TBD-create after U-H3.1)
- closes_synergy_edge: settings × dedup
- loop_schedule: 6h

verifies_via:
  channel: test
  tool: inline `node -e "const j=require('./.claude/settings.json');const seen={};let dup=0;for(const ev of Object.keys(j.hooks||{}))for(const h of j.hooks[ev]||[])for(const c of h.hooks||[]){const k=ev+':'+(c.command||'');if(seen[k])dup++;seen[k]=1}console.log('dup',dup)"`
  expected_signal: `dup 0`
  re_run_cost: 1s
  baseline: unknown (TBD measure)

micro_steps:
  - step-1:
      tool: Bash
      path: `H:/prism/`
      action: inline dedup measurement
      verify: count printed
  - step-2:
      tool: Edit
      path: `.claude/settings.json`
      action: deduplicate by (event, matcher, command) triple — keep first
      verify: re-run inline measurement → dup 0
  - step-3:
      tool: Write
      path: `scripts/audit-settings-dedup.mjs`
      action: promote inline to real script (the H3.1 sub-unit)
      verify: script runs

adversarial_cases:
  - intentional duplicate (same command, different matcher)
  - duplicate but different `if` conditional

variability_axis:
  - 0 / 5 / 50 duplicates
  - PreToolUse / PostToolUse / Stop scopes

failure_modes:
  - false-positive on intentional duplication → manual whitelist
  - settings format change (2.1.89+) → schema-version handling

---

## U-H4 — TaskCreated claim guard

- pillar: hook
- tier: T0
- ai_priority_score: 65
- leverage_score: 10
- why: 2 chats both TaskCreate same subject → duplicated work
- depends_on: []
- blocks: []
- parallel_with: [U-H2, U-H3, U-H5]
- viz_node_id: `core.hooks.taskclaimguard` (TBD-create, overlap with U-HKA09)
- closes_synergy_edge: tasks × multi-chat
- loop_schedule: none

verifies_via: see U-HKA09 (this is the foundational version; HOOKS-V2 layer adds 2.1.89 features)

micro_steps: see U-HKA09; this unit is the base hook, U-HKA09 is the 2.1.89-event-aware version

adversarial_cases: see U-HKA09

variability_axis: see U-HKA09

failure_modes: see U-HKA09

---

## U-H5 — PostToolBatch budget ceiling hook

- pillar: hook
- tier: T0
- ai_priority_score: 62
- leverage_score: 10
- why: foundation version of U-HKA10
- depends_on: []
- blocks: []
- parallel_with: [U-H4, U-H7]
- viz_node_id: `core.hooks.posttoolbatchbudget` (shared with U-HKA10)
- closes_synergy_edge: hooks × cost
- loop_schedule: 7d

verifies_via: see U-HKA10

micro_steps: see U-HKA10

adversarial_cases: see U-HKA10

variability_axis: see U-HKA10

failure_modes: see U-HKA10

---

## U-H6 — Cross-worktree firewall (THE K2 unlocker)

- pillar: hook
- tier: T0
- ai_priority_score: 80
- leverage_score: 15
- why: K2-CLOUD's edits to `AISystemRouterEngine.ts` get reverted when 2 worktrees fight over the same file; firewall enforces single-writer
- depends_on: [U-H1]
- blocks: [K2-K0, K2-K1, all K2-CLOUD-MS0]
- parallel_with: []
- viz_node_id: `core.hooks.crossworktreefirewall` (TBD-create)
- closes_synergy_edge: worktrees × file-claims
- loop_schedule: none

verifies_via:
  channel: integration
  tool: 2 worktrees attempt concurrent edit to same file → second blocked
  expected_signal: 2nd worktree's edit returns "BLOCKED: file owned by worktree X"
  re_run_cost: 30s
  baseline: race condition exists today

micro_steps:
  - step-1:
      tool: Read
      path: `.claude/hooks/file-claim-guard.mjs`
      action: pattern reference (existing claim system)
      verify: file readable
  - step-2:
      tool: Write
      path: `.claude/hooks/cross-worktree-firewall.mjs`
      action: PreToolUse on Edit/Write — read shared lockfile `state/shared/worktree-claims.jsonl`; if peer worktree has active claim, deny
      verify: hook runs
  - step-3:
      tool: Write
      path: `scripts/claim-file.mjs`
      action: helper to acquire/renew/release lockfile claims
      verify: script runs
  - step-4:
      tool: Edit
      path: `.claude/settings.json`
      action: register hook on all Edit/Write
      verify: parse clean
  - step-5:
      tool: Write
      path: `.claude/hooks/__tests__/cross-worktree-firewall.test.mjs`
      action: 5 tests — solo edit passes, dual-worktree blocks 2nd, expired claim allows takeover, claim renewal works, malformed claim file
      verify: 5 passed

adversarial_cases:
  - lockfile corruption mid-write
  - 100 concurrent worktrees (lock contention)
  - clock-skew between worktrees

variability_axis:
  - 1 / 2 / 6 active worktrees
  - same file / sibling files / unrelated files

failure_modes:
  - lockfile unreadable → fail-safe deny (better safe than corrupt)
  - claim never released (chat died) → TTL 10min auto-release
  - false-deny on stale lock → reap-stale-claims cron

---

## U-H7 — Boris-style `defer` decision wired into PreToolUse

- pillar: hook
- tier: T0
- ai_priority_score: 55
- leverage_score: 9
- why: autonomous loops without defer become $6k incidents
- depends_on: []
- blocks: []
- parallel_with: [U-H5]
- viz_node_id: same as U-HKA02 (foundation version)
- closes_synergy_edge: hooks × safety

verifies_via / micro_steps / adversarial / variability / failure: see U-HKA02 in HOOKS-AUTOMATION-V2-MS0 — that's the 2.1.89-event-aware version; U-H7 is the foundation hook.

---

## §X — Closing notes

**Critical-path:** U-H1.0 → U-H1 → U-H6. Once H6 ships, K2-CLOUD unblocks.

**Lane ownership:** lane-A-hooks-foundation. ALL 8 units commit with `[lane-A-hooks-foundation][HOOK-SYNERGY-MS0]/U-H<id>` prefix.

**Cron registrations:** `*/30 * * * *` for U-H1.0 verify-refs; `13 */6 * * *` for U-H3 settings-dedup; `/loop --interval 7d` for U-H2 top-5 retune.

**Synergy edges closed:** 5 (hooks × settings, hooks × index, hooks × fix, settings × dedup, worktrees × file-claims).
