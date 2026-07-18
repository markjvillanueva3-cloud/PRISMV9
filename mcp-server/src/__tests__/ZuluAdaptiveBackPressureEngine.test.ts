/**
 * ZuluAdaptiveBackPressureEngine (C5) tests -- pure trend core + durable ring store.
 *
 * Pure assessBackPressure: deterministic with injected `now` + explicit samples.
 * Durable: hermetic via __forTests(tmpPath) + injected `now`; unique tmp store per test.
 */
import { describe, it, expect, afterEach } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import {
  ZuluAdaptiveBackPressureEngine,
  ZULU_BACKPRESSURE_DEFAULTS,
  type HealthSample,
} from "../engines/ZuluAdaptiveBackPressureEngine.js";

const E = ZuluAdaptiveBackPressureEngine;
const NOW_ISO = "2026-06-15T12:00:00.000Z";
const NOW = Date.parse(NOW_ISO);

// build N samples for `slot`, newest at t=now, each `stepMs` apart going back.
function samples(slot: string, rows: Array<{ q: number; e: number }>, stepMs = 1000, startMs = NOW): HealthSample[] {
  return rows.map((r, i) => ({ slot, queue_depth: r.q, error_rate: r.e, ts: new Date(startMs - i * stepMs).toISOString() }));
}

const tmpStores: string[] = [];
function tmpEngine(): ZuluAdaptiveBackPressureEngine {
  const p = path.join(os.tmpdir(), `zulu-bp-${process.pid}-${Math.random().toString(36).slice(2)}.json`);
  tmpStores.push(p);
  return ZuluAdaptiveBackPressureEngine.__forTests(p);
}
afterEach(() => {
  for (const p of tmpStores.splice(0)) {
    try { fs.rmSync(p, { force: true }); } catch { /* best-effort */ }
    try {
      const dir = path.dirname(p);
      for (const f of fs.readdirSync(dir)) {
        if (f.startsWith(path.basename(p))) fs.rmSync(path.join(dir, f), { force: true });
      }
    } catch { /* best-effort */ }
  }
});

// ---- PURE: assessBackPressure ------------------------------------------------

