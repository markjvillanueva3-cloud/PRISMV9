/**
 * PRISM_VOXEL_STOCK_ENGINE
 * Extracted from PRISM v8.89.002 monolith
 * Lines: 489
 * Session: R2.3.1 Engine Gap Extraction Round 3
 */

const PRISM_VOXEL_STOCK_ENGINE = {
  version: '1.0.0',
  name: 'PRISM Voxel Stock Engine',

  // Configuration
  config: {
    defaultResolution: 0.5, // mm per voxel
    maxVoxels: 10000000,    // 10M max for performance
    adaptiveResolution: true,
    octreeDepth: 8,
    materialColors: {
      stock: 0x60a5fa,
      removed: 0x1e3a5f,
      overcut: 0xff4444,
      undercut: 0xffaa00,
      inTolerance: 0x22c55e
    }
  },
  // State
  state: {
    voxelGrid: null,
    octree: null,
    stockBounds: null,
    resolution: 0.5,
    materialVolume: 0,
    removedVolume: 0
  },
  // STOCK INITIALIZATION

  initializeFromBox(minX, minY, minZ, maxX, maxY, maxZ, resolution = null) {
    const res = resolution || this.config.defaultResolution;

    const sizeX = Math.ceil((maxX - minX) / res);
    const sizeY = Math.ceil((maxY - minY) / res);
    const sizeZ = Math.ceil((maxZ - minZ) / res);

    const totalVoxels = sizeX * sizeY * sizeZ;

    if (totalVoxels > this.config.maxVoxels) {
      // Adjust resolution to fit within limits
      const scale = Math.cbrt(totalVoxels / this.config.maxVoxels);
      return this.initializeFromBox(minX, minY, minZ, maxX, maxY, maxZ, res * scale);
    }
    this.state.stockBounds = { minX, minY, minZ, maxX, maxY, maxZ };
    this.state.resolution = res;

    // Create voxel grid using TypedArray for efficiency
    this.state.voxelGrid = {
      sizeX, sizeY, sizeZ,
      data: new Uint8Array(totalVoxels).fill(1), // 1 = solid, 0 = removed
      resolution: res,
      origin: { x: minX, y: minY, z: minZ }
    };
    this.state.materialVolume = totalVoxels * Math.pow(res, 3);
    this.state.removedVolume = 0;

    // Build octree for fast spatial queries
    this._buildOctree();

    return {
      success: true,
      voxelCount: totalVoxels,
      resolution: res,
      dimensions: { sizeX, sizeY, sizeZ },
      volume: this.state.materialVolume
    };
  },
  initializeFromSTL(stlData, resolution = null) {
    // Parse STL to get bounding box
    const bounds = this._parseSTLBounds(stlData);

    // Initialize grid
    this.initializeFromBox(
      bounds.minX, bounds.minY, bounds.minZ,
      bounds.maxX, bounds.maxY, bounds.maxZ,
      resolution
    );

    // Voxelize the STL geometry
    this._voxelizeSTL(stlData);

    return this.getStatistics();
  },
  initializeFromMesh(meshVertices, meshFaces, resolution = null) {
    // Calculate bounds
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

    for (let i = 0; i < meshVertices.length; i += 3) {
      minX = Math.min(minX, meshVertices[i]);
      maxX = Math.max(maxX, meshVertices[i]);
      minY = Math.min(minY, meshVertices[i + 1]);
      maxY = Math.max(maxY, meshVertices[i + 1]);
      minZ = Math.min(minZ, meshVertices[i + 2]);
      maxZ = Math.max(maxZ, meshVertices[i + 2]);
    }
    // Add small margin
    const margin = (resolution || this.config.defaultResolution) * 2;

    this.initializeFromBox(
      minX - margin, minY - margin, minZ - margin,
      maxX + margin, maxY + margin, maxZ + margin,
      resolution
    );

    // Voxelize mesh
    this._voxelizeMesh(meshVertices, meshFaces);

    return this.getStatistics();
  },
  // MATERIAL REMOVAL

  removeMaterial(toolPosition, toolGeometry) {
    const { x, y, z } = toolPosition;
    const grid = this.state.voxelGrid;
    const res = grid.resolution;

    let removedCount = 0;

    // Get tool engagement envelope
    const envelope = this._getToolEnvelope(toolGeometry);

    // Calculate affected voxel range
    const minVoxelX = Math.max(0, Math.floor((x - envelope.radius - grid.origin.x) / res));
    const maxVoxelX = Math.min(grid.sizeX - 1, Math.ceil((x + envelope.radius - grid.origin.x) / res));
    const minVoxelY = Math.max(0, Math.floor((y - envelope.radius - grid.origin.y) / res));
    const maxVoxelY = Math.min(grid.sizeY - 1, Math.ceil((y + envelope.radius - grid.origin.y) / res));
    const minVoxelZ = Math.max(0, Math.floor((z - envelope.maxZ - grid.origin.z) / res));
    const maxVoxelZ = Math.min(grid.sizeZ - 1, Math.ceil((z - envelope.minZ - grid.origin.z) / res));

    // Check each voxel in range
    for (let vz = minVoxelZ; vz <= maxVoxelZ; vz++) {
      for (let vy = minVoxelY; vy <= maxVoxelY; vy++) {
        for (let vx = minVoxelX; vx <= maxVoxelX; vx++) {
          const idx = vx + vy * grid.sizeX + vz * grid.sizeX * grid.sizeY;

          if (grid.data[idx] === 1) {
            // Calculate voxel center in world coords
            const voxelX = grid.origin.x + (vx + 0.5) * res;
            const voxelY = grid.origin.y + (vy + 0.5) * res;
            const voxelZ = grid.origin.z + (vz + 0.5) * res;

            // Check if voxel is inside tool envelope
            if (this._isInsideTool(voxelX - x, voxelY - y, voxelZ - z, toolGeometry)) {
              grid.data[idx] = 0;
              removedCount++;
            }
          }
        }
      }
    }
    const removedVolume = removedCount * Math.pow(res, 3);
    this.state.removedVolume += removedVolume;

    return {
      voxelsRemoved: removedCount,
      volumeRemoved: removedVolume,
      totalRemoved: this.state.removedVolume
    };
  },
  removeAlongPath(pathPoints, toolGeometry, stepSize = null) {
    const step = stepSize || this.state.resolution;
    let totalRemoved = 0;

    for (let i = 0; i < pathPoints.length - 1; i++) {
      const p1 = pathPoints[i];
      const p2 = pathPoints[i + 1];

      const distance = Math.sqrt(
        Math.pow(p2.x - p1.x, 2) +
        Math.pow(p2.y - p1.y, 2) +
        Math.pow(p2.z - p1.z, 2)
      );

      const steps = Math.max(1, Math.ceil(distance / step));

      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        const pos = {
          x: p1.x + (p2.x - p1.x) * t,
          y: p1.y + (p2.y - p1.y) * t,
          z: p1.z + (p2.z - p1.z) * t
        };
        const result = this.removeMaterial(pos, toolGeometry);
        totalRemoved += result.voxelsRemoved;
      }
    }
    return {
      totalVoxelsRemoved: totalRemoved,
      totalVolumeRemoved: totalRemoved * Math.pow(this.state.resolution, 3),
      remainingVolume: this.state.materialVolume - this.state.removedVolume
    };
  },
  // TOOL GEOMETRY HELPERS

  _getToolEnvelope(tool) {
    // Calculate bounding envelope for different tool types
    switch (tool.type) {
      case 'endmill':
      case 'flat':
        return {
          radius: tool.diameter / 2,
          minZ: 0,
          maxZ: tool.cuttingLength || tool.length
        };
      case 'ballnose':
      case 'ball':
        return {
          radius: tool.diameter / 2,
          minZ: -tool.diameter / 2,
          maxZ: (tool.cuttingLength || tool.length) - tool.diameter / 2
        };
      case 'bullnose':
      case 'toroidal':
        return {
          radius: tool.diameter / 2,
          minZ: -tool.cornerRadius,
          maxZ: (tool.cuttingLength || tool.length) - tool.cornerRadius
        };
      case 'chamfer':
        return {
          radius: tool.tipDiameter / 2 + tool.length * Math.tan(tool.angle * Math.PI / 360),
          minZ: 0,
          maxZ: tool.length
        };
      case 'drill':
        return {
          radius: tool.diameter / 2,
          minZ: -tool.diameter / 2 / Math.tan(tool.pointAngle * Math.PI / 360),
          maxZ: tool.fluteLength || tool.length
        };
      default:
        return {
          radius: (tool.diameter || 10) / 2,
          minZ: 0,
          maxZ: tool.length || 50
        };
    }
  },
  _isInsideTool(dx, dy, dz, tool) {
    const r2 = dx * dx + dy * dy;
    const toolRadius = tool.diameter / 2;

    switch (tool.type) {
      case 'endmill':
      case 'flat':
        return r2 <= toolRadius * toolRadius && dz >= 0 && dz <= (tool.cuttingLength || tool.length);

      case 'ballnose':
      case 'ball':
        if (dz < 0) {
          // In the ball portion
          const distFromCenter = Math.sqrt(r2 + dz * dz);
          return distFromCenter <= toolRadius;
        } else if (dz <= (tool.cuttingLength || tool.length) - toolRadius) {
          // In the cylindrical portion
          return r2 <= toolRadius * toolRadius;
        }
        return false;

      case 'bullnose':
      case 'toroidal':
        const cr = tool.cornerRadius || 0;
        if (dz < 0) {
          return false;
        } else if (dz < cr) {
          // In the corner radius
          const torusR = toolRadius - cr;
          const distFromRing = Math.sqrt(Math.pow(Math.sqrt(r2) - torusR, 2) + Math.pow(dz - cr, 2));
          return distFromRing <= cr;
        } else if (dz <= (tool.cuttingLength || tool.length)) {
          return r2 <= toolRadius * toolRadius;
        }
        return false;

      default:
        return r2 <= toolRadius * toolRadius && dz >= 0 && dz <= (tool.length || 50);
    }
  },
  // OCTREE FOR SPATIAL OPTIMIZATION

  _buildOctree() {
    const bounds = this.state.stockBounds;
    const grid = this.state.voxelGrid;

    this.state.octree = {
      bounds: bounds,
      depth: this.config.octreeDepth,
      root: this._buildOctreeNode(
        bounds.minX, bounds.minY, bounds.minZ,
        bounds.maxX, bounds.maxY, bounds.maxZ,
        0
      )
    };
  },
  _buildOctreeNode(minX, minY, minZ, maxX, maxY, maxZ, depth) {
    if (depth >= this.config.octreeDepth) {
      return { leaf: true, solid: true };
    }
    const midX = (minX + maxX) / 2;
    const midY = (minY + maxY) / 2;
    const midZ = (minZ + maxZ) / 2;

    return {
      leaf: false,
      bounds: { minX, minY, minZ, maxX, maxY, maxZ },
      children: null, // Lazily initialized
      solid: true
    };
  },
  // ANALYSIS AND QUERIES

  getStatistics() {
    const grid = this.state.voxelGrid;
    let solidCount = 0;

    if (grid && grid.data) {
      for (let i = 0; i < grid.data.length; i++) {
        if (grid.data[i] === 1) solidCount++;
      }
    }
    const voxelVolume = Math.pow(this.state.resolution, 3);

    return {
      resolution: this.state.resolution,
      totalVoxels: grid ? grid.data.length : 0,
      solidVoxels: solidCount,
      removedVoxels: grid ? grid.data.length - solidCount : 0,
      remainingVolume: solidCount * voxelVolume,
      removedVolume: this.state.removedVolume,
      removalPercentage: grid ? ((grid.data.length - solidCount) / grid.data.length * 100).toFixed(2) : 0
    };
  },
  isPointInStock(x, y, z) {
    const grid = this.state.voxelGrid;
    if (!grid) return false;

    const vx = Math.floor((x - grid.origin.x) / grid.resolution);
    const vy = Math.floor((y - grid.origin.y) / grid.resolution);
    const vz = Math.floor((z - grid.origin.z) / grid.resolution);

    if (vx < 0 || vx >= grid.sizeX || vy < 0 || vy >= grid.sizeY || vz < 0 || vz >= grid.sizeZ) {
      return false;
    }
    const idx = vx + vy * grid.sizeX + vz * grid.sizeX * grid.sizeY;
    return grid.data[idx] === 1;
  },
  getSurfaceVoxels() {
    const grid = this.state.voxelGrid;
    if (!grid) return [];

    const surface = [];
    const neighbors = [
      [-1, 0, 0], [1, 0, 0],
      [0, -1, 0], [0, 1, 0],
      [0, 0, -1], [0, 0, 1]
    ];

    for (let vz = 0; vz < grid.sizeZ; vz++) {
      for (let vy = 0; vy < grid.sizeY; vy++) {
        for (let vx = 0; vx < grid.sizeX; vx++) {
          const idx = vx + vy * grid.sizeX + vz * grid.sizeX * grid.sizeY;

          if (grid.data[idx] === 1) {
            // Check if any neighbor is empty
            let isSurface = false;
            for (const [dx, dy, dz] of neighbors) {
              const nx = vx + dx;
              const ny = vy + dy;
              const nz = vz + dz;

              if (nx < 0 || nx >= grid.sizeX ||
                  ny < 0 || ny >= grid.sizeY ||
                  nz < 0 || nz >= grid.sizeZ) {
                isSurface = true;
                break;
              }
              const nidx = nx + ny * grid.sizeX + nz * grid.sizeX * grid.sizeY;
              if (grid.data[nidx] === 0) {
                isSurface = true;
                break;
              }
            }
            if (isSurface) {
              surface.push({
                x: grid.origin.x + (vx + 0.5) * grid.resolution,
                y: grid.origin.y + (vy + 0.5) * grid.resolution,
                z: grid.origin.z + (vz + 0.5) * grid.resolution
              });
            }
          }
        }
      }
    }
    return surface;
  },
  // THREE.JS MESH GENERATION

  generateMesh() {
    if (typeof THREE === 'undefined') return null;

    const surface = this.getSurfaceVoxels();
    const res = this.state.resolution;

    // Create instanced mesh for efficiency
    const geometry = new THREE.BoxGeometry(res, res, res);
    const material = new THREE.MeshStandardMaterial({
      color: this.config.materialColors.stock,
      roughness: 0.6,
      metalness: 0.2
    });

    const mesh = new THREE.InstancedMesh(geometry, material, surface.length);
    const matrix = new THREE.Matrix4();

    surface.forEach((voxel, i) => {
      matrix.setPosition(voxel.x, voxel.y, voxel.z);
      mesh.setMatrixAt(i, matrix);
    });

    mesh.instanceMatrix.needsUpdate = true;

    return mesh;
  },
  // STL HELPERS

  _parseSTLBounds(stlData) {
    // Binary or ASCII STL parsing
    if (stlData instanceof ArrayBuffer) {
      return this._parseBinarySTLBounds(stlData);
    }
    return this._parseASCIISTLBounds(stlData);
  },
  _parseBinarySTLBounds(buffer) {
    const view = new DataView(buffer);
    const numTriangles = view.getUint32(80, true);

    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

    for (let i = 0; i < numTriangles; i++) {
      const offset = 84 + i * 50;

      for (let v = 0; v < 3; v++) {
        const vOffset = offset + 12 + v * 12;
        const x = view.getFloat32(vOffset, true);
        const y = view.getFloat32(vOffset + 4, true);
        const z = view.getFloat32(vOffset + 8, true);

        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        minZ = Math.min(minZ, z);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
        maxZ = Math.max(maxZ, z);
      }
    }
    return { minX, minY, minZ, maxX, maxY, maxZ };
  },
  _parseASCIISTLBounds(text) {
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

    const vertexRegex = /vertex\s+([\d.e+-]+)\s+([\d.e+-]+)\s+([\d.e+-]+)/gi;
    let match;

    while ((match = vertexRegex.exec(text)) !== null) {
      const x = parseFloat(match[1]);
      const y = parseFloat(match[2]);
      const z = parseFloat(match[3]);

      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      minZ = Math.min(minZ, z);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
      maxZ = Math.max(maxZ, z);
    }
    return { minX, minY, minZ, maxX, maxY, maxZ };
  },
  _voxelizeSTL(stlData) {
    // Simplified voxelization - mark voxels as solid if inside mesh
    console.log('[PRISM-VOXEL] STL voxelization placeholder');
  },
  _voxelizeMesh(vertices, faces) {
    // Mark voxels inside mesh as solid
    console.log('[PRISM-VOXEL] Mesh voxelization placeholder');
  }
}