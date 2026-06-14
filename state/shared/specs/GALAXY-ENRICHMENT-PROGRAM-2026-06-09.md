# Galaxy Enrichment Program (2026-06-09)

> Operator goal: enrich EACH of the 34 PRISM galaxies one-by-one (one per `/loop` iteration) so each becomes a "world leader in its domain." Owner: papa (cross-cutting methodology) + per-galaxy owner-slot (deep domain). Recurring `/loop` executes against this spec; **resume anchor at the bottom** tells the next fire which galaxy is next.
>
> **TWO LANES (do not blur):**
> - **CROSS-CUTTING (papa-propagatable, UNIFORM):** PC-specs, Ollama roster, how-to-run-loops, Obsidian-vault usage, harness/LoRA/CAG/RAG patterns. Same text every galaxy (templated + idempotent merge). Papa may draft + commit these directly — they carry no unverified domain claim.
> - **DEEP-DOMAIN (owner-slot expertise, PER-GALAXY):** milling physics (mill), SFC physics (speed-feed), discharge physics (wedm), etc. Papa drafts a *scaffold + free-source pointers only*; **the owner slot verifies every numeric/physics claim** before it ships. Unverified domain content is marked `<!-- UNVERIFIED: owner-slot to confirm -->`, never asserted.

---

## Methodology to propagate (uniform across galaxies) — distilled article directives

Each galaxy CLAUDE.md gets ONE block per heading below (1-2 concrete directives each, source-cited). Identical text fleet-wide.

**(1) HOW TO RUN LOOPS** (src: `llm-agent-loop-design.md`)
- Start `/loop <interval> <skill>`; every iteration MUST `loop-state tick --status ok|blocked|done` or `/compact` strands the count. State persists in `state/shared/loop-logs/<galaxy>.jsonl`.
- Dispatch multi-reviewer agents in ONE message (parallel = max-duration, not sum). Subagent prompts are self-contained: goal · absolute file paths · invariants · run-this-test cmd · output format · doctrine refs.
- Call budgets are hard: interactive ~30 soft/60 hard, subagent ~12/25, Ollama harness 5/10. Hitting the ceiling without delivery = wrong starting paths in the prompt, not "needs more turns."

**(2) HOW TO USE THE OBSIDIAN VAULT** (src: `reference_cyrilxbt_obsidian_article_delta_*`, `reference_humza_khalid_obsidian_article_*`)
- Vault is retrieval, not storage — friction kills capture. Write memory to `C:/Users/wompu/.claude/projects/H--prism/memory/*.md`; the `stop-obsidian-memory-feed.mjs` Stop hook auto-feeds → `H:/prism/knowledge/memories/<type>/`. Zero manual tagging.
- Query BEFORE re-deriving: `prism_memory:semantic_search query="<galaxy>" topK=20` (semantic) or `/find` (master-index). Index-over-embeddings: atomic notes + `[[wikilinks]]` keep recall ≤200 tokens.
- Push-beats-pull: weekly synthesis ritual (`/weekly-synthesis`) emits emerging-thesis + contradictions + gaps + 1 action; contradiction-detector flags new-vs-saved conflicts to `wiki/log.md`.

**(3) HARNESS PATTERNS** (src: `reference_agentic_harness_articles_*`, `reference_rody_cyril_claude_setup_articles_*`)
- Orchestration lives in CODE, not the model — routing/retries/status-codes are deterministic JS (R5). Agents reason only.
- Multi-timescale compounding loops (ms→weeks) are the OS: fleet-task-health · fleet-memory-monitor · `/loop` cadence · weekly synthesis · per-Stop probes · cron watchdogs. Crash-critical tasks AUTO-re-enable + test, don't just warn.
- 4-layer self-check before commit: CLAUDE.md protocol (≤250 lines, skimmed past that) + PostToolUse lint/type + Stop test-suite hook + subagent reviewer. Never `--skip-hooks`.

