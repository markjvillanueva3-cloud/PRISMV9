# FLEET-REAPER-MS1/U-FR-OLLAMA-KEEP-ALIVE-1H — prevent prewarm model eviction under pressure

**Commit:** `cc14791cd794` · **By:** markjvillanueva3-cloud · **At:** 2026-05-17T18:54:12-05:00
**Tags:** fleet-reaper-ms1, u-fr-ollama-keep-alive-1h, auto-distilled

## Subject
[FLEET-REAPER-MS1]/U-FR-OLLAMA-KEEP-ALIVE-1H: prevent prewarm model eviction under pressure

## Body
```
[FLEET-REAPER-MS1]/U-FR-OLLAMA-KEEP-ALIVE-1H: prevent prewarm model eviction under pressure

Live observation 2026-05-17 (slot golf): Monitor stream showed
qwen2.5-coder:7b cycling loaded:1 → loaded:0 → loaded:1 several times per
hour under sustained 90%+ commit pressure. Root cause: Ollama daemon's own
auto-unload kicks in when ITS process hits host RAM pressure (independent of
PRISM's keep_alive timeout). Each eviction → next coordinator prewarm has
to COLD-load the 7B model (40s+ on Q4_K_M) AND can fail outright at high
host pressure because cold-load needs ~2GB of pinned host RAM as CUDA
staging (the cudaMallocHost wedge documented in OPT-2/9cfc411eb3).

Fix: bump DEFAULT_OLLAMA_KEEP_ALIVE "10m" → "-1" (Ollama "never unload"
sentinel). Once the coordinator's prewarm POST lands, the model is pinned in
VRAM until the daemon itself is killed or PRISM_FLEET_REAPER_OLLAMA_KEEP_ALIVE
env var overrides at runtime.

Tradeoff: 4.4GB of VRAM permanently reserved for the prewarm model. Accepted
because GPU is the IDLE resource (16GB total, currently 5-10% util, 12-15GB
free even with the model loaded). Wasted VRAM is the explicit tradeoff vs.
40s cold-load latencies + cold-load failures during the exact moments
offload would relieve the most RAM. Operators who change work patterns and
don't want Ollama hot can override the env var.

No test added — pure constant-value change with operator-controllable env
override. The behavior is verified at runtime by the next coordinator sweep
which logs the keep_alive value in the prewarm POST.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (2)
- scripts/fleet-reaper-sweep.mjs | 12 +++++++++++-
- 1 file changed, 11 insertions(+), 1 deletion(-)

## Lessons surfaced in commit body
- til the daemon itself is killed or PRISM_FLEET_REAPER_OLLAMA_KEEP_ALIVE
- til, 12-15GB

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show cc14791cd794`
- Milestone envelope: `mcp-server/data/milestones/FLEET-REAPER-MS1.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._