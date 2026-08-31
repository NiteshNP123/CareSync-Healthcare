import { Router, type IRouter } from "express";
import { store } from "../lib/store";
import { requireAuth, requireRole, verifyPatientAccess } from "../middlewares/auth";
import { resolveIntent } from "../services/ai/intentResolver";
import { buildScopedContext } from "../services/ai/contextEngine";
import { AssistantProviderFactory } from "../services/ai/providerFactory";
import { AssistantSafetyLayer } from "../services/ai/safetyLayer";

const router: IRouter = Router();

export const AI_DISCLAIMER =
  "CareSync AI provides software-assisted healthcare information management and does not replace professional medical diagnosis or treatment. Always verify all information against original clinical records and consult your physician.";

// ============================================================================
// PATIENT-FACING CARESYNC ASSISTANT CHAT ENDPOINT (SECURITY HARDENED)
// ============================================================================
router.post("/ai/assistant/chat", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const hasAuthAttempt = (authHeader && authHeader.startsWith("Bearer ")) || (req.cookies && req.cookies.auth_token);

    // 1. Explicit invalid/malformed token check -> 401
    if (hasAuthAttempt && !req.user) {
      store.logAudit({
        actorRole: "UNAUTHENTICATED",
        action: "AI_ASSISTANT_AUTH_FAILURE",
        entityType: "API_ENDPOINT",
        result: "DENIED",
        metadata: { path: req.path, reason: "INVALID_OR_EXPIRED_TOKEN" },
      });
      res.status(401).json({ error: "Authentication required", message: "Invalid or expired session token." });
      return;
    }

    // 2. Explicit Gating for Demo Fallback: Enabled ONLY when NODE_ENV === "development" AND DEMO_MODE === "true"
    const isDemoFallbackAllowed =
      process.env.NODE_ENV === "development" && process.env.DEMO_MODE === "true";

    // 3. Unauthenticated request handling (Production or non-demo -> 401, Explicit demo mode -> strictly locked demo patient)
    if (!req.user) {
      if (!isDemoFallbackAllowed) {
        store.logAudit({
          actorRole: "UNAUTHENTICATED",
          action: "AI_ASSISTANT_UNAUTHENTICATED_ACCESS_DENIED",
          entityType: "API_ENDPOINT",
          result: "DENIED",
          metadata: {
            path: req.path,
            environment: process.env.NODE_ENV || "development",
            demoMode: process.env.DEMO_MODE || "missing",
          },
        });
        res.status(401).json({
          error: "Authentication required",
          message: "Please sign in to access CareSync Assistant.",
        });
        return;
      }
    }

    // 4. Role Enforcement: Only PATIENT role is permitted
    if (req.user && req.user.role !== "PATIENT") {
      store.logAudit({
        actorId: req.user.userId,
        actorRole: req.user.role,
        action: "UNAUTHORIZED_ROLE_ACCESS_ATTEMPT",
        entityType: "API_ENDPOINT",
        result: "DENIED",
        metadata: { path: req.path, requiredRoles: ["PATIENT"], actorRole: req.user.role },
      });
      res.status(403).json({ error: "Forbidden", message: "CareSync Assistant is only accessible by patients." });
      return;
    }

    const { message, conversationId, activeRoute, sessionHistory } = req.body;

    // 5. Input Validation
    if (!message || typeof message !== "string" || message.trim().length === 0) {
      res.status(400).json({ error: "Message string is required and cannot be empty." });
      return;
    }

    if (message.length > 500) {
      res.status(400).json({ error: "Message exceeds maximum allowed length (500 characters)." });
      return;
    }

    // 6. Identity Isolation: Server-derived patient ID (NEVER client-supplied)
    let patientId: number;
    let isDemoAccess = false;

    if (req.user) {
      const patient = store.patients.find((p) => p.userId === req.user!.userId);
      if (!patient) {
        res.status(403).json({ error: "Forbidden", message: "Authenticated user is not registered as a patient." });
        return;
      }
      patientId = patient.id; // Strictly server-derived from verified user
    } else {
      // In gated demo mode, locked strictly to designated demo patient (Rahul Sharma, patientId: 1)
      patientId = 1;
      isDemoAccess = true;
    }

    // 7. Intent Resolution
    const intent = resolveIntent(message);

    // 8. Scoped Context Assembly (using isolated patientId)
    const scopedContext = buildScopedContext(patientId, intent, activeRoute);

    // 9. Provider Execution (Resolved via Provider Factory: Deterministic vs Gemini)
    const provider = AssistantProviderFactory.getProvider();
    const rawResponse = await provider.generateResponse(
      message.trim(),
      scopedContext,
      intent,
      Array.isArray(sessionHistory) ? sessionHistory : []
    );

    // 10. Safety Layer Sanitization & Validation
    const sanitizedResponse = AssistantSafetyLayer.validateAndSanitize(rawResponse, scopedContext);

    // 11. Immutable Cryptographic Audit Log with clear demo identification & provider info
    store.logAudit({
      actorId: req.user ? req.user.userId : 1,
      actorRole: req.user ? req.user.role : "PATIENT",
      action: isDemoAccess ? "AI_PATIENT_ASSISTANT_DEMO_QUERY" : "AI_PATIENT_ASSISTANT_QUERY",
      entityType: "AI_ASSISTANT",
      patientId,
      result: "SUCCESS",
      metadata: {
        isDemoAccess,
        environment: process.env.NODE_ENV || "development",
        intent,
        provider: sanitizedResponse.provider || provider.name,
        fallbackReason: sanitizedResponse.fallbackReason,
        conversationId: conversationId || "session-default",
        sourcesCount: sanitizedResponse.sources.length,
      },
    });

    res.json(sanitizedResponse);
  } catch (error) {
    console.error("CareSync Assistant Processing Error:", error);
    res.status(500).json({
      error: "Assistant processing error",
      message: "Assistant temporarily unavailable. Your CareSync records are still available.",
      disclaimer: AI_DISCLAIMER,
    });
  }
});

// ============================================================================
// QUICK ACTION SUGGESTIONS FOR PATIENT ASSISTANT
// ============================================================================
router.get("/ai/assistant/quick-actions", (req, res) => {
  const isDemoFallbackAllowed =
    process.env.NODE_ENV === "development" && process.env.DEMO_MODE === "true";

  if (!req.user && !isDemoFallbackAllowed) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  if (req.user && req.user.role !== "PATIENT") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  res.json([
    { label: "Summarize my recent care", prompt: "Summarize my recent care journey and consultations." },
    { label: "What's next?", prompt: "What is my next appointment and what pending tasks do I have?" },
    { label: "Explain my latest report", prompt: "Explain my latest HbA1c and lipid panel report." },
    { label: "My active medications", prompt: "What medications are currently prescribed in my records?" },
    { label: "Find a doctor", prompt: "Help me find a doctor or specialist in the CareSync network." },
  ]);
});

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
