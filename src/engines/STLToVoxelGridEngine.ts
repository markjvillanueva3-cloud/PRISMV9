/**
 * STLToVoxelGridEngine — STL Parsing and Voxelization
 *
 * Parses ASCII STL files into triangle meshes, converts to voxel grids
 * using ray casting with Moller-Trumbore intersection, and analyzes
 * geometry for machinability assessment.
 *
 * Actions: stl_parse, stl_voxelize, stl_analyze
 */

// ============================================================================
// TYPES
// ============================================================================

export interface STLPoint { x: number; y: number; z: number; }

export interface STLTriangle {
  normal: STLPoint;
  vertices: [STLPoint, STLPoint, STLPoint];
}

export interface STLBoundingBox {
  min: STLPoint;
  max: STLPoint;
}

export interface STLParseResult {
  triangles: STLTriangle[];
  bounding_box: STLBoundingBox;
  triangle_count: number;
  solid_name?: string;
}

export interface VoxelGridResult {
  grid: boolean[][][];
  resolution_mm: number;
  dimensions: { nx: number; ny: number; nz: number };
  volume_mm3: number;
  surface_area_mm2: number;
}

export interface STLAnalysisResult {
  volume_mm3: number;
  surface_area_mm2: number;
  bounding_box: STLBoundingBox;
  aspect_ratio: { xy: number; xz: number; yz: number };
  thin_wall_warnings: Array<{ location: STLPoint; thickness_mm: number }>;
  undercut_zones: number;
  estimated_5axis_needed: boolean;
}

// ============================================================================
// ENGINE
// ============================================================================

export class STLToVoxelGridEngine {

  // --------------------------------------------------------------------------
  // parseSTL — parse ASCII STL content
  // --------------------------------------------------------------------------
  parseSTL(input: { content: string }): STLParseResult {
    const { content } = input;
    if (!content || content.trim().length === 0) {
      return { triangles: [], bounding_box: { min: { x: 0, y: 0, z: 0 }, max: { x: 0, y: 0, z: 0 } }, triangle_count: 0 };
    }

    const triangles: STLTriangle[] = [];
    let solid_name: string | undefined;

    // Extract solid name
    const solidMatch = content.match(/solid\s+(.*?)$/m);
    if (solidMatch && solidMatch[1].trim().length > 0) {
      solid_name = solidMatch[1].trim();
    }

    // Parse facets
    const facetRegex = /facet\s+normal\s+([\-\d.eE+]+)\s+([\-\d.eE+]+)\s+([\-\d.eE+]+)\s+outer\s+loop\s+vertex\s+([\-\d.eE+]+)\s+([\-\d.eE+]+)\s+([\-\d.eE+]+)\s+vertex\s+([\-\d.eE+]+)\s+([\-\d.eE+]+)\s+([\-\d.eE+]+)\s+vertex\s+([\-\d.eE+]+)\s+([\-\d.eE+]+)\s+([\-\d.eE+]+)\s+endloop\s+endfacet/gi;

    let match: RegExpExecArray | null;
    while ((match = facetRegex.exec(content)) !== null) {
      triangles.push({
        normal: { x: parseFloat(match[1]), y: parseFloat(match[2]), z: parseFloat(match[3]) },
        vertices: [
          { x: parseFloat(match[4]), y: parseFloat(match[5]), z: parseFloat(match[6]) },
          { x: parseFloat(match[7]), y: parseFloat(match[8]), z: parseFloat(match[9]) },
          { x: parseFloat(match[10]), y: parseFloat(match[11]), z: parseFloat(match[12]) },
        ],
      });
    }

    // Compute bounding box
    const bbox = this._computeBoundingBox(triangles);

    return {
      triangles,
      bounding_box: bbox,
      triangle_count: triangles.length,
      solid_name,
    };
  }