**(4) LoRA** (src: `reference_xray_blueprint_lora_stage_*`, `reference_whiskey_lathe_lora_tier_complete_*`)
- Domain owns its LoRA tier, CLONED (not forked) from india's `CrossProcessNeuralLearningEngine` substrate. Stage via `trainset.jsonl → LoRABridgeEngine` (trainable-only fields, `String(value_mm)`, fold type+signals into context).
- Deploy gate = AUROC≥0.78 / macroF1≥0.55 / Brier≤0.15 **on OPERATOR_VERIFIED data, never pseudo-labels** + measured-lift-over-incumbent. Verdict promote|hold|reject; shadow→canary→active.
- Do NOT route through `ContinualLoRAEngine` / `prism_ml continual_lora_*` (stub `Math.random`). Blackwell sm_120 needs torch≥2.7/cu128 + peft/datasets/trl; vision LoRA needs pixels, not path strings.

**(5) CAG (cache immutable doctrine)** (src: `reference_articles_memory_cag_*`, `PromptCachingEngine.ts`)
- Every static-info vector-DB hit is wasted cost — cache static doctrine in model KV; retrieve only dynamic. Migrate high-fire static blocks (CLAUDE.md slice, RTK, dispatcher map) from per-turn → SessionStart cached blocks via `PromptCachingEngine.buildCachedSystem()`.
- Reads = 0.1× input, writes = 1.25×; break-even after ~1 repeat on a >1024-token block. 4 breakpoints/request, 5min TTL. Target Claude-Code's ~92% hit-rate; instrument with `recordUsage()`.

**(6) RAG (retrieve mutable state)** (src: `reference_articles_memory_cag_*`, `llm-agent-loop-design.md`)
- RAG for recent memories / active work / per-turn context (contrast CAG = immutable). Embedding model `nomic-embed-text` local on GPU.
- Layer-3 write-time filter: "would this change how the agent acts next time?" — discard static parroting, keep signal. Tribal RAG = read-only Ollama harness (viz_search + wiki_lookup + read_excerpt, frozen allowlist, 5/10 cap, ~0 Claude tokens).

**(7) PC-SPECS + OLLAMA ROSTER** (uniform operational block, identical fleet-wide)
- Box: **RTX PRO 6000 Blackwell 96GB · Ryzen 9 9950X3D 32T · 127GB RAM · NVMe** (`feedback_build_for_blackwell_hardware`). Gap is utilization, not capacity — size builds to this box.
- Roster (probe via `OllamaCapabilityProbeEngine`, fallback to cloud on null): `gpt-oss:120b` (deep reasoning/physics/hypothesis), `gpt-oss:20b` (quick lookup/filter/synthesis), `qwen2.5-coder:32b` (engine/test/hook codegen), `qwen2.5-coder:1.5b` (fast lint/rename), 5 VLMs (domain vision), `nomic-embed-text` (semantic search).

---

## Per-galaxy enrichment template (checklist each iteration applies)

Target files: `mcp-server/src/engines/<galaxy>/{CLAUDE.md,MEMORY.md,PATHS.md,TOOLBELT.md}`. Idempotent merge — re-running a galaxy updates, never duplicates.

**CLAUDE.md** (cap ≤250 lines; pointers + local gotchas only, no root-doctrine duplication):
- [ ] §PC-Specs & Ollama Utilization — paste uniform block (7) + ONE domain-specific VLM/offload example (e.g. mill: tool-wear-from-spindle-load; cad: feature-recog-from-screenshot). `<!-- UNVERIFIED -->` the example until owner confirms it's a real task.
- [ ] §HOW TO RUN LOOPS — uniform block (1) + 1-2 *recommended* loops for this galaxy (interval + skill + purpose).
- [ ] §HOW TO USE THE OBSIDIAN VAULT — uniform block (2) + this galaxy's vault paths (`knowledge/{memories,wiki,tribal}/<galaxy>/`).
- [ ] §Harness / LoRA / CAG / RAG — uniform blocks (3)-(6) + this galaxy's dispatcher names + whether it ships a LoRA tier.
- [ ] §Domain gotchas — owner-slot adds 3+ cited lessons; papa leaves `<!-- owner-slot: fill 3 gotchas -->` placeholder if no owner.

