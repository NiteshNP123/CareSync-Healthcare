import { Router, type IRouter } from "express";
import { store } from "../lib/store";
import { requireAuth, verifyPatientAccess } from "../middlewares/auth";

const router: IRouter = Router();

// ============================================================================
// LIST VERIFIED PHARMACIES
// ============================================================================
router.get("/pharmacies", (_req, res) => {
  const pharmacies = store.organizations
    .filter((o) => o.orgType === "PHARMACY")
    .map((p) => ({
      id: p.id,
      name: p.name,
      licenseNumber: p.licenseNumber,
      address: p.address,
      branches: p.branches,
      contactPhone: p.contactPhone,
      operatingHours: p.operatingHours,
      verified: p.verificationStatus === "VERIFIED",
    }));

  res.json(pharmacies);
});

// ============================================================================
// LIST PHARMACY ORDERS
// ============================================================================
router.get("/pharmacy/orders", requireAuth, (req, res) => {
  let list = store.pharmacyOrders;

  if (req.user!.role === "PATIENT" && req.user!.patientId) {
    list = list.filter((o) => o.patientId === req.user!.patientId);
  }

  const result = list.map((order) => {
    const pharmacy = store.organizations.find((o) => o.id === order.pharmacyId);
    const items = store.pharmacyOrderItems.filter((i) => i.orderId === order.id);
    const patient = store.patients.find((p) => p.id === order.patientId);
    const patientUser = patient ? store.users.find((u) => u.id === patient.userId) : null;

    return {
      id: order.orderNumber,
      orderId: order.id,
      patientId: order.patientId,
      patientName: patientUser?.fullName || "Rahul Sharma",
      careSyncId: patient?.careSyncId || "CS-2048-7392",
      pharmacy: pharmacy?.name || "XYZ Pharmacy",
      pharmacyId: order.pharmacyId,
      prescriptionId: order.prescriptionId,
      itemCount: items.length || 3,
      subtotal: Number(order.subtotal),
      tax: Number(order.tax),
      amount: Number(order.totalAmount),
      status: order.status,
      deliveryAddress: order.deliveryAddress,
      timeline: order.timeline,
      items,
      updatedAt: "Updated recently",
    };
  });

  res.json(result);
});

// ============================================================================
// GET SINGLE PHARMACY ORDER
// ============================================================================
router.get("/pharmacy/orders/:id", requireAuth, (req, res) => {
  const orderLookup = req.params.id;
  const order = store.pharmacyOrders.find(
    (o) => o.orderNumber === orderLookup || o.id === Number(orderLookup)
  );

  if (!order) {
    res.status(404).json({ error: "Pharmacy order not found" });
    return;
  }

  if (req.user!.role !== "PHARMACY_STAFF") {
    if (!verifyPatientAccess(req, res, order.patientId)) return;
  }

  const pharmacy = store.organizations.find((o) => o.id === order.pharmacyId);
  const items = store.pharmacyOrderItems.filter((i) => i.orderId === order.id);
  const patient = store.patients.find((p) => p.id === order.patientId);
  const patientUser = patient ? store.users.find((u) => u.id === patient.userId) : null;

  res.json({
    id: order.orderNumber,
    orderId: order.id,
    patientId: order.patientId,
    patientName: patientUser?.fullName,
    careSyncId: patient?.careSyncId,
    pharmacy: pharmacy?.name,
    subtotal: Number(order.subtotal),
    tax: Number(order.tax),
    amount: Number(order.totalAmount),
    status: order.status,
    deliveryAddress: order.deliveryAddress,
    timeline: order.timeline,
    items,
  });
});

