import express from "express";
import http from "node:http";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { registerRoutes } from "../routes/index.js";

type StoredRevision = {
  id: string;
  revision: string;
  change_description: string;
};

type StoredPart = {
  id: string;
  part_number: string;
  name: string;
  revisions: StoredRevision[];
};

type StoredFile = {
  id: string;
  original_name: string;
  versions: Array<{ version: number; original_name: string }>;
};

type StoredAttachment = {
  id: string;
  file_id: string;
  entity_type: string;
  entity_id: string;
  attachment_type?: string;
};

let server: http.Server;
let port = 0;
let partSeq = 0;
let fileSeq = 0;
let revisionSeq = 0;
let attachmentSeq = 0;
let parts = new Map<string, StoredPart>();
let files = new Map<string, StoredFile>();
let attachments: StoredAttachment[] = [];

function resetStores() {
  partSeq = 0;
  fileSeq = 0;
  revisionSeq = 0;
  attachmentSeq = 0;
  parts = new Map();
  files = new Map();
  attachments = [];
}

function httpRequest(
  method: string,
  urlPath: string,
  body?: Record<string, any>,
): Promise<{ status: number; data: any }> {
  return new Promise((resolve, reject) => {
    const serialized = body ? JSON.stringify(body) : undefined;
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port,
        path: urlPath,
        method,
        headers: serialized
          ? {
              "Content-Type": "application/json",
              "Content-Length": Buffer.byteLength(serialized).toString(),
            }
          : {},
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => {
          const text = Buffer.concat(chunks).toString();
          try {
            resolve({ status: res.statusCode ?? 0, data: JSON.parse(text) });
          } catch {
            resolve({ status: res.statusCode ?? 0, data: text });
          }
        });
      },
    );
    req.on("error", reject);
    if (serialized) {
      req.write(serialized);
    }
    req.end();
  });
}

