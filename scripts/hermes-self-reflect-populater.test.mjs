// scripts/hermes-self-reflect-populater.test.mjs
// Tests for U-GALAXY-MS1-B3-HMEMV06 — Hermes self-reflection populater.
// Uses node:test (matches sibling pattern memory-namespace-classifier.test.mjs).

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  snapToSunday,
  isoDateUTC,
  listRecentMemos,
  groupByType,
  topKeywords,
  synthesizeMarkdown,
  run,
} from "./hermes-self-reflect-populater.mjs";

/** Build an injectable fake-fs for unit tests. */
function makeFakeFs(layout) {
  // layout: { "/root/feedback/foo.md": { content: "...", mtimeMs: 123 }, ... }
  return {
    readdirSync(dir) {
      const norm = dir.replace(/\\/g, "/");
      const prefix = norm.endsWith("/") ? norm : norm + "/";
      const names = new Set();
      for (const p of Object.keys(layout)) {
        if (p.startsWith(prefix)) {
          const rest = p.slice(prefix.length);
          if (!rest.includes("/")) names.add(rest);
        }
      }
      if (names.size === 0) {
        const err = new Error(`ENOENT: ${dir}`);
        err.code = "ENOENT";
        throw err;
      }
      return [...names];
    },
    statSync(file) {
      const norm = file.replace(/\\/g, "/");
      const entry = layout[norm];
      if (!entry) throw Object.assign(new Error(`ENOENT: ${file}`), { code: "ENOENT" });
      return { mtimeMs: entry.mtimeMs };
    },
    readFileSync(file, _enc) {
      const norm = file.replace(/\\/g, "/");
      const entry = layout[norm];
      if (!entry) throw Object.assign(new Error(`ENOENT: ${file}`), { code: "ENOENT" });
      return entry.content;
    },
    writeFileSync(file, content, _enc) {
      const norm = file.replace(/\\/g, "/");
      layout[norm] = { content, mtimeMs: Date.now() };
    },
    mkdirSync(_dir, _opts) {
      // no-op for fake
    },
  };
}

const NOW = Date.parse("2026-05-27T12:00:00Z");
const DAY = 24 * 60 * 60 * 1000;

// ───────────── snapToSunday + isoDateUTC ─────────────

describe("snapToSunday", () => {
  it("Sunday stays Sunday (dow=0)", () => {
    const d = new Date("2026-05-24T12:00:00Z"); // Sunday
    assert.equal(snapToSunday(d).toISOString().slice(0, 10), "2026-05-24");
  });

  it("Wednesday snaps back to Sunday", () => {
    const d = new Date("2026-05-27T12:00:00Z"); // Wed
    assert.equal(snapToSunday(d).toISOString().slice(0, 10), "2026-05-24");
  });

  it("Saturday snaps back to Sunday (6 days back)", () => {
    const d = new Date("2026-05-30T12:00:00Z"); // Sat
    assert.equal(snapToSunday(d).toISOString().slice(0, 10), "2026-05-24");
  });

  it("does not mutate the input Date object", () => {
    const d = new Date("2026-05-27T12:00:00Z");
    const before = d.toISOString();
    snapToSunday(d);
    assert.equal(d.toISOString(), before);
  });
});

describe("isoDateUTC", () => {
  it("formats date with zero-padded month/day", () => {
    assert.equal(isoDateUTC(new Date("2026-01-05T00:00:00Z")), "2026-01-05");
    assert.equal(isoDateUTC(new Date("2026-12-31T23:59:59Z")), "2026-12-31");
  });
});

// ───────────── listRecentMemos ─────────────

