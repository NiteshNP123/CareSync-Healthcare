import { Router, type IRouter } from "express";
import { store } from "../lib/store";
import { requireAuth, verifyPatientAccess } from "../middlewares/auth";

const router: IRouter = Router();

export const AI_DISCLAIMER =
  "CareSync AI provides software-assisted healthcare information management and does not replace professional medical diagnosis or treatment. Always verify all information against original clinical records and consult your physician.";

// ============================================================================
// DYNAMIC AI JOURNEY SUMMARY
// ============================================================================
router.post("/ai/journey-summary", requireAuth, (req, res) => {
  const patientId = req.body.patientId ? Number(req.body.patientId) : (req.user!.patientId || 1);
  if (!verifyPatientAccess(req, res, patientId, "JOURNEY")) return;

  const recentEvents = store.journeyEvents
    .filter((e) => e.patientId === patientId)
    .slice(0, 5);

  const nextAppt = store.appointments.find(
    (a) => a.patientId === patientId && a.status === "CONFIRMED"
  );
  const doctor = nextAppt ? store.doctors.find((d) => d.id === nextAppt.doctorId) : null;
  const recentReport = store.labReports.find((r) => r.patientId === patientId);

  let headline = "Your healthcare journey is connected and moving forward";
  let body = "All recent clinical consultations, diagnostic tests, and prescription handoffs have been linked to your continuous care timeline.";
  let nextStep = "Continue adhering to your current care regimen.";

  if (nextAppt) {
    headline = `Next milestone: ${nextAppt.mode} with ${doctor?.fullName || "your care team"}`;
    body = `Your care is in active monitoring. Your recent laboratory markers (${recentReport?.testName || "Lipid & Metabolic Panel"}) are connected and ready for your doctor's review.`;
    nextStep = `Review your ${recentReport?.testName || "lab report"} before your consultation on ${nextAppt.date}.`;
  }

  res.json({
    headline,
    body,
    nextStep,
    recentEventsCount: recentEvents.length,
    disclaimer: AI_DISCLAIMER,
    generatedAt: new Date().toISOString(),
  });
});

// ============================================================================
// AI REPORT EXPLANATION (PLAIN ENGLISH PARAMETER BREAKDOWN)
// ============================================================================
router.post("/ai/explain-report", requireAuth, (req, res) => {
  const { reportId } = req.body;

  if (!reportId) {
    res.status(400).json({ error: "Report ID is required" });
    return;
  }

  const report = store.labReports.find((r) => r.id === Number(reportId));
  if (!report) {
    res.status(404).json({ error: "Lab report not found" });
    return;
  }

  if (!verifyPatientAccess(req, res, report.patientId, "LAB_REPORTS")) return;

  const explanations: Array<{ parameter: string; plainMeaning: string; referenceContext: string; flag: string }> = [];

  if (Array.isArray(report.structuredResults)) {
    for (const item of report.structuredResults as any[]) {
      let meaning = `${item.parameter} measures a vital biochemical marker in your system.`;
      if (item.parameter.toLowerCase().includes("hba1c")) {
        meaning = "HbA1c reflects your average blood sugar levels over the past 2 to 3 months. Values between 5.7% and 6.4% indicate pre-diabetes range.";
      } else if (item.parameter.toLowerCase().includes("ldl")) {
        meaning = "LDL is often termed 'bad' cholesterol because elevated levels can build up in arterial walls.";
      } else if (item.parameter.toLowerCase().includes("glucose")) {
        meaning = "Fasting blood glucose measures the concentration of sugar in your blood after an overnight fast.";
      } else if (item.parameter.toLowerCase().includes("creatinine")) {
        meaning = "Serum creatinine is a waste product filtered by healthy kidneys to evaluate renal function.";
      }

      explanations.push({
        parameter: item.parameter,
        plainMeaning: meaning,
        referenceContext: `Your value: ${item.value} ${item.unit} (Standard Reference: ${item.referenceRange} ${item.unit})`,
        flag: item.flag || "NORMAL",
      });
    }
  }

  store.logAudit({
    actorId: req.user!.userId,
    actorRole: req.user!.role,
    action: "AI_REPORT_EXPLANATION_GENERATED",
    entityType: "LAB_REPORT",
    entityId: report.id,
    patientId: report.patientId,
    result: "SUCCESS",
  });

  res.json({
    testName: report.testName,
    summary: report.summary,
    explanations,
    disclaimer: AI_DISCLAIMER,
    sourceReportId: report.id,
  });
});

// ============================================================================
// INTELLIGENT NATURAL LANGUAGE SEARCH ACROSS AUTHORIZED HISTORY
// ============================================================================
router.post("/ai/search", requireAuth, (req, res) => {
  const { query, patientId: queryPatientId } = req.body;

  if (!query || typeof query !== "string") {
    res.status(400).json({ error: "Query string is required" });
    return;
  }

  const patientId = queryPatientId ? Number(queryPatientId) : (req.user!.patientId || 1);
  if (!verifyPatientAccess(req, res, patientId, "JOURNEY")) return;

  const q = query.toLowerCase();
  const matchedEvents = store.journeyEvents.filter(
    (e) =>
      e.patientId === patientId &&
      (e.title.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q) ||
        e.provider.toLowerCase().includes(q) ||
        e.organization.toLowerCase().includes(q) ||
        e.eventType.toLowerCase().includes(q))
  );

  const matchedReports = store.labReports.filter(
    (r) =>
      r.patientId === patientId &&
      (r.testName.toLowerCase().includes(q) ||
        (r.summary && r.summary.toLowerCase().includes(q)))
  );

  const matchedPrescriptions = store.prescriptions.filter(
    (p) => p.patientId === patientId
  );

  res.json({
    query,
    results: {
      journeyEvents: matchedEvents,
      labReports: matchedReports,
      prescriptionsCount: matchedPrescriptions.length,
    },
    disclaimer: AI_DISCLAIMER,
  });
});

export default router;
