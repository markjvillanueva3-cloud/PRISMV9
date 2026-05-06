/**
 * intel-stack-bootstrap — pure-logic tests for INTEL-OLLAMA-OBSIDIAN-MS0/P17-U02.
 *
 * Tests the parser + validator + planner without spawning Docker or Qdrant.
 * The I/O glue (compose up/stop/start, fetch to Qdrant) is exercised by the
 * `--smoke` invocation that the script runs against a live stack.
 *
 * Coverage:
 *   - parseComposeOverride: 4 happy + 5 failure modes + 2 adversarial
 *   - validateRequiredBindings: 3 happy + 4 failure modes
 *   - matchesHostPath: 4 happy + 3 edge cases (slashes, case)
 *   - decideBootstrapPlan: full truth table (8 combinations)
 *   - parseArgs: 4 happy + 2 edge cases
 *   - the actual override file in this repo passes validation (round-trip)
 */

import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import {
  parseComposeOverride,
  validateRequiredBindings,
  matchesHostPath,
  decideBootstrapPlan,
  parseArgs,
  REQUIRED_QDRANT_HOST_PATH,
  REQUIRED_OLLAMA_HOST_PATH,
  QDRANT_CONTAINER_PATH,
  OLLAMA_CONTAINER_PATH,
  COMPOSE_OVERRIDE_RELATIVE,
  SMOKE_VECTOR_DIM,
} from "./intel-stack-bootstrap.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, "..");

const VALID_OVERRIDE = `# header comment
services:
  qdrant:
    volumes:
      - H:/prism/state/qdrant:/qdrant/storage
  ollama:
    volumes:
      - H:/prism/state/ollama:/root/.ollama
`;

describe("P17-U02 module constants", () => {
  it("exports stable constants matching the milestone exit_conditions", () => {
    expect(REQUIRED_QDRANT_HOST_PATH).toBe("H:/prism/state/qdrant");
    expect(REQUIRED_OLLAMA_HOST_PATH).toBe("H:/prism/state/ollama");
    expect(QDRANT_CONTAINER_PATH).toBe("/qdrant/storage");
    expect(OLLAMA_CONTAINER_PATH).toBe("/root/.ollama");
    expect(COMPOSE_OVERRIDE_RELATIVE).toBe("docker-compose.intel.yml");
    expect(SMOKE_VECTOR_DIM).toBe(768);
  });
});

describe("P17-U02 parseComposeOverride", () => {
  it("parses qdrant + ollama services with their volumes", () => {
    const r = parseComposeOverride(VALID_OVERRIDE);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(Object.keys(r.services).sort()).toEqual(["ollama", "qdrant"]);
      expect(r.services.qdrant.volumes).toEqual(["H:/prism/state/qdrant:/qdrant/storage"]);
      expect(r.services.ollama.volumes).toEqual(["H:/prism/state/ollama:/root/.ollama"]);
    }
  });

  it("strips inline comments", () => {
    const r = parseComposeOverride(`services:
  qdrant: # inline
    volumes:
      - H:/prism/state/qdrant:/qdrant/storage  # path comment
`);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.services.qdrant.volumes[0]).toBe("H:/prism/state/qdrant:/qdrant/storage");
    }
  });

  it("unwraps single- and double-quoted volume strings", () => {
    const r = parseComposeOverride(`services:
  qdrant:
    volumes:
      - "H:/prism/state/qdrant:/qdrant/storage"
  ollama:
    volumes:
      - 'H:/prism/state/ollama:/root/.ollama'
`);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.services.qdrant.volumes[0]).toBe("H:/prism/state/qdrant:/qdrant/storage");
      expect(r.services.ollama.volumes[0]).toBe("H:/prism/state/ollama:/root/.ollama");
    }
  });

  it("captures multiple volume entries per service", () => {
    const r = parseComposeOverride(`services:
  qdrant:
    volumes:
      - H:/prism/state/qdrant:/qdrant/storage
      - H:/prism/state/qdrant-snapshots:/qdrant/snapshots
`);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.services.qdrant.volumes).toHaveLength(2);
  });

  it("rejects empty / non-string source", () => {
    expect(parseComposeOverride("").ok).toBe(false);
    // @ts-expect-error - adversarial wrong-type input
    expect(parseComposeOverride(null).ok).toBe(false);
    // @ts-expect-error - adversarial wrong-type input
    expect(parseComposeOverride(undefined).ok).toBe(false);
    // @ts-expect-error - adversarial wrong-type input
    expect(parseComposeOverride(42).ok).toBe(false);
  });

  it("rejects sources with no services: header", () => {
    const r = parseComposeOverride("# only comments\nrandomTopLevel:\n  foo: bar\n");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("no-services");
  });

  it("returns no-services when services: block has no entries", () => {
    const r = parseComposeOverride("services:\n  # nothing\n");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("no-services");
  });

  it("ends a volumes block when another 4-space-indent key appears", () => {
    const r = parseComposeOverride(`services:
  qdrant:
    volumes:
      - H:/prism/state/qdrant:/qdrant/storage
    image: qdrant:v1.17.0
    volumes:
      - extra-volume:/extra
`);
    expect(r.ok).toBe(true);
    if (r.ok) {
      // Both volumes blocks are honored — first ended on `image:`, second resumed.
      expect(r.services.qdrant.volumes).toContain("H:/prism/state/qdrant:/qdrant/storage");
      expect(r.services.qdrant.volumes).toContain("extra-volume:/extra");
    }
  });

  it("ignores entries that don't match the 6-space dash pattern", () => {
    const r = parseComposeOverride(`services:
  qdrant:
    volumes:
        - too-deep:/x
      not-a-list-entry: foo
`);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.services.qdrant.volumes).toEqual([]);
  });
});

