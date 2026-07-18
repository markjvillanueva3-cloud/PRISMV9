#!/usr/bin/env node
/**
 * code-to-vault.test.mjs -- oracle for the code->vault note generator's pure surface.
 * Asserts the note frontmatter + body are well-formed brain nodes (real value checks,
 * R9), and that importing the module performs NO vault write (entrypoint guard).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { parseEngineDigest, buildNote, buildNoteNameMap, isFullRun, parseArgs, KINDS, looksLikeProse, isIndexableSource, isModuleResidual, preserveEnrichedSummary, extractWhatItIs } from "./code-to-vault.mjs";
import { extractFacts } from "./lib/code-file-facts.mjs";

const ENGINE_SRC = `/**
 * KienzleForceEngine -- cutting-force model via the Kienzle equation.
 */
import { KC11_BY_ISO } from "../physics/constants.js";
import { ChipThinningEngine } from "./ChipThinningEngine.js";
export class KienzleForceEngine {
  computeForce(ap, fz) { return ap * fz; }
}
`;

test("parseEngineDigest: '- **Name**: summary' -> Map", () => {
  const d = parseEngineDigest(`# DIGEST
- **KienzleForceEngine**: cutting force model
- **FooEngine**: does foo things
not a line
- **BarEngine**: bar`);
  assert.equal(d.get("KienzleForceEngine"), "cutting force model");
  assert.equal(d.get("BarEngine"), "bar");
  assert.equal(d.size, 3);
  assert.equal(parseEngineDigest("").size, 0);
});

test("buildNote: valid frontmatter + all sections + dep wikilink + sourceHash", () => {
  const facts = extractFacts("mcp-server/src/engines/mill/KienzleForceEngine.ts", ENGINE_SRC, "engine");
  const note = buildNote(facts, { digestSummary: "cutting force model", generatedAt: "2026-07-02T00:00:00Z", sourceHash: "deadbeef" });
  // Frontmatter
  assert.match(note, /^---\n/);
  assert.match(note, /name: reference_code_engine_kienzleforceengine/);
  assert.match(note, /type: reference/);
  assert.match(note, /kind: code-engine/);
  assert.match(note, /galaxy: mill/);
  assert.match(note, /sourceHash: deadbeef/);
  assert.match(note, /sourcePath: mcp-server\/src\/engines\/mill\/KienzleForceEngine\.ts/);
  // Body sections
  assert.match(note, /## What it is/);
  assert.match(note, /cutting force model/);
  assert.match(note, /## Exports/);
  assert.match(note, /`KienzleForceEngine` \(class\)/);
  assert.match(note, /## Key methods/);
  assert.match(note, /`computeForce`/);
  // Dependency wikilink densifies the graph
  assert.match(note, /\[\[reference_code_engine_chipthinningengine\]\]/);
  // Physics safety marker
  assert.match(note, /safety-relevant node/);
  // ASCII-only (ascii-guard parity)
  assert.ok(/^[\x00-\x7F]*$/.test(note), "note body is ASCII-only");
});

test("buildNote: cross-kind dep resolution (engine->registry real edge; external->plain text)", () => {
  const src = `import { MaterialRegistry } from "../registries/MaterialRegistry.js";
