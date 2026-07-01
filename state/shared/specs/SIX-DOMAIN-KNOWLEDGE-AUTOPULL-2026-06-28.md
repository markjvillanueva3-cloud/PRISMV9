---
artifact: six-domain-knowledge-autopull-plan
domains: [delta/cad, echo/post-processor, foxtrot/mill, mike/wedm, whiskey/lathe, kilo/cam]
owner_slot: zulu
generated_at: 2026-06-28
method: 6 parallel sonnet auditors + opus synthesis w/ ground-truth correction (Workflow wf_5b8d61b6-88f)
status: verified
---

# 6-DOMAIN KNOWLEDGE-MAXIMIZATION + AUTO-PULL — BUILD PLAN

Now I have ground truth. The picture is materially different from the audits:

- **delta/cad, echo/post-processor, foxtrot/mill, whiskey/lathe ARE wired** via `ups-domain-bundle.mjs` (which IS in settings.json, C=1 H=1). The audits' "0 refs = unwired" conclusion is a false negative — they grepped the hook name in settings.json but the bundle is the indirection layer.
- **kilo/cam and mike/wedm have NO domain-inject hook at all** — not in the bundle, no file on disk. These are the real gaps.
- **Cross-substrate roost edges EXIST for all 6** (cad 25, cam 13, lathe 13, mill 14, post 36, wedm 13) — cam audit's "0 total / file empty" claim is wrong (file is 20MB, Jun 26).
- **CAG `prism_cam` appears only as a dispatcher-name string** in one entry's keyword list, not as a doctrine-file anchor. No domain `MEMORY.md`/`synthesis` files are cold-anchored — that gap is real for all 6.

This changes the whole plan. Let me write it.

