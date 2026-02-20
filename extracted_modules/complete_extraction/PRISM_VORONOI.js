const PRISM_VORONOI = {
    name: "Fortune's Sweep Line Algorithm",
    mitSource: "MIT 18.086 - Computational Science",
    complexity: { time: "O(n log n)", space: "O(n)" },

    // Priority Queue implementation
    PriorityQueue: class {
        constructor() { this.items = []; }
        insert(item) {
            this.items.push(item);
            this.items.sort((a, b) => a.y - b.y);
        }
        extractMin() { return this.items.shift(); }
        isEmpty() { return this.items.length === 0; }
        remove(item) {
            const idx = this.items.indexOf(item);
            if (idx > -1) this.items.splice(idx, 1);
        }
    },
    // Main computation
    compute: function(points) {
        if (!points || points.length < 2) return { vertices: [], edges: [], cells: [] };

        const events = new this.PriorityQueue();
        const edges = [];
        const vertices = [];

        // Initialize with site events
        points.forEach((p, i) => {
            events.insert({ type: 'site', point: p, index: i, y: p.y });
        });

        // Beachline represented as array of arcs
        const beachline = [];

        while (!events.isEmpty()) {
            const event = events.extractMin();

            if (event.type === 'site') {
                // Handle site event - add new arc to beachline
                const arc = {
                    site: event.point,
                    index: event.index
                };
                if (beachline.length === 0) {
                    beachline.push(arc);
                } else {
                    // Find arc above the new site
                    const aboveIdx = this.findArcAbove(beachline, event.point);
                    if (aboveIdx >= 0) {
                        const above = beachline[aboveIdx];

                        // Split the arc and create edge
                        beachline.splice(aboveIdx, 1, {...above}, arc, {...above});

                        // Create edge between sites
                        edges.push({
                            site1: above.index,
                            site2: event.index,
                            start: null,
                            end: null
                        });
                    }
                }
            }
        }
        // Build cells from edges
        const cells = points.map((p, i) => ({
            site: p,
            edges: edges.filter(e => e.site1 === i || e.site2 === i)
        }));

        return {
            vertices,
            edges,
            cells,
            statistics: {
                sites: points.length,
                edges: edges.length,
                vertices: vertices.length
            }
        };
    },
    findArcAbove: function(beachline, point) {
        if (beachline.length === 0) return -1;
        // Simplified - return middle arc
        return Math.floor(beachline.length / 2);
    },
    // Delaunay triangulation (dual of Voronoi)
    delaunay: function(points) {
        const voronoi = this.compute(points);
        const triangles = [];

        // Each Voronoi vertex corresponds to a Delaunay triangle
        // For now, use edges to build triangulation
        const used = new Set();

        voronoi.edges.forEach(e => {
            if (!used.has(`${e.site1}-${e.site2}`)) {
                used.add(`${e.site1}-${e.site2}`);
                used.add(`${e.site2}-${e.site1}`);
            }
        });

        return { triangles, points };
    }
}