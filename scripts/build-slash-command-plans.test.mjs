// scripts/build-slash-command-plans.test.mjs
// Real reference-value/invariant tests for U-SLASH-PLANS pure core (R9: assertions
// that fail when the logic changes -- no toBeDefined stubs).
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  listCommandFiles, parseCommandMeta, classifyCommand, aggregateByClass, resolveQuery,
} from "./build-slash-command-plans.mjs";

const { classifyRoutingClass } = await import(
  pathToFileURL(path.join(process.env.PRISM_ROOT || "H:/prism", "scripts/lib/feature-routing-graph.mjs")).href
);

// ---- listCommandFiles ------------------------------------------------------
test("listCommandFiles: absent dir -> [] (no throw)", () => {
  assert.deepEqual(listCommandFiles("H:/prism/__definitely_not_a_dir__"), []);
});

test("listCommandFiles: finds .md recursively, skips non-md, relative paths", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "slashplan-"));
  fs.writeFileSync(path.join(tmp, "a.md"), "x");
  fs.writeFileSync(path.join(tmp, "ignore.txt"), "x");
  fs.mkdirSync(path.join(tmp, "sparc"));
  fs.writeFileSync(path.join(tmp, "sparc", "tutorial.md"), "x");
  const got = listCommandFiles(tmp).sort();
  assert.deepEqual(got, ["a.md", "sparc/tutorial.md"]);
  fs.rmSync(tmp, { recursive: true, force: true });
});

// ---- parseCommandMeta ------------------------------------------------------
test("parseCommandMeta: frontmatter name + description win", () => {
  const head = `---\nname: dedup\ndescription: Check for duplicates before creating\n---\n# body`;
  const m = parseCommandMeta(head, "dedup.md");
  assert.equal(m.name, "dedup");
  assert.equal(m.description, "Check for duplicates before creating");
});

test("parseCommandMeta: no frontmatter -> name from path, desc from first prose line", () => {
  const m = parseCommandMeta("# Mill Studio\n\nMill machining workflow.", "mill-studio.md");
  assert.equal(m.name, "mill-studio");
  assert.equal(m.description, "Mill Studio");        // first heading line, # stripped
});

test("parseCommandMeta: nested path -> dir:leaf name (sparc:tutorial convention)", () => {
  const m = parseCommandMeta("body only", "sparc/tutorial.md");
  assert.equal(m.name, "sparc:tutorial");
});

test("parseCommandMeta: quoted frontmatter description is unquoted", () => {
  const head = `---\nname: smart\ndescription: "Analyze task complexity"\n---`;
  assert.equal(parseCommandMeta(head, "smart.md").description, "Analyze task complexity");
});

test("parseCommandMeta: long description truncated with ASCII ellipsis", () => {
  const long = "x".repeat(300);
  const m = parseCommandMeta(`---\nname: q\ndescription: ${long}\n---`, "q.md");
  assert.ok(m.description.length <= 160);
  assert.ok(m.description.endsWith("..."));
});

test("parseCommandMeta: empty/garbage head -> name fallback, empty desc (no throw)", () => {
  const m = parseCommandMeta("", "weird/path.md");
  assert.equal(m.name, "weird:path");
  assert.equal(m.description, "");
});

test("parseCommandMeta: TRUNCATED frontmatter (no closing ---) -> early FM keys, NOT a YAML line as desc (P1 regression)", () => {
  // opening --- + name + description keys, but the closing --- is beyond the head:
  // the long tail must NOT be body-scanned (a `name:`/`title:` line as description
  // was the silent-corruption bug arm C caught on scrutiny-batch.md).
  const head = `---\nname: scrutiny-batch\ndescription: Run the gate across N files\ntitle: should-not-leak\n` + "x: y\n".repeat(50);
  const m = parseCommandMeta(head, "scrutiny-batch.md");
  assert.equal(m.name, "scrutiny-batch");
  assert.equal(m.description, "Run the gate across N files");   // real desc, not "title: should-not-leak"
  assert.equal(m.truncated, true);
});

test("parseCommandMeta: no-frontmatter body skips a stray YAML key line, picks prose", () => {
  const m = parseCommandMeta("key: value\nThis is the real description.", "x.md");
  assert.equal(m.description, "This is the real description.");
});

