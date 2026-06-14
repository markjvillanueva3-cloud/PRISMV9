import { describe, it, expect } from "vitest";
import { generateCall, SubprogramCaller, type SubprogramCallInput } from "./SubprogramCaller.js";

describe("SubprogramCaller", () => {
  it("Fanuc numeric: M98 P<num>, return M99", () => {
    const r = generateCall({ controller: "fanuc", target: "1234" });
    expect(r.call_block).toBe("M98 P1234");
    expect(r.return_block).toBe("M99");
  });
  it("Fanuc with iterations: M98 P<num> L<n>", () => {
    expect(generateCall({ controller: "fanuc", target: "100", iterations: 5 }).call_block).toBe("M98 P100 L5");
  });
  it("Heidenhain CALL LBL with string label + REP", () => {
    const r = generateCall({ controller: "heidenhain", target: "POCKET", iterations: 3 });
    expect(r.call_block).toBe(`CALL LBL "POCKET" REP3`);
    expect(r.return_block).toBe("LBL 0");
  });
  it("Siemens direct call + M17 return", () => {
    const r = generateCall({ controller: "siemens", target: "DRILL_SUB" });
    expect(r.call_block).toBe("DRILL_SUB");
    expect(r.return_block).toBe("M17");
  });
  it("Siemens with iterations: <name> P<n>", () => {
    expect(generateCall({ controller: "siemens", target: "DRILL", iterations: 2 }).call_block).toBe("DRILL P2");
  });
  it("Okuma CALL O<num> RTS", () => {
    const r = generateCall({ controller: "okuma", target: "200" });
    expect(r.call_block).toBe("CALL O200");
    expect(r.return_block).toBe("RTS");
  });
  it("Mazak same as Fanuc (M98 family)", () => {
    expect(generateCall({ controller: "mazak", target: "300" }).call_block).toBe("M98 P300");
  });
  it("Haas same as Fanuc (M98 family)", () => {
    expect(generateCall({ controller: "haas", target: "1500" }).call_block).toBe("M98 P1500");
  });
  it("Fanuc non-numeric target → diagnostic note", () => {
    expect(generateCall({ controller: "fanuc", target: "POCKET" }).notes.join("|")).toContain("numeric");
  });
  it("Okuma non-numeric → diagnostic note", () => {
    expect(generateCall({ controller: "okuma", target: "MAIN" }).notes.join("|")).toContain("numeric");
  });
  it("unknown controller diagnostic", () => {
    expect(generateCall({ controller: "xx" as SubprogramCallInput["controller"], target: "1" }).notes.join("|")).toContain("unknown controller");
  });
  it("empty target diagnostic", () => {
    expect(generateCall({ controller: "fanuc", target: "" }).notes.join("|")).toContain("non-empty");
  });
  it("oversize target (>64 chars) diagnostic", () => {
    expect(generateCall({ controller: "fanuc", target: "a".repeat(100) }).notes.join("|")).toContain("64 chars");
  });
  it("iterations out of range diagnostic", () => {
    expect(generateCall({ controller: "fanuc", target: "1", iterations: 99999 }).notes.join("|")).toContain("outside");
    expect(generateCall({ controller: "fanuc", target: "1", iterations: 0 }).notes.join("|")).toContain("outside");
  });
  it("missing input diagnostic", () => {
    expect(generateCall(null as unknown as SubprogramCallInput).notes.join("|")).toContain("missing");
  });
  it("version 1.0.0", () => {
    expect(SubprogramCaller.version).toBe("1.0.0");
  });
});
