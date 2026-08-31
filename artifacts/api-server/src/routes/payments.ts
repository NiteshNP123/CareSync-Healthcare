import { Router, type IRouter } from "express";
import { store } from "../lib/store";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

// ============================================================================
// LIST PAYMENTS FOR CURRENT USER
// ============================================================================
router.get("/payments", requireAuth, (req, res) => {
  let list = store.payments;
  if (req.user!.role === "PATIENT" && req.user!.patientId) {
    list = list.filter((p) => p.patientId === req.user!.patientId);
  }

  const result = list.map((payment) => {
    const invoice = store.invoices.find((i) => i.paymentId === payment.id);
    return {
      ...payment,
      amount: Number(payment.amount),
      invoiceNumber: invoice?.invoiceNumber || null,
    };
  });

  res.json(result);
});

// ============================================================================
// CREATE DEMO / SANDBOX PAYMENT REQUEST
// ============================================================================
router.post("/payments/create", requireAuth, (req, res) => {
  const { appointmentId, orderId, investigationId, paymentType, amount, description } = req.body;

  if (!amount || !paymentType) {
    res.status(400).json({ error: "Amount and paymentType are required" });
    return;
  }

  const patientId = req.user!.patientId || 1;
  const paymentId = store.payments.length + 1;
  const transactionRef = `CS-PAY-${Math.floor(1000000 + Math.random() * 9000000)}`;

  const newPayment = {
    id: paymentId,
    patientId,
    orderId: orderId ? Number(orderId) : null,
    appointmentId: appointmentId ? Number(appointmentId) : null,
    investigationId: investigationId ? Number(investigationId) : null,
    paymentType,
    amount: String(Number(amount).toFixed(2)),
    currency: "INR",
    status: "PENDING",
    paymentMethod: "DEMO_SANDBOX",
    transactionRef,
    paidAt: null,
    createdAt: new Date(),
  };

  store.payments.unshift(newPayment as any);

  res.status(201).json({
    message: "Payment request created in sandbox mode",
    payment: newPayment,
    description: description || "CareSync Healthcare Transaction",
  });
});

// ============================================================================
// PROCESS / COMPLETE SANDBOX PAYMENT
// ============================================================================
router.post("/payments/:id/process", requireAuth, (req, res) => {
  const paymentId = Number(req.params.id);
  const { simulateFailure } = req.body;

  const payment = store.payments.find((p) => p.id === paymentId);
  if (!payment) {
    res.status(404).json({ error: "Payment record not found" });
    return;
  }

  if (simulateFailure) {
    payment.status = "FAILED";
    res.status(400).json({
      error: "Payment declined",
      message: "The sandbox payment was rejected. Please retry.",
      payment,
    });
    return;
  }

  payment.status = "PAID";
  payment.paidAt = new Date();

  // Create Invoice
  const invoiceId = store.invoices.length + 1;
  const invoiceNumber = `INV-${Math.floor(2000 + Math.random() * 8000)}-${paymentId}`;
  const todayFormatted = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

  const patient = store.patients.find((p) => p.id === payment.patientId);
  const user = patient ? store.users.find((u) => u.id === patient.userId) : null;

  const newInvoice = {
    id: invoiceId,
    paymentId: payment.id,
    invoiceNumber,
    patientId: payment.patientId,
    billingName: user?.fullName || "Rahul Sharma",
    billingAddress: patient?.address || "Indiranagar, Bengaluru",
    lineItems: [
      {
        description: payment.paymentType === "PHARMACY" ? "Pharmacy Order Dispensing" : "Consultation Fee",
        quantity: 1,
        amount: Number(payment.amount),
      },
    ],
    subtotal: payment.amount,
    tax: "0.00",
    totalAmount: payment.amount,
    issueDate: todayFormatted,
    createdAt: new Date(),
  };

  store.invoices.unshift(newInvoice as any);

  // Update connected order or appointment if applicable
  if (payment.orderId) {
    const order = store.pharmacyOrders.find((o) => o.id === payment.orderId);
    if (order) {
      order.status = "PAID";
    }
  }

  // Audit Log
  store.logAudit({
    actorId: req.user!.userId,
    actorRole: req.user!.role,
    action: "PAYMENT_COMPLETED_SANDBOX",
    entityType: "PAYMENT",
    entityId: payment.id,
    patientId: payment.patientId,
    result: "SUCCESS",
    metadata: { amount: payment.amount, transactionRef: payment.transactionRef, invoiceNumber },
  });

  res.json({
    message: "Sandbox payment completed successfully",
    payment,
    invoice: newInvoice,
  });
});

// ============================================================================
// GET INVOICE RECEIPT
// ============================================================================
router.get("/payments/:id/invoice", requireAuth, (req, res) => {
  const paymentId = Number(req.params.id);
  const invoice = store.invoices.find((i) => i.paymentId === paymentId);

  if (!invoice) {
    res.status(404).json({ error: "Invoice not found for this payment" });
    return;
  }

  res.json(invoice);
});

export default router;
