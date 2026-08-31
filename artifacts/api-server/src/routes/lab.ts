import { Router, type IRouter } from "express";
import { store } from "../lib/store";
import { requireAuth, requireRole, verifyPatientAccess } from "../middlewares/auth";

const router: IRouter = Router();

// ============================================================================
// LIST LAB REPORTS (PATIENT, DOCTOR, OR LAB VIEW)
// ============================================================================
router.get("/lab/reports", requireAuth, (req, res) => {
  const patientIdQuery = req.query.patientId ? Number(req.query.patientId) : undefined;
  let list = store.labReports;

  if (patientIdQuery) {
    if (!verifyPatientAccess(req, res, patientIdQuery, "LAB_REPORTS")) return;
    list = list.filter((r) => r.patientId === patientIdQuery);
  } else if (req.user!.role === "PATIENT" && req.user!.patientId) {
    list = list.filter((r) => r.patientId === req.user!.patientId);
  }

  const result = list.map((report) => {
    const patient = store.patients.find((p) => p.id === report.patientId);
    const patientUser = patient ? store.users.find((u) => u.id === patient.userId) : null;
    const lab = store.organizations.find((o) => o.id === report.labId);
    const techUser = report.verifiedByTechnicianId ? store.users.find((u) => u.id === report.verifiedByTechnicianId) : null;

    return {
      ...report,
      patientName: patientUser?.fullName || "Rahul Sharma",
      careSyncId: patient?.careSyncId || "CS-2048-7392",
      labName: lab?.name || "ABC Diagnostics",
      verifiedBy: techUser?.fullName || "Lab Technician",
    };
  });

  res.json(result);
});

// ============================================================================
// GET SINGLE LAB REPORT
// ============================================================================
router.get("/lab/reports/:id", requireAuth, (req, res) => {
  const reportId = Number(req.params.id);
  const report = store.labReports.find((r) => r.id === reportId);

  if (!report) {
    res.status(404).json({ error: "Lab report not found" });
    return;
  }

  if (req.user!.role !== "LAB_STAFF") {
    if (!verifyPatientAccess(req, res, report.patientId, "LAB_REPORTS")) return;
  }

  const patient = store.patients.find((p) => p.id === report.patientId);
  const patientUser = patient ? store.users.find((u) => u.id === patient.userId) : null;
  const lab = store.organizations.find((o) => o.id === report.labId);
  const techUser = report.verifiedByTechnicianId ? store.users.find((u) => u.id === report.verifiedByTechnicianId) : null;

  store.logAudit({
    actorId: req.user!.userId,
    actorRole: req.user!.role,
    action: "LAB_REPORT_VIEWED",
    entityType: "LAB_REPORT",
    entityId: reportId,
    patientId: report.patientId,
    result: "SUCCESS",
  });

  res.json({
    ...report,
    patientName: patientUser?.fullName,
    careSyncId: patient?.careSyncId,
    labName: lab?.name,
    verifiedBy: techUser?.fullName,
  });
});

// ============================================================================
// SAMPLE COLLECTION & PROCESSING STATUS UPDATE (LAB STAFF)
// ============================================================================
router.patch("/lab/investigations/:id/sample", requireAuth, requireRole(["LAB_STAFF", "ADMIN"]), (req, res) => {
  const invId = Number(req.params.id);
  const { status } = req.body; // SAMPLE_COLLECTED | PROCESSING

  const inv = store.investigations.find((i) => i.id === invId);
  if (!inv) {
    res.status(404).json({ error: "Investigation requisition not found" });
    return;
  }

  inv.status = status || "SAMPLE_COLLECTED";

  // Create Journey Event for sample collection
  if (inv.status === "SAMPLE_COLLECTED") {
    store.addJourneyEvent({
      patientId: inv.patientId,
      eventType: "LAB_TEST",
      sourceEntity: "investigation",
      sourceEntityId: invId,
      title: `Sample Collected: ${inv.testName}`,
      provider: "ABC Diagnostics",
      organization: "ABC Diagnostics (Richmond Road)",
      date: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
      status: "COMPLETED",
      description: `Diagnostic sample collected for ${inv.testName}. Processing in progress.`,
      accent: "violet",
      metadata: { investigationId: invId },
    });
  }

  store.logAudit({
    actorId: req.user!.userId,
    actorRole: "LAB_STAFF",
    action: "LAB_SAMPLE_STATUS_UPDATED",
    entityType: "INVESTIGATION",
    entityId: invId,
    patientId: inv.patientId,
    result: "SUCCESS",
    metadata: { status: inv.status },
  });

  res.json({ message: "Requisition status updated", investigation: inv });
});