```markdown
# 6-DOMAIN KNOWLEDGE-MAXIMIZATION + AUTO-PULL BUILD PLAN
**Scope:** delta/cad · echo/post-processor · foxtrot/mill · mike/wedm · whiskey/lathe · kilo/cam
**Goal:** maximize per-domain knowledge/nodes/wirings AND make it auto-pull into context when logically relevant (no idle data).
**Author:** zulu orchestrator synthesis. Verdicts reconciled against ground truth (audits had 3 material false-positives — see footnotes).

> **GROUND-TRUTH CORRECTIONS (verified this session, supersede the audits):**
> - **C1 — domain-inject hooks ARE wired, via a bundle.** `delta-cad`, `echo-post`, `foxtrot-mill`, `whiskey-lathe` (+ xray, sierra, lima, charlie) all dispatch through `.claude/hooks/bundles/ups-domain-bundle.mjs`, which **is** in settings.json (`grep ups-domain-bundle` → C=1 H=1). The audits grepped the hook *name* in settings.json (→0) and concluded "unwired." False negative. The "wire it into settings.json" actions for cad/mill/lathe are **already done** — the real fix is adding the missing domains to the bundle.
> - **C2 — kilo/cam and mike/wedm have NO domain hook at all.** Neither is in `ups-domain-bundle.mjs` `SUB_HOOKS` (verified: grep for kilo/cam/mike/wedm → 0 hits), and no `kilo-cam-*` / `mike-wedm-*` inject file exists on disk. These two are the genuine awareness-inject gaps. (`tribal-by-domain-inject.mjs` *does* cover wedm+cad domains separately and is wired — so wedm/cad still get top-3 tribal tips, just not a full galaxy-brain inject.)
> - **C3 — cross-substrate roost edges exist for all 6.** File is `state/shared/system-viz/cross-substrate-edges-augmentation.json` (20 MB, Jun 26). `ghost.galaxy.*` hits: cad 25, cam 13, lathe 13, mill 14, post-processor 36, wedm 13. The cam audit's "file empty / 0 total edges" is **wrong** (likely read a stale/wrong path). The real cross-substrate gap is *documented-by depth* (wiki/memory→roost), not absence.
> - **C4 — CAG cold-anchors are doctrine FILES; no domain doctrine is anchored.** `COLD_SOURCES` in `scripts/lib/cag-router.mjs` has 6 global entries (claude-md, memory-md, engine-digest, dispatcher-digest, physics-constants, wiki-index). `prism_cam` appears only inside one entry's keyword array — NOT a cam doctrine anchor. So **all 6 domains lack a CAG cold-tier doctrine entry.** This gap is real and uniform — the single best build-once target.

---

## 1 — AUTO-PULL COVERAGE MATRIX
Verdicts reconciled to ground truth (corrections flagged ⚠ where they diverge from the source audit).

| domain | tribal-inject | CAG | RAG | xsub-edges | graph-nodes | galaxy-mine | unwired | top auto-pull gap |
|---|---|---|---|---|---|---|---|---|
| **delta/cad** | ✅ via bundle ⚠ (+tribal-by-domain) | ❌ none | ❌ none | ✅ roost (25 hits) ⚠ | ⚠ UNVERIFIED (sidecar stale, 9 entries) | ⚠ completion-cron only, no knowledge-mine | ⚠ UNVERIFIED | **CAG cold-anchor** (brain on disk, no cold-recall) |
| **echo/post-processor** | ✅ via bundle | ❌ none | ◐ extract JSONs, no embed index | ✅ roost (36 hits, best) | 30 nodes | ❌ none | 1 .ts (Cimco) wired | **CAG cold-anchor** (123+ wiki entries dark on cold start) |
| **foxtrot/mill** | ✅ via bundle ⚠ (+tribal-by-domain) | ❌ none | ❌ none | ✅ 2,287 edges (roost 14) | 25,188 nodes | ❌ none | **~20** (MillingAIUltraIntelligence, FiveAxisAIUltraIntelligence, MillingUltimateAI, FiveAxisOrchestration) | **CAG cold-anchor** + wire 20 engines |
| **mike/wedm** | ◐ tribal-by-domain only (NO galaxy-brain inject) ⚠ | ❌ none | ❌ none | ✅ roost (13 hits, docs:16) | 30 nodes | ❌ none | **~73** (WEDMNeuralTraining, WireEDMDeepAIHardening, ElectrodeUltimateAI, WEDMProgramOptimizer, WEDMStrategyLibrary) | **NO domain-inject hook** + CAG + wire 73 |
| **whiskey/lathe** | ✅ via bundle ⚠ | ❌ none | ❌ none | ✅ roost (13, +1893 embeds, 11 documented-by) | ⚠ UNVERIFIED (roost confirmed) | ❌ none | **0** (all 4 fleet-unwired are Auth/SFC/Blueprint/Kickoff) | **CAG cold-anchor** (richest documented-by; just no cold tier) |
| **kilo/cam** | ❌ NO hook at all ⚠ | ◐ `prism_cam` name-string only, no doctrine file | ◐ cam-tribal-corpus.jsonl (809 tips), no embed index | ✅ roost (13 hits) ⚠ | 24,044 nodes | ❌ none | ⚠ UNVERIFIED (PHD: PARTIAL) | **NO domain-inject hook** (809 tips + 273L brain fully dark) |

**Legend:** ✅ present · ◐ partial · ❌ missing · ⚠ corrected vs audit · UNVERIFIED = not provable this pass.

**Reading of the matrix:** the uniform gap across all 6 is **CAG cold-anchor** (0/6). The two domains with the *worst* auto-pull are **kilo/cam** and **mike/wedm** (no full galaxy-brain inject). Everyone has roost edges but thin documented-by depth. Nobody has a knowledge-mining cron.

---

## 2 — BUILD-ONCE AUTO-PULL LAYER (highest leverage — build once, serves all 6)
R15 apply-to-all-galaxies. Each of these is one artifact that lights up all 6 (and the other 28 galaxies) at once. Ordered by leverage.

### B1 — CAG cold-anchor domain-pack (THE single highest-leverage build)
- **What it is:** a per-domain extension to `COLD_SOURCES` so each galaxy's doctrine is in the sub-millisecond cold-recall tier (zero Ollama, zero tool round-trip) — the gap is uniform 0/6 and the knowledge already exists on disk.
- **File to create/extend:** `scripts/lib/cag-cold-sources-domains.mjs` (new) — a generator that, for each domain slug in a canonical list, emits a frozen `COLD_SOURCES` entry pointing at `mcp-server/src/engines/<domain>/MEMORY.md` + `knowledge/memories/patterns/<domain>_synthesis.md` + `mcp-server/src/engines/<domain>/PATHS.md`, with keywords auto-extracted from the synthesis file's headings + the domain's dispatcher token (`prism_<domain>`). Then extend `scripts/lib/cag-router.mjs` to spread these into `COLD_SOURCES` (import + `...domainColdSources()`).
- **How it makes each domain auto-pull:** any cad/mill/lathe/wedm/cam/post keyword in a prompt hits the cold tier and the domain's MEMORY.md + synthesis surface instantly — no warm search. Closes the 0/6 CAG row in one build.
- **Verification:** `node -e "import('./scripts/lib/cag-router.mjs').then(m=>console.log(m.COLD_SOURCES.map(s=>s.id)))"` shows 6 new `<domain>-doctrine` ids; round-trip `cagRecall("lathe G50 CSS chuck")` returns the lathe synthesis chunk; assert every referenced file `existsSync` (fail-loud if a synthesis file is missing — do NOT fabricate). Existing 6 global anchors must be byte-identical (no regression).

### B2 — Domain-inject bundle completion (closes the 2 worst domains + makes the pattern total)
- **What it is:** add the **missing** kilo/cam and mike/wedm full galaxy-brain injectors to `ups-domain-bundle.mjs`. Per C1, the bundle is the *already-wired* indirection — so this needs ZERO settings.json edit (R8: extend the existing wired path, don't fork a new one).
- **Files to create/extend:**
  1. `.claude/hooks/kilo-cam-awareness-inject.mjs` (new — clone `delta-cad-awareness-inject.mjs`, reparameterize: slot=kilo, domain=cam, brain dir `mcp-server/src/engines/cam/`, tribal corpus `state/shared/cam-tribal-corpus.jsonl`, keywords cam/toolpath/mastercam/hypermill/CAM strategy).
  2. `.claude/hooks/mike-wedm-awareness-inject.mjs` (new — clone same, slot=mike, domain=wedm, keywords wedm/wire/sodick/agie/charmilles/sinker/electrode).
  3. Extend `.claude/hooks/bundles/ups-domain-bundle.mjs` `SUB_HOOKS` with the two new paths.
- **Better still — parameterize (R15 future-proof):** instead of hand-cloning, build `.claude/hooks/lib/domain-awareness-inject-factory.mjs` exporting `makeDomainInject({slot, domain, brainDir, tribalCorpus, keywords})`, and make the 2 new hooks 5-line wrappers. The 4 existing hand-written hooks stay as-is (R11 conformance; don't rewrite working code), but new domains use the factory.
- **How it makes each domain auto-pull:** kilo/cam's 809 tips + 273L brain and mike/wedm's brain now inject on every cam/wedm keyword — currently fully dark. All 6 domains now have a full galaxy-brain inject (4 via existing hooks, 2 via new).
- **Verification:** `echo '{"prompt":"cam toolpath strategy for pocket"}' | node .claude/hooks/bundles/ups-domain-bundle.mjs` → `additionalContext` contains cam MEMORY/TOOLBELT + top tribal hits; same for a wedm prompt; per-hook unit test mirroring `foxtrot-mill-awareness-inject.test.mjs`. Confirm bundle still no-ops cleanly on a non-domain prompt.

### B3 — Cross-substrate documented-by depth pass (turns the node mass into navigable pulls)
- **What it is:** all 6 have roost nodes but thin `documented-by` edges (post=36 best, most ~13). Run `scripts/generate-cross-substrate-edges.mjs` to walk `knowledge/wiki/<domain>/` + `knowledge/memories/patterns/<domain>_synthesis.md` for all 6 and emit `documented-by` edges → each galaxy roost, so `/node-card` and `/system-viz find` auto-return the knowledge pointer.
- **File to extend:** `scripts/generate-cross-substrate-edges.mjs` (exists, 37 KB) — ensure its wiki-walk covers all 6 `knowledge/wiki/<domain>/` dirs; confirm endpoints against the node-card offset oracle (per the 2026-06-10 regression `[[reference_xsub_embeds_docby_oracle_2026_06_10]]` — **do NOT** confirm against the rotating memories augmentation, that silently collapsed edges to 0 before).
- **How it auto-pulls:** every cad/cam/wedm wiki entry becomes a `documented-by` edge on its roost → graph search surfaces it automatically.
- **Verification:** post-run `grep -c documented-by` per domain rises (e.g. cam 13→N where N≈ count of `knowledge/wiki/cam/*` = 6+); the NO-DANGLING invariant test (`generate-cross-substrate-edges.test.mjs`) passes; oracle-confirmed (no volatile-source regression).

### B4 — Galaxy-mine cron installer (continuous knowledge replenishment)
- **What it is:** none of the 6 has a nightly knowledge-mining cron. Build one installer that registers a `PRISM Galaxy Mine (<domain>)` scheduled task per domain, each running `mine-galaxy-transcripts.mjs --galaxy <domain>` (registry-driven; `scripts/lib/galaxy-mining-registry.mjs` + `scripts/mine-galaxy-transcripts.mjs` both exist).
- **File to create:** `scripts/install-galaxy-mine-tasks.ps1` (mirror `install-fleet-reaper-task.ps1`), looping the 6 domain slugs with staggered phase offsets (avoid the :00 fleet-thundering-herd — e.g. mine cad @ 02:07, post @ 02:17, mill @ 02:27, …). Stagger so they don't co-load the 537 MB tribal index.
- **How it auto-pulls:** each night, new transcript knowledge → Obsidian synthesis → tribal index → next session's tribal-inject. The pull surface grows without manual work.
- **Verification:** `schtasks /query /tn "PRISM Galaxy Mine (cam)"` exists; a single `--galaxy cam --dry-run` invocation emits candidate tips without writing; confirm the miner registry has an entry per domain (add if missing — registry edit, not fabrication).
- **⚠ CAUTION (R12):** this writes to the shared tribal index. **Phase-stagger is mandatory** and each run must use the shard-aware `loadTribalIndex`/`writeTribalIndex` path (per the 2026-06-10 shard-clobber regression `[[reference_tribal_shard_read_clobber_2026_06_10]]` and the 2026-06-08 fail-open clobber that dropped 33,639→1). Do NOT register these until the writer path is confirmed shard-safe.

### B5 — AWARENESS.md is already universal (no build needed)
- **Finding:** all 6 domains already have `AWARENESS.md` (36L each, confirmed in every audit). The "generate AWARENESS.md for domains missing it" candidate is a **no-op** — none are missing. ✅ Drop it from the plan (R12: don't build what exists).

---

## 3 — PER-DOMAIN SPECIFIC BUILD UNITS (unique, not covered by build-once)
Each domain's TOP build unit: real-grounded knowledge to add + its wiring. Dependency order within domain.

| domain | U-id | Unit (grounded source + wiring) |
|---|---|---|
| **foxtrot/mill** | `U-WIRE-BACKLOG-MILL` | Wire the **~20 named unwired mill engines** (MillingAIUltraIntelligence, FiveAxisAIUltraIntelligence, MillingUltimateAI, FiveAxisOrchestration + the rest in BUILD_STATE) into `millDispatcher.ts` with round-trip dispatcher tests. **Grounded:** the engines already exist (real .ts); this is wiring, not fabrication. Highest unwired count of the safe-to-wire domains. |
| **mike/wedm** | `U-MIKE-CORE-PHYS-TESTS` | Build the 3 missing core physics test files (`EDMFeasibilityEngine`, `EDMCuttingParamFlushEngine`, `edmDispatcher.integration`) with R9 reference-value asserts. **Grounded:** physics constants + existing engines; tests are the wiring proof that surfaces knowledge through the live query path. Prereq gate for the ~73-engine wire-up (`U-WIRE-BACKLOG-WEDM`, follow-on). |
| **kilo/cam** | `U-KILO-CAM-TEST-SUITE` | Build the 6 missing §4 camDispatcher round-trip test files (R9 asserts: kc1_1=3200 H-group from constants.ts, clearance from collision_check_full, units-guard on cm input). **Grounded:** `physics/constants.ts` + live dispatcher. Blocks cam simulate/validate/finetune; makes the 703-action surface trustworthy for auto-pull. |
| **echo/post-processor** | `U-ECHO-PP-KB-CONSOLIDATE` | Consolidate the 3 existing extract JSONs (`POST_PROCESSOR_KNOWLEDGE_EXTRACT.json`, `ONLINE_POST_PROCESSOR_KNOWLEDGE.json`, `JM_DIE_POST_PROCESSOR_TRIBAL_KNOWLEDGE.json`) into a single `knowledge/wiki/architecture/post-processor-knowledge-base.md` that B1's CAG anchor points at. **Grounded:** the JSONs exist; this is reformat+index, not new claims. |
| **whiskey/lathe** | `U-WHISKEY-DOCBY-HARVEST` | Lathe has the richest documented-by (11) + 1893 embeds but no cold tier — after B1, harvest the lathe synthesis + `knowledge/wiki/lathe/` foundation entries into additional documented-by edges. **Grounded:** existing wiki/synthesis. Pure edge-materialization. (Lathe has 0 unwired engines, so no wire-up unit.) |
| **delta/cad** | `U-DELTA-CAD-SYNTH-CITE` | Cad has 12 wiki + 558 actions but thin cross-substrate; after B3, ensure `cad_synthesis.md` (45L) is cited as documented-by from the 12 `knowledge/wiki/cad/` entries. **Grounded:** existing files. Pairs with delta's completion-reconcile cron already present. |

---

## 4 — DEPENDENCY ORDER + SINGLE HIGHEST-ROI FIRST ACTION

**Dependency-ordered build sequence:**
1. **B1 (CAG cold-anchor domain-pack)** — unlocks cold-tier auto-pull for all 6 at once; depends on nothing; the synthesis + MEMORY.md files already exist (verified: every audit confirms `<domain>_synthesis.md` present). **Highest ROI: 1 build → 6 domains lit.**
2. **B2 (bundle completion for kilo/cam + mike/wedm)** — closes the 2 worst domains; depends on nothing (bundle already wired). Pairs with B1 (cold tier + warm inject).
3. **B3 (documented-by depth pass)** — depends on B1's anchored files existing as edge endpoints; oracle-confirmed.
4. **Per-domain U-units (§3)** — `U-ECHO-PP-KB-CONSOLIDATE` first (B1's cam/post anchors want a single KB file), then the test suites (`U-KILO-CAM-TEST-SUITE`, `U-MIKE-CORE-PHYS-TESTS`), then the wire-ups (mill 20, wedm 73) which the tests gate.
5. **B4 (galaxy-mine crons)** — LAST; depends on the shard-safe writer path being confirmed (R12 caution). Continuous replenishment is valuable but is the riskiest (writes the shared index).

### ➤ THE SINGLE FIRST ACTION for zulu THIS session
**Build B1 — the CAG cold-anchor domain-pack** (`scripts/lib/cag-cold-sources-domains.mjs` + the `COLD_SOURCES` spread in `cag-router.mjs`).

Why this one:
- **Serves all 6 in one build** (R15) — and the other 28 galaxies for free.
- **Safe + non-fabricating:** it only points at files that already exist; the generator `existsSync`-asserts each path and fails loud if a synthesis/MEMORY file is missing (no fabricated knowledge — it indexes real on-disk doctrine).
- **Verifiable now:** `COLD_SOURCES` length grows by exactly 6, ids enumerable, a recall round-trip returns a real chunk, and the 6 global anchors stay byte-identical.
- **No collision with active specialist slots:** `scripts/lib/cag-router.mjs` is shared infra (not a foxtrot/whiskey/kilo-owned domain file), and zulu is any-domain orchestrator. Adding entries is additive (R8) — no existing behavior changes.
- **It's the uniform 0/6 gap** the matrix identified — the biggest single lever.

---

## 5 — HONEST CONSTRAINTS (R12)

- **Tribal tips cannot be auto-generated.** Adding *new* tribal tips requires a real domain source (a manual, a transcript, a shop observation). Inventing tips = fabrication (violates the §HONESTY block). The galaxy-mine cron (B4) is the ONLY safe way to grow tips — and only because it mines *existing* transcripts, not invents. Do not hand-author tips into any corpus.
- **No heavy re-embed of the 537 MB tribal index this session.** The index crossed V8's 512 MiB string cap and is now sharded (`[[reference_tribal_index_v8_string_cap_2026_06_08]]`); a full re-embed is multi-minute, memory-pressured, and has clobbered the brain twice (33,639→1 fail-open; 29,723→~11,500 shard-transition). B1/B2/B3 deliberately touch **zero** embed writes — they index/anchor existing files. B4's mining must use the shard-safe `loadTribalIndex`/`writeTribalIndex` path and phase-stagger; **do not arm B4 until that path is re-confirmed.**
- **The ~73 wedm + ~20 mill engine wire-ups are NOT pure auto-pull builds** — they are dispatcher wiring with R9 round-trip tests, gated behind the test-suite units. They grow the *queryable* surface but are real engineering, not config. Sequence them after their domain's test gate (`U-MIKE-CORE-PHYS-TESTS`, mill's existing tests).
- **Specialist-slot collision risk on per-domain files.** `millDispatcher.ts`, `camDispatcher.ts`, `turningDispatcher.ts`, `edmDispatcher.ts`, and the `mcp-server/src/engines/<domain>/` brains are owned/edited by foxtrot/kilo/whiskey/mike/echo respectively. zulu should build the **shared-infra** layer (B1/B2 bundle+factory/B3 generator/B4 installer) and leave the per-domain U-units (§3) to their specialist slots, OR claim them explicitly via slot-task-claim to avoid the file-claim-guard block. The build-once layer is collision-free; the per-domain units are not.
- **`audit-unwired-engines.mjs` errored on full run** (cited in cad + cam audits) — so per-domain unwired *counts* for cad and cam are UNVERIFIED. Mill (~20) and wedm (~73) come from BUILD_STATE named sets (trustworthy); lathe (0) is verified. Do not act on a cad/cam unwired count until the audit script runs clean.
- **Graph-node counts partly UNVERIFIED.** The node-card offset sidecar is stale (9 entries) per the cad audit; mill (25,188), cam (24,044), wedm (30), post (30) come from `find-cache.json` scans (trustworthy as relative magnitudes, not exact). B3's edge work uses the offset oracle, which must be rebuilt if stale before relying on its endpoint confirmation.
- **`prism_cam` in CAG is a false comfort.** It's a keyword string inside another entry, not a cam doctrine anchor — the cam audit's "PARTIAL" is generous. Treat cam's CAG as ❌ for B1 purposes (it gets a real `cam-doctrine` anchor like the other 5).
```

The plan is grounded in the audits plus four verified corrections. The single first action for zulu this session is **B1 — the CAG cold-anchor domain-pack** (`scripts/lib/cag-cold-sources-domains.mjs` + a `COLD_SOURCES` spread in `scripts/lib/cag-router.mjs`): it's the uniform 0/6 gap, serves all 6 domains (and the other 28 galaxies) in one additive build, indexes only real on-disk doctrine files (`existsSync`-asserted, fail-loud — no fabrication), is verifiable immediately, and touches shared infra with no specialist-slot collision and no tribal-index re-embed.

Key relevant absolute paths:
- `H:\prism\scripts\lib\cag-router.mjs` (B1 target — `COLD_SOURCES` at line 50)
- `H:\prism\.claude\hooks\bundles\ups-domain-bundle.mjs` (B2 target — `SUB_HOOKS`, already settings-wired)
- `H:\prism\.claude\hooks\delta-cad-awareness-inject.mjs` (B2 clone template)
- `H:\prism\scripts\generate-cross-substrate-edges.mjs` (B3 target)
- `H:\prism\state\shared\system-viz\cross-substrate-edges-augmentation.json` (B3 output, 20MB)
- `H:\prism\scripts\mine-galaxy-transcripts.mjs` + `H:\prism\scripts\lib\galaxy-mining-registry.mjs` (B4)

---

# Appendix — per-domain audits (note: opus synthesis corrected 3 false-positives, see C1-C4 in plan)

The offset index only has 9 entries (sidecar is stale/minimal). I have enough data. Producing the report now.

### delta/cad — knowledge + auto-pull audit
**KNOWLEDGE:** brain=5/5 files (CLAUDE.md 197L, MEMORY.md 105L, PATHS.md 141L, TOOLBELT.md 74L, AWARENESS.md 36L — all non-empty; SOUL.md also present) | tribal=2 code-tribal wiki files + 0 tribal-embed-index domain-tagged entries (tribal index domain tags not present for cad) | wiki=12 files under knowledge/wiki/cad/ + 9253 wiki files mention "cad" cross-domain | memories=3226 memory files mention "cad"; synthesis present (knowledge/memories/patterns/cad_synthesis.md, 45 lines) | engines=1 .ts file in mcp-server/src/engines/cad/ (cadGeomEvalHarness.ts; bulk of cad engines live in flat src/engines/) | actions=558 unique cad_ actions across cadDispatcher.ts + cadAutomationDispatcher.ts (cadDrawingKnowledgeDispatcher.ts 3, cadRegressionDispatcher.ts 62 additional)

**AUTO-PULL WIRING (present|MISSING, cite):**
- tribal/awareness-inject: delta-cad-awareness-inject.mjs EXISTS on disk at .claude/hooks/delta-cad-awareness-inject.mjs BUT **0 refs in both settings.json** — EFFECTIVELY MISSING (unwired); tribal-by-domain-inject.mjs DOES have cad domain mapped to slot delta and correctly fires on cad/fusion/step/blueprint keywords — PRESENT via that hook
- CAG cold-anchor: scripts/lib/cag-router.mjs has 0 cad mentions — MISSING
- RAG corpus/embed: no cad_rag* or cad*embed* in state/shared/ or mcp-server/data/state/ — MISSING
- cross-substrate edges: 0 cad edges in state/shared/system-viz/cross-substrate-edges-augmentation.json — MISSING
- graph nodes: node-card-offsets.json only has 9 total entries (sidecar stale); find-cache.json 0 cad-keyed entries — UNVERIFIED (sidecar needs rebuild)
- galaxy-mine cron: .claude/scheduled_tasks.json has cad-completion-reconcile.mjs cron (id 4efdf85a) and overnight CAD-completion goal cron (id 4d82ef66) — PRESENT (completion-focused, not knowledge-mining)
- unwired engines: UNVERIFIED (audit-unwired-engines.mjs script errored on full run; fleet total reported as 4 unwired but cad split unknown)

**TOP-3 HIGHEST-ROI BUILD ACTIONS (concrete, to maximize knowledge AND auto-pull):**
1. **Wire delta-cad-awareness-inject.mjs into settings.json** — the hook already exists at .claude/hooks/delta-cad-awareness-inject.mjs but has 0 wiring refs in both C: and H: settings.json; adding it as a UserPromptSubmit hook (alongside foxtrot-mill-awareness-inject.mjs and whiskey-lathe-context-inject.mjs as precedents) would make the full 5-file galaxy brain (CLAUDE/MEMORY/PATHS/TOOLBELT/AWARENESS) auto-inject on every cad-relevant prompt — highest leverage, zero build required
2. **Add cad to CAG cold-anchor COLD_SOURCES in scripts/lib/cag-router.mjs** — the CAG cold tier pre-loads doctrine for instant recall; cad is absent while mill/lathe/wedm presumably have entries; seeding it with cad_synthesis.md (45L) + PATHS.md + TOOLBELT.md makes the 558-action dispatcher surface auto-recalled without a warm-up search round-trip
3. **Generate owned-by-slot + documented-by cross-substrate edges for cad** — scripts/generate-cross-substrate-edges.mjs currently produces 0 cad edges; running it with delta/cad galaxy nodes would surface the cad synthesis memory + 12 wiki entries as documented-by edges and wire them into the system-viz graph, making /node-card + /system-viz find return cad knowledge pointers automatically

**BUILD-ONCE CANDIDATES (mechanisms that, if built once, would serve ALL domains):**
- **Per-domain awareness-inject auto-wirer**: a script that iterates all NATO-slot→domain mappings from tribal-by-domain-inject.mjs (foxtrot=mill, whiskey=lathe, mike=wedm, delta=cad, kilo=cam, xray=cad) and ensures each named `<slot>-<domain>-awareness-inject.mjs` hook is wired in settings.json — would fix cad and catch any other slot with an unwired awareness hook in one pass
- **CAG cold-anchor domain seed script**: extend scripts/lib/cag-router.mjs with a per-domain seeder that reads each galaxy's PATHS.md + synthesis memory + TOOLBELT.md and registers them as COLD_SOURCES — one script parameterized by domain, run once per galaxy
- **Cross-substrate edge generator per-domain run**: scripts/generate-cross-substrate-edges.mjs already supports the pattern; a `--domain cad` flag (or running it for each galaxy MEMORY.md backlink set) would materialize owned-by-slot + documented-by edges for all 34 galaxies in one batch, making /node-card pointers live fleet-wide

---

I have all the data needed. Here is the audit result:

### echo/post-processor — knowledge + auto-pull audit
**KNOWLEDGE:** brain=6/5 files (CLAUDE 243L, MEMORY 190L, PATHS 202L, TOOLBELT 65L, AWARENESS 36L, SOUL 65L — 6 files, all non-empty) | tribal=3 tagged tips in memories/reference + 356 wiki/code-tribal files referencing post-processor | wiki=123+ entries (knowledge/wiki/post-processor/ dedicated subdir with 6 entries + 117+ code-tribal/architecture/lessons files) | memories=127+ files, synthesis present (knowledge/memories/patterns/post-processor_synthesis.md, 46L, mtime 2026-06-28) | engines=1 in post-processor/ dir (CimcoVerificationBridgeEngine.ts) + dispatched via camDispatcher | actions=112 pp_* action lines in camDispatcher.ts (conservative count of unique pp_ actions ~60-70 distinct actions across pp_run/pp_analyze/pp_verify/pp_ai_*/pp_kb_*/pp_capability_*/pp_transformer/pp_agi_*)

