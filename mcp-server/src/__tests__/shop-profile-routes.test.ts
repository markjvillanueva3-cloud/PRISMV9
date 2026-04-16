import express from "express";
import http from "node:http";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { ShopConfigurationEngine, shopConfigurationEngine } from "../engines/ShopConfigurationEngine.js";
import { createShopProfileRouter } from "../routes/shopProfile.js";

let server: http.Server;
let port = 0;

function httpRequest(
  method: string,
  urlPath: string,
): Promise<{ status: number; data: any }> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port,
        path: urlPath,
        method,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => {
          const text = Buffer.concat(chunks).toString();
          resolve({ status: res.statusCode ?? 0, data: JSON.parse(text) });
        });
      },
    );
    req.on("error", reject);
    req.end();
  });
}

describe("Shop profile routes", () => {
  beforeAll(async () => {
    const app = express();
    app.use(express.json());
    app.use("/api/v1/shop", createShopProfileRouter());

    server = app.listen(0);
    await once(server, "listening");
    port = (server.address() as AddressInfo).port;
  });

  afterAll(async () => {
    if (!server.listening) {
      return;
    }

    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  beforeEach(() => {
    shopConfigurationEngine.resetProfile(ShopConfigurationEngine.DEFAULT_PROFILE_ID);
  });

  it("returns the canonical JM Die selector resource summary", async () => {
    const response = await httpRequest("GET", "/api/v1/shop/selector-resource-summary");

    expect(response.status).toBe(200);
    expect(response.data.ok).toBe(true);
    expect(response.data.summary).toMatchObject({
      shop_id: "jm-die",
      tool_holders_root: "H:\\PRISM\\JM DIE\\Tool Holders",
      tooling_root: "H:\\PRISM\\JM DIE\\Tooling",
      materials_root: "H:\\PRISM\\JM DIE\\Materials",
    });
    expect(response.data.summary.live_tool_count).toBeGreaterThan(200);
    expect(response.data.summary.tool_holders_root_present).toBe(false);
    expect(response.data.summary.tooling_root_present).toBe(false);
    expect(response.data.summary.materials_root_present).toBe(false);
  });

  it("returns the canonical JM Die selector resource catalog", async () => {
    const response = await httpRequest("GET", "/api/v1/shop/selector-resource-catalog");

    expect(response.status).toBe(200);
    expect(response.data.ok).toBe(true);
    expect(response.data.catalog.toolholders.some((holder: { id: string }) => holder.id === "th-jmd-system3r-er32")).toBe(true);
    expect(response.data.catalog.toolingPackages.some((pkg: { id: string }) => pkg.id === "tp-jmd-release-baseline")).toBe(true);
    expect(response.data.catalog.stockProfiles.some((stock: { id: string }) => stock.id === "stk-jmd-carbide-blank")).toBe(true);
  });
});