// ============================================================================
// PLACE PHARMACY ORDER FROM PRESCRIPTION (PATIENT)
// ============================================================================
router.post("/pharmacy/orders", requireAuth, (req, res) => {
  const { prescriptionId, pharmacyId, deliveryAddress } = req.body;

  const patientId = req.user!.patientId || 1;
  const patient = store.patients.find((p) => p.id === patientId);
  const rx = prescriptionId ? store.prescriptions.find((p) => p.id === Number(prescriptionId)) : null;
  const rxItems = rx ? store.prescriptionItems.filter((i) => i.prescriptionId === rx.id) : [];

  const orderId = store.pharmacyOrders.length + 1;
  const orderNumber = `PS-${Math.floor(2000 + Math.random() * 8000)}`;

  let calculatedSubtotal = 0;
  const orderItems = [];

  if (rxItems.length > 0) {
    for (const item of rxItems) {
      const unitPrice = 120.0;
      const qty = 2;
      const total = unitPrice * qty;
      calculatedSubtotal += total;

      const orderItem = {
        id: store.pharmacyOrderItems.length + 1,
        orderId,
        medicineName: item.medicineName,
        quantity: qty,
        unitPrice: String(unitPrice),
        totalPrice: String(total),
        inStock: true,
      };
      store.pharmacyOrderItems.push(orderItem as any);
      orderItems.push(orderItem);
    }
  } else {
    calculatedSubtotal = 760.0;
  }

  const tax = calculatedSubtotal * 0.12;
  const totalAmount = calculatedSubtotal + tax;

  const newOrder = {
    id: orderId,
    orderNumber,
    patientId,
    pharmacyId: pharmacyId ? Number(pharmacyId) : 2, // XYZ Pharmacy
    prescriptionId: prescriptionId ? Number(prescriptionId) : null,
    status: "PLACED",
    subtotal: calculatedSubtotal.toFixed(2),
    tax: tax.toFixed(2),
    totalAmount: totalAmount.toFixed(2),
    deliveryAddress: deliveryAddress || patient?.address || "Indiranagar, Bengaluru",
    timeline: [
      { stage: "ORDER_PLACED", label: "Order Placed", time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), completed: true },
      { stage: "PRESCRIPTION_VERIFIED", label: "Prescription Review", time: "In Progress", completed: false },
      { stage: "QUOTE_ISSUED", label: "Bill Generated", time: "Pending", completed: false },
      { stage: "PREPARING", label: "Medicines Packed", time: "Pending", completed: false },
      { stage: "DISPATCHED", label: "Out for Delivery", time: "Pending", completed: false },
      { stage: "DELIVERED", label: "Delivered", time: "Pending", completed: false },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  store.pharmacyOrders.unshift(newOrder as any);

  // Link to Healthcare Journey
  store.addJourneyEvent({
    patientId,
    eventType: "PHARMACY_ORDER",
    sourceEntity: "pharmacy_order",
    sourceEntityId: orderId,
    title: `Pharmacy Order Placed (${orderNumber})`,
    provider: "XYZ Pharmacy",
    organization: "XYZ Pharmacy (Indiranagar)",
    date: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
    status: "IN_PROGRESS",
    description: `Prescription order submitted for home delivery. Pharmacy is reviewing stock and prescription.`,
    accent: "amber",
    metadata: { orderNumber, orderId },
  });

  store.logAudit({
    actorId: req.user!.userId,
    actorRole: req.user!.role,
    action: "PHARMACY_ORDER_PLACED",
    entityType: "PHARMACY_ORDER",
    entityId: orderId,
    patientId,
    organizationId: 2,
    result: "SUCCESS",
    metadata: { orderNumber, totalAmount: newOrder.totalAmount },
  });

  res.status(201).json({
    message: "Pharmacy order placed successfully",
    order: newOrder,
    items: orderItems,
  });
});

// ============================================================================
// UPDATE PHARMACY ORDER STATUS (PHARMACY STAFF / SYSTEM)
// ============================================================================
router.patch("/pharmacy/orders/:id/status", requireAuth, (req, res) => {
  const orderLookup = req.params.id;
  const { status, note } = req.body;

  const order = store.pharmacyOrders.find(
    (o) => o.orderNumber === orderLookup || o.id === Number(orderLookup)
  );

  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  order.status = status;
  (order as any).updatedAt = new Date();

  // Update timeline
  const stageMap: Record<string, string> = {
    PLACED: "ORDER_PLACED",
    REVIEWED: "PRESCRIPTION_VERIFIED",
    QUOTE_ISSUED: "QUOTE_ISSUED",
    PAID: "QUOTE_ISSUED",
    PREPARING: "PREPARING",
    READY: "PREPARING",
    DISPATCHED: "DISPATCHED",
    DELIVERED: "DELIVERED",
  };

  const currentStage = stageMap[status];
  if (currentStage && Array.isArray(order.timeline)) {
    order.timeline = order.timeline.map((step: any) => {
      if (step.stage === currentStage) {
        return { ...step, completed: true, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) };
      }
      return step;
    });
  }

  const patient = store.patients.find((p) => p.id === order.patientId);
  if (patient) {
    store.createNotification(
      patient.userId,
      `Pharmacy Order Update (${order.orderNumber})`,
      `Your pharmacy order status is now: ${status.replace("_", " ")}.`,
      "PHARMACY_UPDATE",
      "/app/orders"
    );
  }

  store.logAudit({
    actorId: req.user!.userId,
    actorRole: req.user!.role,
    action: "PHARMACY_ORDER_STATUS_UPDATED",
    entityType: "PHARMACY_ORDER",
    entityId: order.id,
    patientId: order.patientId,
    organizationId: order.pharmacyId,
    result: "SUCCESS",
    metadata: { status, note },
  });

  res.json({ message: "Order status updated", order });
});

export default router;
