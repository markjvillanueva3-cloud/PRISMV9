# FLEET-OLLAMA-ROUTING-MS0/U-FLOR-MCP-HEAP — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [FLEET-OLLAMA-ROUTING-MS0]/U-FLOR-MCP-HEAP (slot:tango): align MCP daemon heap floor to the supervisor + unify the PRISM_MCP_HEAP_FLOOR_MB knob

**Commit:** `806423f1e5d0` · **By:** markjvillanueva3-cloud · **At:** 2026-06-10T22:15:02-05:00
**Tags:** fleet-ollama-routing-ms0, u-flor-mcp-heap, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [FLEET-OLLAMA-ROUTING-MS0]/U-FLOR-MCP-HEAP (slot:tango): align MCP daemon heap floor to the supervisor + unify the PRISM_MCP_HEAP_FLOOR_MB knob

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [FLEET-OLLAMA-ROUTING-MS0]/U-FLOR-MCP-HEAP (slot:tango): align MCP daemon heap floor to the supervisor + unify the PRISM_MCP_HEAP_FLOOR_MB knob

Operator: "increase any limits that cause api/oom errors -- I used to launch more agents without api errors."

Verified root-cause (not guessed): the "API errors when launching agents" are the LOCAL ECONNREFUSED class (MCP :3100 / socket allocs failing at high HOST COMMIT pressure), NOT Anthropic 429s -- per [[reference_api_ratelimit_wsl_commit_2026_06_08]]. The old ~88GB committer (nim-llama32-3b) is GONE (docker ps clean). Live commit 190.8/291.1GB = 65.5%. The WSL 16GB cap is VERIFIED CORRECT (left unchanged; did not repeat the known-wrong charlie WSL diagnosis).

THE divergence fixed: supervisor floors MCP heap to 24576MB via PRISM_MCP_HEAP_FLOOR_MB, but mcp-server-daemon.mjs called ensureHeapFloor(NODE_OPTIONS) with NO floor -> the 4096MB default. A daemon-launched :3100 got 4GB (OOMs under load -- the recurring [[reference_mcp_boot_heap_oom_2026_06_09]]) while supervisor got 24GB. Fix: daemon reads the SAME PRISM_MCP_HEAP_FLOOR_MB env (default 24576) -> removes the heap-OOM mode AND unifies the knob so ONE env tunes both spawn paths (PRISM_MCP_HEAP_FLOOR_MB=8192 drops both if commit is tight).

node --check clean. NOT touched (R8): start-production.sh/.ps1 keep their documented 4096 default (Windows --max-old-space-size is a COMMIT RESERVATION; env-overridable instead).
```

## Files touched (2)
- .claude/helpers/mcp-server-daemon.mjs | 19 +++++++++++++------
- 1 file changed, 13 insertions(+), 6 deletions(-)

## Lessons surfaced in commit body
- wrong charlie WSL diagnosis).

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 806423f1e5d0`
- Milestone envelope: `mcp-server/data/milestones/FLEET-OLLAMA-ROUTING-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._