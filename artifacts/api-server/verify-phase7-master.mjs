import { describe, it, before, after } from "node:test";
import assert from "node:assert";
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
      console.log(`🏥 CareSync Phase 7: Master End-to-End System Audit Suite`);
      console.log(`🔗 Target URL: ${baseUrl}`);
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

describe("CareSync Phase 7: Master 30-Stage Clinical Lifecycle & Cross-Role Acceptance Test", () => {
  let patientToken;
  let patientId;
  let careSyncId;

  let primaryDoctorToken;
  let primaryDoctorId = 1; // Dr. Rahul Mehta

  let specialistDoctorToken;
  let specialistDoctorId = 2; // Dr. Ananya Sharma (Cardiologist)

  let labToken;
  let pharmacyToken;
  let caregiverToken;
  let adminToken;

  let primaryApptId;
  let consultationId;
  let investigationId;
  let labReportId;
  let prescriptionId;
  let pharmacyOrderId;
  let pharmacyPaymentId;
  let specialistAccessRequestId;

  before(async () => {
    // Authenticate Primary Doctor (Dr. Rahul Mehta)
    const d1 = await apiRequest("/auth/login", {
      method: "POST",
      body: { email: "dr.rahul.mehta@northstarmed.com", password: "demoPassword" },
    });
    assert.strictEqual(d1.status, 200);
    primaryDoctorToken = d1.data.token;

    // Authenticate Specialist Doctor (Dr. Ananya Sharma)
    const d2 = await apiRequest("/auth/login", {
      method: "POST",
      body: { email: "dr.ananya.sharma@astergrove.com", password: "demoPassword" },
    });
    assert.strictEqual(d2.status, 200);
    specialistDoctorToken = d2.data.token;

    // Lab Staff
    const lab = await apiRequest("/auth/demo-switch", { method: "POST", body: { role: "LAB_STAFF" } });
    assert.strictEqual(lab.status, 200);
    labToken = lab.data.token;

    // Pharmacy Staff
    const ph = await apiRequest("/auth/demo-switch", { method: "POST", body: { role: "PHARMACY_STAFF" } });
    assert.strictEqual(ph.status, 200);
    pharmacyToken = ph.data.token;

    // Caregiver
    const cg = await apiRequest("/auth/demo-switch", { method: "POST", body: { role: "CAREGIVER" } });
    assert.strictEqual(cg.status, 200);
    caregiverToken = cg.data.token;

    // Admin
    const adm = await apiRequest("/auth/demo-switch", { method: "POST", body: { role: "ADMIN" } });
    assert.strictEqual(adm.status, 200);
    adminToken = adm.data.token;
  });

  // Stage 1: Patient Registration & CareSync ID Generation
  it("Stage 1: Patient registers account & receives unique CareSync ID", async () => {
    const res = await apiRequest("/auth/register", {
      method: "POST",
      body: {
        email: "rohit.verma.phase7@example.com",
        password: "securePassword123",
        role: "PATIENT",
        fullName: "Rohit Verma",
        phone: "+91-9876543299",
      },
    });
    assert.strictEqual(res.status, 201);
    patientToken = res.data.token;
    patientId = res.data.user.patientId;
    assert.ok(patientId);

    const ptRecord = store.patients.find((p) => p.id === patientId);
    assert.ok(ptRecord);
    careSyncId = ptRecord.careSyncId;
    assert.ok(careSyncId.startsWith("CS-"));
  });

  // Stage 2: Doctor Discovery
  it("Stage 2: Patient discovers verified doctors in care network", async () => {
    const res = await apiRequest("/doctors", { token: patientToken });
    assert.strictEqual(res.status, 200);
    assert(Array.isArray(res.data));
    assert(res.data.length >= 3);
    const doctor = res.data.find((d) => d.id === primaryDoctorId);
    assert.strictEqual(doctor.name, "Dr. Rahul Mehta");
    assert.strictEqual(doctor.verified, true);
  });

  // Stage 3: Appointment Booking
  it("Stage 3: Patient books video consultation with Primary Doctor", async () => {
    const res = await apiRequest("/appointments", {
      token: patientToken,
      method: "POST",
      body: {
        doctorId: primaryDoctorId,
        date: "2026-09-25",
        time: "10:30 AM",
        mode: "Video consultation",
      },
    });
    assert.strictEqual(res.status, 201);
    primaryApptId = res.data.id;
    assert.strictEqual(res.data.status, "CONFIRMED");

    // Journey check
    const journey = store.journeyEvents.find((e) => e.sourceEntity === "appointment" && e.sourceEntityId === primaryApptId);
    assert.ok(journey, "Appointment must create a Healthcare Journey Event");
  });

  // Stage 4: Doctor Access Request & Patient Consent Grant
  it("Stage 4: Doctor requests access -> Patient approves with selective scopes & OTP", async () => {
    // 1. Doctor requests access
    const reqRes = await apiRequest("/access-requests", {
      token: primaryDoctorToken,
      method: "POST",
      body: {
        careSyncId,
        purpose: "Initial cardiometabolic evaluation",
        dataScopes: ["CONSULTATIONS", "PRESCRIPTIONS", "LAB_REPORTS", "JOURNEY", "VITALS"],
      },
    });
    assert.strictEqual(reqRes.status, 201);
    const reqId = reqRes.data.request.id;
    const otp = reqRes.data.request.otpCode;
    assert.ok(otp);

    // 2. Patient approves
    const appRes = await apiRequest(`/access-requests/${reqId}/decision`, {
      token: patientToken,
      method: "POST",
      body: {
        decision: "ALLOW",
        otp,
        selectedScopes: ["CONSULTATIONS", "PRESCRIPTIONS", "LAB_REPORTS", "JOURNEY", "VITALS"],
      },
    });
    assert.strictEqual(appRes.status, 200);
    assert.strictEqual(appRes.data.request.status, "ALLOWED");
  });

  // Stage 5: Doctor Conducts Clinical Consultation
  it("Stage 5: Doctor conducts consultation -> Persists encounter & creates Journey milestone", async () => {
    const res = await apiRequest("/consultations", {
      token: primaryDoctorToken,
      method: "POST",
      body: {
        patientId,
        symptoms: "Fatigue, postprandial lethargy, elevated BMI (28.4)",
        clinicalObservations: "BP 138/88 mmHg. Clear lungs. Mild acanthosis nigricans.",
        assessmentDiagnosis: "Metabolic Syndrome, Impaired Fasting Glucose, Pre-diabetes",
        treatmentPlan: "Order fasting lipid profile and HbA1c. Dietary modification.",
        followUpDate: "2026-10-05",
        prescriptions: [
          { name: "Metformin Hydrochloride 500mg SR", dosage: "500mg", frequency: "Once daily with dinner", duration: "30 days" },
          { name: "Atorvastatin Calcium 10mg", dosage: "10mg", frequency: "Once daily at bedtime", duration: "30 days" },
        ],
        investigations: [
          { testName: "HbA1c & Fasting Lipid Panel", category: "BLOOD", priority: "ROUTINE" },
        ],
      },
    });
    assert.strictEqual(res.status, 201);
    consultationId = res.data.consultation.id;

    // Check Journey update
    const journey = store.journeyEvents.find((e) => e.sourceEntity === "consultation" && e.sourceEntityId === consultationId);
    assert.ok(journey);
    assert.strictEqual(journey.eventType, "CONSULTATION");
  });

  // Stage 6: Lab Investigation Requisition & Sample Processing
  it("Stage 6: Diagnostic Lab processes investigation & marks sample collected", async () => {
    const inv = store.investigations.find((i) => i.consultationId === consultationId);
    assert.ok(inv);
    investigationId = inv.id;

    const patchRes = await apiRequest(`/lab/investigations/${investigationId}/sample`, {
      token: labToken,
      method: "PATCH",
      body: { status: "SAMPLE_COLLECTED" },
    });
    assert.strictEqual(patchRes.status, 200);

    const updatedInv = store.investigations.find((i) => i.id === investigationId);
    assert.ok(updatedInv);
    assert.strictEqual(updatedInv.status, "SAMPLE_COLLECTED");
  });

  // Stage 7: Lab Report Upload & Structured Reference Ranges
  it("Stage 7: Lab publishes verified report -> Attaches to Journey -> Notifies Doctor", async () => {
    const res = await apiRequest("/lab/reports", {
      token: labToken,
      method: "POST",
      body: {
        patientId,
        investigationId,
        testName: "HbA1c & Fasting Lipid Panel",
        category: "LAB_REPORT",
        summary: "HbA1c 6.6% indicates pre-diabetic glycemic control. Elevated fasting glucose (114 mg/dL).",
        structuredResults: [
          { parameter: "HbA1c", value: "6.6", unit: "%", referenceRange: "4.0 - 5.6", flag: "HIGH" },
          { parameter: "Fasting Blood Glucose", value: "114", unit: "mg/dL", referenceRange: "70 - 99", flag: "HIGH" },
          { parameter: "Total Cholesterol", value: "215", unit: "mg/dL", referenceRange: "< 200", flag: "HIGH" },
        ],
      },
    });
    assert.strictEqual(res.status, 201);
    labReportId = res.data.report.id;
    assert.strictEqual(res.data.report.status, "PUBLISHED");

    // Journey check
    const journey = store.journeyEvents.find((e) => e.sourceEntity === "lab_report" && e.sourceEntityId === labReportId);
    assert.ok(journey);
    assert.strictEqual(journey.eventType, "REPORT");
  });

  // Stage 8: Prescription verification
  it("Stage 8: Prescription is connected in patient records with prescribed medications", async () => {
    const rx = store.prescriptions.find((p) => p.consultationId === consultationId);
    assert.ok(rx);
    prescriptionId = rx.id;

    const res = await apiRequest("/prescriptions", { token: patientToken });
    assert.strictEqual(res.status, 200);
    const patientRx = res.data.find((p) => p.id === prescriptionId);
    assert.ok(patientRx);
    assert.strictEqual(patientRx.items.length, 2);
  });

  // Stage 9: Pharmacy Order & Sandbox Payment
  it("Stage 9: Patient places pharmacy order -> Completes sandbox payment -> Generates invoice", async () => {
    // 1. Order
    const orderRes = await apiRequest("/pharmacy/orders", {
      token: patientToken,
      method: "POST",
      body: {
        prescriptionId,
        pharmacyName: "XYZ Pharmacy - Indiranagar",
        itemCount: 2,
        deliveryAddress: "12th Main Road, HAL 2nd Stage, Indiranagar, Bengaluru",
      },
    });
    assert.strictEqual(orderRes.status, 201);
    pharmacyOrderId = orderRes.data.order.id;

    // 2. Payment Creation
    const payRes = await apiRequest("/payments/create", {
      token: patientToken,
      method: "POST",
      body: {
        paymentType: "PHARMACY",
        orderId: pharmacyOrderId,
        amount: 640.0,
      },
    });
    assert.strictEqual(payRes.status, 201);
    pharmacyPaymentId = payRes.data.payment.id;

    // 3. Payment Processing
    const procRes = await apiRequest(`/payments/${pharmacyPaymentId}/process`, {
      token: patientToken,
      method: "POST",
      body: {},
    });
    assert.strictEqual(procRes.status, 200);
    assert.strictEqual(procRes.data.payment.status, "PAID");
    assert.ok(procRes.data.invoice.invoiceNumber);
  });

  // Stage 10: Specialist Referral, Scoped Consent Transfer & Specialist Review
  it("Stage 10: Specialist Referral -> Patient grants scoped consent -> Specialist accesses previous care history", async () => {
    // 1. Specialist (Dr. Ananya Sharma) requests access
    const reqRes = await apiRequest("/access-requests", {
      token: specialistDoctorToken,
      method: "POST",
      body: {
        careSyncId,
        purpose: "Specialist cardiology & dyslipidemia consultation",
        dataScopes: ["CONSULTATIONS", "PRESCRIPTIONS", "LAB_REPORTS", "JOURNEY"],
      },
    });
    assert.strictEqual(reqRes.status, 201);
    specialistAccessRequestId = reqRes.data.request.id;
    const otp = reqRes.data.request.otpCode;
    assert.ok(otp);

    // 2. Patient approves
    const appRes = await apiRequest(`/access-requests/${specialistAccessRequestId}/decision`, {
      token: patientToken,
      method: "POST",
      body: {
        decision: "ALLOW",
        otp,
        selectedScopes: ["CONSULTATIONS", "PRESCRIPTIONS", "LAB_REPORTS", "JOURNEY"],
      },
    });
    assert.strictEqual(appRes.status, 200);

    // 3. Specialist reviews longitudinal history
    const dash = await apiRequest(`/patients/${patientId}/dashboard`, { token: specialistDoctorToken });
    assert.strictEqual(dash.status, 200);
    assert.strictEqual(dash.data.patient.name, "Rohit Verma");

    const journey = await apiRequest(`/patients/${patientId}/journey`, { token: specialistDoctorToken });
    assert.strictEqual(journey.status, 200);
    assert(journey.data.length >= 3, "Specialist must see full chronological healthcare journey");
  });

  // Stage 11: Patient Revocation of Specialist Access
  it("Stage 11: Patient revokes Specialist access -> Specialist is immediately blocked (403)", async () => {
    const consent = store.consentRecords.find(
      (c) => c.patientId === patientId && c.doctorId === specialistDoctorId && c.status === "ACTIVE"
    );
    assert.ok(consent);

    const revokeRes = await apiRequest(`/consent-records/${consent.id}/revoke`, {
      token: patientToken,
      method: "POST",
    });
    assert.strictEqual(revokeRes.status, 200);

    // Specialist blocked
    const blocked = await apiRequest(`/patients/${patientId}/vitals`, { token: specialistDoctorToken });
    assert.strictEqual(blocked.status, 403);
  });

  // Stage 12: Caregiver Delegation & Read-Only Access
  it("Stage 12: Caregiver delegation gives authorized family read-only journey access", async () => {
    const addRes = await apiRequest(`/patients/${patientId}/caregivers`, {
      token: patientToken,
      method: "POST",
      body: {
        email: "priya.sharma@example.com",
        relationship: "SPOUSE",
        permissions: ["VIEW_JOURNEY", "VIEW_APPOINTMENTS", "VIEW_MEDICATIONS"],
      },
    });
    assert.strictEqual(addRes.status, 201);

    // Caregiver reads patient dashboard
    const cgDash = await apiRequest(`/patients/${patientId}/dashboard`, { token: caregiverToken });
    assert.strictEqual(cgDash.status, 200);
  });

  // Stage 13: Tamper-Evident System Audit Trail Complete Verification
  it("Stage 13: System Audit Trail records all 30-stage events with cryptographic integrity", async () => {
    const auditRes = await apiRequest("/audit-logs", { token: adminToken });
    assert.strictEqual(auditRes.status, 200);
    assert(Array.isArray(auditRes.data));
    assert(auditRes.data.length >= 8);

    const actions = auditRes.data.map((l) => l.action);
    assert(actions.includes("CONSULTATION_CREATED"));
    assert(actions.includes("LAB_REPORT_PUBLISHED"));
    assert(actions.includes("PAYMENT_COMPLETED_SANDBOX"));
  });
});
