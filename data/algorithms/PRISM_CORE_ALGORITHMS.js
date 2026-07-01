/**
 * PRISM_CORE_ALGORITHMS
 * Extracted from PRISM v8.89.002 monolith
 * References: 28
 * Category: general
 * Lines: 608
 * Session: R2.3.3 Algorithm Gap Extraction
 */

const PRISM_CORE_ALGORITHMS = {
  version: '1.0.0',
  layer: 3,
  created: '2026-01-14',
  mitSources: ['18.086', '6.251J', '18.06', '6.006'],

  // SECTION 1: DATA STRUCTURES (MIT 6.006)

  dataStructures: {

    // Priority Queue using Binary Heap - O(log n) operations
    PriorityQueue: class {
      constructor(compareFn = (a, b) => a.priority - b.priority) {
        this.heap = [];
        this.compare = compareFn;
      }
      get size() { return this.heap.length; }
      isEmpty() { return this.heap.length === 0; }

      insert(item) {
        this.heap.push(item);
        this._bubbleUp(this.heap.length - 1);
      }
      extractMin() {
        if (this.isEmpty()) return null;
        const min = this.heap[0];
        const last = this.heap.pop();
        if (!this.isEmpty()) {
          this.heap[0] = last;
          this._bubbleDown(0);
        }
        return min;
      }
      peek() { return this.heap[0] || null; }

      remove(item) {
        const idx = this.heap.indexOf(item);
        if (idx === -1) return false;
        const last = this.heap.pop();
        if (idx < this.heap.length) {
          this.heap[idx] = last;
          this._bubbleUp(idx);
          this._bubbleDown(idx);
        }
        return true;
      }
      _bubbleUp(idx) {
        while (idx > 0) {
          const parent = Math.floor((idx - 1) / 2);
          if (this.compare(this.heap[idx], this.heap[parent]) >= 0) break;
          [this.heap[idx], this.heap[parent]] = [this.heap[parent], this.heap[idx]];
          idx = parent;
        }
      }
      _bubbleDown(idx) {
        const n = this.heap.length;
        while (true) {
          const left = 2 * idx + 1;
          const right = 2 * idx + 2;
          let smallest = idx;

          if (left < n && this.compare(this.heap[left], this.heap[smallest]) < 0) smallest = left;
          if (right < n && this.compare(this.heap[right], this.heap[smallest]) < 0) smallest = right;

          if (smallest === idx) break;
          [this.heap[idx], this.heap[smallest]] = [this.heap[smallest], this.heap[idx]];
          idx = smallest;
        }
      }
    },
    // Red-Black Tree for Beachline - O(log n) operations
    RedBlackTree: class {
      constructor(compareFn) {
        this.root = null;
        this.compare = compareFn;
        this.RED = true;
        this.BLACK = false;
      }
      _createNode(data) {
        return { data, left: null, right: null, parent: null, color: this.RED };
      }
      _isRed(node) { return node !== null && node.color === this.RED; }

      _rotateLeft(node) {
        const x = node.right;
        node.right = x.left;
        if (x.left) x.left.parent = node;
        x.parent = node.parent;
        if (!node.parent) this.root = x;
        else if (node === node.parent.left) node.parent.left = x;
        else node.parent.right = x;
        x.left = node;
        node.parent = x;
        return x;
      }
      _rotateRight(node) {
        const x = node.left;
        node.left = x.right;
        if (x.right) x.right.parent = node;
        x.parent = node.parent;
        if (!node.parent) this.root = x;
        else if (node === node.parent.right) node.parent.right = x;
        else node.parent.left = x;
        x.right = node;
        node.parent = x;
        return x;
      }
      insert(data) {
        const node = this._createNode(data);
        if (!this.root) {
          this.root = node;
          this.root.color = this.BLACK;
          return node;
        }
        let current = this.root;
        let parent = null;
        while (current) {
          parent = current;
          if (this.compare(data, current.data) < 0) current = current.left;
          else current = current.right;
        }
        node.parent = parent;
        if (this.compare(data, parent.data) < 0) parent.left = node;
        else parent.right = node;

        this._fixInsert(node);
        return node;
      }
      _fixInsert(node) {
        while (node !== this.root && this._isRed(node.parent)) {
          if (node.parent === node.parent.parent?.left) {
            const uncle = node.parent.parent.right;
            if (this._isRed(uncle)) {
              node.parent.color = this.BLACK;
              uncle.color = this.BLACK;
              node.parent.parent.color = this.RED;
              node = node.parent.parent;
            } else {
              if (node === node.parent.right) {
                node = node.parent;
                this._rotateLeft(node);
              }
              node.parent.color = this.BLACK;
              node.parent.parent.color = this.RED;
              this._rotateRight(node.parent.parent);
            }
          } else {
            const uncle = node.parent.parent?.left;
            if (this._isRed(uncle)) {
              node.parent.color = this.BLACK;
              uncle.color = this.BLACK;
              node.parent.parent.color = this.RED;
              node = node.parent.parent;
            } else {
              if (node === node.parent.left) {
                node = node.parent;
                this._rotateRight(node);
              }
              node.parent.color = this.BLACK;
              node.parent.parent.color = this.RED;
              this._rotateLeft(node.parent.parent);
            }
          }
        }
        this.root.color = this.BLACK;
      }
      find(data) {
        let current = this.root;
        while (current) {
          const cmp = this.compare(data, current.data);
          if (cmp === 0) return current;
          current = cmp < 0 ? current.left : current.right;
        }
        return null;
      }
      findNearest(data) {
        let current = this.root;
        let nearest = null;
        let minDist = Infinity;

        while (current) {
          const dist = Math.abs(this.compare(data, current.data));
          if (dist < minDist) {
            minDist = dist;
            nearest = current;
          }
          if (this.compare(data, current.data) < 0) current = current.left;
          else current = current.right;
        }
        return nearest;
      }
      inorder(callback) {
        const traverse = (node) => {
          if (!node) return;
          traverse(node.left);
          callback(node.data);
          traverse(node.right);
        };
        traverse(this.root);
      }
    }
  },
  // SECTION 2: VORONOI DIAGRAM - FORTUNE'S ALGORITHM (MIT 18.086)
  // Full production implementation with beachline and event handling

  voronoi: {
    name: "Fortune's Sweep Line Algorithm",
    source: "MIT 18.086 - Computational Science & Engineering",
    complexity: { time: "O(n log n)", space: "O(n)" },

    // Arc class for beachline
    Arc: class {
      constructor(site) {
        this.site = site;
        this.prev = null;
        this.next = null;
        this.leftHalfEdge = null;
        this.rightHalfEdge = null;
        this.circleEvent = null;
      }
    },
    // Half-edge for DCEL structure
    HalfEdge: class {
      constructor(leftSite, rightSite) {
        this.leftSite = leftSite;
        this.rightSite = rightSite;
        this.startVertex = null;
        this.endVertex = null;
        this.twin = null;
      }
    },
    // Main computation function
    compute: function(sites, bounds = { minX: 0, maxX: 1000, minY: 0, maxY: 1000 }) {
      if (!sites || sites.length === 0) return { vertices: [], edges: [], cells: [] };
      if (sites.length === 1) return { vertices: [], edges: [], cells: [{ site: sites[0], halfEdges: [] }] };

      const PQ = PRISM_CORE_ALGORITHMS.dataStructures.PriorityQueue;
      const Arc = this.Arc;
      const HalfEdge = this.HalfEdge;

      // State
      const events = new PQ((a, b) => {
        if (Math.abs(a.y - b.y) < 1e-10) return a.x - b.x;
        return a.y - b.y;
      });
      let beachlineRoot = null;
      const vertices = [];
      const edges = [];
      const cells = new Map();
      let sweepY = -Infinity;

      // Initialize cells and site events
      for (const site of sites) {
        cells.set(site, { site, halfEdges: [] });
        events.insert({ type: 'site', site, x: site.x, y: site.y, priority: site.y });
      }
      // Beachline operations
      const getParabolaX = (site, directrix, x) => {
        // y = ((x - sx)^2 + sy^2 - d^2) / (2 * (sy - d))
        const d = directrix;
        const sx = site.x, sy = site.y;
        if (Math.abs(sy - d) < 1e-10) return site.x;
        return ((x - sx) * (x - sx) + sy * sy - d * d) / (2 * (sy - d));
      };
      const getBreakpoint = (leftSite, rightSite, directrix) => {
        // Intersection of two parabolas
        const d = directrix;
        const s1 = leftSite, s2 = rightSite;

        if (Math.abs(s1.y - s2.y) < 1e-10) {
          return (s1.x + s2.x) / 2;
        }
        if (Math.abs(s1.y - d) < 1e-10) return s1.x;
        if (Math.abs(s2.y - d) < 1e-10) return s2.x;

        // Quadratic formula for parabola intersection
        const a1 = 1 / (2 * (s1.y - d));
        const b1 = -s1.x / (s1.y - d);
        const c1 = (s1.x * s1.x + s1.y * s1.y - d * d) / (2 * (s1.y - d));

        const a2 = 1 / (2 * (s2.y - d));
        const b2 = -s2.x / (s2.y - d);
        const c2 = (s2.x * s2.x + s2.y * s2.y - d * d) / (2 * (s2.y - d));

        const a = a1 - a2;
        const b = b1 - b2;
        const c = c1 - c2;

        if (Math.abs(a) < 1e-10) {
          return -c / b;
        }
        const disc = b * b - 4 * a * c;
        const x1 = (-b + Math.sqrt(Math.max(0, disc))) / (2 * a);
        const x2 = (-b - Math.sqrt(Math.max(0, disc))) / (2 * a);

        // Return the correct root based on site positions
        return s1.y < s2.y ? Math.max(x1, x2) : Math.min(x1, x2);
      };
      const findArcAbove = (x, directrix) => {
        let arc = beachlineRoot;
        while (arc) {
          const leftX = arc.prev ? getBreakpoint(arc.prev.site, arc.site, directrix) : -Infinity;
          const rightX = arc.next ? getBreakpoint(arc.site, arc.next.site, directrix) : Infinity;

          if (x >= leftX && x <= rightX) return arc;

          arc = x < leftX ? arc.prev : arc.next;
        }
        return beachlineRoot;
      };

      // Event processing
      while (!events.isEmpty()) {
        const event = events.extractMin();
        sweepY = event.y;

        if (event.type === 'site') {
          // Site event processing
          const newSite = event.site;
          
          if (!beachlineRoot) {
            beachlineRoot = new Arc(newSite);
            continue;
          }

          const arcAbove = findArcAbove(newSite.x, sweepY);
          
          // Remove circle event if exists
          if (arcAbove.circleEvent) {
            events.remove(arcAbove.circleEvent);
            arcAbove.circleEvent = null;
          }

          // Split the arc
          const newArc = new Arc(newSite);
          const rightArc = new Arc(arcAbove.site);

          // Link arcs
          newArc.prev = arcAbove;
          newArc.next = rightArc;
          rightArc.prev = newArc;
          rightArc.next = arcAbove.next;

          if (arcAbove.next) arcAbove.next.prev = rightArc;
          arcAbove.next = newArc;

          // Create half-edges
          const leftEdge = new HalfEdge(arcAbove.site, newSite);
          const rightEdge = new HalfEdge(newSite, arcAbove.site);
          leftEdge.twin = rightEdge;
          rightEdge.twin = leftEdge;

          arcAbove.rightHalfEdge = leftEdge;
          newArc.leftHalfEdge = leftEdge;
          newArc.rightHalfEdge = rightEdge;
          rightArc.leftHalfEdge = rightEdge;

          edges.push(leftEdge);

          // Check for circle events
          const checkCircleEvent = (a, b, c) => {
            if (!a || !b || !c || a.site === c.site) return;
            
            // Calculate circumcenter
            const s1 = a.site, s2 = b.site, s3 = c.site;
            
            const d = 2 * (s1.x * (s2.y - s3.y) + s2.x * (s3.y - s1.y) + s3.x * (s1.y - s2.y));
            if (Math.abs(d) < 1e-10) return;

            const cx = ((s1.x * s1.x + s1.y * s1.y) * (s2.y - s3.y) +
                       (s2.x * s2.x + s2.y * s2.y) * (s3.y - s1.y) +
                       (s3.x * s3.x + s3.y * s3.y) * (s1.y - s2.y)) / d;
            const cy = ((s1.x * s1.x + s1.y * s1.y) * (s3.x - s2.x) +
                       (s2.x * s2.x + s2.y * s2.y) * (s1.x - s3.x) +
                       (s3.x * s3.x + s3.y * s3.y) * (s2.x - s1.x)) / d;

            const r = Math.sqrt((cx - s1.x) * (cx - s1.x) + (cy - s1.y) * (cy - s1.y));
            const eventY = cy - r;

            if (eventY <= sweepY + 1e-10) return;

            const circleEvent = {
              type: 'circle',
              arc: b,
              x: cx,
              y: eventY,
              priority: eventY,
              vertex: { x: cx, y: cy }
            };

            b.circleEvent = circleEvent;
            events.insert(circleEvent);
          };

          checkCircleEvent(arcAbove.prev, arcAbove, newArc);
          checkCircleEvent(newArc, rightArc, rightArc.next);

        } else if (event.type === 'circle') {
          // Circle event processing
          const arc = event.arc;
          if (!arc.circleEvent || arc.circleEvent !== event) continue;

          const vertex = event.vertex;
          vertices.push(vertex);

          // Remove the arc and close edges
          const leftArc = arc.prev;
          const rightArc = arc.next;

          if (leftArc) leftArc.next = rightArc;
          if (rightArc) rightArc.prev = leftArc;

          // Complete half-edges
          if (arc.leftHalfEdge) {
            arc.leftHalfEdge.endVertex = vertex;
            cells.get(arc.leftHalfEdge.leftSite).halfEdges.push(arc.leftHalfEdge);
            cells.get(arc.leftHalfEdge.rightSite).halfEdges.push(arc.leftHalfEdge);
          }
          if (arc.rightHalfEdge) {
            arc.rightHalfEdge.endVertex = vertex;
            cells.get(arc.rightHalfEdge.leftSite).halfEdges.push(arc.rightHalfEdge);
            cells.get(arc.rightHalfEdge.rightSite).halfEdges.push(arc.rightHalfEdge);
          }

          // Create new edge
          if (leftArc && rightArc) {
            const newEdge = new HalfEdge(leftArc.site, rightArc.site);
            const twinEdge = new HalfEdge(rightArc.site, leftArc.site);
            newEdge.twin = twinEdge;
            twinEdge.twin = newEdge;
            newEdge.startVertex = vertex;
            twinEdge.endVertex = vertex;

            leftArc.rightHalfEdge = newEdge;
            rightArc.leftHalfEdge = newEdge;
            
            edges.push(newEdge);
          }

          // Remove circle events for neighboring arcs
          if (leftArc && leftArc.circleEvent) {
            events.remove(leftArc.circleEvent);
            leftArc.circleEvent = null;
          }
          if (rightArc && rightArc.circleEvent) {
            events.remove(rightArc.circleEvent);
            rightArc.circleEvent = null;
          }

          // Check for new circle events
          if (leftArc && rightArc) {
            const checkCircleEvent = (a, b, c) => {
              if (!a || !b || !c || a.site === c.site) return;
              
              const s1 = a.site, s2 = b.site, s3 = c.site;
              
              const d = 2 * (s1.x * (s2.y - s3.y) + s2.x * (s3.y - s1.y) + s3.x * (s1.y - s2.y));
              if (Math.abs(d) < 1e-10) return;

              const cx = ((s1.x * s1.x + s1.y * s1.y) * (s2.y - s3.y) +
                         (s2.x * s2.x + s2.y * s2.y) * (s3.y - s1.y) +
                         (s3.x * s3.x + s3.y * s3.y) * (s1.y - s2.y)) / d;
              const cy = ((s1.x * s1.x + s1.y * s1.y) * (s3.x - s2.x) +
                         (s2.x * s2.x + s2.y * s2.y) * (s1.x - s3.x) +
                         (s3.x * s3.x + s3.y * s3.y) * (s2.x - s1.x)) / d;

              const r = Math.sqrt((cx - s1.x) * (cx - s1.x) + (cy - s1.y) * (cy - s1.y));
              const eventY = cy - r;

              if (eventY <= sweepY + 1e-10) return;

              const circleEvent = {
                type: 'circle',
                arc: b,
                x: cx,
                y: eventY,
                priority: eventY,
                vertex: { x: cx, y: cy }
              };

              b.circleEvent = circleEvent;
              events.insert(circleEvent);
            };

            checkCircleEvent(leftArc.prev, leftArc, rightArc);
            checkCircleEvent(leftArc, rightArc, rightArc.next);
          }
        }
      }

      // Clip edges to bounds and finalize
      const clippedEdges = [];
      for (const edge of edges) {
        if (!edge.startVertex || !edge.endVertex) {
          // Complete infinite edges
          if (!edge.startVertex) {
            // Calculate intersection with bounds
            const dx = edge.rightSite.x - edge.leftSite.x;
            const dy = edge.rightSite.y - edge.leftSite.y;
            const mx = (edge.leftSite.x + edge.rightSite.x) / 2;
            const my = (edge.leftSite.y + edge.rightSite.y) / 2;
            
            // Perpendicular direction
            const px = -dy;
            const py = dx;
            const len = Math.sqrt(px * px + py * py);
            if (len > 0) {
              const scale = 1000 / len;
              edge.startVertex = { x: mx - px * scale, y: my - py * scale };
            }
          }
          if (!edge.endVertex) {
            const dx = edge.rightSite.x - edge.leftSite.x;
            const dy = edge.rightSite.y - edge.leftSite.y;
            const mx = (edge.leftSite.x + edge.rightSite.x) / 2;
            const my = (edge.leftSite.y + edge.rightSite.y) / 2;
            
            const px = -dy;
            const py = dx;
            const len = Math.sqrt(px * px + py * py);
            if (len > 0) {
              const scale = 1000 / len;
              edge.endVertex = { x: mx + px * scale, y: my + py * scale };
            }
          }
        }

        // Clip to bounds
        if (edge.startVertex && edge.endVertex) {
          const clipped = this.clipEdge(edge, bounds);
          if (clipped) clippedEdges.push(clipped);
        }
      }

      return {
        vertices,
        edges: clippedEdges,
        cells: Array.from(cells.values())
      };
    },

    clipEdge: function(edge, bounds) {
      const { minX, maxX, minY, maxY } = bounds;
      let { startVertex: p1, endVertex: p2 } = edge;
      
      // Cohen-Sutherland line clipping
      const computeCode = (x, y) => {
        let code = 0;
        if (x < minX) code |= 1;      // left
        if (x > maxX) code |= 2;      // right  
        if (y < minY) code |= 4;      // bottom
        if (y > maxY) code |= 8;      // top
        return code;
      };

      let x1 = p1.x, y1 = p1.y;
      let x2 = p2.x, y2 = p2.y;
      let code1 = computeCode(x1, y1);
      let code2 = computeCode(x2, y2);

      while (true) {
        if (!(code1 | code2)) {
          // Both endpoints inside
          return {
            startVertex: { x: x1, y: y1 },
            endVertex: { x: x2, y: y2 },
            leftSite: edge.leftSite,
            rightSite: edge.rightSite
          };
        }
        if (code1 & code2) {
          // Both endpoints outside same region
          return null;
        }

        // Pick an endpoint outside the rectangle
        const codeOut = code1 !== 0 ? code1 : code2;
        let x, y;

        // Find intersection point
        if (codeOut & 8) {          // point is above
          x = x1 + (x2 - x1) * (maxY - y1) / (y2 - y1);
          y = maxY;
        } else if (codeOut & 4) {   // point is below  
          x = x1 + (x2 - x1) * (minY - y1) / (y2 - y1);
          y = minY;
        } else if (codeOut & 2) {   // point is to the right
          y = y1 + (y2 - y1) * (maxX - x1) / (x2 - x1);
          x = maxX;
        } else if (codeOut & 1) {   // point is to the left
          y = y1 + (y2 - y1) * (minX - x1) / (x2 - x1);
          x = minX;
        }

        // Replace point outside rectangle with intersection point
        if (codeOut === code1) {
          x1 = x;
          y1 = y;
          code1 = computeCode(x1, y1);
        } else {
          x2 = x;
          y2 = y;
          code2 = computeCode(x2, y2);
        }
      }
    }
  }
}