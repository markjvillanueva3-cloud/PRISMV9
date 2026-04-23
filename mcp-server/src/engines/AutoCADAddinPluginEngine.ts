/**
 * AutoCADAddinPluginEngine — U-CAD-APP-12 (PHASE-48)
 *
 * AutoCAD add-in plugin manager for CUI ribbon integration and
 * AutoLISP reactors wired to PRISM's event bus.
 *
 * Features:
 *   - Ribbon tab/panel/button registration
 *   - Command binding with PRISM dispatcher integration
 *   - AutoLISP reactor management (document, editor, database)
 *   - Event subscription and routing to PRISM sessions
 *   - Plugin state persistence
 *   - Command palette integration
 *
 * @module engines/AutoCADAddinPluginEngine
 */

import { z } from "zod";

// ── Schemas ─────────────────────────────────────────────────────────────────

export const ACAD_REACTOR_TYPES = [
  "DocumentCreated",
  "DocumentToBeDestroyed",
  "DocumentLockModeChanged",
  "DocumentBecameCurrent",
  "CommandWillStart",
  "CommandEnded",
  "CommandCancelled",
  "CommandFailed",
  "ObjectAppended",
  "ObjectErased",
  "ObjectModified",
  "ObjectOpenedForModify",
  "LispWillStart",
  "LispEnded",
  "LispCancelled",
  "BeginSave",
  "SaveComplete",
  "BeginPlot",
  "EndPlot",
  "LayoutSwitched",
  "ViewChanged",
  "PointMonitor",
] as const;
export type AcadReactorType = (typeof ACAD_REACTOR_TYPES)[number];

export const RibbonButtonSchema = z.object({
  id: z.string(),
  text: z.string(),
  tooltip: z.string().optional(),
  largeImage: z.string().optional(),
  smallImage: z.string().optional(),
  commandName: z.string(),
  commandParameter: z.string().optional(),
  isEnabled: z.boolean().default(true),
  isVisible: z.boolean().default(true),
  size: z.enum(["Large", "Standard", "Small"]).default("Large"),
});
export type RibbonButton = z.infer<typeof RibbonButtonSchema>;

export const RibbonPanelSchema = z.object({
  id: z.string(),
  title: z.string(),
  buttons: z.array(RibbonButtonSchema),
  isVisible: z.boolean().default(true),
});
export type RibbonPanel = z.infer<typeof RibbonPanelSchema>;

export const RibbonTabSchema = z.object({
  id: z.string(),
  title: z.string(),
  panels: z.array(RibbonPanelSchema),
  isVisible: z.boolean().default(true),
  isContextual: z.boolean().default(false),
});
export type RibbonTab = z.infer<typeof RibbonTabSchema>;

export const CommandBindingSchema = z.object({
  commandName: z.string(),
  displayName: z.string(),
  description: z.string().optional(),
  dispatcherAction: z.string(),
  dispatcherArgs: z.record(z.string(), z.unknown()).optional(),
  flags: z.array(z.enum([
    "Modal",
    "Transparent",
    "UsePickSet",
    "Redraw",
    "NoPerspective",
    "NoMultiple",
    "NoTileMode",
    "NoPaperSpace",
    "NoOEM",
    "Undefined",
    "InProgress",
    "Defun",
    "NoNewStack",
    "NoInternalLock",
    "DocExclusiveLock",
    "Session",
    "Interruptible",
    "NoHistory",
    "NoUndoMarker",
    "NoBlockEditor",
  ])).default(["Modal"]),
});
export type CommandBinding = z.infer<typeof CommandBindingSchema>;

export const ReactorBindingSchema = z.object({
  id: z.string(),
  reactorType: z.enum(ACAD_REACTOR_TYPES),
  dispatcherAction: z.string(),
  dispatcherArgs: z.record(z.string(), z.unknown()).optional(),
  filter: z.object({
    commandNames: z.array(z.string()).optional(),
    objectTypes: z.array(z.string()).optional(),
    layers: z.array(z.string()).optional(),
  }).optional(),
  isEnabled: z.boolean().default(true),
  sessionIds: z.array(z.string()).optional(),
});
export type ReactorBinding = z.infer<typeof ReactorBindingSchema>;

export const ReactorEventSchema = z.object({
  id: z.string(),
  reactorType: z.enum(ACAD_REACTOR_TYPES),
  timestamp: z.string().datetime(),
  documentName: z.string().optional(),
  commandName: z.string().optional(),
  objectHandle: z.string().optional(),
  objectType: z.string().optional(),
  data: z.record(z.string(), z.unknown()).optional(),
});
export type ReactorEvent = z.infer<typeof ReactorEventSchema>;

export const PluginStateSchema = z.object({
  version: z.string(),
  isLoaded: z.boolean(),
  ribbonTabs: z.array(z.string()),
  commandCount: z.number().int().nonnegative(),
  reactorCount: z.number().int().nonnegative(),
  lastActivity: z.string().datetime().optional(),
});
export type PluginState = z.infer<typeof PluginStateSchema>;

