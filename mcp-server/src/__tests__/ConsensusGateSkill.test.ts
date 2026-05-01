/**
 * ConsensusGateSkill.test.ts — decision-correctness suite for the
 * `/consensus-gate` slash skill (P4-U04).
 *
 * The skill itself is markdown; the testable surface is the CLI helper
 * `mcp-server/scripts/consensus-gate-cli.mjs` that the skill body invokes.
 * This suite spawns the CLI per case and asserts JSON-parsed structure
 * (per envelope: "Output asserted by JSON-parsed structure, not just
 * timing or exit code").
 *
 * Cases:
 *   1. Known-buggy file (kc1.1=99 inlined for steel) with --threshold=0.75
 *      → decision=FAIL, dissent[].length >= 2, providers[].provider list
 *        in input order.
 *   2. Clean file with --threshold=0.75
 *      → decision=PASS, all providers[].decision === "PASS", dissent === [].
 *   3. --target glob matching nothing
 *      → decision=REFUSED with reason "no files matched".
 *   4. Missing --target
 *      → decision=REFUSED with reason "no --target provided".
 *   5. Subset --providers (only kienzle + safety) on buggy file
 *      → still FAIL, providers[].id matches the requested subset (length 2).
 */

import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
// __tests__ → src → mcp-server → scripts/...
const CLI_PATH = resolve(HERE, "..", "..", "scripts", "consensus-gate-cli.mjs");

interface ProviderVerdict {
  id: string;
  persona: string;
  decision: "PASS" | "CONDITIONAL" | "FAIL";
  rationale: string;
}
interface DissentEntry {
  provider: string;
  decision: "PASS" | "CONDITIONAL" | "FAIL";
  rationale: string;
}
interface CliOutput {
  decision: "PASS" | "CONDITIONAL" | "FAIL" | "REFUSED";
  reason: string;
  threshold: number;
  domain: string | null;
  filesScanned: string[];
  providers: ProviderVerdict[];
  votes: { PASS: number; CONDITIONAL: number; FAIL: number };
  weighted: { PASS: number; CONDITIONAL: number; FAIL: number };
  dissent: DissentEntry[];
}

function makeWorkdir(): string {
  return mkdtempSync(join(tmpdir(), "prism-consensus-skill-"));
}

function writeFile(root: string, relPath: string, content: string): string {
  const full = join(root, relPath);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, content, "utf8");
  return full;
}

function runCli(args: string[]): { status: number | null; stdout: string; stderr: string; json: CliOutput } {
  const r = spawnSync(process.execPath, [CLI_PATH, ...args], {
    encoding: "utf8",
  });
  let json: CliOutput;
  try {
    json = JSON.parse(r.stdout) as CliOutput;
  } catch (err) {
    throw new Error(
      `CLI did not emit valid JSON. stdout="${r.stdout}" stderr="${r.stderr}" err=${String(err)}`
    );
  }
  return { status: r.status, stdout: r.stdout, stderr: r.stderr, json };
}

