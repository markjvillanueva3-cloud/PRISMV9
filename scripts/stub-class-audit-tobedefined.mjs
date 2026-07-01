#!/usr/bin/env node
/**
 * stub-class-audit-tobedefined.mjs — find tests that ONLY use toBeDefined().
 *
 * Per CommonlyMissedPatternsRegistry rule `toBeDefined_only` (severity 5):
 * a test is a stub if it uses toBeDefined() AND lacks any real assertion
 * (toBe / toEqual / toMatch / toThrow / toBeCloseTo / toBeGreaterThan /
 * toBeLessThan / toBeTruthy / toBeFalsy / toBeNull / toBeUndefined /
 * toHaveLength / toContain).
 *
 * @module scripts/stub-class-audit-tobedefined
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = dirname(dirname(fileURLToPath(import.meta.url)));

const REAL_ASSERTION = /toBe\s*\(|toEqual\s*\(|toMatch\s*\(|toThrow\s*\(|toBeCloseTo\s*\(|toBeGreaterThan\s*\(|toBeLessThan\s*\(|toBeTruthy\s*\(|toBeFalsy\s*\(|toBeNull\s*\(|toBeUndefined\s*\(|toHaveLength\s*\(|toContain\s*\(/;
const PLACEHOLDER = /toBeDefined\s*\(\)/;

export function isStubTest(src) {
  return PLACEHOLDER.test(src) && !REAL_ASSERTION.test(src);
}

export function scan(root) {
  const offenders = [];
  (function walk(dir) {
    for (const e of readdirSync(dir)) {
      const f = join(dir, e);
      const st = statSync(f);
      if (st.isDirectory()) walk(f);
      else if (e.endsWith(".test.ts")) {
        const src = readFileSync(f, "utf8");
        if (isStubTest(src)) {
          offenders.push({ file: relative(root, f).replace(/\\/g, "/"), bytes: st.size });
        }
      }
    }
  })(root);
  return offenders.sort((a, b) => a.bytes - b.bytes);
}

// ---- R9/R12 quality extension (DISCOVERY-EFFICIENCY, slot:tango 2026-06-15) ----
// isStubTest above catches the worst R9 case (toBeDefined-only). Three adjacent
// doctrine gaps it did NOT cover, each a "test reports green but verifies nothing":
//   * skipped      -- it.skip / test.skip / describe.skip / .todo / xit / xdescribe
//                     (R12: "tests pass is a lie if you .skip-ped any").
//   * focused      -- it.only / describe.only / fit / fdescribe (a committed .only
//                     SILENTLY disables every sibling test in its block).
//   * assertionFree-- a file with an ACTIVE test block but ZERO assertions
//                     (expect / node-assert / should) -- asserts nothing (R9).
// All advisory + must-human-verify (a custom assert helper can yield a rare FP).

const SKIP_RE = /\b(?:it|test|describe|context|suite)\s*\.\s*skip\s*\(|\b(?:it|test)\s*\.\s*todo\s*\(|\bx(?:it|describe|test)\s*\(/g;
// .only forms only. The Jasmine `fit(`/`fdescribe(` aliases are NOT used by
// vitest/node:test (PRISM's frameworks) and collide with curve-`fit(` / `model.fit(`
// (CPK surrogate, ArcFitting, Weibull, regression) -- a verified false-positive class.
const ONLY_RE = /\b(?:it|test|describe|context|suite)\s*\.\s*only\s*\(/g;
const TEST_BLOCK_RE = /\b(?:it|test)\s*(?:\.\s*\w+\s*)?\(/g;
const ASSERTION_RE = /\bexpect\s*\(|\bassert\s*[.(]|\.should\b|\bt\.(?:is|ok|assert|deepEqual|truthy|falsy|throws|notThrows)\s*\(|toMatchSnapshot\s*\(/;

export function countMatches(re, src) {
  let n = 0;
  for (const _m of src.matchAll(re)) n++;
  return n;
}

// Blank the CONTENTS of strings, template literals, and comments (delimiters kept)
// so the heuristic matchers never fire on focused/skip markers that live INSIDE a
// string fixture or a comment. Verified FP class: GapPredictorEngine /
// CounterfactualBuildSimulator carry focused-test markers as test-INPUT strings.
// A real skipped suite call still matches (the call is real code; only its title
// string is blanked).
export function stripCode(src) {
  let out = "";
  let i = 0;
  const n = src.length;
  let state = "code"; // code | line | block | sq | dq | tpl
  while (i < n) {
    const c = src[i];
    const c2 = i + 1 < n ? src[i + 1] : "";
    if (state === "code") {
      if (c === "/" && c2 === "/") { state = "line"; out += "  "; i += 2; continue; }
      if (c === "/" && c2 === "*") { state = "block"; out += "  "; i += 2; continue; }
      if (c === "'") { state = "sq"; out += c; i++; continue; }
      if (c === '"') { state = "dq"; out += c; i++; continue; }
      if (c === "`") { state = "tpl"; out += c; i++; continue; }
      out += c; i++; continue;
    }
    if (state === "line") { if (c === "\n") { state = "code"; out += c; } else out += " "; i++; continue; }
    if (state === "block") { if (c === "*" && c2 === "/") { state = "code"; out += "  "; i += 2; } else { out += c === "\n" ? "\n" : " "; i++; } continue; }
    // string states: handle escape pair, then the closing delimiter.
    if (c === "\\") { out += "  "; i += 2; continue; }
    if (state === "sq" && c === "'") { state = "code"; out += c; i++; continue; }
    if (state === "dq" && c === '"') { state = "code"; out += c; i++; continue; }
    if (state === "tpl" && c === "`") { state = "code"; out += c; i++; continue; }
    out += c === "\n" ? "\n" : " "; i++;
  }
  return out;
}

export function countSkips(src) { return countMatches(SKIP_RE, stripCode(src)); }
export function countFocused(src) { return countMatches(ONLY_RE, stripCode(src)); }
export function isAssertionFree(src) {
  const code = stripCode(src);
  const blocks = countMatches(TEST_BLOCK_RE, code);
  const skipped = countMatches(SKIP_RE, code);
  if (blocks - skipped <= 0) return false; // no ACTIVE test block -> not "asserts nothing"
  return !ASSERTION_RE.test(code);
}
export function auditTest(src) {
  const code = stripCode(src);
  return {
    stubOnly: isStubTest(code),
    skips: countSkips(src),
    focused: countFocused(src),
    assertionFree: isAssertionFree(src),
  };
}

// Richer scan: walk a tree, classify every .test.ts into quality buckets.
// (scan() above is unchanged for backward compat; scanQuality is additive.)
export function scanQuality(root) {
  const buckets = { stubOnly: [], skipped: [], focused: [], assertionFree: [] };
  (function walk(dir) {
    let entries;
    try { entries = readdirSync(dir); } catch { return; }
    for (const e of entries) {
      if (e === "node_modules") continue;
      const f = join(dir, e);
      let st; try { st = statSync(f); } catch { continue; }
      if (st.isDirectory()) { walk(f); continue; }
      if (!e.endsWith(".test.ts")) continue;
      let src; try { src = readFileSync(f, "utf8"); } catch { continue; }
      const rel = relative(root, f).replace(/\\/g, "/");
      const a = auditTest(src);
      if (a.stubOnly) buckets.stubOnly.push({ file: rel, bytes: st.size });
      if (a.skips > 0) buckets.skipped.push({ file: rel, bytes: st.size, skips: a.skips });
      if (a.focused > 0) buckets.focused.push({ file: rel, bytes: st.size, focused: a.focused });
      if (a.assertionFree) buckets.assertionFree.push({ file: rel, bytes: st.size });
    }
  })(root);
  for (const k of Object.keys(buckets)) buckets[k].sort((a, b) => a.bytes - b.bytes);
  return buckets;
}

function fmtBucket(name, arr, extra) {
  let s = `\n${name}: ${arr.length}\n`;
  for (const o of arr.slice(0, 20)) {
    const tail = extra && o[extra] !== undefined ? `  (${extra}=${o[extra]})` : "";
    s += `  ${o.bytes.toString().padStart(6)}b  ${o.file}${tail}\n`;
  }
  if (arr.length > 20) s += `  ... +${arr.length - 20} more\n`;
  return s;
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("stub-class-audit-tobedefined.mjs")) {
  const args = process.argv.slice(2);
  const jsonOut = args.includes("--json");
  const quality = args.includes("--quality");
  const rootArg = args.find(a => !a.startsWith("--"));

  if (quality) {
    const root = rootArg || join(REPO, "mcp-server", "src");
    const b = scanQuality(root);
    const relRoot = relative(REPO, root).replace(/\\/g, "/") || ".";
    if (jsonOut) {
      process.stdout.write(JSON.stringify({
        ok: true, root: relRoot, advisoryOnly: true, mustHumanVerify: true,
        counts: { stubOnly: b.stubOnly.length, skipped: b.skipped.length, focused: b.focused.length, assertionFree: b.assertionFree.length },
        buckets: b,
      }) + "\n");
    } else {
      process.stdout.write(`=== TEST-ASSERTION-QUALITY AUDIT (R9/R12, advisory) root=${relRoot} ===\n`);
      process.stdout.write(fmtBucket("toBeDefined-only stubs (R9)", b.stubOnly));
      process.stdout.write(fmtBucket("skipped/todo/xit (R12 -- silently not run)", b.skipped, "skips"));
      process.stdout.write(fmtBucket("focused .only/fit (R12 -- silently disables siblings)", b.focused, "focused"));
      process.stdout.write(fmtBucket("assertion-free (R9 -- active test, zero assertions)", b.assertionFree));
    }
    process.exit(0);
  }

  const root = rootArg || join(REPO, "mcp-server", "src", "__tests__");
  const offenders = scan(root);
  if (jsonOut) {
    process.stdout.write(JSON.stringify({ ok: true, strictStubOnly: offenders.length, offenders }) + "\n");
  } else {
    process.stdout.write(`Strict toBeDefined-only test stubs: ${offenders.length}\n`);
    for (const o of offenders.slice(0, 30)) process.stdout.write(`  ${o.bytes.toString().padStart(6)}b  ${o.file}\n`);
    if (offenders.length > 30) process.stdout.write(`  ... +${offenders.length - 30} more\n`);
  }
  process.exit(0);
}
