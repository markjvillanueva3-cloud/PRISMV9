// Tests for .claude/hooks/subagent-stop-verifier.mjs (U-HKA05).
//
// Run: cd H:/prism && node mcp-server/node_modules/vitest/vitest.mjs run \
//        --config .claude/helpers/vitest.config.mjs \
//        .claude/hooks/__tests__/subagent-stop-verifier.test.mjs
//
// Intent: a subagent that claims to have created files which don't exist gets its
// stop BLOCKED with a "create them or correct your summary" message (so it
// self-corrects); future-tense intentions and unparseable summaries are NEVER
// flagged; one block max, then surface-and-let-stop.

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import {
  findRoot,
  extractFileClaims,
  verifyClaims,
  decideVerdict,
  getSubagentText,
  runVerifier,
} from "../subagent-stop-verifier.mjs";

describe("extractFileClaims — confident past-tense creation claims only", () => {
  it("pulls paths after past-tense creation verbs", () => {
    const txt = "Done: I created the file `mcp-server/src/engines/FooEngine.ts` and added a test at mcp-server/src/__tests__/FooEngine.test.ts. Also generated scripts/foo.mjs.";
    const got = extractFileClaims(txt).sort();
    expect(got).toContain("mcp-server/src/engines/FooEngine.ts");
    expect(got).toContain("mcp-server/src/__tests__/FooEngine.test.ts");
    expect(got).toContain("scripts/foo.mjs");
  });
  it("handles the PRISM commit-msg style ('new `path`')", () => {
    const txt = "Delivered HC-0: new `mcp-server/src/engines/SpecHTMLCompanionEngine.ts` + the dispatcher wiring. 33/33 pass.";
    expect(extractFileClaims(txt)).toContain("mcp-server/src/engines/SpecHTMLCompanionEngine.ts");
  });
  it("does NOT match future-tense / hypothetical mentions", () => {
    expect(extractFileClaims("Next I'll write `a/b.ts` and should add `c/d.ts`; consider creating `e/f.ts`.")).toEqual([]);
    expect(extractFileClaims("The plan: add a new module at `x/y.ts`.")).toEqual([]);
  });
  it("filters URLs, globs, version strings, and bare words", () => {
    expect(extractFileClaims("created https://example.com/x.html")).toEqual([]);
    expect(extractFileClaims("added the matcher *.test.ts to the bundle")).toEqual([]);
    expect(extractFileClaims("committed v2.1.139 of the tool")).toEqual([]);
    expect(extractFileClaims("wrote 3 tests")).toEqual([]);
    expect(extractFileClaims("created the engine")).toEqual([]); // no path token
  });
  it("dedups, normalises backslashes, ignores empty/non-string", () => {
    expect(extractFileClaims("created `a\\b\\c.ts`, also created a/b/c.ts again")).toEqual(["a/b/c.ts"]);
    expect(extractFileClaims("")).toEqual([]);
    expect(extractFileClaims(undefined)).toEqual([]);
    expect(extractFileClaims(42)).toEqual([]);
  });
  it("a BARE basename next to a creation verb is NOT a claim — only paths with a separator count (false-positive guard)", () => {
    // The exact shape that false-flagged a reviewer subagent: it *cited* a file by basename.
    expect(extractFileClaims("U-HKA02 created the hook `autonomous-loop-defer.mjs` (great!)")).toEqual([]);
    expect(extractFileClaims("created `FooEngine.ts` and wrote `Bar.test.ts`")).toEqual([]);
    // ...the same line with the real PATH still IS a claim:
    expect(extractFileClaims("U-HKA02 created `.claude/hooks/autonomous-loop-defer.mjs`")).toEqual([".claude/hooks/autonomous-loop-defer.mjs"]);
    expect(extractFileClaims("created `src/engines/FooEngine.ts`")).toEqual(["src/engines/FooEngine.ts"]);
  });
});

