const PRISM_FRUSTUM_CULLING = {
        name: 'PRISM Frustum Culling',
        version: '1.0.0',
        source: 'MIT 6.837 Computer Graphics',
        
        // Plane indices
        NEAR: 0,
        FAR: 1,
        LEFT: 2,
        RIGHT: 3,
        TOP: 4,
        BOTTOM: 5,
        
        /**
         * Extract frustum planes from view-projection matrix
         * Each plane is [A, B, C, D] where Ax + By + Cz + D = 0
         */
        extractFrustumPlanes: function(viewProjectionMatrix) {
            const m = viewProjectionMatrix;
            const planes = [];
            
            // Left: m[3] + m[0]
            planes[this.LEFT] = this._normalizePlane([
                m[3] + m[0], m[7] + m[4], m[11] + m[8], m[15] + m[12]
            ]);
            
            // Right: m[3] - m[0]
            planes[this.RIGHT] = this._normalizePlane([
                m[3] - m[0], m[7] - m[4], m[11] - m[8], m[15] - m[12]
            ]);
            
            // Bottom: m[3] + m[1]
            planes[this.BOTTOM] = this._normalizePlane([
                m[3] + m[1], m[7] + m[5], m[11] + m[9], m[15] + m[13]
            ]);
            
            // Top: m[3] - m[1]
            planes[this.TOP] = this._normalizePlane([
                m[3] - m[1], m[7] - m[5], m[11] - m[9], m[15] - m[13]
            ]);
            
            // Near: m[3] + m[2]
            planes[this.NEAR] = this._normalizePlane([
                m[3] + m[2], m[7] + m[6], m[11] + m[10], m[15] + m[14]
            ]);
            
            // Far: m[3] - m[2]
            planes[this.FAR] = this._normalizePlane([
                m[3] - m[2], m[7] - m[6], m[11] - m[10], m[15] - m[14]
            ]);
            
            return planes;
        },
        
        /**
         * Normalize a plane
         */
        _normalizePlane: function(plane) {
            const length = Math.sqrt(plane[0] * plane[0] + plane[1] * plane[1] + plane[2] * plane[2]);
            return [plane[0] / length, plane[1] / length, plane[2] / length, plane[3] / length];
        },
        
        /**
         * Calculate signed distance from point to plane
         */
        pointToPlaneDistance: function(point, plane) {
            return plane[0] * point.x + plane[1] * point.y + plane[2] * point.z + plane[3];
        },
        
        /**
         * Test if point is inside frustum
         */
        isPointInFrustum: function(point, planes) {
            for (const plane of planes) {
                if (this.pointToPlaneDistance(point, plane) < 0) {
                    return false;
                }
            }
            return true;
        },
        
        /**
         * Test if sphere intersects frustum
         * Returns: 'INSIDE', 'OUTSIDE', or 'INTERSECT'
         */
        sphereInFrustum: function(center, radius, planes) {
            let result = 'INSIDE';
            
            for (const plane of planes) {
                const distance = this.pointToPlaneDistance(center, plane);
                
                if (distance < -radius) {
                    return 'OUTSIDE';
                }
                
                if (distance < radius) {
                    result = 'INTERSECT';
                }
            }
            
            return result;
        },
        
        /**
         * Test if AABB (Axis-Aligned Bounding Box) intersects frustum
         * Returns: 'INSIDE', 'OUTSIDE', or 'INTERSECT'
         */
        aabbInFrustum: function(min, max, planes) {
            let result = 'INSIDE';
            
            for (const plane of planes) {
                // Find the positive and negative vertices
                const pVertex = {
                    x: plane[0] >= 0 ? max.x : min.x,
                    y: plane[1] >= 0 ? max.y : min.y,
                    z: plane[2] >= 0 ? max.z : min.z
                };
                
                const nVertex = {
                    x: plane[0] >= 0 ? min.x : max.x,
                    y: plane[1] >= 0 ? min.y : max.y,
                    z: plane[2] >= 0 ? min.z : max.z
                };
                
                // Check if completely outside
                if (this.pointToPlaneDistance(pVertex, plane) < 0) {
                    return 'OUTSIDE';
                }
                
                // Check if intersecting
                if (this.pointToPlaneDistance(nVertex, plane) < 0) {
                    result = 'INTERSECT';
                }
            }
            
            return result;
        },
        
        /**
         * Cull a list of objects against frustum
         * @param {Array} objects - Objects with bounds property
         * @param {Array} planes - Frustum planes
         * @returns {Array} Visible objects
         */
        cullObjects: function(objects, planes) {
            const visible = [];
            let culledCount = 0;
            
            for (const obj of objects) {
                let result;
                
                if (obj.boundingSphere) {
                    result = this.sphereInFrustum(
                        obj.boundingSphere.center,
                        obj.boundingSphere.radius,
                        planes
                    );
                } else if (obj.boundingBox) {
                    result = this.aabbInFrustum(
                        obj.boundingBox.min,
                        obj.boundingBox.max,
                        planes
                    );
                } else {
                    // No bounds, include by default
                    visible.push(obj);
                    continue;
                }
                
                if (result !== 'OUTSIDE') {
                    visible.push(obj);
                } else {
                    culledCount++;
                }
            }
            
            return {
                visible,
                culledCount,
                totalCount: objects.length,
                cullRatio: (culledCount / objects.length * 100).toFixed(1) + '%'
            };
        },
        
        /**
         * Create view-projection matrix from camera parameters
         */
        createViewProjectionMatrix: function(camera) {
            const { eye, target, up, fov, aspect, near, far } = camera;
            
            // View matrix
            const zAxis = this._normalize(this._sub3(eye, target));
            const xAxis = this._normalize(this._cross3(up, zAxis));
            const yAxis = this._cross3(zAxis, xAxis);
            
            const view = [
                xAxis.x, yAxis.x, zAxis.x, 0,
                xAxis.y, yAxis.y, zAxis.y, 0,
                xAxis.z, yAxis.z, zAxis.z, 0,
                -this._dot3(xAxis, eye), -this._dot3(yAxis, eye), -this._dot3(zAxis, eye), 1
            ];
            
            // Projection matrix
            const f = 1.0 / Math.tan(fov * Math.PI / 360);
            const rangeInv = 1 / (near - far);
            
            const proj = [
                f / aspect, 0, 0, 0,
                0, f, 0, 0,
                0, 0, (near + far) * rangeInv, -1,
                0, 0, near * far * rangeInv * 2, 0
            ];
            
            // Multiply view * projection
            return this._matMul4x4(view, proj);
        },
        
        // Helper functions
        _sub3: function(a, b) { return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }; },
        _cross3: function(a, b) {
            return {
                x: a.y * b.z - a.z * b.y,
                y: a.z * b.x - a.x * b.z,
                z: a.x * b.y - a.y * b.x
            };
        },
        _dot3: function(a, b) { return a.x * b.x + a.y * b.y + a.z * b.z; },
        _normalize: function(v) {
            const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
            return { x: v.x / len, y: v.y / len, z: v.z / len };
        },
        _matMul4x4: function(a, b) {
            const result = new Array(16).fill(0);
            for (let row = 0; row < 4; row++) {
                for (let col = 0; col < 4; col++) {
                    for (let k = 0; k < 4; k++) {
                        result[row * 4 + col] += a[row * 4 + k] * b[k * 4 + col];
                    }
                }
            }
            return result;
        },
        
        // Self-test
        selfTest: function() {
            console.log('[Frustum Culling] Running self-test...');
            
            // Create test camera
            const camera = {
                eye: { x: 0, y: 0, z: 10 },
                target: { x: 0, y: 0, z: 0 },
                up: { x: 0, y: 1, z: 0 },
                fov: 60,
                aspect: 1.6,
                near: 0.1,
                far: 100
            };
            
            const viewProj = this.createViewProjectionMatrix(camera);
            const planes = this.extractFrustumPlanes(viewProj);
            
            // Test points
            const insidePoint = { x: 0, y: 0, z: 0 };
            const outsidePoint = { x: 100, y: 100, z: 100 };
            
            const insideResult = this.isPointInFrustum(insidePoint, planes);
            const outsideResult = this.isPointInFrustum(outsidePoint, planes);
            
            const success = insideResult && !outsideResult;
            
            console.log(`  ✓ Frustum Culling: ${success ? 'PASS' : 'FAIL'} (inside=${insideResult}, outside=${outsideResult})`);
            
            return { passed: success ? 1 : 0, total: 1 };
        }
    }