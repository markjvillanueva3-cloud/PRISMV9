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
import { join, relative } from "node:path";

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

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("stub-class-audit-tobedefined.mjs")) {
  const root = process.argv[2] || "H:/prism/mcp-server/src/__tests__";
  const offenders = scan(root);
  process.stdout.write(`Strict toBeDefined-only test stubs: ${offenders.length}\n`);
  for (const o of offenders.slice(0, 30)) process.stdout.write(`  ${o.bytes.toString().padStart(6)}b  ${o.file}\n`);
  if (offenders.length > 30) process.stdout.write(`  ... +${offenders.length - 30} more\n`);
  process.exit(0);
}
