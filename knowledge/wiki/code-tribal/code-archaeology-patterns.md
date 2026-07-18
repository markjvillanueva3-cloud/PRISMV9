---
name: code-archaeology-patterns
category: code-tribal
domain: backend-dev
tags: [code-archaeology, refactor, dependency-trace, system-understanding, ai-development]
last_updated: 2026-05-18
---

# Code Archaeology Patterns — understanding a codebase before changing it

Karpathy R8 ("Read before you write") demands you understand existing code before adding to it. In PRISM, with 3274 engines + 97 dispatchers + 23981 wiki entries + 54 hooks, you cannot understand everything — but you CAN understand the relevant slice efficiently.

## The 5-tool archaeology stack

1. **`/system-viz` + `prism_session:master_index_query`** — graph + node-status lookup. *START HERE.* Answer "does X exist? what wires to Y?" before reading any code.
2. **`/wiki-query <name>`** — fetch the wiki entry. Don't re-derive what the wiki documents.
3. **Glob + Grep for symbol lookup** — when you need the exact code, not the abstract description.
4. **Read of the file end-to-end** — ONLY after #1-3. Skipping context to read code wastes tokens.
5. **`git log -p path/to/file`** — when the WHY isn't in the code or wiki.

The hooks (`viz-first-redirect-glob`, `wiki-precheck-inject`, `master-index-precheck-inject`) automate steps 1-2 on every prompt — don't fight them.

## Pattern 1 — "Does this engine exist?"

Wrong: `Grep -r "MyEngine"` (slow, polluted by .ts files importing it).
Right:
```
prism_session:master_index_query "MyEngine"  → returns L7/built|L7/stub|<not-found>
```
If found: read its wiki entry. If not: `ENGINE_DIGEST.md` has 1-line descriptions for all 3274.

## Pattern 2 — "What wires this engine to dispatchers?"

```
/wiki-query <EngineName>      → wiki frontmatter has `wired_in:` field if known
prism_dev:rev_idx_engine_to_dependents → live reverse-index lookup
```
A zero-result on dependents means the engine is an ORPHAN — see [[dispatcher-wiring-pattern]] for the fix protocol.

## Pattern 3 — "What broke this test?"

Wrong: assume the test is wrong; modify it to pass.
Right:
```
git log -p path/to/test.ts         # what did the test originally assert?
git blame path/to/production.ts     # what production change touched the asserted path?
```
The 2026-05-17 fleet-reaper-tier-test class was caused by a production constant lowering (95→88); the test still asserted 95. Reading the recent production diff found the root cause in 30 seconds.

## Pattern 4 — "Why is this code shaped this way?"

The first instinct is to refactor. Suppress it. R11 says match conventions even when you disagree.

The check before refactoring:
1. Read the immediate caller. What does it expect?
2. Read the wiki entry. Is there a documented reason for the shape?
3. Read the git log for the last 3 commits touching this file. Was there a reverted refactor?
4. Read the test. Does it lock in the shape?

If all four say "no documented reason", the refactor is *probably* safe. If any one of them documents a reason, you're touching load-bearing code.

## Pattern 5 — "Find the load-bearing invariant"

Every PRISM engine has 1-3 load-bearing invariants. Examples:
- `DOMAIN_MAP` declaration order in tribal-by-domain-inject (first-match-wins).
- `WRITE_ORDER` in atomic write helpers (write tmp BEFORE rename, never reverse).
- `MIN_CONFIDENCE` filter post-blend (not pre-blend — the 2026-05-18 master-index-query bug).

Find them in:
- The wiki entry's "Critical invariants" section.
- The test file's "regression-guard" tests.
- CLAUDE.md's `## Recent regressions` entries naming the file.

**The invariants are the contract.** Code shape can change; invariants can't.

## Pattern 6 — "Is this an orphan or a singleton wrapper?"

An orphan engine has no dispatcher wiring AND no caller. A singleton-wrapped engine has no direct dispatcher wiring but IS called via its wrapper.

Detect by:
```bash
grep -l "MyEngine" mcp-server/src/   # all callers
# If only file is MyEngineSingleton → wrapped, check the singleton's wiring
# If zero files → orphan, see [[dispatcher-wiring-pattern]]
```

The `// WIRE-EXEMPT: <reason>` tag in the engine declares the singleton wrapper.

## Pattern 7 — "Find similar prior work to avoid duplication"

R8 dedup-preflight, before any new asset:

```bash
duplicationGuardEngine.mustCheckBeforeCreating({
  assetType: "engine",
  proposedName: "MyEngine",
  keywords: ["chatter", "stability"],
  description: "..."
});
```

Throws if a duplicate exists. Use IT before writing a new engine.

## The "history-spread" check (5-second discipline)

Before any non-trivial change to a file:

```bash
git log --oneline -5 path/to/file
```

Five recent commits in the same area = active development by multiple chats. **Coordinate via chat-bus** (`prism_context:chat_post`) before editing — a peer may be mid-refactor in the same region.

## When code archaeology is faster than asking

Asking the user "what does this engine do?" wastes a turn. Reading the wiki entry (3 seconds) or the engine docstring (3 seconds) answers it without the turn. **Default to archaeology; ask only when the docs are silent on the actual question.**

## Related

- [[karpathy-12-rule-discipline]] — R8 (read before write), R11 (match conventions)
- [[dispatcher-wiring-pattern]] — orphan diagnosis + fix protocol
- [[regression-prevention-doctrine]] — find the load-bearing invariants
- CLAUDE.md §"FAST RESOURCE LOOKUP" — the digests + DSL shortcodes
- CLAUDE.md §"MASTER INDEX + AWARENESS STACK" — the search-first discipline
