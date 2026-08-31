import { Router, type IRouter } from "express";
import { store } from "../lib/store";
import { requireAuth, requireRole } from "../middlewares/auth";

const router: IRouter = Router();

// ============================================================================
// LIST / SEARCH DOCTORS
// ============================================================================
router.get("/doctors", (_req, res) => {
  const doctors = store.doctors.map((doctor) => {
    return {
      id: doctor.id,
      name: doctor.fullName,
      specialization: doctor.specialization,
      qualification: doctor.qualification,
      experience: `${doctor.experienceYears} years`,
      organization: doctor.organization,
      location: doctor.location,
      fee: doctor.fee,
      rating: Number(doctor.rating),
      verified: doctor.verificationStatus === "VERIFIED",
      verificationStatus: doctor.verificationStatus,
      nextSlot: doctor.nextSlot || "Available Tomorrow",
      initials: doctor.initials || doctor.fullName.split(" ").map((w: string) => w[0]).join("").slice(0, 2),
      bio: doctor.bio,
    };
  });
  res.json(doctors);
});

// ============================================================================
// GET DOCTOR PROFILE & AVAILABILITY
// ============================================================================
router.get("/doctors/:id", (req, res) => {
  const doctorId = Number(req.params.id);
  const doctor = store.doctors.find((d) => d.id === doctorId);
  if (!doctor) {
    res.status(404).json({ error: "Doctor not found" });
    return;
  }

  const availability = store.doctorAvailability.filter((a) => a.doctorId === doctorId && a.isActive);

  res.json({
    id: doctor.id,
    name: doctor.fullName,
    specialization: doctor.specialization,
    qualification: doctor.qualification,
    licenseNumber: doctor.licenseNumber,
    experience: `${doctor.experienceYears} years`,
    organization: doctor.organization,
    location: doctor.location,
    fee: doctor.fee,
    rating: Number(doctor.rating),
    verified: doctor.verificationStatus === "VERIFIED",
    verificationStatus: doctor.verificationStatus,
    verificationDocuments: doctor.verificationDocuments,
    nextSlot: doctor.nextSlot,
    initials: doctor.initials,
    bio: doctor.bio,
    availability,
  });
});

// ============================================================================
// UPDATE DOCTOR AVAILABILITY
// ============================================================================
router.post("/doctors/:id/availability", requireAuth, requireRole(["DOCTOR", "ADMIN"]), (req, res) => {
  const doctorId = Number(req.params.id);
  const { dayOfWeek, startTime, endTime, slotDurationMinutes, mode } = req.body;

  const newSlot = {
    id: store.doctorAvailability.length + 1,
    doctorId,
    dayOfWeek: Number(dayOfWeek),
    startTime: startTime || "09:00",
    endTime: endTime || "17:00",
    slotDurationMinutes: Number(slotDurationMinutes) || 30,
    breakStartTime: "13:00",
    breakEndTime: "14:00",
    mode: mode || "BOTH",
    isActive: true,
  };

  store.doctorAvailability.push(newSlot as any);

  store.logAudit({
    actorId: req.user!.userId,
    actorRole: req.user!.role,
    action: "DOCTOR_AVAILABILITY_CONFIGURED",
    entityType: "DOCTOR_AVAILABILITY",
    entityId: newSlot.id,
    result: "SUCCESS",
    metadata: { doctorId, dayOfWeek, startTime, endTime },
  });

  res.status(201).json(newSlot);
});

// ============================================================================
// DOCTOR VERIFICATION WORKFLOW (DOCUMENT SUBMISSION & ADMIN APPROVAL)
// ============================================================================
router.post("/doctors/:id/verify", requireAuth, (req, res) => {
  const doctorId = Number(req.params.id);
  const doctor = store.doctors.find((d) => d.id === doctorId);
  if (!doctor) {
    res.status(404).json({ error: "Doctor not found" });
    return;
  }

  const { status, documentName } = req.body;

  if (req.user!.role === "ADMIN" && status) {
    doctor.verificationStatus = status;
    store.logAudit({
      actorId: req.user!.userId,
      actorRole: req.user!.role,
      action: "DOCTOR_CREDENTIAL_VERIFIED_BY_ADMIN",
      entityType: "DOCTOR",
      entityId: doctorId,
      result: "SUCCESS",
      metadata: { newStatus: status },
    });
  } else if (documentName) {
    doctor.verificationStatus = "UNDER_REVIEW";
    (doctor.verificationDocuments as any[]).push({
      name: documentName,
      uploadedAt: new Date().toISOString(),
      verified: false,
    });
    store.logAudit({
      actorId: req.user!.userId,
      actorRole: req.user!.role,
      action: "DOCTOR_VERIFICATION_DOCUMENT_UPLOADED",
      entityType: "DOCTOR",
      entityId: doctorId,
      result: "SUCCESS",
      metadata: { documentName },
    });
  }

  res.json({
    message: "Doctor verification status updated",
    verificationStatus: doctor.verificationStatus,
    documents: doctor.verificationDocuments,
  });
});

export default router;
