import {
  seedUsers,
  seedPatients,
  seedDoctors,
  seedOrganizations,
  seedOrganizationMembers,
  seedCaregivers,
  seedDoctorAvailability,
  seedAppointments,
  seedConsultations,
  seedPrescriptions,
  seedPrescriptionItems,
  seedInvestigations,
  seedLabReports,
  seedAccessRequests,
  seedConsentRecords,
  seedPharmacyOrders,
  seedPharmacyOrderItems,
  seedPayments,
  seedInvoices,
  seedHealthcareJourneyEvents,
  seedPatientVitals,
  seedNotifications,
  seedAuditLogs,
} from "@workspace/db";

class CareSyncDataStore {
  users = [...seedUsers];
  patients = [...seedPatients];
  doctors = [...seedDoctors];
  organizations = [...seedOrganizations];
  organizationMembers = [...seedOrganizationMembers];
  caregivers = [...seedCaregivers];
  doctorAvailability = [...seedDoctorAvailability];
  appointments = [...seedAppointments];
  consultations = [...seedConsultations];
  prescriptions = [...seedPrescriptions];
  prescriptionItems = [...seedPrescriptionItems];
  investigations = [...seedInvestigations];
  labReports = [...seedLabReports];
  accessRequests = [...seedAccessRequests];
  consentRecords = [...seedConsentRecords];
  pharmacyOrders = [...seedPharmacyOrders];
  pharmacyOrderItems = [...seedPharmacyOrderItems];
  payments = [...seedPayments];
  invoices = [...seedInvoices];
  journeyEvents = [...seedHealthcareJourneyEvents];
  patientVitals = [...seedPatientVitals];
  notifications = [...seedNotifications];
  auditLogs = [...seedAuditLogs];

  // Helper counters for auto-incrementing IDs
  private nextId(arr: { id: number }[]): number {
    return arr.reduce((max, item) => (item.id > max ? item.id : max), 0) + 1;
  }

  // ==========================================================================
  // AUDIT LOGGING HELPER
  // ==========================================================================
  logAudit(entry: {
    actorId?: number;
    actorRole: string;
    action: string;
    entityType: string;
    entityId?: number;
    patientId?: number;
    organizationId?: number;
    ipAddress?: string;
    result?: "SUCCESS" | "DENIED" | "FAILED";
    metadata?: Record<string, any>;
  }) {
    const auditRecord = {
      id: this.nextId(this.auditLogs as any),
      actorId: entry.actorId ?? null,
      actorRole: entry.actorRole,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId ?? null,
      patientId: entry.patientId ?? null,
      organizationId: entry.organizationId ?? null,
      ipAddress: entry.ipAddress ?? "127.0.0.1",
      result: entry.result ?? "SUCCESS",
      metadata: entry.metadata ?? {},
      timestamp: new Date(),
    };
    (this.auditLogs as any[]).unshift(auditRecord);
    return auditRecord;
  }

  // ==========================================================================
  // NOTIFICATION DISPATCHER
  // ==========================================================================
  createNotification(userId: number, title: string, message: string, type: string, link?: string) {
    const notif = {
      id: this.nextId(this.notifications as any),
      userId,
      title,
      message,
      type,
      link: link || "",
      isRead: false,
      createdAt: new Date(),
    };
    (this.notifications as any[]).unshift(notif);
    return notif;
  }

  // ==========================================================================
  // HEALTHCARE JOURNEY SYNTHESIS & APPEND
  // ==========================================================================
  addJourneyEvent(event: {
    patientId: number;
    eventType: string;
    sourceEntity?: string;
    sourceEntityId?: number;
    title: string;
    provider: string;
    organization: string;
    date: string;
    status?: string;
    description: string;
    accent?: string;
    metadata?: Record<string, any>;
  }) {
    const newEvent = {
      id: this.nextId(this.journeyEvents as any),
      patientId: event.patientId,
      eventType: event.eventType,
      sourceEntity: event.sourceEntity || "manual",
      sourceEntityId: event.sourceEntityId || null,
      title: event.title,
      provider: event.provider,
      organization: event.organization,
      date: event.date,
      status: event.status || "COMPLETED",
      description: event.description,
      accent: event.accent || "teal",
      metadata: event.metadata || {},
      createdAt: new Date(),
    };
    (this.journeyEvents as any[]).unshift(newEvent);
    return newEvent;
  }

  // ==========================================================================
  // CONSENT & OBJECT-LEVEL ACCESS CHECK
  // ==========================================================================
  hasConsent(patientId: number, doctorId: number, requiredScope?: string): boolean {
    const consent = this.consentRecords.find(
      (c) => c.patientId === patientId && c.doctorId === doctorId && c.status === "ACTIVE"
    );
    if (!consent) return false;
    if (!requiredScope) return true;
    return (consent.grantedScopes as string[]).includes(requiredScope);
  }
}

export const store = new CareSyncDataStore();
