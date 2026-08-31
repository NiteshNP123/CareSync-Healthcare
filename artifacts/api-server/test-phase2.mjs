import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import http from "node:http";
import app from "./src/app.ts";

let server;
let baseUrl;

before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}/api`;
      console.log(`🧪 Test server running at ${baseUrl}`);
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

describe("CareSync Phase 2: Core Backend Engine & API Verification", () => {
  let patientToken;
  let doctorToken;
  let labToken;
  let pharmacyToken;
  let adminToken;
  let testPatientId = 1;

  // 1. AUTHENTICATION & LOGIN
  it("1.1 should authenticate pre-seeded patient (Rahul Sharma)", async () => {
    const res = await apiRequest("/auth/login", {
      method: "POST",
      body: { email: "rahul.sharma@example.com", password: "anyPasswordDemo" },
    });
    assert.strictEqual(res.status, 200);
    assert.ok(res.data.token);
    assert.strictEqual(res.data.user.role, "PATIENT");
    assert.strictEqual(res.data.user.fullName, "Rahul Sharma");
    patientToken = res.data.token;
  });

  it("1.2 should authenticate pre-seeded doctor (Dr. Rahul Mehta)", async () => {
    const res = await apiRequest("/auth/login", {
      method: "POST",
      body: { email: "dr.rahul.mehta@northstarmed.com", password: "anyPasswordDemo" },
    });
    assert.strictEqual(res.status, 200);
    assert.ok(res.data.token);
    assert.strictEqual(res.data.user.role, "DOCTOR");
    doctorToken = res.data.token;
  });

  it("1.3 should demo-switch to LAB_STAFF persona", async () => {
    const res = await apiRequest("/auth/demo-switch", {
      method: "POST",
      body: { role: "LAB_STAFF" },
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.user.role, "LAB_STAFF");
    labToken = res.data.token;
  });

  it("1.4 should demo-switch to PHARMACY_STAFF persona", async () => {
    const res = await apiRequest("/auth/demo-switch", {
      method: "POST",
      body: { role: "PHARMACY_STAFF" },
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.user.role, "PHARMACY_STAFF");
    pharmacyToken = res.data.token;
  });

  it("1.5 should demo-switch to ADMIN persona", async () => {
    const res = await apiRequest("/auth/demo-switch", {
      method: "POST",
      body: { role: "ADMIN" },
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.user.role, "ADMIN");
    adminToken = res.data.token;
  });

  // 2. RBAC & PERMISSION CHECKS
  it("2.1 should reject unauthenticated requests to protected endpoints", async () => {
    const res = await apiRequest("/consultations", { method: "POST", body: {} });
    assert.strictEqual(res.status, 401);
  });

  it("2.2 should block PATIENT from creating doctor consultations", async () => {
    const res = await apiRequest("/consultations", {
      token: patientToken,
      method: "POST",
      body: { patientId: 1, symptoms: "Headache", assessmentDiagnosis: "Migraine", treatmentPlan: "Rest" },
    });
    assert.strictEqual(res.status, 403);
  });

  // 3. PATIENT DASHBOARD & CARE DETAILS
  it("3.1 should retrieve patient dashboard with connected metrics", async () => {
    const res = await apiRequest(`/patients/${testPatientId}/dashboard`, { token: patientToken });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.patient.patientId, "CS-2048-7392");
    assert.ok(res.data.currentStage);
  });

  // 4. APPOINTMENT SCHEDULING & DOUBLE-BOOKING PREVENTION
  it("4.1 should book a patient-to-doctor appointment", async () => {
    const res = await apiRequest("/appointments", {
      token: patientToken,
      method: "POST",
      body: { doctorId: 1, date: "2026-09-15", time: "11:30 AM", mode: "Video consultation" },
    });
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.data.status, "CONFIRMED");
  });

  it("4.2 should prevent double-booking on the backend", async () => {
    const res = await apiRequest("/appointments", {
      token: patientToken,
      method: "POST",
      body: { doctorId: 1, date: "2026-09-15", time: "11:30 AM", mode: "Video consultation" },
    });
    assert.strictEqual(res.status, 409);
  });

  // 5. CONSULTATION CREATION & AUTOMATIC JOURNEY EVENT
  it("5.1 should allow verified doctor to conduct consultation and issue Rx & Lab orders", async () => {
    const res = await apiRequest("/consultations", {
      token: doctorToken,
      method: "POST",
      body: {
        patientId: 1,
        symptoms: "Elevated evening fatigue and thirst",
        clinicalObservations: "BP 134/86 mmHg, heart rate regular",
        assessmentDiagnosis: "Cardiometabolic Risk / Pre-diabetes",
        treatmentPlan: "Start lifestyle modifications and monitor glucose.",
        prescriptions: [
          { name: "Metformin 500mg SR", dosage: "500mg", frequency: "Once daily with dinner", duration: "30 days" },
        ],
        investigations: [
          { testName: "HbA1c & Fasting Lipid Profile", priority: "ROUTINE" },
        ],
      },
    });
    assert.strictEqual(res.status, 201);
    assert.ok(res.data.consultation);
    assert.ok(res.data.prescription);
    assert.strictEqual(res.data.investigations.length, 1);
  });

  // 6. LAB REQUISITION & REPORT PUBLISHING
  it("6.1 should allow lab staff to mark sample collected and publish structured report", async () => {
    // 1. Mark sample collected
    const sampleRes = await apiRequest("/lab/investigations/1/sample", {
      token: labToken,
      method: "PATCH",
      body: { status: "SAMPLE_COLLECTED" },
    });
    assert.strictEqual(sampleRes.status, 200);

    // 2. Publish structured report
    const pubRes = await apiRequest("/lab/reports", {
      token: labToken,
      method: "POST",
      body: {
        patientId: 1,
        investigationId: 1,
        testName: "Comprehensive Metabolic & Lipid Panel",
        structuredResults: [
          { parameter: "HbA1c", value: "6.6", unit: "%", referenceRange: "4.0 - 5.6", flag: "HIGH" },
          { parameter: "Fasting Blood Glucose", value: "114", unit: "mg/dL", referenceRange: "70 - 99", flag: "HIGH" },
        ],
        summary: "Pre-diabetes range confirmed per NABL standard intervals.",
      },
    });
    assert.strictEqual(pubRes.status, 201);
    assert.strictEqual(pubRes.data.report.status, "PUBLISHED");
  });

  // 7. PHARMACY FULFILLMENT & ORDER LIFECYCLE
  it("7.1 should place pharmacy order and advance through fulfillment stages", async () => {
    // Place order
    const orderRes = await apiRequest("/pharmacy/orders", {
      token: patientToken,
      method: "POST",
      body: { prescriptionId: 1, pharmacyId: 2, deliveryAddress: "Indiranagar, Bengaluru" },
    });
    assert.strictEqual(orderRes.status, 201);
    const orderNumber = orderRes.data.order.orderNumber;

    // Advance status to PREPARING
    const updateRes = await apiRequest(`/pharmacy/orders/${orderNumber}/status`, {
      token: pharmacyToken,
      method: "PATCH",
      body: { status: "PREPARING" },
    });
    assert.strictEqual(updateRes.status, 200);
    assert.strictEqual(updateRes.data.order.status, "PREPARING");
  });

  // 8. SANDBOX PAYMENTS & INVOICING
  it("8.1 should create and process a sandbox payment request", async () => {
    const createRes = await apiRequest("/payments/create", {
      token: patientToken,
      method: "POST",
      body: { paymentType: "PHARMACY", amount: "850.00", orderId: 1 },
    });
    assert.strictEqual(createRes.status, 201);
    const paymentId = createRes.data.payment.id;

    // Process payment
    const processRes = await apiRequest(`/payments/${paymentId}/process`, {
      token: patientToken,
      method: "POST",
      body: {},
    });
    assert.strictEqual(processRes.status, 200);
    assert.strictEqual(processRes.data.payment.status, "PAID");
    assert.ok(processRes.data.invoice.invoiceNumber);
  });

  // 9. PATIENT ACCESS & CONSENT WITH SIMULATED OTP
  it("9.1 should allow doctor to request access and patient to approve with OTP", async () => {
    // Doctor initiates access request
    const reqRes = await apiRequest("/access-requests", {
      token: doctorToken,
      method: "POST",
      body: { careSyncId: "CS-2048-7392", purpose: "Pre-consultation review of lab trends" },
    });
    assert.strictEqual(reqRes.status, 201);
    const requestId = reqRes.data.request.id;
    const otpCode = reqRes.data.request.otpCode;

    // Patient enters OTP and approves
    const decideRes = await apiRequest(`/access-requests/${requestId}/decision`, {
      token: patientToken,
      method: "POST",
      body: { decision: "ALLOW", otp: otpCode },
    });
    assert.strictEqual(decideRes.status, 200);
    assert.strictEqual(decideRes.data.request.status, "ALLOWED");
  });

  // 10. AI HEALTHCARE ASSISTANT & SAFETY
  it("10.1 should provide AI journey summary and report explanation with disclaimers", async () => {
    const summaryRes = await apiRequest("/ai/journey-summary", {
      token: patientToken,
      method: "POST",
      body: { patientId: 1 },
    });
    assert.strictEqual(summaryRes.status, 200);
    assert.ok(summaryRes.data.headline);
    assert.ok(summaryRes.data.disclaimer);

    const explainRes = await apiRequest("/ai/explain-report", {
      token: patientToken,
      method: "POST",
      body: { reportId: 1 },
    });
    assert.strictEqual(explainRes.status, 200);
    assert.ok(explainRes.data.explanations.length > 0);
  });

  // 11. AUDIT LOGGING (ADMIN ONLY)
  it("11.1 should record and allow admin to inspect tamper-evident audit logs", async () => {
    const res = await apiRequest("/audit-logs", { token: adminToken });
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.data));
    assert.ok(res.data.length > 0);
    assert.ok(res.data.some((log) => log.action === "CONSULTATION_CREATED"));
  });
});
