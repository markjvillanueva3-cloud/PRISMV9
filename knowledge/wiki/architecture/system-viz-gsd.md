---
title: System-Viz GSD — domain operating protocol
type: architecture
tags: [system-viz, gsd, regen-viz, runbook, sierra, protocol]
status: active
maintainer: sierra
created: 2026-05-29
---

# System-Viz GSD — domain operating protocol

`mcp-server/src/engines/system-viz/GSD.md` is the galaxy's **5th brain file** — the executable runbook for operating on the system-viz graph safely. Auto-loads with the galaxy CLAUDE.md. Complements the fleet-wide `mcp-server/data/docs/gsd/GSD_QUICK.md` (session lifecycle) with the domain-specific lifecycle. Sibling pattern across the fleet: lathe/cam/speed-feed GSDs.

## Why a domain GSD
Sierra's doctrine (CLAUDE.md rules, MEMORY.md regression classes) says WHAT to do/refuse; the GSD says HOW — the exact safe sequence. The graph is 548 MB (V8 caps routinely hit) AND the fleet search substrate, so the operating sequence is load-bearing: the difference between a clean regen and a silent fleet-wide search outage is following the verify ritual.

## The 8 sections
0. **Prereqs** — one-writer doctrine; large `--max-old-space-size`; graph is the fleet search substrate.
1. **Regen safely** — `node scripts/regen-viz.mjs` (FAST[]→merge→repair→dedup→reparent→parent-edges→seed-ghost→drift-gate); fail-loud at merge via [[regen-viz-merge-guard]].
2. **Add a ghost roost** — the dual-registration checklist (FAST[] + merge-augmentations splice; verify via `system-viz-query find`).
3. **Verify health** — read `.last-successful-regen.json` (pendingCount=0, sidecarOk, ts newer than failure) + smoke `find`.
4. **Recover from OOM regen (exit 134)** — assess → git restore if corrupted → clean scratch → isolate merge → re-run.
5. **Search via the graph** — the verified `system-viz-query` subcommands (find/headline/roadmap-candidates/blast-radius/dispatcher-summary/coverage-by-domain/worktrees/build-order).
6. **The three graphs** — merged (search) vs architecture-graph (3D viewer) vs embeddings (GNN); each its own writer+consumer.
7. **Dispatcher-id SSOT** — `disp.<file-derived>` not `dispatcher.<mcp-tool>` (dead-pixel prevention).

## See also
[[system-viz-galaxy]] · [[regen-viz-merge-guard]] · [[viz-domain-coverage]] · [[reference_sierra_domain_gsd_2026_05_29]] · [[reference_sierra_viz_query_subcommands]] · [[reference_sierra_three_graphs_consumer_map]]
