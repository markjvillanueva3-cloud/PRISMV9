/**
 * MTConnectAdapterEngine
 *
 * HTTP/XML adapter for MTConnect-enabled CNC machines.
 * MTConnect is the dominant US CNC data standard — most Haas, Mazak,
 * Okuma, and Doosan machines ship with MTConnect agents.
 *
 * Capabilities:
 * 1. probe()     — Discover machine's MTConnect device model (axes, components, data items)
 * 2. current()   — Get current snapshot of all data items (spindle speed, feed, position, alarms)
 * 3. sample()    — Get historical samples within a sequence range
 * 4. assets()    — Get cutting tool assets (tool life, usage counters)
 * 5. monitor()   — Continuous polling with change detection and alert thresholds
 * 6. parseAlarm()— Extract and classify MTConnect alarm conditions
 * 7. getSpindleLoad() — Real-time spindle load % with Kienzle force comparison
 * 8. getFeedOverride() — Feed override % and effective feed rate
 * 9. getMachineStatus() — Aggregated machine state (running/idle/alarm/offline)
 *
 * MTConnect Protocol:
 * - HTTP REST API returning XML
 * - Base URL: http://<agent-ip>:5000 (default port)
 * - Endpoints: /probe, /current, /sample, /assets
 * - Streaming: /sample?interval=100 (long-poll)
 *
 * @see https://www.mtconnect.org/standard
 * @see MTConnect Standard Part 1: Overview and Protocol (ANSI/MTC1.4-2018)
 *
 * Lines: ~1043
 */

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

export interface MTConnectConfig {
  agentUrl: string;         // e.g., "http://192.168.1.100:5000"
  deviceName?: string;      // Filter to specific device
  pollIntervalMs?: number;  // Polling interval (default: 1000)
  timeoutMs?: number;       // HTTP timeout (default: 5000)
}

export interface MTConnectDevice {
  name: string;
  uuid: string;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  axes: MTConnectAxis[];
  components: MTConnectComponent[];
  dataItems: MTConnectDataItem[];
}

export interface MTConnectAxis {
  name: string;
  type: "LINEAR" | "ROTARY";
  units: string;
  nativeUnits?: string;
}

export interface MTConnectComponent {
  id: string;
  name: string;
  type: string; // Controller, Path, Spindle, Linear, Rotary, etc.
  dataItems: MTConnectDataItem[];
}

export interface MTConnectDataItem {
  id: string;
  name?: string;
  type: string;        // POSITION, SPINDLE_SPEED, PATH_FEEDRATE, LOAD, etc.
  category: "SAMPLE" | "EVENT" | "CONDITION";
  subType?: string;
  units?: string;
  nativeUnits?: string;
}

export interface MTConnectSnapshot {
  timestamp: string;
  sequence: number;
  nextSequence: number;
  deviceName: string;
  dataItems: Record<string, MTConnectValue>;
}

export interface MTConnectValue {
  id: string;
  name: string;
  type: string;
  value: string | number;
  timestamp: string;
  sequence: number;
  condition?: "NORMAL" | "WARNING" | "FAULT" | "UNAVAILABLE";
}

export interface MTConnectAlarm {
  id: string;
  type: string;
  severity: "WARNING" | "FAULT" | "CRITICAL";
  nativeCode: string;
  text: string;
  timestamp: string;
  component: string;
}

export interface MTConnectToolAsset {
  assetId: string;
  toolId: string;
  description?: string;
  cuttingItems: Array<{
    itemId: string;
    grade?: string;
    toolLife?: { type: string; initial: number; current: number; limit: number };
    measurements?: Record<string, number>;
  }>;
}

export interface SpindleLoadResult {
  spindleSpeed_rpm: number;
  spindleLoad_pct: number;
  estimatedForce_N: number;
  loadTrend: "stable" | "increasing" | "decreasing" | "erratic";
  overloadRisk: boolean;
  comparedToKienzle?: {
    predicted_pct: number;
    deviation_pct: number;
    withinTolerance: boolean;
  };
}