describe("listRecentMemos", () => {
  it("returns empty array when no memo dirs exist", () => {
    const fs = makeFakeFs({});
    const memos = listRecentMemos({ root: "/r", days: 7, now: NOW, fsImpl: fs });
    assert.deepEqual(memos, []);
  });

  it("includes only files newer than (now - days*86400e3)", () => {
    const fs = makeFakeFs({
      "/r/feedback/recent.md": { content: "# Recent", mtimeMs: NOW - 2 * DAY },
      "/r/feedback/stale.md": { content: "# Stale", mtimeMs: NOW - 30 * DAY },
    });
    const memos = listRecentMemos({ root: "/r", days: 7, now: NOW, fsImpl: fs });
    assert.equal(memos.length, 1);
    assert.equal(memos[0].name, "recent.md");
  });

  it("skips non-.md files", () => {
    const fs = makeFakeFs({
      "/r/feedback/foo.md": { content: "# Foo", mtimeMs: NOW - DAY },
      "/r/feedback/README.txt": { content: "readme", mtimeMs: NOW - DAY },
    });
    const memos = listRecentMemos({ root: "/r", days: 7, now: NOW, fsImpl: fs });
    assert.equal(memos.length, 1);
    assert.equal(memos[0].name, "foo.md");
  });

  it("collects from all 3 type dirs (feedback / reference / project)", () => {
    const fs = makeFakeFs({
      "/r/feedback/a.md": { content: "# A", mtimeMs: NOW - DAY },
      "/r/reference/b.md": { content: "# B", mtimeMs: NOW - DAY },
      "/r/project/c.md": { content: "# C", mtimeMs: NOW - DAY },
    });
    const memos = listRecentMemos({ root: "/r", days: 7, now: NOW, fsImpl: fs });
    assert.equal(memos.length, 3);
    const types = memos.map(m => m.type).sort();
    assert.deepEqual(types, ["feedback", "project", "reference"]);
  });

  it("sorts by mtime descending (newest first)", () => {
    const fs = makeFakeFs({
      "/r/feedback/older.md": { content: "# Older", mtimeMs: NOW - 5 * DAY },
      "/r/feedback/newest.md": { content: "# Newest", mtimeMs: NOW - 1 * DAY },
      "/r/feedback/middle.md": { content: "# Middle", mtimeMs: NOW - 3 * DAY },
    });
    const memos = listRecentMemos({ root: "/r", days: 7, now: NOW, fsImpl: fs });
    assert.deepEqual(memos.map(m => m.name), ["newest.md", "middle.md", "older.md"]);
  });
});

// ───────────── groupByType ─────────────

describe("groupByType", () => {
  it("buckets memos into the 3 canonical types preserving order", () => {
    const memos = [
      { type: "feedback", name: "f1.md" },
      { type: "reference", name: "r1.md" },
      { type: "feedback", name: "f2.md" },
      { type: "project", name: "p1.md" },
    ];
    const g = groupByType(memos);
    assert.equal(g.feedback.length, 2);
    assert.equal(g.reference.length, 1);
    assert.equal(g.project.length, 1);
    assert.equal(g.feedback[0].name, "f1.md");
    assert.equal(g.feedback[1].name, "f2.md");
  });

  it("ignores memos of unknown type (defensive)", () => {
    const memos = [
      { type: "feedback", name: "f.md" },
      { type: "unknown_xyz", name: "x.md" },
    ];
    const g = groupByType(memos);
    assert.equal(g.feedback.length, 1);
    assert.equal(g.reference.length, 0);
    assert.equal(g.project.length, 0);
  });
});

// ───────────── topKeywords ─────────────

describe("topKeywords", () => {
  it("returns most frequent words with stop-word filter", () => {
    const memos = [
      { content: "kienzle kienzle spindle the the and" },
      { content: "kienzle mill mill the" },
    ];
    const top = topKeywords(memos, 5);
    assert.equal(top[0][0], "kienzle");
    assert.equal(top[0][1], 3);
    assert.ok(top.find(([w]) => w === "mill"));
    assert.ok(!top.find(([w]) => w === "the"));
  });

  it("respects k cap", () => {
    const memos = [{ content: "alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu nu" }];
    const top = topKeywords(memos, 3);
    assert.equal(top.length, 3);
  });

  it("returns empty array for empty input", () => {
    assert.deepEqual(topKeywords([], 5), []);
  });

  it("ignores words shorter than 3 chars and pure numbers", () => {
    const memos = [{ content: "a b c 12 123 mill mill" }];
    const top = topKeywords(memos, 5);
    assert.equal(top.length, 1);
    assert.equal(top[0][0], "mill");
  });
});

// ───────────── synthesizeMarkdown ─────────────

