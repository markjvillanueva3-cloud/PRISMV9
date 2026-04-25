/**
 * cadAutomationDispatcher.gtRegistry.test.ts — U-CGT08 dispatcher E2E
 *
 * Drives the 10 `gt_registry_*` actions through the real
 * `prism_cad_automation` dispatcher.
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

function writeBundle(
  outRoot: string,
  fileId: string,
  customer: string,
  machineSegment: string,
  format: string,
  featureCount: number,
): void {
  const dir = path.join(outRoot, fileId);
  fs.mkdirSync(dir, { recursive: true });
  const sourcePath = `H:/PRISM/JM DIE/${machineSegment}/${customer}/${fileId}${format}`;
  const bundle = {
    fileId,
    sourcePath,
    format,
    bundleDir: dir,
    status: "ok",
    stages: {
      step: { ok: true },
      featureTree: { ok: true, signature: "f".repeat(64) },
      dimensionalSig: {
        ok: true,
        signature: "d".repeat(64),
        envelopeM: 0.05,
      },
      screenshots: { ok: true },
    },
  };
  fs.writeFileSync(path.join(dir, "bundle.json"), JSON.stringify(bundle));
  const features = Array.from({ length: featureCount }, (_, i) => ({
    id: `f${i}`,
    type: "Body",
    name: `f${i}`,
  }));
  fs.writeFileSync(
    path.join(dir, "feature-tree.json"),
    JSON.stringify({ features }),
  );
}

beforeEach(() => {
  tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "prism-cgt08-disp-"));
  for (let i = 0; i < 6; i++) {
    writeBundle(
      tmpRoot,
      `ALCOA-${String(i).padStart(3, "0")}`,
      "ALCOA",
      "CNC LATHE",
      ".MIN",
      i < 4 ? 3 : 12,
    );
  }
  for (let i = 0; i < 3; i++) {
    writeBundle(tmpRoot, `ITW-${i}`, "ITW", "CNC MILL", ".mcx-8", 2);
  }
});

afterEach(() => {
  try {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  } catch {
    // ignore
  }
});

describe("cadAutomationDispatcher — U-CGT08 action surface", () => {
  it("exposes the 10 gt_registry_* actions in CAD_AUTOMATION_ACTIONS", () => {
    const actions = CAD_AUTOMATION_ACTIONS as readonly string[];
    expect(actions).toContain("gt_registry_build_index");
    expect(actions).toContain("gt_registry_find_file_id");
    expect(actions).toContain("gt_registry_find_customer");
    expect(actions).toContain("gt_registry_find_machine");
    expect(actions).toContain("gt_registry_find_complexity");
    expect(actions).toContain("gt_registry_find_format");
    expect(actions).toContain("gt_registry_query");
    expect(actions).toContain("gt_registry_stats");
    expect(actions).toContain("gt_registry_dump");
    expect(actions).toContain("gt_registry_load");
  });

  it("gt_registry_build_index returns total=9 with byCustomer breakdown", async () => {
    const out = (await invoke("gt_registry_build_index", {
      outputRoot: tmpRoot,
    })) as Record<string, unknown>;
    expect(out["total"]).toBe(9);
    const stats = out["stats"] as Record<string, Record<string, number>>;
    expect(stats["byCustomer"]?.["ALCOA"]).toBe(6);
    expect(stats["byCustomer"]?.["ITW"]).toBe(3);
    expect(stats["byMachineCategory"]?.["lathe"]).toBe(6);
    expect(stats["byMachineCategory"]?.["mill"]).toBe(3);
  });

  it("gt_registry_find_customer ALCOA + limit=4 returns 4 lathe entries", async () => {
    await invoke("gt_registry_build_index", { outputRoot: tmpRoot });
    const arr = (await invoke("gt_registry_find_customer", {
      name: "ALCOA",
      options: { limit: 4, sortBy: "fileId" },
    })) as Array<Record<string, unknown>>;
    expect(arr.length).toBe(4);
    expect(arr.every((e) => e["customer"] === "ALCOA")).toBe(true);
    expect(arr[0]?.["fileId"]).toBe("ALCOA-000");
  });

  it("gt_registry_find_machine lathe returns 6 entries", async () => {
    await invoke("gt_registry_build_index", { outputRoot: tmpRoot });
    const arr = (await invoke("gt_registry_find_machine", {
      category: "lathe",
    })) as Array<Record<string, unknown>>;
    expect(arr.length).toBe(6);
    expect(arr.every((e) => e["machineCategory"] === "lathe")).toBe(true);
  });

  it("gt_registry_find_complexity simple/medium buckets correctly", async () => {
    await invoke("gt_registry_build_index", { outputRoot: tmpRoot });
    const simple = (await invoke("gt_registry_find_complexity", {
      tier: "simple",
    })) as unknown[];
    const medium = (await invoke("gt_registry_find_complexity", {
      tier: "medium",
    })) as unknown[];
    expect(simple.length).toBe(7);
    expect(medium.length).toBe(2);
  });

  it("gt_registry_find_format partitions by extension", async () => {
    await invoke("gt_registry_build_index", { outputRoot: tmpRoot });
    const min = (await invoke("gt_registry_find_format", {
      format: ".MIN",
    })) as unknown[];
    const mcx = (await invoke("gt_registry_find_format", {
      format: ".mcx-8",
    })) as unknown[];
    expect(min.length).toBe(6);
    expect(mcx.length).toBe(3);
  });

  it("gt_registry_query compound filter returns intersection", async () => {
    await invoke("gt_registry_build_index", { outputRoot: tmpRoot });
    const arr = (await invoke("gt_registry_query", {
      filter: { customer: "ALCOA", machineCategory: "lathe" },
      options: { limit: 10 },
    })) as Array<Record<string, unknown>>;
    expect(arr.length).toBe(6);
    expect(arr.every((e) => e["customer"] === "ALCOA")).toBe(true);
  });

  it("gt_registry_stats reports total + per-axis counts", async () => {
    await invoke("gt_registry_build_index", { outputRoot: tmpRoot });
    const out = (await invoke("gt_registry_stats", {})) as Record<
      string,
      unknown
    >;
    expect(out["size"]).toBe(9);
    const stats = out["stats"] as Record<string, Record<string, number>>;
    expect(stats["byCustomer"]?.["ALCOA"]).toBe(6);
    expect(stats["byStatus"]?.["ok"]).toBe(9);
  });

  it("gt_registry_find_file_id returns the entry or null", async () => {
    await invoke("gt_registry_build_index", { outputRoot: tmpRoot });
    const found = (await invoke("gt_registry_find_file_id", {
      fileId: "ALCOA-002",
    })) as Record<string, unknown>;
    expect(found["machineCategory"]).toBe("lathe");
    const missing = await invoke("gt_registry_find_file_id", {
      fileId: "NOT-A-REAL-ID",
    });
    expect(missing).toBeNull();
  });

  it("gt_registry_dump then gt_registry_load round-trips", async () => {
    await invoke("gt_registry_build_index", { outputRoot: tmpRoot });
    const manifestPath = path.join(tmpRoot, "_index", "registry.json");
    const dumped = (await invoke("gt_registry_dump", {
      filePath: manifestPath,
    })) as Record<string, unknown>;
    expect(dumped["ok"]).toBe(true);
    expect(fs.existsSync(manifestPath)).toBe(true);

    const loaded = (await invoke("gt_registry_load", {
      filePath: manifestPath,
    })) as Record<string, unknown>;
    const entries = loaded["entries"] as Array<Record<string, unknown>>;
    expect(entries.length).toBe(9);
  });

  it("rejects build_index with empty outputRoot via schema", async () => {
    const out = (await invoke("gt_registry_build_index", {
      outputRoot: "",
    })) as Record<string, unknown>;
    expect(typeof out["error"]).toBe("string");
  });
});
