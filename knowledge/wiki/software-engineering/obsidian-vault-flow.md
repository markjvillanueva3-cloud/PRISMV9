---
name: obsidian-vault-flow
category: software-engineering
domain: backend-dev
tags: [obsidian, memory, vault, knowledge, backlinks, namespaces, curation, prism-development, ai-development]
last_updated: 2026-05-19
---

# Obsidian Vault Flow — memory namespaces, propagation, and when to write memory vs wiki

PRISM has two parallel knowledge surfaces: the **wiki** (project-lifetime architectural docs at `H:/prism/knowledge/wiki/`) and the **Obsidian vault** (cross-session lived experience at `H:/prism/knowledge/memories/` + the auto-fed `C:/Users/<u>/.claude/projects/H--PRISM/memory/`). They serve different purposes, propagate differently, and surface differently to the recall hooks. This wiki names the vault structure, the auto-feed mechanism, the four memory namespaces, the `[[backlink]]` semantics, and the canonical decision rule for *memory vs wiki vs both*.

## The two surfaces — what each is for

| Surface | Path | Lifetime | Purpose | Recall hook |
|---|---|---|---|---|
| **Wiki** | `H:/prism/knowledge/wiki/<category>/<name>.md` | Project-lifetime | Architectural docs, design patterns, doctrine | `wiki-precheck-inject.mjs` |
| **Obsidian vault (live)** | `C:/Users/<u>/.claude/projects/H--PRISM/memory/<file>.md` | Cross-session | Lived feedback + facts the chat learned | `memory-relevance-inject.mjs` |
| **Obsidian vault (vault)** | `H:/prism/knowledge/memories/<type>/<file>.md` | Cross-session | Mirror of the live vault, structured by type | Vault feed + Graph View |

**Live vault is where you WRITE.** Vault directory is what the recall hooks READ and what Obsidian opens. The Stop-hook feed propagates one to the other.

## The four memory namespaces

Each memory file's frontmatter has `metadata.type`. The Stop-hook feed routes files by type into `knowledge/memories/<type>/`:

| Type | Routes to | Purpose | Body template |
|---|---|---|---|
| `feedback` | `feedback/` | Standing rules / corrections / confirmed approaches given to the assistant | `<rule>` + `**Why:** ...` + `**How to apply:** ...` |
| `reference` | `reference/` | Durable facts: lived diagnoses, commit SHAs, build state, system facts | `<fact>` + verify command + link to commit if applicable |
| `project` | `project/` | Ongoing work / goals / constraints not derivable from code or git history | `<context>` + scope + relative-dates resolved to absolute |
| `user` | `user/` | Who the user is (role, expertise, preferences) | `<facts about Mark>` |

The reference vs feedback distinction matters: `reference_*` is *what happened* (a finding, a fact); `feedback_*` is *what to do next time* (a rule, a discipline). A fix-and-finding for the same incident might warrant BOTH a `reference_<incident>_<date>.md` AND a `feedback_<rule>.md`.

## The frontmatter contract

```yaml
---
name: <short-kebab-case-slug>
description: <one-line summary — feeds the recall hook>
metadata:
  type: user | feedback | project | reference
  node_type: memory
  originSessionId: <claude-session-id>
---
```

The `description:` field is the **recall ranking signal**. It's what `memory-relevance-inject` matches against your prompt tokens. A vague description (`"some notes"`) won't surface; a specific one (`"git-shared-index lock contention diagnosis (size/mtime/owner)"`) will.

`name` is the slug for `[[backlinks]]`. `originSessionId` is for cross-reference; recall hooks treat memories as background context — they reflect what was true when written.

## The auto-feed mechanism — Stop hook propagation

[[reference_stop_obsidian_memory_feed]]: every Stop event, `.claude/hooks/stop-obsidian-memory-feed.mjs` walks `C:/Users/<u>/.claude/projects/H--PRISM/memory/` and propagates new/changed files into `H:/prism/knowledge/memories/<type>/`. Properties:

- **Decoupled from the Ollama-gated extract hook** — runs even when Ollama is down.
- **Own 3-min global throttle** — avoids re-running on every Stop in a rapid-/handoff session.
- **`O_EXCL` lockfile** — prevents concurrent-write corruption.
- **Non-destructive `_legacy-root` reconcile** — older root-dir memories get moved into typed subdirs without data loss.
- **Knobs:** `PRISM_OBSIDIAN_FEED_DISABLE=1` / `PRISM_OBSIDIAN_FEED_INTERVAL_MS=N`.

