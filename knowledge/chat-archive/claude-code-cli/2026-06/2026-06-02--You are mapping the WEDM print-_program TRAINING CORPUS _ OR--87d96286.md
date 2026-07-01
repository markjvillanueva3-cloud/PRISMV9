---
type: "chat-session"
source: "claude-code-cli"
session_id: "87d96286-aba0-4263-85de-26771e812c92"
title: "You are mapping the WEDM print->program TRAINING CORPUS + ORACLE physics tables."
date: "2026-06-02"
first_ts: "2026-06-02T03:21:35.169Z"
last_ts: "2026-06-02T03:23:04.045Z"
cwd: "H:\\prism-slot-mike"
messages: 11
user_msgs: 5
assistant_msgs: 6
raw_file: "H:/.claude/projects/H--prism-slot-mike/87d96286-aba0-4263-85de-26771e812c92/subagents/workflows/wf_c4ad0785-0a4/agent-ab12af2233e65f789.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:01"
---

# You are mapping the WEDM print->program TRAINING CORPUS + ORACLE physics tables.

> **claude-code-cli** | 2026-06-02 | 11 msgs (5 user / 6 assistant) | cwd: H:\prism-slot-mike
> Raw: `H:/.claude/projects/H--prism-slot-mike/87d96286-aba0-4263-85de-26771e812c92/subagents/workflows/wf_c4ad0785-0a4/agent-ab12af2233e65f789.jsonl`

## Transcript

### User | 2026-06-02T03:21:35.169Z