// ── Interfaces ──────────────────────────────────────────────────────────────

export interface AcadPluginClock {
  now(): string;
}

export interface AcadPluginTransport {
  registerRibbonTab(tab: RibbonTab): boolean;
  unregisterRibbonTab(tabId: string): boolean;
  registerCommand(binding: CommandBinding): boolean;
  unregisterCommand(commandName: string): boolean;
  registerReactor(binding: ReactorBinding): boolean;
  unregisterReactor(reactorId: string): boolean;
  getPluginState(): PluginState;
}

function defaultClock(): AcadPluginClock {
  return { now: () => new Date().toISOString() };
}

// ── Event Subscriber ────────────────────────────────────────────────────────

type ReactorEventSubscriber = (event: ReactorEvent) => void;

// ── Engine Implementation ───────────────────────────────────────────────────

export class AutoCADAddinPluginEngine {
  private transport: AcadPluginTransport;
  private clock: AcadPluginClock;

  private ribbonTabs = new Map<string, RibbonTab>();
  private commands = new Map<string, CommandBinding>();
  private reactors = new Map<string, ReactorBinding>();
  private eventLog: ReactorEvent[] = [];
  private subscribers: ReactorEventSubscriber[] = [];

  private maxEventLogSize = 500;
  private eventCounter = 0;

  constructor(opts: { transport: AcadPluginTransport; clock?: AcadPluginClock; maxEventLogSize?: number }) {
    this.transport = opts.transport;
    this.clock = opts.clock ?? defaultClock();
    if (opts.maxEventLogSize !== undefined) this.maxEventLogSize = opts.maxEventLogSize;
  }

  // ── Ribbon Management ─────────────────────────────────────────────────────

  registerRibbonTab(tab: RibbonTab): boolean {
    const parsed = RibbonTabSchema.parse(tab);
    if (!this.transport.registerRibbonTab(parsed)) return false;
    this.ribbonTabs.set(parsed.id, parsed);
    return true;
  }

  unregisterRibbonTab(tabId: string): boolean {
    if (!this.ribbonTabs.has(tabId)) return false;
    if (!this.transport.unregisterRibbonTab(tabId)) return false;
    this.ribbonTabs.delete(tabId);
    return true;
  }

  getRibbonTab(tabId: string): RibbonTab | undefined {
    return this.ribbonTabs.get(tabId);
  }

  listRibbonTabs(): RibbonTab[] {
    return [...this.ribbonTabs.values()];
  }

  updateRibbonButton(tabId: string, panelId: string, buttonId: string, updates: Partial<RibbonButton>): boolean {
    const tab = this.ribbonTabs.get(tabId);
    if (!tab) return false;
    const panel = tab.panels.find(p => p.id === panelId);
    if (!panel) return false;
    const button = panel.buttons.find(b => b.id === buttonId);
    if (!button) return false;

    Object.assign(button, updates);
    this.transport.unregisterRibbonTab(tabId);
    this.transport.registerRibbonTab(tab);
    return true;
  }

  setRibbonTabVisibility(tabId: string, isVisible: boolean): boolean {
    const tab = this.ribbonTabs.get(tabId);
    if (!tab) return false;
    tab.isVisible = isVisible;
    this.transport.unregisterRibbonTab(tabId);
    this.transport.registerRibbonTab(tab);
    return true;
  }

  // ── Command Management ────────────────────────────────────────────────────

  registerCommand(binding: CommandBinding): boolean {
    const parsed = CommandBindingSchema.parse(binding);
    if (!this.transport.registerCommand(parsed)) return false;
    this.commands.set(parsed.commandName, parsed);
    return true;
  }

  unregisterCommand(commandName: string): boolean {
    if (!this.commands.has(commandName)) return false;
    if (!this.transport.unregisterCommand(commandName)) return false;
    this.commands.delete(commandName);
    return true;
  }

  getCommand(commandName: string): CommandBinding | undefined {
    return this.commands.get(commandName);
  }

  listCommands(): CommandBinding[] {
    return [...this.commands.values()];
  }

  // ── Reactor Management ────────────────────────────────────────────────────

  registerReactor(binding: ReactorBinding): boolean {
    const parsed = ReactorBindingSchema.parse(binding);
    if (!this.transport.registerReactor(parsed)) return false;
    this.reactors.set(parsed.id, parsed);
    return true;
  }

  unregisterReactor(reactorId: string): boolean {
    if (!this.reactors.has(reactorId)) return false;
    if (!this.transport.unregisterReactor(reactorId)) return false;
    this.reactors.delete(reactorId);
    return true;
  }

  getReactor(reactorId: string): ReactorBinding | undefined {
    return this.reactors.get(reactorId);
  }

  listReactors(): ReactorBinding[] {
    return [...this.reactors.values()];
  }

  setReactorEnabled(reactorId: string, isEnabled: boolean): boolean {
    const reactor = this.reactors.get(reactorId);
    if (!reactor) return false;
    reactor.isEnabled = isEnabled;
    this.transport.unregisterReactor(reactorId);
    this.transport.registerReactor(reactor);
    return true;
  }

