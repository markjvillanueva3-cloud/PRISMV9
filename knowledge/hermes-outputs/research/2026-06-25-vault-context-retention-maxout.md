---
type: research
date: 2026-06-25
author: ZULU (hermes-zebra / slot:bravo)
topic: max-out Obsidian vault utilization for context retention — config audit + live recall-degradation root cause
tags: [PRISM, hermes, obsidian, vault, context-retention, ollama, embed, semantic-recall, zulu]
verified: 2026-06-25
---

# Max-Out Obsidian Vault Utilization for Context Retention — Audit + Live Root Cause

> Operator: "max out obsidian vault utilization and capabilities especially for context retention."
> Method (R5 search-first): recalled prior work via `brain_recall` BEFORE building — found a deep
> on-point assessment from 3 days ago (`HERMES-OBSIDIAN-UTILIZATION-ASSESSMENT-2026-06-22-PASS2`)
> and the 2026-06-09 token/context synthesis. This note reconciles those against THIS session's live
> profile-bravo config + a live recall-health probe, and reports one concrete root-caused degradation.
> Every value below was read/probed this run (R12). Profile in effect: **bravo** (its config governs,
> NOT the global `~/.hermes/config.yaml`).

## 1. Context-retention substrate — what's ALREADY maxed (verified, leave alone)

| Lever | Setting (profile bravo) | Status |
|---|---|---|
| Tier-1 memory cap | `memory.memory_char_limit: 12000` | **MAXED** (hardware-aware ceiling per hermes-agent skill). bravo MEMORY.md ~2.6KB/12KB used — fills naturally, not a constraint. |
| Tier-1 user cap | `memory.user_char_limit: 5000` | **MAXED** (ceiling). |
| Context window | `model.ollama_num_ctx: 131072`; opus-4.8 native ~200K | **MAXED.** |
| Tier-2 session store | `state.db` 44 MB SQLite FTS5, live | healthy; `session_search` available. |
| Compression | `enabled: true`, `threshold: 0.5`, `target_ratio: 0.2`, `protect_first_n: 3`, `protect_last_n: 20`, `in_place: true` | working. `protect_last_n` is the only tunable retention knob, deliberately conservative. |
| Vault READ path | `brain_recall` returned real ranked hits in 6s this run | **BM25/denseArm spine LIVE.** |
| Vault WRITE-back | `stop-obsidian-memory-feed` (Stop) + `h-to-c-obsidian-mirror` (PostToolUse) wired+live (per 06-22 assessment, corrected) | healthy. |
| Memory flush cadence | `flush_min_turns: 4`, `nudge_interval: 8` | active. |

**Conclusion:** the retention *config* is already at the hardware ceiling. The operator's "severely
underutilized" feeling is NOT a config gap — it matches the 06-22 assessment's verdict: capabilities
ship **DARK** (default-OFF / unregistered / mock-default), and the highest-ROI arms are operator-gated
or other-slot-owned (see §4).

## 2. LIVE ROOT CAUSE found this run — the dense/semantic recall arm is currently DEAD

This is the one concrete, in-lane, context-retention defect surfaced by probing (not inferred):

- `prism_memory:semantic_search` **failed: `embed failed` after 30s.** `brain_recall` (BM25+fallback) succeeded in 6s.
- Direct probe: `POST /api/embed nomic-embed-text` **hard-hangs → HTTP 000 at 20s, 60s, AND 90s** — even with `num_ctx:2048`/`truncate:true` overrides. So it is NOT a context-allocation problem.
- **Smoking gun:** while `gpt-oss:120b` (64.5 GB VRAM) is resident, a trivial `qwen2.5-coder:32b` generate (`num_ctx:2048`, `num_predict:2`) **also hard-hangs (HTTP 000, 45s).** A `gpt-oss:120b` generate returns in 0.37s. → **No SECOND model can co-load while 120b is resident.**
- Env: `OLLAMA_MAX_LOADED_MODELS=4`, `OLLAMA_NUM_PARALLEL=4`, `OLLAMA_GPU_OVERHEAD=2147483648` (2 GB), `OLLAMA_CONTEXT_LENGTH=131072`, RTX PRO 6000 Blackwell 96 GB.

**Diagnosis:** 120b at 64.5 GB + a 131072-ctx × 4-parallel KV reservation + the 2 GB overhead leaves
insufficient *contiguous* VRAM for a concurrent model load, and because `MAX_LOADED_MODELS=4` tells
ollama to KEEP 120b (not evict), the embed/secondary load blocks indefinitely instead of swapping.

