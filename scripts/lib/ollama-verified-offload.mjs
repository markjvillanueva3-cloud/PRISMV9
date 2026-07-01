// scripts/lib/ollama-verified-offload.mjs
// U-VERIFIED-OFFLOAD (2026-06-09, slot:alpha): the keystone that makes Ollama
// AUTO-offload safe at "100% accuracy". Spec: state/shared/specs/OLLAMA-VERIFIED-OFFLOAD.md
//
// THE INSIGHT: a local LLM is NOT 100% accurate generatively. You get 100% NET
// accuracy only by WRAPPING the offload in code that VERIFIES the output, with a
// fail-safe fallback to the real (Claude/raw) path. The model proposes; code
// disposes. This wrapper is that contract -- it NEVER returns an unverified Ollama
// result as if trusted.
//
// Distinct from the ~20 existing ollama hooks (which SUGGEST/advise, saturated +
// non-converting): this is verified auto-EXECUTION. R8-dedup in the spec.
//
// DESIGN: `run` is INJECTED (the consumer passes its ollama caller, e.g.
// `callOllamaOnce` from ollama-fanout.mjs), so this lib has ZERO ollama dependency
// and is hermetically testable (R9). It is pure orchestration with fail-safe
// semantics:
//   run() -> raw    (throws / empty -> fallback)
//   verify(raw)     (pure code check: schema/enum/exit-code/existence/sha-anchor)
//                   returns boolean OR {ok, value} (value lets verify return the
//                   validated/parsed object, e.g. JSON.parse + schema-check)
//   on verify-pass  -> { source:'ollama', verified:true, value }
//   on verify-fail / run-throw / run-empty / verify-throw -> fallback()
//
// fallback is REQUIRED: you may not auto-offload without a trusted fallback. If
// fallback itself throws, that error propagates (it is the real path -- a genuine
// failure must surface, not be swallowed).

/**
 * verifiedOffload -- run an Ollama task, accept its output ONLY if a code verifier
 * passes, else fall back to the trusted path. ASCII-only, fail-safe.
 *
 * @param {object}   o
 * @param {()=>Promise<any>} o.run        async Ollama caller (injected)
 * @param {(raw:any)=>boolean|{ok:boolean,value?:any}} o.verify  PURE verifier
 * @param {()=>Promise<any>} o.fallback   trusted path (REQUIRED)
 * @param {string}   [o.label]            for telemetry/debug
 * @param {(rec:object)=>void} [o.onResult]  optional telemetry sink (best-effort)
 * @returns {Promise<{value:any, source:'ollama'|'fallback', verified:boolean,
 *                    fellBack:boolean, reason:string, label?:string}>}
 */
export async function verifiedOffload({ run, verify, fallback, label, onResult } = {}) {
  if (typeof run !== "function") throw new TypeError("verifiedOffload: run must be a function");
  if (typeof verify !== "function") throw new TypeError("verifiedOffload: verify must be a function");
  if (typeof fallback !== "function") throw new TypeError("verifiedOffload: fallback is REQUIRED (no safe auto-offload without a fallback)");

  const emit = (rec) => { try { if (onResult) onResult({ label, ...rec }); } catch { /* telemetry never breaks the offload */ } };
  const fellBackResult = async (reason) => {
    const value = await fallback(); // a fallback throw propagates -- it is the real path
    const rec = { value, source: "fallback", verified: false, fellBack: true, reason, label };
    emit(rec);
    return rec;
  };

  // 1) run the Ollama task -- any throw or empty result falls back.
  let raw;
  try {
    raw = await run();
  } catch {
    return fellBackResult("run-threw");
  }
  if (raw === null || raw === undefined || raw === "") {
    return fellBackResult("run-empty");
  }

  // 2) verify with pure code. A verify-throw is treated as a verify-fail (never trust).
  let v;
  try {
    v = verify(raw);
  } catch {
    return fellBackResult("verify-threw");
  }

  // verify may return a boolean, or {ok, value} to hand back the validated value.
  const ok = v === true || (v && typeof v === "object" && v.ok === true);
  if (!ok) {
    return fellBackResult("verify-failed");
  }
  const value = v && typeof v === "object" && "value" in v ? v.value : raw;
  const rec = { value, source: "ollama", verified: true, fellBack: false, reason: "verified", label };
  emit(rec);
  return rec;
}

// ---- ready-made verifiers (the common 100%-accurate cases) ----

/** enumMember -- the Ollama output (trimmed) must be one of a fixed allow-set.
 * Returns {ok, value:<canonical match>} so a near-match (case/space) snaps to the
 * canonical member. 100% because it can only ever return a real allowed value. */
export function enumMember(allowed) {
  const set = new Map(allowed.map((a) => [String(a).trim().toLowerCase(), a]));
  return (raw) => {
    const k = String(raw == null ? "" : raw).trim().toLowerCase();
    return set.has(k) ? { ok: true, value: set.get(k) } : false;
  };
}

/** jsonSchema -- parse the Ollama output as JSON and require a predicate to pass.
 * Returns the PARSED object as value on success. A parse error -> verify-fail. */
export function jsonShape(predicate) {
  return (raw) => {
    let obj;
    try { obj = typeof raw === "string" ? JSON.parse(raw) : raw; } catch { return false; }
    let ok = false;
    try { ok = predicate(obj) === true; } catch { return false; }
    return ok ? { ok: true, value: obj } : false;
  };
}

/** nonEmptyText -- output must be a non-trivial string >= minLen after trim.
 * The WEAKEST verifier -- use only when the output is advisory (narration), never
 * for a decision the system acts on unverified. */
export function nonEmptyText(minLen = 1) {
  return (raw) => {
    const s = typeof raw === "string" ? raw.trim() : "";
    return s.length >= minLen ? { ok: true, value: s } : false;
  };
}
