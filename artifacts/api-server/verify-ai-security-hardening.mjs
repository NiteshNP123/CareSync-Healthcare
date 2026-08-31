import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import app from "./src/app.ts";
import { store } from "./src/lib/store.ts";

let server;
let baseUrl;

test.before(async () => {
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}/api`;
  console.log(`\n======================================================`);
  console.log(`🔒 CareSync AI Assistant Strict Security Hardening Test Suite`);
  console.log(`🔗 Target URL: ${baseUrl}`);
  console.log(`======================================================\n`);
});

test.after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

test("CareSync AI Assistant Strict Gating & Security Matrix", async (t) => {
  // Save original environment variables
  const origNodeEnv = process.env.NODE_ENV;
  const origDemoMode = process.env.DEMO_MODE;

  // 1. Authenticate Patient 1 (Rahul Sharma)
  const patient1Login = await fetch(`${baseUrl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "rahul.sharma@example.com", password: "demoPassword" }),
  });
  assert.equal(patient1Login.status, 200);
  const { token: patient1Token } = await patient1Login.json();

  // 2. Authenticate Doctor (Dr. Rahul Mehta)
  const doctorLogin = await fetch(`${baseUrl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "dr.rahul.mehta@northstarmed.com", password: "demoPassword" }),
  });
  assert.equal(doctorLogin.status, 200);
  const { token: doctorToken } = await doctorLogin.json();

  // 3. Authenticate Admin
  const adminLogin = await fetch(`${baseUrl}/auth/demo-switch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role: "ADMIN" }),
  });
  assert.equal(adminLogin.status, 200);
  const { token: adminToken } = await adminLogin.json();

  // --------------------------------------------------------------------------
  // Rule 1: Development + DEMO_MODE="true" -> Demo fallback allowed (locked to Patient 1)
  // --------------------------------------------------------------------------
  await t.test("1. Development + DEMO_MODE='true' -> Demo fallback allowed & logged with isDemoAccess: true", async () => {
    try {
      process.env.NODE_ENV = "development";
      process.env.DEMO_MODE = "true";

      const res = await fetch(`${baseUrl}/ai/assistant/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "what is my next consultant" }),
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.intent, "APPOINTMENT");
      assert.ok(data.reply.includes("Dr. Rahul Mehta"));

      // Verify audit log recorded AI_PATIENT_ASSISTANT_DEMO_QUERY with isDemoAccess: true
      const demoLog = store.auditLogs.find(
        (l) => l.action === "AI_PATIENT_ASSISTANT_DEMO_QUERY" && l.metadata?.isDemoAccess === true
      );
      assert.ok(demoLog, "Audit log must clearly identify demo-mode assistant access");
      assert.equal(demoLog.patientId, 1);
    } finally {
      process.env.NODE_ENV = origNodeEnv;
      process.env.DEMO_MODE = origDemoMode;
    }
  });

  // --------------------------------------------------------------------------
  // Rule 2: Development + DEMO_MODE missing -> 401 Unauthorized
  // --------------------------------------------------------------------------
  await t.test("2. Development + DEMO_MODE missing -> 401 Unauthorized", async () => {
    try {
      process.env.NODE_ENV = "development";
      delete process.env.DEMO_MODE;

      const res = await fetch(`${baseUrl}/ai/assistant/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "what is my next consultant" }),
      });

      assert.equal(res.status, 401, "Expected 401 when DEMO_MODE is not explicitly set to 'true'");
      const data = await res.json();
      assert.equal(data.error, "Authentication required");
    } finally {
      process.env.NODE_ENV = origNodeEnv;
      process.env.DEMO_MODE = origDemoMode;
    }
  });

  // --------------------------------------------------------------------------
  // Rule 3: Development + DEMO_MODE="false" -> 401 Unauthorized
  // --------------------------------------------------------------------------
  await t.test("3. Development + DEMO_MODE='false' -> 401 Unauthorized", async () => {
    try {
      process.env.NODE_ENV = "development";
      process.env.DEMO_MODE = "false";

      const res = await fetch(`${baseUrl}/ai/assistant/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "what is my next consultant" }),
      });

      assert.equal(res.status, 401, "Expected 401 when DEMO_MODE is explicitly 'false'");
      const data = await res.json();
      assert.equal(data.error, "Authentication required");
    } finally {
      process.env.NODE_ENV = origNodeEnv;
      process.env.DEMO_MODE = origDemoMode;
    }
  });

  // --------------------------------------------------------------------------
  // Rule 4: Production + DEMO_MODE="true" -> 401 Unauthorized (Production strictly disallows demo)
  // --------------------------------------------------------------------------
  await t.test("4. Production + DEMO_MODE='true' -> 401 Unauthorized", async () => {
    try {
      process.env.NODE_ENV = "production";
      process.env.DEMO_MODE = "true";

      const res = await fetch(`${baseUrl}/ai/assistant/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "what is my next consultant" }),
      });

      assert.equal(res.status, 401, "Production MUST NEVER allow demo fallback even if DEMO_MODE='true'");
      const data = await res.json();
      assert.equal(data.error, "Authentication required");
    } finally {
      process.env.NODE_ENV = origNodeEnv;
      process.env.DEMO_MODE = origDemoMode;
    }
  });

  // --------------------------------------------------------------------------
  // Rule 5: Production + DEMO_MODE="false" -> 401 Unauthorized
  // --------------------------------------------------------------------------
  await t.test("5. Production + DEMO_MODE='false' -> 401 Unauthorized", async () => {
    try {
      process.env.NODE_ENV = "production";
      process.env.DEMO_MODE = "false";

      const res = await fetch(`${baseUrl}/ai/assistant/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "what is my next consultant" }),
      });

      assert.equal(res.status, 401);
      const data = await res.json();
      assert.equal(data.error, "Authentication required");
    } finally {
      process.env.NODE_ENV = origNodeEnv;
      process.env.DEMO_MODE = origDemoMode;
    }
  });

  // --------------------------------------------------------------------------
  // Rule 6: Production + Valid Patient Authentication -> 200 OK (Normal auth succeeds)
  // --------------------------------------------------------------------------
  await t.test("6. Production + Valid Patient Authentication -> 200 OK", async () => {
    try {
      process.env.NODE_ENV = "production";

      const res = await fetch(`${baseUrl}/ai/assistant/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${patient1Token}`,
        },
        body: JSON.stringify({ message: "what is my next consultant" }),
      });

      assert.equal(res.status, 200, "Authenticated patient MUST succeed in production");
      const data = await res.json();
      assert.equal(data.intent, "APPOINTMENT");
      assert.ok(data.reply.includes("Dr. Rahul Mehta"));
    } finally {
      process.env.NODE_ENV = origNodeEnv;
      process.env.DEMO_MODE = origDemoMode;
    }
  });

  // --------------------------------------------------------------------------
  // Rule 7: Client cannot inject or override patientId in payload or query
  // --------------------------------------------------------------------------
  await t.test("7. Client-supplied patientId cannot override server identity", async () => {
    try {
      process.env.NODE_ENV = "development";
      process.env.DEMO_MODE = "true";

      const res = await fetch(`${baseUrl}/ai/assistant/chat?patientId=9999`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${patient1Token}`,
        },
        body: JSON.stringify({
          message: "What is my next appointment?",
          patientId: 9999, // Malicious override attempt
          targetPatientId: 8888,
        }),
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      // Must return Patient 1's appointment (Dr. Rahul Mehta), NEVER Patient 9999
      assert.ok(data.reply.includes("Dr. Rahul Mehta"));
      assert.ok(!data.reply.includes("9999"));
    } finally {
      process.env.NODE_ENV = origNodeEnv;
      process.env.DEMO_MODE = origDemoMode;
    }
  });

  // --------------------------------------------------------------------------
  // Rule 8: Non-patient role (Doctor, Admin) -> 403 Forbidden
  // --------------------------------------------------------------------------
  await t.test("8. Doctor & Admin tokens are strictly rejected with 403 Forbidden", async () => {
    const docRes = await fetch(`${baseUrl}/ai/assistant/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${doctorToken}`,
      },
      body: JSON.stringify({ message: "What is my next appointment?" }),
    });

    assert.equal(docRes.status, 403);
    const docData = await docRes.json();
    assert.equal(docData.error, "Forbidden");

    const adminRes = await fetch(`${baseUrl}/ai/assistant/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ message: "What is my next appointment?" }),
    });

    assert.equal(adminRes.status, 403);
  });

  // --------------------------------------------------------------------------
  // Rule 9: Invalid / malformed token -> 401 Unauthorized
  // --------------------------------------------------------------------------
  await t.test("9. Malformed or expired Authorization header fails with 401", async () => {
    const res = await fetch(`${baseUrl}/ai/assistant/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer corrupted.tampered.jwt",
      },
      body: JSON.stringify({ message: "What is my next appointment?" }),
    });

    assert.equal(res.status, 401);
    const data = await res.json();
    assert.equal(data.error, "Authentication required");
  });
});
