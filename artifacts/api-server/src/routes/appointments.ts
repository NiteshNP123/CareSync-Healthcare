import { Router, type IRouter } from "express";
import { store } from "../lib/store";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

// ============================================================================
// LIST APPOINTMENTS (FILTERED BY ROLE CONTEXT)
// ============================================================================
router.get("/appointments", requireAuth, (req, res) => {
  let appointments = store.appointments;

  if (req.user!.role === "PATIENT" && req.user!.patientId) {
    appointments = appointments.filter((a) => a.patientId === req.user!.patientId);
  } else if (req.user!.role === "DOCTOR" && req.user!.doctorId) {
    appointments = appointments.filter(
      (a) => a.doctorId === req.user!.doctorId || a.bookedByDoctorId === req.user!.doctorId
    );
  }

  const result = appointments.map((appt) => {
    const doctor = store.doctors.find((d) => d.id === appt.doctorId);
    const patient = store.patients.find((p) => p.id === appt.patientId);
    const patientUser = patient ? store.users.find((u) => u.id === patient.userId) : null;
    const referringDoctor = appt.bookedByDoctorId ? store.doctors.find((d) => d.id === appt.bookedByDoctorId) : null;

    return {
      id: appt.id,
      patientId: appt.patientId,
      patientName: patientUser?.fullName || "Rahul Sharma",
      careSyncId: patient?.careSyncId || "CS-2048-7392",
      doctorId: appt.doctorId,
      doctorName: doctor?.fullName || "Dr. Rahul Mehta",
      specialization: doctor?.specialization || "General Physician",
      organization: doctor?.organization || "Northstar Medical Centre",
      bookedByDoctorId: appt.bookedByDoctorId,
      referringDoctorName: referringDoctor?.fullName || null,
      appointmentType: appt.appointmentType,
      date: appt.date,
      time: appt.time,
      mode: appt.mode,
      status: appt.status,
      fee: appt.fee,
      reason: appt.reason,
      notes: appt.notes,
    };
  });

  res.json(result);
});

// ============================================================================
// BOOK APPOINTMENT (PATIENT-TO-DOCTOR OR DOCTOR-TO-DOCTOR)
// ============================================================================
router.post("/appointments", requireAuth, (req, res) => {
  const { doctorId, date, time, mode, reason, patientId: targetPatientId, appointmentType, bookedByDoctorId } = req.body;

  if (!doctorId || !date || !time) {
    res.status(400).json({ error: "Missing required booking details (doctorId, date, time)" });
    return;
  }

  const doctor = store.doctors.find((d) => d.id === Number(doctorId));
  if (!doctor) {
    res.status(404).json({ error: "Doctor not found" });
    return;
  }

  // Determine Patient ID
  let patientId = req.user!.patientId;
  if (!patientId && targetPatientId) {
    patientId = Number(targetPatientId);
  }
  if (!patientId) {
    patientId = 1; // Default to primary demo patient
  }

  // Backend Double Booking Prevention
  const existingConflict = store.appointments.find(
    (a) =>
      a.doctorId === Number(doctorId) &&
      a.date === date &&
      a.time === time &&
      a.status !== "CANCELLED"
  );

  if (existingConflict) {
    res.status(409).json({
      error: "Slot already booked",
      message: "The requested time slot has just been reserved. Please select an alternate slot.",
    });
    return;
  }

  const apptId = store.appointments.length + 1;
  const newAppointment = {
    id: apptId,
    patientId,
    doctorId: Number(doctorId),
    bookedByDoctorId: bookedByDoctorId ? Number(bookedByDoctorId) : (req.user!.role === "DOCTOR" ? req.user!.doctorId || null : null),
    appointmentType: appointmentType || (req.user!.role === "DOCTOR" ? "DOCTOR_TO_DOCTOR" : "PATIENT_TO_DOCTOR"),
    date,
    time,
    mode: mode || "Video consultation",
    status: "CONFIRMED",
    fee: doctor.fee,
    reason: reason || (appointmentType === "DOCTOR_TO_DOCTOR" ? "Specialist Clinical Referral Consultation" : "Routine Care Consultation"),
    notes: "Appointment confirmed in CareSync system.",
    createdAt: new Date(),
  };

  store.appointments.unshift(newAppointment as any);

  // Link to Healthcare Journey
  store.addJourneyEvent({
    patientId,
    eventType: "APPOINTMENT",
    sourceEntity: "appointment",
    sourceEntityId: apptId,
    title: `${newAppointment.mode} Scheduled`,
    provider: doctor.fullName,
    organization: doctor.organization,
    date,
    status: "UPCOMING",
    description: `Confirmed ${newAppointment.mode.toLowerCase()} appointment with ${doctor.fullName} (${doctor.specialization}) at ${time}.`,
    accent: "teal",
    metadata: { appointmentId: apptId, doctorId: doctor.id, time, mode: newAppointment.mode },
  });

  // Audit Log
  store.logAudit({
    actorId: req.user!.userId,
    actorRole: req.user!.role,
    action: "APPOINTMENT_BOOKED",
    entityType: "APPOINTMENT",
    entityId: apptId,
    patientId,
    result: "SUCCESS",
    metadata: { doctorId: doctor.id, date, time, type: newAppointment.appointmentType },
  });

  res.status(201).json(newAppointment);
});

// ============================================================================
// UPDATE APPOINTMENT STATUS
// ============================================================================
router.patch("/appointments/:id/status", requireAuth, (req, res) => {
  const apptId = Number(req.params.id);
  const { status } = req.body;

  const appt = store.appointments.find((a) => a.id === apptId);
  if (!appt) {
    res.status(404).json({ error: "Appointment not found" });
    return;
  }

  appt.status = status;

  store.logAudit({
    actorId: req.user!.userId,
    actorRole: req.user!.role,
    action: "APPOINTMENT_STATUS_UPDATED",
    entityType: "APPOINTMENT",
    entityId: apptId,
    patientId: appt.patientId,
    result: "SUCCESS",
    metadata: { newStatus: status },
  });

  res.json({ message: "Status updated successfully", appointment: appt });
});

export default router;
