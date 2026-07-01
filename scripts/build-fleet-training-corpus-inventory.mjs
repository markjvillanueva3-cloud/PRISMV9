#!/usr/bin/env node
// build-fleet-training-corpus-inventory.mjs
//
// Aggregates every training-relevant corpus gathered across the fleet
// (kilo CAD/CAM PDF nodes, lima academy courses, india MIT-OCW extractions,
// charlie quoting baseline, foxtrot vendor PDFs, PSN legs, etc.) into one
// inventory the training pipeline can iterate over.
//
// Reference-only — does NOT duplicate corpus content. Carries pointers +
// row counts + freshness so trainers can decide what to ingest.
//
// Per kilo /checkin-kilo 2026-05-26 next-batch directive:
//   "run next batch of tasks before utilizing everything gathered by all
//    chats to use in the training pipelines"
//
// schemaVersion 1.0.0

import fs from 'node:fs';
import path from 'node:path';
// U-LORA-MACHINE-CORPUS-PRODUCER (slot:india): single-source the per-machine LoRA
// dataset registration from the producer's MACHINES registry so the SOURCES path/id
// can never drift from where the producer actually writes.
import { MACHINES as MACHINE_LORA_BUILDERS, outPathFor as machineLoraOutPath } from './build-machine-lora-datasets.mjs';

const SCHEMA_VERSION = '1.0.0';
const OUT = 'H:/prism/state/shared/training/fleet-training-corpus-inventory.json';

// Per-machine LoRA datasets produced by scripts/build-machine-lora-datasets.mjs. status
// is 'missing' until the owning galaxy slot drops real shop actuals (no synthetic data),
// at which point assemble-fleet-lora-corpus.mjs folds them into the fleet corpus. advisory
// false = verified real-actual weight when populated.
const MACHINE_LORA_SOURCES = MACHINE_LORA_BUILDERS.map((m) => ({
  id: `machine-${m.type}-lora`,
  kind: 'lora-training-jsonl',
  path: machineLoraOutPath(m.type).replace(/\\/g, '/'),
  description: `Per-machine LoRA dataset for ${m.type} (real shop RawJobs -> Alpaca via ${m.singleton}). Producer: scripts/build-machine-lora-datasets.mjs; owner slot: ${m.owner}. Empty until real actuals land at state/shared/training/machine-jobs/${m.type}.jsonl.`,
  domains: m.domains,
  advisory: false,
}));

