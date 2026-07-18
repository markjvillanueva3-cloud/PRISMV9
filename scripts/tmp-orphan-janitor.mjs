#!/usr/bin/env node
/**
 * tmp-orphan-janitor.mjs — safe sweep of orphaned atomic-write `*.tmp` siblings (slot:juliett).
 *
 * WHY: PRISM atomic writers use a tmp+rename pattern. Most writers self-clean (scripts/lib/atomic-json.mjs
 * uses `.tmp-<pid>` + finally-unlink), but some leave their tmp behind on crash/overlap — notably the
 * tribal-embed-index regen (`tribal-embed-index.json.<pid>.tmp`, ~382MB each) and the claim registry
 * (`ACTIVE_ROADMAP_CLAIMS.json.<pid>.<hash>.tmp`). On 2026-05-29 `state/shared/` held 3,607 such tmps =
 * ~19 GB, actively growing. This janitor reclaims them WITHOUT touching in-flight writes.
 *
 * SAFETY (juliett doctrine — never blind-delete; see reference_juliett_tmp_orphan_leak_2026_05_29):
 *   - A tmp is reclaimable ONLY if its embedded PID is DEAD and mtime age > minAgeMin (default 30m),
 *     OR it has no parseable PID and age > nopidAgeHr (default 24h).
 *   - alive-PID tmps are NEVER touched (a 382MB write can be in flight).
 *   - TOCTOU: each candidate is re-stat'd + PID-rechecked immediately before unlink.
 *   - DRY-RUN by default. Pass --apply to delete. Every run appends a summary to the audit ledger.
 *
 * Usage:
 *   node scripts/tmp-orphan-janitor.mjs                 # dry-run report (default)
 *   node scripts/tmp-orphan-janitor.mjs --apply         # actually reclaim
 *   node scripts/tmp-orphan-janitor.mjs --dir <path>    # extra dir (repeatable); defaults below
 *   node scripts/tmp-orphan-janitor.mjs --min-age-min N --nopid-age-hr N --json
 *
 * Knobs (env): PRISM_TMP_JANITOR_DISABLE=1 · PRISM_TMP_JANITOR_MIN_AGE_MIN · PRISM_TMP_JANITOR_NOPID_AGE_HR
 */
import fs from "node:fs";
import path from "node:path";

const DEFAULT_DIRS = ["H:/prism/state/shared", "H:/prism/mcp-server/data/state"];
const LEDGER = "H:/prism/state/shared/.tmp-janitor-actions.jsonl";

/** Extract the writer PID embedded in a tmp filename across PRISM's 3 known patterns. null = none. */
export function pidOf(name) {
  let m = name.match(/\.tmp-(\d+)$/); if (m) return Number(m[1]);          // atomic-json: <name>.tmp-<pid>
  // <name>.tmp.<pid>[.<rand>] — the leaky family matched by NO janitor before 2026-05-31 (golf): ollama-stats
  // legacy `.tmp.<pid>.<base36>`, plus MACHINE_REGISTRY / fleet-reaper-crash-watch / fleet-task-health writers
  // (65 orphans measured). The `.tmp.` (dot, not dash) + leading-digits anchor keeps it disjoint from the
  // `.tmp-<pid>` and `.<pid>.<hex>.tmp` families above, and the required \d+ excludes real `*.tmp.json` files.
  m = name.match(/\.tmp\.(\d+)(?:\.[0-9a-z]+)?$/i); if (m) return Number(m[1]);
  // <name>.<pid>.<hexhash>.tmp — the hash segment MUST contain a hex LETTER (a-f). Otherwise an all-digit
  // trailing segment (date stamp, second numeric) would be mis-read as the hash and a basename digit-run
  // as the pid (P0: declaring a LIVE write dead). Requiring a letter forces those to the last-numeric rule.
  m = name.match(/\.(\d+)\.[0-9a-fA-F]*[a-fA-F][0-9a-fA-F]*\.tmp$/); if (m) return Number(m[1]);
  m = name.match(/\.(\d+)\.tmp$/); if (m) return Number(m[1]);             // <name>.<pid>.tmp (pid = last numeric before .tmp)
  return null;
}

