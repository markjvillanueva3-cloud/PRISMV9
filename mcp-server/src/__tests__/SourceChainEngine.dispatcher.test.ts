/**
 * SourceChainEngine round-trip E2E — invokes through sessionDispatcher rather
 * than the engine singleton.  Confirms the 4 dispatcher actions are wired and
 * return the expected slim-response envelope.
 *
 * Tests: source_chain_decorate / source_chain_merge / source_chain_validate /
 *        source_chain_render
 */
import { describe, it, expect } from "vitest";
import sessionTool from "../tools/dispatchers/sessionDispatcher.js";

const ISO = "2026-05-24T06:00:00.000Z";
const validCitation = {
  path: "knowledge/wiki/architecture/source-chain.md",
  source_type: "wiki",
  score: 0.92,
  retrieved_at: ISO,
  used_for: "citation-pattern doctrine",
};

function parse(envelope: { content: { text: string }[] }): unknown {
  return JSON.parse(envelope.content[0].text);
}

describe("sessionDispatcher source_chain_* actions (round-trip E2E)", () => {
  it("source_chain_decorate wraps a value with citations and emits a digest", async () => {
    const env = await sessionTool.handler({
      action: "source_chain_decorate",
      value: { kc11: 1800 },
      citations: [validCitation],
    });
    const body = parse(env) as { success: boolean; value: { kc11: number }; sources: unknown[]; digest: string };
    expect(body.success).toBe(true);
    expect(body.value.kc11).toBe(1800);
    expect(Array.isArray(body.sources)).toBe(true);
    expect(body.sources).toHaveLength(1);
    expect(body.digest).toMatch(/^[a-f0-9]{64}$/);
  });

  it("source_chain_validate echoes a valid citation through Zod", async () => {
    const env = await sessionTool.handler({
      action: "source_chain_validate",
      citation: validCitation,
    });
    const body = parse(env) as { success: boolean; citation: typeof validCitation };
    expect(body.success).toBe(true);
    expect(body.citation.path).toBe(validCitation.path);
  });

  it("source_chain_render produces operator-readable markdown", async () => {
    const env = await sessionTool.handler({
      action: "source_chain_render",
      citations: [validCitation],
    });
    const body = parse(env) as { success: boolean; markdown: string };
    expect(body.success).toBe(true);
    expect(body.markdown).toContain("**Sources:**");
    expect(body.markdown).toContain("[wiki]");
  });

  it("source_chain_merge unions citations across N decorated results", async () => {
    const env = await sessionTool.handler({
      action: "source_chain_merge",
      results: [
        { value: "a", sources: [validCitation], digest: "x" },
        { value: "b", sources: [{ ...validCitation, path: "other.md", score: 0.5 }], digest: "y" },
      ],
    });
    const body = parse(env) as { success: boolean; value: unknown[]; sources: unknown[] };
    expect(body.success).toBe(true);
    expect(body.value).toEqual(["a", "b"]);
    expect(body.sources).toHaveLength(2);
  });
});