const SOURCES = [
  ...MACHINE_LORA_SOURCES,
  // Lathe is the special-case 9th machine: a self-contained archive-scanner (not a RawJob
  // wrapper), so it has its own producer. REAL .MIN-archive-grounded + QUALITY-GATED
  // (isQualityExample drops the builder's ~31% empty-analysis/sequence-hallucination/too-short
  // pairs). owner: whiskey (engine generateExamples) / india (corpus curation). advisory false.
  {
    id: 'machine-lathe-lora',
    kind: 'lora-training-jsonl',
    path: 'H:/prism/state/shared/lora/machine-lathe-dataset.jsonl',
    description: 'Lathe LoRA dataset from the JM CNC LATHE archive (real .MIN programs, quality-gated + deduped). Producer: npx tsx scripts/build-lathe-lora-dataset.ts.',
    domains: ['lathe'],
    // advisory:true -> 0.5 weight. Real-archive-GROUNDED but heavily TEMPLATED (instruction phrasing +
    // recommendation tails are static), so distillation-grade like the synthesis/bridge/outcome sources
    // (R7: do not blend trust levels by marking templated data full verified weight). Arm-B 3-of-3.
    advisory: true,
  },
  // Existing PSN 11-leg manifest (referenced, not duplicated).
  {
    id: 'psn-corpus-manifest',
    kind: 'aggregate-manifest',
    path: 'H:/prism/state/shared/training/psn-corpus-manifest.json',
    description: 'PSN 11-leg training corpus manifest (obsidian/wiki/memories/tribal/system-viz/engines/algorithms/formulas/prism-ai).',
    domains: ['general'],
  },
  // Kilo's CAD/CAM PDF extraction (this session's deliverable).
  {
    id: 'cad-cam-pdf-resources-index',
    kind: 'pdf-classification-manifest',
    path: 'H:/prism/mcp-server/data/state/cad-cam-resources-pdf-index.json',
    description: 'CAD/CAM resources PDF classification — 4008 PDFs across resources/ + JM DIE/ keyed by (domain, software).',
    domains: ['cad', 'cam', 'blueprint', 'machine', 'training', 'catalog'],
  },
  {
    id: 'cad-cam-pdf-nodes',
    kind: 'pdf-extracted-text',
    rootDir: 'H:/prism/state/shared/cad-cam-pdf-nodes',
    description: 'Per-PDF extracted text+HTML nodes. JSON+HTML pair per PDF, sha8-keyed.',
    domains: ['cad', 'cam', 'blueprint'],
  },
  {
    id: 'cad-cam-pdf-tribal-seeds',
    kind: 'tribal-seed-pointers',
    path: 'H:/prism/state/shared/cad-cam-pdf-tribal-seeds.json',
    description: 'Pointer-style tribal tips per CAD/CAM software (semantic AI promotion deferred — needs Ollama).',
    domains: ['cad', 'cam', 'blueprint'],
  },
  // CAM-AI-TRAINING-MS0 master corpus (kilo prior session).
  {
    id: 'cam-master-training-set',
    kind: 'lora-training-jsonl',
    path: 'H:/prism/state/shared/corpus/cam-master-training-set.jsonl',
    fallbackPath: 'H:/prism/mcp-server/data/state/cam-master-training-set.jsonl',
    description: 'CAM-AI-TRAINING-MS0 3766-tuple LoRA training set, 8 tracks (template/physics/param/cross-system/iso286/finish/coolant/operator-gate).',
    domains: ['cam'],
  },
  // Rescued resource-PDF domain knowledge -> LoRA. Producer: scripts/domain-corpus-to-lora-dataset.mjs.
  // The 65 specs reclassify-domain-feeders-ollama.mjs lifted OUT of the keyword-unclassified
  // residual, with their REAL PDF text (pdftotext) turned into domain-tagged Alpaca pairs.
  {
    id: 'domain-knowledge-lora',
    kind: 'lora-training-jsonl',
    path: 'H:/prism/state/shared/lora/domain-knowledge-dataset.jsonl',
    description: 'Rescued resource-PDF domain knowledge -> Alpaca pairs (post-processor/mill/lathe/speed-feed/wedm/tooling) from real pdftotext grounding of the 65 Ollama-rescued specs. Producer: domain-corpus-to-lora-dataset.mjs (U-PAPA-DOMAIN-KNOWLEDGE-LORA).',
    domains: ['post-processor', 'mill', 'lathe', 'speed-feed', 'wedm', 'tooling'],
    advisory: true, // heuristic raw-text grounding (pdftotext, not page-cited) -- down-weighted like the templated/distilled sources
  },
  // GNN ghost-wiring CONFIRMED outcomes -> engine->dispatcher wiring-inference LoRA.
  // Closes the "GHOST-WIRING rows NO-CONVERTER" coverage gap (U-CLOSED-LOOP-COVERAGE 65c85a9fbb):
  // the GNN's own CONFIRMED (on-disk-referenced) wiring proposals become training signal for the
  // wiring-inference model. Pending/unvalidated guesses are SKIPPED by the converter (trust gate).
  {
    id: 'ghostwire-wiring-lora',
    kind: 'lora-training-jsonl',
    path: 'H:/prism/state/shared/lora/ghostwire-wiring-dataset.jsonl',
    description: 'GNN ghost-wiring CONFIRMED (engine-referenced-on-disk) outcomes -> engine->dispatcher wiring-inference Alpaca pairs; pending/unvalidated guesses skipped (trust gate). Producer: build-ghostwire-lora-dataset.mjs (U-DELTA-GHOSTWIRE-CONVERTER, slot:delta 2026-06-28).',
    domains: ['general'],
    advisory: true, // GNN keyword-heuristic proposals -- on-disk-confirmed but not hand-authored doctrine -> 0.5 weight
  },
  // Hermes per-domain enrichment-loop -> Alpaca recall pairs (U-HERMES-LORA-CORPUS, slot:india 2026-06-30).
  // Closes the producer-alive/consumer-dead gap (sibling of U-HERMES-TRIBAL-INJECT, which wired the same
  // staging into the tribal surfaces): hermes-domain-enrichment-loop.mjs (6 parallel Grok agents) emits
  // cited per-domain rules to staging, now converted to {instruction,output} so they reach the LoRA corpus.
  {
    id: 'hermes-enrichment-lora',
    kind: 'lora-training-jsonl',
    path: 'H:/prism/state/shared/lora/hermes-enrichment-dataset.jsonl',
    description: 'Hermes/Grok per-domain enrichment-loop cited rules -> Alpaca recall pairs (topic -> cited specifics). Producer: hermes-enrichment-to-alpaca.mjs (U-HERMES-LORA-CORPUS, slot:india 2026-06-30).',
    domains: ['mill', 'lathe', 'wedm', 'cam', 'cad', 'post-processor', 'general'],
    advisory: true, // unreviewed-cron LLM-asserted knowledge (confidence ~45) -- recall augmentation, down-weighted; not hand-authored doctrine
  },
  // Hermes PARALLEL-AGENT knowledge campaign (wave-1/2 specs) -> Alpaca recall pairs
  // (U-INDIA-HERMES-KNOWLEDGE-LORA, slot:india 2026-06-30). Sibling of hermes-enrichment-lora
  // above + U-INDIA-HERMES-KNOWLEDGE-EMBED (which wired the SAME 84 campaign items into the
  // tribal L1 index). Producer: hermes-enrichment-to-alpaca.mjs (reused verbatim -- generic over
  // the capture-tip schema) over the stage-hermes-knowledge-tips.mjs staging. Distinct dataset so
  // the assembler folds it additively; the 6 [ARITH?] cautions ride into the output text so the
  // adapter learns the rule WITH the recompute caveat, never a bare (possibly-wrong) number.
  {
    id: 'hermes-knowledge-lora',
    kind: 'lora-training-jsonl',
    path: 'H:/prism/state/shared/lora/hermes-knowledge-dataset.jsonl',
    description: 'Hermes/Grok 6-parallel-agent knowledge campaign (wave-1/2, 84 zulu-R12-verified cited items across the 6 primary domains) -> Alpaca recall pairs. Producer: hermes-enrichment-to-alpaca.mjs over stage-hermes-knowledge-tips.mjs staging (U-INDIA-HERMES-KNOWLEDGE-LORA, slot:india 2026-06-30).',
    domains: ['mill', 'lathe', 'wedm', 'cam', 'cad', 'post-processor', 'general'],
    advisory: true, // unreviewed-cron LLM-asserted knowledge (confidence 40-70 by [C]/[N]/[ARITH?] tag) -- recall augmentation, down-weighted; not hand-authored doctrine
  },
  // CAD live-Fusion closed-loop ROUNDTRIP accuracy ledger (U-DELTA-FUSION-LIVE-ROUNDTRIP, slot:delta
  // 2026-06-28). A distinct kind ('cad-accuracy-ledger', NOT 'lora-training-jsonl') so the assembler
  // (selectLoraSources filters kind==='lora-training-jsonl') SKIPS it -- it is INVENTORIED only, which
  // makes the live CAD-gen geometric-FIDELITY signal discoverable to the closed-loop training/discovery
  // surface without being mis-assembled as Alpaca pairs (R12: a validation ledger is not training pairs).
  {
    id: 'cad-fusion-live-roundtrip-accuracy',
    kind: 'cad-accuracy-ledger',
    path: 'H:/prism/state/shared/cad-fusion-live/roundtrip-accuracy.jsonl',
    description: 'Live-Fusion closed-loop roundtrip accuracy datapoints: a known primitive spec -> the Fusion-bridge-generated solid read-back (volume/bbox via /geometry) vs ANALYTIC ground truth -> per-axis + volume dim error, plus the stale-in-memory add-in verdict. A geometric-FIDELITY validation signal (NOT Alpaca pairs; inventoried/discoverable only). Producer: scripts/cad-fusion-live-roundtrip.mjs (U-DELTA-FUSION-LIVE-ROUNDTRIP, slot:delta 2026-06-28).',
    domains: ['cad'],
    advisory: true,
  },
  // Per-domain tribal corpora -> LoRA. Producer: scripts/tribal-corpus-to-lora-dataset.mjs.
  // The *-tribal-corpus.jsonl `tip`s are POINTERS ("read the source PDF"); this distills their
  // REAL source PDFs into domain-tagged Alpaca pairs -- the corpora domain-knowledge-lora (the
  // NON-cadcam rescued residual) never covers. cad+cam wired now (398 raw rows); the other 8
  // domains widen via `--domains all` (overlap-guarded vs domain-knowledge-lora -> strictly additive).
  {
    id: 'tribal-knowledge-lora',
    kind: 'lora-training-jsonl',
    path: 'H:/prism/state/shared/lora/tribal-knowledge-dataset.jsonl',
    description: 'Per-domain *-tribal-corpus.jsonl source PDFs -> domain-tagged Alpaca pairs (cad/cam now, all 10 via --domains all; overlap-guarded vs domain-knowledge-lora so strictly additive). Producer: tribal-corpus-to-lora-dataset.mjs (U-PAPA-TRIBAL-CORPUS-LORA).',
    domains: ['cad', 'cam'],
    advisory: true, // heuristic raw-text grounding (pdftotext) / Ollama-distilled -- down-weighted like domain-knowledge-lora
  },
  // Vault -> LoRA datasets. Producer: scripts/vault-to-lora-dataset.mjs.
  // Two DISTINCT signals kept separate by trust level (R7): verified-feedback
  // doctrine vs advisory galaxy-synthesis. Both are gitignored regenerable data,
  // so statPath() returns null on a fresh checkout (handled like every source).
  {
    id: 'vault-feedback-lora',
    kind: 'lora-training-jsonl',
    path: 'H:/prism/state/shared/lora/vault-feedback-dataset.jsonl',
    description: 'Vault feedback memories -> Alpaca doctrine pairs (verified, hand-authored PRISM rules). Producer: vault-to-lora-dataset.mjs (OBSIDIAN-AI-SYNERGY).',
    domains: ['general'],
    advisory: false, // hand-authored verified doctrine -- full training weight
  },
  {
    id: 'vault-galaxy-synthesis-lora',
    kind: 'lora-training-jsonl',
    path: 'H:/prism/state/shared/lora/vault-galaxy-synthesis-dataset.jsonl',
    description: 'Per-galaxy synthesis brains -> Alpaca pairs (advisory/LLM-distilled, galaxy-tagged; verify against source). Producer: vault-to-lora-dataset.mjs --source galaxy (U-LORA-GALAXY-SYNTHESIS).',
    domains: ['general'],
    advisory: true, // LLM-distilled/mustHumanVerify -- the assembler down-weights it (authoritative, not regex-inferred)
  },
  {
    id: 'vault-galaxy-aisynergy-lora',
    kind: 'lora-training-jsonl',
    path: 'H:/prism/state/shared/lora/vault-galaxy-aisynergy-dataset.jsonl',
    description: 'Per-galaxy CLAUDE.md "## AI Synergy (PSN leg #10)" sections -> galaxy-tagged Alpaca pairs (the per-galaxy AI->substrate mapping: reasoning bridge / LoRA / GNN / CAG-RAG). DETERMINISTIC doc-extraction (no Ollama) of verified-true participation -- the "claude.md of each galaxy" AI-synergy LoRA signal. Producer: vault-to-lora-dataset.mjs --source galaxy-ai-synergy (U-LORA-GALAXY-AISYN, slot:bravo 2026-06-14).',
    domains: ['general'],
    advisory: false, // deterministic extraction of verified-true CLAUDE.md doctrine -> full weight, like the hand-authored vault-feedback-lora set (NOT LLM-distilled like the galaxy-synthesis/bridge sources)
  },
  {
    id: 'bridge-reasoning-lora',
    kind: 'lora-training-jsonl',
    path: 'H:/prism/state/shared/lora/bridge-reasoning-combined.jsonl',
    description: 'Galaxy-reasoning-bridge grounded (question, RAG context, answer) Alpaca pairs from the self-improvement loop, all galaxies (advisory/LLM-generated). Producer: galaxy-reasoning-bridge.mjs reasonForGalaxy w/ PRISM_GALAXY_BRIDGE_LORA_EMIT=1 -> combined sink (U-FLOR-BRIDGE-LORA-WIRE).',
    domains: ['general'],
    advisory: true, // LLM-generated reasoning pairs -- down-weighted, never confused with verified doctrine
  },
  {
    id: 'vault-lessons-lora',
    kind: 'lora-training-jsonl',
    path: 'H:/prism/state/shared/lora/vault-lessons-dataset.jsonl',
    description: 'PRISM failure->fix corpus (wiki code-tribal/learnings) -> symptom->(root-cause+fix) Alpaca pairs. Premium debugging-reasoning signal: teaches the model to diagnose a symptom to its root cause + the fix and to avoid documented silent-failure modes. Signal-gated + NON-DEGENERATE split (input=symptom != output=diagnosis). Producer: vault-lessons-to-lora-dataset.mjs (U-LORA-LESSONS, slot:alpha 2026-06-17).',
    domains: ['general'],
    advisory: true, // distilled from commit-message lessons (not hand-authored doctrine) -- down-weighted like the synthesis/bridge sources
  },
  // Wiki canonical -> training pairs (U-FLOR-WIKI-CANON-WIRE, slot:tango 2026-06-11). The
  // "wikis across all galaxies" LoRA signal: canonical wiki entries deterministically
  // extracted into instruction-tuning pairs. Uses the {prompt,completion} schema (NOT the
  // native {instruction,output}) -- the assembler's normalizeAlpacaRow now accepts both, so
  // these 282 real wiki pairs (previously DORMANT: 0 consumable due to the key mismatch) now
  // land. Producer: scripts/wiki-canonical-to-training-pairs.mjs.
  {
    id: 'wiki-canonical-pairs',
    kind: 'lora-training-jsonl',
    path: 'H:/prism/state/shared/training/wiki-canonical-pairs.jsonl',
    description: 'Canonical wiki entries -> instruction/completion training pairs ({prompt,completion} schema). The "wikis across all galaxies" LoRA signal. Producer: scripts/wiki-canonical-to-training-pairs.mjs.',
    domains: ['general'],
    advisory: true, // deterministically extracted from wiki prose (not hand-authored doctrine) -- down-weighted
  },
  // Wiki DOMAIN-KNOWLEDGE spine -> training pairs (U-LORA-WIKI-DOMAIN, slot:india 2026-06-21).
  // DISJOINT from wiki-canonical-pairs above: that reads ONLY ideablock-v1 Q&A entries under
  // code-tribal/ + architecture/; THIS reads the curated per-domain PROSE spine (galaxy dirs
  // wedm/lathe/mill/cam/cad/speed-feed/quoting/business/... + reference/software-engineering/
  // training) and EXPLICITLY EXCLUDES architecture/code-tribal/os/consensus (machine-gen bulk).
  // One Alpaca pair per LEAF wiki section (`###`, or a `##` with own prose) -- the
  // practitioner-knowledge layer (e.g. wedm-applied-practice gotchas). ~2.8K pairs, galaxy-tagged
  // for per-domain adapter splits. Producer: scripts/vault-wiki-to-lora-dataset.mjs (--out).
  {
    id: 'vault-wiki-knowledge-lora',
    kind: 'lora-training-jsonl',
    path: 'H:/prism/state/shared/lora/vault-wiki-knowledge-dataset.jsonl',
    description: 'Curated per-domain wiki spine (applied-practice/foundations/reference prose; architecture/code-tribal/os/consensus excluded) -> per-section instruction/input/output Alpaca pairs, galaxy-tagged. The "domain expertise across all galaxies" LoRA signal (distinct from wiki-canonical-pairs ideablock Q&A and vault-lessons failure->fix). Producer: scripts/vault-wiki-to-lora-dataset.mjs (U-LORA-WIKI-DOMAIN, slot:india 2026-06-21).',
    domains: ['general'],
    advisory: true, // curated wiki prose (source-verified but not hand-authored doctrine) -- down-weighted like the synthesis/lessons sources
  },
  // Closed-loop OUTCOME BUS -> training pairs (U-OUTCOME-LORA-WIRE, slot:india 2026-06-11).
  // The outcome bus (state/outcomes/*.jsonl) had written 12,093 real events that NO trainer
  // read -- a write-only sink. This source is the converted learnable subset (the ~10.8K
  // recommendation events whose context carries the determining inputs). Producer:
  // scripts/build-outcomes-lora-dataset.mjs (--out). ADVISORY: engine-emitted recommendations
  // (physics-engine distillation), not hand-authored doctrine -- the assembler down-weights to 0.5.
  {
    id: 'outcome-bus-recommendations',
    kind: 'lora-training-jsonl',
    path: 'H:/prism/state/shared/lora/outcomes-dataset.jsonl',
    description: 'Closed-loop outcome-bus recommendation events -> Alpaca pairs (learnable subset; engine-emitted recommendations, advisory). Producer: scripts/build-outcomes-lora-dataset.mjs.',
    domains: ['speed_feed', 'sinker_edm', 'mill', 'lathe', 'wedm', 'general'],
    advisory: true, // engine-emitted recommendations (not operator-validated outcomes) -- down-weighted
  },
  // Delta CAD closed-loop fix-ledger -> CAD-generation training pairs (U-CAD-FIX-LEDGER-TRAIN,
  // slot:india 2026-06-11). Closes delta's persist->retrain arc: the closed loop persists each
  // verified correction (the regenerated CAD omitted required feature X) to
  // state/shared/cad-fix-training-ledger.jsonl, but NOTHING consumed it. This source is the
  // converted CAD-generator-training subset (rows with trainsCadGen). Producer:
  // scripts/build-cad-fix-training-dataset.mjs. ADVISORY: auto-extracted evidence-grounded
  // corrections (not hand-authored doctrine) -- the assembler down-weights to 0.5.
  {
    id: 'cad-fix-training-corrections',
    kind: 'lora-training-jsonl',
    path: 'H:/prism/state/shared/lora/cad-fix-training-dataset.jsonl',
    description: 'Delta CAD closed-loop fix-ledger corrections -> CAD-generation Alpaca pairs (missing-feature corrections, evidence-grounded, advisory). Producer: scripts/build-cad-fix-training-dataset.mjs.',
    domains: ['cad'],
    advisory: true, // auto-extracted closed-loop corrections (not hand-authored doctrine) -- down-weighted
  },
  // Delta CAD class-prototype GROUND-TRUTH -> CAD-generation feature priors (U-CAD-GT-FEATURE-PRIORS,
  // slot:india 2026-06-11). The POSITIVE-signal sibling of cad-fix-training-corrections: every
  // per-class GT catalog (derive-ground-truth-from-cad.mjs, mined from 662 JM-Die STEP files) becomes
  // a class->feature prior ("a <class> part SHOULD include features [...]"), covering ALL 11 classes
  // (the corrections covered only the 5 with logged misses). Producer:
  // scripts/build-cad-ground-truth-dataset.mjs. ADVISORY: deterministically extracted corpus evidence.
  {
    id: 'cad-ground-truth-feature-priors',
    kind: 'lora-training-jsonl',
    path: 'H:/prism/state/shared/lora/cad-ground-truth-dataset.jsonl',
    description: 'Delta CAD class-prototype ground-truth -> CAD-generation class->feature-prior Alpaca pairs (evidence-ranked, all 11 part classes, advisory). Producer: scripts/build-cad-ground-truth-dataset.mjs.',
    domains: ['cad'],
    advisory: true, // deterministically extracted corpus evidence (not hand-authored doctrine) -- down-weighted
  },
  // Delta CAD per-class GEOMETRIC COMPOSITION -> CAD-generation topology priors (U-CAD-GEOM-COMPOSITION,
  // slot:india 2026-06-11). The TOPOLOGY-signal sibling of the feature-priors + fix-corrections: the
  // STEP report's per-class surface-primitive counts (cylindrical/toroidal/conical/B-spline) + complexity
  // histogram, mined from 665 JM-Die STEP files, become per-part averages ("a die averages ~23 cylindrical,
  // ~40 freeform surfaces; 17% complex"). A quantitative step beyond presence-only. Producer:
  // scripts/build-cad-geometry-composition-dataset.mjs. ADVISORY: deterministically extracted corpus evidence.
  {
    id: 'cad-geometry-composition',
    kind: 'lora-training-jsonl',
    path: 'H:/prism/state/shared/lora/cad-geometry-composition-dataset.jsonl',
    description: 'Delta CAD per-class surface-primitive composition -> CAD-generation topology-prior Alpaca pairs (per-part averages + complexity distribution, all 11 part classes, advisory). Producer: scripts/build-cad-geometry-composition-dataset.mjs.',
    domains: ['cad'],
    advisory: true, // deterministically extracted corpus evidence (not hand-authored doctrine) -- down-weighted
  },
  // Delta CAD per-class DIMENSIONAL radii -> CAD-generation dimension priors (U-CAD-DIM-RADII,
  // slot:india 2026-06-11). The FIRST dimensional (values, not presence) signal: real cylindrical/
  // circular feature radii mined from the JM-Die STEP corpus, UNIT-NORMALIZED to mm (inch files x25.4
  // -- UNITS-FIRST, unknown-unit files skipped). Per-class radius distributions (min/median/IQR/max),
  // e.g. "a die's circular features span ~0.25-X mm, median ~4.76 mm". The accuracy lever. Producer:
  // scripts/build-cad-dimension-dataset.mjs. ADVISORY: deterministically extracted corpus evidence.
  {
    id: 'cad-dimension-radii',
    kind: 'lora-training-jsonl',
    path: 'H:/prism/state/shared/lora/cad-dimension-dataset.jsonl',
    description: 'Delta CAD per-class cylindrical/circular feature radii (mm, unit-normalized from the STEP corpus) -> CAD-generation dimensional-prior Alpaca pairs (radius distributions per class, advisory). Producer: scripts/build-cad-dimension-dataset.mjs.',
    domains: ['cad'],
    advisory: true, // deterministically extracted corpus evidence (not hand-authored doctrine) -- down-weighted
  },
  // MIT-OCW corpus index (india, U-INDIA-MITOCW-COMMIT-WIRE).
  // buildCorpusIndex() in scripts/materialize-mit-ocw-corpus.mjs scans
  // H:/prism/resources/MIT COURSES + the hardcoded 225-course MIT_COURSE_INDEX
  // and writes one JSONL entry per course (schema: course_id/slug/title/category/
  // priority/topics/prism_engines/sections/url/source_path/has_zip/is_extracted/
  // relevance/extracted_at). The assembler does NOT use this as Alpaca pairs --
  // it is inventoried as a 'mit-ocw-corpus-index' kind so the training pipeline
  // can discover which MIT courses are locally extracted and ready to enrich.
  {
    id: 'mit-ocw-corpus-index',
    kind: 'mit-ocw-corpus-index',
    path: 'H:/prism/extracted/mit-ocw/corpus-index.jsonl',
    description: 'MIT OpenCourseWare corpus registry: one JSONL entry per course (176+ courses, scanned from H:/prism/resources/MIT COURSES + 225-entry hardcoded index). Fields: course_id, slug, title, category, priority, topics, prism_engines, sections, url, source_path, has_zip, is_extracted, relevance, extracted_at. Producer: scripts/materialize-mit-ocw-corpus.mjs. Inventoried only (not Alpaca pairs); training pipeline reads this to discover locally-extracted MIT courses.',
    domains: ['cad', 'cam', 'mill', 'lathe', 'wedm', 'general'],
    advisory: true,
  },
  // CAD software master index (existing).
  {
    id: 'cad-software-master-index',
    kind: 'extraction-master-index',
    path: 'H:/prism/mcp-server/data/extracted-knowledge/CAD_SOFTWARE_MASTER_INDEX.json',
    description: 'Master index of CAD-software extraction batches (freecad/fusion360/inventor/etc).',
    domains: ['cad'],
  },
  // Academy course definitions (lima).
  {
    id: 'academy-course-definitions',
    kind: 'curriculum-modules',
    rootDir: 'H:/prism/mcp-server/src/data/academy',
    pattern: /^course-.*\.ts$/,
    description: 'PRISM Academy curriculum — TS course modules per topic (lima PRISM-ACADEMY-FEATURES-MS0).',
    domains: ['general', 'cad', 'cam', 'cnc', 'shop-basics', 'erp'],
  },
  // Tribal graph corpus (foxtrot).
  {
    id: 'tribal-graph-corpus',
    kind: 'tribal-embed-corpus',
    rootDir: 'H:/prism/state/shared/tribal-graph',
    description: 'Tribal embedding corpus (course-tribal-nodes + content candidates).',
    domains: ['general', 'mill', 'lathe', 'wedm'],
  },
];

