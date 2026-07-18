/**
 * DualChannelContextEngine.test.ts -- GRAPH-AS-LLM-CONTEXT-MS0 / U-GAC04
 *
 * Hermetic: a temp raw-adjacency fixture (the {id:{in,out}} shape GAC01's
 * coerceAdjacency accepts) drives the ego extraction with enrich:false (no live
 * seekCard offset-index dependency), and the PNG renderer is INJECTED (no Chrome
 * dependency). Covers the 5 spec tests (happy / missing screenshot tool /
 * oversized PNG / malformed nodeId / layer-filter-no-matches) + the 3 modes +
 * data-uri flatten + 2 adversarial cases (recursion guard, markup in node id) +
 * 1 live smoke against the real graph adjacency.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtempSync, writeFileSync, rmSync, existsSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  dualChannelContextEngine,
  type DualChannelRenderer,
  type VizRenderResult,
} from "../engines/DualChannelContextEngine.js";

// a real, valid 1x1 PNG (so embed:"data-uri" can read+encode it)
const PNG_1X1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64",
);

let dir: string;
let adjPath: string;
const PROMPT = "Investigate the wiring around this engine.";

// ego fixture: foo <-> prism_ai (cycle), foo -> bar. raw {id:{in,out}} shape.
beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), "gac04-test-"));
  adjPath = join(dir, "adj.json");
  writeFileSync(
    adjPath,
    JSON.stringify({
      "eng.system.foo": {
        in: [{ id: "disp.prism_ai", type: "wired-to" }],
        out: [
          { id: "eng.system.bar", type: "calls" },
          { id: "disp.prism_ai", type: "wired-to" },
        ],
      },
      "eng.system.bar": { in: [{ id: "eng.system.foo", type: "calls" }], out: [] },
      "disp.prism_ai": {
        in: [{ id: "eng.system.foo", type: "wired-to" }],
        out: [{ id: "eng.system.foo", type: "wired-to" }],
      },
      // a node whose id carries markup -- adversarial "malicious payload" case
      "eng.<script>evil</script>": { in: [], out: [] },
    }),
  );
});
afterAll(() => {
  try { rmSync(dir, { recursive: true, force: true }); } catch { /* ignore */ }
});

// --- injectable renderers -----------------------------------------------------
function okRenderer(): DualChannelRenderer {
  return ({ outPath }): VizRenderResult => {
    writeFileSync(outPath, PNG_1X1);
    return { ok: true, mode: "png", path: outPath, bytes: PNG_1X1.length, warnings: [] };
  };
}
const unavailableRenderer: DualChannelRenderer = () => ({ ok: false, mode: "none", reason: "chromium-unavailable" });
const oversizeRenderer: DualChannelRenderer = () => ({ ok: false, mode: "none", reason: "oversize", bytes: 99_000_000 });
const throwRenderer: DualChannelRenderer = () => { throw new Error("renderer exploded"); };

// adjPath is assigned in beforeAll; opts() reads it at call time.
function opts(extra: Record<string, unknown> = {}) {
  return { adjacencyPath: adjPath, enrich: false, ...extra };
}

describe("buildDualChannel -- happy path (both channels)", () => {
  it("JSON channel cites node-ids and viz channel renders a PNG", async () => {
    const b = await dualChannelContextEngine.buildDualChannel(PROMPT, "eng.system.foo", opts({ renderer: okRenderer() }));
    expect(b.mode).toBe("both");
    expect(b.nodeId).toBe("eng.system.foo");
    // JSON channel
    expect(b.json).not.toBeNull();
    expect(b.json!.nodeIds).toContain("eng.system.foo");
    expect(b.json!.nodeIds).toContain("eng.system.bar");
    expect(b.json!.nodeIds).toContain("disp.prism_ai");
    expect(b.json!.edgeCount).toBeGreaterThanOrEqual(2);
    // viz channel = real PNG
    expect(b.viz).not.toBeNull();
    expect(b.viz!.kind).toBe("png");
    expect(b.viz!.pngPath && existsSync(b.viz!.pngPath)).toBe(true);
    // the assembled prompt satisfies verifies_via: mentions node-id: AND a visual layer
    expect(b.prompt).toContain("node-id:");
    expect(b.prompt).toContain("visual layer");
    expect(b.prompt).toContain("Channel 1");
    expect(b.prompt).toContain("Channel 2");
  });
});

