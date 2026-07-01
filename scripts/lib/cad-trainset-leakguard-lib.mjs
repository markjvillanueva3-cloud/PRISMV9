#!/usr/bin/env node
/**
 * cad-trainset-leakguard-lib.mjs -- DELTA-CAD-COMPLETION / U-DELTA-TRAINSET-LEAKGUARD.
 *
 * THE GAP this closes: blueprint-trainset-curate-lib.mjs (xray) curates the supervised
 * trainset by LABEL QUALITY (match_confidence: keep exact/loose, drop garbage/ambiguous
 * poison labels) -- but it is blind to TRAIN/TEST LEAK. A part frozen into an eval holdout
 * (e.g. state/shared/cad-holdout/geom-50.json) can flow straight into the curated trainset,
 * silently inflating every downstream accuracy number (the model is graded on a part that
 * was in its own training data). This is the enforcement point the holdout subsystem
 * (cad-holdout-guard.mjs + prism_cad:cad_holdout_check, shipped 2026-06-27) exists to protect.
 *
 * CROSS-MODALITY by design: a holdout entry is keyed by a CAD-file abs_path (geom-50 holds
 * B-Rep parts: blisk.stp, impeller.stp, ...), while a trainset record is a print->answer-key
 * pair keyed by part_number + cad_files[]/program_files[]/print_docs[]. A leak is therefore a
 * match on ANY of: (1) a normalized file PATH the record references, (2) the basename STEM of
 * such a path (blisk.stp -> "blisk"), or (3) a part IDENTITY token (part_number_normalized,
 * drawing, ...). The path/stem arms catch a held B-Rep file referenced in cad_files[]; the id
 * arm catches a future part-number-keyed holdout split (an OCR/print eval split is a noted
 * follow-up) -- so the SAME guard enforces every modality (R15 general asset).
 *
 * SAFETY BIAS (load-bearing, OPPOSITE of the page-classifier's): here a false-EXCLUDE merely
 * drops one trainable pair (mildly wasteful, recoverable), while a false-KEEP corrupts the
 * eval set (a real leak inflates accuracy). So on an ambiguous identity match we lean toward
 * EXCLUDING. The identity arm only ever matches against the SMALL holdout id set, so the
 * over-exclusion is bounded by the holdout size -- it can never nuke the trainset.
 *
 * MEASURED on LIVE data (R12/R15, 2026-06-27): run against the frozen geom-50.json (50 held
 * parts) + blueprint-training-pairs.jsonl (76,205 records), the guard EXCLUDES 13 real
 * train/test leaks (by_via path:4, stem:9, id:0). geom-50 is NOT all generic reference parts --
 * it includes JM die/tool parts (T-5UP-280-113161, 3888LFHEAD broach insert, PD1083,
 * H4Y5A1000, H4Y5A0750, 532-43210-05850-00-REV-0, .3125 HI-PRO CUTTER, PD1120, 3HD-111364,
 * 12345) that appear in BOTH the holdout and training cad_files[]. All 13 are genuine same-part
 * overlaps (verified by inspection) that would have inflated every CAD-model accuracy number
 * had they trained. The count is EXACT for the CURRENT frozen split + pairs file; it moves if
 * either is regenerated -- re-measure, never assume (see the live-data test below).
 *
 * GENERIC-STEM caveat (bounded, SAFE direction -- deliberate non-filtering): geom-50 also
 * carries a few low-specificity stems (cnc, part1, testbox, demo1, ...). The stem arm could in
 * principle false-EXCLUDE an unrelated part sharing such a basename -- but that is the SAFE
 * failure (drops one pair, never corrupts the eval), it is bounded by the holdout size, and on
 * the live data it caused ZERO spurious drops (every stem hit is a genuine same-part overlap).
 * We deliberately do NOT filter generic stems: any such filter would convert a guaranteed-safe
 * false-EXCLUDE into a possible false-KEEP (the DANGEROUS direction -- e.g. it would let the
 * real part-12345 leak through). A holdout-freezer should avoid generic stems; the runner logs
 * by_via so stem-only exclusions stay auditable.
 *
 * PURE: no fs, no fetch (loadHoldout in cad-holdout-guard.mjs does the I/O; the runner passes
 * the loaded entries in). Composes cad-holdout-guard.mjs normalizePath/itemPath (single source).
 */
