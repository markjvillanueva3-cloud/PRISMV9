# cam session de8b11fd (2026-06-24, 21.9MB, spine 170KB, 2 slice(s), model gpt-oss:20b)

**SHIPPED**  
- Octopus‑Hermes synergy (5 commits): `U-OCT-HERMES-VOICE`, `U-OCT-PROBE-HERMES`, `U-OCT-DRAIN-HERMES-GROK`, `U-OCT-HERMES-SCOPE-DOC` – Grok voice routed via Hermes OAuth, banner updated, autofire knob added.  
- Skill‑write‑approval gate (`scripts/skill-stage.mjs`) + `/learn-skill`, `/skill-pending`, `/skill-diff`, `/skill-approve`, `/skill-reject`; 18/18 tests passed.  
- Source‑agnostic tribal‑tip generator (`generate-pdf-tribal-tips-hermes.mjs`); 9/9 tests; 505 PDF tips ingested into `cad-cam-pdf-tribal-seeds.json`.  
- Video corpus ingestion fix (`79978939ad`): `videoTipText` reads `.body`; added 617 YouTube tips (8/8 tests).  
- New embedder for PDF tips (`e79424845a`); hash‑skip idempotency, 10/10 tests.  
- Heap‑reexec bump to avoid OOM on full‑index load (`ccd055c235`); 11/11 tests.  
- Decoupled drain & embed: `--no-embed`, separate “PRISM Tribal Embed” task (15 min cadence) (`b99d6c8e7a`).  
- PID‑liveness lock fix for dead run‑lock; SIGTERM/SIGINT release added (`5dc91d9cbc`).  
- Priority ordering: prose manuals → catalogs → drawings (`efcd3ae44f`); 6/6 tests.  
- Embed heap bump to 28 GB, cadence 30 min cap (`99b58f3bb5`).  
- Resources PDF source extension commit (`017245bce3`).  

**DECISIONS**  
- Adopt two‑tier tribal store: `cad-cam-pdf-tribal-seeds.json` for secondary surfaces; defer bulk embedding into fragile `tribal-embed-index.json`.  
- Use local Ollama (qwen2.5‑coder) for high‑throughput PDF drain; Hermes only for high‑value/missing cases.  
- Split resource drain into autonomous tasks: “PRISM Tribal Resources Drain” (20 min, generate‑only) and “PRISM Tribal Embed” (15–30 min, embed‑only).  
- Shard‑safe guarded read/write with atomic temp+rename writes; hash‑skip idempotency; clobber‑guard (>50% shrink).  
- Increase embed heap to 28 GB to accommodate >1.3 GB index loads; keep manual catch‑ups off schedule.  
- Drain PDFs in order of knowledge density (prose manuals → catalogs → drawings).  

**OPERATOR DIRECTIVES**  
- `node scripts/drain-resources-tribal.mjs --status` – report remaining/attempted/textOk.  
- If un‑embedded tips exist, run `node scripts/embed-pdf-tribal-tips-into-index.mjs`.  
- Manual batch if drain stalls: `node scripts/drain-resources-tribal.mjs --max-pdfs 6`.  
- Continue TRIBAL‑KNOWLEDGE DRAIN and other high‑ROI backend work after handoff.  
- Use Ollama only for generation; keep auto‑compaction on.  
- Do not stop while PDFs remain.  
- Set monitoring cron to 30 min (`CronDelete d946b614`).  
- Update `/system-viz` with real‑time metrics: octopus vote counts, Hermes proxy health, `PRISM_CONSENSUS_DRAIN_HERMES_GROK`.  

**FINDINGS/BUGS**  
- `tribal-embed-index.json` fragile; prior session clobbered 1 entry.  
- PDF corpus: ~4,232 image/scan pages, ~1,720 blueprint drawings; only ~77 prose docs produce tips.  
- Video corpus largely already contains tips; no new extraction needed.  
- MCP server at :3100 down; embedding via Ollama does not require MCP.  
- Dead run‑lock left by task‑limit kill → stalled drain; fixed with PID‑liveness check.  
- Embed coupling caused OOM on full index load when task limit killed mid‑embed; resolved by decoupling and heap bump.  
- Priority bug: drawing PDFs drained before rich manuals, yielding 0 tips; fixed by new ordering.  
- Index freeze at ~88 k entries due to concurrent manual catch‑up OOM; avoided by removing manual runs and increasing heap.  

**DOMAIN SPECIFICS**  
- Engines/Actions: `MultiModelConsensusEngine` (voice gating), `GrokClientEngine` (Hermes proxy transport), `hermesProxyReachable()`, `callGrok()` with 3‑way backend.  
- Dispatchers: `/learn-skill` pipeline, `skill-stage.mjs` dispatcher for staged skills, `tribal-embed-index.mjs` embedder.  
- Corpus paths: `H:/PRISM/resources` (4,338 PDFs), `JM DIE` drawings, YouTube video tips.  
- Extraction pipeline: PDF text layer extraction → chunking (~6 k‑char nodes) → Ollama generation (`qwen2.5-coder`, `gpt-oss`) → tip JSONL.  
- Embedding: nomic‑embed-text (768‑dim), shard‑safe guarded read/write, atomic flush, hash‑skip idempotency.  
- Per‑prompt surface: `tribal-embed-index.json` (sharded, 75k+ entries).  
- Metrics: index size ~1.4 GB, 88 850 entries after session; 4,298 PDFs remaining.  

**TOOLS USED**  
- Scripts: `skill-stage.mjs`, `generate-pdf-tribal-tips-hermes.mjs`, `tribal-embed-index.mjs`, `tribal-by-domain-inject.mjs`, `drain-resources-tribal.mjs`, `embed-pdf-tribal-tips-into-index.mjs`, `chunk-pdf-text-to-nodes.mjs`.  
- Windows Scheduled Tasks: “PRISM Tribal Resources Drain” (20 min), “PRISM Tribal Embed” (15–30 min).  
- Cron: 30‑minute monitor (`CronDelete d946b614`).  
- Ollama models: `nomic-embed-text`, `qwen2.5-coder` variants, `gpt-oss`.  
- Git hooks & CI: commit checks, test gates, lock handling.  

**OPEN THREADS**  
1. Sample‑first embedding into `tribal-embed-index.json` (guarded, fail‑loud).  
2. Obsidian vault hardening: schema enforcement, orphaned `.tmp-` cleanup hook.  
3. Hermes CLI integration into Claude‑code‑cli as fallback transport.  
4. `/system-viz` graph updates for octopus and Hermes health metrics.  
5. HTML template updates to consume new tribal‑seed store.  
6. Remaining ~4,300 PDFs to drain (rich manuals pending).  
7. Monitor embed task for occasional OOM spikes; ensure no manual catch‑ups run concurrently.  
8. Verify auto‑compaction keeps index size in check as it grows beyond 100k entries.  
9. Final full‑scale drain of all 4,338 PDFs once system stabilizes overnight.
