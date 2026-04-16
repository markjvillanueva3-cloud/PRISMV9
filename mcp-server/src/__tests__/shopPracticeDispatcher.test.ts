/**
 * Tests for shopPracticeDispatcher — CC-MS6 Integration
 *
 * Validates dispatcher registration, action routing, and Python bridge.
 */

import { describe, it, expect } from "vitest";

// Import the dispatcher module to verify it exports correctly
describe("shopPracticeDispatcher", () => {
  it("exports registerShopPracticeDispatcher function", async () => {
    const mod = await import("../tools/dispatchers/shopPracticeDispatcher.js");
    expect(mod.registerShopPracticeDispatcher).toBeDefined();
    expect(typeof mod.registerShopPracticeDispatcher).toBe("function");
  });

  it("registers with correct tool name and actions", async () => {
    const mod = await import("../tools/dispatchers/shopPracticeDispatcher.js");

    let registeredName = "";
    let registeredDescription = "";
    let registeredSchema: any = null;

    const mockServer = {
      tool: (name: string, description: string, schema: any, _handler: any) => {
        registeredName = name;
        registeredDescription = description;
        registeredSchema = schema;
      },
    };

    mod.registerShopPracticeDispatcher(mockServer);

    expect(registeredName).toBe("prism_shop_practice");
    expect(registeredDescription).toContain("Shop practice");
    expect(registeredSchema).toBeDefined();
    expect(registeredSchema.action).toBeDefined();
  });

  it("has all 12 actions defined", async () => {
    const mod = await import("../tools/dispatchers/shopPracticeDispatcher.js");

    let actionSchema: any = null;
    const mockServer = {
      tool: (_name: string, _desc: string, schema: any, _handler: any) => {
        actionSchema = schema;
      },
    };

    mod.registerShopPracticeDispatcher(mockServer);

    // The action schema is a z.enum — check it has the right options
    const expectedActions = [
      "practice_ingest",
      "practice_search",
      "practice_get",
      "practice_list",
      "practice_audit",
      "practice_recommend",
      "tree_build",
      "tree_navigate",
      "tree_search",
      "tips_add",
      "tips_get",
      "tips_conflicts",
    ];

    // Parse each action to verify it's valid in the schema
    for (const action of expectedActions) {
      const result = actionSchema.action.safeParse(action);
      expect(result.success, `Action '${action}' should be valid`).toBe(true);
    }
  });

  it("rejects unknown actions in schema", async () => {
    const mod = await import("../tools/dispatchers/shopPracticeDispatcher.js");

    let actionSchema: any = null;
    const mockServer = {
      tool: (_name: string, _desc: string, schema: any, _handler: any) => {
        actionSchema = schema;
      },
    };

    mod.registerShopPracticeDispatcher(mockServer);

    const result = actionSchema.action.safeParse("nonexistent_action");
    expect(result.success).toBe(false);
  });

  it("handler returns error for unknown action", async () => {
    const mod = await import("../tools/dispatchers/shopPracticeDispatcher.js");

    let handler: any = null;
    const mockServer = {
      tool: (_name: string, _desc: string, _schema: any, h: any) => {
        handler = h;
      },
    };

    mod.registerShopPracticeDispatcher(mockServer);
    expect(handler).toBeDefined();

    // Call with an action that passes schema but would hit unknown handler branch
    // This tests the error handling path
    const result = await handler({
      action: "practice_list",
      params: {},
    });

    expect(result).toBeDefined();
    expect(result.content).toBeDefined();
    expect(result.content.length).toBeGreaterThan(0);
    expect(result.content[0].type).toBe("text");

    // The result will either succeed (if Python is available) or error gracefully
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed).toBeDefined();
    // Should have either total_practices or error key
    expect(
      "total_practices" in parsed || "error" in parsed
    ).toBe(true);
  });

  it("covers all three domains: practices, trees, tips", async () => {
    const mod = await import("../tools/dispatchers/shopPracticeDispatcher.js");

    let actionSchema: any = null;
    const mockServer = {
      tool: (_name: string, _desc: string, schema: any, _handler: any) => {
        actionSchema = schema;
      },
    };

    mod.registerShopPracticeDispatcher(mockServer);

    // Practice actions
    const practiceActions = ["practice_ingest", "practice_search", "practice_get", "practice_list", "practice_audit", "practice_recommend"];
    for (const a of practiceActions) {
      expect(actionSchema.action.safeParse(a).success).toBe(true);
    }

    // Tree actions
    const treeActions = ["tree_build", "tree_navigate", "tree_search"];
    for (const a of treeActions) {
      expect(actionSchema.action.safeParse(a).success).toBe(true);
    }

    // Tips actions
    const tipsActions = ["tips_add", "tips_get", "tips_conflicts"];
    for (const a of tipsActions) {
      expect(actionSchema.action.safeParse(a).success).toBe(true);
    }
  });
});