test("parseCommandMeta: closed FM with name only -> description from body heading (usefulness preserved)", () => {
  const m = parseCommandMeta(`---\nname: foo\n---\n# Foo Studio\n\nbody`, "foo.md");
  assert.equal(m.name, "foo");
  assert.equal(m.description, "Foo Studio");
  assert.equal(m.truncated, false);
});

// ---- classifyCommand (reuses the live classifier) --------------------------
test("classifyCommand: a build/create command routes to 'build'", () => {
  const r = classifyCommand({ name: "forge-triple", description: "create a new engine, skill and hook" }, classifyRoutingClass);
  assert.equal(r.taskClass, "build");
  assert.ok(r.confidence > 0);
});

test("classifyCommand: a debug/fix command routes to 'fix'", () => {
  const r = classifyCommand({ name: "forge-debug", description: "debug and fix a broken engine error" }, classifyRoutingClass);
  assert.equal(r.taskClass, "fix");
});

test("classifyCommand: a handoff/session command routes to 'session'", () => {
  const r = classifyCommand({ name: "handoff", description: "session continuation handoff at session end / compact" }, classifyRoutingClass);
  assert.equal(r.taskClass, "session");
});

// ---- aggregateByClass invariant --------------------------------------------
test("aggregateByClass: partition invariant -- every record in exactly one bucket", () => {
  const recs = [
    { name: "a", description: "d", source: "project", archived: false, taskClass: "build", confidence: 0.5 },
    { name: "b", description: "d", source: "user", archived: false, taskClass: "build", confidence: 0.9 },
    { name: "c", description: "d", source: "archive", archived: true, taskClass: "fix", confidence: 0.25 },
  ];
  const by = aggregateByClass(recs);
  const sum = Object.values(by).reduce((n, arr) => n + arr.length, 0);
  assert.equal(sum, recs.length);                       // no record lost or duplicated
  assert.equal(by.build.length, 2);
  assert.equal(by.fix.length, 1);
  assert.equal(by.build[0].name, "b");                  // sorted by confidence desc (0.9 first)
  assert.equal(by.fix[0].confidence, 0.25);             // rounded preserved
});

test("aggregateByClass: empty input -> empty object", () => {
  assert.deepEqual(aggregateByClass([]), {});
});

test("aggregateByClass: record with missing/NaN confidence does not throw -> 0 (brittle-input guard)", () => {
  const by = aggregateByClass([{ name: "a", description: "d", source: "p", archived: false, taskClass: "build" }]);
  assert.equal(by.build[0].confidence, 0);
});

// ---- resolveQuery (P2: class must not shadow a same-named command) ----------
const QPLAN = {
  byClass: {
    build: [{ name: "dedup", when: "x", archived: false, confidence: 0.9 }],
    learn: [{ name: "tutorial", when: "y", archived: false, confidence: 0.5 }],
    quote: [{ name: "quote", when: "z", archived: false, confidence: 0.8 }],
  },
};
test("resolveQuery: bare class name -> class (back-compat)", () => {
  assert.deepEqual(resolveQuery(QPLAN, "build"), { kind: "class", cls: "build", q: "build" });
});
test("resolveQuery: bare command name -> command", () => {
  const r = resolveQuery(QPLAN, "dedup");
  assert.equal(r.kind, "command"); assert.equal(r.cls, "build");
});
test("resolveQuery: leading-slash prefers COMMAND over a same-named class (anti-shadow)", () => {
  const r = resolveQuery(QPLAN, "/quote");          // "quote" is BOTH a class and a command
  assert.equal(r.kind, "command"); assert.equal(r.cmd.name, "quote");
});
test("resolveQuery: unknown + empty -> none", () => {
  assert.equal(resolveQuery(QPLAN, "nope").kind, "none");
  assert.equal(resolveQuery(QPLAN, "").kind, "none");
});

// ---- live artifact contract (validates the generator output if present) ----
test("live artifact: classCoverage sums to total (full partition on real data)", () => {
  const p = path.join(process.env.PRISM_ROOT || "H:/prism", "state/shared/slash-command-plans.json");
  if (!fs.existsSync(p)) return;                         // generator not yet run in this env
  const plan = JSON.parse(fs.readFileSync(p, "utf8"));
  const sum = Object.values(plan.classCoverage).reduce((n, v) => n + v, 0);
  assert.equal(sum, plan.total);
  const buckets = Object.values(plan.byClass).reduce((n, arr) => n + arr.length, 0);
  assert.equal(buckets, plan.total);
  assert.ok(plan.total > 0 && plan.distinctNames > 0);
});
