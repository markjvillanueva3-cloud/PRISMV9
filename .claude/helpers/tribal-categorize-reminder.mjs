/**
 * tribal-categorize-reminder.mjs — UserPromptSubmit hook
 *
 * When the user's prompt mentions tribal knowledge, tips, shop knowledge,
 * or categorization, injects a reminder that auto-categorization is active
 * and how to use it.
 */
import process from "node:process";

const TRIBAL_KEYWORDS = /\b(tribal.?knowledge|shop.?knowledge|tribal.?tip|categoriz|auto.?tag|knowledge.?base|tribal_capture|tribal_add|tip.*capture|capture.*tip)\b/i;

async function main().catch(() => { process.stdout.write(JSON.stringify({ continue: true })); }) {
  const userPrompt = process.env.USER_PROMPT || "";

  if (TRIBAL_KEYWORDS.test(userPrompt)) {
    process.stdout.write(JSON.stringify({
      additionalContext: [
        "TRIBAL KNOWLEDGE AUTO-CATEGORIZATION IS ACTIVE.",
        "All new tips captured via tribal_capture or ingest() are auto-enriched by ContentAutoTaggerEngine:",
        "- Category inferred from content if 'general' or missing",
        "- material_groups extracted from body text (ISO P/M/K/N/S/H)",
        "- operation_types extracted (milling, turning, drilling, etc.)",
        "- domain classified (shop_floor, cam_software, safety, etc.)",
        "- subcategory assigned for finer granularity",
        "- auto_tags added with structured entity prefixes (material:, operation:, machine:, tool:, controller:)",
        "To recategorize existing tips: use prism_knowledge → tribal_recategorize (force=true to redo all).",
        "Stats include by_domain breakdown and auto_categorized_count."
      ].join(" "),
    }));
  } else {
    process.stdout.write(JSON.stringify({ continue: true }));
  }
}

main().catch(() => { process.stdout.write(JSON.stringify({ continue: true })); });