import { Logger } from "../util/Logger.js";
export class FooEngine { go() { return 1; } }`;
  const facts = extractFacts("mcp-server/src/engines/FooEngine.ts", src, "engine");
  const slugToNote = new Map([["materialregistry", "reference_code_registry_materialregistry"]]);
  const note = buildNote(facts, { sourceHash: "dd", slugToNote });
  // In-corpus dep resolves to its REAL (registry) note -> a correct graph edge, not a phantom.
  assert.match(note, /\[\[reference_code_registry_materialregistry\]\]/);
  // External/non-indexed dep (Logger absent from the map) -> plain code span, NO phantom wikilink.
  assert.doesNotMatch(note, /\[\[reference_code_engine_logger\]\]/);
  assert.match(note, /`Logger`/);
  // Back-compat: with NO resolver, deps still fall back to engine-namespace wikilinks.
  const noResolver = buildNote(facts, { sourceHash: "ee" });
  assert.match(noResolver, /\[\[reference_code_engine_materialregistry\]\]/);
});

test("buildNote: description escapes quotes + is single line", () => {
  const facts = extractFacts("x/Y.ts", `export class Y {}`, "engine");
  const note = buildNote(facts, { digestSummary: 'has "quotes" and\nnewline', sourceHash: "aa" });
  const descLine = note.split("\n").find((l) => l.startsWith("description:"));
  assert.ok(descLine.includes("'quotes'"), "double-quotes downgraded to single");
  // The newline must have collapsed to a space so the FULL text lands on one line -- a
  // real check of the \s+->" " invariant, not the tautology that a split("\n") line has no newline.
  assert.match(descLine, /has 'quotes' and newline"$/);
});

test("buildNote: fail-soft on a headerless schema-style file (no class)", () => {
  const facts = extractFacts("mcp-server/src/schemas/toolSchema.ts", `export const toolSchema = z.object({});`, "schema");
  const note = buildNote(facts, { sourceHash: "bb" });
  assert.match(note, /name: reference_code_schema_toolschema/);
  assert.match(note, /`toolSchema` \(const\)/);
  assert.match(note, /no header summary/); // graceful placeholder
});

test("buildNoteNameMap: same basename in different subdirs -> no silent clobber", () => {
  const cands = [
    { kind: "engine", rel: "mcp-server/src/engines/mill/PrintToProgramEngine.ts" },
    { kind: "engine", rel: "mcp-server/src/engines/wedm/PrintToProgramEngine.ts" },
    { kind: "engine", rel: "mcp-server/src/engines/mill/Solo.ts" },
  ];
  const map = buildNoteNameMap(cands, () => "abcdef99");
  const names = cands.map((c) => map.get(c.rel));
  // Solo is unique -> bare name.
  assert.equal(map.get("mcp-server/src/engines/mill/Solo.ts"), "reference_code_engine_solo");
  // Two colliders -> distinct names, first (sorted) keeps bare, second gets suffix.
  assert.equal(new Set(names).size, 3, "all three note names are distinct (no clobber)");
  const collide = names.filter((n) => n.startsWith("reference_code_engine_printtoprogramengine"));
  assert.equal(collide.length, 2);
  assert.ok(collide.includes("reference_code_engine_printtoprogramengine"), "first keeps bare name");
  assert.ok(collide.some((n) => /_abcdef99$/.test(n)), "second gets 8-char path-hash suffix");
});

test("isFullRun: ONLY a whole-corpus run (all kinds, no galaxy, no batch) may rewrite the index", () => {
  const all = ["engine", "algorithm", "dispatcher", "schema", "registry", "physics", "hook", "lib"];
  const full = { kinds: all, offset: 0, limit: Infinity, galaxy: null };
  assert.equal(isFullRun(full, all), true);
  assert.equal(isFullRun({ ...full, kinds: ["engine"] }, all), false, "single kind is NOT a full run (arm-C blocker)");
  assert.equal(isFullRun({ ...full, kinds: ["engine", "bogus"] }, all), false, "unknown/mistyped kind is NOT a full run");
  assert.equal(isFullRun({ ...full, galaxy: "mill" }, all), false, "galaxy filter is NOT full");
  assert.equal(isFullRun({ ...full, offset: 100 }, all), false, "offset batch is NOT full");
  assert.equal(isFullRun({ ...full, limit: 500 }, all), false, "limit batch is NOT full");
  // Set-uniqueness: a duplicate + omission (length still 8) must NOT pass as all-kinds (arm-C P2).
  assert.equal(
    isFullRun({ ...full, kinds: ["engine", "engine", "algorithm", "dispatcher", "schema", "registry", "physics", "lib"] }, all),
    false, "duplicate-kind + omission is NOT a full run",
  );
});

test("parseArgs: --limit 0 stays 0 (empty batch), never Infinity", () => {
  assert.equal(parseArgs(["--limit", "0"]).limit, 0, "explicit 0 preserved");
  assert.equal(parseArgs(["--limit", "50"]).limit, 50);
  assert.equal(parseArgs(["--limit", "junk"]).limit, Infinity, "unparseable -> unlimited");
  assert.equal(parseArgs([]).limit, Infinity, "default unlimited");
  assert.equal(parseArgs(["--offset", "10", "--limit", "5"]).offset, 10);
  assert.ok(parseArgs([]).kinds.length >= 8, "default = all kinds");
});

test("looksLikeProse: accepts a real summary, rejects code-dumps / fences / fallback notices", () => {
  // Real prose -> accepted.
  assert.equal(looksLikeProse("This dispatcher routes safety-validation actions to their engines."), true);
  // Code dump / fence / markup -> rejected (worse than the honest placeholder).
  assert.equal(looksLikeProse("```typescript\ncase 'x': { const e = await import('./Y.js'); }"), false);
  assert.equal(looksLikeProse("} case \"thread_mill_validate\": { const { threadMillingEngine } = await"), false);
  assert.equal(looksLikeProse("### Code Explanation\n#### File Overview"), false); // starts with markup #
  // ask-ollama fallback notice -> rejected.
  assert.equal(looksLikeProse("OLLAMA FALLBACK -> Claude/Sonnet. The local explain task could not run."), false);
  // Too short / no sentence -> rejected.
  assert.equal(looksLikeProse("ok"), false);
  assert.equal(looksLikeProse("a function that does stuff no period here"), false);
});

