/**
 * CADFunctionParameterEmitterEngine — tests.
 */

import { describe, it, expect } from "vitest";
import {
  CADFunctionParameterEmitterEngine,
  SupportedSystem,
  cadFunctionParameterEmitterEngine,
  emitNNGraphSeed,
  emitTribalNode,
  emitWikiNode,
  slugify,
} from "../engines/CADFunctionParameterEmitterEngine.js";

const fusionExtrude = {
  system: "fusion360" as const,
  functionName: "ExtrudeFeature",
  parameters: [
    { name: "distance",  type: "number", unit: "mm",     required: true,  min: 0.01, max: 500, default: 10 },
    { name: "direction", type: "enum",   required: true,  values: ["one_side", "two_sides", "symmetric"], default: "one_side" },
    { name: "operation", type: "enum",   required: false, values: ["new_body", "join", "cut", "intersect"] },
  ],
};

describe("SupportedSystem (priority CAD systems)", () => {
  it("equals exactly the 5 priority systems in priority order", () => {
    expect([...SupportedSystem]).toEqual(["hypercads", "fusion360", "solidworks", "inventor", "mastercam"]);
  });
});

describe("slugify", () => {
  it("lowercases + collapses spaces+underscores to hyphens + strips non-alnum-hyphen", () => {
    expect(slugify("Boss-Extrude Feature_v2")).toBe("boss-extrude-feature-v2");
  });
  it("strips trailing+leading hyphens", () => {
    expect(slugify("---Hello___")).toBe("hello");
  });
  it("returns empty string for empty input", () => {
    expect(slugify("")).toBe("");
  });
  it("rejects punctuation that would break filesystem paths", () => {
    expect(slugify("Hole/Wizard?yes")).toBe("holewizardyes");
  });
});

describe("emitWikiNode — numeric parameter (distance with full metadata)", () => {
  const node = emitWikiNode(fusionExtrude, fusionExtrude.parameters[0]);

  it("emits exact relative path under architecture/cad-params/<system>/<fn>/<param>.md", () => {
    expect(node.relativePath).toBe("architecture/cad-params/fusion360/extrudefeature/distance.md");
  });

  it("frontmatter.name equals cad-param-fusion360-extrudefeature-distance", () => {
    expect(node.frontmatter.name).toBe("cad-param-fusion360-extrudefeature-distance");
  });

  it("frontmatter.system equals fusion360", () => {
    expect(node.frontmatter.system).toBe("fusion360");
  });

  it("frontmatter.function preserves PascalCase 'ExtrudeFeature' from input", () => {
    expect(node.frontmatter.function).toBe("ExtrudeFeature");
  });

  it("frontmatter.parameter equals input 'distance'", () => {
    expect(node.frontmatter.parameter).toBe("distance");
  });

  it("frontmatter.type equals input 'number'", () => {
    expect(node.frontmatter.type).toBe("number");
  });

  it("frontmatter.unit equals input 'mm'", () => {
    expect(node.frontmatter.unit).toBe("mm");
  });

  it("frontmatter.required stringifies the boolean true to 'true'", () => {
    expect(node.frontmatter.required).toBe("true");
  });

  it("body contains exact 'Range: 0.01..500' line for min=0.01, max=500", () => {
    const line = node.body.split("\n").find(l => l.startsWith("**Range:**"));
    expect(line).toBe("**Range:** 0.01..500  ·  **Allowed values:** —");
  });

  it("body contains exact 'Default: `10`' line for default=10", () => {
    const line = node.body.split("\n").find(l => l.startsWith("**Default:**"));
    expect(line).toBe("**Default:** `10`");
  });

  it("body contains exact 'Type: `number`  ·  Unit: `mm`' line", () => {
    const line = node.body.split("\n").find(l => l.startsWith("**Type:**"));
    expect(line).toBe("**Type:** `number`  ·  **Unit:** `mm`");
  });
});

describe("emitWikiNode — enum parameter (direction)", () => {
  const node = emitWikiNode(fusionExtrude, fusionExtrude.parameters[1]);

  it("renders allowed values pipe-joined: 'one_side | two_sides | symmetric'", () => {
    const line = node.body.split("\n").find(l => l.startsWith("**Range:**"));
    expect(line).toBe("**Range:** —  ·  **Allowed values:** one_side | two_sides | symmetric");
  });

  it("frontmatter has no 'unit' key for unitless enums", () => {
    expect(Object.prototype.hasOwnProperty.call(node.frontmatter, "unit")).toBe(false);
  });
});

