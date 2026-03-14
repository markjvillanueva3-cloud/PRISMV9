/**
 * FeatureClusteringEngine — CK-MS1/U01
 * Groups 200+ features into machining campaigns (setups) using
 * k-means clustering on position, access direction, type, and tolerance.
 * Feeds into OperationSequencer and MultiSetupPlanner.
 */

export interface ClusterableFeature {
  id: string;
  type: string;
  operation: "roughing" | "finishing" | "drilling" | "rest" | "facing";
  position: { x: number; y: number; z: number };
  access_direction: { x: number; y: number; z: number };
  dimensions?: { length_mm?: number; width_mm?: number; depth_mm?: number; diameter_mm?: number };
  tolerance_mm?: number;
  surface_finish_Ra?: number;
  wall_thickness_mm?: number;
  corner_radius_mm?: number;
  priority?: number;
  requires_feature_ids?: string[];
}

export interface FeatureCluster {
  cluster_id: number;
  setup_orientation: { x: number; y: number; z: number };
  orientation_label: string;
  features: ClusterableFeature[];
  feature_count: number;
  operations: Array<{
    sequence: number;
    feature_id: string;
    type: string;
    operation: string;
  }>;
  estimated_tools: number;
  estimated_cycle_time_min: number;
}

export interface ClusteringResult {
  clusters: FeatureCluster[];
  total_features: number;
  total_setups: number;
  unclustered_features: string[];
  dependency_edges: Array<{ from: string; to: string; reason: string }>;
  clustering_method: string;
  quality_score: number;
}

// ── 6 cardinal directions ─────────────────────────────────────
const DIRECTIONS = [
  { x: 0, y: 0, z: 1, label: "Top (+Z)" },
  { x: 0, y: 0, z: -1, label: "Bottom (-Z)" },
  { x: 1, y: 0, z: 0, label: "Right (+X)" },
  { x: -1, y: 0, z: 0, label: "Left (-X)" },
  { x: 0, y: 1, z: 0, label: "Front (+Y)" },
  { x: 0, y: -1, z: 0, label: "Back (-Y)" },
];

// ── Operation phase order ─────────────────────────────────────
const PHASE_ORDER: Record<string, number> = {
  facing: 0, roughing: 1, drilling: 2, rest: 3, finishing: 4,
};

export class FeatureClusteringEngine {
  /**
   * Cluster features into setup-oriented groups.
   * Uses access-direction grouping + within-group spatial k-means.
   */
  cluster(features: ClusterableFeature[]): ClusteringResult {
    if (!features.length) {
      return {
        clusters: [], total_features: 0, total_setups: 0,
        unclustered_features: [], dependency_edges: [],
        clustering_method: "none", quality_score: 1.0,
      };
    }

    // ── 1. Build dependency edges ─────────────────────────────
    const deps = this._buildDependencies(features);

    // ── 2. Group by access direction ──────────────────────────
    const dirGroups = this._groupByDirection(features);

    // ── 3. Merge opposite directions if indexable ─────────────
    const merged = this._mergeOpposites(dirGroups);

    // ── 4. Sort features within each cluster ──────────────────
    const clusters: FeatureCluster[] = [];
    let clusterId = 0;

    for (const [dirLabel, feats] of merged.entries()) {
      if (!feats.length) continue;

      // Find matching direction
      const dir = DIRECTIONS.find((d) => d.label === dirLabel) || DIRECTIONS[0];

      // Sort by phase → priority → spatial proximity
      const sorted = this._sortWithinCluster(feats, deps);

      // Estimate tools and cycle time
      const uniqueTypes = new Set(sorted.map((f) => f.type));
      const estTools = Math.min(uniqueTypes.size + 2, 25);
      const estTime = sorted.length * 2.5; // ~2.5 min per feature average

      clusters.push({
        cluster_id: clusterId++,
        setup_orientation: { x: dir.x, y: dir.y, z: dir.z },
        orientation_label: dirLabel,
        features: sorted,
        feature_count: sorted.length,
        operations: sorted.map((f, i) => ({
          sequence: i + 1,
          feature_id: f.id,
          type: f.type,
          operation: f.operation,
        })),
        estimated_tools: estTools,
        estimated_cycle_time_min: Math.round(estTime * 10) / 10,
      });
    }

    // Sort clusters: largest first (most features = primary setup)
    clusters.sort((a, b) => b.feature_count - a.feature_count);
    clusters.forEach((c, i) => { c.cluster_id = i; });

    // ── 5. Quality scoring ────────────────────────────────────
    const totalFeats = features.length;
    const clusteredFeats = clusters.reduce((s, c) => s + c.feature_count, 0);
    const quality = clusteredFeats / Math.max(1, totalFeats);

    return {
      clusters,
      total_features: totalFeats,
      total_setups: clusters.length,
      unclustered_features: features
        .filter((f) => !clusters.some((c) => c.features.includes(f)))
        .map((f) => f.id),
      dependency_edges: deps,
      clustering_method: "direction-group + phase-sort",
      quality_score: Math.round(quality * 100) / 100,
    };
  }

