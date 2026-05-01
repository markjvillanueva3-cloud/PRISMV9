/**
 * CADFailureTriageEngine Tests
 * =============================
 * Tests for CAD regression failure classification into 6 root-cause categories.
 *
 * @milestone CAD-UNIVERSAL-CONTROL-MS0 U-CUC63
 */
import { describe, it, expect } from "vitest";
import {
  cadFailureTriageEngine,
  CADFailureTriageEngine,
  type FailurePayload,
  type TriageResult,
  type TriageGroup,
} from "../engines/CADFailureTriageEngine.js";

describe("CADFailureTriageEngine", () => {
  describe("getCapabilities", () => {
    it("returns triage and group capabilities", () => {
      const caps = cadFailureTriageEngine.getCapabilities();
      expect(caps.length).toBe(2);
      expect(caps[0].name).toBe("triage");
      expect(caps[1].name).toBe("group");
    });

    it("triage capability has cad_failure_triage_one action", () => {
      const caps = cadFailureTriageEngine.getCapabilities();
      const triageCap = caps.find(c => c.name === "triage")!;
      expect(triageCap.actions).toContain("cad_failure_triage_one");
    });

    it("group capability has cad_failure_triage_group action", () => {
      const caps = cadFailureTriageEngine.getCapabilities();
      const groupCap = caps.find(c => c.name === "group")!;
      expect(groupCap.actions).toContain("cad_failure_triage_group");
    });
  });

  describe("validate", () => {
    it("returns null for valid input with failure", () => {
      const result = cadFailureTriageEngine.validate({
        failure: { fileId: "test.sldprt", message: "error" },
      });
      expect(result).toBeNull();
    });

    it("returns null for valid input with failures array", () => {
      const result = cadFailureTriageEngine.validate({
        failures: [{ fileId: "test.sldprt", message: "error" }],
      });
      expect(result).toBeNull();
    });

    it("returns error for null input", () => {
      const result = cadFailureTriageEngine.validate(null);
      expect(result).toBe("input must be an object");
    });

    it("returns error for missing failure or failures", () => {
      const result = cadFailureTriageEngine.validate({});
      expect(result).toBe("input must contain `failure` or `failures`");
    });
  });

  describe("triage — timeout classification", () => {
    it("classifies aborted=true as timeout with 0.99 confidence", () => {
      const payload: FailurePayload = {
        fileId: "part1.sldprt",
        message: "Operation cancelled",
        aborted: true,
      };
      const result = cadFailureTriageEngine.triage(payload);
      expect(result.errorType).toBe("timeout");
      expect(result.confidence).toBe(0.99);
      expect(result.rootCauseLabel).toBe("abort-signal-fired");
    });

    it("classifies AbortError message as timeout", () => {
      const payload: FailurePayload = {
        fileId: "part2.sldprt",
        message: "AbortError: The operation was aborted",
      };
      const result = cadFailureTriageEngine.triage(payload);
      expect(result.errorType).toBe("timeout");
      expect(result.confidence).toBe(0.99);
    });

    it("classifies ETIMEDOUT as timeout with 0.95 confidence", () => {
      const payload: FailurePayload = {
        fileId: "part3.sldprt",
        message: "ETIMEDOUT: connection timed out",
      };
      const result = cadFailureTriageEngine.triage(payload);
      expect(result.errorType).toBe("timeout");
      expect(result.confidence).toBe(0.95);
    });

    it("classifies deadline exceeded as timeout", () => {
      const payload: FailurePayload = {
        fileId: "part4.sldprt",
        message: "deadline exceeded after 60s",
      };
      const result = cadFailureTriageEngine.triage(payload);
      expect(result.errorType).toBe("timeout");
    });
  });

  describe("triage — format classification", () => {
    it("classifies fileUnreadable=true as format with 0.98 confidence", () => {
      const payload: FailurePayload = {
        fileId: "missing.sldprt",
        message: "Could not read file",
        fileUnreadable: true,
      };
      const result = cadFailureTriageEngine.triage(payload);
      expect(result.errorType).toBe("format");
      expect(result.confidence).toBe(0.98);
      expect(result.rootCauseLabel).toBe("file-unreadable");
    });

    it("classifies ENOENT as format/file-missing", () => {
      const payload: FailurePayload = {
        fileId: "gone.sldprt",
        message: "ENOENT: no such file or directory",
      };
      const result = cadFailureTriageEngine.triage(payload);
      expect(result.errorType).toBe("format");
      expect(result.rootCauseLabel).toBe("file-missing");
      expect(result.confidence).toBe(0.95);
    });

    it("classifies EACCES as format/permission-denied", () => {
      const payload: FailurePayload = {
        fileId: "locked.sldprt",
        message: "EACCES: permission denied",
      };
      const result = cadFailureTriageEngine.triage(payload);
      expect(result.errorType).toBe("format");
      expect(result.rootCauseLabel).toBe("permission-denied");
    });

    it("classifies unsupported format message", () => {
      const payload: FailurePayload = {
        fileId: "weird.xyz",
        message: "unsupported format: .xyz",
      };
      const result = cadFailureTriageEngine.triage(payload);
      expect(result.errorType).toBe("format");
      expect(result.rootCauseLabel).toBe("unsupported-format");
    });

    it("classifies zero-length file as format/empty-file", () => {
      const payload: FailurePayload = {
        fileId: "empty.sldprt",
        message: "zero-length file cannot be processed",
      };
      const result = cadFailureTriageEngine.triage(payload);
      expect(result.errorType).toBe("format");
      expect(result.rootCauseLabel).toBe("empty-file");
    });
  });

  describe("triage — crash classification", () => {
    it("classifies OOM as crash with 0.97 confidence", () => {
      const payload: FailurePayload = {
        fileId: "huge.sldprt",
        message: "FATAL ERROR: CALL_AND_RETRY_LAST Allocation failed - JavaScript heap out of memory",
      };
      const result = cadFailureTriageEngine.triage(payload);
      expect(result.errorType).toBe("crash");
      expect(result.confidence).toBe(0.97);
      expect(result.rootCauseLabel).toBe("oom");
    });

    it("classifies SIGSEGV as crash/segfault", () => {
      const payload: FailurePayload = {
        fileId: "crashy.sldprt",
        message: "Segmentation fault (core dumped)",
      };
      const result = cadFailureTriageEngine.triage(payload);
      expect(result.errorType).toBe("crash");
      expect(result.rootCauseLabel).toBe("segfault");
      expect(result.confidence).toBe(0.96);
    });

    it("classifies EPIPE as crash/ipc-crash", () => {
      const payload: FailurePayload = {
        fileId: "broken.sldprt",
        message: "EPIPE: broken pipe to worker",
      };
      const result = cadFailureTriageEngine.triage(payload);
      expect(result.errorType).toBe("crash");
      expect(result.rootCauseLabel).toBe("ipc-crash");
    });

    it("classifies access violation as crash", () => {
      const payload: FailurePayload = {
        fileId: "native.sldprt",
        message: "EXCEPTION_ACCESS_VIOLATION reading address",
      };
      const result = cadFailureTriageEngine.triage(payload);
      expect(result.errorType).toBe("crash");
      expect(result.rootCauseLabel).toBe("segfault");
    });
  });

  describe("triage — parse classification", () => {
    it("classifies SyntaxError as parse", () => {
      const payload: FailurePayload = {
        fileId: "bad.json",
        message: "SyntaxError: Unexpected token < in JSON at position 0",
      };
      const result = cadFailureTriageEngine.triage(payload);
      expect(result.errorType).toBe("parse");
      expect(result.rootCauseLabel).toBe("parse-syntax");
    });

    it("classifies corrupt file as parse", () => {
      const payload: FailurePayload = {
        fileId: "damaged.sldprt",
        message: "File appears corrupt: CRC error in header",
      };
      const result = cadFailureTriageEngine.triage(payload);
      expect(result.errorType).toBe("parse");
      expect(result.rootCauseLabel).toBe("corrupt-file");
    });

    it("classifies OCCT reader failure as parse", () => {
      const payload: FailurePayload = {
        fileId: "complex.step",
        message: "OCCT STEP reader failed",
        stack: "at OCCT_STEP_Reader.parse()",
      };
      const result = cadFailureTriageEngine.triage(payload);
      expect(result.errorType).toBe("parse");
      expect(result.rootCauseLabel).toContain("kernel-reader-failure");
    });

    it("classifies malformed message as parse", () => {
      const payload: FailurePayload = {
        fileId: "weird.iges",
        message: "malformed IGES entity at line 1234",
      };
      const result = cadFailureTriageEngine.triage(payload);
      expect(result.errorType).toBe("parse");
    });
  });

  describe("triage — generation classification", () => {
    it("classifies toolpath error as generation", () => {
      const payload: FailurePayload = {
        fileId: "part.sldprt",
        message: "toolpath generation failed: no valid cutting geometry",
      };
      const result = cadFailureTriageEngine.triage(payload);
      expect(result.errorType).toBe("generation");
      expect(result.rootCauseLabel).toBe("cam-generation");
    });

    it("classifies post-processor error as generation", () => {
      const payload: FailurePayload = {
        fileId: "part.sldprt",
        message: "post-processor failed to generate G-code",
      };
      const result = cadFailureTriageEngine.triage(payload);
      expect(result.errorType).toBe("generation");
    });

    it("classifies export failure as generation", () => {
      const payload: FailurePayload = {
        fileId: "assembly.sldasm",
        message: "STEP export failed: unsupported entity",
      };
      const result = cadFailureTriageEngine.triage(payload);
      expect(result.errorType).toBe("generation");
      expect(result.rootCauseLabel).toBe("export-failure");
    });
  });

  describe("triage — comparison classification", () => {
    it("classifies tolerance exceeded as comparison", () => {
      const payload: FailurePayload = {
        fileId: "part.step",
        message: "tolerance exceeded: diff = 0.05mm, threshold = 0.01mm",
      };
      const result = cadFailureTriageEngine.triage(payload);
      expect(result.errorType).toBe("comparison");
      expect(result.rootCauseLabel).toBe("tolerance-exceeded");
      expect(result.confidence).toBe(0.9);
    });

    it("classifies dimension mismatch as comparison", () => {
      const payload: FailurePayload = {
        fileId: "part.step",
        message: "bounding box differs: expected [10,20,30], got [10,20,31]",
      };
      const result = cadFailureTriageEngine.triage(payload);
      expect(result.errorType).toBe("comparison");
      expect(result.rootCauseLabel).toBe("dimension-mismatch");
    });

    it("classifies pixel diff as comparison", () => {
      const payload: FailurePayload = {
        fileId: "render.png",
        message: "pixel diff exceeded 5% threshold",
      };
      const result = cadFailureTriageEngine.triage(payload);
      expect(result.errorType).toBe("comparison");
    });
  });

  describe("triage — hint override", () => {
    it("respects explicit hint from runner", () => {
      const payload: FailurePayload = {
        fileId: "special.sldprt",
        message: "Something went wrong",
        hint: "generation",
      };
      const result = cadFailureTriageEngine.triage(payload);
      expect(result.errorType).toBe("generation");
      expect(result.confidence).toBe(0.99);
      expect(result.rootCauseLabel).toBe("runner-hint");
    });
  });

  describe("triage — fallback behavior", () => {
    it("classifies unrecognized error with stack as crash with 0.5 confidence", () => {
      const payload: FailurePayload = {
        fileId: "mystery.sldprt",
        message: "Something completely unexpected happened",
        stack: "at someFunction(file.js:10:20)",
      };
      const result = cadFailureTriageEngine.triage(payload);
      expect(result.errorType).toBe("crash");
      expect(result.confidence).toBe(0.5);
      expect(result.rootCauseLabel).toContain("unclassified-exception");
    });

    it("classifies unrecognized error without stack as crash with 0.3 confidence", () => {
      const payload: FailurePayload = {
        fileId: "mystery.sldprt",
        message: "???",
      };
      const result = cadFailureTriageEngine.triage(payload);
      expect(result.errorType).toBe("crash");
      expect(result.confidence).toBe(0.3);
      expect(result.rootCauseLabel).toBe("unknown");
    });
  });

  describe("triage — result structure", () => {
    it("returns all required fields", () => {
      const payload: FailurePayload = {
        fileId: "test.sldprt",
        message: "ENOENT: no such file",
      };
      const result = cadFailureTriageEngine.triage(payload);
      expect(result.fileId).toBe("test.sldprt");
      expect(result.errorType).toBe("format");
      expect(typeof result.confidence).toBe("number");
      expect(result.rootCauseKey).toMatch(/^[a-f0-9]{64}$/);
      expect(typeof result.rootCauseLabel).toBe("string");
      expect(typeof result.messageSnippet).toBe("string");
    });

    it("truncates long messages to 200 chars", () => {
      const longMsg = "A".repeat(300);
      const payload: FailurePayload = {
        fileId: "test.sldprt",
        message: longMsg,
      };
      const result = cadFailureTriageEngine.triage(payload);
      expect(result.messageSnippet.length).toBe(200);
      expect(result.messageSnippet.endsWith("…")).toBe(true);
    });

    it("includes suggestedFix when rule provides one", () => {
      const payload: FailurePayload = {
        fileId: "test.sldprt",
        message: "ENOENT: file not found",
      };
      const result = cadFailureTriageEngine.triage(payload);
      expect(result.suggestedFix).toContain("Re-run index");
    });

    it("generates stable rootCauseKey for identical failures", () => {
      const payload1: FailurePayload = { fileId: "a.sldprt", message: "ENOENT: no such file" };
      const payload2: FailurePayload = { fileId: "b.sldprt", message: "ENOENT: no such file" };
      const r1 = cadFailureTriageEngine.triage(payload1);
      const r2 = cadFailureTriageEngine.triage(payload2);
      expect(r1.rootCauseKey).toBe(r2.rootCauseKey);
    });

    it("normalizes paths in rootCauseKey", () => {
      const payload1: FailurePayload = { fileId: "a.sldprt", message: "Error at C:/foo/bar.sldprt" };
      const payload2: FailurePayload = { fileId: "b.sldprt", message: "Error at C:/baz/qux.sldprt" };
      const r1 = cadFailureTriageEngine.triage(payload1);
      const r2 = cadFailureTriageEngine.triage(payload2);
      expect(r1.rootCauseKey).toBe(r2.rootCauseKey);
    });
  });

  describe("group", () => {
    it("groups results by rootCauseKey", () => {
      const results: TriageResult[] = [
        { fileId: "a.sldprt", errorType: "format", confidence: 0.95, rootCauseKey: "key1", rootCauseLabel: "file-missing", messageSnippet: "ENOENT" },
        { fileId: "b.sldprt", errorType: "format", confidence: 0.95, rootCauseKey: "key1", rootCauseLabel: "file-missing", messageSnippet: "ENOENT" },
        { fileId: "c.sldprt", errorType: "crash", confidence: 0.97, rootCauseKey: "key2", rootCauseLabel: "oom", messageSnippet: "OOM" },
      ];
      const groups = cadFailureTriageEngine.group(results);
      expect(groups.length).toBe(2);
    });

    it("sorts groups by count descending", () => {
      const results: TriageResult[] = [
        { fileId: "a.sldprt", errorType: "format", confidence: 0.95, rootCauseKey: "key1", rootCauseLabel: "file-missing", messageSnippet: "ENOENT" },
        { fileId: "b.sldprt", errorType: "format", confidence: 0.95, rootCauseKey: "key1", rootCauseLabel: "file-missing", messageSnippet: "ENOENT" },
        { fileId: "c.sldprt", errorType: "format", confidence: 0.95, rootCauseKey: "key1", rootCauseLabel: "file-missing", messageSnippet: "ENOENT" },
        { fileId: "d.sldprt", errorType: "crash", confidence: 0.97, rootCauseKey: "key2", rootCauseLabel: "oom", messageSnippet: "OOM" },
      ];
      const groups = cadFailureTriageEngine.group(results);
      expect(groups[0].count).toBe(3);
      expect(groups[1].count).toBe(1);
    });

    it("collects fileIds in each group", () => {
      const results: TriageResult[] = [
        { fileId: "a.sldprt", errorType: "format", confidence: 0.95, rootCauseKey: "key1", rootCauseLabel: "file-missing", messageSnippet: "ENOENT" },
        { fileId: "b.sldprt", errorType: "format", confidence: 0.95, rootCauseKey: "key1", rootCauseLabel: "file-missing", messageSnippet: "ENOENT" },
      ];
      const groups = cadFailureTriageEngine.group(results);
      expect(groups[0].fileIds).toEqual(["a.sldprt", "b.sldprt"]);
    });

    it("limits sampleMessages to 3", () => {
      const results: TriageResult[] = Array.from({ length: 5 }, (_, i) => ({
        fileId: `${i}.sldprt`,
        errorType: "format" as const,
        confidence: 0.95,
        rootCauseKey: "key1",
        rootCauseLabel: "file-missing",
        messageSnippet: `Message ${i}`,
      }));
      const groups = cadFailureTriageEngine.group(results);
      expect(groups[0].sampleMessages.length).toBe(3);
    });

    it("returns empty array for empty input", () => {
      const groups = cadFailureTriageEngine.group([]);
      expect(groups).toEqual([]);
    });

    it("preserves errorType and rootCauseLabel in group", () => {
      const results: TriageResult[] = [
        { fileId: "a.sldprt", errorType: "timeout", confidence: 0.99, rootCauseKey: "key1", rootCauseLabel: "abort-signal-fired", messageSnippet: "aborted" },
      ];
      const groups = cadFailureTriageEngine.group(results);
      expect(groups[0].errorType).toBe("timeout");
      expect(groups[0].rootCauseLabel).toBe("abort-signal-fired");
    });
  });

  describe("engine info", () => {
    it("name is CADFailureTriageEngine", () => {
      expect(cadFailureTriageEngine.getInfo().name).toBe("CADFailureTriageEngine");
    });

    it("version is 1.0.0", () => {
      expect(cadFailureTriageEngine.getInfo().version).toBe("1.0.0");
    });

    it("domain is cad_infrastructure", () => {
      expect(cadFailureTriageEngine.getInfo().domain).toBe("cad_infrastructure");
    });
  });
});