  // --------------------------------------------------------------------------
  // voxelize — convert triangles to voxel grid via ray casting
  // --------------------------------------------------------------------------
  voxelize(input: { triangles: STLTriangle[]; resolution_mm: number }): VoxelGridResult {
    const { triangles, resolution_mm } = input;
    const res = Math.max(resolution_mm, 0.01); // minimum resolution

    if (triangles.length === 0) {
      return {
        grid: [],
        resolution_mm: res,
        dimensions: { nx: 0, ny: 0, nz: 0 },
        volume_mm3: 0,
        surface_area_mm2: 0,
      };
    }

    const bbox = this._computeBoundingBox(triangles);
    const margin = res * 0.5;

    const nx = Math.max(1, Math.ceil((bbox.max.x - bbox.min.x + 2 * margin) / res));
    const ny = Math.max(1, Math.ceil((bbox.max.y - bbox.min.y + 2 * margin) / res));
    const nz = Math.max(1, Math.ceil((bbox.max.z - bbox.min.z + 2 * margin) / res));

    // Cap grid size to avoid memory issues
    const maxDim = 200;
    const effectiveNx = Math.min(nx, maxDim);
    const effectiveNy = Math.min(ny, maxDim);
    const effectiveNz = Math.min(nz, maxDim);

    // Initialize grid
    const grid: boolean[][][] = Array.from({ length: effectiveNx }, () =>
      Array.from({ length: effectiveNy }, () =>
        Array.from({ length: effectiveNz }, () => false)
      )
    );

    // Ray casting along Z axis for each (x, y) column
    const originX = bbox.min.x - margin;
    const originY = bbox.min.y - margin;
    const originZ = bbox.min.z - margin;

    const effectiveResX = nx > maxDim ? (bbox.max.x - bbox.min.x + 2 * margin) / effectiveNx : res;
    const effectiveResY = ny > maxDim ? (bbox.max.y - bbox.min.y + 2 * margin) / effectiveNy : res;
    const effectiveResZ = nz > maxDim ? (bbox.max.z - bbox.min.z + 2 * margin) / effectiveNz : res;

    for (let ix = 0; ix < effectiveNx; ix++) {
      const cx = originX + (ix + 0.5) * effectiveResX;
      for (let iy = 0; iy < effectiveNy; iy++) {
        const cy = originY + (iy + 0.5) * effectiveResY;

        // Collect Z intersections for this ray
        const zHits: number[] = [];
        for (const tri of triangles) {
          const hitZ = this._rayTriangleIntersectZ(cx, cy, tri);
          if (hitZ !== null) {
            zHits.push(hitZ);
          }
        }

        // Sort intersections
        zHits.sort((a, b) => a - b);

        // For each voxel in this column, count crossings below it
        for (let iz = 0; iz < effectiveNz; iz++) {
          const cz = originZ + (iz + 0.5) * effectiveResZ;
          // Count intersections below this Z
          let count = 0;
          for (const hz of zHits) {
            if (hz <= cz) count++;
            else break;
          }
          // Odd count = inside
          grid[ix][iy][iz] = (count % 2) === 1;
        }
      }
    }

    // Compute volume and surface area
    const voxelVol = effectiveResX * effectiveResY * effectiveResZ;
    let filledCount = 0;
    let surfaceVoxels = 0;

    for (let ix = 0; ix < effectiveNx; ix++) {
      for (let iy = 0; iy < effectiveNy; iy++) {
        for (let iz = 0; iz < effectiveNz; iz++) {
          if (grid[ix][iy][iz]) {
            filledCount++;
            // Check if surface voxel (adjacent to empty)
            if (this._isSurfaceVoxel(grid, ix, iy, iz, effectiveNx, effectiveNy, effectiveNz)) {
              surfaceVoxels++;
            }
          }
        }
      }
    }

    const volume_mm3 = filledCount * voxelVol;
    // Surface area approximation: surface voxels * average exposed face area
    const avgFaceArea = (effectiveResX * effectiveResY + effectiveResX * effectiveResZ + effectiveResY * effectiveResZ) / 3;
    const surface_area_mm2 = surfaceVoxels * avgFaceArea * 2; // rough estimate

    return {
      grid,
      resolution_mm: res,
      dimensions: { nx: effectiveNx, ny: effectiveNy, nz: effectiveNz },
      volume_mm3,
      surface_area_mm2,
    };
  }

