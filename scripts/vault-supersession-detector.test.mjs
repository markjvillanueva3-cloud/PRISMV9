// Tests for vault-supersession-detector.mjs (SIERRA-VAULT-OPS/U-VAULT-SUPERSEDE-DETECT).
// node --test scripts/vault-supersession-detector.test.mjs
//
// Mutation-proof: asserts EXACT older->newer pairings + the recall-readable marker
// string (a swapped pointer or a non-newest target fails), not just counts.

import { test } from "node:test";
import assert from "node:assert/strict";
import { parseDatedName, formatMarker, runSupersessionScan, insertMarker, applyMarks, backupName, markExitCode, isEpisodicSeriesStem, removeMarker, runUnmarkSeries } from "./vault-supersession-detector.mjs";
import { isSupersededMemory } from "./lib/memory-index-search-lib.mjs";

const C_ROOT = "C:/Users/wompu/.claude/projects/H--prism/memory";   // applyMarks default cMemoryRoot
// mutable in-memory fs for applyMarks (read/write/copy/rename/mkdir/exists over a Map)
function mutFs(init = {}) {
  const norm = (p) => String(p).replace(/\\/g, "/");
  const store = new Map(Object.entries(init).map(([k, v]) => [norm(k), v]));
  const dirs = new Set();
  return {
    store, norm,
    readFileImpl: (p) => { const k = norm(p); if (!store.has(k)) throw Object.assign(new Error("ENOENT"), { code: "ENOENT" }); return store.get(k); },
    writeFileImpl: (p, data) => { store.set(norm(p), data); },
    existsImpl: (p) => store.has(norm(p)) || dirs.has(norm(p)),
    mkdirImpl: (p) => { dirs.add(norm(p)); },
    copyImpl: (src, dst) => { store.set(norm(dst), store.get(norm(src))); },
    renameImpl: (src, dst) => { store.set(norm(dst), store.get(norm(src))); store.delete(norm(src)); },
  };
}

// ---- in-memory fake fs: nested obj; string leaf = file content, object = dir ----
function makeFs(tree) {
  function resolve(p) {
    const parts = String(p).replace(/\\/g, "/").replace(/\/+$/, "").split("/").filter(Boolean);
    let node = tree;
    for (const part of parts) {
      if (node && typeof node === "object" && part in node) node = node[part];
      else return undefined;
    }
    return node;
  }
  return {
    readdirImpl(p) {
      const node = resolve(p);
      if (!node || typeof node !== "object") throw Object.assign(new Error("ENOENT"), { code: "ENOENT" });
      return Object.keys(node).map((name) => ({
        name,
        isDirectory: () => node[name] && typeof node[name] === "object",
        isFile: () => typeof node[name] === "string",
      }));
    },
    readFileImpl(p) {
      const node = resolve(p);
      if (typeof node !== "string") throw Object.assign(new Error("ENOENT " + p), { code: "ENOENT" });
      return node;
    },
    existsImpl(p) { return resolve(p) !== undefined; },
  };
}
const scan = (tree, extra = {}) => runSupersessionScan({
  memoryRoot: "mem", cMemoryRoot: "cmem", nowMs: 0, ...makeFs(tree), ...extra,
});

// ============================ parseDatedName ============================
test("parseDatedName: hyphen + underscore + mixed separators all parse", () => {
  assert.deepEqual(parseDatedName("reference_foo_2026-06-15.md"), { stem: "reference_foo", dateStr: "2026-06-15", dateMs: Date.parse("2026-06-15T00:00:00Z") });
  assert.deepEqual(parseDatedName("reference_foo_2026_06_15.md"), { stem: "reference_foo", dateStr: "2026-06-15", dateMs: Date.parse("2026-06-15T00:00:00Z") });
  // trailing separators before the date are stripped from the stem
  assert.equal(parseDatedName("reference_bar-2026-06-15.md").stem, "reference_bar");
});

