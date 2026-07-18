// Test -- embed-pdf-tribal-tips-into-index.mjs pure helpers.
// The model-call/index-write loop is impure (live Ollama + 1.18GB index); these
// cover the deterministic source-reading + entry-build that is the only new code
// (the index IO is reused verbatim from embed-cited-tips-into-tribal-index.mjs).
// Run: node scripts/embed-pdf-tribal-tips-into-index.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  toValidDomain, videoTipText, hashInput, buildTipEntry,
  collectPdfTips, collectVideoTips, collectExtractedPdfTips, collectAllTips, spliceTipEntries,
  shouldReexecForHeap, collectCatalogCuttingTips, collectHermesEnrichmentTips, collectHermesKnowledgeTips, DEFAULT_SOURCES,
} from "./embed-pdf-tribal-tips-into-index.mjs";

// -- collectCatalogCuttingTips: flat per-tip catalog cutting params -> embedder records --
test("collectCatalogCuttingTips: reads flat .tip rows, reuses namespaced id, maps vendor title", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "catcut-"));
  const f = path.join(dir, "catalog-cutting-tips.jsonl");
  fs.writeFileSync(f, [
    JSON.stringify({ id: "catalog-cutting:tungaloy-gc:DX110:N:42", domain: "speed-feed", source: "GC.pdf", page: 42, tip: "tungaloy DX110 in non-ferrous (ISO N): Vc 100-300 m/min, fz 0.002-0.006 mm/tooth.", meta: { vendor: "tungaloy", series: "DX110" } }),
    "  ", // blank line tolerated
    "{broken json", // torn line tolerated
    JSON.stringify({ id: "catalog-cutting:x:Y:P:1", domain: "speed-feed", source: "x.pdf", page: 1, tip: "" }), // empty tip dropped
  ].join("\n"));
  const out = collectCatalogCuttingTips(f);
  assert.equal(out.length, 1); // only the one valid non-empty tip
  assert.equal(out[0].id, "tip:catalog-cutting:tungaloy-gc:DX110:N:42");
  assert.equal(out[0].sourceCorpus, "manufacturer-catalogs");
  assert.equal(out[0].title, "tungaloy DX110");
  assert.match(out[0].text, /Vc 100-300 m\/min/);
  fs.rmSync(dir, { recursive: true, force: true });
});
test("collectCatalogCuttingTips: missing file -> [] (not throw)", () => {
  assert.deepEqual(collectCatalogCuttingTips("/no/such/catalog-tips.jsonl"), []);
});

// -- collectExtractedPdfTips: resources page-cited tips, stubs excluded --
test("collectExtractedPdfTips: reads .tip, namespaces id, flattens object source, drops batch-stubs", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "respdf-"));
  fs.writeFileSync(path.join(dir, "a.jsonl"), [
    JSON.stringify({ id: "foc14-101", domain: "lathe", topic: "Lathe sequence", tip: "Face first to set Z-offset.", source: { book: "Fundamentals of CNC", pdf_path: "H:/PRISM/resources/x.pdf" }, confidence: 1 }),
    JSON.stringify({ id: "stub-9", domain: "mill", tip: "heuristic anchor", confidence: 0.3, extraction_quality: "batch-stub" }), // excluded
    JSON.stringify({ id: "foc14-102", domain: "cad", tip: "Use G54 work offset.", source: "plain/string/path.pdf" }),        // no confidence = trusted
    "{ torn",
  ].join("\n"));
  const recs = collectExtractedPdfTips(dir);
  assert.equal(recs.length, 2);                                  // stub + torn dropped
  assert.equal(recs[0].id, "tip:respdf-foc14-101");
  assert.equal(recs[0].title, "Lathe sequence");
  assert.equal(recs[0].path, "H:/PRISM/resources/x.pdf");        // object source flattened
  assert.equal(recs[0].domain, "lathe");
  assert.equal(recs[1].path, "plain/string/path.pdf");           // string source kept
  fs.rmSync(dir, { recursive: true, force: true });
});
test("collectExtractedPdfTips: missing dir -> [] (never throws)", () => {
  assert.deepEqual(collectExtractedPdfTips("/no/such/dir"), []);
});

