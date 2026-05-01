/**
 * PRISM_KDTREE
 * Extracted from PRISM v8.89.002 monolith
 * References: 9
 * Category: data_structures
 * Lines: 104
 * Session: R2.3.2 Algorithm Extraction
 */

const PRISM_KDTREE_3D = {
    name: 'PRISM KD-Tree 3D',
    version: '1.0.0',
    source: 'MIT 6.837, Bentley 1975',
    
    build: function(points) {
        if (!points || points.length === 0) return null;
        return this._buildRecursive(points.map((p, i) => ({ ...p, index: i })), 0);
    },
    
    _buildRecursive: function(points, depth) {
        if (points.length === 0) return null;
        if (points.length === 1) return { point: points[0], left: null, right: null, axis: depth % 3 };
        const axis = depth % 3, axisKey = ['x', 'y', 'z'][axis];
        points.sort((a, b) => a[axisKey] - b[axisKey]);
        const mid = Math.floor(points.length / 2);
        return { point: points[mid], axis, left: this._buildRecursive(points.slice(0, mid), depth+1), right: this._buildRecursive(points.slice(mid+1), depth+1) };
    },
    
    nearestNeighbor: function(tree, query) {
        if (!tree) return null;
        const best = { point: null, distance: Infinity };
        this._nnSearch(tree, query, best);
        return { point: best.point, distance: Math.sqrt(best.distance), index: best.point?.index };
    },
    
    _nnSearch: function(node, query, best) {
        if (!node) return;
        const dist = this._squaredDistance(query, node.point);
        if (dist < best.distance) { best.distance = dist; best.point = node.point; }
        const axisKey = ['x', 'y', 'z'][node.axis], diff = query[axisKey] - node.point[axisKey];
        this._nnSearch(diff < 0 ? node.left : node.right, query, best);
        if (diff * diff < best.distance) this._nnSearch(diff < 0 ? node.right : node.left, query, best);
    },
    
    kNearestNeighbors: function(tree, query, k) {
        if (!tree || k <= 0) return [];
        const heap = [];
        this._knnSearch(tree, query, k, heap);
        return heap.sort((a, b) => a.distance - b.distance).map(item => ({ point: item.point, distance: Math.sqrt(item.distance), index: item.point?.index }));
    },
    
    _knnSearch: function(node, query, k, heap) {
        if (!node) return;
        const dist = this._squaredDistance(query, node.point);
        if (heap.length < k) {
            heap.push({ point: node.point, distance: dist });
            if (heap.length === k) for (let i = Math.floor(heap.length/2)-1; i >= 0; i--) this._maxHeapify(heap, i);
        } else if (dist < heap[0].distance) { heap[0] = { point: node.point, distance: dist }; this._maxHeapify(heap, 0); }
        const axisKey = ['x', 'y', 'z'][node.axis], diff = query[axisKey] - node.point[axisKey];
        this._knnSearch(diff < 0 ? node.left : node.right, query, k, heap);
        if (diff * diff < (heap.length < k ? Infinity : heap[0].distance)) this._knnSearch(diff < 0 ? node.right : node.left, query, k, heap);
    },
    
    _maxHeapify: function(heap, i) {
        const left = 2*i+1, right = 2*i+2;
        let largest = i;
        if (left < heap.length && heap[left].distance > heap[largest].distance) largest = left;
        if (right < heap.length && heap[right].distance > heap[largest].distance) largest = right;
        if (largest !== i) { [heap[i], heap[largest]] = [heap[largest], heap[i]]; this._maxHeapify(heap, largest); }
    },
    
    radiusSearch: function(tree, center, radius) {
        const results = [], radiusSq = radius * radius;
        this._radiusSearchRecursive(tree, center, radiusSq, results);
        return results.map(item => ({ point: item.point, distance: Math.sqrt(item.distance), index: item.point?.index }));
    },
    
    _radiusSearchRecursive: function(node, center, radiusSq, results) {
        if (!node) return;
        const dist = this._squaredDistance(center, node.point);
        if (dist <= radiusSq) results.push({ point: node.point, distance: dist });
        const axisKey = ['x', 'y', 'z'][node.axis], diff = center[axisKey] - node.point[axisKey];
        this._radiusSearchRecursive(diff < 0 ? node.left : node.right, center, radiusSq, results);
        if (diff * diff <= radiusSq) this._radiusSearchRecursive(diff < 0 ? node.right : node.left, center, radiusSq, results);
    },
    
    rangeQuery: function(tree, minBound, maxBound) {
        const results = [];
        this._rangeQueryRecursive(tree, minBound, maxBound, results);
        return results;
    },
    
    _rangeQueryRecursive: function(node, minBound, maxBound, results) {
        if (!node) return;
        const p = node.point;
        if (p.x >= minBound.x && p.x <= maxBound.x && p.y >= minBound.y && p.y <= maxBound.y && p.z >= minBound.z && p.z <= maxBound.z) results.push(p);
        const axisKey = ['x', 'y', 'z'][node.axis];
        if (minBound[axisKey] <= node.point[axisKey]) this._rangeQueryRecursive(node.left, minBound, maxBound, results);
        if (maxBound[axisKey] >= node.point[axisKey]) this._rangeQueryRecursive(node.right, minBound, maxBound, results);
    },
    
    _squaredDistance: (a, b) => (a.x-b.x)**2 + (a.y-b.y)**2 + (a.z-b.z)**2,
    
    register: function() {
        if (typeof PRISM_GATEWAY !== 'undefined') {
            PRISM_GATEWAY.register('kdtree.build', 'PRISM_KDTREE_3D.build');
            PRISM_GATEWAY.register('kdtree.nearest', 'PRISM_KDTREE_3D.nearestNeighbor');
            PRISM_GATEWAY.register('kdtree.knearest', 'PRISM_KDTREE_3D.kNearestNeighbors');
            PRISM_GATEWAY.register('kdtree.radius', 'PRISM_KDTREE_3D.radiusSearch');
            PRISM_GATEWAY.register('kdtree.range', 'PRISM_KDTREE_3D.rangeQuery');
        }
    }
}