  // --------------------------------------------------------------------------
  // analyzeGeometry — machinability analysis
  // --------------------------------------------------------------------------
  analyzeGeometry(input: { content: string; resolution_mm?: number }): STLAnalysisResult {
    const parsed = this.parseSTL({ content: input.content });
    const res = input.resolution_mm ?? 1.0;

    if (parsed.triangles.length === 0) {
      return {
        volume_mm3: 0,
        surface_area_mm2: 0,
        bounding_box: parsed.bounding_box,
        aspect_ratio: { xy: 1, xz: 1, yz: 1 },
        thin_wall_warnings: [],
        undercut_zones: 0,
        estimated_5axis_needed: false,
      };
    }

    // Compute exact surface area from triangles
    let surface_area_mm2 = 0;
    for (const tri of parsed.triangles) {
      surface_area_mm2 += this._triangleArea(tri.vertices[0], tri.vertices[1], tri.vertices[2]);
    }

    // Voxelize for volume and thin-wall analysis
    const voxelResult = this.voxelize({ triangles: parsed.triangles, resolution_mm: res });

    // Aspect ratios
    const bb = parsed.bounding_box;
    const dx = Math.max(bb.max.x - bb.min.x, 0.001);
    const dy = Math.max(bb.max.y - bb.min.y, 0.001);
    const dz = Math.max(bb.max.z - bb.min.z, 0.001);

    const aspect_ratio = {
      xy: dx / dy,
      xz: dx / dz,
      yz: dy / dz,
    };

    // Thin wall detection: scan X columns for narrow filled regions
    const thin_wall_warnings = this._detectThinWalls(
      voxelResult.grid, voxelResult.dimensions, res, bb
    );

    // Undercut detection: normals pointing significantly inward/upward
    let undercut_zones = 0;
    const normalGroups = new Map<string, number>();
    for (const tri of parsed.triangles) {
      const n = tri.normal;
      const mag = Math.sqrt(n.x ** 2 + n.y ** 2 + n.z ** 2);
      if (mag < 0.001) continue;
      // Undercut: normal pointing in -Z direction with significant XY component
      const nz = n.z / mag;
      if (nz < -0.3 && Math.sqrt(n.x ** 2 + n.y ** 2) / mag > 0.3) {
        // Quantize to grid for zone counting
        const key = `${Math.round(tri.vertices[0].x / (dx / 10))}_${Math.round(tri.vertices[0].y / (dy / 10))}`;
        normalGroups.set(key, (normalGroups.get(key) || 0) + 1);
      }
    }
    undercut_zones = normalGroups.size;

    // 5-axis estimation: needed if significant undercuts or extreme aspect ratios
    const estimated_5axis_needed = undercut_zones > 2 || Math.max(aspect_ratio.xy, aspect_ratio.xz, aspect_ratio.yz) > 5;

    return {
      volume_mm3: voxelResult.volume_mm3,
      surface_area_mm2,
      bounding_box: bb,
      aspect_ratio,
      thin_wall_warnings,
      undercut_zones,
      estimated_5axis_needed,
    };
  }

  // ==========================================================================
  // PRIVATE HELPERS
  // ==========================================================================

  private _computeBoundingBox(triangles: STLTriangle[]): STLBoundingBox {
    if (triangles.length === 0) {
      return { min: { x: 0, y: 0, z: 0 }, max: { x: 0, y: 0, z: 0 } };
    }

    const min = { x: Infinity, y: Infinity, z: Infinity };
    const max = { x: -Infinity, y: -Infinity, z: -Infinity };

    for (const tri of triangles) {
      for (const v of tri.vertices) {
        min.x = Math.min(min.x, v.x); min.y = Math.min(min.y, v.y); min.z = Math.min(min.z, v.z);
        max.x = Math.max(max.x, v.x); max.y = Math.max(max.y, v.y); max.z = Math.max(max.z, v.z);
      }
    }

    return { min, max };
  }

