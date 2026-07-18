/**
 * cad-correction-to-fix-ledger.mjs -- pure converter: delta's LIVE CAD correction-loop ledger
 * (cad-fusion-correction-loop-live.mjs output) -> cad-fix-training-ledger rows
 * (U-CAD-CAPTURE-LOOP, slot:india 2026-06-11). This is the CAPTURE stage that CLOSES + COMPOUNDS
 * delta's CAD closed loop.
 *
 * THE GAP THIS CLOSES: the loop MEASURES (before/after scorePct), CORRECTS (cycle.corrections[].op),
 * and PERSISTS the result to a per-run ledger -- but NOTHING harvested those ledgers into the
 * training corpus. The 80 rows in cad-fix-training-ledger.jsonl were a one-time 2026-05-19 batch;
 * the ledger had ZERO live writers, so the corpus was frozen and the loop could not self-improve.
 * This harvests each correction cycle's `before.missing` features into fix-ledger rows, so every
 * print delta runs through the loop GROWS the CAD-gen training corpus.
 *
 * RICHER SIGNAL than the GT-batch rows: a correction-loop row carries the FIX OPERATION
 * (cycle.corrections[].op -- e.g. chamfer-edge 1mm, radial-hole 1.5mm) and whether the fix achieved
 * a match (cycle.after.matched). So the training pair teaches not just "feature X was missing" but
 * "X was missing -> add it via op Y -> that achieved a <verdict>". Distinct `source` (the correction
 * ledger) keeps these additive to, not colliding with, the GT-batch rows.
 *
 * GROUNDED (R12): the ledger shape is the REAL artifact (state/shared/cad-correction-loop-live-ledger.json):
 *   { ts, part, docPrefix, sourceFile, cycle: { ok, before:{verdict,scorePct,missing[],matched[]},
 *     after:{verdict,scorePct,matched[],missing[]}, corrections:[{kind,buildable,op,expectGeometry,reason}] } }
 * Pure -> no fs/process/Date.now (the row ts defaults to the ledger's own cycle ts -> deterministic).
 */

/** The canonical fix-ledger row shape a CAD-generator-training correction takes. */
function fixRow({ ts, part, field, source, note, cycleId }) {
  return {
    v: "1.0.0",
    ts,
    domain: "cad",
    kind: "missing-feature",
    part,
    field,
    wrong: "absent",
    right: "present",
    source,
    note,
    cycleId: cycleId || null,
    trainsPrintReader: false,
    trainsCadGen: true,
    trainsCam: false,
  };
}

/** Describe a correction op compactly for the row note (e.g. "chamfer-edge 1mm" / "radial-hole r1.5mm"). */
function describeOp(op) {
  if (!op || typeof op !== "object") return null;
  const kind = typeof op.kind === "string" ? op.kind : "op";
  const parts = [];
  if (Number.isFinite(Number(op.distanceMm))) parts.push(`${Number(op.distanceMm)}mm`);
  if (Number.isFinite(Number(op.radiusMm))) parts.push(`r${Number(op.radiusMm)}mm`);
  if (typeof op.axis === "string" && op.axis) parts.push(op.axis);
  if (Number.isFinite(Number(op.edgeCount))) parts.push(`x${Number(op.edgeCount)}`);
  return parts.length ? `${kind} (${parts.join(", ")})` : kind;
}

/**
 * Convert one correction-loop ledger -> fix-ledger rows (one per `cycle.before.missing` feature).
 * Returns [] when the ledger lacks a part or a before.missing list. `opts.source` overrides the
 * row source label (default: the ledger's sourceFile, else "cad-correction-loop").
 */
export function correctionLedgerToFixRows(ledger, opts = {}) {
  if (!ledger || typeof ledger !== "object") return [];
  const part = typeof ledger.part === "string" && ledger.part.trim() ? ledger.part.trim() : null;
  if (!part) return [];
  const cyc = ledger.cycle;
  if (!cyc || typeof cyc !== "object") return [];
  const missing = Array.isArray(cyc.before && cyc.before.missing) ? cyc.before.missing : [];
  if (missing.length === 0) return [];

  const ts = typeof ledger.ts === "string" && ledger.ts ? ledger.ts : (opts.ts || "1970-01-01T00:00:00.000Z");
  const source = opts.source || (typeof ledger.sourceFile === "string" && ledger.sourceFile ? ledger.sourceFile : "cad-correction-loop");
  const corrections = Array.isArray(cyc.corrections) ? cyc.corrections : [];
  const afterMatched = new Set(Array.isArray(cyc.after && cyc.after.matched) ? cyc.after.matched : []);
  const afterVerdict = cyc.after && typeof cyc.after.verdict === "string" ? cyc.after.verdict : "unknown";
  const afterScore = cyc.after && Number.isFinite(Number(cyc.after.scorePct)) ? Number(cyc.after.scorePct) : null;

  const rows = [];
  for (const field of missing) {
    if (typeof field !== "string" || !field.trim()) continue;
    const f = field.trim();
    const corr = corrections.find((c) => c && c.kind === f);
    const opDesc = corr ? describeOp(corr.op) : null;
    const fixed = afterMatched.has(f);
    const fixClause = opDesc
      ? `fix = ${opDesc}`
      : (corr && corr.buildable === false ? `fix = not buildable${corr.reason ? ` (${corr.reason})` : ""}` : "fix = (none recorded)");
    const outcome = fixed
      ? `after-cycle achieved match${afterScore != null ? ` (score ${afterScore}%)` : ""}`
      : `still missing after cycle${afterScore != null ? ` (score ${afterScore}%)` : ""}`;
    rows.push(fixRow({
      ts,
      part,
      field: f,
      source,
      cycleId: ledger.docPrefix,
      note: `closed-loop correction: regenerated "${part}" CAD was missing required feature "${f}"; ${fixClause}; verdict=${afterVerdict}, ${outcome}.`,
    }));
  }
  return rows;
}

/** Stable dedup key for a fix-ledger row (part + field + kind + source), pipe-joined. */
export function fixRowKey(row) {
  return [row.part, row.field, row.kind, row.source].join("|");
}

/**
 * Given new rows + the set of already-present keys, return only the rows whose key is novel
 * (first-seen wins within `newRows` too). Pure -> the writer injects the existing-key set.
 */
export function dedupAgainst(newRows, existingKeys) {
  const seen = new Set(existingKeys || []);
  const out = [];
  for (const r of Array.isArray(newRows) ? newRows : []) {
    const k = fixRowKey(r);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(r);
  }
  return out;
}