/**
 * True if `name` is one of PRISM's atomic-write tmp patterns. pidOf() parses three —
 * `<name>.tmp-<pid>`, `<name>.<pid>.<hexhash>.tmp`, `<name>.<pid>.tmp` — but the original scan/classify
 * gates only accepted `.endsWith(".tmp")`, which SKIPPED the `.tmp-<pid>` family entirely (the dominant
 * real-world leaker: defer-queue.json.tmp-<pid>, ollama-offload-stats.json.tmp-<pid> — 3438 orphans /
 * 98.6 MB measured 2026-05-30, slot golf). This predicate closes that gap so all three patterns sweep.
 */
export function isTmpName(name) {
  return typeof name === "string" && (
    name.endsWith(".tmp") ||
    /\.tmp-\d+$/.test(name) ||
    // <name>.tmp.<pid>[.<rand>] family (golf 2026-05-31). Requires DIGITS right after `.tmp.` so a real
    // file like `config.tmp.json` (letter after `.tmp.`) is NEVER matched — only the writer-generated
    // pid/timestamp-suffixed orphans are. classify()'s dead-pid-OR-age gate still guards every deletion.
    /\.tmp\.\d+(\.[0-9a-z]+)?$/i.test(name)
  );
}

/** Belt-and-suspenders: a file a writer currently holds open (Windows write lock) fails exclusive open. */
function notLocked(full, fsImpl = fs) {
  try { const fd = fsImpl.openSync(full, "r+"); fsImpl.closeSync(fd); return true; }
  catch { return false; }
}

/** Is a PID currently alive? EPERM means alive-but-not-ours. Injectable for tests. */
export function isAlive(pid, killer = process.kill.bind(process)) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try { killer(pid, 0); return true; } catch (e) { return e.code === "EPERM"; }
}

/**
 * Decide a tmp file's fate. Pure — takes the parsed inputs, returns {action, reason}.
 * action: "reclaim" | "keep-alive" | "keep-young" | "keep-nopid-young" | "keep-not-tmp"
 */
export function classify({ name, ageMs, pid, alive, minAgeMs, nopidAgeMs }) {
  if (!isTmpName(name)) return { action: "keep-not-tmp", reason: "not a .tmp" };
  if (pid != null) {
    if (alive) return { action: "keep-alive", reason: `pid ${pid} alive (in-flight)` };
    if (ageMs <= minAgeMs) return { action: "keep-young", reason: `dead pid ${pid} but age ${(ageMs/60000)|0}m <= min` };
    return { action: "reclaim", reason: `dead pid ${pid}, age ${(ageMs/60000)|0}m` };
  }
  // no parseable PID — conservative: only reclaim very old ones (could be a non-pid-named in-flight write)
  if (ageMs <= nopidAgeMs) return { action: "keep-nopid-young", reason: `no pid, age ${(ageMs/3600000)|0}h <= nopid-min` };
  return { action: "reclaim", reason: `no pid, age ${(ageMs/3600000)|0}h (stale)` };
}

function appendLedger(record) {
  try {
    fs.mkdirSync(path.dirname(LEDGER), { recursive: true });
    fs.appendFileSync(LEDGER, JSON.stringify(record) + "\n", "utf8"); // append = atomic for one line
  } catch (e) { console.error("[tmp-janitor] ledger append failed:", e.message); }
}

function parseArgs(argv) {
  const a = { apply: false, json: false, dirs: [], minAgeMin: Number(process.env.PRISM_TMP_JANITOR_MIN_AGE_MIN) || 30, nopidAgeHr: Number(process.env.PRISM_TMP_JANITOR_NOPID_AGE_HR) || 24 };
  for (let i = 2; i < argv.length; i++) {
    const t = argv[i];
    if (t === "--apply") a.apply = true;
    else if (t === "--json") a.json = true;
    else if (t === "--dir") a.dirs.push(argv[++i]);
    else if (t === "--min-age-min") a.minAgeMin = Number(argv[++i]);
    else if (t === "--nopid-age-hr") a.nopidAgeHr = Number(argv[++i]);
  }
  if (!a.dirs.length) a.dirs = DEFAULT_DIRS;
  return a;
}

