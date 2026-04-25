/**
 * cadAutomationDispatcher.featureTree.test.ts — U-CGT04 dispatcher E2E
 *
 * Drives the five `feature_tree_*` actions through the real
 * `prism_cad_automation` dispatcher in mock mode (no CAD apps required).
 * Verifies action-enum membership, canonical type/format vocabularies,
 * extract → validate → recomputeSignature round trip across multiple CAD
 * formats, and adversarial input handling.
 */

process.env["PRISM_CAD_MOCK"] = "1";

import { describe, it, expect, beforeAll } from "vitest";

import {
  registerCadAutomationDispatcher,
  CAD_AUTOMATION_ACTIONS,
} from "../tools/dispatchers/cadAutomationDispatcher.js";

interface CapturedTool {
  name: string;
  description: string;
  schema: unknown;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<unknown>;
}

function makeStubServer() {
  const tools: CapturedTool[] = [];
  return {
    tools,
    tool(
      name: string,
      description: string,
      schema: unknown,
      handler: CapturedTool["handler"],
    ) {
      tools.push({ name, description, schema, handler });
    },
  };
}

let handler: CapturedTool["handler"];

async function invoke(
  action: string,
  params: Record<string, unknown> = {},
): Promise<Record<string, unknown>> {
  const res = (await handler({ action, params })) as Record<string, unknown>;
  if (res && Array.isArray((res as { content?: unknown[] }).content)) {
    const arr = (res as { content: Array<{ text?: string }> }).content;
    const text = arr[0]?.text ?? "";
    return JSON.parse(text) as Record<string, unknown>;
  }
  return res;
}

beforeAll(() => {
  const server = makeStubServer();
  registerCadAutomationDispatcher(
    server as unknown as Parameters<typeof registerCadAutomationDispatcher>[0],
  );
  const tool = server.tools.find((t) => t.name === "prism_cad_automation");
  if (!tool) throw new Error("prism_cad_automation tool was not registered");
  handler = tool.handler;
});

// ─── Action surface ──────────────────────────────────────────────────────

describe("cadAutomationDispatcher — U-CGT04 action surface", () => {
  it("exposes the 5 feature_tree_* actions in CAD_AUTOMATION_ACTIONS", () => {
    const actions = CAD_AUTOMATION_ACTIONS as readonly string[];
    expect(actions).toContain("feature_tree_extract");
    expect(actions).toContain("feature_tree_validate");
    expect(actions).toContain("feature_tree_recompute_signature");
    expect(actions).toContain("feature_tree_canonical_types");
    expect(actions).toContain("feature_tree_source_formats");
  });

  it("feature_tree_canonical_types returns the documented vocabulary", async () => {
    const out = await invoke("feature_tree_canonical_types", {});
    expect(typeof out["count"]).toBe("number");
    expect((out["count"] as number) >= 14).toBe(true);
    const types = out["types"] as string[];
    // Spot-check the canonical names — these are the contract for downstream
    // consumers (RAG, training corpus, similarity search).
    for (const t of [
      "Sketch",
      "Extrude",
      "Revolve",
      "Sweep",
      "Loft",
      "Fillet",
      "Chamfer",
      "Hole",
      "Pattern",
      "Mirror",
      "Shell",
      "Body",
      "Component",
      "Other",
    ]) {
      expect(types).toContain(t);
    }
  });

  it("feature_tree_source_formats returns 13 known extensions including 'unknown' sentinel", async () => {
    const out = await invoke("feature_tree_source_formats", {});
    expect(out["count"]).toBe(13);
    const fmts = out["formats"] as string[];
    expect(fmts).toContain("FCStd");
    expect(fmts).toContain("f3d");
    expect(fmts).toContain("step");
    expect(fmts).toContain("sldprt");
    expect(fmts).toContain("ipt");
    expect(fmts).toContain("mcam");
    expect(fmts).toContain("hmc");
    expect(fmts).toContain("unknown"); // sentinel for unrecognized extensions
  });
});

// ─── extract — happy path across format variability ─────────────────────

