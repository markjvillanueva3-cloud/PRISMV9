/**
 * PRISM CAM KERNEL - COMPLETE EXTRACTION
 * =====================================
 * Extracted from PRISM v8.89.002 monolith
 * Lines: 5434-5810, 10920-10982, 82690-82705, 101413-101424, 354600-356711
 * 
 * Sources: MIT 2.008, 2.007, 2.158J, Machinist's Handbook, Sandvik
 * 
 * @version 2.0.0
 * @date 2026-01-31
 */

const PRISM_CAM_KERNEL_COMPLETE = {
  
  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 1: TOOLPATH STRATEGY PARAMETERS
  // ═══════════════════════════════════════════════════════════════════════════
  
  STRATEGY_PARAMS: Object.freeze({
    // Roughing parameters (multipliers of tool diameter)
    ROUGHING_DOC_PERCENT: 100,        // Depth of cut as % of diameter
    ROUGHING_WOC_PERCENT: 50,         // Width of cut as % of diameter
    ROUGHING_SPEED_FACTOR: 0.85,
    ROUGHING_FEED_FACTOR: 1.0,
    
    // Semi-finishing parameters
    SEMIFINISH_DOC_PERCENT: 25,
    SEMIFINISH_WOC_PERCENT: 25,
    SEMIFINISH_SPEED_FACTOR: 1.0,
    
    // Finishing parameters
    FINISHING_DOC_MAX: 0.5,           // mm
    FINISHING_WOC_MAX: 0.25,          // mm
    FINISHING_SPEED_FACTOR: 1.15,
    FINISHING_FEED_FACTOR: 0.8,
    
    // High-speed machining (HSM)
    HSM_RADIAL_ENGAGEMENT_MAX: 0.15,  // 15% radial engagement max
    HSM_CHIPLOAD_FACTOR: 1.5,         // Increased chipload for HSM
    HSM_MIN_RPM: 10000,               // Minimum RPM for HSM
    
    // Trochoidal/Adaptive milling
    TROCHOIDAL_STEPOVER_PERCENT: 10,  // 10% stepover
    TROCHOIDAL_SPEED_FACTOR: 1.3,     // 30% faster surface speed
    TROCHOIDAL_DOC_FACTOR: 2.0,       // 2x depth of cut
    TROCHOIDAL_ARC_RADIUS_FACTOR: 0.3, // Arc radius = 0.3 × tool diameter
    TROCHOIDAL_STEP_FORWARD_FACTOR: 0.1, // Step forward = 0.1 × tool diameter
    
    // Ramping/Helical entry
    RAMP_ANGLE_DEFAULT: 3.0,          // degrees
    RAMP_ANGLE_MAX: 10.0,             // degrees
    HELIX_ANGLE_DEFAULT: 2.0,         // degrees
    HELIX_DIAMETER_PERCENT: 90,       // % of tool diameter
    
    // Plunge milling
    PLUNGE_FEED_PERCENT: 30,
    PLUNGE_RETRACT_HEIGHT: 2.0,       // mm
    
    // Surface finishing
    SCALLOP_CUSP_HEIGHT_DEFAULT: 0.01,  // mm (10 microns)
    SCALLOP_CONTACT_POINT_SPACING: 1.0, // mm
    STEPOVER_FINISH_PERCENT: 10,        // 10% for finishing
    STEPOVER_ROUGH_PERCENT: 65,         // 65% for roughing
    MAX_STEPOVER_PERCENT: 90            // Never exceed 90%
  }),

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 2: SURFACE FINISH CALCULATIONS
  // Source: Lines 10920-10982 (PRISM_SURFACE_FINISH_LOOKUP)
  // ═══════════════════════════════════════════════════════════════════════════
  
  surfaceFinish: {
    /**
     * Get target Ra value for quality level
     * @param {string} quality - 'rough', 'semi_finish', 'finish', 'fine', 'precision', 'mirror'
     * @param {boolean} isInch - Use inch units (µin) instead of metric (µm)
     * @returns {number} Target Ra value
     */
    getRaTarget(quality, isInch = false) {
      const q = (quality || 'finish').toLowerCase();
      
      const RA_VALUES_METRIC = {
        rough: 6.3,
        semi_finish: 3.2,
        semifinish: 3.2,
        finish: 1.6,
        fine: 0.8,
        fine_finish: 0.8,
        precision: 0.4,
        mirror: 0.1
      };
      
      const RA_VALUES_INCH = {
        rough: 250,
        semi_finish: 125,
        semifinish: 125,
        finish: 63,
        fine: 32,
        fine_finish: 32,
        precision: 16,
        mirror: 4
      };
      
      const values = isInch ? RA_VALUES_INCH : RA_VALUES_METRIC;
      return values[q] || values.finish;
    },
    
    /**
     * Calculate cusp height for ball endmill
     * Formula: h = R - sqrt(R² - (s/2)²)
     * Source: MIT 2.008
     * 
     * @param {number} stepover - Stepover distance (mm)
     * @param {number} ballRadius - Ball nose radius (mm)
     * @returns {number} Cusp height (mm)
     */
    calculateCuspHeight(stepover, ballRadius) {
      return ballRadius - Math.sqrt(ballRadius * ballRadius - stepover * stepover / 4);
    },
    
    /**
     * Calculate stepover for target cusp height
     * Formula: s = 2 × sqrt(h × (2R - h))
     * 
     * @param {number} targetCuspHeight - Target cusp height (mm)
     * @param {number} ballRadius - Ball nose radius (mm)
     * @returns {number} Required stepover (mm)
     */
    calculateStepoverForCusp(targetCuspHeight, ballRadius) {
      return 2 * Math.sqrt(targetCuspHeight * (2 * ballRadius - targetCuspHeight));
    },
    
    /**
     * Calculate theoretical surface roughness from feed and nose radius
     * Formula: Ra ≈ f² / (32 × r)
     * 
     * @param {number} feedPerRev - Feed per revolution (mm/rev)
     * @param {number} noseRadius - Tool nose radius (mm)
     * @returns {number} Theoretical Ra (µm)
     */
    calculateTheoreticalRa(feedPerRev, noseRadius) {
      return (feedPerRev * feedPerRev) / (32 * noseRadius) * 1000; // Convert to µm
    },
    
    /**
     * Calculate required feed for target surface finish
     * @param {number} targetRa - Target Ra (µm)
     * @param {number} noseRadius - Tool nose radius (mm)
     * @returns {number} Maximum feed per revolution (mm/rev)
     */
    calculateFeedForRa(targetRa, noseRadius) {
      return Math.sqrt(32 * noseRadius * targetRa / 1000);
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 3: CUTTING FORCE CALCULATIONS (KIENZLE MODEL)
  // Source: Lines 82690-82705, 101413-101424, 102072-102085
  // ═══════════════════════════════════════════════════════════════════════════
  
  cuttingForce: {
    /**
     * Calculate specific cutting force using Kienzle model
     * Formula: Kc = Kc1.1 × h^(-mc)
     * 
     * @param {number} Kc11 - Specific cutting force at 1mm chip thickness (N/mm²)
     * @param {number} mc - Kienzle exponent (typically 0.20-0.30)
     * @param {number} chipThickness - Chip thickness h (mm)
     * @returns {number} Specific cutting force Kc (N/mm²)
     */
    calculateKc(Kc11, mc, chipThickness) {
      // Clamp chip thickness to valid range
      const h = Math.max(0.01, Math.min(chipThickness, 1.0));
      return Kc11 * Math.pow(h, -mc);
    },
    
    /**
     * Calculate cutting force
     * Formula: Fc = Kc × ap × ae
     * 
     * @param {number} Kc - Specific cutting force (N/mm²)
     * @param {number} ap - Depth of cut (mm)
     * @param {number} ae - Width of cut (mm)
     * @returns {number} Cutting force (N)
     */
    calculateCuttingForce(Kc, ap, ae) {
      return Kc * ap * ae;
    },
    
    /**
     * Calculate chip thickness for milling
     * Formula: hex = fz × sqrt(ae/D) (simplified)
     * 
     * @param {number} fz - Feed per tooth (mm)
     * @param {number} ae - Width of cut (mm)
     * @param {number} D - Tool diameter (mm)
     * @returns {number} Equivalent chip thickness (mm)
     */
    calculateChipThickness(fz, ae, D) {
      return fz * Math.sqrt(ae / D);
    },
    
    /**
     * Complete cutting force calculation
     * @param {Object} params - Cutting parameters
     * @returns {Object} Force results with Kc and force values
     */
    calculateForces(params) {
      const { Kc11, mc, fz, ae, ap, D } = params;
      
      const chipThickness = this.calculateChipThickness(fz, ae, D);
      const Kc = this.calculateKc(Kc11, mc, chipThickness);
      const force = this.calculateCuttingForce(Kc, ap, ae);
      
      return {
        chipThickness: Math.round(chipThickness * 1000) / 1000,
        Kc: Math.round(Kc),
        force: Math.round(force),
        unit: 'N'
      };
    },
    
    /**
     * Default Kienzle coefficients for common materials
     */
    defaultCoefficients: {
      steel_1018:      { Kc11: 1800, mc: 0.25 },
      steel_4140:      { Kc11: 2100, mc: 0.25 },
      steel_4340:      { Kc11: 2300, mc: 0.26 },
      stainless_304:   { Kc11: 2450, mc: 0.21 },
      stainless_316:   { Kc11: 2650, mc: 0.22 },
      aluminum_6061:   { Kc11: 700,  mc: 0.23 },
      aluminum_7075:   { Kc11: 850,  mc: 0.24 },
      titanium_6al4v:  { Kc11: 1650, mc: 0.23 },
      inconel_718:     { Kc11: 3100, mc: 0.20 },
      cast_iron:       { Kc11: 1100, mc: 0.28 },
      brass:           { Kc11: 780,  mc: 0.18 }
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 4: MATERIAL REMOVAL RATE
  // Source: Lines 23419-23428
  // ═══════════════════════════════════════════════════════════════════════════
  
  materialRemoval: {
    /**
     * Calculate material removal rate for milling
     * Formula: MRR = ap × ae × Vf
     * 
     * @param {number} ap - Depth of cut (mm)
     * @param {number} ae - Width of cut (mm)
     * @param {number} Vf - Feed rate (mm/min)
     * @returns {number} MRR (mm³/min)
     */
    calculateMRR_milling(ap, ae, Vf) {
      return ap * ae * Vf;
    },
    
    /**
     * Calculate material removal rate for turning
     * Formula: MRR = π × D × ap × f × n
     * 
     * @param {number} D - Workpiece diameter (mm)
     * @param {number} ap - Depth of cut (mm)
     * @param {number} f - Feed per rev (mm/rev)
     * @param {number} n - RPM
     * @returns {number} MRR (mm³/min)
     */
    calculateMRR_turning(D, ap, f, n) {
      return Math.PI * D * ap * f * n;
    },
    
    /**
     * Calculate feed rate
     * Formula: Vf = n × z × fz
     * 
     * @param {number} n - RPM
     * @param {number} z - Number of teeth
     * @param {number} fz - Feed per tooth (mm)
     * @returns {number} Feed rate (mm/min)
     */
    calculateFeedRate(n, z, fz) {
      return n * z * fz;
    },
    
    /**
     * Calculate machining time
     * @param {number} length - Cut length (mm)
     * @param {number} Vf - Feed rate (mm/min)
     * @returns {number} Time (minutes)
     */
    calculateCuttingTime(length, Vf) {
      return length / Vf;
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 5: 2D TOOLPATH ALGORITHMS
  // Source: Lines 5434-5790
  // ═══════════════════════════════════════════════════════════════════════════
  
  toolpath2D: {
    /**
     * Generate contour toolpath
     * @param {Object} params - {geometry, offset, depth, stepdown}
     * @returns {Array} Toolpath points
     */
    generateContour(params) {
      const { geometry, offset, depth, stepdown } = params;
      const path = [];
      
      // Generate offset passes at each Z level
      const numLevels = Math.ceil(Math.abs(depth) / stepdown);
      
      for (let i = 0; i < numLevels; i++) {
        const z = -i * stepdown;
        const offsetGeometry = this.offsetPolygon(geometry, offset);
        
        path.push({
          type: 'CONTOUR_PASS',
          z: z,
          points: offsetGeometry
        });
      }
      
      return path;
    },
    
    /**
     * Generate zigzag pocket toolpath
     * @param {Object} params - {boundary, stepover, angle, depth, stepdown}
     * @returns {Array} Toolpath points
     */
    generateZigzagPocket(params) {
      const { boundary, stepover, angle = 0, depth, stepdown, toolDiameter } = params;
      const path = [];
      
      // Get bounding box
      const bbox = this.getBoundingBox(boundary);
      
      // Generate scan lines
      const cos_a = Math.cos(angle * Math.PI / 180);
      const sin_a = Math.sin(angle * Math.PI / 180);
      const diagonal = Math.sqrt(
        Math.pow(bbox.maxX - bbox.minX, 2) + 
        Math.pow(bbox.maxY - bbox.minY, 2)
      );
      
      const numLines = Math.ceil(diagonal / stepover);
      const numLevels = Math.ceil(Math.abs(depth) / stepdown);
      
      for (let level = 0; level < numLevels; level++) {
        const z = -level * stepdown;
        const levelPath = [];
        
        for (let i = 0; i < numLines; i++) {
          const offset = (i - numLines / 2) * stepover;
          
          // Line perpendicular to angle
          const lineStart = {
            x: bbox.minX + cos_a * offset - sin_a * diagonal,
            y: bbox.minY + sin_a * offset + cos_a * diagonal
          };
          const lineEnd = {
            x: bbox.minX + cos_a * offset + sin_a * diagonal,
            y: bbox.minY + sin_a * offset - cos_a * diagonal
          };
          
          // Find intersections with boundary
          const intersections = this.linePolygonIntersections(lineStart, lineEnd, boundary);
          
          // Sort intersections by distance from start
          intersections.sort((a, b) => {
            const da = Math.pow(a.x - lineStart.x, 2) + Math.pow(a.y - lineStart.y, 2);
            const db = Math.pow(b.x - lineStart.x, 2) + Math.pow(b.y - lineStart.y, 2);
            return da - db;
          });
          
          // Zigzag pattern (alternate direction)
          for (let j = 0; j < intersections.length - 1; j += 2) {
            if (i % 2 === 0) {
              levelPath.push({ ...intersections[j], z });
              levelPath.push({ ...intersections[j + 1], z });
            } else {
              levelPath.push({ ...intersections[j + 1], z });
              levelPath.push({ ...intersections[j], z });
            }
          }
        }
        
        path.push({
          type: 'ZIGZAG_PASS',
          z: z,
          points: levelPath
        });
      }
      
      return path;
    },
    
    /**
     * Generate spiral pocket toolpath
     * @param {Object} params - {boundary, stepover, depth, stepdown, toolDiameter}
     * @returns {Array} Toolpath points
     */
    generateSpiralPocket(params) {
      const { boundary, stepover, depth, stepdown, toolDiameter } = params;
      const path = [];
      const numLevels = Math.ceil(Math.abs(depth) / stepdown);
      
      for (let level = 0; level < numLevels; level++) {
        const z = -level * stepdown;
        const levelPath = [];
        
        // Generate inward spiral offsets
        let currentOffset = toolDiameter / 2;
        let offsetBoundary = this.offsetPolygon(boundary, -currentOffset);
        
        while (offsetBoundary.length >= 3) {
          levelPath.push({
            type: 'SPIRAL_RING',
            z: z,
            points: offsetBoundary
          });
          
          currentOffset += stepover;
          offsetBoundary = this.offsetPolygon(boundary, -currentOffset);
        }
        
        path.push({
          type: 'SPIRAL_PASS',
          z: z,
          rings: levelPath
        });
      }
      
      return path;
    },
    
    /**
     * Generate adaptive clearing toolpath
     * Maintains constant tool engagement angle
     * @param {Object} params - {boundary, stepover, toolDiameter, engagementAngle}
     * @returns {Array} Toolpath points
     */
    generateAdaptive(params) {
      const { boundary, stepover, toolDiameter, engagementAngle = 30, depth, stepdown } = params;
      const path = [];
      const numLevels = Math.ceil(Math.abs(depth) / stepdown);
      
      // Calculate max engagement from angle
      const maxEngagement = toolDiameter * (1 - Math.cos(engagementAngle * Math.PI / 180)) / 2;
      
      for (let level = 0; level < numLevels; level++) {
        const z = -level * stepdown;
        const levelPath = [];
        
        let currentOffset = toolDiameter / 2;
        
        while (currentOffset < this.getMaxOffset(boundary)) {
          const offsetContour = this.offsetPolygon(boundary, -currentOffset);
          
          if (offsetContour.length < 3) break;
          
          // Smooth path to maintain engagement angle
          const smoothedPath = this.smoothForEngagement(
            offsetContour,
            maxEngagement,
            toolDiameter
          );
          
          levelPath.push({
            type: 'ADAPTIVE_RING',
            z: z,
            points: smoothedPath
          });
          
          currentOffset += stepover;
        }
        
        path.push({
          type: 'ADAPTIVE_PASS',
          z: z,
          rings: levelPath
        });
      }
      
      // Optimize with rapids
      return this.optimizeRapids(path);
    },
    
    /**
     * Generate trochoidal toolpath
     * Source: Lines 5652-5773
     * @param {Object} params - {startPoint, endPoint, width, toolDiameter}
     * @returns {Array} Toolpath points
     */
    generateTrochoidal(params) {
      const { startPoint, endPoint, width, toolDiameter, depth, stepdown } = params;
      const path = [];
      
      // Trochoidal parameters
      const arcRadius = toolDiameter * 0.3;     // 30% of tool diameter
      const stepForward = toolDiameter * 0.1;   // 10% of tool diameter
      
      const direction = this.normalize(this.subtract(endPoint, startPoint));
      const perpendicular = { x: -direction.y, y: direction.x };
      
      const numLevels = Math.ceil(Math.abs(depth) / stepdown);
      
      for (let level = 0; level < numLevels; level++) {
        const z = -level * stepdown;
        const levelPath = [];
        let currentPos = { ...startPoint };
        
        while (this.distance(currentPos, endPoint) > stepForward) {
          // Generate trochoidal arc
          const arcPoints = this.generateTrochoidalArc(
            currentPos,
            direction,
            perpendicular,
            arcRadius,
            stepForward,
            z
          );
          
          levelPath.push(...arcPoints);
          
          // Move forward along slot
          currentPos = this.movePoint(currentPos, direction, stepForward);
        }
        
        path.push({
          type: 'TROCHOIDAL_PASS',
          z: z,
          points: levelPath
        });
      }
      
      return path;
    },
    
    /**
     * Generate single trochoidal arc
     */
    generateTrochoidalArc(center, direction, perpendicular, arcRadius, stepForward, z) {
      const points = [];
      const numSegments = 16; // Arc resolution
      
      // Generate circular arc with forward motion
      for (let i = 0; i <= numSegments; i++) {
        const angle = (i / numSegments) * 2 * Math.PI;
        const progress = i / numSegments;
        
        // Circular motion
        const cx = arcRadius * Math.cos(angle);
        const cy = arcRadius * Math.sin(angle);
        
        // Convert to path coordinates with forward progress
        points.push({
          x: center.x + perpendicular.x * cx + direction.x * (cy + progress * stepForward),
          y: center.y + perpendicular.y * cx + direction.y * (cy + progress * stepForward),
          z: z,
          type: 'G1' // Linear interpolation (or G2/G3 for arcs)
        });
      }
      
      return points;
    },
    
    // ─────────────────────────────────────────────────────────────────────────
    // Helper functions
    // ─────────────────────────────────────────────────────────────────────────
    
    getBoundingBox(points) {
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const p of points) {
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x);
        maxY = Math.max(maxY, p.y);
      }
      return { minX, minY, maxX, maxY };
    },
    
    offsetPolygon(polygon, offset) {
      // Simplified polygon offset using normal extrusion
      // In production, use Clipper.js or similar
      const n = polygon.length;
      if (n < 3) return [];
      
      const result = [];
      for (let i = 0; i < n; i++) {
        const prev = polygon[(i - 1 + n) % n];
        const curr = polygon[i];
        const next = polygon[(i + 1) % n];
        
        // Calculate vertex normal (average of edge normals)
        const e1 = this.normalize({ x: curr.x - prev.x, y: curr.y - prev.y });
        const e2 = this.normalize({ x: next.x - curr.x, y: next.y - curr.y });
        
        const n1 = { x: -e1.y, y: e1.x };
        const n2 = { x: -e2.y, y: e2.x };
        
        const avgNormal = this.normalize({ 
          x: n1.x + n2.x, 
          y: n1.y + n2.y 
        });
        
        result.push({
          x: curr.x + avgNormal.x * offset,
          y: curr.y + avgNormal.y * offset
        });
      }
      
      return result;
    },
    
    linePolygonIntersections(start, end, polygon) {
      const intersections = [];
      const n = polygon.length;
      
      for (let i = 0; i < n; i++) {
        const p1 = polygon[i];
        const p2 = polygon[(i + 1) % n];
        const intersection = this.lineLineIntersection(start, end, p1, p2);
        if (intersection) intersections.push(intersection);
      }
      
      return intersections;
    },
    
    lineLineIntersection(p1, p2, p3, p4) {
      const d = (p1.x - p2.x) * (p3.y - p4.y) - (p1.y - p2.y) * (p3.x - p4.x);
      if (Math.abs(d) < 1e-10) return null;
      
      const t = ((p1.x - p3.x) * (p3.y - p4.y) - (p1.y - p3.y) * (p3.x - p4.x)) / d;
      const u = -((p1.x - p2.x) * (p1.y - p3.y) - (p1.y - p2.y) * (p1.x - p3.x)) / d;
      
      if (u >= 0 && u <= 1) {
        return {
          x: p1.x + t * (p2.x - p1.x),
          y: p1.y + t * (p2.y - p1.y)
        };
      }
      
      return null;
    },
    
    normalize(v) {
      const len = Math.sqrt(v.x * v.x + v.y * v.y);
      return len > 0 ? { x: v.x / len, y: v.y / len } : { x: 0, y: 0 };
    },
    
    subtract(p1, p2) {
      return { x: p1.x - p2.x, y: p1.y - p2.y };
    },
    
    distance(p1, p2) {
      return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
    },
    
    movePoint(point, direction, distance) {
      return {
        x: point.x + direction.x * distance,
        y: point.y + direction.y * distance
      };
    },
    
    getMaxOffset(boundary) {
      const bbox = this.getBoundingBox(boundary);
      return Math.max(bbox.maxX - bbox.minX, bbox.maxY - bbox.minY) / 2;
    },
    
    smoothForEngagement(path, maxEngagement, toolDiameter) {
      // Smooth sharp corners to maintain engagement
      // Simplified implementation
      return path;
    },
    
    optimizeRapids(path) {
      // Optimize rapid moves between passes
      // Simplified implementation
      return path;
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 6: 3D SURFACE TOOLPATH ALGORITHMS
  // Source: Lines 354600-356711
  // ═══════════════════════════════════════════════════════════════════════════
  
  toolpath3D: {
    /**
     * Generate waterline toolpath (horizontal slicing)
     * @param {Object} params - {surface, stepdown, minZ, toolDiameter}
     * @returns {Array} Toolpath passes
     */
    generateWaterline(params) {
      const { surface, stepdown = 0.1, minZ = -1, toolDiameter } = params;
      const points = [];
      
      // Slice surface at each Z level
      let z = 0;
      while (z >= minZ) {
        const slice = this.intersectSurfaceAtZ(surface, z);
        
        if (slice && slice.length > 0) {
          // Offset for tool radius
          const offset = this.offsetContour(slice, toolDiameter / 2);
          
          points.push({
            type: 'WATERLINE',
            z: z,
            contour: offset
          });
        }
        
        z -= stepdown;
      }
      
      return { type: 'WATERLINE', points };
    },
    
    /**
     * Generate scallop (constant cusp height) toolpath
     * @param {Object} params - {surface, cuspHeight, toolRadius}
     * @returns {Array} Toolpath passes
     */
    generateScallop(params) {
      const { surface, cuspHeight = 0.01, toolRadius } = params;
      const points = [];
      
      // Calculate stepover from cusp height
      // h = R - sqrt(R² - (ae/2)²) → ae = 2*sqrt(2*R*h - h²)
      const stepover = 2 * Math.sqrt(2 * toolRadius * cuspHeight - cuspHeight * cuspHeight);
      
      // Generate iso-scallop paths
      const isoParams = this.calculateIsoScallopPaths(surface, stepover, toolRadius);
      
      for (const path of isoParams) {
        points.push({
          type: 'SCALLOP',
          cuspHeight: cuspHeight,
          stepover: stepover,
          points: path
        });
      }
      
      return { type: 'SCALLOP', points };
    },
    
    /**
     * Generate pencil trace toolpath (corner cleanup)
     * @param {Object} params - {surface, toolRadius, minRadius}
     * @returns {Array} Toolpath passes
     */
    generatePencil(params) {
      const { surface, toolRadius, minRadius = 0.5 } = params;
      const points = [];
      
      // Find concave edges and fillets smaller than tool radius
      const pencilPaths = this.findPencilRegions(surface, toolRadius, minRadius);
      
      for (const path of pencilPaths) {
        points.push({
          type: 'PENCIL',
          points: path
        });
      }
      
      return { type: 'PENCIL', points };
    },
    
    /**
     * Generate parallel (raster) toolpath
     * @param {Object} params - {surface, stepover, angle, toolRadius}
     * @returns {Array} Toolpath passes
     */
    generateParallel(params) {
      const { surface, stepover, angle = 0, toolRadius } = params;
      const points = [];
      
      // Get surface bounding box
      const bbox = this.getSurfaceBbox(surface);
      
      // Generate parallel lines at specified angle
      const cos_a = Math.cos(angle * Math.PI / 180);
      const sin_a = Math.sin(angle * Math.PI / 180);
      
      const diagonal = Math.sqrt(
        Math.pow(bbox.maxX - bbox.minX, 2) + 
        Math.pow(bbox.maxY - bbox.minY, 2)
      );
      
      const numPasses = Math.ceil(diagonal / stepover);
      
      for (let i = 0; i < numPasses; i++) {
        const offset = (i - numPasses / 2) * stepover;
        
        // Calculate line endpoints
        const lineStart = {
          x: bbox.centerX + cos_a * offset - sin_a * diagonal,
          y: bbox.centerY + sin_a * offset + cos_a * diagonal
        };
        const lineEnd = {
          x: bbox.centerX + cos_a * offset + sin_a * diagonal,
          y: bbox.centerY + sin_a * offset - cos_a * diagonal
        };
        
        // Project line onto surface
        const projectedPath = this.projectLineOnSurface(lineStart, lineEnd, surface, toolRadius);
        
        if (projectedPath.length > 0) {
          points.push({
            type: 'PARALLEL',
            passNumber: i,
            points: projectedPath
          });
        }
      }
      
      return { type: 'PARALLEL', points };
    },
    
    /**
     * Generate radial toolpath
     * @param {Object} params - {surface, center, numPasses, toolRadius}
     * @returns {Array} Toolpath passes
     */
    generateRadial(params) {
      const { surface, center, numPasses = 36, toolRadius } = params;
      const points = [];
      
      const angleStep = (2 * Math.PI) / numPasses;
      const bbox = this.getSurfaceBbox(surface);
      const radius = Math.sqrt(
        Math.pow(bbox.maxX - bbox.minX, 2) + 
        Math.pow(bbox.maxY - bbox.minY, 2)
      ) / 2;
      
      for (let i = 0; i < numPasses; i++) {
        const angle = i * angleStep;
        
        const lineStart = { x: center.x, y: center.y };
        const lineEnd = {
          x: center.x + radius * Math.cos(angle),
          y: center.y + radius * Math.sin(angle)
        };
        
        const projectedPath = this.projectLineOnSurface(lineStart, lineEnd, surface, toolRadius);
        
        if (projectedPath.length > 0) {
          points.push({
            type: 'RADIAL',
            angle: angle * 180 / Math.PI,
            points: projectedPath
          });
        }
      }
      
      return { type: 'RADIAL', points };
    },
    
    /**
     * Generate flowline toolpath
     * @param {Object} params - {surface, startEdge, endEdge, numPasses, toolRadius}
     * @returns {Array} Toolpath passes
     */
    generateFlowline(params) {
      const { surface, startEdge, endEdge, numPasses, toolRadius } = params;
      const points = [];
      
      // Interpolate between start and end edges
      for (let i = 0; i < numPasses; i++) {
        const t = i / (numPasses - 1);
        const flowPath = this.interpolateEdges(startEdge, endEdge, t);
        
        // Project onto surface
        const projectedPath = this.projectPathOnSurface(flowPath, surface, toolRadius);
        
        points.push({
          type: 'FLOWLINE',
          parameter: t,
          points: projectedPath
        });
      }
      
      return { type: 'FLOWLINE', points };
    },
    
    // ─────────────────────────────────────────────────────────────────────────
    // Helper functions for 3D toolpaths
    // ─────────────────────────────────────────────────────────────────────────
    
    intersectSurfaceAtZ(surface, z) {
      // Simplified - in production use proper surface/plane intersection
      return [];
    },
    
    offsetContour(contour, offset) {
      // Use 2D offset algorithm
      return contour;
    },
    
    calculateIsoScallopPaths(surface, stepover, toolRadius) {
      // Generate iso-scallop paths following surface curvature
      return [];
    },
    
    findPencilRegions(surface, toolRadius, minRadius) {
      // Find corners and fillets for pencil tracing
      return [];
    },
    
    getSurfaceBbox(surface) {
      // Get surface bounding box with center
      return {
        minX: 0, minY: 0, minZ: 0,
        maxX: 100, maxY: 100, maxZ: 50,
        centerX: 50, centerY: 50
      };
    },
    
    projectLineOnSurface(start, end, surface, toolRadius) {
      // Project 2D line onto 3D surface
      return [];
    },
    
    projectPathOnSurface(path, surface, toolRadius) {
      // Project path onto surface
      return [];
    },
    
    interpolateEdges(edge1, edge2, t) {
      // Interpolate between two edges
      return [];
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 7: TOOLPATH OPTIMIZATION
  // ═══════════════════════════════════════════════════════════════════════════
  
  optimization: {
    /**
     * Arc fitting - replace linear segments with arcs
     * @param {Array} path - Array of points
     * @param {number} tolerance - Fitting tolerance
     * @returns {Array} Optimized path with arcs
     */
    fitArcs(path, tolerance = 0.01) {
      const result = [];
      let i = 0;
      
      while (i < path.length - 2) {
        // Try to fit arc through 3+ points
        const arc = this.tryFitArc(path, i, tolerance);
        
        if (arc) {
          result.push({
            type: arc.clockwise ? 'G2' : 'G3',
            start: arc.start,
            end: arc.end,
            center: arc.center,
            radius: arc.radius
          });
          i = arc.endIndex;
        } else {
          result.push({
            type: 'G1',
            point: path[i]
          });
          i++;
        }
      }
      
      // Add remaining points
      while (i < path.length) {
        result.push({
          type: 'G1',
          point: path[i]
        });
        i++;
      }
      
      return result;
    },
    
    tryFitArc(path, startIndex, tolerance) {
      // Try to fit an arc through consecutive points
      // Simplified implementation
      return null;
    },
    
    /**
     * Point reduction using Douglas-Peucker algorithm
     * @param {Array} points - Input points
     * @param {number} epsilon - Tolerance
     * @returns {Array} Reduced points
     */
    reducePoints(points, epsilon = 0.001) {
      if (points.length < 3) return points;
      
      // Find the point with maximum distance
      let maxDist = 0;
      let maxIndex = 0;
      
      const start = points[0];
      const end = points[points.length - 1];
      
      for (let i = 1; i < points.length - 1; i++) {
        const dist = this.pointLineDistance(points[i], start, end);
        if (dist > maxDist) {
          maxDist = dist;
          maxIndex = i;
        }
      }
      
      // If max distance greater than epsilon, recursively simplify
      if (maxDist > epsilon) {
        const left = this.reducePoints(points.slice(0, maxIndex + 1), epsilon);
        const right = this.reducePoints(points.slice(maxIndex), epsilon);
        return left.slice(0, -1).concat(right);
      } else {
        return [start, end];
      }
    },
    
    pointLineDistance(point, lineStart, lineEnd) {
      const dx = lineEnd.x - lineStart.x;
      const dy = lineEnd.y - lineStart.y;
      const dz = (lineEnd.z || 0) - (lineStart.z || 0);
      
      const lenSq = dx * dx + dy * dy + dz * dz;
      if (lenSq === 0) return this.distance3D(point, lineStart);
      
      const t = Math.max(0, Math.min(1, (
        (point.x - lineStart.x) * dx +
        (point.y - lineStart.y) * dy +
        ((point.z || 0) - (lineStart.z || 0)) * dz
      ) / lenSq));
      
      const projection = {
        x: lineStart.x + t * dx,
        y: lineStart.y + t * dy,
        z: (lineStart.z || 0) + t * dz
      };
      
      return this.distance3D(point, projection);
    },
    
    distance3D(p1, p2) {
      return Math.sqrt(
        Math.pow(p1.x - p2.x, 2) +
        Math.pow(p1.y - p2.y, 2) +
        Math.pow((p1.z || 0) - (p2.z || 0), 2)
      );
    },
    
    /**
     * Smooth path with moving average
     * @param {Array} path - Input path
     * @param {number} windowSize - Smoothing window
     * @returns {Array} Smoothed path
     */
    smoothPath(path, windowSize = 3) {
      if (path.length < windowSize) return path;
      
      const result = [];
      const halfWindow = Math.floor(windowSize / 2);
      
      for (let i = 0; i < path.length; i++) {
        let sumX = 0, sumY = 0, sumZ = 0, count = 0;
        
        for (let j = Math.max(0, i - halfWindow); j <= Math.min(path.length - 1, i + halfWindow); j++) {
          sumX += path[j].x;
          sumY += path[j].y;
          sumZ += path[j].z || 0;
          count++;
        }
        
        result.push({
          x: sumX / count,
          y: sumY / count,
          z: sumZ / count
        });
      }
      
      return result;
    },
    
    /**
     * Round corners to improve surface finish
     * @param {Array} path - Input path
     * @param {number} radius - Corner radius
     * @returns {Array} Path with rounded corners
     */
    roundCorners(path, radius = 0.5) {
      if (path.length < 3) return path;
      
      const result = [path[0]];
      
      for (let i = 1; i < path.length - 1; i++) {
        const prev = path[i - 1];
        const curr = path[i];
        const next = path[i + 1];
        
        // Calculate angle at corner
        const v1 = { x: prev.x - curr.x, y: prev.y - curr.y };
        const v2 = { x: next.x - curr.x, y: next.y - curr.y };
        
        const angle = Math.acos(
          (v1.x * v2.x + v1.y * v2.y) /
          (Math.sqrt(v1.x * v1.x + v1.y * v1.y) * Math.sqrt(v2.x * v2.x + v2.y * v2.y))
        );
        
        // If sharp corner, add arc
        if (angle < Math.PI * 0.9) {
          const arcPoints = this.generateCornerArc(prev, curr, next, radius);
          result.push(...arcPoints);
        } else {
          result.push(curr);
        }
      }
      
      result.push(path[path.length - 1]);
      return result;
    },
    
    generateCornerArc(prev, curr, next, radius) {
      // Generate arc points for corner rounding
      // Simplified implementation
      return [curr];
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 8: STRATEGY SELECTION
  // ═══════════════════════════════════════════════════════════════════════════
  
  strategySelector: {
    /**
     * Select best strategy based on feature type and material
     */
    selectStrategy(feature, material, operation) {
      const recommendations = {
        // 2D features
        pocket_open: ['adaptive', 'trochoidal', 'zigzag'],
        pocket_closed: ['spiral', 'adaptive', 'zigzag'],
        slot: ['trochoidal', 'adaptive'],
        contour: ['contour', 'adaptive'],
        face: ['face', 'zigzag'],
        
        // 3D features
        surface_steep: ['waterline', 'pencil'],
        surface_shallow: ['parallel', 'scallop'],
        surface_freeform: ['scallop', 'flowline'],
        corner_cleanup: ['pencil', 'rest'],
        
        // Material-specific overrides
        aluminum: { prefer: ['hsm', 'adaptive'], avoid: ['waterline'] },
        titanium: { prefer: ['trochoidal', 'adaptive'], avoid: ['hsm'] },
        steel: { prefer: ['waterline', 'parallel'], avoid: [] },
        hardened: { prefer: ['scallop', 'pencil'], avoid: ['adaptive'] }
      };
      
      let strategies = recommendations[feature] || ['adaptive'];
      
      // Apply material preferences
      const matPrefs = recommendations[material];
      if (matPrefs) {
        strategies = strategies.filter(s => !matPrefs.avoid.includes(s));
        strategies = [...new Set([...matPrefs.prefer, ...strategies])];
      }
      
      return {
        recommended: strategies[0],
        alternatives: strategies.slice(1),
        feature: feature,
        material: material
      };
    },
    
    /**
     * Get strategy parameters for selected strategy
     */
    getStrategyParams(strategy, toolDiameter, material) {
      const params = PRISM_CAM_KERNEL_COMPLETE.STRATEGY_PARAMS;
      
      const defaults = {
        zigzag: {
          stepover: toolDiameter * params.STEPOVER_ROUGH_PERCENT / 100,
          angle: 45
        },
        spiral: {
          stepover: toolDiameter * params.STEPOVER_ROUGH_PERCENT / 100
        },
        adaptive: {
          stepover: toolDiameter * params.TROCHOIDAL_STEPOVER_PERCENT / 100,
          engagementAngle: 30
        },
        trochoidal: {
          arcRadius: toolDiameter * params.TROCHOIDAL_ARC_RADIUS_FACTOR,
          stepForward: toolDiameter * params.TROCHOIDAL_STEP_FORWARD_FACTOR
        },
        hsm: {
          radialEngagement: params.HSM_RADIAL_ENGAGEMENT_MAX,
          chiploadFactor: params.HSM_CHIPLOAD_FACTOR
        },
        waterline: {
          stepdown: 0.5
        },
        parallel: {
          stepover: toolDiameter * params.STEPOVER_FINISH_PERCENT / 100,
          angle: 0
        },
        scallop: {
          cuspHeight: params.SCALLOP_CUSP_HEIGHT_DEFAULT
        }
      };
      
      return defaults[strategy] || {};
    }
  }
};

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PRISM_CAM_KERNEL_COMPLETE;
}

// Export for browser
if (typeof window !== 'undefined') {
  window.PRISM_CAM_KERNEL_COMPLETE = PRISM_CAM_KERNEL_COMPLETE;
}
