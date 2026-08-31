import { Router, type IRouter } from "express";
import { store } from "../lib/store";
import { requireAuth, requireRole, verifyPatientAccess } from "../middlewares/auth";

const router: IRouter = Router();

// ============================================================================
// LIST CONSULTATIONS
// ============================================================================
router.get("/consultations", requireAuth, (req, res) => {
  const patientIdQuery = req.query.patientId ? Number(req.query.patientId) : undefined;
  let list = store.consultations;

  if (patientIdQuery) {
    if (!verifyPatientAccess(req, res, patientIdQuery, "CONSULTATIONS")) return;
    list = list.filter((c) => c.patientId === patientIdQuery);
  } else if (req.user!.role === "PATIENT" && req.user!.patientId) {
    list = list.filter((c) => c.patientId === req.user!.patientId);
  } else if (req.user!.role === "DOCTOR" && req.user!.doctorId) {
    list = list.filter((c) => c.doctorId === req.user!.doctorId);
  }

  const result = list.map((consult) => {
    const doctor = store.doctors.find((d) => d.id === consult.doctorId);
    const patient = store.patients.find((p) => p.id === consult.patientId);
    const patientUser = patient ? store.users.find((u) => u.id === patient.userId) : null;
    const rx = store.prescriptions.find((p) => p.consultationId === consult.id);
    const rxItems = rx ? store.prescriptionItems.filter((item) => item.prescriptionId === rx.id) : [];
    const tests = store.investigations.filter((i) => i.consultationId === consult.id);

    return {
      ...consult,
      doctorName: doctor?.fullName || "Dr. Rahul Mehta",
      doctorSpecialization: doctor?.specialization || "General Physician",
      doctorOrganization: doctor?.organization || "Northstar Medical Centre",
      patientName: patientUser?.fullName || "Rahul Sharma",
      careSyncId: patient?.careSyncId || "CS-2048-7392",
      prescription: rx ? { id: rx.id, status: rx.status, items: rxItems } : null,
      investigations: tests,
    };
  });

  res.json(result);
});

// ============================================================================
// GET SINGLE CONSULTATION WITH FULL RELATIONAL DETAILS
// ============================================================================
router.get("/consultations/:id", requireAuth, (req, res) => {
  const consultId = Number(req.params.id);
  const consult = store.consultations.find((c) => c.id === consultId);

  if (!consult) {
    res.status(404).json({ error: "Consultation record not found" });
    return;
  }

  if (!verifyPatientAccess(req, res, consult.patientId, "CONSULTATIONS")) return;

  const doctor = store.doctors.find((d) => d.id === consult.doctorId);
  const patient = store.patients.find((p) => p.id === consult.patientId);
  const patientUser = patient ? store.users.find((u) => u.id === patient.userId) : null;
  const rx = store.prescriptions.find((p) => p.consultationId === consult.id);
  const rxItems = rx ? store.prescriptionItems.filter((item) => item.prescriptionId === rx.id) : [];
  const tests = store.investigations.filter((i) => i.consultationId === consult.id);

  store.logAudit({
    actorId: req.user!.userId,
    actorRole: req.user!.role,
    action: "CONSULTATION_RECORD_VIEWED",
    entityType: "CONSULTATION",
    entityId: consultId,
    patientId: consult.patientId,
    result: "SUCCESS",
  });

  res.json({
    ...consult,
    doctorName: doctor?.fullName,
    doctorSpecialization: doctor?.specialization,
    doctorOrganization: doctor?.organization,
    patientName: patientUser?.fullName,
    careSyncId: patient?.careSyncId,
    prescription: rx ? { id: rx.id, status: rx.status, items: rxItems } : null,
    investigations: tests,
  });
});