**MEMORY.md** (cap ≤200 lines):
- [ ] Master-brain link (UP `semantic_search`, DOWN auto-feed, back-pointer row present in master MEMORY.md).
- [ ] High-ROI memories: ≥5 live learnings (auto-gen by `scripts/fill-galaxy-memory-sections.mjs` where it exists; else papa lists from `semantic_search`).
- [ ] Free-source pointers added (§ below) so future research is one lookup away.

**PATHS.md / TOOLBELT.md**: append Ollama integration points, vault feed source/sink, LoRA artifact paths, Ollama-routed action table, loop-trigger table.

**Verification before the galaxy counts shipped:**
- Cross-cutting blocks: papa self-reviews (no domain claim → no owner gate needed).
- Domain blocks: **owner-slot R12 gate** (below) — REQUIRED if any numeric/physics/safety claim was added.

---

## Free-source research framework (domain-type → reputable free sources + ingest tool)

| Domain type | Galaxies | Top free sources | Ingest tool | Owner verify |
|---|---|---|---|---|
| **Cutting physics** | mill, lathe, wedm, speed-feed | MIT OCW 2.008/2.810, NIST cutting-force/ISO 3685, Machinery Handbook, Sandvik/ISCAR/OSG free catalogs, Agie-Charmilles/Mitsubishi WEDM manuals, Titans-of-CNC YouTube | `/pdf-learn` (use lima pypdf, `feedback_use_lima_pypdf_page_extractor`) + `/video-learn` | owner spot-checks 3-5 formulas/cycle |
| **CAD/CAM/post** | cad, cam, post-processor, blueprint-vision | Fusion360/FreeCAD docs, ISO 286/14649/6983, Fanuc/Okuma/Haas programming manuals, ASME Y14.5 + ISO 1101 GD&T (extract-friendly), vendor CAM YouTube | `/pdf-learn` + `/video-learn` | owner verifies syntax/strategy/feature gates |
| **AI/corpus** | ai-training, pdf-corpus(-mill), corpus-aggregation, mit-curriculum, knowledge-conversion, academy, tribal-knowledge | arXiv, fast.ai, HuggingFace docs, Karpathy "Zero to Hero", MIT OCW (2000+ courses), Project Gutenberg, OpenStax | `/learn-corpus`, `/pdf-learn`, `/shop-knowledge` (proprietary JM Die) | india/lima verify accuracy vs baseline |
| **Business/quoting** | business, quoting, frontend-app | SBA.gov, IRS pubs, NIST cost-estimation/OEE, BLS labor rates, Xometry/Protolabs public pricing, Goldratt summaries | `/pdf-learn` + `/web-fetch` | hotel/charlie verify P&L/quote accuracy |
| **Quality/safety** | quality, compliance-safety, shop-floor | NIST QUAM, ISO 14253-1/12100 (summaries), OSHA/ANSI B11.19, Six-Sigma/SPC Nelson rules (NIST) | `/pdf-learn` + `/video-learn` | owner verifies Cpk + S(x) thresholds |
| **System/infra** | system-viz, fleet-hygiene, discovery, wiring, bug-hunting, backend-helper, dormant-data, agent-orchestration, hermes-zulu, token-optimization, database-expansion, cad-fusion-live | Anthropic Claude docs, agentic-harness articles (operator-provided), prompt-caching guides, graph-algo papers (arXiv), Obsidian PKM articles | operator-provided memos + `/web-fetch` | papa (cross-cutting, no domain gate) |