**AUTO-PULL WIRING (present|MISSING, cite):**
- tribal/awareness-inject: PRESENT — `.claude/hooks/echo-post-domain-inject.mjs` wired via `.claude/hooks/bundles/ups-domain-bundle.mjs` (line 53), which is wired in `C:/Users/wompu/.claude/settings.json` line 1699 as UserPromptSubmit
- CAG cold-anchor: MISSING — `scripts/lib/cag-router.mjs` COLD_SOURCES has 6 entries (claude-md, memory-md, engine-digest, dispatcher-digest, physics-constants, wiki-index); no post-processor doctrine entry present
- RAG corpus/embed: PRESENT (knowledge extract only) — `mcp-server/data/state/POST_PROCESSOR_KNOWLEDGE_EXTRACT.json`, `ONLINE_POST_PROCESSOR_KNOWLEDGE.json`, `JM_DIE_POST_PROCESSOR_TRIBAL_KNOWLEDGE.json` exist; no dedicated embed/vector index confirmed
- cross-substrate edges: PRESENT (galaxy roost node only) — `ghost.galaxy.post-processor` owned-by-slot echo node confirmed in cross-substrate-edges-augmentation.json; only 1 hit meaning documented-by edges to wiki/memory nodes are MISSING
- graph nodes: 30 nodes (system-viz-query find "post-processor" returns 30 — vault/memory/wiki nodes; dedicated engine-layer nodes for the ~60+ post-processor engines are UNVERIFIED separately)
- galaxy-mine cron: MISSING — no `PRISM Galaxy Mine (post-processor)` or echo-galaxy scheduled task found
- unwired engines: 4 fleet-wide legacy orphans (audit-unwired-engines.mjs confirms 4 UNWIRED fleet-total; post-processor-specific breakdown UNVERIFIED but CimcoVerificationBridgeEngine.ts is the only .ts in the post-processor/ dir and it has a dedicated cimcoDispatcher)

