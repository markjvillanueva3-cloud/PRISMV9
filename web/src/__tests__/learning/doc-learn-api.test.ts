/**
 * CC-EXT-MS0 U08: Document Learning API + hooks unit tests
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function mockResponse(data: any, ok = true, status = 200) {
  return Promise.resolve({
    ok,
    status,
    statusText: ok ? "OK" : "Error",
    json: () => Promise.resolve(data),
  });
}

// ---------------------------------------------------------------------------
// API client tests
// ---------------------------------------------------------------------------
describe("docLearnApi", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("upload sends POST to /api/v1/doc-learn/upload", async () => {
    mockFetch.mockReturnValueOnce(mockResponse({
      document_id: "doc-test-001",
      status: "pending",
      format: "pdf",
      message: "Document registered.",
    }));

    const { docLearnApi } = await import("../../api/docLearn");
    const result = await docLearnApi.upload({ file_path: "/tmp/test.pdf", title: "Test" });

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toBe("/api/v1/doc-learn/upload");
    expect(opts.method).toBe("POST");
    expect(JSON.parse(opts.body)).toEqual({ file_path: "/tmp/test.pdf", title: "Test" });
    expect(result.document_id).toBe("doc-test-001");
  });

  it("extract sends POST to /api/v1/doc-learn/extract", async () => {
    mockFetch.mockReturnValueOnce(mockResponse({
      document_id: "doc-test-001",
      status: "complete",
      is_valid: true,
    }));

    const { docLearnApi } = await import("../../api/docLearn");
    const result = await docLearnApi.extract({ document_id: "doc-test-001" });

    const [url] = mockFetch.mock.calls[0];
    expect(url).toBe("/api/v1/doc-learn/extract");
    expect(result.status).toBe("complete");
  });

  it("list sends GET to /api/v1/doc-learn/list", async () => {
    mockFetch.mockReturnValueOnce(mockResponse({
      count: 2,
      documents: [
        { id: "doc-1", title: "Paper A", format: "pdf", status: "complete", created_at: "2026-03-01" },
        { id: "doc-2", title: "Notes B", format: "markdown", status: "pending", created_at: "2026-03-01" },
      ],
    }));

    const { docLearnApi } = await import("../../api/docLearn");
    const result = await docLearnApi.list();

    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toBe("/api/v1/doc-learn/list");
    expect(opts.method).toBe("GET");
    expect(result.count).toBe(2);
  });

  it("get sends GET to /api/v1/doc-learn/:id", async () => {
    mockFetch.mockReturnValueOnce(mockResponse({
      document: { id: "doc-1", title: "Paper", format: "pdf", status: "complete" },
      knowledge: { schema_version: "2.0.0" },
    }));

    const { docLearnApi } = await import("../../api/docLearn");
    const result = await docLearnApi.get({ document_id: "doc-1" });

    const [url] = mockFetch.mock.calls[0];
    expect(url).toBe("/api/v1/doc-learn/doc-1");
    expect(result.document.id).toBe("doc-1");
    expect(result.knowledge).toBeDefined();
  });

  it("delete sends DELETE to /api/v1/doc-learn/:id", async () => {
    mockFetch.mockReturnValueOnce(mockResponse({
      deleted: "doc-1",
      message: "Document knowledge deleted successfully",
    }));

    const { docLearnApi } = await import("../../api/docLearn");
    const result = await docLearnApi.delete({ document_id: "doc-1" });

    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toBe("/api/v1/doc-learn/doc-1");
    expect(opts.method).toBe("DELETE");
    expect(result.deleted).toBe("doc-1");
  });

  it("throws ApiRequestError on non-ok response", async () => {
    mockFetch.mockReturnValueOnce(mockResponse(
      { message: "Not found" },
      false,
      404,
    ));

    const { docLearnApi } = await import("../../api/docLearn");
    await expect(docLearnApi.get({ document_id: "bad-id" }))
      .rejects.toThrow("Not found");
  });
});

// ---------------------------------------------------------------------------
// Type coverage tests
// ---------------------------------------------------------------------------
describe("docLearn types", () => {
  it("DocumentSummary shape is correct", async () => {
    const doc: import("../../types/docLearn").DocumentSummary = {
      id: "doc-1",
      title: "Test",
      format: "pdf",
      status: "complete",
      created_at: "2026-03-01T00:00:00Z",
    };
    expect(doc.id).toBe("doc-1");
    expect(doc.status).toBe("complete");
  });

  it("DocExtractResult accepts both complete and failed", async () => {
    const ok: import("../../types/docLearn").DocExtractResult = {
      document_id: "d1",
      status: "complete",
      is_valid: true,
      stats: { total_items: 5 },
    };
    const fail: import("../../types/docLearn").DocExtractResult = {
      document_id: "d2",
      status: "failed",
      error: "API error",
    };
    expect(ok.status).toBe("complete");
    expect(fail.error).toBeDefined();
  });
});
