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

const SCHEMA_VERSION = '1.0.0';
const OUT = 'H:/prism/state/shared/training/fleet-training-corpus-inventory.json';

const SOURCES = [
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
    id: 'bridge-reasoning-lora',
    kind: 'lora-training-jsonl',
    path: 'H:/prism/state/shared/lora/bridge-reasoning-combined.jsonl',
    description: 'Galaxy-reasoning-bridge grounded (question, RAG context, answer) Alpaca pairs from the self-improvement loop, all galaxies (advisory/LLM-generated). Producer: galaxy-reasoning-bridge.mjs reasonForGalaxy w/ PRISM_GALAXY_BRIDGE_LORA_EMIT=1 -> combined sink (U-FLOR-BRIDGE-LORA-WIRE).',
    domains: ['general'],
    advisory: true, // LLM-generated reasoning pairs -- down-weighted, never confused with verified doctrine
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
