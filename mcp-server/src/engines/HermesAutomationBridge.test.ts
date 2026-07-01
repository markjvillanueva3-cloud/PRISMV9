/**
 * HermesAutomationBridge tests -- hermetic (temp fixture home, injected spawn).
 * Covers: mock-default, dual-key live, sandbox-deny, read-only inspection
 * (status/probe/auth/cron/skill), live spawn happy + timeout + non-zero,
 * and adversarial arg guards. No dependency on a real Hermes install.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  HermesAutomationBridge,
  resolveHermesHome,
  userProfileHermesCandidates,
  type HermesRoutineSpec,
} from "./HermesAutomationBridge.js";

let home: string;
let exe: string;

beforeAll(() => {
  home = mkdtempSync(join(tmpdir(), "hermes-fixture-"));
  exe = join(home, "hermes.exe");
  writeFileSync(exe, ""); // dummy exe so existsSync(exe) passes in live-spawn tests
  writeFileSync(join(home, "active_profile"), "zulu");
  mkdirSync(join(home, "profiles", "zulu", "skills", "prism", "prism-vault-loop"), { recursive: true });
  writeFileSync(
    join(home, "profiles", "zulu", "skills", "prism", "prism-vault-loop", "SKILL.md"),
    "---\nname: prism-vault-loop\n---\nbody",
  );
  mkdirSync(join(home, "cron"), { recursive: true });
  writeFileSync(
    join(home, "cron", "jobs.json"),
    JSON.stringify([
      { id: "a1", name: "morning brief", skill: "prism-vault-loop", model: "gpt-oss:120b", schedule_display: "7 6 * * *", enabled: true, last_run_at: "2026-06-10" },
    ]),
  );
  // 2 OAuth (1 expired vs now=1000), 1 api-key
  writeFileSync(
    join(home, "auth.json"),
    JSON.stringify({
      active_provider: "anthropic",
      anthropic: [
        { id: "ok1", label: "dashboard PKCE", auth_type: "oauth", expiresAt: 9_999_999_999_999, status: "ok" },
        { id: "exp1", label: "old", auth_type: "oauth", expiresAt: 1, status: "ok" },
      ],
      "openai-api": [{ id: "api1", auth_type: "api_key" }],
    }),
  );
  writeFileSync(join(home, ".anthropic_oauth.json"), JSON.stringify({ accessToken: "x", refreshToken: "y", expiresAt: 1 }));
});

afterAll(() => {
  rmSync(home, { recursive: true, force: true });
});

describe("HermesAutomationBridge -- safety posture", () => {
  it("is mock-by-default", () => {
    const b = new HermesAutomationBridge({ home, exe });
    expect(b.mock).toBe(true);
    const r = b.run(["model", "list"]);
    expect((r.value as Record<string, unknown>).wouldRun).toBe(true);
    expect((r.value as Record<string, unknown>).args).toEqual(["model", "list"]);
  });

  it("grants the sandbox at tier=sandbox (process-spawn allowed)", () => {
    const b = new HermesAutomationBridge({ home, exe, tier: "sandbox" });
    expect(b.sandboxAllowed).toBe(true);
    expect(b.verdict.verdict).toBe("allowed");
  });

  it("DENIES process-spawn at tier=shop_floor and refuses a live run", () => {
    let called = 0;
    const spy = () => {
      called++;
      return "should-not-run";
    };
    const b = new HermesAutomationBridge({ home, exe, tier: "shop_floor", mock: false, spawn: spy });
    expect(b.sandboxAllowed).toBe(false);
    const r = b.run(["model", "list"]);
    expect(r.value).toBeNull();
    expect(r.confidence).toBe(0);
    expect(r.warning).toContain("sandbox denied");
    expect(called).toBe(0); // never spawned
  });
});

describe("HermesAutomationBridge -- read-only inspection", () => {
  it("status reports exe/home/mock/sandbox", () => {
    const v = new HermesAutomationBridge({ home, exe }).status().value as Record<string, unknown>;
    expect(v.exeExists).toBe(true);
    expect(v.homeExists).toBe(true);
    expect(v.mock).toBe(true);
    expect(v.activeProfile).toBe("zulu");
    expect(v.sandbox).toBe("allowed");
  });

  it("probe lists profiles and folds auth health", () => {
    const v = new HermesAutomationBridge({ home, exe, now: () => 1000 }).probe().value as Record<string, unknown>;
    expect(v.installed).toBe(true);
    expect(v.profiles).toContain("zulu");
    expect((v.auth as Record<string, unknown>).oauthCount).toBe(2);
  });

  it("auth_status counts OAuth + flags expired (subscription health)", () => {
    const v = new HermesAutomationBridge({ home, exe, now: () => 1000 }).authStatus().value as Record<string, unknown>;
    expect(v.activeProvider).toBe("anthropic");
    expect(v.oauthCount).toBe(2);
    expect(v.expiredCount).toBe(1);
    expect(v.expiredIds).toEqual(["exp1"]);
    expect(v.legacyTokenExpired).toBe(true);
  });

  it("cron_list parses jobs.json", () => {
    const v = new HermesAutomationBridge({ home, exe }).cronList().value as Record<string, unknown>;
    expect(v.count).toBe(1);
    expect((v.jobs as Array<Record<string, unknown>>)[0]).toMatchObject({ id: "a1", skill: "prism-vault-loop", model: "gpt-oss:120b" });
  });

  it("skill_list finds the zulu profile skill", () => {
    const v = new HermesAutomationBridge({ home, exe }).skillList().value as Record<string, unknown>;
    expect(v.count).toBeGreaterThanOrEqual(1);
    expect((v.skills as Array<Record<string, unknown>>).some((s) => s.name === "prism-vault-loop")).toBe(true);
  });

  it("probe fails loud when Hermes home is absent (no fabrication)", () => {
    const v = new HermesAutomationBridge({ home: join(home, "does-not-exist"), exe }).probe();
    expect((v.value as Record<string, unknown>).installed).toBe(false);
    expect(v.warning).toContain("not found");
  });
});

describe("HermesAutomationBridge -- live spawn (injected, dual-key bypassed via mock:false)", () => {
  it("spawns the CLI and returns real stdout", () => {
    const calls: Array<{ file: string; args: string[] }> = [];
    const spawn = (file: string, args: string[]) => {
      calls.push({ file, args });
      return "available models: gpt-oss:120b";
    };
    const b = new HermesAutomationBridge({ home, exe, mock: false, spawn });
    const r = b.run(["model", "list"]);
    expect(r.source).toBe("hermes-cli");
    expect(r.confidence).toBe(0.95);
    expect((r.value as Record<string, unknown>).stdout).toContain("available models");
    expect(calls[0]).toEqual({ file: exe, args: ["model", "list"] });
  });

  it("fail-closes on timeout (killed child is never a success)", () => {
    const spawn = () => {
      const e = new Error("timeout") as Error & { killed?: boolean };
      e.killed = true;
      throw e;
    };
    const r = new HermesAutomationBridge({ home, exe, mock: false, spawn }).run(["agent", "run"]);
    expect(r.value).toBeNull();
    expect(r.confidence).toBe(0);
    expect(r.warning).toContain("timed out");
  });

  it("surfaces non-zero exit stderr without fabricating success", () => {
    const spawn = () => {
      const e = new Error("nonzero") as Error & { status?: number; stderr?: string };
      e.status = 2;
      e.stderr = "unknown subcommand";
      throw e;
    };
    const r = new HermesAutomationBridge({ home, exe, mock: false, spawn }).run(["bogus"]);
    expect(r.confidence).toBe(0);
    expect((r.value as Record<string, unknown>).code).toBe(2);
    expect((r.value as Record<string, unknown>).stderr).toBe("unknown subcommand");
    expect(r.warning).toContain("non-zero");
  });

  it("modelList returns a labeled mock list containing a known model in mock mode", () => {
    const r = new HermesAutomationBridge({ home, exe }).modelList();
    expect(r.source).toBe("mock");
    const models = (r.value as Record<string, unknown>).models as string[];
    expect(Array.isArray(models)).toBe(true);
    expect(models).toContain("gpt-oss:120b");
  });
});

describe("HermesAutomationBridge -- adversarial arg guards", () => {
  it("rejects an empty args array", () => {
    const r = new HermesAutomationBridge({ home, exe, mock: false }).run([]);
    expect(r.value).toBeNull();
    expect(r.warning).toContain("non-empty");
  });

  it("rejects too many args (runaway guard)", () => {
    const r = new HermesAutomationBridge({ home, exe, mock: false }).run(Array(100).fill("x"));
    expect(r.value).toBeNull();
    expect(r.warning).toContain("rejected");
  });

  it("rejects an oversize single arg", () => {
    const r = new HermesAutomationBridge({ home, exe, mock: false }).run(["x".repeat(5000)]);
    expect(r.value).toBeNull();
    expect(r.warning).toContain("rejected");
  });
});

describe("HermesAutomationBridge -- routinePlan (emit-only Hermes automations)", () => {
  // repo root = up from mcp-server/src/engines (this test file's dir).
  const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
  const routinesOf = (opts?: { deliver?: string; prismRoot?: string }): HermesRoutineSpec[] =>
    (new HermesAutomationBridge({ home, exe }).routinePlan(opts).value as Record<string, unknown>).routines as HermesRoutineSpec[];
  // a valid schedule is a Hermes human interval ("every 4h") OR a 5-field cron expr.
  const isValidSchedule = (s: string): boolean => /^every \d+[smhd]$/.test(s) || /^(\S+\s+){4}\S+$/.test(s);

  it("emits >=4 manufacturing routines, telegram by default", () => {
    const v = new HermesAutomationBridge({ home, exe }).routinePlan().value as Record<string, unknown>;
    const routines = v.routines as HermesRoutineSpec[];
    expect(v.deliver).toBe("telegram");
    expect(routines.length).toBeGreaterThanOrEqual(4);
    expect(v.count).toBe(routines.length);
  });

  it("every command is a well-formed `hermes cron create` line with name + deliver + valid schedule", () => {
    for (const r of routinesOf()) {
      expect(r.command.startsWith("hermes cron create ")).toBe(true);
      expect(r.command).toContain(`--name "${r.name}"`);
      expect(r.command).toContain("--deliver telegram");
      expect(r.command).toContain(`"${r.schedule}"`);
      expect(isValidSchedule(r.schedule)).toBe(true);
    }
  });

  it("silent flag matches the [SILENT] no-spam pattern in the prompt", () => {
    for (const r of routinesOf()) {
      expect(r.prompt.includes("[SILENT]")).toBe(r.silent);
    }
  });

  it("no prompt contains a double-quote or backtick (shell-paste + hermes_run safety)", () => {
    for (const r of routinesOf()) {
      expect(r.prompt.includes('"')).toBe(false); // would break the double-quote wrapping
      expect(r.prompt.includes("`")).toBe(false); // backticks inside dquotes = bash command substitution
    }
  });

  it("every referenced PRISM script exists on disk (no broken routine -- R12)", () => {
    for (const r of routinesOf({ prismRoot: repoRoot })) {
      for (const path of r.reads) expect(existsSync(path)).toBe(true);
      if (r.script) expect(existsSync(r.script)).toBe(true);
    }
  });

  it("the close-out routine wires --script to the verified stdout-printing audit script", () => {
    const closeout = routinesOf({ prismRoot: repoRoot }).find((r) => r.id === "prism-closeout-watch");
    expect(closeout?.id).toBe("prism-closeout-watch");
    expect(closeout!.script).toContain("audit-close-out-candidates.mjs");
    expect(closeout!.command).toContain(`--script "${closeout!.script}"`);
    expect(existsSync(closeout!.script!)).toBe(true);
  });

  it("deliver override propagates into every command", () => {
    const v = new HermesAutomationBridge({ home, exe }).routinePlan({ deliver: "slack" }).value as Record<string, unknown>;
    expect(v.deliver).toBe("slack");
    for (const r of v.routines as HermesRoutineSpec[]) expect(r.command).toContain("--deliver slack");
  });

  it("warns on an unknown deliver target but still emits (operator override)", () => {
    const out = new HermesAutomationBridge({ home, exe }).routinePlan({ deliver: "carrierpigeon" });
    expect(out.warning).toContain("not a known");
    expect((out.value as Record<string, unknown>).count).toBeGreaterThanOrEqual(4);
  });

  it("is install-independent: emits even when the Hermes home is absent", () => {
    const v = new HermesAutomationBridge({ home: join(home, "nope"), exe }).routinePlan().value as Record<string, unknown>;
    expect((v.routines as HermesRoutineSpec[]).length).toBeGreaterThanOrEqual(4);
  });

  it("normalizes a trailing slash on prismRoot (no double separator)", () => {
    const withScript = routinesOf({ prismRoot: "X:/proot/" }).find((r) => r.script);
    expect(withScript?.id).toBe("prism-closeout-watch"); // the only --script routine; guard before non-null access
    expect(withScript!.script).toContain("X:/proot/scripts/");
    expect(withScript!.script!.includes("//")).toBe(false);
  });

  it("warns when prismRoot contains whitespace (paste-safety, R12)", () => {
    const out = new HermesAutomationBridge({ home, exe }).routinePlan({ prismRoot: "C:/My Shop/prism" });
    expect(out.warning).toContain("whitespace");
    expect((out.value as Record<string, unknown>).count).toBeGreaterThanOrEqual(4);
  });

  it("warns on a shell-unsafe deliver target (interpolated unquoted)", () => {
    const out = new HermesAutomationBridge({ home, exe }).routinePlan({ deliver: "slack;rm" });
    expect(out.warning).toContain("shell-unsafe");
    expect((out.value as Record<string, unknown>).count).toBeGreaterThanOrEqual(4);
  });

  it("warns when prismRoot would inject command substitution ($) into a prompt", () => {
    const out = new HermesAutomationBridge({ home, exe }).routinePlan({ prismRoot: "H:/$(whoami)/prism" });
    expect(out.warning).toContain("defense-in-depth");
    expect((out.value as Record<string, unknown>).count).toBeGreaterThanOrEqual(4);
  });
});

describe("resolveHermesHome -- robust home resolution (SYSTEM-profile recovery)", () => {
  const SYS = "C:\\WINDOWS\\system32\\config\\systemprofile";
  const sysHome = join(SYS, "AppData", "Local", "hermes");
  const realHome = join("C:\\Users", "wompu", "AppData", "Local", "hermes");

  it("env PRISM_HERMES_HOME override always wins", () => {
    const got = resolveHermesHome({ PRISM_HERMES_HOME: "D:\\custom\\hermes" }, {
      homeFn: () => SYS,
      existsFn: () => false, // even with nothing on disk, the override is returned verbatim
    });
    expect(got).toBe("D:\\custom\\hermes");
  });

  it("returns the homedir path unchanged when it exists (normal user run)", () => {
    const got = resolveHermesHome({}, {
      homeFn: () => "C:\\Users\\wompu",
      existsFn: (p) => p === realHome, // homedir-derived hermes home is present
      candidatesFn: () => {
        throw new Error("must NOT scan when the homedir path exists");
      },
    });
    expect(got).toBe(realHome);
  });

  it("recovers the real user install when homedir is the SYSTEM profile", () => {
    // homedir() -> systemprofile (no hermes); the real install is under C:\Users\wompu.
    const got = resolveHermesHome({}, {
      homeFn: () => SYS,
      existsFn: (p) =>
        p === realHome || // candidate dir exists
        p === join(realHome, "config.yaml"), // ...and looks like a real install
      candidatesFn: () => [join("C:\\Users", "Public", "AppData", "Local", "hermes"), realHome],
    });
    expect(got).toBe(realHome);
    expect(got).not.toContain("systemprofile");
  });

  it("falls back to the homedir path (honest homeExists:false) when no install is found anywhere", () => {
    const got = resolveHermesHome({}, {
      homeFn: () => SYS,
      existsFn: () => false, // nothing on disk
      candidatesFn: () => [realHome], // candidate listed but existsFn says it's absent
    });
    expect(got).toBe(sysHome); // honest fallback, not a fabricated path
  });

  it("skips a candidate that exists but does not look like a Hermes install", () => {
    const decoy = join("C:\\Users", "decoy", "AppData", "Local", "hermes");
    const got = resolveHermesHome({}, {
      homeFn: () => SYS,
      // decoy dir exists but has NO config/auth/agent markers; realHome is a true install
      existsFn: (p) => p === decoy || p === realHome || p === join(realHome, "auth.json"),
      candidatesFn: () => [decoy, realHome],
    });
    expect(got).toBe(realHome);
  });
});

describe("userProfileHermesCandidates -- user-profile enumeration", () => {
  const dirent = (name: string, isDir = true) => ({ name, isDirectory: () => isDir }) as never;

  it("returns [] when the users root does not exist (POSIX / non-Windows)", () => {
    const got = userProfileHermesCandidates("C:\\Users", () => false);
    expect(got).toEqual([]);
  });

  it("enumerates real user profiles and skips template/system profiles", () => {
    const got = userProfileHermesCandidates(
      "C:\\Users",
      () => true,
      (() => [
        dirent("wompu"),
        dirent("Public"),
        dirent("Default"),
        dirent("systemprofile"),
        dirent("desktop.ini", false), // a file, not a dir -- excluded
      ]) as never,
    );
    expect(got).toEqual([join("C:\\Users", "wompu", "AppData", "Local", "hermes")]);
  });

  it("fails soft to [] when the users dir is unreadable", () => {
    const got = userProfileHermesCandidates(
      "C:\\Users",
      () => true,
      (() => {
        throw new Error("EACCES");
      }) as never,
    );
    expect(got).toEqual([]);
  });
});
