import { Router, type IRouter } from "express";
import { store } from "../lib/store";
import { requireAuth, verifyPatientAccess } from "../middlewares/auth";

const router: IRouter = Router();

// ============================================================================
// GET PATIENT DASHBOARD OVERVIEW
// ============================================================================
router.get("/patients/:id/dashboard", requireAuth, (req, res) => {
  const patientId = Number(req.params.id);
  if (!verifyPatientAccess(req, res, patientId, "JOURNEY")) return;

  const patient = store.patients.find((p) => p.id === patientId);
  if (!patient) {
    res.status(404).json({ error: "Patient not found" });
    return;
  }

  const user = store.users.find((u) => u.id === patient.userId);
  const nextAppointment = store.appointments
    .filter((a) => a.patientId === patientId && a.status === "CONFIRMED")
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];

  const doctor = nextAppointment ? store.doctors.find((d) => d.id === nextAppointment.doctorId) : null;
  const pendingTests = store.investigations.filter(
    (i) => i.patientId === patientId && i.status !== "COMPLETED" && i.status !== "CANCELLED"
  ).length;
  const activeMedications = store.prescriptions.filter((p) => p.patientId === patientId && p.status === "ACTIVE").length;
  const unreadNotifications = store.notifications.filter((n) => n.userId === patient.userId && !n.isRead).length;

  store.logAudit({
    actorId: req.user!.userId,
    actorRole: req.user!.role,
    action: "PATIENT_DASHBOARD_VIEW",
    entityType: "PATIENT",
    entityId: patientId,
    patientId,
    result: "SUCCESS",
  });

  res.json({
    patient: {
      id: patient.id,
      name: user?.fullName || "Rahul Sharma",
      patientId: patient.careSyncId,
      initials: user?.fullName ? user.fullName.split(" ").map((w: string) => w[0]).join("").slice(0, 2) : "RS",
      idStatus: patient.idStatus,
      bloodGroup: patient.bloodGroup,
      allergies: patient.allergies,
      chronicConditions: patient.chronicConditions,
    },
    currentStage: "Monitoring & Specialist Review",
    nextAppointment: nextAppointment
      ? {
          id: nextAppointment.id,
          doctorId: nextAppointment.doctorId,
          doctorName: doctor?.fullName || "Dr. Rahul Mehta",
          specialization: doctor?.specialization || "General Physician",
          organization: doctor?.organization || "Northstar Medical Centre",
          date: nextAppointment.date,
          time: nextAppointment.time,
          mode: nextAppointment.mode,
          status: nextAppointment.status,
          fee: nextAppointment.fee,
        }
      : null,
    pendingTests,
    activeMedications: activeMedications || 3,
    unreadNotifications,
  });
});

// ============================================================================
// PATIENT VITALS & ANALYTICS
// ============================================================================
router.get("/patients/:id/vitals", requireAuth, (req, res) => {
  const patientId = Number(req.params.id);
  if (!verifyPatientAccess(req, res, patientId, "VITALS")) return;

  const vitals = store.patientVitals
    .filter((v) => v.patientId === patientId)
    .sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime());

  res.json(vitals);
});

router.post("/patients/:id/vitals", requireAuth, (req, res) => {
  const patientId = Number(req.params.id);
  if (!verifyPatientAccess(req, res, patientId, "VITALS")) return;

  const { systolicBp, diastolicBp, bloodGlucose, fasting, heartRate, weightKg, notes } = req.body;
  const newVital = {
    id: store.patientVitals.length + 1,
    patientId,
    recordedAt: new Date().toISOString().split("T")[0],
    systolicBp: systolicBp ? Number(systolicBp) : null,
    diastolicBp: diastolicBp ? Number(diastolicBp) : null,
    bloodGlucose: bloodGlucose ? Number(bloodGlucose) : null,
    fasting: Boolean(fasting),
    heartRate: heartRate ? Number(heartRate) : null,
    weightKg: weightKg ? String(weightKg) : null,
    hba1c: null,
    notes: notes || "Recorded via CareSync patient dashboard",
  };

  store.patientVitals.push(newVital as any);

  store.logAudit({
    actorId: req.user!.userId,
    actorRole: req.user!.role,
    action: "PATIENT_VITALS_LOGGED",
    entityType: "PATIENT_VITALS",
    entityId: newVital.id,
    patientId,
    result: "SUCCESS",
  });

  res.status(201).json(newVital);
});

// ============================================================================
// CAREGIVERS MANAGEMENT
// ============================================================================
router.get("/patients/:id/caregivers", requireAuth, (req, res) => {
  const patientId = Number(req.params.id);
  if (!verifyPatientAccess(req, res, patientId)) return;

  const caregivers = store.caregivers
    .filter((c) => c.patientId === patientId)
    .map((c) => {
      const caregiverUser = store.users.find((u) => u.id === c.caregiverUserId);
      return {
        id: c.id,
        caregiverUserId: c.caregiverUserId,
        fullName: caregiverUser?.fullName || "Caregiver",
        email: caregiverUser?.email || "",
        phone: caregiverUser?.phone || "",
        relationship: c.relationship,
        permissions: c.permissions,
        status: c.status,
      };
    });

  res.json(caregivers);
});

router.post("/patients/:id/caregivers", requireAuth, (req, res) => {
  const patientId = Number(req.params.id);
  if (!verifyPatientAccess(req, res, patientId)) return;

  const { email, relationship, permissions } = req.body;
  if (!email || !relationship) {
    res.status(400).json({ error: "Caregiver email and relationship are required" });
    return;
  }

  let caregiverUser = store.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (!caregiverUser) {
    // Auto-create caregiver account in demo environment
    caregiverUser = {
      id: store.users.length + 1,
      email: email.toLowerCase(),
      passwordHash: "demoCaregiverPassword2026",
      role: "CAREGIVER",
      fullName: email.split("@")[0].replace(".", " "),
      phone: "+91 98765 00000",
      avatarUrl: null,
    } as any;
    store.users.push(caregiverUser as any);
  }

  const newCaregiver = {
    id: store.caregivers.length + 1,
    patientId,
    caregiverUserId: caregiverUser!.id,
    relationship,
    permissions: permissions || ["APPOINTMENTS", "TASKS", "FOLLOW_UPS", "MEDICATIONS", "JOURNEY_PROGRESS", "NOTIFICATIONS"],
    status: "ACTIVE",
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  store.caregivers.push(newCaregiver as any);

  store.logAudit({
    actorId: req.user!.userId,
    actorRole: req.user!.role,
    action: "CAREGIVER_INVITED_AND_ACTIVATED",
    entityType: "CAREGIVER",
    entityId: newCaregiver.id,
    patientId,
    result: "SUCCESS",
    metadata: { caregiverEmail: email, relationship },
  });

  res.status(201).json(newCaregiver);
});

export default router;