**TOP-3 HIGHEST-ROI BUILD ACTIONS (concrete, to maximize knowledge AND auto-pull):**
1. Add post-processor cold-anchor entry to `scripts/lib/cag-router.mjs` COLD_SOURCES pointing at `knowledge/wiki/architecture/post-processor-knowledge-base.md` with keywords covering G-code dialects, controller, post-processor, pp_, NC emit, RTCP, CPS — this makes the entire compiled KB (already exists, 123+ wiki entries) auto-recalled on cold-start without any prompt-time tool call, the highest-leverage zero-cost pull improvement
2. Generate documented-by cross-substrate edges from the 6 `knowledge/wiki/post-processor/` foundation entries + the 46-line synthesis node → `ghost.galaxy.post-processor` in `scripts/generate-cross-substrate-edges.mjs` — currently only 1 cross-substrate hit (the galaxy roost) vs 30+ candidate wiki/memory nodes; each documented-by edge makes the wiki entry auto-surface on `/node-card` lookups and in the graph search, closing the node→knowledge gap fleet-wide
3. Register a `PRISM Galaxy Mine (post-processor)` scheduled task (nightly, echo slot) running `mine-galaxy-transcripts.mjs` for the post-processor domain — the galaxy transcript miner already has a registry-driven architecture (`scripts/lib/galaxy-mining-registry.mjs`); adding an echo entry feeds the 127+ memory reference files + synthesis back into the Obsidian brain nightly, making all shipped knowledge compounds automatically (30 tribal tips → embedded → auto-injected next session)