Source reliability ranking (prefer top): MIT OCW / arXiv / NIST / ISO (⭐⭐⭐⭐⭐) > Machinery Handbook / vendor manuals (⭐⭐⭐⭐) > YouTube technical / Reddit (⭐⭐⭐, curate). **Use only legal free sources** — the ⭐⭐⭐⭐⭐/⭐⭐⭐⭐ legal tier (MIT OCW, arXiv, NIST, ISO summaries, OpenStax, Project Gutenberg, vendor docs) is more than sufficient; never pirated or paywalled material. **R12: every ingested fact is `<!-- UNVERIFIED -->` until the owner spot-check passes.**

Ingest pipeline: discover (operator URL or `/learn-corpus <kw>`) → ingest (`/pdf-learn`|`/video-learn`|`/web-fetch`) → normalize (gpt-oss:20b → wiki-article schema) → stage (`knowledge/wiki/<galaxy>/_staging/`) → owner-approve → feed + embed (`nomic-embed-text`).

---

## Ollama-offload plan (what → gpt-oss:120b vs Claude vs owner-verify)

| Enrichment step | Primary | Polish | Verify gate |
|---|---|---|---|
| Source discovery | operator / `/web-fetch` | — | operator final-call |
| PDF/video ingest + chunk | `/pdf-learn` + gpt-oss:20b | — | owner spot-check 1-2 articles |
| Physics/domain wiki draft | **gpt-oss:120b** (reads theory, cites) | Claude (links/format) | **owner R12 spot-check** |
| Code/engine/test draft | **qwen2.5-coder:32b** | Claude (review) | tests pass |
| Tribal pattern mining | **gpt-oss:120b** (100+ tips → patterns) | Claude (context) | owner verifies 3 tips |
| Cross-cutting CLAUDE.md blocks | **papa** (uniform text) | — | papa self-review (no domain claim) |
| MEMORY.md high-ROI synthesis | gpt-oss:20b + auto-feed | Claude | owner quarterly checklist |
| Semantic embed/index | `nomic-embed-text` (local GPU) | — | recall ≥85% on 10 queries |

**Rule:** gpt-oss:120b owns domain reasoning DRAFTS (cheap, cited); Claude owns synthesis + cross-ref + contradiction resolution; the OWNER SLOT owns truth. Failure path: owner finds an off-value (e.g. Kienzle kc1.1=1200 vs canonical 1800 for P) → re-prompt gpt-oss:120b with atomic query + ISO ref → re-approve. No stub article ships.

---

## Enrichment order (sparsest + highest-leverage first)

Cross-cutting blocks land on ALL 34 regardless of order (papa batch-templatable). This order governs the DEEP-domain pass (owner verification, free-source ingest):

**Wave 0 — high-leverage infra (cascades to all slots):**
1. ai-training (india) — LoRA cadence drives all cutting-domain fine-tunes
2. system-viz (sierra) — degradation cascades to master-index every slot queries
3. speed-feed (oscar) — all cutting ops depend on SFC

**Wave 1 — hot revenue domains (frequent queries):**
4. mill (foxtrot) · 5. lathe (whiskey) · 6. wedm (mike) · 7. quoting (charlie) · 8. business (hotel)

**Wave 2 — domain completeness:**
9. cad (delta) · 10. cam (kilo) · 11. post-processor (echo) · 12. blueprint-vision (xray) · 13. academy (lima) · 14. quality · 15. shop-floor

**Wave 3 — sparse/stub fill (sparsest CLAUDE.md first):**
16. agent-orchestration (33ln) · 17. knowledge-conversion (52ln) · 18. compliance-safety (55ln) · 19. corpus-aggregation · 20. pdf-corpus-mill · 21. tribal-knowledge · 22. frontend-app · 23. fleet-hygiene · 24. cad-fusion-live · 25. mit-curriculum · 26. pdf-corpus · 27. database-expansion · 28. hermes-zulu · 29. token-optimization · 30. discovery · 31. bug-hunting · 32. backend-helper · 33. dormant-data · 34. wiring

