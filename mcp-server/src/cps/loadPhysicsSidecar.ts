/**
 * loadPhysicsSidecar — CPS-side sidecar loader (MS0/U-PPGM03).
 *
 * Runs INSIDE Fusion 360 / HSMWorks / Mastercam CPS post engine (Mozilla
 * Rhino-based). MUST NOT depend on Node modules (no fs, no crypto, no
 * Buffer, no require) — every primitive is pure JavaScript portable to
 * Rhino's ES5+ subset.
 *
 * Contract (from MS0/U-PPGM03):
 *   1. Caller (the .cps post) calls `loadText(sidecarPath)` itself (CPS provides it)
 *   2. Caller invokes `loadPhysicsSidecar(jsonText)` here
 *   3. Returns parsed sidecar object on success
 *   4. THROWS on: missing meta, JSON parse failure, schema version mismatch,
 *      sha256 format invalid, sha256 recompute mismatch
 *   5. Fails closed: caller cannot emit the post if this throws
 *
 * The pure-JS SHA-256 + canonicalize implementations MUST produce
 * byte-identical hashes to Node `crypto.createHash("sha256")` and to
 * `PhysicsSidecarBuilderEngine.canonicalize` — that is verified by tests.
 *
 * Reference: FIPS 180-4 (SHA-256). Test vectors: empty → e3b0c44…b855;
 * "abc" → ba7816bf…0015ad.
 */

// ============================================================================
// PURE-JS SHA-256 (FIPS 180-4) — no Node crypto dependency
// ============================================================================

/** SHA-256 round constants — first 32 bits of fractional parts of cube roots of first 64 primes. */
const _K256: number[] = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
];

/** SHA-256 initial hash values — fractional parts of square roots of first 8 primes. */
function _initialHash(): number[] {
  return [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ];
}

/** UTF-8 encode a string into a byte array (Rhino-portable, no TextEncoder). */
function _utf8Bytes(str: string): number[] {
  const out: number[] = [];
  for (let i = 0; i < str.length; i++) {
    let cp = str.charCodeAt(i);
    if (cp >= 0xd800 && cp <= 0xdbff && i + 1 < str.length) {
      const low = str.charCodeAt(i + 1);
      if (low >= 0xdc00 && low <= 0xdfff) {
        cp = 0x10000 + ((cp - 0xd800) << 10) + (low - 0xdc00);
        i++;
      }
    }
    if (cp < 0x80) {
      out.push(cp);
    } else if (cp < 0x800) {
      out.push(0xc0 | (cp >> 6), 0x80 | (cp & 0x3f));
    } else if (cp < 0x10000) {
      out.push(0xe0 | (cp >> 12), 0x80 | ((cp >> 6) & 0x3f), 0x80 | (cp & 0x3f));
    } else {
      out.push(0xf0 | (cp >> 18), 0x80 | ((cp >> 12) & 0x3f), 0x80 | ((cp >> 6) & 0x3f), 0x80 | (cp & 0x3f));
    }
  }
  return out;
}

/** Right-rotate a 32-bit unsigned integer. */
function _rotr(x: number, n: number): number {
  return ((x >>> n) | (x << (32 - n))) >>> 0;
}

/** SHA-256 of a UTF-8 string → 64-char lowercase hex (FIPS 180-4). */
export function pureSha256Hex(input: string): string {
  const msg = _utf8Bytes(input);
  const bitLen = msg.length * 8;
  // Append 0x80
  msg.push(0x80);
  // Pad with zeros until length ≡ 56 (mod 64)
  while (msg.length % 64 !== 56) msg.push(0);
  // Append length as 64-bit big-endian (high 32 always 0 for our message sizes)
  msg.push(0, 0, 0, 0);
  msg.push((bitLen >>> 24) & 0xff, (bitLen >>> 16) & 0xff, (bitLen >>> 8) & 0xff, bitLen & 0xff);

  const H = _initialHash();
  for (let chunkStart = 0; chunkStart < msg.length; chunkStart += 64) {
    const W = new Array<number>(64);
    for (let t = 0; t < 16; t++) {
      const i = chunkStart + t * 4;
      W[t] = ((msg[i] << 24) | (msg[i + 1] << 16) | (msg[i + 2] << 8) | msg[i + 3]) >>> 0;
    }
    for (let t = 16; t < 64; t++) {
      const s0 = _rotr(W[t - 15], 7) ^ _rotr(W[t - 15], 18) ^ (W[t - 15] >>> 3);
      const s1 = _rotr(W[t - 2], 17) ^ _rotr(W[t - 2], 19) ^ (W[t - 2] >>> 10);
      W[t] = ((W[t - 16] + s0 + W[t - 7] + s1) | 0) >>> 0;
    }

    let a = H[0], b = H[1], c = H[2], d = H[3];
    let e = H[4], f = H[5], g = H[6], h = H[7];

    for (let t = 0; t < 64; t++) {
      const S1 = _rotr(e, 6) ^ _rotr(e, 11) ^ _rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const T1 = (h + S1 + ch + _K256[t] + W[t]) >>> 0;
      const S0 = _rotr(a, 2) ^ _rotr(a, 13) ^ _rotr(a, 22);
      const mj = (a & b) ^ (a & c) ^ (b & c);
      const T2 = (S0 + mj) >>> 0;
      h = g; g = f; f = e;
      e = (d + T1) >>> 0;
      d = c; c = b; b = a;
      a = (T1 + T2) >>> 0;
    }
    H[0] = (H[0] + a) >>> 0;
    H[1] = (H[1] + b) >>> 0;
    H[2] = (H[2] + c) >>> 0;
    H[3] = (H[3] + d) >>> 0;
    H[4] = (H[4] + e) >>> 0;
    H[5] = (H[5] + f) >>> 0;
    H[6] = (H[6] + g) >>> 0;
    H[7] = (H[7] + h) >>> 0;
  }

  let hex = "";
  for (let i = 0; i < 8; i++) {
    const v = H[i];
    const s = (v >>> 0).toString(16);
    hex += "00000000".slice(s.length) + s;
  }
  return hex;
}

