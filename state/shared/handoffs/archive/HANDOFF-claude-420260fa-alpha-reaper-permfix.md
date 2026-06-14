---
session: claude-420260fa
topic: alpha-reaper-permfix
slot: alpha
written_at: 2026-05-17T01:57:09.466Z
machine: DESKTOP-N7MI1VB
family: Claude
session_key: claude-420260fa
status: active
---

# HANDOFF: claude-420260fa
Updated: 2026-05-17T01:57:09.466Z
Family: Claude | Machine: DESKTOP-N7MI1VB | Session: claude-420260fa

## STATE
alpha slot claimed for permanent reaper-fix work; commit 91.3% (relieving from 97.3%); ready to autonomously loop Tier 1→2→3 of REAPER-PERMFIX milestones per user directive.

## RESUME
AUTONOMOUS LOOP: build the permanent fleet-reaper fix for 12-chat × 5-10-subagent fleet (60-120 process tree). User directive 2026-05-17: 'add everything to your queue, loop until you complete all units'. Ship Tier 1 (immediate relief, all green/cheap-reversible) → Tier 2 (architectural, yellow/medium) → Tier 3 (Windows Service supervisor — the canonical permanent fix). LIVE STATE: alpha slot claimed (claude-420260fa, topic alpha-reaper-permfix), commit 91.3% (was 97.3% — relieving), 9 claude.exe + 54 node.exe + 7 bash.exe = 70 procs, GPU RTX 4080 SUPER 15.1GB free / 16% util IDLE, Ollama reachable but 0 models loaded (host-installed not Docker), Docker STOPPED, MemCompression OFF, pagefile only 4GB (should be 96GB on 64GB box), scheduled task Ready/Logon-Mode=Interactive-only/Last-Result=1 (needs S4U+AtStartup hardening). TIER 1 ORDER (start here, all reversible): (1) B1 aggressive reaper thresholds — drop kill-after to 1@80%, 0@95% — edit scripts/fleet-reaper-sweep.mjs constants; (2) B3 memory ballast — Buffer.allocUnsafe(256MB) reserved at sweep boot, released on memUsedPct>=95 alarm; (3) E1+E2 auto-restart Docker + Postgres + Prometheus on probe-down inside fleet-reaper coordinator (gated by PRISM_FLEET_REAPER_AUTO_DOCKER_RESTART=1, default off — flip to on after smoke); (4) D4 drop Ollama offload threshold to 0.5 in ollama-task-offloader.mjs; (5) F2 set reaper scheduled-task priority Normal; (6) G1/G2/G4 surface elevated-PowerShell commands for pagefile→96GB, Enable-MMAgent -mc, Defender exclusions (operator runs UAC themselves — NOT a code commit). TIER 2: (7) A5 refactor fleet-reaper-sweep.mjs to pure-Node API — replace ALL execFileSync(nvidia-smi/curl/docker-health/git) with native bindings or cached IPC; (8) C1 Windows Job Object per slot harness — cap node-children at 50/slot via new helper .claude/helpers/slot-job-object.ps1; (9) C3 shared 5s-TTL probe cache — state/shared/.probe-cache.json single producer, all slots read; (10) D1+D2 Ollama in Docker GPU container with qwen2.5-coder:32b-q4 (14GB VRAM). TIER 3 (the canonical permanent fix for compaction-gap): (11) H1 prism-fleet-supervisor Windows Service — node-windows or NSSM, owns reaper lifetime independent of any Claude chat. WORKTREE: create H:/prism-reaper-permfix from cad-fusion-live-ms0 main, branch work/reaper-permfix-ms0. Each Tier=1 milestone-envelope: REAPER-PERMFIX-MS0 (Tier1, 6 units), REAPER-PERMFIX-MS1 (Tier2, 4 units), REAPER-PERMFIX-MS2 (Tier3, 1-3 units depending on supervisor scope). Per-unit: per-file 2-reviewer gate (Arm A code-analyzer + Arm B independent reviewer), 3-of-3 Stop scrutiny gate at milestone close, real tests not toBeDefined stubs. Open TaskList: #5 SKILL-AUTHOR-LOOP-MS0 (Hermes A), #6 USER.md+SOUL.md (Hermes B), #7 ChatOps (Hermes C), #11/12/13 prior NN+roadmap items, #18 NN dispatcher E2E tests, #19 NN-STACK-INTEG ff-merge worktree H:/prism-nn-stack-integ→main (4 commits ready: 54f704fb1+685e48cfa+444dab3cf+d80030059 + d80030059's auto-fire wire). PEER CLAIMS RESPECT: claude-339c8ff7 chat-slots.mjs+chat-slots-pid-gate.test.mjs, claude-416be9ac CLAUDE.md+specs/CLAUDE-MD-DUPLICATION-CANDIDATES, claude-6655163e infraDispatcher, claude-77971357 pick-prefresh-inject — DO NOT TOUCH. KILL SWITCH AWARE: PRISM_FLEET_REAPER_DISABLE=1 still the only universal off-switch. KARPATHY R5/R6: if any Tier-2 file conflicts with peer-claim, fork to NEW worktree branch, don't fight. Loop format: build → 2-reviewer per-file → commit on worktree → loop-state tick → next file. After each Tier complete: ff-merge worktree to cad-fusion-live-ms0, close envelope, post chat-bus.

## CONTEXT
User explicit autonomous-loop directive given AFTER /checkin-alpha + AFTER seeing the full Tier 1/2/3 plan from prior context. Compaction-gap problem (reaper-dies-during-/compact) is THE motivating user pain. Tier 3 (Windows Service supervisor) is the canonical answer; Tier 1/2 are stepping stones. Memory pressure relief is leverage — every Tier 1 item also reduces fork-failure risk during AUTONOMOUS-LOOP itself.
