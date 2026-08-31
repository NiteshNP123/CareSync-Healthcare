import { Router, type IRouter } from "express";
import { store } from "../lib/store";
import { requireAuth, verifyPatientAccess } from "../middlewares/auth";

const router: IRouter = Router();

// ============================================================================
// LIST PRESCRIPTIONS
// ============================================================================
router.get("/prescriptions", requireAuth, (req, res) => {
  const patientIdQuery = req.query.patientId ? Number(req.query.patientId) : undefined;
  let list = store.prescriptions;

  if (patientIdQuery) {
    if (!verifyPatientAccess(req, res, patientIdQuery, "PRESCRIPTIONS")) return;
    list = list.filter((p) => p.patientId === patientIdQuery);
  } else if (req.user!.role === "PATIENT" && req.user!.patientId) {
    list = list.filter((p) => p.patientId === req.user!.patientId);
  } else if (req.user!.role === "DOCTOR" && req.user!.doctorId) {
    list = list.filter((p) => p.doctorId === req.user!.doctorId);
  }

  const result = list.map((rx) => {
    const doctor = store.doctors.find((d) => d.id === rx.doctorId);
    const patient = store.patients.find((p) => p.id === rx.patientId);
    const patientUser = patient ? store.users.find((u) => u.id === patient.userId) : null;
    const items = store.prescriptionItems.filter((i) => i.prescriptionId === rx.id);

    return {
      ...rx,
      doctorName: doctor?.fullName || "Dr. Rahul Mehta",
      doctorSpecialization: doctor?.specialization || "General Physician",
      doctorOrganization: doctor?.organization || "Northstar Medical Centre",
      patientName: patientUser?.fullName || "Rahul Sharma",
      careSyncId: patient?.careSyncId || "CS-2048-7392",
      items,
    };
  });

  res.json(result);
});

// ============================================================================
// GET SINGLE PRESCRIPTION
// ============================================================================
router.get("/prescriptions/:id", requireAuth, (req, res) => {
  const rxId = Number(req.params.id);
  const rx = store.prescriptions.find((p) => p.id === rxId);

  if (!rx) {
    res.status(404).json({ error: "Prescription not found" });
    return;
  }

  // Pharmacy staff can read prescriptions for fulfillment
  if (req.user!.role !== "PHARMACY_STAFF") {
    if (!verifyPatientAccess(req, res, rx.patientId, "PRESCRIPTIONS")) return;
  }

  const doctor = store.doctors.find((d) => d.id === rx.doctorId);
  const patient = store.patients.find((p) => p.id === rx.patientId);
  const patientUser = patient ? store.users.find((u) => u.id === patient.userId) : null;
  const items = store.prescriptionItems.filter((i) => i.prescriptionId === rx.id);

  res.json({
    ...rx,
    doctorName: doctor?.fullName,
    doctorSpecialization: doctor?.specialization,
    doctorOrganization: doctor?.organization,
    patientName: patientUser?.fullName,
    careSyncId: patient?.careSyncId,
    items,
  });
});

export default router;
