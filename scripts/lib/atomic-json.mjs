/**
 * atomic-json.mjs — the single canonical atomic JSON writer for PRISM scripts.
 *
 * U-ROADMAP-INDEX-WRITER-CONSOLIDATE (2026-05-19): collapses the five
 * independent roadmap-index.json writers (reconcile-milestones.mjs,
 * register-devtools-roadmap-envelopes.mjs, register-revenue-roadmap-
 * envelopes.mjs, reconcile-roadmap-drift.mjs, close-out-milestone.mjs) onto
 * one helper.
 *
 * The inline copies split two ways and both ways were imperfect:
 *  - reconcile-roadmap-drift / reconcile-milestones / register-* used a FIXED
 *    `${path}.tmp` suffix. Several of those scripts target the SAME
 *    mcp-server/data/roadmap-index.json — a concurrent run had them write the
 *    same `roadmap-index.json.tmp`, clobbering each other (wrong content can
 *    survive the rename; the loser's renameSync throws ENOENT on a consumed
 *    tmp). A per-PID temp suffix removes that collision: distinct processes
 *    never share a PID, and a single (single-threaded, synchronous) call here
 *    never interleaves its own write→rename pair.
 *  - close-out-milestone.mjs already used a per-PID suffix but kept its own
 *    private copy — a second implementation of the same primitive, the exact
 *    "two writers, two impls" hazard the consolidation exists to kill.
 *
 * Errors are NOT swallowed: a failing writeFileSync/renameSync throws so the
 * caller aborts loud (R12). On a rename failure the orphaned temp sibling is
 * removed best-effort before the error is rethrown.
 */
import { writeFileSync, renameSync, unlinkSync, mkdirSync, existsSync } from "node:fs";

/**
 * Atomically write a string body to `filePath`. Sibling to `atomicWriteJson`
 * for callers that already serialize their content (JSONL, plain text,
 * markdown). Same per-PID-temp + rename safety properties; same R12 throw +
 * orphan-temp cleanup on rename failure. Added 2026-05-19 by
 * KNOWLEDGE-CONVERSION-MS0/U-KIP03 to give the kip-rotate-orphans-to-lora
 * CLI a canonical-lib path instead of an inline twin.
 *
 * @param {string} filePath    destination path
 * @param {string} body        already-serialized content (empty string is
 *                             allowed — writes an empty file)
 * @param {object} [opts]
 * @param {{writeFileSync:Function,renameSync:Function,unlinkSync:Function,mkdirSync:Function,existsSync:Function}} [opts.fsImpl]  injectable fs (tests)
 * @returns {string} `filePath`
 */
export function atomicWriteText(filePath, body, opts = {}) {
  if (typeof filePath !== "string" || filePath.length === 0) {
    throw new TypeError("atomicWriteText(): filePath must be a non-empty string");
  }
  if (typeof body !== "string") {
    throw new TypeError(`atomicWriteText(): body must be a string (got ${typeof body})`);
  }
  const { fsImpl } = opts;
  const write = fsImpl?.writeFileSync ?? writeFileSync;
  const rename = fsImpl?.renameSync ?? renameSync;
  const unlink = fsImpl?.unlinkSync ?? unlinkSync;
  const mkd = fsImpl?.mkdirSync ?? mkdirSync;
  const exists = fsImpl?.existsSync ?? existsSync;
  // Auto-create parent dir (consistent with the surrounding convention; a
  // missing dir is the common cron-bootstrap case, not a programmer error).
  // We import dirname lazily here to keep the module dependency minimal.
  const dir = dirnameOf(filePath);
  if (dir && !exists(dir)) mkd(dir, { recursive: true });
  const tmp = `${filePath}.tmp-${process.pid}`;
  write(tmp, body, "utf8");
  try {
    rename(tmp, filePath);
  } catch (err) {
    try { unlink(tmp); } catch { /* temp already gone */ }
    throw err;
  }
  return filePath;
}

/** Local dirname to avoid importing node:path at the top (kept module lean). */
function dirnameOf(p) {
  const i = Math.max(p.lastIndexOf("/"), p.lastIndexOf("\\"));
  return i > 0 ? p.slice(0, i) : "";
}

/**
 * Atomically write `obj` as pretty (2-space) JSON to `filePath`.
 *
 * Writes to a per-PID temp sibling then renames onto the destination — a
 * reader of `filePath` never observes a partially written file (rename is
 * atomic within a filesystem, and the temp is a same-directory sibling so it
 * is always intra-filesystem).
 *
 * @param {string}  filePath  destination path
 * @param {unknown} obj       JSON-serializable value (a non-serializable value
 *                            — BigInt, circular ref — throws before any file
 *                            is touched)
 * @param {object}  [opts]
 * @param {boolean} [opts.trailingNewline=true]  append "\n" after the JSON
 * @param {{writeFileSync:Function,renameSync:Function,unlinkSync:Function}} [opts.fsImpl]  injectable fs (tests)
 * @returns {string} `filePath` (the path written)
 */
export function atomicWriteJson(filePath, obj, opts = {}) {
  const { trailingNewline = true, fsImpl } = opts;
  const write = fsImpl?.writeFileSync ?? writeFileSync;
  const rename = fsImpl?.renameSync ?? renameSync;
  const unlink = fsImpl?.unlinkSync ?? unlinkSync;
  const tmp = `${filePath}.tmp-${process.pid}`;
  // JSON.stringify runs first — a non-serializable obj throws here, before the
  // temp file is created, so a bad input never leaves disk artifacts.
  const json = JSON.stringify(obj, null, 2) + (trailingNewline ? "\n" : "");
  write(tmp, json, "utf8");
  try {
    rename(tmp, filePath);
  } catch (err) {
    // rename failed — best-effort remove the orphaned temp so failing runs do
    // not accumulate `${filePath}.tmp-<pid>` siblings; rethrow loud (R12).
    try { unlink(tmp); } catch { /* temp already gone — nothing to clean */ }
    throw err;
  }
  return filePath;
}