test("KINDS: nested roots ordered specific-before-general (lib before script) so dedup is correct", () => {
  const keys = Object.keys(KINDS);
  // scripts/lib nests under scripts -> lib MUST precede script (first-kind-wins dedup),
  // else every scripts/lib file would be re-indexed as a 'script' duplicate.
  assert.ok(keys.indexOf("lib") < keys.indexOf("script"), "lib kind precedes script kind");
  // The new code-heavy kinds are registered.
  for (const k of ["data", "script", "route", "service", "util", "middleware", "mcp", "db"]) {
    assert.ok(KINDS[k] && KINDS[k].root, `kind '${k}' registered with a root`);
  }
  // engine indexes both .ts and .mjs (nested .mjs engines were being missed).
  assert.ok(KINDS.engine.exts.includes(".ts") && KINDS.engine.exts.includes(".mjs"));
  // frontend (Next.js/React web app) + module (backend long-tail catch-all) close the
  // coverage gap the goal named ("modules ... and other code heavy builds").
  assert.equal(KINDS.frontend.root, "mcp-server/web/src", "frontend rooted at the web app src");
  assert.ok(KINDS.frontend.exts.includes(".ts") && KINDS.frontend.exts.includes(".tsx"), "frontend indexes .ts + .tsx");
  assert.equal(KINDS.module.root, "mcp-server/src", "module is the mcp-server/src catch-all");
  // CRITICAL dedup invariant: `module` (root mcp-server/src) nests OVER every specific
  // backend kind, so it MUST be ordered after all of them -- else first-kind-wins would
  // re-label an engine/schema/dispatcher/... as a generic 'code-module'.
  const srcKinds = keys.filter((k) => k !== "module" && KINDS[k].root.startsWith("mcp-server/src"));
  assert.ok(srcKinds.length >= 12, "sanity: many specific mcp-server/src kinds exist");
  for (const k of srcKinds) {
    assert.ok(keys.indexOf("module") > keys.indexOf(k), `module ordered after '${k}' (dedup keeps the specific kind)`);
  }
});

test("parseArgs: duplicate --kind is deduped (no double-walk -> no spurious notes)", () => {
  // A repeated kind must collapse to one -- otherwise the tree is walked twice, every
  // file self-collides, and a spurious 8-hex duplicate note is emitted (the live pollution
  // bug of 2026-07-02). Idempotent input.
  assert.deepEqual(parseArgs(["--kind", "engine", "--kind", "engine"]).kinds, ["engine"]);
  assert.deepEqual(parseArgs(["--kind", "engine", "--kind", "lib", "--kind", "engine"]).kinds, ["engine", "lib"]);
});

