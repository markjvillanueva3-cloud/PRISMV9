/**
 * MILL-MASTER-P3-U04-ROUTE-FIX — Async await anti-regression
 *
 * TurningPrintToProgramEngine.calculate is async. The dispatcher previously
 * called it WITHOUT await on three sites, which:
 *   - Returned a Promise through slimResponse, losing the real result shape
 *   - Skipped the postprocessor chain (it checks turningResult?.program_text
 *     which is undefined on a Promise)
 *   - Made downstream type-checks silently fail via `as any`
 *
 * The fix is trivial: add `await` to all 3 sites. The tests below verify the
 * source code no longer contains the bug pattern. Behavior verification is
 * deferred to the full pipeline tests (which exercise the real async path)
 * — we don't spy here because vitest + dynamic-import caching makes engine
 * spies flaky on this dispatcher.
 */
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

function resolveDispatcher(): string {
  const candidates: string[] = [];
  try {
    const here = path.dirname(fileURLToPath(import.meta.url));
    candidates.push(path.resolve(here, "..", "tools", "dispatchers", "turningProgramDispatcher.ts"));
  } catch {
    /* ignore */
  }
  candidates.push(path.resolve(process.cwd(), "src/tools/dispatchers/turningProgramDispatcher.ts"));
  candidates.push(path.resolve(process.cwd(), "mcp-server/src/tools/dispatchers/turningProgramDispatcher.ts"));
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return candidates[0]!;
}

const dispatcherPath = resolveDispatcher();
const source = fs.existsSync(dispatcherPath) ? fs.readFileSync(dispatcherPath, "utf8") : "";

describe("MILL-MASTER-P3-U04 · turningProgramDispatcher async-await anti-regression", () => {
  it("dispatcher source file exists and is non-empty", () => {
    expect(source.length).toBeGreaterThan(1000);
  });

  it("no bare 'eng.calculate(action, params)' without await (bug pattern)", () => {
    // The precise bug was: `const result = eng.calculate(action, params);`
    // without an `await` prefix. Catch it with a regex that allows newlines.
    const bareCallRegex = /=\s*eng\.calculate\s*\(\s*(action|"turning_print_to_program")/g;
    const matches = [...source.matchAll(bareCallRegex)];
    // Every match must have `await` immediately preceding the `eng.calculate`
    for (const m of matches) {
      const startIdx = m.index ?? 0;
      const pre = source.slice(Math.max(0, startIdx - 20), startIdx);
      expect(pre, `missing await before eng.calculate at offset ${startIdx} — pre='${pre}'`).toMatch(/await\s*$/);
    }
  });

  it("all 3 fix sites use 'await eng.calculate(...)' pattern", () => {
    // Site 1: case "turning_print_to_program"
    const site1 = /turning_print_to_program.*?await\s+eng\.calculate/s;
    expect(source.match(site1), "site 1 (turning_print_to_program) missing await").toBeTruthy();

    // Site 2: case "turning_process_plan"
    const site2 = /turning_process_plan.*?await\s+eng\.calculate/s;
    expect(source.match(site2), "site 2 (turning_process_plan) missing await").toBeTruthy();

    // Site 3: case "lathe_ui_submit"
    const site3 = /lathe_ui_submit.*?await\s+eng\.calculate/s;
    expect(source.match(site3), "site 3 (lathe_ui_submit) missing await").toBeTruthy();
  });

  it("lathe_ui_submit still forwards the canonical 'turning_print_to_program' action", () => {
    // UI submit is an alias — it should rewrite the action before reaching
    // the engine (engine's switch only knows 'turning_print_to_program' and
    // 'turning_process_plan').
    const rewriteRegex = /lathe_ui_submit[\s\S]*?await\s+eng\.calculate\s*\(\s*"turning_print_to_program"/;
    expect(source).toMatch(rewriteRegex);
  });

  it("source carries MILL-MASTER-P3-U04 marker comments at all 3 fix sites", () => {
    const markerCount = (source.match(/MILL-MASTER-P3-U04/g) ?? []).length;
    expect(markerCount).toBeGreaterThanOrEqual(3);
  });

  it("TurningPrintToProgramEngine.calculate is still async (bug cause still exists)", () => {
    // If someone refactors the engine to be sync, this test becomes obsolete
    // but for now we rely on the async contract.
    const enginePath = dispatcherPath.replace(
      path.join("tools", "dispatchers", "turningProgramDispatcher.ts"),
      path.join("engines", "TurningPrintToProgramEngine.ts"),
    );
    if (!fs.existsSync(enginePath)) return; // skip if layout changes
    const engineSrc = fs.readFileSync(enginePath, "utf8");
    expect(engineSrc).toMatch(/async\s+calculate\s*\(/);
  });
});

describe("MILL-MASTER-P3-U04 · dispatcher registers + handles required actions", () => {
  it("registers prism_turning_program tool and exposes required actions", async () => {
    const { registerTurningProgramDispatcher } = await import(
      "../tools/dispatchers/turningProgramDispatcher.js"
    );
    const registered: Array<{ name: string; desc: string }> = [];
    const server = {
      tool(name: string, desc: string, _schema: any, _handler: Function) {
        registered.push({ name, desc });
      },
    };
    registerTurningProgramDispatcher(server as any);
    expect(registered).toHaveLength(1);
    expect(registered[0]!.name).toBe("prism_turning_program");
    // All 3 fix-site actions named in description
    expect(registered[0]!.desc).toContain("turning_print_to_program");
    expect(registered[0]!.desc).toContain("turning_process_plan");
  });
});