**BUILD-ONCE CANDIDATES (mechanisms that, if built once, would serve ALL 6 domains):**
- Generic per-domain CAG cold-anchor generator: a script that reads each galaxy's `knowledge/wiki/<domain>/<domain>-knowledge-base.md` (or PATHS.md knowledge-base pointer) and emits a COLD_SOURCES entry with auto-extracted keywords from the file's headings — one build covers all 34 galaxies, not just post-processor
- Cross-substrate documented-by edge generator extension: `generate-cross-substrate-edges.mjs` already has the pattern; extending it to walk `knowledge/wiki/<domain>/` for all galaxies and emit `documented-by` edges from each wiki entry → its galaxy roost node would give all 34 galaxies the same graph-search auto-pull that currently only the most wired galaxies have
- Per-domain galaxy mine scheduled task bootstrapper: a script (analogous to `install-fleet-reaper-task.ps1`) that registers one `PRISM Galaxy Mine (<domain>)` Windows scheduled task per galaxy from the mining registry — one invocation covers all 34 domains; currently each galaxy must be registered manually

---

The shard count returned empty — likely a domain field mismatch. I have enough data to produce the audit. Let me compile the final answer.

CAG COLD_SOURCES: mill galaxy files (CLAUDE.md, MEMORY.md, PATHS.md, TOOLBELT.md) are NOT listed as named cold-anchor entries — only `claude-md` and `memory-md` (global) are confirmed in COLD_SOURCES. Mill-specific docs are absent from the cold tier.

