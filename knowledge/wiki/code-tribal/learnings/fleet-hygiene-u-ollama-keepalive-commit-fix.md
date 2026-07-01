# FLEET-HYGIENE/U-OLLAMA-KEEPALIVE-COMMIT-FIX — [MAIN] [FLEET-HYGIENE]/U-OLLAMA-KEEPALIVE-COMMIT-FIX (slot:golf): bounded Ollama keep-alive — close the pinned-model commit leak that tripped the pressure gate

**Commit:** `cebde4fd94d1` · **By:** markjvillanueva3-cloud · **At:** 2026-06-08T14:23:52-05:00
**Tags:** fleet-hygiene, u-ollama-keepalive-commit-fix, auto-distilled

## Subject
[MAIN] [FLEET-HYGIENE]/U-OLLAMA-KEEPALIVE-COMMIT-FIX (slot:golf): bounded Ollama keep-alive — close the pinned-model commit leak that tripped the pressure gate

## Body
```
[MAIN] [FLEET-HYGIENE]/U-OLLAMA-KEEPALIVE-COMMIT-FIX (slot:golf): bounded Ollama keep-alive — close the pinned-model commit leak that tripped the pressure gate

The CRITICAL-MEMORY-PRESSURE Stop gate hit commit 96-98% (of 227GB) every turn.
Root cause (measured via private/commit bytes, not WorkingSet): OLLAMA_KEEP_ALIVE=-1
pinned up to 6 LARGE models FOREVER — llama-server×4 = ~70GB host commit (qwen2.5-coder:32b
37GB + gpt-oss:20b 13GB + qwen3-vl:8b + embed), /api/ps expires_at=2318. A pinned model's
HOST private bytes count against the COMMIT limit (RAM+pagefile), NOT just VRAM — so the
"-1 is cheap, GPU has VRAM" rationale (U-FR-OLLAMA-KEEP-ALIVE-1H, made on the 16GB RTX 4080)
is stale-for-hardware on the 96GB Blackwell box.

R7 override of the stale -1 decision (reasoning in-comment, override knobs preserved):
- 05-soft-config-tweaks.ps1 blackwell tier: keepAlive '-1' → '30m', maxLoaded '6' → '4'.
- fleet-reaper-sweep.mjs DEFAULT_OLLAMA_KEEP_ALIVE '-1' → '30m' (reaper prewarm); env
  override PRISM_FLEET_REAPER_OLLAMA_KEEP_ALIVE still restores pin-forever.
- (live) User env OLLAMA_KEEP_ALIVE=30m + OLLAMA_MAX_LOADED_MODELS=4.

"30m" keeps the active model warm (no cold-load loop for live work; Blackwell loads a 32B in
seconds) while idle models evict + release commit. Immediate relief: per-request keep_alive:0
unload freed ~67GB (commit 96.8% → 69%). 38/38 reaper tests pass, both files syntax-clean.
Caveat: the running ollama daemon keeps its launch-time -1 default until restart (env+script
fixes are durable-on-restart). Reaper/monitor cluster verified 10/10 Ready.
Memory: reference_ollama_keepalive_commit_leak_2026_06_08 + reference_wsl_commit_pressure_relief_2026_06_08.
```

## Files touched (3)
- scripts/fleet-reaper-sweep.mjs                  | 25 ++++++++++++++-----------
- scripts/system-health/05-soft-config-tweaks.ps1 | 12 ++++++++++--
- 2 files changed, 24 insertions(+), 13 deletions(-)

## Lessons surfaced in commit body
- till restores pin-forever.
- til restart (env+script

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show cebde4fd94d1`
- Milestone envelope: `mcp-server/data/milestones/FLEET-HYGIENE.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._