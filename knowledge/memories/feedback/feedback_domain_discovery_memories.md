---
name: feedback-domain-discovery-memories
description: "Fleet/galaxy-wide standing rule: during DISCOVER phases (mapping a domain's existing assets, architecture, transports, gaps), write durable domain memories as you go — not just at close-out. Every slot, every galaxy."
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.422Z
aliases: feedback_domain_discovery_memories
---


# Make domain-discovery memories during discover phases (fleet/galaxy-wide)

**Rule (operator directive, 2026-05-29):** When a slot enters a DISCOVER phase — reconnaissance of what its domain already has (engines, bridges, transports, action surfaces, wiring status, gaps) — it MUST capture the findings as durable domain memories *during* discovery, not only at task close-out. This applies to **every slot / every galaxy**, not just delta.

**Why:** Discovery is the highest-information, lowest-durability moment. A slot spends real tokens mapping its domain (e.g. delta mapping the 3 CAD-app transport models + 43 FunctionIndexEngines + MS-CAM-MASTERY). If that map only lives in the conversation, it evaporates at /compact and the next session re-spends the tokens re-discovering. A memory written mid-discovery survives compaction, auto-feeds the Obsidian brain on Stop, and (via the galaxy MEMORY index + master-index back-pointer) redistributes to the whole fleet. It is the cheapest possible compounding-knowledge investment.

**How to apply:**
1. As soon as a discovery batch resolves a real fact about the domain (architecture, transport, wiring status, a confirmed gap, a "do-not-rebuild — already exists" finding), write a `reference_<slot>_<topic>_<date>.md` memory — concise, pointer-dense, with `[[links]]`.
2. Don't wait for the whole audit to finish. Multiple small discovery memories > one giant close-out memory.
3. Index it: galaxy `mcp-server/src/engines/<galaxy>/MEMORY.md` + (overflow) `state/shared/MEMORY-RECENT.md`. The Stop hook mirrors C: memory → `H:/knowledge/memories/<type>/` automatically.
4. Discovery memories are first-class galaxy-brain nodes — they feed the PSN circulation layer (CONN-3 DOWN push to vault, CONN-4 master-index back-pointer).

Sister doctrine: [[feedback_always_capture_lessons]] (mistakes) · [[feedback_reflect_all_changes_post_update]] (4-surface reflection) · [[reference_domain_galaxy_doctrine_2026_05_26]] (per-galaxy brain).
