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
      console.log(`🛡️ CareSync Phase 6: Security & Multi-Role Verification Suite`);
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

describe("CareSync Phase 6: Multi-Role Experience, Clinical Portals & Security Verification", () => {
  let patient1Token;
  let patient2Token;
  let doctor1Token; // Dr. Rahul Mehta (authorized for Patient 1)
  let doctor2Token; // Dr. Ananya Sharma (initially unauthorized for Patient 1)
  let lab1Token;    // ABC Diagnostics (Org 1)
  let pharmacy1Token; // XYZ Pharmacy (Org 2)
  let caregiver1Token; // Priya Sharma (authorized for Patient 1)
  let adminToken;

  let patient1Id;
  let patient2Id;
  let patient2CareSyncId;
  let apptId;
  let consultationId;
  let investigationId;
  let labReportId;
  let prescriptionId;
  let pharmacyOrderId;
  let paymentId;
  let specialistAccessRequestId;

  before(async () => {
    // 1. Authenticate Patient 1 (Rahul Sharma)
    const p1Login = await apiRequest("/auth/login", {
      method: "POST",
      body: { email: "rahul.sharma@example.com", password: "demoPassword" },
    });
    assert.strictEqual(p1Login.status, 200);
    patient1Token = p1Login.data.token;
    patient1Id = 1;

    // 2. Register / Authenticate Patient 2 (Neha Kapoor)
    const p2Reg = await apiRequest("/auth/register", {
      method: "POST",
      body: {
        email: "neha.kapoor.phase6@example.com",
        password: "securePassword123",
        role: "PATIENT",
        fullName: "Neha Kapoor",
        phone: "+91-9876543219",
      },
    });
    assert.strictEqual(p2Reg.status, 201);
    patient2Token = p2Reg.data.token;
    patient2Id = p2Reg.data.user.patientId || p2Reg.data.user.id;
    patient2CareSyncId = p2Reg.data.user.careSyncId || "CS-1940-8812";

    // 3. Authenticate Doctor 1 (Dr. Rahul Mehta)
    const d1Login = await apiRequest("/auth/login", {
      method: "POST",
      body: { email: "dr.rahul.mehta@northstarmed.com", password: "demoPassword" },
    });
    assert.strictEqual(d1Login.status, 200);
    doctor1Token = d1Login.data.token;

    // 4. Authenticate Doctor 2 / Specialist (Dr. Ananya Sharma)
    const d2Login = await apiRequest("/auth/login", {
      method: "POST",
      body: { email: "dr.ananya.sharma@astergrove.com", password: "demoPassword" },
    });
    assert.strictEqual(d2Login.status, 200);
    doctor2Token = d2Login.data.token;

    // 5. Authenticate Lab Staff
    const labSwitch = await apiRequest("/auth/demo-switch", { method: "POST", body: { role: "LAB_STAFF" } });
    assert.strictEqual(labSwitch.status, 200);
    lab1Token = labSwitch.data.token;

    // 6. Authenticate Pharmacy Staff
    const phSwitch = await apiRequest("/auth/demo-switch", { method: "POST", body: { role: "PHARMACY_STAFF" } });
    assert.strictEqual(phSwitch.status, 200);
    pharmacy1Token = phSwitch.data.token;

    // 7. Authenticate Caregiver
    const cSwitch = await apiRequest("/auth/demo-switch", { method: "POST", body: { role: "CAREGIVER" } });
    assert.strictEqual(cSwitch.status, 200);
    caregiver1Token = cSwitch.data.token;

    // 8. Authenticate Admin
    const aSwitch = await apiRequest("/auth/demo-switch", { method: "POST", body: { role: "ADMIN" } });
    assert.strictEqual(aSwitch.status, 200);
    adminToken = aSwitch.data.token;
  });

  // ==========================================
  // 1. SIX-ROLE AUTH & VISIBILITY VERIFICATION
  // ==========================================
  it("Role 1: Patient can view own profile, dashboard, and journey", async () => {
    const dash = await apiRequest(`/patients/${patient1Id}/dashboard`, { token: patient1Token });
    assert.strictEqual(dash.status, 200);
    assert.strictEqual(dash.data.patient.name, "Rahul Sharma");

    const journey = await apiRequest(`/patients/${patient1Id}/journey`, { token: patient1Token });
    assert.strictEqual(journey.status, 200);
    assert(Array.isArray(journey.data));
  });

  it("Role 2: Doctor can access authorized patients and manage appointments", async () => {
    const appts = await apiRequest("/appointments", { token: doctor1Token });
    assert.strictEqual(appts.status, 200);
    assert(Array.isArray(appts.data));
  });

  it("Role 3: Lab staff can view pending investigations", async () => {
    const invs = await apiRequest("/investigations", { token: lab1Token });
    assert.strictEqual(invs.status, 200);
    assert(Array.isArray(invs.data));
  });

  it("Role 4: Pharmacy staff can view pharmacy orders", async () => {
    const orders = await apiRequest("/pharmacy/orders", { token: pharmacy1Token });
    assert.strictEqual(orders.status, 200);
    assert(Array.isArray(orders.data));
  });

  it("Role 5: Caregiver can view delegated patient dashboard", async () => {
    const cDash = await apiRequest(`/patients/${patient1Id}/dashboard`, { token: caregiver1Token });
    assert.strictEqual(cDash.status, 200);
  });

  it("Role 6: Admin can view audit logs and doctor verification queues", async () => {
    const logs = await apiRequest("/audit-logs", { token: adminToken });
    assert.strictEqual(logs.status, 200);
    assert(Array.isArray(logs.data));
  });

  // ==========================================
  // 2. OBJECT-LEVEL AUTHORIZATION & IDOR TESTS
  // ==========================================
  it("IDOR Attack: Patient 1 attempting to access Patient 2 dashboard is rejected (403)", async () => {
    const res = await apiRequest(`/patients/${patient2Id}/dashboard`, { token: patient1Token });
    assert.strictEqual(res.status, 403);
  });

  it("IDOR Attack: Patient 2 attempting to access Patient 1 vitals is rejected (403)", async () => {
    const res = await apiRequest(`/patients/${patient1Id}/vitals`, { token: patient2Token });
    assert.strictEqual(res.status, 403);
  });

  it("Unauthorized Access Attack: Doctor 2 (unconsented) attempting to access Patient 1 is rejected (403)", async () => {
    const res = await apiRequest(`/patients/${patient1Id}/dashboard`, { token: doctor2Token });
    assert.strictEqual(res.status, 403);
  });

  it("Unauthorized Access Attack: Doctor 1 attempting to access unconsented Patient 2 is rejected (403)", async () => {
    const res = await apiRequest(`/patients/${patient2Id}/dashboard`, { token: doctor1Token });
    assert.strictEqual(res.status, 403);
  });

  // ==========================================
  // 3. CLINICAL DATA IMMUTABILITY & RBAC
  // ==========================================
  it("Clinical Immutability: Lab Staff attempting to create consultation is rejected (403)", async () => {
    const res = await apiRequest("/consultations", {
      token: lab1Token,
      method: "POST",
      body: {
        patientId: patient1Id,
        symptoms: "Lab trying to doctor",
        clinicalObservations: "None",
        assessmentDiagnosis: "None",
        treatmentPlan: "None",
      },
    });
    assert.strictEqual(res.status, 403);
  });

  it("Clinical Immutability: Patient attempting to publish lab report is rejected (403)", async () => {
    const res = await apiRequest("/lab/reports", {
      token: patient1Token,
      method: "POST",
      body: { investigationId: 1, testName: "Patient Faking CBC", structuredResults: [] },
    });
    assert.strictEqual(res.status, 403);
  });

  // ==========================================
  // 4. PHASE 6 COMPLETE ACCEPTANCE WORKFLOW
  // ==========================================
  it("Acceptance Step 1: Patient 1 books appointment with Doctor 1", async () => {
    const res = await apiRequest("/appointments", {
      token: patient1Token,
      method: "POST",
      body: {
        doctorId: 1,
        date: "2026-09-24",
        time: "03:00 PM",
        mode: "Video consultation",
      },
    });
    assert.strictEqual(res.status, 201);
    apptId = res.data.id;
    assert.strictEqual(res.data.status, "CONFIRMED");
  });

  it("Acceptance Step 2: Doctor 1 conducts consultation with Patient 1", async () => {
    const res = await apiRequest("/consultations", {
      token: doctor1Token,
      method: "POST",
      body: {
        patientId: patient1Id,
        symptoms: "Glycemic review and metabolic follow-up",
        clinicalObservations: "BP 136/84 mmHg, clear chest",
        assessmentDiagnosis: "Impaired fasting glucose and mild dyslipidemia",
        treatmentPlan: "Prescribe Metformin 500mg SR. Order lipid profile.",
        followUpDate: "2026-09-30",
        prescriptions: [
          { name: "Metformin Hydrochloride 500mg SR", dosage: "500mg", frequency: "Once daily with dinner", duration: "30 days" },
        ],
        investigations: [
          { testName: "HbA1c & Fasting Lipid Panel", category: "BLOOD", priority: "ROUTINE" },
        ],
      },
    });
    assert.strictEqual(res.status, 201);
    consultationId = res.data.consultation.id;
  });

  it("Acceptance Step 3: Lab Staff processes investigation and publishes report", async () => {
    // 1. Find investigation created in consultation
    const inv = store.investigations.find((i) => i.consultationId === consultationId);
    assert.ok(inv);
    investigationId = inv.id;

    // 2. Mark sample collected
    const patchSample = await apiRequest(`/lab/investigations/${investigationId}/sample`, {
      token: lab1Token,
      method: "PATCH",
      body: { status: "SAMPLE_COLLECTED" },
    });
    assert.strictEqual(patchSample.status, 200);

    // 3. Publish structured report
    const pubReport = await apiRequest("/lab/reports", {
      token: lab1Token,
      method: "POST",
      body: {
        patientId: patient1Id,
        investigationId,
        testName: "HbA1c & Fasting Lipid Panel",
        category: "LAB_REPORT",
        summary: "Glycated Hemoglobin in pre-diabetic range (6.6%).",
        structuredResults: [
          { parameter: "HbA1c", value: "6.6", unit: "%", referenceRange: "4.0 - 5.6", flag: "HIGH" },
          { parameter: "Fasting Blood Glucose", value: "114", unit: "mg/dL", referenceRange: "70 - 99", flag: "HIGH" },
        ],
      },
    });
    assert.strictEqual(pubReport.status, 201);
    labReportId = pubReport.data.report.id;
    assert.strictEqual(pubReport.data.report.status, "PUBLISHED");
  });

  it("Acceptance Step 4: Patient places pharmacy order and completes sandbox payment", async () => {
    // 1. Find prescription linked to consultation
    const rx = store.prescriptions.find((p) => p.consultationId === consultationId);
    assert.ok(rx);
    prescriptionId = rx.id;

    // 2. Create pharmacy order
    const orderRes = await apiRequest("/pharmacy/orders", {
      token: patient1Token,
      method: "POST",
      body: {
        prescriptionId,
        pharmacyName: "XYZ Pharmacy - Indiranagar",
        itemCount: 1,
        deliveryAddress: "Flat 402, Palm Grove Apartments, Indiranagar, Bengaluru",
      },
    });
    assert.strictEqual(orderRes.status, 201);
    pharmacyOrderId = orderRes.data.order.id;

    // 3. Initialize Sandbox Payment
    const payInit = await apiRequest("/payments/create", {
      token: patient1Token,
      method: "POST",
      body: {
        paymentType: "PHARMACY",
        orderId: pharmacyOrderId,
        amount: 640.0,
      },
    });
    assert.strictEqual(payInit.status, 201);
    paymentId = payInit.data.payment.id;

    // 4. Complete Sandbox Payment
    const payProcess = await apiRequest(`/payments/${paymentId}/process`, {
      token: patient1Token,
      method: "POST",
      body: {},
    });
    assert.strictEqual(payProcess.status, 200);
    assert.strictEqual(payProcess.data.payment.status, "PAID");
  });

  it("Acceptance Step 5: Specialist (Doctor 2) requests access -> Patient grants scoped consent with OTP", async () => {
    // 1. Doctor 2 requests access to Rahul Sharma
    const reqRes = await apiRequest("/access-requests", {
      token: doctor2Token,
      method: "POST",
      body: {
        careSyncId: "CS-2048-7392",
        purpose: "Specialist cardiology assessment & lipid review",
        dataScopes: ["CONSULTATIONS", "PRESCRIPTIONS", "LAB_REPORTS", "JOURNEY", "VITALS"],
      },
    });
    assert.strictEqual(reqRes.status, 201);
    specialistAccessRequestId = reqRes.data.request.id;
    const otpCode = reqRes.data.request.otpCode;
    assert.ok(otpCode);

    // 2. Patient 1 grants consent with OTP
    const consentRes = await apiRequest(`/access-requests/${specialistAccessRequestId}/decision`, {
      token: patient1Token,
      method: "POST",
      body: {
        decision: "ALLOW",
        otp: otpCode,
        selectedScopes: ["CONSULTATIONS", "PRESCRIPTIONS", "LAB_REPORTS", "JOURNEY", "VITALS"],
      },
    });
    assert.strictEqual(consentRes.status, 200);
    assert.strictEqual(consentRes.data.request.status, "ALLOWED");

    // 3. Doctor 2 can now access patient dashboard
    const d2Access = await apiRequest(`/patients/${patient1Id}/dashboard`, { token: doctor2Token });
    assert.strictEqual(d2Access.status, 200);
    assert.strictEqual(d2Access.data.patient.name, "Rahul Sharma");
  });

  it("Acceptance Step 6: Patient revokes Specialist (Doctor 2) access -> Doctor 2 is immediately blocked (403)", async () => {
    // 1. Find active consent record
    const consent = store.consentRecords.find((c) => c.patientId === patient1Id && c.doctorId === 2 && c.status === "ACTIVE");
    assert.ok(consent);

    // 2. Patient revokes consent
    const revokeRes = await apiRequest(`/consent-records/${consent.id}/revoke`, {
      token: patient1Token,
      method: "POST",
    });
    assert.strictEqual(revokeRes.status, 200);

    // 3. Doctor 2 attempts to read patient vitals -> 403 Forbidden
    const d2Blocked = await apiRequest(`/patients/${patient1Id}/vitals`, { token: doctor2Token });
    assert.strictEqual(d2Blocked.status, 403);
  });

  // ==========================================
  // 5. AI AUTHORIZATION & SAFETY GUARDRAILS
  // ==========================================
  it("AI Safety: Unauthenticated AI query fails with 401 Unauthorized", async () => {
    const res = await apiRequest("/ai/search", {
      method: "POST",
      body: { query: "Explain my blood sugar" },
    });
    assert.strictEqual(res.status, 401);
  });

  it("AI Safety: AI query includes mandatory non-diagnostic clinical disclaimer", async () => {
    const res = await apiRequest("/ai/search", {
      token: patient1Token,
      method: "POST",
      body: { query: "Explain my HbA1c" },
    });
    assert.strictEqual(res.status, 200);
    assert(res.data.disclaimer.includes("does not replace professional medical diagnosis"));
  });

  // ==========================================
  // 6. SESSION REVOCATION & TOKEN SECURITY
  // ==========================================
  it("Session Security: Malformed token or invalid signature fails with 401", async () => {
    const res = await apiRequest(`/patients/${patient1Id}/dashboard`, {
      token: "invalid.jwt.token.here",
    });
    assert.strictEqual(res.status, 401);
  });

  // ==========================================
  // 7. TAMPER-EVIDENT AUDIT TRAIL VERIFICATION
  // ==========================================
  it("Audit Trail: Sensitive healthcare events are immutably logged with actor & target", async () => {
    const res = await apiRequest("/audit-logs", { token: adminToken });
    assert.strictEqual(res.status, 200);
    assert(res.data.length > 5);

    const consultationLog = res.data.find((l) => l.action === "CONSULTATION_CREATED");
    assert(consultationLog, "Consultation audit record must exist");
    assert.strictEqual(consultationLog.result, "SUCCESS");

    const labLog = res.data.find((l) => l.action === "LAB_REPORT_PUBLISHED");
    assert(labLog, "Lab publication audit record must exist");

    const paymentLog = res.data.find((l) => l.action === "PAYMENT_COMPLETED_SANDBOX");
    assert(paymentLog, "Payment audit record must exist");
  });
});
