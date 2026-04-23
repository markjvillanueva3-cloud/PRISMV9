import { describe, it, expect } from "vitest";
import {
  ErrorExplainerEngine,
  errorExplainerEngine,
} from "../engines/ErrorExplainerEngine.js";

describe("ErrorExplainerEngine", () => {
  it("singleton instantiated", () => {
    expect(errorExplainerEngine).toBeInstanceOf(ErrorExplainerEngine);
    expect(errorExplainerEngine.name).toBe("ErrorExplainerEngine");
  });

  it("module_not_found classified with build suggestion", () => {
    const e = new ErrorExplainerEngine();
    const out = e.explain({ source: "node", message: "Error: Cannot find module '../foo.js'" });
    expect(out.category).toBe("module_not_found");
    expect(out.unblockCommand).toContain("npm run build");
    expect(out.confidence).toBeGreaterThanOrEqual(0.8);
  });

  it("type_mismatch only triggers on tsc/build", () => {
    const e = new ErrorExplainerEngine();
    const tscOut = e.explain({ source: "tsc", message: "Argument of type 'string' is not assignable to parameter of type 'number'." });
    expect(tscOut.category).toBe("type_mismatch");
    const nodeOut = e.explain({ source: "node", message: "Argument of type 'string' is not assignable to parameter of type 'number'." });
    expect(nodeOut.category).toBe("unknown");
  });

  it("missing_property recognized", () => {
    const e = new ErrorExplainerEngine();
    const out = e.explain({ source: "tsc", message: "Property 'foo' does not exist on type 'Bar'." });
    expect(out.category).toBe("missing_property");
  });

  it("assertion_failed distinguished from timeout", () => {
    const e = new ErrorExplainerEngine();
    const assertion = e.explain({ source: "vitest", message: "AssertionError: expected 1 to equal 2" });
    const timeout = e.explain({ source: "vitest", message: "Error: test timed out after 5000ms" });
    expect(assertion.category).toBe("assertion_failed");
    expect(timeout.category).toBe("test_timeout");
  });

  it("enoent extracts the path", () => {
    const e = new ErrorExplainerEngine();
    const out = e.explain({ source: "node", message: "ENOENT: no such file or directory, open '/tmp/missing.txt'" });
    expect(out.category).toBe("enoent");
    expect(out.plainLanguage).toContain("/tmp/missing.txt");
  });

  it("syntax_error recognised", () => {
    const e = new ErrorExplainerEngine();
    const out = e.explain({ source: "node", message: "SyntaxError: Unexpected token ')'" });
    expect(out.category).toBe("syntax_error");
  });

  it("null_access recognised", () => {
    const e = new ErrorExplainerEngine();
    const out = e.explain({ source: "node", message: "TypeError: Cannot read properties of undefined (reading 'x')" });
    expect(out.category).toBe("null_access");
  });

  it("port_in_use extracts port number", () => {
    const e = new ErrorExplainerEngine();
    const out = e.explain({ source: "node", message: "Error: listen EADDRINUSE: address already in use :::3000" });
    expect(out.category).toBe("port_in_use");
    expect(out.unblockCommand).toContain("3000");
  });

  it("heap_oom suggests the project's build script", () => {
    const e = new ErrorExplainerEngine();
    const out = e.explain({ source: "build", message: "FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory" });
    expect(out.category).toBe("heap_oom");
    expect(out.unblockCommand).toContain("npm run build");
  });

  it("unknown pattern returns low-confidence generic advice", () => {
    const e = new ErrorExplainerEngine();
    const out = e.explain({ source: "other", message: "completely unrelated failure: gremlins" });
    expect(out.category).toBe("unknown");
    expect(out.confidence).toBeLessThan(0.5);
  });

  it("FAIL: empty input throws", () => {
    const e = new ErrorExplainerEngine();
    expect(() => e.explain(null as unknown as { source: "node"; message: string })).toThrow(/message required/);
  });

  it("FAIL: non-string message throws", () => {
    const e = new ErrorExplainerEngine();
    expect(() => e.explain({ source: "node", message: 42 as unknown as string })).toThrow(/message required/);
  });

  it("ADV: very long noisy message still classified", () => {
    const e = new ErrorExplainerEngine();
    const noise = "stacktrace line\n".repeat(500);
    const out = e.explain({ source: "node", message: noise + "ENOENT: 'x'" });
    expect(out.category).toBe("enoent");
  });

  it("categories() lists all known + unknown", () => {
    const cats = errorExplainerEngine.categories();
    expect(cats).toContain("module_not_found");
    expect(cats).toContain("unknown");
  });
});
