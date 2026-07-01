/**
 * ZuluAdaptiveBackPressureEngine (C5) -- dispatcher round-trip (R15 E2E).
 *
 * Exercises backpressure_record_sample / backpressure_assess / backpressure_status
 * THROUGH registerSessionDispatcher. HERMETIC: PRISM_ZULU_BACKPRESSURE_PATH -> a unique
 * tmp store at top-level before any dispatch (the dispatcher lazy-imports the engine, so
 * the singleton binds the tmp path on first call -- no live-store accretion).
 */
import { describe, it, expect, afterAll } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

const TMP_STORE = path.join(os.tmpdir(), `zulu-bp-dispatch-${process.pid}-${Math.random().toString(36).slice(2)}.json`);
process.env.PRISM_ZULU_BACKPRESSURE_PATH = TMP_STORE;

afterAll(() => {
  try {
    const dir = path.dirname(TMP_STORE);
    for (const f of fs.readdirSync(dir)) {
      if (f.startsWith(path.basename(TMP_STORE))) fs.rmSync(path.join(dir, f), { force: true });
    }
  } catch { /* best-effort */ }
});

type Handler = (args: { action: string; params?: Record<string, unknown> }) => Promise<{ content: Array<{ type: "text"; text: string }> }>;

async function captureInvoke() {
  const { registerSessionDispatcher } = await import("../tools/dispatchers/sessionDispatcher.js");
  let captured: Handler | undefined;
  registerSessionDispatcher({ tool: (_n: string, _d: string, _s: unknown, h: Handler) => { captured = h; } } as never);
  if (typeof captured !== "function") throw new Error("dispatcher did not register a handler");
  return async (action: string, params: Record<string, unknown>) =>
    JSON.parse((await captured!({ action, params })).content[0].text) as Record<string, never>;
}

describe("prism_session backpressure_* round-trip (R15 E2E, hermetic tmp store)", () => {
  it("record 3 sustained-high samples -> assess high -> status lists it", async () => {
    const invoke = await captureInvoke();
    for (const t of ["11:58", "11:59", "12:00"]) {
      const r = await invoke("backpressure_record_sample", { slot: "alpha", queue_depth: 12, error_rate: 0.1, now: `2026-06-15T${t}:00.000Z` });
      expect((r.result as { ok: boolean }).ok).toBe(true);
    }
    const a = await invoke("backpressure_assess", { slot: "alpha", now: "2026-06-15T12:00:00.000Z" });
    expect((a.signal as { pressure_level: string }).pressure_level).toBe("high");
    expect((a.signal as { advisory: boolean }).advisory).toBe(true);

    const st = await invoke("backpressure_status", { now: "2026-06-15T12:00:00.000Z" });
    expect((st.count as unknown as number) >= 1).toBe(true);
    expect((st.signals as Array<{ slot: string }>)[0].slot).toBe("alpha");
  });

  it("record_sample REJECTS bad input through the dispatcher (no throw)", async () => {
    const invoke = await captureInvoke();
    const r = await invoke("backpressure_record_sample", { slot: "bravo", queue_depth: -3, error_rate: 0, now: "2026-06-15T12:00:00.000Z" });
    expect((r.result as { ok: boolean }).ok).toBe(false);
  });

  it("assess on an unknown slot -> low (advisory, never throttles blind)", async () => {
    const invoke = await captureInvoke();
    const a = await invoke("backpressure_assess", { slot: "zzz-unknown", now: "2026-06-15T12:00:00.000Z" });
    expect((a.signal as { pressure_level: string }).pressure_level).toBe("low");
  });
});