describe("assessBackPressure (pure, trend-aware)", () => {
  it("no in-window samples -> low / no-samples-in-window", () => {
    const v = E.assessBackPressure("alpha", [], { now: NOW_ISO });
    expect(v.pressure_level).toBe("low");
    expect(v.cause).toBe("no-samples-in-window");
    expect(v.recommended_delay_ms).toBe(0);
    expect(v.samples_considered).toBe(0);
  });

  it("TREND-aware: a single high spike among nominal does NOT escalate (needs minConsecutiveHigh)", () => {
    // newest sample is a spike; the prior 2 are nominal -> recent-3 has only 1 breach < 3
    const s = samples("alpha", [{ q: 20, e: 0.9 }, { q: 1, e: 0 }, { q: 1, e: 0 }]);
    const v = E.assessBackPressure("alpha", s, { now: NOW_ISO });
    expect(v.pressure_level).toBe("low");
  });

  it("TREND-aware: a COLD slot (window < minConsecutiveHigh) never escalates off 1-2 breaching samples", () => {
    // Regression (3-of-3 arms A+B): a 1-sample window must NOT collapse `need` to 1 and
    // escalate a lone spike. Both an all-breaching 1-sample and 2-sample window stay low.
    const one = E.assessBackPressure("alpha", samples("alpha", [{ q: 99, e: 0.99 }]), { now: NOW_ISO });
    expect(one.pressure_level).toBe("low");
    const two = E.assessBackPressure("alpha", samples("alpha", [{ q: 99, e: 0.99 }, { q: 99, e: 0.99 }]), { now: NOW_ISO });
    expect(two.pressure_level).toBe("low");
    // a full window of 3 sustained breaches still escalates (the fix doesn't suppress real trends).
    const three = E.assessBackPressure("alpha", samples("alpha", [{ q: 99, e: 0.99 }, { q: 99, e: 0.99 }, { q: 99, e: 0.99 }]), { now: NOW_ISO });
    expect(three.pressure_level).toBe("blocked");
  });

  it("sustained high queue (3 recent > queueHigh) -> high", () => {
    const v = E.assessBackPressure("alpha", samples("alpha", [{ q: 12, e: 0 }, { q: 10, e: 0 }, { q: 9, e: 0 }]), { now: NOW_ISO });
    expect(v.pressure_level).toBe("high");
    expect(v.cause).toContain("queue-depth");
    expect(v.recommended_delay_ms).toBe(ZULU_BACKPRESSURE_DEFAULTS.delayMs.high);
  });

  it("sustained high error rate (3 recent > errorHigh) -> high", () => {
    const v = E.assessBackPressure("alpha", samples("alpha", [{ q: 1, e: 0.5 }, { q: 1, e: 0.45 }, { q: 1, e: 0.42 }]), { now: NOW_ISO });
    // 0.5/0.45/0.42 are all > errorHigh(0.4) but < blockedErrorRate(0.5)? 0.5 >= 0.5 -> blocked check first.
    // Make them clearly high-not-blocked:
    const v2 = E.assessBackPressure("alpha", samples("alpha", [{ q: 1, e: 0.45 }, { q: 1, e: 0.43 }, { q: 1, e: 0.41 }]), { now: NOW_ISO });
    expect(v2.pressure_level).toBe("high");
    expect(v2.cause).toContain("error-rate");
    void v;
  });

  it("sustained moderate queue (3 recent >= queueMedium) -> medium", () => {
    const v = E.assessBackPressure("alpha", samples("alpha", [{ q: 5, e: 0 }, { q: 4, e: 0 }, { q: 6, e: 0 }]), { now: NOW_ISO });
    expect(v.pressure_level).toBe("medium");
    expect(v.recommended_delay_ms).toBe(ZULU_BACKPRESSURE_DEFAULTS.delayMs.medium);
  });

  it("blocked: sustained error_rate >= blockedErrorRate -> blocked + escalate", () => {
    const v = E.assessBackPressure("alpha", samples("alpha", [{ q: 1, e: 0.6 }, { q: 1, e: 0.55 }, { q: 1, e: 0.5 }]), { now: NOW_ISO });
    expect(v.pressure_level).toBe("blocked");
    expect(v.escalate).toBe(true);
    expect(v.recommended_delay_ms).toBe(ZULU_BACKPRESSURE_DEFAULTS.delayMs.blocked);
    expect(v.cause).toContain("error-rate");
  });

  it("blocked: sustained extreme queue (>= 2x queueHigh) -> blocked", () => {
    const v = E.assessBackPressure("alpha", samples("alpha", [{ q: 20, e: 0 }, { q: 18, e: 0 }, { q: 16, e: 0 }]), { now: NOW_ISO });
    expect(v.pressure_level).toBe("blocked");
    expect(v.cause).toContain("queue-depth");
  });

  it("window filtering: samples older than windowMs are excluded", () => {
    // 3 high samples but all 10 min old, window 5 min -> excluded -> low
    const old = samples("alpha", [{ q: 20, e: 0.9 }, { q: 20, e: 0.9 }, { q: 20, e: 0.9 }], 1000, NOW - 600_000);
    const v = E.assessBackPressure("alpha", old, { now: NOW_ISO, windowMs: 300_000 });
    expect(v.pressure_level).toBe("low");
    expect(v.samples_considered).toBe(0);
  });

  it("only the assessed slot's samples are considered (mixed-slot input)", () => {
    const mixed = [...samples("alpha", [{ q: 20, e: 0.9 }, { q: 20, e: 0.9 }, { q: 20, e: 0.9 }]), ...samples("bravo", [{ q: 0, e: 0 }])];
    expect(E.assessBackPressure("bravo", mixed, { now: NOW_ISO }).pressure_level).toBe("low");
    expect(E.assessBackPressure("alpha", mixed, { now: NOW_ISO }).pressure_level).toBe("blocked");
  });

  it("advisory flag: default true; opts.advisory=false overrides", () => {
    expect(E.assessBackPressure("alpha", [], { now: NOW_ISO }).advisory).toBe(true);
    expect(E.assessBackPressure("alpha", [], { now: NOW_ISO, advisory: false }).advisory).toBe(false);
  });

  it("adversarial: NaN/negative/out-of-range inputs never throw, clamp safely", () => {
    expect(() => E.assessBackPressure("alpha", null as unknown as HealthSample[], { now: NOW_ISO })).not.toThrow();
    expect(E.assessBackPressure("alpha", null as unknown as HealthSample[], { now: NOW_ISO }).pressure_level).toBe("low");
    // error_rate > 1 clamps to 1 (>= blockedErrorRate) -> sustained -> blocked (clamp, no throw)
    const v = E.assessBackPressure("alpha", samples("alpha", [{ q: 0, e: 5 }, { q: 0, e: 9 }, { q: 0, e: 99 }]), { now: NOW_ISO });
    expect(v.pressure_level).toBe("blocked");
  });
});

// ---- DURABLE: recordSample / recentSamples / assess / status -----------------

