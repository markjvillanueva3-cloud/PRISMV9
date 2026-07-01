// graph-exact-match.test.mjs — the shared exact-match predicate + nav-line
// render used by pre-bash / pre-grep / pre-write graph-inject hooks.

import { test } from "node:test";
import assert from "node:assert/strict";
import { exactMatchHit, navPathLine, exactMatchBanner, vaultPathsLine, renderTopCardBlock } from "./graph-exact-match.mjs";

// ── exactMatchHit ───────────────────────────────────────────────────────────
test("exactMatchHit: label==key + concrete + no rank-2 dup → returns the hit", () => {
  const h = exactMatchHit(["kienzle"], [{ label: "kienzle", status: "built", layer: "L7" }]);
  assert.ok(h);
  assert.equal(h.label, "kienzle");
});

test("exactMatchHit: no key equals the label → null", () => {
  assert.equal(exactMatchHit(["cutting", "force"], [{ label: "CuttingForceEngine", status: "built" }]), null);
});

test("exactMatchHit: ghost status → null", () => {
  assert.equal(exactMatchHit(["foo"], [{ label: "foo", status: "ghost.unwired-engine" }]), null);
});

test("exactMatchHit: rank-2 shares the label (ambiguous) → null", () => {
  assert.equal(exactMatchHit(["foo"], [
    { label: "foo", status: "built" },
    { label: "Foo", status: "built" },
  ]), null);
});

test("exactMatchHit: empty/invalid inputs → null", () => {
  assert.equal(exactMatchHit([], [{ label: "x", status: "built" }]), null);
  assert.equal(exactMatchHit(["x"], []), null);
  assert.equal(exactMatchHit(null, null), null);
  assert.equal(exactMatchHit(["x"], [{ status: "built" }]), null, "missing label → null");
});

// ── navPathLine ─────────────────────────────────────────────────────────────
test("navPathLine: emits the repoPath (directly Readable), with type", () => {
  const line = navPathLine({ path: "src/engines/X.ts", repoPath: "mcp-server/src/engines/X.ts", type: "engine" });
  assert.match(line, /→ `Read mcp-server\/src\/engines\/X\.ts` \(engine\)/);
});

test("navPathLine: no repoPath → empty string (never the bare src/ dup)", () => {
  assert.equal(navPathLine({ path: "src/engines/X.ts", type: "engine" }), "", "bare path must NOT be emitted");
  assert.equal(navPathLine(null), "");
  assert.equal(navPathLine({}), "");
});

test("navPathLine: repoPath without type → line with no parenthetical", () => {
  assert.equal(navPathLine({ repoPath: "mcp-server/src/X.ts" }), "\n  → `Read mcp-server/src/X.ts`");
});

// ── exactMatchBanner ────────────────────────────────────────────────────────
test("exactMatchBanner: builds header + node line + path line + footer", () => {
  const h0 = { label: "kienzle", status: "built", layer: "L7", info: "force model" };
  const resolve = (l) => (l === "kienzle" ? { repoPath: "mcp-server/src/engines/KienzleEngine.ts", type: "engine" } : null);
  const out = exactMatchBanner(h0, { header: "## ⚡ Pre-Grep EXACT MATCH —", footer: "_TOKEN-SAVE._", maxBytes: 1500, resolve });
  assert.match(out, /Pre-Grep EXACT MATCH/);
  assert.match(out, /`kienzle`/);
  assert.match(out, /\[L7\/built\]/);
  assert.match(out, /Read mcp-server\/src\/engines\/KienzleEngine\.ts/);
  assert.match(out, /_TOKEN-SAVE\._$/);
});

test("exactMatchBanner: no resolver → banner without a Read line", () => {
  const h0 = { label: "kienzle", status: "built", layer: "L7" };
  const out = exactMatchBanner(h0, { header: "## H", footer: "_F_", maxBytes: 1500 });
  assert.match(out, /`kienzle`/);
  assert.doesNotMatch(out, /Read /);
});

test("exactMatchBanner: a throwing resolver → banner still renders (fail-soft)", () => {
  const h0 = { label: "kienzle", status: "built", layer: "L7" };
  const out = exactMatchBanner(h0, { header: "## H", footer: "_F_", maxBytes: 1500, resolve: () => { throw new Error("down"); } });
  assert.match(out, /`kienzle`/);
  assert.doesNotMatch(out, /Read /);
});

test("exactMatchBanner: respects maxBytes (truncates with ellipsis)", () => {
  const h0 = { label: "x".repeat(50), status: "built", layer: "L7", info: "y".repeat(120) };
  const out = exactMatchBanner(h0, { header: "## H", footer: "_F_", maxBytes: 40 });
  assert.ok(out.length <= 41, `truncated to <=41, got ${out.length}`);
  assert.ok(out.endsWith("…"));
});

// ── vaultPathsLine (U-SV-NODE-VAULT-PATHS) ──────────────────────────────────
test("vaultPathsLine: renders wiki + mem pointers (2-capped), id preferred over label", () => {
  const seekDocs = (id) => (id === "eng.mill"
    ? { wiki: ["lessons/a.md", "concepts/b.md", "c.md"], mem: ["reference_x.md", "m2.md", "m3.md"] }
    : null);
  const line = vaultPathsLine(seekDocs, { id: "eng.mill", label: "mill" });
  assert.match(line, /📂 vault paths/);
  assert.match(line, /wiki: lessons\/a\.md · concepts\/b\.md/);
  assert.match(line, /mem: reference_x\.md · m2\.md/);
  assert.doesNotMatch(line, /· c\.md/, "third wiki entry capped out");
  assert.doesNotMatch(line, /m3\.md/, "third mem entry capped out (mem cap symmetric with wiki)");
});

