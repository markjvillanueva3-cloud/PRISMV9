/**
 * family-field-artifacts.integration.test.ts — CPP-MS5-U-CPP35
 *
 * Guards that every hook-produced artifact encodes a machine-readable
 * `family` identity. This is the Codex boundary rule enabler: once the
 * field is present in every artifact, the boundary enforcement hook can
 * parse-and-reject Codex writes to Claude-owned tracks (and vice versa)
 * without having to guess from file path or pid.
 *
 * Artifacts audited:
 *   1. HANDOFF-* (SessionHandoffV2Engine.build() sets identity.family)
 *   2. .compaction-survival-*.md — compaction-survival.mjs renders
 *      `- Family:` / `- Machine:` / `- Instance:` in ## Identity block
 *   3. PIPELINE_INTEGRITY.json — post-pipeline-integrity-check.mjs embeds
 *      top-level `family`/`machine`/`instance` fields
 *   4. AGENT_WORKBOARD.md — agent-coordination.mjs renders `- Family:`
 *
 * @milestone CPP-MS5-U-CPP35
 */

import { describe, it, expect, beforeAll } from "vitest";
import { spawnSync } from "node:child_process";
import { promises as fs } from "node:fs";
import { sessionHandoffV2Engine } from "../engines/SessionHandoffV2Engine.js";

const SURVIVAL_HOOK = "H:\\prism\\.claude\\helpers\\compaction-survival.mjs";
const INTEGRITY_HOOK = "H:\\prism\\.claude\\hooks\\post-pipeline-integrity-check.mjs";
const SURVIVAL_LEGACY = "H:\\prism\\.claude\\helpers\\.compaction-survival.md";
const INTEGRITY_OUT = "H:\\prism\\state\\shared\\PIPELINE_INTEGRITY.json";
const WORKBOARD_MD = "H:\\prism\\state\\shared\\AGENT_WORKBOARD.md";

describe("family field on every hook artifact (CPP-MS5-U-CPP35)", () => {
  beforeAll(() => {
    // Make sure both writer hooks have run at least once so the legacy
    // single-file snapshot + pipeline integrity JSON reflect current code.
    spawnSync("node", [SURVIVAL_HOOK], { encoding: "utf8", windowsHide: true });
    spawnSync("node", [INTEGRITY_HOOK], { encoding: "utf8", windowsHide: true });
  });

  it("SessionHandoffV2Engine.build() produces identity.family in allowed set", () => {
    const built = sessionHandoffV2Engine.build({
      identity: {
        agent: "test-agent",
        family: "claude",
        machine: "DESKTOP-TEST",
        instance: "test-agent@DESKTOP-TEST/s1",
        sessionId: "s1",
      },
      position: { phase: "CPP-MS5", milestone: "CPP-MS5", branch: "main" },
      openGoals: [],
      keyInsights: [],
      nextActions: [],
      writtenAt: "2026-04-17T00:00:00.000Z",
    });
    expect(built.identity.family).toBe("claude");
    expect(["claude", "codex", "other"]).toContain(built.identity.family);
  });

  it("SessionHandoffV2Engine rejects unknown family values", () => {
    const built = sessionHandoffV2Engine.build({
      identity: {
        agent: "test-agent",
        family: "bogus" as "claude",
        machine: "DESKTOP-TEST",
        instance: "test-agent@DESKTOP-TEST/s1",
        sessionId: "s1",
      },
      position: { phase: "x", milestone: "x", branch: "main" },
      openGoals: [],
      keyInsights: [],
      nextActions: [],
    });
    const result = sessionHandoffV2Engine.validate(built);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes("family"))).toBe(true);
  });

  it(".compaction-survival.md (legacy) contains ## Identity block with Family/Machine/Instance", async () => {
    const content = await fs.readFile(SURVIVAL_LEGACY, "utf8");
    expect(content).toMatch(/^## Identity$/m);
    expect(content).toMatch(/^- Family:\s+\S+/m);
    expect(content).toMatch(/^- Machine:\s+\S+/m);
    expect(content).toMatch(/^- Instance:\s+\S+@\S+\/\S+/m);
  });

  it("PIPELINE_INTEGRITY.json has top-level family, machine, instance", async () => {
    const raw = await fs.readFile(INTEGRITY_OUT, "utf8");
    const parsed = JSON.parse(raw);
    expect(typeof parsed.family).toBe("string");
    expect(parsed.family.length).toBeGreaterThan(0);
    expect(typeof parsed.machine).toBe("string");
    expect(parsed.machine.length).toBeGreaterThan(0);
    expect(parsed.instance).toMatch(/^[^@]+@[^/]+\/.+/);
  });

  it("AGENT_WORKBOARD.md renders `- Family:` lines for every agent entry", async () => {
    // Readable as long as the coordination daemon has run at least once.
    // We don't spawn it here (long-running), but the current checked-in
    // snapshot must have family lines — if it doesn't, the writer drifted.
    const content = await fs.readFile(WORKBOARD_MD, "utf8");
    expect(content).toMatch(/^## Agent@/m);
    expect(content).toMatch(/^- Family:\s+\S+/m);
    // Every agent stanza must have a family entry.
    const agentHeaders = (content.match(/^## [A-Za-z]+@/gm) || []).length;
    const familyLines = (content.match(/^- Family:/gm) || []).length;
    expect(familyLines).toBeGreaterThanOrEqual(agentHeaders);
  });
});
