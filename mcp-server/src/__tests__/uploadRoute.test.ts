/**
 * uploadRoute.test.ts -- tests for the upload size-guard core (U-XRAY-UPLOAD-ROUTE-WIRE).
 * `decodedBase64Bytes` is the testable core of the disk-fill guard; the handler's 413 response is a thin
 * `decodedBase64Bytes(content_base64) > MAX_UPLOAD_BYTES` check over it. Verified against REAL Buffer
 * base64 round-trips so the byte estimate matches what would actually be written to disk.
 */
import { describe, it, expect } from "vitest";
import { decodedBase64Bytes, MAX_UPLOAD_BYTES } from "../routes/upload.js";

describe("decodedBase64Bytes (upload size guard core)", () => {
  it("returns 0 for an empty string", () => {
    expect(decodedBase64Bytes("")).toBe(0);
  });

  it("computes 3 bytes for a 4-char unpadded group", () => {
    expect(decodedBase64Bytes("QUJD")).toBe(3); // base64("ABC")
  });

  it("accounts for one '=' padding (2 bytes)", () => {
    expect(decodedBase64Bytes("QUI=")).toBe(2); // base64("AB")
  });

  it("accounts for two '==' padding (1 byte)", () => {
    expect(decodedBase64Bytes("QQ==")).toBe(1); // base64("A")
  });

  it("matches REAL Buffer base64 decoding length (no padding)", () => {
    const b64 = Buffer.from("hello world").toString("base64"); // 11 bytes
    expect(decodedBase64Bytes(b64)).toBe(Buffer.from(b64, "base64").length);
    expect(decodedBase64Bytes(b64)).toBe(11);
  });

  it("matches REAL Buffer base64 decoding length for a 30KB payload", () => {
    const raw = Buffer.alloc(30 * 1024, 7);
    const b64 = raw.toString("base64");
    expect(decodedBase64Bytes(b64)).toBe(raw.length);
  });

  it("scales linearly with input length", () => {
    expect(decodedBase64Bytes("A".repeat(4000))).toBe(3000);
  });

  it("MAX_UPLOAD_BYTES (32 MiB decoded) binds INSIDE the 50MB express.json body window", () => {
    expect(MAX_UPLOAD_BYTES).toBe(32 * 1024 * 1024);
    // the cap's base64 text size must be < the 50MB global body-parser limit, else the guard is dead
    // (the parser would 413 first). 32MiB decoded -> ~42.6MB base64 < 50MB. Proves the guard is reachable.
    const base64Bytes = Math.ceil(MAX_UPLOAD_BYTES / 3) * 4;
    expect(base64Bytes).toBeLessThan(50 * 1024 * 1024);
  });

  it("guard direction: an under-cap payload is accepted, an over-threshold payload is flagged", () => {
    const small = Buffer.from("x".repeat(100)).toString("base64");
    expect(decodedBase64Bytes(small)).toBe(100);
    expect(decodedBase64Bytes(small) > MAX_UPLOAD_BYTES).toBe(false); // accepted
    // the > comparison the handler uses, exercised against a small threshold
    expect(decodedBase64Bytes("A".repeat(40)) > 25).toBe(true); // 30 > 25 -> would reject
  });
});
