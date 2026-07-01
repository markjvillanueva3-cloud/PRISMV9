/**
 * cadDispatcher.blueprintRedact.test.ts -- round-trip wire test for the `blueprint_redact` action
 * (U-APP-REDACT-WIRE). Invokes THROUGH prism_cad (not the blueprintRedaction lib directly) to prove the
 * ACTIONS enum + lazy import + switch case are coherent and the tested redactor is reachable as an app
 * surface. The redactor's own logic (tiers, audit, over-redaction guard) is covered exhaustively by
 * blueprintRedaction.test.ts; this file proves the DISPATCHER contract -- privacy-critical, so it weights
 * the leak/field-mask cases that would expose a JM customer identity if the wire were wrong.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { registerCadDispatcher } from "../tools/dispatchers/cadDispatcher.js";

const MASK = "[REDACTED]";

interface CapturedTool {
  name: string;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<{ content: Array<{ type: string; text: string }> }>;
}
function makeStubServer() {
  const captured: CapturedTool[] = [];
  return {
    tools: captured,
    tool(name: string, _description: string, _schema: unknown, handler: CapturedTool["handler"]) {
      captured.push({ name, handler });
    },
  };
}
let handler: CapturedTool["handler"];
async function invoke(action: string, params: Record<string, unknown> = {}): Promise<any> {
  const res = (await handler({ action, params })) as any;
  if (res && res.success === false) return res;
  const text = res?.content?.[0]?.text ?? "";
  try { return JSON.parse(text); } catch { return { __raw: text }; }
}

beforeAll(() => {
  const server = makeStubServer();
  registerCadDispatcher(server as unknown as Parameters<typeof registerCadDispatcher>[0]);
  const tool = server.tools.find((t) => t.name === "prism_cad");
  if (!tool) throw new Error("prism_cad tool was not registered");
  handler = tool.handler;
});

describe("cadDispatcher blueprint_redact (U-APP-REDACT-WIRE app-facing redaction)", () => {
  it("masks customer-identity FIELDS wholesale through the dispatcher (structured app path)", async () => {
    const res = await invoke("blueprint_redact", {
      extraction: {
        title_block: { customer: "ACME", company: "ITW SHAKEPROOF", material: "4140", part_number: "ABC-1234" },
        notes: ["MADE FOR ALCOA", "0.5 DIA THRU"],
      },
    });
    expect(res.success).toBe(true);
    const tb = res.data.extraction.extraction.title_block;
    expect(tb.customer).toBe(MASK);       // common-word customer ACME masked via FIELD (not name-match)
    expect(tb.company).toBe(MASK);
    expect(tb.part_number).toBe(MASK);
    expect(tb.material).toBe("4140");     // non-identity field preserved
    expect(res.data.extraction.extraction.notes[0]).toBe(`MADE FOR ${MASK}`); // CORE name scrubbed in note
    expect(res.data.extraction.extraction.notes[1]).toBe("0.5 DIA THRU");     // legit dim note untouched
  });

  it("ADVERSARIAL LEAK: a customer nested deep in the extraction must NOT survive the round-trip", async () => {
    const res = await invoke("blueprint_redact", {
      extraction: { sections: [{ blocks: [{ text: "drawing for itw shakeproof co" }] }] },
    });
    expect(res.success).toBe(true);
    const leaked = JSON.stringify(res.data.extraction.extraction).toLowerCase().includes("itw");
    expect(leaked).toBe(false);
  });

  it("ADVERSARIAL LEAK: a customer used as an OBJECT KEY must NOT survive the round-trip (P2 fix)", async () => {
    const res = await invoke("blueprint_redact", {
      extraction: { "ITW SHAKEPROOF": { qty: 5 }, by_customer: { SEMBLEX: 3 } },
    });
    expect(res.success).toBe(true);
    const leaked = JSON.stringify(res.data.extraction.extraction).toLowerCase();
    expect(leaked.includes("itw")).toBe(false);
    expect(leaked.includes("semblex")).toBe(false);
  });

  it("scrubs a DISTINCTIVE non-CORE customer in free text (default distinctive tier)", async () => {
    const res = await invoke("blueprint_redact", { text: "RUN FOR SEMBLEX TODAY" });
    expect(res.success).toBe(true);
    expect(res.data.text.text).toBe(`RUN FOR ${MASK} TODAY`);
  });

  it("OVER-REDACTION GUARD: a common-word customer in free text is preserved by default (distinctive tier)", async () => {
    const res = await invoke("blueprint_redact", { text: "ACME THREAD 1/2-13" });
    expect(res.success).toBe(true);
    expect(res.data.text.text).toBe("ACME THREAD 1/2-13"); // not masked in free text; still caught on the field path
  });

  it("aggressive:true opts into full-registry free-text masking through the dispatcher", async () => {
    const def = await invoke("blueprint_redact", { text: "ACME THREAD" });
    const agg = await invoke("blueprint_redact", { text: "ACME THREAD", aggressive: true });
    expect(def.data.text.text).toBe("ACME THREAD");
    expect(agg.data.text.text).toBe(`${MASK} THREAD`);
  });

  it("audit omits cleartext by default; auditCleartext:true includes the matched span", async () => {
    const def = await invoke("blueprint_redact", { text: "FOR ALCOA" });
    const aud = await invoke("blueprint_redact", { text: "FOR ALCOA", auditCleartext: true });
    expect(def.data.text.redactions).toEqual([{ type: "customer-text" }]);
    expect(aud.data.text.redactions).toEqual([{ type: "customer-text", match: "ALCOA" }]);
  });

  it("returns title-block image mask regions from region-classifier output", async () => {
    const res = await invoke("blueprint_redact", {
      regions: {
        regions: [
          { bbox: [0.6, 0.85, 0.4, 0.15], region_kind: "title_block", confidence: 0.98, valid: true },
          { bbox: [0, 0, 0.5, 0.5], region_kind: "drawing_view", confidence: 0.9, valid: true },
        ],
      },
    });
    expect(res.success).toBe(true);
    expect(res.data.regions).toHaveLength(1);
    expect(res.data.regions[0].region_kind).toBe("title_block");
    expect(res.data.regions[0].bbox).toEqual([0.6, 0.85, 0.4, 0.15]);
  });

  it("handles text + extraction + regions in a SINGLE call", async () => {
    const res = await invoke("blueprint_redact", {
      text: "FOR SEMBLEX",
      extraction: { title_block: { customer: "ALCOA" } },
      regions: [{ bbox: [0.1, 0.1, 0.2, 0.2], region_kind: "title_block" }],
    });
    expect(res.success).toBe(true);
    expect(res.data.text.text).toBe(`FOR ${MASK}`);
    expect(res.data.extraction.extraction.title_block.customer).toBe(MASK);
    expect(res.data.regions).toHaveLength(1);
  });

  it("missing all of text/extraction/regions -> descriptive error (no silent empty success)", async () => {
    const res = await invoke("blueprint_redact", {});
    expect(JSON.stringify(res).toLowerCase()).toContain("requires at least one");
  });
});
