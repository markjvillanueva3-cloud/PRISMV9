# CC ↔ Hermes CLI Bridge — Status & Completion Plan (2026-06-16, slot:zulu)

> Answer to operator "did we finish the full bridge? both clis need to be updated."
> **Short answer: the bridge WORKS (live-verified 2026-06-16) but is NOT fully finished.**
> 4-track completion mandate (operator selected all): finish+verify · version-bump · config/context · new-capability.

## What is BUILT + verified

| Piece | State | Evidence |
|---|---|---|
| **Bridge A** (CC → Hermes) — `HermesAutomationBridge` + `prism_hermes` dispatcher | ✅ built, wired (`index.ts:73,628`), **LIVE-verified** | read-only actions live OK (installed=true, exe present, 21 profiles, **12 OAuth creds 0 expired**); dual-key spawn `hermes --version` → conf 0.95, real output. Repeatable: `cd mcp-server && npx tsx scripts/verify-hermes-bridge-live.ts` |
| **Bridge B** (Hermes zulu → CC fleet) — `launch-fleet-bounded.ps1` + `prism-fleet-launcher` skill | ✅ built, deployed to zulu profile | commit `b2e21d47f1`. Bounded: dry-run default, MaxSlots cap, reuses slot-tab-boot liveness. |
| Prior units | ✅ shipped | delegation-pin, proxy-ensure, hybrid-ollama, util-track, /ask-hermes |

## What is NOT finished (the real gaps)

1. **Bridge-B never 3-of-3 scrutinized** (`U-HB-B1-SCRUTINY`, P1). It spawns CC fleet sessions (can launch expensive Opus) — the highest-risk unreviewed artifact. *Auto-doable next (agents available).*
2. **Both CLIs have pending version updates** (`U-CLI-VERSION-BUMP`, P1) — see procedure below. **OPERATOR-GATED.**
3. **Dispatcher-via-MCP round-trip blocked** (`U-MCP-ROUNDTRIP-VERIFY`) — MCP bridge currently down (0 processes). Engine-direct verification already proves the same code path; a `/mcp` reconnect closes this. *Needs operator/session action.*
4. Milestone envelope was missing → **created this session** (`mcp-server/data/milestones/HERMES-BRIDGE-MS0.json`).

## Track 2 — VERSION BUMP procedure (operator-gated; do NOT run mid-session blindly)

**Hermes CLI** — currently v0.16.0 (2026.6.5); the CLI itself reports **"Update available: 312 commits"** behind upstream.
- A 312-commit jump is a MAJOR change that may alter the 21 profiles / skills / `auth.json` schema (which holds the 12 live subscription OAuth creds — the whole bridge premise). **Back up `C:\Users\wompu\AppData\Local\hermes\` (esp. `auth.json`, `profiles/`) before updating.**
- Update mechanism is Hermes-native (Nous Research installer / `git pull` + venv reinstall in `hermes-agent`). Confirm the exact command with the operator/upstream — do NOT guess-reinstall over a working auth pool.
- After update: re-run `npx tsx mcp-server/scripts/verify-hermes-bridge-live.ts`. If `exe`/paths/flags changed, re-target `HermesAutomationBridge` defaults (`defaultExe`/`defaultHome`, the `--version`/`model list` arg forms).

**Claude Code CLI** — latest npm `@anthropic-ai/claude-code` = **2.1.178**.
- Updating the CLI **the operator is actively running** mid-session can destabilize the live process → do at a clean boundary: `npm i -g @anthropic-ai/claude-code@latest`, then restart the session.
- No bridge re-target needed (CC is the driver, not a target) unless MCP registration format changes.

## Track 3 — config/context wiring

- **CC side:** `prism_hermes` already registered in the live MCP (`index.ts`). ✅ (verify with `/mcp` once the bridge reconnects.)
- **Hermes side:** `prism-fleet-launcher` skill deployed to the zulu profile. ✅
- **Context:** add a CC↔Hermes bridge pointer to CLAUDE.md §SHARED AGENT BRIDGES so every slot knows the bridge exists + how to use it (`prism_hermes` actions; `/ask-hermes`). *Auto-doable.*

## Track 4 — new-capability proposal (operator: confirm scope)

Formalize what's currently manual/PS-only into typed engine actions (all MOCK-default + dual-key, mirroring the existing bridge):
- `hermes_profile_list` / `hermes_profile_switch` — read `active_profile` (read-only) / switch (gated spawn).
- `hermes_skill_deploy` — push a PRISM skill into a Hermes profile (currently a manual `cp` to AppData).
- `hermes_fleet_launch` — wrap `launch-fleet-bounded.ps1` as a dispatcher action (dry-run default, MaxSlots cap preserved) so Bridge B is invokable via `prism_hermes`, not only the PS1.
- `hermes_delegate` — route a single heavy task to Hermes-on-subscription and return the result (the core "keep heavy work on the subscription" value).

## Sequencing (R13 logical order)
1. ✅ Verify Bridge A live (done). 2. Scrutinize Bridge B (auto, next). 3. CLAUDE.md context pointer (auto). 4. **[operator]** version bumps + re-verify. 5. **[operator/session]** `/mcp` reconnect → dispatcher round-trip. 6. Build new-capability (after operator confirms track-4 scope).
