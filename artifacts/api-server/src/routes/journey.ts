import { Router, type IRouter } from "express";
import { store } from "../lib/store";
import { requireAuth, verifyPatientAccess } from "../middlewares/auth";

const router: IRouter = Router();

// ============================================================================
// GET CONNECTED HEALTHCARE JOURNEY TIMELINE
// ============================================================================
router.get("/patients/:id/journey", requireAuth, (req, res) => {
  const patientId = Number(req.params.id);
  if (!verifyPatientAccess(req, res, patientId, "JOURNEY")) return;

  const events = store.journeyEvents
    .filter((e) => e.patientId === patientId)
    .sort((a, b) => b.id - a.id);

  store.logAudit({
    actorId: req.user!.userId,
    actorRole: req.user!.role,
    action: "HEALTHCARE_JOURNEY_VIEWED",
    entityType: "HEALTHCARE_JOURNEY",
    patientId,
    result: "SUCCESS",
  });

  res.json(events);
});

// ============================================================================
// ADD CUSTOM JOURNEY EVENT (E.G. SYMPTOMS / NOTES / RECOVERY)
// ============================================================================
router.post("/patients/:id/journey/events", requireAuth, (req, res) => {
  const patientId = Number(req.params.id);
  if (!verifyPatientAccess(req, res, patientId, "JOURNEY")) return;

  const { title, eventType, provider, organization, description, accent, date } = req.body;

  if (!title || !description) {
    res.status(400).json({ error: "Title and description are required for journey events" });
    return;
  }

  const patient = store.patients.find((p) => p.id === patientId);
  const user = patient ? store.users.find((u) => u.id === patient.userId) : null;
  const todayFormatted = date || new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

  const newEvent = store.addJourneyEvent({
    patientId,
    eventType: eventType || "SYMPTOMS",
    sourceEntity: "manual",
    title,
    provider: provider || user?.fullName || "Patient Reported",
    organization: organization || "CareSync Journal",
    date: todayFormatted,
    status: "COMPLETED",
    description,
    accent: accent || "teal",
    metadata: req.body.metadata || {},
  });

  store.logAudit({
    actorId: req.user!.userId,
    actorRole: req.user!.role,
    action: "JOURNEY_EVENT_ADDED",
    entityType: "HEALTHCARE_JOURNEY_EVENT",
    entityId: newEvent.id,
    patientId,
    result: "SUCCESS",
    metadata: { title, eventType: newEvent.eventType },
  });

  res.status(201).json(newEvent);
});

export default router;
