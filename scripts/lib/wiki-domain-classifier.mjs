/**
 * scripts/lib/wiki-domain-classifier.mjs
 *
 * Pure: map a wiki path (normalized lowercase posix) to one of the 23 PRISM
 * operator-named domain buckets, or `_unclassified`. Reused by:
 *   - scripts/wiki-tribal-cross-ref-audit.mjs (U-VICTOR-A1) — per-domain coverage
 *   - .claude/hooks/wiki-tribal-coverage-inject.mjs (U-VICTOR-A2) — per-domain inject
 *   - any future per-domain wiki-tribal tooling
 *
 * Domain list (priority-ordered — most specific first; first-match wins):
 *   wedm, post-processor, sfc, accounting, file-digest, scheduling, payroll,
 *   purchasing, maintenance, alarm, mill, lathe, cad, cam, quoting,
 *   shop-floor, business, hr, erp, logistics, audit, osha, iso,
 *   troubleshoot, _unclassified
 *
 * Karpathy R7 — naming-split conflicts (wedm vs wire-edm, quoting vs quote,
 * milling vs mill) are CONSOLIDATED at the classifier layer rather than
 * forking the search recall.
 */

// Each rule: { domain, patterns: [string-substring-test] }. Substring tests are
// faster than regex and sufficient for path-based classification (no anchoring
// needed — we want any-segment match). Patterns are tried in array order; first
// match wins. ORDER MATTERS: more-specific buckets must precede less-specific.
const RULES = Object.freeze([
  // ---- naming-split / specific-first ----
  { domain: "wedm",          patterns: ["wedm", "wire-edm", "wire_edm", "wireedm"] },
  { domain: "post-processor", patterns: ["post-processor", "post-proc", "postproc", "/postp/"] },
  { domain: "sfc",           patterns: ["speed-feed", "speedfeed", "/sfc-", "-sfc-", "/sfc/", "/sfc.", "speed_feed", "sfc-quick", "sfc-", "-sfc.", "/sfc"] },
  { domain: "accounting",    patterns: ["quickbooks", "qbo", "accounting"] },
  { domain: "file-digest",   patterns: ["evernote", "file-digest", "file_digest", "doc-digest"] },
  { domain: "scheduling",    patterns: ["scheduling", "scheduler", "/schedule"] },
  { domain: "payroll",       patterns: ["payroll"] },
  { domain: "purchasing",    patterns: ["purchasing", "procurement", "purchase-order"] },
  { domain: "maintenance",   patterns: ["maintenance", "preventive-maint", "pm-task"] },
  { domain: "alarm",         patterns: ["alarm-code", "alarm_code", "/alarms/", "controller-alarm"] },
  { domain: "troubleshoot",  patterns: ["troubleshoot", "diagnostic"] },
  { domain: "osha",          patterns: ["osha", "1910.", "1910-"] },
  { domain: "iso",           patterns: ["iso-9001", "iso9001", "iso-13485", "iso-12100", "iso286", "/iso-", "iso-cert"] },
  { domain: "logistics",     patterns: ["logistics", "shipping", "receiving", "freight"] },
  // ---- dev-infra (U-VICTOR-A1-REFINE) — meta-work: learnings, pipelines, fleet-ops,
  // NOT operator-named manufacturing domains. Was polluting _unclassified with ~600+
  // entries (95% of the 692 missing-from-tribal set). Added 2026-05-27 after iter-2 audit.
  { domain: "dev-infra",     patterns: [
    "code-tribal/learnings/", "consensus/", "os/pipelines/",
    "architecture/_orphans", "architecture/tribal-corpus",
    "fleet-reaper", "fleet-task-health", "fleet-memory", "regen-viz",
    "system-viz-brain", "slot-compact-synergy", "slot-worktree",
    "knowledge-conversion", "ollama-expand", "ollama-pipeline",
    "nn-graph-ms", "juliett-12chat", "zebra-omniscient", "zebra-hermes",
    "forge-audit", "synergy-audit", "high-roi-", "wire-unwired-ms",
    "feature-gap-audit", "psn-dormancy", "psn-high-roi",
  ] },
  // ---- broader buckets ----
  // cad: blueprint/print-reading is a CAD upstream activity (added U-VICTOR-A1-REFINE)
  { domain: "mill",          patterns: ["/mill/", "milling", "/mill-", "mill-engine", "/mill.", "millingdomain", "-mill.md", "-mill/", "dispatcher-mill", "mill-pdf-corpus", "mill-video-corpus", "mill-galaxy"] },
  { domain: "lathe",         patterns: ["/lathe", "lathe-", "turning", "/turn-", "-lathe.md", "-lathe-", "dispatcher-lathe"] },
  { domain: "cad",           patterns: ["/cad/", "/cad-", "cad-fusion", "cad-engine", "cadquery", "cad.md", "-cad.md", "dispatcher-cad", "lessons/print-reading-", "blueprint-extract", "blueprint-reading"] },
  { domain: "cam",           patterns: ["/cam/", "/cam-", "mastercam", "hypermill", "fusion360-cam", "powermill", "esprit", "inventorhsm", "solidcam", "-cam.md", "dispatcher-cam"] },
  { domain: "quoting",       patterns: ["quoting", "/quote", "/quoting/"] },
  { domain: "shop-floor",    patterns: ["shop-floor", "shopfloor", "shop_floor", "machinelive", "traveler"] },
  { domain: "business",      patterns: ["/business/", "business-", "biz-"] },
  { domain: "hr",            patterns: ["/hr/", "/hr-", "human-resource", "employee-"] },
  { domain: "erp",           patterns: ["/erp/", "/erp-", "/e2/", "/e2-", "e2-erp", "erp-sync", "-erp.md", "-erp-", "dispatcher-erp"] },
  { domain: "audit",         patterns: ["/audit", "compliance-audit"] },
]);

/**
 * Pure: classify a path. Returns one of the 23 domain slugs or "_unclassified".
 * Input expected normalized (lowercase, posix sep). Pass raw input through
 * the normalizer in the caller if unsure.
 *
 * Empty/null/non-string input → "_unclassified" (silent — caller decides).
 */
export function classifyDomain(normalizedPath) {
  const s = typeof normalizedPath === "string" ? normalizedPath : "";
  if (!s) return "_unclassified";
  for (const { domain, patterns } of RULES) {
    for (const pat of patterns) {
      if (s.includes(pat)) return domain;
    }
  }
  return "_unclassified";
}

/**
 * Pure: returns the canonical list of all domain slugs (in priority order).
 * Useful for consumers that need to iterate buckets (per-domain audit,
 * per-domain inject summarizer). Includes "_unclassified".
 */
export function domainSlugs() {
  return [...RULES.map((r) => r.domain), "_unclassified"];
}

/**
 * Pure: classify an array of paths and return `{<domain>: count}`. Useful as
 * a quick distribution-check during audit. Domains with 0 count are included
 * (returns the full slug set every time for byte-deterministic comparison).
 */
export function classifyAll(paths) {
  const dist = Object.create(null);
  for (const d of domainSlugs()) dist[d] = 0;
  if (!Array.isArray(paths)) return dist;
  for (const p of paths) {
    const d = classifyDomain(p);
    dist[d] = (dist[d] || 0) + 1;
  }
  return dist;
}
