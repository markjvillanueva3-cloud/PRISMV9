# PRISM 6-Chat System — Next-Batch Plan

**Status:** v1 critical core shipped 2026-05-08. This file lists what to build in v2 before the system is fully load-bearing.

## v1 SHIPPED (this turn)

### State files
- `state/shared/phase-claims.jsonl` — append-only event log
- `state/shared/phase-state.json` — 16 phases, all UNCLAIMED
- `state/shared/dependency-graph.json` — DAG with topological order
- `state/shared/coordinator-rotation.json` — rotation schedule template (slots empty until 6 chats elected)

### Helpers
- `helpers/identity-normalize.mjs` — single chokepoint for `<chat>@<MACHINE>` canonical key
- `helpers/phase-claim-manager.mjs` — claim/release/heartbeat/merged/stale/list/workboard
- `helpers/conflict-predictor.mjs` — pre-commit `git merge-tree` simulation with peer-owner annotation

### Skills
- `/claim-phase <id>` — atomic phase claim
- `/workboard` — live state view
- `/sync-rebase` — fetch + rebase with conflict prediction

### Hook
- `hooks/pre-commit-conflict-sim.mjs` — HARD BLOCK on predicted git conflicts (PreToolUse:Bash on `git commit`/`git push`)

### Directive
- `state/shared/CLAUDE-CODEX-6CHAT-PROTOCOL.md` — cross-CLI authoritative spec

---

## v2 TO BUILD (next session)

Estimated effort: ~6h, single chat. Don't fan out — these are tightly coupled.

### A. Wire the hard-block hook into settings.json (15min — CRITICAL)
The hook file exists but is not yet registered. Edit `H:/.claude/settings.json` to add:
```json
"PreToolUse": [
  {
    "matcher": "Bash",
    "hooks": [
      { "type": "command", "command": "node H:/prism/.claude/hooks/pre-commit-conflict-sim.mjs", "continueOnError": false }
    ]
  }
]
```
Use `update-config` skill — don't hand-edit.

### B. Soft-warn phase-claim hooks (1.5h)
- `hooks/phase-claim-required.mjs` (PreToolUse:Edit/Write/MultiEdit) — emit advisory if chat edits files outside its claimed phase. NO hard block (per hybrid design choice).
- `hooks/phase-claim-heartbeat.mjs` (PostToolUse, every Nth call) — auto-refresh heartbeat so claims don't go stale during active work.

### C. Coordinator-only main merge hook (45min)
- `hooks/coordinator-only-mainmerge.mjs` (PreToolUse:Bash on `git push origin main` or `git merge into main`) — HARD BLOCK if caller isn't current coordinator. Surfaces who is.

### D. Coordinator skills (1h)
- `helpers/coordinator-elect.mjs` — election + rotation logic
- `/coordinator-status` skill — am I the coordinator? when does rotation occur?
- `/release-phase` skill — release current claim manually

### E. F1 BUG FIX — file-claim-guard namespace bug (2h)
Refactor `hooks/file-claim-guard.mjs` and `helpers/agent-identity.mjs` to use `identity-normalize.mjs` as single chokepoint.

Test: spawn 2 chats with different identity schemes (Agent@MARKV/pid-X vs MarkV-NNNNN), have both claim same file, verify second is blocked.

### F. CLAUDE.md update (30min)
Add new section "6-Chat Parallel Execution Protocol" pointing to `CLAUDE-CODEX-6CHAT-PROTOCOL.md`. Update `H:/PRISM/CLAUDE.md` (project) and CLAUDE-CODEX-COORDINATION-DIRECTIVE.md.

### G. Master roadmap update (30min)
Add machine-readable `phase-claim-id` per phase in `PRISM-MASTER-ROADMAP-v1.md`. Add "depends on" graph block (already in `dependency-graph.json` but needs human-readable mirror).

### H. Auto workboard render (30min)
Cron-register hourly regeneration of `AGENT_WORKBOARD.md` from `phase-state.json` + chat-bus tail via `helpers/workboard-render.mjs`. Use `/schedule` skill.

### I. Commit cadence telemetry (1h)
- `state/shared/commit-cadence-stats.json` — per-chat commit timing
- `helpers/cadence-tracker.mjs` — record commit times, average between commits, predict next clash
- Stop hook reads stats and Ollama-routed predictor (qwen2.5-coder:7b) flags "chat A about to push, chat B touched same files 2min ago" before either commits

---

## v3 LATER (low priority — only if v2 doesn't cover)

- Conflict simulation in CI (post-push verification)
- Per-phase token budget (each phase has a Claude-tokens cap)
- Multi-repo support (if PRISM splits into mono-repo + microservices)
- Coordinator escalation to user when ≥2 chats stuck >1h on same dep chain
- Heartbeat decay model — Ollama predicts probable abandonment before 30min stale threshold

---

## Pre-flight checklist before activating v1 in production

1. [ ] Wire `pre-commit-conflict-sim.mjs` into settings.json (TASK A above)
2. [ ] Test claim-release cycle: `node phase-claim-manager.mjs claim S0`, verify state.json updates, then `release S0`, verify state.json reverts
3. [ ] Test conflict-predictor on a clean branch (should report no conflict)
4. [ ] Test conflict-predictor on a deliberately-conflicting branch (should report files + exit 1)
5. [ ] Verify `pre-commit-conflict-sim.mjs` blocks a `git commit` when conflict predicted, allows when clean
6. [ ] Update `H:/PRISM/CLAUDE.md` to point to `CLAUDE-CODEX-6CHAT-PROTOCOL.md`
7. [ ] Run a smoke test: 2 chats, 2 phases, watch them work in parallel without colliding
8. [ ] Reap any stale claims: `node phase-claim-manager.mjs stale --reap`

---

## Known limitations of v1

- **Phase-claim is soft until v2** — phase-claim-required.mjs not yet wired, so a chat editing files outside its claimed phase only warns post-hoc via the chat bus.
- **File-claim namespace bug not yet fixed** — F1 deferred to v2. Cross-machine claims may miss for files outside any phase worktree.
- **Coordinator rotation is manual** — coordinator-elect.mjs not yet built; election by hand-edit of `coordinator-rotation.json` until B+D land.
- **No commit cadence prediction** — chats commit when they want; pre-clash detection deferred to v2 task I.
- **Workboard is manual** — `/workboard` skill works but no cron auto-regeneration yet.

These are KNOWN trade-offs. The hard-block on commit conflicts is the one bulletproof guard in v1, and it's the highest-value gate.