describe("modes (variability axis: json-only / viz-only / both)", () => {
  it("json-only omits the viz channel", async () => {
    const b = await dualChannelContextEngine.buildDualChannel(PROMPT, "eng.system.foo", opts({ mode: "json-only", renderer: okRenderer() }));
    expect(b.json).not.toBeNull();
    expect(b.viz).toBeNull();
    expect(b.prompt).toContain("Channel 1");
    expect(b.prompt).not.toContain("Channel 2");
  });
  it("viz-only omits the json channel", async () => {
    const b = await dualChannelContextEngine.buildDualChannel(PROMPT, "eng.system.foo", opts({ mode: "viz-only", renderer: okRenderer() }));
    expect(b.json).toBeNull();
    expect(b.viz).not.toBeNull();
    expect(b.prompt).toContain("Channel 2");
    expect(b.prompt).not.toContain("Channel 1");
  });
});

describe("failure modes", () => {
  it("missing screenshot tool -> mermaid+markdown MD fallback (still a visual layer)", async () => {
    const b = await dualChannelContextEngine.buildDualChannel(PROMPT, "eng.system.foo", opts({ renderer: unavailableRenderer }));
    expect(b.viz!.kind).toBe("md-fallback");
    expect(b.viz!.reason).toBe("chromium-unavailable");
    expect(b.viz!.mermaid).toContain("graph LR");
    expect(b.prompt).toContain("```mermaid");
    expect(b.viz!.warnings.some((w) => w.includes("PNG unavailable"))).toBe(true);
  });

  it("oversized PNG -> MD fallback with oversize reason", async () => {
    const b = await dualChannelContextEngine.buildDualChannel(PROMPT, "eng.system.foo", opts({ renderer: oversizeRenderer }));
    expect(b.viz!.kind).toBe("md-fallback");
    expect(b.viz!.reason).toBe("oversize");
    expect(b.viz!.mermaid).toContain("graph LR");
  });

  it("renderer that throws is caught -> MD fallback (no crash)", async () => {
    const b = await dualChannelContextEngine.buildDualChannel(PROMPT, "eng.system.foo", opts({ renderer: throwRenderer }));
    expect(b.viz!.kind).toBe("md-fallback");
    expect(b.viz!.reason).toContain("renderer-threw");
  });

  it("malformed nodeId (empty / whitespace) throws a clear error", async () => {
    await expect(dualChannelContextEngine.buildDualChannel(PROMPT, "", opts())).rejects.toThrow(/nodeId must be a non-empty string/);
    await expect(dualChannelContextEngine.buildDualChannel(PROMPT, "   ", opts())).rejects.toThrow(/nodeId must be a non-empty string/);
    // @ts-expect-error intentional bad type
    await expect(dualChannelContextEngine.buildDualChannel(PROMPT, null, opts())).rejects.toThrow(/non-empty string/);
  });

  it("layer filter with no matches -> kind:empty (enrich:false => no node carries the layer)", async () => {
    const b = await dualChannelContextEngine.buildDualChannel(PROMPT, "eng.system.foo", opts({ layer: "L4", renderer: okRenderer() }));
    expect(b.viz!.kind).toBe("empty");
    expect(b.viz!.layer).toBe("L4");
    expect(b.viz!.warnings.some((w) => w.includes("no nodes in layer L4"))).toBe(true);
    // empty-layer still emits an (empty) mermaid scaffold so the channel shape is stable
    expect(b.prompt).toContain("no nodes match this layer filter");
  });
});

describe("embed flatten (subagent rejects binary -> base64 data URI)", () => {
  it("embed:data-uri encodes the PNG inline", async () => {
    const b = await dualChannelContextEngine.buildDualChannel(PROMPT, "eng.system.foo", opts({ embed: "data-uri", outDir: dir, renderer: okRenderer() }));
    expect(b.viz!.kind).toBe("png");
    expect(b.viz!.dataUri).toMatch(/^data:image\/png;base64,/);
    expect(b.prompt).toContain("data:image/png;base64,");
  });

  it("data-uri SKIPPED when the PNG exceeds maxPngBytes -> keeps path + warns (prompt budget guard)", async () => {
    // okRenderer writes the 68-byte PNG; a 10-byte ceiling forces the skip path.
    const b = await dualChannelContextEngine.buildDualChannel(PROMPT, "eng.system.foo", opts({ embed: "data-uri", maxPngBytes: 10, outDir: dir, renderer: okRenderer() }));
    expect(b.viz!.kind).toBe("png");
    expect(b.viz!.dataUri).toBeUndefined();      // NOT inlined
    expect(b.viz!.pngPath).toBeTruthy();          // path kept as the reference
    expect(b.viz!.warnings.some((w) => w.includes("data-uri skipped"))).toBe(true);
    expect(b.prompt).not.toContain("data:image/png;base64,");
  });
});

