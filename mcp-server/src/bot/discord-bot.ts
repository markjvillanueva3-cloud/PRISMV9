/**
 * PRISM Discord Bot — Manufacturing Intelligence via Messaging
 *
 * Connects PRISM's 67 dispatchers to Discord slash commands.
 * Maintains per-channel manufacturing context (machine, material, tool).
 *
 * Architecture:
 *   Discord slash command -> COMMAND_MAP -> dispatcher.action -> formatEmbed -> reply
 *   Per-channel context persists machine/material/tool for follow-up queries.
 *
 * @module bot/discord-bot
 */

// Types aligned with discord.js v14 — actual import requires `npm i discord.js`
// import { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, EmbedBuilder } from 'discord.js';

// ---------------------------------------------------------------------------
// Channel context store
// ---------------------------------------------------------------------------

export interface ChannelContext {
  machine?: string;
  material?: string;
  tool?: string;
  operation?: string;
  lastResult?: unknown;
  userId?: string;
  updatedAt?: number;
}

const channelContext: Map<string, ChannelContext> = new Map();

// ---------------------------------------------------------------------------
// Command definitions mapped to PRISM dispatchers
// ---------------------------------------------------------------------------

export interface CommandDef {
  dispatcher: string;
  action: string;
  description: string;
  category: 'calculation' | 'lookup' | 'generation' | 'analysis';
}

const COMMAND_MAP: Record<string, CommandDef> = {
  // --- Calculations ---
  calc:      { dispatcher: 'prism_calc',            action: 'speed_feed',             description: 'Quick manufacturing calculation',      category: 'calculation' },
  sf:        { dispatcher: 'prism_calc',            action: 'sf_orchestrate',         description: 'Speed & feed calculation',             category: 'calculation' },
  wear:      { dispatcher: 'prism_calc',            action: 'tool_life',              description: 'Tool wear prediction',                 category: 'calculation' },
  stability: { dispatcher: 'prism_calc',            action: 'chatter_stability_lobes', description: 'Stability lobe diagram',              category: 'calculation' },

  // --- Lookups ---
  material:  { dispatcher: 'prism_data',            action: 'material_search',        description: 'Material property lookup',             category: 'lookup' },
  tool:      { dispatcher: 'prism_data',            action: 'tool_search',            description: 'Cutting tool search (95K+ catalog)',   category: 'lookup' },
  machine:   { dispatcher: 'prism_data',            action: 'catalog_machine_lookup', description: 'Machine profile lookup (910 machines)', category: 'lookup' },
  alarm:     { dispatcher: 'prism_data',            action: 'alarm_decode',           description: 'Machine alarm code lookup',            category: 'lookup' },
  playbook:  { dispatcher: 'prism_shop_practice',   action: 'playbook_advise',        description: 'Machining best practice (296 rules)',  category: 'lookup' },

  // --- Generation ---
  quote:     { dispatcher: 'prism_business',        action: 'quote_estimate',         description: 'Job quote estimation',                 category: 'generation' },
  program:   { dispatcher: 'prism_cam',             action: 'print_to_program_full',  description: 'Generate CNC program',                 category: 'generation' },
  post:      { dispatcher: 'prism_cam',             action: 'post_process',           description: 'Post-process G-code (20 dialects)',    category: 'generation' },
  setup:     { dispatcher: 'prism_cam',             action: 'setup_sheet_generate',   description: 'Generate setup sheet',                 category: 'generation' },

  // --- Analysis ---
  simulate:    { dispatcher: 'prism_cam',           action: 'cnc_simulate',           description: 'CNC simulation (8-layer physics)',     category: 'analysis' },
  feasibility: { dispatcher: 'prism_feasibility',   action: 'feasibility_simulate',   description: 'Manufacturing feasibility check',      category: 'analysis' },
};

// ---------------------------------------------------------------------------
// Slash command builders (discord.js SlashCommandBuilder compatible shape)
// ---------------------------------------------------------------------------

