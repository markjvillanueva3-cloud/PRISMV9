/**
 * safe-settings-edit.mjs — lock-guarded read-modify-write for the harness
 * settings.json pair (C:/Users/<u>/.claude + H:/.claude).
 *
 * WHY THIS EXISTS: the "settings-wiring-drift" class — critical hooks
 * silently un-wired during multi-chat merges — is caused by every settings
 * editor doing a plain read → modify → write. Under ≤12 concurrent chats,
 * A reads, B reads, A writes, B writes → A's wiring is lost. atomic-write
 * prevents a TORN file; it does NOT prevent this LOST-UPDATE. This helper
 * closes that hole: an exclusive cross-process lock around a FRESH read +
 * caller mutation + atomic dual-mirror write.
 *
 * Composes (does NOT duplicate):
 *   - golf-cron-lock.mjs  acquire()      — O_EXCL lock + dead-PID steal
 *   - atomic-write.mjs    writeAtomicSync — temp+fsync+rename (no torn file)
 *
 * Contract: safeSettingsEdit(mutate, opts) where `mutate(obj)` edits the
 * parsed settings object IN PLACE. Returns:
 *   { ok:true,  changed:bool, bytes }                  — applied (or no-op)
 *   { ok:false, error:'locked', heldBy }               — a peer holds it
 *   { ok:false, error:'unparseable'|'mutator-threw'|'mirror-failed', detail }
 * Never writes a partial/garbage settings.json; never clobbers a peer edit.
 */
import * as fs from "node:fs";
import { acquire } from "./golf-cron-lock.mjs";
import { writeAtomicSync } from "./atomic-write.mjs";

const LOCK_ID = "settings-json-edit";
const LOCK_TTL_MS = 15000; // a settings RMW is sub-second; 15s covers GC pauses
const DEFAULT_FILES = [
  "C:/Users/wompu/.claude/settings.json",
  "H:/.claude/settings.json",
];

/**
 * @param {(obj:object)=>void} mutate  in-place mutator of the parsed settings
 * @param {{files?:string[], lockTtlMs?:number, acquireFn?:Function}} [opts]
 */
export function safeSettingsEdit(mutate, opts = {}) {
  if (typeof mutate !== "function") {
    return { ok: false, error: "bad-args", detail: "mutate must be a function" };
  }
  const files = opts.files || DEFAULT_FILES;
  const acq = (opts.acquireFn || acquire)(LOCK_ID, opts.lockTtlMs || LOCK_TTL_MS);
  if (!acq.ok) {
    return { ok: false, error: "locked", heldBy: acq.heldBy || null };
  }
  try {
    // Read the FIRST file fresh as the source of truth (inside the lock —
    // no peer can interleave a write between this read and our write).
    let raw;
    try {
      raw = fs.readFileSync(files[0], "utf8");
    } catch (e) {
      return { ok: false, error: "read-failed", detail: String(e && e.message || e) };
    }
    let obj;
    try {
      obj = JSON.parse(raw);
    } catch (e) {
      // Corrupt settings → abort. Writing anything here would cement the
      // corruption fleet-wide. Fail LOUD, change nothing.
      return { ok: false, error: "unparseable", detail: String(e && e.message || e) };
    }

    try {
      mutate(obj);
    } catch (e) {
      return { ok: false, error: "mutator-threw", detail: String(e && e.message || e) };
    }

    const out = JSON.stringify(obj, null, 2) + "\n";
    if (out === raw) {
      return { ok: true, changed: false, bytes: Buffer.byteLength(out) };
    }

    // Write the identical content to every mirror, atomically per file.
    // If a later mirror fails, the earlier ones are already consistent and
    // the next safeSettingsEdit reconciles from files[0]; surface it loud.
    const written = [];
    for (const f of files) {
      try {
        writeAtomicSync(f, out);
        written.push(f);
      } catch (e) {
        return {
          ok: false, error: "mirror-failed",
          detail: `wrote ${written.length}/${files.length}; ${f}: ${e && e.message || e}`,
          written,
        };
      }
    }
    // Post-write byte-parity assertion across mirrors.
    const identical = files.every(f => fs.readFileSync(f, "utf8") === out);
    return { ok: true, changed: true, bytes: Buffer.byteLength(out), mirrorsIdentical: identical };
  } finally {
    try { acq.release && acq.release(); } catch { /* steal-safe no-op */ }
  }
}

// Self-test: `node safe-settings-edit.mjs --self-test`
const _entry = process.argv[1];
if (_entry && process.argv.includes("--self-test")) {
  const os = await import("node:os");
  const path = await import("node:path");
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "sse-"));
  const a = path.join(d, "a.json"), b = path.join(d, "b.json");
  fs.writeFileSync(a, JSON.stringify({ hooks: { Stop: [] } }, null, 2) + "\n");
  fs.writeFileSync(b, fs.readFileSync(a));
  const r = safeSettingsEdit(o => { o.hooks.Stop.push({ x: 1 }); }, { files: [a, b] });
  console.log("applied:", r.ok && r.changed);
  console.log("C/H identical:", fs.readFileSync(a, "utf8") === fs.readFileSync(b, "utf8"));
  const r2 = safeSettingsEdit(() => {}, { files: [a, b] });
  console.log("no-op detected:", r2.ok && r2.changed === false);
  fs.rmSync(d, { recursive: true, force: true });
  console.log("SELF-TEST DONE");
}