// -- shouldReexecForHeap: the OOM fix (flush loads the whole ~1.18GB index) --
test("shouldReexecForHeap: re-exec by default, NOT when breaker set or heap flag present", () => {
  assert.equal(shouldReexecForHeap([], {}), true);                                   // fresh launch -> bump
  assert.equal(shouldReexecForHeap([], { PRISM_TRIBAL_EMBED_REEXEC: "1" }), false);  // already the child
  assert.equal(shouldReexecForHeap(["--max-old-space-size=8192"], {}), false);       // flag already present
});

// -- toValidDomain --
test("toValidDomain: maps known source domains to rerank VALID_DOMAINS; unknown -> general", () => {
  assert.equal(toValidDomain("cad"), "cad");
  assert.equal(toValidDomain("cam"), "cam");
  assert.equal(toValidDomain("milling"), "mill"); // alias
  assert.equal(toValidDomain("turning"), "lathe"); // alias
  assert.equal(toValidDomain("wire-edm"), "wedm"); // alias
  assert.equal(toValidDomain("mfg"), "general"); // not a VALID_DOMAINS member
  assert.equal(toValidDomain("machining"), "general");
  assert.equal(toValidDomain(null), "general");
  assert.equal(toValidDomain(""), "general");
});

// -- videoTipText (the body-field fix, mirrored here) --
test("videoTipText: reads .body (real youtube shape) + title-prefixes; tolerates legacy/garbage", () => {
  assert.equal(videoTipText({ title: "Balance", body: "2.5 g-mm @ 25k rpm" }), "Balance: 2.5 g-mm @ 25k rpm");
  assert.equal(videoTipText({ body: "climb mill" }), "climb mill");
  assert.equal(videoTipText({ tip: "legacy" }), "legacy");
  assert.equal(videoTipText("plain"), "plain");
  assert.equal(videoTipText(null), "");
  assert.equal(videoTipText({}), "");
});

// -- buildTipEntry: canonical array shape tribal-rerank reads --
test("buildTipEntry: emits {id,source,domain,title,text,hash,embedding} with valid domain", () => {
  const e = buildTipEntry({ id: "tip:pdf-abc-0", domain: "milling", title: "Roughing", text: "Climb mill aluminum at 0.03 stepover.", path: "x.pdf" }, [0.1, 0.2]);
  assert.equal(e.id, "tip:pdf-abc-0");
  assert.equal(e.source, "tribal-tip");
  assert.equal(e.domain, "mill");                 // milling -> mill via toValidDomain
  assert.equal(e.title, "Roughing");
  assert.deepEqual(e.embedding, [0.1, 0.2]);
  assert.ok(typeof e.hash === "string" && e.hash.length === 16);
  assert.ok(e.text.startsWith("Climb mill"));
});
test("buildTipEntry: hash is stable for identical input, differs for different input", () => {
  const a = buildTipEntry({ id: "i", domain: "cad", title: "t", text: "same" }, []);
  const b = buildTipEntry({ id: "i", domain: "cad", title: "t", text: "same" }, []);
  const c = buildTipEntry({ id: "i", domain: "cad", title: "t", text: "diff" }, []);
  assert.equal(a.hash, b.hash);
  assert.notEqual(a.hash, c.hash);
});
test("hashInput: 16-hex change-detection digest", () => {
  assert.match(hashInput("x"), /^[0-9a-f]{16}$/);
});