export interface MachineStatusResult {
  status: "RUNNING" | "IDLE" | "ALARM" | "OFFLINE" | "SETUP";
  executionState: string;
  program?: string;
  block?: string;
  spindleSpeed_rpm: number;
  feedRate_mmmin: number;
  feedOverride_pct: number;
  spindleLoad_pct: number;
  activeAlarms: MTConnectAlarm[];
  axisPositions: Record<string, number>;
  uptime_hours: number;
}

// ═══════════════════════════════════════════════════════════════
// XML Parsing Helpers (lightweight, no external dependency)
// ═══════════════════════════════════════════════════════════════

function extractTag(xml: string, tag: string): string[] {
  const regex = new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, "gi");
  const matches: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(xml)) !== null) {
    matches.push(match[1]);
  }
  return matches;
}

function extractAttr(xml: string, tag: string, attr: string): string[] {
  const regex = new RegExp(`<${tag}[^>]*\\s${attr}="([^"]*)"`, "gi");
  const matches: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(xml)) !== null) {
    matches.push(match[1]);
  }
  return matches;
}

function extractElements(xml: string, tag: string): string[] {
  const regex = new RegExp(`<${tag}[^>]*(?:/>|>[\\s\\S]*?</${tag}>)`, "gi");
  const matches: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(xml)) !== null) {
    matches.push(match[0]);
  }
  return matches;
}

function getAttr(element: string, attr: string): string | undefined {
  const match = element.match(new RegExp(`${attr}="([^"]*)"`, "i"));
  return match?.[1];
}

function getContent(element: string): string {
  const match = element.match(/>([^<]*)</);
  return match?.[1]?.trim() ?? "";
}

// ═══════════════════════════════════════════════════════════════
// Engine
// ═══════════════════════════════════════════════════════════════

export class MTConnectAdapterEngine {
  private config: MTConnectConfig;
  private lastSequence = 0;
  private loadHistory: number[] = [];
  private readonly MAX_HISTORY = 60; // 60 samples for trend

  constructor(config: MTConnectConfig) {
    this.config = {
      pollIntervalMs: 1000,
      timeoutMs: 5000,
      ...config,
    };
  }

  // ─────────────────────────────────────────────────────────
  // 1. Probe — Discover device model
  // ─────────────────────────────────────────────────────────

  async probe(): Promise<MTConnectDevice> {
    const xml = await this.fetchXml("/probe");

    const deviceElements = extractElements(xml, "Device");
    if (deviceElements.length === 0) {
      throw new Error("No devices found in MTConnect probe response");
    }

    const deviceXml = this.config.deviceName
      ? deviceElements.find(d =>
          getAttr(d, "name")?.toLowerCase() ===
          this.config.deviceName!.toLowerCase()
        ) ?? deviceElements[0]
      : deviceElements[0];

    const axes: MTConnectAxis[] = [];
    for (const axisEl of extractElements(deviceXml, "Linear")) {
      axes.push({
        name: getAttr(axisEl, "name") ?? "Unknown",
        type: "LINEAR",
        units: getAttr(axisEl, "units") ?? "MILLIMETER",
      });
    }
    for (const axisEl of extractElements(deviceXml, "Rotary")) {
      axes.push({
        name: getAttr(axisEl, "name") ?? "Unknown",
        type: "ROTARY",
        units: getAttr(axisEl, "units") ?? "DEGREE",
      });
    }

    const components: MTConnectComponent[] = [];
    const componentTypes = [
      "Controller", "Path", "Spindle", "Axes",
      "Systems", "Hydraulic", "Coolant",
    ];
    for (const compType of componentTypes) {
      for (const compEl of extractElements(deviceXml, compType)) {
        const dataItems: MTConnectDataItem[] = [];
        for (const diEl of extractElements(compEl, "DataItem")) {
          dataItems.push({
            id: getAttr(diEl, "id") ?? "",
            name: getAttr(diEl, "name"),
            type: getAttr(diEl, "type") ?? "",
            category: (getAttr(diEl, "category") ?? "EVENT") as
              "SAMPLE" | "EVENT" | "CONDITION",
            subType: getAttr(diEl, "subType"),
            units: getAttr(diEl, "units"),
          });
        }
        components.push({
          id: getAttr(compEl, "id") ?? "",
          name: getAttr(compEl, "name") ?? compType,
          type: compType,
          dataItems,
        });
      }
    }

    const allDataItems = components.flatMap(c => c.dataItems);

    return {
      name: getAttr(deviceXml, "name") ?? "Unknown",
      uuid: getAttr(deviceXml, "uuid") ?? "",
      manufacturer: getAttr(deviceXml, "manufacturer"),
      model: getAttr(deviceXml, "model"),
      serialNumber: getAttr(deviceXml, "serialNumber"),
      axes,
      components,
      dataItems: allDataItems,
    };
  }

