---
name: reference_sierra_obsidian_control_surface_2026_06_17
description: "Sierra shipped the live Obsidian CONTROL surface (commit 80c52e0885, 2026-06-17): ObsidianControlBridgeEngine (new class in mcp-server/src/engines/ObsidianRestBridgeEngine.ts) wraps the obsidian-local-rest-api plugin's full command + CRUD surface -- listCommands (GET /commands/ = every button), runCommand (POST /commands/{id} = execute any command), vault CRUD (create=PUT/append=POST/deleteNote=DELETE/list=GET), open (POST /open/), periodic (daily notes). SECURITY: kept a SEPARATE class so the existing read engine stays provably read-only for its OUTWARD-FACING Telegram consumer (zulu-telegram-bridge.mjs); every mutating method is behind a default-DENY capability gate writeAllowed() (PRISM_OBSIDIAN_WRITE=1, default OFF) that short-circuits with NO socket; fail-closed gates preserved (loopback-only, key-required, path/command-id/period validated). 49 tests (13 new), tsc 0-new, 2-agent security+regression scrutiny PASS. LIVE-VALIDATION deferred -- Obsidian GUI/:27123 down; injected-transport tests prove request shaping + gates. Pairs with U-OBSIDIAN-NAV (always-on filesystem nav)."
type: reference
galaxy: system-viz
source: prism-memory
synced: 2026-06-27T20:30:47.198Z
aliases: reference_sierra_obsidian_control_surface_2026_06_17
---


# Sierra: live Obsidian control surface (2026-06-17, slot:sierra) -- U2 of the usability bridge

Operator: "build a bridge for you to fully navigate the app (every button and function)."
U1 (filesystem nav, [[reference_sierra_obsidian_vault_navigator_2026_06_17]]) covered always-on
READ/explore. U2 = the live CONTROL surface (run any command/button, write/create/delete) over
the Local REST API the `obsidian-local-rest-api` plugin serves at :27123.

## Shipped (commit 80c52e0885): ObsidianControlBridgeEngine
New class appended to `mcp-server/src/engines/ObsidianRestBridgeEngine.ts` (NOT added to the
read class -- see security below). Methods wrap the plugin endpoints:
- `listCommands` GET /commands/ -- enumerate EVERY command/button (read-only).
- `runCommand(id)` POST /commands/{id}/ -- execute any command/button (write-gated).
- `list(dir)` GET /vault/{dir}/ -- browse a folder (read-only).
- `create/append/deleteNote` PUT/POST/DELETE /vault/{path} -- vault CRUD (write-gated).
- `open(path)` POST /open/ -- open a note in the GUI (write-gated).
- `periodic(period)` GET /periodic/ -- read the daily/periodic note (read-only).
Transport extended with optional `body`/`contentType` (additive -- read methods omit it -> byte-identical).

## THE security design (preserved a real invariant)
The EXISTING `ObsidianRestBridgeEngine` read class is consumed by the OUTWARD-FACING
`zulu-telegram-bridge.mjs` and its header guarantees "v1 is READ-ONLY ... write surface never
reachable from the Telegram bridge." So the control surface is a SEPARATE class behind a
**default-DENY** gate `writeAllowed()` (`PRISM_OBSIDIAN_WRITE=1`, default OFF) -- every mutating
method returns `write-disabled` with NO socket opened unless the operator opts in IN-PROCESS.
The Telegram bridge never imports the control class AND never sets the flag (defense in depth).
Fail-closed gates preserved for the new methods: loopback-only URL, key required, vault path
traversal rejected (safeVaultPath), command-id regex, period allowlist -- all short-circuit
pre-socket. Arm A (security) + arm C (regression) both PASS 0 P0/P1; arm C independently confirmed
the read engine is byte-identical (no body -> no Content-* headers, no req.write).

## Proof + the honest deferral (R12)
- 49 tests (36 read unchanged + 13 control: default-deny no-socket, write-gate-beats-no-key,
  gate-on request shaping PUT/POST/DELETE + path/body/contentType asserts, fail-soft, validation).
- tsc 0-new errors in this file (repo has a pre-existing baseline elsewhere).
- **LIVE-VALIDATION DEFERRED:** the Obsidian GUI / :27123 is DOWN in the headless fleet, so a real
  `GET /commands/` round-trip is unproven. The injected-transport tests prove request SHAPING + the
  gates; when the operator opens Obsidian with the plugin on, run a live listCommands/runCommand
  to confirm. Not claimed as live-validated.

## State: Obsidian usability bridge COMPLETE (both halves)
U1 always-on filesystem nav (every navigation function) + U2 live control (every command/button +
CRUD). Lane: canonical cad-fusion-live-ms0, [MAIN-FORCE] + git by-pathspec. Sibling:
[[reference_sierra_obsidian_vault_navigator_2026_06_17]] · [[reference_sierra_vault_promote_gate_hubsrc_deinflate_2026_06_17]].
