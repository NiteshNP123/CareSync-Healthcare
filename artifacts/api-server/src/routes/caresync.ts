import { Router, type IRouter } from "express";
import {
  CreateCareSyncAppointmentBody,
  DecideAccessRequestBody,
  DecideAccessRequestParams,
  GetCareSyncAiSummaryResponse,
  GetCareSyncDashboardResponse,
  GetCareSyncJourneyResponse,
  ListAccessRequestsResponse,
  ListCareSyncAppointmentsResponse,
  ListCareSyncDoctorsResponse,
  ListPharmacyOrdersResponse,
} from "@workspace/api-zod";
import { store } from "../lib/store";

const router: IRouter = Router();

// ============================================================================
// BACKWARD COMPATIBLE CARESYNC DASHBOARD ENDPOINT
// ============================================================================
router.get("/caresync/dashboard", (_req, res) => {
  const patient = store.patients[0];
  const user = store.users.find((u) => u.id === patient.userId);
  const nextAppointment = store.appointments
    .filter((a) => a.patientId === patient.id && a.status === "CONFIRMED")
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];
  const doctor = nextAppointment ? store.doctors.find((d) => d.id === nextAppointment.doctorId) : null;

  res.json(
    GetCareSyncDashboardResponse.parse({
      patient: {
        id: patient.id,
        name: user?.fullName || "Rahul Sharma",
        patientId: patient.careSyncId,
        initials: user?.fullName ? user.fullName.split(" ").map((w: string) => w[0]).join("").slice(0, 2) : "RS",
        idStatus: patient.idStatus,
      },
      currentStage: "Monitoring & Specialist Review",
      nextAppointment: nextAppointment
        ? {
            id: nextAppointment.id,
            doctorName: doctor?.fullName || "Dr. Rahul Mehta",
            specialization: doctor?.specialization || "General Physician",
            date: nextAppointment.date,
            time: nextAppointment.time,
            mode: nextAppointment.mode,
            status: nextAppointment.status,
            fee: nextAppointment.fee,
          }
        : {
            id: 1,
            doctorName: "Dr. Rahul Mehta",
            specialization: "General Physician",
            date: "28 Aug 2026",
            time: "4:30 PM",
            mode: "Video consultation",
            status: "Confirmed",
            fee: 850,
          },
      pendingTests: store.investigations.filter((i) => i.status !== "COMPLETED").length || 1,
      activeMedications: store.prescriptions.filter((p) => p.status === "ACTIVE").length || 2,
      unreadNotifications: store.notifications.filter((n) => !n.isRead).length || 3,
    }),
  );
});

// ============================================================================
// BACKWARD COMPATIBLE JOURNEY
// ============================================================================
router.get("/caresync/journey", (_req, res) => {
  const journey = store.journeyEvents
    .filter((e) => e.patientId === 1)
    .map((e) => ({
      id: e.id,
      title: e.title,
      type: e.eventType,
      status: e.status,
      date: e.date,
      provider: e.provider,
      organization: e.organization,
      description: e.description,
      accent: e.accent,
    }));

  res.json(GetCareSyncJourneyResponse.parse(journey));
});

// ============================================================================
// BACKWARD COMPATIBLE DOCTORS
// ============================================================================
router.get("/caresync/doctors", (_req, res) => {
  const doctors = store.doctors.map((d) => ({
    id: d.id,
    name: d.fullName,
    specialization: d.specialization,
    organization: d.organization,
    location: d.location,
    experience: `${d.experienceYears} years`,
    rating: Number(d.rating),
    fee: d.fee,
    verified: d.verificationStatus === "VERIFIED",
    nextSlot: d.nextSlot || "Tomorrow, 10:00 AM",
    initials: d.initials || "DR",
  }));

  res.json(ListCareSyncDoctorsResponse.parse(doctors));
});

