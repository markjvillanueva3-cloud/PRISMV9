---
title: PRISM Stabilization — Hooks, Git, Handoff, Injection Architecture
date: 2026-05-09
author: Claude (audit + brainstorm collaboration with Mark Villanueva)
status: approved-design
scope: H:/prism (all 8 active chats, both DESKTOP-N7MI1VB and peer machines)
phases: A (urgent, 1-3 days) → B (5-10 days) → C (10-20 days)
brief-for: /rgs6 generate
---

# PRISM Stabilization Spec

## 1. Problem statement

PRISM heavy multi-chat sessions (8+ concurrent Claude Code chats) are degraded by three compounding faults observed live on 2026-05-09:

### 1.1 Memory pressure & orphan git.exe processes
- `git-sync-stop.mjs` Stop hook spawns `git push` as a *detached, unref'd* child and exits without supervising it. With 8 chats on the same `.git`, every Stop event can leave a runaway `git.exe` scanning a 7,142-file working tree until OS pagefile pressure kills the chat.
- 319 hook entries registered across `C:/Users/wompu/.claude/settings.json` (208) + `H:/prism/.claude/settings.json` (111). Per-prompt fan-out is 35 hooks; per-tool-call fan-out is up to 175 (PreToolUse 98 + PostToolUse 75). Each is a node subprocess fork.
- 584 hook script files exist on disk; many duplicate work or are orphaned (registered nowhere).
- `state/shared/system-viz/` contains 334 MB of H-drive scan dumps (`h-drive-files.jsonl` 187 MB, `h-drive-census.json` 126 MB) read synchronously by some hooks.

### 1.2 Multi-chat handoff race
- Helper `H:/prism/.claude/helpers/stable-session-id.mjs` was patched 3 times today (GAP1/GAP2/GAP3) for race conditions. The fixes hardened ID resolution but did not address concurrency below the resolution layer.
- 5+ uncommitted experimental files exist for compaction handling: `helpers/compaction-survival.mjs`, `hooks/compaction-survival.mjs`, `hooks/pre-compact.mjs`, `hooks/compact-restore.mjs`, `hooks/post-compact-enhanced.mjs`. Fragmented experimentation = unclear which is canonical.
- `state/shared/handoffs/HANDOFF-<id>-<topic>.md` is written without atomic rename, lock file, or any concurrency-control. Two simultaneous compactions can interleave writes; a /startup glob can read the wrong file.
- Topic derivation collides for chats sharing the same git branch (8 chats on `cad-fusion-live-ms0` all derive topic `cad-fusion-live-ms0`).

### 1.3 Per-prompt injection fork storm
- 35 hooks fire on every UserPromptSubmit. Each is a separate node subprocess that reads state, computes context, emits text injection.
- Many compute the same data: `build-state-inject`, `inventory-check-guard`, `claude-brief-staleness-check`, `wiki-precheck-inject`, `chat-bus-inject`, `comprehensive-build-enforce`, `discipline-expert-inject`, etc.
- User experience: every prompt waits ~1.5–3s on hook fan-out and receives 8–15 separate injection blocks (~3-8 KB each). Net token cost per session is significant, and the UI emits the equivalent of "system noise" between every turn.

## 2. Goals

1. **G1** — Eliminate orphan `git.exe` accumulation. 0 orphan git/node processes after Stop.
2. **G2** — Drop `git status` walk size from 7,132 untracked to ≤30. `git status` returns in <500ms.
3. **G3** — Zero handoff cross-contamination across 6+ concurrent compactions in a stress test.
4. **G4** — Single canonical PreCompact/PostCompact/Startup pipeline. ≤2 files per phase (writer + reader).
5. **G5** — UserPromptSubmit median latency <100ms (down from ~1500ms).
6. **G6** — Fork count per prompt ≤3 (down from ~35).
7. **G7** — All context Mark relies on (build-state, wiki, chat-bus, etc.) remains accessible — via Obsidian/HTML/system-viz/MCP — without per-prompt text injection.
8. **G8** — Mirror discipline restored: H:/.claude/settings.json never drifts from C: source.

## 3. Non-goals

