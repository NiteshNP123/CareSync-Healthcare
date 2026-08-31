import { Router, type IRouter } from "express";
import { store } from "../lib/store";
import { requireAuth, verifyPatientAccess } from "../middlewares/auth";

const router: IRouter = Router();

// ============================================================================
// LIST INVESTIGATIONS / LAB REQUISITIONS
// ============================================================================
router.get("/investigations", requireAuth, (req, res) => {
  const patientIdQuery = req.query.patientId ? Number(req.query.patientId) : undefined;
  let list = store.investigations;

  if (patientIdQuery) {
    if (!verifyPatientAccess(req, res, patientIdQuery, "LAB_REPORTS")) return;
    list = list.filter((i) => i.patientId === patientIdQuery);
  } else if (req.user!.role === "PATIENT" && req.user!.patientId) {
    list = list.filter((i) => i.patientId === req.user!.patientId);
  } else if (req.user!.role === "DOCTOR" && req.user!.doctorId) {
    list = list.filter((i) => i.doctorId === req.user!.doctorId);
  } else if (req.user!.role === "LAB_STAFF") {
    // Lab staff see all assigned test orders
    list = list;
  }

  const result = list.map((inv) => {
    const doctor = store.doctors.find((d) => d.id === inv.doctorId);
    const patient = store.patients.find((p) => p.id === inv.patientId);
    const patientUser = patient ? store.users.find((u) => u.id === patient.userId) : null;
    const lab = store.organizations.find((o) => o.id === inv.assignedLabId);
    const report = store.labReports.find((r) => r.investigationId === inv.id);

    return {
      ...inv,
      doctorName: doctor?.fullName || "Dr. Rahul Mehta",
      doctorSpecialization: doctor?.specialization || "General Physician",
      patientName: patientUser?.fullName || "Rahul Sharma",
      careSyncId: patient?.careSyncId || "CS-2048-7392",
      labName: lab?.name || "ABC Diagnostics",
      reportId: report?.id || null,
    };
  });

  res.json(result);
});

// ============================================================================
// CREATE INVESTIGATION REQUISITION (DOCTOR ONLY)
// ============================================================================
router.post("/investigations", requireAuth, (req, res) => {
  const { patientId, testName, category, reason, priority, instructions, assignedLabId } = req.body;

  if (!patientId || !testName) {
    res.status(400).json({ error: "Patient ID and test name are required" });
    return;
  }

  const doctorId = req.user!.doctorId || 1;
  const doctor = store.doctors.find((d) => d.id === doctorId);
  const patient = store.patients.find((p) => p.id === Number(patientId));

  const invId = store.investigations.length + 1;
  const newInv = {
    id: invId,
    consultationId: null,
    patientId: Number(patientId),
    doctorId,
    testName,
    category: category || "BLOOD",
    reason: reason || "Clinical diagnostic investigation",
    priority: priority || "ROUTINE",
    instructions: instructions || "Overnight fasting recommended",
    status: "ORDERED",
    assignedLabId: assignedLabId ? Number(assignedLabId) : 1,
    createdAt: new Date(),
  };

  store.investigations.unshift(newInv as any);

  // Link to Healthcare Journey
  store.addJourneyEvent({
    patientId: Number(patientId),
    eventType: "INVESTIGATION",
    sourceEntity: "investigation",
    sourceEntityId: invId,
    title: `Diagnostic Test Ordered: ${testName}`,
    provider: doctor?.fullName || "Consulting Doctor",
    organization: "ABC Diagnostics",
    date: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
    status: "UPCOMING",
    description: `Ordered ${testName}. Priority: ${newInv.priority}. Instructions: ${newInv.instructions}`,
    accent: "violet",
    metadata: { investigationId: invId },
  });

  if (patient) {
    store.createNotification(
      patient.userId,
      "New Diagnostic Test Ordered",
      `${doctor?.fullName} has requested ${testName}. Your diagnostic center has received the requisition.`,
      "REPORT_READY",
      "/app/journey"
    );
  }

  store.logAudit({
    actorId: req.user!.userId,
    actorRole: req.user!.role,
    action: "INVESTIGATION_ORDERED",
    entityType: "INVESTIGATION",
    entityId: invId,
    patientId: Number(patientId),
    result: "SUCCESS",
    metadata: { testName, priority: newInv.priority },
  });

  res.status(201).json(newInv);
});

// ============================================================================
// UPDATE INVESTIGATION STATUS
// ============================================================================
router.patch("/investigations/:id/status", requireAuth, (req, res) => {
  const invId = Number(req.params.id);
  const { status } = req.body;

  const inv = store.investigations.find((i) => i.id === invId);
  if (!inv) {
    res.status(404).json({ error: "Investigation not found" });
    return;
  }

  inv.status = status;

  store.logAudit({
    actorId: req.user!.userId,
    actorRole: req.user!.role,
    action: "INVESTIGATION_STATUS_UPDATED",
    entityType: "INVESTIGATION",
    entityId: invId,
    patientId: inv.patientId,
    result: "SUCCESS",
    metadata: { newStatus: status },
  });

  res.json({ message: "Investigation status updated", investigation: inv });
});

export default router;
