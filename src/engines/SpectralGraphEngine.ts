/**
 * SpectralGraphEngine — Reverse-engineered from PRISM v8.89 monolith
 *
 * Spectral graph theory for CAD mesh analysis:
 * - Face adjacency graph construction
 * - Graph Laplacian computation
 * - Power iteration for eigenvectors
 * - Fiedler vector spectral partitioning
 * - Mesh complexity analysis
 *
 * Manufacturing applications: feature recognition, mesh segmentation
 * for adaptive toolpath generation, part complexity estimation.
 *
 * Source: PRISM_SPECTRAL_GRAPH_CAD (monolith R2.3.2)
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SpectralPartitionResult {
  partition: number[];
  clusters: number[][];
  fiedlerVector: number[];
  algebraicConnectivity: number;
}

export interface MeshAnalysisResult {
  regions: number;
  complexity: "simple" | "moderate" | "complex";
  algebraicConnectivity: number;
  fiedlerVector: number[];
}

export interface EigenResult {
  eigenvector: number[];
  eigenvalue: number;
}

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

class SpectralGraphEngineImpl {

  /**
   * Build face adjacency matrix from triangle mesh faces.
   * Two faces are adjacent if they share an edge.
   */
  buildFaceGraph(faces: number[][]): number[][] {
    const n = faces.length;
    const adjacency: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));

    const edgeToFaces = new Map<string, number[]>();

    for (let i = 0; i < faces.length; i++) {
      const faceEdges = this._getFaceEdges(faces[i]);
      for (const edge of faceEdges) {
        const key = edge.join(",");
        if (!edgeToFaces.has(key)) edgeToFaces.set(key, []);
        edgeToFaces.get(key)!.push(i);
      }
    }

    for (const [, faceList] of edgeToFaces) {
      for (let i = 0; i < faceList.length; i++) {
        for (let j = i + 1; j < faceList.length; j++) {
          adjacency[faceList[i]][faceList[j]] = 1;
          adjacency[faceList[j]][faceList[i]] = 1;
        }
      }
    }

    return adjacency;
  }

  /**
   * Compute graph Laplacian: L = D - A.
   * D is degree matrix, A is adjacency matrix.
   */
  computeLaplacian(adjacency: number[][]): number[][] {
    const n = adjacency.length;
    const laplacian: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));

    for (let i = 0; i < n; i++) {
      let degree = 0;
      for (let j = 0; j < n; j++) {
        if (adjacency[i][j] > 0) {
          laplacian[i][j] = -adjacency[i][j];
          degree += adjacency[i][j];
        }
      }
      laplacian[i][i] = degree;
    }

    return laplacian;
  }

  /**
   * Power iteration for dominant eigenvector.
   */
  powerIteration(matrix: number[][], maxIter: number = 100): EigenResult {
    const n = matrix.length;
    if (n === 0) return { eigenvector: [], eigenvalue: 0 };

    let v = new Array(n).fill(1 / Math.sqrt(n));

    for (let iter = 0; iter < maxIter; iter++) {
      const Av = new Array(n).fill(0);
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          Av[i] += matrix[i][j] * v[j];
        }
      }

      let norm = 0;
      for (let i = 0; i < n; i++) norm += Av[i] * Av[i];
      norm = Math.sqrt(norm);

      if (norm < 1e-15) break;
      for (let i = 0; i < n; i++) v[i] = Av[i] / norm;
    }

    // Rayleigh quotient for eigenvalue
    let eigenvalue = 0;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        eigenvalue += v[i] * matrix[i][j] * v[j];
      }
    }

    return { eigenvector: v, eigenvalue };
  }

  /**
   * Spectral partitioning using the Fiedler vector (2nd smallest eigenvector of Laplacian).
   * Partitions mesh faces into 2 groups by sign of Fiedler vector.
   */
  spectralPartition(faces: number[][]): SpectralPartitionResult {
    if (faces.length < 2) {
      return { partition: [0], clusters: [[0]], fiedlerVector: [0], algebraicConnectivity: 0 };
    }

    const adjacency = this.buildFaceGraph(faces);
    const laplacian = this.computeLaplacian(adjacency);
    const n = laplacian.length;

    // Estimate largest eigenvalue
    const { eigenvalue: lambdaMax } = this.powerIteration(laplacian, 50);

    // Shift matrix: lambdaMax*I - L → largest eigenvector of shifted = smallest of L
    const shifted: number[][] = laplacian.map((row, i) =>
      row.map((val, j) => (i === j ? lambdaMax - val : -val))
    );

    // Power iteration on shifted matrix gives Fiedler vector
    const { eigenvector: fiedler, eigenvalue: shiftedEV } = this.powerIteration(shifted, 100);

    // Partition by sign
    const partition = fiedler.map(v => v >= 0 ? 0 : 1);
    const clusters: number[][] = [[], []];
    for (let i = 0; i < partition.length; i++) {
      clusters[partition[i]].push(i);
    }

    return {
      partition,
      clusters,
      fiedlerVector: fiedler,
      algebraicConnectivity: lambdaMax - shiftedEV,
    };
  }

  /**
   * Analyze mesh complexity using spectral methods.
   * Input: flat index array (every 3 indices form a triangle face).
   */
  analyzeMesh(indices: number[]): MeshAnalysisResult {
    const faces: number[][] = [];
    for (let i = 0; i < indices.length; i += 3) {
      faces.push([indices[i], indices[i + 1], indices[i + 2]]);
    }

    if (faces.length < 2) {
      return { regions: 1, complexity: "simple", algebraicConnectivity: 0, fiedlerVector: [] };
    }

    const result = this.spectralPartition(faces);
    const numRegions = result.clusters.filter(c => c.length > 0).length;

    return {
      regions: numRegions,
      complexity: numRegions > 5 ? "complex" : numRegions > 2 ? "moderate" : "simple",
      algebraicConnectivity: result.algebraicConnectivity,
      fiedlerVector: result.fiedlerVector,
    };
  }

  // -------------------------------------------------------------------------
  // Internal helpers
  // -------------------------------------------------------------------------

  private _getFaceEdges(face: number[]): number[][] {
    if (!face || face.length < 3) return [];
    return [
      [Math.min(face[0], face[1]), Math.max(face[0], face[1])],
      [Math.min(face[1], face[2]), Math.max(face[1], face[2])],
      [Math.min(face[2], face[0]), Math.max(face[2], face[0])],
    ];
  }
}

export const spectralGraphEngine = new SpectralGraphEngineImpl();
