import { describe, it, expect } from "vitest";
import {
  HeterophilyAwareAggregator as H2,
  type HeterophilyAggInput,
} from "./HeterophilyAwareAggregator.js";

// Path graph 0-1-2-3, d=2 features. Exactly-k-hop blocks are hand-verifiable.
const PATH4: HeterophilyAggInput = {
  features: [
    [1, 0], // n0
    [0, 1], // n1
    [2, 2], // n2
    [10, 10], // n3
  ],
  edges: [
    [0, 1],
    [1, 2],
    [2, 3],
  ],
  maxHops: 2,
  normalize: "mean",
};

describe("HeterophilyAwareAggregator — reference values (path graph 0-1-2-3)", () => {
  const out = H2.calculate(PATH4);

  it("has correct dimensions", () => {
    expect(out.egoDim).toBe(2);
    expect(out.maxHops).toBe(2);
    expect(out.embeddingDim).toBe(6); // d*(1+maxHops) = 2*3
    expect(out.embeddings).toHaveLength(4);
    expect(out.embeddings.every((z) => z.length === 6)).toBe(true);
  });

  it("node 0 = [ego ‖ hop1(={1}) ‖ hop2(={2})]", () => {
    // ego [1,0] | mean{n1=[0,1]} | mean{n2=[2,2]}
    expect(out.embeddings[0]).toEqual([1, 0, 0, 1, 2, 2]);
  });

  it("node 1 = [ego ‖ hop1(={0,2}) ‖ hop2(={3})]", () => {
    // ego [0,1] | mean{[1,0],[2,2]}=[1.5,1] | mean{[10,10]}
    expect(out.embeddings[1]).toEqual([0, 1, 1.5, 1, 10, 10]);
  });

  it("node 2 = [ego ‖ hop1(={1,3}) ‖ hop2(={0})]", () => {
    // ego [2,2] | mean{[0,1],[10,10]}=[5,5.5] | mean{[1,0]}
    expect(out.embeddings[2]).toEqual([2, 2, 5, 5.5, 1, 0]);
  });

  it("node 3 = [ego ‖ hop1(={2}) ‖ hop2(={1})]", () => {
    expect(out.embeddings[3]).toEqual([10, 10, 2, 2, 0, 1]);
  });

  it("reports per-hop neighbour counts + no isolated nodes", () => {
    expect(out.hopNeighborCounts).toEqual([
      [1, 1],
      [2, 1],
      [2, 1],
      [1, 1],
    ]);
    expect(out.isolatedNodes).toEqual([]);
  });
});

describe("HeterophilyAwareAggregator — core H2GCN properties", () => {
  it("ego block is the node's OWN features, NEVER blended (separation invariant)", () => {
    const out = H2.calculate(PATH4);
    for (let i = 0; i < PATH4.features.length; i++) {
      expect(out.embeddings[i].slice(0, out.egoDim)).toEqual(PATH4.features[i]);
    }
  });

  it('normalize:"sum" sums neighbour features instead of averaging', () => {
    const out = H2.calculate({ ...PATH4, normalize: "sum" });
    // node1 hop1 {n0=[1,0], n2=[2,2]} → sum=[3,2] (vs mean [1.5,1])
    expect(out.embeddings[1].slice(2, 4)).toEqual([3, 2]);
    expect(out.normalize).toBe("sum");
  });

  it("maxHops:1 yields ego + 1-hop only (width 2d)", () => {
    const out = H2.calculate({ ...PATH4, maxHops: 1 });
    expect(out.embeddingDim).toBe(4);
    expect(out.embeddings[0]).toEqual([1, 0, 0, 1]); // no hop2 block
  });

  it("maxHops:3 reaches the 3-hop neighbour on the path", () => {
    const out = H2.calculate({ ...PATH4, maxHops: 3 });
    expect(out.embeddingDim).toBe(8);
    // node0: ego | hop1{1} | hop2{2} | hop3{3}
    expect(out.embeddings[0]).toEqual([1, 0, 0, 1, 2, 2, 10, 10]);
  });

  it("defaults maxHops=2 and normalize=mean when omitted", () => {
    const out = H2.calculate({ features: PATH4.features, edges: PATH4.edges });
    expect(out.maxHops).toBe(2);
    expect(out.normalize).toBe("mean");
  });
});

