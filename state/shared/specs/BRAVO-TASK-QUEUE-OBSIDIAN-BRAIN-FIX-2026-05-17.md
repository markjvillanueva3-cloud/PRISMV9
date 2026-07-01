# BRAVO TASK QUEUE — OBSIDIAN-BRAIN-FIX-MS0

**Saved:** 2026-05-17 · slot bravo · claude-339c8ff7
**Purpose:** durable plan so the remaining "make the obsidian brain efficient" work
survives session end. The /loop crons are session-only and were intentionally
cancelled; THIS file is the authoritative pickup list.

**To resume:** new chat → `/checkin-bravo` → read this file → build top-of-queue.
Session TaskList #63 + #64 mirror U-OBF03 + F1 (ephemeral; this file is durable).

---

## Origin

User report: *"obsidian brain / memory system supposed to make us always aware of
everything — clearly not working."* Diagnosed 2026-05-17. Two distinct leaks:
1. **Topic-drift orphaning** — handoffs are replace-not-merge; cross-topic
   unfinished work was unreadable. → **FIXED** (U-OBF01/U-OBF02, shipped).
2. **Always-loaded-file bloat** — CLAUDE.md 129 KB / 711 lines (~6× Anthropic's
   ≤200-line guidance; past that Claude *ignores* the file's rules) + MEMORY.md
   at 99.9 % of its 24,576-byte truncation ceiling. → **THIS QUEUE.**

`/forge-audit-v2` (2026-05-17) measured it: CLAUDE.md 31.8 % dead log lines,
~50 KB milestone narrative. Web research confirmed Anthropic guidance: ≤200
lines, "cut any line whose removal wouldn't cause a mistake," progressive
disclosure (detail → skills/wiki, not CLAUDE.md).

## Already shipped (context — NOT queue)

| Commit | Unit | What |
|---|---|---|
| `6eae58748c` | U-OBF01 | `scripts/handoff-consolidate.mjs` — per-slot open-threads merger (2-round gate PASS) |
| `182df1aa35` | U-OBF02 | consolidated open-threads wired into post-/compact resume-read (2-round gate PASS) |
| `d815eb5c8e` | FORGE-AUDIT-V2/META | `scripts/claude-md-weight.mjs` — re-runnable CLAUDE.md token-weight measure |

## The queue (remaining work — 5 units)

### U-OBF03 — MEMORY.md auto-compaction redesign  `[independent · do first]`
- **Why:** MEMORY.md at 24,550 / 24,576 B = 99.9 %; fleet-wide silent truncation imminent. `memory-size-watch.mjs` only *alerts*.
- **What:** first impl FAILED per-file gate (targeted line-bloat; real failure is entry-count growth). REDESIGN per **task #63**: rotate oldest pointers to a discoverable archive (`memory/ARCHIVE` the SessionStart brain still reaches), lockfile-guarded atomic RMW (PER-SLOT-CLAIM pattern, NOT optimistic mtime), abort-not-proceed on stat/lock failure, stamp-throttle, ≤200-CHARS vs bytes reconciled, node:test + per-file 2-reviewer gate.
- **Depends on:** nothing. **Blocks:** nothing. Disjoint from CLAUDE.md — safe to do first/parallel.
- **Verify:** `node scripts/memory-size-watch.mjs --json | jq .pctOfCeiling` → <0.90 (baseline 0.999).

### U-OBF-F1 — CLAUDE.md regression drain (REDESIGN)  `[CLAUDE.md chain · 1st]`
- **Why:** `## Recent regressions` section = 28.9 KB of append-only forensic log in the always-loaded file. Move to `knowledge/wiki/lessons/claude-md-regression-log.md`, keep newest few + pointer.
- **What:** first impl (`scripts/claude-md-archive-regressions.mjs`, uncommitted/inert) FAILED gate BOTH arms — built without reading the collaborator `regression-auto-write.mjs` (R8 violation). REDESIGN per **task #64** (8-point spec): pointer MUST be an HTML comment (auto-writer skip-loop only walks blank + `<!-- -->`); `planDrain` preamble by content-regex not position; strip prior pointer + trailing blank; verify-after-rename; drain↔auto-writer interleave test.
- **Depends on:** reading `.claude/hooks/regression-auto-write.mjs` FIRST. **Blocks:** F2, GOLF.
- **Verify:** `node scripts/claude-md-weight.mjs --json | jq '.results[0].datedLogPct'` → <0.05 (baseline 0.318).

### U-OBF-F2 — collapse CLAUDE.md milestone narratives to wiki pointers  `[CLAUDE.md chain · 2nd]`
- **Why:** ~50 KB of per-milestone NARRATIVE (FLEET-REAPER-MS1 9 KB, SESSION-CONTINUITY 8.7 KB, KNOWLEDGE-VAULT 9.8 KB, KNOWLEDGE-CONVERSION-MS0 5.2 KB, NN-GRAPH, RGS-*, OLLAMA-PIPELINE, JULIETT-12CHAT, FLEET-MEMORY-MONITOR, DEV-VELOCITY, WEDM digest, OLLAMA dashboard…). The file's own KNOWLEDGE-VAULT section mandates "≤200 lines of dense pointers, NOT a 6th namespace." Each milestone already has a wiki entry.
- **What:** collapse each `## <MILESTONE>-MS#` block → `## <MS> — one-line purpose · Wiki: [[entry]]`. Also drain inline dated-log clusters (CLAUDE.md lines ~186-205 + ~240-294) to the F1 wiki log.
- **Depends on:** F1 (sequence CLAUDE.md edits; claim the file, atomic). **Blocks:** the ≤200-line / <40 KB target.
- **Verify:** `node scripts/claude-md-weight.mjs --json | jq '.results[0].totalLines'` → ≤250 (baseline 711).

### U-OBF-F4 — hook-fire audit + dead-hook disable  `[independent]`
- **Why:** 526 hooks on disk; a prior audit found ~500/510 never fire. Dead hooks = load/scan overhead + xmalloc fork-storm risk (documented in CLAUDE.md regression log).
- **What:** run `node scripts/hook-fire-rank.mjs`; if the never-fire ratio verifies, **disable** dead hooks (`hooks:[]` + `_disabled_by` — NEVER delete, per [[feedback_never_delete_only_disable]]).
- **Depends on:** nothing. **Blocks:** nothing.
- **Verify:** `node scripts/hook-fire-rank.mjs` → fired-vs-never ratio; settings.json hook count drops.

### U-OBF-GOLF — golf-write-only CLAUDE.md governance  `[CLAUDE.md chain · 3rd]`
- **Why:** operator-decided architecture (rejected the per-slot-copy idea — it 13×'s the bloat + needs a 13-way merge). CLAUDE.md stays ONE shared file; only the golf maintenance slot edits it. Work chats route regressions to the `## Recent regressions` inbox; golf drains twice daily via the F1 tool. Eliminates contention at the source — no copies, no merge.
- **What:** (a) a PreToolUse guard hook blocking non-golf Edit/Write to CLAUDE.md (inverse of the existing `golf-slot-write-allowlist.mjs`); (b) wire the F1 drain into golf's twice-daily cadence (Windows scheduled task or golf Stop hook); (c) document the golf-owns-CLAUDE.md doctrine in the compressed CLAUDE.md.
- **Depends on:** F1 (the drain tool IS the golf mechanism). **Blocks:** nothing.
- **Verify:** a non-golf chat's Edit to CLAUDE.md is blocked; golf's is allowed.

## Sequencing

```
U-OBF03 ───────────────┐  (independent)
U-OBF-F4 ──────────────┤  (independent)
U-OBF-F1 → U-OBF-F2 → U-OBF-GOLF   (CLAUDE.md chain — must sequence; all touch CLAUDE.md / depend on F1)
```

Recommended order in a fresh session: **U-OBF03** (most urgent — truncation imminent) → **F1 → F2 → GOLF** → **F4**.

## Doctrine for whoever builds this

- **Read the collaborator first (R8).** Both failed first-attempts (U-OBF03, F1) failed the gate for skipping this. F1: read `regression-auto-write.mjs`. CLAUDE.md edits: check peer claims (it is the most-contended file in the repo).
- **CLAUDE.md is the most peer-contended file** — claim it on the chat bus, edit atomically, commit immediately, or do it from the golf slot once GOLF lands.
- **Per-file 2-reviewer gate** on every code unit; FAIL → fix → re-dispatch → BOTH PASS before commit.
- **Never delete, only disable** (hooks, settings) — [[feedback_never_delete_only_disable]].
- Target end-state: CLAUDE.md ≤200 lines / <40 KB of dense pointers; MEMORY.md <90 % of ceiling.

## Verification META tool (already shipped, re-runnable)

`node scripts/claude-md-weight.mjs` — exit 1 while over budget; the queue is
done when it exits 0. Baseline at save time: project CLAUDE.md 129.5 KB / 711
lines / 31.8 % dated-log. MEMORY.md: `node scripts/memory-size-watch.mjs --json`.
