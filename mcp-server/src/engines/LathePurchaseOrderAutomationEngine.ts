/**
 * LathePurchaseOrderAutomationEngine — Auto-Generate PO Requirements
 *
 * U-LTH52: When job quoted → auto-generates PO requirements (stock, tools, consumables)
 * Uses PurchaseOrderEngine + InventoryAwareToolSelectorEngine + InventoryEOQEngine patterns
 *
 * @module engines/LathePurchaseOrderAutomationEngine
 */

// ============================================================================
// TYPES
// ============================================================================

export interface JobRequirements {
  job_id: string;
  part_number: string;
  quantity: number;
  material: string;
  stock_diameter_mm: number;
  stock_length_mm: number;
  tools_required: Array<{
    tool_type: string;
    description: string;
    quantity_needed: number;
  }>;
  consumables: Array<{
    type: string;
    description: string;
    quantity_needed: number;
    unit: string;
  }>;
}

export interface InventoryItem {
  item_id: string;
  type: "material" | "tool" | "consumable";
  description: string;
  quantity_on_hand: number;
  quantity_reserved: number;
  quantity_available: number;
  reorder_point: number;
  eoq: number;
  unit_cost: number;
  lead_time_days: number;
  supplier_id: string;
  last_ordered?: string;
}

export interface Supplier {
  supplier_id: string;
  name: string;
  contact: string;
  email: string;
  phone: string;
  categories: Array<"material" | "tool" | "consumable">;
  lead_time_days: number;
  payment_terms: string;
  rating: number;
}

export interface POLineItem {
  line_number: number;
  item_id: string;
  description: string;
  quantity: number;
  unit_cost: number;
  extended_cost: number;
  required_date: string;
}

export interface PurchaseOrder {
  po_id: string;
  supplier_id: string;
  supplier_name: string;
  job_id?: string;
  status: "draft" | "pending_approval" | "approved" | "sent" | "acknowledged" | "received" | "closed" | "cancelled";
  created_date: string;
  required_date: string;
  line_items: POLineItem[];
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  notes?: string;
  approval_chain: Array<{
    user_id: string;
    action: "approved" | "rejected";
    timestamp: string;
    notes?: string;
  }>;
}

export interface POGenerationResult {
  job_id: string;
  purchase_orders: PurchaseOrder[];
  shortages: Array<{
    item_type: string;
    description: string;
    quantity_needed: number;
    quantity_available: number;
    shortage: number;
  }>;
  total_cost: number;
  recommendations: string[];
}

// ============================================================================
// DEFAULT DATA
// ============================================================================

const DEFAULT_SUPPLIERS: Supplier[] = [
  {
    supplier_id: "SUP-001",
    name: "MetalMart Inc",
    contact: "Bob Johnson",
    email: "sales@metalmart.com",
    phone: "800-555-1234",
    categories: ["material"],
    lead_time_days: 3,
    payment_terms: "Net 30",
    rating: 4.5,
  },
  {
    supplier_id: "SUP-002",
    name: "Kennametal Direct",
    contact: "Sarah Chen",
    email: "orders@kennametal.com",
    phone: "800-555-2345",
    categories: ["tool"],
    lead_time_days: 2,
    payment_terms: "Net 30",
    rating: 4.8,
  },
  {
    supplier_id: "SUP-003",
    name: "CoolantPro Supply",
    contact: "Mike Williams",
    email: "orders@coolantpro.com",
    phone: "800-555-3456",
    categories: ["consumable"],
    lead_time_days: 1,
    payment_terms: "Net 15",
    rating: 4.2,
  },
  {
    supplier_id: "SUP-004",
    name: "Industrial Supply Co",
    contact: "Lisa Brown",
    email: "sales@industrialsupply.com",
    phone: "800-555-4567",
    categories: ["material", "tool", "consumable"],
    lead_time_days: 5,
    payment_terms: "Net 45",
    rating: 4.0,
  },
];

const MATERIAL_COSTS: Record<string, number> = {
  "6061-T6": 3.50,
  "7075-T6": 5.20,
  "4140": 2.80,
  "4340": 3.20,
  "1018": 1.80,
  "1045": 2.10,
  "303SS": 6.50,
  "316SS": 8.00,
  DEFAULT: 3.00,
};

