// node:test for build-requests-viz-sync pure helpers.
// Run: node --test H:/prism/scripts/build-requests-viz-sync.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseRequestRows, isTerminal, extractKeywords, classifyHits, detectDrift,
} from "./build-requests-viz-sync.mjs";

const SAMPLE = `# USER BUILD-REQUESTS LOG

## Backend-development requests

| Date | Request | viz status | Status |
|------|---------|-----------|--------|
| 2026-05-17 | install RTK filter hook | existing-node | ✅ shipped abc1234 |
| 2026-05-17 | new fleet telemetry dashboard | needs-creation | ⏳ pending |
| _open backlog_ | F3 ollama offload | mixed | ⏳ pending |

## PRISM app-feature requests

| Date | Request | viz status | Status |
|------|---------|-----------|--------|
| 2026-05-16 | speed feed calculator export | ghost-node | ⏳ ongoing |
`;

test("parseRequestRows — extracts dated rows, skips header + placeholder", () => {
  const rows = parseRequestRows(SAMPLE);
  assert.equal(rows.length, 3); // 2 backend dated + 1 app-feature; _open backlog_ skipped
  assert.equal(rows[0].section, "Backend-development requests");
  assert.equal(rows[0].request, "install RTK filter hook");
  assert.equal(rows[2].section, "PRISM app-feature requests");
});

test("parseRequestRows — empty / malformed input never throws", () => {
  assert.deepEqual(parseRequestRows(""), []);
  assert.deepEqual(parseRequestRows("no tables here"), []);
  assert.deepEqual(parseRequestRows("| a | b |"), []); // <4 cells
});

test("isTerminal — shipped rows are terminal, pending are not", () => {
  const rows = parseRequestRows(SAMPLE);
  assert.equal(isTerminal(rows[0]), true);   // ✅ shipped
  assert.equal(isTerminal(rows[1]), false);  // ⏳ pending
});

test("extractKeywords — drops stopwords, dedupes, caps at 4", () => {
  const kw = extractKeywords("install RTK filter hook for the build system");
  assert.ok(!kw.includes("for"));
  assert.ok(!kw.includes("the"));
  assert.ok(!kw.includes("build"));   // stopword
  assert.ok(kw.includes("install"));
  assert.ok(kw.includes("filter"));
  assert.ok(kw.length <= 4);
});

test("extractKeywords — empty / no-keyword input returns []", () => {
  assert.deepEqual(extractKeywords(""), []);
  assert.deepEqual(extractKeywords("the and for all"), []); // all stopwords
});

// Fixtures below are VERBATIM `system-viz-query.mjs find` stdout captured
// 2026-05-17 — not sanitized fakes. If the find output format changes these
// must be re-captured (the classifier keys on the real `  L../..  <id>` shape).

test("classifyHits — 0 nodes => needs-creation (real zero-hit output)", () => {
  assert.equal(classifyHits('Found 0 node(s) matching "zzzznonexistentxyz":'), "needs-creation");
  assert.equal(classifyHits(""), "needs-creation");
});

test("classifyHits — real built-node output => existing-node", () => {
  // verbatim `find "kienzle"` output (first rows)
  const real = `Found 30 node(s) matching "kienzle":
  L6/core  core.physics                 Physics Constants (3)
  L10/architecture  vault.wiki.architecture.actions.calc.kienzle-force kienzle-force
  L10/architecture  vault.wiki.architecture.actions.calc.kienzle-milling kienzle-milling`;
  assert.equal(classifyHits(real), "existing-node");
});

test("classifyHits — real ghost-only output => ghost-node", () => {
  // verbatim `find "u-token-budget-guard"` output
  const real = `Found 1 node(s) matching "u-token-budget-guard":
  L9/_  ghost.priority.u-token-budget-guard U-TOKEN-BUDGET-GUARD · Token budget guard (pre-call gate)`;
  assert.equal(classifyHits(real), "ghost-node");
});

test("classifyHits — mixed ghost + real (real format) => existing-node", () => {
  // any non-ghost id present => existing-node, regardless of ghost rows
  const mixed = `Found 2 node(s) matching "x":
  L9/_  ghost.ms.acp-ms0a.p0-u01     P0-U01
  L6/core  core.physics                 Physics Constants`;
  assert.equal(classifyHits(mixed), "existing-node");
});

test("classifyHits — ghost id mentioned in a LABEL must not contaminate a real row", () => {
  // the old (?!.*ghost) lookahead bug: a 'ghost' word in one row's label
  // wrongly nullified another row. Verify id-prefix classification is immune.
  const real = `Found 1 node(s) matching "x":
  L6/script  script.regen-viz             Regenerate the ghost-node viz layer`;
  assert.equal(classifyHits(real), "existing-node");
});

test("detectDrift — terminal row never drifts", () => {
  const row = { vizStatus: "needs-creation", status: "✅ shipped abc" };
  assert.equal(detectDrift(row, "existing-node").drift, false);
});

test("detectDrift — needs-creation row now built => DRIFT", () => {
  const row = { vizStatus: "needs-creation", status: "⏳ pending" };
  const d = detectDrift(row, "existing-node");
  assert.equal(d.drift, true);
  assert.match(d.reason, /needs-creation.*existing-node/);
});

test("detectDrift — tag matches graph => no drift", () => {
  const row = { vizStatus: "ghost-node", status: "⏳ pending" };
  assert.equal(detectDrift(row, "ghost-node").drift, false);
});

test("detectDrift — untracked tag ('mixed') is skipped, not drift", () => {
  const row = { vizStatus: "mixed", status: "⏳ pending" };
  const d = detectDrift(row, "existing-node");
  assert.equal(d.drift, false);
  assert.match(d.reason, /untracked/);
});
