const PRISM_CAM_KERNEL_PASS2 = {
    
    // ─────────────────────────────────────────────────────────────────────────
    // TOOLPATH STRATEGIES
    // ─────────────────────────────────────────────────────────────────────────
    
    /**
     * Adaptive clearing (constant engagement) toolpath
     */
    adaptiveClearingPath: function(boundary, toolRadius, maxEngagement, stepover) {
        const paths = [];
        const effectiveStepover = Math.min(stepover, toolRadius * maxEngagement);
        
        // Generate contour-parallel offsets
        let currentBoundary = this._offsetPolygon(boundary, -toolRadius);
        let level = 0;
        
        while (currentBoundary && currentBoundary.length >= 3 && level < 100) {
            paths.push({
                level,
                points: [...currentBoundary],
                type: 'clearing'
            });
            
            currentBoundary = this._offsetPolygon(currentBoundary, -effectiveStepover);
            level++;
        }
        
        // Add entry helix if needed
        if (paths.length > 0) {
            const center = this._polygonCentroid(paths[paths.length - 1].points);
            paths.unshift({
                type: 'helix_entry',
                center,
                radius: toolRadius * 0.5,
                pitch: toolRadius * 0.1
            });
        }
        
        return paths;
    },
    
    /**
     * Trochoidal milling toolpath
     */
    trochoidalPath: function(startPoint, endPoint, slotWidth, toolRadius, stepover) {
        const path = [];
        const dir = this._normalize2D({
            x: endPoint.x - startPoint.x,
            y: endPoint.y - startPoint.y
        });
        const perp = { x: -dir.y, y: dir.x };
        
        const totalLength = Math.sqrt(
            Math.pow(endPoint.x - startPoint.x, 2) +
            Math.pow(endPoint.y - startPoint.y, 2)
        );
        
        const circleRadius = (slotWidth - toolRadius * 2) / 2;
        const numCycles = Math.ceil(totalLength / stepover);
        const pointsPerCircle = 36;
        
        for (let i = 0; i <= numCycles; i++) {
            const progress = i / numCycles;
            const center = {
                x: startPoint.x + dir.x * totalLength * progress,
                y: startPoint.y + dir.y * totalLength * progress
            };
            
            // Generate circle with forward progression
            for (let j = 0; j < pointsPerCircle; j++) {
                const angle = (j / pointsPerCircle) * 2 * Math.PI;
                const extraProgress = (j / pointsPerCircle) * (stepover / totalLength);
                
                path.push({
                    x: center.x + dir.x * totalLength * extraProgress + 
                       circleRadius * Math.cos(angle),
                    y: center.y + dir.y * totalLength * extraProgress + 
                       circleRadius * Math.sin(angle),
                    z: startPoint.z || 0
                });
            }
        }
        
        return path;
    },
    
    /**
     * Spiral pocket toolpath (efficient for circular/round pockets)
     */
    spiralPocketPath: function(center, outerRadius, toolRadius, stepover, direction = 'inward') {
        const path = [];
        const effectiveRadius = outerRadius - toolRadius;
        
        if (direction === 'inward') {
            let r = effectiveRadius;
            let angle = 0;
            
            while (r > stepover) {
                const deltaAngle = stepover / r;
                path.push({
                    x: center.x + r * Math.cos(angle),
                    y: center.y + r * Math.sin(angle),
                    z: center.z || 0
                });
                angle += deltaAngle;
                r -= stepover * deltaAngle / (2 * Math.PI);
            }
        } else {
            // Outward spiral
            let r = stepover;
            let angle = 0;
            
            while (r < effectiveRadius) {
                const deltaAngle = stepover / r;
                path.push({
                    x: center.x + r * Math.cos(angle),
                    y: center.y + r * Math.sin(angle),
                    z: center.z || 0
                });
                angle += deltaAngle;
                r += stepover * deltaAngle / (2 * Math.PI);
            }
        }
        
        return path;
    },
    
    /**
     * Contour-parallel (offset) pocket strategy
     */
    contourParallelPocket: function(boundary, toolRadius, stepover) {
        const contours = [];
        let current = this._offsetPolygon(boundary, -toolRadius);
        
        while (current && current.length >= 3) {
            contours.push([...current]);
            current = this._offsetPolygon(current, -stepover);
        }
        
        return contours;
    },
    
    /**
     * Zigzag/raster toolpath
     */
    zigzagPath: function(boundary, stepover, angle = 0) {
        const bounds = this._getBounds(boundary);
        const path = [];
        
        const cos_a = Math.cos(angle);
        const sin_a = Math.sin(angle);
        
        const diagonal = Math.sqrt(
            Math.pow(bounds.maxX - bounds.minX, 2) +
            Math.pow(bounds.maxY - bounds.minY, 2)
        );
        
        const numLines = Math.ceil(diagonal / stepover);
        const cx = (bounds.minX + bounds.maxX) / 2;
        const cy = (bounds.minY + bounds.maxY) / 2;
        
        for (let i = 0; i < numLines; i++) {
            const offset = (i - numLines / 2) * stepover;
            
            // Line perpendicular to angle direction
            const lineStart = {
                x: cx - sin_a * diagonal + cos_a * offset,
                y: cy + cos_a * diagonal + sin_a * offset
            };
            const lineEnd = {
                x: cx + sin_a * diagonal + cos_a * offset,
                y: cy - cos_a * diagonal + sin_a * offset
            };
            
            const intersections = this._linePolygonIntersections(lineStart, lineEnd, boundary);
            
            if (intersections.length >= 2) {
                intersections.sort((a, b) => {
                    const da = Math.pow(a.x - lineStart.x, 2) + Math.pow(a.y - lineStart.y, 2);
                    const db = Math.pow(b.x - lineStart.x, 2) + Math.pow(b.y - lineStart.y, 2);
                    return da - db;
                });
                
                // Zigzag: alternate direction
                if (i % 2 === 0) {
                    path.push(intersections[0], intersections[1]);
                } else {
                    path.push(intersections[1], intersections[0]);
                }
            }
        }
        
        return path;
    },
    
    // ─────────────────────────────────────────────────────────────────────────
    // CUTTING PHYSICS
    // ─────────────────────────────────────────────────────────────────────────
    
    /**
     * Merchant's cutting force model
     */
    merchantCuttingForce: function(params) {
        const {
            chipThickness,      // h (mm)
            width,              // b (mm)
            rakeAngle,          // α (radians)
            frictionAngle,      // β (radians)
            shearStrength       // τs (MPa)
        } = params;
        
        // Shear angle from Merchant's minimum energy criterion
        const phi = Math.PI / 4 - (frictionAngle - rakeAngle) / 2;
        
        // Shear plane area
        const As = (chipThickness * width) / Math.sin(phi);
        
        // Shear force
        const Fs = shearStrength * As;
        
        // Resultant force
        const R = Fs / Math.cos(phi + frictionAngle - rakeAngle);
        
        // Cutting force (tangential)
        const Fc = R * Math.cos(frictionAngle - rakeAngle);
        
        // Thrust force (feed direction)
        const Ft = R * Math.sin(frictionAngle - rakeAngle);
        
        // Friction force
        const Ff = R * Math.sin(frictionAngle);
        
        // Normal force on rake face
        const Fn = R * Math.cos(frictionAngle);
        
        return {
            shearAngle: phi,
            shearForce: Fs,
            cuttingForce: Fc,
            thrustForce: Ft,
            frictionForce: Ff,
            normalForce: Fn,
            resultantForce: R,
            specificCuttingEnergy: Fc / (chipThickness * width),
            chipRatio: Math.cos(phi - rakeAngle) / Math.sin(phi)
        };
    },
    
    /**
     * Extended Taylor tool life equation
     * VT^n * f^a * d^b = C
     */
    taylorToolLife: function(params) {
        const {
            cuttingSpeed,   // V (m/min)
            feed = 1,       // f (mm/rev) - optional
            depth = 1,      // d (mm) - optional
            C,              // Taylor constant
            n,              // Speed exponent (typically 0.1-0.5)
            a = 0,          // Feed exponent
            b = 0           // Depth exponent
        } = params;
        
        const effectiveC = C / (Math.pow(feed, a) * Math.pow(depth, b));
        const toolLife = Math.pow(effectiveC / cuttingSpeed, 1 / n);
        
        return {
            toolLife,           // minutes
            cuttingLength: toolLife * cuttingSpeed * 1000, // mm
            constants: { C, n, a, b }
        };
    },
    
    /**
     * Surface roughness prediction
     * Ra = f² / (32 * R) for round nose tool
     */
    surfaceRoughness: function(params) {
        const { feed, noseRadius, operation = 'turning' } = params;
        
        if (operation === 'turning') {
            // Theoretical Ra for round nose tool
            const Ra = (feed * feed) / (32 * noseRadius);
            const Rz = Ra * 4;  // Approximate Rz
            return { Ra, Rz, theoretical: true };
        }
        
        if (operation === 'milling') {
            // Scallop height for ball end mill
            const { stepover, toolRadius } = params;
            const scallop = toolRadius - Math.sqrt(toolRadius * toolRadius - stepover * stepover / 4);
            return { Ra: scallop * 0.25, Rz: scallop, scallop };
        }
        
        return { Ra: 0, Rz: 0 };
    },
    
    /**
     * Material Removal Rate
     */
    materialRemovalRate: function(params) {
        const { operation = 'turning' } = params;
        
        if (operation === 'turning') {
            const { cuttingSpeed, feed, depth } = params;
            // MRR = V * f * d (cm³/min)
            return cuttingSpeed * feed * depth / 1000;
        }
        
        if (operation === 'milling') {
            const { stepover, axialDepth, feedRate, numFlutes = 1 } = params;
            // MRR = ae * ap * Vf (cm³/min)
            return stepover * axialDepth * feedRate / 1000;
        }
        
        return 0;
    },
    
    /**
     * Chip thickness calculation for milling
     */
    chipThickness: function(params) {
        const {
            feedPerTooth,       // fz (mm/tooth)
            radialEngagement,   // ae (mm)
            toolDiameter,       // D (mm)
            operation = 'peripheral'
        } = params;
        
        const engagementAngle = Math.acos(1 - 2 * radialEngagement / toolDiameter);
        
        if (operation === 'peripheral') {
            // Average chip thickness
            const hm = feedPerTooth * Math.sin(engagementAngle / 2);
            // Maximum chip thickness
            const hmax = feedPerTooth * Math.sin(engagementAngle);
            return { average: hm, maximum: hmax, engagementAngle };
        }
        
        return { average: feedPerTooth, maximum: feedPerTooth };
    },
    
    // ─────────────────────────────────────────────────────────────────────────
    // COLLISION & GOUGE DETECTION
    // ─────────────────────────────────────────────────────────────────────────
    
    /**
     * Check tool-surface interference (gouge)
     */
    checkGouge: function(toolPos, toolAxis, toolRadius, surfacePoint, surfaceNormal) {
        // Vector from tool position to surface point
        const toSurface = {
            x: surfacePoint.x - toolPos.x,
            y: surfacePoint.y - toolPos.y,
            z: surfacePoint.z - toolPos.z
        };
        
        // Axial distance (along tool axis)
        const axialDist = this._dot3D(toSurface, toolAxis);
        
        // Radial vector (perpendicular to tool axis)
        const radialVec = {
            x: toSurface.x - axialDist * toolAxis.x,
            y: toSurface.y - axialDist * toolAxis.y,
            z: toSurface.z - axialDist * toolAxis.z
        };
        
        const radialDist = Math.sqrt(this._dot3D(radialVec, radialVec));
        
        // Gouge occurs if point is within tool radius and below tool tip
        const gouged = radialDist < toolRadius && axialDist > 0;
        
        return {
            gouged,
            axialDistance: axialDist,
            radialDistance: radialDist,
            margin: radialDist - toolRadius
        };
    },
    
    /**
     * Calculate tool orientation for 5-axis machining
     */
    fiveAxisToolOrientation: function(surfaceNormal, leadAngle, tiltAngle) {
        // Start with tool along -Z (pointing down)
        let toolAxis = { x: 0, y: 0, z: -1 };
        
        // Apply lead angle (rotation around feed direction)
        const leadRad = leadAngle * Math.PI / 180;
        // Apply tilt angle (rotation perpendicular to feed)
        const tiltRad = tiltAngle * Math.PI / 180;
        
        // Create rotation to align with surface normal
        // This is a simplified version - full implementation would use quaternions
        const dot = -surfaceNormal.z;
        const angle = Math.acos(Math.max(-1, Math.min(1, dot)));
        
        if (Math.abs(angle) > 0.001) {
            const axis = this._normalize3D({
                x: surfaceNormal.y,
                y: -surfaceNormal.x,
                z: 0
            });
            
            const cos_a = Math.cos(angle + leadRad);
            const sin_a = Math.sin(angle + leadRad);
            
            toolAxis = {
                x: axis.x * axis.x * (1 - cos_a) + cos_a,
                y: axis.x * axis.y * (1 - cos_a) + axis.z * sin_a,
                z: axis.x * axis.z * (1 - cos_a) - axis.y * sin_a
            };
        }
        
        return this._normalize3D(toolAxis);
    },
    
    // ─────────────────────────────────────────────────────────────────────────
    // UTILITY FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────
    
    _offsetPolygon: function(polygon, offset) {
        if (!polygon || polygon.length < 3) return null;
        
        const result = [];
        const n = polygon.length;
        
        for (let i = 0; i < n; i++) {
            const prev = polygon[(i - 1 + n) % n];
            const curr = polygon[i];
            const next = polygon[(i + 1) % n];
            
            const e1 = this._n