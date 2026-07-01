/**
 * JM Die team inbox configs — per-user IMAP coordinates for the Tuesday
 * print-extraction batch (hotel iter24).
 *
 * SECURITY: this file contains NO passwords. Every entry references an env
 * var name that must be set in the runtime environment. Missing env var →
 * EmailPrintIntakeEngine.runBatch() returns status='no_credentials' for that
 * user and continues with the next.
 *
 * Required env vars (set in the deployment env, not committed):
 *   JM_DIE_MARK_IMAP_PW
 *   JM_DIE_ADAM_IMAP_PW
 *   JM_DIE_DARREN_IMAP_PW
 *   JM_DIE_PAUL_IMAP_PW
 *   JM_DIE_SYLWIA_IMAP_PW
 *   JM_DIE_COLLEEN_IMAP_PW
 *   JM_DIE_VICKY_IMAP_PW
 *   JM_DIE_STANLEY_IMAP_PW
 *
 * Picture intake is enabled only for users whose role legitimately needs it
 * (Vicky = shipping/receiving with laser marking; Mark + Adam = shop-floor
 * photo evidence). PII risk is documented in feedback_jm_die_inbox_configs.md.
 */

import type { InboxConfig } from "../engines/EmailPrintIntakeEngine.js";

const COMMON: Pick<InboxConfig, "imap_host" | "imap_port" | "use_tls" | "folder" | "search_since_days"> = {
  imap_host: "imap.gmail.com",  // JM Die runs Google Workspace
  imap_port: 993,
  use_tls: true,
  folder: "INBOX",
  search_since_days: 8,         // 8 = Tuesday-to-Tuesday + 1 day safety lap
};

export const JM_DIE_INBOX_SEED: InboxConfig[] = [
  {
    ...COMMON,
    user_id: "user-mark",
    email_address: "mvillanueva@jmdie.com",
    password_env_var: "JM_DIE_MARK_IMAP_PW",
    output_bucket: "H:/prism/JM DIE/_intake/mark",
    pictures_allowed: true,    // CAD/CAM reviews benefit from shop photos
  },
  {
    ...COMMON,
    user_id: "user-adam",
    email_address: "adam@jmdie.com",
    password_env_var: "JM_DIE_ADAM_IMAP_PW",
    output_bucket: "H:/prism/JM DIE/_intake/adam",
    pictures_allowed: true,    // foreman approvals + customer-rejection evidence
  },
  {
    ...COMMON,
    user_id: "user-darren",
    email_address: "darren@jmdie.com",
    password_env_var: "JM_DIE_DARREN_IMAP_PW",
    output_bucket: "H:/prism/JM DIE/_intake/darren",
    pictures_allowed: false,   // quoting almost always PDFs; suppress PII risk
  },
  {
    ...COMMON,
    user_id: "user-paul",
    email_address: "paul@jmdie.com",
    password_env_var: "JM_DIE_PAUL_IMAP_PW",
    output_bucket: "H:/prism/JM DIE/_intake/paul",
    pictures_allowed: true,    // owner — full feature
  },
  {
    ...COMMON,
    user_id: "user-sylwia",
    email_address: "sylwia@jmdie.com",
    password_env_var: "JM_DIE_SYLWIA_IMAP_PW",
    output_bucket: "H:/prism/JM DIE/_intake/sylwia",
    pictures_allowed: false,   // HR/accounting — PII risk if pictures slip in
  },
  {
    ...COMMON,
    user_id: "user-colleen",
    email_address: "colleen@jmdie.com",
    password_env_var: "JM_DIE_COLLEEN_IMAP_PW",
    output_bucket: "H:/prism/JM DIE/_intake/colleen",
    pictures_allowed: false,   // purchasing/inventory — PDF-heavy domain
  },
  {
    ...COMMON,
    user_id: "user-vicky",
    email_address: "vicky@jmdie.com",
    password_env_var: "JM_DIE_VICKY_IMAP_PW",
    output_bucket: "H:/prism/JM DIE/_intake/vicky",
    pictures_allowed: true,    // shipping/receiving — Docustrata replacement;
                               // pictures REQUIRED for damage evidence + laser-mark proofs
  },
  {
    ...COMMON,
    user_id: "user-stanley",
    email_address: "stanley@jmdie.com",
    password_env_var: "JM_DIE_STANLEY_IMAP_PW",
    output_bucket: "H:/prism/JM DIE/_intake/stanley",
    pictures_allowed: true,    // backup-foreman — same picture access as Adam
  },
];
