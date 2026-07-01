/**
 * mcp-preempt-decision.mjs -- pure decision for the watchdog's RSS preemptive
 * restart (MCP-CONCURRENCY-HARDEN, slot golf 2026-06-09).
 *
 * The preempt-restart is a DISCONNECT for every in-flight agent call. Under an
 * ultracode parallel-agent burst RSS legitimately spikes from N concurrent fresh
 * request-servers (MCP-CONCURRENCY-FIX 2026-05-31) -- not a leak -- so restarting
 * then kills the whole burst at the worst moment. This function decides whether to
 * restart now, DEFER until a lull, or skip (no pressure) -- so the destructive
 * kill+respawn path in mcp-server-watchdog.mjs is driven by a unit-tested pure
 * predicate, mirroring the decideRestart() precedent already used for boot-grace.
 *
 * Called ONLY on the healthy probe path (server is up, /health returned 2xx).
 *
 * @param {object} i
 * @param {number|null} i.rssMB            current RSS from /health.memory.rss_mb
 * @param {number}      i.rssThresholdMB   preempt point; <= 0 disables the feature
 * @param {number}      i.rssHardMB        hard ceiling: restart even mid-burst (true leak)
 * @param {number|null} i.inflight         from /health.concurrency.inflight (null = unknown)
 * @param {number}      i.inflightDeferAt  defer while inflight >= this; 0 disables defer
 * @param {number}      i.sinceLastPreemptMs  ms since last preemptive restart
 * @param {number}      i.cooldownMs       min ms between preemptive restarts
 * @param {number|null} i.uptimeSec        server uptime; < 60 = still cold-starting
 * @returns {{action: "restart"|"defer"|"skip", reason: string, inflight: number, hardLeak: boolean}}
 */
export function decidePreemptRestart(i) {
  const rssThresholdMB = Number(i?.rssThresholdMB);
  const rssMB = i?.rssMB;
  // Unknown inflight -> 0 -> never defers (preserves pre-2026-06-09 behavior on an
  // older server whose /health has no concurrency block). This is the fail-safe.
  const inflight = typeof i?.inflight === "number" && Number.isFinite(i.inflight) ? i.inflight : 0;
  const inflightDeferAt = Math.max(0, Number(i?.inflightDeferAt) || 0);
  const rssHardMB = Number(i?.rssHardMB);
  const hardLeak = Number.isFinite(rssHardMB) && rssHardMB > 0 && typeof rssMB === "number" && rssMB >= rssHardMB;

  // Gate 1: feature enabled?
  if (!Number.isFinite(rssThresholdMB) || rssThresholdMB <= 0) {
    return { action: "skip", reason: "preempt-disabled", inflight, hardLeak };
  }
  // Gate 2: usable RSS reading?
  if (typeof rssMB !== "number" || !Number.isFinite(rssMB)) {
    return { action: "skip", reason: "rss-unknown", inflight, hardLeak };
  }
  // Gate 3: actually under pressure?
  if (rssMB < rssThresholdMB) {
    return { action: "skip", reason: "rss-below-threshold", inflight, hardLeak };
  }
  // Gate 4: not still cold-starting (a server booting can legitimately be large).
  const uptimeSec = typeof i?.uptimeSec === "number" && Number.isFinite(i.uptimeSec) ? i.uptimeSec : 0;
  if (uptimeSec < 60) {
    return { action: "skip", reason: "uptime-too-low", inflight, hardLeak };
  }
  // Gate 5: respect the inter-restart cooldown (anti-flap).
  const sinceLastPreemptMs = Number(i?.sinceLastPreemptMs) || 0;
  const cooldownMs = Number(i?.cooldownMs) || 0;
  if (sinceLastPreemptMs < cooldownMs) {
    return { action: "skip", reason: "cooldown", inflight, hardLeak };
  }

  // Pressure confirmed + eligible. Restart now, or defer past the burst?
  const burstActive = inflightDeferAt > 0 && inflight >= inflightDeferAt;
  if (burstActive && !hardLeak) {
    // A parallel-agent burst is in flight and RSS has not crossed the hard ceiling:
    // wait for a lull so the restart does not kill every live agent call at once.
    return { action: "defer", reason: `burst-inflight-${inflight}`, inflight, hardLeak };
  }
  // Either inflight is low (safe lull) or RSS crossed the hard ceiling (genuine
  // runaway leak -- a controlled recycle beats an OOM crash even mid-burst).
  return {
    action: "restart",
    reason: hardLeak ? `hard-ceiling-${rssMB}MB` : `rss-pressure-${rssMB}MB`,
    inflight,
    hardLeak,
  };
}
