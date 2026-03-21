/**
 * VisualLabEngine — 3D Scene Description Generator for PRISM Academy
 *
 * Generates structured 3D scene data for interactive machining visualization.
 * Does NOT render anything — produces scene descriptors that a frontend
 * (Three.js / @react-three/fiber) can consume.
 *
 * Actions:
 *   tool_scene       — 3D geometry data for cutting tools
 *   workpiece_scene   — Workpiece with material-based appearance
 *   cutting_animation — Keyframe data for tool cutting operations
 *   toolpath_preview  — Colored line segments from toolpath waypoints
 *   stress_overlay    — Force/temperature/deflection heatmap grids
 *   chip_formation    — Chip curl animation (Merchant shear model)
 *   interactive_param — Parameter ranges for interactive sliders
 *
 * Physics:
 *   Merchant shear angle: φ = π/4 - β/2 + γ/2
 *   ISO material group colors: P=blue, M=yellow, K=red, N=green, S=orange, H=gray
 *
 * Lines: ~950
 */

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

/** 3D vector */
export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/** A single mesh primitive in a scene */
export interface MeshPrimitive {
  type: "cylinder" | "cone" | "torus" | "box" | "sphere";
  position: Vec3;
  rotation: Vec3;
  dimensions: Record<string, number>;
  color: string;
  opacity?: number;
  metalness?: number;
  roughness?: number;
}

/** Annotation label in 3D space */
export interface Annotation3D {
  text: string;
  position: Vec3;
  anchor: "left" | "center" | "right";
  fontSize?: number;
  color?: string;
}

/** Tool scene output */
export interface ToolSceneResult {
  meshes: MeshPrimitive[];
  annotations: Annotation3D[];
  boundingBox: { min: Vec3; max: Vec3 };
}

/** Material appearance properties */
export interface MaterialProperties {
  color: string;
  roughness: number;
  metalness: number;
  emissive?: string;
}

/** Workpiece scene output */
export interface WorkpieceSceneResult {
  meshes: MeshPrimitive[];
  materialProperties: MaterialProperties;
  boundingBox: { min: Vec3; max: Vec3 };
}

/** Single animation keyframe */
export interface AnimationKeyframe {
  time: number;
  toolPosition: Vec3;
  toolRotation: Vec3;
  chipParticles?: Array<{ position: Vec3; velocity: Vec3; size: number }>;
  materialRemoved?: number;
}

/** Cutting animation output */
export interface CuttingAnimationResult {
  keyframes: AnimationKeyframe[];
  duration: number;
  loopable: boolean;
  operationType: string;
}

/** Toolpath line segment */
export interface ToolpathSegment {
  start: Vec3;
  end: Vec3;
  color: string;
  lineWidth: number;
  feed: number;
}

/** Toolpath preview output */
export interface ToolpathPreviewResult {
  segments: ToolpathSegment[];
  bounds: { min: Vec3; max: Vec3 };
  totalLength: number;
  rapidLength: number;
  cutLength: number;
}

/** Stress overlay output */
export interface StressOverlayResult {
  grid: { width: number; height: number; values: number[][] };
  colorMap: Array<{ value: number; color: string }>;
  unit: string;
  legend: { min: number; max: number; label: string };
}

/** Chip formation output */
export interface ChipFormationResult {
  shearAngle: number;
  chipCurlRadius: number;
  chipThickness: number;
  chipRatio: number;
  segments: Array<{ points: Vec3[]; color: string }>;
  animationSpeed: number;
}

/** Interactive slider definition */
export interface SliderDef {
  name: string;
  min: number;
  max: number;
  default: number;
  step: number;
  unit: string;
  affectsPhysics: string[];
}

/** Interactive param output */
export interface InteractiveParamResult {
  sliders: SliderDef[];
  operation: string;
  material: string;
  toolType: string;
}

// ═══════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════

/** ISO material group colors (P/M/K/N/S/H) */
const ISO_GROUP_COLORS: Record<string, string> = {
  P: "#2563eb",  // Steel — blue
  M: "#eab308",  // Stainless — yellow
  K: "#dc2626",  // Cast iron — red
  N: "#16a34a",  // Non-ferrous — green
  S: "#f97316",  // Super alloys — orange
  H: "#6b7280",  // Hardened steel — gray
};

/** Material to ISO group mapping */
const MATERIAL_ISO_MAP: Record<string, string> = {
  steel: "P", "carbon_steel": "P", "alloy_steel": "P", "1018": "P", "4140": "P", "1045": "P",
  stainless: "M", "stainless_steel": "M", "304": "M", "316": "M", "17-4ph": "M",
  cast_iron: "K", "gray_iron": "K", "ductile_iron": "K",
  aluminum: "N", "6061": "N", "7075": "N", "brass": "N", "copper": "N",
  titanium: "S", "ti6al4v": "S", "inconel": "S", "inconel_718": "S", "hastelloy": "S",
  hardened_steel: "H", "d2": "H", "h13": "H", "m2": "H",
};

