---
name: feedback_bravo_verify_cited_paths_before_enshrining
description: Glob-verify every cited engine/script/wiki path before writing it into a doc — asset hallucination is a stub by another name
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.416Z
aliases: feedback_bravo_verify_cited_paths_before_enshrining
---


Before enshrining ANY file path in a galaxy doc, hook, skill, or memory, glob-verify it exists on disk.

**Why:** A doc citing a nonexistent path reads as "wired" but breaks the moment anyone follows the pointer — it is the sibling sin of the `toBeDefined()` stub. alpha's hermes-zulu scaffold (2026-05-28) cited 3 nonexistent assets (`MoonshotInvocationEngine.ts`, `audit-stub-assertions.mjs`, 3 wiki entries) while its OWN anti-pattern list named "referencing an engine that doesn't exist." The failure is easy to commit even while naming it.

**How to apply:** A narrow path-scoped brace-glob (`*{Moonshot,Hermes,Zulu}*` in `mcp-server/src/engines`) costs one tool call and catches the whole class. Fold it into `/stub-hunt-bravo` step 5. R8 + R12. See [[asset-hallucination-class]] (wiki).