// ============================================================================
// CREATE CLINICAL CONSULTATION (DOCTOR ONLY)
// ============================================================================
router.post("/consultations", requireAuth, requireRole(["DOCTOR"]), (req, res) => {
  const {
    patientId,
    appointmentId,
    symptoms,
    clinicalObservations,
    assessmentDiagnosis,
    treatmentPlan,
    followUpDate,
    followUpNotes,
    notes,
    prescriptions: medicinesInput,
    investigations: testsInput,
  } = req.body;

  if (!patientId || !symptoms || !assessmentDiagnosis || !treatmentPlan) {
    res.status(400).json({
      error: "Missing required clinical fields (patientId, symptoms, assessmentDiagnosis, treatmentPlan)",
    });
    return;
  }

  const doctorId = req.user!.doctorId || 1;
  const doctor = store.doctors.find((d) => d.id === doctorId);
  const patient = store.patients.find((p) => p.id === Number(patientId));

  if (!patient) {
    res.status(404).json({ error: "Patient record not found" });
    return;
  }

  const consultId = store.consultations.length + 1;
  const todayFormatted = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

  const newConsultation = {
    id: consultId,
    appointmentId: appointmentId ? Number(appointmentId) : null,
    patientId: Number(patientId),
    doctorId,
    symptoms,
    clinicalObservations: clinicalObservations || "",
    assessmentDiagnosis,
    treatmentPlan,
    followUpDate: followUpDate || null,
    followUpNotes: followUpNotes || null,
    notes: notes || "",
    createdAt: new Date(),
  };

  store.consultations.unshift(newConsultation as any);

  // 1. Create Prescription if provided
  let createdRx = null;
  if (Array.isArray(medicinesInput) && medicinesInput.length > 0) {
    const rxId = store.prescriptions.length + 1;
    const newRx = {
      id: rxId,
      consultationId: consultId,
      patientId: Number(patientId),
      doctorId,
      status: "ACTIVE",
      generalInstructions: "Follow prescribed instructions. Maintain adequate hydration.",
      createdAt: new Date(),
    };
    store.prescriptions.unshift(newRx as any);

    const items = medicinesInput.map((med: any) => {
      const itemId = store.prescriptionItems.length + 1;
      const item = {
        id: itemId,
        prescriptionId: rxId,
        medicineName: med.name || med.medicineName,
        dosage: med.dosage || "As directed",
        frequency: med.frequency || "Once daily",
        duration: med.duration || "14 days",
        instructions: med.instructions || "Take after meals",
      };
      store.prescriptionItems.push(item as any);
      return item;
    });

    createdRx = { ...newRx, items };

    // Auto-create Journey Event for Medication
    store.addJourneyEvent({
      patientId: Number(patientId),
      eventType: "TREATMENT",
      sourceEntity: "prescription",
      sourceEntityId: rxId,
      title: "Prescription Issued",
      provider: doctor?.fullName || "Consulting Doctor",
      organization: doctor?.organization || "CareSync Clinic",
      date: todayFormatted,
      status: "COMPLETED",
      description: `Prescribed ${items.map((i) => i.medicineName).join(", ")}.`,
      accent: "amber",
      metadata: { prescriptionId: rxId, consultationId: consultId },
    });
  }

  // 2. Create Diagnostic Investigations if provided
  const createdInvestigations = [];
  if (Array.isArray(testsInput) && testsInput.length > 0) {
    for (const test of testsInput) {
      const invId = store.investigations.length + 1;
      const newInv = {
        id: invId,
        consultationId: consultId,
        patientId: Number(patientId),
        doctorId,
        testName: test.testName || test.name || "Diagnostic Panel",
        category: test.category || "BLOOD",
        reason: test.reason || assessmentDiagnosis,
        priority: test.priority || "ROUTINE",
        instructions: test.instructions || "Overnight fasting required",
        status: "ORDERED",
        assignedLabId: 1, // ABC Diagnostics
        createdAt: new Date(),
      };
      store.investigations.unshift(newInv as any);
      createdInvestigations.push(newInv);

      // Auto-create Journey Event for Diagnostic Test Order
      store.addJourneyEvent({
        patientId: Number(patientId),
        eventType: "INVESTIGATION",
        sourceEntity: "investigation",
        sourceEntityId: invId,
        title: `Diagnostic Test Ordered: ${newInv.testName}`,
        provider: doctor?.fullName || "Consulting Doctor",
        organization: "ABC Diagnostics",
        date: todayFormatted,
        status: "UPCOMING",
        description: `Doctor requested ${newInv.testName}. Reason: ${newInv.reason}`,
        accent: "violet",
        metadata: { investigationId: invId, consultationId: consultId },
      });
    }
  }

  // 3. Create Main Journey Event for Consultation
  store.addJourneyEvent({
    patientId: Number(patientId),
    eventType: "CONSULTATION",
    sourceEntity: "consultation",
    sourceEntityId: consultId,
    title: "Clinical Consultation",
    provider: doctor?.fullName || "Consulting Doctor",
    organization: doctor?.organization || "CareSync Health",
    date: todayFormatted,
    status: "COMPLETED",
    description: `Diagnosis: ${assessmentDiagnosis}. Treatment Plan: ${treatmentPlan}`,
    accent: "rose",
    metadata: { consultationId: consultId, doctorId },
  });

  // 4. Send Patient Notification
  store.createNotification(
    patient.userId,
    "New Consultation Summary Available",
    `${doctor?.fullName} has completed your consultation summary and updated your care journey.`,
    "APPOINTMENT_UPDATE",
    "/app/journey"
  );

  // 5. Update Appointment status if linked
  if (appointmentId) {
    const appt = store.appointments.find((a) => a.id === Number(appointmentId));
    if (appt) {
      appt.status = "COMPLETED";
    }
  }

  // 6. Audit Log
  store.logAudit({
    actorId: req.user!.userId,
    actorRole: "DOCTOR",
    action: "CONSULTATION_CREATED",
    entityType: "CONSULTATION",
    entityId: consultId,
    patientId: Number(patientId),
    result: "SUCCESS",
    metadata: { assessmentDiagnosis, doctorId },
  });

  res.status(201).json({
    message: "Consultation successfully saved and journey updated",
    consultation: newConsultation,
    prescription: createdRx,
    investigations: createdInvestigations,
  });
});

export default router;