const TOOL_COSTS: Record<string, number> = {
  "CNMG Insert": 12.50,
  "DNMG Insert": 14.00,
  "VNMG Insert": 11.50,
  "Threading Insert": 18.00,
  "Grooving Insert": 16.50,
  "Drill Bit": 25.00,
  "Boring Bar": 85.00,
  DEFAULT: 15.00,
};

const CONSUMABLE_COSTS: Record<string, number> = {
  "Coolant": 45.00,
  "Cutting Oil": 38.00,
  "Wipers": 8.50,
  "Filters": 12.00,
  DEFAULT: 10.00,
};

// ============================================================================
// ENGINE
// ============================================================================

class LathePurchaseOrderAutomationEngine {
  private inventory: Map<string, InventoryItem> = new Map();
  private suppliers: Map<string, Supplier> = new Map();
  private purchaseOrders: Map<string, PurchaseOrder> = new Map();
  private poCounter = 0;

  constructor() {
    for (const supplier of DEFAULT_SUPPLIERS) {
      this.suppliers.set(supplier.supplier_id, supplier);
    }
    this.initializeDefaultInventory();
  }

  private initializeDefaultInventory(): void {
    const materials = ["6061-T6", "7075-T6", "4140", "4340", "1018", "1045", "303SS", "316SS"];
    for (const mat of materials) {
      this.inventory.set(`MAT-${mat}`, {
        item_id: `MAT-${mat}`,
        type: "material",
        description: `${mat} Round Bar Stock`,
        quantity_on_hand: 500,
        quantity_reserved: 0,
        quantity_available: 500,
        reorder_point: 100,
        eoq: 250,
        unit_cost: MATERIAL_COSTS[mat] || MATERIAL_COSTS["DEFAULT"],
        lead_time_days: 3,
        supplier_id: "SUP-001",
      });
    }

    const tools = ["CNMG Insert", "DNMG Insert", "VNMG Insert", "Threading Insert", "Grooving Insert"];
    for (const tool of tools) {
      this.inventory.set(`TOOL-${tool.replace(/\s+/g, "-")}`, {
        item_id: `TOOL-${tool.replace(/\s+/g, "-")}`,
        type: "tool",
        description: tool,
        quantity_on_hand: 20,
        quantity_reserved: 0,
        quantity_available: 20,
        reorder_point: 5,
        eoq: 10,
        unit_cost: TOOL_COSTS[tool] || TOOL_COSTS["DEFAULT"],
        lead_time_days: 2,
        supplier_id: "SUP-002",
      });
    }

    const consumables = ["Coolant", "Cutting Oil", "Wipers", "Filters"];
    for (const cons of consumables) {
      this.inventory.set(`CONS-${cons}`, {
        item_id: `CONS-${cons}`,
        type: "consumable",
        description: cons,
        quantity_on_hand: 50,
        quantity_reserved: 0,
        quantity_available: 50,
        reorder_point: 10,
        eoq: 25,
        unit_cost: CONSUMABLE_COSTS[cons] || CONSUMABLE_COSTS["DEFAULT"],
        lead_time_days: 1,
        supplier_id: "SUP-003",
      });
    }
  }

