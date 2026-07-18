/**
 * zuluAwarenessReader.liveBrain.test.ts
 *
 * Verifies the ZULU-OBSIDIAN-LIVE-MS0 additive `liveBrainContext()` export:
 *  - OFF by default (PRISM_OBSIDIAN_LIVE unset) → null, i.e. NO behavior change.
 *  - Fail-soft when enabled but no vault/key → null (callers keep file envelope).
 * And confirms the pre-existing `loadAwareness` file path is unchanged by the
 * addition (disable-env + injected-reader paths still behave).
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  liveBrainContext,
  loadAwareness,
  invalidateAwarenessCache,
  type AwarenessIndex,
} from "../engines/lib/zuluAwarenessReader.js";
import { ObsidianRestBridgeEngine } from "../engines/ObsidianRestBridgeEngine.js";

const LIVE = "PRISM_OBSIDIAN_LIVE";
const KEY = "PRISM_OBSIDIAN_API_KEY";
const DIS = "PRISM_ZULU_AWARENESS_DISABLE";

let saved: Record<string, string | undefined> = {};

beforeEach(() => {
  saved = { [LIVE]: process.env[LIVE], [KEY]: process.env[KEY], [DIS]: process.env[DIS] };
  invalidateAwarenessCache();
  ObsidianRestBridgeEngine._resetHealthCache();
});
afterEach(() => {
  for (const k of [LIVE, KEY, DIS]) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
  invalidateAwarenessCache();
  ObsidianRestBridgeEngine._resetHealthCache();
});

describe("liveBrainContext — additive, off by default", () => {
  it("returns null when PRISM_OBSIDIAN_LIVE is unset (no behavior change)", async () => {
    delete process.env[LIVE];
    expect(await liveBrainContext()).toBeNull();
  });

  it("returns null (fail-soft) when enabled but no vault/key configured", async () => {
    process.env[LIVE] = "1";
    delete process.env[KEY]; // engine isLive() short-circuits false → liveBrainContext null
    expect(await liveBrainContext()).toBeNull();
  });
});

describe("loadAwareness — unchanged by the additive live-brain export", () => {
  it("still honors the disable env (existing fail-soft path intact)", () => {
    process.env[DIS] = "1";
    invalidateAwarenessCache();
    const env = loadAwareness();
    expect(env.ok).toBe(false);
    expect(env.reason).toBe("disabled-env");
  });

  it("still loads an injected index envelope (existing reader path intact)", () => {
    delete process.env[DIS];
    invalidateAwarenessCache();
    const fakeIndex: AwarenessIndex = {
      schemaVersion: "1",
      generatedAt: "2026-05-30T00:00:00Z",
      slotCount: 1,
      fingerprints: [
        {
          slot: "zulu",
          ok: true,
          hermesRole: "fleet-orchestrator",
          domains: ["orchestration"],
          refuseList: [],
          queueLength: 0,
          recentCommitScopes: [],
          skillUsageCount: 0,
          tribalDomainScores: {},
          vizNodeCount: 0,
          successRate: 0,
          successSampleSize: 0,
        },
      ],
    };
    const env = loadAwareness({ reader: () => fakeIndex });
    expect(env.ok).toBe(true);
    expect(env.fingerprints[0].slot).toBe("zulu");
  });
});