function statPath(p) {
  if (!fs.existsSync(p)) return null;
  try {
    const st = fs.statSync(p);
    return { exists: true, sizeBytes: st.isFile() ? st.size : null, mtime: st.mtime.toISOString() };
  } catch { return null; }
}

function countJsonRows(p) {
  try {
    const j = JSON.parse(fs.readFileSync(p, 'utf8'));
    // Heuristics for common shapes.
    if (Array.isArray(j)) return j.length;
    if (Array.isArray(j.entries)) return j.entries.length;
    if (Array.isArray(j.tips)) return j.tips.length;
    if (Array.isArray(j.rows)) return j.rows.length;
    if (j.legs) return Object.values(j.legs).reduce((s, l) => s + (l.rows || 0), 0);
    return null;
  } catch { return null; }
}

function countJsonlLines(p) {
  try {
    const s = fs.readFileSync(p, 'utf8');
    let n = 0;
    for (let i = 0; i < s.length; i++) if (s.charCodeAt(i) === 10) n++;
    if (s.length > 0 && s.charCodeAt(s.length - 1) !== 10) n++;
    return n;
  } catch { return null; }
}

function countDirEntries(d, pat) {
  if (!fs.existsSync(d)) return null;
  const stack = [d];
  let n = 0;
  while (stack.length) {
    const cur = stack.pop();
    let xs;
    try { xs = fs.readdirSync(cur, { withFileTypes: true }); } catch { continue; }
    for (const x of xs) {
      const ff = path.join(cur, x.name);
      if (x.isDirectory()) stack.push(ff);
      else if (!pat || pat.test(x.name)) n++;
    }
  }
  return n;
}

