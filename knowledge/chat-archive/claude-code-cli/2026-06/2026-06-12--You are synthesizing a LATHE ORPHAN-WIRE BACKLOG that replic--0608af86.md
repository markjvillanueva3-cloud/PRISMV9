---
type: "chat-session"
source: "claude-code-cli"
session_id: "0608af86-d78e-46a9-9265-45445ecb3f23"
title: "You are synthesizing a LATHE ORPHAN-WIRE BACKLOG that replicates exactly what sl"
date: "2026-06-12"
first_ts: "2026-06-12T16:43:35.974Z"
last_ts: "2026-06-12T16:45:20.519Z"
cwd: "H:\\prism-slot-sierra"
messages: 2
user_msgs: 1
assistant_msgs: 1
raw_file: "H:/.claude/projects/H--prism-slot-sierra/0608af86-d78e-46a9-9265-45445ecb3f23/subagents/workflows/wf_c1d4e12c-0a9/agent-a5c584a07f676b589.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:10"
---

# You are synthesizing a LATHE ORPHAN-WIRE BACKLOG that replicates exactly what sl

> **claude-code-cli** | 2026-06-12 | 2 msgs (1 user / 1 assistant) | cwd: H:\prism-slot-sierra
> Raw: `H:/.claude/projects/H--prism-slot-sierra/0608af86-d78e-46a9-9265-45445ecb3f23/subagents/workflows/wf_c1d4e12c-0a9/agent-a5c584a07f676b589.jsonl`

## Transcript

### User | 2026-06-12T16:43:35.974Z

You are synthesizing a LATHE ORPHAN-WIRE BACKLOG that replicates exactly what slot:bravo shipped for the SFC galaxy, so the lathe owner (whiskey) -- or a helper -- can execute it unit by unit.

=== BRAVO'S ORPHAN-WIRE PLAYBOOK ===
I now have all the data I need from all 5 commits. Here is the extracted playbook:

---

# Bravo Cross-Galaxy HELP Methodology — Reusable Orphan-Wire Playbook

## Overview

Bravo's pattern is: **discover dark engines → queue them durably → verify WIRE-EXEMPT claims → wire each into the target dispatcher → doc-reflect the wire status into the galaxy brain**. Demonstrated across SFC (calcDispatcher) and mill (millDispatcher). Fully transferable to lathe/turningDispatcher.

---

## Step 1: DISCOVER Orphaned / Unwired Engines

**Four signal sources, use all four in parallel:**

### 1a. `ghost.unwired-engine` nodes in system-viz
System-viz ghost roost surfaces engines with zero dispatcher refs as `ghost.unwired-engine` nodes. Hit via `node scripts/system-viz-query.mjs find <galaxy>` or `prism_session:master_index_query`.

### 1b. Zero-dispatcher grep — use PascalCase basename substring match on `import(` lines
From `43feea586e` (MEMORY.md entry):
> detect darkness by **PascalCase basename substring** (catches `import("...<Base>.js")`), NOT a singleton-name `\b` grep (which false-flags ~193 dark)

For mill, this distinguished 198 truly-wired from 6 actually-dark out of 204 engines.

For lathe, the equivalent is grep `turningDispatcher.ts` for `import("` lines, extract the basename, diff against the set of all `mcp-server/src/engines/lathe/` engine files.

### 1c. FALSE `// WIRE-EXEMPT` tags
From `1987aed3f6` commit message:
> Finding: several carry FALSE `// WIRE-EXEMPT` markers (phantom consumers: comments/metadata strings/reverse refs, no real callers, no named wrapper) — a class that hides real orphans from the unwired audit.

After finding a `// WIRE-EXEMPT` tag, bravo reads the claimed consumers (file:line cited in the tag) and verifies the
... [+39334 chars truncated]

### Assistant | 2026-06-12T16:45:20.519Z

I'll synthesize the lathe orphan-wire backlog now. All the discovery data is provided in the input — I'll produce the markdown spec body directly, using only engines that appear in the discovery input and flagging anything I'm not confident is a true orphan.

```markdown
# LATHE ORPHAN-WIRE BACKLOG — `state/shared/specs/LATHE-ORPHAN-WIRE-QUEUE-2026-06-12.md`

## What this is

A durable, ROI-ranked queue of **lathe/turning engines that exist on disk but are not reachable through any MCP dispatcher** (or are tagged `// WIRE-EXEMPT` on false pretenses). It mirrors, field-for-field, **bravo's SFC orphan-wire queue** (`state/shared/specs/SFC-ORPHAN-WIRE-QUEUE-2026-06-11.md`, ships `1987aed3f6`) and the proven wire pattern from `9aa9ce20f2` / `e436c2fc3f` (SFC into `calcDispatcher`) and `b4bdf8f699` (DATA orphan into `millDispatcher`).

- **Primary target dispatcher:** `turningDispatcher.ts` → `prism_turning` (373 actions, 3,570 lines, SAFETY-CRITICAL).
- **Secondary targets where natural:** `camDispatcher.ts` → `prism_cam` (post / toolpath-shaped engines), `cadDispatcher.ts` → `prism_cad` (print/CAD-intake engines), `calcDispatcher.ts` → `prism_calc` (pure physics).
- **Owner:** `whiskey` (lathe specialist). Executable in-slot by a helper per the `EXECUTION` section below.
- **Status lifecycle (bravo schema):** `CONFIRMED_TRUE_ORPHAN_WIRE_IT` → `SHIPPED <commit>`; or `REMAINING_REASSESS` / `LIKELY_EXEMPT` / `VERIFY` / `DISCREPANCY` for anything not cleanly confirmed.
- **R12/safety gate:** JM Die's fleet is **7/7 Okuma OSP**. Any wired surface that touches G50 RPM cap, G96 CSS, boring-bar L/D deflection, or G76/G92 threading carries direct shop-floor safety value and ranks high. Physics constants MUST come from `mcp-server/src/physics/constants.ts` (never inline kc/Kienzle/Taylor).

> **Verify-then-build discipline (R8):** the discovery pass below was a static set-difference + grep. Several rows are flagged **VERIFY** because the action string already appears in the `ACT
... [+17918 chars truncated]