describe("/consensus-gate skill (P4-U04) — JSON output structure", () => {
  it("(1) known-buggy file (kc1.1=99 + softening signal) → FAIL, dissent length >= 2, providers ordered", () => {
    const root = makeWorkdir();
    try {
      // A "known-buggy" file in shop-floor terms: out-of-range Kienzle
      // constant AND a safety-softening flag in a comment. This triggers
      // both the kienzle persona (range veto) and the safety persona
      // (--no-verify detection), giving the envelope-required dissent
      // length >= 2 even after the home-FAIL veto fires.
      const buggy = writeFile(
        root,
        "src/physics/constants.ts",
        [
          "// HACK: bypassing pre-commit gate via --no-verify temporarily",
          "export const KIENZLE = { kc11: 99 };",
          "",
        ].join("\n")
      );
      const r = runCli([
        "--target",
        buggy,
        "--providers",
        "claude,codex,qwen,mistral,llama",
        "--threshold",
        "0.75",
      ]);
      expect(r.json.decision).toBe("FAIL");
      expect(r.json.dissent.length).toBeGreaterThanOrEqual(2);
      expect(r.json.providers.map((p) => p.id)).toEqual([
        "claude",
        "codex",
        "qwen",
        "mistral",
        "llama",
      ]);
      // kienzle (claude) is the home expert and must be FAIL.
      const claude = r.json.providers.find((p) => p.id === "claude");
      expect(claude?.persona).toBe("kienzle");
      expect(claude?.decision).toBe("FAIL");
      // domain detection should pick kienzle (file path + content match).
      expect(r.json.domain).toBe("kienzle");
      expect(r.json.threshold).toBe(0.75);
      expect(r.json.filesScanned).toEqual([resolve(buggy)]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("(2) clean file kc1.1=2100 (in-range) → decision=PASS, all providers PASS, dissent empty", () => {
    const root = makeWorkdir();
    try {
      const clean = writeFile(
        root,
        "src/physics/constants.ts",
        // Canonical-shaped file with in-range value, no inline G-code, no
        // safety-softening, no G68.2, no clamp-without-ISO.
        "export const KIENZLE = {\n  kc11: 2100,\n  mc: 0.25,\n};\n"
      );
      const r = runCli([
        "--target",
        clean,
        "--providers",
        "claude,codex,qwen,mistral,llama",
        "--threshold",
        "0.75",
      ]);
      expect(r.json.decision).toBe("PASS");
      expect(r.json.dissent).toEqual([]);
      // Uniform PASS across the entire panel — that is what the envelope
      // requires for the clean-file leg of the contract.
      expect(r.json.providers).toHaveLength(5);
      for (const p of r.json.providers) {
        expect(p.decision).toBe("PASS");
      }
      expect(r.json.votes).toEqual({ PASS: 5, CONDITIONAL: 0, FAIL: 0 });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("(3) --target glob matches nothing → decision=REFUSED with informative reason", () => {
    const r = runCli([
      "--target",
      "/path/that/definitely/does/not/exist/file.ts",
      "--providers",
      "claude,codex",
    ]);
    expect(r.json.decision).toBe("REFUSED");
    expect(r.json.reason).toMatch(/no files matched/i);
    expect(r.json.filesScanned).toEqual([]);
    expect(r.json.dissent).toEqual([]);
  });

  it("(4) missing --target → decision=REFUSED with 'no --target provided'", () => {
    const r = runCli(["--providers", "claude"]);
    expect(r.json.decision).toBe("REFUSED");
    expect(r.json.reason).toMatch(/no --target/i);
  });

  it("(5) subset --providers on buggy file still FAILs and reports requested subset only", () => {
    const root = makeWorkdir();
    try {
      const buggy = writeFile(
        root,
        "src/physics/constants.ts",
        "export const KIENZLE = { kc11: 99 };\n"
      );
      const r = runCli([
        "--target",
        buggy,
        "--providers",
        "kienzle,safety", // bare persona ids
        "--threshold",
        "0.5",
      ]);
      expect(r.json.providers).toHaveLength(2);
      expect(r.json.providers.map((p) => p.id).sort()).toEqual(["kienzle", "safety"]);
      // home expert FAIL veto still fires regardless of subset size
      expect(r.json.decision).toBe("FAIL");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("(6) basename glob (*.ts) under tmp dir resolves files and runs panel", () => {
    const root = makeWorkdir();
    try {
      const subdir = join(root, "physics");
      mkdirSync(subdir, { recursive: true });
      writeFileSync(join(subdir, "kienzle.ts"), "export const kc11 = 1900;\n", "utf8");
      writeFileSync(join(subdir, "taylor.ts"), "export const C = 110;\n", "utf8");
      const r = runCli([
        "--target",
        join(subdir, "*.ts"),
        "--providers",
        "claude,codex",
      ]);
      expect(r.json.filesScanned).toHaveLength(2);
      // kienzle.ts has kc11=1900 (in range) but is OUTSIDE physics/constants.ts,
      // so the kienzle persona FAILs on the inline-leak rule.
      expect(r.json.decision).toBe("FAIL");
      const claude = r.json.providers.find((p) => p.id === "claude");
      expect(claude?.decision).toBe("FAIL");
      expect(claude?.rationale).toMatch(/inlined outside|must import/i);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
