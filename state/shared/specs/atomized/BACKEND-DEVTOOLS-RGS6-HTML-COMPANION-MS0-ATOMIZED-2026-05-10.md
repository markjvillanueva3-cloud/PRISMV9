---
milestone: HTML-COMPANION-MS0 (extended)
parent_roadmap: BACKEND-DEVTOOLS-RGS6-MEGA-ROADMAP-2026-05-10.md
inherits_protocol: BACKEND-DEVTOOLS-RGS6-AUTONOMOUS-EXECUTION-PROTOCOL.md (§7 implicit)
assigned_lane: lane-D-html-surfaces
commit_prefix: "[lane-D-html-surfaces][HTML-COMPANION-MS0]"
total_units: 6
critical_path_role: foundation for HTML-PRIMARY-MS0 generalization; consumed by every spec render path
loop_registrations: 1 (drift guard per-commit)
date: 2026-05-10
---

# HTML-COMPANION-MS0 — atomized (extended)

> The foundation HTML render layer. HTML-PRIMARY-MS0 generalizes this for all strategic specs.

---

## HC-0 — Build `SpecHTMLCompanionEngine` (entry, mirror of U-HPS01)

See `HTML-PRIMARY-MS0-ATOMIZED` U-HPS01 for full micro_steps. **This milestone OWNS the engine build; HTML-PRIMARY-MS0 consumes it.**

- depends_on: []
- blocks: [HC-1..HC-5, U-HPS01..07]

---

## HC-1 — Generalize `emit-revenue-roadmap-html.mjs` → `emit-spec-html.mjs`

- pillar: html
- tier: T1
- ai_priority_score: 65
- leverage_score: 11
- why: peer chat shipped revenue version; generalize for all spec types
- depends_on: [HC-0]
- blocks: [HC-3, HC-4]
- parallel_with: [HC-2]
- viz_node_id: `core.script.emitspechtml` (TBD-create)
- closes_synergy_edge: docs × pipeline
- loop_schedule: none

verifies_via:
  channel: render
  tool: `node scripts/emit-spec-html.mjs state/shared/specs/BACKEND-DEVTOOLS-RGS6-MEGA-ROADMAP-2026-05-10.md`
  expected_signal: `.html` produced, validates W3C
  re_run_cost: 3s
  baseline: revenue-roadmap only

micro_steps:
  - step-1:
      tool: Read
      path: `scripts/emit-revenue-roadmap-html.mjs`
      action: extract reusable pattern (Marked.js setup, frontmatter parse, output structure)
      verify: file readable
  - step-2:
      tool: Write
      path: `scripts/emit-spec-html.mjs`
      action: generalize — accept any MD path, dispatch to SpecHTMLCompanionEngine.render()
      verify: script runs
  - step-3:
      tool: Bash
      path: `H:/prism/`
      action: smoke render on this very file
      verify: `.html` twin produced

adversarial_cases:
  - MD with non-UTF8 content
  - MD with malicious script tags

variability_axis:
  - research-card / roadmap / audit / dossier inputs (4 types)

failure_modes:
  - file read fail → exit 1 with path
  - render error → emit error.html + log

---

## HC-2 — Theme support (dark/light, prefers-color-scheme media)

Same as U-HPS03 (HTML-PRIMARY-MS0). This is the foundation; HPS03 hardens it.

- depends_on: [HC-0]
- blocks: [U-HPS03]
- viz_node_id: shared with U-HPS03

(see U-HPS03 micro_steps in HTML-PRIMARY-MS0-ATOMIZED file)

---

## HC-3 — Anchor-link navigation + Mermaid embed

- pillar: html
- tier: T1
- ai_priority_score: 60
- leverage_score: 10
- why: long roadmaps need anchor navigation; Mermaid diagrams render dependency graphs
- depends_on: [HC-1]
- blocks: [U-HPS04]
- parallel_with: [HC-4]
- viz_node_id: `core.js.mermaid_embed_module` (TBD-create)
- closes_synergy_edge: html × diagram
- loop_schedule: none

verifies_via:
  channel: render
  tool: render `BACKEND-DEVTOOLS-RGS6-MEGA-ROADMAP-2026-05-10.md` with mermaid block → check `<svg>` in output
  expected_signal: SVG mermaid rendered correctly
  re_run_cost: 2s
  baseline: mermaid not embedded

micro_steps:
  - step-1:
      tool: Edit
      path: `mcp-server/src/engines/SpecHTMLCompanionEngine.ts`
      action: post-process ```mermaid blocks → embed mermaid.js CDN + script init
      verify: TS compiles
  - step-2:
      tool: Bash
      path: `H:/prism/`
      action: render test, grep SVG
      verify: `node scripts/emit-spec-html.mjs <md> && grep '<svg' <md>.html` non-empty

adversarial_cases:
  - mermaid syntax error
  - 1000-node graph (oversize)

variability_axis:
  - flowchart / sequenceDiagram / gantt / classDiagram

failure_modes:
  - mermaid parse error → emit error placeholder
  - CDN down → bundle local fallback
  - oversize → paginate

---

## HC-4 — Accessibility hook (WAI-ARIA)

Mirror of U-HPS05 (HTML-PRIMARY-MS0). HTML-COMPANION owns the BASE check; HTML-PRIMARY adds axe-cli gate.

- depends_on: [HC-1]
- blocks: [U-HPS05]
- viz_node_id: shared with U-HPS05

(see U-HPS05 micro_steps in HTML-PRIMARY-MS0-ATOMIZED)

---

## HC-5 — MD↔HTML drift guard (hash on regen)

Mirror of U-HPS06.

- depends_on: [HC-1]
- blocks: [U-HPS06]
- viz_node_id: shared with U-HPS06

(see U-HPS06 micro_steps)

---

## §X — Closing notes

**Lane ownership:** lane-D-html-surfaces.

**Critical-path:** HC-0 → HC-1 → fan-out (HC-2..HC-5 parallel). Then HTML-PRIMARY-MS0 generalizes for all spec types.

**Cron:** HC-5 drift guard runs per-commit.

**Synergy closed:** 3 (docs × pipeline, html × diagram, html × accessibility).
