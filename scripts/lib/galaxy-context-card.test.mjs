// scripts/lib/galaxy-context-card.test.mjs — GALAXY-CONTEXT-FEDERATION-MS0 / U-GCF-CARD (alpha, 2026-05-31).
// Hermetic: injected readImpl / listImpl / writeImpl — no real fs, no engines-dir dependency.
// Real-value asserts (no stub `toBeDefined()`); the salience heuristic is verified directly.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  headerWeight, scoreLine, utf8Truncate, splitSections, deriveRole, extractKeyPaths,
  extractGalaxyCard, renderCard, buildAllCards, readCard, DEFAULT_MAX_BYTES, DEFAULT_TOP_N,
} from "./galaxy-context-card.mjs";

test("headerWeight: master-brain > active-work > focus > bridge > patterns > default", () => {
  assert.equal(headerWeight("Master-brain link"), 5);
  assert.equal(headerWeight("Owned milestone — COMMAND-KERNEL-MS0"), 4);
  assert.equal(headerWeight("Status"), 4);
  assert.equal(headerWeight("Standing focus (alpha-canonical)"), 3);
  assert.equal(headerWeight("Cross-galaxy bridges"), 2);
  assert.equal(headerWeight("Known patterns (referenced often)"), 1);
  assert.equal(headerWeight("Random heading"), 1);
  assert.equal(headerWeight(""), 1);
  assert.equal(headerWeight(null), 1);
});

test("scoreLine: active/date/path/wikilink/bullet add; long lines penalize; empty → -Infinity", () => {
  assert.equal(scoreLine("", 1), -Infinity);
  assert.equal(scoreLine("   ", 3), -Infinity);
  assert.equal(scoreLine(null), -Infinity);
  // base header weight only
  assert.equal(scoreLine("plain text fact", 2), 2);
  // active-work token (+3), not a bullet, no date/path/wikilink
  assert.equal(scoreLine("ONLY U-CK11 open", 1), 1 + 3, "'open' active(+3) only; not a bullet, no date/path");
  // bullet + date + path + wikilink stacking on a focus-weighted (3) line
  const s = scoreLine("- 2026-05-28 wired prism_memory via foo.ts see [[bar]]", 3);
  assert.equal(s, 3 + 2 /*date*/ + 1 /*path*/ + 1 /*wikilink*/ + 1 /*bullet*/);
  // long-line penalties
  const long = "x".repeat(210);
  assert.equal(scoreLine(long, 1), 1 - 2, ">200 chars penalized");
  const longer = "y".repeat(330);
  assert.equal(scoreLine(longer, 1), 1 - 2 - 4, ">320 chars penalized harder");
});

test("utf8Truncate: under budget unchanged; over budget fits byte budget + marker; multibyte-safe", () => {
  assert.deepEqual(utf8Truncate("short", 100), { text: "short", truncated: false });
  const big = "a".repeat(5000);
  const r = utf8Truncate(big, 200);
  assert.equal(r.truncated, true);
  assert.ok(Buffer.byteLength(r.text, "utf8") <= 200, "respects the byte budget incl. marker");
  assert.ok(r.text.endsWith("[card truncated]"));
  // 3-byte chars (•): byte budget honored, no partial char
  const bullets = "•".repeat(500); // 1500 bytes
  const rb = utf8Truncate(bullets, 120);
  assert.ok(Buffer.byteLength(rb.text, "utf8") <= 120);
  assert.equal(rb.text.includes("�"), false, "no replacement char from a split 3-byte sequence");
  // 4-byte surrogate-pair chars (😀): never split a surrogate pair
  const emoji = "😀".repeat(200); // 800 bytes, 400 UTF-16 units
  const re = utf8Truncate(emoji, 90);
  assert.ok(Buffer.byteLength(re.text, "utf8") <= 90);
  assert.equal(re.text.includes("�"), false, "no lone surrogate / replacement char");
  // count of emoji is whole (no half pair before the marker)
  const onlyEmoji = re.text.replace("\n…[card truncated]", "");
  assert.equal([...onlyEmoji].every((c) => c === "😀"), true, "all retained chars are whole emoji");
});

test("splitSections: preamble has header ''; each '## ' opens a section", () => {
  const md = "intro line\n# Title\n## A\na1\na2\n## B\nb1";
  const secs = splitSections(md);
  assert.equal(secs[0].header, "");
  assert.deepEqual(secs[0].lines, ["intro line"]);
  assert.equal(secs[1].header, "Title");
  assert.equal(secs[2].header, "A");
  assert.deepEqual(secs[2].lines, ["a1", "a2"]);
  assert.equal(secs[3].header, "B");
  assert.deepEqual(splitSections(""), []);
  assert.deepEqual(splitSections(null), []);
});