describe("emitWikiNode — optional parameter (operation)", () => {
  const node = emitWikiNode(fusionExtrude, fusionExtrude.parameters[2]);

  it("required=false renders 'Required: no' in body", () => {
    const line = node.body.split("\n").find(l => l.startsWith("**Required:**"));
    expect(line).toBe("**Required:** no");
  });

  it("missing default renders 'Default: —'", () => {
    const line = node.body.split("\n").find(l => l.startsWith("**Default:**"));
    expect(line).toBe("**Default:** —");
  });

  it("frontmatter.required stringifies to 'false'", () => {
    expect(node.frontmatter.required).toBe("false");
  });
});

describe("emitWikiNode — PSN cross-reference hop targets (exact line match)", () => {
  const node = emitWikiNode(fusionExtrude, fusionExtrude.parameters[0]);
  const xrefBlock = node.body.split("## Cross-references")[1] ?? "";

  it("hop block includes parent function link line", () => {
    const lines = xrefBlock.trim().split("\n");
    expect(lines[0]).toBe("- Function: [[cad-fn-fusion360-extrudefeature]]");
  });

  it("hop block includes system adapter link line", () => {
    const lines = xrefBlock.trim().split("\n");
    expect(lines[1]).toBe("- System adapter: [[CADSystemNeuralArchAdapterEngine]]");
  });

  it("hop block includes producer facade link line", () => {
    const lines = xrefBlock.trim().split("\n");
    expect(lines[2]).toBe("- Producer facade: [[CADMultiSystemAIProducerEngine]]");
  });
});

describe("emitTribalNode", () => {
  const node = emitTribalNode(fusionExtrude, fusionExtrude.parameters[0]);

  it("relative path equals architecture/tribal/cad-params/fusion360-extrudefeature-distance.md", () => {
    expect(node.relativePath).toBe("architecture/tribal/cad-params/fusion360-extrudefeature-distance.md");
  });

  it("frontmatter.domain equals 'cad' (matches tribal-by-domain-inject keyword)", () => {
    expect(node.frontmatter.domain).toBe("cad");
  });

  it("frontmatter.system equals 'fusion360'", () => {
    expect(node.frontmatter.system).toBe("fusion360");
  });

  it("frontmatter.function preserves PascalCase 'ExtrudeFeature'", () => {
    expect(node.frontmatter.function).toBe("ExtrudeFeature");
  });
});

describe("emitNNGraphSeed", () => {
  const seed = emitNNGraphSeed(fusionExtrude, fusionExtrude.parameters[0]);

  it("nodeId equals exact 'cad-param.fusion360.extrudefeature.distance'", () => {
    expect(seed.nodeId).toBe("cad-param.fusion360.extrudefeature.distance");
  });

  it("nodeKind equals 'cad_parameter' (GraphSAGE retrainer node-type tag)", () => {
    expect(seed.nodeKind).toBe("cad_parameter");
  });

  it("system field equals 'fusion360'", () => {
    expect(seed.system).toBe("fusion360");
  });

  it("functionName preserves PascalCase 'ExtrudeFeature'", () => {
    expect(seed.functionName).toBe("ExtrudeFeature");
  });

  it("edges length equals 3 for parameter with all three (parameter_of, typed_as, in_unit)", () => {
    expect(seed.edges.length).toBe(3);
  });

  it("first edge is parameter_of pointing at cad-fn.fusion360.extrudefeature", () => {
    expect(seed.edges[0]).toEqual({ kind: "parameter_of", target: "cad-fn.fusion360.extrudefeature" });
  });

  it("second edge is typed_as pointing at cad-type.number", () => {
    expect(seed.edges[1]).toEqual({ kind: "typed_as", target: "cad-type.number" });
  });

  it("third edge is in_unit pointing at unit.mm", () => {
    expect(seed.edges[2]).toEqual({ kind: "in_unit", target: "unit.mm" });
  });

  it("enum parameter has exactly 2 edges (parameter_of + typed_as, no in_unit)", () => {
    const enumSeed = emitNNGraphSeed(fusionExtrude, fusionExtrude.parameters[1]);
    expect(enumSeed.edges.length).toBe(2);
  });
});

