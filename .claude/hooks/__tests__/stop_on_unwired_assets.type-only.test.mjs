// Tests for isTypeOnlyModule -- the TYPE-ONLY escape added to checkEngineTested in
// stop_on_unwired_assets.mjs (U-AUDIT-TYPE-ONLY sibling, 2026-06-22). A type-only
// `*Engine.ts` (e.g. an `IFooEngine.ts` re-export of `export type { ... }`) erases to
// zero runtime JS, so the Stop gate must NOT flag it UNTESTED (you cannot write 10 it()
// cases for a type re-export). Clone of the audit's detector (clone-don't-fork, R15).
// Run: node --test <thisfile>
//
// Intent (R9): the asserts encode the SAFE direction -- the only dangerous error is a
// FALSE positive (excluding a real engine from the test requirement). Every runtime-export
// shape must return false; only a positive type-export + zero runtime exports returns true.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { isTypeOnlyModule } from "../stop_on_unwired_assets.mjs";

// ── HAPPY: genuinely type-only modules → true ──
test("isTypeOnlyModule: `export type { ... } from` (the IEngine.ts shape) → true", () => {
  assert.equal(isTypeOnlyModule(`export type { EngineInfo, EngineCapability } from "./BaseEngine.js";`), true);
});
test("isTypeOnlyModule: `export interface` / `export type Foo =` / `export type * from` → true", () => {
  assert.equal(isTypeOnlyModule(`export interface Foo { x: number }`), true);
  assert.equal(isTypeOnlyModule(`export type Vec = readonly [number, number];`), true);
  assert.equal(isTypeOnlyModule(`export type * from "./shapes.js";`), true);
});
test("isTypeOnlyModule: JSDoc block + type-only export (comment stripped) → true", () => {
  const src = ["/**", " * IFooEngine -- type re-exports.", " */", `export type { Foo } from "./BaseEngine.js";`].join("\n");
  assert.equal(isTypeOnlyModule(src), true);
});

// ── FAILURE: any runtime export → false (must NEVER skip a real engine's test requirement) ──
test("isTypeOnlyModule: `export class` / `export const` / `export function` / `export default` → false", () => {
  assert.equal(isTypeOnlyModule(`export class FooEngine { run() {} }`), false);
  assert.equal(isTypeOnlyModule(`export const fooEngine = new FooEngine();`), false);
  assert.equal(isTypeOnlyModule(`export function calc(x) { return x; }`), false);
  assert.equal(isTypeOnlyModule(`export async function load() {}`), false);
  assert.equal(isTypeOnlyModule(`const e = {}; export default e;`), false);
});
test("isTypeOnlyModule: `export enum` / `export const enum` (emit runtime) → false (conservative)", () => {
  assert.equal(isTypeOnlyModule(`export enum Color { Red, Green }`), false);
  assert.equal(isTypeOnlyModule(`export const enum Dir { Up, Down }`), false);
});
test("isTypeOnlyModule: value re-export `export { x } from` / `export * from` / CJS → false", () => {
  assert.equal(isTypeOnlyModule(`export { fooEngine } from "./FooEngine.js";`), false);
  assert.equal(isTypeOnlyModule(`export * from "./barrel.js";`), false);
  assert.equal(isTypeOnlyModule(`module.exports = { fooEngine };`), false);
  assert.equal(isTypeOnlyModule(`exports.fooEngine = make();`), false);
});
test("isTypeOnlyModule: no-export / empty / null → false (positive type-export required)", () => {
  assert.equal(isTypeOnlyModule(`import "./register.js";\nconsole.log("boot");`), false);
  assert.equal(isTypeOnlyModule(``), false);
  assert.equal(isTypeOnlyModule(null), false);
  assert.equal(isTypeOnlyModule(undefined), false);
});

// ── ADVERSARIAL: the dangerous direction (a real engine wrongly skipped) ──
test("isTypeOnlyModule: ADVERSARIAL mixed file -- type export at top, runtime export later → false", () => {
  // The detector runs over the FULL source, so a runtime export below a type export is still seen.
  const src = [`export type Cfg = { n: number };`, `// 40 lines of type aliases`, `export const defaultCfg: Cfg = { n: 1 };`].join("\n");
  assert.equal(isTypeOnlyModule(src), false);
});
test("isTypeOnlyModule: ADVERSARIAL commented-out runtime export does NOT rescue a real-runtime file → false", () => {
  const src = [`export type Cfg = { n: number };`, `// export const x = 1; (disabled)`, `export const live = 2;`].join("\n");
  assert.equal(isTypeOnlyModule(src), false);
});
test("isTypeOnlyModule: ADVERSARIAL inline-type bare export `export { type Foo }` → false (conservative, never wrongly skips)", () => {
  assert.equal(isTypeOnlyModule(`export { type Foo } from "./shapes.js";`), false);
});

// ── E2E -- fail-on-revert oracle against the live IEngine.ts the fix targets ──
test("E2E: the live IEngine.ts is detected TYPE-ONLY (must not be flagged UNTESTED)", () => {
  const p = "H:/prism/mcp-server/src/engines/IEngine.ts";
  if (!existsSync(p)) return; // skip-quiet: not all checkouts carry it; unit tests cover the logic
  assert.equal(isTypeOnlyModule(readFileSync(p, "utf8")), true, "IEngine.ts exports only types -> no runtime to test");
});
