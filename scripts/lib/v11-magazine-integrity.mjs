/**
 * v11-magazine-integrity.mjs — pure pre-emit magazine integrity checks
 * for the Hurco v11 post. Refuses emission when any of the four bug
 * classes is detected:
 *
 *   1. wrong_pocket        — tool descriptor T# disagrees with physical
 *                            magazine_position in the pocket-DB
 *   2. offset_drift        — Fusion-supplied H/D offset differs from
 *                            the magazine integrity engine's tracked
 *                            offsets by more than offsetToleranceMm
 *   3. missing_tool        — descriptor T# has no entry in the
 *                            pocket-DB (operator forgot to register)
 *   4. insufficient_life   — life_fraction < threshold AND no
 *                            sister_pocket present
 *
 * Pure functions only. Caller wraps in the post-emit decision pipeline.
 *
 * @milestone POST-BRIDGE-SYNERGY-MS0/U-V11-MAGAZINE-INTEGRITY-GATE
 * @slot echo · @iter 24 · @date 2026-05-26
 */

export const DEFAULT_OFFSET_TOLERANCE_MM = 0.005;
export const DEFAULT_LIFE_THRESHOLD = 0.15;

/** Pure: classify a single tool descriptor (from CAM) against the pocket-DB. */
export function checkToolDescriptor(descriptor, pocketDb, options = {}) {
  const offsetTol = Number.isFinite(Number(options.offsetToleranceMm))
    ? Number(options.offsetToleranceMm)
    : DEFAULT_OFFSET_TOLERANCE_MM;
  const lifeMin = Number.isFinite(Number(options.lifeThreshold))
    ? Number(options.lifeThreshold)
    : DEFAULT_LIFE_THRESHOLD;
  const violations = [];
  if (descriptor == null || typeof descriptor !== "object") {
    return { tool_number: null, ok: false, violations: [{ kind: "bad_descriptor", detail: "null or non-object descriptor" }] };
  }
  const tNum = Number(descriptor.tool_number);
  if (!Number.isFinite(tNum) || tNum <= 0) {
    return { tool_number: descriptor.tool_number, ok: false, violations: [{ kind: "bad_descriptor", detail: "missing tool_number" }] };
  }
  const key = "T" + tNum;
  const pocketRec = pocketDb && pocketDb[key] ? pocketDb[key] : null;
  if (pocketRec == null) {
    violations.push({ kind: "missing_tool", detail: `T${tNum} not in pocket-DB; operator must register or run scripts/generate-v11-pocket-db.mjs` });
    return { tool_number: tNum, ok: false, violations };
  }
  if (Number.isFinite(Number(descriptor.declared_pocket))) {
    const declared = Math.floor(Number(descriptor.declared_pocket));
    if (declared !== pocketRec.pocket) {
      violations.push({ kind: "wrong_pocket", detail: `T${tNum} CAM declared pocket ${declared} but PRISM has pocket ${pocketRec.pocket}` });
    }
  }
  if (Number.isFinite(Number(descriptor.declared_h_offset_mm))) {
    const declaredH = Number(descriptor.declared_h_offset_mm);
    const trackedH = Number(pocketRec.h_offset_mm);
    if (Number.isFinite(trackedH) && Math.abs(declaredH - trackedH) > offsetTol) {
      violations.push({ kind: "offset_drift", detail: `T${tNum} H-offset declared ${declaredH.toFixed(4)} mm vs tracked ${trackedH.toFixed(4)} mm (Δ ${(declaredH - trackedH).toFixed(4)} > ±${offsetTol})` });
    }
  }
  if (Number.isFinite(Number(descriptor.declared_d_offset_mm))) {
    const declaredD = Number(descriptor.declared_d_offset_mm);
    const trackedD = Number(pocketRec.d_offset_mm);
    if (Number.isFinite(trackedD) && Math.abs(declaredD - trackedD) > offsetTol) {
      violations.push({ kind: "offset_drift", detail: `T${tNum} D-offset declared ${declaredD.toFixed(4)} mm vs tracked ${trackedD.toFixed(4)} mm (Δ ${(declaredD - trackedD).toFixed(4)} > ±${offsetTol})` });
    }
  }
  const lf = Number(pocketRec.life_fraction);
  if (Number.isFinite(lf) && lf < lifeMin && (pocketRec.sister_pocket == null || pocketRec.sister_pocket === undefined)) {
    violations.push({ kind: "insufficient_life", detail: `T${tNum} life_fraction=${lf.toFixed(2)} < threshold ${lifeMin} AND no sister_pocket — sister-tool must be registered before emit` });
  }
  return { tool_number: tNum, ok: violations.length === 0, violations };
}

/** Pure: batch check across a list of tool descriptors; aggregate report. */
export function checkAllTools(descriptors, pocketDb, options = {}) {
  const results = [];
  const violationCounts = { wrong_pocket: 0, offset_drift: 0, missing_tool: 0, insufficient_life: 0, bad_descriptor: 0 };
  for (const d of descriptors || []) {
    const r = checkToolDescriptor(d, pocketDb, options);
    results.push(r);
    for (const v of r.violations || []) {
      if (violationCounts[v.kind] !== undefined) violationCounts[v.kind]++;
    }
  }
  const okCount = results.filter((r) => r.ok).length;
  return {
    results,
    summary: {
      total: results.length,
      ok: okCount,
      failed: results.length - okCount,
      violationCounts,
    },
  };
}

/** Pure: emit gate decision — true=allow emit, false=block. Optional permissive mode lets operator override. */
export function shouldAllowEmit(report, options = {}) {
  if (report == null || report.summary == null) return false;
  if (options.permissive === true) return true;
  const ignored = new Set(Array.isArray(options.ignore) ? options.ignore : []);
  for (const r of report.results || []) {
    for (const v of r.violations || []) {
      if (!ignored.has(v.kind)) return false;
    }
  }
  return true;
}

/** Pure: human-readable summary for operator (.cps comment block format). */
export function renderReportComment(report) {
  if (report == null || report.summary == null) {
    return "(PRISM: magazine-integrity report unavailable)";
  }
  const s = report.summary;
  const lines = [];
  lines.push("(===== PRISM MAGAZINE INTEGRITY GATE =====)");
  lines.push(`(  tools=${s.total}  ok=${s.ok}  failed=${s.failed})`);
  if (s.failed > 0) {
    const c = s.violationCounts;
    lines.push(`(  violations: wrong_pocket=${c.wrong_pocket} offset_drift=${c.offset_drift} missing_tool=${c.missing_tool} insufficient_life=${c.insufficient_life})`);
    for (const r of report.results) {
      if (r.ok) continue;
      for (const v of r.violations || []) {
        lines.push(`(  T${r.tool_number || "?"}: ${v.kind} — ${v.detail})`);
      }
    }
  } else {
    lines.push("(  all tools verified — emit allowed)");
  }
  lines.push("(=========================================)");
  return lines.join("\n");
}
