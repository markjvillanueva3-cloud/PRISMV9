#!/usr/bin/env node
/**
 * build-audit-registry.mjs — SYSTEM-AUDIT-AWARENESS/U-AUDIT-REG (slot:papa 2026-05-26)
 *
 * Builds a unified manifest of every audit asset in the repo so the audit-awareness
 * UserPromptSubmit hook can surface "relevant audits for this domain" to any chat.
 *
 * SCANS:
 *   scripts/audit-*.mjs                      (audit generators)
 *   state/shared/*audit*.json/.md            (audit sidecars + reports)
 *   state/shared/.audit-*.json               (dot-prefixed sidecars)
 *   state/shared/audit/                      (sub-dir audit reports)
 *   state/shared/audit-findings/             (per-finding files)
 *   state/shared/flagship-deep-audits/       (legacy deep audits)
 *
 * EMITS: state/shared/AUDIT-REGISTRY.json with shape:
 *   {
 *     schemaVersion: "1.0.0",
 *     generatedAt: <iso>,
 *     staleHrsThreshold: 48,
 *     totals: { audits, byStaleness:{fresh,warn,stale}, byDomain:{...} },
 *     audits: [ { id, scriptPath?, sidecars[], domain, lastRunIso?, ageHrs?, staleness, scope } ]
 *   }
 *
 * Domain inference: name-based (e.g. audit-mill-* → "mill"; audit-hook-* → "hook").
 * Default: "other". Multi-domain support via tags[] when name carries two domains.
 *
 * Staleness:
 *   ageHrs <= 24 → "fresh"
 *   24 < ageHrs <= 48 → "warn"   (approaching 2-day threshold)
 *   ageHrs > 48 OR no sidecar → "stale"
 *
 * Atomic write: temp + rename.
 *
 * Knobs:
 *   PRISM_AUDIT_REG_STALE_HRS=48   threshold (default 48)
 *   PRISM_AUDIT_REG_OUTPUT=<path>  override output path
 */

import { readdirSync, statSync, writeFileSync, renameSync, existsSync, mkdirSync } from "node:fs";
import { join, basename, resolve } from "node:path";

const REPO = resolve("H:/prism");
const STALE_HRS = Number.parseInt(process.env.PRISM_AUDIT_REG_STALE_HRS || "48", 10);
const OUT_PATH = process.env.PRISM_AUDIT_REG_OUTPUT || join(REPO, "state", "shared", "AUDIT-REGISTRY.json");
const NOW = Date.now();

// Domain inference — first match wins
const DOMAIN_PATTERNS = [
  [/\bmill\b/i, "mill"],
  [/\blathe\b/i, "lathe"],
  [/\bwedm\b|wire[-_]edm/i, "wedm"],
  [/\bgrinder\b|sinker/i, "edm"],
  [/\bcad\b/i, "cad"],
  [/\bcam\b/i, "cam"],
  [/\bpost[-_]processor|\bpost\b/i, "post"],
  [/\bhook\b/i, "hook"],
  [/\bscheduled[-_]task|cron/i, "scheduled-task"],
  [/\bwiki\b/i, "wiki"],
  [/\bmemory|memories/i, "memory"],
  [/\btribal\b/i, "tribal"],
  [/\bdocker\b/i, "docker"],
  [/\broadmap\b|milestone/i, "roadmap"],
  [/\bworktree\b/i, "worktree"],
  [/\bmonolith|extract/i, "monolith"],
  [/\borphan|unwired/i, "orphan"],
  [/\bcoverage\b/i, "coverage"],
  [/\bdrift\b/i, "drift"],
  [/\bjm[-_]die|die[-_]corpus/i, "jm-die"],
  [/\bclose[-_]out\b/i, "close-out"],
  [/\bresource\b/i, "resource"],
  [/\bnudge|token[-_]savings/i, "token-savings"],
  [/\bprint[-_]to[-_]cnc|pipeline/i, "pipeline"],
  [/\bpsn\b/i, "psn"],
  [/\bagi\b|ai\b/i, "ai"],
  [/\bsystem[-_]viz/i, "system-viz"],
];

function inferDomain(name) {
  for (const [re, d] of DOMAIN_PATTERNS) {
    if (re.test(name)) return d;
  }
  return "other";
}

function safeStat(p) {
  try { return statSync(p); } catch { return null; }
}

function listSafe(dir) {
  try { return readdirSync(dir, { withFileTypes: true }); } catch { return []; }
}

function ageHrs(mtimeMs) {
  return Math.max(0, (NOW - mtimeMs) / 36e5);
}

function stalenessOf(ageHr) {
  if (ageHr == null) return "stale";
  if (ageHr <= 24) return "fresh";
  if (ageHr <= STALE_HRS) return "warn";
  return "stale";
}

function scriptIdFromPath(p) {
  return basename(p).replace(/\.(mjs|test\.mjs|js|cjs|py)$/i, "");
}

function isAuditScript(name) {
  return /^audit-/.test(name) && /\.(mjs|js|cjs|py)$/.test(name) && !/\.test\.mjs$/.test(name);
}

function isAuditSidecar(name) {
  // *.audit*.json | .audit-*.json | *-audit*.json | AUDIT-*.{json,md}
  return /(audit|drift|coverage)[-_]?[a-z0-9]*\.(json|md)$/i.test(name) || /^\.?audit[-_]/.test(name) || /^AUDIT[-_]/.test(name);
}

function collectScripts() {
  const out = [];
  const scriptsDir = join(REPO, "scripts");
  for (const ent of listSafe(scriptsDir)) {
    if (ent.isFile() && isAuditScript(ent.name)) {
      const p = join(scriptsDir, ent.name);
      const st = safeStat(p);
      out.push({
        id: scriptIdFromPath(p),
        scriptPath: p.replaceAll("\\", "/"),
        domain: inferDomain(ent.name),
        scriptMtimeIso: st ? new Date(st.mtimeMs).toISOString() : null,
      });
    }
  }
  return out;
}

