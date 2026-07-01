---
name: reference_forge_route_2026_06_11
description: U-FORGE-ROUTE — forge-route.mjs routes forge pipeline phases to cheapest lane (ollama/sonnet/haiku/opus) via resolveExecutor + fork-storm cap; 3 forge7 bug fixes
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.579Z
aliases: reference_forge_route_2026_06_11
---


**FORGE-PIPELINE-ROUTING-MS0/U-FORGE-ROUTE** (2026-06-11, slot:tango, commit `60e7cb39d8`, [MAIN], 3-of-3 PASS). Part of the fleet hook-audit /goal. Makes the forge slash-command family token-optimal by construction.

**`scripts/lib/forge-route.mjs`** (pure, 16 tests, live-validated): maps every forge PHASE → task category → cheapest executor lane via `resolveExecutor` (the [[reference_u_flor_claude_tier_2026_06_11]] claudeModel ladder — downstream-wires U-FLOR per R15).
- `FORGE_PHASE_CATEGORY`: mechanical phases (scout/enumerate/dedup_check/docstring/summarize/test_scaffold/lint/diff_summary/html_emit/audit_scan) → offloadable categories (ollama → sonnet/haiku on miss, **NEVER opus**); reasoning phases (design/plan_review/verify_gate/refactor/physics_check/safety_gate/orchestrate) → CLAUDE_LANE → opus reserved.
- `routeForgePhase(phase, opts)` → `{lane, model, claudeModel, mechanical, ...}`. `planForgeRouting(phases)` → whole-run table + summary. Live: 8-phase run = 6 local + 2 Opus(design,verify_gate).
- `forgeConcurrencyCap({cores,budgetTotal})` = `min(16, cores-2, budget/100k)` — kills the fork-storm class (a 14-agent Workflow fork-stormed to 362 bash procs this session under MCP-down).

**3 forge7 bugs fixed (LOCAL-ONLY skill edits — `.claude/commands/*.md` are gitignored, live on disk):**
1. Dead verify-gate: `scripts/run-verification-channel.mjs` is genuinely MISSING → v7's HARD gate silently no-op'd. Fixed: inline the unit's declared `verifies_via.tool` (R12 honest); real wrapper queued `U-FORGE-VERIFY-CHANNEL`.
2. **`viz-progress-update.mjs` path bug** — the agent/audit claimed it was a dead/missing script; **tango verify-before-fix + memory [[reference_i_track_not_phantom_2026_05_20]] caught it**: it EXISTS at `.claude/scripts/` (forge7 used a bare `scripts/` prefix). Real fix = the path, NOT a replacement. (The exact "meta-tool false-dead-script" class that memory documents — checked the wrong dir twice.)
3. Dead `emit-milestone-html.mjs` → real shipped `scripts/md-to-html.mjs`.

**forge-hooks.md (+5E):** WIRE+VERIFY-ROUND-TRIP step — closes the orphan-hook gap (FLEET-HOOK-AUDIT-2026-06-11 #1 finding: ~505 of 786 on-disk hooks unwired). PRISM hooks are `.mjs` not `.sh`; settings.json patch must re-parse + grep-verify the wire. + forge-route routing + fan-out cap.

**P2 deferred:** comment the `claudeFallbackModel` passthrough re-export at forge-route.mjs:113 as alias-not-impl.

**Lesson (reinforces tango law):** verify a "dead script" claim against ALL script dirs (`scripts/`, `.claude/scripts/`, `mcp-server/scripts/`) before "fixing" — the meta-tool checked one dir and false-flagged viz-progress-update. See [[feedback_never_claim_absence_without_deep_search]].