/** Material appearance map */
const MATERIAL_APPEARANCE: Record<string, MaterialProperties> = {
  P: { color: "#8899aa", roughness: 0.4, metalness: 0.8 },
  M: { color: "#c0c0c8", roughness: 0.3, metalness: 0.85 },
  K: { color: "#6a6a6a", roughness: 0.6, metalness: 0.7 },
  N: { color: "#d4d4d4", roughness: 0.2, metalness: 0.95 },
  S: { color: "#a0a8b0", roughness: 0.35, metalness: 0.82 },
  H: { color: "#505560", roughness: 0.5, metalness: 0.75 },
};

/** Coating colors */
const COATING_COLORS: Record<string, string> = {
  TiN: "#c8a200",
  TiAlN: "#6b3fa0",
  TiCN: "#888888",
  AlTiN: "#333333",
  DLC: "#1a1a1a",
  uncoated: "#b0b0b0",
  ZrN: "#f0e060",
};

/** Friction angles (β) by ISO group — approximate */
const FRICTION_ANGLES: Record<string, number> = {
  P: 0.52, M: 0.56, K: 0.44, N: 0.38, S: 0.61, H: 0.65,
};

// ═══════════════════════════════════════════════════════════════
// Engine
// ═══════════════════════════════════════════════════════════════

type VisualLabAction =
  | "tool_scene"
  | "workpiece_scene"
  | "cutting_animation"
  | "toolpath_preview"
  | "stress_overlay"
  | "chip_formation"
  | "interactive_param";

/**
 * VisualLabEngine — Generates 3D scene descriptions for PRISM Academy
 * machining visualization. Outputs structured data consumed by Three.js
 * or @react-three/fiber frontends.
 */
export class VisualLabEngine {
  /**
   * Main dispatch method.
   * @param action - The visualization action to perform
   * @param params - Action-specific parameters
   * @returns Structured scene data
   */
  calculate(action: VisualLabAction, params: Record<string, any>): any {
    switch (action) {
      case "tool_scene":
        return this.generateToolScene(params);
      case "workpiece_scene":
        return this.generateWorkpieceScene(params);
      case "cutting_animation":
        return this.generateCuttingAnimation(params);
      case "toolpath_preview":
        return this.generateToolpathPreview(params);
      case "stress_overlay":
        return this.generateStressOverlay(params);
      case "chip_formation":
        return this.generateChipFormation(params);
      case "interactive_param":
        return this.generateInteractiveParams(params);
      default:
        return { error: `Unknown action: ${action}` };
    }
  }

  // ── tool_scene ───────────────────────────────────────────────