  generatePOsForJob(requirements: JobRequirements): POGenerationResult {
    const purchaseOrders: PurchaseOrder[] = [];
    const shortages: POGenerationResult["shortages"] = [];
    const recommendations: string[] = [];
    const supplierItems: Map<string, POLineItem[]> = new Map();

    const materialItemId = `MAT-${requirements.material}`;
    const materialItem = this.inventory.get(materialItemId);
    const materialVolumeNeeded = this.calculateMaterialVolume(
      requirements.stock_diameter_mm,
      requirements.stock_length_mm,
      requirements.quantity
    );

    if (materialItem) {
      if (materialItem.quantity_available < materialVolumeNeeded) {
        const shortage = materialVolumeNeeded - materialItem.quantity_available;
        shortages.push({
          item_type: "material",
          description: materialItem.description,
          quantity_needed: materialVolumeNeeded,
          quantity_available: materialItem.quantity_available,
          shortage,
        });

        const orderQty = Math.max(shortage, materialItem.eoq);
        this.addToSupplierPO(supplierItems, materialItem.supplier_id, {
          line_number: 0,
          item_id: materialItemId,
          description: materialItem.description,
          quantity: Math.ceil(orderQty),
          unit_cost: materialItem.unit_cost,
          extended_cost: Math.ceil(orderQty) * materialItem.unit_cost,
          required_date: this.calculateRequiredDate(materialItem.lead_time_days),
        });
      }
    } else {
      shortages.push({
        item_type: "material",
        description: `${requirements.material} (not in inventory)`,
        quantity_needed: materialVolumeNeeded,
        quantity_available: 0,
        shortage: materialVolumeNeeded,
      });
      recommendations.push(`Add ${requirements.material} to inventory system`);
    }

    for (const tool of requirements.tools_required) {
      const toolItemId = `TOOL-${tool.tool_type.replace(/\s+/g, "-")}`;
      const toolItem = this.inventory.get(toolItemId);

      if (toolItem) {
        if (toolItem.quantity_available < tool.quantity_needed) {
          const shortage = tool.quantity_needed - toolItem.quantity_available;
          shortages.push({
            item_type: "tool",
            description: toolItem.description,
            quantity_needed: tool.quantity_needed,
            quantity_available: toolItem.quantity_available,
            shortage,
          });

          const orderQty = Math.max(shortage, toolItem.eoq);
          this.addToSupplierPO(supplierItems, toolItem.supplier_id, {
            line_number: 0,
            item_id: toolItemId,
            description: toolItem.description,
            quantity: orderQty,
            unit_cost: toolItem.unit_cost,
            extended_cost: orderQty * toolItem.unit_cost,
            required_date: this.calculateRequiredDate(toolItem.lead_time_days),
          });
        }
      }
    }

    for (const cons of requirements.consumables) {
      const consItemId = `CONS-${cons.type}`;
      const consItem = this.inventory.get(consItemId);

      if (consItem) {
        if (consItem.quantity_available < cons.quantity_needed) {
          const shortage = cons.quantity_needed - consItem.quantity_available;
          shortages.push({
            item_type: "consumable",
            description: consItem.description,
            quantity_needed: cons.quantity_needed,
            quantity_available: consItem.quantity_available,
            shortage,
          });

          const orderQty = Math.max(shortage, consItem.eoq);
          this.addToSupplierPO(supplierItems, consItem.supplier_id, {
            line_number: 0,
            item_id: consItemId,
            description: consItem.description,
            quantity: orderQty,
            unit_cost: consItem.unit_cost,
            extended_cost: orderQty * consItem.unit_cost,
            required_date: this.calculateRequiredDate(consItem.lead_time_days),
          });
        }
      }
    }

    for (const [supplierId, items] of supplierItems) {
      const supplier = this.suppliers.get(supplierId);
      if (!supplier) continue;

      const numberedItems = items.map((item, idx) => ({
        ...item,
        line_number: idx + 1,
      }));

      const subtotal = numberedItems.reduce((sum, item) => sum + item.extended_cost, 0);

      const po = this.createPurchaseOrder({
        supplier_id: supplierId,
        job_id: requirements.job_id,
        line_items: numberedItems,
        notes: `Auto-generated for job ${requirements.job_id}`,
      });

      purchaseOrders.push(po);
    }

    const totalCost = purchaseOrders.reduce((sum, po) => sum + po.total, 0);

    if (shortages.length === 0) {
      recommendations.push("All materials and tools in stock - no POs required");
    }
    if (shortages.filter((s) => s.item_type === "tool").length > 2) {
      recommendations.push("Consider reviewing tool inventory levels - multiple shortages detected");
    }

    return {
      job_id: requirements.job_id,
      purchase_orders: purchaseOrders,
      shortages,
      total_cost: Math.round(totalCost * 100) / 100,
      recommendations,
    };
  }

  private addToSupplierPO(
    supplierItems: Map<string, POLineItem[]>,
    supplierId: string,
    item: POLineItem
  ): void {
    if (!supplierItems.has(supplierId)) {
      supplierItems.set(supplierId, []);
    }
    supplierItems.get(supplierId)!.push(item);
  }

  private calculateMaterialVolume(diameter: number, length: number, quantity: number): number {
    const volumePerPart = Math.PI * Math.pow(diameter / 2, 2) * length;
    const totalVolumeMm3 = volumePerPart * quantity * 1.15;
    return Math.ceil(totalVolumeMm3 / 1000);
  }

  private calculateRequiredDate(leadTimeDays: number): string {
    const date = new Date();
    date.setDate(date.getDate() + leadTimeDays + 2);
    return date.toISOString();
  }

