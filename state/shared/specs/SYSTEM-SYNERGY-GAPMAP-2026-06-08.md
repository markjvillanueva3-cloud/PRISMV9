# SYSTEM-SYNERGY GAP-MAP — 2026-06-08 (golf, ultracode synergy loop)

**Method:** rate-limit-proof LOCAL probes (curl / scripts / parser / git — NO Claude subagents, after an 11-agent API fan-out tripped a server throttle). Cross-cutting infra is golf-verified; per-galaxy internals are owned by their slots (7 `/loop` sessions active).

## Per-surface synergy state (verified this pass)

| Surface | Wired | Tested | Validated | Evidence |
|---|---|---|---|---|
| **Ollama** | ✅ | ✅ | ✅ | 10 models; cost-router tiers all installed (cheap-tier gap FIXED iter1, 1.5b @221 tok/s); 3 resident, 41G/96G; GPU residency optimal |
| **MCP :3100** | ✅ | — | ⚠ | up (200) now, but **flapped 3× this session** (ECONNREFUSED→daemon restart). Stability is the gap. |
| **Qdrant** | ✅ | ✅ | ✅ | up; collections prism_engines(3866) / prism_skills(241) / prism_formulas(32). Vector search live. |
| **Docker** | ✅ | — | ✅ | 4 healthy: prism-qdrant/grafana/postgres/prometheus (~1h up). MCP runs as node daemon, not a container. |
| **System-viz** | ✅ | — | ✅ | graph 676MB, age 0.8h (FRESH — was 8h stale, regen'd this session). |
| **Backend build** | ✅ | ✅ | ✅ | dist built; tsc clean (last build ~15m). |
| **Hooks** | ✅ | ✅ | ✅ | hookify parser loads 228 rules, **0 stderr** (frontmatter+charmap fix holds); dangling refs removed. |
| **Tests (TDD)** | ✅ | ✅ | ✅ | sample suite 10/10 pass (ask-ollama incl. new harmony/num_predict tests). |
| **Dispatchers** | ✅ | — | partial | 107 dispatchers; named galaxies (mill/cam/quoting/business/cad) wired. **90 of 3782 engines UNWIRED.** |
| **Memories/Obsidian** | ✅ | — | ✅ | file-vault + Stop-hook auto-feed live. Recall on AgentDB/HNSW (NOT qdrant — the cag `qdrant://prism-memory` label is cosmetic). |
| **Wiki** | ✅ | partial | ⚠ | 1450 index lines; coverage % stuck — embedder WRITE blocked by the V8 string cap (gap #5), needs sharding. |
| **Tribal/Awareness** | ✅(read) | ✅ | ✅(read) | **tribal index READ restored** (`182788232a`) — was V8-string-cap-dead fleet-wide; rerank live again. master-index + awareness injectors wired; **academy tribal route BROKEN** (DOMAIN_MAP/VALID_DOMAINS missing academy → lima). |
| **PSN (11 legs)** | ✅ | — | partial | leg-state hook live; NN/GNN leg SELECTIVE-DEPLOY (AUROC 0.808, below full-coverage gate → india). |
| **Frontend** | partial | — | ⚠ | **3 merges pending** (cqask/ui, mcp-cadquery/frontend, +1). |
| **Galaxies (internal)** | — | — | — | NOT golf-verifiable — owned by foxtrot/whiskey/mike/kilo/charlie/delta/lima (active loops). |

## Ranked gaps (fleet work-order)

| # | Gap | Sev | Surface | Owner | Action |
|---|---|---|---|---|---|
| 1 | **Ollama offload 13% vs 30% target; GPU at 0% util** while Claude API rate-limits | P1 | ollama/efficiency | india/alpha | Route mechanical/audit/summarize/classify work to local Ollama (roster now ready). [[feedback_workflow_concurrency_and_local_routing_2026_06_08]] |
| 2 | **MCP :3100 instability** — flapped 3× this session | P1 | backend | papa | Root-cause the disconnect loop; harden the daemon/watchdog single-flight. |
| 3 | **90 engines UNWIRED** (built, not invokable) | P1 | dispatchers | per-galaxy | Per-engine triage (wire / WIRE-EXEMPT / archive). [[reference_unwired_engine_gap_audit_2026_06_08]] |
| 4 | **Academy tribal route broken** (DOMAIN_MAP + VALID_DOMAINS missing academy) | P2 | tribal | lima | Add academy domain + academy-tagged tribal corpus. |
| 5 | **Tribal index crossed V8's 512MiB string cap** → tribal injection (PSN leg #5) was SILENTLY DEAD fleet-wide; READ now restored, WRITE still blocked | P0→partial | wiki/tribal | golf✓ / sharding-next | **READ FIXED** (`182788232a`): cap-safe `loadTribalIndex` buffered loader wired into live `tribal-rerank.mjs` + embedder read; validated on real 537MB/33,639-entry index. **WRITE still blocked** — `JSON.stringify` of a >cap object also throws; appending new entries needs index sharding (next unit). Coverage % can't grow until then. [[reference_tribal_index_v8_string_cap_2026_06_08]] |
| 6 | **3 frontend merges pending** | P2 | frontend | quebec | Merge cqask/ui + mcp-cadquery/frontend. |
| 7 | **cag-router advertises `qdrant://prism-memory`** (non-existent collection) | P3 | awareness | golf | Correct the display label to the real AgentDB/vault backend (cosmetic, no live consumer). |
| 8 | **5 scheduled tasks degraded** (Hermes-Obsidian Bridge, PDF Corpus Watcher, etc.) | P2 | infra | operator | INTENTIONAL HW-migration freeze — re-arm post-migration (elevated). [[project_scheduled_task_migration_freeze_2026_06_08]] |

## Honest scope note
"Everything synergized node-by-node, galaxy-by-galaxy" is a **fleet-wide, multi-session** effort. This pass verified the **cross-cutting infrastructure** (golf's lane) is mostly healthy with 8 concrete gaps + owners. Per-galaxy internal synergy (engine-level wiring/tests for mill/lathe/wedm/cam/quoting/cad/academy) is owned by those slots and tracked separately. This gap-map is the actionable fleet work-order; it is updated each synergy-loop iteration.
