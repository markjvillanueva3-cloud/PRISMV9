/**
 * PRISM MCP Server — Reliability Block Diagram Engine
 *
 * System-level reliability analysis via reliability block diagrams (RBD),
 * fault tree analysis (FTA), importance measures, Monte Carlo simulation,
 * redundancy optimization, and availability modeling.
 *
 * Complements ReliabilityEngineeringEngine (component-level) with
 * system topology analysis for CNC manufacturing systems.
 *
 * References:
 * - Rausand & Hoyland, "System Reliability Theory" (2004)
 * - Modarres et al., "Reliability Engineering and Risk Analysis" (2017)
 * - IEC 61025 (Fault Tree Analysis)
 * - MIL-HDBK-338B (Electronic Reliability Design Handbook)
 *
 * @module ReliabilityBlockDiagramEngine
 */
interface AtomicValue<T> {
    value: T;
    unit: string;
    formula?: string;
    confidence?: number;
}
/** Component definition for RBD analysis. */
export interface RBDComponent {
    id: string;
    name: string;
    reliability: number;
    failure_rate_per_hour?: number;
    mtbf_hours?: number;
    distribution?: "exponential" | "weibull" | "lognormal";
    weibull_beta?: number;
    weibull_eta?: number;
    lognormal_mu?: number;
    lognormal_sigma?: number;
}
/** Connection defining system topology. */
export interface RBDConnection {
    type: "series" | "parallel" | "k_of_n" | "standby";
    components: string[];
    k?: number;
}
/** System analysis input. */
export interface SystemAnalysisInput {
    components: RBDComponent[];
    connections: RBDConnection[];
    mission_time_hours?: number;
}
/** System analysis output. */
export interface SystemAnalysisResult {
    system_reliability: number;
    system_mtbf_hours: number;
    system_failure_rate: number;
    availability: number;
    component_criticality: Record<string, number>;
}
/** Fault tree gate. */
export interface FTGate {
    id: string;
    type: "AND" | "OR" | "VOTING";
    inputs: string[];
    k?: number;
}
/** Fault tree basic event. */
export interface FTBasicEvent {
    id: string;
    probability: number;
    description?: string;
}
/** Fault tree analysis input. */
export interface FaultTreeInput {
    gates: FTGate[];
    basic_events: FTBasicEvent[];
    top_event: string;
}
/** Fault tree analysis output. */
export interface FaultTreeResult {
    top_event_probability: number;
    minimal_cut_sets: string[][];
    cut_set_probabilities: number[];
    dominant_cut_set: string[];
    order_distribution: Record<number, number>;
}
/** Importance measures input. */
export interface ImportanceMeasuresInput {
    components: RBDComponent[];
    connections: RBDConnection[];
}
/** Importance measures output. */
export interface ImportanceMeasuresResult {
    birnbaum: Record<string, number>;
    fussell_vesely: Record<string, number>;
    raw: Record<string, number>;
    rrw: Record<string, number>;
    criticality: Record<string, number>;
    most_critical_component: string;
}
/** Monte Carlo input. */
export interface MonteCarloInput {
    components: RBDComponent[];
    connections: RBDConnection[];
    mission_time_hours: number;
    num_simulations?: number;
    time_points?: number;
    seed?: number;
}
/** Monte Carlo output. */
export interface MonteCarloResult {
    system_mttf_hours: number;
    ci95: [number, number];
    reliability_curve: {
        t_hours: number;
        R: number;
    }[];
    percentiles: {
        p10: number;
        p50: number;
        p90: number;
    };
}
/** Redundancy optimization input. */
export interface RedundancyInput {
    compone