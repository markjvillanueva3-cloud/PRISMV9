---
type: "chat-session"
source: "claude-code-cli"
session_id: "d7f7d3ce-a207-4b0e-ab35-3c2dc1ff3b9f"
title: "You are the lead designer. Synthesize ALL of the below into ONE comprehensive, i"
date: "2026-05-31"
first_ts: "2026-05-31T17:36:53.451Z"
last_ts: "2026-05-31T17:43:12.179Z"
cwd: "H:\\prism-slot-hotel"
messages: 2
user_msgs: 1
assistant_msgs: 1
raw_file: "H:/.claude/projects/H--prism-slot-hotel/d7f7d3ce-a207-4b0e-ab35-3c2dc1ff3b9f/subagents/workflows/wf_8a7483bf-116/agent-a523d405fe1f3d211.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:53"
---

# You are the lead designer. Synthesize ALL of the below into ONE comprehensive, i

> **claude-code-cli** | 2026-05-31 | 2 msgs (1 user / 1 assistant) | cwd: H:\prism-slot-hotel
> Raw: `H:/.claude/projects/H--prism-slot-hotel/d7f7d3ce-a207-4b0e-ab35-3c2dc1ff3b9f/subagents/workflows/wf_8a7483bf-116/agent-a523d405fe1f3d211.jsonl`

## Transcript

### User | 2026-05-31T17:36:53.451Z

You are the lead designer. Synthesize ALL of the below into ONE comprehensive, implementation-ready DESIGN SPEC (markdown) for the PRISM QuickBooks-parity ERP UX. INCORPORATE every PASS_WITH_FIXES / FAIL recommendation from the verify phase (do not just append them — fix the design). 

The spec MUST contain these sections:
1. **Design philosophy** — "familiar IA + interactions (zero re-learning) + distinct identity + manufacturing-native enhancement", and the trade-dress DO/DON'T rules.
2. **Information architecture** — final left-nav tree, "+New" create menu, top bar, and the complete route→dispatcher-action table (flagging any orphan to resolve).
3. **Core screen designs** — the ASCII wireframes (dashboard, invoice form, sales list/money-bar, expenses/PO 3-way-match, banking/reconcile, reports), each annotated with QB-mirror + backing action + the PRISM source-chip.
4. **Visual design system** — the 3 identity directions (A Steel/Cobalt, B Precision Teal/Slate, C Indigo/Graphite) as a comparison table (colors/nav/type/personality), PLUS the shared component spec + Tailwind token structure. Mark this as the OPERATOR DECISION POINT.
5. **Manufacturing differentiators** — the source chip, smart pre-fill, manufacturing dashboard tiles, marketplace-in-accounting-grammar, the sales pitch line.
6. **Implementation plan for the quebec frontend galaxy** — phased: which screens first, component build order, data wiring to prism_business, and what's a thin slice for a familiar MVP.
7. **Verify summary** — the 4 adversarial verdicts + how each finding was resolved.

Write it as a polished spec a frontend engineer can build from. Be exhaustive and concrete. Return ONLY the markdown spec.

=== DESIGN ===
### IA & NAVIGATION
The task list is prior build work, not this UX deliverable — no update needed. I have everything verified: the real stack (Vite + React Router v7, base `/app/*`), the real route table, the real `prism_business` action names, and the real `client.ts` method n
... [+177340 chars truncated]

### Assistant | 2026-05-31T17:43:12.179Z

I'll synthesize all the inputs into one comprehensive design spec, incorporating every PASS_WITH_FIXES finding from the four adversarial verdicts. Let me work through the fixes systematically before writing.

Key fixes I'm incorporating:
- **Route base**: strip `/app/` prefix (pathless layout route → URLs are `/invoices`, not `/app/invoices`)
- **Reconcile**: one canonical route `/banking?tab=reconcile`
- **Nav**: scope QB-style as a "Books" workspace section, not a wholesale rail replacement; reconcile IA vs wireframe to ONE rail
- **Expenses group**: flag the 4-child shape as intentional manufacturing addition
- **Projects**: bare label, page title carries "Job P&L at actual"
- **Accounting nav group**: tighten to Chart of accounts + Reconcile only
- **Quote collision**: rename "Quote builder" → "Print-to-quote"
- **+New verbs**: restore Check, Refund receipt; flag Sales order as non-QBO addition
- **Banking route**: load Banking page, not GeneralLedgerPage
- **PRISM Books → PRISM ERP** (IP fix)
- **False client.ts citations** → move to "(add)" gaps
- **Marketplace screens** → BLOCKED, backend absent in target tree
- **Dispatcher ground truth**: re-pin tree, verify literals
- **Stack**: Vite + React Router v7, named installed libs
- **Receivables Snapshot recognition cost**: acknowledged honestly
- Drop hardcoded line numbers

# PRISM ERP — QuickBooks-Parity UX Design Specification

**Status:** Implementation-ready · **Target galaxy:** quebec (frontend-app) · **Stack:** Vite 6 + React 19 + React Router v7 · **Date:** 2026-05-29
**Canonical tree:** `H:\prism\mcp-server\web` (the buildable tree — has `package.json` + `vite.config`; the slot-hotel `web/` has only `src/` + `vitest.config.ts` and is NOT the build target)
**Backing dispatcher:** `prism_business` via HTTP bridge `/api/v1/erp/*` (port 3100)

> This spec is the single source of truth for the QuickBooks-parity ERP UX. It supersedes the design draft and folds in every PASS_WITH_FIXES / FAIL finding from the 
... [+71659 chars truncated]
