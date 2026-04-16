import { createRequire } from 'module'; import { fileURLToPath } from 'url'; import { dirname } from 'path'; const require = createRequire(import.meta.url); const __filename = fileURLToPath(import.meta.url); const __dirname = dirname(__filename);
import {
  init_ToolCatalogEngine,
  toolCatalogEngine
} from "./chunk-ELPDZPWJ.js";

// src/engines/HyperMillToolExportEngine.ts
init_ToolCatalogEngine();
var HM_TYPE = {
  // Milling
  Ballmill: 1,
  Endmill: 2,
  Radiusmill: 3,
  Drilltool: 4,
  Lollipop: 5,
  Woodruff: 6,
  GeneralBarrelTool: 7,
  LensCutter: 8,
  ChamferedCutter: 9,
  TSlotCutter: 10,
  Tap: 11,
  BoringBar: 12,
  GunDrill: 13,
  ThreadMill: 15,
  Reamer: 16,
  TangentBarrelTool: 17,
  ConicalBarrelTool: 18,
  IndexableRoundInsertCutter: 19,
  IndexableHighFeedCutter: 20,
  BackboringTool: 21,
  // Turning
  GeneralTurningTool: 1e3,
  RadialRecessingTool: 1001,
  AxialRecessingTool: 1002,
  ThreadingTool: 1003,
  PartingTool: 1004,
  Roll