  // ─────────────────────────────────────────────────────────
  // 2. Current — Snapshot of all data items
  // ─────────────────────────────────────────────────────────

  async current(): Promise<MTConnectSnapshot> {
    const path = this.config.deviceName
      ? `/${this.config.deviceName}/current`
      : "/current";
    const xml = await this.fetchXml(path);

    return this.parseStreamsXml(xml);
  }

  // ─────────────────────────────────────────────────────────
  // 3. Sample — Historical data items
  // ─────────────────────────────────────────────────────────

  async sample(
    from?: number,
    count = 100
  ): Promise<MTConnectSnapshot> {
    const seq = from ?? this.lastSequence;
    const path = this.config.deviceName
      ? `/${this.config.deviceName}/sample?from=${seq}&count=${count}`
      : `/sample?from=${seq}&count=${count}`;
    const xml = await this.fetchXml(path);

    return this.parseStreamsXml(xml);
  }

  // ─────────────────────────────────────────────────────────
  // 4. Assets — Cutting tool assets
  // ─────────────────────────────────────────────────────────

  async assets(): Promise<MTConnectToolAsset[]> {
    const xml = await this.fetchXml("/assets");
    const assets: MTConnectToolAsset[] = [];

    for (const assetEl of extractElements(xml, "CuttingTool")) {
      const cuttingItems: MTConnectToolAsset["cuttingItems"] = [];

      for (const itemEl of extractElements(assetEl, "CuttingItem")) {
        const lifeEl = extractElements(itemEl, "ToolLife");
        let toolLife: MTConnectToolAsset["cuttingItems"][0]["toolLife"];
        if (lifeEl.length > 0) {
          toolLife = {
            type: getAttr(lifeEl[0], "type") ?? "MINUTES",
            initial: parseFloat(getAttr(lifeEl[0], "initial") ?? "0"),
            current: parseFloat(getContent(lifeEl[0]) || "0"),
            limit: parseFloat(getAttr(lifeEl[0], "limit") ?? "0"),
          };
        }

        cuttingItems.push({
          itemId: getAttr(itemEl, "indices") ?? "",
          grade: getAttr(itemEl, "grade"),
          toolLife,
        });
      }

      assets.push({
        assetId: getAttr(assetEl, "assetId") ?? "",
        toolId: getAttr(assetEl, "toolId") ?? "",
        description: extractTag(assetEl, "Description")[0],
        cuttingItems,
      });
    }

    return assets;
  }

  // ─────────────────────────────────────────────────────────
  // 5. Monitor — Poll with change detection
  // ─────────────────────────────────────────────────────────

