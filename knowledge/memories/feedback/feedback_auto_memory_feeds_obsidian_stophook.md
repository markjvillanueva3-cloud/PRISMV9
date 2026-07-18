---
name: auto-memory-feeds-obsidian-stophook
description: Standing rule — auto-memory files must auto-feed the Obsidian vault via a dedicated Stop hook; how the feed + its bug fixes work
aliases: feedback_auto_memory_feeds_obsidian_stophook
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.399Z
---


# Auto-memory must auto-feed Obsidian (dedicated Stop hook)

**Rule (user directive, 2026-05-18):** memories written to the auto-memory dir
(`C:/Users/wompu/.claude/projects/H--PRISM/memory/*.md`) must automatically
feed into the Obsidian vault (`H:/prism/knowledge/memories/<type>/`). This is a
**Stop hook**, not a manual step.

**Why:** I observed the existing wiring was unreliable — `stop-obsidian-memory-extract.mjs`
*did* spawn `obsidian-memory-sync.mjs`, but only AFTER a 5-min rate-limit + a
transcript + a ≥5-message gate + the Ollama-extraction path. Across 13 chats
that path is almost always gated, so the memory→Obsidian feed effectively
never ran reliably.

**How to apply:**
- The dedicated hook is `.claude/hooks/stop-obsidian-memory-feed.mjs` — single
  job: spawn `scripts/obsidian-memory-sync.mjs --quiet` detached on Stop, with
  its OWN throttle stamp (`PRISM_OBSIDIAN_FEED_INTERVAL_MS`, default 3 min,
  GLOBAL/shared across the fleet — the sync is idempotent so one run per window
  fleet-wide suffices). Decoupled from Ollama entirely. Knobs:
  `PRISM_OBSIDIAN_FEED_DISABLE=1`, `PRISM_OBSIDIAN_FEED_INTERVAL_MS=N`.
- Wired as an individual Stop entry in both `C:` and `H:` settings.json
  (after `stop-obsidian-memory-extract`), NOT into a bundle.
- Two real bugs were fixed in `obsidian-memory-sync.mjs` while wiring this:
  1. **Type mis-routing** — the frontmatter parser only handled FLAT
     `type: x`, but the auto-memory format nests it (`metadata:\n  type:
     reference`). Result: every memory mis-filed to `memories/` root instead
     of `memories/<type>/`. Fixed with an any-indentation `type:` fallback +
     junk whitespace-`metadata`-key drop.
  2. **Vault corruption risk** — the sync had NO lock and bare
     `fs.writeFileSync`; two concurrent runs (extract hook + this hook ×
     13 chats) could interleave a partial write. Fixed with an O_EXCL
     lockfile (`.obsidian-memory-sync.lock`, 120s stale-break) that
     serializes runs; a second concurrent run skips losslessly (it rewrites
     the whole vault from the whole memory dir).
- A non-destructive `reconcileLegacyRoot()` MOVES (never deletes — see
  [[feedback_never_delete_only_disable]]) root `*.md` with a typed twin into
  `memories/_legacy-root/`. First run moved 265 stale dupes.

**Doctrine link:** this is the mechanism behind the 4-surface reflection rule
([[feedback_reflect_all_changes_post_update]]) — writing an auto-memory file
now self-propagates to Obsidian on the next Stop. Wiki:
`knowledge/wiki/architecture/obsidian-memory-feed-hook.md`.
