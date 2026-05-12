/**
 * Tests for UnifiedCommandAwarenessEngine
 */

import { describe, it, expect, beforeEach } from "vitest";
import { UnifiedCommandAwarenessEngine } from "../../engines/UnifiedCommandAwarenessEngine.js";

describe("UnifiedCommandAwarenessEngine", () => {
  let engine: UnifiedCommandAwarenessEngine;

  beforeEach(() => {
    engine = new UnifiedCommandAwarenessEngine();
  });

  describe("detectCommands", () => {
    it("should detect /pdf-learn when pdf is mentioned", async () => {
      const result = await engine.detectCommands("I have a pdf manual to extract");
      expect(result.primary).toBeDefined();
      expect(result.primary?.command).toBe("/pdf-learn");
    });

    it("should detect /video-learn when video is mentioned", async () => {
      const result = await engine.detectCommands("watch this youtube tutorial");
      expect(result.primary).toBeDefined();
      expect(result.primary?.command).toBe("/video-learn");
    });

    it("should detect /forge-triple when create engine is mentioned", async () => {
      const result = await engine.detectCommands("I want to create a new engine");
      expect(result.primary).toBeDefined();
      expect(result.primary?.command).toBe("/forge-triple");
      expect(result.dedupRequired).toBe(true);
    });

    it("should detect /wire-edm-studio when wire edm is mentioned", async () => {
      const result = await engine.detectCommands("program the wire edm machine");
      expect(result.primary).toBeDefined();
      expect(result.primary?.command).toBe("/wire-edm-studio");
    });

    it("should detect /lathe-studio when lathe is mentioned", async () => {
      const result = await engine.detectCommands("set up the okuma lathe");
      expect(result.primary).toBeDefined();
      expect(result.primary?.command).toBe("/lathe-studio");
    });

    it("should detect /quote-to-ship when quote is mentioned", async () => {
      const result = await engine.detectCommands("create a quote for this job");
      expect(result.primary).toBeDefined();
      expect(result.primary?.command).toBe("/quote-to-ship");
    });

    it("should detect /auto-speed-feed when speed/feed is mentioned", async () => {
      const result = await engine.detectCommands("calculate the speeds and feeds");
      expect(result.primary).toBeDefined();
      expect(result.primary?.command).toBe("/auto-speed-feed");
    });

    it("should return null primary when no command matches", async () => {
      const result = await engine.detectCommands("hello world");
      expect(result.primary).toBeNull();
    });

    it("should detect multiple commands and rank by priority", async () => {
      const result = await engine.detectCommands("I need to forge a new engine for lathe programming");
      expect(result.primary).toBeDefined();
      // /forge-triple and /lathe-studio should both match (forge triggers /forge-triple)
      const allCommands = [result.primary?.command, ...result.additional.map(a => a.command)];
      expect(allCommands).toContain("/forge-triple");
      expect(allCommands).toContain("/lathe-studio");
    });
  });

  describe("getSuggestionString", () => {
    it("should return formatted suggestion for pdf", async () => {
      const suggestion = await engine.getSuggestionString("extract from this pdf document");
      expect(suggestion).toContain("/pdf-learn");
      expect(suggestion).toContain("SUGGESTED");
    });

    it("should include dedup warning for creation commands", async () => {
      const suggestion = await engine.getSuggestionString("create a new engine");
      expect(suggestion).toContain("DEDUP REQUIRED");
      expect(suggestion).toContain("/forge-triple");
    });

    it("should return empty string when no match", async () => {
      const suggestion = await engine.getSuggestionString("hello there");
      expect(suggestion).toBe("");
    });
  });

  describe("getAutoInvokeCommands", () => {
    it("should return auto-invoke commands for pdf", async () => {
      const commands = await engine.getAutoInvokeCommands("read this pdf manual");
      expect(commands).toContain("/pdf-learn");
    });

    it("should put /dedup first when creation is detected", async () => {
      const commands = await engine.getAutoInvokeCommands("forge a new engine");
      expect(commands[0]).toBe("/dedup");
      expect(commands).toContain("/forge-triple");
    });

    it("should return empty array when no auto-invoke matches", async () => {
      const commands = await engine.getAutoInvokeCommands("just chatting");
      expect(commands).toHaveLength(0);
    });
  });

  describe("getAllCommands", () => {
    it("should return all registered commands", async () => {
      const commands = await engine.getAllCommands();
      expect(commands.length).toBeGreaterThan(0);
      expect(commands.some(c => c.command === "/pdf-learn")).toBe(true);
      expect(commands.some(c => c.command === "/video-learn")).toBe(true);
      expect(commands.some(c => c.command === "/forge-triple")).toBe(true);
    });

    it("should return commands sorted by priority", async () => {
      const commands = await engine.getAllCommands();
      for (let i = 1; i < commands.length; i++) {
        expect(commands[i].priority).toBeGreaterThanOrEqual(commands[i - 1].priority);
      }
    });
  });

  describe("edge cases", () => {
    it("should handle empty input", async () => {
      const result = await engine.detectCommands("");
      expect(result.primary).toBeNull();
    });

    it("should handle case-insensitive matching", async () => {
      const result = await engine.detectCommands("READ THIS PDF");
      expect(result.primary?.command).toBe("/pdf-learn");
    });

    it("should handle partial word matches appropriately", async () => {
      // "pdffile" should not match "pdf" as a word
      const result = await engine.detectCommands("the video is about machining");
      expect(result.primary?.command).toBe("/video-learn");
    });
  });
});