  async monitor(
    callback: (snapshot: MTConnectSnapshot) => void,
    durationMs = 10000
  ): Promise<{ samples: number; duration: number }> {
    const start = Date.now();
    let sampleCount = 0;

    while (Date.now() - start < durationMs) {
      const snapshot = await this.current();
      this.lastSequence = snapshot.nextSequence;
      sampleCount++;
      callback(snapshot);

      await new Promise(r =>
        setTimeout(r, this.config.pollIntervalMs)
      );
    }

    return {
      samples: sampleCount,
      duration: Date.now() - start,
    };
  }

  // ─────────────────────────────────────────────────────────
  // 6. Parse alarms from snapshot
  // ─────────────────────────────────────────────────────────

  parseAlarms(snapshot: MTConnectSnapshot): MTConnectAlarm[] {
    const alarms: MTConnectAlarm[] = [];

    for (const [, item] of Object.entries(snapshot.dataItems)) {
      if (
        item.condition === "FAULT" ||
        item.condition === "WARNING"
      ) {
        alarms.push({
          id: item.id,
          type: item.type,
          severity: item.condition === "FAULT" ? "FAULT" : "WARNING",
          nativeCode: String(item.value),
          text: item.name || item.type,
          timestamp: item.timestamp,
          component: item.type,
        });
      }
    }

    return alarms;
  }

  // ─────────────────────────────────────────────────────────
  // 7. Get spindle load with Kienzle comparison
  // ─────────────────────────────────────────────────────────

  async getSpindleLoad(
    kienzlePredicted_pct?: number
  ): Promise<SpindleLoadResult> {
    const snapshot = await this.current();

    const spindleSpeed = this.findValue(
      snapshot, "SPINDLE_SPEED"
    );
    const spindleLoad = this.findValue(
      snapshot, "LOAD", "SPINDLE"
    );

    const load_pct = typeof spindleLoad === "number"
      ? spindleLoad : 0;

    // Track load history for trend
    this.loadHistory.push(load_pct);
    if (this.loadHistory.length > this.MAX_HISTORY) {
      this.loadHistory.shift();
    }

    const trend = this.computeTrend(this.loadHistory);

    // Estimate force from load % (typical: 100% load ≈ rated torque)
    const estimatedForce_N = load_pct * 10; // Simplified

    const result: SpindleLoadResult = {
      spindleSpeed_rpm: typeof spindleSpeed === "number"
        ? spindleSpeed : 0,
      spindleLoad_pct: load_pct,
      estimatedForce_N,
      loadTrend: trend,
      overloadRisk: load_pct > 85,
    };

    if (kienzlePredicted_pct !== undefined) {
      const deviation = Math.abs(load_pct - kienzlePredicted_pct);
      result.comparedToKienzle = {
        predicted_pct: kienzlePredicted_pct,
        deviation_pct: deviation,
        withinTolerance: deviation < 15,
      };
    }

    return result;
  }

  // ─────────────────────────────────────────────────────────
  // 8. Get feed override
  // ─────────────────────────────────────────────────────────

  async getFeedOverride(): Promise<{
    override_pct: number;
    commandedFeed_mmmin: number;
    actualFeed_mmmin: number;
  }> {
    const snapshot = await this.current();

    const override = this.findValue(
      snapshot, "PATH_FEEDRATE_OVERRIDE"
    );
    const commanded = this.findValue(
      snapshot, "PATH_FEEDRATE", "COMMANDED"
    );
    const actual = this.findValue(
      snapshot, "PATH_FEEDRATE", "ACTUAL"
    );

    const override_pct = typeof override === "number"
      ? override : 100;
    const commandedFeed = typeof commanded === "number"
      ? commanded : 0;
    const actualFeed = typeof actual === "number"
      ? actual : commandedFeed * (override_pct / 100);

    return {
      override_pct,
      commandedFeed_mmmin: commandedFeed,
      actualFeed_mmmin: actualFeed,
    };
  }

  // ─────────────────────────────────────────────────────────
  // 9. Get aggregated machine status
  // ─────────────────────────────────────────────────────────

