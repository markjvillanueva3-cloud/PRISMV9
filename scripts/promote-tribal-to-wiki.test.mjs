// Hermetic node:test for promote-tribal-to-wiki.mjs. Covers parser + filter +
// builder + e2e via injected fake-fs. NO real disk for the 3919-file corpus —
// tests must complete in <2s.

import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  parseTribalFrontmatter,
  shouldPromote,
  buildWikiEntry,
  enumerateTribalFiles,
  runPromotion,
} from "./promote-tribal-to-wiki.mjs";

const SAMPLE_TRIBAL = `---
id: "bc-001"
title: "Adaptive Roughing Maintains Constant Tool Engagement"
source: "web:bobcad-adaptive-roughing"
confidence: 93
category: "cam_strategy"
tags: ["adaptive-roughing", "trochoidal", "constant-engagement"]
_source: "bobcad-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.000Z
---

Adaptive roughing keeps stepover constant by computing tool engagement
along the path, swinging the cutter around corners to avoid spike loads.
`;

function makeFakeFs(files) {
  const norm = (p) => String(p).replace(/\\/g, "/");
  const bodies = new Map();
  const dirs = new Set();
  for (const [path, body] of Object.entries(files)) {
    const k = norm(path);
    bodies.set(k, body);
    let parent = k.split("/").slice(0, -1).join("/");
    while (parent) { dirs.add(parent); parent = parent.split("/").slice(0, -1).join("/"); }
  }
  const written = new Map();
  const renames = [];
  const mkdirs = new Set();
  const existsImpl = (p) => {
    const k = norm(p);
    return bodies.has(k) || dirs.has(k) || written.has(k) || mkdirs.has(k);
  };
  const readdirImpl = (dir) => {
    const out = [];
    const prefix = norm(dir) + "/";
    for (const path of bodies.keys()) {
      if (path.startsWith(prefix)) {
        const rest = path.slice(prefix.length);
        if (!rest.includes("/")) out.push(rest);
      }
    }
    return out;
  };
  const statImpl = (p) => {
    const k = norm(p);
    if (bodies.has(k)) return {
      size: Buffer.byteLength(bodies.get(k), "utf8"),
      isFile: () => true,
      isDirectory: () => false,
    };
    if (dirs.has(k)) return { size: 0, isFile: () => false, isDirectory: () => true };
    throw new Error("ENOENT " + p);
  };
  const readFileImpl = (p) => {
    const k = norm(p);
    if (!bodies.has(k)) throw new Error("ENOENT " + p);
    return bodies.get(k);
  };
  const writeFileImpl = (p, data) => written.set(norm(p), data);
  const renameImpl = (from, to) => {
    const data = written.get(norm(from));
    written.delete(norm(from));
    written.set(norm(to), data);
    renames.push([norm(from), norm(to)]);
  };
  const mkdirImpl = (p) => mkdirs.add(norm(p));
  return { existsImpl, readdirImpl, statImpl, readFileImpl, writeFileImpl, renameImpl, mkdirImpl, written, renames, mkdirs };
}

describe("parseTribalFrontmatter", () => {
  it("parses a well-formed tribal entry", () => {
    const r = parseTribalFrontmatter(SAMPLE_TRIBAL);
    assert.ok(r);
    assert.equal(r.fm.id, "bc-001");
    assert.equal(r.fm.title, "Adaptive Roughing Maintains Constant Tool Engagement");
    assert.equal(r.fm.confidence, 93);
    assert.equal(r.fm.category, "cam_strategy");
    assert.deepEqual(r.fm.tags, ["adaptive-roughing", "trochoidal", "constant-engagement"]);
    assert.match(r.body, /Adaptive roughing keeps stepover/);
  });

  it("returns null on body without frontmatter", () => {
    assert.equal(parseTribalFrontmatter("plain body, no frontmatter"), null);
  });

  it("returns null on unterminated frontmatter", () => {
    assert.equal(parseTribalFrontmatter("---\nid: x\nno-close-marker"), null);
  });

  it("returns null on non-string input", () => {
    assert.equal(parseTribalFrontmatter(null), null);
    assert.equal(parseTribalFrontmatter(undefined), null);
    assert.equal(parseTribalFrontmatter(42), null);
  });

  it("converts confidence to number", () => {
    const r = parseTribalFrontmatter(SAMPLE_TRIBAL);
    assert.equal(typeof r.fm.confidence, "number");
  });

  it("strips matching quotes from string values", () => {
    const r = parseTribalFrontmatter(SAMPLE_TRIBAL);
    assert.equal(r.fm.id, "bc-001");
    assert.equal(r.fm.id.startsWith('"'), false);
  });
});

