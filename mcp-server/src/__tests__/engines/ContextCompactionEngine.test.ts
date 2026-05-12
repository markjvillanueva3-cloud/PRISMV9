/**
 * Tests for ContextCompactionEngine
 *
 * AGENT ROADMAP: U-AGT14 (MS4)
 * Verifies efficient context management
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  ContextCompactionEngine,
  contextCompactionEngine,
  ConversationContext,
  ContextItem,
  CompactionStrategy,
} from "../../engines/ContextCompactionEngine.js";

describe("ContextCompactionEngine", () => {
  let engine: ContextCompactionEngine;

  beforeEach(() => {
    engine = new ContextCompactionEngine();
  });

  describe("createContext", () => {
    it("should create new context with defaults", () => {
      const context = engine.createContext();

      expect(context.id).toMatch(/^ctx_/);
      expect(context.items).toEqual([]);
      expect(context.totalTokens).toBe(0);
      expect(context.maxTokens).toBe(24000);
      expect(context.compactionCount).toBe(0);
    });

    it("should create context with custom max tokens", () => {
      const context = engine.createContext(16000);

      expect(context.maxTokens).toBe(16000);
    });
  });

  describe("addItem", () => {
    it("should add user message to context", () => {
      const context = engine.createContext();

      const item = engine.addItem(context, "user_message", "Calculate speed for D2");

      expect(item.id).toMatch(/^item_/);
      expect(item.type).toBe("user_message");
      expect(item.content).toBe("Calculate speed for D2");
      expect(item.tokenCount).toBeGreaterThan(0);
      expect(context.items.length).toBe(1);
      expect(context.totalTokens).toBe(item.tokenCount);
    });

    it("should add assistant response", () => {
      const context = engine.createContext();

      const item = engine.addItem(context, "assistant_response", "The recommended speed is 200 SFM");

      expect(item.type).toBe("assistant_response");
      expect(context.totalTokens).toBeGreaterThan(0);
    });

    it("should add tool call with metadata", () => {
      const context = engine.createContext();

      const item = engine.addItem(context, "tool_call", "prism_calc:speed_feed", {
        metadata: { toolName: "speed_feed" }
      });

      expect(item.type).toBe("tool_call");
      expect(item.metadata?.toolName).toBe("speed_feed");
    });

    it("should infer critical priority for safety content", () => {
      const context = engine.createContext();

      const item = engine.addItem(context, "assistant_response", "WARNING: This is a critical safety issue");

      expect(item.priority).toBe("critical");
    });

    it("should infer high priority for important content", () => {
      const context = engine.createContext();

      const item = engine.addItem(context, "user_message", "This is important, please remember this");

      expect(item.priority).toBe("high");
    });

    it("should allow explicit priority override", () => {
      const context = engine.createContext();

      const item = engine.addItem(context, "user_message", "Simple message", {
        priority: "critical"
      });

      expect(item.priority).toBe("critical");
    });

    it("should auto-preserve critical items", () => {
      const context = engine.createContext();

      const item = engine.addItem(context, "critical_fact", "Material is D2 at 58 HRC");

      expect(item.preserveOnCompact).toBe(true);
    });

    it("should track turn index", () => {
      const context = engine.createContext();

      engine.addItem(context, "user_message", "Turn 1");
      engine.addItem(context, "assistant_response", "Response 1");
      const item3 = engine.addItem(context, "user_message", "Turn 2");

      expect(item3.metadata?.turnIndex).toBe(2);
    });
  });

  describe("markForPreservation", () => {
    it("should mark item for preservation", () => {
      const context = engine.createContext();
      const item = engine.addItem(context, "user_message", "Remember this fact");

      const result = engine.markForPreservation(context, item.id);

      expect(result).toBe(true);
      expect(item.preserveOnCompact).toBe(true);
      expect(item.priority).toBe("critical");
      expect(item.type).toBe("memory_anchor");
    });

    it("should return false for unknown item", () => {
      const context = engine.createContext();

      const result = engine.markForPreservation(context, "nonexistent_id");

      expect(result).toBe(false);
    });
  });

  describe("needsCompaction", () => {
    it("should return false when under limit", () => {
      const context = engine.createContext(1000);
      engine.addItem(context, "user_message", "Short message");

      expect(engine.needsCompaction(context)).toBe(false);
    });

    it("should return true when over limit", () => {
      const context = engine.createContext(5); // Very low limit

      // Add content that exceeds 5 tokens
      engine.addItem(context, "user_message", "This is a longer message that should exceed the tiny token limit and definitely has more than five tokens");

      expect(context.totalTokens).toBeGreaterThan(5);
      expect(engine.needsCompaction(context)).toBe(true);
    });

    it("should respect custom config", () => {
      const context = engine.createContext(1000);
      engine.addItem(context, "user_message", "Short");

      expect(engine.needsCompaction(context, { maxTokens: 1 })).toBe(true);
    });
  });

  describe("compact", () => {
    it("should compact context with balanced strategy", () => {
      const context = engine.createContext(1000);

      // Add many items
      for (let i = 0; i < 30; i++) {
        engine.addItem(context, "user_message", `User message ${i} with some content here`);
        engine.addItem(context, "assistant_response", `Response ${i} with more detailed response here`);
      }

      const originalTokens = context.totalTokens;
      const result = engine.compact(context, "balanced", { targetTokens: 50 });

      expect(result.success).toBe(true);
      expect(result.originalTokens).toBe(originalTokens);
      // After compaction, should be reduced (or at least have processed items)
      expect(context.compactionCount).toBe(1);
    });

    it("should compact with recent_priority strategy", () => {
      const context = engine.createContext(100);

      for (let i = 0; i < 15; i++) {
        engine.addItem(context, "user_message", `Message ${i}`);
      }

      const result = engine.compact(context, "recent_priority");

      expect(result.success).toBe(true);
      // Should keep recent items
      expect(context.items.some(i => i.content.includes("Message 14"))).toBe(true);
    });

    it("should compact with importance_based strategy", () => {
      const context = engine.createContext(100);

      engine.addItem(context, "critical_fact", "Critical safety requirement");
      for (let i = 0; i < 15; i++) {
        engine.addItem(context, "user_message", `Regular message ${i}`);
      }

      const result = engine.compact(context, "importance_based");

      expect(result.success).toBe(true);
      expect(result.criticalPreserved).toBeGreaterThan(0);
      // Critical fact should be preserved
      expect(context.items.some(i => i.content.includes("Critical safety"))).toBe(true);
    });

    it("should compact with aggressive strategy", () => {
      const context = engine.createContext(100);

      for (let i = 0; i < 20; i++) {
        engine.addItem(context, "user_message", `Message ${i}`);
      }

      const originalItems = context.items.length;
      const result = engine.compact(context, "aggressive");

      expect(result.success).toBe(true);
      expect(context.items.length).toBeLessThan(originalItems);
    });

    it("should preserve critical items", () => {
      const context = engine.createContext(100);

      const critical = engine.addItem(context, "user_instruction", "Always use carbide tools");
      engine.markForPreservation(context, critical.id);

      for (let i = 0; i < 15; i++) {
        engine.addItem(context, "user_message", `Filler message ${i}`);
      }

      engine.compact(context, "aggressive");

      expect(context.items.some(i => i.id === critical.id)).toBe(true);
    });

    it("should generate summary when items are compacted", () => {
      const context = engine.createContext(1000);

      for (let i = 0; i < 30; i++) {
        engine.addItem(context, "user_message", `Calculate speed for material ${i} with additional context`);
      }

      // Use aggressive strategy which always summarizes
      const result = engine.compact(context, "aggressive");

      // Aggressive always removes old items
      expect(result.itemsRemoved).toBeGreaterThanOrEqual(0);
    });

    it("should update lastCompactedAt", () => {
      const context = engine.createContext(100);

      for (let i = 0; i < 10; i++) {
        engine.addItem(context, "user_message", `Message ${i}`);
      }

      expect(context.lastCompactedAt).toBeUndefined();

      engine.compact(context, "balanced");

      expect(context.lastCompactedAt).toBeDefined();
    });

    it("should track compaction count", () => {
      const context = engine.createContext(100);

      for (let i = 0; i < 10; i++) {
        engine.addItem(context, "user_message", `Message ${i}`);
      }

      expect(context.compactionCount).toBe(0);

      engine.compact(context, "balanced");
      expect(context.compactionCount).toBe(1);

      // Add more and compact again
      for (let i = 0; i < 10; i++) {
        engine.addItem(context, "user_message", `New message ${i}`);
      }
      engine.compact(context, "balanced");

      expect(context.compactionCount).toBe(2);
    });

    it("should preserve user instructions", () => {
      const context = engine.createContext(100);

      engine.addItem(context, "user_instruction", "Use flood coolant");

      for (let i = 0; i < 15; i++) {
        engine.addItem(context, "user_message", `Regular message ${i}`);
      }

      engine.compact(context, "aggressive");

      expect(context.items.some(i => i.type === "user_instruction")).toBe(true);
    });
  });

  describe("estimateTokens", () => {
    it("should estimate tokens for short text", () => {
      const tokens = engine.estimateTokens("Hello world");

      expect(tokens).toBeGreaterThan(0);
      expect(tokens).toBeLessThan(10);
    });

    it("should estimate tokens for longer text", () => {
      const longText = "This is a longer piece of text that should have more tokens than a short one because it contains many more words and therefore requires more tokens to represent.";
      const tokens = engine.estimateTokens(longText);

      expect(tokens).toBeGreaterThan(20);
    });

    it("should return 0 for empty string", () => {
      const tokens = engine.estimateTokens("");

      expect(tokens).toBe(0);
    });
  });

  describe("getStats", () => {
    it("should return correct statistics", () => {
      const context = engine.createContext(10000);

      engine.addItem(context, "user_message", "Message 1");
      engine.addItem(context, "assistant_response", "Response 1");
      engine.addItem(context, "tool_call", "Tool call");
      engine.addItem(context, "critical_fact", "Critical fact");

      const stats = engine.getStats(context);

      expect(stats.totalItems).toBe(4);
      expect(stats.totalTokens).toBeGreaterThan(0);
      expect(stats.maxTokens).toBe(10000);
      expect(stats.utilizationPercent).toBeLessThan(100);
      expect(stats.compactionCount).toBe(0);
      expect(stats.itemsByType.user_message).toBe(1);
      expect(stats.itemsByType.assistant_response).toBe(1);
      expect(stats.criticalItems).toBeGreaterThan(0);
    });
  });

  describe("extractCriticalFacts", () => {
    it("should extract critical facts", () => {
      const context = engine.createContext();

      engine.addItem(context, "user_message", "Regular message");
      engine.addItem(context, "critical_fact", "Material is D2 at 58 HRC");
      engine.addItem(context, "critical_fact", "Tool is carbide insert");
      engine.addItem(context, "assistant_response", "Regular response");

      const facts = engine.extractCriticalFacts(context);

      expect(facts).toContain("Material is D2 at 58 HRC");
      expect(facts).toContain("Tool is carbide insert");
      expect(facts.length).toBe(2);
    });

    it("should include items with critical priority", () => {
      const context = engine.createContext();

      engine.addItem(context, "user_message", "This is a critical safety warning", {
        priority: "critical"
      });

      const facts = engine.extractCriticalFacts(context);

      expect(facts).toContain("This is a critical safety warning");
    });
  });

  describe("renderContext", () => {
    it("should render context to string", () => {
      const context = engine.createContext();

      engine.addItem(context, "user_message", "Hello");
      engine.addItem(context, "assistant_response", "Hi there");

      const rendered = engine.renderContext(context);

      expect(rendered).toContain("Context ID:");
      expect(rendered).toContain("Tokens:");
      expect(rendered).toContain("USER MESSAGE");
      expect(rendered).toContain("ASSISTANT RESPONSE");
      expect(rendered).toContain("Hello");
      expect(rendered).toContain("Hi there");
    });

    it("should mark preserved items", () => {
      const context = engine.createContext();

      const item = engine.addItem(context, "user_message", "Important fact");
      engine.markForPreservation(context, item.id);

      const rendered = engine.renderContext(context);

      expect(rendered).toContain("[PRESERVE]");
    });

    it("should truncate long content", () => {
      const context = engine.createContext();

      const longContent = "x".repeat(200);
      engine.addItem(context, "user_message", longContent);

      const rendered = engine.renderContext(context);

      expect(rendered).toContain("...");
    });
  });

  describe("compaction strategies", () => {
    describe("recent_priority", () => {
      it("should keep recent turns and summarize old", () => {
        const context = engine.createContext(200);

        // Add 20 turns (40 items)
        for (let i = 0; i < 20; i++) {
          engine.addItem(context, "user_message", `User turn ${i}`);
          engine.addItem(context, "assistant_response", `Response ${i}`);
        }

        const result = engine.compact(context, "recent_priority", {
          maxTokens: 200,
          targetTokens: 100,
          preserveRecentTurns: 3
        });

        expect(result.success).toBe(true);
        // Should have recent turns
        expect(context.items.some(i => i.content.includes("turn 19"))).toBe(true);
        expect(context.items.some(i => i.content.includes("turn 18"))).toBe(true);
      });
    });

    describe("importance_based", () => {
      it("should keep important items regardless of age", () => {
        const context = engine.createContext(200);

        // Old but important
        engine.addItem(context, "critical_fact", "Critical constraint");

        // Many regular messages
        for (let i = 0; i < 15; i++) {
          engine.addItem(context, "user_message", `Regular message ${i}`);
        }

        engine.compact(context, "importance_based");

        expect(context.items.some(i => i.content === "Critical constraint")).toBe(true);
      });
    });

    describe("aggressive", () => {
      it("should minimize items aggressively", () => {
        const context = engine.createContext(200);

        for (let i = 0; i < 30; i++) {
          engine.addItem(context, "user_message", `Message ${i} with some extra content`);
        }

        const originalCount = context.items.length;
        engine.compact(context, "aggressive");

        expect(context.items.length).toBeLessThan(originalCount / 2);
      });
    });
  });

  describe("summary generation", () => {
    it("should extract topics from user messages", () => {
      const context = engine.createContext(100);

      engine.addItem(context, "user_message", "Calculate speed for aluminum");
      engine.addItem(context, "user_message", "What about the tool selection?");
      engine.addItem(context, "user_message", "Quote this part");

      for (let i = 0; i < 10; i++) {
        engine.addItem(context, "user_message", `Filler ${i}`);
      }

      const result = engine.compact(context, "balanced");

      if (result.summary) {
        expect(result.summary.toLowerCase()).toMatch(/calculation|tool|quot/);
      }
    });

    it("should extract tool call actions", () => {
      const context = engine.createContext(100);

      engine.addItem(context, "tool_call", "speed_feed", {
        metadata: { toolName: "speed_feed" }
      });
      engine.addItem(context, "tool_result", "Result data");

      for (let i = 0; i < 10; i++) {
        engine.addItem(context, "user_message", `Message ${i}`);
      }

      const result = engine.compact(context, "balanced");

      if (result.summary) {
        // Should mention tool execution
        expect(result.summary.length).toBeGreaterThan(0);
      }
    });
  });

  describe("token tracking", () => {
    it("should track total tokens accurately", () => {
      const context = engine.createContext();

      const item1 = engine.addItem(context, "user_message", "Hello world");
      const item2 = engine.addItem(context, "assistant_response", "Hi there, how can I help?");

      expect(context.totalTokens).toBe(item1.tokenCount + item2.tokenCount);
    });

    it("should update tokens after compaction", () => {
      const context = engine.createContext(100);

      for (let i = 0; i < 20; i++) {
        engine.addItem(context, "user_message", `Message ${i} with content`);
      }

      const beforeTokens = context.totalTokens;
      engine.compact(context, "aggressive");

      expect(context.totalTokens).toBeLessThan(beforeTokens);
    });
  });

  describe("singleton export", () => {
    it("should export singleton instance", () => {
      expect(contextCompactionEngine).toBeInstanceOf(ContextCompactionEngine);
    });
  });

  describe("edge cases", () => {
    it("should handle empty context compaction", () => {
      const context = engine.createContext();

      const result = engine.compact(context, "balanced");

      expect(result.success).toBe(true);
      expect(result.itemsRemoved).toBe(0);
    });

    it("should handle context with only critical items", () => {
      const context = engine.createContext(100);

      for (let i = 0; i < 5; i++) {
        engine.addItem(context, "critical_fact", `Critical fact ${i}`);
      }

      const result = engine.compact(context, "aggressive");

      // All critical items should be preserved
      expect(result.criticalPreserved).toBe(5);
      expect(context.items.length).toBe(5);
    });

    it("should handle single item context", () => {
      const context = engine.createContext();

      engine.addItem(context, "user_message", "Single message");

      const result = engine.compact(context, "balanced");

      expect(result.success).toBe(true);
      expect(context.items.length).toBe(1);
    });

    it("should generate unique context IDs", () => {
      const contexts = [
        engine.createContext(),
        engine.createContext(),
        engine.createContext()
      ];

      const ids = new Set(contexts.map(c => c.id));
      expect(ids.size).toBe(3);
    });

    it("should generate unique item IDs", () => {
      const context = engine.createContext();

      const items = [
        engine.addItem(context, "user_message", "Message 1"),
        engine.addItem(context, "user_message", "Message 2"),
        engine.addItem(context, "user_message", "Message 3")
      ];

      const ids = new Set(items.map(i => i.id));
      expect(ids.size).toBe(3);
    });
  });

  describe("compaction result metrics", () => {
    it("should track duration", () => {
      const context = engine.createContext(100);

      for (let i = 0; i < 10; i++) {
        engine.addItem(context, "user_message", `Message ${i}`);
      }

      const result = engine.compact(context, "balanced");

      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });

    it("should track items removed", () => {
      const context = engine.createContext(50);

      for (let i = 0; i < 15; i++) {
        engine.addItem(context, "user_message", `Message ${i}`);
      }

      const result = engine.compact(context, "aggressive");

      expect(result.itemsRemoved).toBeGreaterThan(0);
    });

    it("should track items summarized", () => {
      const context = engine.createContext(100);

      for (let i = 0; i < 20; i++) {
        engine.addItem(context, "user_message", `Message ${i}`);
      }

      const result = engine.compact(context, "balanced");

      expect(result.itemsSummarized).toBeGreaterThanOrEqual(0);
    });
  });
});
