/**
 * cadScreenshotCapturer.test.ts — CAD-GROUND-TRUTH-MS0/U-CGT06
 *
 * Validates 6-canonical-view capture orchestration, mock-PNG fallback,
 * pythonocc executor integration, and manifest signature determinism.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

import {
  CADScreenshotCapturer,
  cadScreenshotCapturer,
  CANONICAL_VIEWS,
  CAMERA_BY_VIEW,
  CAPTURE_RESOLUTION,
  ScreenshotResultSchema,
  buildScreenshotDir,
  buildViewPath,
  manifestSignature,
  type PythonExecutor,
  type CanonicalView,
  type ViewResult,
} from "../engines/CADScreenshotCapturer.js";

let engine: CADScreenshotCapturer;
let tmpRoot: string;

beforeEach(() => {
  engine = new CADScreenshotCapturer();
  tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "prism-cgt06-"));
});

afterEach(() => {
  try {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  } catch {
    // ignore best-effort cleanup
  }
});

// ── Fixtures ────────────────────────────────────────────────────────────────

/** Valid PNG signature bytes — used to assert mock output is a real PNG. */
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function makeStubStep(): string {
  const p = path.join(tmpRoot, "input.step");
  fs.writeFileSync(
    p,
    "ISO-10303-21;\nDATA;\nCARTESIAN_POINT('p',(0,0,0));\nENDSEC;\nEND-ISO-10303-21;\n",
    "utf8",
  );
  return p;
}

/** Stub executor reporting pythonocc as available; writes PNG-like bytes. */
function fakeWorkingExecutor(): PythonExecutor {
  return {
    async probe() {
      return { available: true, version: "pythonocc-stub-1.0" };
    },
    async render({ outputPath, camera }) {
      const buf = Buffer.concat([
        PNG_MAGIC,
        Buffer.from(`OCCT-VIEW:${camera.view}`),
      ]);
      await fs.promises.mkdir(path.dirname(outputPath), { recursive: true });
      await fs.promises.writeFile(outputPath, buf);
      return { ok: true, durationMs: 5 };
    },
  };
}