import { normalizePath, itemPath } from "./cad-holdout-guard.mjs";

/** Lowercased basename minus the final extension, from a normalized path. "a/B/Blisk.STP" -> "blisk". */
export function pathStem(p) {
  const norm = normalizePath(p);
  if (!norm) return "";
  const base = norm.slice(norm.lastIndexOf("/") + 1);
  return base.replace(/\.[^.]+$/, "");
}

/**
 * Normalize an identity token (part number, drawing id, stem) to a compact comparable form:
 * lowercase + strip whitespace/separators. "10-010-150-2" -> "100101502", "blisk" -> "blisk".
 * Compaction lets "10_010_150_2" match "10-010-150-2" (same part, different separator). Returns ""
 * for non-strings or tokens that compact to empty.
 */
export function normIdentity(s) {
  if (typeof s !== "string") return "";
  return s.trim().toLowerCase().replace(/[\s._\-/\\]+/g, "");
}

/** Collect every file-path-ish string a trainset record references (cad/program/print + flat shapes). */
export function recordPaths(rec) {
  const out = [];
  if (!rec || typeof rec !== "object") return out;
  const pushArr = (arr, fields) => {
    if (!Array.isArray(arr)) return;
    for (const it of arr) {
      if (typeof it === "string") { if (it.trim()) out.push(it); }
      else if (it && typeof it === "object") {
        for (const f of fields) if (typeof it[f] === "string" && it[f].trim()) out.push(it[f]);
      }
    }
  };
  // source_path is carried by ~17K corpus entries (fwd-compat: 0 silent-miss today, but a future
  // miner could reference a held file ONLY via source_path -- the dangerous false-KEEP direction).
  const PATH_FIELDS = ["path", "abs_path", "source_path", "filename", "file"];
  pushArr(rec.cad_files, PATH_FIELDS);
  pushArr(rec.program_files, PATH_FIELDS);
  pushArr(rec.print_docs, PATH_FIELDS);
  // forward-compat single-path record shapes (other miners emit flat records)
  for (const f of ["pdf_path", "abs_path", "source_path", "path", "print", "drawing_file", "cad_file"]) {
    if (typeof rec[f] === "string" && rec[f].trim()) out.push(rec[f]);
  }
  return out;
}

/** Collect part-identity tokens a record carries (normalized): explicit ids + every referenced path stem. */
export function recordIdentities(rec) {
  const ids = new Set();
  if (!rec || typeof rec !== "object") return ids;
  for (const f of ["part_number_normalized", "part_number", "part", "drawing", "drawing_number", "part_id"]) {
    const v = normIdentity(rec[f]);
    if (v) ids.add(v);
  }
  for (const p of recordPaths(rec)) {
    const st = normIdentity(pathStem(p));
    if (st) ids.add(st);
  }
  return ids;
}

/**
 * Build a fast leak-lookup index from holdout entries -- the array under a manifest's `held`
 * (or any array of {abs_path|path, part_class, part_number?, ...} objects, or bare path strings).
 * @returns {{paths:Set<string>, stems:Set<string>, ids:Set<string>, size:number}}
 */
export function buildHoldoutGuardIndex(holdoutEntries, pathKey = "abs_path") {
  const paths = new Set(); // normalized full paths
  const stems = new Set(); // normalized basename stems
  const ids = new Set();   // normalized identity tokens (stems + explicit part numbers)
  const list = Array.isArray(holdoutEntries) ? holdoutEntries : [];
  for (const e of list) {
    const p = typeof e === "string" ? e : itemPath(e, pathKey);
    if (p) {
      const np = normalizePath(p);
      if (np) paths.add(np);
      const st = normIdentity(pathStem(p));
      if (st) { stems.add(st); ids.add(st); }
    }
    if (e && typeof e === "object") {
      for (const f of ["part_number_normalized", "part_number", "part", "drawing", "drawing_number"]) {
        const v = normIdentity(e[f]);
        if (v) ids.add(v);
      }
    }
  }
  return { paths, stems, ids, size: list.length };
}