Tribal tip count: the shard node script returned empty output (domain field may be `"mill"` or empty). From the CLAUDE.md tribal-by-domain-inject hook, mill is a valid domain. Total index: 135,527 entries across 5 shards. Mill-tagged count is UNVERIFIED (domain field enumeration timed out), but the hook wiring is confirmed.

Galaxy mine cron: schtasks query returned nothing matching mill/foxtrot/galaxy-mine — MISSING.

Unwired mill engines: BUILD_STATE explicitly names ~20 unwired mill engines (MillingAIUltraIntelligence, FiveAxisAIUltraIntelligence, MillingUltimateAI, FiveAxisOrchestration cited as examples).

---

### foxtrot/mill — knowledge + auto-pull audit
**KNOWLEDGE:** brain=5/5 files (CLAUDE.md 260L, MEMORY.md 139L, PATHS.md 154L, TOOLBELT.md 54L, AWARENESS.md 36L; SOUL.md also present) | tribal=UNVERIFIED count (135,527 total across 5 shards; mill domain wired in tribal-by-domain-inject.mjs but per-domain count timed out) | wiki=4,219 entries total; 23 files in knowledge/wiki/mill/ subdir; 4,219 mill-relevant count across all wiki (grep -l hit) | memories=1,243 memory files mention mill; synthesis present (knowledge/memories/patterns/mill_synthesis.md, 46 lines, mtime Jun 14) | engines=0 .ts files directly under mcp-server/src/engines/mill/ (all engines are in flat src/engines/ matching mill domain) | actions=398 case-statements in millDispatcher.ts
**AUTO-PULL WIRING (present|MISSING, cite):**
- tribal/awareness-inject: foxtrot-mill-awareness-inject.mjs (present in .claude/hooks/; NOT wired in settings.json — 0 refs confirmed)
- CAG cold-anchor: MISSING (COLD_SOURCES in scripts/lib/cag-router.mjs contains only global claude-md + memory-md anchors; no mill/foxtrot galaxy files)
- RAG corpus/embed: MISSING (no mill_rag or mill_embed entry found in state/shared or mcp-server/data/state; tribal embed index is general, not mill-scoped RAG)
- cross-substrate edges: present (2,287 mill/foxtrot edges in cross-substrate-edges-augmentation.json: owned-by-slot eng.mill→foxtrot, ghost.galaxy.mill→foxtrot, plus domain-infer confidence 0.85–1.0)
- graph nodes: 25,188 mill-related nodes in find-cache (376,619 total)
- galaxy-mine cron: MISSING (no "PRISM Galaxy Mine (mill)" scheduled task found via schtasks; not in FLEET-PHD-READINESS-2026-06-28.md mine entries)
- unwired engines: ~20 (BUILD_STATE explicitly names MillingAIUltraIntelligence, FiveAxisAIUltraIntelligence, MillingUltimateAI, FiveAxisOrchestration as the gap set — U-WIRE-BACKLOG-MILL)

**TOP-3 HIGHEST-ROI BUILD ACTIONS (concrete, to maximize knowledge AND auto-pull):**
1. Wire foxtrot-mill-awareness-inject.mjs into settings.json UserPromptSubmit — the hook EXISTS with a test file but has 0 refs in settings.json, meaning mill context never auto-pulls on prompt. Single settings.json edit makes 25K mill graph nodes + PATHS/TOOLBELT/AWARENESS.md surface on every mill-relevant turn. Highest leverage per token of effort.
2. Add mill galaxy files to CAG COLD_SOURCES in scripts/lib/cag-router.mjs — add entries for mcp-server/src/engines/mill/{CLAUDE,MEMORY,PATHS,TOOLBELT}.md with mill-keyword triggers. This makes mill doctrine available to the sub-ms cold-tier recall path (zero Ollama cost), closing the gap where mill knowledge exists on disk but is never auto-recalled at inference time.
3. Wire ~20 unwired mill engines to millDispatcher.ts and create galaxy-mine cron for mill — U-WIRE-BACKLOG-MILL addresses the 20 named unwired engines (MillingAIUltraIntelligence etc.), and a scheduled `mine-galaxy-transcripts.mjs --domain mill` cron would nightly extract mill tribal tips from transcripts into the embed index, growing the knowledge store automatically (every other domain with a cron grows its tribal base; mill currently has none).

**BUILD-ONCE CANDIDATES (mechanisms that, if built once, would serve ALL 6 domains):**
- Per-domain awareness-inject wirer: a script `scripts/wire-domain-awareness-hooks.mjs` that reads the per-slot hook files (foxtrot-mill, whiskey-lathe, mike-wedm, delta-cad, kilo-cam, oscar-sfc) and ensures each has a settings.json UserPromptSubmit entry — one script fixes the wiring gap for all 6 domains at once rather than 6 manual edits
- CAG COLD_SOURCES domain-pack generator: extend cag-router.mjs with a per-domain cold-source factory that ingests `mcp-server/src/engines/<domain>/{CLAUDE,MEMORY,PATHS,TOOLBELT}.md` for any domain slug — one pattern addition covers all 34 galaxies
- Galaxy-mine cron installer: extend `scripts/install-galaxy-mine-tasks.mjs` (or equivalent) to register a nightly `mine-galaxy-transcripts.mjs --domain <d>` scheduled task for each of the 6 primary domains — once the template exists, deploying to all domains is a loop over the domain list

---

I have all the data needed. Here is the audit:

### mike/wedm — knowledge + auto-pull audit
**KNOWLEDGE:** brain=5/5 files (CLAUDE 232L, MEMORY 134L, PATHS 180L, TOOLBELT 50L, AWARENESS 36L) | tribal=446 wedm-tagged memory files | wiki=7 direct wedm/ entries + 1303 wedm-named files across wiki tree | memories=446 files, synthesis present (knowledge/memories/patterns/wedm_synthesis.md 39L mtime 2026-06-28) | engines=372 .ts files referencing wedm across src/engines (0 under a dedicated wedm/ subdir — engines are flat in src/engines/) | actions=71 wedm_* dispatcher actions (67 in camDispatcher + 4 in calcDispatcher)
**AUTO-PULL WIRING (present|MISSING, cite):**
- tribal/awareness-inject: PRESENT — `.claude/hooks/tribal-by-domain-inject.mjs` maps `mike -> "wedm"` (line 136); domain tokens include wedm/sodick/agie/charmilles/wire/sinker (line 105)
- CAG cold-anchor: MISSING — `scripts/lib/cag-router.mjs` COLD_SOURCES array has no wedm/WEDM entry (grepped all 475 lines, zero hits for wedm)
- RAG corpus/embed: MISSING — no wedm_rag or wedm embed file found under state/shared/ or mcp-server/data/state/
- cross-substrate edges: PRESENT — `state/shared/system-viz/cross-substrate-edges-augmentation.json` contains ghost.galaxy.wedm owned-by-slot + documented-by edges (confirmed via node-card: docs:16 wiki + mem pointers)
- graph nodes: 30 confirmed (system-viz find "wedm" returns 30 nodes: fe.pages.wedm, ai.t3.wedm, vault.mem.galaxies.wedm.memory, vault.mem.patterns.wedm_synthesis, fs.jm_die.wire_edm, and 25 more)
- galaxy-mine cron: MISSING — no scheduled task matching wedm/mike/galaxy-mine found; FLEET-PHD-READINESS marks mike test/simulate/validate/finetune as GAP
- unwired engines: ~73 confirmed unwired (BUILD_STATE.md cites "~73 unwired WEDM engines" including WEDMNeuralTraining, WireEDMDeepAIHardening, ElectrodeUltimateAI, WEDMProgramOptimizer, WEDMStrategyLibrary)