**Confirming counter-observation (re-probe later same session, 2026-06-25):** when 120b had been evicted
and only `qwen2.5-coder:1.5b` + `:32b` were resident, the SAME `POST /api/embed nomic-embed-text` call
**succeeded — HTTP 200 in 9.96s** (cold-load). So embed health is *gated on 120b residency*, not broken:
120b resident → embed hangs (HTTP 000, observed 4×); 120b gone → embed works. The two observations
together are the causal proof, not a contradiction.
**Net effect on context retention: whenever 120b is resident — which is the default the moment any
`delegation` (model `gpt-oss:120b`) or the morning-brief/weekly cron runs — `semantic_search` and the
dense arm of every vault recall silently fall back to BM25-only or fail.** This is exactly the
"6/20 galaxies dense-degrade, no counter" symptom the 06-22 assessment reported, now root-caused to a
VRAM co-residency lockout, not an embed-model fault (nomic-embed-text:latest IS pulled and healthy).

### The fix is OPERATOR-gated (ollama-serve env, elevated) — surfaced, not self-applied
Per USER profile (scheduled-task/elevation is operator-only) I do NOT change the ollama serve env myself.
Recommended one-time arms, in ROI order:
1. **Pin a permanent embed reservation:** set `OLLAMA_KEEP_ALIVE` so `nomic-embed-text` stays resident,
   AND cap the big model's footprint so a ~0.3 GB embed model always co-fits. Concretely: lower the
   *embed* path's context (embed never needs 131072 — it truncates at 2048/8192), and/or set a modest
   per-model `num_ctx` for 120b so the KV reservation doesn't consume the headroom.
2. **Prewarm + keepalive `nomic-embed-text` as its own tiny resident** (a 1-line `/api/embed` warm call
   with `keep_alive:"24h"` at serve start) so it is NEVER evicted by a big-model load. This is the
   durable analog of the qwen prewarm already in place.
3. **Demote 120b from the always-on default** when embedding must stay live — route delegation default
   to a smaller model (the 7b/32b judged ladder alpha already proved non-inferior for most tasks), so
   120b only loads on demand and releases VRAM for the embed arm between heavy jobs.

Any one of these restores live semantic recall = the single biggest *context-retention* win available
right now (BM25-only recall misses paraphrased/conceptual matches — the whole point of the dense arm).

## 3. The `vault-fs` filesystem-MCP question (resolved — do NOT silently re-add)

- The GLOBAL `~/.hermes/config.yaml` carries a `vault-fs` MCP (`@modelcontextprotocol/server-filesystem H:/prism/knowledge`, pkg `2026.1.14` installed). **Profile bravo's `mcp_servers` has ONLY `prism`** — it does not inherit vault-fs.
- My own MEMORY + the `prism-vault-loop` skill record that a stdio fs-MCP **destabilized the MCP layer and was removed 2026-06-09**. The 06-22 assessment lists re-connecting a filesystem-MCP as a TIER-A **operator** arm.
- **Disposition:** giving Hermes direct vault filesystem read would deepen retention (the cyrilXBT
  "one system" pattern), BUT the crash history + operator-gated MCP changes mean I **surface it, not
  self-apply**. If you want it, the safe path is adding it to bravo's `mcp_servers` and watching the
  MCP layer for the instability that got it pulled — your call, your machine.

## 4. The broader "max out" backlog (from the 06-22 PASS2 assessment — still current)
Verdict held: built-but-dark. Top arms (NOT new builds):
- **OPERATOR (Tier A):** connect Hermes↔prism MCP + filesystem-MCP; register/verify the offline crons
  (Dream-Cycle/Self-Reflect/Obsidian-Bridge — all showed **Ready** in MY check this run, so re-verify
  the older "dark" claim before acting); durable Grok proxy task; arm the autonomous driver.
- **CODE (Tier B, other-slot-owned):** fix `ollama-route-pretooluse` dead extension gate (offload 22%→30%+, alpha); wire `wiki-precheck-inject` (alpha/sierra); `zulu-advisory-inject` phantom-critical (zulu).
- **My lane (bravo):** `prism_hermes` live-by-default for read-only actions; Hermes asset-bundle advisor; PSN-RAG into the 4 Hermes decision stages.

## 5. Done-signal for THIS request
Context-retention *config* is verified maxed (§1). The actionable retention win is **restoring the dense
recall arm** (§2) — root-caused to a live VRAM co-residency lockout, fix is operator-gated ollama-serve
env. Surfaced with three concrete options; not self-applied per the elevation-is-operator rule. No
config was changed this run (nothing in-lane was sub-ceiling); the deliverable is the root cause + the
exact arm, so the operator flips one switch instead of the fleet chasing the "dense degrades" symptom again.

## Linked
- `state/shared/specs/HERMES-OBSIDIAN-UTILIZATION-ASSESSMENT-2026-06-22-PASS2.md` (the on-point assessment)
- `state/shared/specs/OBSIDIAN-TOKEN-CONTEXT-SYNTHESIS-2026-06-09.md` (11-item disposition, all resolved)
- `[[feedback_verify_live_config_value_not_symptom]]` (why I probed instead of inferring)