function main() {
  if (process.env.PRISM_TMP_JANITOR_DISABLE === "1") { console.error("[tmp-janitor] disabled via env"); process.exit(0); }
  const args = parseArgs(process.argv);
  const minAgeMs = args.minAgeMin * 60_000;
  const nopidAgeMs = args.nopidAgeHr * 3_600_000;
  const now = Date.now();

  const summary = { scanned: 0, reclaim: 0, reclaimBytes: 0, keepAlive: 0, keepYoung: 0, keepNopidYoung: 0, deleted: 0, deletedBytes: 0, errors: 0, perBase: {} };

  for (const dir of args.dirs) {
    let names; try { names = fs.readdirSync(dir); } catch { continue; }
    for (const name of names) {
      if (!isTmpName(name)) continue;
      const full = path.join(dir, name);
      let st; try { st = fs.lstatSync(full); } catch { continue; }
      if (!st.isFile()) continue; // never follow symlinks/dirs
      summary.scanned++;
      const pid = pidOf(name);
      const verdict = classify({ name, ageMs: now - st.mtimeMs, pid, alive: pid != null && isAlive(pid), minAgeMs, nopidAgeMs });
      if (verdict.action === "keep-alive") summary.keepAlive++;
      else if (verdict.action === "keep-young") summary.keepYoung++;
      else if (verdict.action === "keep-nopid-young") summary.keepNopidYoung++;
      else if (verdict.action === "reclaim") {
        summary.reclaim++; summary.reclaimBytes += st.size;
        const base = name.replace(/\.(\d+)(\.[0-9a-fA-F]+)?\.tmp$/, "").replace(/\.tmp\.\d+(\.[0-9a-z]+)?$/i, "").replace(/\.tmp-\d+$/, "").replace(/\.tmp$/, "");
        summary.perBase[base] = (summary.perBase[base] || 0) + 1;
        if (args.apply) {
          // TOCTOU re-check: re-stat + re-verify dead-pid right before unlink (PID could be reused / write restarted)
          try {
            const st2 = fs.lstatSync(full);
            const p2 = pidOf(name);
            const stillDead = p2 == null ? (now - st2.mtimeMs > nopidAgeMs) : !isAlive(p2);
            const stillOld = now - st2.mtimeMs > (p2 == null ? nopidAgeMs : minAgeMs);
            // notLocked is the final defense: if any process holds the file open (in-flight write), skip.
            if (st2.isFile() && stillDead && stillOld && notLocked(full)) { fs.unlinkSync(full); summary.deleted++; summary.deletedBytes += st2.size; }
          } catch { summary.errors++; }
        }
      }
    }
  }

  const out = {
    ts: new Date().toISOString(), mode: args.apply ? "apply" : "dry-run",
    dirs: args.dirs, minAgeMin: args.minAgeMin, nopidAgeHr: args.nopidAgeHr,
    scanned: summary.scanned,
    reclaimable: summary.reclaim, reclaimableGB: +(summary.reclaimBytes / 1e9).toFixed(2),
    deleted: summary.deleted, deletedGB: +(summary.deletedBytes / 1e9).toFixed(2),
    kept: { alive: summary.keepAlive, young: summary.keepYoung, nopidYoung: summary.keepNopidYoung },
    errors: summary.errors,
    topBases: Object.entries(summary.perBase).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => ({ base: k, count: v })),
  };
  appendLedger(out);
  if (args.json) console.log(JSON.stringify(out, null, 2));
  else {
    console.log(`[tmp-janitor] ${out.mode} — scanned ${out.scanned} .tmp`);
    console.log(`  reclaimable: ${out.reclaimable} = ${out.reclaimableGB} GB`);
    if (args.apply) console.log(`  DELETED: ${out.deleted} = ${out.deletedGB} GB (errors: ${out.errors})`);
    else console.log(`  (dry-run — pass --apply to reclaim)`);
    console.log(`  kept: alive=${out.kept.alive} young=${out.kept.young} nopid-young=${out.kept.nopidYoung}`);
    if (out.topBases.length) console.log(`  top leakers: ${out.topBases.map(b => b.base + "(" + b.count + ")").join(", ")}`);
  }
}

// Run only as CLI (not when imported by the test).
if (import.meta.url === `file://${(process.argv[1] || "").replace(/\\/g, "/")}` || process.argv[1]?.endsWith("tmp-orphan-janitor.mjs")) {
  main();
}
