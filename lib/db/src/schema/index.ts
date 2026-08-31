import { relations } from "drizzle-orm";
import {
  boolean,
  integer,
  jsonb,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

// ============================================================================
// 1. USERS & ROLES
// ============================================================================

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: varchar("role", { length: 50 }).notNull(), // PATIENT, DOCTOR, LAB_STAFF, PHARMACY_STAFF, CAREGIVER, ADMIN
  fullName: varchar("full_name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(usersTable);
export const selectUserSchema = createSelectSchema(usersTable);
export type User = typeof usersTable.$inferSelect;
export type InsertUser = typeof usersTable.$inferInsert;

// ============================================================================
// 2. PATIENTS
// ============================================================================

export const patientsTable = pgTable("patients", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersTable.id, { onDelete: "cascade" }).notNull(),
  careSyncId: varchar("caresync_id", { length: 50 }).notNull().unique(), // e.g. CS-2048-7392
  dateOfBirth: varchar("date_of_birth", { length: 50 }),
  gender: varchar("gender", { length: 50 }),
  bloodGroup: varchar("blood_group", { length: 10 }),
  emergencyContactName: varchar("emergency_contact_name", { length: 255 }),
  emergencyContactPhone: varchar("emergency_contact_phone", { length: 50 }),
  emergencyContactRelation: varchar("emergency_contact_relation", { length: 100 }),
  idStatus: varchar("id_status", { length: 50 }).default("VERIFIED").notNull(), // VERIFIED, PENDING, UNVERIFIED
  address: text("address"),
  allergies: jsonb("allergies").default([]),
  chronicConditions: jsonb("chronic_conditions").default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPatientSchema = createInsertSchema(patientsTable);
export const selectPatientSchema = createSelectSchema(patientsTable);
export type Patient = typeof patientsTable.$inferSelect;
export type InsertPatient = typeof patientsTable.$inferInsert;

// ============================================================================
// 3. DOCTORS & VERIFICATION
// ============================================================================

export const doctorsTable = pgTable("doctors", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersTable.id, { onDelete: "cascade" }).notNull(),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  specialization: varchar("specialization", { length: 255 }).notNull(),
  qualification: varchar("qualification", { length: 255 }).notNull(),
  licenseNumber: varchar("license_number", { length: 100 }).notNull(),
  experienceYears: integer("experience_years").default(0).notNull(),
  organization: varchar("organization", { length: 255 }).notNull(),
  location: varchar("location", { length: 255 }).notNull(),
  fee: integer("fee").default(500).notNull(),
  rating: numeric("rating", { precision: 3, scale: 2 }).default("4.80").notNull(),
  verificationStatus: varchar("verification_status", { length: 50 }).default("VERIFIED").notNull(), // PENDING, UNDER_REVIEW, VERIFIED, REJECTED, SUSPENDED
  verificationDocuments: jsonb("verification_documents").default([]),
  nextSlot: varchar("next_slot", { length: 100 }),
  initials: varchar("initials", { length: 10 }),
  bio: text("bio"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertDoctorSchema = createInsertSchema(doctorsTable);
export const selectDoctorSchema = createSelectSchema(doctorsTable);
export type Doctor = typeof doctorsTable.$inferSelect;
export type InsertDoctor = typeof doctorsTable.$inferInsert;

// ============================================================================
// 4. ORGANIZATIONS (LABORATORIES & PHARMACIES)
// ============================================================================

export const organizationsTable = pgTable("organizations", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  orgType: varchar("org_type", { length: 50 }).notNull(), // LABORATORY, PHARMACY, CLINIC, HOSPITAL
  licenseNumber: varchar("license_number", { length: 100 }).notNull(),
  address: text("address").notNull(),
  branches: jsonb("branches").default([]),
  contactPhone: varchar("contact_phone", { length: 50 }),
  contactEmail: varchar("contact_email", { length: 255 }),
  operatingHours: varchar("operating_hours", { length: 255 }),
  verificationStatus: varchar("verification_status", { length: 50 }).default("VERIFIED").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const organizationMembersTable = pgTable("organization_members", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => organizationsTable.id, { onDelete: "cascade" }).notNull(),
  userId: integer("user_id").references(() => usersTable.id, { onDelete: "cascade" }).notNull(),
  memberRole: varchar("member_role", { length: 50 }).notNull(), // ADMIN, TECHNICIAN, PHARMACIST, STAFF
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertOrganizationSchema = createInsertSchema(organizationsTable);
export const selectOrganizationSchema = createSelectSchema(organizationsTable);
export type Organization = typeof organizationsTable.$inferSelect;
export type InsertOrganization = typeof organizationsTable.$inferInsert;
export type OrganizationMember = typeof organizationMembersTable.$inferSelect;
export type InsertOrganizationMember = typeof organizationMembersTable.$inferInsert;

// ============================================================================
// 5. CAREGIVERS
// ============================================================================

export const caregiversTable = pgTable("caregivers", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => patientsTable.id, { onDelete: "cascade" }).notNull(),
  caregiverUserId: integer("caregiver_user_id").references(() => usersTable.id, { onDelete: "cascade" }).notNull(),
  relationship: varchar("relationship", { length: 100 }).notNull(),
  permissions: jsonb("permissions").default(["APPOINTMENTS", "TASKS", "FOLLOW_UPS", "MEDICATIONS", "JOURNEY_PROGRESS", "NOTIFICATIONS"]).notNull(),
  status: varchar("status", { length: 50 }).default("ACTIVE").notNull(), // INVITED, ACTIVE, REVOKED
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertCaregiverSchema = createInsertSchema(caregiversTable);
export const selectCaregiverSchema = createSelectSchema(caregiversTable);
export type Caregiver = typeof caregiversTable.$inferSelect;
export type InsertCaregiver = typeof caregiversTable.$inferInsert;

// ============================================================================
// 6. DOCTOR AVAILABILITY
// ============================================================================

export const doctorAvailabilityTable = pgTable("doctor_availability", {
  id: serial("id").primaryKey(),
  doctorId: integer("doctor_id").references(() => doctorsTable.id, { onDelete: "cascade" }).notNull(),
  dayOfWeek: integer("day_of_week").notNull(), // 0 = Sunday, 1 = Monday, ... 6 = Saturday
  startTime: varchar("start_time", { length: 20 }).notNull(), // "09:00"
  endTime: varchar("end_time", { length: 20 }).notNull(), // "17:00"
  slotDurationMinutes: integer("slot_duration_minutes").default(30).notNull(),
  breakStartTime: varchar("break_start_time", { length: 20 }),
  breakEndTime: varchar("break_end_time", { length: 20 }),
  mode: varchar("mode", { length: 50 }).default("BOTH").notNull(), // ONLINE, OFFLINE, BOTH
  isActive: boolean("is_active").default(true).notNull(),
});

export const insertDoctorAvailabilitySchema = createInsertSchema(doctorAvailabilityTable);
export const selectDoctorAvailabilitySchema = createSelectSchema(doctorAvailabilityTable);
export type DoctorAvailability = typeof doctorAvailabilityTable.$inferSelect;
export type InsertDoctorAvailability = typeof doctorAvailabilityTable.$inferInsert;

// ============================================================================
// 7. APPOINTMENTS (PATIENT-TO-DOCTOR & DOCTOR-TO-DOCTOR)
// ============================================================================

export const appointmentsTable = pgTable("appointments", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => patientsTable.id, { onDelete: "cascade" }).notNull(),
  doctorId: integer("doctor_id").references(() => doctorsTable.id, { onDelete: "cascade" }).notNull(),
  bookedByDoctorId: integer("booked_by_doctor_id").references(() => doctorsTable.id, { onDelete: "set null" }),
  appointmentType: varchar("appointment_type", { length: 50 }).default("PATIENT_TO_DOCTOR").notNull(), // PATIENT_TO_DOCTOR, DOCTOR_TO_DOCTOR
  date: varchar("date", { length: 50 }).notNull(),
  time: varchar("time", { length: 50 }).notNull(),
  mode: varchar("mode", { length: 50 }).default("Video consultation").notNull(),
  status: varchar("status", { length: 50 }).default("CONFIRMED").notNull(), // REQUESTED, CONFIRMED, IN_CONSULTATION, COMPLETED, CANCELLED
  fee: integer("fee").default(0).notNull(),
  reason: text("reason"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAppointmentSchema = createInsertSchema(appointmentsTable);
export const selectAppointmentSchema = createSelectSchema(appointmentsTable);
export type Appointment = typeof appointmentsTable.$inferSelect;
export type InsertAppointment = typeof appointmentsTable.$inferInsert;

// ============================================================================
// 8. CONSULTATIONS
// ============================================================================

export const consultationsTable = pgTable("consultations", {
  id: serial("id").primaryKey(),
  appointmentId: integer("appointment_id").references(() => appointmentsTable.id, { onDelete: "set null" }),
  patientId: integer("patient_id").references(() => patientsTable.id, { onDelete: "cascade" }).notNull(),
  doctorId: integer("doctor_id").references(() => doctorsTable.id, { onDelete: "cascade" }).notNull(),
  symptoms: text("symptoms").notNull(),
  clinicalObservations: text("clinical_observations"),
  assessmentDiagnosis: text("assessment_diagnosis").notNull(),
  treatmentPlan: text("treatment_plan").notNull(),
  followUpDate: varchar("follow_up_date", { length: 50 }),
  followUpNotes: text("follow_up_notes"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertConsultationSchema = createInsertSchema(consultationsTable);
export const selectConsultationSchema = createSelectSchema(consultationsTable);
export type Consultation = typeof consultationsTable.$inferSelect;
export type InsertConsultation = typeof consultationsTable.$inferInsert;

// ============================================================================
// 9. PRESCRIPTIONS & PRESCRIPTION ITEMS
// ============================================================================

export const prescriptionsTable = pgTable("prescriptions", {
  id: serial("id").primaryKey(),
  consultationId: integer("consultation_id").references(() => consultationsTable.id, { onDelete: "set null" }),
  patientId: integer("patient_id").references(() => patientsTable.id, { onDelete: "cascade" }).notNull(),
  doctorId: integer("doctor_id").references(() => doctorsTable.id, { onDelete: "cascade" }).notNull(),
  status: varchar("status", { length: 50 }).default("ACTIVE").notNull(), // ACTIVE, DISPENSED, EXPIRED, CANCELLED
  generalInstructions: text("general_instructions"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const prescriptionItemsTable = pgTable("prescription_items", {
  id: serial("id").primaryKey(),
  prescriptionId: integer("prescription_id").references(() => prescriptionsTable.id, { onDelete: "cascade" }).notNull(),
  medicineName: varchar("medicine_name", { length: 255 }).notNull(),
  dosage: varchar("dosage", { length: 100 }).notNull(),
  frequency: varchar("frequency", { length: 100 }).notNull(),
  duration: varchar("duration", { length: 100 }).notNull(),
  instructions: text("instructions"),
});

export const insertPrescriptionSchema = createInsertSchema(prescriptionsTable);
export const selectPrescriptionSchema = createSelectSchema(prescriptionsTable);
export const insertPrescriptionItemSchema = createInsertSchema(prescriptionItemsTable);
export const selectPrescriptionItemSchema = createSelectSchema(prescriptionItemsTable);
export type Prescription = typeof prescriptionsTable.$inferSelect;
export type InsertPrescription = typeof prescriptionsTable.$inferInsert;
export type PrescriptionItem = typeof prescriptionItemsTable.$inferSelect;
export type InsertPrescriptionItem = typeof prescriptionItemsTable.$inferInsert;

// ============================================================================
// 10. INVESTIGATIONS & LAB REPORTS
// ============================================================================

export const investigationsTable = pgTable("investigations", {
  id: serial("id").primaryKey(),
  consultationId: integer("consultation_id").references(() => consultationsTable.id, { onDelete: "set null" }),
  patientId: integer("patient_id").references(() => patientsTable.id, { onDelete: "cascade" }).notNull(),
  doctorId: integer("doctor_id").references(() => doctorsTable.id, { onDelete: "cascade" }).notNull(),
  testName: varchar("test_name", { length: 255 }).notNull(),
  category: varchar("category", { length: 100 }).default("BLOOD").notNull(),
  reason: text("reason"),
  priority: varchar("priority", { length: 50 }).default("ROUTINE").notNull(), // ROUTINE, URGENT, STAT
  instructions: text("instructions"),
  status: varchar("status", { length: 50 }).default("ORDERED").notNull(), // ORDERED, SCHEDULED, SAMPLE_COLLECTED, PROCESSING, COMPLETED, CANCELLED
  assignedLabId: integer("assigned_lab_id").references(() => organizationsTable.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const labReportsTable = pgTable("lab_reports", {
  id: serial("id").primaryKey(),
  investigationId: integer("investigation_id").references(() => investigationsTable.id, { onDelete: "set null" }),
  patientId: integer("patient_id").references(() => patientsTable.id, { onDelete: "cascade" }).notNull(),
  labId: integer("lab_id").references(() => organizationsTable.id, { onDelete: "cascade" }).notNull(),
  testName: varchar("test_name", { length: 255 }).notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  summary: text("summary"),
  structuredResults: jsonb("structured_results").default([]).notNull(), // [{ parameter, value, unit, referenceRange, flag: 'NORMAL'|'HIGH'|'LOW'|'CRITICAL' }]
  referenceRanges: text("reference_ranges"),
  fileUrl: text("file_url"),
  status: varchar("status", { length: 50 }).default("PUBLISHED").notNull(), // DRAFT, READY_FOR_REVIEW, VERIFIED, PUBLISHED
  verifiedByTechnicianId: integer("verified_by_technician_id").references(() => usersTable.id, { onDelete: "set null" }),
  verifiedAt: timestamp("verified_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertInvestigationSchema = createInsertSchema(investigationsTable);
export const selectInvestigationSchema = createSelectSchema(investigationsTable);
export const insertLabReportSchema = createInsertSchema(labReportsTable);
export const selectLabReportSchema = createSelectSchema(labReportsTable);
export type Investigation = typeof investigationsTable.$inferSelect;
export type InsertInvestigation = typeof investigationsTable.$inferInsert;
export type LabReport = typeof labReportsTable.$inferSelect;
export type InsertLabReport = typeof labReportsTable.$inferInsert;

// ============================================================================
// 11. MEDICAL DOCUMENTS
// ============================================================================

export const medicalDocumentsTable = pgTable("medical_documents", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => patientsTable.id, { onDelete: "cascade" }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  category: varchar("category", { length: 100 }).notNull(), // PRESCRIPTION, LAB_REPORT, IMAGING, CONSULTATION, DISCHARGE_SUMMARY, REFERRAL, OTHER
  fileUrl: text("file_url").notNull(),
  mimeType: varchar("mime_type", { length: 100 }).default("application/pdf").notNull(),
  sizeBytes: integer("size_bytes").default(0).notNull(),
  metadata: jsonb("metadata").default({}).notNull(),
  uploadedByUserId: integer("uploaded_by_user_id").references(() => usersTable.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertMedicalDocumentSchema = createInsertSchema(medicalDocumentsTable);
export const selectMedicalDocumentSchema = createSelectSchema(medicalDocumentsTable);
export type MedicalDocument = typeof medicalDocumentsTable.$inferSelect;
export type InsertMedicalDocument = typeof medicalDocumentsTable.$inferInsert;

// ============================================================================
// 12. REFERRALS & FOLLOW-UPS
// ============================================================================

export const referralsTable = pgTable("referrals", {
  id: serial("id").primaryKey(),
  consultationId: integer("consultation_id").references(() => consultationsTable.id, { onDelete: "set null" }),
  patientId: integer("patient_id").references(() => patientsTable.id, { onDelete: "cascade" }).notNull(),
  fromDoctorId: integer("from_doctor_id").references(() => doctorsTable.id, { onDelete: "cascade" }).notNull(),
  toDoctorId: integer("to_doctor_id").references(() => doctorsTable.id, { onDelete: "set null" }),
  targetSpecialization: varchar("target_specialization", { length: 255 }).notNull(),
  reason: text("reason").notNull(),
  priority: varchar("priority", { length: 50 }).default("ROUTINE").notNull(),
  clinicalSummary: text("clinical_summary"),
  status: varchar("status", { length: 50 }).default("PENDING").notNull(), // PENDING, ACCEPTED, SCHEDULED, COMPLETED, CANCELLED
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const followUpsTable = pgTable("follow_ups", {
  id: serial("id").primaryKey(),
  consultationId: integer("consultation_id").references(() => consultationsTable.id, { onDelete: "set null" }),
  patientId: integer("patient_id").references(() => patientsTable.id, { onDelete: "cascade" }).notNull(),
  doctorId: integer("doctor_id").references(() => doctorsTable.id, { onDelete: "cascade" }).notNull(),
  dueDate: varchar("due_date", { length: 50 }).notNull(),
  purpose: text("purpose").notNull(),
  status: varchar("status", { length: 50 }).default("PENDING").notNull(), // PENDING, SCHEDULED, COMPLETED, OVERDUE
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertReferralSchema = createInsertSchema(referralsTable);
export const selectReferralSchema = createSelectSchema(referralsTable);
export const insertFollowUpSchema = createInsertSchema(followUpsTable);
export const selectFollowUpSchema = createSelectSchema(followUpsTable);
export type Referral = typeof referralsTable.$inferSelect;
export type InsertReferral = typeof referralsTable.$inferInsert;
export type FollowUp = typeof followUpsTable.$inferSelect;
export type InsertFollowUp = typeof followUpsTable.$inferInsert;

// ============================================================================
// 13. ACCESS REQUESTS & CONSENT GOVERNANCE
// ============================================================================

export const accessRequestsTable = pgTable("access_requests", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => patientsTable.id, { onDelete: "cascade" }).notNull(),
  requesterDoctorId: integer("requester_doctor_id").references(() => doctorsTable.id, { onDelete: "cascade" }).notNull(),
  purpose: text("purpose").notNull(),
  dataScopes: jsonb("data_scopes").notNull(), // ["CONSULTATIONS", "PRESCRIPTIONS", "LAB_REPORTS", "JOURNEY"]
  status: varchar("status", { length: 50 }).default("PENDING").notNull(), // PENDING, ALLOWED, DENIED, EXPIRED
  otpCode: varchar("otp_code", { length: 10 }),
  otpExpiresAt: timestamp("otp_expires_at"),
  requestedAt: timestamp("requested_at").defaultNow().notNull(),
  respondedAt: timestamp("responded_at"),
});

export const consentRecordsTable = pgTable("consent_records", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => patientsTable.id, { onDelete: "cascade" }).notNull(),
  doctorId: integer("doctor_id").references(() => doctorsTable.id, { onDelete: "cascade" }).notNull(),
  grantedScopes: jsonb("granted_scopes").notNull(),
  status: varchar("status", { length: 50 }).default("ACTIVE").notNull(), // ACTIVE, REVOKED, EXPIRED
  grantedAt: timestamp("granted_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at"),
  revokedAt: timestamp("revoked_at"),
});

export const insertAccessRequestSchema = createInsertSchema(accessRequestsTable);
export const selectAccessRequestSchema = createSelectSchema(accessRequestsTable);
export const insertConsentRecordSchema = createInsertSchema(consentRecordsTable);
export const selectConsentRecordSchema = createSelectSchema(consentRecordsTable);
export type AccessRequest = typeof accessRequestsTable.$inferSelect;
export type InsertAccessRequest = typeof accessRequestsTable.$inferInsert;
export type ConsentRecord = typeof consentRecordsTable.$inferSelect;
export type InsertConsentRecord = typeof consentRecordsTable.$inferInsert;

// ============================================================================
// 14. PHARMACY ORDERS & FULFILLMENT
// ============================================================================

export const pharmacyOrdersTable = pgTable("pharmacy_orders", {
  id: serial("id").primaryKey(),
  orderNumber: varchar("order_number", { length: 50 }).notNull().unique(), // e.g. PS-2048
  patientId: integer("patient_id").references(() => patientsTable.id, { onDelete: "cascade" }).notNull(),
  pharmacyId: integer("pharmacy_id").references(() => organizationsTable.id, { onDelete: "cascade" }).notNull(),
  prescriptionId: integer("prescription_id").references(() => prescriptionsTable.id, { onDelete: "set null" }),
  status: varchar("status", { length: 50 }).default("PLACED").notNull(), // PLACED, REVIEWED, QUOTE_ISSUED, PAID, PREPARING, READY, DISPATCHED, DELIVERED, CANCELLED
  subtotal: numeric("subtotal", { precision: 10, scale: 2 }).default("0.00").notNull(),
  tax: numeric("tax", { precision: 10, scale: 2 }).default("0.00").notNull(),
  totalAmount: numeric("total_amount", { precision: 10, scale: 2 }).default("0.00").notNull(),
  deliveryAddress: text("delivery_address"),
  timeline: jsonb("timeline").default([]).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const pharmacyOrderItemsTable = pgTable("pharmacy_order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").references(() => pharmacyOrdersTable.id, { onDelete: "cascade" }).notNull(),
  medicineName: varchar("medicine_name", { length: 255 }).notNull(),
  quantity: integer("quantity").default(1).notNull(),
  unitPrice: numeric("unit_price", { precision: 10, scale: 2 }).default("0.00").notNull(),
  totalPrice: numeric("total_price", { precision: 10, scale: 2 }).default("0.00").notNull(),
  inStock: boolean("in_stock").default(true).notNull(),
});

export const insertPharmacyOrderSchema = createInsertSchema(pharmacyOrdersTable);
export const selectPharmacyOrderSchema = createSelectSchema(pharmacyOrdersTable);
export const insertPharmacyOrderItemSchema = createInsertSchema(pharmacyOrderItemsTable);
export const selectPharmacyOrderItemSchema = createSelectSchema(pharmacyOrderItemsTable);
export type PharmacyOrder = typeof pharmacyOrdersTable.$inferSelect;
export type InsertPharmacyOrder = typeof pharmacyOrdersTable.$inferInsert;
export type PharmacyOrderItem = typeof pharmacyOrderItemsTable.$inferSelect;
export type InsertPharmacyOrderItem = typeof pharmacyOrderItemsTable.$inferInsert;

// ============================================================================
// 15. PAYMENTS & INVOICES (SANDBOX / DEMO)
// ============================================================================

export const paymentsTable = pgTable("payments", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => patientsTable.id, { onDelete: "cascade" }).notNull(),
  orderId: integer("order_id").references(() => pharmacyOrdersTable.id, { onDelete: "set null" }),
  appointmentId: integer("appointment_id").references(() => appointmentsTable.id, { onDelete: "set null" }),
  investigationId: integer("investigation_id").references(() => investigationsTable.id, { onDelete: "set null" }),
  paymentType: varchar("payment_type", { length: 50 }).notNull(), // APPOINTMENT, PHARMACY, LABORATORY, DOCTOR_TO_DOCTOR
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 10 }).default("INR").notNull(),
  status: varchar("status", { length: 50 }).default("PENDING").notNull(), // PENDING, PROCESSING, PAID, FAILED, REFUNDED, CANCELLED
  paymentMethod: varchar("payment_method", { length: 50 }).default("DEMO_SANDBOX").notNull(),
  transactionRef: varchar("transaction_ref", { length: 100 }).notNull(),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const invoicesTable = pgTable("invoices", {
  id: serial("id").primaryKey(),
  paymentId: integer("payment_id").references(() => paymentsTable.id, { onDelete: "cascade" }).notNull(),
  invoiceNumber: varchar("invoice_number", { length: 50 }).notNull().unique(), // INV-2048-01
  patientId: integer("patient_id").references(() => patientsTable.id, { onDelete: "cascade" }).notNull(),
  billingName: varchar("billing_name", { length: 255 }).notNull(),
  billingAddress: text("billing_address"),
  lineItems: jsonb("line_items").notNull(),
  subtotal: numeric("subtotal", { precision: 10, scale: 2 }).notNull(),
  tax: numeric("tax", { precision: 10, scale: 2 }).notNull(),
  totalAmount: numeric("total_amount", { precision: 10, scale: 2 }).notNull(),
  issueDate: varchar("issue_date", { length: 50 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPaymentSchema = createInsertSchema(paymentsTable);
export const selectPaymentSchema = createSelectSchema(paymentsTable);
export const insertInvoiceSchema = createInsertSchema(invoicesTable);
export const selectInvoiceSchema = createSelectSchema(invoicesTable);
export type Payment = typeof paymentsTable.$inferSelect;
export type InsertPayment = typeof paymentsTable.$inferInsert;
export type Invoice = typeof invoicesTable.$inferSelect;
export type InsertInvoice = typeof invoicesTable.$inferInsert;

// ============================================================================
// 16. THE HERO: HEALTHCARE JOURNEY EVENTS
// ============================================================================

export const healthcareJourneyEventsTable = pgTable("healthcare_journey_events", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => patientsTable.id, { onDelete: "cascade" }).notNull(),
  eventType: varchar("event_type", { length: 50 }).notNull(), // SYMPTOMS, CONSULTATION, INVESTIGATION, LAB_TEST, REPORT, PRESCRIPTION, MEDICATION, REFERRAL, APPOINTMENT, FOLLOW_UP, PHARMACY_ORDER, RECOVERY
  sourceEntity: varchar("source_entity", { length: 50 }), // consultation, lab_report, prescription, appointment, pharmacy_order, referral, manual
  sourceEntityId: integer("source_entity_id"),
  title: varchar("title", { length: 255 }).notNull(),
  provider: varchar("provider", { length: 255 }).notNull(),
  organization: varchar("organization", { length: 255 }).notNull(),
  date: varchar("date", { length: 50 }).notNull(),
  status: varchar("status", { length: 50 }).default("COMPLETED").notNull(), // UPCOMING, IN_PROGRESS, COMPLETED, CANCELLED
  description: text("description").notNull(),
  accent: varchar("accent", { length: 50 }).default("teal").notNull(), // teal, coral, gold, blue, rose, amber, mint, violet
  metadata: jsonb("metadata").default({}).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertJourneyEventSchema = createInsertSchema(healthcareJourneyEventsTable);
export const selectJourneyEventSchema = createSelectSchema(healthcareJourneyEventsTable);
export type HealthcareJourneyEvent = typeof healthcareJourneyEventsTable.$inferSelect;
export type InsertHealthcareJourneyEvent = typeof healthcareJourneyEventsTable.$inferInsert;

// ============================================================================
// 17. NOTIFICATIONS
// ============================================================================

export const notificationsTable = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersTable.id, { onDelete: "cascade" }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  type: varchar("type", { length: 50 }).notNull(), // REPORT_READY, APPOINTMENT_UPDATE, ACCESS_REQUEST, PAYMENT_REQUIRED, PHARMACY_UPDATE, FOLLOW_UP_DUE, DOCTOR_REFERRAL, SYSTEM
  link: text("link"),
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertNotificationSchema = createInsertSchema(notificationsTable);
export const selectNotificationSchema = createSelectSchema(notificationsTable);
export type Notification = typeof notificationsTable.$inferSelect;
export type InsertNotification = typeof notificationsTable.$inferInsert;

// ============================================================================
// 18. AUDIT LOGS (TAMPER-EVIDENT AUDIT TRAIL)
// ============================================================================

export const auditLogsTable = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  actorId: integer("actor_id").references(() => usersTable.id, { onDelete: "set null" }),
  actorRole: varchar("actor_role", { length: 50 }).notNull(),
  action: varchar("action", { length: 100 }).notNull(), // PATIENT_RECORD_VIEW, CONSENT_GRANTED, CONSENT_REVOKED, CONSULTATION_CREATED, PRESCRIPTION_DISPENSED, LAB_REPORT_PUBLISHED, PAYMENT_COMPLETED, DOCTOR_VERIFIED
  entityType: varchar("entity_type", { length: 50 }).notNull(),
  entityId: integer("entity_id"),
  patientId: integer("patient_id").references(() => patientsTable.id, { onDelete: "set null" }),
  organizationId: integer("organization_id").references(() => organizationsTable.id, { onDelete: "set null" }),
  ipAddress: varchar("ip_address", { length: 100 }),
  result: varchar("result", { length: 50 }).default("SUCCESS").notNull(), // SUCCESS, DENIED, FAILED
  metadata: jsonb("metadata").default({}).notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export const insertAuditLogSchema = createInsertSchema(auditLogsTable);
export const selectAuditLogSchema = createSelectSchema(auditLogsTable);
export type AuditLog = typeof auditLogsTable.$inferSelect;
export type InsertAuditLog = typeof auditLogsTable.$inferInsert;

// ============================================================================
// 19. PATIENT VITALS & HEALTH ANALYTICS
// ============================================================================

export const patientVitalsTable = pgTable("patient_vitals", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => patientsTable.id, { onDelete: "cascade" }).notNull(),
  recordedAt: varchar("recorded_at", { length: 50 }).notNull(),
  systolicBp: integer("systolic_bp"),
  diastolicBp: integer("diastolic_bp"),
  bloodGlucose: integer("blood_glucose"),
  fasting: boolean("fasting").default(false),
  heartRate: integer("heart_rate"),
  weightKg: numeric("weight_kg", { precision: 5, scale: 2 }),
  hba1c: numeric("hba1c", { precision: 4, scale: 2 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPatientVitalsSchema = createInsertSchema(patientVitalsTable);
export const selectPatientVitalsSchema = createSelectSchema(patientVitalsTable);
export type PatientVitals = typeof patientVitalsTable.$inferSelect;
export type InsertPatientVitals = typeof patientVitalsTable.$inferInsert;

// ============================================================================
// 20. DRIZZLE RELATIONAL DEFINITIONS
// ============================================================================

export const usersRelations = relations(usersTable, ({ one, many }) => ({
  patientProfile: one(patientsTable, {
    fields: [usersTable.id],
    references: [patientsTable.userId],
  }),
  doctorProfile: one(doctorsTable, {
    fields: [usersTable.id],
    references: [doctorsTable.userId],
  }),
  notifications: many(notificationsTable),
  auditLogs: many(auditLogsTable),
}));

export const patientsRelations = relations(patientsTable, ({ one, many }) => ({
  user: one(usersTable, {
    fields: [patientsTable.userId],
    references: [usersTable.id],
  }),
  appointments: many(appointmentsTable),
  consultations: many(consultationsTable),
  prescriptions: many(prescriptionsTable),
  investigations: many(investigationsTable),
  labReports: many(labReportsTable),
  journeyEvents: many(healthcareJourneyEventsTable),
  accessRequests: many(accessRequestsTable),
  consentRecords: many(consentRecordsTable),
  pharmacyOrders: many(pharmacyOrdersTable),
  payments: many(paymentsTable),
  vitals: many(patientVitalsTable),
  caregivers: many(caregiversTable),
}));

export const doctorsRelations = relations(doctorsTable, ({ one, many }) => ({
  user: one(usersTable, {
    fields: [doctorsTable.userId],
    references: [usersTable.id],
  }),
  appointments: many(appointmentsTable),
  consultations: many(consultationsTable),
  prescriptions: many(prescriptionsTable),
  investigations: many(investigationsTable),
  availability: many(doctorAvailabilityTable),
  consentRecords: many(consentRecordsTable),
}));

export const organizationsRelations = relations(organizationsTable, ({ many }) => ({
  members: many(organizationMembersTable),
  labReports: many(labReportsTable),
  pharmacyOrders: many(pharmacyOrdersTable),
}));

export const appointmentsRelations = relations(appointmentsTable, ({ one }) => ({
  patient: one(patientsTable, {
    fields: [appointmentsTable.patientId],
    references: [patientsTable.id],
  }),
  doctor: one(doctorsTable, {
    fields: [appointmentsTable.doctorId],
    references: [doctorsTable.id],
  }),
  bookedByDoctor: one(doctorsTable, {
    fields: [appointmentsTable.bookedByDoctorId],
    references: [doctorsTable.id],
  }),
  consultation: one(consultationsTable, {
    fields: [appointmentsTable.id],
    references: [consultationsTable.appointmentId],
  }),
}));

export const consultationsRelations = relations(consultationsTable, ({ one, many }) => ({
  patient: one(patientsTable, {
    fields: [consultationsTable.patientId],
    references: [patientsTable.id],
  }),
  doctor: one(doctorsTable, {
    fields: [consultationsTable.doctorId],
    references: [doctorsTable.id],
  }),
  appointment: one(appointmentsTable, {
    fields: [consultationsTable.appointmentId],
    references: [appointmentsTable.id],
  }),
  prescriptions: many(prescriptionsTable),
  investigations: many(investigationsTable),
  referrals: many(referralsTable),
  followUps: many(followUpsTable),
}));

export const prescriptionsRelations = relations(prescriptionsTable, ({ one, many }) => ({
  consultation: one(consultationsTable, {
    fields: [prescriptionsTable.consultationId],
    references: [consultationsTable.id],
  }),
  patient: one(patientsTable, {
    fields: [prescriptionsTable.patientId],
    references: [patientsTable.id],
  }),
  doctor: one(doctorsTable, {
    fields: [prescriptionsTable.doctorId],
    references: [doctorsTable.id],
  }),
  items: many(prescriptionItemsTable),
}));

export const prescriptionItemsRelations = relations(prescriptionItemsTable, ({ one }) => ({
  prescription: one(prescriptionsTable, {
    fields: [prescriptionItemsTable.prescriptionId],
    references: [prescriptionsTable.id],
  }),
}));

export const investigationsRelations = relations(investigationsTable, ({ one }) => ({
  consultation: one(consultationsTable, {
    fields: [investigationsTable.consultationId],
    references: [consultationsTable.id],
  }),
  patient: one(patientsTable, {
    fields: [investigationsTable.patientId],
    references: [patientsTable.id],
  }),
  doctor: one(doctorsTable, {
    fields: [investigationsTable.doctorId],
    references: [doctorsTable.id],
  }),
  assignedLab: one(organizationsTable, {
    fields: [investigationsTable.assignedLabId],
    references: [organizationsTable.id],
  }),
  labReport: one(labReportsTable, {
    fields: [investigationsTable.id],
    references: [labReportsTable.investigationId],
  }),
}));

export const labReportsRelations = relations(labReportsTable, ({ one }) => ({
  investigation: one(investigationsTable, {
    fields: [labReportsTable.investigationId],
    references: [investigationsTable.id],
  }),
  patient: one(patientsTable, {
    fields: [labReportsTable.patientId],
    references: [patientsTable.id],
  }),
  lab: one(organizationsTable, {
    fields: [labReportsTable.labId],
    references: [organizationsTable.id],
  }),
  verifiedByTechnician: one(usersTable, {
    fields: [labReportsTable.verifiedByTechnicianId],
    references: [usersTable.id],
  }),
}));

export const pharmacyOrdersRelations = relations(pharmacyOrdersTable, ({ one, many }) => ({
  patient: one(patientsTable, {
    fields: [pharmacyOrdersTable.patientId],
    references: [patientsTable.id],
  }),
  pharmacy: one(organizationsTable, {
    fields: [pharmacyOrdersTable.pharmacyId],
    references: [organizationsTable.id],
  }),
  prescription: one(prescriptionsTable, {
    fields: [pharmacyOrdersTable.prescriptionId],
    references: [prescriptionsTable.id],
  }),
  items: many(pharmacyOrderItemsTable),
}));

export const pharmacyOrderItemsRelations = relations(pharmacyOrderItemsTable, ({ one }) => ({
  order: one(pharmacyOrdersTable, {
    fields: [pharmacyOrderItemsTable.orderId],
    references: [pharmacyOrdersTable.id],
  }),
}));

export const paymentsRelations = relations(paymentsTable, ({ one }) => ({
  patient: one(patientsTable, {
    fields: [paymentsTable.patientId],
    references: [patientsTable.id],
  }),
  pharmacyOrder: one(pharmacyOrdersTable, {
    fields: [paymentsTable.orderId],
    references: [pharmacyOrdersTable.id],
  }),
  appointment: one(appointmentsTable, {
    fields: [paymentsTable.appointmentId],
    references: [appointmentsTable.id],
  }),
  invoice: one(invoicesTable, {
    fields: [paymentsTable.id],
    references: [invoicesTable.paymentId],
  }),
}));

export const healthcareJourneyEventsRelations = relations(healthcareJourneyEventsTable, ({ one }) => ({
  patient: one(patientsTable, {
    fields: [healthcareJourneyEventsTable.patientId],
    references: [patientsTable.id],
  }),
}));