# FLEET-REAPER-MS1/U-FR-OPT2-CRITICAL-88 — lower DEFAULT_MEM_CRITICAL_PCT 95→88

**Commit:** `9cfc411eb3af` · **By:** markjvillanueva3-cloud · **At:** 2026-05-17T18:31:13-05:00
**Tags:** fleet-reaper-ms1, u-fr-opt2-critical-88, auto-distilled

## Subject
[FLEET-REAPER-MS1]/U-FR-OPT2-CRITICAL-88: lower DEFAULT_MEM_CRITICAL_PCT 95→88

## Body
```
[FLEET-REAPER-MS1]/U-FR-OPT2-CRITICAL-88: lower DEFAULT_MEM_CRITICAL_PCT 95→88

Background: at 98%+ host commit, Ollama cudaMallocHost (pinned host buffer for
GPU staging) fails fleet-wide — the GPU-offload escape valve is BLOCKED at the
exact pressure tier where it would relieve RAM the most. Observed live 2026-05-17
on slot golf when 7B/1.5B model loads both threw cudaMalloc OOM at 99% commit
despite 15GB free VRAM.

OPT-2 lever (operator-confirmed "do everything" 2026-05-17): drop the critical
pressure floor from 95 → 88 so the tier-based effectiveKillAfter=0 immediate-
reap-this-tick kicks in EARLIER. Gives the reaper a chance to chew through
unowned RSS before the host gets too wedged for Ollama to load.

Strictly additive — no kill criteria change. Existing PRISM_FLEET_REAPER_MEM_CRITICAL_PCT
env var still overrides for per-runner tuning. The legacy 95% threshold is
preserved as the warn-floor default (memPressurePct=90 → warn → effectiveKillAfter=1).

Verified in-session: at 82.7% mem after multiple aggressive sweeps + Ollama 7B
inference, qwen2.5-coder:7b loaded to GPU successfully (4.4GB VRAM consumed,
inference 'OK' eval_count:2).

Follow-up units queued (deferred — needs sustained <90% pressure for parallel
scrutiny gate per [[feedback_no_parallel_agents_high_pressure]]):
  - U-FR-CRASH-WATCH (per-sweep claude.exe-tree alive/RSS tracker, postmortem
    JSONL on alive→dead transitions, AGENT_CHAT advisory)
  - U-CHO06 (orchestrator advisory injection hook — file written + ESM require
    bug fixed + 25-test suite drafted, not yet committed)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (2)
- scripts/fleet-reaper-sweep.mjs | 2 +-
- 1 file changed, 1 insertion(+), 1 deletion(-)

## Lessons surfaced in commit body
- till overrides for per-runner tuning. The legacy 95% threshold is

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 9cfc411eb3af`
- Milestone envelope: `mcp-server/data/milestones/FLEET-REAPER-MS1.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._