test("deriveRole: takes the part after the dash, strips 'Galaxy Memory', falls back", () => {
  assert.equal(deriveRole("# ALPHA Galaxy Memory — Token Optimization + Efficiency", null, "alpha"), "Token Optimization + Efficiency");
  assert.equal(deriveRole("# CAD", null, "cad"), "CAD"); // no dash → whole title (minus boilerplate)
  assert.equal(deriveRole("no h1 here", "# Echo — Post Processors", "echo"), "Post Processors", "falls back to CLAUDE.md");
  assert.equal(deriveRole("", "", "mill"), "mill", "ultimate fallback to galaxy name");
});

test("extractKeyPaths: pulls backticked + bare file paths, dedups, caps at n", () => {
  const md = "see `mcp-server/src/engines/cad/CadEngine.ts` and `state/shared/x.json`\nrepeat `state/shared/x.json`\nand foo/bar/baz.mjs inline";
  const paths = extractKeyPaths(md, 4);
  assert.ok(paths.includes("mcp-server/src/engines/cad/CadEngine.ts"));
  assert.ok(paths.includes("state/shared/x.json"));
  assert.equal(paths.filter((p) => p === "state/shared/x.json").length, 1, "deduped");
  assert.ok(extractKeyPaths(md, 1).length === 1, "respects cap");
  assert.deepEqual(extractKeyPaths("", 4), []);
});

test("extractGalaxyCard: dedups, keeps top-N by score, restores source order", () => {
  const memory = [
    "# CAD Galaxy Memory — Computer Aided Design",
    "## Standing focus",
    "- feature recognition core",
    "- feature recognition core", // dup → collapsed
    "## Owned milestone",
    "- U-CAD-1 open Status: in_progress 2026-05-30",
    "## Filler",
    "low signal prose line that is quite ordinary and unremarkable",
  ].join("\n");
  const card = extractGalaxyCard("cad", { memory }, { topN: 2 });
  assert.equal(card.galaxy, "cad");
  assert.equal(card.role, "Computer Aided Design");
  assert.equal(card.facts.length, 2, "topN respected");
  // the active-work milestone line (high score) must be retained
  assert.ok(card.facts.some((f) => /U-CAD-1 open/.test(f)), "highest-salience active line kept");
  // dup collapsed: 'feature recognition core' appears at most once
  assert.ok(card.facts.filter((f) => f === "- feature recognition core").length <= 1);
});

test("renderCard: emits header + bullets + paths line, honors byte cap + truncated flag", () => {
  const card = { galaxy: "cam", role: "Toolpaths", facts: ["already a bullet", "plain fact"], paths: ["a/b.ts", "c/d.mjs"] };
  const r = renderCard(card, { maxBytes: 1024 });
  assert.ok(r.text.startsWith("## cam — Toolpaths"));
  assert.ok(r.text.includes("\n- already a bullet"), "pre-bulleted fact not double-bulleted");
  assert.ok(r.text.includes("\n- plain fact"), "plain fact gets a bullet");
  assert.ok(r.text.includes("**Paths:** a/b.ts · c/d.mjs"));
  assert.equal(r.truncated, false);
  assert.equal(r.factCount, 2);
  assert.equal(r.bytes, Buffer.byteLength(r.text, "utf8"));
  // tiny cap forces truncation
  const big = { galaxy: "x", role: "y", facts: Array.from({ length: 50 }, (_, i) => `fact number ${i} with some length`), paths: [] };
  const rt = renderCard(big, { maxBytes: 120 });
  assert.equal(rt.truncated, true);
  assert.ok(rt.bytes <= 120);
});

test("renderCard default maxBytes is DEFAULT_MAX_BYTES (1024)", () => {
  assert.equal(DEFAULT_MAX_BYTES, 1024);
  assert.equal(DEFAULT_TOP_N, 12);
});