  /**
   * Moller-Trumbore ray-triangle intersection for Z-axis ray at (rx, ry).
   * Returns Z coordinate of intersection or null.
   */
  private _rayTriangleIntersectZ(rx: number, ry: number, tri: STLTriangle): number | null {
    const v0 = tri.vertices[0];
    const v1 = tri.vertices[1];
    const v2 = tri.vertices[2];

    // Ray direction = (0, 0, 1)
    const e1x = v1.x - v0.x, e1y = v1.y - v0.y, e1z = v1.z - v0.z;
    const e2x = v2.x - v0.x, e2y = v2.y - v0.y, e2z = v2.z - v0.z;

    // h = cross(dir, e2) = cross((0,0,1), e2) = (-e2y, e2x, 0)
    const hx = -e2y, hy = e2x, hz = 0;

    // a = dot(e1, h)
    const a = e1x * hx + e1y * hy + e1z * hz;
    if (Math.abs(a) < 1e-12) return null; // parallel

    const f = 1.0 / a;

    // s = ray_origin - v0
    const sx = rx - v0.x, sy = ry - v0.y;
    // sz = ray_origin_z - v0.z, but ray_origin_z is -Infinity conceptually
    // We use parametric form: origin at (rx, ry, 0) — adjust later

    // u = f * dot(s, h)
    const u = f * (sx * hx + sy * hy); // sz * hz = 0 since hz = 0
    if (u < 0 || u > 1) return null;

    // q = cross(s, e1)
    // s = (sx, sy, sz_origin - v0.z) but we set sz_origin = 0 for now
    const sz = -v0.z; // origin z = 0
    const qx = sy * e1z - sz * e1y;
    const qy = sz * e1x - sx * e1z;
    const qz = sx * e1y - sy * e1x;

    // v = f * dot(dir, q) = f * qz (since dir = (0,0,1))
    const v = f * qz;
    if (v < 0 || u + v > 1) return null;

    // t = f * dot(e2, q)
    const t = f * (e2x * qx + e2y * qy + e2z * qz);

    // intersection z = origin_z + t * dir_z = 0 + t * 1 = t
    // But origin_z was 0, so actual Z = t
    return t;
  }

  private _isSurfaceVoxel(grid: boolean[][][], ix: number, iy: number, iz: number, nx: number, ny: number, nz: number): boolean {
    // A filled voxel is on the surface if any neighbor is empty or out of bounds
    const neighbors = [
      [ix - 1, iy, iz], [ix + 1, iy, iz],
      [ix, iy - 1, iz], [ix, iy + 1, iz],
      [ix, iy, iz - 1], [ix, iy, iz + 1],
    ];
    for (const [x, y, z] of neighbors) {
      if (x < 0 || x >= nx || y < 0 || y >= ny || z < 0 || z >= nz) return true;
      if (!grid[x][y][z]) return true;
    }
    return false;
  }

  private _triangleArea(a: STLPoint, b: STLPoint, c: STLPoint): number {
    // Cross product of (b-a) x (c-a)
    const abx = b.x - a.x, aby = b.y - a.y, abz = b.z - a.z;
    const acx = c.x - a.x, acy = c.y - a.y, acz = c.z - a.z;
    const cx = aby * acz - abz * acy;
    const cy = abz * acx - abx * acz;
    const cz = abx * acy - aby * acx;
    return 0.5 * Math.sqrt(cx * cx + cy * cy + cz * cz);
  }

  private _detectThinWalls(
    grid: boolean[][][],
    dims: { nx: number; ny: number; nz: number },
    res: number,
    bb: STLBoundingBox
  ): Array<{ location: STLPoint; thickness_mm: number }> {
    const warnings: Array<{ location: STLPoint; thickness_mm: number }> = [];
    const threshold = res * 3; // walls thinner than 3 voxels

    // Scan X direction for thin regions
    for (let iy = 0; iy < dims.ny; iy++) {
      for (let iz = 0; iz < dims.nz; iz++) {
        let runStart = -1;
        for (let ix = 0; ix <= dims.nx; ix++) {
          const filled = ix < dims.nx && grid[ix]?.[iy]?.[iz];
          if (filled && runStart < 0) {
            runStart = ix;
          } else if (!filled && runStart >= 0) {
            const runLen = ix - runStart;
            const thickness = runLen * res;
            if (thickness < threshold && thickness > 0) {
              const midX = bb.min.x + (runStart + runLen / 2) * res;
              const midY = bb.min.y + (iy + 0.5) * res;
              const midZ = bb.min.z + (iz + 0.5) * res;
              warnings.push({
                location: { x: midX, y: midY, z: midZ },
                thickness_mm: thickness,
              });
            }
            runStart = -1;
          }
        }
      }
    }

    // Limit warnings to avoid noise
    return warnings.slice(0, 50);
  }
}

// Singleton export
export const stlToVoxelGridEngine = new STLToVoxelGridEngine();