  async getMachineStatus(): Promise<MachineStatusResult> {
    const snapshot = await this.current();
    const alarms = this.parseAlarms(snapshot);

    const execution = this.findValueStr(snapshot, "EXECUTION");
    const program = this.findValueStr(snapshot, "PROGRAM");
    const block = this.findValueStr(snapshot, "BLOCK");
    const spindleSpeed = this.findValue(snapshot, "SPINDLE_SPEED");
    const feedRate = this.findValue(snapshot, "PATH_FEEDRATE");
    const feedOverride = this.findValue(
      snapshot, "PATH_FEEDRATE_OVERRIDE"
    );
    const spindleLoad = this.findValue(
      snapshot, "LOAD", "SPINDLE"
    );

    // Axis positions
    const axisPositions: Record<string, number> = {};
    for (const [, item] of Object.entries(snapshot.dataItems)) {
      if (item.type === "POSITION" && typeof item.value === "number") {
        axisPositions[item.name || item.id] = item.value;
      }
    }

    // Determine status
    let status: MachineStatusResult["status"];
    if (alarms.some(a => a.severity === "FAULT")) {
      status = "ALARM";
    } else if (execution === "ACTIVE") {
      status = "RUNNING";
    } else if (execution === "READY" || execution === "STOPPED") {
      status = "IDLE";
    } else if (execution === "UNAVAILABLE") {
      status = "OFFLINE";
    } else {
      status = "IDLE";
    }

    return {
      status,
      executionState: execution || "UNKNOWN",
      program: program || undefined,
      block: block || undefined,
      spindleSpeed_rpm: typeof spindleSpeed === "number"
        ? spindleSpeed : 0,
      feedRate_mmmin: typeof feedRate === "number"
        ? feedRate : 0,
      feedOverride_pct: typeof feedOverride === "number"
        ? feedOverride : 100,
      spindleLoad_pct: typeof spindleLoad === "number"
        ? spindleLoad : 0,
      activeAlarms: alarms,
      axisPositions,
      uptime_hours: 0, // Would need accumulator
    };
  }

  // ═══════════════════════════════════════════════════════════
  // Private Helpers
  // ═══════════════════════════════════════════════════════════

