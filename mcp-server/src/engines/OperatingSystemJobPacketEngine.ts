import type { JobInput } from "./JobDeskAggregatorEngine.js";

export type PacketDepartmentStatus = "pending" | "current" | "complete";

export interface PacketDepartment {
  id: string;
  label: string;
  owner: string;
  status: PacketDepartmentStatus;
  note: string;
}

export interface PacketOperation {
  id: string;
  code: string;
  label: string;
  department: string;
  estimatedMinutes: number;
  cycleSeconds: number;
  quantityTarget: number;
  note: string;
}

export interface JobTrackingPacket {
  jobId: string;
  jobName: string;
  customer: string;
  partNumber: string;
  quantity: number;
  dueDate: string;
  material: string;
  priority: string;
  qrPayload: string;
  stickerLabel: string;
  departments: PacketDepartment[];
  operations: PacketOperation[];
  packetNotes: string[];
}

export interface JobIntakeDraft {
  customer?: string;
  part_number?: string;
  description?: string;
  quantity?: string;
  material?: string;
  due_date?: string;
  priority?: string;
}

const DEPARTMENT_FLOW = [
  {
    id: "intake",
    label: "Intake",
    owner: "Planning",
    note: "Register the job, print stickers, and staple the front sheet to the packet.",
  },
  {
    id: "cad",
    label: "CAD work",
    owner: "Engineering",
    note: "Release or confirm model changes before toolpath and print packets move downstream.",
  },
  {
    id: "cam",
    label: "CAM programming",
    owner: "Programming",
    note: "Toolpath, setup sheet, and simulation sign-off live with the traveler.",
  },
  {
    id: "setup",
    label: "Job setup",
    owner: "Production",
    note: "Fixture, offsets, probing, and first-piece setup should be confirmed here.",
  },
  {
    id: "run",
    label: "Run cycle",
    owner: "Production",
    note: "Track cycle time, quantity made, and any overrun for inventory or safety stock.",
  },
  {
    id: "qc",
    label: "Quality",
    owner: "Quality",
    note: "Inspection, NCR checks, and cert packet updates belong on the same packet.",
  },
  {
    id: "shipping",
    label: "Shipping",
    owner: "Shipping",
    note: "Packout, labels, and customer-facing release complete the job packet.",
  },
];

function todayStamp() {
  return new Date().toISOString().slice(0, 10);
}

function departmentStatus(jobStatus: string, departmentIndex: number): PacketDepartmentStatus {
  if (jobStatus === "quoted") {
    return departmentIndex === 0 ? "current" : "pending";
  }

  if (jobStatus === "planned") {
    if (departmentIndex <= 1) return "complete";
    return departmentIndex === 2 ? "current" : "pending";
  }

  if (jobStatus === "in_progress") {
    if (departmentIndex <= 3) return "complete";
    return departmentIndex === 4 ? "current" : "pending";
  }

  if (jobStatus === "complete") {
    return departmentIndex === DEPARTMENT_FLOW.length - 1 ? "current" : "complete";
  }

  return "complete";
}

