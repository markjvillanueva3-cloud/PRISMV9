/**
 * CodeGraphProjectionEngine.test.ts -- GRAPH-AS-LLM-CONTEXT-MS0 / U-GAC03
 * Real reference-value tests over hermetic temp-dir .ts fixtures (a<->b cycle,
 * external import, invalid TS, large file, oversize skip). Covers single-file,
 * multi-file deps, cyclic import, unparseable file, oversize skip, large-file parse,
 * egoGraph retrieval, target-not-found, and adversarial bad-graph.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { codeGraphProjectionEngine, type CodeGraph } from "../engines/CodeGraphProjectionEngine.js";

let dir: string;

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), "codegraph-"));
  writeFileSync(
    join(dir, "a.ts"),
    [
      `import { b } from "./b.js";`,
      `import { c } from "./c.js";`,
      `import { readFileSync } from "node:fs";`,
      `export function fa() { return b() + c() + (readFileSync ? 1 : 0); }`,
      `export class CA { run() { return fa(); } }`,
    ].join("\n"),
  );
  writeFileSync(join(dir, "b.ts"), `import { a } from "./a.js";\nexport function b() { return (a ? 1 : 0); }`);
  writeFileSync(join(dir, "c.ts"), `export function c() { return 2; }`);
  writeFileSync(
    join(dir, "standalone.ts"),
    `export const x = 1;\nexport const y = 2;\nexport interface IX { n: number; }\nexport type TX = string;`,
  );
  writeFileSync(join(dir, "bad.ts"), `export function broken(((( { not valid typescript =====`);
  // ~1500 top-level const decls -> a genuinely large (but parseable) file
  const big = Array.from({ length: 1500 }, (_, i) => `export const v${i} = ${i};`).join("\n");
  writeFileSync(join(dir, "big.ts"), big);
});
afterAll(() => {
  try { rmSync(dir, { recursive: true, force: true }); } catch { /* ignore */ }
});

describe("project single file", () => {
  it("a.ts -> file + symbol + import-target nodes, resolved deps", () => {
    const g = codeGraphProjectionEngine.project({ target: join(dir, "a.ts"), repoRoot: dir });
    expect(g.filesParsed).toBe(1);
    const ids = g.nodes.map((n) => n.id);
    expect(ids).toContain("file:a.ts");
    expect(ids).toContain("sym:a.ts#fa");
    expect(ids).toContain("sym:a.ts#CA");
    expect(ids).toContain("file:b.ts"); // resolved relative import target
    expect(ids).toContain("file:c.ts");
    expect(ids).toContain("ext:node:fs"); // external import
    expect(g.depsResolved).toBe(true);
    // verifies_via threshold: nodes>=5, edges>=3
    expect(g.nodes.length).toBeGreaterThanOrEqual(5);
    expect(g.edges.length).toBeGreaterThanOrEqual(3);
    expect(g.edges.some((e) => e.from === "file:a.ts" && e.to === "sym:a.ts#fa" && e.kind === "declares")).toBe(true);
    expect(g.edges.some((e) => e.from === "file:a.ts" && e.to === "file:b.ts" && e.kind === "imports")).toBe(true);
  });
});

describe("project multi-file + cycle", () => {
  let g: CodeGraph;
  beforeAll(() => {
    g = codeGraphProjectionEngine.project({ target: dir, repoRoot: dir });
  });
  it("walks all fixture files", () => {
    expect(g.filesParsed).toBeGreaterThanOrEqual(6); // a,b,c,standalone,bad,big
    const ids = g.nodes.map((n) => n.id);
    expect(ids).toContain("file:standalone.ts");
    expect(ids).toContain("sym:standalone.ts#IX");
    expect(ids).toContain("sym:standalone.ts#TX");
  });
  it("records the a<->b cycle without throwing (both edges present)", () => {
    expect(g.edges.some((e) => e.from === "file:a.ts" && e.to === "file:b.ts" && e.kind === "imports")).toBe(true);
    expect(g.edges.some((e) => e.from === "file:b.ts" && e.to === "file:a.ts" && e.kind === "imports")).toBe(true);
  });
});

describe("project edge cases", () => {
  it("unparseable file does not throw; file node still emitted (no total loss)", () => {
    const g = codeGraphProjectionEngine.project({ target: join(dir, "bad.ts"), repoRoot: dir });
    expect(g.filesParsed).toBe(1);
    expect(g.filesSkipped).toBe(0); // pins the lenient-parse invariant (NOT the catch/skip path)
    expect(g.nodes.some((n) => n.id === "file:bad.ts")).toBe(true);
  });

  it("oversize file is skipped + warned (deterministic via maxFileBytes)", () => {
    const g = codeGraphProjectionEngine.project({ target: dir, repoRoot: dir, maxFileBytes: 50 });
    expect(g.filesSkipped).toBeGreaterThanOrEqual(1);
    expect(g.warnings.some((w) => w.includes("skipped oversize"))).toBe(true);
  });

  it("large (but parseable) file extracts many symbols", () => {
    const g = codeGraphProjectionEngine.project({ target: join(dir, "big.ts"), repoRoot: dir });
    expect(g.filesParsed).toBe(1);
    const consts = g.nodes.filter((n) => n.kind === "const" && n.file === "big.ts");
    expect(consts.length).toBeGreaterThanOrEqual(1000);
  });

  it("target not found -> warning, empty, no throw", () => {
    const g = codeGraphProjectionEngine.project({ target: join(dir, "nope-dir"), repoRoot: dir });
    expect(g.nodes.length).toBe(0);
    expect(g.warnings.some((w) => w.includes("target not found"))).toBe(true);
  });
});

describe("egoGraph (RepoGraph retrieval)", () => {
  it("1-hop around a file includes its symbols + import targets, cycle-safe", () => {
    const g = codeGraphProjectionEngine.project({ target: dir, repoRoot: dir });
    const ego = codeGraphProjectionEngine.egoGraph(g, "file:a.ts", 1);
    expect(ego.center).toBe("file:a.ts");
    const ids = ego.nodes.map((n) => n.id);
    expect(ids).toContain("file:a.ts");
    expect(ids).toContain("sym:a.ts#fa");
    expect(ids).toContain("file:b.ts"); // direct import neighbor
    // b<->a cycle does not cause infinite loop: non-empty, bounded, no node visited twice
    expect(ego.nodes.length).toBeGreaterThan(0);
    expect(new Set(ids).size).toBe(ego.nodes.length);
    expect(ego.nodes.length).toBeLessThan(g.nodes.length + 1);
  });

  it("bad graph rejects", () => {
    // @ts-expect-error intentional bad input
    expect(() => codeGraphProjectionEngine.egoGraph(null, "x", 1)).toThrow(/nodes/);
  });
});
