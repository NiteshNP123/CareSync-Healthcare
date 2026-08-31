import { Router, type IRouter } from "express";
import { store } from "../lib/store";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

// ============================================================================
// LIST ACCESS REQUESTS & ACTIVE CONSENTS
// ============================================================================
router.get("/access-requests", requireAuth, (req, res) => {
  let requests = store.accessRequests;

  if (req.user!.role === "PATIENT" && req.user!.patientId) {
    requests = requests.filter((r) => r.patientId === req.user!.patientId);
  } else if (req.user!.role === "DOCTOR" && req.user!.doctorId) {
    requests = requests.filter((r) => r.requesterDoctorId === req.user!.doctorId);
  }

  const result = requests.map((reqItem) => {
    const doctor = store.doctors.find((d) => d.id === reqItem.requesterDoctorId);
    const patient = store.patients.find((p) => p.id === reqItem.patientId);
    const patientUser = patient ? store.users.find((u) => u.id === patient.userId) : null;

    return {
      id: reqItem.id,
      patientId: reqItem.patientId,
      patientName: patientUser?.fullName || "Rahul Sharma",
      careSyncId: patient?.careSyncId || "CS-2048-7392",
      doctorId: reqItem.requesterDoctorId,
      doctorName: doctor?.fullName || "Dr. Ananya Sharma",
      specialization: doctor?.specialization || "Cardiology",
      organization: doctor?.organization || "Aster Grove Clinic",
      purpose: reqItem.purpose,
      dataScopes: reqItem.dataScopes,
      status: reqItem.status,
      requestedAt: reqItem.requestedAt ? new Date(reqItem.requestedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "Today",
      otpCode: reqItem.otpCode, // Available in demo mode
    };
  });

  res.json(result);
});

// ============================================================================
// DOCTOR SEARCH PATIENT BY CARESYNC ID
// ============================================================================
router.get("/patients/lookup/:careSyncId", requireAuth, (req, res) => {
  const { careSyncId } = req.params;
  const lookupString = (Array.isArray(careSyncId) ? careSyncId[0] : careSyncId || "").trim().toUpperCase();
  const patient = store.patients.find(
    (p) => p.careSyncId.toUpperCase() === lookupString
  );

  if (!patient) {
    res.status(404).json({ error: "No patient found with this CareSync ID" });
    return;
  }

  const user = store.users.find((u) => u.id === patient.userId);
  const doctorId = req.user!.doctorId || 1;
  const hasAccess = store.hasConsent(patient.id, doctorId);

  // Redacted preview - doctor sees minimal identity until consent is granted
  res.json({
    patientId: patient.id,
    careSyncId: patient.careSyncId,
    initials: user?.fullName ? user.fullName.split(" ").map((w) => w[0]).join("").slice(0, 2) : "RS",
    gender: patient.gender,
    idStatus: patient.idStatus,
    hasActiveConsent: hasAccess,
  });
});

// ============================================================================
// DOCTOR REQUESTS ACCESS TO PATIENT
// ============================================================================
router.post("/access-requests", requireAuth, (req, res) => {
  const { careSyncId, purpose, dataScopes } = req.body;

  if (!careSyncId || !purpose) {
    res.status(400).json({ error: "CareSync ID and clinical purpose statement are required" });
    return;
  }

  const patient = store.patients.find(
    (p) => p.careSyncId.toUpperCase() === String(careSyncId).trim().toUpperCase()
  );

  if (!patient) {
    res.status(404).json({ error: "Patient not found with this CareSync ID" });
    return;
  }

  const doctorId = req.user!.doctorId || 1;
  const doctor = store.doctors.find((d) => d.id === doctorId);

  const reqId = store.accessRequests.length + 1;
  const defaultScopes = ["CONSULTATIONS", "PRESCRIPTIONS", "LAB_REPORTS", "JOURNEY", "VITALS"];
  const scopes = Array.isArray(dataScopes) && dataScopes.length > 0 ? dataScopes : defaultScopes;

  // Generate secure OTP
  const randomOtp = Math.floor(100000 + Math.random() * 900000).toString();

  const newRequest = {
    id: reqId,
    patientId: patient.id,
    requesterDoctorId: doctorId,
    purpose,
    dataScopes: scopes,
    status: "PENDING",
    otpCode: randomOtp,
    otpExpiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 mins
    requestedAt: new Date(),
    respondedAt: null,
  };

  store.accessRequests.unshift(newRequest as any);

  // Notify Patient
  store.createNotification(
    patient.userId,
    "Doctor Access Request",
    `${doctor?.fullName} (${doctor?.specialization}) has requested access to your care records for: "${purpose}".`,
    "ACCESS_REQUEST",
    "/app/consent"
  );

  store.logAudit({
    actorId: req.user!.userId,
    actorRole: "DOCTOR",
    action: "ACCESS_REQUEST_INITIATED",
    entityType: "ACCESS_REQUEST",
    entityId: reqId,
    patientId: patient.id,
    result: "SUCCESS",
    metadata: { doctorId, purpose, scopes },
  });

  res.status(201).json({
    message: "Access request created and sent to patient",
    request: {
      ...newRequest,
      doctorName: doctor?.fullName,
      specialization: doctor?.specialization,
      organization: doctor?.organization,
    },
  });
});

// ============================================================================
// VERIFY OTP & DECIDE ACCESS REQUEST (PATIENT)
// ============================================================================
router.post("/access-requests/:id/decision", requireAuth, (req, res) => {
  const reqId = Number(req.params.id);
  const { decision, selectedScopes, otp } = req.body;

  const accessReq = store.accessRequests.find((r) => r.id === reqId);
  if (!accessReq) {
    res.status(404).json({ error: "Access request not found" });
    return;
  }

  const doctor = store.doctors.find((d) => d.id === accessReq.requesterDoctorId);

  if (decision === "ALLOW") {
    // Check OTP if provided
    if (otp && accessReq.otpCode && String(otp).trim() !== accessReq.otpCode.trim()) {
      res.status(400).json({ error: "Invalid OTP entered. Please verify the code." });
      return;
    }

    accessReq.status = "ALLOWED";
    accessReq.respondedAt = new Date();

    const grantedScopes = Array.isArray(selectedScopes) && selectedScopes.length > 0
      ? selectedScopes
      : accessReq.dataScopes;

    // Create or update Consent Record
    const existingConsent = store.consentRecords.find(
      (c) => c.patientId === accessReq.patientId && c.doctorId === accessReq.requesterDoctorId
    );

    if (existingConsent) {
      existingConsent.status = "ACTIVE";
      existingConsent.grantedScopes = grantedScopes;
      existingConsent.grantedAt = new Date();
      (existingConsent as any).revokedAt = null;
    } else {
      store.consentRecords.push({
        id: store.consentRecords.length + 1,
        patientId: accessReq.patientId,
        doctorId: accessReq.requesterDoctorId,
        grantedScopes,
        status: "ACTIVE",
        grantedAt: new Date(),
        expiresAt: new Date(Date.now() + 365 * 86400 * 1000), // 1 year
        revokedAt: null,
      } as any);
    }

    store.logAudit({
      actorId: req.user!.userId,
      actorRole: "PATIENT",
      action: "CONSENT_GRANTED",
      entityType: "CONSENT_RECORD",
      entityId: accessReq.id,
      patientId: accessReq.patientId,
      result: "SUCCESS",
      metadata: { doctorId: accessReq.requesterDoctorId, grantedScopes },
    });

    if (doctor) {
      store.createNotification(
        doctor.userId,
        "Patient Granted Care Access",
        `Patient has granted authorized access to their requested health records.`,
        "ACCESS_REQUEST",
        "/app"
      );
    }
  } else {
    accessReq.status = "DENIED";
    accessReq.respondedAt = new Date();

    store.logAudit({
      actorId: req.user!.userId,
      actorRole: "PATIENT",
      action: "CONSENT_DENIED",
      entityType: "ACCESS_REQUEST",
      entityId: accessReq.id,
      patientId: accessReq.patientId,
      result: "DENIED",
      metadata: { doctorId: accessReq.requesterDoctorId },
    });
  }

  res.json({
    message: `Access request ${decision.toLowerCase()}ed`,
    request: accessReq,
  });
});

// ============================================================================
// REVOKE CONSENT (PATIENT)
// ============================================================================
router.post("/consent-records/:id/revoke", requireAuth, (req, res) => {
  const consentId = Number(req.params.id);
  const consent = store.consentRecords.find((c) => c.id === consentId);

  if (!consent) {
    res.status(404).json({ error: "Consent record not found" });
    return;
  }

  consent.status = "REVOKED";
  (consent as any).revokedAt = new Date();

  store.logAudit({
    actorId: req.user!.userId,
    actorRole: "PATIENT",
    action: "CONSENT_REVOKED",
    entityType: "CONSENT_RECORD",
    entityId: consentId,
    patientId: consent.patientId,
    result: "SUCCESS",
    metadata: { doctorId: consent.doctorId },
  });

  res.json({ message: "Consent has been revoked successfully", consent });
});

export default router;
