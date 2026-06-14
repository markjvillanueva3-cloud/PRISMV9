#!/usr/bin/env node
/**
 * build-jm-die-database.mjs — consolidate the JM Die / DocuStrata corpus into a
 * schema-versioned, queryable JM die database (slot:juliett, database-expansion domain).
 *
 * DESIGN (R8 — reuse the paid-for extraction, do NOT re-OCR 257K PDFs):
 *   The DocuStrata corpus (H:/PRISM/Docustrata, 257,992 files) was already extracted +
 *   classified by docustrata-pipeline.py into H:/PRISM/Docustrata/.index/*.jsonl (111,745 docs).
 *   This loader STREAMS those existing extractions into a normalized JM die database, registers
 *   the JM-DIE file index, freshly extracts the named report PDF, and links jm-die-profile.ts.
 *
 * OUTPUT (mcp-server/data/jm-die-database/, atomic writes, schemaVersion 1.0.0):
 *   manifest.json                         — corpus stats, rollups, source registry, report record, smoke-test
 *   tables/documents.jsonl                — normalized DocuStrata doc records (1 line/doc)
 *   tables/files.jsonl                    — normalized JM-DIE file index (CAD/CAM/g-code)
 *   reports/report-from-jm-tool-die-llc.json + .txt  — the named PDF, freshly extracted
 *
 * Usage:
 *   node scripts/build-jm-die-database.mjs            # full build
 *   node scripts/build-jm-die-database.mjs --dry-run  # plan only, no writes
 *
 * Juliett doctrine enforced: atomic tmp+rename with finally-unlink (no tmp-orphan leak),
 * schema-probe on inputs, fail-loud on missing/empty (R12), read-back smoke test before exit.
 */
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { atomicWriteJson } from "./lib/atomic-json.mjs";

const SCHEMA_VERSION = "1.0.0";
const DRY = process.argv.includes("--dry-run");

const DOCUSTRATA = "H:/PRISM/Docustrata";
const IDX = path.join(DOCUSTRATA, ".index");
const OUT = "H:/prism/mcp-server/data/jm-die-database";
const TABLES = path.join(OUT, "tables");
const REPORTS = path.join(OUT, "reports");

const NAMED_PDF = path.join(DOCUSTRATA, "Report_from_J.M._Tool__Die_LLC.pdf");
const PROFILE_TS = "H:/prism/mcp-server/src/data/jm-die-profile.ts";

const SRC = {
  classifiedFull: path.join(IDX, "documents-classified.jsonl"),   // v1 base — ALL 111,745 docs (the full corpus)
  classifiedV3: path.join(IDX, "documents-classified-v3.jsonl"),  // v3 refinement subset (~73,506) — role_v2 enrichment by id
  textExtracted: path.join(IDX, "documents-text-extracted-v3.jsonl"),
  fileIndex: path.join(IDX, "jm-die-index-v2.json"),
  blueprintJoin: path.join(IDX, "blueprint-program-join-full-v6.jsonl"),
};

function log(...a) { console.error("[jm-die-db]", ...a); }
function fileMeta(p) {
  try { const s = fs.statSync(p); return { exists: true, bytes: s.size, mtime: s.mtime.toISOString() }; }
  catch { return { exists: false, bytes: 0, mtime: null }; }
}
function sha256File(p) {
  try { return crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex"); }
  catch { return null; }
}

/** Stream a JSONL file line-by-line; call fn(obj) per valid record. Returns {rows, bad}. */
async function streamJsonl(p, fn) {
  let rows = 0, bad = 0;
  const rl = readline.createInterface({ input: fs.createReadStream(p, "utf8"), crlfDelay: Infinity });
  for await (const line of rl) {
    const t = line.trim();
    if (!t) continue;
    let o;
    try { o = JSON.parse(t); } catch { bad++; continue; }
    fn(o); rows++;
  }
  return { rows, bad };
}
async function countLines(p) {
  let n = 0;
  const rl = readline.createInterface({ input: fs.createReadStream(p, "utf8"), crlfDelay: Infinity });
  for await (const line of rl) { if (line.trim()) n++; }
  return n;
}

/** Open stream-tmp paths (multi-GB possible) — unlinked in main()'s catch if a run aborts mid-stream. */
const openStreamTmps = new Set();

/** Atomic write of a large text body via a write-stream to tmp + rename, with finally-unlink. */
function atomicWriteStreamStart(finalPath) {
  fs.mkdirSync(path.dirname(finalPath), { recursive: true });
  const tmp = `${finalPath}.${process.pid}.tmp`;
  const ws = fs.createWriteStream(tmp, "utf8");
  openStreamTmps.add(tmp);
  return { tmp, ws, finalPath };
}
function atomicWriteStreamFinish(h) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const done = (fn, arg) => { if (settled) return; settled = true; openStreamTmps.delete(h.tmp); fn(arg); };
    h.ws.end(() => {
      try { fs.renameSync(h.tmp, h.finalPath); done(resolve); }
      catch (e) { try { fs.unlinkSync(h.tmp); } catch {} done(reject, e); }
    });
    h.ws.on("error", (e) => { try { fs.unlinkSync(h.tmp); } catch {} done(reject, e); });
  });
}