The Stop hook means: **write the memory to the live vault, and the next session-close propagates it.** You do not need to write to both places. The vault directory is read-only-by-convention from the chat — let the feed mirror it.

## MEMORY.md — the curated index

`MEMORY.md` is the live ≤24KB index. It loads into context every session via SessionStart. The convention (per CLAUDE.md global doc):

```markdown
- [Title](file.md) — one-line hook describing what's in the memory
```

**One line per memory.** Keep under ~200 chars. The MEMORY.md hits a hard truncation ceiling at 24,576 bytes — over that, only part loads and freshest entries miss. Per [[reference_memory_compress_v2]]: stay under 22 KB target / 24 KB hard ceiling.

**Curation rule:** write the memory FILE first (full body), THEN add the one-line pointer to MEMORY.md. Don't put memory bodies in MEMORY.md — it rots the index.

When MEMORY.md grows too large: archive older entries to `MEMORY-ARCHIVE.md` (still discoverable, read on demand). Per [[autonomous-loop-drift-discipline]], compress investigation findings; index entries are pointers, not summaries.

## When to write memory vs wiki vs both

The canonical decision rule:

| Situation | Write | Why |
|---|---|---|
| Architectural pattern, design doctrine, contract spec | **Wiki only** | Project-lifetime, structured by category |
| One-off fact / SHA / incident diagnosis | **Reference memory only** | Cross-session lived knowledge |
| Standing rule / correction given to the assistant | **Feedback memory only** | Discipline; the WHY + HOW persists |
| A rule whose discipline justifies project-wide doctrine + the discipline emerged from a specific lived incident | **Both** — wiki for the pattern + memory for the lived case | The wiki teaches the rule; the memory anchors it in lived context |
| Bug found, fixed, lesson learned | **Reference memory** + add to CLAUDE.md `## Recent regressions` | The auto-bug-finding-wiki-gate hook ([[reference_bug_finding_wiki_gate]]) may also require a wiki entry under `lessons/` for certain classes |

**Tell-tale: are you naming a pattern or naming an event?** Patterns → wiki. Events → memory. If you find yourself writing a wiki that's full of `2026-05-18 lima session`-style timestamps, that's a memory in wiki clothing — split it.

## `[[backlink]]` semantics

Both wikis and memories use `[[name]]` backlinks. Resolution is by slug (the frontmatter `name:` field):

- `[[fleet-coordination-discipline]]` resolves to `knowledge/wiki/software-engineering/fleet-coordination-discipline.md` (matched by `name:`).
- `[[reference_per_slot_claim_ms0_2026_05_16]]` resolves to `knowledge/memories/reference/reference_per_slot_claim_ms0_2026_05_16.md`.
- A `[[name]]` that doesn't match any existing slug yet is **fine** — it marks something worth writing later, not an error.

Obsidian Graph View visualizes these as nodes + edges. The PRISM `_orphans-rescue.md` pattern ensures every isolated entry has at least one inbound link, keeping effective orphan rate ≈ 0.

**Cross-vault links** (wiki linking to memory or vice versa) work — same syntax, same slug-based resolution.

## Obsidian Graph View — when to use

Open the vault root (`H:/prism/knowledge/`) in Obsidian (the desktop app, NOT the chat). Graph View filters:
- By tag (`tags: [feedback]`)
- By folder (`memories/feedback/`)
- By backlink density (find hub entries)

Use when:
- Exploring a domain's neighborhood (e.g. all entries linking to [[fleet-coordination-discipline]])
- Auditing orphans
- Finding hub vs leaf entries
- Visual debugging of cross-link rot

Don't use Graph View from inside a chat — it's a desktop GUI. The graph-shape info is queryable via `system-graph.json` for chat use.

## Obsidian Dataview queries — audit surface

```dataview
TABLE WITHOUT ID file.name, last_updated, length(file.outlinks) AS "links"
FROM "knowledge/wiki/software-engineering"
WHERE last_updated < date(today) - dur(60 days)
SORT last_updated ASC
```

Returns stale entries with outlink counts — likely candidates for refresh. Run from the Obsidian app's Dataview plugin. Useful for periodic curation passes per [[regression-prevention-doctrine]].