// ============================================================================
// DETERMINISTIC CANONICALIZE — must match PhysicsSidecarBuilderEngine.canonicalize
// ============================================================================

/**
 * Canonical JSON: sorted-key recursion. Arrays preserved. Numbers via
 * JSON.stringify (matches Node's serialisation). Throws on NaN/Infinity.
 * MUST produce byte-identical output to PhysicsSidecarBuilderEngine.canonicalize.
 */
export function pureCanonicalize(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number") {
    if (!isFinite(value)) {
      throw new Error("loadPhysicsSidecar.canonicalize: non-finite number rejected");
    }
    return JSON.stringify(value);
  }
  if (Object.prototype.toString.call(value) === "[object Array]") {
    const arr = value as unknown[];
    let out = "[";
    for (let i = 0; i < arr.length; i++) {
      if (i > 0) out += ",";
      out += pureCanonicalize(arr[i]);
    }
    return out + "]";
  }
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const keys: string[] = [];
    for (const k in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, k)) keys.push(k);
    }
    keys.sort();
    let out = "{";
    for (let i = 0; i < keys.length; i++) {
      if (i > 0) out += ",";
      out += JSON.stringify(keys[i]) + ":" + pureCanonicalize(obj[keys[i]]);
    }
    return out + "}";
  }
  throw new Error("loadPhysicsSidecar.canonicalize: unsupported type " + typeof value);
}

// ============================================================================
// LOADER — verify sidecar JSON text + return parsed object
// ============================================================================

export interface LoadOptions {
  /** Schema version the post was generated against; loader rejects mismatch. */
  expectedSchemaVersion: string;
}

/**
 * Parse + verify a sidecar JSON text. Throws on any integrity failure.
 * Returns the parsed sidecar on success.
 */
export function loadPhysicsSidecar(jsonText: string, opts: LoadOptions): Record<string, unknown> {
  if (typeof jsonText !== "string" || jsonText.length === 0) {
    throw new Error("loadPhysicsSidecar: jsonText must be a non-empty string");
  }
  if (!opts || typeof opts.expectedSchemaVersion !== "string") {
    throw new Error("loadPhysicsSidecar: expectedSchemaVersion is required");
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(jsonText) as Record<string, unknown>;
  } catch (err) {
    throw new Error("loadPhysicsSidecar: sidecar is not valid JSON: " + (err as Error).message);
  }

  const meta = parsed.meta as Record<string, unknown> | undefined;
  if (!meta || typeof meta !== "object") {
    throw new Error("loadPhysicsSidecar: sidecar missing meta object");
  }
  if (meta.schema_version !== opts.expectedSchemaVersion) {
    throw new Error(
      "loadPhysicsSidecar: schema version mismatch — expected '" +
        opts.expectedSchemaVersion +
        "' got '" +
        String(meta.schema_version) +
        "'",
    );
  }
  const expectedSha = meta.sha256 as unknown;
  if (typeof expectedSha !== "string" || !/^[0-9a-f]{64}$/.test(expectedSha)) {
    throw new Error("loadPhysicsSidecar: meta.sha256 must be 64-char lowercase hex");
  }

  // Recompute SHA: same envelope as the builder
  // (payload-without-meta + _meta_without_sha)
  const { meta: _strippedMeta, ...payload } = parsed;
  const { sha256: _strippedSha, ...metaWithoutSha } = meta;
  void _strippedMeta;
  void _strippedSha;
  const sealable = { ...payload, _meta_without_sha: metaWithoutSha };
  const recomputed = pureSha256Hex(pureCanonicalize(sealable));
  if (recomputed !== expectedSha) {
    throw new Error(
      "loadPhysicsSidecar: SHA mismatch — sidecar tampered or stale; expected=" +
        expectedSha +
        " recomputed=" +
        recomputed,
    );
  }

  return parsed;
}