function inspectSource(src) {
  const result = { ...src, status: 'unknown' };
  delete result.fallbackPath;
  delete result.pattern;
  if (src.path || src.fallbackPath) {
    const p = src.path && fs.existsSync(src.path) ? src.path : src.fallbackPath;
    const stat = p ? statPath(p) : null;
    result.resolvedPath = p;
    result.fileStat = stat;
    if (stat) {
      result.status = 'present';
      if (/\.jsonl$/.test(p || '')) result.rows = countJsonlLines(p);
      else if (/\.json$/.test(p || '')) result.rows = countJsonRows(p);
    } else {
      result.status = 'missing';
    }
  } else if (src.rootDir) {
    const stat = statPath(src.rootDir);
    result.resolvedPath = src.rootDir;
    result.fileStat = stat;
    if (stat) {
      result.status = 'present';
      result.fileCount = countDirEntries(src.rootDir, src.pattern);
    } else {
      result.status = 'missing';
    }
  }
  return result;
}

function main() {
  const sources = SOURCES.map(inspectSource);
  const summary = {
    schemaVersion: SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    totalSources: sources.length,
    present: sources.filter((s) => s.status === 'present').length,
    missing: sources.filter((s) => s.status === 'missing').length,
    sources,
  };
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(summary, null, 2));
  process.stdout.write(JSON.stringify({
    ok: true,
    written: OUT,
    totalSources: summary.totalSources,
    present: summary.present,
    missing: summary.missing,
  }) + '\n');
}

const invokedDirectly = process.argv[1]
  && path.basename(process.argv[1]) === 'build-fleet-training-corpus-inventory.mjs';
if (invokedDirectly) main();

export { inspectSource, SOURCES };