export class OperatingSystemJobPacketEngine {
  static buildJobPacket(
    job: JobInput & {
      customer: string;
      part_number: string;
      description: string;
      quantity: number;
      due_date: string;
      priority: string;
      material: string;
      estimated_hours: number;
    },
    options?: { seed?: number; jobNameOverride?: string },
  ): JobTrackingPacket {
    const seed = options?.seed ?? 0;
    const quantity = Math.max(job.quantity || 0, 1);
    const partNumber = job.part_number || "UNASSIGNED";
    const jobName = options?.jobNameOverride || job.description || partNumber;
    const cycleSecondsBase = Math.max(Math.round(((job.estimated_hours || 8) * 3600) / quantity), 24);

    const operations: PacketOperation[] = [
      {
        id: `${job.id}-cad`,
        code: "CAD",
        label: "CAD work",
        department: "CAD work",
        estimatedMinutes: Math.max(20, Math.round((job.estimated_hours || 8) * 10)),
        cycleSeconds: 0,
        quantityTarget: quantity,
        note: "Model revisions and print alignment should stay connected to the traveler.",
      },
      {
        id: `${job.id}-cam`,
        code: "CAM",
        label: "CAM programming",
        department: "CAM programming",
        estimatedMinutes: Math.max(30, Math.round((job.estimated_hours || 8) * 14)),
        cycleSeconds: 0,
        quantityTarget: quantity,
        note: "Toolpath, tooling, and post output should be ready before release to setup.",
      },
      {
        id: `${job.id}-setup`,
        code: "OP10",
        label: "Job setup",
        department: "Job setup",
        estimatedMinutes: Math.max(35, Math.round((job.estimated_hours || 8) * 18)),
        cycleSeconds: 0,
        quantityTarget: quantity,
        note: "Fixtures, offsets, and proving passes should be clocked independently from run time.",
      },
      {
        id: `${job.id}-run`,
        code: "OP20",
        label: "Run cycle",
        department: "Run cycle",
        estimatedMinutes: Math.max(45, Math.round((job.estimated_hours || 8) * 28)),
        cycleSeconds: cycleSecondsBase + (seed % 4) * 11,
        quantityTarget: quantity,
        note: "Operators can clock extra pieces for inventory or safety stock without overwriting the job target.",
      },
      {
        id: `${job.id}-qc`,
        code: "OP30",
        label: "Inspection",
        department: "Quality",
        estimatedMinutes: Math.max(18, Math.round((job.estimated_hours || 8) * 8)),
        cycleSeconds: Math.max(Math.round(cycleSecondsBase * 0.3), 12),
        quantityTarget: quantity,
        note: "Tie first article, in-process checks, and final inspection to the same packet.",
      },
      {
        id: `${job.id}-ship`,
        code: "OP40",
        label: "Packout / shipping",
        department: "Shipping",
        estimatedMinutes: 20,
        cycleSeconds: 0,
        quantityTarget: quantity,
        note: "Finalize labels, certs, and delivery notes from the traveler front sheet.",
      },
    ];

    const departments = DEPARTMENT_FLOW.map((department, index) => ({
      id: department.id,
      label: department.label,
      owner: department.owner,
      status: departmentStatus(job.status, index),
      note: department.note,
    }));

    const payloadParts = [
      "PRISMJOB",
      `job=${encodeURIComponent(job.id)}`,
      `name=${encodeURIComponent(jobName)}`,
      `customer=${encodeURIComponent(job.customer || "Pending customer")}`,
      `part=${encodeURIComponent(partNumber)}`,
      `qty=${quantity}`,
      `due=${encodeURIComponent(job.due_date || "Unscheduled")}`,
      `material=${encodeURIComponent(job.material || "TBD")}`,
      `priority=${encodeURIComponent(job.priority || "normal")}`,
      `departments=${encodeURIComponent(departments.map((department) => department.id).join(","))}`,
      `operations=${encodeURIComponent(operations.map((operation) => operation.code).join(","))}`,
    ];

    return {
      jobId: job.id,
      jobName,
      customer: job.customer || "Pending customer",
      partNumber,
      quantity,
      dueDate: job.due_date || "Unscheduled",
      material: job.material || "TBD",
      priority: job.priority || "normal",
      qrPayload: payloadParts.join("|"),
      stickerLabel: `${job.id} · ${partNumber}`,
      departments,
      operations,
      packetNotes: [
        "Print this front page with the job packet and keep department signoff visible.",
        "Sticker payload can be scanned from a phone or wedge scanner directly into the employee job tracker.",
        "Clocked task time should feed quote accuracy, labor cost, and tooling / machine ROI decisions.",
      ],
    };
  }

  static buildPreviewJob(form: JobIntakeDraft) {
    const previewNumber = `JOB-${new Date().getFullYear()}-${(form.part_number || "NEW")
      .replace(/[^A-Za-z0-9]/g, "")
      .slice(0, 6)
      .toUpperCase()
      .padEnd(6, "X")}`;

    return {
      id: previewNumber,
      customer: form.customer || "Pending customer",
      part_number: form.part_number || "NEW-PART",
      description: form.description || form.part_number || "New traveler packet",
      status: "planned",
      quantity: parseInt(form.quantity || "", 10) || 0,
      due_date: form.due_date || todayStamp(),
      priority: form.priority || "normal",
      material: form.material || "TBD",
      estimated_hours: 8,
      actual_hours: 0,
      created_at: todayStamp(),
    };
  }

  static buildIntakePreview(form: JobIntakeDraft) {
    const previewJob = OperatingSystemJobPacketEngine.buildPreviewJob(form);
    return {
      previewJob,
      packet: OperatingSystemJobPacketEngine.buildJobPacket(previewJob),
    };
  }
}

export const operatingSystemJobPacketEngine = new OperatingSystemJobPacketEngine();