describe("P17-U02 matchesHostPath", () => {
  it("matches forward-slash paths exactly", () => {
    expect(matchesHostPath("H:/prism/state/qdrant:/qdrant/storage", "H:/prism/state/qdrant", "/qdrant/storage")).toBe(true);
  });

  it("matches Windows backslash variant", () => {
    expect(matchesHostPath("H:\\prism\\state\\qdrant:/qdrant/storage", "H:/prism/state/qdrant", "/qdrant/storage")).toBe(true);
  });

  it("ignores trailing slash on host path", () => {
    expect(matchesHostPath("H:/prism/state/qdrant/:/qdrant/storage", "H:/prism/state/qdrant", "/qdrant/storage")).toBe(true);
  });

  it("is case-insensitive (Windows filesystems)", () => {
    expect(matchesHostPath("h:/PRISM/state/Qdrant:/qdrant/storage", "H:/prism/state/qdrant", "/qdrant/storage")).toBe(true);
  });

  it("rejects when host path differs", () => {
    expect(matchesHostPath("./data/docker-volumes/qdrant:/qdrant/storage", "H:/prism/state/qdrant", "/qdrant/storage")).toBe(false);
    expect(matchesHostPath("C:/elsewhere:/qdrant/storage", "H:/prism/state/qdrant", "/qdrant/storage")).toBe(false);
  });

  it("rejects when container path differs", () => {
    expect(matchesHostPath("H:/prism/state/qdrant:/wrong/path", "H:/prism/state/qdrant", "/qdrant/storage")).toBe(false);
  });

  it("rejects non-string input (adversarial)", () => {
    // @ts-expect-error - wrong-type adversarial input
    expect(matchesHostPath(null, "H:/x", "/y")).toBe(false);
    // @ts-expect-error - wrong-type adversarial input
    expect(matchesHostPath(42, "H:/x", "/y")).toBe(false);
  });
});

describe("P17-U02 validateRequiredBindings", () => {
  it("PASSES when both qdrant and ollama point at H:/prism/state/", () => {
    const services = {
      qdrant: { volumes: ["H:/prism/state/qdrant:/qdrant/storage"] },
      ollama: { volumes: ["H:/prism/state/ollama:/root/.ollama"] },
    };
    expect(validateRequiredBindings(services)).toEqual({ ok: true });
  });

  it("PASSES with extra services and extra volumes", () => {
    const services = {
      qdrant: {
        volumes: [
          "H:/prism/state/qdrant:/qdrant/storage",
          "H:/prism/state/qdrant-snapshots:/qdrant/snapshots",
        ],
      },
      ollama: { volumes: ["H:/prism/state/ollama:/root/.ollama"] },
      postgres: { volumes: ["./pg:/var/lib/postgresql"] },
    };
    expect(validateRequiredBindings(services).ok).toBe(true);
  });

  it("PASSES on Windows-backslash variant", () => {
    const services = {
      qdrant: { volumes: ["H:\\prism\\state\\qdrant:/qdrant/storage"] },
      ollama: { volumes: ["H:\\prism\\state\\ollama:/root/.ollama"] },
    };
    expect(validateRequiredBindings(services).ok).toBe(true);
  });

  it("FAILS with `missing` when qdrant service is absent", () => {
    const services = { ollama: { volumes: ["H:/prism/state/ollama:/root/.ollama"] } };
    const r = validateRequiredBindings(services);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.missing).toContain("qdrant");
  });

  it("FAILS with `wrong` when qdrant volume points elsewhere", () => {
    const services = {
      qdrant: { volumes: ["./data/docker-volumes/qdrant:/qdrant/storage"] },
      ollama: { volumes: ["H:/prism/state/ollama:/root/.ollama"] },
    };
    const r = validateRequiredBindings(services);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.wrong).toHaveLength(1);
      expect(r.wrong[0].service).toBe("qdrant");
    }
  });

  it("FAILS with `missing` when qdrant has volumes but none target /qdrant/storage", () => {
    const services = {
      qdrant: { volumes: ["H:/prism/state/qdrant:/some-other-path"] },
      ollama: { volumes: ["H:/prism/state/ollama:/root/.ollama"] },
    };
    const r = validateRequiredBindings(services);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.missing).toContain("qdrant:/qdrant/storage");
  });

  it("does not crash on null / wrong-shape input", () => {
    // @ts-expect-error - wrong-type adversarial input
    expect(validateRequiredBindings(null).ok).toBe(false);
    // @ts-expect-error - wrong-type adversarial input
    expect(validateRequiredBindings({}).ok).toBe(false);
  });
});

