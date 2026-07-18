# CLAUDE-CODEX 6-Chat Parallel Roadmap Execution Protocol

**Status:** v1.0 — operational core shipped 2026-05-08
**Applies to:** Claude (all 6 concurrent chats), Codex (when running roadmap-execution lanes), Gemini (advisor only)
**Authoritative:** This document is the cross-CLI agreement on how multiple chats execute the master roadmap simultaneously without colliding.

---

## Why this exists

PRISM ships ~6 concurrent chats per CLAUDE.md per-chat handoff section. Without coordination they:
- claim and edit the same files (file-claim namespace bug)
- commit overlapping changes that conflict at merge time
- duplicate work because phase ownership is unclear
- hold dependencies (e.g. start P4 before P3.3 is merged)

The **PRISM-MASTER-ROADMAP-v1.md** has 16 phases (S0, P1.1, P1.2, P1.3, P2.1, P2.2, P3.1, P3.2, P3.3, P4, P5, P6, P7, P8, P9, P10) pre-partitioned across 11 worktrees. Most phases touch disjoint file sets — so true parallel execution is achievable IF claims are atomic and commits are conflict-checked ahead of time.

---

## The system (3 layers of defense)

### Layer 1 — Phase-level atomic claim
- One chat owns a phase at a time.
- Claim recorded in `state/shared/phase-claims.jsonl` (append-only event log).
- Current state derived in `state/shared/phase-state.json`.
- DAG enforced from `state/shared/dependency-graph.json` — can't claim P4 until P3.3 is `MERGED`.
- Tool: `node H:/prism/.claude/helpers/phase-claim-manager.mjs claim <PHASE> --owner=$STABLE_ID`
- Skill: `/claim-phase <PHASE>`
- Lock: filesystem `O_EXCL` on `.phase-claim.lock` with 10s stale-reap.

### Layer 2 — File-level claim (existing chat-bus)
- `prism_context:claim_file` MCP action (existing).
- Hooks `file-claim-guard.mjs` + `commit-ownership-guard.mjs` enforce.
- **Known bug** (`feedback_file_claim_namespace_bug.md`): identity scheme mismatch causes silent misses cross-machine.
- **Fix in progress** — `helpers/identity-normalize.mjs` is the single chokepoint to refactor file-claim-guard onto. Scheduled in next batch.

### Layer 3 — Pre-commit merge simulation (the headline)
- Every `git commit` and `git push` runs `helpers/conflict-predictor.mjs` against `origin/main` first.
- Uses `git merge-tree --no-messages --name-only` (modern git, no working-tree mutation) or scratch-worktree fallback.
- Annotates conflicting files with peer chat owner + phase from claim log.
- **HARD BLOCK** via `hooks/pre-commit-conflict-sim.mjs` (PreToolUse:Bash) — `continueOnError: false`.
- Bypass: `--no-verify` (emergency only).
- Skill: `/sync-rebase` runs the predictor + rebases preemptively, so the hard-block is a no-op in normal cadence.

### Conflict-fork escape valve (existing)
- If two chats genuinely need to touch the same file (rare with phase pre-partition), fork to sibling worktree.
- Don't fight for shared tree — `git worktree add ../prism-<scope> -b work/<scope>`.
- Coordinator merges sibling worktrees back to main one at a time.

---

## Coordinator role (rotating, 1-of-6)

**Election rule:** Whoever's stable session ID sorts first alphabetically among active chats becomes coordinator at midnight UTC. Idle >2h → next-in-sort takes over.

**Coordinator responsibilities (only):**
- Merge phase branches → `main` (after the owning chat marks the phase ready).
- Update `mcp-server/data/roadmap-index.json` on milestone completions.
- Patch `PRISM-MASTER-ROADMAP-v1.md` and `state/shared/phase-state.json` (mark `MERGED`).
- Broadcast `merged` event to chat bus.

**Non-coordinator chats:**
- Commit only to phase branches (never to `main` directly).
- Mark phase ready via `phase-claim-manager.mjs merged <PHASE>` BUT actual merge is coordinator's job.
- Anyone can `/sync-rebase` their own branch (no coordinator needed).

**Hook enforcement:** `hooks/coordinator-only-mainmerge.mjs` (next batch) blocks non-coordinator pushes to `main`.

State: `state/shared/coordinator-rotation.json`.
Skill: `/coordinator-status` (next batch) — am I the coordinator?

---

## Cadence — recommended workflow per chat

```
1. /startup             — read per-agent handoff, understand context
2. /workboard           — see what's claimable now
3. /claim-phase <ID>    — atomic claim; auto-creates worktree; checks deps
4. cd H:/<worktree>     — switch to phase worktree (or use EnterWorktree tool)
5. /forge3 <brief>      — work the phase using the v3 pipeline
   ├── per unit: 4-LOOP (BUILD → SCRUTINIZE → GAP FILL → TIE UP)
   ├── per unit: phase-claim-manager.mjs heartbeat <PHASE> (auto-wired in v2)
   └── per unit: /sync-rebase BEFORE commit (avoids hard-block surprise)
6. git commit -m "[SCOPE-MS#]/U-XXX: title"
   └── pre-commit-conflict-sim hook fires → block if conflict predicted
7. /scrutiny-3way + Opus arm + /scrutinize-mark
8. phase-claim-manager.mjs merged <PHASE>  — mark ready for coordinator merge
9. Coordinator (whoever it is right now): merges your branch to main
10. /handoff write       — per-agent handoff for next session
```