describe("adversarial", () => {
  it("recursion guard: a prompt that already carries a viz channel is not re-embedded", async () => {
    const first = await dualChannelContextEngine.buildDualChannel(PROMPT, "eng.system.foo", opts({ mode: "both", renderer: okRenderer() }));
    const second = await dualChannelContextEngine.attachVizScreenshot(first.prompt, undefined, opts({ nodeId: "eng.system.foo", renderer: okRenderer() }));
    expect(second.viz.kind).toBe("none");
    expect(second.viz.reason).toContain("recursion-guard");
    expect(second.prompt).toBe(first.prompt); // unchanged
  });

  it("recursion guard fires even on a prior JSON-ONLY block (cannot be evaded by mode)", async () => {
    const jsonOnly = await dualChannelContextEngine.buildDualChannel(PROMPT, "eng.system.foo", opts({ mode: "json-only" }));
    const after = await dualChannelContextEngine.attachVizScreenshot(jsonOnly.prompt, undefined, opts({ nodeId: "eng.system.foo", renderer: okRenderer() }));
    expect(after.viz.kind).toBe("none");
    expect(after.viz.reason).toContain("recursion-guard");
    expect(after.prompt).toBe(jsonOnly.prompt); // not double-stamped with a second sentinel
  });

  it("markup in a node id cannot break the bundle (mermaid IDs sanitized; structure intact)", async () => {
    const b = await dualChannelContextEngine.buildDualChannel(PROMPT, "eng.<script>evil</script>", opts({ renderer: unavailableRenderer }));
    // The injectable surface is the mermaid node *identifier* -- it is sanitized to
    // n_... so markup can never form a mermaid directive (only inert label text,
    // inside a code fence). The genuine HTML-escape guard lives at the PNG render
    // boundary (render-viz-screenshot esc/buildHtml -- covered in that file's tests).
    expect(b.viz!.mermaid).toContain("n_eng__script_evil__script_");
    // <script> never appears as a mermaid node identifier (i.e. never as `n_<script>` or a bare directive)
    expect(b.viz!.mermaid).not.toMatch(/(^|\n)\s*<script>/);
    // JSON channel structure is intact and parseable (markup carried as data, not structure)
    expect(() => JSON.parse(b.json!.rendered)).not.toThrow();
    expect(b.json!.nodeIds).toContain("eng.<script>evil</script>");
  });
});

describe("attachJsonContext / attachVizScreenshot (standalone methods)", () => {
  it("attachJsonContext appends a json-only block with node-id markers", async () => {
    const r = await dualChannelContextEngine.attachJsonContext(PROMPT, "eng.system.foo", opts());
    expect(r.prompt).toContain("Channel 1");
    expect(r.prompt).toContain("node-id:");
    expect(r.json.nodeIds).toContain("eng.system.foo");
  });
  it("attachVizScreenshot requires a nodeId and renders a viz block", async () => {
    const r = await dualChannelContextEngine.attachVizScreenshot(PROMPT, undefined, opts({ nodeId: "eng.system.foo", renderer: okRenderer() }));
    expect(r.viz.kind).toBe("png");
    expect(r.prompt).toContain("Channel 2");
    // @ts-expect-error missing nodeId
    await expect(dualChannelContextEngine.attachVizScreenshot(PROMPT, undefined, opts({ renderer: okRenderer() }))).rejects.toThrow(/nodeId/);
  });
});

// --- live smoke: real graph adjacency (skips cleanly if the sidecar is absent) ---
describe("live smoke (real adjacency sidecar)", () => {
  const REL = "state/shared/system-viz/node-adjacency.json";
  const candidates = [join(process.cwd(), REL), join(process.cwd(), "..", REL)];
  const live = candidates.find((p) => { try { return statSync(p).isFile(); } catch { return false; } });

  it.runIf(!!live)("builds a dual-channel bundle around a real node (enrich on, MD-or-PNG visual layer)", async () => {
    // pick a stable, always-present node id; enrich on so nodes carry real layers
    const b = await dualChannelContextEngine.buildDualChannel(
      "live smoke",
      "eng.mill",
      { adjacencyPath: live!, hops: 1, maxNodes: 40, renderer: unavailableRenderer },
    );
    expect(b.json).not.toBeNull();
    expect(b.json!.nodeIds.length).toBeGreaterThan(0);
    expect(b.viz).not.toBeNull();
    // with no Chrome injected-unavailable, we deterministically get the MD visual layer
    expect(["png", "md-fallback", "empty"]).toContain(b.viz!.kind);
    expect(b.prompt).toContain("node-id:");
  }, 30_000);
});
