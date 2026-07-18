#!/usr/bin/env node
/**
 * generate-ai-training-units.mjs — derive + enroll per-domain AI-training units.
 *
 * Unit: U-AI-TRAINING-FIRST-ROADMAP-ENROLL (milestone AI-TRAINING-FIRST-MS0).
 * Doctrine: feedback_ai_training_first_before_revenue — pre-revenue, the fleet
 * trains per-domain AI engines on the full corpus so revenue ships at full
 * potential. This generator enumerates the existing
 * *MetaLearning/*DeepLearning/*UltraIntelligence engines, classifies each to one
 * of the 13 DOMAIN-PIPELINE-MS0 domains, and emits one training unit per engine
 * following the memory's 4-step priority (corpus-ingest → engine-wire →
 * tribal-load → strategy-output). Output: a roadmap milestone envelope matching
 * the FEATURE-GAP-AUDIT-MS0 schema.
 *
 * ADVISORY + must_human_verify: file-presence ≠ trained model. An operator must
 * verify each engine actually consumes the corpus before flipping a unit done.
 *
 * Deterministic + idempotent: re-running produces a byte-stable envelope (units
 * sorted by id; engine scan sorted). Atomic write via temp + rename.
 *
 * Usage:
 *   node scripts/generate-ai-training-units.mjs --dry-run
 *   node scripts/generate-ai-training-units.mjs --apply
 *
 * Exit: 0 ok · 1 IO/parse error · 2 no engines found (refuse to emit empty envelope)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const ROOT = path.resolve(__dirname, "..");

export const MILESTONE_ID = "AI-TRAINING-FIRST-MS0";
export const ENVELOPE_PATH = path.resolve(ROOT, "mcp-server/data/milestones/AI-TRAINING-FIRST-MS0.json");
export const ENGINES_DIR = path.resolve(ROOT, "mcp-server/src/engines");
export const ENGINE_RE = /(MetaLearning|DeepLearning|UltraIntelligence)/;

// The 13 canonical DOMAIN-PIPELINE-MS0 domains.
export const DOMAINS = [
  "mill", "lathe", "wire", "cad", "cam", "tribal",
  "erp", "post", "speedfeed", "print2prog", "academy", "database", "misc",
];

/**
 * Classify an engine filename to one of the 13 domains. Order matters — most
 * specific token first (e.g. "Milling" before generic). Returns "misc" when no
 * rule fires (generic optimizers, cross-cutting infra).
 */
export function classifyEngineDomain(name) {
  const n = name.toLowerCase();
  // cam vendors first — "MastercamDeepLearning" must not fall to mill via "cam".
  // "^cam" catches the CAMDeepLearning* prefix engines (a trailing \b fails
  // because "cam" is followed by "deep"); vendor names cover the rest.
  if (/mastercam|hypermill|fusion|esprit|powermill|solidcam|^cam/.test(n)) return "cam";
  if (/lathe|turning/.test(n)) return "lathe";
  if (/electrode|wedm|wire.?edm|sinker|edm/.test(n)) return "wire";
  if (/mill|fiveaxis|5axis|virtualmachining/.test(n)) return "mill";
  if (/speedfeed|speed.?feed/.test(n)) return "speedfeed";
  if (/postprocessor|cnccontroller|controller|post/.test(n)) return "post";
  if (/tooldatabase|database/.test(n)) return "database";
  if (/mitcourse|crossdisciplinary|course|academy/.test(n)) return "academy";
  if (/cad/.test(n)) return "cad";
  if (/tribal/.test(n)) return "tribal";
  if (/erp|business|cost|quote/.test(n)) return "erp";
  if (/print|blueprint/.test(n)) return "print2prog";
  return "misc";
}

/** Engine name → kebab unit-id slug. */
function slugFor(engineBase) {
  return engineBase
    .replace(/Engine$/, "")
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1-$2")
    .toUpperCase();
}

export function deriveUnits(engineFiles) {
  const units = [];
  for (const file of [...engineFiles].sort()) {
    const base = file.replace(/\.ts$/, "");
    const domain = classifyEngineDomain(base);
    const slug = slugFor(base);
    units.push({
      id: `U-AITRAIN-${domain.toUpperCase()}-${slug}`,
      title: `Train ${base} on full pre-revenue corpus (JM-DIE 76K + MIT-OCW + v8.89 MIT kernels)`,
      status: "pending",
      domain,
      engine: `mcp-server/src/engines/${file}`,
      training_priority: [
        "1. corpus ingestion pipeline wired to engine input",
        "2. engine consumes JM-DIE 76K print↔program pairs + Okuma .min + WEDM corpus",
        "3. tribal-knowledge corpus loaded into engine",
        "4. AI-strategy-selection produces real (non-stub) outputs verifiable against held-out corpus",
      ],
      acceptance: "Engine produces a non-stub inference on a held-out JM-DIE sample; metrics recorded; WIRE to its domain dispatcher OR tagged WIRE-EXEMPT with reason.",
      source_doctrine: "feedback_ai_training_first_before_revenue",
    });
  }
  return units.sort((a, b) => a.id.localeCompare(b.id));
}

