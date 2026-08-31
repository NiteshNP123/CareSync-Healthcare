import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import http from "node:http";
import app from "./src/app.ts";
import { store } from "./src/lib/store.ts";

let server;
let baseUrl;

before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}/api`;
      console.log(`\n======================================================`);
      console.log(`🏥 CareSync Phase 2: Complete 20-Workflow Audit Server`);
      console.log(`🔗 Running at: ${baseUrl}`);
      console.log(`======================================================\n`);
      resolve();
    });
  });
});

after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
});

async function apiRequest(path, options = {}) {
  const url = `${baseUrl}${path}`;
  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      ...(options.headers || {}),
    },
    method: options.method || "GET",
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

describe("CareSync Phase 2: Complete 20-Workflow End-to-End Verification Audit", () => {
  let patientToken;
  let patient2Token;
  let doctorToken;
  let doctor2Token;
  let labToken;
  let pharmacyToken;
  let caregiverToken;
  let adminToken;

  let newPatientId;
  let newPatientCareSyncId;
  let newDoctorId;
  let accessRequestId;
  let bookedApptId;
  let d2dApptId;
  let consultationId;
  let prescriptionId;
  let investigationId;
  let labReportId;
  let pharmacyOrderId;
  let paymentId;
  let failedPaymentId;
  let caregiverId;

  // Setup tokens
  before(async () => {
    const pLogin = await apiRequest("/auth/login", {
      method: "POST",
      body: { email: "rahul.sharma@example.com", password: "demoPassword" },
    });
    patientToken = pLogin.data.token;

    const dLogin = await apiRequest("/auth/login", {
      method: "POST",
      body: { email: "dr.rahul.mehta@northstarmed.com", password: "demoPassword" },
    });
    doctorToken = dLogin.data.token;

    const d2Login = await apiRequest("/auth/login", {
      method: "POST",
      body: { email: "dr.ananya.sharma@astergrove.com", password: "demoPassword" },
    });
    doctor2Token = d2Login.data.token;

    const lSwitch = await apiRequest("/auth/demo-switch", { method: "POST", body: { role: "LAB_STAFF" } });
    labToken = lSwitch.data.token;

    const phSwitch = await apiRequest("/auth/demo-switch", { method: "POST", body: { role: "PHARMACY_STAFF" } });
    pharmacyToken = phSwitch.data.token;

    const cSwitch = await apiRequest("/auth/demo-switch", { method: "POST", body: { role: "CAREGIVER" } });
    caregiverToken = cSwitch.data.token;

    const aSwitch = await apiRequest("/auth/demo-switch", { method: "POST", body: { role: "ADMIN" } });
    adminToken = aSwitch.data.token;
  });

  // WORKFLOW 1: Patient registration → database persistence
  it("Workflow 1: Patient registration → database persistence", async () => {
    const res = await apiRequest("/auth/register", {
      method: "POST",
      body: {
        email: "neha.kapoor@example.com",
        password: "SecurePassword123!",
        role: "PATIENT",
        fullName: "Neha Kapoor",
        phone: "+91 98765 44332",
        gender: "Female",
        dateOfBirth: "1995-08-20",
        emergencyContactName: "Aman Kapoor",
        emergencyContactPhone: "+91 98765 44331",
      },
    });
    assert.strictEqual(res.status, 201, "Expected 201 Created for registration");
    assert.ok(res.data.token, "Expected JWT token returned");
    assert.ok(res.data.user.patientId, "Expected patient profile ID created");

    newPatientId = res.data.user.patientId;
    patient2Token = res.data.token;

    // Verify persistence in store
    const persistedUser = store.users.find((u) => u.email === "neha.kapoor@example.com");
    assert.ok(persistedUser, "User must be persisted in database store");
    const persistedPatient = store.patients.find((p) => p.id === newPatientId);
    assert.ok(persistedPatient, "Patient profile must be persisted in store");
    assert.ok(persistedPatient.careSyncId.startsWith("CS-"), "CareSync ID must be generated");
    newPatientCareSyncId = persistedPatient.careSyncId;

    // Verify audit log
    const audit = store.auditLogs.find((l) => l.action === "USER_REGISTRATION" && l.patientId === newPatientId);
    assert.ok(audit, "User registration must generate an audit log entry");
  });

  // WORKFLOW 2: Doctor registration → verification status
  it("Workflow 2: Doctor registration → verification status", async () => {
    const res = await apiRequest("/auth/register", {
      method: "POST",
      body: {
        email: "dr.vikram.patel@citycardio.org",
        password: "DoctorPassword123!",
        role: "DOCTOR",
        fullName: "Dr. Vikram Patel",
        phone: "+91 98765 11990",
        specialization: "Cardiology",
        qualification: "MBBS, MD, DM",
        licenseNumber: "KMC-2020-99881",
        organization: "City Heart Institute",
      },
    });
    assert.strictEqual(res.status, 201);
    assert.ok(res.data.user.doctorId);
    newDoctorId = res.data.user.doctorId;

    const doctor = store.doctors.find((d) => d.id === newDoctorId);
    assert.ok(doctor);
    assert.strictEqual(doctor.verificationStatus, "UNDER_REVIEW", "New doctors start with UNDER_REVIEW status");

    // Admin verifies doctor
    const verifyRes = await apiRequest(`/doctors/${newDoctorId}/verify`, {
      token: adminToken,
      method: "POST",
      body: { status: "VERIFIED" },
    });
    assert.strictEqual(verifyRes.status, 200);
    assert.strictEqual(doctor.verificationStatus, "VERIFIED", "Admin approval must update doctor to VERIFIED");

    // Verify audit log
    const audit = store.auditLogs.find((l) => l.action === "DOCTOR_CREDENTIAL_VERIFIED_BY_ADMIN" && l.entityId === newDoctorId);
    assert.ok(audit, "Doctor verification must be audit logged");
  });

  // WORKFLOW 3: Doctor access request → patient approval → scoped access
  it("Workflow 3: Doctor access request → patient approval → scoped access", async () => {
    // 1. Doctor requests access to Rahul Sharma (patientId: 1)
    const reqRes = await apiRequest("/access-requests", {
      token: doctor2Token,
      method: "POST",
      body: {
        careSyncId: "CS-2048-7392",
        purpose: "Pre-consultation review of cardiology & lipid panels",
        dataScopes: ["CONSULTATIONS", "PRESCRIPTIONS", "LAB_REPORTS", "JOURNEY", "VITALS"],
      },
    });
    assert.strictEqual(reqRes.status, 201);
    accessRequestId = reqRes.data.request.id;
    const otpCode = reqRes.data.request.otpCode;
    assert.ok(otpCode, "OTP must be generated for demo flow");

    // 2. Patient receives notification
    const notif = store.notifications.find((n) => n.userId === 1 && n.type === "ACCESS_REQUEST");
    assert.ok(notif, "Patient must receive notification on access request");

    // 3. Patient approves with OTP and selective scopes
    const approveRes = await apiRequest(`/access-requests/${accessRequestId}/decision`, {
      token: patientToken,
      method: "POST",
      body: {
        decision: "ALLOW",
        otp: otpCode,
        selectedScopes: ["CONSULTATIONS", "PRESCRIPTIONS", "LAB_REPORTS", "JOURNEY", "VITALS"],
      },
    });
    assert.strictEqual(approveRes.status, 200);
    assert.strictEqual(approveRes.data.request.status, "ALLOWED");

    // 4. Doctor now has active consent and can access patient records
    const consent = store.consentRecords.find((c) => c.patientId === 1 && c.doctorId === 2 && c.status === "ACTIVE");
    assert.ok(consent, "Active consent record must exist in store");

    const dashRes = await apiRequest("/patients/1/dashboard", { token: doctor2Token });
    assert.strictEqual(dashRes.status, 200, "Authorized doctor must be able to view patient dashboard");
  });

  // WORKFLOW 4: Patient denial → doctor remains blocked
  it("Workflow 4: Patient denial → doctor remains blocked", async () => {
    // 1. Doctor requests access to Neha Kapoor
    const reqRes = await apiRequest("/access-requests", {
      token: doctorToken,
      method: "POST",
      body: { careSyncId: newPatientCareSyncId, purpose: "General assessment" },
    });
    assert.strictEqual(reqRes.status, 201);
    const reqId = reqRes.data.request.id;

    // 2. Patient denies access
    const denyRes = await apiRequest(`/access-requests/${reqId}/decision`, {
      token: patient2Token,
      method: "POST",
      body: { decision: "DENY" },
    });
    assert.strictEqual(denyRes.status, 200);
    assert.strictEqual(denyRes.data.request.status, "DENIED");

    // 3. Doctor remains blocked when trying to access Neha Kapoor's dashboard
    const blockRes = await apiRequest(`/patients/${newPatientId}/dashboard`, { token: doctorToken });
    assert.strictEqual(blockRes.status, 403, "Doctor must receive 403 Forbidden without consent");
  });

  // WORKFLOW 5: Patient revokes access → doctor loses access
  it("Workflow 5: Patient revokes access → doctor loses access", async () => {
    const consent = store.consentRecords.find((c) => c.patientId === 1 && c.doctorId === 2 && c.status === "ACTIVE");
    assert.ok(consent);

    // Patient revokes consent
    const revokeRes = await apiRequest(`/consent-records/${consent.id}/revoke`, {
      token: patientToken,
      method: "POST",
    });
    assert.strictEqual(revokeRes.status, 200);
    assert.strictEqual(consent.status, "REVOKED");

    // Doctor now blocked from viewing patient vitals
    const vitalsRes = await apiRequest("/patients/1/vitals", { token: doctor2Token });
    assert.strictEqual(vitalsRes.status, 403, "Doctor must lose access immediately upon consent revocation");

    // Audit log
    const audit = store.auditLogs.find((l) => l.action === "CONSENT_REVOKED" && l.entityId === consent.id);
    assert.ok(audit, "Consent revocation must be logged in audit trail");
  });

  // WORKFLOW 6: Doctor consultation → database → patient journey
  it("Workflow 6: Doctor consultation → database → patient journey", async () => {
    const res = await apiRequest("/consultations", {
      token: doctorToken,
      method: "POST",
      body: {
        patientId: 1,
        symptoms: "Fatigue, evening headaches, elevated post-meal glucose",
        clinicalObservations: "BP 136/84 mmHg, clear lung sounds",
        assessmentDiagnosis: "Metabolic Syndrome & Stage 1 Hypertension",
        treatmentPlan: "Prescribe Metformin 500mg, Telmisartan 40mg. Low sodium diet.",
        followUpDate: "2026-09-28",
        prescriptions: [
          { name: "Metformin Hydrochloride 500mg SR", dosage: "500mg", frequency: "Once daily with dinner", duration: "30 days" },
          { name: "Telmisartan 40mg", dosage: "40mg", frequency: "Once daily in morning", duration: "30 days" },
        ],
        investigations: [
          { testName: "HbA1c & Fasting Lipid Panel", category: "BLOOD", priority: "ROUTINE" },
        ],
      },
    });
    assert.strictEqual(res.status, 201);
    consultationId = res.data.consultation.id;
    assert.ok(consultationId);

    // Verify consultation in database store
    const consult = store.consultations.find((c) => c.id === consultationId);
    assert.ok(consult, "Consultation must be saved in database store");

    // Verify automatic Journey Event creation
    const journeyEvent = store.journeyEvents.find(
      (e) => e.sourceEntity === "consultation" && e.sourceEntityId === consultationId
    );
    assert.ok(journeyEvent, "HealthcareJourneyEvent must be automatically created for consultation");
    assert.strictEqual(journeyEvent.eventType, "CONSULTATION");

    // Verify patient notification
    const notif = store.notifications.find((n) => n.userId === 1 && n.type === "APPOINTMENT_UPDATE");
    assert.ok(notif, "Patient must be notified of new consultation notes");
  });

  // WORKFLOW 7: Doctor prescription → database → patient record
  it("Workflow 7: Doctor prescription → database → patient record", async () => {
    const rx = store.prescriptions.find((p) => p.consultationId === consultationId);
    assert.ok(rx, "Prescription must be linked to consultation");
    prescriptionId = rx.id;

    const items = store.prescriptionItems.filter((i) => i.prescriptionId === prescriptionId);
    assert.strictEqual(items.length, 2, "Must contain 2 prescribed medicines");

    // Patient queries their prescriptions
    const res = await apiRequest("/prescriptions", { token: patientToken });
    assert.strictEqual(res.status, 200);
    const patientRx = res.data.find((p) => p.id === prescriptionId);
    assert.ok(patientRx, "Prescription must appear in patient's records");
    assert.strictEqual(patientRx.items.length, 2);
  });

  // WORKFLOW 8: Doctor investigation request → lab workflow
  it("Workflow 8: Doctor investigation request → lab workflow", async () => {
    const inv = store.investigations.find((i) => i.consultationId === consultationId);
    assert.ok(inv, "Investigation must be linked to consultation");
    investigationId = inv.id;

    // Lab queries requisitions
    const res = await apiRequest("/investigations", { token: labToken });
    assert.strictEqual(res.status, 200);
    const labInv = res.data.find((i) => i.id === investigationId);
    assert.ok(labInv, "Investigation must appear in Lab's requisition queue");
    assert.strictEqual(labInv.status, "ORDERED");
  });

  // WORKFLOW 9: Lab uploads report → patient journey → authorized doctor access
  it("Workflow 9: Lab uploads report → patient journey → authorized doctor access", async () => {
    // 1. Lab marks sample collected
    await apiRequest(`/lab/investigations/${investigationId}/sample`, {
      token: labToken,
      method: "PATCH",
      body: { status: "SAMPLE_COLLECTED" },
    });

    // 2. Lab publishes structured report
    const pubRes = await apiRequest("/lab/reports", {
      token: labToken,
      method: "POST",
      body: {
        patientId: 1,
        investigationId,
        testName: "HbA1c & Fasting Lipid Panel",
        category: "LAB_REPORT",
        summary: "Glycated Hemoglobin in pre-diabetic range (6.6%). Normal renal indices.",
        structuredResults: [
          { parameter: "HbA1c", value: "6.6", unit: "%", referenceRange: "4.0 - 5.6", flag: "HIGH" },
          { parameter: "Fasting Blood Glucose", value: "114", unit: "mg/dL", referenceRange: "70 - 99", flag: "HIGH" },
          { parameter: "Total Cholesterol", value: "215", unit: "mg/dL", referenceRange: "< 200", flag: "HIGH" },
          { parameter: "Serum Creatinine", value: "0.90", unit: "mg/dL", referenceRange: "0.70 - 1.20", flag: "NORMAL" },
        ],
      },
    });
    assert.strictEqual(pubRes.status, 201);
    labReportId = pubRes.data.report.id;

    // 3. Verify in patient journey
    const journey = store.journeyEvents.find((e) => e.sourceEntity === "lab_report" && e.sourceEntityId === labReportId);
    assert.ok(journey, "Lab report must be automatically attached to Healthcare Journey");
    assert.strictEqual(journey.eventType, "REPORT");

    // 4. Verify ordering doctor (Dr. Rahul Mehta) receives report
    const doctorReports = await apiRequest("/lab/reports", { token: doctorToken });
    assert.strictEqual(doctorReports.status, 200);
    const foundReport = doctorReports.data.find((r) => r.id === labReportId);
    assert.ok(foundReport, "Ordering doctor must see verified lab report");
  });

  // WORKFLOW 10: Patient appointment → slot validation → appointment persistence
  it("Workflow 10: Patient appointment → slot validation → appointment persistence", async () => {
    // 1. Patient books appointment with Dr. Rahul Mehta
    const bookRes = await apiRequest("/appointments", {
      token: patientToken,
      method: "POST",
      body: { doctorId: 1, date: "2026-10-05", time: "02:30 PM", mode: "Video consultation" },
    });
    assert.strictEqual(bookRes.status, 201);
    bookedApptId = bookRes.data.id;
    assert.ok(bookedApptId);

    // 2. Verify in appointments table
    const appt = store.appointments.find((a) => a.id === bookedApptId);
    assert.ok(appt);
    assert.strictEqual(appt.status, "CONFIRMED");

    // 3. Attempt double-booking same doctor, date, and time
    const conflictRes = await apiRequest("/appointments", {
      token: patient2Token,
      method: "POST",
      body: { doctorId: 1, date: "2026-10-05", time: "02:30 PM", mode: "In-clinic visit" },
    });
    assert.strictEqual(conflictRes.status, 409, "Must return 409 Conflict for double-booking");
  });

  // WORKFLOW 11: Doctor-to-doctor appointment → separate appointment type
  it("Workflow 11: Doctor-to-doctor appointment → separate appointment type", async () => {
    // Dr. Rahul Mehta books referral appointment with Dr. Ananya Sharma for Rahul Sharma
    const d2dRes = await apiRequest("/appointments", {
      token: doctorToken,
      method: "POST",
      body: {
        doctorId: 2,
        patientId: 1,
        date: "2026-10-12",
        time: "10:00 AM",
        mode: "In-clinic visit",
        appointmentType: "DOCTOR_TO_DOCTOR",
        bookedByDoctorId: 1,
        reason: "Cardiology consult for metabolic dyslipidemia",
      },
    });
    assert.strictEqual(d2dRes.status, 201);
    d2dApptId = d2dRes.data.id;
    assert.strictEqual(d2dRes.data.appointmentType, "DOCTOR_TO_DOCTOR", "Must record DOCTOR_TO_DOCTOR appointment type");
    assert.strictEqual(d2dRes.data.bookedByDoctorId, 1, "Must record referring doctor ID");
  });

  // WORKFLOW 12: Pharmacy order → prescription validation → order persistence
  it("Workflow 12: Pharmacy order → prescription validation → order persistence", async () => {
    const orderRes = await apiRequest("/pharmacy/orders", {
      token: patientToken,
      method: "POST",
      body: {
        prescriptionId,
        pharmacyId: 2,
        deliveryAddress: "Flat 402, Palm Meadows, Indiranagar, Bengaluru",
      },
    });
    assert.strictEqual(orderRes.status, 201);
    pharmacyOrderId = orderRes.data.order.id;
    assert.ok(orderRes.data.order.orderNumber);
    assert.strictEqual(orderRes.data.items.length, 2, "Must contain prescription medicine line items");

    // Verify order in database store
    const order = store.pharmacyOrders.find((o) => o.id === pharmacyOrderId);
    assert.ok(order);
    assert.strictEqual(order.status, "PLACED");
  });

  // WORKFLOW 13: Pharmacy bill → payment request → sandbox payment
  it("Workflow 13: Pharmacy bill → payment request → sandbox payment", async () => {
    const order = store.pharmacyOrders.find((o) => o.id === pharmacyOrderId);
    assert.ok(order);

    // 1. Create sandbox payment request
    const payReqRes = await apiRequest("/payments/create", {
      token: patientToken,
      method: "POST",
      body: {
        paymentType: "PHARMACY",
        orderId: pharmacyOrderId,
        amount: order.totalAmount,
      },
    });
    assert.strictEqual(payReqRes.status, 201);
    paymentId = payReqRes.data.payment.id;

    // 2. Process sandbox payment
    const payProcRes = await apiRequest(`/payments/${paymentId}/process`, {
      token: patientToken,
      method: "POST",
      body: {},
    });
    assert.strictEqual(payProcRes.status, 200);
    assert.strictEqual(payProcRes.data.payment.status, "PAID");
    assert.ok(payProcRes.data.invoice.invoiceNumber.startsWith("INV-"), "Must generate invoice receipt");

    // 3. Order status updated to PAID
    assert.strictEqual(order.status, "PAID", "Order must transition to PAID status");
  });

  // WORKFLOW 14: Payment failure → correct order state
  it("Workflow 14: Payment failure → correct order state", async () => {
    // Create payment request
    const createRes = await apiRequest("/payments/create", {
      token: patientToken,
      method: "POST",
      body: { paymentType: "APPOINTMENT", amount: "850.00", appointmentId: bookedApptId },
    });
    assert.strictEqual(createRes.status, 201);
    failedPaymentId = createRes.data.payment.id;

    // Process payment with simulated failure
    const failRes = await apiRequest(`/payments/${failedPaymentId}/process`, {
      token: patientToken,
      method: "POST",
      body: { simulateFailure: true },
    });
    assert.strictEqual(failRes.status, 400);
    assert.strictEqual(failRes.data.payment.status, "FAILED", "Payment state must be marked FAILED");
  });

  // WORKFLOW 15: Caregiver invitation → permission → caregiver access
  it("Workflow 15: Caregiver invitation → permission → caregiver access", async () => {
    // 1. Patient invites caregiver
    const inviteRes = await apiRequest("/patients/1/caregivers", {
      token: patientToken,
      method: "POST",
      body: {
        email: "rohit.sharma@example.com",
        relationship: "Brother",
        permissions: ["APPOINTMENTS", "JOURNEY_PROGRESS", "NOTIFICATIONS"],
      },
    });
    assert.strictEqual(inviteRes.status, 201);
    caregiverId = inviteRes.data.id;

    // 2. Caregiver switches persona and can read patient's journey
    const cLogin = await apiRequest("/auth/demo-switch", { method: "POST", body: { role: "CAREGIVER" } });
    const cToken = cLogin.data.token;

    const jRes = await apiRequest("/patients/1/journey", { token: cToken });
    assert.strictEqual(jRes.status, 200, "Caregiver with permission must be able to view journey timeline");
  });

  // WORKFLOW 16: Audit logging for all sensitive operations
  it("Workflow 16: Audit logging for all sensitive operations", async () => {
    const res = await apiRequest("/audit-logs", { token: adminToken });
    assert.strictEqual(res.status, 200);
    assert.ok(res.data.length >= 10, "Audit logs must record all critical encounters and access decisions");

    const actions = res.data.map((l) => l.action);
    assert.ok(actions.includes("USER_REGISTRATION"), "Must log USER_REGISTRATION");
    assert.ok(actions.includes("CONSULTATION_CREATED"), "Must log CONSULTATION_CREATED");
    assert.ok(actions.includes("LAB_REPORT_PUBLISHED"), "Must log LAB_REPORT_PUBLISHED");
    assert.ok(actions.includes("PAYMENT_COMPLETED_SANDBOX"), "Must log PAYMENT_COMPLETED_SANDBOX");
  });

  // WORKFLOW 17: Unauthorized API access attempts
  it("Workflow 17: Unauthorized API access attempts", async () => {
    // No auth token
    const res = await apiRequest("/patients/1/dashboard");
    assert.strictEqual(res.status, 401, "Unauthenticated calls must return 401 Unauthorized");
  });

  // WORKFLOW 18: Cross-patient data access attempts
  it("Workflow 18: Cross-patient data access attempts", async () => {
    // Neha Kapoor (patientId: 2) attempts to view Rahul Sharma's (patientId: 1) dashboard
    const res = await apiRequest("/patients/1/dashboard", { token: patient2Token });
    assert.strictEqual(res.status, 403, "Cross-patient unauthorized access must be blocked with 403 Forbidden");
  });

  // WORKFLOW 19: Cross-organization access attempts
  it("Workflow 19: Cross-organization access attempts", async () => {
    // Lab staff attempts to publish prescription
    const res = await apiRequest("/consultations", {
      token: labToken,
      method: "POST",
      body: { patientId: 1, symptoms: "Test", assessmentDiagnosis: "Test", treatmentPlan: "Test" },
    });
    assert.strictEqual(res.status, 403, "Lab staff cannot create doctor clinical consultations");
  });

  // WORKFLOW 20: AI endpoint access restrictions & disclaimers
  it("Workflow 20: AI endpoint access restrictions & disclaimers", async () => {
    // 1. Unauthenticated AI search blocked
    const unauthRes = await apiRequest("/ai/search", { method: "POST", body: { query: "blood reports" } });
    assert.strictEqual(unauthRes.status, 401);

    // 2. Authenticated AI search contains safety disclaimer
    const authRes = await apiRequest("/ai/search", {
      token: patientToken,
      method: "POST",
      body: { query: "Lipid", patientId: 1 },
    });
    assert.strictEqual(authRes.status, 200);
    assert.ok(authRes.data.disclaimer.includes("does not replace professional medical diagnosis"));
  });
});
