/**
 * JM Die team seed — 8 office/management profiles (hotel iter23).
 *
 * Roles per operator directive (2026-05-24):
 *   Mark    — developer + cnc_manager (mill, lathe, mill-turn, 5-axis); delegation, programming, training
 *   Adam    — shop_foreman; main customer + employee POC for shop questions
 *   Darren  — sales, quoting; owner's right hand; full front-office + customer dealings
 *   Paul    — owner; FULL ACCESS; consumes detailed feature reports + tutorials
 *   Sylwia  — HR, office manager, accounting, customer service, ordering
 *   Colleen — receptionist, purchasing, inventory
 *   Vicky   — shipping + receiving + laser marking; UPS/FedEx; PDF/picture intake
 *   Stanley — assistant manager; backup for Adam with LESS admin (no hiring, no payroll, no financial-write)
 *
 * "we'll get to shop floor guys later" — shop floor operators intentionally excluded.
 *
 * Order matters: profiles with is_backup_for must come AFTER the referenced primary.
 * Stanley references Adam → seed Adam before Stanley.
 */

import type { UserProfileInput, PrismFeature } from "../engines/JmDieUserProfileEngine.js";

// ── canonical permission bundles per role ────────────────────────────────────
// Owner (Paul): empty array here — engine treats role==="owner" as OWNER_ALL_FEATURES.

const ADAM_PERMISSIONS: PrismFeature[] = [
  // shop floor — full authority
  "shop_floor.view_jobs",
  "shop_floor.write_jobs",
  "shop_floor.delegate_tasks",
  "shop_floor.view_labor",
  "shop_floor.write_labor",
  "shop_floor.scheduling",
  // tooling + material ordering
  "inventory.view",
  "inventory.write",
  "inventory.order_tools",
  "inventory.order_materials",
  "inventory.manage_crib",
  // PO authority
  "purchasing.create_po",
  "purchasing.approve_po",
  "purchasing.vendor_management",
  // quoting (foreman quoting)
  "quoting.view",
  "quoting.create",
  "quoting.approve",
  // customer-facing
  "sales.view_customer_data",
  "sales.customer_service",
  // hiring (HR-light)
  "hr.view_employees",
  "hr.hiring",
];

// Stanley = Adam-minus: removes hiring + financial-write + payroll
const STANLEY_PERMISSIONS: PrismFeature[] = ADAM_PERMISSIONS.filter(
  (f) =>
    f !== "hr.hiring" &&
    f !== "purchasing.approve_po" &&
    f !== "quoting.approve" &&
    f !== "inventory.order_materials" // material POs still require Adam sign-off
);

const MARK_PERMISSIONS: PrismFeature[] = [
  // mill cnc manager
  "shop_floor.view_jobs",
  "shop_floor.write_jobs",
  "shop_floor.delegate_tasks",
  "shop_floor.view_labor",
  "shop_floor.scheduling",
  // tooling
  "inventory.view",
  "inventory.write",
  "inventory.order_tools",
  "inventory.manage_crib",
  // CAD/CAM domain — full
  "cad_cam.programming",
  "cad_cam.post_processing",
  "cad_cam.simulation",
  "cad_cam.reverse_engineering",
  "cad_cam.training",
  // sales/quoting assist
  "quoting.view",
  "quoting.create",
  "sales.view_customer_data",
  // developer access — system + audit + tutorials
  "admin.user_management",
  "admin.system_config",
  "admin.view_audit",
  "admin.tutorials_authoring",
];

const DARREN_PERMISSIONS: PrismFeature[] = [
  // sales — full
  "sales.view_prospects",
  "sales.write_prospects",
  "sales.send_first_contact",
  "sales.view_customer_data",
  "sales.customer_service",
  // quoting — full incl. approve + send
  "quoting.view",
  "quoting.create",
  "quoting.approve",
  "quoting.send",
  // jobs + scheduling read
  "shop_floor.view_jobs",
  "shop_floor.view_labor",
  "shop_floor.scheduling",
  // accounting visibility — view-only
  "accounting.view_ar",
  "accounting.view_gl",
  "accounting.financial_reports",
  // vendor management (owner's right hand)
  "purchasing.create_po",
  "purchasing.vendor_management",
];

const SYLWIA_PERMISSIONS: PrismFeature[] = [
  // HR — full
  "hr.view_employees",
  "hr.write_employees",
  "hr.hiring",
  "hr.payroll_admin",
  // accounting — full
  "accounting.view_ar",
  "accounting.write_ar",
  "accounting.view_gl",
  "accounting.write_gl",
  "accounting.run_payroll",
  "accounting.financial_reports",
  // office mgr
  "office.reception",
  "office.document_management",
  // customer service + ordering
  "sales.customer_service",
  "sales.view_customer_data",
  "purchasing.create_po",
  "purchasing.vendor_management",
  // basic inventory view
  "inventory.view",
];

const COLLEEN_PERMISSIONS: PrismFeature[] = [
  // reception
  "office.reception",
  "office.document_management",
  // purchasing
  "purchasing.create_po",
  "purchasing.vendor_management",
  // inventory — full
  "inventory.view",
  "inventory.write",
  "inventory.order_tools",
  "inventory.order_materials",
  "inventory.manage_crib",
  // basic customer-service visibility
  "sales.customer_service",
  "sales.view_customer_data",
];

