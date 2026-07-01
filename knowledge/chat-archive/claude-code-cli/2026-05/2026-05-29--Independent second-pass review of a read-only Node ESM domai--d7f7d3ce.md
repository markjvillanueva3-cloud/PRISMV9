---
type: "chat-session"
source: "claude-code-cli"
session_id: "d7f7d3ce-a207-4b0e-ab35-3c2dc1ff3b9f"
title: "Independent second-pass review of a read-only Node ESM domain-atlas script. Read"
date: "2026-05-29"
first_ts: "2026-05-29T13:12:56.071Z"
last_ts: "2026-05-29T13:14:41.309Z"
cwd: "H:\\prism-slot-hotel"
messages: 22
user_msgs: 9
assistant_msgs: 13
raw_file: "H:/.claude/projects/H--prism-slot-hotel/d7f7d3ce-a207-4b0e-ab35-3c2dc1ff3b9f/subagents/agent-aba47d14068125ca8.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:52"
---

# Independent second-pass review of a read-only Node ESM domain-atlas script. Read

> **claude-code-cli** | 2026-05-29 | 22 msgs (9 user / 13 assistant) | cwd: H:\prism-slot-hotel
> Raw: `H:/.claude/projects/H--prism-slot-hotel/d7f7d3ce-a207-4b0e-ab35-3c2dc1ff3b9f/subagents/agent-aba47d14068125ca8.jsonl`

## Transcript

### User | 2026-05-29T13:12:56.071Z

Independent second-pass review of a read-only Node ESM domain-atlas script. Read the WHOLE file end-to-end:

H:/prism-slot-hotel/scripts/business-domain-atlas.mjs

You are the INDEPENDENT reviewer — do NOT assume the specialist caught everything. Weight your review toward: integration with sibling scripts, hidden coupling, naming/convention conformance, inlined constants that should be imported, stub/placeholder logic, and especially HONESTY of the emitted report (this is a synergy/awareness surface — overstating "PASS" or "wired" status is a serious R12 violation in this codebase).

Project conventions to verify against: it should match the style of its sibling H:/prism-slot-hotel/scripts/hotel-domain-awareness.mjs (same ROOT resolution via PRISM_ROOT, same ENGINE_RE prefix regex shared between them, fail-soft helpers, --json mode). The atlas must be ADDITIVE to that card, not a duplicate (card = doctrine + counts; atlas = exhaustive node list + unwired punch-list + synergy mode).

Known-and-accepted: ROOT defaults to H:/prism (canonical) while the slot worktree is H:/prism-slot-hotel — the tribal engine + brain MEMORY.md are correctly checked cross-tree. SemanticAssetIndexEngine appearing in the unwired punch-list is a known regex false-positive (the shared ENGINE_RE "Asset" token), acceptable as advisory.