// ============================================================================
// BACKWARD COMPATIBLE ACCESS REQUESTS
// ============================================================================
router.get("/caresync/access-requests", (_req, res) => {
  const requests = store.accessRequests.map((r) => {
    const doctor = store.doctors.find((d) => d.id === r.requesterDoctorId);
    return {
      id: r.id,
      doctorName: doctor?.fullName || "Dr. Ananya Sharma",
      specialization: doctor?.specialization || "Cardiology",
      organization: doctor?.organization || "Aster Grove Clinic",
      purpose: r.purpose,
      requestedAt: r.requestedAt ? new Date(r.requestedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "Today",
      status: r.status === "ALLOWED" ? "Allowed" : r.status === "DENIED" ? "Denied" : "Pending",
      dataScopes: r.dataScopes as string[],
    };
  });

  res.json(ListAccessRequestsResponse.parse(requests));
});

router.post("/caresync/access-requests/:id/decision", (req, res) => {
  const params = DecideAccessRequestParams.parse(req.params);
  const body = DecideAccessRequestBody.parse(req.body);
  const request = store.accessRequests.find((item) => item.id === params.id);
  if (!request) {
    res.status(404).json({ error: "Access request not found" });
    return;
  }
  request.status = body.decision === "ALLOW" ? "ALLOWED" : "DENIED";
  request.respondedAt = new Date();

  if (body.decision === "ALLOW") {
    store.consentRecords.push({
      id: store.consentRecords.length + 1,
      patientId: request.patientId,
      doctorId: request.requesterDoctorId,
      grantedScopes: request.dataScopes,
      status: "ACTIVE",
      grantedAt: new Date(),
      expiresAt: new Date(Date.now() + 365 * 86400 * 1000),
      revokedAt: null,
    } as any);
  }

  const doctor = store.doctors.find((d) => d.id === request.requesterDoctorId);
  res.json({
    id: request.id,
    doctorName: doctor?.fullName || "Doctor",
    specialization: doctor?.specialization || "Specialist",
    organization: doctor?.organization || "Clinic",
    purpose: request.purpose,
    requestedAt: "Today",
    status: request.status === "ALLOWED" ? "Allowed" : "Denied",
    dataScopes: request.dataScopes,
  });
});

// ============================================================================
// BACKWARD COMPATIBLE APPOINTMENTS
// ============================================================================
router.get("/caresync/appointments", (_req, res) => {
  const list = store.appointments.map((a) => {
    const doctor = store.doctors.find((d) => d.id === a.doctorId);
    return {
      id: a.id,
      doctorName: doctor?.fullName || "Dr. Rahul Mehta",
      specialization: doctor?.specialization || "General Physician",
      date: a.date,
      time: a.time,
      mode: a.mode,
      status: a.status,
      fee: a.fee,
    };
  });

  res.json(ListCareSyncAppointmentsResponse.parse(list));
});

router.post("/caresync/appointments", (req, res) => {
  const body = CreateCareSyncAppointmentBody.parse(req.body);
  const doctor = store.doctors.find((item) => item.id === body.doctorId);
  if (!doctor) {
    res.status(404).json({ error: "Doctor not found" });
    return;
  }

  const appointmentId = store.appointments.length + 1;
  const newAppointment = {
    id: appointmentId,
    patientId: 1,
    doctorId: doctor.id,
    bookedByDoctorId: null,
    appointmentType: "PATIENT_TO_DOCTOR",
    date: body.date,
    time: body.time,
    mode: body.mode,
    status: "Confirmed",
    fee: doctor.fee,
    reason: "Clinical Care Consultation",
    notes: "Appointment booked via CareSync.",
    createdAt: new Date(),
  };

  store.appointments.unshift(newAppointment as any);

  store.addJourneyEvent({
    patientId: 1,
    eventType: "APPOINTMENT",
    sourceEntity: "appointment",
    sourceEntityId: appointmentId,
    title: `${body.mode} Scheduled`,
    provider: doctor.fullName,
    organization: doctor.organization,
    date: body.date,
    status: "UPCOMING",
    description: `Confirmed ${body.mode.toLowerCase()} appointment with ${doctor.fullName} (${doctor.specialization}) at ${body.time}.`,
    accent: "teal",
  });

  res.status(201).json({
    id: newAppointment.id,
    doctorName: doctor.fullName,
    specialization: doctor.specialization,
    date: newAppointment.date,
    time: newAppointment.time,
    mode: newAppointment.mode,
    status: "Confirmed",
    fee: newAppointment.fee,
  });
});

// ============================================================================
// BACKWARD COMPATIBLE PHARMACY ORDERS
// ============================================================================
router.get("/caresync/pharmacy-orders", (_req, res) => {
  const list = store.pharmacyOrders.map((o) => {
    const pharmacy = store.organizations.find((org) => org.id === o.pharmacyId);
    const items = store.pharmacyOrderItems.filter((i) => i.orderId === o.id);
    return {
      id: o.orderNumber,
      pharmacy: pharmacy?.name || "XYZ Pharmacy",
      itemCount: items.length || 3,
      amount: Number(o.totalAmount),
      status: o.status,
      updatedAt: "Updated recently",
    };
  });

  res.json(ListPharmacyOrdersResponse.parse(list));
});

// ============================================================================
// BACKWARD COMPATIBLE AI SUMMARY
// ============================================================================
router.get("/caresync/ai-summary", (req, res) => {
  const patientId = req.user?.patientId || 1;
  const nextAppt = store.appointments.find((a) => a.patientId === patientId && a.status === "CONFIRMED");
  const doctor = nextAppt ? store.doctors.find((d) => d.id === nextAppt.doctorId) : null;
  const recentReport = store.labReports.find((r) => r.patientId === patientId);

  res.json(
    GetCareSyncAiSummaryResponse.parse({
      headline: "Your care is moving forward",
      body: `Your recent blood work from ${recentReport?.testName || "ABC Diagnostics"} has been received and linked to your continuous care journey. You have an upcoming ${nextAppt?.mode || "consultation"} with ${doctor?.fullName || "Dr. Rahul Mehta"}.`,
      nextStep: "Review your HbA1c and lipid report before your follow-up consultation.",
      disclaimer:
        "CareSync AI provides software-assisted information management and does not replace professional medical diagnosis or treatment.",
    }),
  );
});

export default router;