// ============================================================================
// PER-BLOCK ANNOTATION LOOKUP — MS0/U-PPGM09 (schema 1.1.0)
// ----------------------------------------------------------------------------
// CPS posts emit block-level S/F. To verify each emitted block's numbers
// against the physics chain that produced them (NoInlinePhysics gate,
// U-PPGM10), the post needs to look up its annotation by block_id. This
// helper is pure-JS so it runs inside Rhino without pulling Zod, Node fs,
// or the full Node schema runtime into the post engine.
//
// Backward compat: pre-1.1.0 sidecars omit `block_annotations`. The helper
// treats `undefined` as "no telemetry available" and returns null. Callers
// that NEED telemetry must check the sidecar's meta.schema_version before
// invoking — schema_version "1.1.0" is the lower bound.
// ============================================================================

/**
 * Structural shape of a sidecar block annotation. Mirrors blockAnnotationSchema
 * in mcp-server/src/schemas/postPhysicsSidecarSchema.ts but defined locally so
 * the Rhino-side loader doesn't need Zod/the schema module at runtime.
 */
export interface SidecarBlockAnnotation {
  block_id: string;
  op_id: string;
  iso_group: string;
  tool_material: string;
  emitted: {
    vc_mpm: number;
    fpt_mm?: number;
    fn_mmrev?: number;
    ap_mm?: number;
    ae_mm?: number;
    S_rpm: number;
    F_mmpm: number;
  };
  physics_basis: string;
  confidence: number;
  safety_margin: number;
  source_constants: string[];
}

/**
 * Look up a block annotation by block_id.
 *
 * Returns the matching annotation, or null when:
 *   - sidecar.block_annotations is undefined (v1.0.0 back-compat)
 *   - sidecar.block_annotations is an empty array
 *   - no entry has the given block_id
 *
 * Throws when:
 *   - sidecar is null/undefined or not an object
 *   - block_id is not a non-empty string
 *   - sidecar.block_annotations exists but is not an array (shape violation)
 *
 * The schema's superRefine guarantees block_ids are unique within a sidecar,
 * but this loader does NOT re-verify uniqueness — it returns the first match.
 * Callers that need strict-uniqueness re-verification should check the sidecar
 * with the Node-side parseSidecarStrict before persisting.
 */
export function getBlockAnnotation(
  sidecar: Record<string, unknown> | null | undefined,
  blockId: string,
): SidecarBlockAnnotation | null {
  if (!sidecar || typeof sidecar !== "object") {
    throw new Error("getBlockAnnotation: sidecar must be a non-null object");
  }
  if (typeof blockId !== "string" || blockId.length === 0) {
    throw new Error("getBlockAnnotation: blockId must be a non-empty string");
  }

  const blocks = (sidecar as Record<string, unknown>).block_annotations;
  if (typeof blocks === "undefined") {
    // v1.0.0 sidecar — no per-block telemetry. Caller must handle null.
    return null;
  }
  if (Object.prototype.toString.call(blocks) !== "[object Array]") {
    throw new Error(
      "getBlockAnnotation: sidecar.block_annotations is present but not an array (shape violation)",
    );
  }

  const arr = blocks as unknown[];
  for (let i = 0; i < arr.length; i++) {
    const entry = arr[i] as Record<string, unknown> | null;
    if (entry && typeof entry === "object" && entry.block_id === blockId) {
      return entry as unknown as SidecarBlockAnnotation;
    }
  }
  return null;
}

/**
 * Convenience: return all block annotations for a given op_id (operation).
 * Operators often need to inspect every block belonging to one CAM op.
 * Returns [] when annotations absent or no match. Same shape rules as
 * getBlockAnnotation otherwise.
 */
export function getBlockAnnotationsByOp(
  sidecar: Record<string, unknown> | null | undefined,
  opId: string,
): SidecarBlockAnnotation[] {
  if (!sidecar || typeof sidecar !== "object") {
    throw new Error("getBlockAnnotationsByOp: sidecar must be a non-null object");
  }
  if (typeof opId !== "string" || opId.length === 0) {
    throw new Error("getBlockAnnotationsByOp: opId must be a non-empty string");
  }

  const blocks = (sidecar as Record<string, unknown>).block_annotations;
  if (typeof blocks === "undefined") return [];
  if (Object.prototype.toString.call(blocks) !== "[object Array]") {
    throw new Error(
      "getBlockAnnotationsByOp: sidecar.block_annotations is present but not an array (shape violation)",
    );
  }

  const arr = blocks as unknown[];
  const matched: SidecarBlockAnnotation[] = [];
  for (let i = 0; i < arr.length; i++) {
    const entry = arr[i] as Record<string, unknown> | null;
    if (entry && typeof entry === "object" && entry.op_id === opId) {
      matched.push(entry as unknown as SidecarBlockAnnotation);
    }
  }
  return matched;
}