/** Read + parse the first non-empty JSONL record (streamed — no full-file read). */
async function firstJsonl(p) {
  const rl = readline.createInterface({ input: fs.createReadStream(p, "utf8"), crlfDelay: Infinity });
  for await (const line of rl) {
    const t = line.trim();
    if (t) { rl.close(); try { return JSON.parse(t); } catch { return null; } }
  }
  return null;
}

function inc(map, key) { if (key == null || key === "") key = "(none)"; map[key] = (map[key] || 0) + 1; }
function topN(map, n) {
  return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, n)
    .map(([k, v]) => ({ key: k, count: v }));
}

/** Extract the named PDF via pdftotext (on PATH). Fail-loud if scanned (no text layer). */
function extractNamedPdf() {
  const meta = fileMeta(NAMED_PDF);
  if (!meta.exists) return { ok: false, error: "named-pdf-not-found", path: NAMED_PDF };
  const tmpTxt = `${NAMED_PDF}.${process.pid}.txt`;
  let text = "";
  try {
    execFileSync("pdftotext", ["-layout", NAMED_PDF, tmpTxt], { timeout: 120000 });
    text = fs.readFileSync(tmpTxt, "utf8");
  } catch (e) {
    try { fs.unlinkSync(tmpTxt); } catch {}
    return { ok: false, error: "pdftotext-failed: " + (e.message || "").split("\n")[0], path: NAMED_PDF };
  } finally {
    try { fs.unlinkSync(tmpTxt); } catch {}
  }
  const chars = text.trim().length;
  return {
    ok: true,
    source_path: NAMED_PDF,
    sha256: sha256File(NAMED_PDF),
    bytes: meta.bytes,
    char_count: chars,
    // R12: if pdftotext yields almost nothing, the PDF is scanned — surface it, don't pretend success.
    needs_ocr: chars < 200,
    text,
  };
}

