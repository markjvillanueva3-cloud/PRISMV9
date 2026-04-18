/**
 * LatheDeliveryPerformanceEngine — Delivery Performance & On-Time Tracking
 *
 * U-LTH56: On-time delivery metrics, shipping management, performance analytics
 * Uses OrderTrackingEngine + ShipmentEngine + DeliveryMetricsEngine patterns
 *
 * @module engines/LatheDeliveryPerformanceEngine
 */

// ============================================================================
// TYPES
// ============================================================================

export interface DeliveryRecord {
  delivery_id: string;
  order_id: string;
  customer_id: string;
  customer_name: string;
  promised_date: string;
  actual_ship_date?: string;
  actual_delivery_date?: string;
  carrier: string;
  tracking_number?: string;
  status: "pending" | "shipped" | "in_transit" | "delivered" | "delayed" | "exception";
  delay_days: number;
  delay_reason?: string;
  line_items: Array<{
    part_number: string;
    quantity: number;
    shipped_quantity: number;
  }>;
}

export interface DeliveryMetrics {
  period: string;
  total_deliveries: number;
  on_time_deliveries: number;
  late_deliveries: number;
  early_deliveries: number;
  on_time_pct: number;
  average_delay_days: number;
  average_early_days: number;
  perfect_order_rate: number;
}

export interface CustomerDeliveryScore {
  customer_id: string;
  customer_name: string;
  total_orders: number;
  on_time_deliveries: number;
  on_time_pct: number;
  average_delay_days: number;
  delivery_score: number;
  trend: "improving" | "stable" | "declining";
  risk_level: "low" | "medium" | "high";
}

export interface CarrierPerformance {
  carrier: string;
  total_shipments: number;
  on_time_pct: number;
  average_transit_days: number;
  damage_rate_pct: number;
  cost_per_shipment: number;
  performance_score: number;
}

export interface DeliveryForecast {
  order_id: string;
  customer_name: string;
  promised_date: string;
  predicted_ship_date: string;
  predicted_delivery_date: string;
  on_time_probability: number;
  risk_factors: string[];
  recommended_actions: string[];
}

export interface DeliveryAlert {
  alert_id: string;
  delivery_id: string;
  alert_type: "at_risk" | "delayed" | "exception" | "urgent";
  severity: "low" | "medium" | "high" | "critical";
  message: string;
  created_at: string;
  acknowledged: boolean;
  resolution?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const CARRIERS = ["UPS", "FedEx", "USPS", "Freight", "Customer Pickup"];
const ON_TIME_THRESHOLD_DAYS = 0;

// ============================================================================
// ENGINE
// ============================================================================

class LatheDeliveryPerformanceEngine {
  private deliveries: Map<string, DeliveryRecord> = new Map();
  private alerts: Map<string, DeliveryAlert> = new Map();
  private carrierStats: Map<string, { shipments: number; onTime: number; totalDays: number }> = new Map();

  constructor() {
    for (const carrier of CARRIERS) {
      this.carrierStats.set(carrier, { shipments: 0, onTime: 0, totalDays: 0 });
    }
  }

  // --------------------------------------------------------------------------
  // Delivery Management
  // --------------------------------------------------------------------------

