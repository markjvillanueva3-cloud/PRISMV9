---
type: "chat-session"
source: "claude-code-cli"
session_id: "d7f7d3ce-a207-4b0e-ab35-3c2dc1ff3b9f"
title: "Build a PHASED BUILD ROADMAP for the PRISM networking platform. Strategy + parit"
date: "2026-05-29"
first_ts: "2026-05-29T20:24:39.514Z"
last_ts: "2026-05-29T20:27:09.513Z"
cwd: "H:\\prism-slot-hotel\\mcp-server"
messages: 18
user_msgs: 8
assistant_msgs: 10
raw_file: "H:/.claude/projects/H--prism-slot-hotel/d7f7d3ce-a207-4b0e-ab35-3c2dc1ff3b9f/subagents/workflows/wf_a8810cf0-6e4/agent-a258c0b3073ee03ef.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:53"
---

# Build a PHASED BUILD ROADMAP for the PRISM networking platform. Strategy + parit

> **claude-code-cli** | 2026-05-29 | 18 msgs (8 user / 10 assistant) | cwd: H:\prism-slot-hotel\mcp-server
> Raw: `H:/.claude/projects/H--prism-slot-hotel/d7f7d3ce-a207-4b0e-ab35-3c2dc1ff3b9f/subagents/workflows/wf_a8810cf0-6e4/agent-a258c0b3073ee03ef.jsonl`

## Transcript

### User | 2026-05-29T20:24:39.514Z

Build a PHASED BUILD ROADMAP for the PRISM networking platform. Strategy + parity matrix + moat: 
`MTConnectLiveStatusEngine` and `InstantQuoteEngine` both confirmed present. The GNN engine isn't under that name pattern in this worktree (it's a checkpoint artifact + tier-5 classifier per the brief, and the galaxy memories note data-galaxy assets live in main, not this hotel worktree) — I'll mark that honestly in the moat thesis. I have enough verified ground truth. Synthesizing now.

---

# PRISM Platform Strategy — Beating "Find Manufacturing Capacity. By Process."

> Verified against the `slot/hotel` worktree: `InstantQuoteEngine.ts` (self-labeled "Xometry-killer instant pricing pipeline") and `MTConnectLiveStatusEngine.ts` are real and present; `VendorEngine` is confirmed **UNWIRED** (0 refs in `businessDispatcher.ts`); the GraphSAGE GNN is a checkpoint/tier-5 classifier living in the **main** tree, not this worktree — flagged honestly below. Everything marked "have" cites a file or dispatcher action that exists; everything marked "build" is named as a gap, not bluffed.

---

## 1. Feature-Parity Matrix

Legend: ✅ have · 🟡 partial · ❌ none · 🔧 build-required (PRISM has the components, not the productized surface)

| Capability | Axhera (boss) | Xometry | Fictiv | Protolabs | **PRISM (target)** — engine citation |
|---|---|---|---|---|---|
| **Supplier directory / discovery** | ✅ 8 process networks, US-only, filter by machine/material/tol/cert | ✅✅ Thomasnet 500k suppliers, 20M sessions/yr (owned-traffic moat) | ❌ curated/hidden network | 🟡 250–300 hidden partners, no browse | 🔧 **build** — only `jm-die-vendor-registry.json` (174 single-shop vendors) on disk. `PurchasingDirectoryEngine` (wired) + `VendorEngine` (UNWIRED) are the scaffolds. No nationwide DB exists. |
| **Buyer↔supplier matching** | 🟡 process-tag + capacity filter (rules) | ✅ opaque algorithmic assignment + perf score | ✅ AI+human routing (hidden) | ✅ competitive-auction routing (hidden) | 🔧 **build
... [+54288 chars truncated]

### Assistant | 2026-05-29T20:24:54.704Z

I'll synthesize the phased build roadmap from the verified ground truth in the brief. The strategy/parity/moat work is done — now I'll structure the actual phased buildout with explicit reuse-vs-build mapping, slot ownership, dispatcher actions, and proof-points per phase.

Let me verify a couple of load-bearing claims before committing the roadmap to writing — specifically the `VendorEngine` UNWIRED status and the businessDispatcher action count in this worktree, since those drive the "build-then-wire-in-main" cadence.

