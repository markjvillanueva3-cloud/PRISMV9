// Tests for lint-memory-contradictions.mjs (SIERRA-VAULT-OPS/U-VAULT-CONTRADICT-MEMORY).
// node --test scripts/lint-memory-contradictions.test.mjs
//
// Hermetic: fs is injected (no real vault) and the NLI call is injected (no Ollama/GPU).
// Verifies the NEW memory loader (parse + the superseded/pointer exclusions) and that it
// feeds the REUSED wiki NLI engine (runNliLint) correctly end-to-end.

import { test } from "node:test";
import assert from "node:assert/strict";
import { parseMemoryPage, loadMemoryPages, DOCTRINE_SUBDIRS, resolveConfirmSamples, resolveBudgetMs } from "./lint-memory-contradictions.mjs";
import { runNliLint } from "./lint-wiki-contradictions.mjs";

const ROOT = "H:/fake/mem";
// fake fs keyed by basename so the resolve()-produced absolute paths still resolve.
function fakeFs(treeBySubdir, filesByName) {
  const readdirImpl = (d) => {
    const b = String(d).replace(/\\/g, "/").split("/").pop();
    const names = treeBySubdir[b] || [];
    return names.map((name) => ({ name, isDirectory: () => false, isFile: () => true }));
  };
  const readFileImpl = (f) => {
    const b = String(f).replace(/\\/g, "/").split("/").pop();
    if (b in filesByName) return filesByName[b];
    throw Object.assign(new Error("ENOENT"), { code: "ENOENT" });
  };
  return { readdirImpl, readFileImpl };
}

// ============================ parseMemoryPage ============================
test("parseMemoryPage: extracts name->title, description, galaxy, body, firstHeading", () => {
  const c = '---\nname: feedback_x\ndescription: "alpha owns the reaper"\nmetadata:\n  galaxy: fleet-hygiene\n---\n\n# Reaper ownership doctrine\nbody text';
  const p = parseMemoryPage(c, "feedback/feedback_x.md");
  assert.equal(p.title, "feedback_x");
  assert.equal(p.description, "alpha owns the reaper");
  assert.equal(p.galaxy, "fleet-hygiene");
  assert.equal(p.firstHeading, "Reaper ownership doctrine");
  assert.match(p.body, /body text/);
});

test("parseMemoryPage: title falls back to firstHeading, then basename, when no name:", () => {
  assert.equal(parseMemoryPage("# Heading Only\nx", "feedback/z.md").title, "Heading Only");
  assert.equal(parseMemoryPage("no frontmatter no heading", "feedback/z.md").title, "z");
});

test("parseMemoryPage: CRLF frontmatter parses (15% of the real vault is CRLF -- regression guard)", () => {
  // \r\n boundaries: a \n-only regex would fail the closing --- and lose all fields
  const crlf = "---\r\nname: feedback_crlf\r\ndescription: \"golf owns the reaper\"\r\nmetadata:\r\n  galaxy: fleet-hygiene\r\n---\r\n\r\n# Reaper doctrine\r\n\r\nbody.";
  const p = parseMemoryPage(crlf, "feedback/feedback_crlf.md");
  assert.equal(p.title, "feedback_crlf");          // name: extracted despite CRLF
  assert.equal(p.description, "golf owns the reaper");
  assert.equal(p.galaxy, "fleet-hygiene");
});

// ============================ loadMemoryPages ============================
test("loadMemoryPages: includes doctrine memos, EXCLUDES superseded + node-pointer stubs", () => {
  const fs = fakeFs(
    { feedback: ["feedback_a.md", "feedback_b.md", "node_pointer.md", "feedback_super.md"], patterns: [] },
    {
      "feedback_a.md": "---\nname: feedback_a\n---\n\n# Reaper ownership doctrine\n\ngolf is the exclusive owner of the reaper.",
      "feedback_b.md": "---\nname: feedback_b\n---\n\n# Reaper ownership doctrine\n\nalpha is the exclusive owner of the reaper.",
      "node_pointer.md": "---\nname: node_pointer\n---\n\n# Node indexed pointer to wiki path\n\nthin pointer body.",
      "feedback_super.md": "---\nname: feedback_super\n---\n\n> **SUPERSEDED 2026-06-01 -- see [[x]].**\n\n# Reaper ownership doctrine\n\nstale claim body.",
    }
  );
  const pages = loadMemoryPages({ memoryRoot: ROOT, ...fs });
  assert.deepEqual(pages.map((p) => p.base).sort(), ["feedback_a", "feedback_b"]);
  assert.equal(pages.excludedSuperseded, 1);
  assert.equal(pages.excludedPointer, 1);   // node_pointer.md excluded by isNodePointerStub
});

test("loadMemoryPages: a memo with no usable topic tokens (generic heading) is dropped", () => {
  const fs = fakeFs(
    { feedback: ["feedback_thin.md"], patterns: [] },
    { "feedback_thin.md": "---\nname: feedback_thin\n---\n\n# ok\nx" },   // heading 'ok' <4 chars -> 0 tokens
  );
  const pages = loadMemoryPages({ memoryRoot: ROOT, ...fs });
  assert.equal(pages.length, 0);
});