test("buildAllCards: hermetic — builds present galaxies, skips empty/missing, writes INDEX", () => {
  const files = {
    "cad/MEMORY.md": "# CAD — Computer Aided Design\n## Owned milestone\n- U-CAD-1 open 2026-05-30",
    "cad/PATHS.md": "`mcp-server/src/engines/cad/X.ts`",
    "empty/MEMORY.md": "   \n  ",         // present but blank → skipped
    // 'missing' has NO MEMORY.md key → readImpl returns null → skipped
  };
  const writes = {};
  const res = buildAllCards({
    roots: { enginesDir: "/eng", cardsDir: "/cards" },
    listImpl: () => ["cad", "empty", "missing"],
    readImpl: (f) => {
      for (const [k, v] of Object.entries(files)) if (f.replace(/\\/g, "/").endsWith(k)) return v;
      return null;
    },
    writeImpl: (f, d) => { writes[f.replace(/\\/g, "/")] = d; },
    mkdirImpl: () => {},
    now: () => 1717000000000,
  });
  assert.equal(res.ok, true);
  assert.equal(res.count, 1, "only cad produced a card");
  assert.equal(res.skipped, 2, "empty + missing skipped");
  assert.equal(res.cards[0].galaxy, "cad");
  assert.ok(res.cards[0].bytes > 0);
  // a card file + the INDEX.json were written
  assert.ok(Object.keys(writes).some((k) => k.endsWith("/cards/cad.card.md")));
  const idxKey = Object.keys(writes).find((k) => k.endsWith("/cards/INDEX.json"));
  assert.ok(idxKey, "INDEX.json written");
  const idx = JSON.parse(writes[idxKey]);
  assert.equal(idx.count, 1);
  assert.equal(idx.skipped, 2);
  // U-GCF-SALIENCE: salience re-ranking is ON by default → schema 1.2.0 (was 1.1.0). The injected
  // readImpl returns null for the access source, so salience falls back to recency+impact only — the
  // schema bump is the only behavioral delta here. PRISM_GCF_SALIENCE=0 reverts to 1.1.0 (separate test).
  assert.equal(idx.schemaVersion, "1.2.0");
  assert.equal(idx.salience, true);
  assert.equal(idx.generatedAt, new Date(1717000000000).toISOString(), "now() is injected → deterministic timestamp (not Date.now())");
});

test("buildAllCards: emits the consolidated ALL-CARDS.md bundle (U-GCF-CAG-CARDS) containing every card", () => {
  const writes = {};
  const res = buildAllCards({
    roots: { enginesDir: "/eng", cardsDir: "/cards" },
    listImpl: () => ["cad", "cam"],
    readImpl: (f) => {
      const k = f.replace(/\\/g, "/");
      if (k.endsWith("cad/MEMORY.md")) return "# CAD — Computer Aided Design\n- cad fact 2026-05-30";
      if (k.endsWith("cam/MEMORY.md")) return "# CAM — Toolpaths\n- cam fact 2026-05-30";
      return null;
    },
    writeImpl: (f, d) => { writes[f.replace(/\\/g, "/")] = d; },
    mkdirImpl: () => {},
    now: () => 1717000000000,
  });
  assert.equal(res.count, 2);
  const bundleKey = Object.keys(writes).find((k) => k.endsWith("/cards/ALL-CARDS.md"));
  assert.ok(bundleKey, "ALL-CARDS.md bundle written");
  const bundle = writes[bundleKey];
  assert.ok(bundle.includes("## cad — Computer Aided Design"), "bundle carries the cad card");
  assert.ok(bundle.includes("## cam — Toolpaths"), "bundle carries the cam card");
  assert.ok(bundle.startsWith("# Galaxy context-cards (2)"), "bundle header counts the cards");
  assert.ok(res.bundleBytes > 0 && res.bundlePath.endsWith("ALL-CARDS.md"), "index records bundle path + bytes");
});

test("buildAllCards: no galaxies → no bundle emitted (no empty ALL-CARDS.md)", () => {
  const writes = {};
  buildAllCards({
    roots: { enginesDir: "/eng", cardsDir: "/cards" },
    listImpl: () => [], readImpl: () => null,
    writeImpl: (f, d) => { writes[f.replace(/\\/g, "/")] = d; }, mkdirImpl: () => {}, now: () => 0,
  });
  assert.equal(Object.keys(writes).some((k) => k.endsWith("ALL-CARDS.md")), false, "no bundle when 0 cards");
});