test("parseDatedName: returns null for undated / mid-name-only / empty-stem / impossible dates", () => {
  assert.equal(parseDatedName("feedback_obsidian_brain.md"), null);          // undated
  assert.equal(parseDatedName("reference_2026-06-15_audit.md"), null);       // date not trailing
  assert.equal(parseDatedName("2026-06-15.md"), null);                       // empty stem
  assert.equal(parseDatedName("reference_x_2026-13-40.md"), null);           // impossible calendar
  assert.equal(parseDatedName("reference_x_2026-00-10.md"), null);           // month 0
});

test("parseDatedName: rejects calendar ROLLOVERS Date.parse would silently accept (Feb 30, Jun 31)", () => {
  // these are the dangerous ones: Date.parse rolls them into the next month, so a
  // naive parser would order by the rolled-over ms while displaying the bogus date.
  assert.equal(parseDatedName("reference_x_2026-02-30.md"), null);           // Feb has 28/29
  assert.equal(parseDatedName("reference_x_2026-06-31.md"), null);           // June has 30
  assert.equal(parseDatedName("reference_x_2026-04-31.md"), null);           // April has 30
  // and a real boundary date STILL parses (no over-rejection)
  assert.equal(parseDatedName("reference_x_2024-02-29.md").dateStr, "2024-02-29"); // 2024 leap
  assert.equal(parseDatedName("reference_x_2026-12-31.md").dateStr, "2026-12-31");
});

test("parseDatedName (adversarial): two dates -> TRAILING wins, earlier stays in stem", () => {
  const r = parseDatedName("reference_2026-01-01_audit_2026-06-17.md");
  assert.equal(r.dateStr, "2026-06-17");
  assert.equal(r.stem, "reference_2026-01-01_audit");
});

// ============================ formatMarker ============================
test("formatMarker output is recall-readable by the REAL isSupersededMemory (single source of truth)", () => {
  const marker = formatMarker("2026-06-15", "reference_foo_2026-06-17");
  assert.equal(marker, "> **SUPERSEDED 2026-06-15 -- see [[reference_foo_2026-06-17]].**");
  assert.equal(isSupersededMemory(marker), true);                  // the live recall path WILL exclude it
  assert.equal(isSupersededMemory("body\n" + marker + "\nmore"), true);
});

test("formatMarker (negative control): present-tense SUPERSEDES is NOT flagged superseded", () => {
  // a memo that merely SUPERSEDES another (the current winner) must stay in recall
  assert.equal(isSupersededMemory("This memo SUPERSEDES feedback_alpha_owns_reaper."), false);
});

// ============================ runSupersessionScan ============================
test("happy: 3-date stem -> 2 candidates both pointing to the NEWEST, oldest-first (mutation-proof)", () => {
  const rep = scan({ mem: {
    "reference_foo_2026-06-15.md": "alpha body",
    "reference_foo_2026-06-16.md": "beta body",
    "reference_foo_2026-06-17.md": "gamma body",
  } });
  assert.equal(rep.dated, 3);
  assert.equal(rep.stems, 1);
  assert.equal(rep.supersessionStems, 1);
  assert.equal(rep.alreadyMarked, 0);
  assert.equal(rep.candidateCount, 2);
  // EXACT pairings: both older files point to the NEWEST (06-17), not the immediate successor
  assert.equal(rep.candidates[0].olderDate, "2026-06-15");
  assert.equal(rep.candidates[0].older, "mem/reference_foo_2026-06-15.md");
  assert.equal(rep.candidates[0].newerId, "reference_foo_2026-06-17");
  assert.equal(rep.candidates[0].marker, "> **SUPERSEDED 2026-06-15 -- see [[reference_foo_2026-06-17]].**");
  assert.equal(rep.candidates[1].olderDate, "2026-06-16");
  assert.equal(rep.candidates[1].newerId, "reference_foo_2026-06-17");
});

