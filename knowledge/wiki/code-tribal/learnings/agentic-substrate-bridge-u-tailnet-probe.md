# AGENTIC-SUBSTRATE-BRIDGE/U-TAILNET-PROBE — [MAIN-FORCE] [AGENTIC-SUBSTRATE-BRIDGE]/U-TAILNET-PROBE (slot:bravo): install Tailscale + read-only tailnet-probe foundation (Task #6)

**Commit:** `1f4dbf635a64` · **By:** markjvillanueva3-cloud · **At:** 2026-06-14T11:57:13-05:00
**Tags:** agentic-substrate-bridge, u-tailnet-probe, auto-distilled

## Subject
[MAIN-FORCE] [AGENTIC-SUBSTRATE-BRIDGE]/U-TAILNET-PROBE (slot:bravo): install Tailscale + read-only tailnet-probe foundation (Task #6)

## Body
```
[MAIN-FORCE] [AGENTIC-SUBSTRATE-BRIDGE]/U-TAILNET-PROBE (slot:bravo): install Tailscale + read-only tailnet-probe foundation (Task #6)

Operator instruction "install missing programs": Tailscale was absent (verified:
not on PATH, not in installed-apps, winget unavailable). Installed Tailscale 1.98.4
amd64 from the official MSI (pkgs.tailscale.com, elevated msiexec /quiet, exit 0,
verified C:/Program Files/Tailscale/tailscale.exe present). It is LOGGED OUT --
`tailscale up` + browser auth to the operator's tailnet account is the operator's
next step (I cannot auth to their account).

Foundation sub-unit of the operator-authorized fleet-mesh: tailnet-probe.mjs is a
STRICTLY READ-ONLY detector (the ONLY command it runs is `status --json`; never any
control verb -- soul refuse_list: unsafe-fleet-control-before-governance). execFileSync
(no shell) + fixed args array -> no injection surface. Fail-soft (missing -> installed:false;
unparseable -> healthy:false; never throws). Pure DI-tested helpers.

The prism_fleet_network mesh-CONTROL dispatcher is DELIBERATELY DEFERRED (R15/R12):
cannot validate control ops against a logged-out, peerless tailnet; needs login + a
2nd host + governance. When built, it consumes probeTailnet (both reviewers' handoff note).

7 R9 tests (parse, fail-soft-missing [revert-verified], onlinePeerCount!=total, logged-out
note, malformed). LIVE: "NeedsLogin | self=DESKTOP-N7MI1VB | peers=0 [logged out]" -- the
honest current state = the probe's own live validation. 2/2 per-file scrutiny PASS (both
empirically reverted guards -> tests failed; both confirmed READ-ONLY + injection-safe).
```

## Files touched (3)
- scripts/tailnet-probe.mjs      | 112 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/tailnet-probe.test.mjs |  63 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 2 files changed, 175 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 1f4dbf635a64`
- Milestone envelope: `mcp-server/data/milestones/AGENTIC-SUBSTRATE-BRIDGE.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._