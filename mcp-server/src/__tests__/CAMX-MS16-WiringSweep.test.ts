/**
 * CAMX-MS16: Complete Dispatcher Wiring Sweep — verification tests.
 *
 * Invariants checked:
 *  - Every action in each dispatcher's ACTIONS enum has a switch case handler.
 *  - Each dispatcher meets its minimum-action target (cam ≥ 100 new, calc ≥ 20,
 *    toolpath ≥ 15, integration ≥ 20).
 *  - Dispatcher modules import cleanly (no broken references).
 *  - src/engines/index.ts exports a meaningful number of engines.
 */
import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

const repoRoot = path.resolve(__dirname, "..", "..");
const dispatcherDir = path.join(repoRoot, "src", "tools", "dispatchers");

function extractEnumActions(src: string): string[] {
  const found = new Set<string>();
  // Primary: ACTIONS literal array
  const m = src.match(/(?:export )?const ACTIONS\s*=\s*\[([\s\S]*?)\]\s*as const/);
  if (m) for (const x of m[1].matchAll(/"([a-z_0-9]+)"/g)) found.add(x[1]);
  // Secondary: any named *_ACTIONS literal (composed via spread)
  for (const sub of src.matchAll(/const [A-Z_]+_ACTIONS\s*=\s*\[([\s\S]*?)\]\s*as const/g)) {
    for (const x of sub[1].matchAll(/"([a-z_0-9]+)"/g)) found.add(x[1]);
  }
  if (found.size > 0) return [...found];
  // Fallback: inline z.enum([...])
  const inline = src.match(/z\.enum\(\[([\s\S]*?)\]\)/);
  if (inline) for (const x of inline[1].matchAll(/"([a-z_0-9]+)"/g)) found.add(x[1]);
  return [...found];
}

function extractCaseActions(src: string): Set<string> {
  return new Set([...src.matchAll(/case "([a-z_0-9]+)":/g)].map((x) => x[1]));
}

describe("CAMX-MS16 / Dispatcher Wiring Sweep", () => {
  const dispatchers = [
    { file: "camDispatcher.ts", minActions: 300 },
    { file: "calcDispatcher.ts", minActions: 300 },
    { file: "toolpathDispatcher.ts", minActions: 15 },
    { file: "integrationDispatcher.ts", minActions: 20 },
  ];

  for (const d of dispatchers) {
    describe(`U0x ${d.file}`, () => {
      const fullPath = path.join(dispatcherDir, d.file);
      const src = fs.readFileSync(fullPath, "utf8");
      const enumActions = extractEnumActions(src);
      const caseActions = extractCaseActions(src);
      const missing = enumActions.filter((a) => !caseActions.has(a));

      it("meets minimum action count", () => {
        expect(enumActions.length).toBeGreaterThanOrEqual(d.minActions);
      });

      it("every enum action has a switch-case handler (enum↔case parity)", () => {
        if (missing.length > 0) {
          console.error(`${d.file} missing cases:`, missing);
        }
        expect(missing).toEqual([]);
      });

      it("enum contains no obvious duplicates", () => {
        const unique = new Set(enumActions);
        expect(unique.size).toBe(enumActions.length);
      });
    });
  }

  it("U07 index.ts exports at least 100 engines", () => {
    const idx = fs.readFileSync(path.join(repoRoot, "src", "engines", "index.ts"), "utf8");
    const exports = idx.match(/^export\s+/gm) ?? [];
    expect(exports.length).toBeGreaterThan(100);
  });

  it("U08 camDispatcher module imports without throwing", async () => {
    const mod = await import("../tools/dispatchers/camDispatcher.js");
    expect(mod).toBeDefined();
  });

  it("U08 calcDispatcher module imports without throwing", async () => {
    const mod = await import("../tools/dispatchers/calcDispatcher.js");
    expect(mod).toBeDefined();
  });

  it("U08 toolpathDispatcher module imports without throwing", async () => {
    const mod = await import("../tools/dispatchers/toolpathDispatcher.js");
    expect(mod).toBeDefined();
  });

  it("U08 integrationDispatcher module imports without throwing", async () => {
    const mod = await import("../tools/dispatchers/integrationDispatcher.js");
    expect(mod).toBeDefined();
  });
});