function collectSidecars() {
  const out = [];
  const stateDir = join(REPO, "state", "shared");
  // Top-level files
  for (const ent of listSafe(stateDir)) {
    if (!ent.isFile()) continue;
    if (!isAuditSidecar(ent.name)) continue;
    const p = join(stateDir, ent.name);
    const st = safeStat(p);
    if (!st) continue;
    out.push({
      sidecarPath: p.replaceAll("\\", "/"),
      base: basename(ent.name),
      domain: inferDomain(ent.name),
      lastRunIso: new Date(st.mtimeMs).toISOString(),
      ageHrs: ageHrs(st.mtimeMs),
      sizeBytes: st.size,
    });
  }
  // Sub-dirs: audit/, audit-findings/, audits/, flagship-deep-audits/
  for (const sub of ["audit", "audit-findings", "audits", "flagship-deep-audits"]) {
    const subDir = join(stateDir, sub);
    if (!safeStat(subDir)) continue;
    for (const ent of listSafe(subDir)) {
      if (!ent.isFile()) continue;
      if (!/\.(json|md)$/i.test(ent.name)) continue;
      const p = join(subDir, ent.name);
      const st = safeStat(p);
      if (!st) continue;
      out.push({
        sidecarPath: p.replaceAll("\\", "/"),
        base: basename(ent.name),
        domain: inferDomain(ent.name),
        lastRunIso: new Date(st.mtimeMs).toISOString(),
        ageHrs: ageHrs(st.mtimeMs),
        sizeBytes: st.size,
        sub,
      });
    }
  }
  return out;
}

function pairScriptsToSidecars(scripts, sidecars) {
  const audits = [];
  const usedSidecars = new Set();

  for (const s of scripts) {
    // Find sidecars whose base name shares the script's distinguishing token
    const scriptKey = s.id.replace(/^audit-/, "").toLowerCase();
    const matched = sidecars.filter((sc) => {
      const k = sc.base.toLowerCase();
      return k.includes(scriptKey) || scriptKey.includes(k.replace(/\.(json|md)$/i, ""));
    });
    for (const m of matched) usedSidecars.add(m.sidecarPath);
    const latestMtime = matched.length ? Math.max(...matched.map((m) => Date.parse(m.lastRunIso))) : null;
    const ah = latestMtime ? ageHrs(latestMtime) : null;
    audits.push({
      id: s.id,
      domain: s.domain,
      scriptPath: s.scriptPath,
      sidecars: matched.map((m) => ({ path: m.sidecarPath, sub: m.sub, ageHrs: m.ageHrs, sizeBytes: m.sizeBytes })),
      lastRunIso: latestMtime ? new Date(latestMtime).toISOString() : null,
      ageHrs: ah,
      staleness: stalenessOf(ah),
      scriptMtimeIso: s.scriptMtimeIso,
    });
  }

  // Orphan sidecars (no matching script — legacy reports)
  for (const sc of sidecars) {
    if (usedSidecars.has(sc.sidecarPath)) continue;
    audits.push({
      id: `sidecar:${basename(sc.sidecarPath).replace(/\.(json|md)$/i, "")}`,
      domain: sc.domain,
      scriptPath: null,
      sidecars: [{ path: sc.sidecarPath, sub: sc.sub, ageHrs: sc.ageHrs, sizeBytes: sc.sizeBytes }],
      lastRunIso: sc.lastRunIso,
      ageHrs: sc.ageHrs,
      staleness: stalenessOf(sc.ageHrs),
      scriptMtimeIso: null,
      orphanSidecar: true,
    });
  }

  // Sort: stale + has-script-and-sidecar first, then by ageHrs descending
  audits.sort((a, b) => {
    const ka = a.staleness === "stale" ? 0 : a.staleness === "warn" ? 1 : 2;
    const kb = b.staleness === "stale" ? 0 : b.staleness === "warn" ? 1 : 2;
    if (ka !== kb) return ka - kb;
    return (b.ageHrs ?? 0) - (a.ageHrs ?? 0);
  });

  return audits;
}

function summarize(audits) {
  const byStaleness = { fresh: 0, warn: 0, stale: 0 };
  const byDomain = {};
  for (const a of audits) {
    byStaleness[a.staleness] = (byStaleness[a.staleness] || 0) + 1;
    byDomain[a.domain] = (byDomain[a.domain] || 0) + 1;
  }
  return { audits: audits.length, byStaleness, byDomain };
}

function atomicWriteJson(p, obj) {
  if (!existsSync(join(p, ".."))) mkdirSync(join(p, ".."), { recursive: true });
  const tmp = `${p}.tmp.${process.pid}.${Date.now()}`;
  writeFileSync(tmp, JSON.stringify(obj, null, 2), "utf8");
  renameSync(tmp, p);
}

function main() {
  const scripts = collectScripts();
  const sidecars = collectSidecars();
  const audits = pairScriptsToSidecars(scripts, sidecars);
  const totals = summarize(audits);
  const payload = {
    schemaVersion: "1.0.0",
    generatedAt: new Date(NOW).toISOString(),
    staleHrsThreshold: STALE_HRS,
    totals,
    audits,
  };
  atomicWriteJson(OUT_PATH, payload);
  // Concise stderr summary
  process.stderr.write(
    `[audit-registry] audits=${totals.audits} fresh=${totals.byStaleness.fresh} warn=${totals.byStaleness.warn} stale=${totals.byStaleness.stale} domains=${Object.keys(totals.byDomain).length} -> ${OUT_PATH}\n`,
  );
}

main();