describe("shouldPromote", () => {
  it("passes confidence >= threshold", () => {
    assert.equal(shouldPromote({ confidence: 93 }, 90), true);
    assert.equal(shouldPromote({ confidence: 90 }, 90), true);
  });
  it("rejects confidence < threshold", () => {
    assert.equal(shouldPromote({ confidence: 89 }, 90), false);
  });
  it("rejects non-numeric confidence", () => {
    assert.equal(shouldPromote({ confidence: "high" }, 90), false);
    assert.equal(shouldPromote({}, 90), false);
  });
  it("rejects null/undefined fm", () => {
    assert.equal(shouldPromote(null, 90), false);
    assert.equal(shouldPromote(undefined, 90), false);
  });
});

describe("buildWikiEntry", () => {
  it("emits wiki frontmatter with required fields", () => {
    const { fm, body } = parseTribalFrontmatter(SAMPLE_TRIBAL);
    const e = buildWikiEntry({ fm, body, sourceFileName: "bobcad-cam-tips-bc-001.md" });
    assert.ok(e);
    assert.equal(e.slug, "tribal-bc-001");
    assert.equal(e.fileName, "tribal-bc-001.md");
    assert.match(e.content, /^---\n/);
    assert.match(e.content, /^name: tribal-bc-001/m);
    assert.match(e.content, /^category: code-tribal/m);
    assert.match(e.content, /^subdomain: cam_strategy/m);
    assert.match(e.content, /^domain: tribal-knowledge/m);
    assert.match(e.content, /^confidence: 93/m);
    assert.match(e.content, /^promoted_from: knowledge\/tribal\//m);
    assert.match(e.content, /^promoted_at: \d{4}-\d{2}-\d{2}/m);
  });

  it("preserves tags as JSON array", () => {
    const { fm, body } = parseTribalFrontmatter(SAMPLE_TRIBAL);
    const e = buildWikiEntry({ fm, body, sourceFileName: "bobcad-cam-tips-bc-001.md" });
    assert.match(e.content, /tags: \["adaptive-roughing"/);
  });

  it("derives slug from id when present, else fileName", () => {
    const e1 = buildWikiEntry({
      fm: { id: "xyz", confidence: 90, tags: [] },
      body: "",
      sourceFileName: "anything.md",
    });
    assert.equal(e1.slug, "tribal-xyz");

    const e2 = buildWikiEntry({
      fm: { confidence: 90, tags: [] },
      body: "",
      sourceFileName: "fallback.md",
    });
    assert.equal(e2.slug, "tribal-fallback");
  });

  it("sanitizes slug — non-word chars become dashes", () => {
    const e = buildWikiEntry({
      fm: { id: "a/b*c", confidence: 90, tags: [] },
      body: "",
      sourceFileName: "x.md",
    });
    assert.equal(/^[A-Za-z0-9_-]+$/.test(e.slug), true);
  });

  it("returns null on missing fm", () => {
    assert.equal(buildWikiEntry({ fm: null, body: "x", sourceFileName: "x.md" }), null);
  });

  it("adds heading when body lacks one", () => {
    const e = buildWikiEntry({
      fm: { id: "x", title: "My Tip", confidence: 90, tags: [] },
      body: "Plain body, no h1.",
      sourceFileName: "x.md",
    });
    assert.match(e.content, /^# My Tip$/m);
  });

  it("does not double-add heading when body has one", () => {
    const e = buildWikiEntry({
      fm: { id: "x", title: "My Tip", confidence: 90, tags: [] },
      body: "# Existing Heading\n\nBody",
      sourceFileName: "x.md",
    });
    const headingCount = (e.content.match(/^# /gm) || []).length;
    assert.equal(headingCount, 1);
  });
});

describe("enumerateTribalFiles", () => {
  it("returns top-level .md files only (skips subdirs)", () => {
    const fs = makeFakeFs({
      "/v/a.md": "x",
      "/v/b.md": "x",
      "/v/sub/c.md": "x",
      "/v/notmd.txt": "x",
    });
    const out = enumerateTribalFiles({
      tribalRoot: "/v",
      readdirImpl: fs.readdirImpl,
      statImpl: fs.statImpl,
    });
    const names = out.map((f) => f.fileName).sort();
    assert.deepEqual(names, ["a.md", "b.md"]);
  });

  it("returns empty array when root missing", () => {
    const fs = makeFakeFs({});
    const out = enumerateTribalFiles({
      tribalRoot: "/v",
      readdirImpl: fs.readdirImpl,
      statImpl: fs.statImpl,
    });
    assert.deepEqual(out, []);
  });
});

describe("runPromotion (e2e via fake fs)", () => {
  it("promotes above-threshold + skips existing + respects dry-run default", () => {
    const fs = makeFakeFs({
      "/v/a.md": SAMPLE_TRIBAL,
      "/v/b.md": SAMPLE_TRIBAL.replace(/confidence: 93/, "confidence: 85"),
      "/v/c.md": SAMPLE_TRIBAL.replace(/id: "bc-001"/, 'id: "bc-001"').replace(/confidence: 93/, "confidence: 92"),
    });
    const r = runPromotion({
      tribalRoot: "/v",
      wikiTarget: "/w",
      threshold: 90,
      apply: false,
      readdirImpl: fs.readdirImpl,
      readFileImpl: fs.readFileImpl,
      statImpl: fs.statImpl,
      existsImpl: fs.existsImpl,
      writeFileImpl: fs.writeFileImpl,
      renameImpl: fs.renameImpl,
      mkdirImpl: fs.mkdirImpl,
    });
    assert.equal(r.totalScanned, 3);
    assert.equal(r.aboveThreshold, 2);
    assert.equal(r.candidates.length, 2);
    assert.equal(r.promoted, 0);
    assert.equal(fs.written.size, 0);
  });

  it("with --apply, writes via .tmp+rename (atomic)", () => {
    const fs = makeFakeFs({ "/v/a.md": SAMPLE_TRIBAL });
    const r = runPromotion({
      tribalRoot: "/v",
      wikiTarget: "/w",
      threshold: 90,
      apply: true,
      readdirImpl: fs.readdirImpl,
      readFileImpl: fs.readFileImpl,
      statImpl: fs.statImpl,
      existsImpl: fs.existsImpl,
      writeFileImpl: fs.writeFileImpl,
      renameImpl: fs.renameImpl,
      mkdirImpl: fs.mkdirImpl,
    });
    assert.equal(r.promoted, 1);
    assert.equal(fs.renames.length, 1);
    assert.ok(fs.renames[0][0].includes(".tmp."));
    assert.equal(fs.renames[0][1], "/w/tribal-bc-001.md");
    assert.equal(fs.written.has("/w/tribal-bc-001.md"), true);
  });

  it("skips when target already exists (no overwrite)", () => {
    const fs = makeFakeFs({
      "/v/a.md": SAMPLE_TRIBAL,
      "/w/tribal-bc-001.md": "existing",
    });
    const r = runPromotion({
      tribalRoot: "/v",
      wikiTarget: "/w",
      threshold: 90,
      apply: true,
      readdirImpl: fs.readdirImpl,
      readFileImpl: fs.readFileImpl,
      statImpl: fs.statImpl,
      existsImpl: fs.existsImpl,
      writeFileImpl: fs.writeFileImpl,
      renameImpl: fs.renameImpl,
      mkdirImpl: fs.mkdirImpl,
    });
    assert.equal(r.skippedExisting, 1);
    assert.equal(r.promoted, 0);
  });

  it("respects --limit cap", () => {
    const corpus = {};
    for (let i = 0; i < 10; i++) {
      corpus[`/v/x${i}.md`] = SAMPLE_TRIBAL.replace(/id: "bc-001"/, `id: "xx-${i}"`);
    }
    const fs = makeFakeFs(corpus);
    const r = runPromotion({
      tribalRoot: "/v",
      wikiTarget: "/w",
      threshold: 90,
      apply: true,
      limit: 3,
      readdirImpl: fs.readdirImpl,
      readFileImpl: fs.readFileImpl,
      statImpl: fs.statImpl,
      existsImpl: fs.existsImpl,
      writeFileImpl: fs.writeFileImpl,
      renameImpl: fs.renameImpl,
      mkdirImpl: fs.mkdirImpl,
    });
    assert.equal(r.promoted, 3);
  });

  it("skips malformed entries (no frontmatter) without throwing", () => {
    const fs = makeFakeFs({
      "/v/good.md": SAMPLE_TRIBAL,
      "/v/bad.md": "no frontmatter at all",
    });
    const r = runPromotion({
      tribalRoot: "/v",
      wikiTarget: "/w",
      threshold: 90,
      apply: true,
      readdirImpl: fs.readdirImpl,
      readFileImpl: fs.readFileImpl,
      statImpl: fs.statImpl,
      existsImpl: fs.existsImpl,
      writeFileImpl: fs.writeFileImpl,
      renameImpl: fs.renameImpl,
      mkdirImpl: fs.mkdirImpl,
    });
    assert.equal(r.totalScanned, 2);
    assert.equal(r.skippedMalformed, 1);
    assert.equal(r.promoted, 1);
  });
});

describe("end-to-end (real fs in tmpdir)", () => {
  it("round-trips through real disk + readback", () => {
    const tmp = mkdtempSync(join(tmpdir(), "tribal-promote-"));
    try {
      const tribal = join(tmp, "tribal");
      const wiki = join(tmp, "wiki");
      mkdirSync(tribal, { recursive: true });
      writeFileSync(join(tribal, "src-bc-001.md"), SAMPLE_TRIBAL);

      const r = runPromotion({
        tribalRoot: tribal,
        wikiTarget: wiki,
        threshold: 90,
        apply: true,
      });
      assert.equal(r.promoted, 1);
      assert.equal(existsSync(join(wiki, "tribal-bc-001.md")), true);
      const round = readFileSync(join(wiki, "tribal-bc-001.md"), "utf8");
      assert.match(round, /^name: tribal-bc-001/m);
      assert.match(round, /Adaptive roughing keeps stepover/);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});
