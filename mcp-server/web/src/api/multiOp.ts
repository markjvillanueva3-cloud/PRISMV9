/**
 * SparseMatrixEngine — Advanced Sparse Matrix Operations
 *
 * Extends MatrixFactorizationEngine's basic CSR/CSC with fill-reducing ordering,
 * sparse Cholesky, and optimized sparse BLAS operations.
 *
 * Capabilities:
 *   - Reverse Cuthill-McKee (RCM) bandwidth reduction ordering
 *   - Approximate Minimum Degree (AMD) fill-reducing ordering
 *   - Sparse Cholesky factorization with ordering
 *   - Sparse matrix-matrix multiply (SpMM)
 *   - Triplet assembly for FEM global stiffness matrices
 *   - Bandwidth and profile computation
 *   - Sparse transpose
 *
 * Used by: FEM assembly, large thermal systems, structural analysis,
 *   any system where n > 100 and fill < 5%.
 *
 * References:
 *   - George & Liu, "Computer Solution of Large Sparse PDE Systems" (1981)
 *   - Cuthill & McKee (1969), "Reducing the bandwidth of sparse symmetric matrices"
 *   - Davis, "Direct Methods for Sparse Linear Systems" (2006)
 *
 * @engine SparseMatrixEngine
 * @milestone SCIMATH-MS0
 * @unit P1-U02
 * @courses MIT 18.085, MIT 18.335
 */
// ============================================================================
// SPARSE MATRIX ENGINE
// ============================================================================
export class SparseMatrixEngine {
    /**
     * Compute bandwidth of a CSR matrix: max|i-j| over all nonzero A[i][j].
     */
    static bandwidth(csr) {
        let bw = 0;
        for (let i = 0; i < csr.rows; i++) {
            for (let k = csr.rowPtr[i]; k < csr.rowPtr[i + 1]; k++) {
                bw = Math.max(bw, Math.abs(i - csr.colIndices[k]));
            }
        }
        return bw;
    }
    /**
     * Compute profile (envelope) of a symmetric CSR matrix:
     * sum of (i - min_j{j : A[i][j] != 0}) for each row i.
     */
    static profile(csr) {
        let prof = 0;
        for (let i = 0; i < csr.rows; i++) {
            let minCol = i;
            for (let k = csr.rowPtr[i]; k < csr.rowPtr[i + 1]; k++) {
                minCol = Math.min(minCol, csr.colIndices[k]);
            }
            prof += i - minCol;
        }
        return prof;
    }
    /**
     * Build adjacency graph from symmetric CSR matrix (ignoring diagonal).
     */
    static csrToGraph(csr) {
        const n = csr.rows;
        const adj = Array.from({ length: n }, () => []);
        for (let i = 0; i < n; i++) {
            for (let k = csr.rowPtr[i]; k < csr.rowPtr[i + 1]; k++) {
                const j = csr.colIndices[k];
                if (j !== i)
                    adj[i].push(j);
            }
        }
        return { adj, n };
    }
    /**
     * Reverse Cuthill-McKee (RCM) ordering for bandwidth reduction.
     *
     * Algorithm (Cuthill & McKee 1969, reversed by George 1971):
     *   1. Start from a pseudo-peripheral node (using George-Liu heuristic)
     *   2. BFS with degree-sorted adjacency
     *   3. Reverse the resulting ordering
     *
     * Typically reduces bandwidth by 40-70% for FEM meshes.
     *
     * @param csr Symmetric sparse matrix in CSR format
     * @returns OrderingResult with permutation and bandwidth comparison
     */
    static rcmOrdering(csr) {
        const graph = SparseMatrixEngine.csrToGraph(csr);
        const n = graph.n;
        if (n === 0)
            return { permutation: [], inversePermutation: [], bandwidthBefore: 0, bandwidthAfter: 0 };
        const bwBefore = SparseMatrixEngine.bandwidth(csr);
        // Fin