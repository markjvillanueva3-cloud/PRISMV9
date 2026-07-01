import express from "express";
import http from "node:http";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { registerRoutes } from "../routes/index.js";

function httpRequest(
  method: string,
  urlPath: string,
  body?: Record<string, unknown>,
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
              "Content-Length": Buffer.byteLength(serialized),
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

let server: http.Server;
let port = 0;

describe("Mounted learning course routes", () => {
  beforeAll(async () => {
    const app = express();
    app.use(express.json());
    registerRoutes(app, async (toolName, action) => {
      throw new Error(`Unexpected tool call for learning course routes: ${toolName}:${action}`);
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

  it("supports mounted learning course creation, enrollment, progression, media, and facets flows", async () => {
    const courseTitle = `VF-2 Setup ${randomUUID()}`;
    const createCourse = await httpRequest("POST", "/api/v1/learning/courses", {
      title: courseTitle,
      description: "Structured setup onboarding",
      domain: "MachineOperation",
      difficulty: "beginner",
      machine_type: "VMC",
      material_focus: "aluminum",
      cam_system: "Fusion360",
      process_type: "milling",
      tags: ["setup", "haas"],
      is_published: true,
      modules: [
        { title: "Work Holding", has_checkpoint: true, checkpoint_type: "quiz" },
        { title: "WCS Setup", has_checkpoint: true, checkpoint_type: "quiz" },
        { title: "First Part", has_checkpoint: true, checkpoint_type: "practical" },
      ],
    });
    expect(createCourse.status).toBe(200);
    expect(createCourse.data.ok).toBe(true);
    expect(createCourse.data.data.id).toBeTruthy();
    expect(createCourse.data.data.modules).toHaveLength(3);

    const courseId = createCourse.data.data.id as string;
    const userId = `U-${randomUUID()}`;

    const listCourses = await httpRequest(
      "GET",
      `/api/v1/learning/courses?machine_type=VMC&query=${encodeURIComponent("VF-2")}`,
    );
    expect(listCourses.status).toBe(200);
    expect(listCourses.data.ok).toBe(true);
    expect(listCourses.data.data.courses.some((course: any) => course.id === courseId)).toBe(true);
    expect(listCourses.data.data.facets.machine_types.VMC).toBeGreaterThanOrEqual(1);

    const getCourse = await httpRequest("GET", `/api/v1/learning/courses/${encodeURIComponent(courseId)}`);
    expect(getCourse.status).toBe(200);
    expect(getCourse.data.data.title).toBe(courseTitle);

    const enroll = await httpRequest("POST", "/api/v1/learning/enroll", {
      user_id: userId,
      course_id: courseId,
    });
    expect(enroll.status).toBe(200);
    expect(enroll.data.ok).toBe(true);
    expect(enroll.data.data.status).toBe("enrolled");

    const enrollmentId = enroll.data.data.id as string;

    const summary = await httpRequest(
      "GET",
      `/api/v1/learning/my-progress?user_id=${encodeURIComponent(userId)}`,
    );
    expect(summary.status).toBe(200);
    expect(summary.data.ok).toBe(true);
    expect(summary.data.data.total_enrolled).toBe(1);
    expect(summary.data.data.enrollments).toHaveLength(1);

    const checkpoint = await httpRequest("POST", "/api/v1/learning/checkpoint", {
      enrollment_id: enrollmentId,
      module_idx: 0,
      answers: [{ answer: "Work Holding" }, { answer: "beginner" }],
    });
    expect(checkpoint.status).toBe(200);
    expect(checkpoint.data.ok).toBe(true);
    expect(checkpoint.data.data.passed).toBe(true);

    const progress = await httpRequest(
      "GET",
      `/api/v1/learning/my-progress?user_id=${encodeURIComponent(userId)}&course_id=${encodeURIComponent(courseId)}`,
    );
    expect(progress.status).toBe(200);
    expect(progress.data.ok).toBe(true);
    expect(progress.data.data.current_module_idx).toBe(1);
    expect(progress.data.data.status).toBe("in_progress");

    const addMedia = await httpRequest("POST", "/api/v1/learning/media", {
      course_id: courseId,
      module_idx: 1,
      media_type: "video",
      title: "WCS Walkthrough",
      duration_sec: 240,
    });
    expect(addMedia.status).toBe(200);
    expect(addMedia.data.ok).toBe(true);

    const listMedia = await httpRequest(
      "GET",
      `/api/v1/learning/media/${encodeURIComponent(courseId)}?module_idx=1`,
    );
    expect(listMedia.status).toBe(200);
    expect(listMedia.data.ok).toBe(true);
    expect(listMedia.data.data).toHaveLength(1);
    expect(listMedia.data.data[0].title).toBe("WCS Walkthrough");

    const facets = await httpRequest("GET", "/api/v1/learning/facets?machine_type=VMC");
    expect(facets.status).toBe(200);
    expect(facets.data.ok).toBe(true);
    expect(facets.data.data.facets.machine_types.VMC).toBeGreaterThanOrEqual(1);
  });

  it("fails closed for missing progress user, missing course, duplicate enrollment, invalid media filter, and missing media course", async () => {
    const course = await httpRequest("POST", "/api/v1/learning/courses", {
      title: `Lathe Basics ${randomUUID()}`,
      domain: "MachineOperation",
      difficulty: "beginner",
      is_published: true,
      modules: [{ title: "Chuck Setup", has_checkpoint: true, checkpoint_type: "quiz" }],
    });
    expect(course.status).toBe(200);
    const courseId = course.data.data.id as string;
    const userId = `U-${randomUUID()}`;

    const missingProgressUser = await httpRequest("GET", "/api/v1/learning/my-progress");
    expect(missingProgressUser.status).toBe(400);
    expect(missingProgressUser.data.ok).toBe(false);

    const missingCourse = await httpRequest("GET", `/api/v1/learning/courses/${encodeURIComponent(`missing-${randomUUID()}`)}`);
    expect(missingCourse.status).toBe(404);
    expect(missingCourse.data.ok).toBe(false);

    const firstEnroll = await httpRequest("POST", "/api/v1/learning/enroll", {
      user_id: userId,
      course_id: courseId,
    });
    expect(firstEnroll.status).toBe(200);

    const duplicateEnroll = await httpRequest("POST", "/api/v1/learning/enroll", {
      user_id: userId,
      course_id: courseId,
    });
    expect(duplicateEnroll.status).toBe(400);
    expect(duplicateEnroll.data.ok).toBe(false);

    const invalidMediaFilter = await httpRequest(
      "GET",
      `/api/v1/learning/media/${encodeURIComponent(courseId)}?module_idx=not-a-number`,
    );
    expect(invalidMediaFilter.status).toBe(400);
    expect(invalidMediaFilter.data.ok).toBe(false);

    const missingMediaCourse = await httpRequest("POST", "/api/v1/learning/media", {
      course_id: `missing-${randomUUID()}`,
      media_type: "pdf",
      title: "Missing course doc",
    });
    expect(missingMediaCourse.status).toBe(400);
    expect(missingMediaCourse.data.ok).toBe(false);
  });
});