### Assistant | 2026-05-29T20:24:56.137Z

[tool_use: Grep]

### Assistant | 2026-05-29T20:24:57.542Z

[tool_use: Grep]

### Assistant | 2026-05-29T20:24:57.938Z

[tool_use: Glob]

### User | 2026-05-29T20:25:00.483Z

[tool_result] No matches found

Found 0 total occurrences across 0 files.

### User | 2026-05-29T20:25:01.599Z

[tool_result] No files found

### User | 2026-05-29T20:25:01.601Z

[tool_result] 139:        await import("../../engines/PurchasingDirectoryEngine.js")

### Assistant | 2026-05-29T20:25:12.123Z

The Glob path was relative to the worktree root incorrectly. Let me confirm the engine files exist and get the real dispatcher action count.

### Assistant | 2026-05-29T20:25:12.622Z

[tool_use: Glob]

### Assistant | 2026-05-29T20:25:13.068Z

[tool_use: Glob]

### Assistant | 2026-05-29T20:25:13.935Z

[tool_use: Glob]

### Assistant | 2026-05-29T20:25:16.235Z

[tool_use: Bash]

### User | 2026-05-29T20:25:17.611Z

[tool_result] src\engines\InstantQuoteEngine.ts

### User | 2026-05-29T20:25:17.630Z

[tool_result] src\engines\VendorEngine.ts

### User | 2026-05-29T20:25:19.214Z

[tool_result] src\engines\MTConnectLiveStatusEngine.ts

### User | 2026-05-29T20:25:37.994Z

[tool_result] 393
---instant_quote refs---
33: *   Instant Quote (3): instant_quote, instant_quote_qty_breaks, instant_quote_lead_time
454:  "instant_quote",
455:  "instant_quote_qty_breaks",
456:  "instant_quote_lead_time",
1388:          case "instant_quote": {
1389:            const { instantQuoteEngine } = await import("../../engines/InstantQuoteEngine.js");
1393:          case "instant_quote_qty_breaks": {
... [+251 chars truncated]

### Assistant | 2026-05-29T20:27:09.513Z

Ground truth confirmed: `VendorEngine` is UNWIRED (0 refs in businessDispatcher), all three engines exist, `instant_quote` triad is wired, and the worktree dispatcher has 393 case actions (the brief's ~383/441 ballpark — stale vs main's 879, confirming the build-then-wire-in-main cadence). I have enough verified ground truth. Synthesizing the roadmap.

---

# PRISM Networking Platform — Phased Build Roadmap

> **Verified ground truth (slot/hotel worktree, 2026-05-29):** `InstantQuoteEngine.ts`, `MTConnectLiveStatusEngine.ts`, `VendorEngine.ts` all present on disk. `instant_quote` / `instant_quote_qty_breaks` / `instant_quote_lead_time` are WIRED (businessDispatcher L1388–1399). `PurchasingDirectoryEngine` is the only directory-shaped engine wired (dynamic import L139). **`VendorEngine` is UNWIRED — 0 references in businessDispatcher.** Worktree businessDispatcher = 393 case actions (stale vs main's 879). GraphSAGE GNN checkpoint + data-galaxy stores live in **main**, not this worktree.
>
> **Wiring cadence (load-bearing):** build engines in the owning slot's worktree → **wire new dispatcher actions in MAIN post-golf-merge**. Never treat the worktree's 393-action count as the wiring target; main is the source of truth for the dispatcher surface. Every "add action" below means *add-in-main-after-merge*.

---

## Phase 0 — MVP: Prove the Backend-First Thesis (smallest end-to-end slice)

**Thesis to prove:** *drawing upload → physics instant-quote + explainable DFM → capability-matched shop shortlist.* This is the one vertical slice that demonstrates all three moats (derived price, physics-true match, observed capability) without building the full two-sided marketplace.

| | |
|---|---|
| **Capabilities delivered** | (1) Buyer uploads a drawing (PDF/STEP/DXF) → structured part; (2) physics instant-quote with explainable DFM rendered buyer-facing; (3) a ranked shortlist of qualified shops from a *seeded* supplier directory, scored by physics-true capability — not tags. |
... [+14018 chars truncated]
