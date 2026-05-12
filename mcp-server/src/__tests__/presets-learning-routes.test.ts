import express from "express";
import http from "node:http";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { registerRoutes } from "../routes/index.js";

function httpRequest(
  method: string,
  urlPath: string,
  body?: Record<string, unknown>,
): Promise<{ status: number; data: any }> {
  return new Promise((resolve, reject) => {
    const serialized = body ? JSON.stringify(body) : undefined;
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port,
        path: urlPath,
        method,
        headers: serialized
          ? {
              "Content-Type": "application/json",
              "Content-Length": Buffer.byteLength(serialized),
            }
          : {},
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => {
          const text = Buffer.concat(chunks).toString();
          try {
            resolve({ status: res.statusCode ?? 0, data: JSON.parse(text) });
          } catch {
            resolve({ status: res.statusCode ?? 0, data: text });
          }
        });
      },
    );
    req.on("error", reject);
    if (serialized) {
      req.write(serialized);
    }
    req.end();
  });
}

let server: http.Server;
let port = 0;

describe("Mounted preset routes", () => {
  beforeAll(async () => {
    const app = express();
    app.use(express.json());
    registerRoutes(app, async (toolName, action) => {
      throw new Error(`Unexpected tool call for preset routes: ${toolName}:${action}`);
    });

    server = app.listen(0);
    await once(server, "listening");
    port = (server.address() as AddressInfo).port;
  });

  afterAll(async () => {
    if (server.listening) {
      await new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      });
    }
  });

  it("supports mounted preset CRUD, share, compare, validate, and use-count flows", async () => {
    const ownerId = `U-${randomUUID()}`;
    const viewerId = `U-${randomUUID()}`;

    const presetA = await httpRequest("POST", "/api/v1/presets", {
      user_id: ownerId,
      preset_type: "speed_feed",
      name: "6061 Pocket VF-2",
      params: {
        spindle_speed: 8000,
        feed_rate: 2400,
        depth_of_cut: 3,
      },
      tags: ["aluminum", "pocket"],
      machine_id: "VF-2",
      material_id: "6061-T6",
    });
    expect(presetA.status).toBe(200);
    expect(presetA.data.ok).toBe(true);
    expect(presetA.data.data.id).toBeTruthy();
    expect(presetA.data.data.validated).toBe(true);

    const presetB = await httpRequest("POST", "/api/v1/presets", {
      user_id: ownerId,
      preset_type: "speed_feed",
      name: "4140 Slot VF-2",
      params: {
        spindle_speed: 6200,
        feed_rate: 1800,
        depth_of_cut: 1.8,
      },
      tags: ["steel", "slot"],
      machine_id: "VF-2",
      material_id: "4140",
    });
    expect(presetB.status).toBe(200);

    const presetIdA = presetA.data.data.id as string;
    const presetIdB = presetB.data.data.id as string;

    const list = await httpRequest("GET", `/api/v1/presets?user_id=${encodeURIComponent(ownerId)}&preset_type=speed_feed`);
    expect(list.status).toBe(200);
    expect(list.data.ok).toBe(true);
    expect(list.data.data.presets.some((preset: any) => preset.id === presetIdA)).toBe(true);
    expect(list.data.data.presets.some((preset: any) => preset.id === presetIdB)).toBe(true);

    const getPreset = await httpRequest("GET", `/api/v1/presets/${encodeURIComponent(presetIdA)}?user_id=${encodeURIComponent(ownerId)}`);
    expect(getPreset.status).toBe(200);
    expect(getPreset.data.data.id).toBe(presetIdA);
    expect(getPreset.data.data.name).toBe("6061 Pocket VF-2");

    const privateWithoutUser = await httpRequest("GET", `/api/v1/presets/${encodeURIComponent(presetIdA)}`);
    expect(privateWithoutUser.status).toBe(404);
    expect(privateWithoutUser.data.ok).toBe(false);

    const validate = await httpRequest("GET", `/api/v1/presets/${encodeURIComponent(presetIdA)}/validate?user_id=${encodeURIComponent(ownerId)}`);
    expect(validate.status).toBe(200);
    expect(validate.data.ok).toBe(true);
    expect(validate.data.data.valid).toBe(true);

    const share = await httpRequest("POST", `/api/v1/presets/${encodeURIComponent(presetIdA)}/share`, {
      user_id: ownerId,
    });
    expect(share.status).toBe(200);
    expect(share.data.data.is_shared).toBe(true);

    const sharedList = await httpRequest(
      "GET",
      `/api/v1/presets?user_id=${encodeURIComponent(viewerId)}&include_shared=true`,
    );
    expect(sharedList.status).toBe(200);
    expect(sharedList.data.data.presets.some((preset: any) => preset.id === presetIdA)).toBe(true);

    const search = await httpRequest("POST", "/api/v1/presets/search", {
      user_id: ownerId,
      query: "6061",
    });
    expect(search.status).toBe(200);
    expect(search.data.ok).toBe(true);
    expect(search.data.data.presets.some((preset: any) => preset.id === presetIdA)).toBe(true);

    const compare = await httpRequest("POST", "/api/v1/presets/compare", {
      preset_ids: [presetIdA, presetIdB],
      user_id: ownerId,
    });
    expect(compare.status).toBe(200);
    expect(compare.data.ok).toBe(true);
    expect(compare.data.data.presets).toHaveLength(2);
    expect(compare.data.data.diffs.length).toBeGreaterThan(0);

    const sharedPreset = await httpRequest("GET", `/api/v1/presets/${encodeURIComponent(presetIdA)}`);
    expect(sharedPreset.status).toBe(200);
    expect(sharedPreset.data.ok).toBe(true);
    expect(sharedPreset.data.data.id).toBe(presetIdA);

    const useCount = await httpRequest("POST", `/api/v1/presets/${encodeURIComponent(presetIdA)}/use`, { user_id: ownerId });
    expect(useCount.status).toBe(200);
    expect(useCount.data.data.use_count).toBeGreaterThanOrEqual(1);

    const unshare = await httpRequest("POST", `/api/v1/presets/${encodeURIComponent(presetIdA)}/unshare`, {
      user_id: ownerId,
    });
    expect(unshare.status).toBe(200);
    expect(unshare.data.data.is_shared).toBe(false);

    const removePreset = await httpRequest("DELETE", `/api/v1/presets/${encodeURIComponent(presetIdB)}`, {
      user_id: ownerId,
    });
    expect(removePreset.status).toBe(200);
    expect(removePreset.data.data).toEqual({ deleted: true });

    const missingRemovedPreset = await httpRequest("GET", `/api/v1/presets/${encodeURIComponent(presetIdB)}?user_id=${encodeURIComponent(ownerId)}`);
    expect(missingRemovedPreset.status).toBe(404);
    expect(missingRemovedPreset.data.ok).toBe(false);
  });

  it("fails closed for invalid preset type, missing preset, cross-user mutation, and mixed-type compare", async () => {
    const ownerId = `U-${randomUUID()}`;
    const otherUserId = `U-${randomUUID()}`;

    const invalidPreset = await httpRequest("POST", "/api/v1/presets", {
      user_id: ownerId,
      preset_type: "invalid",
      name: "Broken",
      params: {},
    });
    expect(invalidPreset.status).toBe(400);
    expect(invalidPreset.data.ok).toBe(false);

    const missingPreset = await httpRequest("GET", `/api/v1/presets/${encodeURIComponent(`missing-${randomUUID()}`)}?user_id=${encodeURIComponent(ownerId)}`);
    expect(missingPreset.status).toBe(404);
    expect(missingPreset.data.ok).toBe(false);

    const speedFeed = await httpRequest("POST", "/api/v1/presets", {
      user_id: ownerId,
      preset_type: "speed_feed",
      name: "Owner speed-feed",
      params: {
        spindle_speed: 7600,
        feed_rate: 2100,
      },
    });
    expect(speedFeed.status).toBe(200);

    const fixture = await httpRequest("POST", "/api/v1/presets", {
      user_id: ownerId,
      preset_type: "fixture",
      name: "Fixture package",
      params: {
        vise_jaw_width: 6,
        parallels: true,
      },
    });
    expect(fixture.status).toBe(200);

    const speedFeedId = speedFeed.data.data.id as string;
    const fixtureId = fixture.data.data.id as string;

    const compareMixedTypes = await httpRequest("POST", "/api/v1/presets/compare", {
      preset_ids: [speedFeedId, fixtureId],
      user_id: ownerId,
    });
    expect(compareMixedTypes.status).toBe(400);
    expect(compareMixedTypes.data.ok).toBe(false);

    const missingUserValidate = await httpRequest("GET", `/api/v1/presets/${encodeURIComponent(speedFeedId)}/validate`);
    expect(missingUserValidate.status).toBe(400);
    expect(missingUserValidate.data.ok).toBe(false);

    const unauthorizedShare = await httpRequest("POST", `/api/v1/presets/${encodeURIComponent(speedFeedId)}/share`, {
      user_id: otherUserId,
    });
    expect(unauthorizedShare.status).toBe(400);
    expect(unauthorizedShare.data.ok).toBe(false);

    const unauthorizedValidate = await httpRequest(
      "GET",
      `/api/v1/presets/${encodeURIComponent(speedFeedId)}/validate?user_id=${encodeURIComponent(otherUserId)}`,
    );
    expect(unauthorizedValidate.status).toBe(400);
    expect(unauthorizedValidate.data.ok).toBe(false);

    const missingUserUse = await httpRequest("POST", `/api/v1/presets/${encodeURIComponent(speedFeedId)}/use`, {});
    expect(missingUserUse.status).toBe(400);
    expect(missingUserUse.data.ok).toBe(false);

    const unauthorizedDelete = await httpRequest("DELETE", `/api/v1/presets/${encodeURIComponent(speedFeedId)}`, {
      user_id: otherUserId,
    });
    expect(unauthorizedDelete.status).toBe(400);
    expect(unauthorizedDelete.data.ok).toBe(false);
  });
});
