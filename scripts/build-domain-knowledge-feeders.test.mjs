// Tests for build-domain-knowledge-feeders.mjs (slot:zulu 2026-06-24).
// Real reference-value + invariant assertions -- no toBeDefined stubs (R9).
import { test } from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { parseSpec, classifyDomains, entryToTribal, DOMAIN_KEYWORDS, corpusPathFor, weOwnCorpus, DEDICATED_GENERATOR_DOMAINS } from "./build-domain-knowledge-feeders.mjs";

const SAMPLE_SPEC = `# AUTOGEN EXTRACT SPEC -- Foo/Bar.pdf

| Field | Value |
|---|---|
| PDF id | \`Foo/Bar.pdf\` |
| Slug | \`foo_bar_pdf\` |
| Kind | \`manual-pdf\` |
| Source path | \`H:\\PRISM\\resources\\Foo\\Bar.pdf\` |
| Size | 1.0 MB |
`;

test("parseSpec extracts slug/id/kind/source from a real spec table", () => {
  const e = parseSpec(SAMPLE_SPEC);
  assert.equal(e.slug, "foo_bar_pdf");
  assert.equal(e.id, "Foo/Bar.pdf");
  assert.equal(e.kind, "manual-pdf");
  assert.equal(e.source, "H:\\PRISM\\resources\\Foo\\Bar.pdf");
});

test("parseSpec returns null when slug or source is missing (failure mode)", () => {
  assert.equal(parseSpec("# no table here"), null);
  assert.equal(parseSpec("| PDF id | x |\n| Kind | manual-pdf |"), null); // no slug/source
});

test("parseSpec handles empty/garbage input without throwing (adversarial)", () => {
  assert.equal(parseSpec(""), null);
  assert.equal(parseSpec("|||||"), null);
});

test("classifyDomains is multi-label on a cross-domain doc", () => {
  // a Mastercam mill speeds & feeds doc -> mill + cam + speed-feed
  const doms = classifyDomains({ id: "Mastercam Mill speeds and feeds", source: "x/mastercam-mill-sfm.pdf", slug: "s", kind: "manual-pdf" });
  assert.ok(doms.includes("mill"), "mill");
  assert.ok(doms.includes("cam"), "cam");
  assert.ok(doms.includes("speed-feed"), "speed-feed");
});

test("classifyDomains hits the specialist domains (boundary words)", () => {
  assert.deepEqual(classifyDomains({ id: "Wire EDM spark gap guide", source: "wedm.pdf", slug: "s", kind: "k" }).filter(d => d === "wedm"), ["wedm"]);
  assert.ok(classifyDomains({ id: "Lathe turning chuck setup", source: "l.pdf", slug: "s", kind: "k" }).includes("lathe"));
  assert.ok(classifyDomains({ id: "SPC Cpk inspection report", source: "q.pdf", slug: "s", kind: "k" }).includes("quality"));
  assert.ok(classifyDomains({ id: "OSHA lockout tagout safety", source: "sf.pdf", slug: "s", kind: "k" }).includes("safety"));
});

test("classifyDomains returns [] for a non-manufacturing doc (no false positives)", () => {
  assert.deepEqual(classifyDomains({ id: "Company picnic agenda", source: "picnic.pdf", slug: "s", kind: "k" }), []);
});

test("entryToTribal produces the GIGO-safe tribal shape + correct audience mapping", () => {
  const e = { slug: "s1", id: "id1", kind: "manual-pdf", source: "H:/x/y.pdf" };
  const t = entryToTribal(e, "lathe", "2026-06-24T00:00:00.000Z");
  assert.equal(t.domain, "lathe");
  assert.equal(t.audience, "whiskey");           // lathe -> whiskey
  assert.equal(t.consume.source_file, "H:/x/y.pdf");
  assert.equal(t.must_human_verify, true);
  assert.equal(t.spawned_by, "build-domain-knowledge-feeders.mjs");
});

test("every DOMAIN_KEYWORDS entry is a valid RegExp (no silent typo)", () => {
  for (const [d, re] of Object.entries(DOMAIN_KEYWORDS)) {
    assert.ok(re instanceof RegExp, `${d} is a RegExp`);
    assert.ok(re.flags.includes("i"), `${d} is case-insensitive`);
  }
});

test("corpusPathFor targets the CANONICAL consumed convention (not the old orphan path)", () => {
  const p = corpusPathFor("lathe").replace(/\\/g, "/");
  assert.ok(p.endsWith("state/shared/lathe-tribal-corpus.jsonl"), `got ${p}`);
  // the invented orphan path must be gone -- this is the bug the wiring fix closes
  assert.ok(!p.includes("domain-knowledge"), "must not write the orphan domain-knowledge/ path");
});

test("cad + cam are EXCLUDED -- owned by the dedicated extract-cadcam generator (no clobber)", () => {
  assert.ok(DEDICATED_GENERATOR_DOMAINS.has("cad"), "cad excluded");
  assert.ok(DEDICATED_GENERATOR_DOMAINS.has("cam"), "cam excluded");
  assert.ok(!DEDICATED_GENERATOR_DOMAINS.has("mill"), "mill is NOT excluded");
});

test("weOwnCorpus: absent->own, ours->own, foreign->refuse (the clobber guard)", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "feeder-own-"));
  const absent = path.join(tmp, "absent-tribal-corpus.jsonl");
  assert.equal(weOwnCorpus(absent), true, "absent file -> we may write it");

  const ours = path.join(tmp, "ours-tribal-corpus.jsonl");
  fs.writeFileSync(ours, JSON.stringify(entryToTribal({ slug: "s", id: "i", kind: "k", source: "x" }, "mill", "2026-06-24T00:00:00.000Z")) + "\n");
  assert.equal(weOwnCorpus(ours), true, "all records spawned_by us -> we own it");

  const foreign = path.join(tmp, "foreign-tribal-corpus.jsonl");
  fs.writeFileSync(foreign, JSON.stringify({ tip: "hand-curated", spawned_by: "a-slot-operator" }) + "\n");
  assert.equal(weOwnCorpus(foreign), false, "a foreign record present -> refuse to clobber");

  const mixed = path.join(tmp, "mixed-tribal-corpus.jsonl");
  fs.writeFileSync(mixed, [JSON.stringify(entryToTribal({ slug: "s", id: "i", kind: "k", source: "x" }, "mill", "t")), JSON.stringify({ spawned_by: "someone-else" })].join("\n") + "\n");
  assert.equal(weOwnCorpus(mixed), false, "ANY foreign record -> refuse (all-or-nothing ownership)");

  fs.rmSync(tmp, { recursive: true, force: true });
});