## The recall-hook contract (Obsidian side)

`memory-relevance-inject.mjs` does BM25 over the memory file frontmatter `description:` field plus filename tokens. It returns top-K matches per UserPromptSubmit. See [[recall-injection-flow]] for the full hook chain.

What makes a memory recall-able:
- Specific `description:` with action-rich keywords
- Filename slug that contains the topic ("fleet-reaper" not "the-thing")
- Linked from MEMORY.md (which loads in every session)
- Backlinked from at least one wiki entry (improves graph weight)

What makes a memory NOT recall-able:
- Generic description ("notes from a session")
- Body buried in MEMORY.md instead of own file
- No MEMORY.md pointer (gets seen only via the Obsidian feed if/when that runs)
- No backlinks (graph-isolated; recall scores it lower)

## The dedup discipline

Before writing a new memory, check for existing files covering the same fact. Two reasons:

1. **Duplicate memories rot independently** — fact A in two files diverges over time; future chats can't tell which is authoritative.
2. **Memory recall has a top-K limit** — two near-duplicates eat the K slots that could go to broader-coverage entries.

Pattern: `grep -l "<keyword>" knowledge/memories/*/*.md | head -5` finds candidates. If a fit exists, **update** that file (extend, add a section, update `last_updated:`) rather than creating a new one.

## Anti-patterns

- **Writing memory bodies into MEMORY.md** → blows the 24KB cap, eviction-class corruption.
- **Vague `description:` field** → recall hook never surfaces the memory.
- **Forgetting MEMORY.md pointer** → memory exists but is recall-blind.
- **Writing a wiki when you mean a memory** (timestamped lived-case content in a discipline wiki) → mixed signal, harder to find later.
- **Editing the H: vault directly + expecting C: to update** → the feed is one-way (C: → H:). Edit on C: side, let feed propagate.
- **Linking to a slug that doesn't match a `name:` field** → graph-orphan-on-disk; check the target's frontmatter.
- **Skipping the dedup check before writing a new memory** → drift across duplicates.
- **Writing project-type memory for a single-session task** → bloats `project/`; that's a handoff, not a memory.

## Checklist — writing a memory

- [ ] Right type (`feedback` / `reference` / `project` / `user`)?
- [ ] Dedup check: similar memory already exists? Update it instead.
- [ ] `description:` is specific + keyword-rich for recall?
- [ ] Body has Why + How-to-apply (feedback) OR fact + verify (reference)?
- [ ] Backlinked to at least one wiki entry?
- [ ] One-line pointer added to MEMORY.md (under ~200 chars)?
- [ ] MEMORY.md still under 22KB?
- [ ] Relative dates resolved to absolute?
- [ ] No content that should have been in a wiki instead?

## Verification — is the feed alive?

```bash
# Compare counts (live vs vault):
ls -1 'C:/Users/wompu/.claude/projects/H--PRISM/memory/' | wc -l
ls -1 H:/prism/knowledge/memories/feedback/ H:/prism/knowledge/memories/reference/ \
       H:/prism/knowledge/memories/project/ H:/prism/knowledge/memories/user/ | wc -l

# Last feed run:
ls -la H:/prism/state/shared/.obsidian-feed-stamp 2>/dev/null && echo "feed alive"

# Manual fire (if --force supported by current version):
node H:/prism/.claude/hooks/stop-obsidian-memory-feed.mjs --force
```

If live count >> vault count: feed not firing (knob set, host paused, lockfile stale).

## Related

- [[recall-injection-flow]] — how the Obsidian vault's `memory-relevance-inject` injects on every prompt
- [[wiki-automation-discipline]] — the wiki side's 4-stage propagation
- [[prism-self-update-loop]] — auto-regen backbone (the Stop-hook feed is one trigger)
- [[autonomous-loop-drift-discipline]] — when /loop investigations should become memories
- [[reference_auto_memory_feeds_obsidian_stophook]] — the canonical feed-hook reference
- [[reference_memory_compress_v2]] — MEMORY.md compression cycle
- [[feedback_auto_memory_feeds_obsidian_stophook]] — standing rule on auto-feed
- CLAUDE.md "MEMORY (PRISM Project Memory)" section + global instructions on memory frontmatter
- `.claude/hooks/stop-obsidian-memory-feed.mjs` — the feed source of truth
