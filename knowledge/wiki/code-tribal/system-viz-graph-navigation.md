---
name: system-viz-graph-navigation
category: code-tribal
domain: backend-dev
tags: [system-viz, graph, master-index, navigation, discovery, prism-development, ai-development]
last_updated: 2026-05-18
---

# System-Viz Graph Navigation — query before reading code

PRISM's system-graph.json carries 20K+ nodes and 77K edges across 12 layers. The graph IS the single-source-of-truth for "what exists, what wires to what, what's an orphan". Reading it correctly is a 30-second answer; ignoring it is a 30-minute hunt.

## The four canonical query surfaces

1. **/master-index <query>** — top-K hits from system-graph + Obsidian + wiki. Fastest entry; runs automatically on every prompt.
2. **prism_session:master_index_query** action — programmatic version. Returns node id + kind + layer + path + 1-line desc.
3. **prism_session:master_index_node_status <id>** — drill into a specific node. Returns wired/orphan/ghost state + 1-degree neighbors.
4. **/system-viz** — opens the 3D viz at :8765. Visual navigation; best for graph topology questions.

## When to query the graph vs grep

Query the graph when asking:
- "Does X exist?" (graph holds 20K nodes, 23K wiki entries; faster than file search)
- "What wires to X?" (graph edges are the answer; grep would miss reverse edges)
- "Is X an orphan?" (graph degree-counts answer directly)
- "What other nodes are like X?" (master-index keyword search finds siblings)

Grep when:
- The answer is a literal text match (a specific symbol, a string constant)
- The graph is stale (rare; regenerated post-commit)
- You're looking for code patterns, not entities

## Layer taxonomy (12 layers)

| Layer | What |
|-------|------|
| L0 | Root system entities |
| L1 | Process / orchestration |
| L2-L3 | Architectural categories |
| L4 | Dispatchers (97) |
| L5 | Engine domains (42) |
| L6-L7 | Engines (3274) |
| L8 | Skills + hooks (94 hooks + 276 skills) |
| L9 | Tools + utilities |
| L10 | Wiki + memory leaves (20223) |
| L11-L12 | Filesystem coverage |

Use the kind field (engine / dispatcher / hook / skill / wiki / memory / formula), NOT layer numbers, when filtering — layers are an organizing structure, not a hard contract.

## The "orphan" classification

A node is an orphan when:
- in-degree = 0 AND out-degree = 0 (truly unwired)
- in-degree = 1 AND out-degree = 1 (singleton; possibly intentional wrapper)

PRISM's awareness snapshot surfaces orphans at L7 explicitly. Cross-reference with the engine docstring's WIRE-EXEMPT tag before treating an orphan as a bug.

## The "ghost" classification

A ghost node has documentation (wiki entry, docstring) but no implementation file or has implementation but no dispatcher wiring. Two flavors:

- ghost.unwired-engine: engine file exists, no dispatcher case references it
- ghost.misc-task / ghost.priority-queue / ghost.bridge-synergy: roadmap units surfaced into the graph

Ghosts are the punch list. /system-viz shows them as a separate roost; high-leverage backend-dev work often lives here.

## The 3 graph writers (load-bearing — don't break this)

system-graph.json has 3 independent writers. CLAUDE.md documents the race:

- scripts/generate-system-viz.mjs (architecture-graph.json now, post U-VIZ-SPLIT-OUT-FILE)
- scripts/regen-viz.mjs (the canonical merged 370K-node graph)
- scripts/system-viz-add-node.mjs (incremental add-node with PID lock)

Never `writeFileSync(SYSTEM_GRAPH_JSON, ...)` from any other script. Use one of the 3 canonical paths.

## Pre-read graph injection (PostToolUse:Read)

When you Read a documented source file, the pre-read hook injects top-3 graph hits for the file's symbol. Use these to spot related code before scrolling.

## When the graph is wrong

Possible failure modes:
- Graph not regenerated since recent commits (check meta.generatedAt)
- Merge collision wiped fsCoverage (CLAUDE.md "Recent regressions 2026-05-17" documents this)
- Augmentation script crashed mid-merge (regen-viz-merge-guard catches via post-merge state check)

Fix: node scripts/regen-viz.mjs (full regenerate, ~8min). Or scripts/regen-wiki-from-viz.mjs (faster; wiki-only).

## Related

- [[wiki-index-and-discovery]] — sibling discovery layer
- [[code-archaeology-patterns]] — the 5-tool archaeology stack
- [[engine-creation-playbook]] — register new engines in the graph
- CLAUDE.md "Wiki brain (live · auto-generated from the system-viz graph)"
- CLAUDE.md "MASTER INDEX + AWARENESS STACK"