test("series-exclusion: episodic dated series (session/clean_ship/scrutiny) are NOT candidates; genuine re-version IS (U-SIERRA-SUPERSEDE-SERIES-FIX)", () => {
  // 3-of-3 arm-C P1: a daily session trace / clean-ship / scrutiny ledger is independent per-day
  // history, NOT a re-version -- a newer sibling must NOT supersede the older. Only a genuine
  // re-versioned topic (status snapshot) remains a candidate.
  const rep = scan({ mem: {
    "reference_session_alpha_2026-06-08.md": "trace 08",
    "reference_session_alpha_2026-06-09.md": "trace 09",
    "reference_zulu_clean_ship__2026_06_28.md": "ship 28",
    "reference_zulu_clean_ship__2026_06_29.md": "ship 29",
    "scrutiny-66d55bba-2026-06-28.md": "scrut 28",
    "scrutiny-66d55bba-2026-06-29.md": "scrut 29",
    "reference_hotel_domain_status_2026-06-10.md": "status 10",   // genuine re-version (non-series)
    "reference_hotel_domain_status_2026-06-11.md": "status 11",
  } });
  assert.equal(rep.candidateCount, 1, "only the genuine re-version is flagged; all 3 series excluded");
  assert.equal(rep.candidates[0].newerId, "reference_hotel_domain_status_2026-06-11");
  assert.equal(rep.seriesStemsExcluded, 3, "session + clean_ship + scrutiny stems excluded from candidacy");
});

test("isEpisodicSeriesStem: matches known auto-generated series, spares genuine topic stems", () => {
  for (const s of ["reference_session_alpha", "reference_session_zulu", "reference_zulu_clean_ship", "scrutiny-66d55bba"]) {
    assert.equal(isEpisodicSeriesStem(s), true, `${s} must be treated as an episodic series (not markable)`);
  }
  for (const s of ["reference_hotel_domain_status", "reference_foo", "reference_oscar_sfc_domain_map"]) {
    assert.equal(isEpisodicSeriesStem(s), false, `${s} is a genuine topic (markable re-version)`);
  }
});

test("removeMarker: exact inverse of insertMarker (restores recall visibility), idempotent when unmarked", () => {
  const orig = "---\ntitle: x\n---\n\nreal body line";
  const marked = insertMarker(orig, formatMarker("2026-06-08", "reference_foo_2026-06-09"));
  assert.equal(isSupersededMemory(marked), true, "insertMarker makes it recall-superseded");
  const restored = removeMarker(marked);
  assert.equal(isSupersededMemory(restored), false, "removeMarker strips it -> back in recall");
  assert.match(restored, /real body line/, "real content preserved");
  assert.equal(removeMarker(orig), orig, "idempotent: no-op on an unmarked note");
});

// flat in-memory fs (all files direct children of root, so walkMd needs no recursion) supporting
// the read + walk + write path runUnmarkSeries exercises (no backupRoot -> no mkdir/copy needed).
function flatFs(root, files) {
  const norm = (p) => String(p).replace(/\\/g, "/");
  const store = new Map(Object.entries(files).map(([k, v]) => [`${root}/${k}`, v]));
  return {
    store,
    readdirImpl(p) {
      if (norm(p) !== root) return [];
      return [...store.keys()].map((k) => k.slice(root.length + 1)).filter((n) => !n.includes("/"))
        .map((name) => ({ name, isDirectory: () => false, isFile: () => true }));
    },
    readFileImpl(p) { const k = norm(p); if (!store.has(k)) throw Object.assign(new Error("ENOENT"), { code: "ENOENT" }); return store.get(k); },
    existsImpl(p) { return store.has(norm(p)); },
    writeFileImpl(p, d) { store.set(norm(p), d); },
    renameImpl(s, d) { store.set(norm(d), store.get(norm(s))); store.delete(norm(s)); },
    unlinkImpl(p) { store.delete(norm(p)); },
  };
}