---

## State files (sources of truth)

| Path | Role | Mutability |
|---|---|---|
| `state/shared/phase-claims.jsonl` | Append-only claim/release/heartbeat log | Append-only via phase-claim-manager.mjs |
| `state/shared/phase-state.json` | Derived current state, regenerated on every claim event | Atomic write via phase-claim-manager.mjs |
| `state/shared/dependency-graph.json` | DAG (read-only) derived from PRISM-MASTER-ROADMAP-v1.md | Hand-updated when roadmap changes |
| `state/shared/coordinator-rotation.json` | Rotation schedule + current coordinator | Updated by coordinator-elect.mjs |
| `state/shared/AGENT_CHAT.{md,jsonl}` | Chat-bus event log (existing) | Append via agent-coordination.mjs |
| `state/shared/AGENT_WORKBOARD.md` | Live state view (existing + extended) | Regenerated by workboard-render.mjs |

---

## Identity normalization (THE FIX)

**Single chokepoint:** `helpers/identity-normalize.mjs`. All claim writes/reads MUST go through `normalizeIdentity(input)` which produces canonical key `<chat>@<MACHINE>`.

Accepts:
- `claude-99eca613` → `claude-99eca613@DESKTOP-N7MI1VB`
- `Agent@MARKV/pid-51344` → `Agent-pid-51344@MARKV`
- `MarkV-20636` → `MarkV-20636@DESKTOP-N7MI1VB`
- `undefined`/`null` → derive from current process via `stable-session-id.mjs`

**Refactor target (next batch):** `hooks/file-claim-guard.mjs` and `helpers/agent-identity.mjs` to use this single normalization. Until then, file-claim-guard has known cross-scheme misses — phase-level claim provides the primary defense.

---

## Failure modes & escapes

| Failure | What happens | Escape |
|---|---|---|
| Stale phase claim (heartbeat >30min) | `phase-claim-manager.mjs claim --force` reaps + re-claims | `--force` flag |
| Two chats race-claim same phase | First-wins via filesystem `O_EXCL` lock; second gets `{ok: false, reason: "already owned"}` | Pick another phase or wait |
| Conflict predicted on commit | Hard-block via pre-commit-conflict-sim | `/sync-rebase` first; or `--no-verify` emergency bypass |
| Coordinator goes idle >2h | Next-in-alphabetical-sort takes over | Auto via coordinator-elect.mjs |
| Phase A genuinely depends on uncommitted work in phase B | DAG check blocks claim | Wait for B to merge; or `--force` if you accept the risk |
| File-claim namespace bug bites (cross-machine) | Phase claim still holds; only file-level guard misses | Hand-coordinate via /chat until F1 fix lands |

---

## What's NOT in v1 (next batch — see PRISM-6CHAT-NEXT-BATCH.md)

1. **Hooks** — `phase-claim-required.mjs` (soft-warn), `phase-claim-heartbeat.mjs` (auto-refresh every Nth call), `coordinator-only-mainmerge.mjs` (block non-coordinator pushes to main)
2. **Skills** — `/release-phase`, `/coordinator-status`
3. **Bug fix F1** — refactor file-claim-guard onto identity-normalize.mjs
4. **CLAUDE.md update** — add 6-Chat Parallel Execution Protocol section pointing here
5. **Master roadmap update** — add machine-readable phase-claim-id per phase
6. **Workboard render** — generate AGENT_WORKBOARD.md from live state automatically (currently manual via /workboard skill)
7. **Commit cadence telemetry** — `state/shared/commit-cadence-stats.json` for Ollama-routed predictor

---

## Cross-CLI consistency (Codex / Gemini)

Codex chats invoking roadmap execution MUST:
- Read this protocol on session start
- Use `phase-claim-manager.mjs` (Node-based, runs identically under any CLI)
- Run `conflict-predictor.mjs` before push
- Honor `coordinator-rotation.json` — only coordinator merges to main

Gemini is advisor-only (per CLAUDE.md scrutiny gate); does not own phases.

When Codex behavior diverges from this spec, the canonical resolution is **this file**, not the Codex docs. File a corrective edit here, not in `CLAUDE-CODEX-MCP-DIRECTIVE.md`.

---

## Quick reference

```bash
# Claim a phase
STABLE=$(node H:/prism/.claude/helpers/stable-session-id.mjs)
node H:/prism/.claude/helpers/phase-claim-manager.mjs claim S0 --owner="$STABLE"

# See workboard
node H:/prism/.claude/helpers/phase-claim-manager.mjs workboard

# Pre-commit conflict check (manual)
node H:/prism/.claude/helpers/conflict-predictor.mjs check --base=main

# Reap stale claims (run periodically)
node H:/prism/.claude/helpers/phase-claim-manager.mjs stale --reap

# Mark phase ready for coordinator merge
node H:/prism/.claude/helpers/phase-claim-manager.mjs merged S0 --owner="$STABLE"
```