interface CommandOption {
  name: string;
  description: string;
  type: 'string' | 'number';
  required?: boolean;
  choices?: { name: string; value: string }[];
}

interface CommandSchema {
  name: string;
  description: string;
  options: CommandOption[];
}

/** Material choices for autocomplete */
const MATERIAL_CHOICES = [
  { name: 'Ti-6Al-4V (Titanium)', value: 'Ti-6Al-4V' },
  { name: '316L (Stainless Steel)', value: '316L' },
  { name: '7075-T6 (Aluminum)', value: '7075-T6' },
  { name: '4140 (Alloy Steel)', value: '4140' },
  { name: 'Inconel 718', value: 'Inconel 718' },
];

const OPERATION_CHOICES = [
  { name: 'Milling', value: 'milling' },
  { name: 'Turning', value: 'turning' },
  { name: 'Drilling', value: 'drilling' },
  { name: 'Threading', value: 'threading' },
  { name: 'Grinding', value: 'grinding' },
];

const CONTROLLER_CHOICES = [
  { name: 'Fanuc', value: 'fanuc' },
  { name: 'Siemens', value: 'siemens' },
  { name: 'Haas', value: 'haas' },
  { name: 'Heidenhain', value: 'heidenhain' },
  { name: 'Mazak', value: 'mazak' },
  { name: 'Okuma', value: 'okuma' },
];

function buildCommands(): CommandSchema[] {
  return Object.entries(COMMAND_MAP).map(([name, config]) => {
    const options: CommandOption[] = [];

    // Calculation commands get material/diameter/operation
    if (['sf', 'calc', 'wear', 'stability'].includes(name)) {
      options.push(
        { name: 'material',  description: 'Material (e.g., Ti-6Al-4V, 316L, 7075-T6)', type: 'string',  choices: MATERIAL_CHOICES },
        { name: 'diameter',  description: 'Tool diameter in mm',                         type: 'number' },
        { name: 'operation', description: 'Operation type',                              type: 'string',  choices: OPERATION_CHOICES },
      );
    }

    // Material lookup
    if (name === 'material') {
      options.push({ name: 'query', description: 'Material name or grade', type: 'string', required: true });
    }

    // Tool search
    if (name === 'tool') {
      options.push(
        { name: 'query',     description: 'Tool type or search term',  type: 'string', required: true },
        { name: 'diameter',  description: 'Tool diameter in mm',       type: 'number' },
        { name: 'operation', description: 'Operation type',            type: 'string', choices: OPERATION_CHOICES },
      );
    }

    // Alarm lookup
    if (name === 'alarm') {
      options.push(
        { name: 'code',       description: 'Alarm code (e.g., 1001)',                    type: 'string', required: true },
        { name: 'controller', description: 'Controller type (Fanuc, Siemens, Haas, ...)', type: 'string', choices: CONTROLLER_CHOICES },
      );
    }

    // Quote
    if (name === 'quote') {
      options.push(
        { name: 'description', description: 'Part description',  type: 'string', required: true },
        { name: 'quantity',    description: 'Order quantity',     type: 'number' },
        { name: 'material',   description: 'Material',           type: 'string', choices: MATERIAL_CHOICES },
      );
    }

    // Playbook
    if (name === 'playbook') {
      options.push(
        { name: 'query',     description: 'Machining scenario or question', type: 'string', required: true },
        { name: 'operation', description: 'Operation type',                 type: 'string', choices: OPERATION_CHOICES },
      );
    }

    // Machine lookup
    if (name === 'machine') {
      options.push({ name: 'query', description: 'Machine name or brand', type: 'string', required: true });
    }

    // Simulate / feasibility
    if (['simulate', 'feasibility'].includes(name)) {
      options.push(
        { name: 'material',  description: 'Material',            type: 'string', choices: MATERIAL_CHOICES },
        { name: 'operation', description: 'Operation type',      type: 'string', choices: OPERATION_CHOICES },
        { name: 'machine',   description: 'Machine name/model',  type: 'string' },
      );
    }

    return { name, description: config.description, options };
  });
}