  updateReactorFilter(
    reactorId: string,
    filter: ReactorBinding["filter"],
  ): boolean {
    const reactor = this.reactors.get(reactorId);
    if (!reactor) return false;
    reactor.filter = filter;
    this.transport.unregisterReactor(reactorId);
    this.transport.registerReactor(reactor);
    return true;
  }

  bindReactorToSessions(reactorId: string, sessionIds: string[]): boolean {
    const reactor = this.reactors.get(reactorId);
    if (!reactor) return false;
    reactor.sessionIds = sessionIds;
    return true;
  }

  // ── Event Handling ────────────────────────────────────────────────────────

  handleReactorEvent(event: Omit<ReactorEvent, "id" | "timestamp">): ReactorEvent {
    this.eventCounter++;
    const full: ReactorEvent = {
      ...event,
      id: `acad-evt-${this.eventCounter}`,
      timestamp: this.clock.now(),
    };

    this.eventLog.push(full);
    if (this.eventLog.length > this.maxEventLogSize) {
      this.eventLog = this.eventLog.slice(-this.maxEventLogSize);
    }

    for (const sub of this.subscribers) {
      try {
        sub(full);
      } catch {
        // subscriber errors don't block
      }
    }

    return full;
  }

  subscribeToEvents(callback: ReactorEventSubscriber): () => void {
    this.subscribers.push(callback);
    return () => {
      const idx = this.subscribers.indexOf(callback);
      if (idx >= 0) this.subscribers.splice(idx, 1);
    };
  }

  getEventLog(opts?: { limit?: number; reactorType?: AcadReactorType }): ReactorEvent[] {
    let events = [...this.eventLog];
    if (opts?.reactorType) events = events.filter(e => e.reactorType === opts.reactorType);
    if (opts?.limit) events = events.slice(-opts.limit);
    return events;
  }

  clearEventLog(): number {
    const count = this.eventLog.length;
    this.eventLog = [];
    return count;
  }

  // ── Plugin State ──────────────────────────────────────────────────────────

  getPluginState(): PluginState {
    return this.transport.getPluginState();
  }

  getLocalState(): { ribbonTabs: number; commands: number; reactors: number; events: number } {
    return {
      ribbonTabs: this.ribbonTabs.size,
      commands: this.commands.size,
      reactors: this.reactors.size,
      events: this.eventLog.length,
    };
  }

  // ── Batch Operations ──────────────────────────────────────────────────────

  registerPRISMIntegration(opts: {
    tabTitle?: string;
    commands?: Array<{ name: string; displayName: string; action: string }>;
    reactors?: AcadReactorType[];
    sessionId?: string;
  } = {}): { tabId: string; commandCount: number; reactorCount: number } {
    const tabTitle = opts.tabTitle ?? "PRISM";
    const tabId = `prism-tab-${Date.now()}`;

    const buttons: RibbonButton[] = (opts.commands ?? []).map((cmd, i) => ({
      id: `prism-btn-${i}`,
      text: cmd.displayName,
      commandName: `PRISM_${cmd.name.toUpperCase()}`,
      size: "Large" as const,
      isEnabled: true,
      isVisible: true,
    }));

    const tab: RibbonTab = {
      id: tabId,
      title: tabTitle,
      panels: buttons.length > 0 ? [{
        id: "prism-panel-main",
        title: "Main",
        buttons,
        isVisible: true,
      }] : [],
      isVisible: true,
      isContextual: false,
    };

    this.registerRibbonTab(tab);

    let commandCount = 0;
    for (const cmd of opts.commands ?? []) {
      this.registerCommand({
        commandName: `PRISM_${cmd.name.toUpperCase()}`,
        displayName: cmd.displayName,
        dispatcherAction: cmd.action,
        flags: ["Modal"],
      });
      commandCount++;
    }

    let reactorCount = 0;
    for (const reactorType of opts.reactors ?? []) {
      this.registerReactor({
        id: `prism-reactor-${reactorType}`,
        reactorType,
        dispatcherAction: `prism.acad.${reactorType.toLowerCase()}`,
        isEnabled: true,
        sessionIds: opts.sessionId ? [opts.sessionId] : undefined,
      });
      reactorCount++;
    }

    return { tabId, commandCount, reactorCount };
  }

  unregisterAll(): { tabs: number; commands: number; reactors: number } {
    let tabs = 0, commands = 0, reactors = 0;

    for (const tabId of [...this.ribbonTabs.keys()]) {
      if (this.unregisterRibbonTab(tabId)) tabs++;
    }

    for (const cmdName of [...this.commands.keys()]) {
      if (this.unregisterCommand(cmdName)) commands++;
    }

    for (const reactorId of [...this.reactors.keys()]) {
      if (this.unregisterReactor(reactorId)) reactors++;
    }

    return { tabs, commands, reactors };
  }
}
