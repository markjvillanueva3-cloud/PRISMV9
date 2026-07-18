---
type: "chat-session"
source: "claude-code-cli"
session_id: "109ba448-4d7d-43ac-9e0c-1355c726e220"
title: "You are the synthesis lead for a PRISM system-viz improvement audit (owner: slot"
date: "2026-06-02"
first_ts: "2026-06-02T01:38:04.383Z"
last_ts: "2026-06-02T01:39:23.336Z"
cwd: "H:\\prism-slot-sierra"
messages: 2
user_msgs: 1
assistant_msgs: 1
raw_file: "H:/.claude/projects/H--prism-slot-sierra/109ba448-4d7d-43ac-9e0c-1355c726e220/subagents/workflows/wf_2728b2c4-0da/agent-a8045ce07e3705465.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:10"
---

# You are the synthesis lead for a PRISM system-viz improvement audit (owner: slot

> **claude-code-cli** | 2026-06-02 | 2 msgs (1 user / 1 assistant) | cwd: H:\prism-slot-sierra
> Raw: `H:/.claude/projects/H--prism-slot-sierra/109ba448-4d7d-43ac-9e0c-1355c726e220/subagents/workflows/wf_2728b2c4-0da/agent-a8045ce07e3705465.jsonl`

## Transcript

### User | 2026-06-02T01:38:04.383Z

You are the synthesis lead for a PRISM system-viz improvement audit (owner: slot sierra, domain = system-viz usability/integration/utilization). Below are 5 facet reports from parallel code-analyzer agents.

Produce ONE consolidated, DEDUPED, dependency-ordered ranked punch list of the top system-viz improvements. For each item: title, source facet, tag [LEAN+SAFE no-graph-load] vs [HEAVY needs-graph-load/regen], value (high/med/low), dependency notes, file:line anchor, and whether it is shippable NOW on a memory-strained (YELLOW) host that must avoid 695MB graph loads.
Rules: (1) Put the single BEST item that is BOTH high-value AND [LEAN+SAFE]-shippable-now at the very top, marked '== RECOMMENDED NEXT =='. (2) Separately list the best [HEAVY] item worth doing once the host is healthy. (3) If two facets contradict each other, surface the contradiction explicitly and pick the more defensible side with a reason — do NOT average them. (4) Keep it concrete and skimmable.

FACET REPORTS:

===== Viewer UX =====
I have both files fully read plus the awareness snapshot. Here is my exhaustive ranked analysis of the next-highest-value Viewer UX gaps, deliberately excluding the just-shipped deep-link chain.

# System-Viz Viewer UX Audit — Ranked Improvement Opportunities

## 1. Side panel is keyboard-inescapable and not focus-managed (WAI-ARIA dialog gap)
- **Anchor:** `viz3d.html:82-91` (`#sidepanel`), `441-443` (close handler), `448-455` (keydown)
- **Tag:** [LEAN+SAFE] · **Value:** high
- **Rationale:** The panel opens with status/notes/neighbors but has no `role="dialog"`, no `aria-modal`, no focus move into it on open, and no focus return on close. A keyboard/screen-reader user clicking a node (or landing via `?node=`) never has focus moved to the panel, the close button is reachable only by tabbing blindly past the canvas, and `Escape` clears the search *and* closes the panel as one combined action (you can't dismiss the panel while keeping a search active).
- **Fix sket
... [+87246 chars truncated]

### Assistant | 2026-06-02T01:39:23.336Z

== RECOMMENDED NEXT ==

**Sampled-view honesty banner — "coverage % / gap counts are over the 5k sample, not the full graph"**
- **Source facets:** Viewer UX #4 (corroborated by Search/Awareness #5, Server-endpoints #12)
- **Tag:** [LEAN+SAFE no-graph-load]
- **Value:** HIGH
- **Anchors:** `viz3d.html:179-190,277-289` (`updateStats`), `viz3d.html:279-280` (`covered / snap.nodes.length`), `_server.cjs:418` (`noteCount` projection)
- **Shippable NOW on YELLOW host?** YES — pure client-side caption + one `snap.totalNodes` divisor change; verified by opening `/3d` against a running `_server.cjs`, never touches the 695MB graph.
- **Why it wins:** It is the single highest-value item that is BOTH high-value AND lean-shippable-now, and it is the one improvement THREE independent facets flagged as actively misleading (R12 "fail loud"). The just-shipped `gap`/`brain`/match-count surface (`U-SV-SEARCH-MATCH-COUNT`) currently reads as fleet-wide truth while it is computed over a biased 5k sample of a ~50k–300k-node graph. Every other lean item improves usability; this one stops the viewer from lying. Two sub-fixes ship together: (a) divide brain% by `snap.totalNodes` not `snap.nodes.length`; (b) prefix the gap/brain/coverage readouts with "in sample:" and add a persistent dim caption when `sampledNodes < totalNodes`.

---

## Top LEAN+SAFE punch list (shippable NOW on YELLOW host, dependency-ordered)

These are all pure client-side / small-sidecar edits requiring no 695MB graph load to build OR verify. Ordered so foundations come before consumers.

1. **[A11Y FOUNDATION] Keyboard navigation of matched nodes + dialog focus management** — Viewer UX #1+#2 — value HIGH — `viz3d.html:82-91,297-321,441-455`. The viewer is mouse-only and the side panel is an unmanaged focus trap. Build `matchedIndices[]` in `applySearch`, bind Enter/Arrows to cycle matches, add `role="dialog" aria-modal` + focus move/return. **Dependency:** #2 below (frame-to-match) reuses the `matchedIndices[]` array
... [+7988 chars truncated]