- N1. Refactoring the 543-skill catalog. Skills work fine; their auto-injection on SessionStart is a token issue, not a memory issue.
- N2. Migrating Obsidian vault structure. Vault is healthy at 6.9 MB.
- N3. Reducing skill count or merging dispatchers. Out of scope.
- N4. Removing the Codex/Gemini/Opus 3-way scrutiny gate. Stays as-is.
- N5. Adopting a different version control system. Git stays.
- N6. Replacing Claude Code. Hook system is the right primitive; the issue is implementation, not architecture.

## 4. Constraints

- **C1 — Deploy-before-heavy-sessions**: Phase A must ship before next multi-chat work session.
- **C2 — Multi-chat safety**: every fix must preserve the lane discipline (per-chat handoff, file claims, scope branches).
- **C3 — Multi-computer**: changes must propagate via the c-to-h-mirror pattern. Other machine (DESKTOP-N7MI1VB peer) needs the same hook stack on git pull.
- **C4 — Keep injection content**: Mark wants the discipline-expert / build-state / wiki-precheck / chat-bus content remain available. Only the *delivery mechanism* changes.
- **C5 — Reversible**: every phase guarded by env flag; rollback in <5 minutes.
- **C6 — No silent failure**: any handoff/compact bug must produce a loud error, never a silent wrong-file load.
- **C7 — Atomic-first**: per /forge6 + /rgs6 doctrine — atomic foundations before higher tiers. Phase A is foundational; B depends on A; C depends on B.

## 5. Architecture overview

```
┌──────────────────────────────────────────────────────────────────┐
│                    PHASE A — Stop the bleeding                    │
│   A1: bound git-sync-stop  A2: .gitignore  A3: orphan reaper      │
│   A4: archive disabled hooks                                      │
│            (1-3 days, <50 LOC net change, 4 commits)              │
└─────────────────────────┬────────────────────────────────────────┘
                          │ depends on
┌─────────────────────────▼────────────────────────────────────────┐
│             PHASE B — Multi-chat handoff race fix                 │
│   B1: hybrid handoff store (FS + MCP coord)                       │
│   B2: ID resolution hardening                                     │
│   B3: compact pipeline consolidation (5+ files → 2)              │
│   B4: startup pipeline read path                                  │
│   B5: Obsidian vault integration (NTFS junction)                  │
│   B6: Quartz HTML build (port :8766)                              │
│        (5-10 days, ~600 LOC, 12-18 commits, 2 dispatcher actions) │
└─────────────────────────┬────────────────────────────────────────┘
                          │ depends on
┌─────────────────────────▼────────────────────────────────────────┐
│       PHASE C — Injection re-architecture (pull, not push)        │
│   C1: context-bundle daemon (aggregator, 30s tick)                │
│   C2: ONE prompt-context-inject hook (reads bundle)               │
│   C3: Browseable context dashboard via Quartz                     │
│   C4: Retire 30+ redundant hooks → archive                        │
│        (10-20 days, ~1000 LOC, 30+ commits)                       │
└──────────────────────────────────────────────────────────────────┘
```

## 6. Phase A — Stop the bleeding

### A1. Bound + supervise `git-sync-stop.mjs` push (P0)

**Current bug** (`H:/prism/.claude/hooks/git-sync-stop.mjs:156-180`):
```js
function detachedPush(args) {
  const child = spawn("git", args, { detached: true, stdio: "ignore",
                                      windowsHide: true });
  child.unref();
  return { detached: true };
  // No release: child runs after we exit; the lock TTL covers cleanup.
}
```
Comment claim is false: TTL covers the *lock file*, not the *process*. On Windows, `unref()` + parent exit leaves the child as a runaway descendant of the OS init.