describe("HeterophilyAwareAggregator — boundary + robustness", () => {
  it("single node, no edges → ego only + isolated + zero neighbourhood blocks", () => {
    const out = H2.calculate({ features: [[5, 7]], edges: [], maxHops: 2 });
    expect(out.embeddings[0]).toEqual([5, 7, 0, 0, 0, 0]);
    expect(out.isolatedNodes).toEqual([0]);
    expect(out.hopNeighborCounts).toEqual([[0, 0]]);
    expect(out.warnings.join(" ")).toMatch(/no 1-hop neighbour/i);
  });

  it("disconnected node inside a graph is flagged isolated, others unaffected", () => {
    const out = H2.calculate({
      features: [[1, 1], [2, 2], [9, 9]],
      edges: [[0, 1]],
      maxHops: 2,
    });
    expect(out.isolatedNodes).toEqual([2]);
    expect(out.embeddings[2]).toEqual([9, 9, 0, 0, 0, 0]);
  });

  it("self-loop edges are dropped with a warning, aggregation unaffected", () => {
    const out = H2.calculate({ features: [[1, 0], [0, 1]], edges: [[0, 0], [0, 1]], maxHops: 1 });
    expect(out.warnings.join(" ")).toMatch(/self-loop/i);
    expect(out.embeddings[0]).toEqual([1, 0, 0, 1]); // hop1 = {1} only
  });

  it("duplicate undirected edges are deduplicated with a warning", () => {
    const out = H2.calculate({ features: [[1, 0], [0, 1]], edges: [[0, 1], [1, 0], [0, 1]], maxHops: 1 });
    expect(out.warnings.join(" ")).toMatch(/duplicate/i);
    expect(out.hopNeighborCounts[0]).toEqual([1]); // n1 counted once, not 3×
  });
});

describe("HeterophilyAwareAggregator — failure modes (validate + throw)", () => {
  it("rejects ragged feature matrix", () => {
    const bad = { features: [[1, 2], [3]], edges: [] } as HeterophilyAggInput;
    expect(H2.validate(bad).valid).toBe(false);
    expect(() => H2.calculate(bad)).toThrow(/ragged|invalid/i);
  });

  it("rejects edge index out of range", () => {
    const bad: HeterophilyAggInput = { features: [[1, 2]], edges: [[0, 5]] };
    expect(H2.validate(bad).valid).toBe(false);
    expect(() => H2.calculate(bad)).toThrow(/range|invalid/i);
  });

  it("rejects maxHops < 1", () => {
    expect(H2.validate({ features: [[1]], edges: [], maxHops: 0 }).valid).toBe(false);
  });

  it("rejects empty features", () => {
    expect(H2.validate({ features: [], edges: [] }).valid).toBe(false);
  });
});

describe("HeterophilyAwareAggregator — adversarial inputs", () => {
  it("rejects NaN feature values", () => {
    expect(H2.validate({ features: [[NaN, 1]], edges: [] }).valid).toBe(false);
  });

  it("rejects Infinity feature values", () => {
    expect(H2.validate({ features: [[Infinity, 0], [1, 1]], edges: [[0, 1]] }).valid).toBe(false);
  });

  it("rejects non-integer / malformed edges", () => {
    const bad = { features: [[1], [2]], edges: [[0, 1.5]] } as unknown as HeterophilyAggInput;
    expect(H2.validate(bad).valid).toBe(false);
  });

  it("warns (does not crash) on very large maxHops", () => {
    const res = H2.validate({ features: [[1], [2]], edges: [[0, 1]], maxHops: 99 });
    expect(res.valid).toBe(true); // warning, not error
    expect((res.warnings ?? []).join(" ")).toMatch(/maxHops/i);
  });
});

describe("HeterophilyAwareAggregator — metadata", () => {
  it("exposes ml-domain metadata with H2GCN reference", () => {
    const m = H2.getMetadata();
    expect(m.id).toBe("heterophily_aware_aggregator");
    expect(m.domain).toBe("ml");
    expect(m.reference).toMatch(/Beyond Homophily/i);
  });
});
