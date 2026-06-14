// scripts/lib/print-harvester-lib.mjs
//
// U-TDP02 - Batch Print Harvester (pure core).
//
// Scans a directory of blueprint PDFs and produces a job list for U-TDP01's
// training driver. Maintains an idempotent registry of processed prints so
// re-runs skip already-done files.
//
// Pure: no fs/cron/spawn. CLI shell does enumeration + driver invocation.

export const REGISTRY_SCHEMA_VERSION = 1;

export const PART_CLASS_HEURISTICS = Object.freeze([
  { token: "punch",    part_class: "extrude_punch" },
  { token: "die",      part_class: "die" },
  { token: "shaft",    part_class: "shaft" },
  { token: "bushing",  part_class: "bushing" },
  { token: "bracket",  part_class: "bracket" },
  { token: "casing",   part_class: "casing" },
  { token: "plate",    part_class: "plate" },
  { token: "valve",    part_class: "valve_body" },
  { token: "blisk",    part_class: "blisk" },
  { token: "impeller", part_class: "impeller" },
]);

export function migrateRegistry(reg) {
  const base = reg && typeof reg === "object" ? reg : {};
  const processed = base.processed && typeof base.processed === "object" && !Array.isArray(base.processed)
    ? { ...base.processed }
    : {};
  const lastRunAt = typeof base.lastRunAt === "string" || base.lastRunAt === null ? base.lastRunAt : null;
  const totalRuns = Number.isFinite(Number(base.totalRuns)) && Number(base.totalRuns) >= 0
    ? Math.floor(Number(base.totalRuns))
    : 0;
  return { schemaVersion: REGISTRY_SCHEMA_VERSION, processed, lastRunAt, totalRuns };
}

export function derivePathId(pdfPath) {
  if (typeof pdfPath !== "string" || !pdfPath) return "";
  return pdfPath.replace(/\\/g, "/").toLowerCase();
}

export function inferPartClass(pdfPath, opts = {}) {
  const fallback = typeof opts.default === "string" && opts.default ? opts.default : "general";
  if (typeof pdfPath !== "string" || !pdfPath) return fallback;
  const lower = pdfPath.toLowerCase();
  for (const h of PART_CLASS_HEURISTICS) {
    if (lower.includes(h.token)) return h.part_class;
  }
  return fallback;
}

export function listCandidates(walkResult, registry, opts = {}) {
  const reg = migrateRegistry(registry);
  const inDefault = typeof opts.default_part_class === "string" ? opts.default_part_class : "general";
  const max = Number.isFinite(Number(opts.max)) && Number(opts.max) > 0 ? Math.floor(Number(opts.max)) : Infinity;
  const force = opts.force === true;

  const newJobs = [];
  const skippedJobs = [];
  const errors = [];

  if (!Array.isArray(walkResult)) {
    return {
      newJobs: [],
      skippedJobs: [],
      summary: { walked: 0, new: 0, skipped: 0, capped: false, error: "walkResult is not an array" },
    };
  }

  let capped = false;
  for (const p of walkResult) {
    if (typeof p !== "string" || !p) {
      errors.push("skipped non-string path");
      continue;
    }
    if (!p.toLowerCase().endsWith(".pdf")) {
      errors.push("skipped non-pdf path: " + p);
      continue;
    }
    const id = derivePathId(p);
    const seen = reg.processed[id];
    if (seen && !force) {
      skippedJobs.push(p);
      continue;
    }
    if (newJobs.length >= max) {
      capped = true;
      break;
    }
    newJobs.push({ pdf_path: p, part_class: inferPartClass(p, { default: inDefault }) });
  }

  return {
    newJobs,
    skippedJobs,
    summary: {
      walked: walkResult.length,
      new: newJobs.length,
      skipped: skippedJobs.length,
      capped,
      errors: errors.slice(0, 10),
      errorCount: errors.length,
    },
  };
}

export function registerProcessed(registry, jobs, opts = {}) {
  const reg = migrateRegistry(registry);
  const now = typeof opts.now === "function" ? opts.now : () => new Date().toISOString();
  const ts = now();
  for (const j of Array.isArray(jobs) ? jobs : []) {
    if (!j || typeof j !== "object" || typeof j.pdf_path !== "string" || !j.pdf_path) continue;
    const id = derivePathId(j.pdf_path);
    reg.processed[id] = {
      ts,
      part_class: typeof j.part_class === "string" ? j.part_class : "general",
      status: typeof j.status === "string" ? j.status : "ok",
      ...(typeof j.run_id === "string" ? { run_id: j.run_id } : {}),
    };
  }
  reg.lastRunAt = ts;
  reg.totalRuns += 1;
  return reg;
}

export function summarizeRegistry(registry) {
  const reg = migrateRegistry(registry);
  const byPartClass = {};
  const byStatus = {};
  for (const entry of Object.values(reg.processed)) {
    if (!entry || typeof entry !== "object") continue;
    const pc = typeof entry.part_class === "string" ? entry.part_class : "unknown";
    const s = typeof entry.status === "string" ? entry.status : "unknown";
    byPartClass[pc] = (byPartClass[pc] ?? 0) + 1;
    byStatus[s] = (byStatus[s] ?? 0) + 1;
  }
  return {
    totalProcessed: Object.keys(reg.processed).length,
    byPartClass,
    byStatus,
    totalRuns: reg.totalRuns,
    lastRunAt: reg.lastRunAt,
  };
}