// ============================ integration with the reused NLI engine ============================
const owns = (who, not) => `---\nname: feedback_${who}\n---\n\n# Reaper ownership doctrine\n\n${who} is the sole exclusive owner of the reaper; ${not} does not own it.`;

test("integration: loadMemoryPages -> runNliLint (injected callImpl) flags a planted CONTRADICT pair", async () => {
  const fs = fakeFs(
    { feedback: ["feedback_golf.md", "feedback_alpha.md"], patterns: [] },
    { "feedback_golf.md": owns("golf", "alpha"), "feedback_alpha.md": owns("alpha", "golf") },
  );
  const pages = loadMemoryPages({ memoryRoot: ROOT, ...fs });
  assert.equal(pages.length, 2);   // both share reaper/ownership/doctrine/exclusive/owner tokens
  const callImpl = async () => ({ ok: true, text: "CONTRADICT\nopposite ownership claims" });
  const rep = await runNliLint(pages, { callImpl });
  assert.equal(rep.totals.contradictions, 1);
  assert.equal(rep.contradictions[0].reason, "opposite ownership claims");
});

test("integration: CONSISTENT verdict -> zero contradictions (no false positive)", async () => {
  const fs = fakeFs(
    { feedback: ["feedback_golf.md", "feedback_alpha.md"], patterns: [] },
    { "feedback_golf.md": owns("golf", "alpha"), "feedback_alpha.md": owns("alpha", "golf") },
  );
  const pages = loadMemoryPages({ memoryRoot: ROOT, ...fs });
  const callImpl = async () => ({ ok: true, text: "CONSISTENT\nboth describe reaper duties" });
  const rep = await runNliLint(pages, { callImpl });
  assert.equal(rep.totals.contradictions, 0);
});

test("fail-soft: callImpl throws (Ollama down) -> unchecked, no throw, no false contradiction", async () => {
  const fs = fakeFs(
    { feedback: ["feedback_golf.md", "feedback_alpha.md"], patterns: [] },
    { "feedback_golf.md": owns("golf", "alpha"), "feedback_alpha.md": owns("alpha", "golf") },
  );
  const pages = loadMemoryPages({ memoryRoot: ROOT, ...fs });
  const callImpl = async () => { throw new Error("ollama down"); };
  const rep = await runNliLint(pages, { callImpl });
  assert.equal(rep.totals.contradictions, 0);
  assert.ok(rep.totals.unchecked >= 1);
});

test("DOCTRINE_SUBDIRS is the bounded curated scope (not the full 19.9K vault)", () => {
  assert.deepEqual(DOCTRINE_SUBDIRS, ["feedback", "patterns"]);
});

// ============================ resolveConfirmSamples (U-VAULT-NLI-VOTE consumer guard) ============================
test("resolveConfirmSamples: unset/garbage/negative -> default 2 (adversarial input)", () => {
  assert.equal(resolveConfirmSamples(undefined), 2);   // env/CLI not provided
  assert.equal(resolveConfirmSamples(null), 2);
  assert.equal(resolveConfirmSamples(""), 2);          // explicitly-empty env = "unset", NOT disable (Number("")===0 footgun guarded)
  assert.equal(resolveConfirmSamples("   "), 2);       // whitespace-only = unset
  assert.equal(resolveConfirmSamples("abc"), 2);       // NaN -> default
  assert.equal(resolveConfirmSamples("-1"), 2);        // negative -> default
  assert.equal(resolveConfirmSamples("-3"), 2);
});

test("resolveConfirmSamples: valid counts pass through; floats floor; 0 disables", () => {
  assert.equal(resolveConfirmSamples("0"), 0);         // explicit opt-out (single-sample)
  assert.equal(resolveConfirmSamples("2"), 2);
  assert.equal(resolveConfirmSamples("4"), 4);
  assert.equal(resolveConfirmSamples("2.9"), 2);       // float floors
  assert.equal(resolveConfirmSamples(3), 3);           // numeric passthrough
});

test("resolveConfirmSamples: custom default honored", () => {
  assert.equal(resolveConfirmSamples(undefined, 0), 0);
  assert.equal(resolveConfirmSamples("xyz", 4), 4);
});

// ============================ resolveBudgetMs (U-VAULT-NLI-BUDGET consumer guard) ============================
test("resolveBudgetMs: unset/empty/garbage/negative -> default 0 (unbounded cron run)", () => {
  assert.equal(resolveBudgetMs(undefined), 0);
  assert.equal(resolveBudgetMs(null), 0);
  assert.equal(resolveBudgetMs(""), 0);          // explicitly-empty env = unset, not a 0-budget
  assert.equal(resolveBudgetMs("   "), 0);
  assert.equal(resolveBudgetMs("abc"), 0);
  assert.equal(resolveBudgetMs("-5000"), 0);     // negative -> default
});

test("resolveBudgetMs: valid ms pass through; floats floor; custom default honored", () => {
  assert.equal(resolveBudgetMs("75000"), 75000);
  assert.equal(resolveBudgetMs("0"), 0);          // explicit 0 = unbounded
  assert.equal(resolveBudgetMs("80000.9"), 80000);
  assert.equal(resolveBudgetMs(60000), 60000);
  assert.equal(resolveBudgetMs(undefined, 75000), 75000);
});