  createDelivery(params: {
    order_id: string;
    customer_id: string;
    customer_name: string;
    promised_date: string;
    carrier: string;
    line_items: Array<{ part_number: string; quantity: number }>;
  }): DeliveryRecord {
    const deliveryId = `DEL-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;

    const delivery: DeliveryRecord = {
      delivery_id: deliveryId,
      order_id: params.order_id,
      customer_id: params.customer_id,
      customer_name: params.customer_name,
      promised_date: params.promised_date,
      carrier: params.carrier,
      status: "pending",
      delay_days: 0,
      line_items: params.line_items.map((li) => ({
        ...li,
        shipped_quantity: 0,
      })),
    };

    this.deliveries.set(deliveryId, delivery);
    return delivery;
  }

  shipDelivery(
    deliveryId: string,
    trackingNumber: string,
    shippedQuantities?: Record<string, number>
  ): DeliveryRecord | null {
    const delivery = this.deliveries.get(deliveryId);
    if (!delivery) return null;

    delivery.actual_ship_date = new Date().toISOString();
    delivery.tracking_number = trackingNumber;
    delivery.status = "shipped";

    if (shippedQuantities) {
      for (const item of delivery.line_items) {
        if (shippedQuantities[item.part_number] !== undefined) {
          item.shipped_quantity = shippedQuantities[item.part_number];
        } else {
          item.shipped_quantity = item.quantity;
        }
      }
    } else {
      for (const item of delivery.line_items) {
        item.shipped_quantity = item.quantity;
      }
    }

    const stats = this.carrierStats.get(delivery.carrier);
    if (stats) {
      stats.shipments++;
      this.carrierStats.set(delivery.carrier, stats);
    }

    this.deliveries.set(deliveryId, delivery);
    return delivery;
  }

  markDelivered(deliveryId: string, deliveryDate?: string): DeliveryRecord | null {
    const delivery = this.deliveries.get(deliveryId);
    if (!delivery) return null;

    delivery.actual_delivery_date = deliveryDate || new Date().toISOString();
    delivery.status = "delivered";

    const promisedDate = new Date(delivery.promised_date);
    const actualDate = new Date(delivery.actual_delivery_date);
    const diffDays = Math.floor((actualDate.getTime() - promisedDate.getTime()) / (1000 * 60 * 60 * 24));

    delivery.delay_days = diffDays;

    if (diffDays > ON_TIME_THRESHOLD_DAYS) {
      const stats = this.carrierStats.get(delivery.carrier);
      if (stats) {
        stats.totalDays += diffDays;
        this.carrierStats.set(delivery.carrier, stats);
      }
    } else {
      const stats = this.carrierStats.get(delivery.carrier);
      if (stats) {
        stats.onTime++;
        this.carrierStats.set(delivery.carrier, stats);
      }
    }

    this.deliveries.set(deliveryId, delivery);
    return delivery;
  }

  markDelayed(deliveryId: string, reason: string): DeliveryRecord | null {
    const delivery = this.deliveries.get(deliveryId);
    if (!delivery) return null;

    delivery.status = "delayed";
    delivery.delay_reason = reason;

    this.createAlert({
      delivery_id: deliveryId,
      alert_type: "delayed",
      severity: "medium",
      message: `Delivery ${deliveryId} delayed: ${reason}`,
    });

    this.deliveries.set(deliveryId, delivery);
    return delivery;
  }

  getDelivery(deliveryId: string): DeliveryRecord | null {
    return this.deliveries.get(deliveryId) || null;
  }

  getDeliveriesByCustomer(customerId: string): DeliveryRecord[] {
    return Array.from(this.deliveries.values()).filter((d) => d.customer_id === customerId);
  }

  getDeliveriesByStatus(status: DeliveryRecord["status"]): DeliveryRecord[] {
    return Array.from(this.deliveries.values()).filter((d) => d.status === status);
  }

  // --------------------------------------------------------------------------
  // Metrics Calculation
  // --------------------------------------------------------------------------

  calculateMetrics(startDate: string, endDate: string): DeliveryMetrics {
    const start = new Date(startDate);
    const end = new Date(endDate);

    const deliveriesInPeriod = Array.from(this.deliveries.values()).filter((d) => {
      if (!d.actual_delivery_date) return false;
      const deliveryDate = new Date(d.actual_delivery_date);
      return deliveryDate >= start && deliveryDate <= end;
    });

    const total = deliveriesInPeriod.length;
    const onTime = deliveriesInPeriod.filter((d) => d.delay_days <= ON_TIME_THRESHOLD_DAYS).length;
    const late = deliveriesInPeriod.filter((d) => d.delay_days > ON_TIME_THRESHOLD_DAYS).length;
    const early = deliveriesInPeriod.filter((d) => d.delay_days < 0).length;

    const lateDeliveries = deliveriesInPeriod.filter((d) => d.delay_days > 0);
    const avgDelay = lateDeliveries.length > 0
      ? lateDeliveries.reduce((sum, d) => sum + d.delay_days, 0) / lateDeliveries.length
      : 0;

    const earlyDeliveries = deliveriesInPeriod.filter((d) => d.delay_days < 0);
    const avgEarly = earlyDeliveries.length > 0
      ? Math.abs(earlyDeliveries.reduce((sum, d) => sum + d.delay_days, 0) / earlyDeliveries.length)
      : 0;

    const perfectOrders = deliveriesInPeriod.filter((d) => {
      const allItemsShipped = d.line_items.every((li) => li.shipped_quantity === li.quantity);
      return d.delay_days <= ON_TIME_THRESHOLD_DAYS && allItemsShipped;
    }).length;

    return {
      period: `${startDate} to ${endDate}`,
      total_deliveries: total,
      on_time_deliveries: onTime,
      late_deliveries: late,
      early_deliveries: early,
      on_time_pct: total > 0 ? Math.round((onTime / total) * 1000) / 10 : 100,
      average_delay_days: Math.round(avgDelay * 10) / 10,
      average_early_days: Math.round(avgEarly * 10) / 10,
      perfect_order_rate: total > 0 ? Math.round((perfectOrders / total) * 1000) / 10 : 100,
    };
  }

  // --------------------------------------------------------------------------
  // Customer Scoring
  // --------------------------------------------------------------------------

  getCustomerDeliveryScore(customerId: string): CustomerDeliveryScore | null {
    const customerDeliveries = this.getDeliveriesByCustomer(customerId);
    const completedDeliveries = customerDeliveries.filter((d) => d.status === "delivered");

    if (completedDeliveries.length === 0) return null;

    const onTime = completedDeliveries.filter((d) => d.delay_days <= ON_TIME_THRESHOLD_DAYS).length;
    const onTimePct = (onTime / completedDeliveries.length) * 100;

    const lateDeliveries = completedDeliveries.filter((d) => d.delay_days > 0);
    const avgDelay = lateDeliveries.length > 0
      ? lateDeliveries.reduce((sum, d) => sum + d.delay_days, 0) / lateDeliveries.length
      : 0;

    const deliveryScore = Math.min(100, onTimePct + (avgDelay === 0 ? 10 : -avgDelay * 2));

    const recentDeliveries = completedDeliveries.slice(-5);
    const olderDeliveries = completedDeliveries.slice(-10, -5);

    let trend: CustomerDeliveryScore["trend"] = "stable";
    if (recentDeliveries.length >= 3 && olderDeliveries.length >= 3) {
      const recentOnTime = recentDeliveries.filter((d) => d.delay_days <= 0).length / recentDeliveries.length;
      const olderOnTime = olderDeliveries.filter((d) => d.delay_days <= 0).length / olderDeliveries.length;
      if (recentOnTime > olderOnTime + 0.1) trend = "improving";
      else if (recentOnTime < olderOnTime - 0.1) trend = "declining";
    }

    let riskLevel: CustomerDeliveryScore["risk_level"] = "low";
    if (onTimePct < 80) riskLevel = "high";
    else if (onTimePct < 90) riskLevel = "medium";

    return {
      customer_id: customerId,
      customer_name: completedDeliveries[0]?.customer_name || "Unknown",
      total_orders: completedDeliveries.length,
      on_time_deliveries: onTime,
      on_time_pct: Math.round(onTimePct * 10) / 10,
      average_delay_days: Math.round(avgDelay * 10) / 10,
      delivery_score: Math.round(deliveryScore * 10) / 10,
      trend,
      risk_level: riskLevel,
    };
  }

  getAllCustomerScores(): CustomerDeliveryScore[] {
    const customerIds = new Set<string>();
    for (const delivery of this.deliveries.values()) {
      customerIds.add(delivery.customer_id);
    }

    const scores: CustomerDeliveryScore[] = [];
    for (const customerId of customerIds) {
      const score = this.getCustomerDeliveryScore(customerId);
      if (score) scores.push(score);
    }

    return scores.sort((a, b) => b.delivery_score - a.delivery_score);
  }

  // --------------------------------------------------------------------------
  // Carrier Performance
  // --------------------------------------------------------------------------

  getCarrierPerformance(carrier: string): CarrierPerformance | null {
    const stats = this.carrierStats.get(carrier);
    if (!stats || stats.shipments === 0) return null;

    const carrierDeliveries = Array.from(this.deliveries.values()).filter(
      (d) => d.carrier === carrier && d.status === "delivered"
    );

    const transitDays = carrierDeliveries.map((d) => {
      if (!d.actual_ship_date || !d.actual_delivery_date) return 0;
      const shipDate = new Date(d.actual_ship_date);
      const deliveryDate = new Date(d.actual_delivery_date);
      return Math.max(0, Math.floor((deliveryDate.getTime() - shipDate.getTime()) / (1000 * 60 * 60 * 24)));
    });

    const avgTransit = transitDays.length > 0
      ? transitDays.reduce((a, b) => a + b, 0) / transitDays.length
      : 0;

    const onTimePct = stats.shipments > 0 ? (stats.onTime / stats.shipments) * 100 : 100;
    const performanceScore = onTimePct * 0.7 + Math.max(0, 100 - avgTransit * 10) * 0.3;

    return {
      carrier,
      total_shipments: stats.shipments,
      on_time_pct: Math.round(onTimePct * 10) / 10,
      average_transit_days: Math.round(avgTransit * 10) / 10,
      damage_rate_pct: 0,
      cost_per_shipment: 0,
      performance_score: Math.round(performanceScore * 10) / 10,
    };
  }

  getAllCarrierPerformance(): CarrierPerformance[] {
    const performances: CarrierPerformance[] = [];
    for (const carrier of CARRIERS) {
      const perf = this.getCarrierPerformance(carrier);
      if (perf && perf.total_shipments > 0) {
        performances.push(perf);
      }
    }
    return performances.sort((a, b) => b.performance_score - a.performance_score);
  }

  // --------------------------------------------------------------------------
  // Forecasting
  // --------------------------------------------------------------------------

  forecastDelivery(orderId: string, currentJobProgress: number): DeliveryForecast | null {
    const delivery = Array.from(this.deliveries.values()).find((d) => d.order_id === orderId);
    if (!delivery) return null;

    const promisedDate = new Date(delivery.promised_date);
    const today = new Date();
    const daysToPromised = Math.floor((promisedDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    const remainingWork = 100 - currentJobProgress;
    const estimatedDaysToComplete = Math.ceil(remainingWork / 20);
    const shippingDays = 2;

    const predictedShipDate = new Date(today);
    predictedShipDate.setDate(predictedShipDate.getDate() + estimatedDaysToComplete);

    const predictedDeliveryDate = new Date(predictedShipDate);
    predictedDeliveryDate.setDate(predictedDeliveryDate.getDate() + shippingDays);

    const onTimeProbability = Math.max(0, Math.min(100,
      100 - Math.max(0, (estimatedDaysToComplete + shippingDays - daysToPromised) * 15)
    ));

    const riskFactors: string[] = [];
    const recommendedActions: string[] = [];

    if (daysToPromised < 3) {
      riskFactors.push("Very short time to promised date");
      recommendedActions.push("Consider expedited shipping");
    }

    if (currentJobProgress < 50 && daysToPromised < 7) {
      riskFactors.push("Job less than 50% complete with <7 days to promise");
      recommendedActions.push("Prioritize this job on schedule");
    }

    if (onTimeProbability < 70) {
      riskFactors.push("High risk of late delivery");
      recommendedActions.push("Contact customer proactively");
    }

    return {
      order_id: orderId,
      customer_name: delivery.customer_name,
      promised_date: delivery.promised_date,
      predicted_ship_date: predictedShipDate.toISOString(),
      predicted_delivery_date: predictedDeliveryDate.toISOString(),
      on_time_probability: Math.round(onTimeProbability),
      risk_factors: riskFactors,
      recommended_actions: recommendedActions,
    };
  }

  // --------------------------------------------------------------------------
  // Alerts
  // --------------------------------------------------------------------------

  createAlert(params: {
    delivery_id: string;
    alert_type: DeliveryAlert["alert_type"];
    severity: DeliveryAlert["severity"];
    message: string;
  }): DeliveryAlert {
    const alertId = `ALT-${Date.now().toString(36)}`;

    const alert: DeliveryAlert = {
      alert_id: alertId,
      delivery_id: params.delivery_id,
      alert_type: params.alert_type,
      severity: params.severity,
      message: params.message,
      created_at: new Date().toISOString(),
      acknowledged: false,
    };

    this.alerts.set(alertId, alert);
    return alert;
  }

  acknowledgeAlert(alertId: string, resolution?: string): DeliveryAlert | null {
    const alert = this.alerts.get(alertId);
    if (!alert) return null;

    alert.acknowledged = true;
    alert.resolution = resolution;
    this.alerts.set(alertId, alert);
    return alert;
  }

  getActiveAlerts(): DeliveryAlert[] {
    return Array.from(this.alerts.values())
      .filter((a) => !a.acknowledged)
      .sort((a, b) => {
        const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        return severityOrder[a.severity] - severityOrder[b.severity];
      });
  }

  checkAtRiskDeliveries(): DeliveryAlert[] {
    const newAlerts: DeliveryAlert[] = [];
    const today = new Date();

    for (const delivery of this.deliveries.values()) {
      if (delivery.status === "delivered" || delivery.status === "exception") continue;

      const promisedDate = new Date(delivery.promised_date);
      const daysRemaining = Math.floor((promisedDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      if (daysRemaining < 0 && delivery.status !== "delayed") {
        const alert = this.createAlert({
          delivery_id: delivery.delivery_id,
          alert_type: "delayed",
          severity: "high",
          message: `Delivery ${delivery.delivery_id} is ${Math.abs(daysRemaining)} days past due`,
        });
        newAlerts.push(alert);
      } else if (daysRemaining <= 2 && delivery.status === "pending") {
        const alert = this.createAlert({
          delivery_id: delivery.delivery_id,
          alert_type: "at_risk",
          severity: "medium",
          message: `Delivery ${delivery.delivery_id} due in ${daysRemaining} days but not yet shipped`,
        });
        newAlerts.push(alert);
      }
    }

    return newAlerts;
  }

  // --------------------------------------------------------------------------
  // Utilities
  // --------------------------------------------------------------------------

  clearAll(): void {
    this.deliveries.clear();
    this.alerts.clear();
    for (const carrier of CARRIERS) {
      this.carrierStats.set(carrier, { shipments: 0, onTime: 0, totalDays: 0 });
    }
  }
}

export const latheDeliveryPerformanceEngine = new LatheDeliveryPerformanceEngine();