describe("synthesizeMarkdown", () => {
  it("produces frontmatter + headings + per-type sections + footer", () => {
    const md = synthesizeMarkdown({
      grouped: {
        feedback: [
          { path: "/r/feedback/a.md", name: "a.md", mtimeMs: NOW - DAY, content: "# Title A\nbody" },
        ],
        reference: [],
        project: [],
      },
      keywords: [["kienzle", 3], ["mill", 2]],
      anchor: "2026-05-24",
      days: 7,
      total: 1,
    });
    assert.match(md, /^---\ntitle: "Hermes weekly self-reflection \(anchor 2026-05-24\)"/);
    assert.match(md, /memo_count: 1/);
    assert.match(md, /## Top recurring keywords/);
    assert.match(md, /`kienzle` × 3/);
    assert.match(md, /## Feedback \(1\)/);
    assert.match(md, /Title A/);
    assert.match(md, /## Reference \(0\)/);
    assert.match(md, /_\(none in window\)_/);
    assert.match(md, /U-GALAXY-MS1-B3-HMEMV06/);
  });

  it("emits 'no keywords' placeholder when keywords array empty", () => {
    const md = synthesizeMarkdown({
      grouped: { feedback: [], reference: [], project: [] },
      keywords: [],
      anchor: "2026-05-24",
      days: 7,
      total: 0,
    });
    assert.match(md, /_\(no keywords — no memos in window\)_/);
  });

  it("falls back to file name when no level-1 heading in memo content", () => {
    const md = synthesizeMarkdown({
      grouped: {
        feedback: [
          { path: "/r/feedback/no-heading.md", name: "no-heading.md", mtimeMs: NOW, content: "body without heading" },
        ],
        reference: [],
        project: [],
      },
      keywords: [],
      anchor: "2026-05-24",
      days: 7,
      total: 1,
    });
    assert.match(md, /no-heading\.md.*no-heading\.md/);
  });
});

// ───────────── run (integration through fake-fs) ─────────────

describe("run", () => {
  it("happy path: 3 memos across 3 types → markdown file written + summary returned", () => {
    const fs = makeFakeFs({
      "/r/feedback/karpathy.md": { content: "# Karpathy R1\nthink simplify surgical", mtimeMs: NOW - DAY },
      "/r/reference/kienzle.md": { content: "# Kienzle calc\nkienzle force mill", mtimeMs: NOW - 2 * DAY },
      "/r/project/jm-die.md": { content: "# JM Die\ncustomer programs", mtimeMs: NOW - 3 * DAY },
    });
    const r = run({ root: "/r", days: 7, now: NOW, fsImpl: fs, out: "/out/weekly.md" });
    assert.equal(r.ok, true);
    assert.equal(r.memo_count, 3);
    assert.equal(r.by_type.feedback, 1);
    assert.equal(r.by_type.reference, 1);
    assert.equal(r.by_type.project, 1);
    assert.equal(r.anchor, "2026-05-24"); // 2026-05-27 (Wed) snaps to Sun
    assert.ok(fs.readFileSync("/out/weekly.md", "utf8").includes("Karpathy R1"));
  });

  it("zero memos: still writes a digest with 'none in window' placeholders", () => {
    const fs = makeFakeFs({});
    const r = run({ root: "/r", days: 7, now: NOW, fsImpl: fs, out: "/out/empty.md" });
    assert.equal(r.ok, true);
    assert.equal(r.memo_count, 0);
    const md = fs.readFileSync("/out/empty.md", "utf8");
    assert.match(md, /memo_count: 0/);
    assert.match(md, /_\(no keywords/);
  });

  it("explicit anchor overrides the snap-to-Sunday default", () => {
    const fs = makeFakeFs({});
    const r = run({ root: "/r", days: 7, now: NOW, anchor: "2026-01-01", fsImpl: fs, out: "/out/x.md" });
    assert.equal(r.anchor, "2026-01-01");
  });

  it("writeFileSync failure returns {ok:false, error}", () => {
    const fs = {
      readdirSync() { throw Object.assign(new Error("ENOENT"), { code: "ENOENT" }); },
      mkdirSync() {},
      writeFileSync() { throw new Error("EACCES: disk full"); },
    };
    const r = run({ root: "/r", days: 7, now: NOW, fsImpl: fs, out: "/out/x.md" });
    assert.equal(r.ok, false);
    assert.match(r.error, /EACCES/);
  });

  it("default output path = {root}/weekly-hermes-reflection-<anchor>.md", () => {
    const fs = makeFakeFs({});
    const r = run({ root: "/r", days: 7, now: NOW, fsImpl: fs });
    assert.equal(r.ok, true);
    assert.match(r.path.replace(/\\/g, "/"), /\/r\/weekly-hermes-reflection-2026-05-24\.md$/);
  });
});