describe("verifyClaims — existence check (existsFn injected)", () => {
  const existsFn = (p) => p.replace(/\\/g, "/").includes("REAL");
  it("splits claims into verified vs missing", () => {
    const { verified, missing } = verifyClaims(["src/REAL/a.ts", "src/GHOST/b.ts", "REAL.test.ts"], { existsFn, root: "/repo" });
    expect(verified.sort()).toEqual(["REAL.test.ts", "src/REAL/a.ts"]);
    expect(missing).toEqual(["src/GHOST/b.ts"]);
  });
  it("relative paths are tried against the repo root", () => {
    const seen = [];
    const ef = (p) => { seen.push(p.replace(/\\/g, "/")); return false; };
    verifyClaims(["rel/x.ts"], { existsFn: ef, root: "/repo" });
    expect(seen.some((p) => p === "/repo/rel/x.ts")).toBe(true);
  });
  it("absolute / drive-letter paths are used as-is", () => {
    const seen = [];
    const ef = (p) => { seen.push(p.replace(/\\/g, "/")); return false; };
    verifyClaims(["H:/prism/x.ts", "/abs/y.ts"], { existsFn: ef, root: "/repo" });
    expect(seen).toContain("H:/prism/x.ts");
    expect(seen).toContain("/abs/y.ts");
    expect(seen.every((p) => !p.includes("/repo/"))).toBe(true);
  });
});