describe("recordSample + assess round-trip (durable)", () => {
  it("record 3 sustained-high samples -> assess returns high", () => {
    const eng = tmpEngine();
    eng.recordSample("alpha", { queue_depth: 12, error_rate: 0.1 }, { now: "2026-06-15T11:58:00.000Z" });
    eng.recordSample("alpha", { queue_depth: 10, error_rate: 0.1 }, { now: "2026-06-15T11:59:00.000Z" });
    eng.recordSample("alpha", { queue_depth: 11, error_rate: 0.1 }, { now: "2026-06-15T12:00:00.000Z" });
    expect(eng.recentSamples("alpha", { now: NOW_ISO }).length).toBe(3);
    expect(eng.assess("alpha", { now: NOW_ISO }).pressure_level).toBe("high");
  });

  it("recordSample REJECTS bad input (bad slot, queue<0, error_rate>1) without throwing", () => {
    const eng = tmpEngine();
    expect(eng.recordSample("bad slot!", { queue_depth: 1, error_rate: 0 }).ok).toBe(false);
    expect(eng.recordSample("alpha", { queue_depth: -1, error_rate: 0 }).ok).toBe(false);
    expect(eng.recordSample("alpha", { queue_depth: 1, error_rate: 1.5 }).ok).toBe(false);
    expect(eng.recordSample("alpha", { queue_depth: 1, error_rate: NaN }).ok).toBe(false);
  });

  it("ring-buffer cap: keeps only the most-recent maxSamplesPerSlot", () => {
    const eng = tmpEngine();
    for (let i = 0; i < 8; i++) {
      eng.recordSample("alpha", { queue_depth: i, error_rate: 0 }, { now: new Date(NOW - (8 - i) * 1000).toISOString(), maxSamplesPerSlot: 3 });
    }
    const recent = eng.recentSamples("alpha", { now: NOW_ISO });
    expect(recent.length).toBe(3);
    // most-recent 3 -> queue_depth 5,6,7
    expect(recent.map((s) => s.queue_depth)).toEqual([5, 6, 7]);
  });

  it("window prune: out-of-window samples are dropped on record", () => {
    const eng = tmpEngine();
    eng.recordSample("alpha", { queue_depth: 1, error_rate: 0 }, { now: "2026-06-15T11:50:00.000Z", windowMs: 300_000 }); // 10m before final
    eng.recordSample("alpha", { queue_depth: 2, error_rate: 0 }, { now: "2026-06-15T12:00:00.000Z", windowMs: 300_000 });
    const recent = eng.recentSamples("alpha", { now: NOW_ISO, windowMs: 300_000 });
    expect(recent.length).toBe(1); // the 11:50 sample is >5min before 12:00 -> pruned
    expect(recent[0].queue_depth).toBe(2);
  });

  it("status: lists signals sorted most-severe-first", () => {
    const eng = tmpEngine();
    for (const t of ["11:58", "11:59", "12:00"]) eng.recordSample("alpha", { queue_depth: 20, error_rate: 0.9 }, { now: `2026-06-15T${t}:00.000Z` });
    for (const t of ["11:58", "11:59", "12:00"]) eng.recordSample("bravo", { queue_depth: 0, error_rate: 0 }, { now: `2026-06-15T${t}:00.000Z` });
    const st = eng.status({ now: NOW_ISO });
    expect(st.count).toBe(2);
    expect(st.signals[0].pressure_level).toBe("blocked"); // alpha first (most severe)
    expect(st.signals[0].slot).toBe("alpha");
  });
});

// ---- FAIL-CLOSED + safety ----------------------------------------------------

describe("fail-closed store + advisory safety", () => {
  function freshCorrupt(): string {
    const p = path.join(os.tmpdir(), `zulu-bp-corrupt-${process.pid}-${Math.random().toString(36).slice(2)}.json`);
    tmpStores.push(p);
    fs.writeFileSync(p, "{ not json", "utf8");
    return p;
  }

  it("corrupt store: recordSample THROWS (never silently clobbers)", () => {
    const eng = ZuluAdaptiveBackPressureEngine.__forTests(freshCorrupt());
    expect(() => eng.recordSample("alpha", { queue_depth: 1, error_rate: 0 }, { now: NOW_ISO })).toThrow(/read-only store/);
  });

  it("corrupt store: assess degrades to low (advisory never-veto safe fallback)", () => {
    const eng = ZuluAdaptiveBackPressureEngine.__forTests(freshCorrupt());
    expect(eng.assess("alpha", { now: NOW_ISO }).pressure_level).toBe("low");
  });

  it("corrupt store: status (first read) surfaces readOnly", () => {
    const eng = ZuluAdaptiveBackPressureEngine.__forTests(freshCorrupt());
    expect(eng.status({ now: NOW_ISO }).readOnly).toBe(true);
  });

  it("forward-compat schema version: recordSample refuses (fail-closed)", () => {
    const p = path.join(os.tmpdir(), `zulu-bp-sv-${process.pid}-${Math.random().toString(36).slice(2)}.json`);
    tmpStores.push(p);
    fs.writeFileSync(p, JSON.stringify({ schemaVersion: 999, samples: {} }), "utf8");
    const eng = ZuluAdaptiveBackPressureEngine.__forTests(p);
    expect(() => eng.recordSample("alpha", { queue_depth: 1, error_rate: 0 }, { now: NOW_ISO })).toThrow(/read-only store/);
  });
});