describe("CADFunctionParameterEmitterEngine.emit — full pipeline", () => {
  const r = cadFunctionParameterEmitterEngine.emit(fusionExtrude);

  it("wikiNodes length equals input parameter count (3)", () => {
    expect(r.wikiNodes.length).toBe(3);
  });

  it("tribalNodes length equals input parameter count (3)", () => {
    expect(r.tribalNodes.length).toBe(3);
  });

  it("nnGraphSeeds length equals input parameter count (3)", () => {
    expect(r.nnGraphSeeds.length).toBe(3);
  });

  it("parameterCount equals input parameter array length (3)", () => {
    expect(r.parameterCount).toBe(3);
  });

  it("schemaVersion equals 1 (pinned for downstream consumers)", () => {
    expect(r.schemaVersion).toBe(1);
  });

  it("wikiNodes[0] is the distance node (ordering preserved from input)", () => {
    expect(r.wikiNodes[0].frontmatter.parameter).toBe("distance");
  });

  it("wikiNodes[1] is the direction node", () => {
    expect(r.wikiNodes[1].frontmatter.parameter).toBe("direction");
  });

  it("wikiNodes[2] is the operation node", () => {
    expect(r.wikiNodes[2].frontmatter.parameter).toBe("operation");
  });

  it("system field on the result equals the input system", () => {
    expect(r.system).toBe("fusion360");
  });
});

describe("CADFunctionParameterEmitterEngine.emit — fail-loud validation", () => {
  it("throws on unsupported CAD system 'esprit'", () => {
    expect(() => cadFunctionParameterEmitterEngine.emit({ ...fusionExtrude, system: "esprit" } as never)).toThrow();
  });

  it("throws on empty function name", () => {
    expect(() => cadFunctionParameterEmitterEngine.emit({ ...fusionExtrude, functionName: "" })).toThrow();
  });

  it("throws on parameter missing required 'name' field", () => {
    expect(() => cadFunctionParameterEmitterEngine.emit({
      ...fusionExtrude,
      parameters: [{ type: "number" } as never],
    })).toThrow();
  });

  it("throws on parameter with empty-string name (silent-empty would poison NN training)", () => {
    expect(() => cadFunctionParameterEmitterEngine.emit({
      ...fusionExtrude,
      parameters: [{ name: "", type: "number" }],
    })).toThrow();
  });

  it("throws on parameter missing required 'type' field", () => {
    expect(() => cadFunctionParameterEmitterEngine.emit({
      ...fusionExtrude,
      parameters: [{ name: "x" } as never],
    })).toThrow();
  });
});

describe("Per-CAD-system emit path correctness (variability floor)", () => {
  it("fusion360 with TestFn/x emits exact path architecture/cad-params/fusion360/testfn/x.md", () => {
    const r = cadFunctionParameterEmitterEngine.emit({ system: "fusion360", functionName: "TestFn", parameters: [{ name: "x", type: "number" }] });
    expect(r.wikiNodes[0].relativePath).toBe("architecture/cad-params/fusion360/testfn/x.md");
  });

  it("solidworks with TestFn/x emits exact path architecture/cad-params/solidworks/testfn/x.md", () => {
    const r = cadFunctionParameterEmitterEngine.emit({ system: "solidworks", functionName: "TestFn", parameters: [{ name: "x", type: "number" }] });
    expect(r.wikiNodes[0].relativePath).toBe("architecture/cad-params/solidworks/testfn/x.md");
  });

  it("inventor with TestFn/x emits exact path architecture/cad-params/inventor/testfn/x.md", () => {
    const r = cadFunctionParameterEmitterEngine.emit({ system: "inventor", functionName: "TestFn", parameters: [{ name: "x", type: "number" }] });
    expect(r.wikiNodes[0].relativePath).toBe("architecture/cad-params/inventor/testfn/x.md");
  });

  it("hypercads with TestFn/x emits exact path architecture/cad-params/hypercads/testfn/x.md", () => {
    const r = cadFunctionParameterEmitterEngine.emit({ system: "hypercads", functionName: "TestFn", parameters: [{ name: "x", type: "number" }] });
    expect(r.wikiNodes[0].relativePath).toBe("architecture/cad-params/hypercads/testfn/x.md");
  });

  it("mastercam with TestFn/x emits exact path architecture/cad-params/mastercam/testfn/x.md", () => {
    const r = cadFunctionParameterEmitterEngine.emit({ system: "mastercam", functionName: "TestFn", parameters: [{ name: "x", type: "number" }] });
    expect(r.wikiNodes[0].relativePath).toBe("architecture/cad-params/mastercam/testfn/x.md");
  });
});

describe("summary", () => {
  const s = cadFunctionParameterEmitterEngine.summary();

  it("schemaVersion equals 1", () => {
    expect(s.schemaVersion).toBe(1);
  });

  it("supportedSystems equals the SupportedSystem const exactly", () => {
    expect([...s.supportedSystems]).toEqual([...SupportedSystem]);
  });

  it("emitSurfaces equals exactly ['wiki', 'tribal', 'nn-graph-seed']", () => {
    expect([...s.emitSurfaces]).toEqual(["wiki", "tribal", "nn-graph-seed"]);
  });
});