// ============================================================================
// PUBLISH STRUCTURED LAB REPORT (LAB STAFF)
// ============================================================================
router.post("/lab/reports", requireAuth, requireRole(["LAB_STAFF", "ADMIN"]), (req, res) => {
  const { investigationId, patientId, testName, category, summary, structuredResults, referenceRanges, fileUrl } = req.body;

  if (!patientId || !testName || !structuredResults) {
    res.status(400).json({ error: "Missing required report parameters (patientId, testName, structuredResults)" });
    return;
  }

  const patient = store.patients.find((p) => p.id === Number(patientId));
  const inv = investigationId ? store.investigations.find((i) => i.id === Number(investigationId)) : null;

  const reportId = store.labReports.length + 1;
  const todayFormatted = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

  const newReport = {
    id: reportId,
    investigationId: investigationId ? Number(investigationId) : null,
    patientId: Number(patientId),
    labId: 1, // ABC Diagnostics
    testName,
    category: category || "LAB_REPORT",
    summary: summary || "All diagnostic parameters processed and verified according to NABL standards.",
    structuredResults: structuredResults || [],
    referenceRanges: referenceRanges || "Biological Reference Intervals per NABL & IFCC Guidelines",
    fileUrl: fileUrl || `/reports/ABC-LAB-${reportId}.pdf`,
    status: "PUBLISHED",
    verifiedByTechnicianId: req.user!.userId,
    verifiedAt: new Date(),
    createdAt: new Date(),
  };

  store.labReports.unshift(newReport as any);

  // Mark investigation COMPLETED
  if (inv) {
    inv.status = "COMPLETED";
  }

  // Create Journey Event for Report Ready
  store.addJourneyEvent({
    patientId: Number(patientId),
    eventType: "REPORT",
    sourceEntity: "lab_report",
    sourceEntityId: reportId,
    title: `Verified Report Ready: ${testName}`,
    provider: "ABC Diagnostics",
    organization: "ABC Diagnostics (NABL Accredited)",
    date: todayFormatted,
    status: "COMPLETED",
    description: `Your verified report for ${testName} is now ready and accessible to your care team.`,
    accent: "blue",
    metadata: { reportId, testName },
  });

  // Notify Patient
  if (patient) {
    store.createNotification(
      patient.userId,
      "Diagnostic Report Published",
      `ABC Diagnostics has published your ${testName} report. View findings and AI explanation in your journey.`,
      "REPORT_READY",
      "/app/journey"
    );
  }

  // Notify Ordering Doctor if linked
  if (inv && inv.doctorId) {
    const doctor = store.doctors.find((d) => d.id === inv.doctorId);
    if (doctor) {
      store.createNotification(
        doctor.userId,
        "Patient Diagnostic Report Published",
        `Lab results for ${testName} (Patient: ${patient?.careSyncId}) are available for clinical review.`,
        "REPORT_READY",
        "/app"
      );
    }
  }

  // Audit Log
  store.logAudit({
    actorId: req.user!.userId,
    actorRole: "LAB_STAFF",
    action: "LAB_REPORT_PUBLISHED",
    entityType: "LAB_REPORT",
    entityId: reportId,
    patientId: Number(patientId),
    organizationId: 1,
    result: "SUCCESS",
    metadata: { testName, parameterCount: structuredResults.length },
  });

  res.status(201).json({
    message: "Report successfully published and journey updated",
    report: newReport,
  });
});

export default router;