/**
 * Union N holdout guard indexes into one, so a trainset can be proven disjoint from the UNION of all
 * eval splits at once (e.g. geom-50 + ocr-150 -- training that excludes only one split leaks the other).
 * Pure; Set-union dedups overlapping paths/stems/ids. `size` SUMS the input sizes (advisory only -- it may
 * double-count a part that appears in two splits; the deduped Sets are the authoritative match surface).
 * @param {{paths:Set,stems:Set,ids:Set,size:number}[]} indexes
 * @returns {{paths:Set<string>, stems:Set<string>, ids:Set<string>, size:number}}
 */
export function mergeHoldoutGuardIndexes(indexes) {
  const paths = new Set();
  const stems = new Set();
  const ids = new Set();
  let size = 0;
  if (Array.isArray(indexes)) {
    for (const idx of indexes) {
      if (!idx || typeof idx !== "object") continue;
      if (idx.paths) for (const p of idx.paths) paths.add(p);
      if (idx.stems) for (const s of idx.stems) stems.add(s);
      if (idx.ids) for (const i of idx.ids) ids.add(i);
      size += Number(idx.size) || 0;
    }
  }
  return { paths, stems, ids, size };
}

/**
 * Does a single trainset record leak against the holdout index?
 * @returns {{leaked:boolean, via:("path"|"stem"|"id"|null), matched:string}}
 */
export function recordLeak(rec, index) {
  if (!index) return { leaked: false, via: null, matched: "" };
  // arm 1: full normalized path match (strongest signal)
  for (const p of recordPaths(rec)) {
    const np = normalizePath(p);
    if (np && index.paths.has(np)) return { leaked: true, via: "path", matched: np };
  }
  // arms 2 + 3: basename stem / part identity match
  for (const id of recordIdentities(rec)) {
    if (index.stems.has(id)) return { leaked: true, via: "stem", matched: id };
    if (index.ids.has(id)) return { leaked: true, via: "id", matched: id };
  }
  return { leaked: false, via: null, matched: "" };
}

/** Fresh leak-stats accumulator. */
export function newLeakStats() {
  return { total: 0, kept: 0, held_out_excluded: 0, by_via: { path: 0, stem: 0, id: 0 } };
}

/**
 * Pure fold: partition records into kept vs held-out-excluded against the holdout index.
 * @returns {{kept:object[], excluded:{rec:object,via:string,matched:string}[], stats:object}}
 */
export function filterLeakSafe(records, index) {
  const stats = newLeakStats();
  const kept = [];
  const excluded = [];
  if (!Array.isArray(records)) return { kept, excluded, stats };
  for (const rec of records) {
    stats.total++;
    const v = recordLeak(rec, index);
    if (v.leaked) {
      stats.held_out_excluded++;
      stats.by_via[v.via] = (stats.by_via[v.via] || 0) + 1;
      excluded.push({ rec, via: v.via, matched: v.matched });
    } else {
      stats.kept++;
      kept.push(rec);
    }
  }
  return { kept, excluded, stats };
}

/**
 * R12 fail-loud invariant: THROW if any kept record leaks against the holdout (the belt to the
 * filter's suspenders -- proves the emitted trainset is disjoint from the eval split). Pass
 * {throwOnLeak:false} to get the leak list back instead of throwing.
 * @returns {{index:number, via:string, matched:string}[]} leaks (empty when clean)
 */
export function assertTrainsetNoLeak(keptRecords, index, opts = {}) {
  const { throwOnLeak = true, maxList = 20 } = opts;
  const leaks = [];
  if (Array.isArray(keptRecords)) {
    for (let i = 0; i < keptRecords.length; i++) {
      const v = recordLeak(keptRecords[i], index);
      if (v.leaked) leaks.push({ index: i, via: v.via, matched: v.matched });
    }
  }
  if (leaks.length && throwOnLeak) {
    const sample = leaks.slice(0, maxList).map((l) => `#${l.index} via ${l.via}: ${l.matched}`).join("; ");
    throw new Error(`TRAINSET LEAK: ${leaks.length} kept record(s) are in the eval holdout -- ${sample}`);
  }
  return leaks;
}
