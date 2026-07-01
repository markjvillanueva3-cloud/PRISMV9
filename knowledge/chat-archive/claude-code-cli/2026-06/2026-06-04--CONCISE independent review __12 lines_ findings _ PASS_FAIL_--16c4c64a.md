---
type: "chat-session"
source: "claude-code-cli"
session_id: "16c4c64a-3ab9-4d8d-8551-a9449f1efe09"
title: "CONCISE independent review (≤12 lines: findings + PASS/FAIL). Unit BLACKWELL-DB-"
date: "2026-06-04"
first_ts: "2026-06-04T15:22:58.015Z"
last_ts: "2026-06-04T15:24:30.167Z"
cwd: "H:\\prism"
messages: 19
user_msgs: 8
assistant_msgs: 11
raw_file: "H:/.claude/projects/H--prism/16c4c64a-3ab9-4d8d-8551-a9449f1efe09/subagents/agent-a0a114a0cffae8383.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:07"
---

# CONCISE independent review (≤12 lines: findings + PASS/FAIL). Unit BLACKWELL-DB-

> **claude-code-cli** | 2026-06-04 | 19 msgs (8 user / 11 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/16c4c64a-3ab9-4d8d-8551-a9449f1efe09/subagents/agent-a0a114a0cffae8383.jsonl`

## Transcript

### User | 2026-06-04T15:22:58.015Z

CONCISE independent review (≤12 lines: findings + PASS/FAIL). Unit BLACKWELL-DB-GEN-MS0/U-CGP-NUMPARALLEL-RECO. Read H:/prism/scripts/lib/catalog-gpu-profile.mjs (new `recommendOllamaNumParallel`) and H:/prism/scripts/measure-catalog-extraction-rate.mjs (the `action`/`underProvisioned` additions).

Context: iter1 made the extractor parallel, iter2 measured 2× (capped by live OLLAMA_NUM_PARALLEL=2), this iter3 makes the measurement tool recommend raising it to 4 — but the config script scripts/system-health/05-soft-config-tweaks.ps1 ALREADY sets 4 host-aware (golf, today). So this must NOT duplicate that — it should POINT at it.

VERIFY (honesty/dedup focus): (1) Does recommendOllamaNumParallel's per-tier table AGREE with the PS script's VRAM→slots (blackwell 4 / mid 2 / small 1)? Any drift risk between the two? (2) Is the `action` advisory honest (points at the existing script, doesn't claim it auto-applies, doesn't promise ×3 without the restart)? (3) No duplication of golf's config logic — advisory only? (4) Conventions/no stubs. Report real P0/P1/P2 + PASS/FAIL.

### Assistant | 2026-06-04T15:23:23.462Z

I'll review the two files for this unit.

### Assistant | 2026-06-04T15:23:23.685Z

[tool_use: Read]

### Assistant | 2026-06-04T15:23:24.471Z

[tool_use: Read]

### Assistant | 2026-06-04T15:23:24.617Z

[tool_use: Read]

### User | 2026-06-04T15:23:26.050Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\catalog-gpu-profile.mjs' was already read 10s ago in this session and is unchanged (mtime 1780586323971). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-04T15:23:26.823Z

[tool_result] read-once-guard: 'H:\prism\scripts\measure-catalog-extraction-rate.mjs' was already read 7s ago in this session and is unchanged (mtime 1780586465178). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-04T15:23:27.092Z

[tool_result] read-once-guard: 'H:\prism\scripts\system-health\05-soft-config-tweaks.ps1' was already read 7m ago in this session and is unchanged (mtime 1780578698468). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACH
... [+4 chars truncated]

### Assistant | 2026-06-04T15:23:31.841Z

The read-once guard says these files are already in my context, but I don't actually have their content in this fresh review session. Let me bypass the cache.

### Assistant | 2026-06-04T15:23:33.285Z

[tool_use: Grep]

### Assistant | 2026-06-04T15:23:34.674Z

[tool_use: Grep]

### User | 2026-06-04T15:23:40.901Z

[tool_result] 5:# lowers idle commit pressure WITHOUT downgrading a large-VRAM card to
7:# NUM_PARALLEL=1 / MAX_LOADED=2 — correct for a small card, but a silent
8:# regression on the RTX PRO 6000 Blackwell 96GB box: running it clobbered
9:# the Blackwell tuning back to 4080/work-era values. BLACKWELL-GPU-SWAP slot:golf.)
11:# GPU class is auto-detected from nvidia-smi total VRAM:
12:#   >=48GB  -> blackwell  (
... [+1430 chars truncated]

### User | 2026-06-04T15:23:41.490Z

[tool_result] 217:export function recommendOllamaNumParallel(profile) {
218-  switch (profile && typeof profile === "object" ? profile.name : null) {
219-    case "blackwell": return 4; // ≥48GB — 3 extraction workers + fleet-chat inference headroom
220-    case "highend": return 2;   // 24-48GB — one slot beyond the lone fleet model
221-    default: return 1;          // midrange/low/unknown — avoid crowding t
... [+3715 chars truncated]

### Assistant | 2026-06-04T15:23:51.388Z

[tool_use: Grep]

### Assistant | 2026-06-04T15:23:47.203Z

Now I can see the key tension. The PS script tiers are `blackwell` (≥48GB→4), `home` (≥14336MB→2), `work` (else→1). The new `recommendOllamaNumParallel` uses profile names `blackwell`→4, `highend`→2, `default`→1. Let me verify the profile tier-name mapping and the `action`/`underProvisioned` logic in the measurement tool.

### Assistant | 2026-06-04T15:23:54.256Z

[tool_use: Grep]

### User | 2026-06-04T15:24:02.688Z

[tool_result] 17:// orchestrator) picks model + concurrency + overnight-gating from the LIVE host GPU,
24:// concurrency / overnight-gating for catalog PDF throughput — this module owns that
29:// is detectGpuTier's nvidia-smi probe, which is injectable (runImpl) for hermetic tests
37://   PRISM_CATALOG_GPU_CONCURRENCY — force the worker concurrency (override the per-tier default)
54:// see reference_xray_ocr_g
... [+1975 chars truncated]

### User | 2026-06-04T15:24:06.012Z

[tool_result] 1-#!/usr/bin/env node
2:// scripts/measure-catalog-extraction-rate.mjs
3-//
4-\ BLACKWELL-DB-GEN-MS0 \ U-CGP-MEASURE (slot:romeo, 2026-06-04).
5-//
6-// Closes the "estimate vs MEASURED" loop for the catalog/DB-gen efficiency milestone WITHOUT
7:// evicting peer models. estimateExtractionPlan() (catalog-gpu-profile) deliberately REFUSES to
8-// fabricate `pagesPerMinPerWorker` — it must be measure
... [+8258 chars truncated]

### Assistant | 2026-06-04T15:24:30.167Z

I have everything needed. Let me verify the one drift point: the PS `home` tier (≥14336MB) sets `numParallel=2`, while the JS profile uses name `highend`→2. The PS tier names (`blackwell`/`home`/`work`) differ from the JS profile names (`blackwell`/`highend`/`midrange`/`low`), but the VRAM→slot *values* must agree.

**Drift check on values:**
- Blackwell (≥48GB / ≥49152MB): PS=4, JS `blackwell`=4 — agree
- Mid (24-48GB): PS `home` (≥14336MB)=2, JS `highend`=2 — agree on value
- Small (<14336MB): PS `work`=1, JS `midrange`/`low`/`default`=1 — agree

The values match at the three tiers the operator named (4/2/1). The `action` advisory points at the PS script by name, says "host-aware, sets N", and explicitly requires a restart ("let Ollama restart on the next idle window"). No config logic is duplicated — JS only *reads* the recommended value and *points at* the PS script. Honesty on the `×` claim: `Math.min(p.workers, res.recommendedParallel)` correctly caps the promised speedup (e.g. blackwell workers=3, recommended=4 → ×3, not ×4), and frames it as "unlock up to" — not a guaranteed/auto-applied gain.

**Findings:**

P0: none.

P1: none.

P2 (minor, non-blocking):
- **Tier-boundary drift risk (latent):** The two files agree on the *value* at each tier but the *boundaries* are encoded independently. JS `detectGpuTier` and PS both classify by VRAM, but if a future edit moves one boundary (e.g. PS `home` floor 14336→16384, or JS adds a 24-48GB→`highend` cutoff that PS lacks), the 24-48GB band could split (JS `highend`=2 vs PS `home`=2 still agree by luck, but a card at, say, 40GB hits JS `highend` while PS has no distinct mid-mid tier). Today they're consistent; the risk is the two VRAM→slot tables are not single-sourced. A comment cross-referencing the PS thresholds (or a shared constants table) would harden this. Worth a one-line note in handoff, not a blocker.
- **Comment claims SSOT parity** (`recommendedOllamaNumParallel: ... // matches 05-soft-config-tweaks.ps1`)
... [+1093 chars truncated]