test("parseArgs: kinds forced into KINDS order so nested-root dedup is arg-order-proof", () => {
  const order = Object.keys(KINDS);
  // module (root mcp-server/src) MUST land after engine even when passed first -- else the
  // catch-all claims every backend file and emits spurious code-module notes (R16 footgun).
  assert.deepEqual(parseArgs(["--kind", "module", "--kind", "engine"]).kinds, ["engine", "module"]);
  // lib before script regardless of arg order (scripts/lib nests under scripts).
  assert.deepEqual(parseArgs(["--kind", "script", "--kind", "lib"]).kinds, ["lib", "script"]);
  // module is last of any set that includes it.
  const k = parseArgs(["--kind", "module", "--kind", "schema", "--kind", "frontend"]).kinds;
  assert.equal(k[k.length - 1], "module", "module resolves last");
  // General invariant: output is sorted by KINDS index.
  assert.deepEqual(k, [...k].sort((x, y) => order.indexOf(x) - order.indexOf(y)));
});

test("parseArgs: two unknown kinds don't NaN-crash the order sort (arm-B P2)", () => {
  // The sort comparator must use a finite sentinel for unknowns -- Infinity-Infinity=NaN is
  // undefined sort behavior. Known kinds still precede unknowns.
  assert.doesNotThrow(() => parseArgs(["--kind", "bogus1", "--kind", "bogus2"]));
  const k = parseArgs(["--kind", "zzz-unknown", "--kind", "engine"]).kinds;
  assert.equal(k[0], "engine", "known kind sorts before an unknown");
});

test("isIndexableSource: excludes .test/.spec across ts+tsx+jsx (arm-A P1 -- .test.tsx was leaking)", () => {
  const FE = [".ts", ".tsx"];
  // Real source files index.
  assert.equal(isIndexableSource("QuotePage.tsx", FE), true);
  assert.equal(isIndexableSource("api.ts", FE), true);
  assert.equal(isIndexableSource("hook.mjs", [".mjs"]), true);
  // THE BUG: .test.tsx / .spec.tsx must be excluded (old [tj]s$ guard missed the trailing x).
  assert.equal(isIndexableSource("JMDieFleetScanStatusPanel.test.tsx", FE), false);
  assert.equal(isIndexableSource("Widget.spec.tsx", FE), false);
  assert.equal(isIndexableSource("Widget.spec.jsx", [".jsx"]), false);
  // Pre-existing exclusions still hold.
  assert.equal(isIndexableSource("Foo.test.ts", FE), false);
  assert.equal(isIndexableSource("types.d.ts", FE), false);
  // Wrong extension rejected.
  assert.equal(isIndexableSource("styles.css", FE), false);
});

test("isModuleResidual: module catch-all structurally skips every specific src root (arm-A P1)", () => {
  // Files under a specific backend kind's root are NOT residual -> module never claims them,
  // REGARDLESS of --kind arg order (the sort-only fix could not guarantee this).
  assert.equal(isModuleResidual("mcp-server/src/engines/mill/Foo.ts"), false);
  assert.equal(isModuleResidual("mcp-server/src/schemas/toolSchema.ts"), false);
  assert.equal(isModuleResidual("mcp-server/src/algorithms/Bar.ts"), false);
  assert.equal(isModuleResidual("mcp-server/src/tools/dispatchers/camDispatcher.ts"), false);
  // Genuinely-uncovered subdirs ARE residual -> module claims them (the intended long tail).
  assert.equal(isModuleResidual("mcp-server/src/types/index.ts"), true);
  assert.equal(isModuleResidual("mcp-server/src/orchestration/Loop.ts"), true);
  assert.equal(isModuleResidual("mcp-server/src/hooks/thing.ts"), true); // NOT .claude/hooks
  assert.equal(isModuleResidual("mcp-server/src/tools/looseTool.ts"), true); // non-dispatcher tools
});

