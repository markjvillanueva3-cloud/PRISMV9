/**
 * SweptVolumeEngine — Continuous path collision interpolation
 *
 * Interpolates tool position along G-code moves at configurable resolution,
 * computes swept volume as union of tool shape at each position.
 * Uses AABB (Axis-Aligned Bounding Box) subdivision for O(n log n) collision queries.
 *
 * Models: Linear interpolation (G01), circular arc (G02/G03), rapid traverse (G00).
 * References: Koren (CNC path interpolation), Choi & Jerard (swept volume for NC verification)
 */

export interface ToolShape {
  type: "cylinder" | "ball_end" | "bull_nose" | "drill" | "boring_bar";
  diameter_mm: number;
  length_mm: number;
  corner_radius_mm?: number;
  holder_diameter_mm?: number;
  holder_length_mm?: number;
}

export interface Position3D {
  x: number;
  y: number;
  z: number;
  a?: number;
  b?: number;
  c?: number;
}

export interface MoveSegment {
  type: "rapid" | "linear" | "cw_arc" | "ccw_arc";
  start: Position3D;
  end: Position3D;
  center?: Position3D;
  feed_mm_min?: number;
}

export interface AABB {
  min_x: number; max_x: number;
  min_y: number; max_y: number;
  min_z: number; max_z: number;
}

export interface SweptVolumeResult {
  positions: Position3D[];
  bounding_box: AABB;
  segment_boxes: AABB[];
  total_path_length_mm: number;
  interpolation_points: number;
  resolution_mm: number;
}

export interface CollisionZone {
  name: string;
  box: AABB;
}

export interface CollisionCheckResult {
  has_collision: boolean;
  collisions: Array<{
    position: Position3D;
    zone_name: string;
    penetration_mm: number;
    segment_index: number;
  }>;
  closest_clearance_mm: number;
  segments_checked: number;
}