**TOP-3 HIGHEST-ROI BUILD ACTIONS (concrete, to maximize knowledge AND auto-pull):**
1. Add wedm CAG cold-anchor entries to `scripts/lib/cag-router.mjs` COLD_SOURCES — wire `mcp-server/src/engines/wedm/CLAUDE.md`, `knowledge/wiki/wedm/wedm-foundations-verified-2026-06-14.md`, and `knowledge/memories/patterns/wedm_synthesis.md` as cold-tier doctrine. This makes wedm physics/safety doctrine auto-recalled on EVERY cold prompt without Ollama, zero latency, zero subprocess — the single highest-leverage auto-pull gap (the domain has rich knowledge on disk but no cold-tier pull path)
2. Build the 3 missing core physics test files called out in FLEET-PHD-READINESS (`EDMFeasibilityEngine`, `EDMCuttingParamFlushEngine`, `edmDispatcher.integration` — unit U-MIKE-CORE-PHYS-TESTS) — these are the prerequisite gate blocking §5 simulate and §6 validate sign-off, and round-trip dispatcher tests ARE the wiring proof that surfaces knowledge through the live query path
3. Register a `PRISM Galaxy Mine (wedm)` nightly scheduled task (mirror the pattern of existing galaxy miners via `scripts/lib/galaxy-mining-registry.mjs`) targeting the 4,058 JM DIE/WIRE EDM/ Mastercam .mcx-8 + Sodick .esp programs — this feeds the tribal index, RAG corpus, and GNN refpool simultaneously, closing the RAG corpus/embed MISSING gap and growing the 30 graph nodes organically

**BUILD-ONCE CANDIDATES (mechanisms that, if built once, would serve ALL 6 domains):**
- CAG cold-anchor generator: a script that reads each domain's `mcp-server/src/engines/<domain>/CLAUDE.md` + `knowledge/wiki/<domain>/` index + `knowledge/memories/patterns/<domain>_synthesis.md` and emits COLD_SOURCES entries for cag-router.mjs — currently wedm, cam, cad, post-processor, and lathe all have zero cold-anchor entries; one generator script populates all 6
- Generic galaxy-mine cron installer: extend `scripts/lib/galaxy-mining-registry.mjs` with a per-domain entry schema and a `install-galaxy-mine-tasks.ps1` that registers one scheduled task per domain slot — currently only select domains have nightly miners; one registration pass covers all 34 galaxies
- Per-domain RAG corpus builder: a pipeline that reads `knowledge/wiki/<domain>/`, tribal index entries tagged to domain, and `knowledge/memories/patterns/<domain>_synthesis.md` → produces `mcp-server/data/state/<domain>-rag-corpus.jsonl` + triggers embed — currently no domain under the 6 has a confirmed RAG embed; one pipeline template instantiated per domain closes all 6 simultaneously

---

All data collected. No lathe engines are unwired. Now I have everything needed.

### whiskey/lathe — knowledge + auto-pull audit
**KNOWLEDGE:** brain=5/5 files (CLAUDE 297L, MEMORY 124L, PATHS 175L, TOOLBELT 63L, AWARENESS 36L; SOUL.md also present) | tribal=`tribal-by-domain-inject` covers lathe domain (top-3 per-prompt, wired via `.claude/hooks/tribal-by-domain-inject.mjs`) | wiki=`knowledge/wiki/lathe/` subdir exists + 3737 wiki files reference lathe/turning | memories=1816 files mention lathe; synthesis=`knowledge/memories/patterns/lathe_synthesis.md` EXISTS (48L) | engines=246 Lathe*/Turn* engines in `mcp-server/src/engines/` flat dir (0 in `engines/lathe/*.ts` — all live in the flat root) | actions=433 (turningDispatcher) + 14 (turningProgramDispatcher) = **447 total**
**AUTO-PULL WIRING (present|MISSING, cite):**
- tribal/awareness-inject: `tribal-by-domain-inject.mjs` (domain-keyed, covers lathe slot whiskey) + `whiskey-lathe-context-inject.mjs` EXISTS on disk (54L, slot+keyword gated) — **BUT NEITHER IS WIRED in settings.json** (0 grep hits in both C: and H: settings); both hooks are dead letters
- CAG cold-anchor: MISSING — `COLD_SOURCES` in `scripts/lib/cag-router.mjs` has 0 lathe/turning/whiskey entries
- RAG corpus/embed: MISSING — no `lathe_rag`/`lathe_embed` found in `state/shared/` or `mcp-server/data/state/`
- cross-substrate edges: present — 1908 edges touch lathe/whiskey; breakdown: `owned-by-slot`=3, `documented-by`=11 (incl. `galaxy-synthesis-memory:lathe_synthesis`), `embeds`=1893, `consensus-of`=1
- graph nodes: UNVERIFIED exact count; ghost galaxy roost `ghost.galaxy.lathe` confirmed in augmentation JSON; 246+ engine nodes inferred
- galaxy-mine cron: MISSING — no `PRISM Galaxy Mine (lathe)` in `schtasks` output; no lathe-mine scheduled task registered
- unwired engines: **none** — all 4 fleet-wide UNWIRED engines are Auth/SFC/Blueprint/Kickoff, zero lathe

**TOP-3 HIGHEST-ROI BUILD ACTIONS (concrete, to maximize knowledge AND auto-pull):**
1. **Wire `whiskey-lathe-context-inject.mjs` + `tribal-by-domain-inject.mjs` into `settings.json` UserPromptSubmit hooks** — both hooks exist on disk and are fully implemented but have 0 refs in either settings file; adding them makes lathe domain context + top-3 tribal tips auto-inject on every relevant prompt without any further code work. This is the single highest-leverage fix: wiring cost is 2 JSON entries, payoff is automatic lathe knowledge pull fleet-wide.
2. **Add lathe cold-anchor entries to `COLD_SOURCES` in `scripts/lib/cag-router.mjs`** — point at `mcp-server/src/engines/lathe/CLAUDE.md`, `PATHS.md`, `TOOLBELT.md`, and `knowledge/memories/patterns/lathe_synthesis.md`; this makes CAG serve lathe doctrine on cold-recall queries (currently MISSING entirely), activating PSN leg recall for the 447-action dispatcher surface.
3. **Register a `PRISM Galaxy Mine (lathe)` nightly scheduled task** (`scripts/mine-galaxy-transcripts.mjs` with `--galaxy lathe`) — the galaxy-mine cron is MISSING for lathe while other domains have it; nightly mining of whiskey-slot transcripts would continuously grow the tribal/memory corpus (currently 1816 memories but no automated replenishment) and feed the lathe synthesis node.