describe("P17-U02 decideBootstrapPlan (truth table)", () => {
  it("ABORTS when compose file missing (regardless of other flags)", () => {
    const r = decideBootstrapPlan({ composeFileExists: false, bindingsValid: true, ensureDirs: true, runSmoke: true });
    expect(r.plan).toBe("abort");
    expect(r.reason).toBe("compose-missing");
    expect(r.exitCode).toBe(1);
  });

  it("ABORTS when bindings invalid (regardless of other flags)", () => {
    const r = decideBootstrapPlan({ composeFileExists: true, bindingsValid: false, ensureDirs: true, runSmoke: true });
    expect(r.plan).toBe("abort");
    expect(r.reason).toBe("bindings-wrong");
    expect(r.exitCode).toBe(2);
  });

  it("PROCEEDs minimal (validate-only) when both flags off", () => {
    const r = decideBootstrapPlan({ composeFileExists: true, bindingsValid: true, ensureDirs: false, runSmoke: false });
    expect(r.plan).toBe("proceed");
    expect(r.steps).toEqual(["validate-ok"]);
  });

  it("adds ensure-state-dirs step when --ensure-dirs", () => {
    const r = decideBootstrapPlan({ composeFileExists: true, bindingsValid: true, ensureDirs: true, runSmoke: false });
    expect(r.steps).toContain("ensure-state-dirs");
  });

  it("adds full smoke pipeline (compose-up → roundtrip → stop → start → recall) when --smoke", () => {
    const r = decideBootstrapPlan({ composeFileExists: true, bindingsValid: true, ensureDirs: false, runSmoke: true });
    expect(r.steps).toEqual([
      "validate-ok",
      "compose-up",
      "qdrant-roundtrip",
      "compose-stop",
      "compose-start",
      "qdrant-recall",
    ]);
  });

  it("combines --ensure-dirs and --smoke in correct order", () => {
    const r = decideBootstrapPlan({ composeFileExists: true, bindingsValid: true, ensureDirs: true, runSmoke: true });
    expect(r.steps[0]).toBe("validate-ok");
    expect(r.steps[1]).toBe("ensure-state-dirs");
    expect(r.steps).toContain("compose-up");
    expect(r.steps).toContain("qdrant-recall");
  });

  it("smoke step list embeds the stop/start cycle (cross-PC eject simulator)", () => {
    const r = decideBootstrapPlan({ composeFileExists: true, bindingsValid: true, ensureDirs: false, runSmoke: true });
    const stopIdx = r.steps.indexOf("compose-stop");
    const startIdx = r.steps.indexOf("compose-start");
    const recallIdx = r.steps.indexOf("qdrant-recall");
    expect(stopIdx).toBeGreaterThan(0);
    expect(startIdx).toBe(stopIdx + 1);
    expect(recallIdx).toBe(startIdx + 1);
  });

  it("never returns 'proceed' with no steps", () => {
    const r = decideBootstrapPlan({ composeFileExists: true, bindingsValid: true, ensureDirs: false, runSmoke: false });
    if (r.plan === "proceed") expect(r.steps.length).toBeGreaterThan(0);
  });
});

describe("P17-U02 parseArgs", () => {
  it("returns defaults when no flags", () => {
    const a = parseArgs([]);
    expect(a).toEqual({ ensureDirs: false, smoke: false, json: false, composePath: "" });
  });

  it("parses --ensure-dirs / --smoke / --json", () => {
    const a = parseArgs(["--ensure-dirs", "--smoke", "--json"]);
    expect(a.ensureDirs).toBe(true);
    expect(a.smoke).toBe(true);
    expect(a.json).toBe(true);
  });

  it("parses --compose value", () => {
    const a = parseArgs(["--compose", "/abs/path/compose.yml"]);
    expect(a.composePath).toBe("/abs/path/compose.yml");
  });

  it("parses --compose=value", () => {
    const a = parseArgs(["--compose=/abs/path/compose.yml"]);
    expect(a.composePath).toBe("/abs/path/compose.yml");
  });

  it("ignores unknown flags silently (caller already opted in)", () => {
    const a = parseArgs(["--unknown"]);
    expect(a.ensureDirs).toBe(false);
    expect(a.smoke).toBe(false);
  });

  it("--compose with no following value defaults to empty string", () => {
    const a = parseArgs(["--compose"]);
    expect(a.composePath).toBe("");
  });
});

describe("P17-U02 round-trip on this repo's docker-compose.intel.yml", () => {
  it("the actual override file passes parse + validate (anti-regression)", () => {
    const composePath = path.join(REPO_ROOT, COMPOSE_OVERRIDE_RELATIVE);
    expect(fs.existsSync(composePath), `${composePath} must exist`).toBe(true);

    const src = fs.readFileSync(composePath, "utf8");
    const parsed = parseComposeOverride(src);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      const v = validateRequiredBindings(parsed.services);
      expect(v).toEqual({ ok: true });
    }
  });
});