// -- collectPdfTips: JSONL -> one record PER TIP --
test("collectPdfTips: explodes each row's tips[] into per-tip records with stable ids", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pdftips-"));
  const f = path.join(dir, "tips.jsonl");
  fs.writeFileSync(f, [
    JSON.stringify({ sha8: "abc12345", domain: "cam", title: "Pocketing", source: "a.pdf", tips: ["Tip one here.", "Tip two here.", "   "] }),
    "", // blank line tolerated
    "{ torn json", // torn line tolerated
    JSON.stringify({ sha8: "def", domain: "cad", title: "Sketch", source: "b.pdf", tips: ["Single."] }),
  ].join("\n"));
  const recs = collectPdfTips(f);
  assert.equal(recs.length, 3); // 2 (blank tip dropped) + 1
  assert.equal(recs[0].id, "tip:pdf-abc12345-0");
  assert.equal(recs[1].id, "tip:pdf-abc12345-1");
  assert.equal(recs[0].domain, "cam");
  assert.equal(recs[2].id, "tip:pdf-def-0");
  fs.rmSync(dir, { recursive: true, force: true });
});
test("collectPdfTips: missing file -> [] (never throws)", () => {
  assert.deepEqual(collectPdfTips("/no/such/tips.jsonl"), []);
});

// -- collectVideoTips: youtube JSON -> per-tip records, reusing tip's stable id --
test("collectVideoTips: reads .body tips, reuses tk-yt id, skips fallback + empty", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "yttips-"));
  fs.writeFileSync(path.join(dir, "vid1.json"), JSON.stringify({
    meta: { videoId: "vid1", url: "http://y/vid1", title: "Holders" },
    tips: [{ id: "tk-yt-vid1-001", title: "Balance", body: "2.5 g-mm." }, { id: "tk-yt-vid1-002", title: "", body: "" }],
  }));
  fs.writeFileSync(path.join(dir, "vid2-tips-fallback.json"), JSON.stringify({ tips: [{ body: "ignored fallback" }] }));
  fs.writeFileSync(path.join(dir, "empty.json"), JSON.stringify({ meta: {}, tips: [] }));
  const recs = collectVideoTips(dir);
  assert.equal(recs.length, 1);                       // one real tip (empty-body + fallback + empty dropped)
  assert.equal(recs[0].id, "tip:tk-yt-vid1-001");
  assert.equal(recs[0].text, "Balance: 2.5 g-mm.");
  assert.equal(recs[0].path, "http://y/vid1");
  fs.rmSync(dir, { recursive: true, force: true });
});

// -- collectHermesEnrichmentTips: Hermes per-domain enrichment staging -> L1 records --
test("collectHermesEnrichmentTips: per-tip records, domain from tag, namespaced stable id", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "hermes-embed-"));
  const f = path.join(dir, "staging.json");
  fs.writeFileSync(f, JSON.stringify({
    schemaVersion: "1.0.0", count: 3, tips: [
      { id: "hkl-mill-001", title: "Shrink-fit under 6mm to hold TIR < 0.003mm.", tags: ["domain:mill", "hermes:grok-4.20"], source: "Sandvik p.68", safety: true },
      { id: "hkl-post-007", title: "Fanuc G04 P[ms] vs Okuma G4 F[sec].", tags: ["domain:post"], source: "Fanuc B-64384EN" },  // post -> general
      { id: "hkl-bad", title: "", tags: ["domain:cad"] },                                                                      // empty text dropped
    ],
  }));
  const recs = collectHermesEnrichmentTips(f);
  assert.equal(recs.length, 2);                                  // empty-text tip dropped
  const mill = recs.find((r) => r.id === "tip:hkl-mill-001");
  assert.equal(mill.domain, "mill");                             // from domain:mill tag
  assert.equal(toValidDomain(mill.domain), "mill");             // maps to a VALID_DOMAINS member
  assert.equal(mill.sourceCorpus, "hermes-enrichment-loop");
  assert.equal(mill.path, "Sandvik p.68");                       // cite carried as path
  assert.equal(mill.origin, "hermes:hkl-mill-001");
  const post = recs.find((r) => r.id === "tip:hkl-post-007");
  assert.equal(post.domain, "post");
  assert.equal(toValidDomain(post.domain), "general");           // post has no clean VALID_DOMAINS member
  fs.rmSync(dir, { recursive: true, force: true });
});
test("collectHermesEnrichmentTips: missing file / no tips -> [] (never throws)", () => {
  assert.deepEqual(collectHermesEnrichmentTips("/no/such/staging.json"), []);
});

