/**
 * cadAutomationDispatcher.gtValidation.test.ts — U-CGT09 dispatcher E2E
 *
 * Drives the five `gt_validate_*` / `gt_export_quarantine` /
 * `gt_list_issue_codes` actions through the real prism_cad_automation
 * dispatcher.
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

import {
  registerCadAutomationDispatcher,
  CAD_AUTOMATION_ACTIONS,
} from "../tools/dispatchers/cadAutomationDispatcher.js";

interface CapturedTool {
  name: string;
  description: string;
  schema: unknown;
  handler: (args: {
    action: string;
    params?: Record<string, unknown>;
  }) => Promise<unknown>;
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
): Promise<unknown> {
  const res = (await handler({ action, params })) as Record<string, unknown>;
  if (res && Array.isArray((res as { content?: unknown[] }).content)) {
    const arr = (res as { content: Array<{ text?: string }> }).content;
    const text = arr[0]?.text ?? "";
    return JSON.parse(text);
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

let tmpRoot: string;

function writeOkBundle(rootDir: string, fileId: string): string {
  const dir = path.join(rootDir, fileId);
  fs.mkdirSync(path.join(dir, "screenshots"), { recursive: true });
  fs.writeFileSync(
    path.join(dir, "bundle.json"),
    JSON.stringify({
      fileId,
      sourcePath: `H:/PRISM/JM DIE/CNC LATHE/ALCOA/${fileId}.MIN`,
      format: ".MIN",
      bundleDir: dir,
      status: "ok",
      stages: {
        step: { ok: true },
        featureTree: { ok: true },
        dimensionalSig: { ok: true },
        screenshots: { ok: true },
      },
    }),
  );
  fs.writeFileSync(
    path.join(dir, "source.step"),
    "ISO-10303-21;\nDATA;\nCARTESIAN_POINT('p',(0,0,0));\nENDSEC;\nEND-ISO-10303-21;\n",
  );
  fs.writeFileSync(
    path.join(dir, "feature-tree.json"),
    JSON.stringify({ features: [{ id: "f0", type: "Body", name: "f0" }] }),
  );
  fs.writeFileSync(
    path.join(dir, "dimensional-signature.json"),
    JSON.stringify({
      schemaVersion: "1.0.0",
      sourceFile: "/x.step",
      unitSystem: "SI",
      sourceLengthUnit: "mm",
      bbox: { min: [0, 0, 0], max: [0.05, 0.03, 0.02], extent: [0.05, 0.03, 0.02] },
      envelopeM: 0.05,
      volumeBboxM3: 0.001,
      surfaceAreaM2: 0.01,
      com: [0.025, 0.015, 0.01],
      moiAABB: { Ixx: 0, Iyy: 0, Izz: 0 },
      holes: [],
      counts: { cartesianPoints: 8, circles: 0, lines: 0 },
      signature: "d".repeat(64),
      warnings: [],
    }),
  );
  for (const view of [
    "iso",
    "front",
    "top",
    "right",
    "section-xz",
    "section-yz",
  ]) {
    fs.writeFileSync(
      path.join(dir, "screenshots", `${view}.png`),
      Buffer.from([0x89, 0x50, 0x4e, 0x47]),
    );
  }
  return dir;
}

function writeBadBundle(rootDir: string, fileId: string): string {
  const dir = path.join(rootDir, fileId);
  fs.mkdirSync(dir, { recursive: true });
  // missing bundle.json entirely
  return dir;
}

beforeEach(() => {
  tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "prism-cgt09-disp-"));
});

afterEach(() => {
  try {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  } catch {
    // ignore
  }
});

describe("cadAutomationDispatcher — U-CGT09 action surface", () => {
  it("exposes the 5 gt_validate_* / quarantine / issue-code actions", () => {
    const actions = CAD_AUTOMATION_ACTIONS as readonly string[];
    expect(actions).toContain("gt_validate_bundle");
    expect(actions).toContain("gt_validate_corpus");
    expect(actions).toContain("gt_export_quarantine");
    expect(actions).toContain("gt_validate_report");
    expect(actions).toContain("gt_list_issue_codes");
  });

  it("gt_list_issue_codes returns the documented vocabulary", async () => {
    const out = (await invoke("gt_list_issue_codes", {})) as Record<
      string,
      unknown
    >;
    expect(out["count"]).toBe(14);
    const codes = out["codes"] as string[];
    expect(codes).toContain("bundle-json-missing");
    expect(codes).toContain("step-not-iso-10303");
    expect(codes).toContain("dim-signature-zero-envelope");
    expect(codes).toContain("dim-signature-nan");
    expect(codes).toContain("screenshot-missing");
  });

  it("gt_validate_bundle on a clean bundle → quarantined=false, 0 issues", async () => {
    const dir = writeOkBundle(tmpRoot, "P1");
    const out = (await invoke("gt_validate_bundle", {
      bundleDir: dir,
      fileId: "P1",
    })) as Record<string, unknown>;
    expect(out["quarantined"]).toBe(false);
    expect((out["issues"] as unknown[]).length).toBe(0);
    expect(out["status"]).toBe("ok");
  });

  it("gt_validate_bundle on a missing-bundle dir → bundle-json-missing", async () => {
    const dir = writeBadBundle(tmpRoot, "X");
    const out = (await invoke("gt_validate_bundle", {
      bundleDir: dir,
      fileId: "X",
    })) as Record<string, unknown>;
    expect(out["quarantined"]).toBe(true);
    const issues = out["issues"] as Array<{ code: string }>;
    expect(issues.some((i) => i.code === "bundle-json-missing")).toBe(true);
  });

  it("gt_validate_corpus aggregates ok + quarantined counts across mixed bundles", async () => {
    writeOkBundle(tmpRoot, "OK-1");
    writeOkBundle(tmpRoot, "OK-2");
    writeBadBundle(tmpRoot, "BAD-1");
    writeBadBundle(tmpRoot, "BAD-2");
    const out = (await invoke("gt_validate_corpus", {
      outputRoot: tmpRoot,
    })) as Record<string, unknown>;
    expect(out["total"]).toBe(4);
    expect(out["ok"]).toBe(2);
    expect(out["quarantined"]).toBe(2);
    expect((out["byCode"] as Record<string, number>)["bundle-json-missing"]).toBe(2);
    expect(out["signature"]).toMatch(/^[0-9a-f]{64}$/);
  });

  it("gt_validate_corpus skipScreenshots option suppresses screenshot-missing flags", async () => {
    const dir = writeOkBundle(tmpRoot, "OK-1");
    // Remove all PNGs to force screenshot-missing
    fs.rmSync(path.join(dir, "screenshots"), { recursive: true, force: true });
    fs.mkdirSync(path.join(dir, "screenshots"));
    const strict = (await invoke("gt_validate_corpus", {
      outputRoot: tmpRoot,
    })) as Record<string, unknown>;
    expect(strict["quarantined"]).toBe(1);

    const lenient = (await invoke("gt_validate_corpus", {
      outputRoot: tmpRoot,
      skipScreenshots: true,
    })) as Record<string, unknown>;
    expect(lenient["quarantined"]).toBe(0);
  });

  it("gt_export_quarantine writes a Zod-valid manifest to disk", async () => {
    writeOkBundle(tmpRoot, "OK-1");
    writeBadBundle(tmpRoot, "BAD-1");
    const report = await invoke("gt_validate_corpus", { outputRoot: tmpRoot });
    const manifestPath = path.join(tmpRoot, "_validation", "quarantine.json");
    const dump = (await invoke("gt_export_quarantine", {
      report,
      filePath: manifestPath,
    })) as Record<string, unknown>;
    expect(dump["ok"]).toBe(true);
    expect(fs.existsSync(manifestPath)).toBe(true);

    // Round-trip: gt_validate_report on the dumped manifest
    const persisted = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    const validated = (await invoke("gt_validate_report", {
      candidate: persisted,
    })) as Record<string, unknown>;
    expect(validated["ok"]).toBe(true);
  });

  it("gt_validate_report flags malformed candidates with structured errors", async () => {
    const out = (await invoke("gt_validate_report", {
      candidate: { schemaVersion: "1.0.0" },
    })) as Record<string, unknown>;
    expect(out["ok"]).toBe(false);
    expect((out["errors"] as string[]).length).toBeGreaterThan(2);
  });

  it("gt_validate_corpus rejects empty outputRoot via dispatcher schema", async () => {
    const out = (await invoke("gt_validate_corpus", {
      outputRoot: "",
    })) as Record<string, unknown>;
    expect(typeof out["error"]).toBe("string");
  });
});
