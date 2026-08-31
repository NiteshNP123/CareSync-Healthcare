import { db } from "./index";
import {
  usersTable,
  patientsTable,
  doctorsTable,
  organizationsTable,
  organizationMembersTable,
  caregiversTable,
  doctorAvailabilityTable,
  appointmentsTable,
  consultationsTable,
  prescriptionsTable,
  prescriptionItemsTable,
  investigationsTable,
  labReportsTable,
  accessRequestsTable,
  consentRecordsTable,
  pharmacyOrdersTable,
  pharmacyOrderItemsTable,
  paymentsTable,
  invoicesTable,
  healthcareJourneyEventsTable,
  patientVitalsTable,
  notificationsTable,
  auditLogsTable,
} from "./schema";
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
} from "./seed-data";

export async function seedDatabase() {
  console.log("🌱 Starting CareSync database seeding...");

  try {
    // 1. Users
    for (const user of seedUsers) {
      await db.insert(usersTable).values(user).onConflictDoNothing();
    }
    console.log("✓ Seeded Users");

    // 2. Patients
    for (const patient of seedPatients) {
      await db.insert(patientsTable).values(patient).onConflictDoNothing();
    }
    console.log("✓ Seeded Patients");

    // 3. Doctors
    for (const doctor of seedDoctors) {
      await db.insert(doctorsTable).values(doctor).onConflictDoNothing();
    }
    console.log("✓ Seeded Doctors");

    // 4. Organizations & Members
    for (const org of seedOrganizations) {
      await db.insert(organizationsTable).values(org).onConflictDoNothing();
    }
    for (const member of seedOrganizationMembers) {
      await db.insert(organizationMembersTable).values(member).onConflictDoNothing();
    }
    console.log("✓ Seeded Organizations & Staff Members");

    // 5. Caregivers
    for (const caregiver of seedCaregivers) {
      await db.insert(caregiversTable).values(caregiver).onConflictDoNothing();
    }
    console.log("✓ Seeded Caregivers");

    // 6. Doctor Availability
    for (const avail of seedDoctorAvailability) {
      await db.insert(doctorAvailabilityTable).values(avail).onConflictDoNothing();
    }
    console.log("✓ Seeded Doctor Availability");

    // 7. Appointments
    for (const appt of seedAppointments) {
      await db.insert(appointmentsTable).values(appt).onConflictDoNothing();
    }
    console.log("✓ Seeded Appointments");

    // 8. Consultations
    for (const consult of seedConsultations) {
      await db.insert(consultationsTable).values(consult).onConflictDoNothing();
    }
    console.log("✓ Seeded Consultations");

    // 9. Prescriptions & Items
    for (const rx of seedPrescriptions) {
      await db.insert(prescriptionsTable).values(rx).onConflictDoNothing();
    }
    for (const item of seedPrescriptionItems) {
      await db.insert(prescriptionItemsTable).values(item).onConflictDoNothing();
    }
    console.log("✓ Seeded Prescriptions & Medicines");

    // 10. Investigations & Lab Reports
    for (const inv of seedInvestigations) {
      await db.insert(investigationsTable).values(inv).onConflictDoNothing();
    }
    for (const rep of seedLabReports) {
      await db.insert(labReportsTable).values(rep).onConflictDoNothing();
    }
    console.log("✓ Seeded Investigations & Lab Reports");

    // 11. Access Requests & Consent Records
    for (const req of seedAccessRequests) {
      await db.insert(accessRequestsTable).values(req).onConflictDoNothing();
    }
    for (const consent of seedConsentRecords) {
      await db.insert(consentRecordsTable).values(consent).onConflictDoNothing();
    }
    console.log("✓ Seeded Access Requests & Consent Records");

    // 12. Pharmacy Orders & Items
    for (const order of seedPharmacyOrders) {
      await db.insert(pharmacyOrdersTable).values(order).onConflictDoNothing();
    }
    for (const item of seedPharmacyOrderItems) {
      await db.insert(pharmacyOrderItemsTable).values(item).onConflictDoNothing();
    }
    console.log("✓ Seeded Pharmacy Orders");

    // 13. Payments & Invoices
    for (const payment of seedPayments) {
      await db.insert(paymentsTable).values(payment).onConflictDoNothing();
    }
    for (const invoice of seedInvoices) {
      await db.insert(invoicesTable).values(invoice).onConflictDoNothing();
    }
    console.log("✓ Seeded Payments & Invoices");

    // 14. Healthcare Journey Events
    for (const event of seedHealthcareJourneyEvents) {
      await db.insert(healthcareJourneyEventsTable).values(event).onConflictDoNothing();
    }
    console.log("✓ Seeded Healthcare Journey Events");

    // 15. Vitals
    for (const vital of seedPatientVitals) {
      await db.insert(patientVitalsTable).values(vital).onConflictDoNothing();
    }
    console.log("✓ Seeded Patient Vitals History");

    // 16. Notifications & Audit Logs
    for (const notif of seedNotifications) {
      await db.insert(notificationsTable).values(notif).onConflictDoNothing();
    }
    for (const log of seedAuditLogs) {
      await db.insert(auditLogsTable).values(log).onConflictDoNothing();
    }
    console.log("✓ Seeded Notifications & Audit Logs");

    console.log("🎉 CareSync database seeded successfully!");
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    throw error;
  }
}

export * from "./seed-data";