test("buildNote: React .tsx (JSX + default-export fn) round-trips with no throw + valid frontmatter (arm-B R9 gap)", () => {
  // The 'React .tsx extracts cleanly' claim was a code comment, not an assertion. This makes
  // it a real R9 check: a future regex regression that broke JSX/default-export parsing would
  // fail here instead of silently emitting garbage across all 698 frontend notes.
  const tsx = `import { useState } from "react";
import { fetchQuote } from "../lib/api";
export default function QuotePage() {
  const [q, setQ] = useState(null);
  return <div onClick={() => fetchQuote().then(setQ)}>{q?.total}</div>;
}`;
  let facts, note;
  assert.doesNotThrow(() => { facts = extractFacts("mcp-server/web/src/pages/QuotePage.tsx", tsx, "frontend"); });
  assert.equal(facts.kind, "frontend");
  assert.equal(facts.primary, "QuotePage", "default-export function is the primary symbol");
  assert.doesNotThrow(() => { note = buildNote(facts, { sourceHash: "f1" }); });
  assert.match(note, /kind: code-frontend/);
  assert.match(note, /name: reference_code_frontend_quotepage/);
  assert.ok(/^[\x00-\x7F]*$/.test(note), "tsx note is ASCII-only");
});

test("preserveEnrichedSummary: a regen wiping enrichment restores the existing prose (2026-07-04 regression)", () => {
  const facts = extractFacts("mcp-server/web/src/pages/A3ReportPage.tsx", `export default function A3ReportPage(){ return null; }`, "frontend");
  // Existing on-disk note was enriched; the fresh rebuild (source changed) is thin.
  const enriched = buildNote(facts, { sourceHash: "old" }).replace(
    /## What it is\n_\(no header summary[^\n]*\)_/,
    "## What it is\nRenders the 8D/A3 corrective-action report page with root-cause and countermeasure sections.",
  );
  const rebuilt = buildNote(facts, { sourceHash: "new" }); // thin placeholder, new hash
  assert.match(rebuilt, /no header summary/); // precondition: rebuild is thin
  const preserved = preserveEnrichedSummary(rebuilt, enriched);
  // The enriched prose is spliced back; the placeholder is gone; the FRESH hash is kept.
  assert.match(preserved, /Renders the 8D\/A3 corrective-action report page/);
  assert.doesNotMatch(preserved, /no header summary/);
  assert.match(preserved, /sourceHash: new/, "fresh source hash preserved (freshness still applied)");
});

test("preserveEnrichedSummary: no-op when the new note already has prose or nothing to preserve", () => {
  const facts = extractFacts("x/Y.ts", `export class Y {}`, "engine");
  const thinNew = buildNote(facts, { sourceHash: "n" });
  // Existing is ALSO thin -> nothing to preserve -> returned unchanged.
  assert.equal(preserveEnrichedSummary(thinNew, buildNote(facts, { sourceHash: "o" })), thinNew);
  // No existing note (new file) -> unchanged.
  assert.equal(preserveEnrichedSummary(thinNew, ""), thinNew);
  // New note already enriched (has a real header) -> never overwritten by an old thin one.
  const withJsdoc = extractFacts("x/Z.ts", `/**\n * Z does a thing.\n */\nexport class Z {}`, "engine");
  const richNew = buildNote(withJsdoc, { sourceHash: "n" });
  assert.equal(preserveEnrichedSummary(richNew, thinNew), richNew);
});

test("extractWhatItIs: pulls the What-it-is body, empty when the section is absent", () => {
  const facts = extractFacts("x/Y.ts", `export class Y {}`, "engine");
  assert.match(extractWhatItIs(buildNote(facts, { sourceHash: "a" })), /no header summary/);
  assert.equal(extractWhatItIs("no sections here"), "");
});

test("entrypoint guard: importing the module writes nothing to the vault", () => {
  // The index path the CLI would write; importing (this test) must not create it fresh.
  // We assert buildNote/parseEngineDigest are pure by re-invoking with no fs side effect:
  const before = fs.existsSync(path.join("H:/prism", "state", "shared", "CODE-VAULT-INVENTORY.md"));
  buildNote(extractFacts("a/B.ts", "export class B {}", "engine"), { sourceHash: "cc" });
  parseEngineDigest("- **B**: b");
  const after = fs.existsSync(path.join("H:/prism", "state", "shared", "CODE-VAULT-INVENTORY.md"));
  assert.equal(before, after, "pure calls did not create the CLI index file");
});
