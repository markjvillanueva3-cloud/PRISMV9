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

          if (x < leftX) {
            arc = arc.prev;
          } else if (x > rightX) {
            arc = arc.next;
          } else {
            return arc;
          }
        }
        return arc;
      };
      const insertArc = (site) => {
        if (!beachlineRoot) {
          beachlineRoot = new Arc(site);
          return beachlineRoot;
        }
        const arcAbove = findArcAbove(site.x, site.y);
        if (!arcAbove) return null;

        // Remove circle event if exists
        if (arcAbove.circleEvent) {
          events.remove(arcAbove.circleEvent);
          arcAbove.circleEvent = null;
        }
        // Split arc
        const newArc = new Arc(site);
        const rightArc = new Arc(arcAbove.site);

        // Create half-edges
        const leftEdge = new HalfEdge(arcAbove.site, site);
        const rightEdge = new HalfEdge(site, arcAbove.site);
        leftEdge.twin = rightEdge;
        rightEdge.twin = leftEdge;
        edges.push(leftEdge, rightEdge);

        // Link arcs
        rightArc.next = arcAbove.next;
        if (arcAbove.next) arcAbove.next.prev = rightArc;

        arcAbove.next = newArc;
        newArc.prev = arcAbove;
        newArc.next = rightArc;
        rightArc.prev = newArc;

        // Assign edges
        newArc.leftHalfEdge = leftEdge;
        newArc.rightHalfEdge = rightEdge;
        arcAbove.rightHalfEdge = leftEdge;
        rightArc.leftHalfEdge = rightEdge;

        // Add to cells
        cells.get(arcAbove.site).halfEdges.push(leftEdge);
        cells.get(site).halfEdges.push(leftEdge, rightEdge);

        return newArc;
      };
      const removeArc = (arc, vertex) => {
        // Update edges
        if (arc.leftHalfEdge) arc.leftHalfEdge.endVertex = vertex;
        if (arc.rightHalfEdge) arc.rightHalfEdge.startVertex = vertex;

        // Create new edge between prev and next
        if (arc.prev && arc.next) {
          const newEdge = new HalfEdge(arc.prev.site, arc.next.site);
          const newTwin = new HalfEdge(arc.next.site, arc.prev.site);
          newEdge.twin = newTwin;
          newTwin.twin = newEdge;
          newEdge.startVertex = vertex;
          edges.push(newEdge, newTwin);

          arc.prev.rightHalfEdge = newEdge;
          arc.next.leftHalfEdge = newTwin;

          cells.get(arc.prev.site).halfEdges.push(newEdge);
          cells.get(arc.next.site).halfEdges.push(newTwin);
        }
        // Remove from linked list
        if (arc.prev) arc.prev.next = arc.next;
        if (arc.next) arc.next.prev = arc.prev;
        if (arc === beachlineRoot) beachlineRoot = arc.next || arc.prev;
      };
      const checkCircleEvent = (arc) => {
        if (!arc || !arc.prev || !arc.next) return;

        const a = arc.prev.site;
        const b = arc.site;
        const c = arc.next.site;

        // Check if points are counterclockwise (valid circle event)
        const cross = (b.x - a.x) * (c.y - a.y) - (c.x - a.x) * (b.y - a.y);
        if (cross >= 0) return; // Clockwise or collinear, no event

        // Compute circumcircle
        const d = 2 * (a.x * (b.y - c.y) + b.x * (c.y - a.y) + c.x * (a.y - b.y));
        if (Math.abs(d) < 1e-10) return;

        const ax2 = a.x * a.x + a.y * a.y;
        const bx2 = b.x * b.x + b.y * b.y;
        const cx2 = c.x * c.x + c.y * c.y;

        const ux = (ax2 * (b.y - c.y) + bx2 * (c.y - a.y) + cx2 * (a.y - b.y)) / d;
        const uy = (ax2 * (c.x - b.x) + bx2 * (a.x - c.x) + cx2 * (b.x - a.x)) / d;
        const r = Math.sqrt((ux - a.x) ** 2 + (uy - a.y) ** 2);

        const eventY = uy + r;

        // Only add if event is below sweep line
        if (eventY >= sweepY - 1e-10) {
          const event = {
            type: 'circle',
            arc,
            center: { x: ux, y: uy },
            x: ux,
            y: eventY,
            priority: eventY,
            valid: true
          };
          arc.circleEvent = event;
          events.insert(event);
        }
      };
      // Process events
      while (!events.isEmpty()) {
        const event = events.extractMin();
        sweepY = event.y;

        if (event.type === 'site') {
          const newArc = insertArc(event.site);
          if (newArc) {
            checkCircleEvent(newArc.prev);
            checkCircleEvent(newArc);
            checkCircleEvent(newArc.next);
          }
        } else if (event.type === 'circle' && event.valid) {
          const arc = event.arc;

          // Invalidate adjacent circle events
          if (arc.prev && arc.prev.circleEvent) {
            arc.prev.circleEvent.valid = false;
            arc.prev.circleEvent = null;
          }
          if (arc.next && arc.next.circleEvent) {
            arc.next.circleEvent.valid = false;
            arc.next.circleEvent = null;
          }
          // Create vertex and remove arc
          const vertex = { x: event.center.x, y: event.center.y };
          vertices.push(vertex);
          removeArc(arc, vertex);