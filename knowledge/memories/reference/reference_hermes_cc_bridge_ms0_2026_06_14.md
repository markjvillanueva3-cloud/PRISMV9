---
name: reference_hermes_cc_bridge_ms0_2026_06_14
description: "Bidirectional Claude-Code <-> Hermes app bridge shipped 2026-06-14 (slot:sierra). Bridge A = prism_hermes dispatcher (CC drives Hermes CLI sandboxed); Bridge B = bounded fleet launcher + zulu skill (Hermes launches CC fleet on the subscription). Commits 80236a3f6e + b2e21d47f1 on cad-fusion-live-ms0."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.604Z
aliases: reference_hermes_cc_bridge_ms0_2026_06_14
---


# HERMES-BRIDGE-MS0/U-HB-A1 + U-HB-B1 -- bidirectional CC <-> Hermes bridge (2026-06-14, slot:sierra)

Operator: "build the bridge for claude code cli to run the hermes app fully sandboxed like we did for
cimco and fusion. then build it going the opposite way so hermes app zulu can run the fleet that
launches in powershell claude code cli." Motivation: Hermes' desktop login dropped OAuth, so keep
heavy work on the Claude SUBSCRIPTION by bridging through Claude Code CLI.

## Verify-first findings (ground truth)
- Hermes Agent (Nous Research) v0.16.0 installed at `C:\Users\wompu\AppData\Local\hermes\`. CLI exe:
  `...\hermes-agent\venv\Scripts\hermes.exe` (NOT on PATH). 21 profiles (alpha..zulu); zulu profile
  exists with PRISM skills (prism-vault-loop, zulu-autonomous-building, etc.).
- AUTH PREMISE WAS MOSTLY ALREADY SOLVED: `auth.json` holds 9 Anthropic SUBSCRIPTION OAuth tokens
  (`sk-ant-oat01-*`, dashboard-PKCE + synced Claude accounts, round_robin, status ok). NOT metered API
  keys. The expired artifact is the legacy single-token `.anthropic_oauth.json` (Jun 6); active `bravo`
  profile is on `xai-oauth`. So the bridges (route through CC subscription) are the durable value, not
  an auth rebuild. `hermes_auth_status` surfaces this health.
- Pattern cloned: Fusion360AutomationBridge + cimcoDispatcher carve-out + cimco-sim-driver exec
  (execFileSync array-form, MOCK-default, dual-key live, AtomicValue, fail-closed R12). Sandbox via
  PluginSandboxPolicyEngine (process-spawn is `sandbox`-tier-only).

## Bridge A -- CC -> Hermes (commit 80236a3f6e, 6 files, 21 tests green, type-clean)
- `mcp-server/src/engines/HermesAutomationBridge.ts` -- engine. MOCK-by-default; LIVE needs DUAL-KEY
  (noMock flag AND env PRISM_HERMES_MOCK=0) + sandbox tier. execFileSync(exe,[args]) array-form;
  timeout fail-closed; surfaces real stderr; portable paths (homedir + PRISM_HERMES_HOME / _EXE env).
  Actions: status, probe, authStatus, cronList, skillList (all FS-read, no spawn) + modelList, run
  (gated live). AtomicValue {value,confidence,source,warning}.
- `mcp-server/src/schemas/hermesActionSchemas.ts` + `mcp-server/src/tools/dispatchers/hermesDispatcher.ts`
  -- prism_hermes tool, actions hermes_{status,probe,auth_status,cron_list,skill_list,model_list,run};
  wired in index.ts (import + registerHermesDispatcher) next to cimco.
- Tests: HermesAutomationBridge.test.ts (16) + hermesDispatcher.test.ts (5, round-trip through
  dispatchHermes). Hermetic (temp fixture home, injected spawn). Covers sandbox-deny, fail-closed
  timeout/non-zero, adversarial arg guards (empty/over-64/oversize), auth-pool health.
- LIVE MCP round-trip NOT yet done (this session's MCP client was down; restarting the shared :3100
  daemon would disrupt peers). dist rebuilt via build:fast -- prism_hermes is staged for next MCP restart.

## Bridge B -- Hermes(zulu) -> CC fleet (commit b2e21d47f1, 2 files)
- `scripts/fleet/launch-fleet-bounded.ps1` -- the runaway-spawn guard. The raw fleet path
  (Desktop .bat -> slot-tab-boot.ps1) has NO concurrency cap, unsafe for an autonomous caller. This
  wrapper: EXPLICIT -Slots (validated vs SLOT_NAMES), -MaxSlots cap (default 6), DRY-RUN default
  (-Live to spawn), REUSES the canonical slot-tab-boot.ps1 (which owns the PID+JSONL-mtime liveness
  guard -- not reimplemented). Validated: dry-run prints faithful wt.exe cmds; over-cap/invalid/empty
  all refuse (exit 1). Comma-split fix: pwsh -File passes "-Slots a,b" as ONE string -> split on ','.
- `scripts/fleet/hermes-skills/prism-fleet-launcher/SKILL.md` (tracked canonical) -- DEPLOYED to
  `C:\...\hermes\profiles\zulu\skills\prism\prism-fleet-launcher\SKILL.md` + global skills tree (bash cp;
  AppData is outside the repo). Skill: READ chat-slots -> DRY-RUN -> -Live -> verify -> write-back to
  H:/prism/knowledge/hermes-outputs/. Hard rules: dry-run first, never exceed cap, no relaunch-alive,
  no auto-retry. Cron OFF (burn-in doctrine; operator enables via `hermes cron create`).

## How to use
- CC -> Hermes: `prism_hermes` actions (after MCP restart). hermes_status/probe/auth_status are safe
  read-only. Live: set env PRISM_HERMES_MOCK=0 + pass noMock:true.
- Hermes(zulu) -> CC: from a zulu Hermes session, load `prism-fleet-launcher` skill; it dry-runs the
  bounded launcher then -Live.

## Decisions (operator-approved plan, plans/cozy-riding-origami.md = H:\.claude\plans\)
Mock+dual-key (Bridge A) and bounded+dry-run+burn-in (Bridge B) -- deliberately conservative to
prevent an autonomous Hermes runaway-spawning expensive Opus fleet sessions (fork-storm class).
Will NOT auto-rewrite Hermes auth files. Existing HERMES-BRIDGE-MS0 milestone (prior units
U-HERMES-DELEGATION-PIN, U-PROXY-ENSURE) -- these are additive new units.

Related: [[reference_hermes_zulu_ms0_2026_05_20]] · [[reference_agent_refinement_iter1_2026_06_14]] · [[feedback_sierra_no_gates_full_reign_2026_06_10]] · [[galaxy/hermes-zulu]]
