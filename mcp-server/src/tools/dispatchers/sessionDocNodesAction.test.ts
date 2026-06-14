/**
 * Tests for sessionDocNodesAction.ts — the prism_session:doc_nodes action body
 * (REVERSE cheap-node edge, U-VBL-DISPATCHER). vitest; injected runCli spy so no
 * CLI/FS/graph is touched. Mirrors the dep-injection style of the node_card sibling.
 */
import { describe, it, expect } from "vitest";
import { resolveDocKey, runDocNodesAction } from "./sessionDocNodesAction.js";

// A spy runCli that returns a canned CLI `--json` stdout and records the key it saw.
function cli(json: unknown) {
  const calls: string[] = [];
  const runCli = (key: string) => { calls.push(key); return JSON.stringify(json); };
  return { runCli, calls };
}

describe("resolveDocKey", () => {
  it("resolves the primary `doc` field, trimmed", () => {
    expect(resolveDocKey({ doc: "  architecture/foo  " })).toBe("architecture/foo");
  });
  it("falls back through aliases query→q→key→path→slug in order", () => {
    expect(resolveDocKey({ query: "a/b" })).toBe("a/b");
    expect(resolveDocKey({ q: "feedback_x" })).toBe("feedback_x");
    expect(resolveDocKey({ key: "k/k" })).toBe("k/k");
    expect(resolveDocKey({ path: "p/p" })).toBe("p/p");
    expect(resolveDocKey({ slug: "reference_y" })).toBe("reference_y");
  });
  it("prefers `doc` over the aliases when several are present", () => {
    expect(resolveDocKey({ doc: "win", query: "lose", slug: "lose" })).toBe("win");
  });
  it("returns '' for missing / blank / non-string", () => {
    expect(resolveDocKey({})).toBe("");
    expect(resolveDocKey({ doc: "   " })).toBe("");
    expect(resolveDocKey({ doc: 42 as unknown as string })).toBe("");
    expect(resolveDocKey({ doc: null as unknown as string })).toBe("");
  });
});

describe("runDocNodesAction", () => {
  it("happy path — found doc returns its node ids + key + total", () => {
    const { runCli, calls } = cli({
      found: true, key: "architecture/cheap-node-access-ms0",
      nodeIds: ["eng.alpha", "eng.beta", "ghost.x"], total: 3, truncated: false, stale: false, staleReason: null,
    });
    const r = runDocNodesAction({ doc: "knowledge/wiki/architecture/cheap-node-access-ms0.md" }, { runCli });
    expect(r.success).toBe(true);
    expect(r.key).toBe("architecture/cheap-node-access-ms0");
    expect(r.nodeIds).toEqual(["eng.alpha", "eng.beta", "ghost.x"]);
    expect(r.total).toBe(3);
    expect(r.truncated).toBe(false);
    expect(calls).toEqual(["knowledge/wiki/architecture/cheap-node-access-ms0.md"]);
  });

  it("capped doc — truncated true + honest pre-cap total preserved", () => {
    const { runCli } = cli({ found: true, key: "feedback_psn_definition", nodeIds: ["a", "b"], total: 164, truncated: true });
    const r = runDocNodesAction({ doc: "feedback_psn_definition" }, { runCli });
    expect(r.success).toBe(true);
    expect(r.truncated).toBe(true);
    expect(r.total).toBe(164);
    expect(r.nodeIds?.length).toBe(2);
  });

  it("surfaces the staleness flag from the CLI", () => {
    const { runCli } = cli({ found: true, key: "architecture/foo", nodeIds: ["eng.a"], total: 1, stale: true, staleReason: "node-cards.jsonl is 631min newer than this index" });
    const r = runDocNodesAction({ doc: "architecture/foo" }, { runCli });
    expect(r.stale).toBe(true);
    expect(r.staleReason).toMatch(/newer than this index/);
  });

  it("miss → success:true with empty nodeIds + suggestions (a valid answer, NOT an error)", () => {
    const { runCli } = cli({ found: false, key: "cheap-node-access-ms0", suggestions: ["architecture/cheap-node-access-ms0"] });
    const r = runDocNodesAction({ doc: "cheap-node-access-ms0" }, { runCli });
    expect(r.success).toBe(true);
    expect(r.nodeIds).toEqual([]);
    expect(r.total).toBe(0);
    expect(r.suggestions).toEqual(["architecture/cheap-node-access-ms0"]);
  });

  it("FAILURE: no key → success:false with a descriptive error (no CLI call)", () => {
    let called = false;
    const r = runDocNodesAction({}, { runCli: () => { called = true; return "{}"; } });
    expect(r.success).toBe(false);
    expect(r.error).toMatch(/requires params\.doc/);
    expect(called).toBe(false);
  });

  it("FAILURE: index unavailable (CLI {unavailable:true}) → success:false error, distinct from a miss", () => {
    const { runCli } = cli({ found: false, unavailable: true, error: "index not found at state/shared/system-viz/vault-backlinks.json" });
    const r = runDocNodesAction({ doc: "architecture/foo" }, { runCli });
    expect(r.success).toBe(false);
    expect(r.error).toMatch(/not found/);
  });

  it("FAILURE: runner throws → fail-soft success:false (no propagation)", () => {
    const r = runDocNodesAction({ doc: "architecture/foo" }, { runCli: () => { throw new Error("execFileSync ENOENT"); } });
    expect(r.success).toBe(false);
    expect(r.error).toMatch(/doc_nodes seek failed/);
    expect(r.error).toMatch(/ENOENT/);
  });

  it("ADVERSARIAL: non-JSON CLI output → success:false, no throw", () => {
    const r = runDocNodesAction({ doc: "architecture/foo" }, { runCli: () => "not json at all <<<" });
    expect(r.success).toBe(false);
    expect(r.error).toMatch(/did not return valid JSON/);
  });

  it("ADVERSARIAL: found but malformed nodeIds (non-array) → empty array, no throw", () => {
    const { runCli } = cli({ found: true, key: "architecture/foo", nodeIds: "oops-not-an-array", total: 0 });
    const r = runDocNodesAction({ doc: "architecture/foo" }, { runCli });
    expect(r.success).toBe(true);
    expect(r.nodeIds).toEqual([]);
  });

  it("ADVERSARIAL: found with mixed-type nodeIds → non-strings filtered out", () => {
    const { runCli } = cli({ found: true, key: "k", nodeIds: ["eng.a", 7, null, "eng.b"], total: 2 });
    const r = runDocNodesAction({ doc: "k" }, { runCli });
    expect(r.nodeIds).toEqual(["eng.a", "eng.b"]);
  });
});
