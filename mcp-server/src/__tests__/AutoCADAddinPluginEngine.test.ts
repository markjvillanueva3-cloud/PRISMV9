/**
 * AutoCADAddinPluginEngine.test.ts — U-CAD-APP-12 (PHASE-48)
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  AutoCADAddinPluginEngine,
  type AcadPluginTransport,
  type AcadPluginClock,
  type RibbonTab,
  type RibbonPanel,
  type RibbonButton,
  type CommandBinding,
  type ReactorBinding,
  type ReactorEvent,
  type PluginState,
} from "../engines/AutoCADAddinPluginEngine.js";

function makeClock(): AcadPluginClock {
  let iso = new Date("2026-04-22T00:00:00Z").getTime();
  return {
    now: () => {
      const ts = new Date(iso).toISOString();
      iso += 1;
      return ts;
    },
  };
}

function makeTransport(): AcadPluginTransport {
  return {
    registerRibbonTab: () => true,
    unregisterRibbonTab: () => true,
    registerCommand: () => true,
    unregisterCommand: () => true,
    registerReactor: () => true,
    unregisterReactor: () => true,
    getPluginState: () => ({
      version: "1.0.0",
      isLoaded: true,
      ribbonTabs: ["PRISM"],
      commandCount: 5,
      reactorCount: 3,
      lastActivity: "2026-04-22T00:00:00Z",
    }),
  };
}

function makeFailingTransport(): AcadPluginTransport {
  return {
    registerRibbonTab: () => false,
    unregisterRibbonTab: () => false,
    registerCommand: () => false,
    unregisterCommand: () => false,
    registerReactor: () => false,
    unregisterReactor: () => false,
    getPluginState: () => ({
      version: "1.0.0",
      isLoaded: false,
      ribbonTabs: [],
      commandCount: 0,
      reactorCount: 0,
    }),
  };
}

function makeButton(overrides: Partial<RibbonButton> = {}): RibbonButton {
  return {
    id: "btn-001",
    text: "Test Button",
    commandName: "TEST_CMD",
    size: "Large",
    isEnabled: true,
    isVisible: true,
    ...overrides,
  };
}

function makePanel(overrides: Partial<RibbonPanel> = {}): RibbonPanel {
  return {
    id: "panel-001",
    title: "Test Panel",
    buttons: [makeButton()],
    isVisible: true,
    ...overrides,
  };
}

function makeTab(overrides: Partial<RibbonTab> = {}): RibbonTab {
  return {
    id: "tab-001",
    title: "Test Tab",
    panels: [makePanel()],
    isVisible: true,
    isContextual: false,
    ...overrides,
  };
}

function makeCommand(overrides: Partial<CommandBinding> = {}): CommandBinding {
  return {
    commandName: "TEST_CMD",
    displayName: "Test Command",
    dispatcherAction: "prism.test.action",
    flags: ["Modal"],
    ...overrides,
  };
}

function makeReactor(overrides: Partial<ReactorBinding> = {}): ReactorBinding {
  return {
    id: "reactor-001",
    reactorType: "CommandEnded",
    dispatcherAction: "prism.acad.command_ended",
    isEnabled: true,
    ...overrides,
  };
}

describe("AutoCADAddinPluginEngine (U-CAD-APP-12)", () => {
  let eng: AutoCADAddinPluginEngine;
  let transport: AcadPluginTransport;
  let clock: AcadPluginClock;

  beforeEach(() => {
    transport = makeTransport();
    clock = makeClock();
    eng = new AutoCADAddinPluginEngine({ transport, clock });
  });

  describe("ribbon management", () => {
    it("registerRibbonTab adds tab", () => {
      const tab = makeTab();
      expect(eng.registerRibbonTab(tab)).toBe(true);
      expect(eng.getRibbonTab("tab-001")).toBeDefined();
    });

    it("registerRibbonTab returns false on transport failure", () => {
      eng = new AutoCADAddinPluginEngine({ transport: makeFailingTransport(), clock });
      expect(eng.registerRibbonTab(makeTab())).toBe(false);
    });

    it("unregisterRibbonTab removes tab", () => {
      eng.registerRibbonTab(makeTab());
      expect(eng.unregisterRibbonTab("tab-001")).toBe(true);
      expect(eng.getRibbonTab("tab-001")).toBeUndefined();
    });

    it("unregisterRibbonTab returns false for unknown tab", () => {
      expect(eng.unregisterRibbonTab("unknown")).toBe(false);
    });

    it("listRibbonTabs returns all tabs", () => {
      eng.registerRibbonTab(makeTab({ id: "tab-001" }));
      eng.registerRibbonTab(makeTab({ id: "tab-002", title: "Tab 2" }));
      const tabs = eng.listRibbonTabs();
      expect(tabs.length).toBe(2);
    });

    it("updateRibbonButton modifies button", () => {
      eng.registerRibbonTab(makeTab());
      expect(eng.updateRibbonButton("tab-001", "panel-001", "btn-001", { isEnabled: false })).toBe(true);
      const tab = eng.getRibbonTab("tab-001")!;
      expect(tab.panels[0].buttons[0].isEnabled).toBe(false);
    });

    it("updateRibbonButton returns false for unknown tab", () => {
      expect(eng.updateRibbonButton("unknown", "panel-001", "btn-001", {})).toBe(false);
    });

    it("updateRibbonButton returns false for unknown panel", () => {
      eng.registerRibbonTab(makeTab());
      expect(eng.updateRibbonButton("tab-001", "unknown", "btn-001", {})).toBe(false);
    });

    it("updateRibbonButton returns false for unknown button", () => {
      eng.registerRibbonTab(makeTab());
      expect(eng.updateRibbonButton("tab-001", "panel-001", "unknown", {})).toBe(false);
    });

    it("setRibbonTabVisibility toggles visibility", () => {
      eng.registerRibbonTab(makeTab());
      expect(eng.setRibbonTabVisibility("tab-001", false)).toBe(true);
      expect(eng.getRibbonTab("tab-001")!.isVisible).toBe(false);
    });

    it("setRibbonTabVisibility returns false for unknown tab", () => {
      expect(eng.setRibbonTabVisibility("unknown", false)).toBe(false);
    });
  });

  describe("command management", () => {
    it("registerCommand adds command", () => {
      const cmd = makeCommand();
      expect(eng.registerCommand(cmd)).toBe(true);
      expect(eng.getCommand("TEST_CMD")).toBeDefined();
    });

    it("registerCommand returns false on transport failure", () => {
      eng = new AutoCADAddinPluginEngine({ transport: makeFailingTransport(), clock });
      expect(eng.registerCommand(makeCommand())).toBe(false);
    });

    it("unregisterCommand removes command", () => {
      eng.registerCommand(makeCommand());
      expect(eng.unregisterCommand("TEST_CMD")).toBe(true);
      expect(eng.getCommand("TEST_CMD")).toBeUndefined();
    });

    it("unregisterCommand returns false for unknown command", () => {
      expect(eng.unregisterCommand("unknown")).toBe(false);
    });

    it("listCommands returns all commands", () => {
      eng.registerCommand(makeCommand({ commandName: "CMD1" }));
      eng.registerCommand(makeCommand({ commandName: "CMD2" }));
      expect(eng.listCommands().length).toBe(2);
    });

    it("command has dispatcher action", () => {
      eng.registerCommand(makeCommand({ dispatcherAction: "prism.test.run" }));
      const cmd = eng.getCommand("TEST_CMD")!;
      expect(cmd.dispatcherAction).toBe("prism.test.run");
    });
  });

  describe("reactor management", () => {
    it("registerReactor adds reactor", () => {
      const reactor = makeReactor();
      expect(eng.registerReactor(reactor)).toBe(true);
      expect(eng.getReactor("reactor-001")).toBeDefined();
    });

    it("registerReactor returns false on transport failure", () => {
      eng = new AutoCADAddinPluginEngine({ transport: makeFailingTransport(), clock });
      expect(eng.registerReactor(makeReactor())).toBe(false);
    });

    it("unregisterReactor removes reactor", () => {
      eng.registerReactor(makeReactor());
      expect(eng.unregisterReactor("reactor-001")).toBe(true);
      expect(eng.getReactor("reactor-001")).toBeUndefined();
    });

    it("unregisterReactor returns false for unknown reactor", () => {
      expect(eng.unregisterReactor("unknown")).toBe(false);
    });

    it("listReactors returns all reactors", () => {
      eng.registerReactor(makeReactor({ id: "r1", reactorType: "CommandEnded" }));
      eng.registerReactor(makeReactor({ id: "r2", reactorType: "ObjectModified" }));
      expect(eng.listReactors().length).toBe(2);
    });

    it("setReactorEnabled toggles enabled state", () => {
      eng.registerReactor(makeReactor());
      expect(eng.setReactorEnabled("reactor-001", false)).toBe(true);
      expect(eng.getReactor("reactor-001")!.isEnabled).toBe(false);
    });

    it("setReactorEnabled returns false for unknown reactor", () => {
      expect(eng.setReactorEnabled("unknown", false)).toBe(false);
    });

    it("updateReactorFilter modifies filter", () => {
      eng.registerReactor(makeReactor());
      expect(eng.updateReactorFilter("reactor-001", { commandNames: ["LINE", "CIRCLE"] })).toBe(true);
      expect(eng.getReactor("reactor-001")!.filter?.commandNames).toEqual(["LINE", "CIRCLE"]);
    });

    it("updateReactorFilter returns false for unknown reactor", () => {
      expect(eng.updateReactorFilter("unknown", {})).toBe(false);
    });

    it("bindReactorToSessions assigns sessions", () => {
      eng.registerReactor(makeReactor());
      expect(eng.bindReactorToSessions("reactor-001", ["sess-1", "sess-2"])).toBe(true);
      expect(eng.getReactor("reactor-001")!.sessionIds).toEqual(["sess-1", "sess-2"]);
    });

    it("bindReactorToSessions returns false for unknown reactor", () => {
      expect(eng.bindReactorToSessions("unknown", [])).toBe(false);
    });
  });

  describe("event handling", () => {
    it("handleReactorEvent adds event to log", () => {
      const event = eng.handleReactorEvent({
        reactorType: "CommandEnded",
        commandName: "LINE",
      });
      expect(event.id).toMatch(/^acad-evt-/);
      expect(event.timestamp).toBeDefined();
    });

    it("subscribeToEvents receives events", () => {
      const events: ReactorEvent[] = [];
      eng.subscribeToEvents((e) => events.push(e));

      eng.handleReactorEvent({ reactorType: "CommandEnded", commandName: "LINE" });
      eng.handleReactorEvent({ reactorType: "ObjectModified", objectHandle: "1A2" });

      expect(events.length).toBe(2);
    });

    it("unsubscribe stops receiving events", () => {
      const events: ReactorEvent[] = [];
      const unsub = eng.subscribeToEvents((e) => events.push(e));

      eng.handleReactorEvent({ reactorType: "CommandEnded" });
      unsub();
      eng.handleReactorEvent({ reactorType: "CommandEnded" });

      expect(events.length).toBe(1);
    });

    it("subscriber errors do not block other subscribers", () => {
      const events: ReactorEvent[] = [];
      eng.subscribeToEvents(() => { throw new Error("fail"); });
      eng.subscribeToEvents((e) => events.push(e));

      eng.handleReactorEvent({ reactorType: "CommandEnded" });
      expect(events.length).toBe(1);
    });

    it("getEventLog returns events", () => {
      eng.handleReactorEvent({ reactorType: "CommandEnded" });
      eng.handleReactorEvent({ reactorType: "ObjectModified" });
      expect(eng.getEventLog().length).toBe(2);
    });

    it("getEventLog with limit", () => {
      for (let i = 0; i < 10; i++) {
        eng.handleReactorEvent({ reactorType: "CommandEnded" });
      }
      expect(eng.getEventLog({ limit: 3 }).length).toBe(3);
    });

    it("getEventLog filters by reactorType", () => {
      eng.handleReactorEvent({ reactorType: "CommandEnded" });
      eng.handleReactorEvent({ reactorType: "ObjectModified" });
      eng.handleReactorEvent({ reactorType: "CommandEnded" });

      const filtered = eng.getEventLog({ reactorType: "ObjectModified" });
      expect(filtered.length).toBe(1);
    });

    it("clearEventLog empties log", () => {
      eng.handleReactorEvent({ reactorType: "CommandEnded" });
      expect(eng.clearEventLog()).toBe(1);
      expect(eng.getEventLog().length).toBe(0);
    });

    it("event log respects maxEventLogSize", () => {
      eng = new AutoCADAddinPluginEngine({ transport, clock, maxEventLogSize: 5 });
      for (let i = 0; i < 10; i++) {
        eng.handleReactorEvent({ reactorType: "CommandEnded" });
      }
      expect(eng.getEventLog().length).toBe(5);
    });
  });

  describe("plugin state", () => {
    it("getPluginState returns transport state", () => {
      const state = eng.getPluginState();
      expect(state.version).toBe("1.0.0");
      expect(state.isLoaded).toBe(true);
      expect(state.commandCount).toBe(5);
    });

    it("getLocalState returns local counts", () => {
      eng.registerRibbonTab(makeTab());
      eng.registerCommand(makeCommand());
      eng.registerReactor(makeReactor());
      eng.handleReactorEvent({ reactorType: "CommandEnded" });

      const state = eng.getLocalState();
      expect(state.ribbonTabs).toBe(1);
      expect(state.commands).toBe(1);
      expect(state.reactors).toBe(1);
      expect(state.events).toBe(1);
    });
  });

  describe("batch operations", () => {
    it("registerPRISMIntegration creates tab, commands, reactors", () => {
      const result = eng.registerPRISMIntegration({
        tabTitle: "PRISM Tools",
        commands: [
          { name: "speedfeed", displayName: "Speed/Feed", action: "prism.calc.speed_feed" },
          { name: "dfm", displayName: "DFM Check", action: "prism.cad.dfm_check" },
        ],
        reactors: ["CommandEnded", "ObjectModified"],
        sessionId: "sess-001",
      });

      expect(result.tabId).toMatch(/^prism-tab-/);
      expect(result.commandCount).toBe(2);
      expect(result.reactorCount).toBe(2);

      expect(eng.listRibbonTabs().length).toBe(1);
      expect(eng.listCommands().length).toBe(2);
      expect(eng.listReactors().length).toBe(2);
    });

    it("registerPRISMIntegration with defaults", () => {
      const result = eng.registerPRISMIntegration();
      expect(result.tabId).toMatch(/^prism-tab-/);
      expect(result.commandCount).toBe(0);
      expect(result.reactorCount).toBe(0);
    });

    it("unregisterAll removes everything", () => {
      eng.registerRibbonTab(makeTab({ id: "t1" }));
      eng.registerRibbonTab(makeTab({ id: "t2" }));
      eng.registerCommand(makeCommand({ commandName: "C1" }));
      eng.registerCommand(makeCommand({ commandName: "C2" }));
      eng.registerReactor(makeReactor({ id: "r1" }));

      const result = eng.unregisterAll();
      expect(result.tabs).toBe(2);
      expect(result.commands).toBe(2);
      expect(result.reactors).toBe(1);

      expect(eng.listRibbonTabs().length).toBe(0);
      expect(eng.listCommands().length).toBe(0);
      expect(eng.listReactors().length).toBe(0);
    });
  });

  describe("reactor types coverage", () => {
    it("handles DocumentCreated reactor", () => {
      eng.registerReactor(makeReactor({ id: "r1", reactorType: "DocumentCreated" }));
      expect(eng.getReactor("r1")!.reactorType).toBe("DocumentCreated");
    });

    it("handles ObjectAppended reactor", () => {
      eng.registerReactor(makeReactor({ id: "r2", reactorType: "ObjectAppended" }));
      expect(eng.getReactor("r2")!.reactorType).toBe("ObjectAppended");
    });

    it("handles LispWillStart reactor", () => {
      eng.registerReactor(makeReactor({ id: "r3", reactorType: "LispWillStart" }));
      expect(eng.getReactor("r3")!.reactorType).toBe("LispWillStart");
    });

    it("handles BeginSave reactor", () => {
      eng.registerReactor(makeReactor({ id: "r4", reactorType: "BeginSave" }));
      expect(eng.getReactor("r4")!.reactorType).toBe("BeginSave");
    });

    it("handles ViewChanged reactor", () => {
      eng.registerReactor(makeReactor({ id: "r5", reactorType: "ViewChanged" }));
      expect(eng.getReactor("r5")!.reactorType).toBe("ViewChanged");
    });
  });
});
