# Sierra system-viz tribal tips (slot:sierra)

> Domain tribal knowledge for slot:sierra (system-viz). Written 2026-05-29 as the durable, slot-tagged record. Safe filename (NOT `system-viz-*` — that namespace is regen-overwritten). Canonical live embedding is `prism_knowledge:tribal_capture {slot:'sierra', ...}` when MCP :3100 is up; until then this markdown is the source of truth and gets folded into `state/shared/tribal-embed-index.json` on the next embed pass.

---

- **tip:** `system-graph.json` has exactly ONE canonical writer — `regen-viz.mjs`. Never add a second; a second writer silently clobbers the merged 548MB graph and degrades master-index search fleet-wide.
  **context:** when adding any graph-mutation script or "quick fix" that writes the graph.
  **citation:** [[reference_sierra_one_writer_per_path]] · the 2026-05-17 3-writer race + U-VIZ-SPLIT-OUT-FILE fix.
  **slot:** sierra

- **tip:** Every ghost-roost `generate-*-features.mjs` needs BOTH a `regen-viz.mjs` FAST[] entry AND a `merge-augmentations.mjs` splice block. One without the other = the augmentation is silently discarded (no error).
  **context:** when adding a new roost/overlay to the graph.
  **citation:** [[reference_sierra_fast_splice_dual_registration]].
  **slot:** sierra

- **tip:** Never `JSON.parse` or `JSON.stringify(g, null, 2)` the merged graph — at 548MB both blow V8 limits (heap on parse; ~512MB max-string-length on pretty-print) → exit 134. Use `scripts/lib/system-viz-graph.mjs` (capped reader) + compact `JSON.stringify(g)`.
  **context:** any one-liner or script that touches the full merged graph.
  **citation:** [[reference_sierra_graph_oom_classes]] · `.last-regen-failure.json` exit 134 (merge-augmentations OOM).
  **slot:** sierra

- **tip:** A SIGKILLed `merge-augmentations` must ABORT regen — never continue post-merge stages on a stale graph (briefing/drift-gate would publish stale metrics + falsely certify "clean"). The `regen-viz-merge-guard` enforces this (R12 fail-loud).
  **context:** debugging a regen that "succeeded" but with a dropped node count.
  **citation:** [[regen-viz-merge-guard]] · [[reference_u_regen_viz_merge_faillod_2026_05_17]].
  **slot:** sierra

- **tip:** Query the graph BEFORE Grep/Glob — `node scripts/system-viz-query.mjs find <noun>`. A recursive `**` Glob over H:/prism TIMES OUT (548MB graph + 555MB embedding partial + 13K uncommitted files exceed the 20s ripgrep limit).
  **context:** any "where is X / what wires to Y" lookup.
  **citation:** [[reference_sierra_viz_first_search]] · [[feedback_system_viz_first_audit]].
  **slot:** sierra

- **tip:** `generate-system-viz.mjs` writes `architecture-graph.json` (53MB, arch-only), NOT the merged `system-graph.json` — running it standalone is safe (own file) but does NOT refresh the merged surface; follow with `regen-viz.mjs` if you need the merged graph updated.
  **context:** when "regenerating viz" — know which of the two graphs you're touching.
  **citation:** [[reference_sierra_split_out_file]] · U-VIZ-SPLIT-OUT-FILE.
  **slot:** sierra

- **tip:** The graph IS the fleet's search/awareness substrate (master-index, awareness-snapshot, pre-*-graph hooks all read it). A sierra graph mistake is a SILENT fleet-wide search outage — verify schemaVersion + node count + fsCoverage after every regen.
  **context:** before trusting any downstream artifact post-regen.
  **citation:** [[feedback_sierra_graph_correctness_is_fleet_search]].
  **slot:** sierra

- **tip:** Use `system-viz-query.mjs` subcommands beyond `find`: `headline`, `roadmap-candidates` (unwired+pending+drift), `blast-radius <id>` (refactor planning), `dispatcher-summary`, `coverage-by-domain`, `build-order`. There's a DEAD second `find` branch (~line 192, UNREACHABLE) — don't edit it.
  **context:** any "where/what's-unwired/what-breaks-if" question — beats Grep.
  **citation:** [[reference_sierra_viz_query_subcommands]].
  **slot:** sierra

- **tip:** "Regenerate the viz" is ambiguous — there are THREE graphs: system-graph.json (merged, search), architecture-graph.json (3D viewer), _node-embeddings.jsonl (GNN). `generate-system-viz.mjs` only refreshes the ARCH graph; only `regen-viz.mjs` refreshes the merged search graph. Name the target.
  **context:** when asked to "refresh/regen the viz".
  **citation:** [[reference_sierra_three_graphs_consumer_map]].
  **slot:** sierra

- **tip:** Graph dispatcher node ids are `disp.<file-derived>` (e.g. prism_cam → disp.camdispatcher), NOT `dispatcher.<mcp-tool>`. Any generator minting edges to dispatcher/engine nodes must match the existing id prefix (confirm via `system-viz-query find <name>`) or it creates dead-pixel dangling edges.
  **context:** writing a generator that references dispatcher/engine nodes.
  **citation:** [[reference_sierra_dispatcher_id_ssot]].
  **slot:** sierra
