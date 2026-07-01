---
name: wiki-automation-discipline
category: software-engineering
domain: backend-dev
tags: [wiki, automation, stagnation, regen, propagation, prism-development, ai-development]
last_updated: 2026-05-18
---

# Wiki Automation Discipline — every artifact must propagate or it sits stagnant

User feedback 2026-05-18: "make sure everything you're building is automated or it will sit stagnant." A written wiki is not a propagated wiki. Propagation flows through 4 stages; any stage that doesn't auto-fire turns the wiki into dead disk content.

## The 4-stage propagation pipeline

```
1. WRITE          — Write tool to knowledge/wiki/<cat>/<name>.md
        │
        ▼ (post-commit hook fires automatically)
2. SYSTEM-VIZ     — scripts/system-viz-on-commit.mjs refreshes system-graph.json
        │           (registers the new wiki as L10 node + indexes its frontmatter tokens)
        ▼ (cron: hourly OR fingerprint-gated post-commit)
3. WIKI INDEXES   — scripts/regen-wiki-from-viz.mjs (21-stage)
        │           rebuilds _leaf-index.jsonl + _stats.md + _embeddings.jsonl
        ▼ (Stop hook: stop-obsidian-memory-feed.mjs)
4. OBSIDIAN VAULT — wiki entries flow to the second-brain vault
                    (memories flow on every Stop; wikis on cron)
```

Skipping any stage = the wiki exists on disk but isn't reachable from the chat's pre-search hooks. Skipping stage 2 = absent from system-graph. Skipping stage 3 = absent from BM25/cosine recall. Skipping stage 4 = absent from Obsidian.

## The "lima isolation" failure mode

Slot worktrees (e.g. `H:/prism-slot-lima` on branch `slot/lima`) share the .git directory with main but have their own working tree. A commit to slot/lima:
- DOES fire the post-commit hook (system-viz-on-commit runs)
- DOES update system-graph.json (locally)
- BUT the system-graph is shared across worktrees, so the regen sees the lima working tree

However, peer chats reading from `H:/prism` main tree see the system-graph based on what's MERGED. Slot-isolated commits don't surface to peer chats until golf merges slot/lima → cad-fusion-live-ms0.

This is the canonical "lima isolation" stagnation: 22+ wikis committed to slot/lima, none visible to peer chats reading main tree.

## Fix: golf merge cadence

`/checkin-golf` integrates slot branches. The golf chat:
1. `git fetch --all`
2. For each slot/<name>: `git merge --no-ff slot/<name> -m "[GOLF] merge slot/<name>"`
3. `git push origin cad-fusion-live-ms0`

Golf merge cadence should be ≤ daily; longer gaps mean longer stagnation periods for slot-isolated artifacts.

## Verifying the stages fired

### Stage 2 — System-viz freshness

```bash
node -e "const g=require('./state/shared/system-viz/system-graph.json'); console.log('generated:', g.meta?.generatedAt || 'unknown')"
```

If `generatedAt` is > 1h old AND there have been commits since: the post-commit hook isn't firing OR the regen script is failing silently.

### Stage 3 — Wiki index freshness

```bash
stat -c "%y %n" knowledge/wiki/architecture/_leaf-index.jsonl knowledge/wiki/architecture/_embeddings.jsonl knowledge/wiki/architecture/_stats.md
```

If > 2h old AND commits have landed since: the regen cron OR the post-commit hourly trigger isn't firing. Manually fire with:

```bash
node scripts/regen-wiki-from-viz.mjs       # 21-stage, ~8min
node scripts/build-wiki-embeddings.mjs      # Ollama-dependent
```

**Verify the mtime actually advanced afterward** — never assume the manual fire
worked. On a memory-pressured host the heavy full-corpus walk can run 10+ min,
exit 0, and write *nothing* (see "When automation legitimately can't fire"
below). A manual fire that left `_leaf-index.jsonl` mtime unchanged did NOT
work, regardless of its exit code.

### Stage 4 — Obsidian feed status

```bash
ls -la state/shared/.obsidian-feed-stamp     # if exists, check mtime
node .claude/hooks/stop-obsidian-memory-feed.mjs --force   # manual fire (if --force supported)
```