// -- collectHermesKnowledgeTips: Hermes PARALLEL-AGENT campaign staging (wave-1/2 specs) -> L1 records --
test("collectHermesKnowledgeTips: embeds body (rule+formula+ARITH caution), domain from tag, cite as path", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "hermes-know-"));
  const f = path.join(dir, "staging.json");
  fs.writeFileSync(f, JSON.stringify({
    schemaVersion: 1, count: 4, tips: [
      { id: "hk-w1-mill-001", title: "Chip-thinning feed correction for ae<0.5D",
        body: "Chip-thinning feed correction for ae<0.5D | formula/threshold: fz_corr = fz/sin(acos(1-2ae/D))",
        tags: ["domain:mill", "hermes:grok-4.20-0309-reasoning", "wave:1", "verify:confirms-doctrine"],
        source: "hermes:grok-4.20 (wave 1) | cite: Altintas 2e", safety: false, needs_specialist_confirm: false },
      { id: "hk-w2-post-processor-001", title: "Tool-length comp: H with G43 Fanuc; none Okuma",
        body: "Tool-length comp | formula/threshold: Fanuc G43 Z5. H12 / Okuma T12;G56",
        tags: ["domain:post-processor", "wave:2"], source: "cite: Smid 3e p.392" },              // post-processor -> general
      { id: "hk-w2-cam-001", title: "Tilt ball-nose lead/lean >=7deg",
        body: "Tilt ball-nose lead/lean >=7deg | CAUTION: worked example arithmetic flagged by zulu -- use rule+formula, recompute the number",
        tags: ["domain:cam", "wave:2", "verify:worked-number-suspect"], source: "cite: Altintas 2e", needs_specialist_confirm: true },
      { id: "hk-w1-bad", title: "", body: "", tags: ["domain:cad"] },                             // empty text dropped
    ],
  }));
  const recs = collectHermesKnowledgeTips(f);
  assert.equal(recs.length, 3);                                     // empty-text tip dropped
  const mill = recs.find((r) => r.id === "tip:hk-w1-mill-001");
  assert.equal(mill.domain, "mill");                                // from domain:mill tag
  assert.match(mill.text, /fz_corr = fz\/sin/);                     // BODY embedded (formula), not just the title
  assert.equal(mill.sourceCorpus, "hermes-knowledge-campaign");
  assert.match(mill.path, /Altintas 2e/);                           // cite carried as path
  assert.equal(mill.origin, "hermes-knowledge:hk-w1-mill-001");
  const post = recs.find((r) => r.id === "tip:hk-w2-post-processor-001");
  assert.equal(post.domain, "post-processor");
  assert.equal(toValidDomain(post.domain), "general");             // post-processor has no VALID_DOMAINS member
  const cam = recs.find((r) => r.id === "tip:hk-w2-cam-001");
  assert.match(cam.text, /CAUTION: worked example arithmetic flagged/); // [ARITH?] caution survives into the embed text
  fs.rmSync(dir, { recursive: true, force: true });
});
test("collectHermesKnowledgeTips: missing file / no tips -> [] (never throws)", () => {
  assert.deepEqual(collectHermesKnowledgeTips("/no/such/knowledge-staging.json"), []);
});
test("collectAllTips: hermes-knowledge is a wired, selectable source", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "allknow-"));
  fs.writeFileSync(path.join(dir, "know.json"), JSON.stringify({ tips: [{ id: "hk-w1-lathe-002", title: "Nose radius from Ra", body: "Ra = f^2/(32*r)", tags: ["domain:lathe", "wave:1"], source: "Machinery's Handbook 31e" }] }));
  const only = collectAllTips({ hermesKnowledge: path.join(dir, "know.json"), sources: ["hermes-knowledge"] });
  assert.equal(only.length, 1);
  assert.equal(only[0].id, "tip:hk-w1-lathe-002");
  assert.equal(only[0].domain, "lathe");
  fs.rmSync(dir, { recursive: true, force: true });
});
test("collectAllTips: includes hermes in defaults; source filter + dedup by id", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "alltips-"));
  fs.writeFileSync(path.join(dir, "tips.jsonl"), JSON.stringify({ sha8: "z", domain: "mill", title: "T", source: "z.pdf", tips: ["one"] }));
  fs.writeFileSync(path.join(dir, "hermes.json"), JSON.stringify({ tips: [{ id: "hkl-cam-001", title: "Cap radial engagement below chatter.", tags: ["domain:cam"], source: "Altintas 2e" }] }));
  const onlyPdf = collectAllTips({ pdf: path.join(dir, "tips.jsonl"), video: "/no/dir", sources: ["pdf"] });
  assert.equal(onlyPdf.length, 1);
  assert.equal(onlyPdf[0].id, "tip:pdf-z-0");
  const onlyHermes = collectAllTips({ hermes: path.join(dir, "hermes.json"), sources: ["hermes"] });
  assert.equal(onlyHermes.length, 1);
  assert.equal(onlyHermes[0].id, "tip:hkl-cam-001");             // hermes is a wired, selectable source
  fs.rmSync(dir, { recursive: true, force: true });
});