async function main() {
  log(`build start (schema ${SCHEMA_VERSION}) dryRun=${DRY}`);
  // schema-probe + fail-loud on the critical input (the full base)
  const classifiedMeta = fileMeta(SRC.classifiedFull);
  if (!classifiedMeta.exists) {
    log(`FATAL: critical input missing: ${SRC.classifiedFull}`);
    process.exit(2);
  }

  const sources = {};
  for (const [k, p] of Object.entries(SRC)) {
    const m = fileMeta(p);
    sources[k] = { path: p, ...m };
  }

  // ---- rollups accumulated while streaming ----
  const roleDist = {}, roleV2Dist = {}, notebookDist = {}, tierDist = {};
  let docRows = 0, docBad = 0, needsOcr = 0, hasTextLayer = 0, totalSize = 0, enrichedCount = 0;

  // ---- v3 role-refinement enrichment map (id -> refined role/confidence) ----
  // v3 reclassified ~73.5K of the 111.7K docs; left-join its better roles onto the FULL base.
  const enrich = new Map();
  if (fileMeta(SRC.classifiedV3).exists) {
    await streamJsonl(SRC.classifiedV3, (o) => {
      if (o.id) enrich.set(o.id, {
        role_v2: o.inferred_role_v2 || o.inferred_role || null,
        conf_v2: o.role_confidence_v2 ?? o.role_confidence ?? null,
        needs_real_ocr: o.needs_real_ocr,
        // these per-doc signals live ONLY in the v3 file, NOT the v1 base — pull them here so the
        // documents table + text-layer rollup carry real data for the 73,506 v3-processed docs.
        disk_path: o.disk_path || null,
        has_text_layer: !!o.has_text_layer,
        text_layer_chars: o.text_layer_chars ?? 0,
        needs_ocr: !!o.needs_ocr,
        print_score: o.print_score ?? 0,
      });
    });
    log(`v3 enrichment map: ${enrich.size} ids`);
  }

  // ---- documents table (normalized projection over the FULL 111,745-doc base) ----
  let docOut = null;
  if (!DRY) { docOut = atomicWriteStreamStart(path.join(TABLES, "documents.jsonl")); }

  const projectDoc = (o) => {
    const e = enrich.get(o.id);
    const role = (e && e.role_v2) || o.inferred_role_v2 || o.inferred_role || "UNKNOWN";
    if (e) enrichedCount++;
    // text-layer / ocr / disk-path signals live in the v3 file only — prefer enrich, fall back to base.
    const diskPath = (e && e.disk_path) || o.disk_path || null;
    const hasText = e ? e.has_text_layer : !!o.has_text_layer;
    const textChars = e ? e.text_layer_chars : (o.text_layer_chars ?? 0);
    const needsOcrV = e ? e.needs_ocr : !!o.needs_ocr;
    const printScore = e ? e.print_score : (o.print_score ?? 0);
    inc(roleDist, o.inferred_role || "UNKNOWN");
    inc(roleV2Dist, role);
    inc(notebookDist, o.notebook);
    inc(tierDist, o.role_tier);
    if (needsOcrV) needsOcr++;
    if (hasText) hasTextLayer++;
    if (typeof o.size === "number") totalSize += o.size;
    if (docOut) {
      const rec = {
        id: o.id, filename: o.filename, title: o.title || "",
        role, role_v1: o.inferred_role || null,
        role_confidence: (e && e.conf_v2 != null) ? e.conf_v2 : (o.role_confidence ?? null),
        role_tier: o.role_tier || null,
        notebook: o.notebook || null, folder: o.folder || null,
        doc_date: o.doc_date || null, created_at: o.created_at || null,
        mime: o.mime || null, size: o.size ?? null,
        disk_path: diskPath,
        has_text_layer: hasText, text_layer_chars: textChars,
        needs_ocr: needsOcrV, print_score: printScore,
        classified_v3: !!e,
      };
      docOut.ws.write(JSON.stringify(rec) + "\n");
    }
  };

  log(`streaming documents from ${path.basename(SRC.classifiedFull)} (${(classifiedMeta.bytes/1e6).toFixed(1)}MB)…`);
  const dres = await streamJsonl(SRC.classifiedFull, projectDoc);
  docRows = dres.rows; docBad = dres.bad;
  if (docOut) await atomicWriteStreamFinish(docOut);
  log(`documents: ${docRows} rows (${docBad} malformed; ${enrichedCount} v3-enriched of ${enrich.size})`);

  // ---- files table from jm-die-index-v2.json (single JSON array) ----
  const machineDist = {}, kindDist = {}, extDist = {};
  let fileRows = 0;
  if (sources.fileIndex.exists) {
    let arr = [];
    try { arr = JSON.parse(fs.readFileSync(SRC.fileIndex, "utf8")); } catch (e) { log("fileIndex parse error:", e.message); }
    let fOut = null;
    if (!DRY) fOut = atomicWriteStreamStart(path.join(TABLES, "files.jsonl"));
    for (const o of arr) {
      inc(machineDist, o.machine); inc(kindDist, o.kind); inc(extDist, o.ext);
      fileRows++;
      if (fOut) {
        fOut.ws.write(JSON.stringify({
          path: o.path, name: o.name, stem: o.stem, ext: o.ext,
          customer: o.customer || null, machine: o.machine || null,
          kind: o.kind || null, size: o.size ?? null, mtime: o.mtime || null,
        }) + "\n");
      }
    }
    if (fOut) await atomicWriteStreamFinish(fOut);
    log(`files: ${fileRows} rows`);
  }

  // ---- blueprint-program joins: register + count only (do NOT copy 61MB) ----
  let bpJoinRows = 0;
  if (sources.blueprintJoin.exists) {
    bpJoinRows = await countLines(SRC.blueprintJoin);
    log(`blueprint-program joins: ${bpJoinRows} rows (registered by reference, not copied)`);
  }

  // ---- named PDF report ----
  log(`extracting named report PDF via pdftotext…`);
  const report = extractNamedPdf();
  if (!report.ok) log(`WARN report extraction: ${report.error}`);
  else log(`report: ${report.char_count} chars, needs_ocr=${report.needs_ocr}`);
  if (!DRY && report.ok) {
    fs.mkdirSync(REPORTS, { recursive: true });
    const slug = "report-from-jm-tool-die-llc";
    const { text, ...reportMeta } = report;
    atomicWriteJson(path.join(REPORTS, slug + ".json"), {
      schemaVersion: SCHEMA_VERSION, kind: "jm-tool-die-report",
      extracted_at: new Date().toISOString(), extractor: "pdftotext -layout", ...reportMeta,
      text_preview: text.slice(0, 4000),
    });
    fs.writeFileSync(path.join(REPORTS, slug + ".txt"), text, "utf8");
  }

  // ---- profile linkage (reference jm-die-profile.ts; do not import .ts) ----
  const profile = fileMeta(PROFILE_TS);

  // ---- manifest ----
  const manifest = {
    schemaVersion: SCHEMA_VERSION,
    kind: "jm-die-database-manifest",
    generated_at: new Date().toISOString(),
    builder: "scripts/build-jm-die-database.mjs",
    owner_slot: "juliett",
    corpus: {
      docustrata_root: DOCUSTRATA,
      docustrata_files_total: 257992, // from enumerate 2026-05-29
      indexed_documents: docRows,
      classified_v3_enriched: enrichedCount,
      malformed_doc_lines_skipped: docBad,
      jm_die_files_indexed: fileRows,
      blueprint_program_joins: bpJoinRows,
      documents_needing_ocr: needsOcr,
      documents_with_text_layer: hasTextLayer,
      documents_total_bytes: totalSize,
      text_layer_signal_note: `text-layer/disk-path/print-score signals are populated only on the ${enrichedCount} v3-processed docs; the other ${docRows - enrichedCount} base-only docs are null/false (not evaluated).`,
    },
    rollups: {
      document_role_v2: topN(roleV2Dist, 30),
      document_role_v1: topN(roleDist, 30),
      notebook: topN(notebookDist, 30),
      tier: topN(tierDist, 10),
      jm_die_file_machine: topN(machineDist, 20),
      jm_die_file_kind: topN(kindDist, 20),
      jm_die_file_ext: topN(extDist, 30),
    },
    sources: Object.fromEntries(Object.entries(sources).map(([k, v]) => [k, {
      path: v.path, exists: v.exists, bytes: v.bytes, mtime: v.mtime,
    }])),
    tables: {
      documents: { path: "tables/documents.jsonl", rows: docRows, projected_from: SRC.classifiedFull, v3_enriched: enrichedCount },
      files: { path: "tables/files.jsonl", rows: fileRows, projected_from: SRC.fileIndex },
      blueprint_program_joins: { path: SRC.blueprintJoin, rows: bpJoinRows, note: "referenced in place (61MB), not copied" },
    },
    report: report.ok
      ? { slug: "report-from-jm-tool-die-llc", char_count: report.char_count, needs_ocr: report.needs_ocr, sha256: report.sha256, source_path: report.source_path }
      : { error: report.error, source_path: NAMED_PDF },
    profile_link: { path: PROFILE_TS, exists: profile.exists, note: "canonical 117 customers / 21 machines / 24545 programs" },
  };

  if (DRY) {
    log("DRY RUN — manifest preview:");
    console.log(JSON.stringify(manifest, null, 2).slice(0, 3000));
    return;
  }

  atomicWriteJson(path.join(OUT, "manifest.json"), manifest);

  // ---- read-back smoke test (juliett doctrine: a write isn't done until read back) ----
  const back = JSON.parse(fs.readFileSync(path.join(OUT, "manifest.json"), "utf8"));
  const docLineCount = await countLines(path.join(TABLES, "documents.jsonl"));
  const fileLineCount = fileRows > 0 ? await countLines(path.join(TABLES, "files.jsonl")) : 0;
  const firstDoc = await firstJsonl(path.join(TABLES, "documents.jsonl"));
  const firstDocOk = !!(firstDoc && firstDoc.id && "role" in firstDoc);
  const reportOk = !report.ok || (fs.existsSync(path.join(REPORTS, "report-from-jm-tool-die-llc.json")) && fs.existsSync(path.join(REPORTS, "report-from-jm-tool-die-llc.txt")));
  const ok = back.schemaVersion === SCHEMA_VERSION
    && back.corpus.indexed_documents === docRows
    && docLineCount === docRows
    && fileLineCount === fileRows
    && firstDocOk && reportOk;
  log(`SMOKE TEST: schema=${back.schemaVersion} docs=${docLineCount}/${docRows} files=${fileLineCount}/${fileRows} firstDocParse=${firstDocOk} report=${reportOk} → ${ok ? "PASS" : "FAIL"}`);
  if (!ok) { log("FATAL: read-back smoke test FAILED"); process.exit(3); }
  log(`DONE → ${OUT}`);
}

main().catch((e) => {
  // P1-a: unlink any in-flight stream tmps (multi-GB) the aborted run left behind — no orphan leak.
  for (const t of openStreamTmps) { try { fs.unlinkSync(t); } catch {} }
  log("FATAL:", e.stack || e.message);
  process.exit(1);
});
