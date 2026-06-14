---
name: prism-self-update-loop
category: software-engineering
domain: backend-dev
tags: [automation, auto-regen, awareness, claude-brief, build-state, milestone-progress, stagnation, prism-development, ai-development]
last_updated: 2026-05-18
---

# PRISM Self-Update Loop — what keeps the awareness surfaces fresh

User directive ([[feedback_reflect_all_changes_post_update]]): *"make sure everything you're building is automated or it will sit stagnant."* PRISM has roughly a dozen "awareness surfaces" — files that summarize the live state of the system and feed every chat via SessionStart + UserPromptSubmit hooks. Each must regenerate on a cadence faster than its consumers depend on. This wiki names every surface, what regenerates it, what triggers the regeneration, and the failure modes that produce silent stagnation.

The principle: **a writer without a regenerator is a one-shot artifact, and a regenerator without an automatic trigger is dead weight.** Close both loops or the surface rots.

## The surface inventory — what's auto-regenerated, by what, on what trigger

| Surface | Path | Regenerator | Trigger | Freshness target |
|---|---|---|---|---|
| `PRISM-INVENTORY-LATEST.md` | `H:/prism/` | `regen-inventory.mjs` | SessionStart hook | <1h |
| `CLAUDE-BRIEF.md` | `state/shared/` | `generate-claude-brief.mjs` | SessionStart hook | <24h |
| `BUILD_STATE.json` + `.md` | `state/shared/` | `build-state-snapshot.mjs` | SessionStart + post-commit | <24h |
| `MILESTONE_PROGRESS.json` + `.md` | `state/shared/` | `build-milestone-progress.mjs` | post-commit + hourly cron | <24h |
| `AWARENESS-SNAPSHOT.md` | `state/shared/` | `awareness-snapshot-inject.mjs` (T2 SessionStart) | SessionStart hook | per-session |
| `system-graph.json` | `state/shared/system-viz/` | `regen-viz.mjs` (21-stage) | post-commit + hourly cron | <2h |
| `architecture-graph.json` | `state/shared/system-viz/` | `generate-system-viz.mjs` | post-commit | <2h |
| `_leaf-index.jsonl` | `knowledge/wiki/architecture/` | `build-wiki-leaf-index.mjs` (via regen-viz) | post-commit (fingerprint-gated) | <2h |
| `_embeddings.jsonl` | `knowledge/wiki/architecture/` | `build-wiki-embeddings.mjs` | post-commit + cron | <24h (Ollama-dependent) |
| `_stats.md` | `knowledge/wiki/architecture/` | regen-viz internal | post-commit | <2h |
| `wiki/log.md` | `knowledge/wiki/` | engine + manual append | engine write hooks | <1d |
| `tribal-embed-index.json` | `state/shared/` | `embed-wiki-into-tribal-index.mjs` | manual + scheduled | <7d |
| `obsidian-augmentation.json` | `state/shared/system-viz/` | `system-viz-obsidian-bridge-v2.mjs` (via regen-viz) | post-commit | <2h |
| `knowledge/memories/` (Obsidian vault) | `H:/prism/knowledge/memories/` | `stop-obsidian-memory-feed.mjs` | Stop hook | per-Stop |
| `EXECUTIVE-BRIEFING.md` | `state/shared/` | regen-viz stage | post-commit | <2h |
| `WIKI-DEBT-WORKLIST.md` | `state/shared/` | regen-viz stage | post-commit | <2h |
| `PRISM-BUILD-CONTEXT.md` | `state/shared/` | drift monitor | continuous | <1h |
| `PRISM-BUILD-VISION.md` | `state/shared/` | drift monitor | continuous | <1h |

The hot path — what the SessionStart hook chain reads every fresh chat — is the top 6 rows. If any of those is stale, every chat starts with a wrong picture of the system.

## The regeneration trigger taxonomy

Four trigger classes. Each surface uses one; mismatched class is the recurring failure mode.

### 1. SessionStart hook — "regenerate on every fresh chat"

Cheap, deterministic, runs ~1× per session boundary. Used for surfaces that don't change rapidly mid-session (CLAUDE-BRIEF, PRISM-INVENTORY-LATEST). Implementation: `.claude/hooks/<surface>-inject.mjs` registered in `settings.json` SessionStart matchers.

Failure mode: hook unwired or PRISM_HOOK_PROFILE disabled it. Verify via:
```
grep -c "<hook-name>" H:/.claude/settings.json
```
Zero matches = unwired = stale on every chat.