test("vaultPathsLine: no resolver / null card / empty arrays → empty string", () => {
  assert.equal(vaultPathsLine(undefined, { id: "x" }), "");
  assert.equal(vaultPathsLine(() => null, { id: "x" }), "");
  assert.equal(vaultPathsLine(() => ({ wiki: [], mem: [] }), { id: "x" }), "");
});

test("vaultPathsLine: a throwing seekDocs → empty string (fail-soft)", () => {
  assert.equal(vaultPathsLine(() => { throw new Error("offset index down"); }, { id: "x" }), "");
});

test("vaultPathsLine: wiki-only and mem-only render their single section", () => {
  assert.match(vaultPathsLine(() => ({ wiki: ["w.md"] }), { id: "x" }), /wiki: w\.md/);
  assert.match(vaultPathsLine(() => ({ mem: ["m.md"] }), { id: "x" }), /mem: m\.md/);
  assert.doesNotMatch(vaultPathsLine(() => ({ wiki: ["w.md"] }), { id: "x" }), /mem:/);
});

test("exactMatchBanner: with seekDocs appends the vault-paths line after the Read line", () => {
  const h0 = { id: "eng.mill", label: "mill", status: "built", layer: "L7", info: "mill galaxy" };
  const resolve = () => ({ repoPath: "mcp-server/src/engines/MillEngine.ts", type: "engine" });
  const seekDocs = () => ({ wiki: ["lessons/mill.md"], mem: ["reference_mill.md"] });
  const out = exactMatchBanner(h0, { header: "## H", footer: "_F_", maxBytes: 1500, resolve, seekDocs });
  assert.match(out, /Read mcp-server\/src\/engines\/MillEngine\.ts/);
  assert.match(out, /📂 vault paths — wiki: lessons\/mill\.md  ·  mem: reference_mill\.md/);
  // ordering: Read line precedes vault-paths line
  assert.ok(out.indexOf("Read ") < out.indexOf("vault paths"), "Read line comes before vault paths");
});

test("exactMatchBanner: seekDocs null → banner identical to no-seekDocs (no regression)", () => {
  const h0 = { id: "eng.mill", label: "mill", status: "built", layer: "L7" };
  const base = exactMatchBanner(h0, { header: "## H", footer: "_F_", maxBytes: 1500 });
  const withNull = exactMatchBanner(h0, { header: "## H", footer: "_F_", maxBytes: 1500, seekDocs: () => null });
  assert.equal(withNull, base, "a non-resolving seekDocs must not change the banner");
});

// ── renderTopCardBlock (GAP-A inline card; canonical home for all BM25 hooks) ──
test("renderTopCardBlock: full hit → card with [card] marker, layer/status, label, score 1dp, info", () => {
  const hit = { id: "eng.kienzle", label: "KienzleForceModel", layer: "L7", status: "built", info: "Kienzle cutting force", score: 14.2 };
  const out = renderTopCardBlock(hit, undefined);
  assert.match(out, /^  \[card\] \[L7\/built\] KienzleForceModel \(score: 14\.2\)/, "header line shape");
  assert.match(out, /info: Kienzle cutting force/, "info line present");
});

test("renderTopCardBlock: null hit → null", () => {
  assert.equal(renderTopCardBlock(null, undefined), null);
});

test("renderTopCardBlock: hit with neither id nor label → null", () => {
  assert.equal(renderTopCardBlock({ layer: "L7", status: "built" }, undefined), null);
});

test("renderTopCardBlock: missing layer → [?] placeholder, non-numeric score → ?", () => {
  const out = renderTopCardBlock({ id: "n", label: "N" }, undefined);
  assert.match(out, /\[card\] \[\?\] N \(score: \?\)/, "no-layer/no-score degrades gracefully");
});

test("renderTopCardBlock: seekDocs docs are appended as a vault-paths line", () => {
  const hit = { id: "eng.kienzle", label: "KienzleForceModel", layer: "L7", status: "built", score: 15 };
  const seekDocs = () => ({ wiki: ["wiki/concepts/kienzle.md"], mem: ["memory_patterns.mill_synthesis"] });
  const out = renderTopCardBlock(hit, seekDocs);
  assert.match(out, /wiki\/concepts\/kienzle\.md/, "wiki path appears");
  assert.match(out, /mill_synthesis/, "mem path appears");
});

test("renderTopCardBlock: seekDocs that throws does NOT crash (vaultPathsLine swallows) → card still renders", () => {
  const out = renderTopCardBlock({ id: "eng.x", label: "X", layer: "L7", status: "built", score: 12 }, () => { throw new Error("boom"); });
  assert.ok(typeof out === "string" && /\[card\]/.test(out), "card body still renders despite seekDocs throw");
});

test("renderTopCardBlock: info is truncated to MAX_INFO (120) chars", () => {
  const longInfo = "z".repeat(400);
  const out = renderTopCardBlock({ id: "n", label: "N", layer: "L7", status: "built", info: longInfo, score: 9 }, undefined);
  const infoLine = out.split("\n").find((l) => l.includes("info:"));
  assert.ok(infoLine, "info line present");
  // "    info: " prefix (10 chars) + 120 sliced info chars
  assert.equal(infoLine.length, 10 + 120, "info sliced to MAX_INFO=120");
});
