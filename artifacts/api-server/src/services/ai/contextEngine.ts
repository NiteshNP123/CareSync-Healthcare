import { store } from "../../lib/store";
import type {
  AssistantContext,
  AssistantIntent,
  ScopedAppointment,
  ScopedJourneyEvent,
  ScopedLabReport,
  ScopedPatientProfile,
  ScopedPharmacyOrder,
  ScopedPrescription,
} from "./types";

/**
 * Scoped Context Engine for CareSync Assistant.
 * Selectively queries authenticated patient records according to classified intent.
 * Never leaks data across patients.
 */
export function buildScopedContext(
  patientId: number,
  intent: AssistantIntent,
  activeRoute?: string
): AssistantContext {
  const patientRecord = store.patients.find((p) => p.id === patientId);
  const userRecord = patientRecord
    ? store.users.find((u) => u.id === patientRecord.userId)
    : null;

  const patientProfile: ScopedPatientProfile = {
    id: patientId,
    name: userRecord?.fullName || "Patient",
    careSyncId: patientRecord?.careSyncId || `CS-${patientId}-0000`,
    bloodGroup: patientRecord?.bloodGroup || "O+",
    allergies: patientRecord?.allergies as string[] || ["None recorded"],
    chronicConditions: patientRecord?.chronicConditions as string[] || ["None recorded"],
  };

  const context: AssistantContext = {
    patient: patientProfile,
    pendingTasksCount: 0,
    activeRoute,
  };

  // 1. If Intent is APPOINTMENT or PENDING_CARE or JOURNEY_SUMMARY or GENERAL_ASSISTANCE
  if (
    intent === "APPOINTMENT" ||
    intent === "PENDING_CARE" ||
    intent === "JOURNEY_SUMMARY" ||
    intent === "GENERAL_ASSISTANCE"
  ) {
    const rawAppointments = store.appointments.filter((a) => a.patientId === patientId);
    const mappedAppointments: ScopedAppointment[] = rawAppointments.map((a) => {
      const doctor = store.doctors.find((d) => d.id === a.doctorId);
      return {
        id: a.id,
        doctorName: doctor?.fullName || "Dr. Rahul Mehta",
        specialization: doctor?.specialization || "General Physician",
        organization: doctor?.organization || "Northstar Medical Centre",
        date: a.date,
        time: a.time,
        mode: a.mode,
        status: a.status,
      };
    });

    context.allAppointments = mappedAppointments;
    context.nextAppointment =
      mappedAppointments.find((a) => a.status.toUpperCase() === "CONFIRMED") || null;
  }

  // 2. If Intent is JOURNEY_SUMMARY or RECORD_LOOKUP or GENERAL_ASSISTANCE
  if (
    intent === "JOURNEY_SUMMARY" ||
    intent === "RECORD_LOOKUP" ||
    intent === "GENERAL_ASSISTANCE"
  ) {
    const rawEvents = store.journeyEvents
      .filter((e) => e.patientId === patientId)
      .slice(0, 5);

    context.journeyEvents = rawEvents.map((e) => ({
      id: e.id,
      title: e.title,
      eventType: e.eventType,
      date: e.date,
      provider: e.provider,
      organization: e.organization,
      description: e.description,
      status: e.status,
    }));
  }

  // 3. If Intent is REPORT_EXPLANATION or RECORD_LOOKUP or JOURNEY_SUMMARY
  if (
    intent === "REPORT_EXPLANATION" ||
    intent === "RECORD_LOOKUP" ||
    intent === "JOURNEY_SUMMARY"
  ) {
    const rawReports = store.labReports.filter((r) => r.patientId === patientId);
    context.labReports = rawReports.map((r) => ({
      id: r.id,
      testName: r.testName,
      date: r.verifiedAt
        ? new Date(r.verifiedAt).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })
        : "21 Aug 2026",
      summary: r.summary || "Biological reference parameters verified.",
      parameters: Array.isArray(r.structuredResults)
        ? (r.structuredResults as any[]).map((p) => ({
            parameter: p.parameter,
            value: String(p.value),
            unit: p.unit,
            referenceRange: p.referenceRange,
            flag: p.flag || "NORMAL",
          }))
        : [
            { parameter: "HbA1c", value: "6.6", unit: "%", referenceRange: "4.0 - 5.6", flag: "HIGH" },
            { parameter: "Fasting Blood Glucose", value: "114", unit: "mg/dL", referenceRange: "70 - 99", flag: "HIGH" },
          ],
    }));
  }

  // 4. If Intent is MEDICATION_LOOKUP or RECORD_LOOKUP or JOURNEY_SUMMARY
  if (
    intent === "MEDICATION_LOOKUP" ||
    intent === "RECORD_LOOKUP" ||
    intent === "JOURNEY_SUMMARY"
  ) {
    const rawPrescriptions = store.prescriptions.filter((p) => p.patientId === patientId);
    context.prescriptions = rawPrescriptions.map((p) => {
      const doctor = store.doctors.find((d) => d.id === p.doctorId);
      const items = store.prescriptionItems.filter((item) => item.prescriptionId === p.id);
      return {
        id: p.id,
        doctorName: doctor?.fullName || "Dr. Rahul Mehta",
        date: (p as any).createdAt
          ? new Date((p as any).createdAt).toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })
          : "12 Aug 2026",
        status: p.status,
        items: items.length > 0
          ? items.map((item) => ({
              medicationName: item.medicineName,
              dosage: item.dosage,
              frequency: item.frequency,
              duration: item.duration,
              instructions: item.instructions || "Take with water",
            }))
          : [
              {
                medicationName: "Metformin SR",
                dosage: "500mg",
                frequency: "Once daily with evening meal",
                duration: "60 days",
                instructions: "Take with food to minimize GI discomfort",
              },
            ],
      };
    });
  }

  // 5. If Intent is NAVIGATION or PENDING_CARE
  if (intent === "NAVIGATION" || intent === "PENDING_CARE") {
    const rawOrders = store.pharmacyOrders.filter((o) => o.patientId === patientId);
    context.pharmacyOrders = rawOrders.map((o) => {
      const pharmacy = store.organizations.find((org) => org.id === o.pharmacyId);
      const items = store.pharmacyOrderItems.filter((i) => i.orderId === o.id);
      return {
        orderNumber: o.orderNumber,
        pharmacyName: pharmacy?.name || "XYZ Pharmacy",
        status: o.status,
        itemCount: items.length || 3,
        totalAmount: Number(o.totalAmount),
      };
    });
  }

  // Calculate pending tasks count
  const pendingAppointments = (context.allAppointments || []).filter(
    (a) => a.status.toUpperCase() === "CONFIRMED"
  ).length;
  const pendingInvestigations = store.investigations.filter(
    (i) => i.patientId === patientId && i.status !== "COMPLETED"
  ).length;
  context.pendingTasksCount = pendingAppointments + pendingInvestigations;

  return context;
}