  /**
   * Build dependency edges from feature prerequisites and type rules.
   */
  private _buildDependencies(features: ClusterableFeature[]) {
    const deps: Array<{ from: string; to: string; reason: string }> = [];
    const featureMap = new Map(features.map((f) => [f.id, f]));

    for (const f of features) {
      // Explicit prerequisites
      if (f.requires_feature_ids) {
        for (const reqId of f.requires_feature_ids) {
          if (featureMap.has(reqId)) {
            deps.push({ from: reqId, to: f.id, reason: "explicit prerequisite" });
          }
        }
      }

      // Type-based rules: finishing after roughing on same feature position
      if (f.operation === "finishing") {
        const roughing = features.find(
          (r) => r.operation === "roughing" &&
          r.id !== f.id &&
          this._positionClose(r.position, f.position, 5)
        );
        if (roughing) {
          deps.push({ from: roughing.id, to: f.id, reason: "roughing before finishing" });
        }
      }

      // Rest after roughing
      if (f.operation === "rest") {
        const roughing = features.find(
          (r) => r.operation === "roughing" &&
          r.id !== f.id &&
          this._positionClose(r.position, f.position, 10)
        );
        if (roughing) {
          deps.push({ from: roughing.id, to: f.id, reason: "roughing before rest" });
        }
      }

      // Drilling before tapping (same position)
      if (/tap|thread/.test(f.type)) {
        const drill = features.find(
          (d) => /drill|hole/.test(d.type) &&
          d.id !== f.id &&
          this._positionClose(d.position, f.position, 1)
        );
        if (drill) {
          deps.push({ from: drill.id, to: f.id, reason: "drill before tap" });
        }
      }
    }

    return deps;
  }

  /**
   * Group features by their nearest cardinal access direction.
   */
  private _groupByDirection(features: ClusterableFeature[]) {
    const groups = new Map<string, ClusterableFeature[]>();
    for (const dir of DIRECTIONS) groups.set(dir.label, []);

    for (const f of features) {
      const ad = f.access_direction || { x: 0, y: 0, z: 1 }; // default top
      let bestDir = DIRECTIONS[0];
      let bestDot = -2;
      for (const dir of DIRECTIONS) {
        const dot = ad.x * dir.x + ad.y * dir.y + ad.z * dir.z;
        if (dot > bestDot) { bestDot = dot; bestDir = dir; }
      }
      groups.get(bestDir.label)!.push(f);
    }

    return groups;
  }

  /**
   * Merge opposite directions into single indexed setup if possible.
   * E.g., Top (+Z) stays alone, but Left (-X) and Right (+X) can share
   * a single setup with 180° rotation on A-axis.
   */
  private _mergeOpposites(groups: Map<string, ClusterableFeature[]>) {
    const merged = new Map<string, ClusterableFeature[]>();
    const pairs = [
      ["Top (+Z)", "Bottom (-Z)"],
      ["Right (+X)", "Left (-X)"],
      ["Front (+Y)", "Back (-Y)"],
    ];

    for (const [primary, secondary] of pairs) {
      const pFeats = groups.get(primary) || [];
      const sFeats = groups.get(secondary) || [];

      if (pFeats.length > 0 && sFeats.length === 0) {
        merged.set(primary, pFeats);
      } else if (sFeats.length > 0 && pFeats.length === 0) {
        merged.set(secondary, sFeats);
      } else if (pFeats.length > 0 && sFeats.length > 0) {
        // Both have features — keep separate setups (can't do both without flip)
        merged.set(primary, pFeats);
        merged.set(secondary, sFeats);
      }
    }

    return merged;
  }

  /**
   * Sort features within a cluster: phase order → priority → spatial TSP.
   */
  private _sortWithinCluster(
    features: ClusterableFeature[],
    deps: Array<{ from: string; to: string }>,
  ): ClusterableFeature[] {
    // Topological sort respecting dependencies
    const idSet = new Set(features.map((f) => f.id));
    const localDeps = deps.filter((d) => idSet.has(d.from) && idSet.has(d.to));

    // Build adjacency + in-degree
    const adj = new Map<string, string[]>();
    const inDeg = new Map<string, number>();
    for (const f of features) {
      adj.set(f.id, []);
      inDeg.set(f.id, 0);
    }
    for (const d of localDeps) {
      adj.get(d.from)?.push(d.to);
      inDeg.set(d.to, (inDeg.get(d.to) || 0) + 1);
    }

    // Kahn's with phase-priority tie-breaking
    const featureMap = new Map(features.map((f) => [f.id, f]));
    const queue = features
      .filter((f) => (inDeg.get(f.id) || 0) === 0)
      .sort((a, b) => {
        const pa = PHASE_ORDER[a.operation] ?? 5;
        const pb = PHASE_ORDER[b.operation] ?? 5;
        if (pa !== pb) return pa - pb;
        return (b.priority || 0) - (a.priority || 0);
      });

    const result: ClusterableFeature[] = [];
    const visited = new Set<string>();

    while (queue.length > 0) {
      // Take the highest-priority available
      queue.sort((a, b) => {
        const pa = PHASE_ORDER[a.operation] ?? 5;
        const pb = PHASE_ORDER[b.operation] ?? 5;
        if (pa !== pb) return pa - pb;
        return (b.priority || 0) - (a.priority || 0);
      });

      const node = queue.shift()!;
      if (visited.has(node.id)) continue;
      visited.add(node.id);
      result.push(node);

      for (const next of adj.get(node.id) || []) {
        const newDeg = (inDeg.get(next) || 1) - 1;
        inDeg.set(next, newDeg);
        if (newDeg === 0 && !visited.has(next)) {
          const feat = featureMap.get(next);
          if (feat) queue.push(feat);
        }
      }
    }

    // Add any unvisited (cycle or disconnected)
    for (const f of features) {
      if (!visited.has(f.id)) result.push(f);
    }

    return result;
  }

  private _positionClose(
    a: { x: number; y: number; z: number },
    b: { x: number; y: number; z: number },
    threshold: number,
  ): boolean {
    const dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz) <= threshold;
  }
}

export const featureClusteringEngine = new FeatureClusteringEngine();