Check specifically: (1) does --synergy ever claim PASS without real evidence (e.g. LEG-6 system-viz is hardcoded PASS — is that honest given the script can't actually query the graph)? (2) is the "presence-based heuristic" caveat clearly disclosed so a reader doesn't mistake it for deep validation? (3) are the hardcoded INVARIANT/milestone lists accurate or could they rot silently? (4) any duplication with hotel-domain-awareness.mjs that should be DRY'd?

Output: short list of P0/P1 findings (file:line, issue, fix), then final verdict line exactly: "VERDICT: PASS" or "VERDICT: FAIL".

### Assistant | 2026-05-29T13:13:09.964Z

I'll read both files in full before forming any findings.

### Assistant | 2026-05-29T13:13:11.096Z

[tool_use: Read]

### Assistant | 2026-05-29T13:13:11.104Z

[tool_use: Read]

### User | 2026-05-29T13:13:13.819Z

[tool_result] read-once-guard: 'H:\prism-slot-hotel\scripts\business-domain-atlas.mjs' was already read 15s ago in this session and is unchanged (mtime 1780060295325). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=
... [+2 chars truncated]

### User | 2026-05-29T13:13:13.827Z

[tool_result] read-once-guard: 'H:\prism-slot-hotel\scripts\hotel-domain-awareness.mjs' was already read 7m ago in this session and is unchanged (mtime 1780027222237). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=
... [+2 chars truncated]

### Assistant | 2026-05-29T13:13:17.974Z

Both files are already in context. Let me grep for specific sections I need to verify carefully.

### Assistant | 2026-05-29T13:13:18.590Z

[tool_use: Grep]

### Assistant | 2026-05-29T13:13:19.618Z

[tool_use: Grep]

### User | 2026-05-29T13:13:24.432Z

[tool_result] 2-/**
3- * business-domain-atlas.mjs — deep node atlas for slot:hotel (galaxy:business).
4- *
5: * Operator goal (2026-05-29): "utilize /system-viz, master index and master graph to find
6- * ALL nodes that would maximize the potential of your domain." This is the reusable
7- * enumeration that captures that discovery so future hotel sessions get the full domain
8- * surface in one read — NOT a qu
... [+6403 chars truncated]

### User | 2026-05-29T13:13:24.931Z

[tool_result] 16- *   4. wiki business action entries     (knowledge/wiki/architecture/actions/business)
17- *   5. tribal knowledge                 (HotelERPTribalKnowledgeEngine — note tree + wired status)
18- *   6. obsidian memories                (hotel\business *.md in the C: brain)
19: *   7. known ghost milestones           (BIZ-MS*; live set via /system-viz find biz)
20- *
21- * Modes:
22- *   node scr
... [+55 chars truncated]

### Assistant | 2026-05-29T13:13:28.803Z

Good. Now let me get the specific lines for KNOWN_BIZ_MILESTONES, the caveat disclosure, and the ENGINE_RE duplication across both files.

### Assistant | 2026-05-29T13:13:30.262Z

[tool_use: Grep]

### Assistant | 2026-05-29T13:13:32.132Z

[tool_use: Grep]

### User | 2026-05-29T13:13:35.110Z

[tool_result] 15- *   3. UNWIRED business engines         (BUILD_STATE.json NEEDS_WIRING ∩ business prefix) ← opportunity set
16- *   4. wiki business action entries     (knowledge/wiki/architecture/actions/business)
17- *   5. tribal knowledge                 (HotelERPTribalKnowledgeEngine — note tree + wired status)
18- *   6. obsidian memories                (hotel\business *.md in the C: brain)
19: *   7. k
... [+1160 chars truncated]

### User | 2026-05-29T13:13:35.757Z

[tool_result] 27-const MEMDIR = "C:/Users/wompu/.claude/projects/H--prism/memory";
28-
29:const ENGINE_RE = /Business|ERP|Payroll|Invoice|Account|Ledger|Customer|Vendor|Quot|Cost|Hotel|OSHA|Kaizen|Lean|Sigma|Audit|Complian|Timeclock|PTO|Benefit|Expense|Order|Tax|Financ|Quality|NCR|CAPA|Traveler|Bom|Routing|Amortiz|Recurring|Shift|Job|Dept|Manager|Employee|Capacity|Scheduling|Profit|Billing|Asset|Depreciation|Ge
... [+397 chars truncated]

### Assistant | 2026-05-29T13:13:40.395Z

The graph context reveals BIZ-MS1 exists as a ghost milestone in the graph. Let me verify the KNOWN_BIZ_MILESTONES list is missing it, and check the algoFormulaPresence function and the wired/unwired logic.

### Assistant | 2026-05-29T13:13:41.421Z

[tool_use: Grep]

### Assistant | 2026-05-29T13:13:42.810Z

[tool_use: Grep]

### User | 2026-05-29T13:13:45.410Z

[tool_result] 129-  return safeReaddir(MEMDIR).filter((f) => /(_hotel_|hotel_business|hotel_erp|_business_)/i.test(f) && f.endsWith(".md")).sort();
130-}
131-
132-// ── 7. algorithm/formula presence (grep engine corpus heads) ───────────────
133:function algoFormulaPresence() {
134-  \ Cheap proxy: do any business engines reference these named methods? (presence, not correctness).
135-  const sample = businessE
... [+2684 chars truncated]

### User | 2026-05-29T13:13:46.530Z

[tool_result] 9- * complements, never duplicates: card = always-true doctrine + counts; atlas = exhaustive
10- * node list + the UNWIRED punch-list = the maximize-potential opportunity set).
11- *
12- * Sources (each fail-soft — a missing source degrades that row, never crashes the atlas):
13- *   1. business engine files           (prefix scan of mcp-server/src/engines)
14: *   2. prism_business dispatcher    
... [+5378 chars truncated]

### Assistant | 2026-05-29T13:14:41.309Z

I have all the evidence I need. Here are the findings:

---

**P0 — LEG-6 System-viz hardcoded PASS is dishonest (R12 violation)**

File: `business-domain-atlas.mjs`, line 184

```js
{ n: 6, leg: "System-viz", v: "PASS", ev: "businessdispatcher + 475 action nodes in graph (verify: /system-viz find business)" },
```

This is the most serious finding. The script unconditionally emits `"PASS"` for LEG-6 at every invocation regardless of whether the system-viz server is reachable, whether the graph has been updated since the stat was recorded, or whether any query was actually issued. The evidence string ("475 action nodes") is a stale snapshot baked at write-time, not read at run-time. A reader running `--synergy` on a machine where system-viz is down, or after a graph rebuild that changed the count, sees `PASS` with no basis.

The sibling `hotel-domain-awareness.mjs` does not emit any LEG-6 equivalent, so there is no precedent to cite as justification.

Fix: Change the hardcoded `"PASS"` to a `verdict(...)` call conditioned on something checkable at runtime — the simplest honest option is to check whether the system-viz state file or the graph JSON exists on disk (e.g. `safeStat(path.join(ROOT, "state/shared/system-viz/..."))` returns non-null). If nothing checkable exists, emit `"PARTIAL"` with evidence `"graph not queryable from script; last known: 475 nodes — run /system-viz find business to confirm"`. The hardcoded `"PASS"` must not remain.

---

**P0 — KNOWN_BIZ_MILESTONES is missing BIZ-MS1 (stale hardcoded list, silent rot)**

File: `business-domain-atlas.mjs`, line 52

```js
const KNOWN_BIZ_MILESTONES = ["BIZ-MS0", "BIZ-MS2 (Employee Mgmt, HR & Payroll)"];
```

The pre-grep graph context from the system graph confirms three ghost milestone nodes exist: `milestone-ghost-ms-biz-ms0`, `milestone-ghost-ms-biz-ms1`, `milestone-ghost-ms-biz-ms2`. BIZ-MS1 is absent from the hardcoded array. The atlas already acknowledges the list is incomplete by saying "(live set vi
... [+6069 chars truncated]
