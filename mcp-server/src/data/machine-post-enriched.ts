/**
 * Machine POST Database Extension — inferred controller profiles
 * Generated: 2026-03-13 | Covers machines not in POST_DB_PROFILES
 * Inference: controller family from brand + model naming conventions
 */

import type { ExtendedMachineProfile } from "./machine-profiles-catalog.js";

export const POST_DB_ENRICHED: ExtendedMachineProfile[] = [
  {
    brand: "DMG MORI",
    model: "DMU 65 monoBLOCK",
    type: "5axis",
    controller: "Siemens CELOS Siemens 840D sl",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 40.0 },
      { name: "Y", travel_mm: 30.0, rapid_m_min: 40.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 40.0 }
    ],
    spindle: { max_rpm: 18000, power_kw: 25.0, torque_nm: 1800.0, taper: "HSK-A63" },
    tool_changer: { type: "arm", capacity: 30, change_time_sec: 2.5 },
  },
  {
    brand: "DMG MORI",
    model: "DMC 80 H linear",
    type: "HMC",
    controller: "Siemens CELOS Siemens 840D sl",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 80.0 },
      { name: "Y", travel_mm: 60.0, rapid_m_min: 80.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 80.0 }
    ],
    spindle: { max_rpm: 12000, power_kw: 35.0, torque_nm: 2500.0, taper: "HSK-A63" },
    tool_changer: { type: "carousel", capacity: 60, change_time_sec: 4.0 },
  },
  {
    brand: "Mazak",
    model: "INTEGREX i-200S",
    type: "mill_turn",
    controller: "Mazak MAZATROL SmoothAi",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 40.0 },
      { name: "Y", travel_mm: 36.0, rapid_m_min: 40.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 40.0 }
    ],
    spindle: { max_rpm: 12000, power_kw: 22.0, torque_nm: 350.0, taper: "Capto C6" },
    tool_changer: { type: "carousel", capacity: 36, change_time_sec: 4.0 },
  },
  {
    brand: "Mazak",
    model: "INTEGREX i-400S",
    type: "mill_turn",
    controller: "Mazak MAZATROL SmoothAi",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 36.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 12000, power_kw: 30.0, torque_nm: 191.0, taper: "Capto C6" },
    tool_changer: { type: "carousel", capacity: 36, change_time_sec: 4.0 },
  },
  {
    brand: "Mazak",
    model: "QT-NEXUS 250-II MY",
    type: "lathe",
    controller: "Mazak MAZATROL SmoothG",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "X", travel_mm: 12.0, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 4000, power_kw: 22.0, torque_nm: 536.0, taper: "MT4" },
    tool_changer: { type: "turret", capacity: 12, change_time_sec: 1.5 },
  },
  {
    brand: "Mazak",
    model: "QUICK TURN NEXUS 350M",
    type: "lathe",
    controller: "Mazak MAZATROL SmoothG",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "X", travel_mm: 12.0, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 3000, power_kw: 30.0, torque_nm: 955.0, taper: "MT5" },
    tool_changer: { type: "turret", capacity: 12, change_time_sec: 1.5 },
  },
  {
    brand: "Mazak",
    model: "CV5-500",
    type: "5axis",
    controller: "Mazak MAZATROL SmoothX",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 50.0 },
      { name: "Y", travel_mm: 12.0, rapid_m_min: 50.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 50.0 }
    ],
    spindle: { max_rpm: 12000, power_kw: 15.0, torque_nm: 120.0, taper: "HSK-A63" },
    tool_changer: { type: "side_mount", capacity: 12, change_time_sec: 3.0 },
  },
  {
    brand: "Makino",
    model: "F5",
    type: "VMC",
    controller: "Fanuc Professional 6",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 30.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 20000, power_kw: 25.0, torque_nm: 96.0, taper: "HSK-A63" },
    tool_changer: { type: "arm", capacity: 30, change_time_sec: 2.5 },
  },
  {
    brand: "Makino",
    model: "iQ500",
    type: "VMC",
    controller: "Fanuc Professional 6",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 50.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 50.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 50.0 }
    ],
    spindle: { max_rpm: 40000, power_kw: 12.0, torque_nm: 9.0, taper: "HSK-E40" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Makino",
    model: "T1",
    type: "5axis",
    controller: "Fanuc Professional 6",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 50.0 },
      { name: "Y", travel_mm: 60.0, rapid_m_min: 50.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 50.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 80.0, torque_nm: 764.0, taper: "HSK-A100" },
    tool_changer: { type: "carousel", capacity: 60, change_time_sec: 4.0 },
  },
  {
    brand: "Makino",
    model: "U6",
    type: "edm_wire",
    controller: "Fanuc Hyper i",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 3.0 },
      { name: "Y", travel_mm: 0.0, rapid_m_min: 3.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 3.0 }
    ],
    spindle: { max_rpm: 0, power_kw: 0.0, torque_nm: 0.0, taper: "N/A" },
    tool_changer: { type: "side_mount", capacity: 0, change_time_sec: 3.0 },
  },
  {
    brand: "Makino",
    model: "EDAF3",
    type: "edm_sinker",
    controller: "Fanuc Hyper i",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 8.0 },
      { name: "Y", travel_mm: 0.0, rapid_m_min: 8.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 8.0 }
    ],
    spindle: { max_rpm: 0, power_kw: 0.0, torque_nm: 0.0, taper: "N/A" },
    tool_changer: { type: "side_mount", capacity: 0, change_time_sec: 3.0 },
  },
  {
    brand: "Okuma",
    model: "MB-5000H",
    type: "HMC",
    controller: "Okuma OSP-P300A",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 50.0 },
      { name: "Y", travel_mm: 48.0, rapid_m_min: 50.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 50.0 }
    ],
    spindle: { max_rpm: 15000, power_kw: 30.0, torque_nm: 1500.0, taper: "HSK-A63" },
    tool_changer: { type: "carousel", capacity: 48, change_time_sec: 4.0 },
  },
  {
    brand: "Okuma",
    model: "MULTUS U4000",
    type: "mill_turn",
    controller: "Okuma OSP-P300A",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 32.0 },
      { name: "Y", travel_mm: 40.0, rapid_m_min: 32.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 32.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 22.0, torque_nm: 120.0, taper: "Capto C6" },
    tool_changer: { type: "carousel", capacity: 40, change_time_sec: 4.0 },
  },
  {
    brand: "Okuma",
    model: "LB3000 EX II MY",
    type: "lathe",
    controller: "Okuma OSP-P300A",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "X", travel_mm: 40.0, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 5000, power_kw: 22.0, torque_nm: 447.0, taper: "MT4" },
    tool_changer: { type: "carousel", capacity: 40, change_time_sec: 4.0 },
  },
  {
    brand: "Okuma",
    model: "LB4000 EX II",
    type: "lathe",
    controller: "Okuma OSP-P300A",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 20.0 },
      { name: "X", travel_mm: 12.0, rapid_m_min: 20.0 }
    ],
    spindle: { max_rpm: 3500, power_kw: 37.0, torque_nm: 1068.0, taper: "MT5" },
    tool_changer: { type: "turret", capacity: 12, change_time_sec: 1.5 },
  },
  {
    brand: "Okuma",
    model: "GENOS L300-MY",
    type: "lathe",
    controller: "Okuma OSP-P300A",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "X", travel_mm: 12.0, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 5000, power_kw: 15.0, torque_nm: 286.0, taper: "MT4" },
    tool_changer: { type: "turret", capacity: 12, change_time_sec: 1.5 },
  },
  {
    brand: "Hermle",
    model: "C 32 U",
    type: "5axis",
    controller: "Heidenhain Heidenhain TNC 640",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 45.0 },
      { name: "Y", travel_mm: 36.0, rapid_m_min: 45.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 45.0 }
    ],
    spindle: { max_rpm: 18000, power_kw: 29.0, torque_nm: 1500.0, taper: "HSK-A63" },
    tool_changer: { type: "carousel", capacity: 36, change_time_sec: 4.0 },
  },
  {
    brand: "AWEA",
    model: "LP-3021",
    type: "VMC",
    controller: "Fanuc 31i-B5",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "Y", travel_mm: 40.0, rapid_m_min: 30.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 6000, power_kw: 37.0, torque_nm: 850.0, taper: "BT50" },
    tool_changer: { type: "carousel", capacity: 40, change_time_sec: 4.0 },
  },
  {
    brand: "Brother",
    model: "SPEEDIO S300X1",
    type: "VMC",
    controller: "Brother Brother CNC-C00",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 50.0 },
      { name: "Y", travel_mm: 14.0, rapid_m_min: 50.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 50.0 }
    ],
    spindle: { max_rpm: 16000, power_kw: 5.6, torque_nm: 22.0, taper: "BT30" },
    tool_changer: { type: "arm", capacity: 14, change_time_sec: 2.5 },
  },
  {
    brand: "Brother",
    model: "SPEEDIO S500X1",
    type: "VMC",
    controller: "Brother Brother CNC-C00",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 50.0 },
      { name: "Y", travel_mm: 21.0, rapid_m_min: 50.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 50.0 }
    ],
    spindle: { max_rpm: 16000, power_kw: 5.6, torque_nm: 22.0, taper: "BT30" },
    tool_changer: { type: "arm", capacity: 21, change_time_sec: 2.5 },
  },
  {
    brand: "Brother",
    model: "SPEEDIO S500Z1",
    type: "VMC",
    controller: "Brother Brother CNC-C00",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 56.0 },
      { name: "Y", travel_mm: 21.0, rapid_m_min: 56.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 56.0 }
    ],
    spindle: { max_rpm: 27000, power_kw: 8.2, torque_nm: 16.0, taper: "BT30" },
    tool_changer: { type: "arm", capacity: 21, change_time_sec: 2.5 },
  },
  {
    brand: "Brother",
    model: "SPEEDIO S700X1",
    type: "VMC",
    controller: "Brother Brother CNC-C00",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 50.0 },
      { name: "Y", travel_mm: 21.0, rapid_m_min: 50.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 50.0 }
    ],
    spindle: { max_rpm: 16000, power_kw: 8.2, torque_nm: 35.0, taper: "BT30" },
    tool_changer: { type: "arm", capacity: 21, change_time_sec: 2.5 },
  },
  {
    brand: "Brother",
    model: "SPEEDIO S1000X1",
    type: "VMC",
    controller: "Brother Brother CNC-C00",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 48.0 },
      { name: "Y", travel_mm: 30.0, rapid_m_min: 48.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 48.0 }
    ],
    spindle: { max_rpm: 16000, power_kw: 11.2, torque_nm: 50.0, taper: "BT40" },
    tool_changer: { type: "arm", capacity: 30, change_time_sec: 2.5 },
  },
  {
    brand: "Brother",
    model: "SPEEDIO M140X1",
    type: "VMC",
    controller: "Brother Brother CNC-C00",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 40.0 },
      { name: "Y", travel_mm: 22.0, rapid_m_min: 40.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 40.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 11.2, torque_nm: 80.0, taper: "BT40" },
    tool_changer: { type: "arm", capacity: 22, change_time_sec: 2.5 },
  },
  {
    brand: "Brother",
    model: "SPEEDIO M200X3",
    type: "VMC",
    controller: "Brother Brother CNC-C00",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 40.0 },
      { name: "Y", travel_mm: 30.0, rapid_m_min: 40.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 40.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 16.4, torque_nm: 119.0, taper: "BT40" },
    tool_changer: { type: "arm", capacity: 30, change_time_sec: 2.5 },
  },
  {
    brand: "Brother",
    model: "SPEEDIO R450X1",
    type: "5axis",
    controller: "Brother Brother CNC-C00",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 50.0 },
      { name: "Y", travel_mm: 21.0, rapid_m_min: 50.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 50.0 }
    ],
    spindle: { max_rpm: 16000, power_kw: 5.6, torque_nm: 22.0, taper: "BT30" },
    tool_changer: { type: "arm", capacity: 21, change_time_sec: 2.5 },
  },
  {
    brand: "Brother",
    model: "SPEEDIO R650X1",
    type: "5axis",
    controller: "Brother Brother CNC-C00",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 50.0 },
      { name: "Y", travel_mm: 21.0, rapid_m_min: 50.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 50.0 }
    ],
    spindle: { max_rpm: 16000, power_kw: 8.2, torque_nm: 35.0, taper: "BT30" },
    tool_changer: { type: "arm", capacity: 21, change_time_sec: 2.5 },
  },
  {
    brand: "Brother",
    model: "SPEEDIO W1000Xd1",
    type: "VMC",
    controller: "Brother Brother CNC-C00",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 40.0 },
      { name: "Y", travel_mm: 30.0, rapid_m_min: 40.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 40.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 16.4, torque_nm: 119.0, taper: "BT40" },
    tool_changer: { type: "arm", capacity: 30, change_time_sec: 2.5 },
  },
  {
    brand: "Chiron",
    model: "FZ 08 S",
    type: "VMC",
    controller: "Siemens Siemens 840D sl",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 75.0 },
      { name: "Y", travel_mm: 24.0, rapid_m_min: 75.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 75.0 }
    ],
    spindle: { max_rpm: 20000, power_kw: 13.4, torque_nm: 52.0, taper: "HSK-A50" },
    tool_changer: { type: "arm", capacity: 24, change_time_sec: 2.5 },
  },
  {
    brand: "Chiron",
    model: "FZ 12 S",
    type: "VMC",
    controller: "Siemens Siemens 840D sl",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 75.0 },
      { name: "Y", travel_mm: 36.0, rapid_m_min: 75.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 75.0 }
    ],
    spindle: { max_rpm: 20000, power_kw: 18.6, torque_nm: 85.0, taper: "HSK-A63" },
    tool_changer: { type: "carousel", capacity: 36, change_time_sec: 4.0 },
  },
  {
    brand: "Chiron",
    model: "MILL 800",
    type: "5axis",
    controller: "Siemens Siemens 840D sl",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 75.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 75.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 75.0 }
    ],
    spindle: { max_rpm: 20000, power_kw: 18.6, torque_nm: 85.0, taper: "HSK-A63" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Cincinnati",
    model: "Lancer V5",
    type: "VMC",
    controller: "Siemens Siemens 840D sl",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "Y", travel_mm: 60.0, rapid_m_min: 30.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 20.0, torque_nm: 19.1, taper: "HSK-A100" },
    tool_changer: { type: "carousel", capacity: 60, change_time_sec: 4.0 },
  },
  {
    brand: "Cincinnati",
    model: "Lancer 1250 5X",
    type: "VMC",
    controller: "Siemens Siemens 840D sl",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "Y", travel_mm: 60.0, rapid_m_min: 30.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 8000, power_kw: 16.0, torque_nm: 19.1, taper: "HSK-A100" },
    tool_changer: { type: "carousel", capacity: 60, change_time_sec: 4.0 },
  },
  {
    brand: "Cincinnati",
    model: "U5-400",
    type: "VMC",
    controller: "Siemens Siemens 840D sl",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "Y", travel_mm: 80.0, rapid_m_min: 30.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 24000, power_kw: 27.0, torque_nm: 10.7, taper: "HSK-A63" },
    tool_changer: { type: "chain", capacity: 80, change_time_sec: 3.0 },
  },
  {
    brand: "Cincinnati",
    model: "U5-600",
    type: "VMC",
    controller: "Siemens Siemens 840D sl",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "Y", travel_mm: 40.0, rapid_m_min: 30.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 24000, power_kw: 27.0, torque_nm: 10.7, taper: "HSK-A63" },
    tool_changer: { type: "carousel", capacity: 40, change_time_sec: 4.0 },
  },
  {
    brand: "Cincinnati",
    model: "Gammtech 5-Axis",
    type: "VMC",
    controller: "Siemens Siemens 840D sl",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "Y", travel_mm: 50.0, rapid_m_min: 30.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 20000, power_kw: 24.0, torque_nm: 11.5, taper: "HSK-A63" },
    tool_changer: { type: "carousel", capacity: 50, change_time_sec: 4.0 },
  },
  {
    brand: "Cincinnati",
    model: "MAG5X",
    type: "VMC",
    controller: "Siemens Siemens 840D sl",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "Y", travel_mm: 40.0, rapid_m_min: 30.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 15000, power_kw: 30.0, torque_nm: 19.1, taper: "HSK-A100" },
    tool_changer: { type: "carousel", capacity: 40, change_time_sec: 4.0 },
  },
  {
    brand: "Cincinnati",
    model: "V5-3000",
    type: "VMC",
    controller: "Siemens Siemens 840D sl",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "Y", travel_mm: 60.0, rapid_m_min: 30.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 12000, power_kw: 24.0, torque_nm: 19.1, taper: "HSK-A100" },
    tool_changer: { type: "carousel", capacity: 60, change_time_sec: 4.0 },
  },
  {
    brand: "Cincinnati",
    model: "Maxim 500",
    type: "VMC",
    controller: "Siemens Siemens 840D sl",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "Y", travel_mm: 50.0, rapid_m_min: 30.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 10.0, torque_nm: 9.5, taper: "CAT40" },
    tool_changer: { type: "carousel", capacity: 50, change_time_sec: 4.0 },
  },
  {
    brand: "FANUC",
    model: "α-D14MiA5",
    type: "VMC",
    controller: "Fanuc FANUC 31i-B5",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 54.0 },
      { name: "Y", travel_mm: 21.0, rapid_m_min: 54.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 54.0 }
    ],
    spindle: { max_rpm: 24000, power_kw: 8.2, torque_nm: 25.0, taper: "BT30" },
    tool_changer: { type: "arm", capacity: 21, change_time_sec: 2.5 },
  },
  {
    brand: "FANUC",
    model: "α-D21MiA5",
    type: "VMC",
    controller: "Fanuc FANUC 31i-B5",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 54.0 },
      { name: "Y", travel_mm: 21.0, rapid_m_min: 54.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 54.0 }
    ],
    spindle: { max_rpm: 24000, power_kw: 8.2, torque_nm: 25.0, taper: "BT30" },
    tool_changer: { type: "arm", capacity: 21, change_time_sec: 2.5 },
  },
  {
    brand: "FANUC",
    model: "α-D21LiA5",
    type: "VMC",
    controller: "Fanuc FANUC 31i-B5",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 54.0 },
      { name: "Y", travel_mm: 21.0, rapid_m_min: 54.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 54.0 }
    ],
    spindle: { max_rpm: 24000, power_kw: 8.2, torque_nm: 25.0, taper: "BT30" },
    tool_changer: { type: "arm", capacity: 21, change_time_sec: 2.5 },
  },
  {
    brand: "FANUC",
    model: "α-D14MiB5 ADV",
    type: "VMC",
    controller: "Fanuc FANUC 31i-B5 Plus",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 54.0 },
      { name: "Y", travel_mm: 21.0, rapid_m_min: 54.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 54.0 }
    ],
    spindle: { max_rpm: 24000, power_kw: 11.2, torque_nm: 38.0, taper: "BT30" },
    tool_changer: { type: "arm", capacity: 21, change_time_sec: 2.5 },
  },
  {
    brand: "FANUC",
    model: "α-D21MiB5 ADV",
    type: "VMC",
    controller: "Fanuc FANUC 31i-B5 Plus",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 54.0 },
      { name: "Y", travel_mm: 21.0, rapid_m_min: 54.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 54.0 }
    ],
    spindle: { max_rpm: 24000, power_kw: 11.2, torque_nm: 38.0, taper: "BT30" },
    tool_changer: { type: "arm", capacity: 21, change_time_sec: 2.5 },
  },
  {
    brand: "FANUC",
    model: "α-D21MiA5 with DDR",
    type: "5axis",
    controller: "Fanuc FANUC 31i-B5",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 54.0 },
      { name: "Y", travel_mm: 21.0, rapid_m_min: 54.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 54.0 }
    ],
    spindle: { max_rpm: 24000, power_kw: 8.2, torque_nm: 25.0, taper: "BT30" },
    tool_changer: { type: "arm", capacity: 21, change_time_sec: 2.5 },
  },
  {
    brand: "FANUC",
    model: "α-D21LiA5 with DDR",
    type: "5axis",
    controller: "Fanuc FANUC 31i-B5",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 54.0 },
      { name: "Y", travel_mm: 21.0, rapid_m_min: 54.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 54.0 }
    ],
    spindle: { max_rpm: 24000, power_kw: 8.2, torque_nm: 25.0, taper: "BT30" },
    tool_changer: { type: "arm", capacity: 21, change_time_sec: 2.5 },
  },
  {
    brand: "Feeler",
    model: "VMP-580",
    type: "VMC",
    controller: "Fanuc 0i-MF Plus",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "Y", travel_mm: 24.0, rapid_m_min: 30.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 12000, power_kw: 11.0, torque_nm: 70.0, taper: "BT40" },
    tool_changer: { type: "arm", capacity: 24, change_time_sec: 2.5 },
  },
  {
    brand: "Feeler",
    model: "VMP-1100",
    type: "VMC",
    controller: "Fanuc 0i-MF Plus",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "Y", travel_mm: 30.0, rapid_m_min: 30.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 12000, power_kw: 15.0, torque_nm: 119.0, taper: "BT40" },
    tool_changer: { type: "arm", capacity: 30, change_time_sec: 2.5 },
  },
  {
    brand: "Feeler",
    model: "HV-800",
    type: "VMC",
    controller: "Fanuc 31i-B5",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "Y", travel_mm: 30.0, rapid_m_min: 30.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 20000, power_kw: 22.0, torque_nm: 100.0, taper: "BBT40" },
    tool_changer: { type: "arm", capacity: 30, change_time_sec: 2.5 },
  },
  {
    brand: "Feeler",
    model: "U-600",
    type: "VMC",
    controller: "Fanuc 31i-B5",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "Y", travel_mm: 32.0, rapid_m_min: 30.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 15000, power_kw: 22.0, torque_nm: 140.0, taper: "HSK-A63" },
    tool_changer: { type: "carousel", capacity: 32, change_time_sec: 4.0 },
  },
  {
    brand: "Feeler",
    model: "FMH-500",
    type: "HMC",
    controller: "Fanuc 31i-B5",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "Y", travel_mm: 60.0, rapid_m_min: 30.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 30.0, torque_nm: 1000.0, taper: "BT50" },
    tool_changer: { type: "carousel", capacity: 60, change_time_sec: 4.0 },
  },
  {
    brand: "Feeler",
    model: "FDC-2114",
    type: "VMC",
    controller: "Fanuc 0i-MF Plus",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "Y", travel_mm: 32.0, rapid_m_min: 30.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 6000, power_kw: 30.0, torque_nm: 1800.0, taper: "BT50" },
    tool_changer: { type: "carousel", capacity: 32, change_time_sec: 4.0 },
  },
  {
    brand: "Feeler",
    model: "FV-760",
    type: "VMC",
    controller: "Fanuc 0i-MF Plus",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "Y", travel_mm: 21.0, rapid_m_min: 30.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 24000, power_kw: 7.5, torque_nm: 12.0, taper: "BT30" },
    tool_changer: { type: "arm", capacity: 21, change_time_sec: 2.5 },
  },
  {
    brand: "Fidia",
    model: "D321",
    type: "VMC",
    controller: "Fidia Fidia C40 Vision",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "Y", travel_mm: 36.0, rapid_m_min: 30.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 24000, power_kw: 27.0, torque_nm: 10.7, taper: "HSK-A63" },
    tool_changer: { type: "carousel", capacity: 36, change_time_sec: 4.0 },
  },
  {
    brand: "Fidia",
    model: "D321 Linear",
    type: "VMC",
    controller: "Fidia Fidia C40",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "Y", travel_mm: 36.0, rapid_m_min: 30.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 30000, power_kw: 22.5, torque_nm: 7.2, taper: "HSK-E50" },
    tool_changer: { type: "carousel", capacity: 36, change_time_sec: 4.0 },
  },
  {
    brand: "Fidia",
    model: "GTR 2500",
    type: "VMC",
    controller: "Fidia Fidia C40",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "Y", travel_mm: 36.0, rapid_m_min: 30.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 24000, power_kw: 27.0, torque_nm: 10.7, taper: "HSK-A63" },
    tool_changer: { type: "carousel", capacity: 36, change_time_sec: 4.0 },
  },
  {
    brand: "Fidia",
    model: "GTR 4500",
    type: "VMC",
    controller: "Fidia Fidia C40",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "Y", travel_mm: 40.0, rapid_m_min: 30.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 20000, power_kw: 40.0, torque_nm: 19.1, taper: "HSK-A100" },
    tool_changer: { type: "carousel", capacity: 40, change_time_sec: 4.0 },
  },
  {
    brand: "Fidia",
    model: "GTF 3014",
    type: "VMC",
    controller: "Fidia Fidia C40",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "Y", travel_mm: 60.0, rapid_m_min: 30.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 18000, power_kw: 36.0, torque_nm: 19.1, taper: "HSK-A100" },
    tool_changer: { type: "carousel", capacity: 60, change_time_sec: 4.0 },
  },
  {
    brand: "Fidia",
    model: "K199",
    type: "VMC",
    controller: "Fidia C40 Compact",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "Y", travel_mm: 80.0, rapid_m_min: 30.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 24000, power_kw: 18.0, torque_nm: 7.2, taper: "HSK-E40" },
    tool_changer: { type: "chain", capacity: 80, change_time_sec: 3.0 },
  },
  {
    brand: "Fidia",
    model: "K211",
    type: "VMC",
    controller: "Fidia Fidia C40",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 30.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 20000, power_kw: 24.0, torque_nm: 11.5, taper: "HSK-A63" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Giddings & Lewis",
    model: "RT 1250",
    type: "VMC",
    controller: "Siemens Siemens 840D sl",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "Y", travel_mm: 40.0, rapid_m_min: 30.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 3000, power_kw: 4.4, torque_nm: 14.0, taper: "ISO50" },
    tool_changer: { type: "carousel", capacity: 40, change_time_sec: 4.0 },
  },
  {
    brand: "Giddings & Lewis",
    model: "RT 1600",
    type: "VMC",
    controller: "Siemens Siemens 840D sl",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "Y", travel_mm: 40.0, rapid_m_min: 30.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 2500, power_kw: 1.8, torque_nm: 6.9, taper: "BT40" },
    tool_changer: { type: "carousel", capacity: 40, change_time_sec: 4.0 },
  },
  {
    brand: "Giddings & Lewis",
    model: "FT 2500",
    type: "VMC",
    controller: "Siemens Siemens 840D sl",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "Y", travel_mm: 60.0, rapid_m_min: 30.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 2000, power_kw: 1.5, torque_nm: 7.2, taper: "BT40" },
    tool_changer: { type: "carousel", capacity: 60, change_time_sec: 4.0 },
  },
  {
    brand: "Giddings & Lewis",
    model: "FT 3500",
    type: "VMC",
    controller: "Siemens Siemens 840D sl",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "Y", travel_mm: 60.0, rapid_m_min: 30.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 1500, power_kw: 1.1, torque_nm: 7.0, taper: "BT40" },
    tool_changer: { type: "carousel", capacity: 60, change_time_sec: 4.0 },
  },
  {
    brand: "Giddings & Lewis",
    model: "FT 5000",
    type: "VMC",
    controller: "Siemens Siemens 840D sl",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "Y", travel_mm: 80.0, rapid_m_min: 30.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 1200, power_kw: 0.9, torque_nm: 7.2, taper: "BT40" },
    tool_changer: { type: "chain", capacity: 80, change_time_sec: 3.0 },
  },
  {
    brand: "Giddings & Lewis",
    model: "PM 2500",
    type: "VMC",
    controller: "Siemens Siemens 840D sl",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "Y", travel_mm: 100.0, rapid_m_min: 30.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 2500, power_kw: 3.7, torque_nm: 14.1, taper: "ISO50" },
    tool_changer: { type: "chain", capacity: 100, change_time_sec: 3.0 },
  },
  {
    brand: "Giddings & Lewis",
    model: "PM 4000",
    type: "VMC",
    controller: "Siemens Siemens 840D sl",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "Y", travel_mm: 40.0, rapid_m_min: 30.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 2000, power_kw: 2.9, torque_nm: 13.8, taper: "ISO50" },
    tool_changer: { type: "carousel", capacity: 40, change_time_sec: 4.0 },
  },
  {
    brand: "GROB",
    model: "G150",
    type: "5axis",
    controller: "Siemens Siemens 840D sl",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 65.0 },
      { name: "Y", travel_mm: 60.0, rapid_m_min: 65.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 65.0 }
    ],
    spindle: { max_rpm: 18000, power_kw: 26.1, torque_nm: 120.0, taper: "HSK-A63" },
    tool_changer: { type: "carousel", capacity: 60, change_time_sec: 4.0 },
  },
  {
    brand: "GROB",
    model: "G350",
    type: "5axis",
    controller: "Siemens Siemens 840D sl",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 60.0 },
      { name: "Y", travel_mm: 89.0, rapid_m_min: 60.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 60.0 }
    ],
    spindle: { max_rpm: 16000, power_kw: 33.6, torque_nm: 180.0, taper: "HSK-A63" },
    tool_changer: { type: "chain", capacity: 89, change_time_sec: 3.0 },
  },
  {
    brand: "GROB",
    model: "G550",
    type: "5axis",
    controller: "Siemens Siemens 840D sl",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 50.0 },
      { name: "Y", travel_mm: 119.0, rapid_m_min: 50.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 50.0 }
    ],
    spindle: { max_rpm: 14000, power_kw: 44.7, torque_nm: 280.0, taper: "HSK-A100" },
    tool_changer: { type: "chain", capacity: 119, change_time_sec: 3.0 },
  },
  {
    brand: "GROB",
    model: "G750",
    type: "5axis",
    controller: "Siemens Siemens 840D sl",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 45.0 },
      { name: "Y", travel_mm: 179.0, rapid_m_min: 45.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 45.0 }
    ],
    spindle: { max_rpm: 12000, power_kw: 59.7, torque_nm: 450.0, taper: "HSK-A100" },
    tool_changer: { type: "chain", capacity: 179, change_time_sec: 3.0 },
  },
  {
    brand: "GROB",
    model: "G350a",
    type: "5axis",
    controller: "Siemens Siemens 840D sl",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 60.0 },
      { name: "Y", travel_mm: 89.0, rapid_m_min: 60.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 60.0 }
    ],
    spindle: { max_rpm: 16000, power_kw: 33.6, torque_nm: 180.0, taper: "HSK-A63" },
    tool_changer: { type: "chain", capacity: 89, change_time_sec: 3.0 },
  },
  {
    brand: "GROB",
    model: "G520F",
    type: "5axis",
    controller: "Siemens Siemens 840D sl",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 50.0 },
      { name: "Y", travel_mm: 119.0, rapid_m_min: 50.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 50.0 }
    ],
    spindle: { max_rpm: 14000, power_kw: 41.0, torque_nm: 250.0, taper: "HSK-A100" },
    tool_changer: { type: "chain", capacity: 119, change_time_sec: 3.0 },
  },
  {
    brand: "Hardinge",
    model: "Conquest T42",
    type: "lathe",
    controller: "Fanuc FANUC 0i-TF Plus",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 24.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 24.0 }
    ],
    spindle: { max_rpm: 6000, power_kw: 11.2, torque_nm: 160.0, taper: "BT40" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Hardinge",
    model: "Conquest T51",
    type: "lathe",
    controller: "Fanuc FANUC 0i-TF Plus",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 24.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 24.0 }
    ],
    spindle: { max_rpm: 5000, power_kw: 14.9, torque_nm: 250.0, taper: "BT40" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Hardinge",
    model: "Conquest T65",
    type: "lathe",
    controller: "Fanuc FANUC 0i-TF Plus",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 24.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 24.0 }
    ],
    spindle: { max_rpm: 4500, power_kw: 18.6, torque_nm: 380.0, taper: "BT40" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Hardinge",
    model: "Elite T42 SMY",
    type: "lathe",
    controller: "Fanuc FANUC 31i-B",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 24.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 24.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 7.3, torque_nm: 7.0, taper: "BT40" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Hardinge",
    model: "Elite T65 SMY",
    type: "lathe",
    controller: "Fanuc FANUC 31i-B",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 24.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 24.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 7.3, torque_nm: 7.0, taper: "BT40" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Hardinge",
    model: "Super-Precision SP",
    type: "lathe",
    controller: "Fanuc FANUC 31i-B",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 15.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 15.0 }
    ],
    spindle: { max_rpm: 8000, power_kw: 8.9, torque_nm: 95.0, taper: "BT40" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Hurco",
    model: "VM10i",
    type: "VMC",
    controller: "Hurco Hurco WinMax",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 24.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 24.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 24.0 }
    ],
    spindle: { max_rpm: 12000, power_kw: 11.2, torque_nm: 65.0, taper: "BT40" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Hurco",
    model: "VMX64i",
    type: "VMC",
    controller: "Hurco Hurco WinMax",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 25.0 },
      { name: "Y", travel_mm: 48.0, rapid_m_min: 25.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 25.0 }
    ],
    spindle: { max_rpm: 8000, power_kw: 29.8, torque_nm: 280.0, taper: "BT50" },
    tool_changer: { type: "carousel", capacity: 48, change_time_sec: 4.0 },
  },
  {
    brand: "Hurco",
    model: "VMX30Ui",
    type: "5axis",
    controller: "Hurco Hurco WinMax",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 35.0 },
      { name: "Y", travel_mm: 40.0, rapid_m_min: 35.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 35.0 }
    ],
    spindle: { max_rpm: 12000, power_kw: 18.6, torque_nm: 119.0, taper: "BT40" },
    tool_changer: { type: "carousel", capacity: 40, change_time_sec: 4.0 },
  },
  {
    brand: "Hurco",
    model: "TM8i",
    type: "lathe",
    controller: "Hurco Hurco WinMax Lathe",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 20.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 20.0 }
    ],
    spindle: { max_rpm: 4500, power_kw: 11.2, torque_nm: 200.0, taper: "BT40" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Hurco",
    model: "TM10i",
    type: "lathe",
    controller: "Hurco Hurco WinMax Lathe",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 20.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 20.0 }
    ],
    spindle: { max_rpm: 4000, power_kw: 14.9, torque_nm: 300.0, taper: "BT40" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Hurco",
    model: "TM12i",
    type: "lathe",
    controller: "Hurco Hurco WinMax Lathe",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 18.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 18.0 }
    ],
    spindle: { max_rpm: 3500, power_kw: 22.4, torque_nm: 500.0, taper: "BT40" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Hyundai WIA",
    model: "KF 4600",
    type: "VMC",
    controller: "Fanuc FANUC 0i-MF Plus",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 24.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 12000, power_kw: 14.9, torque_nm: 95.0, taper: "BBT40" },
    tool_changer: { type: "arm", capacity: 24, change_time_sec: 2.5 },
  },
  {
    brand: "Hyundai WIA",
    model: "KF 5600",
    type: "VMC",
    controller: "Fanuc FANUC 0i-MF Plus",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 30.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 12000, power_kw: 18.6, torque_nm: 119.0, taper: "BBT40" },
    tool_changer: { type: "arm", capacity: 30, change_time_sec: 2.5 },
  },
  {
    brand: "Hyundai WIA",
    model: "KF 6700",
    type: "VMC",
    controller: "Fanuc FANUC 0i-MF Plus",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "Y", travel_mm: 40.0, rapid_m_min: 30.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 22.4, torque_nm: 178.0, taper: "BBT50" },
    tool_changer: { type: "carousel", capacity: 40, change_time_sec: 4.0 },
  },
  {
    brand: "Hyundai WIA",
    model: "HS 5000",
    type: "HMC",
    controller: "Fanuc FANUC 31i-B",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 60.0 },
      { name: "Y", travel_mm: 60.0, rapid_m_min: 60.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 60.0 }
    ],
    spindle: { max_rpm: 14000, power_kw: 26.1, torque_nm: 166.0, taper: "BBT40" },
    tool_changer: { type: "carousel", capacity: 60, change_time_sec: 4.0 },
  },
  {
    brand: "Hyundai WIA",
    model: "HS 6300",
    type: "HMC",
    controller: "Fanuc FANUC 31i-B",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 50.0 },
      { name: "Y", travel_mm: 90.0, rapid_m_min: 50.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 50.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 37.3, torque_nm: 300.0, taper: "BBT50" },
    tool_changer: { type: "chain", capacity: 90, change_time_sec: 3.0 },
  },
  {
    brand: "Hyundai WIA",
    model: "SKT 200",
    type: "lathe",
    controller: "Fanuc FANUC 0i-TF Plus",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 24.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 24.0 }
    ],
    spindle: { max_rpm: 4500, power_kw: 14.9, torque_nm: 265.0, taper: "BT40" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Hyundai WIA",
    model: "SKT 250",
    type: "lathe",
    controller: "Fanuc FANUC 0i-TF Plus",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 24.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 24.0 }
    ],
    spindle: { max_rpm: 4000, power_kw: 18.6, torque_nm: 380.0, taper: "BT40" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Hyundai WIA",
    model: "SKT 300",
    type: "lathe",
    controller: "Fanuc FANUC 0i-TF Plus",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 20.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 20.0 }
    ],
    spindle: { max_rpm: 3500, power_kw: 26.1, torque_nm: 650.0, taper: "BT40" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Kern",
    model: "Micro Evo",
    type: "5axis",
    controller: "Heidenhain HEIDENHAIN iTNC 530",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "Y", travel_mm: 25.0, rapid_m_min: 30.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 50000, power_kw: 5.6, torque_nm: 4.8, taper: "HSK-E25" },
    tool_changer: { type: "arm", capacity: 25, change_time_sec: 2.5 },
  },
  {
    brand: "Kern",
    model: "Micro Vario",
    type: "5axis",
    controller: "Heidenhain HEIDENHAIN TNC 640",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 32.0 },
      { name: "Y", travel_mm: 38.0, rapid_m_min: 32.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 32.0 }
    ],
    spindle: { max_rpm: 50000, power_kw: 7.5, torque_nm: 7.2, taper: "HSK-E32" },
    tool_changer: { type: "carousel", capacity: 38, change_time_sec: 4.0 },
  },
  {
    brand: "Kern",
    model: "Micro HD",
    type: "5axis",
    controller: "Heidenhain HEIDENHAIN TNC 640",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 35.0 },
      { name: "Y", travel_mm: 63.0, rapid_m_min: 35.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 35.0 }
    ],
    spindle: { max_rpm: 42000, power_kw: 11.2, torque_nm: 14.0, taper: "HSK-E40" },
    tool_changer: { type: "chain", capacity: 63, change_time_sec: 3.0 },
  },
  {
    brand: "Kern",
    model: "Pyramid Nano",
    type: "5axis",
    controller: "Heidenhain HEIDENHAIN TNC 640",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 20.0 },
      { name: "Y", travel_mm: 16.0, rapid_m_min: 20.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 20.0 }
    ],
    spindle: { max_rpm: 160000, power_kw: 1.9, torque_nm: 0.5, taper: "HSK-E20" },
    tool_changer: { type: "arm", capacity: 16, change_time_sec: 2.5 },
  },
  {
    brand: "Kern",
    model: "Pyramid Nano Twin",
    type: "5axis",
    controller: "Heidenhain HEIDENHAIN TNC 640",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 22.0 },
      { name: "Y", travel_mm: 24.0, rapid_m_min: 22.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 22.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 7.3, torque_nm: 7.0, taper: "BT40" },
    tool_changer: { type: "arm", capacity: 24, change_time_sec: 2.5 },
  },
  {
    brand: "Kitamura",
    model: "Mycenter HX300iG",
    type: "VMC",
    controller: "Fanuc Arumatik-Mi",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 48.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 48.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 48.0 }
    ],
    spindle: { max_rpm: 15000, power_kw: 11.2, torque_nm: 55.0, taper: "BBT30" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Kitamura",
    model: "Mycenter HX400iG",
    type: "VMC",
    controller: "Fanuc Arumatik-Mi",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 42.0 },
      { name: "Y", travel_mm: 30.0, rapid_m_min: 42.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 42.0 }
    ],
    spindle: { max_rpm: 12000, power_kw: 16.4, torque_nm: 100.0, taper: "BBT40" },
    tool_changer: { type: "arm", capacity: 30, change_time_sec: 2.5 },
  },
  {
    brand: "Kitamura",
    model: "Mycenter HX500iG",
    type: "VMC",
    controller: "Fanuc Arumatik-Mi",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 40.0 },
      { name: "Y", travel_mm: 40.0, rapid_m_min: 40.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 40.0 }
    ],
    spindle: { max_rpm: 12000, power_kw: 22.4, torque_nm: 140.0, taper: "BBT40" },
    tool_changer: { type: "carousel", capacity: 40, change_time_sec: 4.0 },
  },
  {
    brand: "Kitamura",
    model: "Mytrunnion-4G",
    type: "5axis",
    controller: "Fanuc Arumatik-Mi 5X",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 48.0 },
      { name: "Y", travel_mm: 40.0, rapid_m_min: 48.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 48.0 }
    ],
    spindle: { max_rpm: 15000, power_kw: 16.4, torque_nm: 85.0, taper: "BBT40" },
    tool_changer: { type: "carousel", capacity: 40, change_time_sec: 4.0 },
  },
  {
    brand: "Kitamura",
    model: "Mytrunnion-5G",
    type: "5axis",
    controller: "Fanuc Arumatik-Mi 5X",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 42.0 },
      { name: "Y", travel_mm: 60.0, rapid_m_min: 42.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 42.0 }
    ],
    spindle: { max_rpm: 12000, power_kw: 22.4, torque_nm: 140.0, taper: "BBT40" },
    tool_changer: { type: "carousel", capacity: 60, change_time_sec: 4.0 },
  },
  {
    brand: "Kitamura",
    model: "Supercell-300G",
    type: "HMC",
    controller: "Fanuc Arumatik-Mi",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 60.0 },
      { name: "Y", travel_mm: 40.0, rapid_m_min: 60.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 60.0 }
    ],
    spindle: { max_rpm: 15000, power_kw: 18.6, torque_nm: 100.0, taper: "BBT40" },
    tool_changer: { type: "carousel", capacity: 40, change_time_sec: 4.0 },
  },
  {
    brand: "Kitamura",
    model: "Supercell-400G",
    type: "HMC",
    controller: "Fanuc Arumatik-Mi",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 60.0 },
      { name: "Y", travel_mm: 60.0, rapid_m_min: 60.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 60.0 }
    ],
    spindle: { max_rpm: 14000, power_kw: 26.1, torque_nm: 166.0, taper: "BBT40" },
    tool_changer: { type: "carousel", capacity: 60, change_time_sec: 4.0 },
  },
  {
    brand: "Kitamura",
    model: "Bridgecenter-8XG",
    type: "VMC",
    controller: "Fanuc Arumatik-Mi",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 35.0 },
      { name: "Y", travel_mm: 60.0, rapid_m_min: 35.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 35.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 29.8, torque_nm: 280.0, taper: "BBT50" },
    tool_changer: { type: "carousel", capacity: 60, change_time_sec: 4.0 },
  },
  {
    brand: "Leadwell",
    model: "MCV-610AP",
    type: "VMC",
    controller: "Fanuc FANUC 0i-MF Plus",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 24.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 12000, power_kw: 11.2, torque_nm: 70.0, taper: "BT40" },
    tool_changer: { type: "arm", capacity: 24, change_time_sec: 2.5 },
  },
  {
    brand: "Leadwell",
    model: "MCV-1000B",
    type: "VMC",
    controller: "Fanuc FANUC 0i-MF Plus",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "Y", travel_mm: 24.0, rapid_m_min: 30.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 14.9, torque_nm: 119.0, taper: "BT40" },
    tool_changer: { type: "arm", capacity: 24, change_time_sec: 2.5 },
  },
  {
    brand: "Leadwell",
    model: "MCV-1300D",
    type: "VMC",
    controller: "Fanuc FANUC 0i-MF Plus",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 24.0 },
      { name: "Y", travel_mm: 30.0, rapid_m_min: 24.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 24.0 }
    ],
    spindle: { max_rpm: 8000, power_kw: 18.6, torque_nm: 180.0, taper: "BT50" },
    tool_changer: { type: "arm", capacity: 30, change_time_sec: 2.5 },
  },
  {
    brand: "Leadwell",
    model: "V-30iT",
    type: "5axis",
    controller: "Fanuc FANUC 31i-B5",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 40.0 },
      { name: "Y", travel_mm: 40.0, rapid_m_min: 40.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 40.0 }
    ],
    spindle: { max_rpm: 12000, power_kw: 16.4, torque_nm: 105.0, taper: "BBT40" },
    tool_changer: { type: "carousel", capacity: 40, change_time_sec: 4.0 },
  },
  {
    brand: "Leadwell",
    model: "LTC-20B",
    type: "lathe",
    controller: "Fanuc FANUC 0i-TF Plus",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 4000, power_kw: 11.2, torque_nm: 200.0, taper: "BT40" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Leadwell",
    model: "LTC-35BLY",
    type: "lathe",
    controller: "Fanuc FANUC 0i-TF Plus",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 24.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 24.0 }
    ],
    spindle: { max_rpm: 3500, power_kw: 18.6, torque_nm: 420.0, taper: "BT40" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Leadwell",
    model: "T-7SMY",
    type: "lathe",
    controller: "Fanuc FANUC 31i-B",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 7.3, torque_nm: 7.0, taper: "BT40" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Matsuura",
    model: "MAM72-25V",
    type: "5axis",
    controller: "Fanuc FANUC 31i-B5 / MAPPS IV",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 50.0 },
      { name: "Y", travel_mm: 90.0, rapid_m_min: 50.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 50.0 }
    ],
    spindle: { max_rpm: 20000, power_kw: 13.4, torque_nm: 57.0, taper: "HSK-A63" },
    tool_changer: { type: "chain", capacity: 90, change_time_sec: 3.0 },
  },
  {
    brand: "Matsuura",
    model: "MAM72-35V",
    type: "5axis",
    controller: "Fanuc FANUC 31i-B5 / MAPPS IV",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 50.0 },
      { name: "Y", travel_mm: 120.0, rapid_m_min: 50.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 50.0 }
    ],
    spindle: { max_rpm: 15000, power_kw: 18.6, torque_nm: 95.0, taper: "HSK-A63" },
    tool_changer: { type: "chain", capacity: 120, change_time_sec: 3.0 },
  },
  {
    brand: "Matsuura",
    model: "MAM72-52V",
    type: "5axis",
    controller: "Fanuc FANUC 31i-B5 / MAPPS IV",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 40.0 },
      { name: "Y", travel_mm: 180.0, rapid_m_min: 40.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 40.0 }
    ],
    spindle: { max_rpm: 12000, power_kw: 26.1, torque_nm: 166.0, taper: "HSK-A100" },
    tool_changer: { type: "chain", capacity: 180, change_time_sec: 3.0 },
  },
  {
    brand: "Matsuura",
    model: "MX-330",
    type: "5axis",
    controller: "Fanuc FANUC 31i-B5",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 45.0 },
      { name: "Y", travel_mm: 40.0, rapid_m_min: 45.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 45.0 }
    ],
    spindle: { max_rpm: 12000, power_kw: 18.6, torque_nm: 119.0, taper: "BBT40" },
    tool_changer: { type: "carousel", capacity: 40, change_time_sec: 4.0 },
  },
  {
    brand: "Matsuura",
    model: "MX-520",
    type: "5axis",
    controller: "Fanuc FANUC 31i-B5",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 42.0 },
      { name: "Y", travel_mm: 60.0, rapid_m_min: 42.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 42.0 }
    ],
    spindle: { max_rpm: 12000, power_kw: 22.4, torque_nm: 166.0, taper: "BBT40" },
    tool_changer: { type: "carousel", capacity: 60, change_time_sec: 4.0 },
  },
  {
    brand: "Matsuura",
    model: "V.Plus-800",
    type: "VMC",
    controller: "Fanuc FANUC 31i-B5",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 30.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 12000, power_kw: 18.6, torque_nm: 119.0, taper: "BBT40" },
    tool_changer: { type: "arm", capacity: 30, change_time_sec: 2.5 },
  },
  {
    brand: "Matsuura",
    model: "H.Plus-405",
    type: "HMC",
    controller: "Fanuc FANUC 31i-B5",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 60.0 },
      { name: "Y", travel_mm: 60.0, rapid_m_min: 60.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 60.0 }
    ],
    spindle: { max_rpm: 15000, power_kw: 26.1, torque_nm: 143.0, taper: "HSK-A63" },
    tool_changer: { type: "carousel", capacity: 60, change_time_sec: 4.0 },
  },
  {
    brand: "MHI",
    model: "MVR-Ex35",
    type: "VMC",
    controller: "Mitsubishi Mitsubishi M850W",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "Y", travel_mm: 60.0, rapid_m_min: 30.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 8000, power_kw: 16.0, torque_nm: 19.1, taper: "HSK-A100" },
    tool_changer: { type: "carousel", capacity: 60, change_time_sec: 4.0 },
  },
  {
    brand: "MHI",
    model: "MVR-Ex50",
    type: "VMC",
    controller: "Mitsubishi Mitsubishi M800",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "Y", travel_mm: 80.0, rapid_m_min: 30.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 6000, power_kw: 12.0, torque_nm: 19.1, taper: "HSK-A100" },
    tool_changer: { type: "chain", capacity: 80, change_time_sec: 3.0 },
  },
  {
    brand: "MHI",
    model: "MVR-Ex80",
    type: "VMC",
    controller: "Mitsubishi Mitsubishi M800",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "Y", travel_mm: 80.0, rapid_m_min: 30.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 5000, power_kw: 10.0, torque_nm: 19.1, taper: "HSK-A100" },
    tool_changer: { type: "chain", capacity: 80, change_time_sec: 3.0 },
  },
  {
    brand: "MHI",
    model: "MAF-E180",
    type: "VMC",
    controller: "Mitsubishi Mitsubishi M800",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "Y", travel_mm: 100.0, rapid_m_min: 30.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 24000, power_kw: 27.0, torque_nm: 10.7, taper: "HSK-A63" },
    tool_changer: { type: "chain", capacity: 100, change_time_sec: 3.0 },
  },
  {
    brand: "MHI",
    model: "MAF-S150",
    type: "VMC",
    controller: "Mitsubishi Mitsubishi M800",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "Y", travel_mm: 120.0, rapid_m_min: 30.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 12000, power_kw: 24.0, torque_nm: 19.1, taper: "HSK-A100" },
    tool_changer: { type: "chain", capacity: 120, change_time_sec: 3.0 },
  },
  {
    brand: "MHI",
    model: "MAF-HB130",
    type: "VMC",
    controller: "Mitsubishi Mitsubishi M800",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "Y", travel_mm: 100.0, rapid_m_min: 30.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 3000, power_kw: 4.4, torque_nm: 14.0, taper: "ISO50" },
    tool_changer: { type: "chain", capacity: 100, change_time_sec: 3.0 },
  },
  {
    brand: "MHI",
    model: "MAF-HB180",
    type: "VMC",
    controller: "Mitsubishi Mitsubishi M800",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "Y", travel_mm: 60.0, rapid_m_min: 30.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 2500, power_kw: 1.8, torque_nm: 6.9, taper: "BT40" },
    tool_changer: { type: "carousel", capacity: 60, change_time_sec: 4.0 },
  },
  {
    brand: "MHI",
    model: "MVR-Cx50",
    type: "VMC",
    controller: "Mitsubishi Mitsubishi M800",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "Y", travel_mm: 80.0, rapid_m_min: 30.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 6000, power_kw: 8.8, torque_nm: 14.0, taper: "CAT50" },
    tool_changer: { type: "chain", capacity: 80, change_time_sec: 3.0 },
  },
  {
    brand: "MHI",
    model: "MVR-40",
    type: "VMC",
    controller: "Mitsubishi Mitsubishi M800",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "Y", travel_mm: 40.0, rapid_m_min: 30.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 8000, power_kw: 11.7, torque_nm: 14.0, taper: "CAT50" },
    tool_changer: { type: "carousel", capacity: 40, change_time_sec: 4.0 },
  },
  {
    brand: "MHI",
    model: "MAF-S500",
    type: "VMC",
    controller: "Mitsubishi Mitsubishi M800",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "Y", travel_mm: 32.0, rapid_m_min: 30.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 20.0, torque_nm: 19.1, taper: "HSK-A100" },
    tool_changer: { type: "carousel", capacity: 32, change_time_sec: 4.0 },
  },
  {
    brand: "Mikron",
    model: "MILL S 400 U",
    type: "5axis",
    controller: "Heidenhain HEIDENHAIN TNC 640",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 40.0 },
      { name: "Y", travel_mm: 30.0, rapid_m_min: 40.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 40.0 }
    ],
    spindle: { max_rpm: 20000, power_kw: 17.9, torque_nm: 77.0, taper: "HSK-E50" },
    tool_changer: { type: "arm", capacity: 30, change_time_sec: 2.5 },
  },
  {
    brand: "Mikron",
    model: "MILL S 500 U",
    type: "5axis",
    controller: "Heidenhain HEIDENHAIN TNC 640",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 40.0 },
      { name: "Y", travel_mm: 42.0, rapid_m_min: 40.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 40.0 }
    ],
    spindle: { max_rpm: 20000, power_kw: 20.9, torque_nm: 95.0, taper: "HSK-A63" },
    tool_changer: { type: "carousel", capacity: 42, change_time_sec: 4.0 },
  },
  {
    brand: "Mikron",
    model: "MILL P 500 U",
    type: "5axis",
    controller: "Heidenhain HEIDENHAIN TNC 640",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 45.0 },
      { name: "Y", travel_mm: 60.0, rapid_m_min: 45.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 45.0 }
    ],
    spindle: { max_rpm: 20000, power_kw: 26.1, torque_nm: 119.0, taper: "HSK-A63" },
    tool_changer: { type: "carousel", capacity: 60, change_time_sec: 4.0 },
  },
  {
    brand: "Mikron",
    model: "MILL P 800 U",
    type: "5axis",
    controller: "Heidenhain HEIDENHAIN TNC 640",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 40.0 },
      { name: "Y", travel_mm: 90.0, rapid_m_min: 40.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 40.0 }
    ],
    spindle: { max_rpm: 15000, power_kw: 37.3, torque_nm: 200.0, taper: "HSK-A100" },
    tool_changer: { type: "chain", capacity: 90, change_time_sec: 3.0 },
  },
  {
    brand: "Mikron",
    model: "HEM 500U",
    type: "5axis",
    controller: "Heidenhain HEIDENHAIN TNC 640",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 50.0 },
      { name: "Y", travel_mm: 48.0, rapid_m_min: 50.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 50.0 }
    ],
    spindle: { max_rpm: 20000, power_kw: 26.1, torque_nm: 119.0, taper: "HSK-A63" },
    tool_changer: { type: "carousel", capacity: 48, change_time_sec: 4.0 },
  },
  {
    brand: "Mikron",
    model: "HSM 500",
    type: "VMC",
    controller: "Heidenhain HEIDENHAIN TNC 640",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 40.0 },
      { name: "Y", travel_mm: 30.0, rapid_m_min: 40.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 40.0 }
    ],
    spindle: { max_rpm: 42000, power_kw: 18.6, torque_nm: 21.0, taper: "HSK-E50" },
    tool_changer: { type: "arm", capacity: 30, change_time_sec: 2.5 },
  },
  {
    brand: "Mikron",
    model: "HSM 600U",
    type: "5axis",
    controller: "Heidenhain HEIDENHAIN TNC 640",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 40.0 },
      { name: "Y", travel_mm: 36.0, rapid_m_min: 40.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 40.0 }
    ],
    spindle: { max_rpm: 42000, power_kw: 18.6, torque_nm: 21.0, taper: "HSK-E50" },
    tool_changer: { type: "carousel", capacity: 36, change_time_sec: 4.0 },
  },
  {
    brand: "OKK",
    model: "VM43R",
    type: "VMC",
    controller: "Fanuc FANUC 31i-B",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 40.0 },
      { name: "Y", travel_mm: 24.0, rapid_m_min: 40.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 40.0 }
    ],
    spindle: { max_rpm: 15000, power_kw: 16.4, torque_nm: 95.0, taper: "BBT40" },
    tool_changer: { type: "arm", capacity: 24, change_time_sec: 2.5 },
  },
  {
    brand: "OKK",
    model: "VM53R",
    type: "VMC",
    controller: "Fanuc FANUC 31i-B",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 30.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 12000, power_kw: 19.4, torque_nm: 130.0, taper: "BBT40" },
    tool_changer: { type: "arm", capacity: 30, change_time_sec: 2.5 },
  },
  {
    brand: "OKK",
    model: "VM76R",
    type: "VMC",
    controller: "Fanuc FANUC 31i-B",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "Y", travel_mm: 40.0, rapid_m_min: 30.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 8000, power_kw: 26.1, torque_nm: 280.0, taper: "BBT50" },
    tool_changer: { type: "carousel", capacity: 40, change_time_sec: 4.0 },
  },
  {
    brand: "OKK",
    model: "HM500S",
    type: "HMC",
    controller: "Fanuc FANUC 31i-B",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 50.0 },
      { name: "Y", travel_mm: 60.0, rapid_m_min: 50.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 50.0 }
    ],
    spindle: { max_rpm: 12000, power_kw: 22.4, torque_nm: 160.0, taper: "BBT50" },
    tool_changer: { type: "carousel", capacity: 60, change_time_sec: 4.0 },
  },
  {
    brand: "OKK",
    model: "HM800S",
    type: "HMC",
    controller: "Fanuc FANUC 31i-B",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 40.0 },
      { name: "Y", travel_mm: 90.0, rapid_m_min: 40.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 40.0 }
    ],
    spindle: { max_rpm: 8000, power_kw: 37.3, torque_nm: 420.0, taper: "BBT50" },
    tool_changer: { type: "chain", capacity: 90, change_time_sec: 3.0 },
  },
  {
    brand: "OKK",
    model: "VP400",
    type: "5axis",
    controller: "Fanuc FANUC 31i-B5",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 50.0 },
      { name: "Y", travel_mm: 40.0, rapid_m_min: 50.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 50.0 }
    ],
    spindle: { max_rpm: 20000, power_kw: 18.6, torque_nm: 70.0, taper: "HSK-A63" },
    tool_changer: { type: "carousel", capacity: 40, change_time_sec: 4.0 },
  },
  {
    brand: "OKK",
    model: "VP600",
    type: "5axis",
    controller: "Fanuc FANUC 31i-B5",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 45.0 },
      { name: "Y", travel_mm: 60.0, rapid_m_min: 45.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 45.0 }
    ],
    spindle: { max_rpm: 15000, power_kw: 26.1, torque_nm: 150.0, taper: "HSK-A63" },
    tool_changer: { type: "carousel", capacity: 60, change_time_sec: 4.0 },
  },
  {
    brand: "Roku-Roku",
    model: "GENOS M460-VE",
    type: "VMC",
    controller: "Fanuc 31i-B5",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "Y", travel_mm: 16.0, rapid_m_min: 30.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 42000, power_kw: 10.0, torque_nm: 6.4, taper: "HSK-E40" },
    tool_changer: { type: "arm", capacity: 16, change_time_sec: 2.5 },
  },
  {
    brand: "Roku-Roku",
    model: "GENOS M560-VE",
    type: "VMC",
    controller: "Fanuc 31i-B5",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 30.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 36000, power_kw: 15.0, torque_nm: 15.0, taper: "HSK-E50" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Roku-Roku",
    model: "MV-550",
    type: "VMC",
    controller: "Fanuc 31i-B5",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "Y", travel_mm: 24.0, rapid_m_min: 30.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 24000, power_kw: 18.0, torque_nm: 50.0, taper: "BBT40" },
    tool_changer: { type: "arm", capacity: 24, change_time_sec: 2.5 },
  },
  {
    brand: "Roku-Roku",
    model: "MV-850",
    type: "VMC",
    controller: "Fanuc 31i-B5",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "Y", travel_mm: 30.0, rapid_m_min: 30.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 20000, power_kw: 26.0, torque_nm: 120.0, taper: "HSK-A63" },
    tool_changer: { type: "arm", capacity: 30, change_time_sec: 2.5 },
  },
  {
    brand: "Roku-Roku",
    model: "MU-500VA",
    type: "VMC",
    controller: "Fanuc 31i-B5",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "Y", travel_mm: 32.0, rapid_m_min: 30.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 20000, power_kw: 22.0, torque_nm: 100.0, taper: "HSK-A63" },
    tool_changer: { type: "carousel", capacity: 32, change_time_sec: 4.0 },
  },
  {
    brand: "Roku-Roku",
    model: "DC-1612",
    type: "VMC",
    controller: "Fanuc 31i-B5",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "Y", travel_mm: 40.0, rapid_m_min: 30.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 15000, power_kw: 30.0, torque_nm: 800.0, taper: "HSK-A63" },
    tool_changer: { type: "carousel", capacity: 40, change_time_sec: 4.0 },
  },
  {
    brand: "Roku-Roku",
    model: "G-300",
    type: "VMC",
    controller: "Fanuc 31i-B5",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "Y", travel_mm: 12.0, rapid_m_min: 30.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 50000, power_kw: 6.0, torque_nm: 3.5, taper: "HSK-E32" },
    tool_changer: { type: "side_mount", capacity: 12, change_time_sec: 3.0 },
  },
  {
    brand: "Roku-Roku",
    model: "MA-500",
    type: "VMC",
    controller: "Fanuc 31i-B5",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "Y", travel_mm: 24.0, rapid_m_min: 30.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 30000, power_kw: 12.0, torque_nm: 15.0, taper: "HSK-E50" },
    tool_changer: { type: "arm", capacity: 24, change_time_sec: 2.5 },
  },
  {
    brand: "Sodick",
    model: "OPM250L",
    type: "VMC",
    controller: "Sodick Sodick LN Professional",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 60.0 },
      { name: "Y", travel_mm: 16.0, rapid_m_min: 60.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 60.0 }
    ],
    spindle: { max_rpm: 45000, power_kw: 2.8, torque_nm: 5.5, taper: "HSK-E25" },
    tool_changer: { type: "arm", capacity: 16, change_time_sec: 2.5 },
  },
  {
    brand: "Sodick",
    model: "OPM350L",
    type: "VMC",
    controller: "Sodick Sodick LN Professional",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 50.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 50.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 50.0 }
    ],
    spindle: { max_rpm: 45000, power_kw: 3.7, torque_nm: 7.0, taper: "HSK-E32" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Sodick",
    model: "HS430L",
    type: "VMC",
    controller: "Sodick Sodick LN Professional",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 60.0 },
      { name: "Y", travel_mm: 21.0, rapid_m_min: 60.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 60.0 }
    ],
    spindle: { max_rpm: 40000, power_kw: 11.2, torque_nm: 15.0, taper: "HSK-E40" },
    tool_changer: { type: "arm", capacity: 21, change_time_sec: 2.5 },
  },
  {
    brand: "Sodick",
    model: "HS650L",
    type: "VMC",
    controller: "Sodick Sodick LN Professional",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 50.0 },
      { name: "Y", travel_mm: 30.0, rapid_m_min: 50.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 50.0 }
    ],
    spindle: { max_rpm: 30000, power_kw: 16.4, torque_nm: 30.0, taper: "HSK-A63" },
    tool_changer: { type: "arm", capacity: 30, change_time_sec: 2.5 },
  },
  {
    brand: "Sodick",
    model: "UH450L",
    type: "VMC",
    controller: "Sodick Sodick LN Professional",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 80.0 },
      { name: "Y", travel_mm: 16.0, rapid_m_min: 80.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 80.0 }
    ],
    spindle: { max_rpm: 60000, power_kw: 5.6, torque_nm: 3.5, taper: "HSK-E25" },
    tool_changer: { type: "arm", capacity: 16, change_time_sec: 2.5 },
  },
  {
    brand: "Soraluce",
    model: "TA-35",
    type: "VMC",
    controller: "Heidenhain Heidenhain TNC 640",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "Y", travel_mm: 60.0, rapid_m_min: 30.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 6000, power_kw: 12.0, torque_nm: 19.1, taper: "HSK-A100" },
    tool_changer: { type: "carousel", capacity: 60, change_time_sec: 4.0 },
  },
  {
    brand: "Soraluce",
    model: "TA-40",
    type: "VMC",
    controller: "Heidenhain Heidenhain TNC 640",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "Y", travel_mm: 60.0, rapid_m_min: 30.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 5000, power_kw: 10.0, torque_nm: 19.1, taper: "HSK-A100" },
    tool_changer: { type: "carousel", capacity: 60, change_time_sec: 4.0 },
  },
  {
    brand: "Soraluce",
    model: "TA-A35",
    type: "VMC",
    controller: "Heidenhain Heidenhain TNC 640",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "Y", travel_mm: 60.0, rapid_m_min: 30.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 6000, power_kw: 12.0, torque_nm: 19.1, taper: "HSK-A100" },
    tool_changer: { type: "carousel", capacity: 60, change_time_sec: 4.0 },
  },
  {
    brand: "Soraluce",
    model: "FMW-14000",
    type: "VMC",
    controller: "Heidenhain Heidenhain TNC 640",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "Y", travel_mm: 60.0, rapid_m_min: 30.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 6000, power_kw: 12.0, torque_nm: 19.1, taper: "HSK-A100" },
    tool_changer: { type: "carousel", capacity: 60, change_time_sec: 4.0 },
  },
  {
    brand: "Soraluce",
    model: "FR-22000",
    type: "VMC",
    controller: "Heidenhain Heidenhain TNC 640",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "Y", travel_mm: 80.0, rapid_m_min: 30.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 5000, power_kw: 10.0, torque_nm: 19.1, taper: "HSK-A100" },
    tool_changer: { type: "chain", capacity: 80, change_time_sec: 3.0 },
  },
  {
    brand: "Soraluce",
    model: "SP-18000",
    type: "VMC",
    controller: "Heidenhain Heidenhain TNC 640",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "Y", travel_mm: 100.0, rapid_m_min: 30.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 5000, power_kw: 5.0, torque_nm: 9.5, taper: "HSK-A125" },
    tool_changer: { type: "chain", capacity: 100, change_time_sec: 3.0 },
  },
  {
    brand: "Soraluce",
    model: "PMG-8000",
    type: "VMC",
    controller: "Heidenhain Heidenhain TNC 640",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "Y", travel_mm: 100.0, rapid_m_min: 30.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 6000, power_kw: 12.0, torque_nm: 19.1, taper: "HSK-A100" },
    tool_changer: { type: "chain", capacity: 100, change_time_sec: 3.0 },
  },
  {
    brand: "Spinner",
    model: "VC 560",
    type: "VMC",
    controller: "Siemens Siemens 840D sl",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 40.0 },
      { name: "Y", travel_mm: 24.0, rapid_m_min: 40.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 40.0 }
    ],
    spindle: { max_rpm: 15000, power_kw: 16.4, torque_nm: 90.0, taper: "HSK-A63" },
    tool_changer: { type: "arm", capacity: 24, change_time_sec: 2.5 },
  },
  {
    brand: "Spinner",
    model: "VC 850",
    type: "VMC",
    controller: "Siemens Siemens 840D sl",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 32.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 12000, power_kw: 20.9, torque_nm: 140.0, taper: "HSK-A63" },
    tool_changer: { type: "carousel", capacity: 32, change_time_sec: 4.0 },
  },
  {
    brand: "Spinner",
    model: "VC 1200",
    type: "VMC",
    controller: "Siemens Siemens 840D sl",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "Y", travel_mm: 40.0, rapid_m_min: 30.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 26.1, torque_nm: 200.0, taper: "HSK-A100" },
    tool_changer: { type: "carousel", capacity: 40, change_time_sec: 4.0 },
  },
  {
    brand: "Spinner",
    model: "U 620",
    type: "5axis",
    controller: "Siemens Siemens 840D sl",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 40.0 },
      { name: "Y", travel_mm: 40.0, rapid_m_min: 40.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 40.0 }
    ],
    spindle: { max_rpm: 18000, power_kw: 18.6, torque_nm: 85.0, taper: "HSK-A63" },
    tool_changer: { type: "carousel", capacity: 40, change_time_sec: 4.0 },
  },
  {
    brand: "Spinner",
    model: "U 1520",
    type: "5axis",
    controller: "Siemens Siemens 840D sl",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 35.0 },
      { name: "Y", travel_mm: 80.0, rapid_m_min: 35.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 35.0 }
    ],
    spindle: { max_rpm: 12000, power_kw: 29.8, torque_nm: 200.0, taper: "HSK-A100" },
    tool_changer: { type: "chain", capacity: 80, change_time_sec: 3.0 },
  },
  {
    brand: "Spinner",
    model: "TTS 300",
    type: "lathe",
    controller: "Siemens Siemens 840D sl",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 6000, power_kw: 13.4, torque_nm: 180.0, taper: "BT40" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Spinner",
    model: "TC 600-65 SMCY",
    type: "lathe",
    controller: "Siemens Siemens 840D sl",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 7.3, torque_nm: 7.0, taper: "BT40" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Takumi",
    model: "H10",
    type: "VMC",
    controller: "Fanuc 31i-B5",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "Y", travel_mm: 16.0, rapid_m_min: 30.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 40000, power_kw: 12.0, torque_nm: 9.5, taper: "HSK-E40" },
    tool_changer: { type: "arm", capacity: 16, change_time_sec: 2.5 },
  },
  {
    brand: "Takumi",
    model: "H13",
    type: "VMC",
    controller: "Fanuc 31i-B5",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "Y", travel_mm: 24.0, rapid_m_min: 30.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 30000, power_kw: 18.0, torque_nm: 25.0, taper: "HSK-E50" },
    tool_changer: { type: "arm", capacity: 24, change_time_sec: 2.5 },
  },
  {
    brand: "Takumi",
    model: "V11A",
    type: "VMC",
    controller: "Fanuc 31i-B5",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "Y", travel_mm: 24.0, rapid_m_min: 30.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 20000, power_kw: 15.0, torque_nm: 80.0, taper: "BBT40" },
    tool_changer: { type: "arm", capacity: 24, change_time_sec: 2.5 },
  },
  {
    brand: "Takumi",
    model: "V15",
    type: "VMC",
    controller: "Fanuc 31i-B5",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "Y", travel_mm: 30.0, rapid_m_min: 30.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 15000, power_kw: 22.0, torque_nm: 140.0, taper: "BBT40" },
    tool_changer: { type: "arm", capacity: 30, change_time_sec: 2.5 },
  },
  {
    brand: "Takumi",
    model: "U600",
    type: "VMC",
    controller: "Fanuc 31i-B5",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "Y", travel_mm: 32.0, rapid_m_min: 30.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 20000, power_kw: 25.0, torque_nm: 120.0, taper: "HSK-A63" },
    tool_changer: { type: "carousel", capacity: 32, change_time_sec: 4.0 },
  },
  {
    brand: "Takumi",
    model: "DP-1612",
    type: "VMC",
    controller: "Fanuc 31i-B5",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "Y", travel_mm: 32.0, rapid_m_min: 30.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 8000, power_kw: 30.0, torque_nm: 800.0, taper: "BT50" },
    tool_changer: { type: "carousel", capacity: 32, change_time_sec: 4.0 },
  },
  {
    brand: "Takumi",
    model: "S500",
    type: "VMC",
    controller: "Fanuc 0i-MF Plus",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "Y", travel_mm: 21.0, rapid_m_min: 30.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 20000, power_kw: 7.5, torque_nm: 15.0, taper: "BT30" },
    tool_changer: { type: "arm", capacity: 21, change_time_sec: 2.5 },
  },
  {
    brand: "Takumi",
    model: "UM-400",
    type: "VMC",
    controller: "Fanuc 31i-B5",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "Y", travel_mm: 12.0, rapid_m_min: 30.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 60000, power_kw: 8.0, torque_nm: 2.5, taper: "HSK-E32" },
    tool_changer: { type: "side_mount", capacity: 12, change_time_sec: 3.0 },
  },
  {
    brand: "Toyoda",
    model: "FH400J",
    type: "HMC",
    controller: "Fanuc FANUC 31i-B / TOYOPUC",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 60.0 },
      { name: "Y", travel_mm: 60.0, rapid_m_min: 60.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 60.0 }
    ],
    spindle: { max_rpm: 15000, power_kw: 22.4, torque_nm: 119.0, taper: "BBT40" },
    tool_changer: { type: "carousel", capacity: 60, change_time_sec: 4.0 },
  },
  {
    brand: "Toyoda",
    model: "FH550J",
    type: "HMC",
    controller: "Fanuc FANUC 31i-B / TOYOPUC",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 50.0 },
      { name: "Y", travel_mm: 90.0, rapid_m_min: 50.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 50.0 }
    ],
    spindle: { max_rpm: 14000, power_kw: 29.8, torque_nm: 178.0, taper: "BBT50" },
    tool_changer: { type: "chain", capacity: 90, change_time_sec: 3.0 },
  },
  {
    brand: "Toyoda",
    model: "FH800SXJ",
    type: "HMC",
    controller: "Fanuc FANUC 31i-B",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 40.0 },
      { name: "Y", travel_mm: 120.0, rapid_m_min: 40.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 40.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 44.7, torque_nm: 420.0, taper: "BBT50" },
    tool_changer: { type: "chain", capacity: 120, change_time_sec: 3.0 },
  },
  {
    brand: "Toyoda",
    model: "FV1265",
    type: "VMC",
    controller: "Fanuc FANUC 0i-MF Plus",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 30.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 12000, power_kw: 18.6, torque_nm: 119.0, taper: "BBT40" },
    tool_changer: { type: "arm", capacity: 30, change_time_sec: 2.5 },
  },
  {
    brand: "Toyoda",
    model: "FV1680",
    type: "VMC",
    controller: "Fanuc FANUC 31i-B",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "Y", travel_mm: 40.0, rapid_m_min: 30.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 26.1, torque_nm: 200.0, taper: "BBT50" },
    tool_changer: { type: "carousel", capacity: 40, change_time_sec: 4.0 },
  },
  {
    brand: "Toyoda",
    model: "FA450V",
    type: "5axis",
    controller: "Fanuc FANUC 31i-B5",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 50.0 },
      { name: "Y", travel_mm: 60.0, rapid_m_min: 50.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 50.0 }
    ],
    spindle: { max_rpm: 12000, power_kw: 22.4, torque_nm: 143.0, taper: "BBT40" },
    tool_changer: { type: "carousel", capacity: 60, change_time_sec: 4.0 },
  },
  {
    brand: "Toyoda",
    model: "FA630V",
    type: "5axis",
    controller: "Fanuc FANUC 31i-B5",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 45.0 },
      { name: "Y", travel_mm: 90.0, rapid_m_min: 45.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 45.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 29.8, torque_nm: 220.0, taper: "BBT50" },
    tool_changer: { type: "chain", capacity: 90, change_time_sec: 3.0 },
  },
  {
    brand: "Yasda",
    model: "YBM 640V3",
    type: "VMC",
    controller: "Fanuc FANUC 31i-B5",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "Y", travel_mm: 24.0, rapid_m_min: 30.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 20000, power_kw: 11.2, torque_nm: 40.0, taper: "HSK-A63" },
    tool_changer: { type: "arm", capacity: 24, change_time_sec: 2.5 },
  },
  {
    brand: "Yasda",
    model: "YBM 950V3",
    type: "VMC",
    controller: "Fanuc FANUC 31i-B5",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 24.0 },
      { name: "Y", travel_mm: 30.0, rapid_m_min: 24.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 24.0 }
    ],
    spindle: { max_rpm: 15000, power_kw: 16.4, torque_nm: 80.0, taper: "HSK-A63" },
    tool_changer: { type: "arm", capacity: 30, change_time_sec: 2.5 },
  },
  {
    brand: "Yasda",
    model: "YMC 430",
    type: "5axis",
    controller: "Fanuc FANUC 31i-B5",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 30.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 30000, power_kw: 13.4, torque_nm: 28.0, taper: "HSK-E40" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Yasda",
    model: "YMC 650",
    type: "5axis",
    controller: "Fanuc FANUC 31i-B5",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 24.0 },
      { name: "Y", travel_mm: 40.0, rapid_m_min: 24.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 24.0 }
    ],
    spindle: { max_rpm: 24000, power_kw: 18.6, torque_nm: 55.0, taper: "HSK-A63" },
    tool_changer: { type: "carousel", capacity: 40, change_time_sec: 4.0 },
  },
  {
    brand: "Yasda",
    model: "H40i",
    type: "VMC",
    controller: "Fanuc FANUC 31i-B5",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 20.0 },
      { name: "Y", travel_mm: 16.0, rapid_m_min: 20.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 20.0 }
    ],
    spindle: { max_rpm: 40000, power_kw: 6.0, torque_nm: 8.0, taper: "HSK-E25" },
    tool_changer: { type: "arm", capacity: 16, change_time_sec: 2.5 },
  },
  {
    brand: "AWEA",
    model: "AWEA AF-1250",
    type: "VMC",
    controller: "Fanuc Fanuc 0i-MF",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 30.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 8000, power_kw: 22.0, torque_nm: 350.0, taper: "CAT50" },
    tool_changer: { type: "arm", capacity: 30, change_time_sec: 2.5 },
  },
  {
    brand: "AWEA",
    model: "AWEA AF-1600",
    type: "VMC",
    controller: "Fanuc Fanuc 0i-MF",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 30.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 8000, power_kw: 30.0, torque_nm: 430.0, taper: "CAT50" },
    tool_changer: { type: "arm", capacity: 30, change_time_sec: 2.5 },
  },
  {
    brand: "AWEA",
    model: "AWEA BM-1200",
    type: "bridge",
    controller: "Fanuc Fanuc 0i-MF",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 24.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 8000, power_kw: 22.0, torque_nm: 350.0, taper: "CAT50" },
    tool_changer: { type: "arm", capacity: 24, change_time_sec: 2.5 },
  },
  {
    brand: "AWEA",
    model: "AWEA BM-1600",
    type: "bridge",
    controller: "Fanuc Fanuc 0i-MF",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 30.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 6000, power_kw: 30.0, torque_nm: 430.0, taper: "CAT50" },
    tool_changer: { type: "arm", capacity: 30, change_time_sec: 2.5 },
  },
  {
    brand: "AWEA",
    model: "AWEA LP-4025",
    type: "bridge",
    controller: "Fanuc Fanuc 31i-B",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 40.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 6000, power_kw: 37.0, torque_nm: 700.0, taper: "CAT50" },
    tool_changer: { type: "carousel", capacity: 40, change_time_sec: 4.0 },
  },
  {
    brand: "AWEA",
    model: "AWEA VP-2012",
    type: "5axis",
    controller: "Fanuc Fanuc 31i-B5",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 30.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 30.0, torque_nm: 200.0, taper: "HSK-A63" },
    tool_changer: { type: "arm", capacity: 30, change_time_sec: 2.5 },
  },
  {
    brand: "Brother",
    model: "Brother SPEEDIO F600X1",
    type: "VMC",
    controller: "Brother Brother CNC-C00",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 15.0, torque_nm: 100.0, taper: "CAT40" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Brother",
    model: "Brother SPEEDIO H550Xd1",
    type: "HMC",
    controller: "Brother Brother CNC-C00",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 50.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 50.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 50.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 15.0, torque_nm: 100.0, taper: "CAT40" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Brother",
    model: "Brother SPEEDIO M140X1",
    type: "VMC",
    controller: "Brother Brother CNC-C00",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 15.0, torque_nm: 100.0, taper: "CAT40" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Brother",
    model: "Brother SPEEDIO M200Xd1",
    type: "VMC",
    controller: "Brother Brother CNC-C00",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 15.0, torque_nm: 100.0, taper: "CAT40" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Brother",
    model: "Brother SPEEDIO M300X3",
    type: "VMC",
    controller: "Brother Brother CNC-C00",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 15.0, torque_nm: 100.0, taper: "CAT40" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Brother",
    model: "Brother SPEEDIO M300Xd1",
    type: "VMC",
    controller: "Brother Brother CNC-C00",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 15.0, torque_nm: 100.0, taper: "CAT40" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Brother",
    model: "Brother SPEEDIO R450Xd1",
    type: "VMC",
    controller: "Brother Brother CNC-C00",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 15.0, torque_nm: 100.0, taper: "CAT40" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Brother",
    model: "Brother SPEEDIO R650Xd1",
    type: "VMC",
    controller: "Brother Brother CNC-C00",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 15.0, torque_nm: 100.0, taper: "CAT40" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Brother",
    model: "Brother SPEEDIO S300Xd1",
    type: "VMC",
    controller: "Brother Brother CNC-C00",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 15.0, torque_nm: 100.0, taper: "CAT40" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Brother",
    model: "Brother SPEEDIO S300Xd2",
    type: "VMC",
    controller: "Brother Brother CNC-C00",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 15.0, torque_nm: 100.0, taper: "CAT40" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Brother",
    model: "Brother SPEEDIO S500Xd1",
    type: "VMC",
    controller: "Brother Brother CNC-C00",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 15.0, torque_nm: 100.0, taper: "CAT40" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Brother",
    model: "Brother SPEEDIO S500Xd2",
    type: "VMC",
    controller: "Brother Brother CNC-C00",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 15.0, torque_nm: 100.0, taper: "CAT40" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Brother",
    model: "Brother SPEEDIO S700Xd1",
    type: "VMC",
    controller: "Brother Brother CNC-C00",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 15.0, torque_nm: 100.0, taper: "CAT40" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Brother",
    model: "Brother SPEEDIO S700Xd2",
    type: "VMC",
    controller: "Brother Brother CNC-C00",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 15.0, torque_nm: 100.0, taper: "CAT40" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Brother",
    model: "Brother SPEEDIO U500Xd1",
    type: "VMC",
    controller: "Brother Brother CNC-C00",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 15.0, torque_nm: 100.0, taper: "CAT40" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Brother",
    model: "Brother SPEEDIO U500Xd2",
    type: "VMC",
    controller: "Brother Brother CNC-C00",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 15.0, torque_nm: 100.0, taper: "CAT40" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Brother",
    model: "Brother SPEEDIO W1000Xd1",
    type: "VMC",
    controller: "Brother Brother CNC-C00",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 15.0, torque_nm: 100.0, taper: "CAT40" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Brother",
    model: "Brother SPEEDIO W1000Xd2",
    type: "VMC",
    controller: "Brother Brother CNC-C00",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 15.0, torque_nm: 100.0, taper: "CAT40" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Chiron",
    model: "Chiron FZ 08 S MILL",
    type: "VMC",
    controller: "Siemens Siemens SINUMERIK 840D sl",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 12.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 40000, power_kw: 8.0, torque_nm: 3.5, taper: "HSK-E32" },
    tool_changer: { type: "side_mount", capacity: 12, change_time_sec: 3.0 },
  },
  {
    brand: "Chiron",
    model: "Chiron FZ 12 FX",
    type: "5axis",
    controller: "Siemens Siemens SINUMERIK 840D sl",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 24.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 20000, power_kw: 29.0, torque_nm: 87.0, taper: "HSK-A63" },
    tool_changer: { type: "arm", capacity: 24, change_time_sec: 2.5 },
  },
  {
    brand: "Chiron",
    model: "Chiron FZ 15 FX",
    type: "5axis",
    controller: "Siemens Siemens SINUMERIK 840D sl",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 30.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 18000, power_kw: 29.0, torque_nm: 100.0, taper: "HSK-A63" },
    tool_changer: { type: "arm", capacity: 30, change_time_sec: 2.5 },
  },
  {
    brand: "Chiron",
    model: "Chiron MILL 2000",
    type: "VMC",
    controller: "Siemens Siemens SINUMERIK 840D sl",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 40.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 12000, power_kw: 35.0, torque_nm: 200.0, taper: "HSK-A63" },
    tool_changer: { type: "carousel", capacity: 40, change_time_sec: 4.0 },
  },
  {
    brand: "Chiron",
    model: "Chiron DZ 16 FX",
    type: "5axis",
    controller: "Siemens Siemens SINUMERIK 840D sl",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 24.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 20000, power_kw: 29.0, torque_nm: 87.0, taper: "HSK-A63" },
    tool_changer: { type: "arm", capacity: 24, change_time_sec: 2.5 },
  },
  {
    brand: "Chiron",
    model: "Chiron DZ 22 W",
    type: "VMC",
    controller: "Siemens Siemens SINUMERIK 840D sl",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 36.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 15000, power_kw: 29.0, torque_nm: 100.0, taper: "HSK-A63" },
    tool_changer: { type: "carousel", capacity: 36, change_time_sec: 4.0 },
  },
  {
    brand: "Chiron",
    model: "Chiron FZ 16 S five axis",
    type: "5axis",
    controller: "Siemens Siemens SINUMERIK 840D sl",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 30.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 15000, power_kw: 35.0, torque_nm: 130.0, taper: "HSK-A63" },
    tool_changer: { type: "arm", capacity: 30, change_time_sec: 2.5 },
  },
  {
    brand: "Chiron",
    model: "Chiron FZ 08 S",
    type: "VMC",
    controller: "Siemens Siemens SINUMERIK 840D sl",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 12.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 40000, power_kw: 8.0, torque_nm: 3.0, taper: "HSK-E32" },
    tool_changer: { type: "side_mount", capacity: 12, change_time_sec: 3.0 },
  },
  {
    brand: "Chiron",
    model: "Chiron FZ 12 S FX",
    type: "5axis",
    controller: "Siemens Siemens SINUMERIK 840D sl",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 24.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 20000, power_kw: 22.0, torque_nm: 87.0, taper: "HSK-A63" },
    tool_changer: { type: "arm", capacity: 24, change_time_sec: 2.5 },
  },
  {
    brand: "Chiron",
    model: "Chiron FZ 15 S FX",
    type: "5axis",
    controller: "Siemens Siemens SINUMERIK 840D sl",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 30.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 15000, power_kw: 30.0, torque_nm: 130.0, taper: "HSK-A63" },
    tool_changer: { type: "arm", capacity: 30, change_time_sec: 2.5 },
  },
  {
    brand: "Chiron",
    model: "Chiron DZ 12 S FX",
    type: "5axis",
    controller: "Siemens Siemens SINUMERIK 840D sl",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 24.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 20000, power_kw: 22.0, torque_nm: 87.0, taper: "HSK-A63" },
    tool_changer: { type: "arm", capacity: 24, change_time_sec: 2.5 },
  },
  {
    brand: "Chiron",
    model: "Chiron DZ 16 W",
    type: "VMC",
    controller: "Siemens Siemens SINUMERIK 840D sl",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 30.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 15000, power_kw: 30.0, torque_nm: 130.0, taper: "HSK-A63" },
    tool_changer: { type: "arm", capacity: 30, change_time_sec: 2.5 },
  },
  {
    brand: "Citizen",
    model: "Citizen Cincom L12-X",
    type: "swiss",
    controller: "Mitsubishi Citizen Cincom M70",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 15000, power_kw: 1.5, torque_nm: 1.5, taper: "collet_12mm" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Citizen",
    model: "Citizen Cincom M16-V",
    type: "swiss",
    controller: "Mitsubishi Citizen Cincom M70",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 12000, power_kw: 2.2, torque_nm: 3.5, taper: "collet_16mm" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Citizen",
    model: "Citizen Cincom K16-VII",
    type: "swiss",
    controller: "Mitsubishi Citizen Cincom M70",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 12000, power_kw: 2.2, torque_nm: 3.0, taper: "collet_16mm" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Citizen",
    model: "Citizen Miyano BNE-51MSY",
    type: "lathe",
    controller: "Mitsubishi Mitsubishi M80",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 5000, power_kw: 11.0, torque_nm: 55.0, taper: "collet_51mm" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Citizen",
    model: "Citizen Miyano BNA-42S",
    type: "lathe",
    controller: "Mitsubishi Mitsubishi M80",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 6000, power_kw: 7.5, torque_nm: 40.0, taper: "collet_42mm" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Citizen",
    model: "Citizen Cincom L12-VII",
    type: "swiss",
    controller: "Mitsubishi Citizen Cincom M70",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 12000, power_kw: 2.2, torque_nm: 3.5, taper: "collet_12mm" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Citizen",
    model: "Citizen Cincom L20-E",
    type: "swiss",
    controller: "Mitsubishi Citizen Cincom M70",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 3.7, torque_nm: 6.0, taper: "collet_20mm" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Citizen",
    model: "Citizen Cincom R07-VI",
    type: "swiss",
    controller: "Mitsubishi Citizen Cincom M70",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 15000, power_kw: 1.5, torque_nm: 1.5, taper: "collet_7mm" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Citizen",
    model: "Citizen Cincom L20-XII",
    type: "swiss",
    controller: "Mitsubishi Citizen Cincom M70",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 3.7, torque_nm: 6.0, taper: "collet_20mm" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Citizen",
    model: "Citizen Cincom L32-XII",
    type: "swiss",
    controller: "Mitsubishi Citizen Cincom M70",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 8000, power_kw: 5.5, torque_nm: 11.7, taper: "collet_32mm" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Citizen",
    model: "Citizen Cincom D25-VIII",
    type: "swiss",
    controller: "Mitsubishi Citizen Cincom M70",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 3.7, torque_nm: 6.0, taper: "collet_25mm" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Citizen",
    model: "Citizen Cincom A20-VII",
    type: "swiss",
    controller: "Mitsubishi Citizen Cincom M70",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 12000, power_kw: 2.2, torque_nm: 3.5, taper: "collet_20mm" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Citizen",
    model: "Citizen Miyano BNA-42MSY",
    type: "lathe",
    controller: "Mitsubishi Citizen Mitsubishi M70V",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 6000, power_kw: 11.0, torque_nm: 62.0, taper: "collet_42mm" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "DATRON",
    model: "DATRON M8Cube 3 axis",
    type: "5axis",
    controller: "DATRON Datron Datron next",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 10.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 3.0, torque_nm: 0.48, taper: "CAT40" },
    tool_changer: { type: "side_mount", capacity: 10, change_time_sec: 3.0 },
  },
  {
    brand: "DATRON",
    model: "DATRON M8Cube 4 axis",
    type: "5axis",
    controller: "DATRON Datron Datron next",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 10.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 3.0, torque_nm: 0.48, taper: "CAT40" },
    tool_changer: { type: "side_mount", capacity: 10, change_time_sec: 3.0 },
  },
  {
    brand: "DATRON",
    model: "DATRON M8Cube 5 axis",
    type: "5axis",
    controller: "DATRON Datron Datron next",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 10.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 3.0, torque_nm: 0.48, taper: "CAT40" },
    tool_changer: { type: "side_mount", capacity: 10, change_time_sec: 3.0 },
  },
  {
    brand: "DATRON",
    model: "DATRON neo",
    type: "5axis",
    controller: "DATRON Datron Datron next",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 6.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 2.0, torque_nm: 0.32, taper: "CAT40" },
    tool_changer: { type: "side_mount", capacity: 6, change_time_sec: 3.0 },
  },
  {
    brand: "DATRON",
    model: "DATRON neo 4 axis",
    type: "5axis",
    controller: "DATRON Datron Datron next",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 15.0, torque_nm: 100.0, taper: "CAT40" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "DMG MORI",
    model: "DMU 50 3rd Generation",
    type: "VMC",
    controller: "Siemens",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 30.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 15000, power_kw: 25.0, torque_nm: 130.0, taper: "BT40" },
    tool_changer: { type: "arm", capacity: 30, change_time_sec: 2.5 },
  },
  {
    brand: "DMG MORI",
    model: "NLX 2500/700",
    type: "lathe",
    controller: "Siemens",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 24.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 24.0 }
    ],
    spindle: { max_rpm: 3500, power_kw: 18.5, torque_nm: 764.0, taper: "BT40" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "DMG MORI",
    model: "CTV 250",
    type: "lathe",
    controller: "Siemens",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 24.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 24.0 }
    ],
    spindle: { max_rpm: 5000, power_kw: 18.5, torque_nm: 95.0, taper: "BT40" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "DMG MORI",
    model: "DMG MORI DMU 60 duoBLOCK",
    type: "5axis",
    controller: "Siemens Siemens SINUMERIK 840D sl",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 60.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 18000, power_kw: 35.0, torque_nm: 130.0, taper: "HSK-A63" },
    tool_changer: { type: "carousel", capacity: 60, change_time_sec: 4.0 },
  },
  {
    brand: "DMG MORI",
    model: "DMG MORI DMU 80 duoBLOCK",
    type: "5axis",
    controller: "Siemens Siemens SINUMERIK 840D sl",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 80.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 15000, power_kw: 44.0, torque_nm: 200.0, taper: "HSK-A63" },
    tool_changer: { type: "chain", capacity: 80, change_time_sec: 3.0 },
  },
  {
    brand: "DMG MORI",
    model: "DMG MORI DMU 100 duoBLOCK",
    type: "5axis",
    controller: "Siemens Siemens SINUMERIK 840D sl",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 120.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 12000, power_kw: 52.0, torque_nm: 430.0, taper: "HSK-A100" },
    tool_changer: { type: "chain", capacity: 120, change_time_sec: 3.0 },
  },
  {
    brand: "DMG MORI",
    model: "DMG MORI DMU 160 duoBLOCK",
    type: "5axis",
    controller: "Siemens Siemens SINUMERIK 840D sl",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 120.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 52.0, torque_nm: 700.0, taper: "HSK-A100" },
    tool_changer: { type: "chain", capacity: 120, change_time_sec: 3.0 },
  },
  {
    brand: "DMG MORI",
    model: "DMG MORI DMU 200 duoBLOCK",
    type: "5axis",
    controller: "Siemens Siemens SINUMERIK 840D sl",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 180.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 8000, power_kw: 60.0, torque_nm: 900.0, taper: "HSK-A100" },
    tool_changer: { type: "chain", capacity: 180, change_time_sec: 3.0 },
  },
  {
    brand: "DMG MORI",
    model: "DMG MORI CTX gamma 1250 TC",
    type: "mill_turn",
    controller: "Siemens Siemens SINUMERIK 840D sl",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 3500, power_kw: 33.0, torque_nm: 550.0, taper: "A2-8" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "DMG MORI",
    model: "DMG MORI CTX gamma 2000 TC",
    type: "mill_turn",
    controller: "Siemens Siemens SINUMERIK 840D sl",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 3000, power_kw: 44.0, torque_nm: 800.0, taper: "A2-11" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "DMG MORI",
    model: "DMG MORI CTX gamma 3000 TC 2nd Gen",
    type: "mill_turn",
    controller: "Siemens Siemens SINUMERIK 840D sl",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 2500, power_kw: 52.0, torque_nm: 1200.0, taper: "A2-11" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "DMG MORI",
    model: "DMG MORI CLX 350 TC",
    type: "mill_turn",
    controller: "Siemens Siemens SINUMERIK 840D sl",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 5000, power_kw: 16.0, torque_nm: 115.0, taper: "A2-6" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "DMG MORI",
    model: "DMG MORI CLX 450 TC",
    type: "mill_turn",
    controller: "Siemens Siemens SINUMERIK 840D sl",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 4000, power_kw: 22.0, torque_nm: 290.0, taper: "A2-8" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "DMG MORI",
    model: "DMG MORI CLX 550 TC",
    type: "mill_turn",
    controller: "Siemens Siemens SINUMERIK 840D sl",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 3500, power_kw: 28.0, torque_nm: 430.0, taper: "A2-8" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "DMG MORI",
    model: "DMG MORI SPRINT 20|5",
    type: "swiss",
    controller: "Siemens Siemens SINUMERIK 840D sl",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 4.8, torque_nm: 7.5, taper: "collet_20mm" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "DMG MORI",
    model: "DMG MORI SPRINT 20|8",
    type: "swiss",
    controller: "Siemens Siemens SINUMERIK 840D sl",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 4.8, torque_nm: 7.5, taper: "collet_20mm" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "DMG MORI",
    model: "DMG MORI SPRINT 32|5",
    type: "swiss",
    controller: "Siemens Siemens SINUMERIK 840D sl",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 8000, power_kw: 7.5, torque_nm: 18.0, taper: "collet_32mm" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "DMG MORI",
    model: "DMG MORI SPRINT 32|8",
    type: "swiss",
    controller: "Siemens Siemens SINUMERIK 840D sl",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 8000, power_kw: 7.5, torque_nm: 18.0, taper: "collet_32mm" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "DMG MORI",
    model: "DMG MORI SPRINT 50|3",
    type: "swiss",
    controller: "Siemens Siemens SINUMERIK 840D sl",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 6000, power_kw: 11.0, torque_nm: 40.0, taper: "collet_50mm" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "DMG MORI",
    model: "DMG MORI DMP 35/5",
    type: "5axis",
    controller: "Siemens Siemens SINUMERIK ONE",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 15.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 15000, power_kw: 18.5, torque_nm: 87.0, taper: "HSK-A63" },
    tool_changer: { type: "arm", capacity: 15, change_time_sec: 2.5 },
  },
  {
    brand: "DMG MORI",
    model: "DMG MORI DMP 70",
    type: "VMC",
    controller: "Siemens Siemens SINUMERIK ONE",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 15.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 15.0, torque_nm: 119.0, taper: "BT40" },
    tool_changer: { type: "arm", capacity: 15, change_time_sec: 2.5 },
  },
  {
    brand: "DMG MORI",
    model: "DMG MORI CMX 50 U",
    type: "5axis",
    controller: "Siemens Siemens SINUMERIK ONE",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 30.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 15000, power_kw: 22.0, torque_nm: 120.0, taper: "HSK-A63" },
    tool_changer: { type: "arm", capacity: 30, change_time_sec: 2.5 },
  },
  {
    brand: "DMG MORI",
    model: "DMG MORI CMX 70 U",
    type: "5axis",
    controller: "Siemens Siemens SINUMERIK ONE",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 40.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 15000, power_kw: 25.0, torque_nm: 130.0, taper: "HSK-A63" },
    tool_changer: { type: "carousel", capacity: 40, change_time_sec: 4.0 },
  },
  {
    brand: "DMG MORI",
    model: "DMG MORI DMC 60 H linear",
    type: "HMC",
    controller: "Siemens Siemens SINUMERIK 840D sl",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 60.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 18000, power_kw: 30.0, torque_nm: 130.0, taper: "HSK-A63" },
    tool_changer: { type: "carousel", capacity: 60, change_time_sec: 4.0 },
  },
  {
    brand: "DMG MORI",
    model: "DMG MORI ALX 2500",
    type: "lathe",
    controller: "Fanuc Fanuc 31i-B",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 3500, power_kw: 22.0, torque_nm: 350.0, taper: "A2-8" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "DMG MORI",
    model: "DMG MORI ALX 3000",
    type: "lathe",
    controller: "Fanuc Fanuc 31i-B",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 3000, power_kw: 30.0, torque_nm: 500.0, taper: "A2-11" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "DMG MORI",
    model: "DMG MORI NLX 2000/700",
    type: "lathe",
    controller: "Fanuc Fanuc 31i-B",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 4000, power_kw: 15.0, torque_nm: 180.0, taper: "A2-6" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "DMG MORI",
    model: "DMG MORI NLX 2500/500",
    type: "lathe",
    controller: "Fanuc Fanuc 31i-B",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 3500, power_kw: 22.0, torque_nm: 350.0, taper: "A2-8" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "DMG MORI",
    model: "DMG MORI NLX 2500/1250",
    type: "lathe",
    controller: "Fanuc Fanuc 31i-B",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 3500, power_kw: 22.0, torque_nm: 350.0, taper: "A2-8" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "DMG MORI",
    model: "DMG MORI NLX 3000/700",
    type: "lathe",
    controller: "Fanuc Fanuc 31i-B",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 3000, power_kw: 30.0, torque_nm: 500.0, taper: "A2-11" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "DMG MORI",
    model: "DMG MORI NLX 3000/2000",
    type: "lathe",
    controller: "Fanuc Fanuc 31i-B",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 3000, power_kw: 30.0, torque_nm: 500.0, taper: "A2-11" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "DMG MORI",
    model: "DMG MORI DMC 60 FD duoBLOCK",
    type: "mill_turn",
    controller: "Siemens Siemens SINUMERIK 840D sl",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 60.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 18000, power_kw: 35.0, torque_nm: 130.0, taper: "HSK-A63" },
    tool_changer: { type: "carousel", capacity: 60, change_time_sec: 4.0 },
  },
  {
    brand: "DMG MORI",
    model: "DMG MORI DMC 100 FD duoBLOCK",
    type: "mill_turn",
    controller: "Siemens Siemens SINUMERIK 840D sl",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 120.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 12000, power_kw: 52.0, torque_nm: 430.0, taper: "HSK-A100" },
    tool_changer: { type: "chain", capacity: 120, change_time_sec: 3.0 },
  },
  {
    brand: "DMG MORI",
    model: "DMG MORI DMC 160 FD duoBLOCK",
    type: "mill_turn",
    controller: "Siemens Siemens SINUMERIK 840D sl",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 180.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 60.0, torque_nm: 700.0, taper: "HSK-A100" },
    tool_changer: { type: "chain", capacity: 180, change_time_sec: 3.0 },
  },
  {
    brand: "DMG MORI",
    model: "DMG MORI DMU 210 P 2nd Gen",
    type: "5axis",
    controller: "Siemens Siemens SINUMERIK 840D sl",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 120.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 9000, power_kw: 60.0, torque_nm: 900.0, taper: "HSK-A100" },
    tool_changer: { type: "chain", capacity: 120, change_time_sec: 3.0 },
  },
  {
    brand: "DMG MORI",
    model: "DMG MORI DMU 340 Gantry",
    type: "5axis",
    controller: "Siemens Siemens SINUMERIK 840D sl",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 180.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 8000, power_kw: 60.0, torque_nm: 900.0, taper: "HSK-A100" },
    tool_changer: { type: "chain", capacity: 180, change_time_sec: 3.0 },
  },
  {
    brand: "DMG MORI",
    model: "DMG MORI DMU 600 P",
    type: "5axis",
    controller: "Siemens Siemens SINUMERIK 840D sl",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 240.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 6000, power_kw: 80.0, torque_nm: 1500.0, taper: "HSK-A100" },
    tool_changer: { type: "chain", capacity: 240, change_time_sec: 3.0 },
  },
  {
    brand: "DMG MORI",
    model: "DMG MORI LASERTEC 65 3D hybrid",
    type: "5axis",
    controller: "Siemens Siemens SINUMERIK 840D sl",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 30.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 12000, power_kw: 35.0, torque_nm: 130.0, taper: "HSK-A63" },
    tool_changer: { type: "arm", capacity: 30, change_time_sec: 2.5 },
  },
  {
    brand: "DMG MORI",
    model: "DMG MORI LASERTEC 125 3D hybrid",
    type: "5axis",
    controller: "Siemens Siemens SINUMERIK 840D sl",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 60.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 52.0, torque_nm: 430.0, taper: "HSK-A100" },
    tool_changer: { type: "carousel", capacity: 60, change_time_sec: 4.0 },
  },
  {
    brand: "DMG MORI",
    model: "DMG MORI LASERTEC 45 Shape",
    type: "VMC",
    controller: "Siemens Siemens SINUMERIK 840D sl",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 15.0, torque_nm: 100.0, taper: "BT40" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "DMG MORI",
    model: "DMG MORI LASERTEC 100 PowerDrill",
    type: "VMC",
    controller: "Siemens Siemens SINUMERIK 840D sl",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 15.0, torque_nm: 100.0, taper: "BT40" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "DMG MORI",
    model: "DMG MORI ULTRASONIC 50",
    type: "5axis",
    controller: "Siemens Siemens SINUMERIK 840D sl",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 30.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 20000, power_kw: 25.0, torque_nm: 87.0, taper: "HSK-A63" },
    tool_changer: { type: "arm", capacity: 30, change_time_sec: 2.5 },
  },
  {
    brand: "DMG MORI",
    model: "DMG MORI ULTRASONIC 85 monoBLOCK",
    type: "5axis",
    controller: "Siemens Siemens SINUMERIK 840D sl",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 60.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 15000, power_kw: 35.0, torque_nm: 130.0, taper: "HSK-A63" },
    tool_changer: { type: "carousel", capacity: 60, change_time_sec: 4.0 },
  },
  {
    brand: "DMG MORI",
    model: "DMG MORI CMX 600 V",
    type: "VMC",
    controller: "Siemens Siemens SINUMERIK 840D sl",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 24.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 12000, power_kw: 18.5, torque_nm: 119.0, taper: "BT40" },
    tool_changer: { type: "arm", capacity: 24, change_time_sec: 2.5 },
  },
  {
    brand: "DMG MORI",
    model: "DMG MORI CMX 800 V",
    type: "VMC",
    controller: "Siemens Siemens SINUMERIK 840D sl",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 24.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 12000, power_kw: 22.0, torque_nm: 175.0, taper: "BT40" },
    tool_changer: { type: "arm", capacity: 24, change_time_sec: 2.5 },
  },
  {
    brand: "DMG MORI",
    model: "DMG MORI CMX 1100 V",
    type: "VMC",
    controller: "Siemens Siemens SINUMERIK 840D sl",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 30.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 12000, power_kw: 22.0, torque_nm: 175.0, taper: "BT40" },
    tool_changer: { type: "arm", capacity: 30, change_time_sec: 2.5 },
  },
  {
    brand: "DMG MORI",
    model: "DMG MORI DMC 650 V",
    type: "VMC",
    controller: "Siemens Siemens SINUMERIK 840D sl",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 30.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 14000, power_kw: 25.0, torque_nm: 130.0, taper: "HSK-A63" },
    tool_changer: { type: "arm", capacity: 30, change_time_sec: 2.5 },
  },
  {
    brand: "DMG MORI",
    model: "DMG MORI DMC 850 V",
    type: "VMC",
    controller: "Siemens Siemens SINUMERIK 840D sl",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 30.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 14000, power_kw: 25.0, torque_nm: 130.0, taper: "HSK-A63" },
    tool_changer: { type: "arm", capacity: 30, change_time_sec: 2.5 },
  },
  {
    brand: "DMG MORI",
    model: "DMG MORI DMC 1150 V",
    type: "VMC",
    controller: "Siemens Siemens SINUMERIK 840D sl",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 40.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 14000, power_kw: 28.0, torque_nm: 175.0, taper: "HSK-A63" },
    tool_changer: { type: "carousel", capacity: 40, change_time_sec: 4.0 },
  },
  {
    brand: "DMG MORI",
    model: "DMG MORI DMU 40 monoBLOCK",
    type: "5axis",
    controller: "Siemens Siemens SINUMERIK 840D sl",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 30.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 20000, power_kw: 25.0, torque_nm: 87.0, taper: "HSK-A63" },
    tool_changer: { type: "arm", capacity: 30, change_time_sec: 2.5 },
  },
  {
    brand: "DMG MORI",
    model: "DMG MORI DMU 50 3rd Gen",
    type: "5axis",
    controller: "Siemens Siemens SINUMERIK 840D sl",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 30.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 15000, power_kw: 25.0, torque_nm: 130.0, taper: "HSK-A63" },
    tool_changer: { type: "arm", capacity: 30, change_time_sec: 2.5 },
  },
  {
    brand: "DMG MORI",
    model: "DMG MORI DMU 65 monoBLOCK",
    type: "5axis",
    controller: "Siemens Siemens SINUMERIK 840D sl",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 40.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 15000, power_kw: 35.0, torque_nm: 130.0, taper: "HSK-A63" },
    tool_changer: { type: "carousel", capacity: 40, change_time_sec: 4.0 },
  },
  {
    brand: "DMG MORI",
    model: "DMG MORI DMU 80 monoBLOCK",
    type: "5axis",
    controller: "Siemens Siemens SINUMERIK 840D sl",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 60.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 12000, power_kw: 35.0, torque_nm: 200.0, taper: "HSK-A63" },
    tool_changer: { type: "carousel", capacity: 60, change_time_sec: 4.0 },
  },
  {
    brand: "DMG MORI",
    model: "DMG MORI DMU 95 monoBLOCK",
    type: "5axis",
    controller: "Siemens Siemens SINUMERIK 840D sl",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 60.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 12000, power_kw: 52.0, torque_nm: 430.0, taper: "HSK-A100" },
    tool_changer: { type: "carousel", capacity: 60, change_time_sec: 4.0 },
  },
  {
    brand: "DMG MORI",
    model: "DMG MORI DMU 125 monoBLOCK",
    type: "5axis",
    controller: "Siemens Siemens SINUMERIK 840D sl",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 60.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 52.0, torque_nm: 430.0, taper: "HSK-A100" },
    tool_changer: { type: "carousel", capacity: 60, change_time_sec: 4.0 },
  },
  {
    brand: "DMG MORI",
    model: "DMG MORI DMU 40 eVo",
    type: "5axis",
    controller: "Siemens Siemens SINUMERIK 840D sl",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 30.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 18000, power_kw: 25.0, torque_nm: 87.0, taper: "HSK-A63" },
    tool_changer: { type: "arm", capacity: 30, change_time_sec: 2.5 },
  },
  {
    brand: "DMG MORI",
    model: "DMG MORI DMU 60 eVo",
    type: "5axis",
    controller: "Siemens Siemens SINUMERIK 840D sl",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 30.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 18000, power_kw: 25.0, torque_nm: 87.0, taper: "HSK-A63" },
    tool_changer: { type: "arm", capacity: 30, change_time_sec: 2.5 },
  },
  {
    brand: "DMG MORI",
    model: "DMG MORI DMU 80 eVo",
    type: "5axis",
    controller: "Siemens Siemens SINUMERIK 840D sl",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 40.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 18000, power_kw: 35.0, torque_nm: 130.0, taper: "HSK-A63" },
    tool_changer: { type: "carousel", capacity: 40, change_time_sec: 4.0 },
  },
  {
    brand: "DMG MORI",
    model: "DMG MORI NHX 4000",
    type: "HMC",
    controller: "Siemens Siemens SINUMERIK 840D sl",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 60.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 15000, power_kw: 22.0, torque_nm: 120.0, taper: "HSK-A63" },
    tool_changer: { type: "carousel", capacity: 60, change_time_sec: 4.0 },
  },
  {
    brand: "DMG MORI",
    model: "DMG MORI NHX 5000",
    type: "HMC",
    controller: "Siemens Siemens SINUMERIK 840D sl",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 60.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 12000, power_kw: 30.0, torque_nm: 200.0, taper: "HSK-A63" },
    tool_changer: { type: "carousel", capacity: 60, change_time_sec: 4.0 },
  },
  {
    brand: "DMG MORI",
    model: "DMG MORI NHX 5500",
    type: "HMC",
    controller: "Siemens Siemens SINUMERIK 840D sl",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 60.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 37.0, torque_nm: 500.0, taper: "CAT50" },
    tool_changer: { type: "carousel", capacity: 60, change_time_sec: 4.0 },
  },
  {
    brand: "DMG MORI",
    model: "DMG MORI NHX 6300",
    type: "HMC",
    controller: "Siemens Siemens SINUMERIK 840D sl",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 80.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 8000, power_kw: 37.0, torque_nm: 700.0, taper: "CAT50" },
    tool_changer: { type: "chain", capacity: 80, change_time_sec: 3.0 },
  },
  {
    brand: "DMG MORI",
    model: "DMG MORI NHX 8000",
    type: "HMC",
    controller: "Siemens Siemens SINUMERIK 840D sl",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 120.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 6000, power_kw: 45.0, torque_nm: 900.0, taper: "CAT50" },
    tool_changer: { type: "chain", capacity: 120, change_time_sec: 3.0 },
  },
  {
    brand: "DMG MORI",
    model: "DMG MORI NHX 10000",
    type: "HMC",
    controller: "Siemens Siemens SINUMERIK 840D sl",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 120.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 6000, power_kw: 55.0, torque_nm: 1100.0, taper: "CAT50" },
    tool_changer: { type: "chain", capacity: 120, change_time_sec: 3.0 },
  },
  {
    brand: "DMG MORI",
    model: "DMG MORI CLX 350",
    type: "lathe",
    controller: "Siemens Siemens SINUMERIK 840D sl",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 5000, power_kw: 11.0, torque_nm: 75.0, taper: "A2-6" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "DMG MORI",
    model: "DMG MORI CLX 450",
    type: "lathe",
    controller: "Siemens Siemens SINUMERIK 840D sl",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 4000, power_kw: 18.5, torque_nm: 290.0, taper: "A2-6" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "DMG MORI",
    model: "DMG MORI CLX 550",
    type: "lathe",
    controller: "Siemens Siemens SINUMERIK 840D sl",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 3500, power_kw: 22.0, torque_nm: 430.0, taper: "A2-8" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "DMG MORI",
    model: "DMG MORI CTX 350 4A",
    type: "lathe",
    controller: "Siemens Siemens SINUMERIK 840D sl",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 5000, power_kw: 16.0, torque_nm: 115.0, taper: "A2-6" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "DMG MORI",
    model: "DMG MORI CTX 450 TC",
    type: "lathe",
    controller: "Siemens Siemens SINUMERIK 840D sl",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 4000, power_kw: 22.0, torque_nm: 350.0, taper: "A2-8" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "DMG MORI",
    model: "DMG MORI CTX alpha 500",
    type: "lathe",
    controller: "Siemens Siemens SINUMERIK 840D sl",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 4000, power_kw: 28.0, torque_nm: 460.0, taper: "A2-8" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "DMG MORI",
    model: "DMG MORI CTX beta 2000 TC",
    type: "mill_turn",
    controller: "Siemens Siemens SINUMERIK 840D sl",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 3000, power_kw: 44.0, torque_nm: 1000.0, taper: "A2-11" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "DMG MORI",
    model: "DMG MORI NLX 1500/500",
    type: "lathe",
    controller: "Fanuc Fanuc 31i-B",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 6000, power_kw: 11.0, torque_nm: 75.0, taper: "A2-5" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "DMG MORI",
    model: "DMG MORI NLX 2000/500",
    type: "lathe",
    controller: "Fanuc Fanuc 31i-B",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 4000, power_kw: 15.0, torque_nm: 180.0, taper: "A2-6" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "DMG MORI",
    model: "DMG MORI NLX 2500/700",
    type: "lathe",
    controller: "Fanuc Fanuc 31i-B",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 3500, power_kw: 22.0, torque_nm: 350.0, taper: "A2-8" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "DMG MORI",
    model: "DMG MORI NLX 3000/1250",
    type: "lathe",
    controller: "Fanuc Fanuc 31i-B",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 3000, power_kw: 30.0, torque_nm: 500.0, taper: "A2-11" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "DMG MORI",
    model: "DMG MORI NLX 4000/1500",
    type: "lathe",
    controller: "Fanuc Fanuc 31i-B",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 2500, power_kw: 37.0, torque_nm: 700.0, taper: "A2-11" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "DMG MORI",
    model: "DMG MORI NTX 1000 2nd Gen",
    type: "mill_turn",
    controller: "Fanuc Fanuc 31i-B5",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 4000, power_kw: 15.0, torque_nm: 180.0, taper: "BT40" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "DMG MORI",
    model: "DMG MORI NTX 2000 2nd Gen",
    type: "mill_turn",
    controller: "Fanuc Fanuc 31i-B5",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 3000, power_kw: 22.0, torque_nm: 350.0, taper: "BT40" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "DMG MORI",
    model: "DMG MORI NTX 2500 2nd Gen",
    type: "mill_turn",
    controller: "Fanuc Fanuc 31i-B5",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 2500, power_kw: 30.0, torque_nm: 500.0, taper: "BT40" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "DMG MORI",
    model: "DMG MORI NTX 3000 3rd Gen",
    type: "mill_turn",
    controller: "Fanuc Fanuc 31i-B5",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 2000, power_kw: 37.0, torque_nm: 700.0, taper: "BT40" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "DMG MORI",
    model: "DMG MORI DMC 80 FD duoBLOCK",
    type: "mill_turn",
    controller: "Siemens Siemens SINUMERIK 840D sl",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 60.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 12000, power_kw: 35.0, torque_nm: 130.0, taper: "HSK-A63" },
    tool_changer: { type: "carousel", capacity: 60, change_time_sec: 4.0 },
  },
  {
    brand: "DMG MORI",
    model: "DMG MORI DMC 125 FD duoBLOCK",
    type: "mill_turn",
    controller: "Siemens Siemens SINUMERIK 840D sl",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 120.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 52.0, torque_nm: 430.0, taper: "HSK-A100" },
    tool_changer: { type: "chain", capacity: 120, change_time_sec: 3.0 },
  },
  {
    brand: "DMG MORI",
    model: "DMG MORI DMF 200|8",
    type: "VMC",
    controller: "Siemens Siemens SINUMERIK 840D sl",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 40.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 12000, power_kw: 35.0, torque_nm: 130.0, taper: "HSK-A63" },
    tool_changer: { type: "carousel", capacity: 40, change_time_sec: 4.0 },
  },
  {
    brand: "DMG MORI",
    model: "DMG MORI DMF 260|11",
    type: "VMC",
    controller: "Siemens Siemens SINUMERIK 840D sl",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 60.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 52.0, torque_nm: 430.0, taper: "HSK-A100" },
    tool_changer: { type: "carousel", capacity: 60, change_time_sec: 4.0 },
  },
  {
    brand: "DMG MORI",
    model: "DMG MORI ULTRASONIC 20 linear 2nd Gen",
    type: "5axis",
    controller: "Siemens Siemens SINUMERIK 840D sl",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 30.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 42000, power_kw: 10.0, torque_nm: 4.0, taper: "HSK-E40" },
    tool_changer: { type: "arm", capacity: 30, change_time_sec: 2.5 },
  },
  {
    brand: "DMG MORI",
    model: "DMG MORI LASERTEC 30 SLM 2nd Gen",
    type: "VMC",
    controller: "Siemens Siemens SINUMERIK 840D sl",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 15.0, torque_nm: 100.0, taper: "BT40" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "DMG MORI",
    model: "DMG MORI LASERTEC 65 DED hybrid",
    type: "VMC",
    controller: "Siemens Siemens SINUMERIK 840D sl",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 30.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 12000, power_kw: 35.0, torque_nm: 130.0, taper: "HSK-A63" },
    tool_changer: { type: "arm", capacity: 30, change_time_sec: 2.5 },
  },
  {
    brand: "DMG MORI",
    model: "DMG MORI DMU 70 eVolution",
    type: "5axis",
    controller: "Siemens Siemens SINUMERIK 840D sl",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 30.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 18000, power_kw: 25.0, torque_nm: 86.0, taper: "HSK-A63" },
    tool_changer: { type: "arm", capacity: 30, change_time_sec: 2.5 },
  },
  {
    brand: "DMG MORI",
    model: "DMG MORI DMU 65 FD monoBLOCK",
    type: "mill_turn",
    controller: "Siemens Siemens SINUMERIK 840D sl",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 60.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 12000, power_kw: 29.0, torque_nm: 120.0, taper: "HSK-A63" },
    tool_changer: { type: "carousel", capacity: 60, change_time_sec: 4.0 },
  },
  {
    brand: "DMG MORI",
    model: "DMG MORI DMU 75 monoBLOCK",
    type: "5axis",
    controller: "Siemens Siemens SINUMERIK 840D sl",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 30.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 15000, power_kw: 35.0, torque_nm: 130.0, taper: "HSK-A63" },
    tool_changer: { type: "arm", capacity: 30, change_time_sec: 2.5 },
  },
  {
    brand: "DN Solutions",
    model: "DVF 6500",
    type: "5axis",
    controller: "Fanuc",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 60.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 12000, power_kw: 30.0, torque_nm: 150.0, taper: "BT40" },
    tool_changer: { type: "carousel", capacity: 60, change_time_sec: 4.0 },
  },
  {
    brand: "DN Solutions",
    model: "NHP 5000",
    type: "HMC",
    controller: "Fanuc",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 50.0 },
      { name: "Y", travel_mm: 60.0, rapid_m_min: 50.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 50.0 }
    ],
    spindle: { max_rpm: 12000, power_kw: 30.0, torque_nm: 200.0, taper: "BT40" },
    tool_changer: { type: "carousel", capacity: 60, change_time_sec: 4.0 },
  },
  {
    brand: "DN Solutions",
    model: "NHP 6300",
    type: "HMC",
    controller: "Fanuc",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 50.0 },
      { name: "Y", travel_mm: 90.0, rapid_m_min: 50.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 50.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 40.0, torque_nm: 300.0, taper: "BT40" },
    tool_changer: { type: "chain", capacity: 90, change_time_sec: 3.0 },
  },
  {
    brand: "DN Solutions",
    model: "PUMA 3100",
    type: "lathe",
    controller: "Fanuc",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 24.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 24.0 }
    ],
    spindle: { max_rpm: 3500, power_kw: 30.0, torque_nm: 700.0, taper: "BT40" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "DN Solutions",
    model: "PUMA 2600SY",
    type: "lathe",
    controller: "Fanuc",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 24.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 24.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 22.0, torque_nm: 100.0, taper: "BT40" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "DN Solutions",
    model: "LYNX 2600",
    type: "lathe",
    controller: "Fanuc",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 24.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 24.0 }
    ],
    spindle: { max_rpm: 4500, power_kw: 20.0, torque_nm: 340.0, taper: "BT40" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "DN Solutions",
    model: "SMX 2600S",
    type: "mill_turn",
    controller: "Fanuc",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 40.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 22.0, torque_nm: 100.0, taper: "BT40" },
    tool_changer: { type: "carousel", capacity: 40, change_time_sec: 4.0 },
  },
  {
    brand: "DN Solutions",
    model: "SMX 3100S",
    type: "mill_turn",
    controller: "Fanuc",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 60.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 22.0, torque_nm: 100.0, taper: "BT40" },
    tool_changer: { type: "carousel", capacity: 60, change_time_sec: 4.0 },
  },
  {
    brand: "DN Solutions",
    model: "DN Solutions DNM 350/5AX",
    type: "5axis",
    controller: "Fanuc Fanuc 31i-B5",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 30.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 15000, power_kw: 15.0, torque_nm: 72.0, taper: "BT40" },
    tool_changer: { type: "arm", capacity: 30, change_time_sec: 2.5 },
  },
  {
    brand: "DN Solutions",
    model: "DN Solutions Puma 2100SY II",
    type: "lathe",
    controller: "Fanuc Fanuc 0i-TF Plus",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 4500, power_kw: 18.5, torque_nm: 250.0, taper: "A2-6" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "DN Solutions",
    model: "DN Solutions Puma 3100Y",
    type: "lathe",
    controller: "Fanuc Fanuc 0i-TF Plus",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 2500, power_kw: 30.0, torque_nm: 600.0, taper: "A2-11" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "DN Solutions",
    model: "DN Solutions Puma GT 2600M",
    type: "lathe",
    controller: "Fanuc Fanuc 0i-TF Plus",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 3500, power_kw: 22.0, torque_nm: 400.0, taper: "A2-8" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "DN Solutions",
    model: "DN Solutions Lynx 2100B",
    type: "lathe",
    controller: "Fanuc Fanuc 0i-TF Plus",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 6000, power_kw: 15.0, torque_nm: 100.0, taper: "A2-5" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "DN Solutions",
    model: "DN Solutions Puma 2100 II",
    type: "lathe",
    controller: "Fanuc Fanuc 0i-TF Plus",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 4000, power_kw: 18.5, torque_nm: 287.0, taper: "A2-6" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "DN Solutions",
    model: "DN Solutions Puma GT 2600SY",
    type: "lathe",
    controller: "Fanuc Fanuc 0i-TF Plus",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 3500, power_kw: 22.0, torque_nm: 400.0, taper: "A2-8" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "DN Solutions",
    model: "DN Solutions DNM 4000",
    type: "VMC",
    controller: "Fanuc Fanuc 0i-MF Plus",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 24.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 12000, power_kw: 15.0, torque_nm: 95.0, taper: "BT40" },
    tool_changer: { type: "arm", capacity: 24, change_time_sec: 2.5 },
  },
  {
    brand: "DN Solutions",
    model: "DN Solutions DNM 5700L",
    type: "VMC",
    controller: "Fanuc Fanuc 0i-MF Plus",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 30.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 12000, power_kw: 22.0, torque_nm: 175.0, taper: "BT40" },
    tool_changer: { type: "arm", capacity: 30, change_time_sec: 2.5 },
  },
  {
    brand: "DN Solutions",
    model: "DN Solutions NHP 4000 DCG",
    type: "HMC",
    controller: "Fanuc Fanuc 31i-B5",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 60.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 15000, power_kw: 22.0, torque_nm: 119.0, taper: "BT40" },
    tool_changer: { type: "carousel", capacity: 60, change_time_sec: 4.0 },
  },
  {
    brand: "DN Solutions",
    model: "DN Solutions DVF 5000 II",
    type: "5axis",
    controller: "Fanuc Fanuc 31i-B5",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 40.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 12000, power_kw: 22.0, torque_nm: 175.0, taper: "BT40" },
    tool_changer: { type: "carousel", capacity: 40, change_time_sec: 4.0 },
  },
  {
    brand: "DN Solutions",
    model: "DN Solutions SMX 2600S II",
    type: "mill_turn",
    controller: "Fanuc Fanuc 31i-B5",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 3500, power_kw: 26.0, torque_nm: 430.0, taper: "BT40" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "DN Solutions",
    model: "DN Solutions Puma 2100Y",
    type: "lathe",
    controller: "Fanuc Fanuc 0i-TF Plus",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 4000, power_kw: 18.5, torque_nm: 287.0, taper: "A2-6" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "DN Solutions",
    model: "DN Solutions Puma 2600SY II",
    type: "lathe",
    controller: "Fanuc Fanuc 0i-TF Plus",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 3500, power_kw: 22.0, torque_nm: 400.0, taper: "A2-8" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "DN Solutions",
    model: "DN Solutions Puma 3100ULY",
    type: "lathe",
    controller: "Fanuc Fanuc 0i-TF Plus",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 2500, power_kw: 30.0, torque_nm: 600.0, taper: "A2-11" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "DN Solutions",
    model: "DN Solutions Puma 4100LM",
    type: "lathe",
    controller: "Fanuc Fanuc 0i-TF Plus",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 1800, power_kw: 37.0, torque_nm: 900.0, taper: "A2-11" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "DN Solutions",
    model: "DN Solutions Puma 5100LM",
    type: "lathe",
    controller: "Fanuc Fanuc 0i-TF Plus",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 1200, power_kw: 45.0, torque_nm: 1400.0, taper: "A2-15" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "DN Solutions",
    model: "DN Solutions Puma 700LM",
    type: "lathe",
    controller: "Fanuc Fanuc 31i-B",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 1000, power_kw: 55.0, torque_nm: 2200.0, taper: "A2-20" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "DN Solutions",
    model: "DN Solutions Lynx 2100A",
    type: "lathe",
    controller: "Fanuc Fanuc 0i-TF Plus",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 6000, power_kw: 11.0, torque_nm: 75.0, taper: "A2-5" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "DN Solutions",
    model: "DN Solutions Lynx 2100LYA",
    type: "lathe",
    controller: "Fanuc Fanuc 0i-TF Plus",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 6000, power_kw: 15.0, torque_nm: 100.0, taper: "A2-6" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "DN Solutions",
    model: "DN Solutions Lynx 2600SY",
    type: "lathe",
    controller: "Fanuc Fanuc 0i-TF Plus",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 4500, power_kw: 18.5, torque_nm: 220.0, taper: "A2-6" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "DN Solutions",
    model: "DN Solutions DNM 4500",
    type: "VMC",
    controller: "Fanuc Fanuc 0i-MF Plus",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 30.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 12000, power_kw: 18.5, torque_nm: 119.0, taper: "BT40" },
    tool_changer: { type: "arm", capacity: 30, change_time_sec: 2.5 },
  },
  {
    brand: "DN Solutions",
    model: "DN Solutions DNM 5700",
    type: "VMC",
    controller: "Fanuc Fanuc 0i-MF Plus",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 30.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 12000, power_kw: 22.0, torque_nm: 175.0, taper: "BT40" },
    tool_changer: { type: "arm", capacity: 30, change_time_sec: 2.5 },
  },
  {
    brand: "DN Solutions",
    model: "DN Solutions DNM 6700",
    type: "VMC",
    controller: "Fanuc Fanuc 0i-MF Plus",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 30.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 30.0, torque_nm: 350.0, taper: "CAT50" },
    tool_changer: { type: "arm", capacity: 30, change_time_sec: 2.5 },
  },
  {
    brand: "DN Solutions",
    model: "DN Solutions DNM 750L II",
    type: "VMC",
    controller: "Fanuc Fanuc 0i-MF Plus",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 30.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 8000, power_kw: 30.0, torque_nm: 430.0, taper: "CAT50" },
    tool_changer: { type: "arm", capacity: 30, change_time_sec: 2.5 },
  },
  {
    brand: "DN Solutions",
    model: "DN Solutions DVF 4000",
    type: "5axis",
    controller: "Fanuc Fanuc 31i-B5",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 30.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 15000, power_kw: 18.5, torque_nm: 87.0, taper: "BT40" },
    tool_changer: { type: "arm", capacity: 30, change_time_sec: 2.5 },
  },
  {
    brand: "DN Solutions",
    model: "DN Solutions DVF 5000T",
    type: "5axis",
    controller: "Fanuc Fanuc 31i-B5",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 30.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 12000, power_kw: 22.0, torque_nm: 175.0, taper: "BT40" },
    tool_changer: { type: "arm", capacity: 30, change_time_sec: 2.5 },
  },
  {
    brand: "DN Solutions",
    model: "DN Solutions DVF 6500",
    type: "5axis",
    controller: "Fanuc Fanuc 31i-B5",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 40.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 12000, power_kw: 30.0, torque_nm: 200.0, taper: "HSK-A63" },
    tool_changer: { type: "carousel", capacity: 40, change_time_sec: 4.0 },
  },
  {
    brand: "DN Solutions",
    model: "DN Solutions DVF 8000",
    type: "5axis",
    controller: "Fanuc Fanuc 31i-B5",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 60.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 37.0, torque_nm: 350.0, taper: "HSK-A100" },
    tool_changer: { type: "carousel", capacity: 60, change_time_sec: 4.0 },
  },
  {
    brand: "DN Solutions",
    model: "DN Solutions NHP 4000",
    type: "HMC",
    controller: "Fanuc Fanuc 31i-B5",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 40.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 15000, power_kw: 22.0, torque_nm: 119.0, taper: "BT40" },
    tool_changer: { type: "carousel", capacity: 40, change_time_sec: 4.0 },
  },
  {
    brand: "DN Solutions",
    model: "DN Solutions NHP 5000",
    type: "HMC",
    controller: "Fanuc Fanuc 31i-B5",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 60.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 12000, power_kw: 30.0, torque_nm: 200.0, taper: "BT40" },
    tool_changer: { type: "carousel", capacity: 60, change_time_sec: 4.0 },
  },
  {
    brand: "DN Solutions",
    model: "DN Solutions NHP 5500",
    type: "HMC",
    controller: "Fanuc Fanuc 31i-B5",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 60.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 8000, power_kw: 37.0, torque_nm: 500.0, taper: "CAT50" },
    tool_changer: { type: "carousel", capacity: 60, change_time_sec: 4.0 },
  },
  {
    brand: "DN Solutions",
    model: "DN Solutions NHP 6300",
    type: "HMC",
    controller: "Fanuc Fanuc 31i-B5",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 80.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 6000, power_kw: 45.0, torque_nm: 700.0, taper: "CAT50" },
    tool_changer: { type: "chain", capacity: 80, change_time_sec: 3.0 },
  },
  {
    brand: "DN Solutions",
    model: "DN Solutions NHP 8000",
    type: "HMC",
    controller: "Fanuc Fanuc 31i-B5",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 120.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 6000, power_kw: 55.0, torque_nm: 1100.0, taper: "CAT50" },
    tool_changer: { type: "chain", capacity: 120, change_time_sec: 3.0 },
  },
  {
    brand: "DN Solutions",
    model: "DN Solutions SMX 2100ST",
    type: "mill_turn",
    controller: "Fanuc Fanuc 31i-B5",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 4000, power_kw: 18.5, torque_nm: 287.0, taper: "BT40" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "DN Solutions",
    model: "DN Solutions SMX 2600ST",
    type: "mill_turn",
    controller: "Fanuc Fanuc 31i-B5",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 3500, power_kw: 26.0, torque_nm: 430.0, taper: "BT40" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "DN Solutions",
    model: "DN Solutions SMX 3100ST",
    type: "mill_turn",
    controller: "Fanuc Fanuc 31i-B5",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 3000, power_kw: 30.0, torque_nm: 600.0, taper: "BT40" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "DN Solutions",
    model: "DN Solutions DVF 5000",
    type: "VMC",
    controller: "Fanuc Fanuc 0i-MF",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 30.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 15.0, torque_nm: 100.0, taper: "CAT40" },
    tool_changer: { type: "arm", capacity: 30, change_time_sec: 2.5 },
  },
  {
    brand: "EMAG",
    model: "EMAG VLC 200 GT",
    type: "lathe",
    controller: "Siemens Siemens SINUMERIK 840D sl",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 6300, power_kw: 17.5, torque_nm: 145.0, taper: "chuck" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "EMAG",
    model: "EMAG VSC 250",
    type: "lathe",
    controller: "Siemens Siemens SINUMERIK 840D sl",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 5000, power_kw: 22.0, torque_nm: 200.0, taper: "chuck" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "EMAG",
    model: "EMAG VT 2-4",
    type: "lathe",
    controller: "Siemens Siemens SINUMERIK 840D sl",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 6300, power_kw: 17.5, torque_nm: 145.0, taper: "BT40" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "EMAG",
    model: "EMAG VL 2",
    type: "lathe",
    controller: "Siemens Siemens SINUMERIK 840D sl",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 6300, power_kw: 17.5, torque_nm: 145.0, taper: "collet" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "EMAG",
    model: "EMAG VL 4",
    type: "lathe",
    controller: "Siemens Siemens SINUMERIK 840D sl",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 4500, power_kw: 28.0, torque_nm: 250.0, taper: "chuck" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "EMAG",
    model: "EMAG VL 6",
    type: "lathe",
    controller: "Siemens Siemens SINUMERIK 840D sl",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 3500, power_kw: 39.0, torque_nm: 390.0, taper: "chuck" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "EMAG",
    model: "EMAG VL 8",
    type: "lathe",
    controller: "Siemens Siemens SINUMERIK 840D sl",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 2800, power_kw: 54.0, torque_nm: 620.0, taper: "chuck" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Fadal",
    model: "Fadal VMC 4020",
    type: "VMC",
    controller: "Fanuc Fadal Fadal CNC",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 21.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 15.0, torque_nm: 119.0, taper: "CAT40" },
    tool_changer: { type: "arm", capacity: 21, change_time_sec: 2.5 },
  },
  {
    brand: "Fadal",
    model: "Fadal VMC 6030",
    type: "VMC",
    controller: "Fanuc Fadal Fadal CNC",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 30.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 22.0, torque_nm: 175.0, taper: "CAT40" },
    tool_changer: { type: "arm", capacity: 30, change_time_sec: 2.5 },
  },
  {
    brand: "Fadal",
    model: "Fadal VMC 3016L",
    type: "VMC",
    controller: "Fanuc Fadal Fadal CNC",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 21.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 11.0, torque_nm: 87.5, taper: "CAT40" },
    tool_changer: { type: "arm", capacity: 21, change_time_sec: 2.5 },
  },
  {
    brand: "Fadal",
    model: "Fadal VMC 8030",
    type: "VMC",
    controller: "Fanuc Fadal Fadal CNC",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 30.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 30.0, torque_nm: 350.0, taper: "CAT50" },
    tool_changer: { type: "arm", capacity: 30, change_time_sec: 2.5 },
  },
  {
    brand: "Feeler",
    model: "FTC-20",
    type: "lathe",
    controller: "Fanuc",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 24.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 24.0 }
    ],
    spindle: { max_rpm: 5000, power_kw: 7.5, torque_nm: 287.0, taper: "BT40" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Feeler",
    model: "FTC-350MY",
    type: "lathe",
    controller: "Fanuc",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 24.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 24.0 }
    ],
    spindle: { max_rpm: 4000, power_kw: 15.0, torque_nm: 520.0, taper: "BT40" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Feeler",
    model: "FVL-1250",
    type: "lathe",
    controller: "Fanuc",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 24.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 24.0 }
    ],
    spindle: { max_rpm: 1000, power_kw: 15.0, torque_nm: 8500.0, taper: "BT40" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Feeler",
    model: "FSL-20",
    type: "lathe",
    controller: "Fanuc",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 24.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 24.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 15.0, torque_nm: 100.0, taper: "BT40" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Feeler",
    model: "Feeler FV-1000A",
    type: "VMC",
    controller: "Fanuc Fanuc 0i-MF",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 24.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 12000, power_kw: 22.0, torque_nm: 175.0, taper: "BT40" },
    tool_changer: { type: "arm", capacity: 24, change_time_sec: 2.5 },
  },
  {
    brand: "Feeler",
    model: "Feeler HV-800A",
    type: "VMC",
    controller: "Fanuc Fanuc 0i-MF",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 24.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 22.0, torque_nm: 175.0, taper: "CAT50" },
    tool_changer: { type: "arm", capacity: 24, change_time_sec: 2.5 },
  },
  {
    brand: "Feeler",
    model: "Feeler FT-250SY",
    type: "lathe",
    controller: "Fanuc Fanuc 0i-TF",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 4000, power_kw: 18.5, torque_nm: 250.0, taper: "A2-6" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Feeler",
    model: "Feeler U-600",
    type: "5axis",
    controller: "Fanuc Fanuc 31i-B5",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 30.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 12000, power_kw: 18.5, torque_nm: 119.0, taper: "BT40" },
    tool_changer: { type: "arm", capacity: 30, change_time_sec: 2.5 },
  },
  {
    brand: "Giddings & Lewis",
    model: "RTC 4000",
    type: "VMC",
    controller: "Siemens",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 30.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 15.0, torque_nm: 100.0, taper: "BT40" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "GROB",
    model: "GROB G150",
    type: "5axis",
    controller: "Siemens Siemens SINUMERIK 840D sl",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 30.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 18000, power_kw: 29.0, torque_nm: 87.0, taper: "HSK-A63" },
    tool_changer: { type: "arm", capacity: 30, change_time_sec: 2.5 },
  },
  {
    brand: "GROB",
    model: "GROB G350T",
    type: "mill_turn",
    controller: "Siemens Siemens SINUMERIK 840D sl",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 48.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 18000, power_kw: 29.0, torque_nm: 87.0, taper: "HSK-A63" },
    tool_changer: { type: "carousel", capacity: 48, change_time_sec: 4.0 },
  },
  {
    brand: "GROB",
    model: "GROB G750",
    type: "5axis",
    controller: "Siemens Siemens SINUMERIK 840D sl",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 80.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 12000, power_kw: 52.0, torque_nm: 430.0, taper: "HSK-A100" },
    tool_changer: { type: "chain", capacity: 80, change_time_sec: 3.0 },
  },
  {
    brand: "Haas",
    model: "VF-2 TR",
    type: "VMC",
    controller: "Haas",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 8100, power_kw: 22.4, torque_nm: 122.0, taper: "BT40" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Haas",
    model: "VF-2 with TRT100",
    type: "VMC",
    controller: "Haas",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 8100, power_kw: 22.4, torque_nm: 122.0, taper: "BT40" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Haas",
    model: "VF-3 with TR160",
    type: "VMC",
    controller: "Haas",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 8100, power_kw: 22.4, torque_nm: 122.0, taper: "BT40" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Haas",
    model: "VF-3YT/50",
    type: "VMC",
    controller: "Haas",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 6000, power_kw: 22.4, torque_nm: 500.0, taper: "BT40" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Haas",
    model: "VF-4SS with TRT210",
    type: "VMC",
    controller: "Haas",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 12000, power_kw: 22.4, torque_nm: 76.0, taper: "BT40" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Haas",
    model: "VF-5/40",
    type: "VMC",
    controller: "Haas",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 8100, power_kw: 22.4, torque_nm: 122.0, taper: "BT40" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Haas",
    model: "VF-6/40",
    type: "VMC",
    controller: "Haas",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 8100, power_kw: 22.4, torque_nm: 122.0, taper: "BT40" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Haas",
    model: "VF-7/40",
    type: "VMC",
    controller: "Haas",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 8100, power_kw: 22.4, torque_nm: 122.0, taper: "BT40" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Haas",
    model: "VF-8/40",
    type: "VMC",
    controller: "Haas",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 8100, power_kw: 22.4, torque_nm: 122.0, taper: "BT40" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Haas",
    model: "VF-10/50",
    type: "VMC",
    controller: "Haas",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 6000, power_kw: 22.4, torque_nm: 500.0, taper: "BT40" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Haas",
    model: "VF-11/40",
    type: "VMC",
    controller: "Haas",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 8100, power_kw: 22.4, torque_nm: 122.0, taper: "BT40" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Haas",
    model: "VF-11/50",
    type: "VMC",
    controller: "Haas",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 6000, power_kw: 22.4, torque_nm: 500.0, taper: "BT40" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Haas",
    model: "VF-12/40",
    type: "VMC",
    controller: "Haas",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 8100, power_kw: 22.4, torque_nm: 122.0, taper: "BT40" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Haas",
    model: "VF-12/50",
    type: "VMC",
    controller: "Haas",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 6000, power_kw: 22.4, torque_nm: 500.0, taper: "BT40" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Haas",
    model: "VF-14/40",
    type: "VMC",
    controller: "Haas",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 8100, power_kw: 22.4, torque_nm: 26.4, taper: "BT40" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Haas",
    model: "VF-14/50",
    type: "VMC",
    controller: "Haas",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 6000, power_kw: 22.4, torque_nm: 500.0, taper: "BT40" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Haas",
    model: "UMC 350HD-EDU",
    type: "VMC",
    controller: "Haas",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 8100, power_kw: 15.0, torque_nm: 122.0, taper: "BT40" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Haas",
    model: "UMC-750 (New Design)",
    type: "VMC",
    controller: "Haas",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 8100, power_kw: 22.4, torque_nm: 122.0, taper: "BT40" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Haas",
    model: "EC-500/50",
    type: "HMC",
    controller: "Haas",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 6000, power_kw: 22.4, torque_nm: 500.0, taper: "BT40" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Haas",
    model: "Mini Mill-EDU with HRT160",
    type: "VMC",
    controller: "Haas",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 6000, power_kw: 11.2, torque_nm: 34.0, taper: "BT40" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Haas",
    model: "HAAS CM-1",
    type: "VMC",
    controller: "Haas Haas Haas NGC",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 4000, power_kw: 15.0, torque_nm: 100.0, taper: "CAT40" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Haas",
    model: "HAAS EC-1600",
    type: "HMC",
    controller: "Haas Haas Haas NGC",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 50.0 },
      { name: "Y", travel_mm: 40.0, rapid_m_min: 50.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 50.0 }
    ],
    spindle: { max_rpm: 6000, power_kw: 15.0, torque_nm: 100.0, taper: "CAT50" },
    tool_changer: { type: "carousel", capacity: 40, change_time_sec: 4.0 },
  },
  {
    brand: "Haas",
    model: "HAAS EC-1600ZT",
    type: "HMC",
    controller: "Haas Haas Haas NGC",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 50.0 },
      { name: "Y", travel_mm: 40.0, rapid_m_min: 50.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 50.0 }
    ],
    spindle: { max_rpm: 6000, power_kw: 15.0, torque_nm: 100.0, taper: "CAT50" },
    tool_changer: { type: "carousel", capacity: 40, change_time_sec: 4.0 },
  },
  {
    brand: "Haas",
    model: "HAAS EC-500-50",
    type: "HMC",
    controller: "Haas Haas Haas NGC",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 50.0 },
      { name: "Y", travel_mm: 40.0, rapid_m_min: 50.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 50.0 }
    ],
    spindle: { max_rpm: 7500, power_kw: 15.0, torque_nm: 100.0, taper: "CAT50" },
    tool_changer: { type: "carousel", capacity: 40, change_time_sec: 4.0 },
  },
  {
    brand: "Haas",
    model: "HAAS EC-630",
    type: "HMC",
    controller: "Haas Haas Haas NGC",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 50.0 },
      { name: "Y", travel_mm: 40.0, rapid_m_min: 50.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 50.0 }
    ],
    spindle: { max_rpm: 7500, power_kw: 15.0, torque_nm: 100.0, taper: "CAT50" },
    tool_changer: { type: "carousel", capacity: 40, change_time_sec: 4.0 },
  },
  {
    brand: "Haas",
    model: "HAAS Mini Mill",
    type: "VMC",
    controller: "Haas Haas Haas NGC",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 10.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 6000, power_kw: 15.0, torque_nm: 100.0, taper: "CAT40" },
    tool_changer: { type: "side_mount", capacity: 10, change_time_sec: 3.0 },
  },
  {
    brand: "Haas",
    model: "HAAS Mini Mill 2",
    type: "VMC",
    controller: "Haas Haas Haas NGC",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 10.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 6000, power_kw: 15.0, torque_nm: 100.0, taper: "CAT40" },
    tool_changer: { type: "side_mount", capacity: 10, change_time_sec: 3.0 },
  },
  {
    brand: "Haas",
    model: "HAAS Mini Mill-EDU",
    type: "VMC",
    controller: "Haas Haas Haas NGC",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 10.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 6000, power_kw: 15.0, torque_nm: 100.0, taper: "CAT40" },
    tool_changer: { type: "side_mount", capacity: 10, change_time_sec: 3.0 },
  },
  {
    brand: "Haas",
    model: "HAAS Mini Mill-EDU WITH HRT160 TRUNNION TABLE",
    type: "VMC",
    controller: "Haas Haas Haas NGC",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 10.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 6000, power_kw: 15.0, torque_nm: 100.0, taper: "CAT40" },
    tool_changer: { type: "side_mount", capacity: 10, change_time_sec: 3.0 },
  },
  {
    brand: "Haas",
    model: "HAAS TM-1",
    type: "VMC",
    controller: "Haas Haas Haas NGC",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 10.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 4000, power_kw: 15.0, torque_nm: 100.0, taper: "CAT40" },
    tool_changer: { type: "side_mount", capacity: 10, change_time_sec: 3.0 },
  },
  {
    brand: "Haas",
    model: "HAAS TM-1P",
    type: "VMC",
    controller: "Haas Haas Haas NGC",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 10.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 4000, power_kw: 15.0, torque_nm: 100.0, taper: "CAT40" },
    tool_changer: { type: "side_mount", capacity: 10, change_time_sec: 3.0 },
  },
  {
    brand: "Haas",
    model: "HAAS TM-2",
    type: "VMC",
    controller: "Haas Haas Haas NGC",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 10.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 4000, power_kw: 15.0, torque_nm: 100.0, taper: "CAT40" },
    tool_changer: { type: "side_mount", capacity: 10, change_time_sec: 3.0 },
  },
  {
    brand: "Haas",
    model: "HAAS TM-2P",
    type: "VMC",
    controller: "Haas Haas Haas NGC",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 10.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 4000, power_kw: 15.0, torque_nm: 100.0, taper: "CAT40" },
    tool_changer: { type: "side_mount", capacity: 10, change_time_sec: 3.0 },
  },
  {
    brand: "Haas",
    model: "HAAS TM-3P",
    type: "VMC",
    controller: "Haas Haas Haas NGC",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 10.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 4000, power_kw: 15.0, torque_nm: 100.0, taper: "CAT40" },
    tool_changer: { type: "side_mount", capacity: 10, change_time_sec: 3.0 },
  },
  {
    brand: "Haas",
    model: "HAAS UMC-750SS",
    type: "5axis",
    controller: "Haas Haas Haas NGC",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 40.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 15000, power_kw: 15.0, torque_nm: 100.0, taper: "CAT40" },
    tool_changer: { type: "carousel", capacity: 40, change_time_sec: 4.0 },
  },
  {
    brand: "Haas",
    model: "HAAS UMC-750 NEW DESIGN",
    type: "5axis",
    controller: "Haas Haas Haas NGC",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 40.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 8100, power_kw: 15.0, torque_nm: 100.0, taper: "CAT40" },
    tool_changer: { type: "carousel", capacity: 40, change_time_sec: 4.0 },
  },
  {
    brand: "Haas",
    model: "HAAS VC-400",
    type: "VMC",
    controller: "Haas Haas Haas NGC",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 24.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 12000, power_kw: 15.0, torque_nm: 100.0, taper: "CAT40" },
    tool_changer: { type: "arm", capacity: 24, change_time_sec: 2.5 },
  },
  {
    brand: "Haas",
    model: "HAAS VF-1",
    type: "VMC",
    controller: "Haas Haas Haas NGC",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 8100, power_kw: 15.0, torque_nm: 100.0, taper: "CAT40" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Haas",
    model: "HAAS VF-10-50",
    type: "VMC",
    controller: "Haas Haas Haas NGC",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 24.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 7500, power_kw: 15.0, torque_nm: 100.0, taper: "CAT50" },
    tool_changer: { type: "arm", capacity: 24, change_time_sec: 2.5 },
  },
  {
    brand: "Haas",
    model: "HAAS VF-11-50",
    type: "VMC",
    controller: "Haas Haas Haas NGC",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 30.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 7500, power_kw: 15.0, torque_nm: 100.0, taper: "CAT50" },
    tool_changer: { type: "arm", capacity: 30, change_time_sec: 2.5 },
  },
  {
    brand: "Haas",
    model: "HAAS VF-12-40",
    type: "VMC",
    controller: "Haas Haas Haas NGC",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 30.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 8100, power_kw: 15.0, torque_nm: 100.0, taper: "CAT40" },
    tool_changer: { type: "arm", capacity: 30, change_time_sec: 2.5 },
  },
  {
    brand: "Haas",
    model: "HAAS VF-14-40",
    type: "VMC",
    controller: "Haas Haas Haas NGC",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 30.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 8100, power_kw: 15.0, torque_nm: 100.0, taper: "CAT40" },
    tool_changer: { type: "arm", capacity: 30, change_time_sec: 2.5 },
  },
  {
    brand: "Haas",
    model: "HAAS VF-14-50",
    type: "VMC",
    controller: "Haas Haas Haas NGC",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 30.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 7500, power_kw: 15.0, torque_nm: 100.0, taper: "CAT50" },
    tool_changer: { type: "arm", capacity: 30, change_time_sec: 2.5 },
  },
  {
    brand: "Haas",
    model: "HAAS VF-2",
    type: "VMC",
    controller: "Haas Haas Haas NGC",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 24.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 8100, power_kw: 15.0, torque_nm: 100.0, taper: "CAT40" },
    tool_changer: { type: "arm", capacity: 24, change_time_sec: 2.5 },
  },
  {
    brand: "Haas",
    model: "HAAS VF-2 TR",
    type: "5axis",
    controller: "Haas Haas Haas NGC",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 24.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 8100, power_kw: 15.0, torque_nm: 100.0, taper: "CAT40" },
    tool_changer: { type: "arm", capacity: 24, change_time_sec: 2.5 },
  },
  {
    brand: "Haas",
    model: "HAAS VF-2 WITH TRT100 TILTING ROTARY RABLE",
    type: "VMC",
    controller: "Haas Haas Haas NGC",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 24.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 8100, power_kw: 15.0, torque_nm: 100.0, taper: "CAT40" },
    tool_changer: { type: "arm", capacity: 24, change_time_sec: 2.5 },
  },
  {
    brand: "Haas",
    model: "HAAS VF-3",
    type: "VMC",
    controller: "Haas Haas Haas NGC",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 24.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 8100, power_kw: 15.0, torque_nm: 100.0, taper: "CAT40" },
    tool_changer: { type: "arm", capacity: 24, change_time_sec: 2.5 },
  },
  {
    brand: "Haas",
    model: "HAAS VF-3YT",
    type: "VMC",
    controller: "Haas Haas Haas NGC",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 24.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 8100, power_kw: 15.0, torque_nm: 100.0, taper: "CAT40" },
    tool_changer: { type: "arm", capacity: 24, change_time_sec: 2.5 },
  },
  {
    brand: "Haas",
    model: "HAAS VF-3 WITH TR160 TRUNNION ROTARY TABLE",
    type: "VMC",
    controller: "Haas Haas Haas NGC",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 24.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 8100, power_kw: 15.0, torque_nm: 100.0, taper: "CAT40" },
    tool_changer: { type: "arm", capacity: 24, change_time_sec: 2.5 },
  },
  {
    brand: "Haas",
    model: "HAAS VF-4",
    type: "VMC",
    controller: "Haas Haas Haas NGC",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 24.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 8100, power_kw: 15.0, torque_nm: 100.0, taper: "CAT40" },
    tool_changer: { type: "arm", capacity: 24, change_time_sec: 2.5 },
  },
  {
    brand: "Haas",
    model: "HAAS VF-5-40",
    type: "VMC",
    controller: "Haas Haas Haas NGC",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 24.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 8100, power_kw: 15.0, torque_nm: 100.0, taper: "CAT40" },
    tool_changer: { type: "arm", capacity: 24, change_time_sec: 2.5 },
  },
  {
    brand: "Haas",
    model: "HAAS VF-6-40",
    type: "VMC",
    controller: "Haas Haas Haas NGC",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 24.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 8100, power_kw: 15.0, torque_nm: 100.0, taper: "CAT40" },
    tool_changer: { type: "arm", capacity: 24, change_time_sec: 2.5 },
  },
  {
    brand: "Haas",
    model: "HAAS VF-7-40",
    type: "VMC",
    controller: "Haas Haas Haas NGC",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 24.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 8100, power_kw: 15.0, torque_nm: 100.0, taper: "CAT40" },
    tool_changer: { type: "arm", capacity: 24, change_time_sec: 2.5 },
  },
  {
    brand: "Haas",
    model: "HAAS VF-8-40",
    type: "VMC",
    controller: "Haas Haas Haas NGC",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 24.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 8100, power_kw: 15.0, torque_nm: 100.0, taper: "CAT40" },
    tool_changer: { type: "arm", capacity: 24, change_time_sec: 2.5 },
  },
  {
    brand: "Haas",
    model: "HAAS VM-3",
    type: "VMC",
    controller: "Haas Haas Haas NGC",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 24.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 12000, power_kw: 15.0, torque_nm: 100.0, taper: "CAT40" },
    tool_changer: { type: "arm", capacity: 24, change_time_sec: 2.5 },
  },
  {
    brand: "Haas",
    model: "HAAS VM-6",
    type: "VMC",
    controller: "Haas Haas Haas NGC",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 24.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 12000, power_kw: 15.0, torque_nm: 100.0, taper: "CAT40" },
    tool_changer: { type: "arm", capacity: 24, change_time_sec: 2.5 },
  },
  {
    brand: "Haas",
    model: "HAAS UMC-1500SS-DUO",
    type: "5axis",
    controller: "Haas Haas Haas NGC",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 40.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 15000, power_kw: 15.0, torque_nm: 100.0, taper: "CAT40" },
    tool_changer: { type: "carousel", capacity: 40, change_time_sec: 4.0 },
  },
  {
    brand: "Haas",
    model: "HAAS UMC-1500-DUO",
    type: "5axis",
    controller: "Haas Haas Haas NGC",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 40.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 8100, power_kw: 15.0, torque_nm: 100.0, taper: "CAT40" },
    tool_changer: { type: "carousel", capacity: 40, change_time_sec: 4.0 },
  },
  {
    brand: "Haas",
    model: "HAAS UMC-1000SS",
    type: "5axis",
    controller: "Haas Haas Haas NGC",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 40.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 15000, power_kw: 15.0, torque_nm: 100.0, taper: "CAT40" },
    tool_changer: { type: "carousel", capacity: 40, change_time_sec: 4.0 },
  },
  {
    brand: "Haas",
    model: "HAAS UMC-1000-P",
    type: "5axis",
    controller: "Haas Haas Haas NGC",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 40.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 8100, power_kw: 15.0, torque_nm: 100.0, taper: "CAT40" },
    tool_changer: { type: "carousel", capacity: 40, change_time_sec: 4.0 },
  },
  {
    brand: "Haas",
    model: "HAAS UMC-400",
    type: "5axis",
    controller: "Haas Haas Haas NGC",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 40.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 8100, power_kw: 15.0, torque_nm: 100.0, taper: "CAT40" },
    tool_changer: { type: "carousel", capacity: 40, change_time_sec: 4.0 },
  },
  {
    brand: "Haas",
    model: "HAAS UMC 350HD-EDU",
    type: "5axis",
    controller: "Haas Haas Haas NGC",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 40.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 15000, power_kw: 15.0, torque_nm: 100.0, taper: "BT30" },
    tool_changer: { type: "carousel", capacity: 40, change_time_sec: 4.0 },
  },
  {
    brand: "Haas",
    model: "HAAS DM-1",
    type: "VMC",
    controller: "Haas Haas Haas NGC",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 18.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 15000, power_kw: 15.0, torque_nm: 100.0, taper: "BT30" },
    tool_changer: { type: "arm", capacity: 18, change_time_sec: 2.5 },
  },
  {
    brand: "Haas",
    model: "HAAS DM-2",
    type: "VMC",
    controller: "Haas Haas Haas NGC",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 18.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 15000, power_kw: 15.0, torque_nm: 100.0, taper: "BT30" },
    tool_changer: { type: "arm", capacity: 18, change_time_sec: 2.5 },
  },
  {
    brand: "Haas",
    model: "HAAS GM-2",
    type: "bridge",
    controller: "Haas Haas Haas NGC",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 10.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 8100, power_kw: 15.0, torque_nm: 100.0, taper: "CAT40" },
    tool_changer: { type: "side_mount", capacity: 10, change_time_sec: 3.0 },
  },
  {
    brand: "Haas",
    model: "HAAS Desktop Mill",
    type: "VMC",
    controller: "Haas Haas Haas NGC",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 10.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 6000, power_kw: 15.0, torque_nm: 100.0, taper: "CAT40" },
    tool_changer: { type: "side_mount", capacity: 10, change_time_sec: 3.0 },
  },
  {
    brand: "Haas",
    model: "HAAS Super Mini Mill",
    type: "VMC",
    controller: "Haas Haas Haas NGC",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 10.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 15.0, torque_nm: 100.0, taper: "CAT40" },
    tool_changer: { type: "side_mount", capacity: 10, change_time_sec: 3.0 },
  },
  {
    brand: "Haas",
    model: "HAAS VF-2YT",
    type: "VMC",
    controller: "Haas Haas Haas NGC",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 24.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 8100, power_kw: 15.0, torque_nm: 100.0, taper: "CAT40" },
    tool_changer: { type: "arm", capacity: 24, change_time_sec: 2.5 },
  },
  {
    brand: "Haas",
    model: "HAAS VF-2SSYT",
    type: "VMC",
    controller: "Haas Haas Haas NGC",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 24.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 12000, power_kw: 15.0, torque_nm: 100.0, taper: "CAT40" },
    tool_changer: { type: "arm", capacity: 24, change_time_sec: 2.5 },
  },
  {
    brand: "Haas",
    model: "HAAS VF-3YT-50",
    type: "VMC",
    controller: "Haas Haas Haas NGC",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 24.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 7500, power_kw: 15.0, torque_nm: 100.0, taper: "CAT50" },
    tool_changer: { type: "arm", capacity: 24, change_time_sec: 2.5 },
  },
  {
    brand: "Haas",
    model: "HAAS VF-10",
    type: "VMC",
    controller: "Haas Haas Haas NGC",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 24.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 8100, power_kw: 15.0, torque_nm: 100.0, taper: "CAT40" },
    tool_changer: { type: "arm", capacity: 24, change_time_sec: 2.5 },
  },
  {
    brand: "Haas",
    model: "HAAS VF-11-40",
    type: "VMC",
    controller: "Haas Haas Haas NGC",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 30.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 8100, power_kw: 15.0, torque_nm: 100.0, taper: "CAT40" },
    tool_changer: { type: "arm", capacity: 30, change_time_sec: 2.5 },
  },
  {
    brand: "Haas",
    model: "HAAS VF-12-50",
    type: "VMC",
    controller: "Haas Haas Haas NGC",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 30.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 7500, power_kw: 15.0, torque_nm: 100.0, taper: "CAT50" },
    tool_changer: { type: "arm", capacity: 30, change_time_sec: 2.5 },
  },
  {
    brand: "Haas",
    model: "HAAS UMC-500SS",
    type: "5axis",
    controller: "Haas Haas Haas NGC",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 40.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 15000, power_kw: 15.0, torque_nm: 100.0, taper: "CAT40" },
    tool_changer: { type: "carousel", capacity: 40, change_time_sec: 4.0 },
  },
  {
    brand: "Haas",
    model: "HAAS UMC-1250",
    type: "5axis",
    controller: "Haas Haas Haas NGC",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 40.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 8100, power_kw: 15.0, torque_nm: 100.0, taper: "CAT40" },
    tool_changer: { type: "carousel", capacity: 40, change_time_sec: 4.0 },
  },
  {
    brand: "Haas",
    model: "HAAS GM-2-5AX",
    type: "5axis",
    controller: "Haas Haas Haas NGC",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 10.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 8100, power_kw: 15.0, torque_nm: 100.0, taper: "CAT40" },
    tool_changer: { type: "side_mount", capacity: 10, change_time_sec: 3.0 },
  },
  {
    brand: "Haas",
    model: "HAAS VF-4SS with TRT210 Trunnion",
    type: "5axis",
    controller: "Haas Haas Haas NGC",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 24.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 12000, power_kw: 15.0, torque_nm: 100.0, taper: "CAT40" },
    tool_changer: { type: "arm", capacity: 24, change_time_sec: 2.5 },
  },
  {
    brand: "Hardinge",
    model: "GS 150",
    type: "lathe",
    controller: "Fanuc",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 24.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 24.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 5.5, torque_nm: 100.0, taper: "BT40" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Hardinge",
    model: "GS 200",
    type: "lathe",
    controller: "Fanuc",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 24.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 24.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 7.5, torque_nm: 100.0, taper: "BT40" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Hardinge",
    model: "Hardinge GS 250MSY",
    type: "lathe",
    controller: "Fanuc Fanuc 0i-TF Plus",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 4000, power_kw: 22.0, torque_nm: 350.0, taper: "A2-8" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Hardinge",
    model: "Hardinge GS 300MSY",
    type: "lathe",
    controller: "Fanuc Fanuc 0i-TF Plus",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 3500, power_kw: 26.0, torque_nm: 430.0, taper: "A2-8" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Hardinge",
    model: "Hardinge Bridgeport V 710",
    type: "VMC",
    controller: "Fanuc Fanuc 0i-MF",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 24.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 12000, power_kw: 18.5, torque_nm: 119.0, taper: "BT40" },
    tool_changer: { type: "arm", capacity: 24, change_time_sec: 2.5 },
  },
  {
    brand: "Hardinge",
    model: "Hardinge Bridgeport V 1000",
    type: "VMC",
    controller: "Fanuc Fanuc 0i-MF",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 30.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 22.0, torque_nm: 175.0, taper: "CAT50" },
    tool_changer: { type: "arm", capacity: 30, change_time_sec: 2.5 },
  },
  {
    brand: "Hardinge",
    model: "Hardinge QUEST 62",
    type: "lathe",
    controller: "Fanuc Fanuc 0i-TF",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 4500, power_kw: 18.5, torque_nm: 250.0, taper: "A2-6" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Hardinge",
    model: "Hardinge QUEST 100",
    type: "lathe",
    controller: "Fanuc Fanuc 0i-TF",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 2500, power_kw: 30.0, torque_nm: 600.0, taper: "A2-11" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Hartford",
    model: "Hartford LG-1000",
    type: "VMC",
    controller: "Fanuc Fanuc 0i-MF",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 24.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 15.0, torque_nm: 95.0, taper: "BT40" },
    tool_changer: { type: "arm", capacity: 24, change_time_sec: 2.5 },
  },
  {
    brand: "Hartford",
    model: "Hartford PRO-1000",
    type: "VMC",
    controller: "Fanuc Fanuc 0i-MF",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 24.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 12000, power_kw: 18.5, torque_nm: 119.0, taper: "BT40" },
    tool_changer: { type: "arm", capacity: 24, change_time_sec: 2.5 },
  },
  {
    brand: "Hartford",
    model: "Hartford 5A-65",
    type: "5axis",
    controller: "Fanuc Fanuc 31i-B5",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 30.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 12000, power_kw: 22.0, torque_nm: 120.0, taper: "BT40" },
    tool_changer: { type: "arm", capacity: 30, change_time_sec: 2.5 },
  },
  {
    brand: "Heller",
    model: "Heller H 2000",
    type: "HMC",
    controller: "Siemens Siemens SINUMERIK 840D sl",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 60.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 12000, power_kw: 29.0, torque_nm: 148.0, taper: "HSK-A63" },
    tool_changer: { type: "carousel", capacity: 60, change_time_sec: 4.0 },
  },
  {
    brand: "Heller",
    model: "Heller H 4000",
    type: "HMC",
    controller: "Siemens Siemens SINUMERIK 840D sl",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 80.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 37.0, torque_nm: 250.0, taper: "HSK-A63" },
    tool_changer: { type: "chain", capacity: 80, change_time_sec: 3.0 },
  },
  {
    brand: "Heller",
    model: "Heller H 6000",
    type: "HMC",
    controller: "Siemens Siemens SINUMERIK 840D sl",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 120.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 8000, power_kw: 52.0, torque_nm: 500.0, taper: "HSK-A100" },
    tool_changer: { type: "chain", capacity: 120, change_time_sec: 3.0 },
  },
  {
    brand: "Heller",
    model: "Heller FP 4000",
    type: "5axis",
    controller: "Siemens Siemens SINUMERIK 840D sl",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 60.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 18000, power_kw: 29.0, torque_nm: 87.0, taper: "HSK-A63" },
    tool_changer: { type: "carousel", capacity: 60, change_time_sec: 4.0 },
  },
  {
    brand: "Heller",
    model: "Heller FP 6000",
    type: "5axis",
    controller: "Siemens Siemens SINUMERIK 840D sl",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 80.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 12000, power_kw: 52.0, torque_nm: 500.0, taper: "HSK-A100" },
    tool_changer: { type: "chain", capacity: 80, change_time_sec: 3.0 },
  },
  {
    brand: "Heller",
    model: "Heller CP 2000",
    type: "HMC",
    controller: "Siemens Siemens SINUMERIK 840D sl",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 40.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 15000, power_kw: 29.0, torque_nm: 87.0, taper: "HSK-A63" },
    tool_changer: { type: "carousel", capacity: 40, change_time_sec: 4.0 },
  },
  {
    brand: "Heller",
    model: "Heller HF 3500",
    type: "VMC",
    controller: "Siemens Siemens SINUMERIK 840D sl",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 50.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 29.0, torque_nm: 148.0, taper: "CAT40" },
    tool_changer: { type: "carousel", capacity: 50, change_time_sec: 4.0 },
  },
  {
    brand: "Heller",
    model: "Heller HF 5500",
    type: "VMC",
    controller: "Siemens Siemens SINUMERIK 840D sl",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 80.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 44.0, torque_nm: 405.0, taper: "CAT40" },
    tool_changer: { type: "chain", capacity: 80, change_time_sec: 3.0 },
  },
  {
    brand: "Hermle",
    model: "C 42 U",
    type: "VMC",
    controller: "Heidenhain",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 50.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 18000, power_kw: 35.0, torque_nm: 175.0, taper: "BT40" },
    tool_changer: { type: "carousel", capacity: 50, change_time_sec: 4.0 },
  },
  {
    brand: "Hermle",
    model: "C 52 U",
    type: "VMC",
    controller: "Heidenhain",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 60.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 12000, power_kw: 45.0, torque_nm: 400.0, taper: "BT40" },
    tool_changer: { type: "carousel", capacity: 60, change_time_sec: 4.0 },
  },
  {
    brand: "Hermle",
    model: "C 22 U",
    type: "VMC",
    controller: "Heidenhain",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 30.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 18000, power_kw: 29.0, torque_nm: 110.0, taper: "BT40" },
    tool_changer: { type: "arm", capacity: 30, change_time_sec: 2.5 },
  },
  {
    brand: "Hermle",
    model: "C 12 U",
    type: "VMC",
    controller: "Heidenhain",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 42000, power_kw: 16.0, torque_nm: 9.0, taper: "BT40" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Hermle",
    model: "C 42 U MT",
    type: "mill_turn",
    controller: "Heidenhain",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 87.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 12000, power_kw: 35.0, torque_nm: 353.0, taper: "BT40" },
    tool_changer: { type: "chain", capacity: 87, change_time_sec: 3.0 },
  },
  {
    brand: "Hermle",
    model: "C 32 U HS",
    type: "VMC",
    controller: "Heidenhain",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 52.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 42000, power_kw: 29.0, torque_nm: 8.0, taper: "BT40" },
    tool_changer: { type: "carousel", capacity: 52, change_time_sec: 4.0 },
  },
  {
    brand: "Hermle",
    model: "C 32 U with RS 05",
    type: "VMC",
    controller: "Heidenhain",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 88.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 18000, power_kw: 29.0, torque_nm: 145.0, taper: "BT40" },
    tool_changer: { type: "chain", capacity: 88, change_time_sec: 3.0 },
  },
  {
    brand: "Hermle",
    model: "Hermle C 52 U MT",
    type: "mill_turn",
    controller: "Heidenhain Heidenhain TNC 640",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 60.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 18000, power_kw: 44.0, torque_nm: 200.0, taper: "HSK-A63" },
    tool_changer: { type: "carousel", capacity: 60, change_time_sec: 4.0 },
  },
  {
    brand: "Hermle",
    model: "Hermle C 62 U MT",
    type: "mill_turn",
    controller: "Heidenhain Heidenhain TNC 640",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 80.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 12000, power_kw: 58.0, torque_nm: 430.0, taper: "HSK-A100" },
    tool_changer: { type: "chain", capacity: 80, change_time_sec: 3.0 },
  },
  {
    brand: "Hermle",
    model: "Hermle C 250",
    type: "5axis",
    controller: "Heidenhain Heidenhain TNC 640",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 30.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 15000, power_kw: 25.0, torque_nm: 130.0, taper: "HSK-A63" },
    tool_changer: { type: "arm", capacity: 30, change_time_sec: 2.5 },
  },
  {
    brand: "Hermle",
    model: "Hermle C 650",
    type: "5axis",
    controller: "Heidenhain Heidenhain TNC 640",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 50.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 12000, power_kw: 35.0, torque_nm: 200.0, taper: "HSK-A63" },
    tool_changer: { type: "carousel", capacity: 50, change_time_sec: 4.0 },
  },
  {
    brand: "Hurco",
    model: "Hurco BX40i",
    type: "VMC",
    controller: "Hurco Hurco WinMax",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 40.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 15.0, torque_nm: 95.0, taper: "CAT40" },
    tool_changer: { type: "carousel", capacity: 40, change_time_sec: 4.0 },
  },
  {
    brand: "Hurco",
    model: "Hurco BX50i",
    type: "VMC",
    controller: "Hurco Hurco WinMax",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 40.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 22.0, torque_nm: 175.0, taper: "CAT40" },
    tool_changer: { type: "carousel", capacity: 40, change_time_sec: 4.0 },
  },
  {
    brand: "Hurco",
    model: "Hurco DCX3226i",
    type: "VMC",
    controller: "Hurco Hurco WinMax",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 40.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 26.0, torque_nm: 330.0, taper: "CAT40" },
    tool_changer: { type: "carousel", capacity: 40, change_time_sec: 4.0 },
  },
  {
    brand: "Hurco",
    model: "Hurco DCX32 5Si",
    type: "VMC",
    controller: "Hurco Hurco WinMax",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 40.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 37.0, torque_nm: 440.0, taper: "CAT40" },
    tool_changer: { type: "carousel", capacity: 40, change_time_sec: 4.0 },
  },
  {
    brand: "Hurco",
    model: "Hurco HBMX 55 i",
    type: "VMC",
    controller: "Hurco Hurco WinMax",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 15.0, torque_nm: 100.0, taper: "CAT40" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Hurco",
    model: "Hurco HBMX 80 i",
    type: "VMC",
    controller: "Hurco Hurco WinMax",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 15.0, torque_nm: 100.0, taper: "CAT40" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Hurco",
    model: "Hurco Hurco VMX 42 SR",
    type: "VMC",
    controller: "Hurco Hurco WinMax",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 30.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 22.0, torque_nm: 175.0, taper: "CAT40" },
    tool_changer: { type: "arm", capacity: 30, change_time_sec: 2.5 },
  },
  {
    brand: "Hurco",
    model: "Hurco VMX24i",
    type: "VMC",
    controller: "Hurco Hurco WinMax",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 24.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 15.0, torque_nm: 119.0, taper: "CAT40" },
    tool_changer: { type: "arm", capacity: 24, change_time_sec: 2.5 },
  },
  {
    brand: "Hurco",
    model: "Hurco VMX60SWi",
    type: "VMC",
    controller: "Hurco Hurco WinMax",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 40.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 22.0, torque_nm: 220.0, taper: "CAT40" },
    tool_changer: { type: "carousel", capacity: 40, change_time_sec: 4.0 },
  },
  {
    brand: "Hurco",
    model: "Hurco VMX 24 HSi",
    type: "VMC",
    controller: "Hurco Hurco WinMax",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 15.0, torque_nm: 100.0, taper: "CAT40" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Hurco",
    model: "Hurco VMX 24 HSi 4ax",
    type: "VMC",
    controller: "Hurco Hurco WinMax",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 15.0, torque_nm: 100.0, taper: "CAT40" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Hurco",
    model: "Hurco VMX 42T 4ax",
    type: "VMC",
    controller: "Hurco Hurco WinMax",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 15.0, torque_nm: 100.0, taper: "CAT40" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Hurco",
    model: "Hurco VMX 42 Ui XP40 STA",
    type: "VMC",
    controller: "Hurco Hurco WinMax",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 15.0, torque_nm: 100.0, taper: "CAT40" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Hurco",
    model: "Hurco VMX 60 SRi",
    type: "VMC",
    controller: "Hurco Hurco WinMax",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 15.0, torque_nm: 100.0, taper: "CAT40" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Hurco",
    model: "Hurco VMX 84 SWi",
    type: "VMC",
    controller: "Hurco Hurco WinMax",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 15.0, torque_nm: 100.0, taper: "CAT40" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Hurco",
    model: "Hurco VM 10 HSi Plus",
    type: "VMC",
    controller: "Hurco Hurco WinMax",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 11.0, torque_nm: 35.0, taper: "CAT40" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Hurco",
    model: "Hurco VM 10 UHSi",
    type: "VMC",
    controller: "Hurco Hurco WinMax",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 11.0, torque_nm: 20.0, taper: "CAT40" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Hurco",
    model: "Hurco VM 20i",
    type: "VMC",
    controller: "Hurco Hurco WinMax",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 24.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 15.0, torque_nm: 119.0, taper: "CAT40" },
    tool_changer: { type: "arm", capacity: 24, change_time_sec: 2.5 },
  },
  {
    brand: "Hurco",
    model: "Hurco VM 30 i",
    type: "VMC",
    controller: "Hurco Hurco WinMax",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 24.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 18.5, torque_nm: 147.0, taper: "CAT40" },
    tool_changer: { type: "arm", capacity: 24, change_time_sec: 2.5 },
  },
  {
    brand: "Hurco",
    model: "Hurco VM 50 i",
    type: "VMC",
    controller: "Hurco Hurco WinMax",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 30.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 22.0, torque_nm: 220.0, taper: "CAT40" },
    tool_changer: { type: "arm", capacity: 30, change_time_sec: 2.5 },
  },
  {
    brand: "Hurco",
    model: "Hurco VM 5i",
    type: "VMC",
    controller: "Hurco Hurco WinMax",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 7.5, torque_nm: 24.0, taper: "CAT40" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Hurco",
    model: "Hurco VM One",
    type: "VMC",
    controller: "Hurco Hurco WinMax",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 10.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 5.5, torque_nm: 17.0, taper: "CAT40" },
    tool_changer: { type: "side_mount", capacity: 10, change_time_sec: 3.0 },
  },
  {
    brand: "Hurco",
    model: "Hurco HM1700Ri",
    type: "HMC",
    controller: "Hurco Hurco WinMax",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 50.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 50.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 50.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 15.0, torque_nm: 100.0, taper: "BT50" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Hurco",
    model: "Hurco VMX42SWi",
    type: "5axis",
    controller: "Hurco Hurco WinMax",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 12000, power_kw: 15.0, torque_nm: 100.0, taper: "CAT40" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Hurco",
    model: "Hurco VMX6030i",
    type: "VMC",
    controller: "Hurco Hurco WinMax",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 15.0, torque_nm: 100.0, taper: "BT50" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Hurco",
    model: "Hurco VMX60Ui",
    type: "5axis",
    controller: "Hurco Hurco WinMax",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 15.0, torque_nm: 100.0, taper: "BT50" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Hurco",
    model: "Hurco VC500i",
    type: "VMC",
    controller: "Hurco Hurco WinMax",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 12000, power_kw: 15.0, torque_nm: 100.0, taper: "CAT40" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Hurco",
    model: "Hurco VMX30Ui",
    type: "5axis",
    controller: "Hurco Hurco WinMax",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 12000, power_kw: 15.0, torque_nm: 100.0, taper: "CAT40" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Hurco",
    model: "Hurco BX 40 Ui",
    type: "5axis",
    controller: "Hurco Hurco WinMax",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 15.0, torque_nm: 100.0, taper: "CAT40" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Hurco",
    model: "Hurco VMX 30 UDi",
    type: "5axis",
    controller: "Hurco Hurco WinMax",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 15000, power_kw: 15.0, torque_nm: 100.0, taper: "HSK-A63" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Hurco",
    model: "Hurco VCX600i XP",
    type: "5axis",
    controller: "Hurco Hurco WinMax",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 12000, power_kw: 15.0, torque_nm: 100.0, taper: "CAT40" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Hurco",
    model: "Hurco VMX60SRTi",
    type: "5axis",
    controller: "Hurco Hurco WinMax",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 15.0, torque_nm: 100.0, taper: "BT50" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Hurco",
    model: "Hurco VM10Ui",
    type: "5axis",
    controller: "Hurco Hurco WinMax",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 12000, power_kw: 15.0, torque_nm: 100.0, taper: "CAT40" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Hurco",
    model: "Hurco VMX 84 i",
    type: "VMC",
    controller: "Hurco Hurco WinMax",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 15.0, torque_nm: 100.0, taper: "BT50" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Hurco",
    model: "Hurco VMX42Di",
    type: "5axis",
    controller: "Hurco Hurco WinMax",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 15000, power_kw: 15.0, torque_nm: 100.0, taper: "HSK-A63" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Hurco",
    model: "Hurco VMX30i",
    type: "VMC",
    controller: "Hurco Hurco WinMax",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 12000, power_kw: 15.0, torque_nm: 100.0, taper: "CAT40" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Hurco",
    model: "Hurco VM 60 i",
    type: "VMC",
    controller: "Hurco Hurco WinMax",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 15.0, torque_nm: 100.0, taper: "BT50" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Hurco",
    model: "Hurco DCX 22 i",
    type: "bridge",
    controller: "Hurco Hurco WinMax",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 8000, power_kw: 15.0, torque_nm: 100.0, taper: "BT50" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Hyundai WIA",
    model: "Hyundai WIA F500 Plus",
    type: "VMC",
    controller: "Fanuc Fanuc 31i-B",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 24.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 12000, power_kw: 18.5, torque_nm: 119.0, taper: "BT40" },
    tool_changer: { type: "arm", capacity: 24, change_time_sec: 2.5 },
  },
  {
    brand: "Hyundai WIA",
    model: "Hyundai WIA KF5600",
    type: "VMC",
    controller: "Fanuc Fanuc 31i-B",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 30.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 12000, power_kw: 22.0, torque_nm: 175.0, taper: "BT40" },
    tool_changer: { type: "arm", capacity: 30, change_time_sec: 2.5 },
  },
  {
    brand: "Hyundai WIA",
    model: "Hyundai WIA HS5000",
    type: "HMC",
    controller: "Fanuc Fanuc 31i-B",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 60.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 30.0, torque_nm: 500.0, taper: "BT50" },
    tool_changer: { type: "carousel", capacity: 60, change_time_sec: 4.0 },
  },
  {
    brand: "Hyundai WIA",
    model: "Hyundai WIA XF6300 5AX",
    type: "5axis",
    controller: "Fanuc Fanuc 31i-B5",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 30.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 12000, power_kw: 22.0, torque_nm: 120.0, taper: "HSK-A63" },
    tool_changer: { type: "arm", capacity: 30, change_time_sec: 2.5 },
  },
  {
    brand: "Hyundai WIA",
    model: "Hyundai WIA LM1800TTSY",
    type: "lathe",
    controller: "Fanuc Fanuc 31i-B",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 5000, power_kw: 15.0, torque_nm: 155.0, taper: "A2-6" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Hyundai WIA",
    model: "Hyundai WIA L2000LSY",
    type: "lathe",
    controller: "Fanuc Fanuc 31i-B",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 4500, power_kw: 18.5, torque_nm: 240.0, taper: "A2-6" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Hyundai WIA",
    model: "Hyundai WIA L4000M",
    type: "lathe",
    controller: "Fanuc Fanuc 31i-B",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 2500, power_kw: 30.0, torque_nm: 600.0, taper: "A2-11" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Hyundai WIA",
    model: "Hyundai WIA F500D/50 5AX",
    type: "5axis",
    controller: "Fanuc Fanuc 31i-B5",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 30.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 12000, power_kw: 22.0, torque_nm: 175.0, taper: "BT40" },
    tool_changer: { type: "arm", capacity: 30, change_time_sec: 2.5 },
  },
  {
    brand: "Hyundai WIA",
    model: "Hyundai WIA KF5600 II",
    type: "VMC",
    controller: "Fanuc Fanuc 0i-MF Plus",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 30.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 12000, power_kw: 22.0, torque_nm: 175.0, taper: "BT40" },
    tool_changer: { type: "arm", capacity: 30, change_time_sec: 2.5 },
  },
  {
    brand: "Hyundai WIA",
    model: "Hyundai WIA KF7600",
    type: "VMC",
    controller: "Fanuc Fanuc 0i-MF Plus",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 30.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 8000, power_kw: 30.0, torque_nm: 350.0, taper: "CAT50" },
    tool_changer: { type: "arm", capacity: 30, change_time_sec: 2.5 },
  },
  {
    brand: "Hyundai WIA",
    model: "Hyundai WIA HS5000i",
    type: "HMC",
    controller: "Fanuc Fanuc 31i-B5",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 60.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 12000, power_kw: 22.0, torque_nm: 175.0, taper: "BT40" },
    tool_changer: { type: "carousel", capacity: 60, change_time_sec: 4.0 },
  },
  {
    brand: "Hyundai WIA",
    model: "Hyundai WIA HS6300",
    type: "HMC",
    controller: "Fanuc Fanuc 31i-B5",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 80.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 8000, power_kw: 37.0, torque_nm: 500.0, taper: "CAT50" },
    tool_changer: { type: "chain", capacity: 80, change_time_sec: 3.0 },
  },
  {
    brand: "Hyundai WIA",
    model: "Hyundai WIA L2000SY",
    type: "lathe",
    controller: "Fanuc Fanuc 0i-TF Plus",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 4500, power_kw: 18.5, torque_nm: 250.0, taper: "A2-6" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Hyundai WIA",
    model: "Hyundai WIA L300MSC",
    type: "lathe",
    controller: "Fanuc Fanuc 0i-TF Plus",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 3500, power_kw: 22.0, torque_nm: 400.0, taper: "A2-8" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Hyundai WIA",
    model: "Hyundai WIA L400MA",
    type: "lathe",
    controller: "Fanuc Fanuc 0i-TF Plus",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 2500, power_kw: 30.0, torque_nm: 600.0, taper: "A2-11" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Hyundai WIA",
    model: "Hyundai WIA i-CUT 380T",
    type: "VMC",
    controller: "Fanuc Fanuc 0i-MF Plus",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 24.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 12000, power_kw: 15.0, torque_nm: 95.0, taper: "BT40" },
    tool_changer: { type: "arm", capacity: 24, change_time_sec: 2.5 },
  },
  {
    brand: "Index",
    model: "Index G420",
    type: "lathe",
    controller: "Siemens Siemens SINUMERIK 840D sl",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 4500, power_kw: 33.0, torque_nm: 290.0, taper: "collet_90mm" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Index",
    model: "Index R200",
    type: "lathe",
    controller: "Siemens Siemens SINUMERIK 840D sl",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 6000, power_kw: 21.0, torque_nm: 150.0, taper: "BT40" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Index",
    model: "Index MS32C-6",
    type: "VMC",
    controller: "Siemens Siemens SINUMERIK 840D sl",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 7000, power_kw: 13.0, torque_nm: 22.0, taper: "collet_32mm" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Index",
    model: "Index MS40C-8",
    type: "VMC",
    controller: "Siemens Siemens SINUMERIK 840D sl",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 6000, power_kw: 17.0, torque_nm: 35.0, taper: "collet_40mm" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Index",
    model: "Index C100",
    type: "lathe",
    controller: "Siemens Siemens SINUMERIK 840D sl",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 6000, power_kw: 21.0, torque_nm: 150.0, taper: "collet_65mm" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Index",
    model: "Index C200",
    type: "lathe",
    controller: "Siemens Siemens SINUMERIK 840D sl",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 4500, power_kw: 33.0, torque_nm: 290.0, taper: "collet_90mm" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Index",
    model: "Index MS22C-8",
    type: "VMC",
    controller: "Siemens Siemens SINUMERIK 840D sl",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 8000, power_kw: 10.0, torque_nm: 16.0, taper: "collet_22mm" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Index",
    model: "Index G220",
    type: "lathe",
    controller: "Siemens Siemens SINUMERIK 840D sl",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 6000, power_kw: 21.0, torque_nm: 150.0, taper: "collet_65mm" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Kern",
    model: "Kern Evo",
    type: "VMC",
    controller: "Heidenhain Heidenhain TNC 640",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 30.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 14.0, torque_nm: 14.0, taper: "CAT40" },
    tool_changer: { type: "arm", capacity: 30, change_time_sec: 2.5 },
  },
  {
    brand: "Kern",
    model: "Kern Evo 5AX",
    type: "5axis",
    controller: "Heidenhain Heidenhain TNC 640",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 30.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 14.0, torque_nm: 14.0, taper: "CAT40" },
    tool_changer: { type: "arm", capacity: 30, change_time_sec: 2.5 },
  },
  {
    brand: "Kern",
    model: "Kern Micro Vario HD",
    type: "VMC",
    controller: "Heidenhain Heidenhain TNC 640",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 96.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 7.5, torque_nm: 6.0, taper: "CAT40" },
    tool_changer: { type: "chain", capacity: 96, change_time_sec: 3.0 },
  },
  {
    brand: "Kern",
    model: "Kern Pyramid Nano",
    type: "VMC",
    controller: "Heidenhain Heidenhain TNC 640",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 75.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 19.0, torque_nm: 19.0, taper: "CAT40" },
    tool_changer: { type: "chain", capacity: 75, change_time_sec: 3.0 },
  },
  {
    brand: "Leadwell",
    model: "Leadwell V-40iT",
    type: "5axis",
    controller: "Fanuc Fanuc 0i-MF",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 24.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 12000, power_kw: 18.5, torque_nm: 119.0, taper: "BT40" },
    tool_changer: { type: "arm", capacity: 24, change_time_sec: 2.5 },
  },
  {
    brand: "Leadwell",
    model: "Leadwell MCV-1500iP",
    type: "VMC",
    controller: "Fanuc Fanuc 0i-MF",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 24.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 8000, power_kw: 22.0, torque_nm: 175.0, taper: "CAT50" },
    tool_changer: { type: "arm", capacity: 24, change_time_sec: 2.5 },
  },
  {
    brand: "Leadwell",
    model: "Leadwell T-8M",
    type: "lathe",
    controller: "Fanuc Fanuc 0i-TF",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 3500, power_kw: 22.0, torque_nm: 350.0, taper: "A2-8" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Leadwell",
    model: "Leadwell T-6SMY",
    type: "lathe",
    controller: "Fanuc Fanuc 0i-TF",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 4500, power_kw: 15.0, torque_nm: 180.0, taper: "A2-6" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Leadwell",
    model: "Leadwell LTC-35XL",
    type: "lathe",
    controller: "Fanuc Fanuc 0i-TF",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 2500, power_kw: 30.0, torque_nm: 500.0, taper: "A2-11" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Makino",
    model: "Makino a51nx",
    type: "VMC",
    controller: "Fanuc Makino Professional 6",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 14000, power_kw: 22.0, torque_nm: 120.0, taper: "HSK-A63" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Makino",
    model: "Makino a61nx",
    type: "VMC",
    controller: "Fanuc Makino Professional 6",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 30.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 14000, power_kw: 26.0, torque_nm: 120.0, taper: "HSK-A63" },
    tool_changer: { type: "arm", capacity: 30, change_time_sec: 2.5 },
  },
  {
    brand: "Makino",
    model: "Makino a81nx",
    type: "VMC",
    controller: "Fanuc Makino Professional 6",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 40.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 37.0, torque_nm: 350.0, taper: "HSK-A100" },
    tool_changer: { type: "carousel", capacity: 40, change_time_sec: 4.0 },
  },
  {
    brand: "Makino",
    model: "Makino a40",
    type: "HMC",
    controller: "Fanuc Makino Professional 6",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 40.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 14000, power_kw: 22.0, torque_nm: 120.0, taper: "HSK-A63" },
    tool_changer: { type: "carousel", capacity: 40, change_time_sec: 4.0 },
  },
  {
    brand: "Makino",
    model: "Makino a51",
    type: "HMC",
    controller: "Fanuc Makino Professional 6",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 60.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 14000, power_kw: 22.0, torque_nm: 120.0, taper: "HSK-A63" },
    tool_changer: { type: "carousel", capacity: 60, change_time_sec: 4.0 },
  },
  {
    brand: "Makino",
    model: "Makino a61",
    type: "HMC",
    controller: "Fanuc Makino Professional 6",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 60.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 12000, power_kw: 30.0, torque_nm: 200.0, taper: "HSK-A63" },
    tool_changer: { type: "carousel", capacity: 60, change_time_sec: 4.0 },
  },
  {
    brand: "Makino",
    model: "Makino a81",
    type: "HMC",
    controller: "Fanuc Makino Professional 6",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 79.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 8000, power_kw: 37.0, torque_nm: 700.0, taper: "CAT50" },
    tool_changer: { type: "chain", capacity: 79, change_time_sec: 3.0 },
  },
  {
    brand: "Makino",
    model: "Makino a100e",
    type: "HMC",
    controller: "Fanuc Makino Professional 6",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 106.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 6000, power_kw: 45.0, torque_nm: 900.0, taper: "CAT50" },
    tool_changer: { type: "chain", capacity: 106, change_time_sec: 3.0 },
  },
  {
    brand: "Makino",
    model: "Makino F3",
    type: "VMC",
    controller: "Fanuc Makino Professional 6",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 15.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 30000, power_kw: 15.0, torque_nm: 10.0, taper: "HSK-E40" },
    tool_changer: { type: "arm", capacity: 15, change_time_sec: 2.5 },
  },
  {
    brand: "Makino",
    model: "Makino F9",
    type: "VMC",
    controller: "Fanuc Makino Professional 6",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 30.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 14000, power_kw: 30.0, torque_nm: 200.0, taper: "HSK-A63" },
    tool_changer: { type: "arm", capacity: 30, change_time_sec: 2.5 },
  },
  {
    brand: "Makino",
    model: "Makino U6 H.E.A.T.",
    type: "edm_wire",
    controller: "Fanuc Makino Hyper-i",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 15.0, torque_nm: 100.0, taper: "BT40" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Makino",
    model: "Makino a92",
    type: "VMC",
    controller: "Fanuc Makino Professional 6",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 40.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 37.0, torque_nm: 350.0, taper: "HSK-A100" },
    tool_changer: { type: "carousel", capacity: 40, change_time_sec: 4.0 },
  },
  {
    brand: "Makino",
    model: "Makino a81M",
    type: "HMC",
    controller: "Fanuc Makino Professional 6",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 100.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 37.0, torque_nm: 350.0, taper: "HSK-A100" },
    tool_changer: { type: "chain", capacity: 100, change_time_sec: 3.0 },
  },
  {
    brand: "Makino",
    model: "Makino a120nx",
    type: "HMC",
    controller: "Fanuc Makino Professional 6",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 150.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 6000, power_kw: 55.0, torque_nm: 1100.0, taper: "CAT50" },
    tool_changer: { type: "chain", capacity: 150, change_time_sec: 3.0 },
  },
  {
    brand: "Makino",
    model: "Makino T2",
    type: "5axis",
    controller: "Fanuc Makino Professional 6",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 120.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 8000, power_kw: 52.0, torque_nm: 700.0, taper: "HSK-A100" },
    tool_changer: { type: "chain", capacity: 120, change_time_sec: 3.0 },
  },
  {
    brand: "Makino",
    model: "Makino EDAF2",
    type: "edm_sinker",
    controller: "Fanuc Makino Hyper-i",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 15.0, torque_nm: 100.0, taper: "BT40" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Makino",
    model: "Makino U86",
    type: "edm_wire",
    controller: "Fanuc Makino Hyper-i",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 15.0, torque_nm: 100.0, taper: "BT40" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Makino",
    model: "Makino D200Z",
    type: "VMC",
    controller: "Fanuc Makino Professional 6",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 22.0, torque_nm: 14.0, taper: "CAT40" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Makino",
    model: "Makino DA300",
    type: "VMC",
    controller: "Fanuc Makino Professional 6",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 60.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 22.0, torque_nm: 120.0, taper: "CAT40" },
    tool_changer: { type: "carousel", capacity: 60, change_time_sec: 4.0 },
  },
  {
    brand: "Matsuura",
    model: "Matsuura LX-160",
    type: "5axis",
    controller: "Fanuc Fanuc 31i-B5",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 30.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 30000, power_kw: 10.0, torque_nm: 6.0, taper: "HSK-E40" },
    tool_changer: { type: "arm", capacity: 30, change_time_sec: 2.5 },
  },
  {
    brand: "Matsuura",
    model: "Matsuura MAM72-25V",
    type: "5axis",
    controller: "Fanuc Fanuc 31i-B5",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 40.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 20000, power_kw: 22.0, torque_nm: 87.0, taper: "HSK-A63" },
    tool_changer: { type: "carousel", capacity: 40, change_time_sec: 4.0 },
  },
  {
    brand: "Matsuura",
    model: "Matsuura MAM72-100H",
    type: "5axis",
    controller: "Fanuc Fanuc 31i-B5",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 60.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 14000, power_kw: 30.0, torque_nm: 200.0, taper: "HSK-A63" },
    tool_changer: { type: "carousel", capacity: 60, change_time_sec: 4.0 },
  },
  {
    brand: "Matsuura",
    model: "Matsuura H.Plus-405",
    type: "HMC",
    controller: "Fanuc Fanuc 31i-B5",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 60.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 15000, power_kw: 22.0, torque_nm: 120.0, taper: "HSK-A63" },
    tool_changer: { type: "carousel", capacity: 60, change_time_sec: 4.0 },
  },
  {
    brand: "Matsuura",
    model: "Matsuura H.Plus-630",
    type: "HMC",
    controller: "Fanuc Fanuc 31i-B5",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 80.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 12000, power_kw: 30.0, torque_nm: 200.0, taper: "HSK-A63" },
    tool_changer: { type: "chain", capacity: 80, change_time_sec: 3.0 },
  },
  {
    brand: "Matsuura",
    model: "Matsuura H",
    type: "VMC",
    controller: "Fanuc Fanuc 31i-B5",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 40.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 22.0, torque_nm: 350.0, taper: "CAT40" },
    tool_changer: { type: "carousel", capacity: 40, change_time_sec: 4.0 },
  },
  {
    brand: "Matsuura",
    model: "Matsuura MAM72-35V",
    type: "VMC",
    controller: "Fanuc Fanuc 31i-B5",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 40.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 22.0, torque_nm: 120.0, taper: "CAT40" },
    tool_changer: { type: "carousel", capacity: 40, change_time_sec: 4.0 },
  },
  {
    brand: "Matsuura",
    model: "Matsuura MAM72-63V",
    type: "VMC",
    controller: "Fanuc Fanuc 31i-B5",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 40.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 30.0, torque_nm: 200.0, taper: "CAT40" },
    tool_changer: { type: "carousel", capacity: 40, change_time_sec: 4.0 },
  },
  {
    brand: "Matsuura",
    model: "Matsuura MX-330",
    type: "VMC",
    controller: "Fanuc Fanuc 31i-B5",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 90.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 22.0, torque_nm: 120.0, taper: "CAT40" },
    tool_changer: { type: "chain", capacity: 90, change_time_sec: 3.0 },
  },
  {
    brand: "Matsuura",
    model: "Matsuura MX-420",
    type: "VMC",
    controller: "Fanuc Fanuc 31i-B5",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 90.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 22.0, torque_nm: 120.0, taper: "CAT40" },
    tool_changer: { type: "chain", capacity: 90, change_time_sec: 3.0 },
  },
  {
    brand: "Matsuura",
    model: "Matsuura MX-520",
    type: "VMC",
    controller: "Fanuc Fanuc 31i-B5",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 90.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 30.0, torque_nm: 200.0, taper: "CAT40" },
    tool_changer: { type: "chain", capacity: 90, change_time_sec: 3.0 },
  },
  {
    brand: "Matsuura",
    model: "Matsuura VX-1000",
    type: "VMC",
    controller: "Fanuc Fanuc 31i-B5",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 30.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 30.0, torque_nm: 286.0, taper: "CAT40" },
    tool_changer: { type: "arm", capacity: 30, change_time_sec: 2.5 },
  },
  {
    brand: "Matsuura",
    model: "Matsuura VX-1500",
    type: "VMC",
    controller: "Fanuc Fanuc 31i-B5",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 30.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 30.0, torque_nm: 286.0, taper: "CAT40" },
    tool_changer: { type: "arm", capacity: 30, change_time_sec: 2.5 },
  },
  {
    brand: "Matsuura",
    model: "Matsuura VX-1500 WITH RNA-320R ROTARY TABLE",
    type: "VMC",
    controller: "Fanuc Fanuc 31i-B5",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 15.0, torque_nm: 100.0, taper: "CAT40" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Matsuura",
    model: "Matsuura VX-660",
    type: "VMC",
    controller: "Fanuc Fanuc 31i-B5",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 30.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 22.0, torque_nm: 175.0, taper: "CAT40" },
    tool_changer: { type: "arm", capacity: 30, change_time_sec: 2.5 },
  },
  {
    brand: "Mazak",
    model: "Mazak QT-COMPACT 200MS",
    type: "lathe",
    controller: "Mazak Mazak MAZATROL SmoothG",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 5000, power_kw: 15.0, torque_nm: 145.0, taper: "A2-6" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Mazak",
    model: "Mazak QT-COMPACT 300MSY",
    type: "lathe",
    controller: "Mazak Mazak MAZATROL SmoothG",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 4000, power_kw: 22.0, torque_nm: 350.0, taper: "A2-8" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Mazak",
    model: "Mazak QT-COMPACT 200ML",
    type: "lathe",
    controller: "Mazak Mazak MAZATROL SmoothG",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 5000, power_kw: 15.0, torque_nm: 145.0, taper: "A2-6" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Mazak",
    model: "Mazak QUICK TURN 600M-2U",
    type: "lathe",
    controller: "Mazak Mazak MAZATROL SmoothG",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 1600, power_kw: 52.0, torque_nm: 1400.0, taper: "A2-15" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Mazak",
    model: "Mazak QUICK TURN 200MY L",
    type: "lathe",
    controller: "Mazak Mazak MAZATROL SmoothG",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 5000, power_kw: 15.0, torque_nm: 180.0, taper: "A2-6" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Mazak",
    model: "Mazak INTEGREX e-420V/6 II",
    type: "mill_turn",
    controller: "Mazak Mazak MAZATROL SmoothX",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 40.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 1000, power_kw: 37.0, torque_nm: 3000.0, taper: "BT40" },
    tool_changer: { type: "carousel", capacity: 40, change_time_sec: 4.0 },
  },
  {
    brand: "Mazak",
    model: "Mazak INTEGREX e-820V/8 II",
    type: "mill_turn",
    controller: "Mazak Mazak MAZATROL SmoothX",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 60.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 1000, power_kw: 55.0, torque_nm: 5000.0, taper: "BT40" },
    tool_changer: { type: "carousel", capacity: 60, change_time_sec: 4.0 },
  },
  {
    brand: "Mazak",
    model: "Mazak INTEGREX e-1060V/10S II",
    type: "mill_turn",
    controller: "Mazak Mazak MAZATROL SmoothX",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 80.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 1000, power_kw: 75.0, torque_nm: 8000.0, taper: "BT40" },
    tool_changer: { type: "chain", capacity: 80, change_time_sec: 3.0 },
  },
  {
    brand: "Mazak",
    model: "Mazak INTEGREX e-420H/1600",
    type: "mill_turn",
    controller: "Mazak Mazak MAZATROL SmoothX",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 40.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 3500, power_kw: 30.0, torque_nm: 500.0, taper: "A2-8" },
    tool_changer: { type: "carousel", capacity: 40, change_time_sec: 4.0 },
  },
  {
    brand: "Mazak",
    model: "Mazak INTEGREX e-670H/3000",
    type: "mill_turn",
    controller: "Mazak Mazak MAZATROL SmoothX",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 60.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 2500, power_kw: 45.0, torque_nm: 1100.0, taper: "A2-11" },
    tool_changer: { type: "carousel", capacity: 60, change_time_sec: 4.0 },
  },
  {
    brand: "Mazak",
    model: "Mazak MULTIPLEX 6200 II",
    type: "lathe",
    controller: "Mazak Mazak MAZATROL SmoothG",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 5000, power_kw: 22.0, torque_nm: 250.0, taper: "A2-6" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Mazak",
    model: "Mazak MULTIPLEX 8200 II",
    type: "lathe",
    controller: "Mazak Mazak MAZATROL SmoothG",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 3500, power_kw: 30.0, torque_nm: 430.0, taper: "A2-8" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Mazak",
    model: "Mazak VTC-800/30SD",
    type: "VMC",
    controller: "Mazak Mazak MAZATROL SmoothG",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 30.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 30.0, torque_nm: 350.0, taper: "CAT50" },
    tool_changer: { type: "arm", capacity: 30, change_time_sec: 2.5 },
  },
  {
    brand: "Mazak",
    model: "Mazak VTC-300C II 5X",
    type: "5axis",
    controller: "Mazak Mazak MAZATROL SmoothX",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 30.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 12000, power_kw: 22.0, torque_nm: 175.0, taper: "BT40" },
    tool_changer: { type: "arm", capacity: 30, change_time_sec: 2.5 },
  },
  {
    brand: "Mazak",
    model: "Mazak VARIAXIS i-300",
    type: "5axis",
    controller: "Mazak Mazak MAZATROL SmoothX",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 30.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 20000, power_kw: 22.0, torque_nm: 87.0, taper: "HSK-A63" },
    tool_changer: { type: "arm", capacity: 30, change_time_sec: 2.5 },
  },
  {
    brand: "Mazak",
    model: "Mazak VARIAXIS i-600 GT-B",
    type: "mill_turn",
    controller: "Mazak Mazak MAZATROL SmoothX",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 40.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 12000, power_kw: 30.0, torque_nm: 200.0, taper: "HSK-A63" },
    tool_changer: { type: "carousel", capacity: 40, change_time_sec: 4.0 },
  },
  {
    brand: "Mazak",
    model: "Mazak VARIAXIS i-1050T",
    type: "mill_turn",
    controller: "Mazak Mazak MAZATROL SmoothX",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 60.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 37.0, torque_nm: 350.0, taper: "HSK-A100" },
    tool_changer: { type: "carousel", capacity: 60, change_time_sec: 4.0 },
  },
  {
    brand: "Mazak",
    model: "Mazak HCN-4000 NEO",
    type: "HMC",
    controller: "Mazak Mazak MAZATROL SmoothG",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 60.0 },
      { name: "Y", travel_mm: 40.0, rapid_m_min: 60.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 60.0 }
    ],
    spindle: { max_rpm: 15000, power_kw: 22.0, torque_nm: 119.0, taper: "BT40" },
    tool_changer: { type: "carousel", capacity: 40, change_time_sec: 4.0 },
  },
  {
    brand: "Mazak",
    model: "Mazak HCN-5000 NEO",
    type: "HMC",
    controller: "Mazak Mazak MAZATROL SmoothG",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 60.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 12000, power_kw: 30.0, torque_nm: 200.0, taper: "BT40" },
    tool_changer: { type: "carousel", capacity: 60, change_time_sec: 4.0 },
  },
  {
    brand: "Mazak",
    model: "Mazak HCN-10800 II",
    type: "HMC",
    controller: "Mazak Mazak MAZATROL SmoothG",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 120.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 6000, power_kw: 55.0, torque_nm: 1400.0, taper: "CAT50" },
    tool_changer: { type: "chain", capacity: 120, change_time_sec: 3.0 },
  },
  {
    brand: "Mazak",
    model: "Mazak VCN-410A II",
    type: "VMC",
    controller: "Mazak Mazak MAZATROL SmoothG",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 42.0 },
      { name: "Y", travel_mm: 24.0, rapid_m_min: 42.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 42.0 }
    ],
    spindle: { max_rpm: 12000, power_kw: 18.5, torque_nm: 119.0, taper: "BT40" },
    tool_changer: { type: "arm", capacity: 24, change_time_sec: 2.5 },
  },
  {
    brand: "Mazak",
    model: "Mazak VCN-530C II",
    type: "VMC",
    controller: "Mazak Mazak MAZATROL SmoothG",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 42.0 },
      { name: "Y", travel_mm: 30.0, rapid_m_min: 42.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 42.0 }
    ],
    spindle: { max_rpm: 12000, power_kw: 22.0, torque_nm: 175.0, taper: "BT40" },
    tool_changer: { type: "arm", capacity: 30, change_time_sec: 2.5 },
  },
  {
    brand: "Mazak",
    model: "Mazak OPTIPLEX 3015 NEO",
    type: "VMC",
    controller: "Mazak Mazak MAZATROL PreView",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 15.0, torque_nm: 100.0, taper: "BT40" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Mazak",
    model: "Mazak OPTIPLEX 4020 NEO",
    type: "VMC",
    controller: "Mazak Mazak MAZATROL PreView",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 15.0, torque_nm: 100.0, taper: "BT40" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Mazak",
    model: "Mazak VC-Ez 15",
    type: "VMC",
    controller: "Mazak Mazak MAZATROL SmoothEz",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 16.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 8000, power_kw: 11.0, torque_nm: 87.5, taper: "CAT40" },
    tool_changer: { type: "arm", capacity: 16, change_time_sec: 2.5 },
  },
  {
    brand: "Mazak",
    model: "Mazak MEGA 6800",
    type: "HMC",
    controller: "Mazak Mazak MAZATROL SmoothX",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 80.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 8000, power_kw: 45.0, torque_nm: 900.0, taper: "CAT50" },
    tool_changer: { type: "chain", capacity: 80, change_time_sec: 3.0 },
  },
  {
    brand: "Mazak",
    model: "Mazak MEGA 10800",
    type: "HMC",
    controller: "Mazak Mazak MAZATROL SmoothX",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 120.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 6000, power_kw: 55.0, torque_nm: 1400.0, taper: "CAT50" },
    tool_changer: { type: "chain", capacity: 120, change_time_sec: 3.0 },
  },
  {
    brand: "Mazak",
    model: "Mazak QUICK TURN 100MSY",
    type: "lathe",
    controller: "Mazak Mazak MAZATROL SmoothG",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 6000, power_kw: 11.0, torque_nm: 75.0, taper: "A2-5" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Mazak",
    model: "Mazak QUICK TURN 200MSY",
    type: "lathe",
    controller: "Mazak Mazak MAZATROL SmoothG",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 5000, power_kw: 15.0, torque_nm: 180.0, taper: "A2-6" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Mazak",
    model: "Mazak QUICK TURN 250MSY",
    type: "lathe",
    controller: "Mazak Mazak MAZATROL SmoothG",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 4000, power_kw: 22.0, torque_nm: 350.0, taper: "A2-8" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Mazak",
    model: "Mazak QUICK TURN 300MSY",
    type: "lathe",
    controller: "Mazak Mazak MAZATROL SmoothG",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 3500, power_kw: 26.0, torque_nm: 430.0, taper: "A2-8" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Mazak",
    model: "Mazak QUICK TURN 450M",
    type: "lathe",
    controller: "Mazak Mazak MAZATROL SmoothG",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 2500, power_kw: 37.0, torque_nm: 700.0, taper: "A2-11" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Mazak",
    model: "Mazak QUICK TURN 550",
    type: "lathe",
    controller: "Mazak Mazak MAZATROL SmoothG",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 2000, power_kw: 45.0, torque_nm: 1100.0, taper: "A2-15" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Mazak",
    model: "Mazak INTEGREX i-100ST",
    type: "mill_turn",
    controller: "Mazak Mazak MAZATROL SmoothX",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 5000, power_kw: 15.0, torque_nm: 180.0, taper: "BT40" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Mazak",
    model: "Mazak INTEGREX i-200ST",
    type: "mill_turn",
    controller: "Mazak Mazak MAZATROL SmoothX",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 4000, power_kw: 22.0, torque_nm: 350.0, taper: "BT40" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Mazak",
    model: "Mazak INTEGREX i-300ST",
    type: "mill_turn",
    controller: "Mazak Mazak MAZATROL SmoothX",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 3500, power_kw: 30.0, torque_nm: 500.0, taper: "BT40" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Mazak",
    model: "Mazak INTEGREX i-400ST",
    type: "mill_turn",
    controller: "Mazak Mazak MAZATROL SmoothX",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 3000, power_kw: 37.0, torque_nm: 700.0, taper: "BT40" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Mazak",
    model: "Mazak INTEGREX i-500ST",
    type: "mill_turn",
    controller: "Mazak Mazak MAZATROL SmoothX",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 2500, power_kw: 45.0, torque_nm: 1000.0, taper: "BT40" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Mazak",
    model: "Mazak VCN-460",
    type: "VMC",
    controller: "Mazak Mazak MAZATROL SmoothG",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 24.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 12000, power_kw: 18.5, torque_nm: 119.0, taper: "BT40" },
    tool_changer: { type: "arm", capacity: 24, change_time_sec: 2.5 },
  },
  {
    brand: "Mazak",
    model: "Mazak VCN-700",
    type: "VMC",
    controller: "Mazak Mazak MAZATROL SmoothG",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 30.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 12000, power_kw: 22.0, torque_nm: 175.0, taper: "BT40" },
    tool_changer: { type: "arm", capacity: 30, change_time_sec: 2.5 },
  },
  {
    brand: "Mazak",
    model: "Mazak MEGA 8800",
    type: "HMC",
    controller: "Mazak Mazak MAZATROL SmoothX",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 120.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 6000, power_kw: 55.0, torque_nm: 1100.0, taper: "CAT50" },
    tool_changer: { type: "chain", capacity: 120, change_time_sec: 3.0 },
  },
  {
    brand: "Mazak",
    model: "Mazak VTC-530C II",
    type: "VMC",
    controller: "Mazak Mazak MAZATROL SmoothG",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 30.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 12000, power_kw: 22.0, torque_nm: 175.0, taper: "BT40" },
    tool_changer: { type: "arm", capacity: 30, change_time_sec: 2.5 },
  },
  {
    brand: "Mazak",
    model: "Mazak QUICK TURN 100",
    type: "lathe",
    controller: "Mazak Mazak MAZATROL SmoothG",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 6000, power_kw: 7.5, torque_nm: 48.0, taper: "A2-5" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Mazak",
    model: "Mazak QUICK TURN 200",
    type: "lathe",
    controller: "Mazak Mazak MAZATROL SmoothG",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 5000, power_kw: 15.0, torque_nm: 180.0, taper: "A2-6" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Mazak",
    model: "Mazak QUICK TURN 250M",
    type: "lathe",
    controller: "Mazak Mazak MAZATROL SmoothG",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 4000, power_kw: 18.5, torque_nm: 290.0, taper: "A2-8" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Mazak",
    model: "Mazak QUICK TURN 300M",
    type: "lathe",
    controller: "Mazak Mazak MAZATROL SmoothG",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 3300, power_kw: 22.0, torque_nm: 430.0, taper: "A2-8" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Mazak",
    model: "Mazak QUICK TURN 350",
    type: "lathe",
    controller: "Mazak Mazak MAZATROL SmoothG",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 2800, power_kw: 30.0, torque_nm: 500.0, taper: "A2-11" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Mazak",
    model: "Mazak QUICK TURN 450",
    type: "lathe",
    controller: "Mazak Mazak MAZATROL SmoothG",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 2200, power_kw: 37.0, torque_nm: 700.0, taper: "A2-11" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Mazak",
    model: "Mazak INTEGREX i-100",
    type: "mill_turn",
    controller: "Mazak Mazak MAZATROL SmoothX",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 5000, power_kw: 15.0, torque_nm: 180.0, taper: "A2-6" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Mazak",
    model: "Mazak INTEGREX i-200",
    type: "mill_turn",
    controller: "Mazak Mazak MAZATROL SmoothX",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 4000, power_kw: 22.0, torque_nm: 350.0, taper: "A2-8" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Mazak",
    model: "Mazak INTEGREX i-200S",
    type: "mill_turn",
    controller: "Mazak Mazak MAZATROL SmoothX",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 4000, power_kw: 22.0, torque_nm: 350.0, taper: "A2-8" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Mazak",
    model: "Mazak INTEGREX i-300",
    type: "mill_turn",
    controller: "Mazak Mazak MAZATROL SmoothX",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 3300, power_kw: 30.0, torque_nm: 500.0, taper: "A2-11" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Mazak",
    model: "Mazak INTEGREX i-400",
    type: "mill_turn",
    controller: "Mazak Mazak MAZATROL SmoothX",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 2500, power_kw: 37.0, torque_nm: 700.0, taper: "A2-11" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Mazak",
    model: "Mazak INTEGREX i-500",
    type: "mill_turn",
    controller: "Mazak Mazak MAZATROL SmoothX",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 2000, power_kw: 45.0, torque_nm: 1000.0, taper: "A2-15" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Mazak",
    model: "Mazak INTEGREX e-420V/6",
    type: "mill_turn",
    controller: "Mazak Mazak MAZATROL SmoothX",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 40.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 2000, power_kw: 37.0, torque_nm: 700.0, taper: "table_rotary" },
    tool_changer: { type: "carousel", capacity: 40, change_time_sec: 4.0 },
  },
  {
    brand: "Mazak",
    model: "Mazak INTEGREX e-670H",
    type: "mill_turn",
    controller: "Mazak Mazak MAZATROL SmoothX",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 1500, power_kw: 55.0, torque_nm: 2000.0, taper: "A2-15" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Mazak",
    model: "Mazak FJV-35/60",
    type: "VMC",
    controller: "Mazak Mazak MAZATROL SmoothG",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 15.0, torque_nm: 100.0, taper: "CAT50" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Mazak",
    model: "Mazak FJV-35/120",
    type: "VMC",
    controller: "Mazak Mazak MAZATROL SmoothG",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 15.0, torque_nm: 100.0, taper: "CAT50" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Mazak",
    model: "Mazak FJV-60/160",
    type: "VMC",
    controller: "Mazak Mazak MAZATROL SmoothG",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 8000, power_kw: 15.0, torque_nm: 100.0, taper: "CAT50" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Mazak",
    model: "Mazak VARIAXIS i-800 NEO",
    type: "5axis",
    controller: "Mazak Mazak MAZATROL SmoothG",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 12000, power_kw: 15.0, torque_nm: 100.0, taper: "CAT40" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Mazak",
    model: "Mazak CV5-500",
    type: "5axis",
    controller: "Mazak Mazak MAZATROL SmoothG",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 30.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 12000, power_kw: 18.5, torque_nm: 120.0, taper: "HSK-A63" },
    tool_changer: { type: "arm", capacity: 30, change_time_sec: 2.5 },
  },
  {
    brand: "Mazak",
    model: "Mazak VTC-300C",
    type: "VMC",
    controller: "Mazak Mazak MAZATROL SmoothG",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 30.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 22.0, torque_nm: 175.0, taper: "CAT40" },
    tool_changer: { type: "arm", capacity: 30, change_time_sec: 2.5 },
  },
  {
    brand: "Mazak",
    model: "Mazak HCN-10800",
    type: "HMC",
    controller: "Mazak Mazak MAZATROL SmoothG",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 50.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 50.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 50.0 }
    ],
    spindle: { max_rpm: 6000, power_kw: 15.0, torque_nm: 100.0, taper: "CAT50" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Mazak",
    model: "Mazak HCN-4000",
    type: "HMC",
    controller: "Mazak Mazak MAZATROL SmoothG",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 50.0 },
      { name: "Y", travel_mm: 40.0, rapid_m_min: 50.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 50.0 }
    ],
    spindle: { max_rpm: 12000, power_kw: 22.0, torque_nm: 350.0, taper: "CAT40" },
    tool_changer: { type: "carousel", capacity: 40, change_time_sec: 4.0 },
  },
  {
    brand: "Mazak",
    model: "Mazak HCN-5000S",
    type: "HMC",
    controller: "Mazak Mazak MAZATROL SmoothG",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 50.0 },
      { name: "Y", travel_mm: 60.0, rapid_m_min: 50.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 50.0 }
    ],
    spindle: { max_rpm: 12000, power_kw: 30.0, torque_nm: 430.0, taper: "CAT40" },
    tool_changer: { type: "carousel", capacity: 60, change_time_sec: 4.0 },
  },
  {
    brand: "Mazak",
    model: "Mazak HCN-6800",
    type: "HMC",
    controller: "Mazak Mazak MAZATROL SmoothG",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 50.0 },
      { name: "Y", travel_mm: 60.0, rapid_m_min: 50.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 50.0 }
    ],
    spindle: { max_rpm: 8000, power_kw: 37.0, torque_nm: 700.0, taper: "CAT50" },
    tool_changer: { type: "carousel", capacity: 60, change_time_sec: 4.0 },
  },
  {
    brand: "Mazak",
    model: "Mazak HCN-6800 NEO",
    type: "HMC",
    controller: "Mazak Mazak MAZATROL SmoothG",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 50.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 50.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 50.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 15.0, torque_nm: 100.0, taper: "CAT50" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Mazak",
    model: "Mazak HCN-8800",
    type: "HMC",
    controller: "Mazak Mazak MAZATROL SmoothG",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 50.0 },
      { name: "Y", travel_mm: 80.0, rapid_m_min: 50.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 50.0 }
    ],
    spindle: { max_rpm: 6000, power_kw: 45.0, torque_nm: 1000.0, taper: "CAT50" },
    tool_changer: { type: "chain", capacity: 80, change_time_sec: 3.0 },
  },
  {
    brand: "Mazak",
    model: "Mazak HCN-12800",
    type: "HMC",
    controller: "Mazak Mazak MAZATROL SmoothG",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 50.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 50.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 50.0 }
    ],
    spindle: { max_rpm: 5000, power_kw: 15.0, torque_nm: 100.0, taper: "CAT50" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Mazak",
    model: "Mazak INTEGREX e-1060V/6 II",
    type: "mill_turn",
    controller: "Mazak Mazak MAZATROL SmoothG",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 15.0, torque_nm: 100.0, taper: "CAT50" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Mazak",
    model: "Mazak INTEGREX e-1600V/10S",
    type: "mill_turn",
    controller: "Mazak Mazak MAZATROL SmoothG",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 8000, power_kw: 15.0, torque_nm: 100.0, taper: "CAT50" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Mazak",
    model: "Mazak VARIAXIS i-500",
    type: "5axis",
    controller: "Mazak Mazak MAZATROL SmoothG",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 30.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 12000, power_kw: 22.0, torque_nm: 120.0, taper: "CAT40" },
    tool_changer: { type: "arm", capacity: 30, change_time_sec: 2.5 },
  },
  {
    brand: "Mazak",
    model: "Mazak VARIAXIS i-600",
    type: "5axis",
    controller: "Mazak Mazak MAZATROL SmoothG",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 30.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 12000, power_kw: 22.0, torque_nm: 120.0, taper: "CAT40" },
    tool_changer: { type: "arm", capacity: 30, change_time_sec: 2.5 },
  },
  {
    brand: "Mazak",
    model: "Mazak VARIAXIS i-700",
    type: "5axis",
    controller: "Mazak Mazak MAZATROL SmoothG",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 30.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 12000, power_kw: 30.0, torque_nm: 286.0, taper: "CAT40" },
    tool_changer: { type: "arm", capacity: 30, change_time_sec: 2.5 },
  },
  {
    brand: "Mazak",
    model: "Mazak VARIAXIS i-800",
    type: "5axis",
    controller: "Mazak Mazak MAZATROL SmoothG",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 40.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 12000, power_kw: 30.0, torque_nm: 286.0, taper: "CAT40" },
    tool_changer: { type: "carousel", capacity: 40, change_time_sec: 4.0 },
  },
  {
    brand: "Mazak",
    model: "Mazak VARIAXIS i-1050",
    type: "5axis",
    controller: "Mazak Mazak MAZATROL SmoothG",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 60.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 37.0, torque_nm: 350.0, taper: "CAT50" },
    tool_changer: { type: "carousel", capacity: 60, change_time_sec: 4.0 },
  },
  {
    brand: "Mazak",
    model: "Mazak VARIAXIS 630-5X II T",
    type: "5axis",
    controller: "Mazak Mazak MAZATROL SmoothG",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 12000, power_kw: 15.0, torque_nm: 100.0, taper: "CAT40" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Mazak",
    model: "Mazak Variaxis J-500",
    type: "5axis",
    controller: "Mazak Mazak MAZATROL SmoothG",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 12000, power_kw: 15.0, torque_nm: 100.0, taper: "CAT40" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Mazak",
    model: "Mazak VARIAXIS j-600",
    type: "5axis",
    controller: "Mazak Mazak MAZATROL SmoothG",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 12000, power_kw: 15.0, torque_nm: 100.0, taper: "CAT40" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Mazak",
    model: "Mazak Variaxis C-600",
    type: "5axis",
    controller: "Mazak Mazak MAZATROL SmoothG",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 12000, power_kw: 15.0, torque_nm: 100.0, taper: "CAT40" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Mazak",
    model: "Mazak Variaxis i-300 AWC",
    type: "5axis",
    controller: "Mazak Mazak MAZATROL SmoothG",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 15000, power_kw: 15.0, torque_nm: 100.0, taper: "HSK-A63" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Mazak",
    model: "Mazak Variaxis i-700T",
    type: "mill_turn",
    controller: "Mazak Mazak MAZATROL SmoothG",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 12000, power_kw: 15.0, torque_nm: 100.0, taper: "CAT40" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Mazak",
    model: "Mazak VC-Ez 16",
    type: "VMC",
    controller: "Mazak Mazak MAZATROL SmoothG",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 16.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 11.0, torque_nm: 52.0, taper: "CAT40" },
    tool_changer: { type: "arm", capacity: 16, change_time_sec: 2.5 },
  },
  {
    brand: "Mazak",
    model: "Mazak VC-Ez 20",
    type: "VMC",
    controller: "Mazak Mazak MAZATROL SmoothG",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 15.0, torque_nm: 95.0, taper: "CAT40" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Mazak",
    model: "Mazak VC-Ez 20 15000 RPM",
    type: "VMC",
    controller: "Mazak Mazak MAZATROL SmoothG",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 15000, power_kw: 15.0, torque_nm: 100.0, taper: "CAT40" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Mazak",
    model: "Mazak VC-Ez 26",
    type: "VMC",
    controller: "Mazak Mazak MAZATROL SmoothG",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 15.0, torque_nm: 100.0, taper: "CAT40" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Mazak",
    model: "Mazak VC-Ez 26 with MR250 Rotary",
    type: "VMC",
    controller: "Mazak Mazak MAZATROL SmoothG",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 15.0, torque_nm: 100.0, taper: "CAT40" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Mazak",
    model: "Mazak VCN 510C-II",
    type: "VMC",
    controller: "Mazak Mazak MAZATROL SmoothG",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 12000, power_kw: 15.0, torque_nm: 100.0, taper: "CAT40" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Mazak",
    model: "Mazak VCN 530C",
    type: "VMC",
    controller: "Mazak Mazak MAZATROL SmoothG",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 30.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 12000, power_kw: 22.0, torque_nm: 175.0, taper: "CAT40" },
    tool_changer: { type: "arm", capacity: 30, change_time_sec: 2.5 },
  },
  {
    brand: "Mazak",
    model: "Mazak VCN-570",
    type: "VMC",
    controller: "Mazak Mazak MAZATROL SmoothG",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 12000, power_kw: 15.0, torque_nm: 100.0, taper: "CAT40" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Mazak",
    model: "Mazak VCN-570C",
    type: "VMC",
    controller: "Mazak Mazak MAZATROL SmoothG",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 12000, power_kw: 15.0, torque_nm: 100.0, taper: "CAT40" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Mazak",
    model: "Mazak VTC-530C",
    type: "VMC",
    controller: "Mazak Mazak MAZATROL SmoothG",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 15.0, torque_nm: 100.0, taper: "CAT40" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Mazak",
    model: "Mazak VTC-800/30SR",
    type: "5axis",
    controller: "Mazak Mazak MAZATROL SmoothG",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 15.0, torque_nm: 100.0, taper: "CAT50" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Mazak",
    model: "Mazak VTC-800/30SDR",
    type: "5axis",
    controller: "Mazak Mazak MAZATROL SmoothG",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 15.0, torque_nm: 100.0, taper: "CAT50" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Mazak",
    model: "Mazak VC-500 AM",
    type: "5axis",
    controller: "Mazak Mazak MAZATROL SmoothG",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 12000, power_kw: 15.0, torque_nm: 100.0, taper: "CAT40" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Mazak",
    model: "Mazak VCU-500A 5X",
    type: "5axis",
    controller: "Mazak Mazak MAZATROL SmoothG",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 12000, power_kw: 15.0, torque_nm: 100.0, taper: "CAT40" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Mitsui Seiki",
    model: "Mitsui Seiki PJ303X",
    type: "5axis",
    controller: "Fanuc Fanuc 31i-B5",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 20000, power_kw: 10.0, torque_nm: 5.0, taper: "HSK-E40" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Mitsui Seiki",
    model: "Mitsui Seiki PJ80",
    type: "VMC",
    controller: "Fanuc Fanuc 31i-B5",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 30.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 22.0, torque_nm: 175.0, taper: "CAT50" },
    tool_changer: { type: "arm", capacity: 30, change_time_sec: 2.5 },
  },
  {
    brand: "Mitsui Seiki",
    model: "Mitsui Seiki HU50A",
    type: "HMC",
    controller: "Fanuc Fanuc 31i-B5",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 60.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 12000, power_kw: 22.0, torque_nm: 120.0, taper: "HSK-A63" },
    tool_changer: { type: "carousel", capacity: 60, change_time_sec: 4.0 },
  },
  {
    brand: "Nakamura-Tome",
    model: "Nakamura-Tome Super NTJ-100",
    type: "mill_turn",
    controller: "Fanuc Fanuc 31i-B5",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 5000, power_kw: 15.0, torque_nm: 155.0, taper: "A2-6" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Nakamura-Tome",
    model: "Nakamura-Tome NTRX-300",
    type: "mill_turn",
    controller: "Fanuc Fanuc 31i-B5",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 4000, power_kw: 22.0, torque_nm: 320.0, taper: "A2-8" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Nakamura-Tome",
    model: "Nakamura-Tome WY-150",
    type: "lathe",
    controller: "Fanuc Fanuc 31i-B5",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 5000, power_kw: 15.0, torque_nm: 155.0, taper: "A2-6" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Nakamura-Tome",
    model: "Nakamura-Tome SC-100X2",
    type: "lathe",
    controller: "Fanuc Fanuc 31i-B",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 6000, power_kw: 11.0, torque_nm: 75.0, taper: "A2-5" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Nakamura-Tome",
    model: "Nakamura-Tome WT-150II",
    type: "lathe",
    controller: "Fanuc Fanuc 31i-B5",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 5000, power_kw: 15.0, torque_nm: 155.0, taper: "A2-6" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Nakamura-Tome",
    model: "Nakamura-Tome AS-200",
    type: "lathe",
    controller: "Fanuc Fanuc 31i-B",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 4500, power_kw: 18.5, torque_nm: 240.0, taper: "A2-8" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Nakamura-Tome",
    model: "Nakamura-Tome WY-250",
    type: "lathe",
    controller: "Fanuc Fanuc 31i-B5",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 4500, power_kw: 18.5, torque_nm: 250.0, taper: "A2-6" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Nakamura-Tome",
    model: "Nakamura-Tome Super NTJ",
    type: "mill_turn",
    controller: "Fanuc Fanuc 31i-B5",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 4000, power_kw: 22.0, torque_nm: 350.0, taper: "A2-8" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Nakamura-Tome",
    model: "Nakamura-Tome Super NTMX",
    type: "mill_turn",
    controller: "Fanuc Fanuc 31i-B5",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 3500, power_kw: 30.0, torque_nm: 500.0, taper: "BT40" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Nakamura-Tome",
    model: "Nakamura-Tome SC-300 II",
    type: "lathe",
    controller: "Fanuc Fanuc 0i-TF",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 5000, power_kw: 15.0, torque_nm: 180.0, taper: "A2-6" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Nakamura-Tome",
    model: "Nakamura-Tome WT-300",
    type: "lathe",
    controller: "Fanuc Fanuc 31i-B5",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 4000, power_kw: 22.0, torque_nm: 350.0, taper: "A2-8" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Okuma",
    model: "2SP-V760EX",
    type: "lathe",
    controller: "Okuma",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 24.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 24.0 }
    ],
    spindle: { max_rpm: 1000, power_kw: 22.0, torque_nm: 955.0, taper: "BT40" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Okuma",
    model: "Okuma LB3000 EX II MY",
    type: "lathe",
    controller: "Okuma Okuma OSP-P300LA",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 20.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 20.0 }
    ],
    spindle: { max_rpm: 3800, power_kw: 22.0, torque_nm: 350.0, taper: "A2-8" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Okuma",
    model: "Okuma LB3000 EX II MYS",
    type: "lathe",
    controller: "Okuma Okuma OSP-P300LA",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 3800, power_kw: 22.0, torque_nm: 350.0, taper: "A2-8" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Okuma",
    model: "Okuma LB4000 EX II",
    type: "lathe",
    controller: "Okuma Okuma OSP-P300LA",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 2800, power_kw: 30.0, torque_nm: 600.0, taper: "A2-11" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Okuma",
    model: "Okuma LB4000 EX II MY",
    type: "lathe",
    controller: "Okuma Okuma OSP-P300LA",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 2800, power_kw: 30.0, torque_nm: 600.0, taper: "A2-11" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Okuma",
    model: "Okuma LU3000 EX 2SC",
    type: "lathe",
    controller: "Okuma Okuma OSP-P300LA",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 3800, power_kw: 22.0, torque_nm: 350.0, taper: "A2-8" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Okuma",
    model: "Okuma LU7000 4SC",
    type: "lathe",
    controller: "Okuma Okuma OSP-P300LA",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 2200, power_kw: 37.0, torque_nm: 800.0, taper: "A2-11" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Okuma",
    model: "Okuma MULTUS B400 II",
    type: "mill_turn",
    controller: "Okuma Okuma OSP-P300SA",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 60.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 3000, power_kw: 30.0, torque_nm: 500.0, taper: "A2-11" },
    tool_changer: { type: "carousel", capacity: 60, change_time_sec: 4.0 },
  },
  {
    brand: "Okuma",
    model: "Okuma MULTUS U3000",
    type: "mill_turn",
    controller: "Okuma Okuma OSP-P300SA",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 40.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 3800, power_kw: 22.0, torque_nm: 350.0, taper: "A2-8" },
    tool_changer: { type: "carousel", capacity: 40, change_time_sec: 4.0 },
  },
  {
    brand: "Okuma",
    model: "Okuma MULTUS U5000",
    type: "mill_turn",
    controller: "Okuma Okuma OSP-P300SA",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 80.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 2500, power_kw: 37.0, torque_nm: 800.0, taper: "A2-11" },
    tool_changer: { type: "chain", capacity: 80, change_time_sec: 3.0 },
  },
  {
    brand: "Okuma",
    model: "Okuma VTM-120",
    type: "mill_turn",
    controller: "Okuma Okuma OSP-P300SA",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 40.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 1000, power_kw: 37.0, torque_nm: 4000.0, taper: "BT40" },
    tool_changer: { type: "carousel", capacity: 40, change_time_sec: 4.0 },
  },
  {
    brand: "Okuma",
    model: "Okuma VTM-200",
    type: "mill_turn",
    controller: "Okuma Okuma OSP-P300SA",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 60.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 1000, power_kw: 55.0, torque_nm: 8000.0, taper: "BT40" },
    tool_changer: { type: "carousel", capacity: 60, change_time_sec: 4.0 },
  },
  {
    brand: "Okuma",
    model: "Okuma LB3000 EXII",
    type: "lathe",
    controller: "Okuma Okuma OSP-P300L",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 4200, power_kw: 15.0, torque_nm: 240.0, taper: "A2-6" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Okuma",
    model: "Okuma MULTUS B200II",
    type: "mill_turn",
    controller: "Okuma Okuma OSP-P300S",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 20.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 4200, power_kw: 22.0, torque_nm: 350.0, taper: "A2-8" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Okuma",
    model: "Okuma SPACE TURN LB2000 EXIII",
    type: "lathe",
    controller: "Okuma Okuma OSP-P300L",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 5000, power_kw: 11.0, torque_nm: 95.0, taper: "A2-5" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Okuma",
    model: "Okuma LU3000 EXII 2SC",
    type: "lathe",
    controller: "Okuma Okuma OSP-P300L",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 4200, power_kw: 15.0, torque_nm: 240.0, taper: "A2-6" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Okuma",
    model: "Okuma GENOS M460-VE(e)",
    type: "VMC",
    controller: "Okuma Okuma OSP-P300MA",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 32.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 15000, power_kw: 22.0, torque_nm: 87.5, taper: "BT40" },
    tool_changer: { type: "carousel", capacity: 32, change_time_sec: 4.0 },
  },
  {
    brand: "Okuma",
    model: "Okuma GENOS M560-V(e)",
    type: "VMC",
    controller: "Okuma Okuma OSP-P300MA",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 32.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 12000, power_kw: 22.0, torque_nm: 175.0, taper: "BT40" },
    tool_changer: { type: "carousel", capacity: 32, change_time_sec: 4.0 },
  },
  {
    brand: "Okuma",
    model: "Okuma GENOS M560-VA HC",
    type: "VMC",
    controller: "Okuma Okuma OSP-P300MA",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 32.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 8000, power_kw: 30.0, torque_nm: 350.0, taper: "CAT50" },
    tool_changer: { type: "carousel", capacity: 32, change_time_sec: 4.0 },
  },
  {
    brand: "Okuma",
    model: "Okuma GENOS M660-VA",
    type: "VMC",
    controller: "Okuma Okuma OSP-P300MA",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 32.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 12000, power_kw: 22.0, torque_nm: 175.0, taper: "BT40" },
    tool_changer: { type: "carousel", capacity: 32, change_time_sec: 4.0 },
  },
  {
    brand: "Okuma",
    model: "Okuma MA-500HII",
    type: "HMC",
    controller: "Okuma Okuma OSP-P300MA",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 48.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 12000, power_kw: 22.0, torque_nm: 175.0, taper: "BT40" },
    tool_changer: { type: "carousel", capacity: 48, change_time_sec: 4.0 },
  },
  {
    brand: "Okuma",
    model: "Okuma MA-600HII",
    type: "HMC",
    controller: "Okuma Okuma OSP-P300MA",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 60.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 30.0, torque_nm: 500.0, taper: "CAT50" },
    tool_changer: { type: "carousel", capacity: 60, change_time_sec: 4.0 },
  },
  {
    brand: "Okuma",
    model: "Okuma MB-4000H",
    type: "HMC",
    controller: "Okuma Okuma OSP-P300MA",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 40.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 15000, power_kw: 22.0, torque_nm: 87.5, taper: "BT40" },
    tool_changer: { type: "carousel", capacity: 40, change_time_sec: 4.0 },
  },
  {
    brand: "Okuma",
    model: "Okuma MB-8000H",
    type: "HMC",
    controller: "Okuma Okuma OSP-P300MA",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 60.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 8000, power_kw: 37.0, torque_nm: 700.0, taper: "CAT50" },
    tool_changer: { type: "carousel", capacity: 60, change_time_sec: 4.0 },
  },
  {
    brand: "Okuma",
    model: "Okuma MU-400VA",
    type: "5axis",
    controller: "Okuma Okuma OSP-P300MA",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 32.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 15000, power_kw: 22.0, torque_nm: 87.5, taper: "BT40" },
    tool_changer: { type: "carousel", capacity: 32, change_time_sec: 4.0 },
  },
  {
    brand: "Okuma",
    model: "Okuma MU-500VA",
    type: "5axis",
    controller: "Okuma Okuma OSP-P300MA",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 32.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 15000, power_kw: 22.0, torque_nm: 87.5, taper: "BT40" },
    tool_changer: { type: "carousel", capacity: 32, change_time_sec: 4.0 },
  },
  {
    brand: "Okuma",
    model: "Okuma MU-4000V",
    type: "5axis",
    controller: "Okuma Okuma OSP-P300MA",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 48.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 12000, power_kw: 22.0, torque_nm: 175.0, taper: "BT40" },
    tool_changer: { type: "carousel", capacity: 48, change_time_sec: 4.0 },
  },
  {
    brand: "Okuma",
    model: "Okuma MU-8000V",
    type: "5axis",
    controller: "Okuma Okuma OSP-P300MA",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 80.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 6000, power_kw: 45.0, torque_nm: 900.0, taper: "CAT50" },
    tool_changer: { type: "chain", capacity: 80, change_time_sec: 3.0 },
  },
  {
    brand: "Okuma",
    model: "Okuma MILLAC 1052VII",
    type: "bridge",
    controller: "Okuma Okuma OSP-P300MA",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 32.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 30.0, torque_nm: 350.0, taper: "CAT50" },
    tool_changer: { type: "carousel", capacity: 32, change_time_sec: 4.0 },
  },
  {
    brand: "Okuma",
    model: "OKUMA_MB-5000HII",
    type: "VMC",
    controller: "Okuma Okuma OSP-P300MA",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 30.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 15.0, torque_nm: 100.0, taper: "CAT40" },
    tool_changer: { type: "arm", capacity: 30, change_time_sec: 2.5 },
  },
  {
    brand: "Okuma",
    model: "okuma_genos_m460v-5ax",
    type: "5axis",
    controller: "Okuma Okuma OSP-P300MA",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 30.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 15.0, torque_nm: 100.0, taper: "CAT40" },
    tool_changer: { type: "arm", capacity: 30, change_time_sec: 2.5 },
  },
  {
    brand: "Okuma",
    model: "OKUMA GENOS M660-VB",
    type: "VMC",
    controller: "Okuma Okuma OSP-P300MA",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 40.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 12000, power_kw: 15.0, torque_nm: 100.0, taper: "BT50" },
    tool_changer: { type: "carousel", capacity: 40, change_time_sec: 4.0 },
  },
  {
    brand: "Okuma",
    model: "OKUMA MA-550VB",
    type: "VMC",
    controller: "Okuma Okuma OSP-P300MA",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 40.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 8000, power_kw: 15.0, torque_nm: 100.0, taper: "BT50" },
    tool_changer: { type: "carousel", capacity: 40, change_time_sec: 4.0 },
  },
  {
    brand: "Okuma",
    model: "OKUMA MA-600H",
    type: "HMC",
    controller: "Okuma Okuma OSP-P300MA",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 50.0 },
      { name: "Y", travel_mm: 40.0, rapid_m_min: 50.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 50.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 15.0, torque_nm: 100.0, taper: "CAT50" },
    tool_changer: { type: "carousel", capacity: 40, change_time_sec: 4.0 },
  },
  {
    brand: "Okuma",
    model: "OKUMA MA-650VB",
    type: "VMC",
    controller: "Okuma Okuma OSP-P300MA",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 40.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 8000, power_kw: 15.0, torque_nm: 100.0, taper: "BT50" },
    tool_changer: { type: "carousel", capacity: 40, change_time_sec: 4.0 },
  },
  {
    brand: "Okuma",
    model: "OKUMA MB-46VAE",
    type: "VMC",
    controller: "Okuma Okuma OSP-P300MA",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 30.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 15000, power_kw: 15.0, torque_nm: 100.0, taper: "CAT40" },
    tool_changer: { type: "arm", capacity: 30, change_time_sec: 2.5 },
  },
  {
    brand: "Okuma",
    model: "OKUMA MB-56VA",
    type: "VMC",
    controller: "Okuma Okuma OSP-P300MA",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 40.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 15000, power_kw: 15.0, torque_nm: 100.0, taper: "CAT40" },
    tool_changer: { type: "carousel", capacity: 40, change_time_sec: 4.0 },
  },
  {
    brand: "Okuma",
    model: "OKUMA MB-66VA",
    type: "VMC",
    controller: "Okuma Okuma OSP-P300MA",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 40.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 12000, power_kw: 15.0, torque_nm: 100.0, taper: "CAT40" },
    tool_changer: { type: "carousel", capacity: 40, change_time_sec: 4.0 },
  },
  {
    brand: "Okuma",
    model: "OKUMA MCR-A5CII 25x40",
    type: "bridge",
    controller: "Okuma Okuma OSP-P300MA",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 40.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 15.0, torque_nm: 100.0, taper: "CAT50" },
    tool_changer: { type: "carousel", capacity: 40, change_time_sec: 4.0 },
  },
  {
    brand: "Okuma",
    model: "OKUMA MCR-BIII 25E 25x40",
    type: "bridge",
    controller: "Okuma Okuma OSP-P300MA",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 40.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 6000, power_kw: 15.0, torque_nm: 100.0, taper: "CAT50" },
    tool_changer: { type: "carousel", capacity: 40, change_time_sec: 4.0 },
  },
  {
    brand: "Okuma",
    model: "OKUMA MCR-BIII 25E 25x50",
    type: "bridge",
    controller: "Okuma Okuma OSP-P300MA",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 40.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 6000, power_kw: 15.0, torque_nm: 100.0, taper: "CAT50" },
    tool_changer: { type: "carousel", capacity: 40, change_time_sec: 4.0 },
  },
  {
    brand: "Okuma",
    model: "OKUMA MCR-BIII 35E 35x65",
    type: "bridge",
    controller: "Okuma Okuma OSP-P300MA",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 40.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 6000, power_kw: 15.0, torque_nm: 100.0, taper: "CAT50" },
    tool_changer: { type: "carousel", capacity: 40, change_time_sec: 4.0 },
  },
  {
    brand: "Okuma",
    model: "OKUMA MILLAC 33T",
    type: "5axis",
    controller: "Okuma Okuma OSP-P300MA",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 24.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 20000, power_kw: 15.0, torque_nm: 100.0, taper: "HSK-A63" },
    tool_changer: { type: "arm", capacity: 24, change_time_sec: 2.5 },
  },
  {
    brand: "Okuma",
    model: "OKUMA MILLAC 761VII",
    type: "VMC",
    controller: "Okuma Okuma OSP-P300MA",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 40.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 12000, power_kw: 15.0, torque_nm: 100.0, taper: "CAT40" },
    tool_changer: { type: "carousel", capacity: 40, change_time_sec: 4.0 },
  },
  {
    brand: "Okuma",
    model: "OKUMA MILLAC 800VH",
    type: "VMC",
    controller: "Okuma Okuma OSP-P300MA",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 40.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 15.0, torque_nm: 100.0, taper: "BT50" },
    tool_changer: { type: "carousel", capacity: 40, change_time_sec: 4.0 },
  },
  {
    brand: "Okuma",
    model: "OKUMA MILLAC 852VII",
    type: "VMC",
    controller: "Okuma Okuma OSP-P300MA",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 40.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 12000, power_kw: 15.0, torque_nm: 100.0, taper: "CAT40" },
    tool_changer: { type: "carousel", capacity: 40, change_time_sec: 4.0 },
  },
  {
    brand: "Okuma",
    model: "OKUMA MU-500VAL",
    type: "5axis",
    controller: "Okuma Okuma OSP-P300MA",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 40.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 15000, power_kw: 15.0, torque_nm: 100.0, taper: "CAT40" },
    tool_changer: { type: "carousel", capacity: 40, change_time_sec: 4.0 },
  },
  {
    brand: "Okuma",
    model: "OKUMA VTM-80YB",
    type: "mill_turn",
    controller: "Okuma Okuma OSP-P300MA",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 40.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 6000, power_kw: 15.0, torque_nm: 100.0, taper: "CAT50" },
    tool_changer: { type: "carousel", capacity: 40, change_time_sec: 4.0 },
  },
  {
    brand: "Okuma",
    model: "OKUMA VTM-1200YB",
    type: "mill_turn",
    controller: "Okuma Okuma OSP-P300MA",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 40.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 6000, power_kw: 15.0, torque_nm: 100.0, taper: "CAT50" },
    tool_changer: { type: "carousel", capacity: 40, change_time_sec: 4.0 },
  },
  {
    brand: "Okuma",
    model: "OKUMA VTM-2000YB",
    type: "mill_turn",
    controller: "Okuma Okuma OSP-P300MA",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 40.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 6000, power_kw: 15.0, torque_nm: 100.0, taper: "CAT50" },
    tool_changer: { type: "carousel", capacity: 40, change_time_sec: 4.0 },
  },
  {
    brand: "Quaser",
    model: "Quaser MV 204EL",
    type: "VMC",
    controller: "Fanuc Fanuc 0i-MF",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 24.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 12000, power_kw: 18.5, torque_nm: 119.0, taper: "BT40" },
    tool_changer: { type: "arm", capacity: 24, change_time_sec: 2.5 },
  },
  {
    brand: "Quaser",
    model: "Quaser UX 300",
    type: "5axis",
    controller: "Fanuc Fanuc 31i-B5",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 30.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 15000, power_kw: 22.0, torque_nm: 95.0, taper: "HSK-A63" },
    tool_changer: { type: "arm", capacity: 30, change_time_sec: 2.5 },
  },
  {
    brand: "Spinner",
    model: "Spinner VC 750",
    type: "VMC",
    controller: "Siemens Siemens SINUMERIK 828D",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 24.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 12000, power_kw: 18.5, torque_nm: 119.0, taper: "BT40" },
    tool_changer: { type: "arm", capacity: 24, change_time_sec: 2.5 },
  },
  {
    brand: "Spinner",
    model: "Spinner VC 1150",
    type: "VMC",
    controller: "Siemens Siemens SINUMERIK 828D",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 30.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 12000, power_kw: 22.0, torque_nm: 175.0, taper: "BT40" },
    tool_changer: { type: "arm", capacity: 30, change_time_sec: 2.5 },
  },
  {
    brand: "Spinner",
    model: "Spinner U5-620",
    type: "5axis",
    controller: "Siemens Siemens SINUMERIK 840D sl",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 30.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 12000, power_kw: 25.0, torque_nm: 130.0, taper: "HSK-A63" },
    tool_changer: { type: "arm", capacity: 30, change_time_sec: 2.5 },
  },
  {
    brand: "Spinner",
    model: "Spinner TC 300 MC",
    type: "lathe",
    controller: "Siemens Siemens SINUMERIK 828D",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 5000, power_kw: 11.0, torque_nm: 95.0, taper: "A2-5" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Spinner",
    model: "Spinner TC 600 MC",
    type: "lathe",
    controller: "Siemens Siemens SINUMERIK 828D",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 4000, power_kw: 18.5, torque_nm: 240.0, taper: "A2-6" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Spinner",
    model: "Spinner TTS-65 SMC",
    type: "lathe",
    controller: "Siemens Siemens SINUMERIK 840D sl",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 3500, power_kw: 22.0, torque_nm: 350.0, taper: "A2-8" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Spinner",
    model: "Spinner U5-1520",
    type: "5axis",
    controller: "Siemens Siemens SINUMERIK 840D sl",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 40.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 12000, power_kw: 30.0, torque_nm: 200.0, taper: "HSK-A63" },
    tool_changer: { type: "carousel", capacity: 40, change_time_sec: 4.0 },
  },
  {
    brand: "Spinner",
    model: "Spinner TC 600-52 SMCY",
    type: "lathe",
    controller: "Siemens Siemens SINUMERIK 840D sl",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 5000, power_kw: 18.5, torque_nm: 200.0, taper: "A2-6" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Spinner",
    model: "Spinner TC 800-77 SMCY",
    type: "lathe",
    controller: "Siemens Siemens SINUMERIK 840D sl",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 3500, power_kw: 30.0, torque_nm: 450.0, taper: "A2-8" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Spinner",
    model: "Spinner TTS-65",
    type: "lathe",
    controller: "Siemens Siemens SINUMERIK 840D sl",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 6000, power_kw: 15.0, torque_nm: 100.0, taper: "A2-6" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Star",
    model: "Star SR-10JN",
    type: "swiss",
    controller: "Fanuc Fanuc 31i-B5",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 15000, power_kw: 1.5, torque_nm: 1.5, taper: "collet_10mm" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Star",
    model: "Star SB-16RIII",
    type: "swiss",
    controller: "Fanuc Fanuc 31i-B5",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 2.2, torque_nm: 3.5, taper: "collet_16mm" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Star",
    model: "Star SB-20R Type G",
    type: "swiss",
    controller: "Fanuc Fanuc 31i-B5",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 3.7, torque_nm: 6.0, taper: "collet_20mm" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Star",
    model: "Star SR-20JN Type C",
    type: "swiss",
    controller: "Fanuc Fanuc 31i-B5",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 3.7, torque_nm: 6.0, taper: "collet_20mm" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Star",
    model: "Star SR-32JN",
    type: "swiss",
    controller: "Fanuc Fanuc 31i-B5",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 8000, power_kw: 5.5, torque_nm: 14.8, taper: "collet_32mm" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Star",
    model: "Star SR-38B",
    type: "swiss",
    controller: "Fanuc Fanuc 31i-B5",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 6000, power_kw: 7.5, torque_nm: 22.0, taper: "collet_38mm" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Star",
    model: "Star SV-20R",
    type: "swiss",
    controller: "Fanuc Fanuc 31i-B5",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 2.2, torque_nm: 4.2, taper: "collet_20mm" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Toyoda",
    model: "Toyoda FH400J",
    type: "HMC",
    controller: "Fanuc Fanuc 31i-B5",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 40.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 15000, power_kw: 22.0, torque_nm: 119.0, taper: "BT40" },
    tool_changer: { type: "carousel", capacity: 40, change_time_sec: 4.0 },
  },
  {
    brand: "Toyoda",
    model: "Toyoda FH500J",
    type: "HMC",
    controller: "Fanuc Fanuc 31i-B5",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 60.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 12000, power_kw: 30.0, torque_nm: 200.0, taper: "BT40" },
    tool_changer: { type: "carousel", capacity: 60, change_time_sec: 4.0 },
  },
  {
    brand: "Toyoda",
    model: "Toyoda FH630SX",
    type: "HMC",
    controller: "Fanuc Fanuc 31i-B5",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 80.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 8000, power_kw: 37.0, torque_nm: 500.0, taper: "CAT50" },
    tool_changer: { type: "chain", capacity: 80, change_time_sec: 3.0 },
  },
  {
    brand: "Toyoda",
    model: "Toyoda FV-1365",
    type: "VMC",
    controller: "Fanuc Fanuc 0i-MF",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 30.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 22.0, torque_nm: 175.0, taper: "CAT50" },
    tool_changer: { type: "arm", capacity: 30, change_time_sec: 2.5 },
  },
  {
    brand: "Toyoda",
    model: "Toyoda FV-1680",
    type: "VMC",
    controller: "Fanuc Fanuc 0i-MF",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 30.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 8000, power_kw: 30.0, torque_nm: 350.0, taper: "CAT50" },
    tool_changer: { type: "arm", capacity: 30, change_time_sec: 2.5 },
  },
  {
    brand: "Traub",
    model: "Traub TNL12-7B",
    type: "swiss",
    controller: "Siemens Traub TX8i-s V8",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 12000, power_kw: 3.7, torque_nm: 5.5, taper: "collet_12mm" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Traub",
    model: "Traub TNA300",
    type: "lathe",
    controller: "Siemens Traub TX8i-s V8",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 3500, power_kw: 26.0, torque_nm: 430.0, taper: "A2-8" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Traub",
    model: "Traub TNA400",
    type: "lathe",
    controller: "Siemens Traub TX8i-s V8",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 2500, power_kw: 30.0, torque_nm: 600.0, taper: "A2-11" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Traub",
    model: "Traub TNL20-11P",
    type: "swiss",
    controller: "Siemens Traub TX8i-s V8",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 5.5, torque_nm: 10.0, taper: "collet_20mm" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Traub",
    model: "Traub TNM65",
    type: "lathe",
    controller: "Siemens Traub TX8i-s V8",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 4500, power_kw: 22.0, torque_nm: 280.0, taper: "A2-6" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Traub",
    model: "Traub TNL32-9P",
    type: "swiss",
    controller: "Siemens Traub TX8i-s V8",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 8000, power_kw: 7.5, torque_nm: 18.0, taper: "collet_32mm" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Tsugami",
    model: "Tsugami SS20-V",
    type: "swiss",
    controller: "Fanuc Fanuc 31i-B5",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 3.7, torque_nm: 6.0, taper: "collet_20mm" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Tsugami",
    model: "Tsugami S205-V",
    type: "swiss",
    controller: "Fanuc Fanuc 31i-B5",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 3.7, torque_nm: 6.0, taper: "collet_20mm" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Tsugami",
    model: "Tsugami BO38S-V",
    type: "swiss",
    controller: "Fanuc Fanuc 31i-B5",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 6000, power_kw: 7.5, torque_nm: 20.0, taper: "collet_38mm" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Tsugami",
    model: "Tsugami SS20",
    type: "swiss",
    controller: "Fanuc Fanuc 31i-B5",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 3.7, torque_nm: 6.0, taper: "collet_20mm" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Tsugami",
    model: "Tsugami S206",
    type: "swiss",
    controller: "Fanuc Fanuc 31i-B5",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 12000, power_kw: 2.2, torque_nm: 3.5, taper: "collet_6mm" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Tsugami",
    model: "Tsugami B0386-III",
    type: "swiss",
    controller: "Fanuc Fanuc 31i-B5",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 7000, power_kw: 7.5, torque_nm: 18.0, taper: "collet_38mm" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Tsugami",
    model: "Tsugami M08SY-V",
    type: "swiss",
    controller: "Fanuc Fanuc 31i-B5",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 15000, power_kw: 2.2, torque_nm: 2.5, taper: "collet_8mm" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Tsugami",
    model: "Tsugami B0205-III",
    type: "swiss",
    controller: "Fanuc Fanuc 31i-B5",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 3.7, torque_nm: 6.0, taper: "collet_20mm" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "Tsugami",
    model: "Tsugami B0325-III",
    type: "swiss",
    controller: "Fanuc Fanuc 31i-B5",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "X", travel_mm: 20.0, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 8000, power_kw: 5.5, torque_nm: 12.0, taper: "collet_25mm" },
    tool_changer: { type: "arm", capacity: 20, change_time_sec: 2.5 },
  },
  {
    brand: "YCM",
    model: "YCM FX380A 5AX",
    type: "5axis",
    controller: "Fanuc Fanuc 31i-B5",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 24.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 15000, power_kw: 15.0, torque_nm: 72.0, taper: "BT40" },
    tool_changer: { type: "arm", capacity: 24, change_time_sec: 2.5 },
  },
  {
    brand: "YCM",
    model: "YCM NXV 560A",
    type: "VMC",
    controller: "Fanuc Fanuc 0i-MF",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 24.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 12000, power_kw: 15.0, torque_nm: 95.0, taper: "BT40" },
    tool_changer: { type: "arm", capacity: 24, change_time_sec: 2.5 },
  },
  {
    brand: "YCM",
    model: "YCM NXV 1260A",
    type: "VMC",
    controller: "Fanuc Fanuc 0i-MF",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 30.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 22.0, torque_nm: 175.0, taper: "CAT50" },
    tool_changer: { type: "arm", capacity: 30, change_time_sec: 2.5 },
  },
  {
    brand: "YCM",
    model: "YCM NFX 800A",
    type: "5axis",
    controller: "Fanuc Fanuc 31i-B5",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 40.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 12000, power_kw: 30.0, torque_nm: 200.0, taper: "HSK-A63" },
    tool_changer: { type: "carousel", capacity: 40, change_time_sec: 4.0 },
  },
  {
    brand: "YCM",
    model: "YCM TV 158B",
    type: "lathe",
    controller: "Fanuc Fanuc 0i-TF",
    linear_axes: [
      { name: "Z", travel_mm: 500, rapid_m_min: 30.0 },
      { name: "X", travel_mm: 30.0, rapid_m_min: 30.0 }
    ],
    spindle: { max_rpm: 3500, power_kw: 22.0, torque_nm: 350.0, taper: "A2-8" },
    tool_changer: { type: "arm", capacity: 30, change_time_sec: 2.5 },
  },
  {
    brand: "YCM",
    model: "YCM NH630A",
    type: "HMC",
    controller: "Fanuc Fanuc 31i-B5",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 60.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 8000, power_kw: 30.0, torque_nm: 350.0, taper: "CAT50" },
    tool_changer: { type: "carousel", capacity: 60, change_time_sec: 4.0 },
  },
  {
    brand: "YCM",
    model: "YCM FX380A",
    type: "VMC",
    controller: "Fanuc Fanuc 0i-MF",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 24.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 12000, power_kw: 15.0, torque_nm: 95.0, taper: "BT40" },
    tool_changer: { type: "arm", capacity: 24, change_time_sec: 2.5 },
  },
  {
    brand: "YCM",
    model: "YCM NXV 1020A",
    type: "VMC",
    controller: "Fanuc Fanuc 0i-MF",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 24.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 12000, power_kw: 18.5, torque_nm: 119.0, taper: "BT40" },
    tool_changer: { type: "arm", capacity: 24, change_time_sec: 2.5 },
  },
  {
    brand: "YCM",
    model: "YCM NXV 1680A",
    type: "VMC",
    controller: "Fanuc Fanuc 0i-MF",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 30.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 8000, power_kw: 30.0, torque_nm: 350.0, taper: "CAT50" },
    tool_changer: { type: "arm", capacity: 30, change_time_sec: 2.5 },
  },
  {
    brand: "YCM",
    model: "YCM NFX 400A",
    type: "5axis",
    controller: "Fanuc Fanuc 31i-B5",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 30.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 12000, power_kw: 22.0, torque_nm: 120.0, taper: "BT40" },
    tool_changer: { type: "arm", capacity: 30, change_time_sec: 2.5 },
  },
  {
    brand: "YCM",
    model: "YCM NH500A",
    type: "HMC",
    controller: "Fanuc Fanuc 31i-B5",
    linear_axes: [
      { name: "X", travel_mm: 500, rapid_m_min: 36.0 },
      { name: "Y", travel_mm: 40.0, rapid_m_min: 36.0 },
      { name: "Z", travel_mm: 400, rapid_m_min: 36.0 }
    ],
    spindle: { max_rpm: 10000, power_kw: 22.0, torque_nm: 175.0, taper: "BT40" },
    tool_changer: { type: "carousel", capacity: 40, change_time_sec: 4.0 },
  },
];