test("runUnmarkSeries: un-marks wrongly-marked episodic-series memos, SPARES genuine re-versions + unmarked (U-SIERRA-SUPERSEDE-SERIES-FIX remediation)", () => {
  const marked = (id) => `---\nx\n---\n\n> **SUPERSEDED 2026-06-08 -- see [[${id}]].**\n\nbody`;
  const fs = flatFs("mem", {
    "reference_session_alpha_2026-06-08.md": marked("reference_session_alpha_2026-06-09"),       // series + marked -> UNMARK
    "reference_session_alpha_2026-06-09.md": "---\nx\n---\n\ncurrent",                            // series, not marked -> skip
    "reference_hotel_domain_status_2026-06-10.md": marked("reference_hotel_domain_status_2026-06-11"), // GENUINE re-version marked -> SPARE
    "reference_zulu_clean_ship__2026_06_28.md": marked("reference_zulu_clean_ship__2026_06_29"),  // series + marked -> UNMARK
  });
  const res = runUnmarkSeries({ memoryRoot: "mem", cMemoryRoot: "cmem", ...fs });
  assert.equal(res.seriesMarked, 2, "two episodic-series memos were marked");
  assert.equal(res.unmarked, 2, "both un-marked");
  assert.equal(res.errors, 0);
  assert.equal(isSupersededMemory(fs.store.get("mem/reference_session_alpha_2026-06-08.md")), false, "session trace restored to recall");
  assert.equal(isSupersededMemory(fs.store.get("mem/reference_zulu_clean_ship__2026_06_28.md")), false, "clean-ship snapshot restored to recall");
  assert.equal(isSupersededMemory(fs.store.get("mem/reference_hotel_domain_status_2026-06-10.md")), true, "GENUINE re-version mark is SPARED (not a series)");
});

test("failure: single-dated stem -> zero candidates", () => {
  const rep = scan({ mem: { "reference_solo_2026-06-15.md": "x" } });
  assert.equal(rep.candidateCount, 0);
  assert.equal(rep.supersessionStems, 0);
});

test("failure: already-marked older counts as alreadyMarked, NOT a candidate", () => {
  const rep = scan({ mem: {
    "reference_q_2026-06-15.md": "---\n---\n> **SUPERSEDED 2026-06-15 -- see [[reference_q_2026-06-16]].**\nold body",
    "reference_q_2026-06-16.md": "new body",
  } });
  assert.equal(rep.alreadyMarked, 1);
  assert.equal(rep.unmarked, 0);
  assert.equal(rep.candidateCount, 0);
  assert.equal(rep.supersessionStems, 1);   // the stem IS a supersession set, just already handled
});

test("adversarial: co-current tie (same stem+date via separator variants) -> nothing superseded", () => {
  // 'reference_baz_2026-06-17.md' and 'reference_baz-2026-06-17.md' both -> stem
  // 'reference_baz', date 2026-06-17. Same max date => neither supersedes the other.
  const rep = scan({ mem: {
    "reference_baz_2026-06-17.md": "x",
    "reference_baz-2026-06-17.md": "y",
  } });
  assert.equal(rep.dated, 2);
  assert.equal(rep.candidateCount, 0);
  assert.equal(rep.supersessionStems, 0);
});

test("adversarial: prefix-sharing stems are NOT merged (reference_foo vs reference_foo_bar)", () => {
  const rep = scan({ mem: {
    "reference_foo_2026-06-15.md": "a",
    "reference_foo_bar_2026-06-16.md": "b",
  } });
  assert.equal(rep.candidateCount, 0);   // two distinct single-member stems
  assert.equal(rep.stems, 2);
});

test("C-source flag: candidate basename present in C: dir -> hasCSource true; absent -> false", () => {
  const rep = scan({
    cmem: { "reference_w_2026-06-15.md": "csrc copy" },          // only the older w lives in C:
    mem: {
      "reference_w_2026-06-15.md": "a", "reference_w_2026-06-16.md": "b",  // C:-sourced pair
      "reference_n_2026-06-15.md": "c", "reference_n_2026-06-16.md": "d",  // H:-native pair
    },
  });
  const byOlder = Object.fromEntries(rep.candidates.map((c) => [c.older, c.hasCSource]));
  assert.equal(byOlder["mem/reference_w_2026-06-15.md"], true);
  assert.equal(byOlder["mem/reference_n_2026-06-15.md"], false);
});