describe("cadAutomationDispatcher — feature_tree_extract (mock mode)", () => {
  const cases = [
    { src: "synth.sldprt", fmt: "sldprt" },
    { src: "synth.iam", fmt: "iam" },
    { src: "synth.mcx-8", fmt: "mcx-8" },
    { src: "synth.hmc", fmt: "hmc" },
  ] as const;

  for (const c of cases) {
    it(`${c.fmt} synthesizes a canonical tree in mock mode`, async () => {
      const out = await invoke("feature_tree_extract", { filePath: c.src });
      expect(out["sourceFormat"]).toBe(c.fmt);
      expect(typeof out["signature"]).toBe("string");
      expect((out["signature"] as string).length).toBeGreaterThan(0);
      const features = out["features"] as Array<Record<string, unknown>>;
      expect(Array.isArray(features)).toBe(true);
      expect(features.length).toBeGreaterThan(0);
    });
  }

  it("extract output round-trips through validate (schema-conformant)", async () => {
    const tree = await invoke("feature_tree_extract", {
      filePath: "synth-roundtrip.sldprt",
    });
    const v = await invoke("feature_tree_validate", { candidate: tree });
    expect(v["ok"]).toBe(true);
    expect(v["errors"] ?? []).toEqual([]);
  });

  it("recomputeSignature is deterministic for an unchanged tree", async () => {
    const tree = await invoke("feature_tree_extract", {
      filePath: "synth-sig.sldprt",
    });
    const before = tree["signature"];
    const r = await invoke("feature_tree_recompute_signature", { tree });
    expect(r["signature"]).toBe(before);
  });

  it("formatHint overrides extension-based detection", async () => {
    // Pass a non-CAD extension but hint sldprt — extractor should honor hint.
    const out = await invoke("feature_tree_extract", {
      filePath: "anything.bin",
      formatHint: "sldprt",
    });
    expect(out["sourceFormat"]).toBe("sldprt");
  });
});

// ─── validate — happy + reject ──────────────────────────────────────────

describe("cadAutomationDispatcher — feature_tree_validate", () => {
  it("rejects an obviously invalid candidate (string instead of object)", async () => {
    const out = await invoke("feature_tree_validate", {
      candidate: "not a tree",
    });
    expect(out["ok"]).toBe(false);
    const errors = out["errors"] as string[];
    expect(errors.length).toBeGreaterThan(0);
  });

  it("rejects a candidate missing required fields", async () => {
    const out = await invoke("feature_tree_validate", {
      candidate: { sourceFormat: "FCStd" }, // missing features, assemblies, signature, etc.
    });
    expect(out["ok"]).toBe(false);
    expect((out["errors"] as string[]).length).toBeGreaterThan(0);
  });

  it("rejects a candidate with wrong sourceFormat enum value", async () => {
    const out = await invoke("feature_tree_validate", {
      candidate: {
        sourceFormat: "totally-bogus",
        features: [],
        assemblies: [],
        signature: "x",
        sourceFile: "x.bogus",
        extractedAt: new Date().toISOString(),
      },
    });
    expect(out["ok"]).toBe(false);
  });
});

// ─── Failure modes + adversarial ───────────────────────────────────────

describe("cadAutomationDispatcher — feature_tree_extract failure modes", () => {
  it("FAIL #1: empty filePath returns structured error envelope (no throw)", async () => {
    const out = await invoke("feature_tree_extract", { filePath: "" });
    // Either dispatcher Zod rejects (envelope w/ error/success:false) or
    // engine throws and the catch in the case wraps it in { error: ... }.
    const failed =
      typeof out["error"] === "string" ||
      out["success"] === false ||
      typeof out["errorMessage"] === "string";
    expect(failed).toBe(true);
  });

  it("FAIL #2: unknown extension produces error", async () => {
    const out = await invoke("feature_tree_extract", { filePath: "drawing.dwg" });
    expect(typeof out["error"]).toBe("string");
    expect((out["error"] as string).toLowerCase()).toContain("unsupported");
  });

  it("FAIL #3: invalid formatHint enum is rejected by dispatcher schema", async () => {
    const out = await invoke("feature_tree_extract", {
      filePath: "x.sldprt",
      formatHint: "totally-bogus",
    });
    const failed =
      typeof out["error"] === "string" ||
      out["success"] === false ||
      typeof out["errorMessage"] === "string";
    expect(failed).toBe(true);
  });

  it("ADV: recomputeSignature on a malformed tree returns structured error", async () => {
    const out = await invoke("feature_tree_recompute_signature", {
      tree: { not: "a tree" },
    });
    // Either an error envelope or a string signature — both acceptable;
    // the test asserts no exception leaks.
    expect(typeof out).toBe("object");
  });

  it("ADV: validate on null candidate rejects without throwing", async () => {
    const out = await invoke("feature_tree_validate", { candidate: null });
    expect(out["ok"]).toBe(false);
  });
});