**Fix**: replace with a *bounded supervised* spawn that always reaps:
```js
function supervisedPush(args, timeoutMs = PUSH_TIMEOUT_MS) {
  const lock = acquireRemoteLock();
  if (!lock.ok) return { blocked: true, error: lock.message };
  return new Promise((resolve) => {
    const child = spawn("git", args, { cwd: REPO, stdio: "ignore",
                                        windowsHide: true });
    let killed = false;
    const timer = setTimeout(() => {
      killed = true;
      try { child.kill("SIGKILL"); } catch {}
    }, timeoutMs);
    child.on("exit", (code, sig) => {
      clearTimeout(timer);
      releaseRemoteLock(lock.holder);
      logToFile({ event: "push_done", code, sig, killed,
                   args, ts: new Date().toISOString() });
      resolve({ ok: code === 0, killed, code });
    });
    child.on("error", (e) => {
      clearTimeout(timer);
      releaseRemoteLock(lock.holder);
      logToFile({ event: "push_error", error: e.message,
                   args, ts: new Date().toISOString() });
      resolve({ ok: false, error: e.message });
    });
  });
}
```

Stop hook becomes async-aware. Total Stop hook time bounded by `timeoutMs` (default 30s). Process ALWAYS exits via SIGKILL if push hangs.

**Telemetry**: Append-only log at `state/shared/git-sync-stop.log` with: ts, branch, ahead, behind, exit_code, killed, duration_ms. Daily-rotated.

**Files touched**: 1 (`hooks/git-sync-stop.mjs`).

### A2. `.gitignore` hygiene (P0)

Add to `H:/prism/.gitignore`:
```
# Local ephemeral state added by hooks/helpers
.claude-octopus/
.claude-profiles/
.claude/bin/

# Hookify experimental rule files (local-only)
.claude/hookify-*.local.md
.claude/hookify.autofire-*.local.md

# Compaction-related WIP scratch
.claude/helpers/.compaction-survival.md

# Untracked PRISM master ref (versioned location is mcp-server/data/docs/)
"# PRISM MASTER REFERENCE v12.ini"
```

Plus a curated review of the 22 untracked `.claude/helpers/*.mjs`:
- Promote to git: `agent-coordination-daemon`, `arbitration-log`, `chat-bus-reap`, `chat-slots`, `compact-restore`, `compaction-survival`, `conflict-predictor`, `identity-normalize`, `phase-claim-manager`, `position-sync`, `post-compact-enhanced`, `pre-compact`, `prism-awareness-bundle`, `svi-refresh`, `sync-cli-context-files`, `sync-memory`, `test-quality-gate` if they are referenced by any wired hook in settings.json.
- Otherwise gitignore.

Add per-helper a 10-line audit in `state/shared/specs/2026-05-09-helper-audit.md` (deliverable in A2) classifying each as keep/promote/archive.

**Verification**: `git status --porcelain | wc -l` ≤ 50.

**Files touched**: `.gitignore` + audit doc + `git add`/`git rm` of curated helpers.

### A3. Orphan reaper Stop hook

