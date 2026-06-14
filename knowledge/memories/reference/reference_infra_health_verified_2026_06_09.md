---
name: reference_infra_health_verified_2026_06_09
description: "VERIFIED LIVE 2026-06-09 (golf synergy /goal): docker (4/4 up), qdrant (UP, 3 collections), PSN leg#5 tribal injection (real ranked hits, index 159MB under V8 cap). Open item: NO qdrant tribal collection — tribal still JSON, migration is the fresh-budget unit."
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.161Z
aliases: reference_infra_health_verified_2026_06_09
---


**2026-06-09 (slot golf, synergy /goal — consolidated infra-health verification).** Verified 3 more `/goal`-named surfaces live, golf infra-health lane, read-only:

**docker — ✓ HEALTHY.** `node scripts/docker-service-health-check.mjs --json` → `healthy=true, total=4, down=0` — all prism-* containers up (the guard shipped earlier this session, commit `fb314a6fd1`). No renamed-leftover / Created / Exited state.

**qdrant — ✓ UP.** `:6333/collections` → 3 collections: **`prism_skills`, `prism_engines`, `prism_formulas`**. (Restored earlier this session from a renamed-Created leftover — see [[reference_qdrant_down_created_leftover_2026_06_08]].) **OPEN ITEM:** there is NO `prism_tribal` collection — the tribal corpus is STILL a JSON file (159MB, see below), NOT in Qdrant. The Qdrant tribal-collection migration remains the flagged fresh-budget golf unit (the real fix for the tribal JSON scaling ceiling — [[reference_tribal_index_v8_string_cap_2026_06_08]]).

**PSN leg #5 (tribal injection) — ✓ LIVE.** `tribal-rerank.mjs --query "mill cutting force kienzle" --domain mill --k 3` returned 3 real ranked hits (cosine **1.2666 / 1.2415 / 1.2374**) from `mill/tribal-knowledge-store`, citing real hyperMILL docs (`doc-hypermill-en-vol2#10` etc.). Confirms the V8-string-cap fix (`scripts/lib/load-tribal-index.mjs`, commit `182788232a`) is working — the reranker loads the index and reranks. **Index size now 167,637,848 B = 159MB** — UNDER the V8 max-string cap (`0x1fffffe8` = 512MB), so the loader's fast-path `JSON.parse` runs (no over-cap incremental walk needed). It grew from the ~65MB post-clobber-restore baseline as the embed pipeline re-added wiki entries; still has ~353MB of headroom before the string cap, but the heap-OOM ceiling (~150-170MB whole-parse on the default node heap) is now in play — which is why the inject hook carries `--max-old-space-size=8192` (commit `bee977a004`). The JSON index is functional but the Qdrant migration is the durable scaling answer.

**Net `/goal` surface coverage this session (hard evidence):** MCP/back-end-health (U-MCP-FIXSTART, built+tested+live-validated on a real outage) · ollama (verified-good, [[reference_ollama_model_hardware_synergy_2026_06_09]]) · docker (✓) · qdrant (✓) · PSN/tribal-knowledge (✓ live). 5 of the 14 named surfaces verified/advanced. Remaining: obsidian-vault, /system-viz, front-end-build, claude.md-sync, memories, wiki, prism-awareness (mostly auto-injected — verifiable) + per-galaxy synergy (owned by 7 other slots) + the architectural fresh-budget units (Qdrant tribal migration, MCP FIX-1/FIX-2 server-core = papa/backend).
