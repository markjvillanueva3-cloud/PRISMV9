/**
 * post-pipeline-integrity-check.mjs — integration test (CPP-MS5-U-CPP34)
 *
 * Guards against drift between the engine's `verifyChain()` and the .mjs hook's
 * inline mirror of the same logic. Spawns the hook against a tmp workspace,
 * reads back PIPELINE_INTEGRITY.json, and compares its link hashes to what
 * the engine produces for the same inputs.
 *
 * Can't fully exercise the hook because it hardcodes H:/prism paths; instead
 * we spawn it and verify it writes a valid schema-conformant output that
 * agrees with the engine on the live prism root.
 *
 * @milestone CPP-MS5-U-CPP34
 */

import { describe, it, expect } from "vitest";
import { spawnSync } from "node:child_process";
import { promises as fs } from "node:fs";
import {
  ContextIntegrityEngine,
  type ChainArtifact,
} from "../engines/ContextIntegrityEngine.js";

const HOOK_PATH = "H:\\prism\\.claude\\hooks\\post-pipeline-integrity-check.mjs";
const OUTPUT_PATH = "H:\\prism\\state\\shared\\PIPELINE_INTEGRITY.json";

describe("post-pipeline-integrity-check.mjs (CPP-MS5-U-CPP34)", () => {
  it("runs to completion and writes PIPELINE_INTEGRITY.json", async () => {
    const result = spawnSync("node", [HOOK_PATH], {
      encoding: "utf8",
      cwd: "H:\\prism",
      windowsHide: true,
    });
    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/\[pipeline-integrity\]/);
    const raw = await fs.readFile(OUTPUT_PATH, "utf8");
    const parsed = JSON.parse(raw);
    expect(parsed.schemaVersion).toBe(1);
    expect(parsed.captured_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(Array.isArray(parsed.links)).toBe(true);
    expect(parsed.links.length).toBeGreaterThan(0);
  });

  it("hook output links agree with engine.verifyChain() for same inputs", async () => {
    const raw = await fs.readFile(OUTPUT_PATH, "utf8");
    const parsed = JSON.parse(raw);

    // Rebuild the artifact list from hook-captured paths + re-read contents.
    const artifacts: ChainArtifact[] = await Promise.all(
      parsed.links.map(async (link: { stage: string; path: string }) => ({
        stage: link.stage,
        path: link.path,
        contents: await fs.readFile(link.path, "utf8").catch(() => ""),
      })),
    );

    const engine = new ContextIntegrityEngine();
    const engineResult = engine.verifyChain(artifacts);

    // Because the engine re-hashes with the same sha256 seed, all eventHashes
    // must match regardless of how the hook captured them.
    expect(engineResult.links.map((l) => l.eventHash))
      .toEqual(parsed.links.map((l: { eventHash: string }) => l.eventHash));
    expect(engineResult.score).toBe(parsed.score);
    expect(engineResult.valid).toBe(parsed.valid);
  });

  it("every link has 64-char hex sha256 eventHash", async () => {
    const raw = await fs.readFile(OUTPUT_PATH, "utf8");
    const parsed = JSON.parse(raw);
    for (const link of parsed.links) {
      expect(link.eventHash).toMatch(/^[0-9a-f]{64}$/);
    }
  });

  it("first link has empty priorHash; subsequent links chain properly", async () => {
    const raw = await fs.readFile(OUTPUT_PATH, "utf8");
    const parsed = JSON.parse(raw);
    expect(parsed.links[0].priorHash).toBe("");
    for (let i = 1; i < parsed.links.length; i++) {
      expect(parsed.links[i].priorHash).toBe(parsed.links[i - 1].eventHash);
    }
  });
});