**BUILD-ONCE CANDIDATES (mechanisms that, if built once, would serve ALL 6 domains):**
- **Generic per-domain settings-wiring validator** — a script that checks every `*-domain-inject.mjs` and `*-context-inject.mjs` in `.claude/hooks/` against both settings.json files and emits a diff of unwired hooks; run as a Stop advisory; would surface the lathe wiring gap and prevent recurrence across all domains
- **CAG cold-anchor generator** — extend `generate-cross-substrate-edges.mjs` (or a sibling) to auto-populate `COLD_SOURCES` from each galaxy's `PATHS.md` + synthesis memory path; one generator covers all 34 galaxies instead of per-domain manual edits
- **Galaxy-mine cron installer** — a single `install-galaxy-mine-tasks.ps1` that iterates `SLOT_NAMES` × domain mapping and registers one `PRISM Galaxy Mine (<domain>)` scheduled task per soul-slot; build once, covers lathe + wedm + cad + cam + quoting + all remaining domains with no per-domain work

---

Now I have all data. Let me compile the final audit.

### kilo/cam — knowledge + auto-pull audit

**KNOWLEDGE:** brain=5/5 files (CLAUDE.md 273L, MEMORY.md 91L, PATHS.md 145L, TOOLBELT.md 73L, AWARENESS.md 36L — SOUL.md also present) | tribal=809 tips (cam-tribal-corpus.jsonl) + ~89 cam-domain hits in embed shard-0 | wiki=14,620 wiki files match cam broadly; cam/ subdir has 6 dedicated files (cam-advanced-techniques.md, cam-applied-practice.md, cam-foundations.md, cam-foundations-verified-2026-06-14.md, cam-resource-atlas.md, cam-source-atlas.md) | memories=1,485 memory files mention cam; synthesis=knowledge/memories/patterns/cam_synthesis.md present (47L, mtime 2026-06-28) | engines=289 cam-domain .ts files across src/engines/ | actions=703 unique cam_ actions across camDispatcher + camFunctionDispatcher

**AUTO-PULL WIRING (present|MISSING, cite):**
- tribal/awareness-inject: MISSING — no kilo/cam-domain-awareness-inject hook exists; only slot-adjacent hooks found (delta-cad-awareness-inject.mjs, echo-post-domain-inject.mjs); cam has no per-prompt tribal/awareness injector
- CAG cold-anchor: PARTIAL — `prism_cam` dispatcher name appears in cag-router.mjs COLD_SOURCES string, but no cam MEMORY.md/PATHS.md/TOOLBELT.md path is a registered cold-tier doc anchor; cam doctrine files are not auto-recalled on cold sessions
- RAG corpus/embed: PARTIAL — cam-tribal-corpus.jsonl (809 tips) exists in state/shared/ but no dedicated cam_rag embed index found; tips are in the shared 135K-entry tribal shard index (not cam-partitioned for fast retrieval)
- cross-substrate edges: MISSING — cross-substrate-edges-augmentation.json has 0 total edges (file exists but empty); no owned-by-slot or documented-by edges exist for any domain including cam
- graph nodes: ~24,044 cam-related nodes in find-cache.json (376,623 total; cam nodes verified via JSON scan)
- galaxy-mine cron: MISSING — schtasks returned no "PRISM Galaxy Mine (cam)" or kilo-keyed scheduled task
- unwired engines: UNVERIFIED — fleet readiness doc (FLEET-PHD-READINESS-2026-06-28.md) confirms kilo/cam §4 test files are completely absent (6 missing), which is the primary blocking gap; unwired engine count from audit-unwired-engines.mjs not run (slow), but PHD doc flags cam as PARTIAL wiring

**TOP-3 HIGHEST-ROI BUILD ACTIONS (concrete, to maximize knowledge AND auto-pull):**

1. **Build kilo-cam-domain-awareness-inject.mjs** (mirror of delta-cad-awareness-inject.mjs + echo-post-domain-inject.mjs) — wire it as a UserPromptSubmit hook that injects mcp-server/src/engines/cam/{MEMORY,TOOLBELT,AWARENESS}.md + top-5 cam-tribal-corpus.jsonl hits whenever a cam/toolpath/kilo keyword is detected; this is the single highest-ROI action because 809 tribal tips + 273-line CLAUDE.md currently sit completely dark on every prompt, delivering zero auto-pull value despite being fully populated knowledge stores

2. **Register cross-substrate owned-by-slot + documented-by edges for cam** (run scripts/generate-cross-substrate-edges.mjs extension) — wire kilo slot → cam engine nodes (owned-by-slot@1.0) and cam wiki entries in knowledge/wiki/cam/ → memory_patterns.cam_synthesis (documented-by@1.0); with 24,044 cam graph nodes already present, this makes the master-index auto-surface cam knowledge during any system-viz lookup, turning the existing node mass into navigable auto-pull surface

3. **Build the 6 missing §4 test files (U-KILO-CAM-TEST-SUITE per FLEET-PHD-READINESS)** — camDispatcher round-trip tests with R9 reference-value assertions (kc1_1=3200 MPa H-group, clearance from collision_check_full, units-guard on cm input); the PHD doc identifies this as kilo's top gap that blocks §5 simulate, §6 validate, §7 finetune, and §8 LoRA dataset — without it the 703-action dispatcher has no automated correctness proof and cam knowledge cannot be validated for auto-pull trustworthiness

**BUILD-ONCE CANDIDATES (mechanisms that, if built once, would serve ALL domains):**
- **Generic per-domain awareness-inject generator** (`scripts/generate-domain-awareness-inject.mjs`): delta and echo already have hand-crafted domain awareness hooks; a template generator parameterized by slot+domain+corpus-path would produce all remaining 20+ domain hooks (cam, lathe/whiskey, wedm/mike, mill/foxtrot, etc.) from a single build — highest fleet-wide multiplier
- **CAG cold-anchor extension** for domain MEMORY.md/PATHS.md paths: cag-router.mjs COLD_SOURCES currently lists dispatcher names (`prism_cam`), not doctrine files; extending it to also cache each galaxy's MEMORY.md + TOOLBELT.md as cold-tier docs would make all 34 galaxy brains auto-recalled on cold sessions with one schema change
- **Cross-substrate edge generator for all slots**: scripts/generate-cross-substrate-edges.mjs exists but outputs 0 edges; fixing it to materialize owned-by-slot + documented-by for all 34 galaxies simultaneously is a build-once that gives every domain the graph→wiki/memory auto-link cam currently lacks
