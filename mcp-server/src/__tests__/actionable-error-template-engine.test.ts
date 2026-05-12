/**
 * Tests for ActionableErrorTemplateEngine (Phase 0.25.6 U-UX2)
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  ActionableErrorTemplateEngine,
  actionableErrorTemplateEngine,
} from "../engines/ActionableErrorTemplateEngine.js";

describe("ActionableErrorTemplateEngine", () => {
  let e: ActionableErrorTemplateEngine;

  beforeEach(() => {
    e = new ActionableErrorTemplateEngine();
  });

  describe("register()", () => {
    it("rejects missing fields", () => {
      expect(() => e.register({ code: "", headline: "h", tryInstead: "t" })).toThrow(/code/);
      expect(() => e.register({ code: "x", headline: "", tryInstead: "t" })).toThrow(/headline/);
      expect(() => e.register({ code: "x", headline: "h", tryInstead: "" })).toThrow(/tryInstead/);
    });

    it("stores by code", () => {
      e.register({ code: "DEDUP", headline: "Duplicate detected", tryInstead: "run /dedup" });
      expect(e.has("DEDUP")).toBe(true);
    });

    it("registerAll stores multiple", () => {
      e.registerAll([
        { code: "A", headline: "a", tryInstead: "do" },
        { code: "B", headline: "b", tryInstead: "do" },
      ]);
      expect(e.size()).toBe(2);
    });
  });

  describe("render() — unknown code", () => {
    it("returns a fallback result with hasTemplate=false", () => {
      const r = e.render("UNKNOWN");
      expect(r.hasTemplate).toBe(false);
      expect(r.message).toContain("UNKNOWN");
    });
  });

  describe("render() — variable substitution", () => {
    beforeEach(() => {
      e.register({
        code: "MAT_NOT_FOUND",
        headline: "Material '{name}' not in registry",
        tryInstead: "Search with /material-lookup {name}",
        suggestedCommand: "/material-lookup {name}",
      });
    });

    it("substitutes registered variables", () => {
      const r = e.render("MAT_NOT_FOUND", { name: "D2" });
      expect(r.headline).toBe("Material 'D2' not in registry");
      expect(r.tryInstead).toContain("D2");
      expect(r.suggestedCommand).toBe("/material-lookup D2");
    });

    it("reports which variables were actually used", () => {
      const r = e.render("MAT_NOT_FOUND", { name: "A2", unused: "junk" });
      expect(r.variablesUsed.sort()).toEqual(["name"]);
    });

    it("leaves unknown placeholders in place", () => {
      const r = e.render("MAT_NOT_FOUND", {});
      expect(r.headline).toContain("{name}");
    });

    it("number values are stringified", () => {
      e.register({
        code: "TOOL_OVER",
        headline: "Tool #{tool} exceeds {mrr_limit}",
        tryInstead: "Reduce MRR below {mrr_limit}",
      });
      const r = e.render("TOOL_OVER", { tool: 12, mrr_limit: 45.5 });
      expect(r.headline).toBe("Tool #12 exceeds 45.5");
    });
  });

  describe("render() — message shape", () => {
    it("includes code, headline, tryInstead and optional extras", () => {
      e.register({
        code: "DEDUP",
        headline: "Duplicate engine detected",
        tryInstead: "Run /dedup then reuse the match",
        suggestedCommand: "/dedup",
        docsUrl: "https://example.com/dedup",
      });
      const r = e.render("DEDUP");
      expect(r.message).toMatch(/\[DEDUP\]/);
      expect(r.message).toMatch(/Try instead/);
      expect(r.message).toMatch(/Suggested command/);
      expect(r.message).toMatch(/Docs:/);
    });

    it("omits optional lines when docs/command not provided", () => {
      e.register({ code: "NO_OPT", headline: "h", tryInstead: "do" });
      const r = e.render("NO_OPT");
      expect(r.message).not.toMatch(/Suggested command/);
      expect(r.message).not.toMatch(/Docs:/);
    });
  });

  describe("listing + lifecycle", () => {
    it("listCodes returns sorted codes", () => {
      e.registerAll([
        { code: "B", headline: "b", tryInstead: "do" },
        { code: "A", headline: "a", tryInstead: "do" },
      ]);
      expect(e.listCodes()).toEqual(["A", "B"]);
    });

    it("clear empties the registry", () => {
      e.register({ code: "X", headline: "h", tryInstead: "t" });
      e.clear();
      expect(e.size()).toBe(0);
    });
  });

  describe("module singleton", () => {
    it("exports a ready-to-use instance", () => {
      actionableErrorTemplateEngine.clear();
      actionableErrorTemplateEngine.register({ code: "S", headline: "h", tryInstead: "t" });
      expect(actionableErrorTemplateEngine.has("S")).toBe(true);
      actionableErrorTemplateEngine.clear();
    });
  });
});
