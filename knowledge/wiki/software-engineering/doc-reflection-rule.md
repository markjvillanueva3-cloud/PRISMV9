---
name: doc-reflection-rule
category: software-engineering
domain: backend-dev
tags: [doc-reflection, claude-md, memory, wiki, obsidian, propagation, prism-development, ai-development]
last_updated: 2026-05-18
---

# Doc-Reflection Rule — every change-set updates all 4 doc surfaces

The 2026-05-15 user directive: every change-set updates ALL FOUR doc surfaces in the same session. Skipping any one leaves the system inconsistent — future chats reading the un-updated surface will rely on stale doctrine.

## The four surfaces

1. **CLAUDE.md** — pointer index. ≤200 lines of dense pointers + Recent regressions ledger.
2. **MEMORY.md** — auto-memory index. ≤200 lines of one-line memory hooks.
3. **Wiki entries** — `knowledge/wiki/{code-tribal,software-engineering,architecture,lessons,patterns}/` — the doctrine body.
4. **Obsidian memories** — `knowledge/memories/{feedback,reference,project}/` — auto-flows to vault via Stop hook.

A non-trivial change-set touches AT LEAST 2 of these. A doctrine-level change touches all 4.

## When the rule applies

- New mechanism shipped (e.g. tribal backend-dev wiring): CLAUDE.md pointer + wiki entry + memory file
- Regression fixed: CLAUDE.md "Recent regressions" + memory file (if the lesson generalizes)
- Tool/skill added: CLAUDE.md skill-list update (sometimes) + wiki entry
- API contract change: wiki entry (the new contract) + memory file (the migration note)

When NOT to update:
- Code-only refactor with no API change: no doc surface needs an update
- Bug fix that's narrowly local: maybe a memory entry, nothing else
- Already-documented mechanism getting a minor edit: just update the wiki entry; the pointer in CLAUDE.md is still valid

## Propagation surface map

```
                          Change-set
                              │
              ┌───────────────┼───────────────┐
              │               │               │
              ▼               ▼               ▼
        CLAUDE.md          MEMORY.md         Wiki entries
        (pointer +         (auto-memory      (canonical
         regression        index pointer)    doctrine body)
         ledger)                                  │
                                                  │
                                    auto-Stop-hook feed
                                                  │
                                                  ▼
                                          Obsidian vault
                                          (read-only second brain)
```

The 4th surface (Obsidian) is auto-propagated by the Stop-hook feed; you don't manually write to the vault. But the wiki + memory entries you WRITE are what feed it.

## CLAUDE.md update patterns

Two append-only sections:

1. **Recent regressions** — every regression doctrine entry. Format documented in [[regression-prevention-doctrine]].
2. **Body sections** — by milestone or topic. Add a one-paragraph pointer + cross-link to the wiki entry. Keep ≤200 lines total (article research finding: past 200 lines, CLAUDE.md compliance collapses).

Don't write multi-page essays in CLAUDE.md. CLAUDE.md is the index; the body lives in wiki.

## MEMORY.md update patterns

Per the user's "auto memory" system, the MEMORY.md index has one line per memory:

```
- [Title](file.md) — one-line hook (≤200 chars)
```

The detail lives in `<type>_<topic>.md` files alongside. When you ship doctrine, write the memory file AND add the index line.

The size watchdog (`stop-memory-size-watchdog.mjs`) warns when MEMORY.md crosses 22KB; the truncation ceiling is 24KB. Compress old entries to MEMORY-ARCHIVE.md when needed.

## Wiki entry conventions

See [[wiki-index-and-discovery]]. Key:
- Frontmatter (name, category, domain, tags, last_updated)
- 50-150 lines typical
- Cross-link `[[name]]` to related entries
- Title imperative, query-likely

## Obsidian memory file conventions

Per user CLAUDE.md "auto memory" section:
- Frontmatter (name, description, metadata.type)
- Body: rule/fact first, then **Why:** and **How to apply:** lines for feedback/project types
- File named `<type>_<topic>.md` under `knowledge/memories/<type>/`

The Stop-hook feed validates frontmatter before copy.

## The "same session" rule

The 2026-05-15 directive specified "same session". This is load-bearing because:
- Cross-session updates often drift (peer chat ships A, you ship B incompatible with A)
- The lesson is freshest at write-time; a delayed update loses nuance
- The 4 surfaces should stay consistent at every observation point

If a session ends with only 2 of the 4 surfaces updated, the missing 2 become deferred items in the handoff. The next session resumes from there.

## Verification — the 4-surface checklist

After a non-trivial change-set, run mentally:
- Did CLAUDE.md need a pointer or Recent regression entry? Updated?
- Did a memory file capture the cross-session lesson? Index pointer added?
- Is there a wiki entry the next chat would find? Cross-links added?
- Will the Obsidian vault pick it up automatically (memory files yes, wiki via cron)?

If any answer is "no, but should be" — open the missing surface NOW.

## Anti-patterns

- **CLAUDE.md grows without bound** — must stay ≤200 lines; collapse milestone narratives to wiki pointers (per OBSOLESCENCE-CLEANUP-MS0/U-OBS-F2)
- **Memory file with no MEMORY.md index** — entry never surfaces in cross-session recall
- **Wiki entry with no cross-links** — orphan in the graph; reduces discoverability
- **Doctrine in handoff but not in wiki** — handoff is chat-private; the next chat won't find it
- **Recent regression entry without a fail-on-revert test** — the regression CAN recur; the doctrine alone won't catch it

## Cross-surface conflict resolution

When CLAUDE.md says X and wiki says Y, fix BOTH:
- CLAUDE.md is usually the rapid-doctrine entry (newer)
- Wiki has fuller detail (older)
- Reconcile to one canonical statement
- Update both surfaces in the same commit

The wiki wins as authoritative; CLAUDE.md becomes a pointer to the wiki.

## Related

- [[memory-curation-discipline]] — 5-namespace decision matrix
- [[regression-prevention-doctrine]] — Recent regressions back-flow
- [[obsidian-vault-integration]] — Obsidian's data flow
- [[wiki-index-and-discovery]] — wiki recall mechanics
- CLAUDE.md "Doc reflection rule (2026-05-15, user)" — canonical
- feedback_reflect_all_changes_post_update.md — the memory entry
