# ai-training session d5f2ac5e (2026-06-03, 24.1MB, spine 171KB, 2 slice(s), model gpt-oss:20b)

**SHIPPED**  
- `511c6b2fa2` – PSN synergy fix: de‑isolate Obsidian & tribal legs; added bounded out‑edge scanners (`scanObsidianOutEdges`, `scanWikiOutEdges`) + streaming helpers (`countNeedleStreaming`, `streamSourceHistogram`).  
- `269676e227` – Companion tests hardening of collector (11/11 PASS).  
- `b64475b058` – Wiki leg out‑peer expansion to 10 peers; coverage_pct ↑ from ~10 % → 100 %.  
- `81c2c476d1` – Tribal leg recovered: node_count 0 → 33,049; streaming histogram for 530 MB index.  
- `1be4e99e06` – Density‑floor recalibration in `PSNSynergyInspectorEngine`: absolute floor replaced by scale‑invariant quantile ranking; P0 count ↓ from 37 → 19 on real data.  
- `cdff2006ca` – Removed divergent fallback in `psn-synergy-rank.mjs`; fixed Windows ESM import path bug.  
- `eecd3b0a4c` – Obsidian vault auto‑discovery (`resolveObsidianVault`) added; `obsidian_sync_status.configured:true`.  
- `b1bf46b3b1` – Five‑leg out‑edge scan (algorithms, formulas, nn_gnn, prism_os, prism_ai); PSN measurement layer honest (p0 19→10).  
- `d71daf0ab8` – Memories false‑positive fix + per‑file binary scanning; 3‑of‑3 PASS.  
- `f3de817393` – Footer‑membership & self‑name stripping for formulas & nn_gnn; resolves R12 vanity.  
- `8f99466e75` – Bridge #7 ownerSlot routing column added; memories de‑duplication (stand‑alone standing‑subset scan).  
- `0a65003aec` – HTML companion for PSN‑LEG‑OWNER spec.  
- `6792f2a98e` – Wiki lesson appended & handoff written.  
- `fc9c173ee8` – Conflict #1 resolved as false positive (31.5% vs 0.8–1.1%).  
- `33ad35ecb4` – PSN‑LEG‑OWNER routing hook added; 73/73 tests, 3‑of‑3 PASS; owner tags rendered.

**DECISIONS**  
- Adopt collector‑first strategy: all PSN legs gathered via `psn-synergy-collect.mjs`; inspector consumes live inventories only.  
- Replace absolute density floor with quantile ranking to make ROI bands meaningful at thousands‑node scale and eliminate false P0 flags.  
- Use bounded streaming (`countNeedleStreaming`, `streamSourceHistogram`) over full JSON parse for large tribal index (530 MB) to avoid OOM.  
- Enable per‑file binary presence (`opts.perFile`) for honest connectivity weights; strip generator footers & self‑name tokens to prevent regex over‑counting.  
- Map each PSN leg to an owning slot via `PSN_LEG_OWNER` hook and expose lightweight health routing.  
- Curate bridge queue (`priority‑queue.mjs`) instead of raw “111 unwired” list to avoid cargo‑cult wiring.  
- Keep recurring loop active at 5 min cadence; auto‑expire after 7 days, cancelable via `CronDelete`.  
- Activate `/yolo-mode` for autonomous loop with zero questions and no unit cap; schedule recurring cron (`1c4992c4`).  
- Use `/precompact` after ~60 % context to reset token budget.

**OPERATOR DIRECTIVES**  
- `/loop [interval] <prompt>` – schedule recurring prompt.  
- `/checkin-alpha` – force‑take alpha slot and run full checkin pipeline.  
- `/compact` – reset context before next cron fire.  
- `/handoff` – write handoff file for cross‑slot work.  
- `/yolo-mode` – autonomous loop, no questions.  
- `/loop 5m /yolo-mode` – schedule recurring 5 min loop.  
- `/precompact` – reset token budget after ~60 % context.

**FINDINGS/BUGS**  
- Collector blind spots: Obsidian, wiki, memories legs initially reported only 3–4 out‑peers; tribal leg had zero nodes due to wrong path & full JSON parse.  
- Density‑floor bug: absolute threshold caused all pairs to score P0 regardless of real connectivity.  
- Windows ESM import bug in `psn-synergy-rank.mjs` (bare `H:/…` path) always triggered fallback, hiding new inspector logic.  
- CRLF flip during large file edit introduced 2,800‑line noise commit; fixed by restoring LF convention.  
- Vanity inflation: `formulas → system_viz` template frontmatter + footer; `nn_gnn → engines` self‑name inflation.  
- Double‑counting from regex overlap resolved via binary mode & flag drop.  
- False positives in unwired engine audit (EmbeddingFilter/FeedbackCollector already wired).  
- Lane violation: commit accidentally staged peer files; fixed with `git reset -q`.  
- Index.lock contention during commits handled by waiting for lock release.  
- 3‑of‑3 gate initially failed due to missing owner tags; resolved by adding PSN_LEG_OWNER hook and drift‑guard test.

**DOMAIN SPECIFICS**  
- **Engines/Dispatchers**: `PSNSynergyInspectorEngine`, `psn-synergy-collect.mjs`, `psn-synergy-rank.mjs`.  
- **Metrics**: `under_wired_score`, `density`, `roi_band`, `coverage_pct` (scale‑invariant), honest cross‑ref counts, owner‑tagged health surface.  
- **Legs/Detectors**: 11 PSN legs (`obsidian_brain`, `prism_os`, `wiki`, `memories`, `tribal`, `system_viz`, `engines`, `algorithms`, `formulas`, `nn_gnn`, `prism_ai`).  
- **Owner mapping**: `PSN_LEG_OWNER` → slot assignment (`alpha, golf, sierra, papa, tango, india`).  
- **Bridge queue**: curated 42‑unit priority queue (`priority-queue.mjs`) for wiring/deep‑integration.  
- **Unique features**: Obsidian vault auto‑discovery, tribal index streaming, density‑floor recalibration.

**TOOLS USED**  
- PRISM CLI helpers (`chat-slots.mjs`, `checkin.md`, `startup.md`).  
- RTK shell commands (`rtk git`, `rtk vitest run`, `rtk tsc`).  
- Ollama offload (`/ollama-*` skills).  
- System‑viz query (`system-viz-query.mjs`).  
- Wiki‑query, memory search, tribal search.  
- Build & test harnesses: TSC, esbuild, vitest.  
- Review & gate: `scrutiny-3way.mjs`.  
- Slot/loop management: `/checkin-alpha`, `/loop`, `/compact`, `/handoff`, `CronCreate/CronDelete`.

**OPEN THREADS**  
- 19 zero‑ref P0 pairs remain; need real cross‑refs (e.g., `prism_ai → memories`, `nn_gnn → system_viz`).  
- TSC errors in `shopDispatcher.ts` and other backend slots block clean per‑file dist build.  
- Remaining single‑peer legs (`algorithms`, `formulas`, `nn_gnn`, `prism_os`, `prism_ai`) still require production bridges to reach full synergy.  
- **U‑BRIDGE‑WIRE‑MILL** – pending execution in fresh context (cron + `/compact`).  
- **Conflict #4** – master `MEMORY.md` sync date reconciliation.  
- **Wiki↔tribal NN backfill** – heavy compute, to be scheduled after current loop.
