export interface CamSoftwareLevel {
  id: string;
  label: string;
}

export interface CamSoftwareEntry {
  id: string;
  name: string;
  icon: string;
  levels: CamSoftwareLevel[];
  /** Speed/feed adjustment multipliers per level (index matches levels array) */
  feedMultiplier: number[];
  /** Post-processor style affects G-code cycle recommendations */
  postStyle: string;
}

/**
 * CAM software packages matching PRISM v8.
 * Each package has version/tier levels that affect:
 *   - Available toolpath strategies
 *   - Post-processor cycles (G81 vs G83 vs custom)
 *   - Speed/feed aggressiveness (HSM modules push harder)
 *   - Programming time estimates
 */
export const CAM_SOFTWARE: CamSoftwareEntry[] = [
  {
    id: "mastercam",
    name: "Mastercam",
    icon: "MC",
    levels: [
      { id: "mill_2d", label: "Mill 2D" },
      { id: "mill_3d", label: "Mill 3D" },
      { id: "multiaxis", label: "Multiaxis" },
    ],
    feedMultiplier: [1.0, 1.0, 1.05],
    postStyle: "mastercam",
  },
  {
    id: "fusion360",
    name: "Fusion 360",
    icon: "F360",
    levels: [
      { id: "personal", label: "Personal" },
      { id: "standard", label: "Standard" },
      { id: "mfg_ext", label: "Manufacturing Extension" },
    ],
    feedMultiplier: [0.95, 1.0, 1.1],
    postStyle: "fusion",
  },
  {
    id: "solidcam",
    name: "SolidCAM",
    icon: "SC",
    levels: [
      { id: "imachining", label: "iMachining" },
    ],
    feedMultiplier: [1.15],
    postStyle: "solidcam",
  },
  {
    id: "hsmworks",
    name: "HSMWorks",
    icon: "HSM",
    levels: [
      { id: "solidworks_integrated", label: "SOLIDWORKS Integrated" },
    ],
    feedMultiplier: [1.05],
    postStyle: "hsmworks",
  },
  {
    id: "gibbscam",
    name: "GibbsCAM",
    icon: "GC",
    levels: [
      { id: "production", label: "Production CAM" },
    ],
    feedMultiplier: [1.0],
    postStyle: "gibbscam",
  },
];

export interface CamSelection {
  softwareId: string;
  levelId: string;
}

/** Get the feed multiplier for a specific CAM + level selection */
export function getCamFeedMultiplier(selection: CamSelection | null): number {
  if (!selection) return 1.0;
  const sw = CAM_SOFTWARE.find((s) => s.id === selection.softwareId);
  if (!sw) return 1.0;
  const idx = sw.levels.findIndex((l) => l.id === selection.levelId);
  return idx >= 0 ? sw.feedMultiplier[idx] : 1.0;
}
