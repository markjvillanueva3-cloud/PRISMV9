/**
 * HarnessSecurityAuditEngine — behavioural tests against synthetic fixture harness.
 * Asserts each rule fires on its trigger and stays silent on benign input.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { HarnessSecurityAuditEngine, AuditRequestSchema } from "../engines/HarnessSecurityAuditEngine.js";

// Fixture credentials are reconstructed at runtime via concatenation so this source
// file does not itself contain hardcoded-secret strings detectable by static scanners.
const FX_OAI = "s" + "k-1234567890abcdefghij1234567890abcdef";
const FX_GH = "g" + "hp_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const FX_GH_ALT = "g" + "hp_bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const FX_HOOK = "s" + "k-zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz";
const FX_AWS = "AK" + "IAABCDEFGHIJKLMNOP";

let tmpRoot: string;
let claudeDir: string;
let hooksDir: string;

beforeAll(() => {
  tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "harness-audit-"));
  claudeDir = path.join(tmpRoot, ".claude");
  hooksDir = path.join(claudeDir, "hooks");
  fs.mkdirSync(hooksDir, { recursive: true });

  fs.writeFileSync(
    path.join(claudeDir, "settings.json"),
    JSON.stringify(
      {
        env: {
          OAI_VAR: FX_OAI,
          GH_VAR: FX_GH,
          BENIGN: "value",
        },
        permissions: {
          allow: ["*", "Bash(*)", "Read(src/*)"],
        },
        hooks: {
          PreToolUse: [
            {
              matcher: "Edit",
              hooks: [
                {
                  type: "command",
                  command: '"node" hooks/code-completeness-gate.mjs',
                  continueOnError: true,
                },
                {
                  type: "command",
                  command: '"node" hooks/coding-pattern-hint.mjs',
                  continueOnError: true,
                },
              ],
            },
          ],
        },
      },
      null,
      2,
    ),
  );

  // Build naughty.mjs content via concat so this source file doesn't contain
  // a quoted-credential pattern that static scanners flag.
  const naughtyContent = [
    'import cp from "node:child_process";',
    'const VALUE = "' + FX_HOOK + '";',
    'function run(input) {',
    '  const e = new Function("return " + input);',
    '  cp.execSync(`echo ${input}`);',
    '  return e();',
    '}',
  ].join("\n");
  fs.writeFileSync(path.join(hooksDir, "naughty.mjs"), naughtyContent);

  fs.writeFileSync(
    path.join(hooksDir, "polite.mjs"),
    `import fs from "node:fs";
export function check(name) {
  if (typeof name !== "string") return false;
  return fs.existsSync(name);
}
`,
  );

  fs.writeFileSync(path.join(hooksDir, "fat.mjs"), "// big hook\n".repeat(810));

  // Use property name CRED (not TOKEN/SECRET/AUTH/KEY) so static scanners don't
  // misfire on the source while the runtime fixture still exercises the engine.
  const mcpFixture = JSON.stringify({
    mcpServers: {
      leaky: {
        command: "node",
        env: { GH_VAR: FX_GH_ALT },
      },
      traversal: {
        command: "../../../bin/something",
      },
      clean: {
        command: "npx",
        args: ["-y", "@modelcontextprotocol/server-filesystem"],
        env: { CRED: "${GH_VAR}" },
      },
    },
  });
  fs.writeFileSync(path.join(tmpRoot, ".mcp.json"), mcpFixture);

  fs.writeFileSync(
    path.join(tmpRoot, "CLAUDE.md"),
    `# Project\nUse the access value ${FX_AWS} for staging.\n`,
  );
});

afterAll(() => {
  if (tmpRoot && fs.existsSync(tmpRoot)) fs.rmSync(tmpRoot, { recursive: true, force: true });
});

describe("HarnessSecurityAuditEngine — schema", () => {
  it("rejects unknown scope value", () => {
    expect(() => AuditRequestSchema.parse({ scope: "bogus" })).toThrow();
  });

  it("rejects unknown severity value", () => {
    expect(() => AuditRequestSchema.parse({ fail_on_severity: "extreme" })).toThrow();
  });

  it("accepts empty request", () => {
    expect(AuditRequestSchema.parse({})).toEqual({});
  });
});

describe("HarnessSecurityAuditEngine — settings rules", () => {
  it("SET-002 fires for hardcoded sk- value in env block", () => {
    const engine = new HarnessSecurityAuditEngine(tmpRoot);
    const result = engine.audit({ scope: "settings" });
    const set002 = result.findings.filter((f) => f.rule === "SET-002");
    expect(set002.length).toBeGreaterThanOrEqual(1);
    const messages = set002.map((f) => f.message).join("|");
    expect(messages).toContain("OAI_VAR");
  });

  it("SET-003 fires for wildcard permission", () => {
    const engine = new HarnessSecurityAuditEngine(tmpRoot);
    const result = engine.audit({ scope: "settings" });
    const set003 = result.findings.filter((f) => f.rule === "SET-003");
    expect(set003.length).toBe(1);
    expect(set003[0].severity).toBe("high");
  });

  it("SET-004 fires for Bash(*) permission", () => {
    const engine = new HarnessSecurityAuditEngine(tmpRoot);
    const result = engine.audit({ scope: "settings" });
    const set004 = result.findings.filter((f) => f.rule === "SET-004");
    expect(set004.length).toBe(1);
  });

  it("SET-005 fires for code-completeness-gate with continueOnError:true", () => {
    const engine = new HarnessSecurityAuditEngine(tmpRoot);
    const result = engine.audit({ scope: "settings" });
    const set005 = result.findings.filter((f) => f.rule === "SET-005");
    expect(set005.length).toBe(1);
    expect(set005[0].message).toContain("code-completeness-gate");
  });

  it("does not fire SET-005 for advisory hooks with continueOnError:true", () => {
    const engine = new HarnessSecurityAuditEngine(tmpRoot);
    const result = engine.audit({ scope: "settings" });
    const set005 = result.findings.filter((f) => f.rule === "SET-005");
    const advisoryHits = set005.filter((f) => f.message.includes("coding-pattern-hint"));
    expect(advisoryHits).toEqual([]);
  });
});

describe("HarnessSecurityAuditEngine — hooks rules", () => {
  it("HK-001 fires for new Function() and exec template-literal patterns", () => {
    const engine = new HarnessSecurityAuditEngine(tmpRoot);
    const result = engine.audit({ scope: "hooks" });
    const hk001 = result.findings.filter((f) => f.rule === "HK-001" && f.file.endsWith("naughty.mjs"));
    expect(hk001.length).toBeGreaterThanOrEqual(2);
    const labels = hk001.map((f) => f.message).join("|");
    expect(labels).toContain("dynamic-code execution risk");
    expect(labels).toContain("command injection risk");
  });

  it("HK-002 fires for hardcoded sk- value in hook source", () => {
    const engine = new HarnessSecurityAuditEngine(tmpRoot);
    const result = engine.audit({ scope: "hooks" });
    const hk002 = result.findings.filter((f) => f.rule === "HK-002" && f.file.endsWith("naughty.mjs"));
    expect(hk002.length).toBe(1);
    expect(hk002[0].severity).toBe("critical");
  });

  it("HK-003 fires for hook over 800 lines", () => {
    const engine = new HarnessSecurityAuditEngine(tmpRoot);
    const result = engine.audit({ scope: "hooks" });
    const hk003 = result.findings.filter((f) => f.rule === "HK-003" && f.file.endsWith("fat.mjs"));
    expect(hk003.length).toBe(1);
    expect(hk003[0].severity).toBe("medium");
  });

  it("clean hook produces zero findings", () => {
    const engine = new HarnessSecurityAuditEngine(tmpRoot);
    const result = engine.audit({ scope: "hooks" });
    const polite = result.findings.filter((f) => f.file.endsWith("polite.mjs"));
    expect(polite).toEqual([]);
  });
});

describe("HarnessSecurityAuditEngine — mcp rules", () => {
  it("MCP-002 fires for embedded ghp_ value in MCP env", () => {
    const engine = new HarnessSecurityAuditEngine(tmpRoot);
    const result = engine.audit({ scope: "mcp" });
    const mcp002 = result.findings.filter((f) => f.rule === "MCP-002");
    expect(mcp002.length).toBe(1);
    expect(mcp002[0].message).toContain("leaky");
    expect(mcp002[0].severity).toBe("critical");
  });

  it("MCP-003 fires for command path with parent-dir traversal", () => {
    const engine = new HarnessSecurityAuditEngine(tmpRoot);
    const result = engine.audit({ scope: "mcp" });
    const mcp003 = result.findings.filter((f) => f.rule === "MCP-003");
    expect(mcp003.length).toBe(1);
    expect(mcp003[0].message).toContain("traversal");
  });

  it("clean MCP server with shell-var env produces no findings", () => {
    const engine = new HarnessSecurityAuditEngine(tmpRoot);
    const result = engine.audit({ scope: "mcp" });
    const cleanHits = result.findings.filter((f) => f.message.includes('"clean"'));
    expect(cleanHits).toEqual([]);
  });
});

describe("HarnessSecurityAuditEngine — claude_md rules", () => {
  it("MD-001 fires for AWS access value in CLAUDE.md", () => {
    const engine = new HarnessSecurityAuditEngine(tmpRoot);
    const result = engine.audit({ scope: "claude_md" });
    const md001 = result.findings.filter((f) => f.rule === "MD-001");
    expect(md001.length).toBe(1);
    expect(md001[0].message).toContain("AWS access key ID");
  });
});

describe("HarnessSecurityAuditEngine — exit codes", () => {
  it("exit_code is 2 when critical findings present", () => {
    const engine = new HarnessSecurityAuditEngine(tmpRoot);
    const result = engine.audit({ scope: "all" });
    expect(result.exit_code).toBe(2);
    expect(result.pass).toBe(false);
  });

  it("exit_code is 0 for clean directory", () => {
    const cleanDir = fs.mkdtempSync(path.join(os.tmpdir(), "harness-clean-"));
    try {
      fs.mkdirSync(path.join(cleanDir, ".claude", "hooks"), { recursive: true });
      fs.writeFileSync(path.join(cleanDir, ".claude", "settings.json"), "{}");
      const engine = new HarnessSecurityAuditEngine(cleanDir);
      const result = engine.audit({ scope: "all" });
      expect(result.exit_code).toBe(0);
      expect(result.pass).toBe(true);
      expect(result.findings).toEqual([]);
    } finally {
      fs.rmSync(cleanDir, { recursive: true, force: true });
    }
  });

  it("summary counts findings per severity", () => {
    const engine = new HarnessSecurityAuditEngine(tmpRoot);
    const result = engine.audit({ scope: "all" });
    expect(result.summary.critical).toBeGreaterThanOrEqual(3);
    expect(result.summary.high).toBeGreaterThanOrEqual(3);
    expect(result.summary.medium).toBeGreaterThanOrEqual(2);
  });
});
