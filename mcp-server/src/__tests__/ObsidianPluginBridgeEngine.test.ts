/**
 * ObsidianPluginBridgeEngine Tests — U-OBS-BRIDGE02
 *
 * Tests plugin registration, authentication, query execution, rate limiting,
 * and event subscription via knowledgeDispatcher actions.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  ObsidianPluginBridgeEngine,
  obsidianPluginBridgeEngine,
} from "../engines/ObsidianPluginBridgeEngine.js";

// Mock TribalKnowledgeEngine for knowledge.search action
vi.mock("../engines/TribalKnowledgeEngine.js", () => ({
  tribalKnowledgeEngine: {
    search: vi.fn(() => [
      { id: "tip-001", title: "Test Tip", body: "Test body", category: "general" },
    ]),
  },
}));

// Mock ObsidianVaultSyncEngine for sync.status action
vi.mock("../engines/ObsidianVaultSyncEngine.js", () => ({
  obsidianVaultSyncEngine: {
    status: vi.fn(() => ({ configured: false, total_entries: 0, pending_conflicts: 0 })),
  },
}));

describe("ObsidianPluginBridgeEngine", () => {
  let engine: ObsidianPluginBridgeEngine;
  let registeredApiKey: string;

  beforeEach(() => {
    vi.clearAllMocks();
    engine = new ObsidianPluginBridgeEngine();
    const regResult = engine.register({
      plugin_id: `test-plugin-${Date.now()}`,
      plugin_name: "Test Plugin",
      capabilities: ["query", "subscribe"],
    });
    registeredApiKey = regResult.api_key || "";
  });

  describe("obsidian_plugin_register", () => {
    it("registers new plugin returning 64-char hex API key and success message", async () => {
      const result = engine.register( {
        plugin_id: "new-registration-test",
        plugin_name: "New Registration Test",
        version: "1.0.0",
      });

      expect(result.success).toBe(true);
      expect(result.api_key).toMatch(/^[a-f0-9]{64}$/);
      expect(result.plugin_id).toBe("new-registration-test");
      expect(result.message).toBe("Plugin registered successfully");
    });

    it("updates existing plugin returning same API key with updated message", async () => {
      const first = engine.register( {
        plugin_id: "duplicate-test",
        plugin_name: "First Name",
      });

      const second = engine.register( {
        plugin_id: "duplicate-test",
        plugin_name: "Updated Name",
        version: "2.0.0",
      });

      expect(second.api_key).toBe(first.api_key);
      expect(second.message).toBe("Registration updated");
    });

    it("accepts query subscribe write capabilities array", async () => {
      const result = engine.register( {
        plugin_id: "full-capabilities",
        plugin_name: "Full Capabilities",
        capabilities: ["query", "subscribe", "write"],
      });

      expect(result.success).toBe(true);
      expect(result.api_key.length).toBe(64);
    });
  });

  describe("obsidian_plugin_query", () => {
    it("rejects query with invalid API key returning specific error message", async () => {
      const result = await engine.query( {
        api_key: "invalid-api-key-not-64-hex-chars",
        action: "knowledge.search",
        params: { query: "test" },
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Invalid or expired API key");
      expect(result.cached).toBe(false);
    });

    it("executes knowledge.search returning array data with execution time", async () => {
      const result = await engine.query( {
        api_key: registeredApiKey,
        action: "knowledge.search",
        params: { query: "machining tips" },
      });

      expect(result.success).toBe(true);
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.execution_time_ms).toBeGreaterThanOrEqual(0);
    });

    it("returns tribal.categories as string array containing machining and tooling", async () => {
      const result = await engine.query( {
        api_key: registeredApiKey,
        action: "tribal.categories",
      });

      expect(result.success).toBe(true);
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data).toContain("machining");
      expect(result.data).toContain("tooling");
    });

    it("returns error listing available actions for unknown action", async () => {
      const result = await engine.query( {
        api_key: registeredApiKey,
        action: "unknown.nonexistent",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Unknown action");
      expect(result.error).toContain("knowledge.search");
    });

    it("rejects plugin without query capability with capability error", async () => {
      const reg = engine.register( {
        plugin_id: "subscribe-only-plugin",
        plugin_name: "Subscribe Only",
        capabilities: ["subscribe"],
      });

      const result = await engine.query( {
        api_key: reg.api_key,
        action: "tribal.list",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Plugin does not have query capability");
    });
  });

  describe("obsidian_plugin_subscribe", () => {
    it("creates subscription returning sub_ prefixed 24-char hex ID", async () => {
      const result = engine.subscribe( {
        api_key: registeredApiKey,
        event_types: ["knowledge_update", "tribal_tip_added"],
      });

      expect(result.success).toBe(true);
      expect(result.subscription_id).toMatch(/^sub_[a-f0-9]{24}$/);
      expect(result.message).toContain("2 event type");
    });

    it("rejects subscription for plugin without subscribe capability", async () => {
      const reg = engine.register( {
        plugin_id: "query-only-for-sub-test",
        plugin_name: "Query Only",
        capabilities: ["query"],
      });

      const result = engine.subscribe( {
        api_key: reg.api_key,
        event_types: ["knowledge_update"],
      });

      expect(result.success).toBe(false);
      expect(result.message).toBe("Plugin does not have subscribe capability");
    });

    it("accepts filter object with categories and tags arrays", async () => {
      const result = engine.subscribe( {
        api_key: registeredApiKey,
        event_types: ["tribal_tip_added"],
        filter: {
          categories: ["machining", "tooling"],
          tags: ["lathe", "aluminum"],
        },
      });

      expect(result.success).toBe(true);
      expect(result.subscription_id).toMatch(/^sub_/);
    });
  });

  describe("obsidian_plugin_unsubscribe", () => {
    it("removes specific subscription by ID returning count 1", async () => {
      const sub = engine.subscribe( {
        api_key: registeredApiKey,
        event_types: ["sync_complete"],
      });

      const result = engine.unsubscribe( {
        api_key: registeredApiKey,
        subscription_id: sub.subscription_id,
      });

      expect(result.success).toBe(true);
      expect(result.removed_count).toBe(1);
    });

    it("removes all subscriptions when no ID specified returning total count", async () => {
      engine.subscribe( {
        api_key: registeredApiKey,
        event_types: ["knowledge_update"],
      });
      engine.subscribe( {
        api_key: registeredApiKey,
        event_types: ["tribal_tip_added"],
      });

      const result = engine.unsubscribe( {
        api_key: registeredApiKey,
      });

      expect(result.removed_count).toBeGreaterThanOrEqual(2);
    });

    it("returns zero count with no subscriptions found message for non-existent ID", async () => {
      const result = engine.unsubscribe( {
        api_key: registeredApiKey,
        subscription_id: "sub_000000000000000000000000",
      });

      expect(result.removed_count).toBe(0);
      expect(result.message).toBe("No subscriptions found");
    });
  });

  describe("obsidian_plugin_status", () => {
    it("returns bridge status with active true and non-negative uptime", () => {
      const result = engine.status();

      expect(result.active).toBe(true);
      expect(result.registered_plugins).toBeGreaterThanOrEqual(0);
      expect(result.uptime_seconds).toBeGreaterThanOrEqual(0);
    });

    it("includes plugin_status object with rate_limit_remaining when valid API key provided", () => {
      const result = engine.status(registeredApiKey);

      expect(typeof result.plugin_status).toBe("object");
      expect(result.plugin_status!.rate_limit_remaining).toBeLessThanOrEqual(60);
      expect(result.plugin_status!.capabilities).toContain("query");
    });

    it("excludes plugin_status property for invalid API key", () => {
      const result = engine.status("not-a-valid-key");

      expect(result.active).toBe(true);
      expect(Object.prototype.hasOwnProperty.call(result, "plugin_status")).toBe(false);
    });
  });
});
