/**
 * LatheStudioPage.test.ts
 * LATHE-PROD-READY-MS0/U-LPR08
 *
 * Unit tests for LatheStudioPage and LatheStudioContext exports
 */

import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const WEB_SRC = path.resolve(__dirname, "../../web/src");

describe("LatheStudioPage — File Structure", () => {
  it("LatheStudioPage.tsx exists", () => {
    const pagePath = path.join(WEB_SRC, "pages/LatheStudioPage.tsx");
    expect(fs.existsSync(pagePath)).toBe(true);
  });

  it("LatheStudioContext.tsx exists", () => {
    const contextPath = path.join(WEB_SRC, "contexts/LatheStudioContext.tsx");
    expect(fs.existsSync(contextPath)).toBe(true);
  });

  it("route is registered in App.tsx", () => {
    const appPath = path.join(WEB_SRC, "App.tsx");
    const content = fs.readFileSync(appPath, "utf-8");
    expect(content).toContain("LatheStudioPage");
    expect(content).toContain("lathe-studio");
  });
});

describe("LatheStudioContext — Structure", () => {
  it("exports LatheStudioProvider", () => {
    const contextPath = path.join(WEB_SRC, "contexts/LatheStudioContext.tsx");
    const content = fs.readFileSync(contextPath, "utf-8");
    expect(content).toContain("export function LatheStudioProvider");
  });

  it("exports useLatheNavigation hook", () => {
    const contextPath = path.join(WEB_SRC, "contexts/LatheStudioContext.tsx");
    const content = fs.readFileSync(contextPath, "utf-8");
    expect(content).toContain("export function useLatheNavigation");
  });

  it("exports useLatheData hook", () => {
    const contextPath = path.join(WEB_SRC, "contexts/LatheStudioContext.tsx");
    const content = fs.readFileSync(contextPath, "utf-8");
    expect(content).toContain("export function useLatheData");
  });

  it("exports useLatheStatus hook", () => {
    const contextPath = path.join(WEB_SRC, "contexts/LatheStudioContext.tsx");
    const content = fs.readFileSync(contextPath, "utf-8");
    expect(content).toContain("export function useLatheStatus");
  });

  it("defines 6 wizard steps", () => {
    const contextPath = path.join(WEB_SRC, "contexts/LatheStudioContext.tsx");
    const content = fs.readFileSync(contextPath, "utf-8");
    expect(content).toContain('"import"');
    expect(content).toContain('"material"');
    expect(content).toContain('"operations"');
    expect(content).toContain('"tooling"');
    expect(content).toContain('"parameters"');
    expect(content).toContain('"program"');
  });
});

describe("LatheStudioPage — Structure", () => {
  it("uses LatheStudioProvider", () => {
    const pagePath = path.join(WEB_SRC, "pages/LatheStudioPage.tsx");
    const content = fs.readFileSync(pagePath, "utf-8");
    expect(content).toContain("LatheStudioProvider");
  });

  it("has StepImport component", () => {
    const pagePath = path.join(WEB_SRC, "pages/LatheStudioPage.tsx");
    const content = fs.readFileSync(pagePath, "utf-8");
    expect(content).toContain("StepImport");
  });

  it("has StepMaterial component", () => {
    const pagePath = path.join(WEB_SRC, "pages/LatheStudioPage.tsx");
    const content = fs.readFileSync(pagePath, "utf-8");
    expect(content).toContain("StepMaterial");
  });

  it("has StepOperations component", () => {
    const pagePath = path.join(WEB_SRC, "pages/LatheStudioPage.tsx");
    const content = fs.readFileSync(pagePath, "utf-8");
    expect(content).toContain("StepOperations");
  });

  it("has StepTooling component", () => {
    const pagePath = path.join(WEB_SRC, "pages/LatheStudioPage.tsx");
    const content = fs.readFileSync(pagePath, "utf-8");
    expect(content).toContain("StepTooling");
  });

  it("has StepParameters component", () => {
    const pagePath = path.join(WEB_SRC, "pages/LatheStudioPage.tsx");
    const content = fs.readFileSync(pagePath, "utf-8");
    expect(content).toContain("StepParameters");
  });

  it("has StepProgram component", () => {
    const pagePath = path.join(WEB_SRC, "pages/LatheStudioPage.tsx");
    const content = fs.readFileSync(pagePath, "utf-8");
    expect(content).toContain("StepProgram");
  });

  it("has AI Reasoning toggle", () => {
    const pagePath = path.join(WEB_SRC, "pages/LatheStudioPage.tsx");
    const content = fs.readFileSync(pagePath, "utf-8");
    expect(content).toContain("AI Reasoning");
  });

  it("includes JM Die materials (4140, D2, M2, etc.)", () => {
    const pagePath = path.join(WEB_SRC, "pages/LatheStudioPage.tsx");
    const content = fs.readFileSync(pagePath, "utf-8");
    expect(content).toContain("4140");
    expect(content).toContain("D2");
    expect(content).toContain("M2");
    expect(content).toContain("H13");
  });

  it("includes operation types (face, rough_od, finish_od, thread, groove, partoff)", () => {
    const pagePath = path.join(WEB_SRC, "pages/LatheStudioPage.tsx");
    const content = fs.readFileSync(pagePath, "utf-8");
    expect(content).toContain("face");
    expect(content).toContain("rough_od");
    expect(content).toContain("finish_od");
    expect(content).toContain("thread");
    expect(content).toContain("groove");
    expect(content).toContain("partoff");
  });

  it("generates G-code output", () => {
    const pagePath = path.join(WEB_SRC, "pages/LatheStudioPage.tsx");
    const content = fs.readFileSync(pagePath, "utf-8");
    expect(content).toContain("G21");
    expect(content).toContain("G96");
    expect(content).toContain("G71");
    expect(content).toContain("M30");
  });
});

describe("LatheStudioPage — Design Language", () => {
  it("uses PRISM dark theme classes", () => {
    const pagePath = path.join(WEB_SRC, "pages/LatheStudioPage.tsx");
    const content = fs.readFileSync(pagePath, "utf-8");
    expect(content).toContain("bg-slate-900");
    expect(content).toContain("border-slate-700");
  });

  it("uses cyan accent color for primary elements", () => {
    const pagePath = path.join(WEB_SRC, "pages/LatheStudioPage.tsx");
    const content = fs.readFileSync(pagePath, "utf-8");
    expect(content).toContain("text-cyan-400");
    expect(content).toContain("bg-cyan-600");
  });

  it("uses emerald for success/complete states", () => {
    const pagePath = path.join(WEB_SRC, "pages/LatheStudioPage.tsx");
    const content = fs.readFileSync(pagePath, "utf-8");
    expect(content).toContain("text-emerald-400");
    expect(content).toContain("bg-emerald-600");
  });
});