// -- CRON-PATH coverage: the durable tribal-embed task runs main() with NO --source,
// so it uses DEFAULT_SOURCES. This pins that hermes (+catalog) are in the SINGLE
// source-of-truth list main() and collectAllTips share -- the regression that left
// catalog+hermes dead on the cron path while their --source runs looked fine. --
test("DEFAULT_SOURCES (the no-arg cron path) includes every wired source -- no silent drop", () => {
  for (const s of ["pdf", "video", "resources", "catalog", "html", "hermes", "hermes-knowledge"]) {
    assert.ok(DEFAULT_SOURCES.includes(s), `DEFAULT_SOURCES must include '${s}' or the no-flag cron silently drops it`);
  }
});
test("collectAllTips with NO sources arg (cron default) collects hermes + hermes-knowledge tips", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "crondef-"));
  fs.writeFileSync(path.join(dir, "hermes.json"), JSON.stringify({ tips: [{ id: "hkl-wedm-003", title: "Reduce on-time before raising tension on gap collapse.", tags: ["domain:wedm"], source: "Fanuc Alpha-iC" }] }));
  fs.writeFileSync(path.join(dir, "know.json"), JSON.stringify({ tips: [{ id: "hk-w2-wedm-004", title: "Auto-thread start-hole >= 1.75x wire dia", body: "hole>=1.75*wire dia for >50mm thick", tags: ["domain:wedm", "wave:2"], source: "Mitsubishi FA" }] }));
  // omit `sources` entirely -> uses DEFAULT_SOURCES, exactly what main()/the cron does.
  const all = collectAllTips({ pdf: "/no/f.jsonl", video: "/no/dir", extracted: "/no/dir", catalog: "/no/f.jsonl", html: "/no/f.jsonl", hermes: path.join(dir, "hermes.json"), hermesKnowledge: path.join(dir, "know.json") });
  assert.ok(all.some((r) => r.id === "tip:hkl-wedm-003"), "no-arg default path must collect hermes tips (cron coverage)");
  assert.ok(all.some((r) => r.id === "tip:hk-w2-wedm-004"), "no-arg default path must collect hermes-knowledge tips (cron coverage)");
  fs.rmSync(dir, { recursive: true, force: true });
});

// -- spliceTipEntries: replace-by-id or append, keeps idIndexMap current --
test("spliceTipEntries: appends new ids, replaces existing by id", () => {
  const idx = { entries: [{ id: "tip:a", v: 1 }] };
  const map = new Map(idx.entries.map((e, i) => [e.id, i]));
  const r = spliceTipEntries(idx, [{ id: "tip:a", v: 2 }, { id: "tip:b", v: 9 }], map);
  assert.deepEqual(r, { added: 1, replaced: 1 });
  assert.equal(idx.entries.length, 2);
  assert.equal(idx.entries[0].v, 2);                  // a replaced in place
  assert.equal(idx.entries[1].id, "tip:b");           // b appended
  assert.equal(map.get("tip:b"), 1);                  // map updated
});