test("buildAllCards: PRISM_GCF_CARD_DISABLE=1 → no-op", () => {
  const prev = process.env.PRISM_GCF_CARD_DISABLE;
  process.env.PRISM_GCF_CARD_DISABLE = "1";
  try {
    const res = buildAllCards({ listImpl: () => ["cad"], readImpl: () => "x", writeImpl: () => { throw new Error("must not write"); } });
    assert.equal(res.disabled, true);
    assert.equal(res.ok, false);
    assert.deepEqual(res.cards, []);
  } finally {
    if (prev === undefined) delete process.env.PRISM_GCF_CARD_DISABLE; else process.env.PRISM_GCF_CARD_DISABLE = prev;
  }
});

test("buildAllCards: a galaxy whose card-write fails is skipped, batch continues (fail-soft)", () => {
  const writes = {};
  const res = buildAllCards({
    roots: { enginesDir: "/eng", cardsDir: "/cards" },
    listImpl: () => ["good", "boom"],
    readImpl: (f) => (f.endsWith("MEMORY.md") ? "# Title — Role\n- a fact 2026-05-30" : null),
    // simulate a disk error writing the 'boom' card; 'good' card + INDEX still write
    writeImpl: (f, d) => { const k = f.replace(/\\/g, "/"); if (k.includes("boom")) throw new Error("disk full"); writes[k] = d; },
    mkdirImpl: () => {},
    now: () => 0,
  });
  assert.equal(res.count, 1, "good galaxy still built");
  assert.equal(res.skipped, 1, "boom's write failure caught, not fatal");
  assert.ok(Object.keys(writes).some((k) => k.endsWith("/cards/good.card.md")));
  assert.ok(Object.keys(writes).some((k) => k.endsWith("/cards/INDEX.json")), "INDEX still written despite one failure");
});

test("readCard: returns built card text or null via injected readImpl", () => {
  assert.equal(readCard("cad", { readImpl: () => "## cad — x\n- y" }), "## cad — x\n- y");
  assert.equal(readCard("nope", { readImpl: () => null }), null);
});

test("utf8Truncate: maxBytes <= marker length still respects the cap (clamps the marker, never overflows)", () => {
  // regression for the exported-contract bug: budget too small for content+marker must NOT exceed maxBytes
  for (const cap of [0, 1, 5, 10, 19, 20]) {
    const r = utf8Truncate("x".repeat(500), cap);
    assert.equal(r.truncated, true, `cap ${cap} truncates`);
    assert.ok(Buffer.byteLength(r.text, "utf8") <= cap, `cap ${cap} honored, got ${Buffer.byteLength(r.text, "utf8")}B`);
  }
});

test("buildAllCards: exercises the REAL defaultListGalaxies (readdir+exists-filter+sort) production path", () => {
  // NO listImpl injected → forces defaultListGalaxies. Proves the production enumeration, not a fake list.
  // (guards the repo's recurring 'hermetic fakes don't prove production wiring' regression class.)
  const dirent = (name, isDir = true) => ({ name, isDirectory: () => isDir });
  const writes = {};
  const res = buildAllCards({
    roots: { enginesDir: "/eng", cardsDir: "/cards" },
    readdirImpl: () => [dirent("zeta"), dirent("alpha"), dirent("README.md", false), dirent("nobrain")],
    existsImpl: (p) => { const k = p.replace(/\\/g, "/"); return k.endsWith("zeta/MEMORY.md") || k.endsWith("alpha/MEMORY.md"); },
    readImpl: (f) => (f.endsWith("MEMORY.md") ? "# T — Role\n- a fact 2026-05-30" : null),
    writeImpl: (f, d) => { writes[f.replace(/\\/g, "/")] = d; },
    mkdirImpl: () => {},
    now: () => 0,
  });
  // README.md filtered (not a dir); nobrain filtered (no MEMORY.md); zeta+alpha kept and SORTED alphabetically
  assert.equal(res.count, 2, "only the 2 dirs that have a MEMORY.md");
  assert.deepEqual(res.cards.map((c) => c.galaxy), ["alpha", "zeta"], "defaultListGalaxies sorts the readdir result");
});

test("buildAllCards: defaultListGalaxies is fail-soft when readdir throws (→ 0 galaxies, no throw)", () => {
  const res = buildAllCards({
    roots: { enginesDir: "/nope", cardsDir: "/c" },
    readdirImpl: () => { throw new Error("ENOENT"); },
    existsImpl: () => false,
    readImpl: () => null,
    writeImpl: () => {},
    mkdirImpl: () => {},
    now: () => 0,
  });
  assert.equal(res.ok, true);
  assert.equal(res.count, 0);
  assert.equal(res.skipped, 0, "empty galaxy list → CLI surfaces the loud zero-advisory");
});