describe("Parts and files route coverage", () => {
  beforeAll(async () => {
    const app = express();
    app.use(express.json());

    registerRoutes(app, async (toolName, action, params = {}) => {
      if (toolName !== "prism_parts") {
        throw new Error(`Unexpected tool call: ${toolName}:${action}`);
      }

      switch (action) {
        case "part_create": {
          if (!params.part_number || !params.name) {
            throw new Error("part_number and name are required");
          }

          const id = `PART-${++partSeq}`;
          const revision: StoredRevision = {
            id: `REV-${++revisionSeq}`,
            revision: "A",
            change_description: "Initial release",
          };
          const part: StoredPart = {
            id,
            part_number: String(params.part_number),
            name: String(params.name),
            revisions: [revision],
          };
          parts.set(id, part);
          return {
            part: {
              id,
              part_number: part.part_number,
              name: part.name,
              current_revision: revision.revision,
            },
            revision,
            warnings: [],
          };
        }

        case "part_search": {
          const query = String(params.query ?? "").toLowerCase();
          const matches = [...parts.values()].filter((part) => {
            if (!query) return true;
            return (
              part.part_number.toLowerCase().includes(query) ||
              part.name.toLowerCase().includes(query)
            );
          });
          return {
            parts: matches.map((part) => ({
              id: part.id,
              part_number: part.part_number,
              name: part.name,
              current_revision: part.revisions.at(-1)?.revision ?? "A",
            })),
            total: matches.length,
          };
        }

        case "part_get": {
          const part = parts.get(String(params.part_id));
          if (!part) {
            throw new Error("Part not found");
          }
          return {
            part: {
              id: part.id,
              part_number: part.part_number,
              name: part.name,
              current_revision: part.revisions.at(-1)?.revision ?? "A",
            },
            revisions: part.revisions,
          };
        }

        case "part_add_revision": {
          const part = parts.get(String(params.part_id));
          if (!part) {
            throw new Error("Part not found");
          }
          if (!params.revision || !params.change_description) {
            throw new Error("revision and change_description are required");
          }
          const revision: StoredRevision = {
            id: `REV-${++revisionSeq}`,
            revision: String(params.revision),
            change_description: String(params.change_description),
          };
          part.revisions.push(revision);
          return revision;
        }

        case "part_list_revisions": {
          const part = parts.get(String(params.part_id));
          if (!part) {
            throw new Error("Part not found");
          }
          return part.revisions;
        }

        case "file_upload": {
          if (!params.original_name || !params.content) {
            throw new Error("original_name and content are required");
          }

          const id = `FILE-${++fileSeq}`;
          const file: StoredFile = {
            id,
            original_name: String(params.original_name),
            versions: [{ version: 1, original_name: String(params.original_name) }],
          };
          files.set(id, file);
          return {
            file_id: id,
            original_name: file.original_name,
            version: 1,
          };
        }

        case "file_get_versions": {
          const file = files.get(String(params.file_id));
          if (!file) {
            throw new Error("File not found");
          }
          return file.versions;
        }

        case "file_attach": {
          const file = files.get(String(params.file_id));
          if (!file) {
            throw new Error("File not found");
          }
          if (!params.entity_type || !params.entity_id) {
            throw new Error("entity_type and entity_id are required");
          }

          const attachment: StoredAttachment = {
            id: `ATT-${++attachmentSeq}`,
            file_id: file.id,
            entity_type: String(params.entity_type),
            entity_id: String(params.entity_id),
            attachment_type: params.attachment_type ? String(params.attachment_type) : undefined,
          };
          attachments.push(attachment);
          return attachment;
        }

        case "file_get_attachments": {
          if (!params.entity_type || !params.entity_id) {
            throw new Error("entity_type and entity_id are required");
          }
          return attachments.filter(
            (attachment) =>
              attachment.entity_type === String(params.entity_type) &&
              attachment.entity_id === String(params.entity_id),
          );
        }

        default:
          throw new Error(`Unexpected action: ${action}`);
      }
    });

    server = app.listen(0);
    await once(server, "listening");
    port = (server.address() as AddressInfo).port;
  });

  afterAll(async () => {
    if (server.listening) {
      await new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      });
    }
  });

  beforeEach(() => {
    resetStores();
  });

  it("covers the mounted part + revision + file lineage path end to end", async () => {
    const created = await httpRequest("POST", "/api/v1/parts", {
      part_number: "BRKT-001",
      name: "Valve bracket",
    });
    expect(created.status).toBe(201);
    expect(created.data.part).toMatchObject({
      id: "PART-1",
      part_number: "BRKT-001",
      current_revision: "A",
    });

    const found = await httpRequest("GET", "/api/v1/parts?q=bracket");
    expect(found.status).toBe(200);
    expect(found.data.total).toBe(1);
    expect(found.data.parts[0]).toMatchObject({
      id: "PART-1",
      part_number: "BRKT-001",
    });

    const revision = await httpRequest("POST", "/api/v1/parts/PART-1/revisions", {
      revision: "B",
      change_description: "Added port chamfer",
    });
    expect(revision.status).toBe(201);
    expect(revision.data).toMatchObject({
      revision: "B",
      change_description: "Added port chamfer",
    });

    const uploaded = await httpRequest("POST", "/api/v1/files/upload", {
      original_name: "brkt-001-rev-b.step",
      content: Buffer.from("STEP DATA").toString("base64"),
    });
    expect(uploaded.status).toBe(200);
    expect(uploaded.data).toMatchObject({
      file_id: "FILE-1",
      original_name: "brkt-001-rev-b.step",
      version: 1,
    });

    const attached = await httpRequest("POST", "/api/v1/files/FILE-1/attach", {
      entity_type: "part",
      entity_id: "PART-1",
      attachment_type: "cad",
    });
    expect(attached.status).toBe(200);
    expect(attached.data).toMatchObject({
      file_id: "FILE-1",
      entity_type: "part",
      entity_id: "PART-1",
    });

    const revisions = await httpRequest("GET", "/api/v1/parts/PART-1/revisions");
    expect(revisions.status).toBe(200);
    expect(revisions.data).toHaveLength(2);
    expect(revisions.data.map((record: StoredRevision) => record.revision)).toEqual(["A", "B"]);

    const details = await httpRequest("GET", "/api/v1/parts/PART-1");
    expect(details.status).toBe(200);
    expect(details.data.part).toMatchObject({
      id: "PART-1",
      current_revision: "B",
    });

    const versions = await httpRequest("GET", "/api/v1/files/FILE-1/versions");
    expect(versions.status).toBe(200);
    expect(versions.data).toEqual([{ version: 1, original_name: "brkt-001-rev-b.step" }]);

    const linked = await httpRequest("GET", "/api/v1/files/attachments?entity_type=part&entity_id=PART-1");
    expect(linked.status).toBe(200);
    expect(linked.data).toHaveLength(1);
    expect(linked.data[0]).toMatchObject({
      entity_type: "part",
      entity_id: "PART-1",
      file_id: "FILE-1",
    });
  });

  it("fails closed with 400s for malformed create and attach payloads", async () => {
    const missingPartFields = await httpRequest("POST", "/api/v1/parts", {
      part_number: "BRKT-002",
    });
    expect(missingPartFields.status).toBe(400);
    expect(missingPartFields.data.error).toMatch(/part_number and name are required/i);

    const missingUploadFields = await httpRequest("POST", "/api/v1/files/upload", {
      original_name: "missing-content.step",
    });
    expect(missingUploadFields.status).toBe(400);
    expect(missingUploadFields.data.error).toMatch(/original_name and content are required/i);

    await httpRequest("POST", "/api/v1/files/upload", {
      original_name: "ok.step",
      content: Buffer.from("STEP").toString("base64"),
    });

    const missingAttachFields = await httpRequest("POST", "/api/v1/files/FILE-1/attach", {
      entity_type: "part",
    });
    expect(missingAttachFields.status).toBe(400);
    expect(missingAttachFields.data.error).toMatch(/entity_type and entity_id are required/i);
  });

  it("returns 404s for unknown part and file ids", async () => {
    const missingPart = await httpRequest("GET", "/api/v1/parts/PART-404");
    expect(missingPart.status).toBe(404);
    expect(missingPart.data.error).toMatch(/part not found/i);

    const missingRevisions = await httpRequest("GET", "/api/v1/parts/PART-404/revisions");
    expect(missingRevisions.status).toBe(404);
    expect(missingRevisions.data.error).toMatch(/part not found/i);

    const missingFileVersions = await httpRequest("GET", "/api/v1/files/FILE-404/versions");
    expect(missingFileVersions.status).toBe(404);
    expect(missingFileVersions.data.error).toMatch(/file not found/i);
  });
});