### 2. PostToolUse / post-commit hook — "regenerate when state changes"

Fires on a state-changing event (a Write, a commit, etc.). Used for surfaces tightly coupled to artifact changes (`system-graph.json` after commits, `MILESTONE_PROGRESS` after a `[SCOPE]/U-ID` commit).

Failure mode: the hook fires but the regenerator silently no-ops. The 2026-05-18 `build-wiki-leaf-index` no-op-under-memory-pressure ([[wiki-recall-index-stale-2026-05-18]]) is the canonical example: ran 13 min, exited 0, wrote nothing. Always check the **artifact mtime**, never the regenerator's exit code.

### 3. Windows Scheduled Task — "regenerate on a clock"

Independent of any chat. Used for hourly cron-style regen ([[cron-and-scheduled-task-discipline]]). The `Nightly NN-Graph Retrain` and the hourly `regen-wiki-from-viz` are examples.

Failure mode: task disabled, principal wrong, host paused. Mitigation: the `PRISM Fleet Task Health Watch` scheduled task ([[reference_fleet_task_health_ms0_2026_05_17]]) audits every `PRISM *` task hourly and surfaces findings on the chat bus.

### 4. Stop hook — "regenerate at session end"

Used for surfaces that summarize the session's work (per-chat handoff, Obsidian memory feed). The `stop-obsidian-memory-feed.mjs` propagates new `memory/*.md` files from `C:/Users/.../memory/` to `H:/prism/knowledge/memories/<type>/` every Stop.

Failure mode: chat doesn't call `/handoff` or close cleanly — Stop hook never fires. Mitigation: `precompact-hook` autofires on `/compact` ([[reference_precompact_hook_autowrite_2026_05_15]]); auto-resume catches what handoff missed.

## The fingerprint-gate pattern — skip when input unchanged

Heavy regeneration (regen-viz: ~8 min, 21 stages) is gated by an input fingerprint: hash the inputs, compare to the last-run fingerprint, skip if unchanged. Saves 8 min × N post-commits per session.

Pattern: `state/shared/system-viz/.regen-fingerprint.json` stores `{ hash, lastRunAt }`. The regenerator computes a fresh hash from `(git HEAD SHA + relevant source dirs mtime maxima)` and short-circuits if matched.

Failure mode: the fingerprint says "no work needed" but a downstream consumer expected the side-effect anyway. Mitigation: ALWAYS check the surface's mtime to confirm freshness — never assume "no fingerprint change = correctly fresh."

## The lima isolation class — slot-worktree commits stagnate until golf merges

A commit to `slot/<nato>` updates the slot worktree's view of `system-graph.json` and the wiki indexes — locally. Peer chats reading the main `H:/prism` tree don't see those changes until the `/checkin-golf` integrator merges `slot/<name>` into `cad-fusion-live-ms0`. The 22+ wiki commits on slot/lima that never reached peer chats until golf ran is the canonical example.

**Mitigation:** golf merge cadence ≤ daily. Long gaps = long stagnation periods. [[wiki-automation-discipline]] §"lima isolation failure mode" covers this in depth.

## Verification commands

Run these to check the auto-regen loop is alive:

```bash
# Hot-path surfaces — every chat starts from these
stat -c "%y %n" \
  H:/prism/PRISM-INVENTORY-LATEST.md \
  H:/prism/state/shared/CLAUDE-BRIEF.md \
  H:/prism/state/shared/BUILD_STATE.md \
  H:/prism/state/shared/MILESTONE_PROGRESS.md \
  H:/prism/state/shared/system-viz/system-graph.json

# Wiki recall surfaces — needed for paraphrase-aware search
stat -c "%y %n" \
  H:/prism/knowledge/wiki/architecture/_leaf-index.jsonl \
  H:/prism/knowledge/wiki/architecture/_embeddings.jsonl

# Scheduled tasks alive?
powershell -NoProfile -Command "Get-ScheduledTask -TaskName 'PRISM *' | Format-Table TaskName, State, LastRunTime, NextRunTime"
```

Per [[fleet-coordination-discipline]] task-health audit: `LastRunTime` more than one cadence-interval old, or `NextRunTime` more than one cadence-interval in the future → trigger broken. A non-zero `LastTaskResult` is a FINDING not necessarily a launch failure (small-exit-code is normal for many scripts).

## What stagnation looks like

The empirical signatures that should trigger investigation:

- **`PRISM-INVENTORY-LATEST.md` engine count differs from `git ls-tree -r HEAD | grep src/engines/.*\.ts | wc -l`** → inventory regenerator stalled.
- **`MILESTONE_PROGRESS.md` shipped count + envelope status disagree for >2 days** → silent close-out drift ([[silent-close-out-drift]]). The auditor exists; run it.
- **`_leaf-index.jsonl` mtime > 6h old AND commits landed since** → regen pipeline running behind under fleet load. NOT necessarily a bug ([[wiki-recall-index-stale-2026-05-18]] caveat); could be the host memory-pressure no-op class.
- **`_embeddings.jsonl` mtime > 30h** → Ollama daemon down. BM25 still works but paraphrase queries miss.
- **`system-graph.json` `meta.generatedAt` > 12h old** → post-commit regen-viz not firing or hung.
- **Chat bus shows >10 unread for >24h** → peers not reading the bus OR a chat bus writer is wedged.

The CLAUDE.md §Recent regressions block records the empirical history of these.

## Closing the loop — what to do when stagnation is found

1. **Identify which trigger class is failing** (SessionStart vs post-commit vs scheduled vs Stop).
2. **Verify the trigger fires** — grep settings.json for the hook name; check Get-ScheduledTask for the cron task; check the post-commit hook executes.
3. **If trigger fires but regenerator silently no-ops** — check artifact mtime, not exit code. Re-run manually with the script's stderr captured; look for OOM/timeout/permission signals.
4. **Record the finding** as `reference_<surface>_stale_<date>.md` in `knowledge/memories/reference/` so the next chat doesn't re-derive the diagnosis.
5. **Fix the regenerator OR the trigger**, not the symptom. Manually firing the regenerator fixes today's symptom; only fixing the trigger prevents tomorrow's recurrence.

The 2026-05-18 lima session's recall-index investigation is the worked example: the regenerator was correct (proven via tmp-dir test in 2ms), the trigger (post-commit hourly) was firing, but the host's memory pressure caused the heavy walk to silently no-op. Diagnosis recorded as a memory; "wait for orchestrator regen when load drops" is the right action; no code change needed.

## Anti-patterns

- **Manually fire a regenerator + forget to verify mtime advance** → "I ran it, must be fixed" while the artifact is still stale.
- **Disable a fingerprint gate to "force fresh"** → 8 min × N commits/session = session-killing overhead.
- **Write a new awareness surface without wiring a regenerator** → one-shot, stagnates on day 2.
- **Wire a regenerator without an automatic trigger** → dead weight; nobody calls it.
- **Pin a surface freshness target tighter than the trigger cadence** → "must be <1h fresh" with an hourly cron = always behind.
- **Fix stagnation by editing the surface directly** → fights the regenerator next run; the next regen overwrites the manual edit. Fix the regenerator's input or the regenerator's logic.

## Checklist — every new awareness surface

- [ ] Regenerator script written? Where does it live?
- [ ] Trigger class chosen and wired (SessionStart / post-commit / Scheduled / Stop)?
- [ ] Fingerprint-gate if regen is heavy (>30s)?
- [ ] Freshness target consistent with trigger cadence?
- [ ] Failure surface (silent no-op vs exit-nonzero) and how to detect?
- [ ] Manual-fire command documented for emergency refresh?
- [ ] Stagnation signature documented so audits can catch staleness?
- [ ] Telemetry log (mtime check OR explicit log line) so the audit can verify automated regen actually ran?

## Related

- [[wiki-automation-discipline]] — 4-stage propagation pipeline + lima isolation failure mode
- [[cron-and-scheduled-task-discipline]] — the durability primitives
- [[fleet-coordination-discipline]] — the chat-bus surface (one of the awareness surfaces)
- [[silent-close-out-drift]] — what stagnation looks like in MILESTONE_PROGRESS
- [[wiki-recall-index-stale-2026-05-18]] — lived stagnation diagnosis
- [[autonomous-loop-drift-discipline]] — don't spend a /loop tick investigating stagnation; record + move on
- CLAUDE.md "Wiki brain (live · auto-generated from the system-viz graph)" + "BUILD_STATE / MILESTONE_PROGRESS" sections — the doctrine pointers
- `scripts/regen-wiki-from-viz.mjs` — the 21-stage orchestrator
- `scripts/build-state-snapshot.mjs`, `scripts/build-milestone-progress.mjs`, `scripts/generate-claude-brief.mjs` — the per-surface regenerators
