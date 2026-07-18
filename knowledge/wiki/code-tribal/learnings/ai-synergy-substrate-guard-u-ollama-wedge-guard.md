# AI-SYNERGY-SUBSTRATE-GUARD/U-OLLAMA-WEDGE-GUARD — [MAIN-FORCE] [AI-SYNERGY-SUBSTRATE-GUARD]/U-OLLAMA-WEDGE-GUARD (slot:bravo): detect + recover the recurring Ollama generate-WEDGE (self-heal the fleet's local-AI substrate)

**Commit:** `ac1c756d5e4a` · **By:** markjvillanueva3-cloud · **At:** 2026-06-13T15:41:25-05:00
**Tags:** ai-synergy-substrate-guard, u-ollama-wedge-guard, auto-distilled

## Subject
[MAIN-FORCE] [AI-SYNERGY-SUBSTRATE-GUARD]/U-OLLAMA-WEDGE-GUARD (slot:bravo): detect + recover the recurring Ollama generate-WEDGE (self-heal the fleet's local-AI substrate)

## Body
```
[MAIN-FORCE] [AI-SYNERGY-SUBSTRATE-GUARD]/U-OLLAMA-WEDGE-GUARD (slot:bravo): detect + recover the recurring Ollama generate-WEDGE (self-heal the fleet's local-AI substrate)

WHY: the Ollama substrate -- which EVERY PSN AI-reasoning leg across all 34 galaxies depends
on -- WEDGED TWICE in one session (generate hangs for any model while /api/tags + /api/ps
respond and RAM+VRAM are BOTH free; root cause = a wedged/orphaned llama-server runner). Both
existing health surfaces are BLIND to it: ollama-docker-health.mjs probes /api/tags only (reports
"up" while generate hangs); fleet-services-watchdog.mjs restarts via the DOCKER launcher (wrong
for a host on the native "PRISM Ollama Serve" task). So nothing auto-detects or auto-fixes it --
each recovery was manual.

WHAT: scripts/ollama-wedge-guard.mjs -- PURE classifier `classifyOllamaHealth({tagsOk,generateOk,
freeRamGB,freeVramGB})` -> down | healthy | wedged | resource-starved, plus a live probe
(/api/tags + a REAL /api/generate micro-probe) and the codified native recovery (reap orphan
llama-server with a DEAD-PARENT safety gate + restart "PRISM Ollama Serve"). Critically it
distinguishes WEDGED (generate fails, resources FREE -> recoverable, reap+restart) from
RESOURCE-STARVED (RAM/VRAM genuinely low -> a restart can't fix an OOM and would evict peers'
resident models -> do NOT thrash). CLI: --status (probe only) / --recover (act if wedged) /
--json; exit 1 on wedged-unrecovered/down so a scheduler can alert. All thresholds + the task
name + URL are env-tunable.

TEST (R9): 8/8 pure-classifier tests -- all four states, the wedged-vs-resource-starved boundary
(the load-bearing distinction), null/unknown VRAM must NOT mask a wedge, custom floors, and
shouldRecover ONLY on wedged. VALIDATE (live): --status on the recovered substrate = healthy
(generate=true); nvidia-smi parse verified correct (193 MiB real free with 120b+1.5b resident).

WIRING (intentionally NOT auto-registered -- soul refuse "unsafe-fleet-control-before-governance"):
auto-killing processes on a schedule is golf's reaper/scheduled-task governance domain. RECOMMEND
golf register `node scripts/ollama-wedge-guard.mjs --recover` as a ~5-10min scheduled task (or a
fleet-reaper Tier-3 rule) so the substrate self-heals. Until then it is operator/CLI-invokable
and ready to wire. Relationship: complements (does not duplicate) ollama-docker-health (tags-only)
+ fleet-services-watchdog (Docker restart). See [[reference_ollama_wedged_orphan_runner_recovery_2026_06_13]].
```

## Files touched (3)
- scripts/ollama-wedge-guard.mjs      | 160 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/ollama-wedge-guard.test.mjs |  55 +++++++++++++++++++++++++++++++++++++++++++++++++
- 2 files changed, 215 insertions(+)

## Lessons surfaced in commit body
- til then it is operator/CLI-invokable

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show ac1c756d5e4a`
- Milestone envelope: `mcp-server/data/milestones/AI-SYNERGY-SUBSTRATE-GUARD.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._