  createPurchaseOrder(params: {
    supplier_id: string;
    job_id?: string;
    line_items: POLineItem[];
    notes?: string;
  }): PurchaseOrder {
    this.poCounter++;
    const poId = `PO-${Date.now().toString(36)}-${this.poCounter.toString().padStart(4, "0")}`;

    const supplier = this.suppliers.get(params.supplier_id);
    const subtotal = params.line_items.reduce((sum, item) => sum + item.extended_cost, 0);
    const tax = 0;
    const shipping = subtotal > 500 ? 0 : 25;

    const latestRequired = params.line_items.reduce((latest, item) => {
      const itemDate = new Date(item.required_date);
      return itemDate > latest ? itemDate : latest;
    }, new Date());

    const po: PurchaseOrder = {
      po_id: poId,
      supplier_id: params.supplier_id,
      supplier_name: supplier?.name || "Unknown",
      job_id: params.job_id,
      status: "draft",
      created_date: new Date().toISOString(),
      required_date: latestRequired.toISOString(),
      line_items: params.line_items,
      subtotal: Math.round(subtotal * 100) / 100,
      tax,
      shipping,
      total: Math.round((subtotal + tax + shipping) * 100) / 100,
      notes: params.notes,
      approval_chain: [],
    };

    this.purchaseOrders.set(poId, po);
    return po;
  }

  approvePO(poId: string, userId: string, notes?: string): PurchaseOrder | null {
    const po = this.purchaseOrders.get(poId);
    if (!po) return null;

    po.approval_chain.push({
      user_id: userId,
      action: "approved",
      timestamp: new Date().toISOString(),
      notes,
    });
    po.status = "approved";

    this.purchaseOrders.set(poId, po);
    return po;
  }

  sendPO(poId: string): PurchaseOrder | null {
    const po = this.purchaseOrders.get(poId);
    if (!po || po.status !== "approved") return null;

    po.status = "sent";
    this.purchaseOrders.set(poId, po);
    return po;
  }

  receivePO(poId: string, receivedItems?: Array<{ item_id: string; quantity: number }>): PurchaseOrder | null {
    const po = this.purchaseOrders.get(poId);
    if (!po) return null;

    for (const line of po.line_items) {
      const received = receivedItems?.find((r) => r.item_id === line.item_id);
      const qty = received?.quantity || line.quantity;

      const invItem = this.inventory.get(line.item_id);
      if (invItem) {
        invItem.quantity_on_hand += qty;
        invItem.quantity_available += qty;
        this.inventory.set(line.item_id, invItem);
      }
    }

    po.status = "received";
    this.purchaseOrders.set(poId, po);
    return po;
  }

  getPO(poId: string): PurchaseOrder | null {
    return this.purchaseOrders.get(poId) || null;
  }

  getPOsByStatus(status: PurchaseOrder["status"]): PurchaseOrder[] {
    return Array.from(this.purchaseOrders.values()).filter((po) => po.status === status);
  }

  getPOsByJob(jobId: string): PurchaseOrder[] {
    return Array.from(this.purchaseOrders.values()).filter((po) => po.job_id === jobId);
  }

  getInventoryItem(itemId: string): InventoryItem | null {
    return this.inventory.get(itemId) || null;
  }

  getSupplier(supplierId: string): Supplier | null {
    return this.suppliers.get(supplierId) || null;
  }

  getAllSuppliers(): Supplier[] {
    return Array.from(this.suppliers.values());
  }

  checkReorderPoints(): Array<{ item: InventoryItem; suggested_qty: number }> {
    const toReorder: Array<{ item: InventoryItem; suggested_qty: number }> = [];

    for (const item of this.inventory.values()) {
      if (item.quantity_available <= item.reorder_point) {
        toReorder.push({
          item,
          suggested_qty: item.eoq,
        });
      }
    }

    return toReorder;
  }

  updateInventory(itemId: string, updates: Partial<InventoryItem>): InventoryItem | null {
    const item = this.inventory.get(itemId);
    if (!item) return null;

    const updated = { ...item, ...updates };
    updated.quantity_available = updated.quantity_on_hand - updated.quantity_reserved;
    this.inventory.set(itemId, updated);
    return updated;
  }

  clearAll(): void {
    this.purchaseOrders.clear();
    this.poCounter = 0;
    this.initializeDefaultInventory();
  }
}

export const lathePurchaseOrderAutomationEngine = new LathePurchaseOrderAutomationEngine();
