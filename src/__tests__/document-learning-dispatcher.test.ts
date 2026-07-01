/**
 * CC-EXT-MS0 U06: Document Learning Dispatcher — registration + action routing tests
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { registerDocumentLearningDispatcher } from "../tools/dispatchers/documentLearningDispatcher.js";
import * as fs from "node:fs";
import * as path from "node:path";

interface CapturedTool {
  name: string;
  handler: (args: any) => Promise<any>;
}

function createMockServer(): { server: any; tools: CapturedTool[] } {
  const tools: CapturedTool[] = [];
  return {
    server: { tool(name: string, _desc: string, _schema: any, handler: any) { tools.push({ name, handler }); } },
    tools,
  };
}

async function callAction(tool: CapturedTool, action: string, params: Record<string, any> = {}): Promise<any> {
  const result = await tool.handler({ action, params });
  const text = result?.content?.[0]?.text;
  return text ? JSON.parse(text) : result;
}

// ============================================================================
// prism_doc_learn (5 actions)
// ============================================================================
describe("prism_doc_learn dispatcher", () => {
  const { server, tools } = createMockServer();
  registerDocumentLearningDispatcher(server);
  const docLearn = tools[0];

  it("registers as prism_doc_learn", () => {
    expect(docLearn.name).toBe("prism_doc_learn");
  });

  it("doc_upload requires file_path", async () => {
    const r = await callAction(docLearn, "doc_upload", {});
    expect(r.error).toBeDefined();
  });

  it("doc_upload rejects missing file", async () => {
    const r = await callAction(docLearn, "doc_upload", { file_path: "/nonexistent/file.pdf" });
    expect(r.error).toContain("not found");
  });

  it("doc_upload registers a real file", async () => {
    // Use this test file itself as the document
    const testFile = path.resolve(__dirname, "document-learning-dispatcher.test.ts");
    const r = await callAction(docLearn, "doc_upload", { file_path: testFile, title: "Test Doc" });
    expect(r.document_id).toBeDefined();
    expect(r.status).toBe("pending");
    expect(r.message).toContain("doc_extract");

    // Clean up: delete from registry
    await callAction(docLearn, "doc_delete", { document_id: r.document_id });
  });

  it("doc_extract requires document_id", async () => {
    const r = await callAction(docLearn, "doc_extract", {});
    expect(r.error).toBeDefined();
  });

  it("doc_extract rejects unknown document", async () => {
    const r = await callAction(docLearn, "doc_extract", { document_id: "nonexistent-id" });
    expect(r.error).toContain("not found");
  });

  it("doc_list returns documents array", async () => {
    const r = await callAction(docLearn, "doc_list", {});
    expect(r.count).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(r.documents)).toBe(true);
  });

  it("doc_get requires document_id", async () => {
    const r = await callAction(docLearn, "doc_get", {});
    expect(r.error).toBeDefined();
  });

  it("doc_get rejects unknown document", async () => {
    const r = await callAction(docLearn, "doc_get", { document_id: "nonexistent-id" });
    expect(r.error).toContain("not found");
  });

  it("doc_delete requires document_id", async () => {
    const r = await callAction(docLearn, "doc_delete", {});
    expect(r.error).toBeDefined();
  });

  it("doc_delete rejects unknown document", async () => {
    const r = await callAction(docLearn, "doc_delete", { document_id: "nonexistent-id" });
    expect(r.error).toContain("not found");
  });

  it("full lifecycle: upload → list → get → delete", async () => {
    const testFile = path.resolve(__dirname, "document-learning-dispatcher.test.ts");

    // Upload
    const upload = await callAction(docLearn, "doc_upload", {
      file_path: testFile,
      title: "Lifecycle Test",
    });
    expect(upload.document_id).toBeDefined();
    const docId = upload.document_id;

    // List — should contain our doc
    const list = await callAction(docLearn, "doc_list", {});
    expect(list.documents.some((d: any) => d.id === docId)).toBe(true);

    // Get — should have document details
    const get = await callAction(docLearn, "doc_get", { document_id: docId });
    expect(get.document.id).toBe(docId);
    expect(get.document.title).toBe("Lifecycle Test");
    expect(get.document.status).toBe("pending");

    // Delete — should succeed
    const del = await callAction(docLearn, "doc_delete", { document_id: docId });
    expect(del.deleted).toBe(docId);

    // Verify deleted
    const getAfter = await callAction(docLearn, "doc_get", { document_id: docId });
    expect(getAfter.error).toContain("not found");
  });
});
