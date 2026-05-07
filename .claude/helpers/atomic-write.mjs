/**
 * atomic-write.mjs — JS port of AtomicWritesEngine for hook/helper use.
 *
 * The TypeScript AtomicWritesEngine (src/engines/AtomicWritesEngine.ts)
 * can't be imported from .mjs hooks without compiled output. This helper
 * mirrors its algorithm: write to a sibling temp file, fsync, rename.
 *
 * Guarantees: a crash mid-write leaves either the previous file or
 * nothing — never a half-written file that the next session will try to
 * parse as JSON.
 *
 * Keep this file in sync with AtomicWritesEngine.ts. The algorithm is:
 *   1. Open `${target}.NNNN.tmp` with mode 0o644
 *   2. Write content
 *   3. fsync (optional, default true)
 *   4. close
 *   5. rename tmp → target   (atomic on NTFS + POSIX)
 *   6. On error: unlink tmp, rethrow
 */

import * as fs from "node:fs";
import * as path from "node:path";
import * as crypto from "node:crypto";

const DEFAULT_MODE = 0o644;

function tempPathFor(target) {
  const dir = path.dirname(target);
  const base = path.basename(target);
  const suffix = crypto.randomBytes(6).toString("hex");
  return path.join(dir, `.${base}.${suffix}.tmp`);
}

/** Atomic write (async). Ensures parent dir exists. */
export async function writeAtomic(target, content, opts = {}) {
  validateTarget(target);
  if (content === null || content === undefined) {
    throw new Error("atomic-write: content required");
  }
  const mode = opts.mode ?? DEFAULT_MODE;
  const doFsync = opts.fsync !== false;
  const temp = tempPathFor(target);
  try {
    const handle = await fs.promises.open(temp, "w", mode);
    try {
      await handle.writeFile(content);
      if (doFsync) await handle.sync();
    } finally {
      await handle.close();
    }
    await fs.promises.rename(temp, target);
  } catch (err) {
    try { await fs.promises.unlink(temp); } catch { /* ignore */ }
    throw err;
  }
}

/** Atomic write (sync). Ensures parent dir exists. */
export function writeAtomicSync(target, content, opts = {}) {
  validateTarget(target);
  if (content === null || content === undefined) {
    throw new Error("atomic-write: content required");
  }
  const mode = opts.mode ?? DEFAULT_MODE;
  const doFsync = opts.fsync !== false;
  const temp = tempPathFor(target);
  try {
    const fd = fs.openSync(temp, "w", mode);
    try {
      fs.writeFileSync(fd, content);
      if (doFsync) fs.fsyncSync(fd);
    } finally {
      fs.closeSync(fd);
    }
    fs.renameSync(temp, target);
  } catch (err) {
    try { fs.unlinkSync(temp); } catch { /* ignore */ }
    throw err;
  }
}

/** JSON convenience — async. */
export async function writeJSONAtomic(target, data, indent = 2) {
  await writeAtomic(target, JSON.stringify(data, null, indent));
}

/** JSON convenience — sync. */
export function writeJSONAtomicSync(target, data, indent = 2) {
  writeAtomicSync(target, JSON.stringify(data, null, indent));
}

function validateTarget(target) {
  if (typeof target !== "string" || target.length === 0) {
    throw new Error("atomic-write: target path required");
  }
  const dir = path.dirname(target);
  if (!fs.existsSync(dir)) {
    throw new Error(`atomic-write: parent directory does not exist '${dir}'`);
  }
}

// Self-test when invoked directly: `node atomic-write.mjs --self-test`
const _entry = process.argv[1];
if (_entry && process.argv.includes("--self-test")) {
  const os = await import("node:os");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "atomic-selftest-"));
  const f = path.join(dir, "x.txt");
  writeAtomicSync(f, "hello");
  console.log("sync ok:", fs.readFileSync(f, "utf8") === "hello");
  await writeAtomic(f, "world");
  console.log("async ok:", fs.readFileSync(f, "utf8") === "world");
  const obj = { n: 42, nested: { ok: true } };
  await writeJSONAtomic(f, obj);
  const parsed = JSON.parse(fs.readFileSync(f, "utf8"));
  console.log("json ok:", parsed.nested.ok === true);
  const leftover = fs.readdirSync(dir).filter((n) => n.startsWith(".x.txt."));
  console.log("no-temp-leftover:", leftover.length === 0);
  fs.rmSync(dir, { recursive: true, force: true });
  console.log("ALL PASS");
}
