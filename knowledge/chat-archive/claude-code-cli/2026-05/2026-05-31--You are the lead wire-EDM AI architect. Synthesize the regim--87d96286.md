---
type: "chat-session"
source: "claude-code-cli"
session_id: "87d96286-aba0-4263-85de-26771e812c92"
title: "You are the lead wire-EDM AI architect. Synthesize the regimens below into ONE e"
date: "2026-05-31"
first_ts: "2026-05-31T23:25:04.392Z"
last_ts: "2026-05-31T23:31:41.913Z"
cwd: "H:\\prism-slot-mike"
messages: 7
user_msgs: 3
assistant_msgs: 4
raw_file: "H:/.claude/projects/H--prism-slot-mike/87d96286-aba0-4263-85de-26771e812c92/subagents/workflows/wf_e532b2df-269/agent-ae68c3c25387d9c08.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:01"
---

# You are the lead wire-EDM AI architect. Synthesize the regimens below into ONE e

> **claude-code-cli** | 2026-05-31 | 7 msgs (3 user / 4 assistant) | cwd: H:\prism-slot-mike
> Raw: `H:/.claude/projects/H--prism-slot-mike/87d96286-aba0-4263-85de-26771e812c92/subagents/workflows/wf_e532b2df-269/agent-ae68c3c25387d9c08.jsonl`

## Transcript

### User | 2026-05-31T23:25:04.392Z

You are the lead wire-EDM AI architect. Synthesize the regimens below into ONE exhaustive, prioritized MASTER TRAINING-REGIMEN CATALOG (markdown) for JM Die's entire wire-EDM system.
Structure: (1) Executive summary + the unifying training architecture; (2) PRINT->WIRE-PROGRAM regimen FIRST and in most depth (it is the #1 deliverable); (3) each other regimen, priority-ordered, as a section with data sources / method / corpus plan / eval / success criteria / scarcity strategy / gaps / effort; (4) a cross-cutting DATA-ASSEMBLY plan (how prints+programs+stock+equipment+tribal combine); (5) a build sequence (logical dependency order — which regimen to build first, what each depends on); (6) honest scarcity + risk register. Be concrete + cite the real paths. This doc must be directly executable by a future build chain.

=== REGIMENS (priority-sorted JSON) ===
[
 {
  "capability": "PRINT → WIRE-PROGRAM (blueprint/DXF/PDF → Mitsubishi FA-10S W31MV-2 G-code) — the #1 crux print-to-program deliverable for the wire-EDM galaxy",
  "priority": 1,
  "data_sources": [
   "H:/PRISM/Docustrata/.index/blueprint-program-join-full-v6.jsonl (459 WIRE-EDM-bearing print↔program records: 133 exact + 224 loose + 102 ambiguous — THE blueprint→program join; program side is .mcx-8 binary)",
   "H:/PRISM/Docustrata/.index/phase20-verified-prints.jsonl (44,012 print pages: doc_id, part_numbers[], drawing_number, revision, material, customer, is_drawing_likely — OCR ground-truth feature substrate)",
   "H:/PRISM/Docustrata/.index/documents-text-extracted-v3.jsonl (raw OCR text per page — the input modality for feature extraction)",
   "H:/prism-slot-mike/scripts/docustrata/phase16-blueprint-program-join-v6.py (canonical normalize_pn/garbage_class/cust_overlap join logic — preprocessing module)",
   "H:/prism-slot-mike/mcp-server/src/data/jm-die-wedm-tech-tables.ts (3 E-code families + selectECodeFamily() deterministic decision fn + getShopFeedForPass/getShopOffsetForPass + JM_DIE_MCODE_SEQUENCE 
... [+279646 chars truncated]

### Assistant | 2026-05-31T23:25:14.741Z

I'll synthesize these regimens into one exhaustive master training-regimen catalog. Let me first verify a few key load-bearing paths so the doc is directly executable, then write it.

### Assistant | 2026-05-31T23:25:17.416Z

[tool_use: Bash]

### Assistant | 2026-05-31T23:25:20.630Z

[tool_use: Bash]

### User | 2026-05-31T23:25:36.236Z

[tool_result] ===tech-tables===
mcp-server/src/data/jm-die-wedm-tech-tables.ts  9.2K
===wedm-published-conditions===
mcp-server/src/data/wedm-published-conditions.ts  77.3K
===wire-spec===
mcp-server/src/data/wire-spec-sheets.ts  16.2K
===edm-material-db===
mcp-server/src/data/edm-material-db.ts  11.2K
===join index===
H:/PRISM/Docustrata/.index/blueprint-program-join-full-v6.jsonl  59.0M
===phase20===
H:/PRISM
... [+55 chars truncated]

### User | 2026-05-31T23:25:51.576Z

[tool_result] lora-bundle/
knowledge-eval-report.json  5.2K
wedm_knowledge_test.jsonl  14.6K
wedm_knowledge_train.jsonl  126.4K
wedm_knowledge_val.jsonl  13.9K
---LORA BUNDLE---
models/
.gitignore  142B
README.txt  587B
config.json  714B
requirements.txt  427B
train_wedm_lora.py  5.3K
train_wedm_lora_peft.py  6.5K
training-report.json  1.8K
---ADAPTER---
checkpoint-51/
README.md  5.1K
adapter_config.json  1.1K

... [+171 chars truncated]

### Assistant | 2026-05-31T23:31:41.913Z

All key paths verified. The core data sources exist with the expected sizes (tech-tables 9.2K, published-conditions 77.3K, wire-spec 16.2K, edm-material-db 11.2K, join index 59.0M, phase20 17.3M, trained adapter 154.1M, 171-pair corpus split). I have everything needed to write the executable catalog.

# JM Die Wire-EDM — Master Training-Regimen Catalog

**Owner:** Wire-EDM AI Architect (slot:mike / galaxy:wedm) · **Date:** 2026-05-31 · **Status:** Executable build spec, paths verified
**Base model (all regimens):** `Qwen/Qwen2.5-Coder-7B-Instruct`, QLoRA nf4, **warm-started from the single shared adapter** `mcp-server/data/training/wedm-knowledge/lora-bundle/models/wedm-lora/adapter_model.safetensors` (154.1 MB, r16/α32, validated). No cold-starts anywhere.

---

## 1. EXECUTIVE SUMMARY + UNIFYING TRAINING ARCHITECTURE

### 1.1 The one-paragraph thesis

JM Die's wire-EDM domain has a **catastrophic real-program scarcity** (3 unique ISO-G text programs; 3,970 binary `.mcx-8`/`.mcx`/`.esp` files locked without a vendor SDK) but a **rich deterministic-oracle surface**: every capability the fleet wants to train is, at its core, a closed-form function already implemented in `mcp-server/src/data/*.ts` + `mcp-server/src/engines/*.ts`. `selectECodeFamily()` is a decision tree; `getShopFeedForPass()`/`getShopOffsetForPass()` are lookups; `WEDMJobCostEngine.calculateJobCost()`, `WEDMRaPredictorEngine`, `WEDMRecastDepthPredictorEngine`, the 5 `WEDMPost*Engine.ts` post-emitters are all **pure functions**. **This converts "scarce" into "arbitrarily large, label-noise-free" via oracle augmentation.** The unifying architecture is therefore: *deterministic engine/table = the label oracle; OCR/print-join = the realistic input distribution; tribal + 15 gotchas = the reasoning grounding; the existing trained adapter = warm-start equity; RAG = the live-number supplier so nothing rotting/scarce has to be memorized.*

### 1.2 The unifying training architecture (one diagram, all 8 regimen
... [+67665 chars truncated]