  /**
   * Generate 3D mesh data for a cutting tool.
   * Builds tool from primitives: shank (cylinder), flute body (cylinder),
   * tip (cone/torus for corner radius), flutes (visual grooves).
   */
  private generateToolScene(params: Record<string, any>): ToolSceneResult {
    const toolType: string = params.toolType ?? "endmill";
    const diameter: number = params.diameter ?? 12;
    const fluteLength: number = params.fluteLength ?? diameter * 3;
    const fluteCount: number = params.fluteCount ?? 4;
    const cornerRadius: number = params.cornerRadius ?? 0;
    const coatingColor: string = params.coatingColor ?? "TiAlN";

    const radius = diameter / 2;
    const shankLength = fluteLength * 0.8;
    const color = COATING_COLORS[coatingColor] ?? COATING_COLORS.uncoated;
    const shankColor = "#b0b0b0";

    const meshes: MeshPrimitive[] = [];
    const annotations: Annotation3D[] = [];

    // Shank — cylinder above flute
    meshes.push({
      type: "cylinder",
      position: { x: 0, y: fluteLength + shankLength / 2, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      dimensions: { radius: radius * 0.95, height: shankLength },
      color: shankColor,
      metalness: 0.8,
      roughness: 0.3,
    });

    // Flute body
    meshes.push({
      type: "cylinder",
      position: { x: 0, y: fluteLength / 2, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      dimensions: { radius, height: fluteLength },
      color,
      metalness: 0.7,
      roughness: 0.4,
    });

    // Tool tip — flat endmill or ball nose or bull nose
    if (toolType === "ballnose" || toolType === "ball_endmill") {
      meshes.push({
        type: "sphere",
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        dimensions: { radius },
        color,
        metalness: 0.7,
        roughness: 0.4,
      });
    } else if (cornerRadius > 0) {
      // Bull nose — torus at bottom edge
      meshes.push({
        type: "torus",
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: Math.PI / 2, y: 0, z: 0 },
        dimensions: {
          majorRadius: radius - cornerRadius,
          minorRadius: cornerRadius,
        },
        color,
        metalness: 0.7,
        roughness: 0.4,
      });
    }

    // Flute grooves — visual helical cuts as thin cylinders
    for (let i = 0; i < fluteCount; i++) {
      const angle = (2 * Math.PI * i) / fluteCount;
      const grooveDepth = radius * 0.15;
      meshes.push({
        type: "cylinder",
        position: {
          x: (radius - grooveDepth / 2) * Math.cos(angle),
          y: fluteLength / 2,
          z: (radius - grooveDepth / 2) * Math.sin(angle),
        },
        rotation: { x: 0, y: angle, z: 0.15 }, // slight helix angle
        dimensions: { radius: grooveDepth / 2, height: fluteLength * 0.95 },
        color: "#222222",
        opacity: 0.6,
      });
    }

    // Drill point — cone tip
    if (toolType === "drill") {
      const pointAngle = params.pointAngle ?? 118;
      const halfAngle = (pointAngle * Math.PI) / 360;
      const pointHeight = radius / Math.tan(halfAngle);
      meshes.push({
        type: "cone",
        position: { x: 0, y: -pointHeight / 2, z: 0 },
        rotation: { x: Math.PI, y: 0, z: 0 },
        dimensions: { radius, height: pointHeight },
        color,
        metalness: 0.7,
        roughness: 0.4,
      });
    }

    // Annotations
    annotations.push(
      { text: `⌀${diameter}mm`, position: { x: radius + 2, y: fluteLength / 2, z: 0 }, anchor: "left" },
      { text: `LOC: ${fluteLength}mm`, position: { x: radius + 2, y: fluteLength * 0.8, z: 0 }, anchor: "left" },
      { text: `${fluteCount}F`, position: { x: -radius - 2, y: fluteLength / 2, z: 0 }, anchor: "right" },
    );
    if (cornerRadius > 0) {
      annotations.push({
        text: `CR: ${cornerRadius}mm`,
        position: { x: radius + 2, y: 1, z: 0 },
        anchor: "left",
      });
    }

    const totalHeight = fluteLength + shankLength;
    return {
      meshes,
      annotations,
      boundingBox: {
        min: { x: -radius, y: toolType === "drill" ? -(radius / Math.tan((59 * Math.PI) / 180)) : 0, z: -radius },
        max: { x: radius, y: totalHeight, z: radius },
      },
    };
  }

  // ── workpiece_scene ──────────────────────────────────────────

  /**
   * Generate workpiece geometry with material-based appearance.
   * Supports block, cylinder, and tube shapes.
   */
  private generateWorkpieceScene(params: Record<string, any>): WorkpieceSceneResult {
    const shape: string = params.shape ?? "block";
    const dims = params.dimensions ?? { x: 100, y: 50, z: 100 };
    const material: string = (params.material ?? "steel").toLowerCase().replace(/\s+/g, "_");

    const isoGroup = MATERIAL_ISO_MAP[material] ?? "P";
    const matProps = { ...MATERIAL_APPEARANCE[isoGroup] };
    const meshes: MeshPrimitive[] = [];

    switch (shape) {
      case "block": {
        const x = dims.x ?? 100;
        const y = dims.y ?? 50;
        const z = dims.z ?? 100;
        meshes.push({
          type: "box",
          position: { x: 0, y: y / 2, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          dimensions: { width: x, height: y, depth: z },
          color: matProps.color,
          metalness: matProps.metalness,
          roughness: matProps.roughness,
        });
        return {
          meshes,
          materialProperties: matProps,
          boundingBox: { min: { x: -x / 2, y: 0, z: -z / 2 }, max: { x: x / 2, y: y, z: z / 2 } },
        };
      }
      case "cylinder": {
        const d = dims.diameter ?? 50;
        const l = dims.length ?? 100;
        meshes.push({
          type: "cylinder",
          position: { x: 0, y: l / 2, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          dimensions: { radius: d / 2, height: l },
          color: matProps.color,
          metalness: matProps.metalness,
          roughness: matProps.roughness,
        });
        return {
          meshes,
          materialProperties: matProps,
          boundingBox: { min: { x: -d / 2, y: 0, z: -d / 2 }, max: { x: d / 2, y: l, z: d / 2 } },
        };
      }
      case "tube": {
        const od = dims.outerDiameter ?? dims.diameter ?? 60;
        const id = dims.innerDiameter ?? od * 0.6;
        const l = dims.length ?? 100;
        // Outer cylinder
        meshes.push({
          type: "cylinder",
          position: { x: 0, y: l / 2, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          dimensions: { radius: od / 2, height: l },
          color: matProps.color,
          metalness: matProps.metalness,
          roughness: matProps.roughness,
        });
        // Inner bore (darker, represents hole)
        meshes.push({
          type: "cylinder",
          position: { x: 0, y: l / 2, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          dimensions: { radius: id / 2, height: l + 0.2 },
          color: "#1a1a1a",
          opacity: 0.9,
        });
        return {
          meshes,
          materialProperties: matProps,
          boundingBox: { min: { x: -od / 2, y: 0, z: -od / 2 }, max: { x: od / 2, y: l, z: od / 2 } },
        };
      }
      default: {
        // Fallback to block
        meshes.push({
          type: "box",
          position: { x: 0, y: 25, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          dimensions: { width: 100, height: 50, depth: 100 },
          color: matProps.color,
          metalness: matProps.metalness,
          roughness: matProps.roughness,
        });
        return {
          meshes,
          materialProperties: matProps,
          boundingBox: { min: { x: -50, y: 0, z: -50 }, max: { x: 50, y: 50, z: 50 } },
        };
      }
    }
  }

  // ── cutting_animation ────────────────────────────────────────

  /**
   * Generate keyframe animation data for a cutting operation.
   * Supports face mill, pocket, slot, drill, turn OD, turn face.
   */
  private generateCuttingAnimation(params: Record<string, any>): CuttingAnimationResult {
    const operation: string = params.operation ?? "face_mill";
    const toolDiameter: number = params.toolDiameter ?? 50;
    const depth: number = params.depth ?? 2;
    const feedRate: number = params.feedRate ?? 500; // mm/min
    const spindleRpm: number = params.spindleRpm ?? 3000;
    const stepover: number = params.stepover ?? toolDiameter * 0.65;

    const keyframes: AnimationKeyframe[] = [];
    const toolRadius = toolDiameter / 2;

    switch (operation) {
      case "face_mill": {
        // Linear passes across the top face
        const workWidth = params.workWidth ?? 100;
        const passes = Math.ceil(workWidth / stepover);
        const totalTime = (workWidth * passes) / feedRate; // minutes approximation
        const framesPerPass = 10;
        const totalFrames = passes * framesPerPass;

        for (let p = 0; p < passes; p++) {
          const zPos = -workWidth / 2 + p * stepover;
          for (let f = 0; f < framesPerPass; f++) {
            const t = (p * framesPerPass + f) / totalFrames;
            const xPos = -workWidth / 2 + (f / framesPerPass) * workWidth * 1.2 - toolRadius;
            keyframes.push({
              time: t,
              toolPosition: { x: xPos, y: depth, z: zPos },
              toolRotation: { x: 0, y: (spindleRpm * t * totalTime * 2 * Math.PI) / 60, z: 0 },
              materialRemoved: t * workWidth * stepover * depth * passes / 1000,
            });
          }
        }
        return { keyframes, duration: totalTime * 60, loopable: true, operationType: operation };
      }

      case "pocket": {
        // Spiral-in pocket from outside to center
        const pocketWidth = params.pocketWidth ?? 60;
        const pocketLength = params.pocketLength ?? 80;
        const totalSteps = 40;
        const spirals = Math.ceil(Math.min(pocketWidth, pocketLength) / (2 * stepover));

        for (let i = 0; i < totalSteps; i++) {
          const t = i / totalSteps;
          const spiral = t * spirals;
          const inset = spiral * stepover;
          const angle = spiral * 2 * Math.PI;
          const rx = (pocketLength / 2 - inset) * Math.max(0.05, 1 - t);
          const rz = (pocketWidth / 2 - inset) * Math.max(0.05, 1 - t);
          keyframes.push({
            time: t,
            toolPosition: { x: rx * Math.cos(angle), y: -depth, z: rz * Math.sin(angle) },
            toolRotation: { x: 0, y: angle * spindleRpm / 60, z: 0 },
            materialRemoved: t * pocketWidth * pocketLength * depth / 1000,
          });
        }
        return { keyframes, duration: 15, loopable: true, operationType: operation };
      }

      case "slot": {
        // Straight slot cut
        const slotLength = params.slotLength ?? 80;
        const steps = 30;
        for (let i = 0; i < steps; i++) {
          const t = i / steps;
          keyframes.push({
            time: t,
            toolPosition: { x: -slotLength / 2 + t * slotLength, y: -depth, z: 0 },
            toolRotation: { x: 0, y: t * spindleRpm * 2 * Math.PI / 60, z: 0 },
            chipParticles: this.generateChipParticles(t, toolRadius, depth),
            materialRemoved: t * slotLength * toolDiameter * depth / 1000,
          });
        }
        return { keyframes, duration: (slotLength / feedRate) * 60, loopable: true, operationType: operation };
      }

      case "drill": {
        // Plunge into workpiece
        const holeDepth = params.holeDepth ?? depth * 5;
        const steps = 30;
        for (let i = 0; i < steps; i++) {
          const t = i / steps;
          keyframes.push({
            time: t,
            toolPosition: { x: 0, y: 5 - t * (holeDepth + 5), z: 0 },
            toolRotation: { x: 0, y: t * spindleRpm * 4 * Math.PI / 60, z: 0 },
            chipParticles: this.generateChipParticles(t, toolRadius * 0.3, holeDepth * t),
            materialRemoved: t * Math.PI * toolRadius * toolRadius * holeDepth / 1000,
          });
        }
        return { keyframes, duration: (holeDepth / (feedRate / spindleRpm)) * 0.1, loopable: false, operationType: operation };
      }

      case "turn_od": {
        // OD turning — tool moves along Z, workpiece rotates
        const turnLength = params.turnLength ?? 80;
        const steps = 40;
        for (let i = 0; i < steps; i++) {
          const t = i / steps;
          keyframes.push({
            time: t,
            toolPosition: { x: params.startDiameter ? params.startDiameter / 2 - depth : 25 - depth, y: 0, z: -t * turnLength },
            toolRotation: { x: 0, y: 0, z: 0 }, // tool doesn't rotate in turning
            materialRemoved: t * Math.PI * ((25 ** 2) - ((25 - depth) ** 2)) * turnLength / 1000,
          });
        }
        return { keyframes, duration: (turnLength / feedRate) * 60, loopable: true, operationType: operation };
      }

      case "turn_face": {
        // Face turning — tool moves radially inward
        const faceDiameter = params.faceDiameter ?? 50;
        const steps = 30;
        for (let i = 0; i < steps; i++) {
          const t = i / steps;
          const r = faceDiameter / 2 * (1 - t);
          keyframes.push({
            time: t,
            toolPosition: { x: r, y: 0, z: -depth },
            toolRotation: { x: 0, y: 0, z: 0 },
            materialRemoved: t * Math.PI * (faceDiameter / 2) ** 2 * depth / 1000,
          });
        }
        return { keyframes, duration: 8, loopable: true, operationType: operation };
      }

      default:
        return { keyframes: [], duration: 0, loopable: false, operationType: operation };
    }
  }

  /** Generate decorative chip particles for animation frames */
  private generateChipParticles(
    t: number, radius: number, depth: number
  ): Array<{ position: Vec3; velocity: Vec3; size: number }> {
    const count = Math.floor(3 + t * 5);
    const particles: Array<{ position: Vec3; velocity: Vec3; size: number }> = [];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * 2 * Math.PI;
      particles.push({
        position: {
          x: radius * 0.8 * Math.cos(angle),
          y: -depth * 0.5 + Math.random() * 2,
          z: radius * 0.8 * Math.sin(angle),
        },
        velocity: {
          x: Math.cos(angle) * (2 + Math.random() * 3),
          y: 1 + Math.random() * 4,
          z: Math.sin(angle) * (2 + Math.random() * 3),
        },
        size: 0.3 + Math.random() * 0.8,
      });
    }
    return particles;
  }

  // ── toolpath_preview ─────────────────────────────────────────

  /**
   * Convert toolpath waypoints to colored line segments.
   * Color encodes feed rate — rapid moves are distinct from cuts.
   */
  private generateToolpathPreview(params: Record<string, any>): ToolpathPreviewResult {
    const waypoints: Array<{ x: number; y: number; z: number; feed: number }> =
      params.waypoints ?? [];
    const rapidColor: string = params.rapidColor ?? "#ff4444";
    const cutColor: string = params.cutColor ?? "#44ff44";
    const feedColorMap: Record<string, string> = params.feedColorMap ?? {};

    if (waypoints.length < 2) {
      return {
        segments: [],
        bounds: { min: { x: 0, y: 0, z: 0 }, max: { x: 0, y: 0, z: 0 } },
        totalLength: 0,
        rapidLength: 0,
        cutLength: 0,
      };
    }

    const segments: ToolpathSegment[] = [];
    let totalLength = 0;
    let rapidLength = 0;
    let cutLength = 0;

    const minB: Vec3 = { x: Infinity, y: Infinity, z: Infinity };
    const maxB: Vec3 = { x: -Infinity, y: -Infinity, z: -Infinity };

    // Find max feed to normalize color gradient
    const feeds = waypoints.map(w => w.feed).filter(f => f > 0);
    const maxFeed = feeds.length > 0 ? Math.max(...feeds) : 1000;

    for (let i = 1; i < waypoints.length; i++) {
      const prev = waypoints[i - 1];
      const curr = waypoints[i];
      const dx = curr.x - prev.x;
      const dy = curr.y - prev.y;
      const dz = curr.z - prev.z;
      const len = Math.sqrt(dx * dx + dy * dy + dz * dz);

      const isRapid = curr.feed <= 0 || curr.feed >= 9999;
      totalLength += len;

      let color: string;
      if (isRapid) {
        color = rapidColor;
        rapidLength += len;
      } else {
        // Interpolate color based on feed rate
        const feedNorm = Math.min(curr.feed / maxFeed, 1);
        color = feedColorMap[String(Math.round(curr.feed))] ??
          this.interpolateFeedColor(feedNorm, cutColor);
        cutLength += len;
      }

      segments.push({
        start: { x: prev.x, y: prev.y, z: prev.z },
        end: { x: curr.x, y: curr.y, z: curr.z },
        color,
        lineWidth: isRapid ? 1 : 2,
        feed: curr.feed,
      });

      // Update bounds
      for (const pt of [prev, curr]) {
        minB.x = Math.min(minB.x, pt.x);
        minB.y = Math.min(minB.y, pt.y);
        minB.z = Math.min(minB.z, pt.z);
        maxB.x = Math.max(maxB.x, pt.x);
        maxB.y = Math.max(maxB.y, pt.y);
        maxB.z = Math.max(maxB.z, pt.z);
      }
    }

    return {
      segments,
      bounds: { min: minB, max: maxB },
      totalLength: Math.round(totalLength * 100) / 100,
      rapidLength: Math.round(rapidLength * 100) / 100,
      cutLength: Math.round(cutLength * 100) / 100,
    };
  }

  /** Interpolate feed color: low feed = yellow, high feed = green */
  private interpolateFeedColor(norm: number, _baseColor: string): string {
    // 0 = red (low feed), 0.5 = yellow, 1.0 = green (full feed)
    const r = Math.round(255 * (1 - norm));
    const g = Math.round(200 + 55 * norm);
    const b = Math.round(40 * norm);
    return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
  }

  // ── stress_overlay ───────────────────────────────────────────

  /**
   * Generate force/temperature/deflection heatmap overlay.
   * Creates a 2D grid of values with a color map for rendering.
   */
  private generateStressOverlay(params: Record<string, any>): StressOverlayResult {
    const overlayType: string = params.type ?? "force";
    const gridRes: number = params.gridResolution ?? 20;
    const maxValue: number = params.maxValue ?? 1000;
    const cuttingZone = params.cuttingZone ?? { x: 0, y: 0, radius: 10 };

    const width = gridRes;
    const height = gridRes;
    const values: number[][] = [];

    const cx = cuttingZone.x ?? 0;
    const cy = cuttingZone.y ?? 0;
    const cRadius = cuttingZone.radius ?? 10;

    // Generate values based on distance from cutting zone
    for (let row = 0; row < height; row++) {
      const rowVals: number[] = [];
      for (let col = 0; col < width; col++) {
        const nx = (col / width - 0.5) * 2; // normalize to -1..1
        const ny = (row / height - 0.5) * 2;
        const nCx = (cx / 50); // normalize cutting zone center
        const nCy = (cy / 50);
        const dist = Math.sqrt((nx - nCx) ** 2 + (ny - nCy) ** 2);
        const nRad = cRadius / 50;

        let value: number;
        switch (overlayType) {
          case "force":
            // Gaussian falloff from cutting zone
            value = maxValue * Math.exp(-(dist * dist) / (2 * nRad * nRad));
            break;
          case "temperature":
            // Wider thermal spread with exponential decay
            value = maxValue * Math.exp(-dist / (nRad * 1.5));
            break;
          case "deflection":
            // Cantilever-like: increases with distance from clamp (left edge)
            value = maxValue * Math.max(0, 1 - dist / 2) * ((nx + 1) / 2);
            break;
          default:
            value = maxValue * Math.exp(-(dist * dist) / (2 * nRad * nRad));
        }
        rowVals.push(Math.round(value * 100) / 100);
      }
      values.push(rowVals);
    }

    // Color maps per type
    const colorMaps: Record<string, Array<{ value: number; color: string }>> = {
      force: [
        { value: 0, color: "#0000ff" },
        { value: 0.25, color: "#00ffff" },
        { value: 0.5, color: "#00ff00" },
        { value: 0.75, color: "#ffff00" },
        { value: 1.0, color: "#ff0000" },
      ],
      temperature: [
        { value: 0, color: "#000080" },
        { value: 0.25, color: "#0040ff" },
        { value: 0.5, color: "#ff8000" },
        { value: 0.75, color: "#ff4000" },
        { value: 1.0, color: "#ff0000" },
      ],
      deflection: [
        { value: 0, color: "#00ff00" },
        { value: 0.33, color: "#ffff00" },
        { value: 0.66, color: "#ff8800" },
        { value: 1.0, color: "#ff0000" },
      ],
    };

    const units: Record<string, string> = {
      force: "N",
      temperature: "°C",
      deflection: "μm",
    };

    const labels: Record<string, string> = {
      force: "Cutting Force Distribution",
      temperature: "Temperature Field",
      deflection: "Workpiece Deflection",
    };

    return {
      grid: { width, height, values },
      colorMap: colorMaps[overlayType] ?? colorMaps.force,
      unit: units[overlayType] ?? "N",
      legend: { min: 0, max: maxValue, label: labels[overlayType] ?? "Stress" },
    };
  }

  // ── chip_formation ───────────────────────────────────────────

  /**
   * Generate chip formation animation based on Merchant shear plane model.
   *
   * Merchant shear angle: φ = π/4 - β/2 + γ/2
   * where β = friction angle, γ = rake angle
   *
   * Chip ratio: r = t₁/t₂ = sin(φ) / cos(φ - γ)
   * Chip curl radius ≈ 2-5× chip thickness (empirical)
   */
  private generateChipFormation(params: Record<string, any>): ChipFormationResult {
    const material: string = (params.material ?? "steel").toLowerCase().replace(/\s+/g, "_");
    const rakeAngle: number = params.rakeAngle ?? 8;  // degrees
    const chipThickness: number = params.chipThickness ?? 0.15; // mm (uncut)
    const cuttingSpeed: number = params.cuttingSpeed ?? 200; // m/min

    const isoGroup = MATERIAL_ISO_MAP[material] ?? "P";
    const beta = FRICTION_ANGLES[isoGroup] ?? 0.52; // friction angle in radians
    const gamma = (rakeAngle * Math.PI) / 180;      // rake angle in radians

    // Merchant shear angle: φ = π/4 - β/2 + γ/2
    const phi = Math.PI / 4 - beta / 2 + gamma / 2;
    const shearAngleDeg = (phi * 180) / Math.PI;

    // Chip ratio: r = sin(φ) / cos(φ - γ)
    const chipRatio = Math.sin(phi) / Math.cos(phi - gamma);

    // Deformed chip thickness
    const deformedThickness = chipThickness / chipRatio;

    // Chip curl radius — empirical: 3-8× deformed thickness, depends on material
    const curlMultipliers: Record<string, number> = {
      P: 5.0, M: 4.5, K: 3.0, N: 6.0, S: 4.0, H: 3.5,
    };
    const curlMultiplier = curlMultipliers[isoGroup] ?? 5.0;
    const chipCurlRadius = deformedThickness * curlMultiplier;

    // Generate chip curl segments as polylines
    const segments: Array<{ points: Vec3[]; color: string }> = [];
    const chipColor = ISO_GROUP_COLORS[isoGroup] ?? "#8888aa";
    const hotColor = "#ff6600";

    // Shear plane visualization
    const shearLen = chipThickness / Math.sin(phi);
    segments.push({
      points: [
        { x: 0, y: 0, z: 0 },
        { x: shearLen * Math.cos(phi), y: shearLen * Math.sin(phi), z: 0 },
      ],
      color: "#ff0000", // shear plane in red
    });

    // Chip curl arc — parametric spiral
    const arcSegments = 20;
    const chipPoints: Vec3[] = [];
    for (let i = 0; i <= arcSegments; i++) {
      const t = i / arcSegments;
      const angle = t * 2 * Math.PI; // one full curl
      const r = chipCurlRadius + t * deformedThickness * 0.5; // slight spiral
      const startX = shearLen * Math.cos(phi);
      const startY = shearLen * Math.sin(phi);
      chipPoints.push({
        x: startX + r * Math.sin(angle),
        y: startY + r * (1 - Math.cos(angle)),
        z: 0,
      });
    }
    segments.push({ points: chipPoints, color: chipColor });

    // Hot zone at tool-chip interface
    segments.push({
      points: [
        { x: 0, y: 0, z: 0 },
        { x: deformedThickness * 2, y: deformedThickness * 0.5, z: 0 },
      ],
      color: hotColor,
    });

    // Tool rake face reference line
    segments.push({
      points: [
        { x: 0, y: 0, z: 0 },
        { x: -3 * Math.sin(gamma), y: 3 * Math.cos(gamma), z: 0 },
      ],
      color: "#888888",
    });

    // Animation speed scales with cutting speed
    const animSpeed = Math.min(cuttingSpeed / 100, 3.0);

    return {
      shearAngle: Math.round(shearAngleDeg * 100) / 100,
      chipCurlRadius: Math.round(chipCurlRadius * 1000) / 1000,
      chipThickness: Math.round(deformedThickness * 1000) / 1000,
      chipRatio: Math.round(chipRatio * 1000) / 1000,
      segments,
      animationSpeed: Math.round(animSpeed * 100) / 100,
    };
  }

  // ── interactive_param ────────────────────────────────────────

  /**
   * Return parameter ranges for interactive UI sliders.
   * Ranges are operation- and material-aware.
   */
  private generateInteractiveParams(params: Record<string, any>): InteractiveParamResult {
    const operation: string = params.operation ?? "face_mill";
    const material: string = (params.material ?? "steel").toLowerCase().replace(/\s+/g, "_");
    const toolType: string = params.toolType ?? "endmill";
    const isoGroup = MATERIAL_ISO_MAP[material] ?? "P";

    // Base speed ranges by ISO group (m/min)
    const speedRanges: Record<string, { min: number; max: number; def: number }> = {
      P: { min: 80, max: 350, def: 200 },
      M: { min: 60, max: 250, def: 150 },
      K: { min: 100, max: 400, def: 250 },
      N: { min: 200, max: 1500, def: 600 },
      S: { min: 20, max: 80, def: 40 },
      H: { min: 40, max: 150, def: 80 },
    };

    // Feed per tooth ranges by ISO group
    const fzRanges: Record<string, { min: number; max: number; def: number }> = {
      P: { min: 0.04, max: 0.25, def: 0.12 },
      M: { min: 0.03, max: 0.20, def: 0.10 },
      K: { min: 0.05, max: 0.30, def: 0.15 },
      N: { min: 0.05, max: 0.35, def: 0.15 },
      S: { min: 0.02, max: 0.10, def: 0.05 },
      H: { min: 0.03, max: 0.12, def: 0.06 },
    };

    const vc = speedRanges[isoGroup] ?? speedRanges.P;
    const fz = fzRanges[isoGroup] ?? fzRanges.P;

    const sliders: SliderDef[] = [];

    // Common sliders for all operations
    sliders.push({
      name: "cuttingSpeed",
      min: vc.min, max: vc.max, default: vc.def, step: 5,
      unit: "m/min",
      affectsPhysics: ["spindleRpm", "cuttingForce", "temperature", "toolLife"],
    });

    if (operation.startsWith("turn")) {
      sliders.push(
        {
          name: "feedRate", min: 0.05, max: 0.5, default: 0.2, step: 0.01,
          unit: "mm/rev",
          affectsPhysics: ["surfaceFinish", "cuttingForce", "chipThickness"],
        },
        {
          name: "depthOfCut", min: 0.2, max: 6, default: 2, step: 0.1,
          unit: "mm",
          affectsPhysics: ["cuttingForce", "deflection", "vibration", "MRR"],
        },
        {
          name: "noseRadius", min: 0.2, max: 1.6, default: 0.8, step: 0.1,
          unit: "mm",
          affectsPhysics: ["surfaceFinish", "cuttingForce", "vibration"],
        },
      );
    } else if (operation === "drill") {
      sliders.push(
        {
          name: "feedPerRev", min: 0.05, max: 0.4, default: 0.15, step: 0.01,
          unit: "mm/rev",
          affectsPhysics: ["thrust", "torque", "chipEvacuation"],
        },
        {
          name: "drillDiameter", min: 1, max: 40, default: 10, step: 0.5,
          unit: "mm",
          affectsPhysics: ["thrust", "torque", "holeQuality"],
        },
        {
          name: "peckDepth", min: 0, max: 30, default: 0, step: 1,
          unit: "mm",
          affectsPhysics: ["chipEvacuation", "cycleTime"],
        },
      );
    } else {
      // Milling operations
      sliders.push(
        {
          name: "feedPerTooth", min: fz.min, max: fz.max, default: fz.def, step: 0.005,
          unit: "mm/tooth",
          affectsPhysics: ["surfaceFinish", "cuttingForce", "chipThickness", "MRR"],
        },
        {
          name: "axialDepth", min: 0.2, max: 20, default: 3, step: 0.5,
          unit: "mm",
          affectsPhysics: ["cuttingForce", "vibration", "MRR", "stability"],
        },
        {
          name: "radialDepth", min: 0.5, max: 25, default: 8, step: 0.5,
          unit: "mm",
          affectsPhysics: ["cuttingForce", "chipThinning", "MRR", "deflection"],
        },
        {
          name: "toolDiameter", min: 3, max: 50, default: 12, step: 1,
          unit: "mm",
          affectsPhysics: ["spindleRpm", "cuttingForce", "deflection", "MRR"],
        },
      );

      // Pocket-specific
      if (operation === "pocket") {
        sliders.push({
          name: "stepover", min: 10, max: 90, default: 65, step: 5,
          unit: "%",
          affectsPhysics: ["chipThinning", "cycleTime", "surfaceFinish"],
        });
      }
    }

    // Rake angle for chip formation visualization
    if (toolType === "endmill" || toolType === "facemill") {
      sliders.push({
        name: "rakeAngle", min: -5, max: 20, default: 8, step: 1,
        unit: "°",
        affectsPhysics: ["shearAngle", "chipFormation", "cuttingForce"],
      });
    }

    return { sliders, operation, material, toolType };
  }
}

/** Singleton instance */
export const visualLabEngine = new VisualLabEngine();