No stamp = feed never fired (operator never `/handoff`'d a chat with stop-obsidian-memory-feed wired).

## The automation gap audit checklist

After writing a wiki, verify the propagation:
- [ ] Commit landed (`git log -1 --oneline`)
- [ ] system-graph.json `generatedAt` updated (post-commit auto-fire)
- [ ] _leaf-index.jsonl mtime within last hour (regen cron OR manual)
- [ ] _embeddings.jsonl mtime within last 24h (Ollama-dependent)
- [ ] If in slot worktree: golf merge to cad-fusion-live-ms0 scheduled
- [ ] Obsidian vault path receives the file (memory-feed Stop hook fired)

Missing any = artifact will sit stagnant.

## PRISM OS + Obsidian + System-Viz composition

The user's question: "can we utilize prism os and obsidian brain with system-viz further?"

Yes — three concrete leverages:

### 1. system-viz query as the canonical lookup

Before consuming a wiki, query system-viz:

```bash
node H:/prism/scripts/system-viz-query.mjs <query>
# OR via dispatcher:
prism_session:master_index_query "<query>"
```

Returns the canonical entry by name/keyword/cosine. The wiki IS in the graph (L10 node) and queryable.

### 2. Obsidian Graph View navigation

Open the vault in Obsidian app → Graph View → filter to backend-dev domain → visual neighborhood of any wiki. Faster than chat-side cross-link traversal for complex topic explorations.

### 3. Dataview queries as audit surface

```dataview
TABLE WITHOUT ID file.name, last_updated, length(file.outlinks) AS "outlinks"
FROM "knowledge/wiki/code-tribal"
WHERE domain = "backend-dev" AND last_updated < date(today) - dur(30 days)
SORT last_updated ASC
```

Returns stale backend-dev entries with low outlink-count (likely orphans). Audit + refresh per [[regression-prevention-doctrine]] cadence.

## The "writer also owns propagation" rail

When you ship a wiki, you OWN propagation. Don't assume the cron will catch it — verify the indexes regenerated. If they didn't, fire manually OR document the gap in handoff so the next session can fix.

The "I wrote it, someone else will index it" anti-pattern is how 19h-stale `_leaf-index.jsonl` happens.

## When automation legitimately can't fire

- Ollama daemon down → `_embeddings.jsonl` can't refresh. Acceptable for a few hours; > 30h stale and BM25-only recall loses paraphrase coverage.
- Golf chat offline → slot merges sit. Surface to user; suggest spinning golf up.
- Disk full → regen can't write. Diagnose via fleet-memory-monitor + cleanup-orchestrator.
- Host memory pressure → the heavy 21-stage regen (especially the ~28K-file `build-wiki-leaf-index` walk) can silently no-op: 10-13 min runtime, exit 0, *zero* output, no write. Observed 2026-05-18 — `_leaf-index.jsonl` stayed byte-frozen across two direct runs while the same generator wrote + printed correctly in 2 ms against a 1-file tmp dir. The generator code is correct; the loaded host is the cause. Wait for load to drop (watch fleet-memory-monitor) or run regen off-peak — and always re-check the mtime, not the exit code.

In all cases, surface the gap explicitly. Silent stagnation is worse than loud failure.

## The verification command for THIS wiki's propagation

After committing this wiki to slot/lima:

```bash
# Stage 2 check
git -C H:/prism log -1 --format=%H slot/lima
# Stage 3 manual fire (since indexes are 19h stale at write-time):
node H:/prism/scripts/regen-wiki-from-viz.mjs
# Stage 4 readiness:
ls H:/prism-slot-lima/knowledge/wiki/software-engineering/wiki-automation-discipline.md
```

If stages 2/3/4 don't all clear within 1h of commit: file a `feedback_automation_gap.md` memory and surface to operator.

## Related

- [[wiki-index-and-discovery]] — what the indexes contain
- [[wiki-frontmatter-validation]] — frontmatter feeds the indexes
- [[obsidian-vault-integration]] — vault flow
- [[slot-worktree-playbook]] — lima isolation context
- [[doc-reflection-rule]] — 4-surface propagation discipline
- CLAUDE.md "Wiki brain (live · auto-generated from the system-viz graph)"
- `scripts/regen-wiki-from-viz.mjs` — the 21-stage orchestrator