export function buildEnvelope(units) {
  const byDomain = {};
  for (const u of units) byDomain[u.domain] = (byDomain[u.domain] || 0) + 1;
  // R12 honesty: a domain with zero *Learning engine produces zero units —
  // surface that gap explicitly instead of letting the reader assume the
  // milestone covers all 13 domains. The doctrine memory assigns these gaps
  // to FEATURE-GAP-AUDIT-MS0/U-WIRE-BACKLOG-*.
  const uncovered = DOMAINS.filter(d => !byDomain[d]);
  return {
    id: MILESTONE_ID,
    version: "1.0.0",
    title: "AI-Training-First — per-domain engine training before revenue",
    brief:
      "Pre-revenue training enrollment. One unit per existing " +
      "*MetaLearning/*DeepLearning/*UltraIntelligence engine, classified to its " +
      "DOMAIN-PIPELINE-MS0 domain, sequenced corpus-ingest → wire → tribal-load → " +
      "strategy-output. Doctrine: ship revenue at full potential, not slow-drip.",
    created_at: new Date().toISOString(),
    created_by: "generate-ai-training-units.mjs (U-AI-TRAINING-FIRST-ROADMAP-ENROLL)",
    track: "ai-training",
    roadmap_priority: 0,
    status: "pending",
    total_units: units.length,
    total_sessions: 0,
    source_audit: "feedback_ai_training_first_before_revenue + DOMAIN-PIPELINE-MS0 LEARNING_LOOP",
    advisory_only: true,
    must_human_verify: true,
    domain_breakdown: byDomain,
    uncovered_domains: uncovered,
    gap_owner: uncovered.length
      ? "FEATURE-GAP-AUDIT-MS0/U-WIRE-BACKLOG-* (per feedback_ai_training_first_before_revenue)"
      : null,
    registration: {
      auto_discovered_by: "scripts/build-milestone-progress.mjs (reads every mcp-server/data/milestones/*.json)",
      roadmap_index: "NOT registered inline — roadmap-index.json has 3 non-atomic writers (CLAUDE.md Recent regressions 2026-05-17); a generator must not become a 6th. roadmap-index registration is a deliberate follow-up, mirroring how FEATURE-GAP-AUDIT-MS0 was registered via a dedicated automation unit, not its generator.",
    },
    units,
  };
}

function main() {
  const argv = process.argv.slice(2);
  const dryRun = argv.includes("--dry-run");
  const apply = argv.includes("--apply");
  if (!dryRun && !apply) {
    process.stderr.write("usage: generate-ai-training-units.mjs --dry-run | --apply\n");
    process.exit(1);
  }

  if (!fs.existsSync(ENGINES_DIR)) {
    process.stderr.write(`engines dir not found: ${ENGINES_DIR}\n`);
    process.exit(1);
  }
  const engineFiles = fs
    .readdirSync(ENGINES_DIR)
    .filter(f => f.endsWith(".ts") && ENGINE_RE.test(f));

  if (engineFiles.length === 0) {
    process.stderr.write("no *MetaLearning/*DeepLearning/*UltraIntelligence engines found — refusing to emit empty envelope\n");
    process.exit(2);
  }

  const units = deriveUnits(engineFiles);
  const envelope = buildEnvelope(units);

  process.stdout.write(
    `AI-TRAINING-FIRST-MS0 enrollment:\n` +
    `  engines scanned: ${engineFiles.length}\n` +
    `  units derived:   ${units.length}\n` +
    `  domain breakdown: ${JSON.stringify(envelope.domain_breakdown)}\n`,
  );

  if (dryRun) {
    process.stdout.write(`\n[dry-run] would write ${ENVELOPE_PATH}\n`);
    process.stdout.write(`first 3 units:\n`);
    for (const u of units.slice(0, 3)) process.stdout.write(`  ${u.id} [${u.domain}] ${u.engine}\n`);
    process.exit(0);
  }

  // Idempotent atomic write — stable created_at if envelope unchanged in substance.
  // Idempotency: preserve created_at only when the envelope is substantively
  // identical. Compare the full units array (sans created_at, which is the
  // only intentionally-volatile field) — a shallow id+status check would let
  // a title/acceptance/training_priority edit silently keep a stale timestamp.
  let priorCreatedAt = null;
  if (fs.existsSync(ENVELOPE_PATH)) {
    try {
      const prior = JSON.parse(fs.readFileSync(ENVELOPE_PATH, "utf8"));
      const norm = e => JSON.stringify({ ...e, created_at: null });
      if (norm(prior) === norm(envelope) && prior.created_at) {
        priorCreatedAt = prior.created_at;
      }
    } catch (e) {
      // R12 fail-loud: a corrupt prior is being silently overwritten —
      // regeneration is non-destructive but the operator must learn the
      // prior was unreadable, not assume a clean idempotent run.
      process.stderr.write(
        `WARN: prior envelope at ${ENVELOPE_PATH} is unreadable (${e.message}) — regenerating fresh, created_at will reset\n`,
      );
    }
  }
  if (priorCreatedAt) envelope.created_at = priorCreatedAt;

  const tmp = `${ENVELOPE_PATH}.tmp-${Date.now()}`;
  fs.writeFileSync(tmp, JSON.stringify(envelope, null, 2) + "\n", "utf8");
  fs.renameSync(tmp, ENVELOPE_PATH);
  process.stdout.write(`\nEnvelope written: ${ENVELOPE_PATH}\n`);
  process.stdout.write(priorCreatedAt ? "(idempotent — created_at preserved)\n" : "(new envelope)\n");
  process.exit(0);
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) main();