const VICKY_PERMISSIONS: PrismFeature[] = [
  // shipping — full
  "shipping.view",
  "shipping.create",
  "shipping.ups_fedex_integration",
  "shipping.laser_marking",
  // receiving — full incl. PDF + picture intake (Docustrata replacement)
  "receiving.view",
  "receiving.write",
  "receiving.intake_pdfs",
  "receiving.intake_pictures",
  // shipping touches customer-service edge
  "sales.customer_service",
  "office.document_management",
];

// ── 8 seeded profiles ────────────────────────────────────────────────────────

export const JM_DIE_TEAM_SEED: UserProfileInput[] = [
  {
    id: "user-paul",
    legal_name: "Paul",
    display_name: "Paul",
    role: "owner",
    work_email: "paul@jmdie.com",
    responsibilities: [
      "Owner — full operational oversight",
      "Consumer of feature-by-feature PRISM reports + tutorials",
      "Strategic direction + customer relationships",
    ],
    owned_domains: ["everything"],
    permissions: [], // owner role short-circuits to OWNER_ALL_FEATURES
    notes:
      "Receives owner-tier reports for every PRISM feature. Tutorials + interactive guides authored " +
      "for him propagate shop-wide.",
  },
  {
    id: "user-mark",
    legal_name: "Mark Villanueva",
    display_name: "Mark",
    role: "cnc_manager_developer",
    work_email: "mvillanueva@jmdie.com",
    responsibilities: [
      "Developer of PRISM platform",
      "CNC machinist — mill, lathe, 5-axis, mill-turn",
      "Current milling CNC manager",
      "Task delegation, tool ordering, reverse engineering",
      "CAD/CAM programming, setups, troubleshooting",
      "Training + helping operators",
      "Assists sales, quoting, office personnel",
    ],
    owned_domains: ["cad_cam", "mill_cnc", "tooling", "prism_platform"],
    permissions: MARK_PERMISSIONS,
    notes: "PRISM developer — also a working machinist + mill-CNC manager.",
  },
  {
    id: "user-adam",
    legal_name: "Adam",
    display_name: "Adam",
    role: "shop_foreman",
    work_email: "adam@jmdie.com",
    responsibilities: [
      "Shop foreman — main POC for customers + employees on shop questions",
      "Task delegation, material ordering, tooling ordering",
      "Quoting, customer service for part issues",
      "Scheduling, hiring",
      "All traditional shop-floor manager duties",
    ],
    owned_domains: ["shop_floor", "scheduling", "tooling", "materials", "hiring"],
    permissions: ADAM_PERMISSIONS,
    notes: "Primary shop-floor authority. Stanley shadows him as backup.",
  },
  {
    id: "user-darren",
    legal_name: "Darren",
    display_name: "Darren",
    role: "sales_quoting",
    work_email: "darren@jmdie.com",
    responsibilities: [
      "Sales + quoting",
      "Owner's right hand — full knowledge of front office + customer dealings",
      "Vendor management",
      "Customer-facing approvals",
    ],
    owned_domains: ["sales", "quoting", "front_office", "customer_data"],
    permissions: DARREN_PERMISSIONS,
    notes: "Read access to accounting for quote profitability + customer credit decisions.",
  },
  {
    id: "user-sylwia",
    legal_name: "Sylwia",
    display_name: "Sylwia",
    role: "hr_office_manager",
    work_email: "sylwia@jmdie.com",
    responsibilities: [
      "HR — full",
      "Office manager",
      "Accounting (AR/GL/payroll/financial reports)",
      "Customer service",
      "Ordering",
    ],
    owned_domains: ["hr", "accounting", "office", "customer_service"],
    permissions: SYLWIA_PERMISSIONS,
    notes: "Authoritative on payroll + financial writes.",
  },
  {
    id: "user-colleen",
    legal_name: "Colleen",
    display_name: "Colleen",
    role: "receptionist_purchasing",
    work_email: "colleen@jmdie.com",
    responsibilities: ["Receptionist", "Purchasing", "Inventory"],
    owned_domains: ["reception", "purchasing", "inventory"],
    permissions: COLLEEN_PERMISSIONS,
    notes: "Inventory + purchasing day-to-day operator.",
  },
  {
    id: "user-vicky",
    legal_name: "Vicky",
    display_name: "Vicky",
    role: "shipping_receiving",
    work_email: "vicky@jmdie.com",
    responsibilities: [
      "Shipping + receiving",
      "Laser marking",
      "UPS account integration",
      "FedEx account integration",
      "Excel + Docustrata-equivalent PDF + picture intake (Paul's Evernote replacement)",
    ],
    owned_domains: ["shipping", "receiving", "laser_marking", "carrier_integration"],
    permissions: VICKY_PERMISSIONS,
    notes:
      "Needs UPS/FedEx integration + email-based intake + PDF/picture ingest matching Docustrata feature " +
      "set. Subsystem still in build.",
  },
  // is_backup_for=user-adam — seed AFTER Adam
  {
    id: "user-stanley",
    legal_name: "Stanley",
    display_name: "Stanley",
    role: "asst_shop_foreman",
    work_email: "stanley@jmdie.com",
    responsibilities: [
      "Assistant manager",
      "Task delegation",
      "Backup for Adam with LESS administrative rights",
      "(No hiring, no PO approval, no quote approval, no material POs without Adam)",
    ],
    owned_domains: ["shop_floor", "delegation", "backup"],
    permissions: STANLEY_PERMISSIONS,
    is_backup_for: "user-adam",
    notes: "Backup role — exactly Adam minus 4 admin features (hiring, PO approval, quote approval, material POs).",
  },
];