// ---------------------------------------------------------------------------
// Embed formatter (Discord embed structure)
// ---------------------------------------------------------------------------

interface EmbedField {
  name: string;
  value: string;
  inline: boolean;
}

interface DiscordEmbed {
  color: number;
  title: string;
  description?: string;
  fields: EmbedField[];
  footer: { text: string };
  timestamp: string;
}

const COLOR_SUCCESS = 0x00C853;   // Green
const COLOR_ERROR   = 0xFF1744;   // Red
const COLOR_WARN    = 0xFFAB00;   // Amber
const COLOR_INFO    = 0x2979FF;   // Blue

function formatEmbed(command: string, result: { success: boolean; data?: Record<string, unknown>; warnings?: string[]; error?: string }): DiscordEmbed {
  const color = result.success
    ? (result.warnings?.length ? COLOR_WARN : COLOR_SUCCESS)
    : COLOR_ERROR;

  const fields: EmbedField[] = [];

  if (result.data) {
    // Flatten key results into embed fields (max 25 per Discord spec)
    const entries = Object.entries(result.data)
      .filter(([, v]) => v !== null && v !== undefined && typeof v !== 'object')
      .slice(0, 25);

    for (const [k, v] of entries) {
      fields.push({
        name: k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        value: String(v),
        inline: true,
      });
    }
  }

  if (result.warnings?.length) {
    fields.push({
      name: 'Warnings',
      value: result.warnings.map(w => `- ${w}`).join('\n').substring(0, 1024),
      inline: false,
    });
  }

  if (result.error) {
    fields.push({ name: 'Error', value: result.error.substring(0, 1024), inline: false });
  }

  return {
    color,
    title: `PRISM ${command.toUpperCase()}`,
    fields,
    footer: { text: 'PRISM v9 Manufacturing Intelligence' },
    timestamp: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Context helpers
// ---------------------------------------------------------------------------

function getOrCreateContext(channelId: string): ChannelContext {
  let ctx = channelContext.get(channelId);
  if (!ctx) {
    ctx = {};
    channelContext.set(channelId, ctx);
  }
  return ctx;
}

function updateContext(channelId: string, args: Record<string, unknown>): void {
  const ctx = getOrCreateContext(channelId);
  if (args.material)  ctx.material  = String(args.material);
  if (args.machine)   ctx.machine   = String(args.machine);
  if (args.tool)      ctx.tool      = String(args.tool);
  if (args.operation) ctx.operation  = String(args.operation);
  ctx.updatedAt = Date.now();
}

function mergeContextWithArgs(channelId: string, args: Record<string, unknown>): Record<string, unknown> {
  const ctx = getOrCreateContext(channelId);
  // Context fills in gaps — explicit args always win
  return {
    ...(ctx.material  && { material:  ctx.material }),
    ...(ctx.machine   && { machine:   ctx.machine }),
    ...(ctx.tool      && { tool:      ctx.tool }),
    ...(ctx.operation && { operation: ctx.operation }),
    ...args,
  };
}

function clearContext(channelId: string): void {
  channelContext.delete(channelId);
}

function pruneStaleContexts(ttlMs: number): number {
  const now = Date.now();
  let pruned = 0;
  for (const [id, ctx] of channelContext) {
    if (ctx.updatedAt && now - ctx.updatedAt > ttlMs) {
      channelContext.delete(id);
      pruned++;
    }
  }
  return pruned;
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export {
  COMMAND_MAP,
  buildCommands,
  formatEmbed,
  channelContext,
  getOrCreateContext,
  updateContext,
  mergeContextWithArgs,
  clearContext,
  pruneStaleContexts,
  MATERIAL_CHOICES,
  OPERATION_CHOICES,
  CONTROLLER_CHOICES,
  COLOR_SUCCESS,
  COLOR_ERROR,
  COLOR_WARN,
  COLOR_INFO,
};
export type { CommandSchema, CommandOption, DiscordEmbed, EmbedField };
