# AI-SYNERGY-SUBSTRATE-GUARD/U-OLLAMA-WEDGE-GUARD-HARDEN — [MAIN-FORCE] [AI-SYNERGY-SUBSTRATE-GUARD]/U-OLLAMA-WEDGE-GUARD-HARDEN (slot:bravo): reuse canonical multi-GPU VRAM reader + discriminate 404 from hang (3-of-3 arm-C P1/P2)

**Commit:** `582b17b180bd` · **By:** markjvillanueva3-cloud · **At:** 2026-06-13T16:01:51-05:00
**Tags:** ai-synergy-substrate-guard, u-ollama-wedge-guard-harden, auto-distilled

## Subject
[MAIN-FORCE] [AI-SYNERGY-SUBSTRATE-GUARD]/U-OLLAMA-WEDGE-GUARD-HARDEN (slot:bravo): reuse canonical multi-GPU VRAM reader + discriminate 404 from hang (3-of-3 arm-C P1/P2)

## Body
```
[MAIN-FORCE] [AI-SYNERGY-SUBSTRATE-GUARD]/U-OLLAMA-WEDGE-GUARD-HARDEN (slot:bravo): reuse canonical multi-GPU VRAM reader + discriminate 404 from hang (3-of-3 arm-C P1/P2)

Addresses the 3-of-3 scrutiny arm-C findings on U-OLLAMA-WEDGE-GUARD (both non-blocking,
fixed for correctness since this is a process-killing recovery path):

P1 (reuse, R8): replaced the inline single-GPU `freeVramGB()` (split(\n)[0], untested) with
the canonical `readGpuVram()` from scripts/lib/gpu-vram-guard.mjs -- multi-GPU-safe (returns
the highest-pressure GPU's free), tested, injection-safe, and carries the documented 2026-06-10
nvidia-smi lesson. Validated live: 85.2GB free read correctly.

P2 (false-positive fix): the generate micro-probe now distinguishes a HANG (no HTTP response =
the real wedge) from a definitive RESPONSE (e.g. 404 model-missing = daemon ALIVE). probe()
returns `responded`; classifyOllamaHealth gains `generateHung` + a new "probe-error" state.
A daemon that ANSWERS generate (even an error) is NEVER classified "wedged" -> an uninstalled
probe model can no longer false-trigger a kill+restart of a healthy daemon. shouldRecover stays
"wedged"-only; "probe-error" never recovers.

TEST (R9): 9/9 (+1): the wedged cases now require generateHung=true; new probe-error oracle
(generate RESPONDED with 404 -> probe-error, even with low resources -> daemon alive wins);
shouldRecover('probe-error')=false. VALIDATE (live): --status = healthy generateHung=false
freeVRAM=85.2GB (multi-GPU reader correct).

Net: the wedge-guard now recovers ONLY a true hang-with-free-resources, reuses the canonical
GPU reader, and cannot thrash a healthy daemon over a missing probe model. The dead-parent reap
(noted inert for the live wedge -- live parent) is retained as a conservative pre-step; the
kill-all after Stop-ScheduledTask remains the working recovery (live-validated wedged->healthy).
```

## Files touched (3)
- scripts/ollama-wedge-guard.mjs      | 39 +++++++++++++++++++++++----------------
- scripts/ollama-wedge-guard.test.mjs | 31 ++++++++++++++++++++-----------
- 2 files changed, 43 insertions(+), 27 deletions(-)

## Lessons surfaced in commit body
- lesson. Validated live: 85.2GB free read correctly.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 582b17b180bd`
- Milestone envelope: `mcp-server/data/milestones/AI-SYNERGY-SUBSTRATE-GUARD.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._