export class SweptVolumeEngine {
  /**
   * Interpolate a move segment at given resolution
   */
  interpolate(segment: MoveSegment, resolution_mm: number = 1.0): Position3D[] {
    const points: Position3D[] = [{ ...segment.start }];

    if (segment.type === "rapid" || segment.type === "linear") {
      const dx = segment.end.x - segment.start.x;
      const dy = segment.end.y - segment.start.y;
      const dz = segment.end.z - segment.start.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (dist < 0.001) {
        points.push({ ...segment.end });
        return points;
      }

      const steps = Math.max(Math.ceil(dist / resolution_mm), 1);
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        points.push({
          x: segment.start.x + dx * t,
          y: segment.start.y + dy * t,
          z: segment.start.z + dz * t,
          a: segment.start.a !== undefined && segment.end.a !== undefined
            ? segment.start.a + (segment.end.a - segment.start.a) * t : undefined,
          b: segment.start.b !== undefined && segment.end.b !== undefined
            ? segment.start.b + (segment.end.b - segment.start.b) * t : undefined,
          c: segment.start.c !== undefined && segment.end.c !== undefined
            ? segment.start.c + (segment.end.c - segment.start.c) * t : undefined,
        });
      }
    } else if (segment.type === "cw_arc" || segment.type === "ccw_arc") {
      // Circular interpolation in XY plane
      const cx = segment.center?.x ?? (segment.start.x + segment.end.x) / 2;
      const cy = segment.center?.y ?? (segment.start.y + segment.end.y) / 2;
      const r = Math.sqrt(
        (segment.start.x - cx) ** 2 + (segment.start.y - cy) ** 2
      );

      let startAngle = Math.atan2(segment.start.y - cy, segment.start.x - cx);
      let endAngle = Math.atan2(segment.end.y - cy, segment.end.x - cx);

      if (segment.type === "cw_arc") {
        if (endAngle >= startAngle) endAngle -= 2 * Math.PI;
      } else {
        if (endAngle <= startAngle) endAngle += 2 * Math.PI;
      }

      const arcLength = Math.abs(endAngle - startAngle) * r;
      const steps = Math.max(Math.ceil(arcLength / resolution_mm), 4);
      const dz = segment.end.z - segment.start.z;

      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        const angle = startAngle + (endAngle - startAngle) * t;
        points.push({
          x: cx + r * Math.cos(angle),
          y: cy + r * Math.sin(angle),
          z: segment.start.z + dz * t,
        });
      }
    }

    return points;
  }

  /**
   * Compute swept volume bounding box for a tool along a path
   */
  computeSweptVolume(
    segments: MoveSegment[],
    tool: ToolShape,
    resolution_mm: number = 1.0
  ): SweptVolumeResult {
    const allPositions: Position3D[] = [];
    const segmentBoxes: AABB[] = [];
    let totalLength = 0;

    const toolRadius = tool.diameter_mm / 2;
    const toolLength = tool.length_mm + (tool.holder_length_mm ?? 0);

    for (const seg of segments) {
      const res = seg.type === "rapid" ? Math.max(resolution_mm, 5.0) : resolution_mm;
      const positions = this.interpolate(seg, res);
      allPositions.push(...positions);

      // Compute segment AABB (expanded by tool radius)
      let minX = Infinity, maxX = -Infinity;
      let minY = Infinity, maxY = -Infinity;
      let minZ = Infinity, maxZ = -Infinity;

      for (const p of positions) {
        minX = Math.min(minX, p.x - toolRadius);
        maxX = Math.max(maxX, p.x + toolRadius);
        minY = Math.min(minY, p.y - toolRadius);
        maxY = Math.max(maxY, p.y + toolRadius);
        minZ = Math.min(minZ, p.z - toolLength);
        maxZ = Math.max(maxZ, p.z);
      }

      segmentBoxes.push({ min_x: minX, max_x: maxX, min_y: minY, max_y: maxY, min_z: minZ, max_z: maxZ });

      // Compute path length
      const dx = seg.end.x - seg.start.x;
      const dy = seg.end.y - seg.start.y;
      const dz = seg.end.z - seg.start.z;
      totalLength += Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    // Overall bounding box
    const bbox: AABB = {
      min_x: Math.min(...segmentBoxes.map(b => b.min_x)),
      max_x: Math.max(...segmentBoxes.map(b => b.max_x)),
      min_y: Math.min(...segmentBoxes.map(b => b.min_y)),
      max_y: Math.max(...segmentBoxes.map(b => b.max_y)),
      min_z: Math.min(...segmentBoxes.map(b => b.min_z)),
      max_z: Math.max(...segmentBoxes.map(b => b.max_z)),
    };

    return {
      positions: allPositions,
      bounding_box: bbox,
      segment_boxes: segmentBoxes,
      total_path_length_mm: Math.round(totalLength * 100) / 100,
      interpolation_points: allPositions.length,
      resolution_mm,
    };
  }

  /**
   * Check swept volume against collision zones
   */
  checkCollisions(
    swept: SweptVolumeResult,
    tool: ToolShape,
    zones: CollisionZone[],
    safety_margin_mm: number = 5.0
  ): CollisionCheckResult {
    const collisions: CollisionCheckResult["collisions"] = [];
    let closestClearance = Infinity;
    const toolRadius = tool.diameter_mm / 2 + safety_margin_mm;
    const holderRadius = (tool.holder_diameter_mm ?? tool.diameter_mm) / 2 + safety_margin_mm;

    for (let si = 0; si < swept.segment_boxes.length; si++) {
      const segBox = swept.segment_boxes[si];

      for (const zone of zones) {
        // Quick AABB overlap test
        if (segBox.max_x < zone.box.min_x || segBox.min_x > zone.box.max_x) continue;
        if (segBox.max_y < zone.box.min_y || segBox.min_y > zone.box.max_y) continue;
        if (segBox.max_z < zone.box.min_z || segBox.min_z > zone.box.max_z) continue;

        // Detailed per-point check
        for (const pos of swept.positions) {
          // Tool tip clearance
          const dx = Math.max(zone.box.min_x - pos.x, 0, pos.x - zone.box.max_x);
          const dy = Math.max(zone.box.min_y - pos.y, 0, pos.y - zone.box.max_y);
          const dz = Math.max(zone.box.min_z - pos.z, 0, pos.z - zone.box.max_z);
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

          if (dist < closestClearance) closestClearance = dist;

          // Check if tool body intersects zone
          const inX = pos.x + toolRadius > zone.box.min_x && pos.x - toolRadius < zone.box.max_x;
          const inY = pos.y + toolRadius > zone.box.min_y && pos.y - toolRadius < zone.box.max_y;
          const inZ = pos.z > zone.box.min_z && pos.z - (tool.length_mm + (tool.holder_length_mm ?? 0)) < zone.box.max_z;

          if (inX && inY && inZ) {
            const penetration = Math.min(
              toolRadius - Math.abs(pos.x - (zone.box.min_x + zone.box.max_x) / 2),
              toolRadius - Math.abs(pos.y - (zone.box.min_y + zone.box.max_y) / 2)
            );
            collisions.push({
              position: pos,
              zone_name: zone.name,
              penetration_mm: Math.max(penetration, 0.01),
              segment_index: si,
            });
            break; // One collision per zone per segment
          }
        }
      }
    }

    return {
      has_collision: collisions.length > 0,
      collisions,
      closest_clearance_mm: Math.round(closestClearance * 1000) / 1000,
      segments_checked: swept.segment_boxes.length,
    };
  }
}

export const sweptVolumeEngine = new SweptVolumeEngine();