You are mapping the WEDM print->program TRAINING CORPUS + ORACLE physics tables. TASKS: (1) Read "H:/prism-slot-mike/mcp-server/src/data/jm-die-wedm-tech-tables.ts" — list the E-code families (id, axes, pass count) and the getters (getECodeForPass/getShopFeedForPass/getShopOffsetForPass). (2) Read "H:/prism-slot-mike/mcp-server/src/data/wedm-toolpath-types.ts" — the 11 toolpath types + which are wired/partial. (3) Read "H:/prism-slot-mike/mcp-server/src/data/jm-die-material-stock.ts" — JM material/wire inventory. (4) Note the just-completed training result: a Qwen2.5-Coder-0.5B LoRA fine-tune (loss 0.10) scored 13/15 (86.7%) on the hardened closed-loop gate (state/shared/wedm-p2p-05b-generations.jsonl). Report: oracle table coverage (materials, thicknesses, families), corpus size (run: wc -l on mcp-server/data/training/wedm-*/*.jsonl), and what physics inputs the oracle keys on (thickness? material? hardness? bi-material?).

### Assistant | 2026-06-02T03:21:50.407Z

I'll map the WEDM training corpus and oracle physics tables. Let me start by reading the three data files and counting the corpus in parallel.

### Assistant | 2026-06-02T03:21:51.361Z

[tool_use: Read]

### Assistant | 2026-06-02T03:21:51.828Z

[tool_use: Read]

### Assistant | 2026-06-02T03:21:52.357Z

[tool_use: Read]

### Assistant | 2026-06-02T03:21:53.664Z

[tool_use: Bash]

### User | 2026-06-02T03:22:04.356Z

[tool_result] 1	/**
2	 * JM Die Company — Mitsubishi FA-10S Wire EDM Technology Tables
3	 *
4	 * Extracted from real production programs:
5	 *   - ITW SHAKEPROOF 500-30540-24000-04.NC (D2, 4-pass straight)
6	 *   - NOZE TEST.NC (SS taper, 5-pass UV)
7	 *   - CHOCTAW DEFENSE 38 CAL CANNELURE (D2, 5-pass heavy)
8	 *   - FIOCCHI 38 CAL CANNELURE (D2, 5-pass heavy)
9	 *
10	 * Also validated against Mastercam X8 Mit
... [+9547 chars truncated]

### User | 2026-06-02T03:22:05.434Z

[tool_result] 1	/**
2	 * jm-die-material-stock.ts — JM Die wire-EDM INVENTORY SEED + availability gate.
3	 *
4	 * Phase B of the print->program pipeline (WEDM-PRINT-TO-PROGRAM-PIPELINE-2026-05-31.md §3).
5	 * Recon 2026-05-31 found MaterialStockEngine has ZERO JM data and ShopConfiguration's
6	 * wedm_wire_inventory carries only placeholder remaining_pct. This seed gives the
7	 * inventory-driven pipeline real 
... [+6338 chars truncated]

### User | 2026-06-02T03:22:05.600Z

[tool_result] 1	/**
2	 * wedm-toolpath-types.ts — JM Die wire-EDM TOOLPATH-TYPE REGISTRY.
3	 *
4	 * The single queryable taxonomy of every wire-EDM toolpath/cut type the
5	 * print->program pipeline must cover (per WEDM-PRINT-TO-PROGRAM-PIPELINE-2026-05-31.md
6	 * §2). Today the cut types are scattered across WEDMPassType (rough/semi/finish/
7	 * precision), ECodePass.type (rough/skim), and EDMToolpathStrategyE
... [+12623 chars truncated]

### User | 2026-06-02T03:22:19.922Z

[tool_result] 15 wedm-knowledge/wedm_knowledge_test.jsonl
139 wedm-knowledge/wedm_knowledge_train.jsonl
17 wedm-knowledge/wedm_knowledge_val.jsonl
1 wedm-lora/wedm_lora_test.jsonl
1 wedm-lora/wedm_lora_train.jsonl
0 wedm-lora/wedm_lora_val.jsonl
19 wedm-passschedule/wedm_passschedule_test.jsonl
165 wedm-passschedule/wedm_passschedule_train.jsonl
20 wedm-passschedule/wedm_passschedule_val.jsonl
93 wedm-print2pro
... [+759 chars truncated]

### Assistant | 2026-06-02T03:23:04.045Z

I have everything I need. The corpus counts came back cleanly. Here is the full map.

---

# WEDM Print-to-Program Corpus + Oracle Physics Map

## (1) E-CODE FAMILIES — `jm-die-wedm-tech-tables.ts`
Mitsubishi FA-10S ground truth, extracted from 4 real JM production NC programs (ITW SHAKEPROOF D2, NOZE TEST SS taper, Choctaw/Fiocchi .38 cannelure D2).

| Family `id` | axes | passes | E-codes | materials | H175 master |
|---|---|---|---|---|---|
| `E12xx_standard_4pass` | 2 (XY) | 4 (rough+3 skim) | E1221–E1224 | D2, A2, S7, M2, H13, 4140, 4340, O1, W1 | yes |
| `E12xx_heavy_5pass` | 2 (XY) | 5 (rough+4 skim) | E1281–E1285 | D2, A2, S7, M2, H13 | yes |
| `E28xx_taper_5pass` | 4 (XY+UV) | 5 (rough+4 skim) | E2821–E2825 | stainless, 304, 316, D2, A2, S7, M2, H13 | no (H-offsets all 0) |

Exported as `JM_DIE_ECODE_FAMILIES`. Also exports `JM_DIE_MCODE_SEQUENCE` (start M91/M20/M78/M80/M82/M84/M90, end M85/M83/M81/M21/M58, double tank-fill M78 M78, M90 adaptive on rough only) and `H175_MASTER_OFFSET`.

**Getters (all take `(family, passNumber)`, pure):**
- `getECodeForPass(family, passNumber)` → e_code string; fallback synthesizes `E<x><y>0<n>` from passes[0] if pass not found.
- `getShopFeedForPass(family, passNumber)` → `feed_mm_min | null` (null = operator-entered at machine, e.g. E2825 pass 5).
- `getShopOffsetForPass(family, passNumber)` → `offset_mm` (0 for UV taper programs).
- `selectECodeFamily({material, taper_angle_deg?, tolerance_mm?, target_ra_um?, thickness_mm?})` → family or **null** (null = material not in tech tables → caller uses generic E-codes).

## (2) TOOLPATH TYPES — `wedm-toolpath-types.ts`
11 types in `WEDM_TOOLPATH_TYPES`. Schema-only (param names/ranges/owning-engine); actual discharge values come from the oracle, never inlined here.

**Status: 6 wired / 5 partial / 0 build:**

| id | status | e_code_family | owning engine |
|---|---|---|---|
| straight_profile_multipass | **wired** | E12XX_STANDARD_4PASS | EDMMultiPassStrategyEngine |
| heavy_th
... [+5620 chars truncated]