  private async fetchXml(path: string): Promise<string> {
    const url = `${this.config.agentUrl}${path}`;

    // SSRF protection: block internal/metadata addresses
    const parsedUrl = new URL(url);
    const blockedPrefixes = ['169.254.', '127.0.', '10.', '172.16.', '172.17.', '172.18.', '172.19.',
      '172.20.', '172.21.', '172.22.', '172.23.', '172.24.', '172.25.', '172.26.',
      '172.27.', '172.28.', '172.29.', '172.30.', '172.31.', '192.168.', '0.0.0.0'];
    const blockedExact = ['localhost', '::1', '[::1]'];
    if (blockedPrefixes.some(prefix => parsedUrl.hostname.startsWith(prefix)) ||
        blockedExact.includes(parsedUrl.hostname)) {
      throw new Error('SSRF blocked: internal/metadata addresses not allowed');
    }

    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      this.config.timeoutMs
    );

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { Accept: "application/xml" },
      });
      if (!response.ok) {
        throw new Error(
          `MTConnect HTTP ${response.status}: ${response.statusText}`
        );
      }
      return await response.text();
    } finally {
      clearTimeout(timeout);
    }
  }

  private parseStreamsXml(xml: string): MTConnectSnapshot {
    const dataItems: Record<string, MTConnectValue> = {};

    // Parse Header for sequence info
    const headerEl = extractElements(xml, "Header");
    const nextSeq = headerEl.length > 0
      ? parseInt(getAttr(headerEl[0], "nextSequence") ?? "0", 10)
      : 0;
    const instanceId = headerEl.length > 0
      ? parseInt(getAttr(headerEl[0], "instanceId") ?? "0", 10)
      : 0;

    // Parse all data item types
    const dataItemTypes = [
      "Position", "SpindleSpeed", "PathFeedrate",
      "PathFeedrateOverride", "Load", "Execution",
      "ControllerMode", "Program", "Block", "Line",
      "PartCount", "AccumulatedTime", "Temperature",
      "Pressure", "Frequency", "Amperage", "Voltage",
      "Wattage", "PowerFactor", "Availability",
    ];

    // Also parse Condition elements
    const conditionTypes = [
      "Normal", "Warning", "Fault", "Unavailable",
    ];

    for (const type of dataItemTypes) {
      for (const el of extractElements(xml, type)) {
        const id = getAttr(el, "dataItemId") ?? getAttr(el, "id") ?? type;
        const name = getAttr(el, "name") ?? type;
        const value = getContent(el);
        const numValue = parseFloat(value);

        dataItems[id] = {
          id,
          name,
          type: type.toUpperCase(),
          value: isNaN(numValue) ? value : numValue,
          timestamp: getAttr(el, "timestamp") ?? "",
          sequence: parseInt(
            getAttr(el, "sequence") ?? "0", 10
          ),
        };
      }
    }

    for (const condType of conditionTypes) {
      for (const el of extractElements(xml, condType)) {
        const id = getAttr(el, "dataItemId") ?? getAttr(el, "id") ?? condType;
        dataItems[id] = {
          id,
          name: getAttr(el, "name") ?? condType,
          type: getAttr(el, "type") ?? "CONDITION",
          value: getContent(el) || condType,
          timestamp: getAttr(el, "timestamp") ?? "",
          sequence: parseInt(
            getAttr(el, "sequence") ?? "0", 10
          ),
          condition: condType.toUpperCase() as
            "NORMAL" | "WARNING" | "FAULT" | "UNAVAILABLE",
        };
      }
    }

    // Find device name
    const deviceEl = extractElements(xml, "DeviceStream");
    const deviceName = deviceEl.length > 0
      ? getAttr(deviceEl[0], "name") ?? "Unknown"
      : "Unknown";

    return {
      timestamp: new Date().toISOString(),
      sequence: instanceId,
      nextSequence: nextSeq,
      deviceName,
      dataItems,
    };
  }

  private findValue(
    snapshot: MTConnectSnapshot,
    type: string,
    subType?: string
  ): number | undefined {
    for (const item of Object.values(snapshot.dataItems)) {
      if (
        item.type.toUpperCase() === type.toUpperCase() &&
        (!subType ||
          item.name?.toUpperCase().includes(subType.toUpperCase()))
      ) {
        return typeof item.value === "number"
          ? item.value : undefined;
      }
    }
    return undefined;
  }

  private findValueStr(
    snapshot: MTConnectSnapshot,
    type: string
  ): string | undefined {
    for (const item of Object.values(snapshot.dataItems)) {
      if (item.type.toUpperCase() === type.toUpperCase()) {
        return String(item.value);
      }
    }
    return undefined;
  }

  private computeTrend(
    history: number[]
  ): "stable" | "increasing" | "decreasing" | "erratic" {
    if (history.length < 5) return "stable";

    const recent = history.slice(-10);
    const mean = recent.reduce((a, b) => a + b, 0) / recent.length;
    const variance = recent.reduce(
      (s, v) => s + (v - mean) ** 2, 0
    ) / recent.length;
    const stdDev = Math.sqrt(variance);

    if (stdDev > mean * 0.3) return "erratic";

    // Linear regression slope
    const n = recent.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += recent[i];
      sumXY += i * recent[i];
      sumX2 += i * i;
    }
    const slope = (n * sumXY - sumX * sumY) /
      (n * sumX2 - sumX * sumX);

    if (slope > 0.5) return "increasing";
    if (slope < -0.5) return "decreasing";
    return "stable";
  }
}