**Unassigned-owner note:** lathe/wedm/cam/quality/compliance/system-viz domain experts may be unclaimed at fire time. If no owner, papa ships ONLY the cross-cutting blocks + a `<!-- owner-slot: verify domain gotchas -->` placeholder, ticks `blocked-domain`, and moves on. Cross-cutting still counts as progress.

---

## Per-iteration loop protocol (one `/loop` fire)

1. **PICK** — read Resume anchor below → next galaxy in order whose status ≠ `done`. Claim via `loop-state`.
2. **RESEARCH** — `/learn-corpus` / `/pdf-learn` / `/video-learn` against the free-source row for this domain type → gpt-oss:120b drafts domain blocks, qwen2.5-coder:32b drafts any code. Cross-cutting blocks come from the template (no research).
3. **DRAFT** — merge into the 4 galaxy files per the template. Mark every domain numeric/physics/safety claim `<!-- UNVERIFIED: owner-slot to confirm -->`.
4. **VERIFY** — **owner-verification gate:** if any domain claim was added AND an owner slot exists, dispatch the owner (or owner-domain reviewer agent) to spot-check 3-5 claims against the cited source. **R12: no unverified domain claim ships unmarked** — either the owner confirms (strip the UNVERIFIED tag) or it stays tagged/removed. Cross-cutting blocks need only papa self-review. Then run the per-file 2-reviewer scrutiny (CLAUDE.md §PER-FILE SCRUTINY GATE) on each edited file.
5. **COMMIT** — `[GALAXY-ENRICH]/U-GE-<galaxy>: enrich <galaxy> (cross-cutting + <N> verified domain blocks)`. 3-of-3 Stop gate per §SCRUTINY GATE.
6. **TICK** — `loop-state tick --status done` (or `blocked-domain` if owner-gated content deferred). Update the Resume anchor line below in the same commit.

**Done-definition (per galaxy):** 4 cross-cutting CLAUDE.md sections present + MEMORY.md high-ROI ≥5 + free-source pointers added + (owner-verified domain gotchas OR explicit `blocked-domain` marker). Auto-invoke proven by editing a file under `mcp-server/src/engines/<galaxy>/` and confirming Bibryam cascade loads the CLAUDE.md.

---

## Resume anchor

> The next `/loop` fire reads THIS line, picks the first galaxy in Enrichment-order whose box is unchecked, and updates it on commit. Single source of truth for "which galaxy is next" — do not rely on loop-state alone (survives `/compact`).

**CROSS-CUTTING LANE: 34/34 DONE** (batch via `scripts/galaxy-xcut-propagate.mjs`, papa 2026-06-09 — uniform methodology section on EVERY galaxy CLAUDE.md; idempotent + drift-resistant pointer-to-canonical, not 34× duplication; ai-training hand-tuned, other 33 templated with `<!-- owner-slot -->` placeholders for galaxy-specific loops/offload examples). Re-run the script only when the doctrine changes.

**DEEP-DOMAIN PASS STATUS (papa 2026-06-09):** 14 of the 15 domain galaxies now have a STAGED, cited, UNVERIFIED research packet (batches 1-3, commits `94242f4d1b`+`5fe207c514`+`baae77c6bd`); tracker `GALAXY-DEEPDOMAIN-STAGED-2026-06-09.md`. The 315 verifiable source pointers across all packets are extracted + tiered + deduped into **`GALAXY-FREE-SOURCE-CORPUS-2026-06-09.md`** (generator `scripts/build-galaxy-free-source-corpus.mjs`, idempotent) — the R12-safe, non-stagnant, auto-discoverable corpus index (verifiable pointers only; physics claims stay owner-gated in `_staging/`). `system-viz` (infra) is served by cross-cutting, not external-source.

