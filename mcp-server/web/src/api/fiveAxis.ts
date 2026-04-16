/**
 * ShopRepositoryPort — ULT-MS0 P1-U02
 *
 * Persistence port for canonical shop-domain entities.
 * Implementations can target SQLite, PostgreSQL, file-system,
 * or external ERP sync — all behind the same contract.
 *
 * @module engines/ShopRepositoryPort
 */
import type { Job, Traveler, TravelerStep, LaborSession, QuantityActual, Approval, Attachment } from "../schemas/shop/shopDomain.js";
export interface ShopRepository {
    getJob(id: string): Promise<Job | null>;
    listJobs(filter?: {
        status?: string;
        customer?: string;
        limit?: number;
    }): Promise<Job[]>;
    saveJob(job: Job): Promise<void>;
    updateJobStatus(id: string, status: string, userId: string, notes?: string): Promise<Job | null>;
    getTraveler(jobId: string): Promise<Traveler | null>;
    saveTravelerStep(step: TravelerStep): Promise<void>;
    updateStepStatus(stepId: string, status: string, operatorId?: string): Promise<TravelerStep | null>;
    getLaborSession(id: string): Promise<LaborSession | null>;
    getActiveSessions(employeeId: string): Promise<LaborSession[]>;
    saveLaborSession(session: LaborSession): Promise<void>;
    updateLaborSession(id: string, updates: Partial<LaborSession>): Promise<LaborSession | null>;
    recordQuantity(qty: QuantityActual): Promise<void>;
    getQuantities(jobId: string): Promise<QuantityActual[]>;
    submitApproval(approval: Approval): Promise<void>;
    getApprovals(jobId: string): Promise<Approval[]>;
    saveAttachment(attachment: Attachment): Promise<void>;
    getAttachments(jobId: string): Promise<Attachment[]>;
}
export declare class InMemoryShopRepository implements ShopRepository {
    private jobs;
    private travelerSteps;
    private laborSessions;
    private quantities;
    private approvals;
    private attachments;
    getJob(id: string): Promise<Job | null>;
    listJobs(filter?: {
        status?: string;
        customer?: string;
        limit?: number;
    }): Promise<Job[]>;
    saveJob(job: Job): Promise<void>;
    updateJobStatus(id: string, status: string, userId: string, notes?: string): Promise<Job | null>;
    getTraveler(jobId: string): Promise<Traveler | null>;
    saveTra