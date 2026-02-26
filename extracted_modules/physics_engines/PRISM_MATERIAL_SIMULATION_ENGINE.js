const PRISM_MATERIAL_SIMULATION_ENGINE = {
  name: 'PRISM_MATERIAL_SIMULATION_ENGINE',
  version: '1.0.0',
  description: 'Complete material removal simulation and verification',

  createSimulation(stockDefinition) {
    const { type = 'box', dimensions, resolution = 0.1 } = stockDefinition;
    const dexelModel = this._createDexelModel(type, dimensions, resolution);
    return {
      dexelModel, resolution,
      stockVolume: this._calculateVolume(dexelModel),
      removedVolume: 0, operations: [], collisions: []
    };
  },
  simulateToolpath(simulation, toolpath, tool) {
    const { dexelModel, resolution } = simulation;
    const { diameter, cornerRadius = 0, fluteLength, holderDiameter = 40 } = tool;
    const toolRadius = diameter / 2;

    const operation = { toolId: tool.id || 'unknown', startTime: Date.now(), volumeRemoved: 0, collisions: [] };
    const points = toolpath.points || toolpath;

    for (let i = 1; i < points.length; i++) {
      const p1 = points[i - 1], p2 = points[i];
      if (p2.type === 'rapid') continue;

      const distance = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2) + Math.pow(p2.z - p1.z, 2));
      const steps = Math.max(1, Math.ceil(distance / (resolution / 2)));

      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        const pos = { x: p1.x + t * (p2.x - p1.x), y: p1.y + t * (p2.y - p1.y), z: p1.z + t * (p2.z - p1.z) };
        const removed = this._removeMaterial(dexelModel, pos, toolRadius, cornerRadius, resolution);
        operation.volumeRemoved += removed;

        const holderCollision = this._checkHolderCollision(dexelModel, pos, tool, resolution);
        if (holderCollision) operation.collisions.push({ position: pos, type: 'holder', depth: holderCollision.depth });
      }
    }
    operation.endTime = Date.now();
    simulation.operations.push(operation);
    simulation.removedVolume += operation.volumeRemoved;
    simulation.collisions.push(...operation.collisions);
    return operation;
  },
  verifyToolpath(simulation, partGeometry, tolerance = 0.001) {
    const { dexelModel, resolution } = simulation;
    const result = { gouges: [], undercuts: [], maxGouge: 0, maxUndercut: 0, inTolerance: true };
    const bounds = this._getDexelBounds(dexelModel);

    for (let x = bounds.minX; x <= bounds.maxX; x += resolution) {
      for (let y = bounds.minY; y <= bounds.maxY; y += resolution) {
        const dexelKey = `${Math.round(x/resolution)},${Math.round(y/resolution)}`;
        const dexel = dexelModel.dexels[dexelKey];
        const partZ = this._getPartZ(partGeometry, x, y);

        if (dexel && partZ !== null) {
          const simZ = dexel.top, deviation = simZ - partZ;
          if (deviation < -tolerance) {
            result.gouges.push({ x, y, depth: -deviation });
            result.maxGouge = Math.max(result.maxGouge, -deviation);
            result.inTolerance = false;
          } else if (deviation > tolerance) {
            result.undercuts.push({ x, y, excess: deviation });
            result.maxUndercut = Math.max(result.maxUndercut, deviation);
            result.inTolerance = false;
          }
        }
      }
    }
    return result;
  },
  getRemainingStockMesh(simulation) {
    const { dexelModel, resolution } = simulation;
    const vertices = [], indices = [];
    const dexelKeys = Object.keys(dexelModel.dexels);

    for (const key of dexelKeys) {
      const [ix, iy] = key.split(',').map(Number);
      const x = ix * resolution, y = iy * resolution;
      const dexel = dexelModel.dexels[key];
      const baseIdx = vertices.length, r = resolution / 2;

      vertices.push(
        { x: x - r, y: y - r, z: dexel.top }, { x: x + r, y: y - r, z: dexel.top },
        { x: x + r, y: y + r, z: dexel.top }, { x: x - r, y: y + r, z: dexel.top }
      );
      indices.push(baseIdx, baseIdx + 1, baseIdx + 2, baseIdx, baseIdx + 2, baseIdx + 3);
    }
    return { vertices, indices };
  },
  getMaterialRemovalRate(simulation) {
    let totalVolume = 0, totalTime = 0;
    for (const op of simulation.operations) {
      totalVolume += op.volumeRemoved;
      totalTime += (op.endTime - op.startTime) / 1000;
    }
    return totalTime > 0 ? totalVolume / totalTime : 0;
  },
  _createDexelModel(type, dimensions, resolution) {
    const model = { type, dimensions, resolution, dexels: {}, bottom: 0 };
    if (type === 'box') {
      const { x, y, z } = dimensions;
      const halfX = x / 2, halfY = y / 2;
      for (let px = -halfX; px <= halfX; px += resolution) {
        for (let py = -halfY; py <= halfY; py += resolution) {
          const key = `${Math.round(px/resolution)},${Math.round(py/resolution)}`;
          model.dexels[key] = { bottom: 0, top: z };
        }
      }
    } else if (type === 'cylinder') {
      const { diameter, height } = dimensions;
      const radius = diameter / 2;
      for (let px = -radius; px <= radius; px += resolution) {
        for (let py = -radius; py <= radius; py += resolution) {
          if (px*px + py*py <= radius*radius) {
            const key = `${Math.round(px/resolution)},${Math.round(py/resolution)}`;
            model.dexels[key] = { bottom: 0, top: height };
          }
        }
      }
    }
    return model;
  },
  _removeMaterial(dexelModel, toolPos, toolRadius, cornerRadius, resolution) {
    let volumeRemoved = 0;
    const toolRadiusSq = toolRadius * toolRadius;
    const minIX = Math.floor((toolPos.x - toolRadius) / resolution);
    const maxIX = Math.ceil((toolPos.x + toolRadius) / resolution);
    const minIY = Math.floor((toolPos.y - toolRadius) / resolution);
    const maxIY = Math.ceil((toolPos.y + toolRadius) / resolution);

    for (let ix = minIX; ix <= maxIX; ix++) {
      for (let iy = minIY; iy <= maxIY; iy++) {
        const dx = ix * resolution - toolPos.x, dy = iy * resolution - toolPos.y;
        const distSq = dx*dx + dy*dy;
        if (distSq <= toolRadiusSq) {
          const key = `${ix},${iy}`;
          const dexel = dexelModel.dexels[key];
          if (dexel && dexel.top > toolPos.z) {
            let cutZ = toolPos.z;
            if (cornerRadius > 0) {
              const dist = Math.sqrt(distSq);
              if (dist > toolRadius - cornerRadius) {
                const r = dist - (toolRadius - cornerRadius);
                cutZ = toolPos.z + cornerRadius - Math.sqrt(cornerRadius*cornerRadius - r*r);
              }
            }
            if (dexel.top > cutZ) {
              volumeRemoved += (dexel.top - cutZ) * resolution * resolution;
              dexel.top = cutZ;
            }
          }
        }
      }
    }
    return volumeRemoved;
  },
  _checkHolderCollision(dexelModel, toolPos, tool, resolution) {
    const { diameter, fluteLength = 50, holderDiameter = 40 } = tool;
    const holderRadius = holderDiameter / 2, holderZ = toolPos.z + fluteLength;
    let maxCollisionDepth = 0;

    const minIX = Math.floor((toolPos.x - holderRadius) / resolution);
    const maxIX = Math.ceil((toolPos.x + holderRadius) / resolution);
    const minIY = Math.floor((toolPos.y - holderRadius) / resolution);
    const maxIY = Math.ceil((toolPos.y + holderRadius) / resolution);

    for (let ix = minIX; ix <= maxIX; ix++) {
      for (let iy = minIY; iy <= maxIY; iy++) {
        const dx = ix * resolution - toolPos.x, dy = iy * resolution - toolPos.y;
        const distSq = dx*dx + dy*dy;
        if (distSq <= holderRadius*holderRadius && distSq > (diameter/2)*(diameter/2)) {
          const key = `${ix},${iy}`;
          const dexel = dexelModel.dexels[key];
          if (dexel && dexel.top > holderZ) {
            maxCollisionDepth = Math.max(maxCollisionDepth, dexel.top - holderZ);
          }
        }
      }
    }
    return maxCollisionDepth > 0 ? { depth: maxCollisionDepth } : null;
  },
  _calculateVolume(dexelModel) {
    let volume = 0;
    const cellArea = dexelModel.resolution * dexelModel.resolution;
    for (const key in dexelModel.dexels) {
      const dexel = dexelModel.dexels[key];
      volume += (dexel.top - dexel.bottom) * cellArea;
    }
    return volume;
  },
  _getDexelBounds(dexelModel) {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const key in dexelModel.dexels) {
      const [ix, iy] = key.split(',').map(Number);
      const x = ix * dexelModel.resolution, y = iy * dexelModel.resolution;
      minX = Math.min(minX, x); maxX = Math.max(maxX, x);
      minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    }
    return { minX, maxX, minY, maxY };
  },
  _getPartZ(partGeometry, x, y) {
    if (partGeometry && partGeometry.mesh) {
      const { vertices, indices } = partGeometry.mesh;
      let maxZ = -Infinity;
      for (let i = 0; i < indices.length; i += 3) {
        const v0 = vertices[indices[i]], v1 = vertices[indices[i + 1]], v2 = vertices[indices[i + 2]];
        const z = this._rayTriangleZ(x, y, v0, v1, v2);
        if (z !== null) maxZ = Math.max(maxZ, z);
      }
      return maxZ > -Infinity ? maxZ : null;
    }
    return null;
  },
  _rayTriangleZ(x, y, v0, v1, v2) {
    const denom = (v1.y - v2.y) * (v0.x - v2.x) + (v2.x - v1.x) * (v0.y - v2.y);
    if (Math.abs(denom) < 1e-10) return null;
    const a = ((v1.y - v2.y) * (x - v2.x) + (v2.x - v1.x) * (y - v2.y)) / denom;
    const b = ((v2.y - v0.y) * (x - v2.x) + (v0.x - v2.x) * (y - v2.y)) / denom;
    const c = 1 - a - b;
    if (a >= 0 && b >= 0 && c >= 0) return a * v0.z + b * v1.z + c * v2.z;
    return null;
  }
}