**VERIFY-PROMOTE DONE (papa 2026-06-09): 14/14 domain galaxies promoted to LIVE VERIFIED wiki (13 in first pass + ai-training; all then deepened -- see DEEPEN DONE below).** academy (`b7e7e221e0`, hand-verified) + 12 via ultracode wave-chunked Workflow `w2bf85dcm` (`18277c7973`, 2.17M tok offloaded, 3/wave to dodge the rate-limit burst that killed the first 12-at-once run): business/shop-floor/blueprint-vision/quoting/quality/cad/post-processor/speed-feed/mill/lathe/wedm/cam. Each now has `knowledge/wiki/<g>/<g>-foundations.md` (status VERIFIED-PARTIAL): every promoted claim was confirmed by a live WebFetch of its primary source; physics galaxies promoted ONLY formula structure/method (main-loop grep-backstop confirmed ZERO numeric cutting constants leaked — kc1.1/Taylor/chip-loads stay `constants.ts`-gated in `_staging`); subagents honestly gated unfetchable sources (403/TLS/image-only) rather than fabricate. ~57 claims promoted, ~110 gated.

**DEEPEN DONE (papa 2026-06-09): all 14/14 domain galaxies now verify-promoted AND deepened to encyclopedic breadth.** `ai-training` foundations CREATED (`c8513847fa`, completing 14/14) + the 13 existing foundations DEEPENED via ultracode wave-chunked Workflow `wqxh16fl0` (2.27M tok offloaded): ~180 additional WebFetch-confirmed claims drawing on the operator's previously-UNTAPPED source categories — **free college courses** (MIT OCW 2.810/2.830J/2.854/2.158J/6.801/6.003, Stanford CS224W), **free textbooks** (OpenStax CC-BY, d2l.ai, Szeliski, LibreTexts), **gov reports** (NIST e-Handbook/GUM/MBE/AI-RMF, NASA-HDBK-5026, DOE/Sandia, OSHA). R12/safety held + main-loop grep-verified: physics galaxies added ONLY formula structure/theory/standards (Taylor V*T^n=C form, Merchant model, Ra-integral structure) — ZERO numeric cutting constants leaked; subagents disclosed every 403/TLS/404 as attempted-only. Append-only (existing content preserved). foundations now run 95-215 lines each.

**NEXT (owner-gated, NOT papa):** each owner slot reviews its `<g>-foundations.md`, confirms the `[Owner-gate]` numeric/safety specifics against `constants.ts`/source, and folds survivors into live engines/doctrine (flip VERIFIED-PARTIAL → VERIFIED). papa's enrichment lanes (cross-cutting 34/34 + corpus + MEMORY anchors + verify-promote 13/14) are COMPLETE bar the ai-training promotion.

**Progress (tick on commit; [~] = cross-cutting✓ + deep-domain STAGED/owner-gate):**
- [~] 1 ai-training · [ ] 2 system-viz (infra, xcut-only) · [~] 3 speed-feed
- [~] 4 mill · [~] 5 lathe · [~] 6 wedm · [~] 7 quoting · [~] 8 business
- [~] 9 cad · [~] 10 cam · [~] 11 post-processor · [~] 12 blueprint-vision · [~] 13 academy · [~] 14 quality · [~] 15 shop-floor
- [ ] 16 agent-orchestration · [ ] 17 knowledge-conversion · [ ] 18 compliance-safety · [ ] 19 corpus-aggregation · [ ] 20 pdf-corpus-mill · [ ] 21 tribal-knowledge · [ ] 22 frontend-app · [ ] 23 fleet-hygiene · [ ] 24 cad-fusion-live · [ ] 25 mit-curriculum · [ ] 26 pdf-corpus · [ ] 27 database-expansion · [ ] 28 hermes-zulu · [ ] 29 token-optimization · [ ] 30 discovery · [ ] 31 bug-hunting · [ ] 32 backend-helper · [ ] 33 dormant-data · [ ] 34 wiring