describe("decideVerdict", () => {
  it("0 claims → pass", () => expect(decideVerdict({ missing: [], claimsCount: 0, stopHookActive: false }).action).toBe("pass"));
  it("claims, none missing → pass", () => expect(decideVerdict({ missing: [], claimsCount: 3, stopHookActive: false }).action).toBe("pass"));
  it("something missing, first time → block, message lists the files + the corrective ask", () => {
    const v = decideVerdict({ missing: ["a/b.ts", "c/d.ts"], claimsCount: 4, stopHookActive: false });
    expect(v.action).toBe("block");
    expect(v.message).toMatch(/a\/b\.ts/);
    expect(v.message).toMatch(/c\/d\.ts/);
    expect(v.message.toLowerCase()).toMatch(/create them|correct your summary/);
  });
  it("still missing after a prior block (stop_hook_active) → warn (no loop)", () => {
    const v = decideVerdict({ missing: ["a/b.ts"], claimsCount: 1, stopHookActive: true });
    expect(v.action).toBe("warn");
    expect(v.message.toLowerCase()).toMatch(/unreliable|don't exist/);
  });
});

describe("getSubagentText — several payload shapes", () => {
  it("reads stdin.result / .output / .summary directly", () => {
    expect(getSubagentText({ result: "the result text" })).toBe("the result text");
    expect(getSubagentText({ output: "out" })).toBe("out");
    expect(getSubagentText({ summary: "summ" })).toBe("summ");
  });
  it("falls back to the transcript's last assistant message (string content)", () => {
    const transcript = [
      JSON.stringify({ type: "user", message: { role: "user", content: "do the thing" } }),
      JSON.stringify({ type: "assistant", message: { role: "assistant", content: "intermediate" } }),
      JSON.stringify({ type: "user", message: { role: "user", content: "continue" } }),
      JSON.stringify({ type: "assistant", message: { role: "assistant", content: "FINAL: created `x/y.ts`" } }),
    ].join("\n");
    const txt = getSubagentText({ transcript_path: "/fake/t.jsonl" }, { readFileSafe: () => transcript });
    expect(txt).toBe("FINAL: created `x/y.ts`");
  });
  it("falls back to the transcript's last assistant message (array-of-blocks content)", () => {
    const transcript = JSON.stringify({ type: "assistant", message: { role: "assistant", content: [{ type: "text", text: "block one" }, { type: "text", text: "block two" }] } });
    expect(getSubagentText({ transcript_path: "/fake/t.jsonl" }, { readFileSafe: () => transcript })).toBe("block one\nblock two");
  });
  it("no result + no/unreadable transcript / garbage stdin → empty string", () => {
    expect(getSubagentText({})).toBe("");
    expect(getSubagentText({ transcript_path: "/missing" }, { readFileSafe: () => "" })).toBe("");
    expect(getSubagentText(null)).toBe("");
    expect(getSubagentText("nope")).toBe("");
  });
});

describe("findRoot", () => {
  let TMP;
  beforeEach(() => { TMP = fs.mkdtempSync(path.join(os.tmpdir(), "ssv-root-")); });
  afterEach(() => { try { fs.rmSync(TMP, { recursive: true, force: true }); } catch { /* ignore */ } });
  it("walks up to the NEAREST dir containing .claude/settings.json", () => {
    const repo = path.join(TMP, "repo");
    fs.mkdirSync(path.join(repo, ".claude"), { recursive: true });
    fs.writeFileSync(path.join(repo, ".claude", "settings.json"), "{}");
    const deep = path.join(repo, "a", "b", "c");
    fs.mkdirSync(deep, { recursive: true });
    // stops at `repo` — even though the real ~/.claude/settings.json also exists further up
    expect(path.resolve(findRoot(deep))).toBe(path.resolve(repo));
  });
  it("the returned root always contains .claude/settings.json (or is the start dir as a fallback)", () => {
    const r = findRoot(TMP); // no .claude in TMP, but ~/.claude exists above ⇒ returns that
    expect(fs.existsSync(path.join(r, ".claude", "settings.json")) || path.resolve(r) === path.resolve(TMP)).toBe(true);
  });
});

describe("runVerifier — end to end", () => {
  const realF = (p) => p.replace(/\\/g, "/").includes("REAL");
  it("subagent claims a file that exists → pass, claims recorded", () => {
    const r = runVerifier({ stdin: { result: "Done: created `src/REAL/Foo.ts`." }, env: {}, existsFn: realF, root: "/repo" });
    expect(r.action).toBe("pass");
    expect(r.claims).toEqual(["src/REAL/Foo.ts"]);
    expect(r.missing).toEqual([]);
  });
  it("subagent claims a file that does NOT exist → block (first time)", () => {
    const r = runVerifier({ stdin: { result: "Done: created `src/GHOST/Bar.ts` and added scripts/REAL/ok.mjs." }, env: {}, existsFn: realF, root: "/repo" });
    expect(r.action).toBe("block");
    expect(r.missing).toEqual(["src/GHOST/Bar.ts"]);
    expect(r.verified).toEqual(["scripts/REAL/ok.mjs"]);
    expect(r.message.toLowerCase()).toMatch(/don't exist|correct your summary/);
  });
  it("same false claim after a prior block (stop_hook_active) → warn, let it stop", () => {
    const r = runVerifier({ stdin: { result: "created `src/GHOST/Bar.ts`", stop_hook_active: true }, env: {}, existsFn: realF, root: "/repo" });
    expect(r.action).toBe("warn");
  });
  it("no claims in the summary → pass (never false-flag a vague summary)", () => {
    const r = runVerifier({ stdin: { result: "I reviewed the code and it looks fine. No changes were necessary." }, env: {}, existsFn: realF, root: "/repo" });
    expect(r.action).toBe("pass");
    expect(r.claims).toEqual([]);
  });
  it("PRISM_SUBAGENT_VERIFY=0 disables (pass, even with a false claim present)", () => {
    const r = runVerifier({ stdin: { result: "created `src/GHOST/Bar.ts`" }, env: { PRISM_SUBAGENT_VERIFY: "0" }, existsFn: realF, root: "/repo" });
    expect(r).toMatchObject({ action: "pass", disabled: true });
  });
  it("garbled / null stdin → pass, never throws", () => {
    expect(() => runVerifier({ stdin: null, env: {}, existsFn: realF, root: "/repo" })).not.toThrow();
    expect(runVerifier({ stdin: "junk", env: {}, existsFn: realF, root: "/repo" }).action).toBe("pass");
    expect(runVerifier({ stdin: {}, env: {}, existsFn: realF, root: "/repo" }).action).toBe("pass");
  });
  it("variability: 1 / several / many claimed files, all real → pass; one ghost among many → block listing only the ghost", () => {
    runVerifier; // (silence unused-in-this-block lint)
    const many = "Delivered: created `src/REAL/a.ts`, `src/REAL/b.ts`, `src/REAL/c.ts`, `src/REAL/d.ts` and wrote `tests/REAL/e.test.ts`.";
    expect(runVerifier({ stdin: { result: many }, env: {}, existsFn: realF, root: "/repo" }).action).toBe("pass");
    const oneGhost = "Delivered: created `src/REAL/a.ts`, `src/REAL/b.ts`, `src/GHOST/c.ts`, `src/REAL/d.ts`.";
    const r = runVerifier({ stdin: { result: oneGhost }, env: {}, existsFn: realF, root: "/repo" });
    expect(r.action).toBe("block");
    expect(r.missing).toEqual(["src/GHOST/c.ts"]);
    expect(r.verified.length).toBe(3);
  });
});