test("archive dirs are skipped (an _archive sibling does not form a supersession set)", () => {
  const rep = scan({ mem: {
    _archive: { "reference_z_2026-06-15.md": "archived" },
    "reference_z_2026-06-16.md": "live",
  } });
  assert.equal(rep.candidateCount, 0);   // only the live 06-16 is seen; archive excluded
  assert.equal(rep.dated, 1);
});

test("missing C: dir is fail-soft (existsImpl false) -> scan still runs, hasCSource all false", () => {
  const rep = scan({ mem: {
    "reference_k_2026-06-15.md": "a", "reference_k_2026-06-16.md": "b",
  } });   // no cmem key at all
  assert.equal(rep.candidateCount, 1);
  assert.equal(rep.candidates[0].hasCSource, false);
});

// ============================ insertMarker ============================
test("insertMarker: inserts after frontmatter, preserves content, recall-readable", () => {
  const raw = "---\nname: x\n---\n\n# Title\nbody line";
  const out = insertMarker(raw, "> **SUPERSEDED 2026-06-15 -- see [[y]].**");
  assert.equal(isSupersededMemory(out), true);                 // the live recall path will exclude it
  assert.match(out, /---\n\n> \*\*SUPERSEDED 2026-06-15 -- see \[\[y\]\]\.\*\*\n\n# Title\nbody line$/);
  assert.match(out, /name: x/);                                // frontmatter untouched
});

test("insertMarker: no frontmatter -> prepend at top", () => {
  const out = insertMarker("just body", "> **SUPERSEDED 2026-06-15 -- see [[y]].**");
  assert.equal(out, "> **SUPERSEDED 2026-06-15 -- see [[y]].**\n\njust body");
  assert.equal(isSupersededMemory(out), true);
});

// ============================ applyMarks ============================
const mk = (over = {}) => ({ olderAbs: "mem/reference/x_2026-06-15.md", base: "x_2026-06-15.md", hasCSource: false, marker: formatMarker("2026-06-15", "x_2026-06-16"), ...over });

test("applyMarks (live): marks H:-native file, backs up the ORIGINAL, content preserved + recall-readable", () => {
  const fs = mutFs({ "mem/reference/x_2026-06-15.md": "---\nname: x\n---\n\n# X\nbody" });
  const res = applyMarks({ candidates: [mk()], backupRoot: "bk", stamp: "S", ...fs });
  assert.equal(res.marked, 1);
  assert.equal(res.errors, 0);
  assert.equal(res.backupDir, "bk/memory-supersession-backup-S");
  const after = fs.store.get("mem/reference/x_2026-06-15.md");
  assert.equal(isSupersededMemory(after), true);
  assert.match(after, /# X\nbody/);                            // original body intact
  // backup holds the PRE-mark original (true reversibility); backupName is hash-prefixed
  const bk = fs.store.get(`bk/memory-supersession-backup-S/${backupName("mem/reference/x_2026-06-15.md")}`);
  assert.equal(isSupersededMemory(bk), false);
  assert.match(bk, /^---\nname: x\n---\n\n# X\nbody$/);
});

test("backupName: injective -- two paths differing only by sep-vs-underscore do NOT collide", () => {
  // the pre-hash flatten aliased these; the hash prefix makes them distinct
  const a = backupName("knowledge/memories/feedback/x.md");
  const b = backupName("knowledge/memories_feedback/x.md");
  assert.notEqual(a, b);
});

test("applyMarks (dry-run): counts but writes NOTHING (write would throw)", () => {
  const fs = mutFs({ "mem/reference/x_2026-06-15.md": "body" });
  fs.writeFileImpl = () => { throw new Error("must not write in dry-run"); };
  const res = applyMarks({ candidates: [mk()], backupRoot: "bk", stamp: "S", dryRun: true, ...fs });
  assert.equal(res.marked, 1);
  assert.equal(res.backupDir, null);
  assert.equal(fs.store.get("mem/reference/x_2026-06-15.md"), "body");   // untouched
});

test("applyMarks: idempotent -- an already-marked target is skipped, never double-marked", () => {
  const fs = mutFs({ "mem/reference/x_2026-06-15.md": "---\n---\n> **SUPERSEDED 2026-06-15 -- see [[x_2026-06-16]].**\nbody" });
  const res = applyMarks({ candidates: [mk()], backupRoot: "bk", stamp: "S", ...fs });
  assert.equal(res.skippedAlreadyMarked, 1);
  assert.equal(res.marked, 0);
});

test("applyMarks: C:-sourced candidate marks BOTH the H: copy (what recall reads) AND the C: source (anti-clobber)", () => {
  const fs = mutFs({
    [`${C_ROOT}/x_2026-06-15.md`]: "---\nname: x\n---\n\nbody",
    "mem/reference/x_2026-06-15.md": "---\nname: x\n---\n\nH body",
  });
  const res = applyMarks({ candidates: [mk({ hasCSource: true })], backupRoot: "bk", stamp: "S", ...fs });
  assert.equal(res.marked, 2);                                                          // both copies
  assert.equal(isSupersededMemory(fs.store.get(`${C_ROOT}/x_2026-06-15.md`)), true);     // C: marked (durable)
  assert.equal(isSupersededMemory(fs.store.get("mem/reference/x_2026-06-15.md")), true); // H: marked (recall)
});

test("applyMarks: C:-sourced but C: source absent -> H: still marked, C: counted missing (no clobber-prevention lost)", () => {
  const fs = mutFs({ "mem/reference/x_2026-06-15.md": "---\n---\nH body" });   // no C: file
  const res = applyMarks({ candidates: [mk({ hasCSource: true })], backupRoot: "bk", stamp: "S", ...fs });
  assert.equal(res.marked, 1);                                                  // H: copy still marked
  assert.equal(res.missing, 1);                                                 // C: source absent, counted
  assert.equal(isSupersededMemory(fs.store.get("mem/reference/x_2026-06-15.md")), true);
});

test("markExitCode (R12 fail-loud): real write errors -> 1; missing/clean/dry-run -> 0", () => {
  assert.equal(markExitCode({ errors: 2 }), 1, "a partial apply (real write/backup/rename errors) fails the step LOUD");
  assert.equal(markExitCode({ errors: 0 }), 0, "a clean apply succeeds");
  assert.equal(markExitCode({ errors: 5, dryRun: true }), 0, "dry-run never fails (it mutates nothing)");
  assert.equal(markExitCode({}), 0, "defaults -> 0 (no errors)");
  // `missing` is NOT an input to markExitCode by design: an absent C: copy is expected and the H:
  // copy recall reads still got marked, so it must never fail the run (see C:-source-absent test above).
});

test("readErrors: an unreadable dated file is counted (R12), not silently dropped, scan continues", () => {
  // wrap the fake readFile so one specific older file throws (locked/EIO), the rest read.
  const fs = makeFs({ mem: {
    "reference_e_2026-06-15.md": "LOCKED", "reference_e_2026-06-16.md": "ok",
    "reference_g_2026-06-15.md": "a", "reference_g_2026-06-16.md": "b",
  } });
  const rep = runSupersessionScan({
    memoryRoot: "mem", cMemoryRoot: "cmem", nowMs: 0,
    readdirImpl: fs.readdirImpl, existsImpl: fs.existsImpl,
    readFileImpl: (p) => {
      if (String(p).replace(/\\/g, "/").endsWith("reference_e_2026-06-15.md")) throw Object.assign(new Error("EIO"), { code: "EIO" });
      return fs.readFileImpl(p);
    },
  });
  assert.equal(rep.readErrors, 1);                 // the locked file is COUNTED
  // the readable g-pair still produces its candidate (scan did not abort)
  assert.equal(rep.candidates.some((c) => c.older === "mem/reference_g_2026-06-15.md"), true);
  // the unreadable e-15 is absent from candidates (dropped from dated[]) but surfaced via readErrors
  assert.equal(rep.candidates.some((c) => c.older === "mem/reference_e_2026-06-15.md"), false);
});