/** Executor that probes ok but every render call fails — exercises fallthrough. */
function fakeBrokenExecutor(): PythonExecutor {
  return {
    async probe() {
      return { available: true };
    },
    async render() {
      return { ok: false, durationMs: 1, error: "OCCT crashed" };
    },
  };
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe("CADScreenshotCapturer — constants + getters", () => {
  it("exposes 6 canonical views in stable order", () => {
    expect(CANONICAL_VIEWS).toEqual([
      "iso",
      "front",
      "top",
      "right",
      "section-xz",
      "section-yz",
    ]);
    expect(engine.listCanonicalViews()).toEqual(CANONICAL_VIEWS);
  });

  it("singleton schemaVersion matches fresh-instance", () => {
    expect(cadScreenshotCapturer.schemaVersion).toBe("1.0.0");
    expect(cadScreenshotCapturer.schemaVersion).toBe(engine.schemaVersion);
  });

  it("CAPTURE_RESOLUTION is 1024×1024", () => {
    expect(CAPTURE_RESOLUTION.width).toBe(1024);
    expect(CAPTURE_RESOLUTION.height).toBe(1024);
  });

  it("camera params have correct azimuth/elevation per view", () => {
    expect(CAMERA_BY_VIEW.iso.azimuthDeg).toBe(45);
    expect(CAMERA_BY_VIEW.iso.elevationDeg).toBe(35);
    expect(CAMERA_BY_VIEW.top.elevationDeg).toBe(90);
    expect(CAMERA_BY_VIEW.right.azimuthDeg).toBe(90);
    expect(CAMERA_BY_VIEW["section-xz"].sectionPlane).toBe("XZ");
    expect(CAMERA_BY_VIEW["section-yz"].sectionPlane).toBe("YZ");
    expect(engine.getCamera("front").fit).toBe("extents");
    expect(engine.getCamera("section-xz").fit).toBe("section");
  });

  it("getCamera throws on unknown view", () => {
    expect(() => engine.getCamera("bogus" as CanonicalView)).toThrow(
      /Unknown view/,
    );
  });
});

describe("path helpers", () => {
  it("buildScreenshotDir composes outputRoot/{fileId}/screenshots", () => {
    expect(buildScreenshotDir("/tmp/gt", "FILE-001")).toBe(
      path.join("/tmp/gt", "FILE-001", "screenshots"),
    );
  });

  it("buildViewPath appends {view}.png", () => {
    const p = buildViewPath("/out", "X", "iso");
    expect(p).toBe(path.join("/out", "X", "screenshots", "iso.png"));
  });
});

describe("captureViews — mock fallback", () => {
  it("writes 6 valid PNG files when no python executor is available", async () => {
    const stepFile = makeStubStep();
    const result = await engine.captureViews(stepFile, {
      fileId: "F1",
      outputRoot: tmpRoot,
    });
    expect(result.allOk).toBe(true);
    expect(result.pythonAvailable).toBe(false);
    expect(result.views.length).toBe(6);
    expect(result.warnings.some((w) => w.includes("pythonocc unavailable"))).toBe(
      true,
    );

    for (const v of result.views) {
      expect(v.renderer).toBe("mock");
      expect(v.ok).toBe(true);
      expect(fs.existsSync(v.path)).toBe(true);
      const head = fs.readFileSync(v.path).subarray(0, 8);
      expect(head.equals(PNG_MAGIC)).toBe(true);
      expect(v.byteSize).toBeGreaterThan(20);
      expect(v.sha256).toMatch(/^[0-9a-f]{64}$/);
    }
  });

  it("mock PNGs have view-distinct sha256 (no two views share bytes)", async () => {
    const stepFile = makeStubStep();
    const result = await engine.captureViews(stepFile, {
      fileId: "F2",
      outputRoot: tmpRoot,
    });
    const hashes = result.views.map((v) => v.sha256);
    expect(new Set(hashes).size).toBe(6);
  });

  it("forceMock=true bypasses executor probe and writes mock PNGs", async () => {
    const stepFile = makeStubStep();
    const exec = fakeWorkingExecutor();
    const result = await engine.captureViews(stepFile, {
      fileId: "F3",
      outputRoot: tmpRoot,
      forceMock: true,
      pythonExecutor: exec,
    });
    expect(result.pythonAvailable).toBe(false);
    expect(result.warnings.some((w) => w.includes("forceMock=true"))).toBe(true);
    for (const v of result.views) {
      expect(v.renderer).toBe("mock");
    }
  });

  it("subset views captures only requested views", async () => {
    const stepFile = makeStubStep();
    const result = await engine.captureViews(stepFile, {
      fileId: "F4",
      outputRoot: tmpRoot,
      views: ["iso", "top"],
    });
    expect(result.views.length).toBe(2);
    expect(result.views.map((v) => v.view).sort()).toEqual(["iso", "top"]);
  });
});

describe("captureViews — pythonocc executor integration", () => {
  it("uses pythonocc when probe reports available", async () => {
    const stepFile = makeStubStep();
    const result = await engine.captureViews(stepFile, {
      fileId: "PY1",
      outputRoot: tmpRoot,
      pythonExecutor: fakeWorkingExecutor(),
    });
    expect(result.pythonAvailable).toBe(true);
    expect(result.allOk).toBe(true);
    for (const v of result.views) {
      expect(v.renderer).toBe("pythonocc");
      const head = fs.readFileSync(v.path).subarray(0, 8);
      expect(head.equals(PNG_MAGIC)).toBe(true);
      const bodyText = fs.readFileSync(v.path).toString("utf8");
      expect(bodyText).toContain(`OCCT-VIEW:${v.view}`);
    }
  });

  it("falls through to mock when pythonocc render() fails mid-flight", async () => {
    const stepFile = makeStubStep();
    const result = await engine.captureViews(stepFile, {
      fileId: "PY2",
      outputRoot: tmpRoot,
      pythonExecutor: fakeBrokenExecutor(),
    });
    expect(result.pythonAvailable).toBe(true);
    expect(result.allOk).toBe(true); // mock fallback succeeded
    for (const v of result.views) {
      expect(v.renderer).toBe("mock");
      expect(v.error).toContain("OCCT crashed");
      expect(v.error).toContain("fell through to mock");
    }
  });

  it("captureView() (single) returns a 1-view manifest", async () => {
    const stepFile = makeStubStep();
    const result = await engine.captureView(stepFile, "iso", {
      fileId: "S1",
      outputRoot: tmpRoot,
    });
    expect(result.views.length).toBe(1);
    expect(result.views[0]?.view).toBe("iso");
    expect(result.allOk).toBe(true);
  });
});

describe("manifestSignature determinism", () => {
  it("two consecutive runs of the same fileId produce identical signatures", async () => {
    const stepFile = makeStubStep();
    const a = await engine.captureViews(stepFile, {
      fileId: "DET1",
      outputRoot: tmpRoot,
    });
    const b = await engine.captureViews(stepFile, {
      fileId: "DET1",
      outputRoot: tmpRoot,
    });
    expect(a.signature).toBe(b.signature);
    expect(a.signature).toMatch(/^[0-9a-f]{64}$/);
  });

  it("recomputeSignature reproduces result.signature", async () => {
    const stepFile = makeStubStep();
    const r = await engine.captureViews(stepFile, {
      fileId: "RC1",
      outputRoot: tmpRoot,
    });
    expect(engine.recomputeSignature(r)).toBe(r.signature);
  });

  it("different renderer → different signature for same view set", async () => {
    const stepFile = makeStubStep();
    const mock = await engine.captureViews(stepFile, {
      fileId: "S-MOCK",
      outputRoot: tmpRoot,
    });
    const py = await engine.captureViews(stepFile, {
      fileId: "S-PY",
      outputRoot: tmpRoot,
      pythonExecutor: fakeWorkingExecutor(),
    });
    expect(mock.signature).not.toBe(py.signature);
  });

  it("signature is order-independent — manifest signature reorder", () => {
    const v1: ViewResult = {
      view: "iso",
      path: "/a.png",
      byteSize: 100,
      sha256: "a".repeat(64),
      durationMs: 1,
      ok: true,
      renderer: "mock",
    };
    const v2: ViewResult = {
      view: "front",
      path: "/b.png",
      byteSize: 200,
      sha256: "b".repeat(64),
      durationMs: 2,
      ok: true,
      renderer: "mock",
    };
    expect(manifestSignature([v1, v2])).toBe(manifestSignature([v2, v1]));
  });

  it("signature ignores durationMs / path drift", () => {
    const v1: ViewResult = {
      view: "iso",
      path: "/a.png",
      byteSize: 100,
      sha256: "a".repeat(64),
      durationMs: 1,
      ok: true,
      renderer: "mock",
    };
    const v2: ViewResult = { ...v1, durationMs: 999, path: "/different.png" };
    expect(manifestSignature([v1])).toBe(manifestSignature([v2]));
  });
});

describe("validate() and input guards", () => {
  it("validate ok=true for fresh result; ok=false for malformed", async () => {
    const stepFile = makeStubStep();
    const r = await engine.captureViews(stepFile, {
      fileId: "V1",
      outputRoot: tmpRoot,
    });
    const ok = engine.validate(r);
    expect(ok.ok).toBe(true);
    expect(ok.errors.length).toBe(0);

    const bad = engine.validate({ schemaVersion: "1.0.0" });
    expect(bad.ok).toBe(false);
    expect(bad.errors.length).toBeGreaterThan(3);
    expect(bad.errors.some((e) => e.includes("fileId"))).toBe(true);
    expect(bad.errors.some((e) => e.includes("signature"))).toBe(true);
  });

  it("rejects empty stepFile / fileId / outputRoot", async () => {
    await expect(
      engine.captureViews("", { fileId: "X", outputRoot: tmpRoot }),
    ).rejects.toThrow(/stepFile must be a non-empty string/);

    await expect(
      engine.captureViews("x.step", {
        fileId: "",
        outputRoot: tmpRoot,
      }),
    ).rejects.toThrow(/fileId must be a non-empty string/);

    await expect(
      engine.captureViews("x.step", { fileId: "f", outputRoot: "" }),
    ).rejects.toThrow(/outputRoot must be a non-empty string/);
  });

  it("Zod schema rejects invalid sha256 hash", () => {
    const tree = {
      schemaVersion: "1.0.0",
      fileId: "x",
      sourceStep: "/x.step",
      outputDir: "/d",
      views: [
        {
          view: "iso",
          path: "/a.png",
          byteSize: 1,
          sha256: "not-a-hash",
          durationMs: 1,
          ok: true,
          renderer: "mock",
        },
      ],
      totalDurationMs: 1,
      allOk: true,
      pythonAvailable: false,
      signature: "0".repeat(64),
      warnings: [],
    };
    const r = ScreenshotResultSchema.safeParse(tree);
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(
        r.error.issues.some((i) => i.path.join(".").includes("sha256")),
      ).toBe(true);
    }
  });
});