**Replace** `stop_close_prism_nodes.mjs` (does not work on Windows for unref'd descendants) with `stop_close_prism_nodes_v2.mjs`:

```js
// pseudocode
const ourPid = process.env.CLAUDE_PARENT_PID || ...;
const ourCwd = process.cwd();
const candidates = await listProcesses({ name: ['git.exe','node.exe'] });
for (const p of candidates) {
  if (!isOurDescendant(p, ourPid) && !cmdLineMatches(p, ourCwd)) continue;
  if (!parentAlive(p)) {
    logKill(p);
    process.kill(p.pid, 'SIGKILL'); // Windows tasklist /F
  }
}
```

Conservative: only kills processes whose CommandLine references our hooks/scripts (`H:/prism/.claude/hooks/`, `H:/.claude/`, `H:/prism/scripts/`). Never touches user processes.

**Telemetry**: log every kill to `state/shared/orphan-reaper.log`.

**Files touched**: 1 new hook script + settings.json registration replacing old.

### A4. Archive 23 already-disabled hooks

Already short-circuited via `DISABLED_TOKEN_REDUX_2026_04_23` marker but still cost a node subprocess fork. Move them out of settings.json entirely:

```bash
# Pseudocode of the cleanup script
node H:/prism/scripts/archive-disabled-hooks.mjs --apply
# Reads marker from each hook's source, removes its entry from settings.json,
# moves source file to state/shared/disabled-hooks/<original-path>.disabled.
# Records action in state/shared/disabled-hooks/manifest.jsonl.
```

**Files touched**: settings.json (both layers), 23 source files moved.

**Verification**: total registered hook count drops by ~23 in user settings; observed UserPromptSubmit fork count drops correspondingly.

### A5 (cross-cutting) — Mirror direction enforcement

Today: `H:/.claude/settings.json` was edited 15h *after* `C:/Users/wompu/.claude/settings.json` and the c-to-h-mirror hook hasn't fired since. Drift visible: H: has 33 Stop hooks vs C:'s 32.

**Fix**: existing `c-to-h-mirror.mjs` (or its replacement) gains a "guard mode" — runs on SessionStart and asserts `H: hash == C: hash`. If not equal AND C: is older, reject the divergence loudly: print expected vs actual diff, refuse to overwrite either, surface a manual reconciliation prompt.

**Files touched**: 1 hook (c-to-h-mirror).

**Phase A acceptance criteria**:
- `git status --porcelain | wc -l` ≤ 50
- After 30-min idle period following Stop: 0 git.exe processes (verified via `Get-Process git`)
- `state/shared/git-sync-stop.log` shows `killed: false` on >95% of pushes (timeout protects but rarely fires)
- Settings.json hash equality C: == H: at every SessionStart
- `node H:/prism/scripts/hook-fork-bench.mjs` (new) measures total node forks per prompt; ≤300 for SessionStart, ≤30 per prompt

## 7. Phase B — Multi-chat handoff race fix

### B1. Hybrid handoff store

**Architecture**:
- **Filesystem of record**: `state/shared/handoffs/<session-id>/handoff.md` (per-chat folder, no name collision possible).
- Inside each folder: `handoff.md` (current), `handoff.md.lock` (write lock with TTL), `history/<timestamp>.md` (per-write archive, last 14 days).
- **MCP coordination layer**: 2 new dispatcher actions in `prism_session`:
  - `prism_session:handoff_write { session_id, topic, body, parent_session_id? }` — server enforces single-writer-per-session by holding an in-memory mutex per session_id; writes via atomic rename to FS; returns confirmed (session_id, write_id).
  - `prism_session:handoff_read { session_id, topic? }` — server returns the latest handoff for that exact session_id. NO topic-glob fallback.

**Server-side mutex**: implemented in `mcp-server/src/engines/HandoffCoordinatorEngine.ts` — a Map<session_id, Promise<void>> that serializes writes per-session. Reads are lock-free (read latest history snapshot).

**FS-only fallback**: if MCP server unreachable (port not listening), `per-agent-handoff.mjs` writes directly using `fs.openSync(path, 'wx')` (exclusive create) on a `.lock` file with a TTL embedded; if the lock is fresh (<60s old) and held by another process, abort with an unmistakable error. No silent retry, no glob fallback.

### B2. ID resolution hardening (build on today's GAP fixes)

- **Mandatory** stdin session_id for all *write* operations. The hook flow guarantees Claude provides it via stdin JSON. If absent (Bash invocation), abort with `process.exit(2)` and surface the error.
- For *read* operations on SessionStart: the read helper requires either:
  1. stdin session_id from the SessionStart hook (Claude provides), OR
  2. explicit `--session-id` arg (manual recovery), OR
  3. explicit `--terminal claude-XXXX` arg (legacy compat).
- **Cross-write assertion**: every write asserts the resolved session_id matches the MCP-served pin within 60s. If mismatch → abort write, log to `state/shared/handoff-race-incidents.log`. This catches edge cases where two chats accidentally share an ID.

### B3. PreCompact pipeline consolidation

**Audit** (B3-step-1): catalog the 5+ uncommitted compact files:
- `H:/prism/.claude/helpers/compaction-survival.mjs`
- `H:/prism/.claude/hooks/compaction-survival.mjs`
- `H:/prism/.claude/hooks/pre-compact.mjs`
- `H:/prism/.claude/hooks/compact-restore.mjs`
- `H:/prism/.claude/hooks/post-compact-enhanced.mjs`
- existing wired: `H:/prism/.claude/hooks/claude-brief-precompact.mjs`, `compression-precompact.mjs`, `precompact-pending-guard.mjs`, `precompact-auto-trigger.mjs`

**Consolidate** to:
- `helpers/precompact-handoff.mjs` — canonical writer (calls `prism_session:handoff_write`).
- `hooks/precompact-bundle.mjs` — single PreCompact hook that internally:
  1. invokes the canonical writer
  2. runs `claude-brief-precompact` logic
  3. runs `compression-precompact` logic
  4. runs `precompact-pending-guard` logic
  Replaces 4 separate hooks with one (still all logic preserved, but one node fork).
- `hooks/postcompact-restore.mjs` — single PostCompact hook (the "session resume" path) that calls `prism_session:handoff_read` and emits the handoff into the resumed session.

**Move to disabled/**: all 5 uncommitted files plus the 3 retired wired hooks. Manifest in `state/shared/disabled-hooks/2026-05-09-compact-consolidation.jsonl`.

### B4. Startup pipeline read path

`hooks/session-handoff-load.mjs` (existing) replaced with a version that:
1. reads stdin session_id (mandatory)
2. calls `prism_session:handoff_read { session_id }` 
3. if found → emits handoff into chat as resume context
4. if not found → emits unambiguous diagnostic, NEVER falls back to topic-glob

The "could not find handoff" path includes the recovery commands the user can run (`per-agent-handoff read --session-id ...`).

### B5. Obsidian vault integration

Create NTFS junction: `H:/prism/knowledge/handoffs` → `H:/prism/state/shared/handoffs/`.

```powershell
# One-shot setup
New-Item -ItemType Junction -Path H:/prism/knowledge/handoffs `
                              -Target H:/prism/state/shared/handoffs
```

Each `handoff.md` gets frontmatter for Obsidian:
```yaml
---
session: claude-7b9d1810
topic: cad-fusion-live-ms0
written_at: 2026-05-09T20:50:00Z
parent_session: claude-7b9d1810  # for /compact lineage
machine: DESKTOP-N7MI1VB
chat_index: 1
peer_chats:  # snapshot of who else was alive
  - claude-99eca613
  - claude-cee63f1f
status: active  # active | archived | superseded
---
```

This gives Obsidian backlinks (resume hints can `[[link]]` to prior handoffs), search, graph view of compaction lineage, and tag-based querying.

### B6. Quartz HTML build (port :8766)

**Setup** (B6-step-1): bootstrap Quartz in `H:/prism/scripts/quartz/` (separate from main `H:/prism/`):
```bash
cd H:/prism/scripts
npx quartz create   # or git clone https://github.com/jackyzha0/quartz.git
cd quartz
# config: vault path = H:/prism/knowledge/, output = H:/prism/state/shared/quartz-out/
# port: 8766 (system-viz on 8765)
```

**Sources Quartz indexes**:
- `H:/prism/knowledge/` (existing Obsidian vault)
- `H:/prism/knowledge/handoffs/` (junction to handoffs — see B5)

**Server**: small Express wrapper at `H:/prism/scripts/quartz-serve.mjs`:
- Mounts quartz-out/ as static
- Endpoint: `/handoff/<session-id>` → returns the rendered handoff HTML
- Endpoint: `/handoff-list` → returns JSON of all handoffs (chat ID, topic, written_at)
- Endpoint: `/graph` → Quartz-generated D3 graph view
- Live reload via filesystem watcher (debounced 5s) — runs `npx quartz build` and reloads

**Process supervision**: register Quartz as a low-priority background daemon in `state/shared/daemons/quartz.json`. Auto-start via SessionStart hook; auto-restart on crash. If a generic supervisor doesn't exist, ship a minimal one (`scripts/daemon-supervisor.mjs`, ~80 LOC) as part of B6 — it is reused by C1 daemon below.

**Phase B acceptance criteria**:
- 6-chat parallel `/compact` simulation: zero handoff cross-contamination across 100 trial runs.
- `precompact + compact + postcompact + startup` total wall-clock <5s on a typical chat.
- Obsidian opens any handoff with backlinks intact.
- Quartz dashboard at http://localhost:8766/handoffs renders all handoffs with lineage graph.
- Race-incident log empty across 1-week observation window.

## 8. Phase C — Injection re-architecture

### C1. Context-bundle daemon

New: `H:/prism/scripts/context-bundle-daemon.mjs` — long-running, low-priority background process. Tick every 30s:

1. Read all source data Mark's injections currently compute:
   - `BUILD_STATE.md / .json`
   - `PRISM-INVENTORY-LATEST.md`
   - wiki precheck (top entries by keyword)
   - chat-bus state (active claims, unread peer messages)
   - settings-baseline diff
   - hook telemetry summary
   - SVI status, omega thresholds
   - JM Die context
2. Aggregate to `state/shared/context-bundle.json` (single canonical state — schema versioned).
3. Render to `state/shared/context-bundle.html` (single HTML view).
4. Daemon writes both atomically (tmp + rename).

Daemon supervised by `scripts/daemon-supervisor.mjs` (shipped as part of B6, reused here).

### C2. ONE prompt-context-inject hook

Replace 24 UserPromptSubmit injectors with a single hook `hooks/prompt-context-inject.mjs`:

1. Read `state/shared/context-bundle.json` (one fs read, ≤200ms).
2. Apply per-prompt relevance filter (one regex pass against prompt text).
3. Emit ONE structured injection block (≤500 tokens typical, ≤2000 max):
   ```
   ## PRISM CONTEXT (auto)
   - Build: 3174 engines, 2269 wired, 898 unwired
   - Active chats: 8, you are claude-7b9d1810
   - Top wiki match: [[reference_obsidian_vault_subdirs]]
   - Open work: ...
   - Full context: http://localhost:8766/context (open in browser)
   ```
4. Side-effect injectors that have *real work* (claim file edits, telemetry capture) become standalone POST-prompt operations queued to a job runner — do not block the user prompt.

Retained as-is: `inventory-check-guard` (duplicate prevention is load-bearing — a Skill activation requires it), `chat-bus-inject` (multi-chat lane safety).

Retired (moved to disabled/): `discipline-expert-inject`, `prompt-rules-inject`, `comprehensive-build-enforce`, `claude-brief-staleness-check`, `wiki-precheck-inject`, `gsd-section-retrieve`, `tribal-inject-on-edit`, `reference-value-injector`, `local-compute-intent`, `ollama-skill-suggester`, `task-goal-tracker`, `lathe-master-post-quality-gate`, ~12 more (full list in audit deliverable).

### C3. Browseable context dashboard

Quartz build (from B6) extended to render:
- `/context/build-state` — current BUILD_STATE.md as HTML
- `/context/inventory` — engine/dispatcher/action counts
- `/context/wiki/...` — full wiki traversal
- `/context/system-viz` — link to existing system-viz on :8765 (do not duplicate; cross-link)
- `/context/handoffs` — all handoffs (from B5/B6)
- `/context/chats` — currently active chats with their claims
- `/context/discipline` — random expert injection content as static page

**Result**: instead of injecting context text on every prompt, Claude (or human) `WebFetch`es it on demand. Inject *pointers*, not *content*. Per-prompt token cost drops 80%.

### C4. Retire 30+ redundant hooks

After C1-C3 ship and stable:
- All UserPromptSubmit hooks superseded by `prompt-context-inject` move to `state/shared/disabled-hooks/2026-05-XX-injection-rearch.jsonl`.
- Half of PreToolUse hooks (the matcher-gated ones doing read-only checks) consolidate into `pretool-bundle.mjs` — same approach as B3.
- Half of PostToolUse hooks consolidate similarly.
- Final settings.json hook count goal: ≤80 entries (down from 319).

**Phase C acceptance criteria**:
- UserPromptSubmit median latency <100ms (measured via hook telemetry).
- Fork count per prompt ≤3 (typical) — measured via process snapshot at prompt submit + 50ms.
- Context bundle freshness <60s (daemon tick + write).
- Quartz dashboard renders all context categories.
- Mark confirms: "I can find what I need in browser when I want it; prompts feel snappier."

## 9. Decisions (resolved open questions)

### D1. Quartz port = 8766 (separate from system-viz on 8765)
Two reasons:
- Decoupling: Quartz crash should not affect system-viz; system-viz crash should not affect handoff dashboard.
- Different lifecycle: system-viz is rebuilt on-demand by Mark; Quartz is auto-built on filesystem changes.
Both servers cross-link in their nav so it feels unified.

### D2. Handoffs in Obsidian vault as junction
NTFS junction `H:/prism/knowledge/handoffs/` → `H:/prism/state/shared/handoffs/` so:
- Filesystem of record stays at canonical `state/shared/handoffs/` (per CLAUDE.md convention).
- Obsidian sees them natively at `knowledge/handoffs/` without copy-sync.
- Quartz indexes the vault and picks them up automatically.

### D3. Compatibility shim for `per-agent-handoff.mjs` API
Keep the existing CLI surface during Phase B rollout to avoid breaking in-flight chats. The old API delegates to MCP under the hood:
```bash
# These still work
node per-agent-handoff.mjs write --terminal claude-XXXX --resume "..." --state "..."
node per-agent-handoff.mjs read --terminal claude-XXXX
```
Deprecation warnings emitted starting Phase C launch. Hard cut at end of Phase C.

## 10. Cross-cutting concerns

### 10.1 Telemetry
- New: `state/shared/hook-telemetry.jsonl` — every hook fire records `{event, hook_name, duration_ms, exit_code, ts}`. Daily-rotated. Used to detect regressions and identify next consolidation candidates.
- New: `state/shared/handoff-race-incidents.log` — any detected race during Phase B operation.
- New: `state/shared/git-sync-stop.log` — Phase A push outcomes.
- New: `state/shared/orphan-reaper.log` — Phase A reaper kills.

### 10.2 Tests
- `mcp-server/src/__tests__/multi-chat-handoff.test.ts` (new, B-phase) — spawns 4-6 mock chats firing PreCompact simultaneously, asserts no handoff cross-contamination across 100 runs.
- `mcp-server/src/__tests__/hook-fork-bench.test.ts` (new, A-phase) — counts node forks per prompt in a synthetic session; asserts ≤30.
- `scripts/hook-fork-bench.mjs` — benchmark harness.
- Existing test suite must remain green at all phase boundaries.

### 10.3 Rollback
Each phase guarded by env flag in `H:/.claude/settings.json` env block:
- `PRISM_GIT_SYNC_BOUNDED=1` — Phase A1 (default 1; set 0 to revert to detached push)
- `PRISM_HANDOFF_HYBRID=1` — Phase B1 (default 1; set 0 to revert to legacy filesystem-only)
- `PRISM_CONTEXT_BUNDLE=1` — Phase C1/C2 (default 1; set 0 to revert to per-hook injection)

Each flag observable in `state/shared/feature-flags.json` (auto-mirrored from env on SessionStart for visibility).

### 10.4 Migration
- Phase A: instant cutover, no migration needed.
- Phase B: dual-read mode for first 2 days — new helpers read from MCP first, fall back to legacy file. After 2 days observe telemetry; if zero MCP misses, deprecate legacy path.
- Phase C: gradual hook retirement over 5 days; one batch per day, telemetry-monitored.

### 10.5 Multi-computer propagation
The peer machine (DESKTOP-N7MI1VB sibling) needs the same hook stack. Approach:
- All changes commit to git on `cad-fusion-live-ms0` worktree.
- Settings.json deltas commit to a versioned file `H:/prism/state/shared/settings-template.json` and are applied via SessionStart hook on machines that lack them.
- Quartz/daemon scripts version-controlled in `H:/prism/scripts/`.

## 11. Risks

| ID | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R1 | A1 push timeout too aggressive (real slow-push gets killed) | M | L | Telemetry tracks killed=true rate; tune timeoutMs if >5% |
| R2 | A2 gitignores something Mark wants tracked | L | M | Audit doc lists every helper with a keep/promote/archive decision before commit |
| R3 | B1 MCP server crash during compact = handoff lost | L | H | Filesystem fallback is primary; MCP is performance optimization, not correctness gate |
| R4 | B2 mandatory stdin breaks legacy bash invocation | M | M | Compat shim (D3) + deprecation warnings; hard cut only at end of Phase C |
| R5 | B5 NTFS junction confuses Obsidian indexer | L | L | Test with Obsidian beforehand; if broken, switch to bind-mount-style symlink |
| R6 | B6 Quartz incompatible with vault structure | M | L | Quartz config explicitly maps content; if unfixable, fall back to MkDocs |
| R7 | C1 daemon stale data (>60s) causes wrong context | L | M | Bundle JSON includes `freshness_ms`; injector flags if stale |
| R8 | C4 retired hook turns out to be load-bearing | M | M | Disabled/, not deleted/; restore in <30s; telemetry flags missing functionality |
| R9 | Mirror drift recurs after A5 fix | M | M | A5 includes hash assertion at every SessionStart; fails loud |

## 12. Dispatcher integration map (for /rgs6 tier-gating)

| Phase | New dispatcher actions | Touched dispatchers | Tier |
|---|---|---|---|
| A | none | — | T0 (foundation) |
| B1 | `prism_session:handoff_write`, `prism_session:handoff_read` | `prism_session` | T1 |
| B6 | `prism_context:quartz_status`, `prism_context:handoff_lookup` | `prism_context` | T2 |
| C1 | `prism_context:bundle_status`, `prism_context:bundle_rebuild` | `prism_context` | T2 |
| C2 | `prism_context:bundle_inject` (called BY hook) | `prism_context` | T2 |

Both Phase B + C build on `prism_session` and `prism_context` dispatchers. Per /rgs6 tier-floor doctrine: T0 (Phase A) must pass before T1 (Phase B); T1 must pass before T2 (Phase C). This matches the proposed phase order.

## 13. Acceptance criteria summary

### Phase A (must hit ALL before B starts)
- [ ] G1 partial: 0 orphan git.exe after Stop in 30-min idle test (verified by reaper telemetry)
- [ ] G2: `git status --porcelain | wc -l` ≤ 50
- [ ] G8: settings.json hash equality C: == H: at every SessionStart for 7 days
- [ ] All existing tests still green
- [ ] Hook fork bench shows SessionStart fork count ≤300 (currently ~400+)

### Phase B (must hit ALL before C starts)
- [ ] G3: 6-chat parallel /compact stress test = 0 handoff cross-contamination across 100 runs
- [ ] G4: PreCompact pipeline = 1 hook (down from 4); PostCompact = 1; Startup-handoff-load = 1
- [ ] Quartz dashboard reachable at http://localhost:8766/handoffs
- [ ] Obsidian opens handoffs with backlinks intact
- [ ] Race-incident log empty across 7-day observation
- [ ] All existing tests still green

### Phase C (final acceptance)
- [ ] G5: UserPromptSubmit median <100ms
- [ ] G6: Fork count per prompt ≤3
- [ ] G7: All retained injection content findable via Quartz dashboard
- [ ] Settings.json hook entry count ≤80 (down from 319)
- [ ] Mark explicit sign-off: "ready for heavy multi-chat sessions"

## 14. Out of this spec

- Replacing the entire hook system architecture (out of scope; staying with Claude Code's hooks).
- Multi-platform Obsidian sync (Linux/macOS); current spec is Windows-only.
- Cloud sync of handoffs (still local-disk + git remote).
- Replacing the duplication-guard / safety-physics / scrutiny-3way gates.

## 15. Phase ordering & dependency graph

```
A1 ──┐
A2 ──┤
A3 ──┼──→ A-acceptance ──→ B1 ──→ B2 ──┐
A4 ──┤                            B3 ──┼──→ B-acceptance ──→ C1 ──→ C2 ──→ C3 ──→ C4
A5 ──┘                            B4 ──┤
                                  B5 ──┤
                                  B6 ──┘
```

A1-A5 can be done in parallel (independent files). B1-B6 mostly parallel except B3 depends on B1. C1-C4 sequential (each builds on the previous).

---

## 16. /rgs6 brief usage

This spec is structured for ingestion by `/rgs6 generate`. The pipeline expects:
- Atomic-first ordering (Phase A before B before C) ✓
- Tier targets per phase ✓ (section 12)
- Dispatcher integration map ✓ (section 12)
- Acceptance criteria that are testable ✓ (section 13)
- Risk register with mitigations ✓ (section 11)
- Telemetry plan ✓ (section 10.1)
- Rollback plan ✓ (section 10.3)

Run with: `/rgs6 generate --brief H:/prism/state/shared/specs/2026-05-09-prism-stabilization-design.md`
